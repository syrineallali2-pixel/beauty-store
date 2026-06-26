"""
RUN THIS ONCE:
1. Creates database tables
2. Configures fast indexes (HNSW)
"""
import os
from dotenv import load_dotenv
import psycopg2
from pgvector.psycopg2 import register_vector

# Load variables from .env file into the system environment
load_dotenv()

# Safely fetch the connection string
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("❌ Error: DATABASE_URL environment variable is not set!")

print("🔄 Connecting to PostgreSQL safely using environment variables...")
conn = psycopg2.connect(DATABASE_URL)

# 1. Create the cursor first
cur = conn.cursor()

# 2. Activate the pgvector extension inside the database right away
print("🔄 Activating pgvector extension...")
cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
conn.commit()  # Commit this immediately so the database saves it

# 3. NOW it is safe to register the vector type with psycopg2
register_vector(conn)

# 4. Drop old data and create the clean product schema
print("🔄 Creating table...")
cur.execute("DROP TABLE IF EXISTS products CASCADE")

cur.execute("""
    CREATE TABLE products (
        id VARCHAR(50) PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        price DECIMAL(10,2),
        product_type TEXT,
        category TEXT,
        color TEXT,
        finish TEXT,
        color_categories TEXT[],
        shade_names TEXT[],
        image_url TEXT,
        rating DECIMAL(3,2),
        description TEXT,
        tags TEXT,
        embedding vector(768),
        created_at TIMESTAMP DEFAULT NOW()
    )
""")

# 5. Composite index for structured + filter acceleration
print("🔄 Creating composite index for filtering...")
cur.execute("CREATE INDEX idx_products_filtering ON products (product_type, price)")
cur.execute("CREATE INDEX idx_products_metadata ON products (color, finish)")

# 6. Modern HNSW Vector index for blazing fast vector lookups
print("🔄 Creating HNSW Vector Index (This might take a moment)...")
cur.execute("""
    CREATE INDEX idx_products_embedding 
    ON products 
    USING hnsw (embedding vector_cosine_ops)
""")

# Finalize transaction
conn.commit()
cur.close()
conn.close()
print("✅ Database schema and high-performance indexes created successfully!")