import os
import re
import asyncio
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor
import psycopg
from psycopg_pool import AsyncConnectionPool
from pgvector.psycopg import register_vector_async
from sentence_transformers import SentenceTransformer

class ProductSearchEngine:
    def __init__(self, max_pool_size: int = 10):
        self.db_url = os.getenv("DATABASE_URL", "postgresql://...")
        self.max_pool_size = max_pool_size
        self.pool: Optional[AsyncConnectionPool] = None
        
        self.embed_model = SentenceTransformer("BAAI/bge-base-en-v1.5")
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.concurrency_limit = asyncio.Semaphore(4)

        self.type_map = {
            'lipstick': ['lipstick', 'lipsticks', 'lip gloss', 'lip', 'shade'],
            'foundation': ['foundation', 'foundations', 'concealer'],
            'mascara': ['mascara', 'mascaras', 'lash'],
            'eyeliner': ['eyeliner', 'liner', 'liners'],
            'blush': ['blush', 'blusher'],
        }

    async def initialize(self):
        """Asynchronously initialize the connection pool and register pgvector"""
        if not self.pool:
            self.pool = AsyncConnectionPool(
                conninfo=self.db_url,
                min_size=2,
                max_size=self.max_pool_size,
                open=False,
                kwargs={"autocommit": True} 
            )
            await self.pool.open()
            
            async with self.pool.connection() as conn:
                await register_vector_async(conn)

    def _extract_filters(self, query: str) -> Dict:
        q = query.lower()
        filters = {}
        
        for ptype, keywords in self.type_map.items():
            if any(k in q for k in keywords):
                filters['product_type'] = ptype
                break
                
        price_match = re.search(r'under\s*\$?(\d+)', q)
        if price_match:
            filters['max_price'] = float(price_match.group(1))
            
        return filters

    def _assess_semantic_payload(self, query: str, filters: Dict) -> str:
        clean = query.lower()
        
        clean = re.sub(r'under\s*\$?(\d+)', '', clean)
        clean = re.sub(r'above\s*\$?(\d+)', '', clean)
        clean = re.sub(r'over\s*\$?(\d+)', '', clean)
        clean = re.sub(r'less\s+than\s*\$?(\d+)', '', clean)
        clean = re.sub(r'more\s+than\s*\$?(\d+)', '', clean)
        clean = re.sub(r'\b\d+\s*dollars\b|\b\d+\$\b', '', clean)
        
        if filters.get('product_type'):
            target_keywords = self.type_map[filters['product_type']]
            for kw in target_keywords:
                clean = re.sub(rf'\b{kw}\b', '', clean)
                
        fillers = ['looking for', 'want', 'need', 'find', 'show me', 'get me', 'search']
        for filler in fillers:
            clean = re.sub(rf'\b{filler}\b', '', clean)
            
        clean = re.sub(r'[^\w\s]', '', clean).strip()
        return clean

    async def _get_embedding(self, text: str) -> List[float]:
        async with self.concurrency_limit:
            loop = asyncio.get_running_loop()
            formatted_text = f"query: {text}"
            return await loop.run_in_executor(
                self.executor, 
                lambda: self.embed_model.encode(formatted_text).astype("float32").tolist()
            )

    async def search(self, query: str, filters: Optional[Dict] = None, limit: int = 10) -> List[Dict]:
        if not self.pool:
            await self.initialize()

        async with self.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT plainto_tsquery('english', %s)::text;", [query])
                ts_result = await cur.fetchone()
                if not ts_result or not ts_result[0] or not ts_result[0].strip():
                    return []

        active_filters = self._extract_filters(query)
        if filters:
            active_filters.update({k: v for k, v in filters.items() if v is not None})
        
        semantic_payload = self._assess_semantic_payload(query, active_filters)
        
        print("\n" + "═"*70)
        print(f"🔍 [SEARCH ENGINE ENGINE] Working Query: \"{query}\"")
        print(f" ├─ 📋 COMBINED ACTIVE FILTERS: {active_filters}")
        print(f" ├─ 🧠 SCRUBBED VECTOR TEXT   : \"{semantic_payload}\"")

        if active_filters and not semantic_payload:
            print(f" └─ ⚡ ROUTING PROTOCOL       : [ PURE RELATIONAL STRUCTURED ] 🚀")
            print("═"*70 + "\n")
            return await self._execute_pure_structural(active_filters, limit)
            
        elif active_filters and semantic_payload:
            print(f" └─ ⚡ ROUTING PROTOCOL       : [ TRUE HYBRID SEARCH ] 🧬")
            print("═"*70 + "\n")
            q_emb = await self._get_embedding(query)
            return await self._execute_hybrid(active_filters, q_emb, limit)
            
        else:
            print(f" └─ ⚡ ROUTING PROTOCOL       : [ PURE SEMANTIC VECTOR SPACE ] 🧠")
            print("═"*70 + "\n")
            q_emb = await self._get_embedding(query)
            return await self._execute_pure_semantic(q_emb, limit)

    async def _execute_pure_structural(self, filters: Dict, limit: int) -> List[Dict]:
        sql = "SELECT id, name, brand, product_type, color, finish, price, rating, image_url, description, 1.0 as similarity FROM products WHERE 1=1"
        params = []
        
        if filters.get('product_type'):
            sql += " AND product_type ILIKE %s"
            params.append(filters['product_type'])
        if filters.get('min_price'):
            sql += " AND price > %s"  
            params.append(filters['min_price'])
        if filters.get('max_price'):
            sql += " AND price < %s"  
            params.append(filters['max_price'])
            
        sql += " ORDER BY rating DESC, price ASC LIMIT %s"
        params.append(limit)
        
        async with self.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in await cur.fetchall()]

    async def _execute_hybrid(self, filters: Dict, q_emb: List[float], limit: int) -> List[Dict]:
        sql = """
            SELECT id, name, brand, product_type, color, finish, price, rating, image_url, description,
                   (1 - (embedding <=> %s::vector)) as similarity
            FROM products
            WHERE 1=1
        """
        params = [q_emb]
        
        if filters.get('product_type'):
            sql += " AND product_type ILIKE %s"
            params.append(filters['product_type'])
        if filters.get('min_price'):
            sql += " AND price > %s"  
            params.append(filters['min_price'])
        if filters.get('max_price'):
            sql += " AND price < %s"  
            params.append(filters['max_price'])

        sql += " ORDER BY embedding <=> %s::vector LIMIT %s"
        params.extend([q_emb, limit])
        
        async with self.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in await cur.fetchall()]
            
    async def _execute_pure_semantic(self, q_emb: List[float], limit: int) -> List[Dict]:
        sql = """
            SELECT id, name, brand, product_type, color, finish, price, rating, image_url, description,
                   (1 - (embedding <=> %s::vector)) as similarity
            FROM products
            ORDER BY embedding <=> %s::vector LIMIT %s
        """
        params = [q_emb, q_emb, limit]
        
        async with self.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in await cur.fetchall()]

    async def close(self):
        if self.pool:
            await self.pool.close()
        self.executor.shutdown()

_engine_instance: Optional[ProductSearchEngine] = None

def get_search_engine() -> ProductSearchEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = ProductSearchEngine()
    return _engine_instance