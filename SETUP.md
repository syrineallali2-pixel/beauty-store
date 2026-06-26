# Beauty API - Setup & Launch Guide

## Overview
This project is a **full-stack beauty product recommendation system** with:
- **Backend**: FastAPI + Groq AI + FAISS Vector Search
- **Frontend**: Next.js + React + TailwindCSS
- **No Docker** (removed) - runs directly on your machine

---

## ✅ Prerequisites

1. **Python 3.10+** - [Download](https://www.python.org/downloads/)
2. **Node.js 18+** - [Download](https://nodejs.org/)
3. **Groq API Key** - [Get free key](https://console.groq.com/keys)

---

## 🚀 Quick Start

### Step 1: Setup Backend

```bash
cd e:\beauty-api\backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure API Key

Your `.env` file in the root (`e:\beauty-api\.env`) already has:
```
GROQ_API_KEY=your_groq_api_key_here
```

**Verify this is your valid Groq API key** - if not, update it.

### Step 3: Start Backend

```bash
cd e:\beauty-api\backend

# Make sure venv is activated, then:
python -m uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

✅ Backend runs at: **http://localhost:8080**

Test it: `curl http://localhost:8080/`

---

### Step 4: Setup Frontend

In a **NEW terminal window**:

```bash
cd e:\beauty-api\frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

✅ Frontend runs at: **http://localhost:3000**

---

## 🧪 Testing the Integration

1. Open **http://localhost:3000** in your browser
2. Click the ✨ (beauty assistant button) in the bottom-right
3. Type a query like: "I want moisturizer for dry skin"
4. The AI (powered by Groq) will:
   - Search for similar products using FAISS
   - Generate recommendations using Groq's LLM
   - Return matching products

---

## 📋 What Changed?

### Removed:
- ❌ `docker-compose.yml`
- ❌ `Dockerfile`

### Updated:
- ✅ `backend/app.py` - Switched from Gemini to Groq API
- ✅ All Gemini imports/references removed
- ✅ Groq client properly initialized with your API key

### Verified:
- ✅ Frontend correctly calls `/api/chat` endpoint
- ✅ `.env` file contains valid `GROQ_API_KEY`
- ✅ Dependencies include `groq==0.19.0`

---

## 🔧 Troubleshooting

### Backend won't start?
```bash
# Make sure you're in the correct directory:
cd e:\beauty-api\backend

# Check Python version:
python --version  # Should be 3.10+

# Try installing dependencies again:
pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend won't start?
```bash
cd e:\beauty-api\frontend
npm install  # Clear and reinstall
npm run dev
```

### API key errors?
- Check your `.env` file has `GROQ_API_KEY=...` (not empty)
- Get a new key from https://console.groq.com/keys if needed
- Restart the backend after updating `.env`

### Port already in use?
```bash
# Backend on different port:
python -m uvicorn app:app --host 0.0.0.0 --port 8081

# Frontend on different port:
npm run dev -- -p 3001
```

---

## 📝 File Structure

```
e:\beauty-api\
├── backend/
│   ├── app.py           # FastAPI + Groq integration
│   ├── requirements.txt  # Python dependencies
│   └── venv/            # Virtual environment (create after setup)
├── frontend/
│   ├── package.json
│   ├── app/
│   ├── components/
│   └── node_modules/    # Create after npm install
├── data/
│   ├── products.index   # FAISS vector index
│   └── catalog.parquet  # Product database
├── .env                 # Your Groq API key
└── SETUP.md            # This file
```

---

## 🎯 Next Steps

- **Customize recommendations**: Edit the prompt in `backend/app.py` (around line 120)
- **Add more products**: Update `data/catalog.parquet` and rebuild FAISS index
- **Change styling**: Edit CSS in `frontend/app/globals.css`
- **Deploy**: Use platforms like Vercel (frontend) + Railway/Render (backend)

---

## ✨ Happy coding!
