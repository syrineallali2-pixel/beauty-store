"""
Stage 2: Database Ingestion Pipeline
Consumes pre-enriched JSON data, runs BGE vector transformations, and updates PostgreSQL.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import pandas as pd
import numpy as np
import psycopg2
from pgvector.psycopg2 import register_vector
from sentence_transformers import SentenceTransformer

print("🔄 Loading embedding model...")
embed_model = SentenceTransformer("BAAI/bge-base-en-v1.5")

BASE_DIR = Path(__file__).parent.parent
enriched_json_path = BASE_DIR / "data" / "enriched_products.json"

if not enriched_json_path.exists():
    print(f"❌ Error: Could not find enriched data catalog at {enriched_json_path}. Run enrich_catalog.py first!")
    exit(1)

catalog = pd.read_json(str(enriched_json_path), lines=True)
print(f"📦 Loaded {len(catalog)} enriched products")

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("❌ Error: DATABASE_URL environment variable is not set!")

print("🔄 Connecting to PostgreSQL database...")
conn = psycopg2.connect(DATABASE_URL)
register_vector(conn)
cur = conn.cursor()

print("🚀 Executing batch database ingestion...")
for idx, row in catalog.iterrows():
    text = row.get('text_for_embedding', '')
    if not text or pd.isna(text):
        text = f"{row['name']} {row['brand']} {row.get('description', '')}"
    
    embedding = embed_model.encode(f"passage: {text}").astype("float32").tolist()
    
    # Read our clean, pre-calculated ML properties directly from the schema
    color = row.get('standardised_color')
    finish = row.get('extracted_finish')
    
    color_cats = row.get('color_categories', [])
    shades = row.get('shade_names', [])
    cc_list = list(color_cats) if isinstance(color_cats, (list, np.ndarray)) else []
    sn_list = list(shades) if isinstance(shades, (list, np.ndarray)) else []
    
    cur.execute("""
        INSERT INTO products (
            id, name, brand, price, category, product_type, 
            color, finish, color_categories, shade_names, image_url, rating, 
            description, tags, embedding
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            brand = EXCLUDED.brand,
            price = EXCLUDED.price,
            color = EXCLUDED.color,
            finish = EXCLUDED.finish,
            color_categories = EXCLUDED.color_categories,
            shade_names = EXCLUDED.shade_names,
            embedding = EXCLUDED.embedding
    """, (
        str(row['id']),
        row['name'],
        row['brand'],
        float(row['price']) if pd.notna(row['price']) else 0.0,
        row.get('category'),
        row.get('product_type'),
        color,
        finish,
        cc_list,
        sn_list,
        row.get('api_featured_image', ''),
        float(row.get('rating', 0)) if pd.notna(row.get('rating')) else 0.0,
        row.get('description', ''),
        str(row.get('tags_text', '')),
        embedding
    ))
    
    if (idx + 1) % 100 == 0:
        conn.commit()
        print(f"Processed {idx + 1}/{len(catalog)} products")

conn.commit()
cur.close()
conn.close()

print(f"✅ Production Database Successfully Synchronised!")