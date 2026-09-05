# StatSkill AI — Zero-Cost Free-Tier Deployment Runbook

This guide outlines exactly how to configure and deploy StatSkill AI across the 100% free-tier stack with no credit card required.

---

## 1. Supabase (Postgres + pgvector + Storage)
- **Sign Up**: [supabase.com](https://supabase.com) (Free tier)
- **Create Project**: Name: `statskill-ai`, Database Password: Save securely.
- **Enable pgvector**:
  - Open Supabase Dashboard → **Database** → **Extensions**.
  - Search for `vector` and click **Enable**.
- **Get Connection String**:
  - Go to **Project Settings** → **Database** → **Connection string**.
  - Choose **URI** (Transaction pooler or Session mode, Port 6543 or 5432).
  - Format for asyncpg:
    `postgresql+asyncpg://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
- **Create Storage Bucket**:
  - Go to **Storage** → Create new bucket named `documents` (Public or Private).

---

## 2. Render (FastAPI Web Service)
- **Sign Up**: [render.com](https://render.com) (Free tier)
- **Create Web Service**:
  - Connect your GitHub repo.
  - Root Directory: `backend`
  - Runtime: `Python 3`
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Add Environment Variables in Render Dashboard**:
  - `DATABASE_URL`: Your Supabase asyncpg URL.
  - `JWT_SECRET`: Random 32-char hex string.
  - `GEMINI_API_KEY`: From Google AI Studio.
  - `CORS_ORIGINS`: `["https://statskill-frontend.vercel.app"]`

---

## 3. Vercel (React Vite Frontend)
- **Sign Up**: [vercel.com](https://vercel.com) (Hobby tier)
- **Import Git Repository**:
  - Root Directory: `frontend`
  - Framework Preset: `Vite`
  - Build Command: `npm run build`
  - Output Directory: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: Your Render backend URL (`https://statskill-backend.onrender.com`)

---

## 4. Google Gemini & Groq APIs
- **Google AI Studio**: [aistudio.google.com](https://aistudio.google.com)
  - Generate a free API key for `gemini-1.5-flash` or `gemini-2.0-flash`.
- **Groq Cloud**: [console.groq.com](https://console.groq.com)
  - Generate a free API key for ultra-fast Llama 3 70B/8B inference.
