import os
import asyncio
import json
import re
import html
import urllib.parse
import time
from collections import defaultdict
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from transformers import pipeline
from dotenv import load_dotenv
import posthog

# Core custom modules & official SDKs
from search_engine import get_search_engine
from groq import AsyncGroq


load_dotenv()

# ========== CONFIG ==========
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable not set")

# ========== POSTHOG ==========
posthog.project_api_key = os.getenv("POSTHOG_API_KEY")
posthog.host = os.getenv("POSTHOG_HOST", "https://us.i.posthog.com")

# Instantiating the modern asynchronous client
client = AsyncGroq(api_key=GROQ_API_KEY)

# ========== FASTAPI ==========
app = FastAPI(title="Beauty AI Search Engine")

# Initialize the Input Noise Guardrail Model (~240MB)
print("Loading Input Noise Guardrail Model...")
guardrail_classifier = pipeline(
    "text-classification", 
    model="TangoBeeAkto/gibberish-detector"
)

# Initialize the Malicious Intent/Injection Shield (~400MB)
print("Loading Malicious Payload Shield...")
security_shield = pipeline(
    "text-classification", 
    model="protectai/deberta-v3-base-prompt-injection-v2"
)
print("All Enterprise Security Layers Online! 🛡️")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple memory-backed Token Bucket Rate Limiter
class TokenBucketLimiter:
    def __init__(self, rate: int, capacity: int):
        self.rate = rate          # Tokens added per second
        self.capacity = capacity  # Max burst capacity
        self.buckets = defaultdict(lambda: capacity)
        self.last_check = defaultdict(time.time)

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        elapsed = now - self.last_check[client_ip]
        self.last_check[client_ip] = now
        
        # Refill tokens based on time elapsed
        self.buckets[client_ip] = min(self.capacity, self.buckets[client_ip] + elapsed * self.rate)
        
        if self.buckets[client_ip] >= 1.0:
            self.buckets[client_ip] -= 1.0
            return True
        return False

limiter = TokenBucketLimiter(rate=2, capacity=5)

# ========== MODELS ==========
class ChatMessage(BaseModel):
    role: str       # "user" or "assistant"
    content: str

class RecommendRequest(BaseModel):
    messages: List[ChatMessage]  
    max_price: Optional[float] = None
    top_k: int = 5

class ProductResponse(BaseModel):
    id: str
    name: str
    brand: str
    price: float
    image_url: str
    color: Optional[str]
    finish: Optional[str]
    rating: float
    similarity: Optional[float]

class RecommendResponse(BaseModel):
    advice: str
    products: List[ProductResponse]
    follow_up: Optional[str]

# ========== AI ADVICE GENERATION ==========
async def generate_advice(query: str, products: List[dict]) -> dict:
    """Generate structured natural language advice and track product selections"""
    if not products:
        return {
            "advice": "I couldn't find products matching your criteria. Try adjusting your preferences?",
            "selected_product_ids": []
        }
    
    # Expose database IDs clearly to the LLM context
    context = ""
    for p in products:
        context += f"DB_ID: {p['id']} | {p['name']} by {p['brand']} (${p['price']})\n"
    
    prompt = f"""Customer wants product suggestions for: "{query}"

Available Database Products:
{context}

Instructions:
1. Select the 2-3 best products from the list above that match the user request.
2. Formulate a friendly response explaining why they match in the "advice" field.
3. Extract the exact DB_ID values of the products you decided to talk about into the "selected_product_ids" array.
4. Keep the "advice" text under 150 words.

You MUST respond with a single valid JSON object structured exactly like this:
{{
  "advice": "Your personalized beauty advice text goes here...",
  "selected_product_ids": ["id_from_list_1", "id_from_list_2"]
}}
"""

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a friendly beauty advisor. You must output valid JSON matching the requested schema."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=600
        )
        return json.loads(response.choices[0].message.content)
        
    except Exception as e:
        print(f"Groq Contextual Optimization Error: {e}")
        return {
            "advice": "I found some great options matching your criteria. Take a look below!",
            "selected_product_ids": [str(p['id']) for p in products[:3]]
        }

# ========== LIFECYCLE MANAGEMENT ==========
@app.on_event("shutdown")
async def shutdown_event():
    engine = get_search_engine()
    await engine.close()
    posthog.flush()

# ========== CONTEXT REWRITER ENGINE ==========
async def contextualize_query(messages: List[ChatMessage]) -> dict:
    """Combines chat history into a single standalone query and extracts explicit price metrics via JSON Mode"""
    default_response = {"query": messages[-1].content if messages else "", "min_price": None, "max_price": None}
    if not messages:
        return default_response

    history_str = "\n".join([f"{msg.role}: {msg.content}" for msg in messages[:-1]])
    latest_user_message = messages[-1].content

    prompt = f"""Given the following conversation history and a follow-up question, process the explicit intent into a JSON object.

1. Rewrite the follow-up question into a standalone, clear search query that contains all necessary cosmetic context (event, style, product type, finishes). Do NOT answer the question, just rewrite it.
2. Extract mathematical price filters if stated in the message or context:
   - "min_price": Look for phrases like "above X", "more than X", "at least X", "X+". Convert to float or null.
   - "max_price": Look for phrases like "under X", "less than X", "below X", "maximum X". Convert to float or null.

Conversation History:
{history_str}

Follow-up Question: {latest_user_message}

Return ONLY a valid JSON object matching this schema:
{{
    "query": "standalone search query string",
    "min_price": float or null,
    "max_price": float or null
}}"""

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,  
            response_format={"type": "json_object"},
            max_tokens=150
        )
        parsed_json = json.loads(response.choices[0].message.content.strip())
        return {
            "query": parsed_json.get("query", latest_user_message),
            "min_price": parsed_json.get("min_price"),
            "max_price": parsed_json.get("max_price")
        }
    except Exception as e:
        print(f"⚠️ Contextualizer/JSON Extraction Error: {e}")
        return default_response

# ========== ENDPOINTS ==========
@app.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest, request: Request): 
    client_ip = request.client.host or "unknown"
    if not limiter.is_allowed(client_ip):
        print(f"🚨 RESOURCE PROTECTION: Rate limit tripped for IP {client_ip}")
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down your search rate."}
        )
    
    if not req.messages:
        return RecommendResponse(
            advice="I didn't receive any message history. What are you looking to find today?",
            products=[],
            follow_up="Try asking for something specific like a hydrating foundation!"
        )

    context_data = await contextualize_query(req.messages)
    clean_query = context_data["query"]
    
    extracted_filters = {}
    if context_data["min_price"] is not None:
        extracted_filters["min_price"] = float(context_data["min_price"])
    if context_data["max_price"] is not None:
        extracted_filters["max_price"] = float(context_data["max_price"])
        
    if req.max_price is not None:
        extracted_filters["max_price"] = req.max_price
    
    print(f"🔮 Contextualized Query Rewrite: '{clean_query}'")
    print(f"📊 Extracted Numeric Constraints: {extracted_filters}")
    
    max_depth = 5
    for _ in range(max_depth):
        decoded_step = html.unescape(urllib.parse.unquote(clean_query))
        if decoded_step == clean_query:
            break
        clean_query = decoded_step

    clean_query = clean_query.strip()
 
    malicious_signatures = [
        r"<script.*?>|<\/script>",                  
        r"javascript:|onerror=|onload=|onclick=",    
        r"\b(SELECT|DROP|DELETE|UNION|INSERT)\b",    
        r"'--|--|;|/\*|\*/",                         
        r"\.\./\.\./|\bbin/sh\b|\bbin/bash\b",       
        r"\{\{.*?\}\}|\$\{.*?\}",                    
        r"(\%3C|\%3E|\%27|\%22|\%23|\%3B)",          
    ]
    
    is_malicious_payload = any(re.search(pattern, clean_query, re.IGNORECASE) for pattern in malicious_signatures)

    if is_malicious_payload:
        return RecommendResponse(
            advice="Security exception: Invalid or dangerous search syntax detected.",
            products=[],
            follow_up="Please use normal language to search for cosmetic products."
        )

    is_repeating_spam = len(set(clean_query.lower())) <= 2 if len(clean_query) > 10 else False
    if not clean_query or len(clean_query) < 2 or len(clean_query) > 300 or is_repeating_spam:
        return RecommendResponse(
            advice="Please tell me what type of beauty products you are looking for today using standard search terms!",
            products=[],
            follow_up="Try typing something like 'matte red lipstick'."
        )

    try:
        sec_result = security_shield(clean_query)[0]
        if sec_result['label'] == 'INJECTION' and sec_result['score'] > 0.85:
            return RecommendResponse(
                advice="Security exception: System override intent detected.",
                products=[],
                follow_up="Please input a standard product search query."
            )
    except Exception as sec_err:
        print(f"⚠️ Security shield execution warning: {sec_err}")

    try:
        guard_result = guardrail_classifier(clean_query)[0]
        if guard_result['label'].lower() in ['noise', 'word_salad'] and guard_result['score'] > 0.75:
            return RecommendResponse(
                advice="I couldn't process that query. Please tell me what type of beauty products you are looking for!",
                products=[],
                follow_up="Try searching for terms like 'waterproof mascara'."
            )
    except Exception as eval_err:
        print(f"⚠️ Guardrail execution warning: {eval_err}")

    engine = get_search_engine()
    
    try:
        products = await engine.search(query=clean_query, filters=extracted_filters, limit=req.top_k)
        products = [p for p in products if p.get('similarity', 0.0) >= 0.60]

        if "max_price" in extracted_filters:
            products = [p for p in products if float(p['price']) < extracted_filters["max_price"]]
        if "min_price" in extracted_filters:
            products = [p for p in products if float(p['price']) > extracted_filters["min_price"]]
            
        try:
            # FIX B: Send the raw message block to advice layer
            llm_payload = await asyncio.wait_for(
                generate_advice(req.messages[-1].content, products), 
                timeout=4.0
            )
            advice = llm_payload.get("advice", "")
            selected_ids = [str(sid) for sid in llm_payload.get("selected_product_ids", [])]
            
            # METADATA ALIGNMENT FILTER: Intercept and filter the final product list
            final_products = [p for p in products if str(p['id']) in selected_ids]
            if not final_products:
                final_products = products[:3]
                
        except Exception as llm_err:
            print(f"⚠️ LLM curating pipeline fallback: {llm_err}")
            advice = "Here are the top matches found in our catalog matching your search criteria."
            final_products = products[:3]
        
        response_payload = RecommendResponse(
            advice=advice,
            products=[
                ProductResponse(
                    id=str(p['id']),
                    name=p['name'],
                    brand=p['brand'],
                    price=float(p['price']),
                    image_url=p.get('image_url', ''),
                    color=p.get('color'),
                    finish=p.get('finish'),
                    rating=float(p.get('rating', 0)),
                    similarity=p.get('similarity')
                )
                for p in final_products
            ],
            follow_up="Would you like to look at alternate shades or similar suggestions?" if final_products else "Try a completely different search query!"
        )

        posthog.capture(
            distinct_id=client_ip,
            event="product_recommendation_requested",
            properties={
                "query": clean_query,
                "results_count": len(final_products),
                "has_price_filter": bool(extracted_filters),
                "top_k": req.top_k,
            },
        )

        return response_payload
        
    except Exception as e:
        print(f"🚨 Severe Application Breakdown: {e}")
        raise HTTPException(status_code=500, detail="Internal Search Engine Failure")

@app.get("/")
async def root():
    return {"status": "ok", "message": "High Performance Async RAG Architecture Online"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)