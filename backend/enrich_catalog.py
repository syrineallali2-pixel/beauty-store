"""
Stage 1: Offline Data Enrichment Pipeline
Uses a Zero-Shot NLP Classifier to standardise finishes and colors.
"""

import json
from pathlib import Path
import pandas as pd
from transformers import pipeline
from tqdm import tqdm

BASE_DIR = Path(__file__).parent.parent
INPUT_JSON = BASE_DIR / "data" / "clean_products.json"
OUTPUT_JSON = BASE_DIR / "data" / "enriched_products.json"

print("🔄 Initialising Zero-Shot NLP Classification Engine...")
# This loads a local, highly accurate semantic evaluation model
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli", device=-1)

# Define strict enterprise taxonomy lists
FINISH_LABELS = ["matte", "dewy or radiant", "satin", "shimmer or glossy", "unspecified"]
COLOR_FAMILIES = ["nude", "red", "pink", "coral", "brown", "clear", "black", "purple", "gold", "unspecified"]

print(f"📦 Loading raw catalog from {INPUT_JSON}...")
df = pd.read_json(str(INPUT_JSON), lines=True)

enriched_records = []

print("🧠 Processing semantic enrichment via NLP model...")
# Using tqdm to show a professional progress bar during processing
for idx, row in tqdm(df.iterrows(), total=len(df)):
    record = row.to_dict()
    
    # --- 1. Contextual Finish Extraction ---
    desc = str(row.get('description', '')).strip()
    name = str(row.get('name', '')).strip()
    combined_text = f"Product: {name}. Description: {desc}"
    
    if desc and len(desc) > 10:
        # The model reads the sentence contextually to choose the best label
        finish_res = classifier(combined_text, candidate_labels=FINISH_LABELS)
        top_finish = finish_res['labels'][0]
        record['extracted_finish'] = "dewy" if top_finish == "dewy or radiant" else ("shimmer" if top_finish == "shimmer or glossy" else top_finish)
    else:
        record['extracted_finish'] = "unspecified"

    # --- 2. Color Standardisation ---
    color_cats = row.get('color_categories', [])
    shades = row.get('shade_names', [])
    
    # Combine messy string lists into a singular descriptive sentence for the model
    raw_color_text = ", ".join(color_cats + shades)
    
    if raw_color_text.strip():
        color_res = classifier(raw_color_text, candidate_labels=COLOR_FAMILIES)
        record['standardised_color'] = color_res['labels'][0]
    else:
        record['standardised_color'] = "unspecified"
        
    enriched_records.append(record)

print(f"💾 Saving clean, enriched dataset to {OUTPUT_JSON}...")
with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    for rec in enriched_records:
        f.write(json.dumps(rec) + "\n")

print("✅ Stage 1 Complete: Catalog is enriched with professional ML taxonomies!")