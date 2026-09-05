# StatSkill AI — 100% Free-Tier Cloud Deployment Guide
### SIH Problem Statement 26101: Production Runbook for Teammates & Evaluators

This guide documents the exact step-by-step deployment procedure to launch the full StatSkill AI platform on legitimate, zero-cost cloud tiers in **under 15 minutes**.

---

## 🏛️ Deployment Architecture & Cost Matrix (₹0 Spend)

| Component | Cloud Provider | Free Tier Specification | Cost to Taxpayer |
| :--- | :--- | :--- | :--- |
| **Database & Vector Index** | [Supabase](https://supabase.com) | 500 MB PostgreSQL 16 DB + `pgvector` extension + 1 GB Storage | **₹0.00** |
| **Backend API Service** | [Render](https://render.com) | 512 MB RAM, 0.1 CPU, auto-wake ASGI container | **₹0.00** |
| **Frontend Web App** | [Vercel](https://vercel.com) | 100 GB bandwidth, global Edge CDN, auto-deploy on push | **₹0.00** |
| **LLM Inference** | [Google AI Studio](https://aistudio.google.com) | Gemini 1.5/2.0 Flash (1,500 requests/day free tier) | **₹0.00** |
| **Secondary LLM Fallback** | [Groq Cloud](https://console.groq.com) | Llama 3.1 8B Instant (14,400 requests/day free tier) | **₹0.00** |
| **Total Cloud Expense** | — | **Fully Functional GovTech Production Platform** | **₹0.00 / month** |

---

## 📋 Prerequisites Checklist

Before you begin, ensure you have free accounts on:
1. [GitHub](https://github.com) (hosting the code repository).
2. [Supabase](https://supabase.com) (free PostgreSQL + vector database).
3. [Render](https://render.com) (free Python web service).
4. [Vercel](https://vercel.com) (free frontend hosting).
5. At least one free API key:
   - [Google AI Studio API Key](https://aistudio.google.com) (Gemini), **or**
   - [Groq Cloud API Key](https://console.groq.com) (Llama 3.1).

---

## 🚀 Step-by-Step 15-Minute Deployment Runbook

```mermaid
sequenceDiagram
    autonumber
    participant Dev as Teammate / Evaluator
    participant Supa as Supabase (PostgreSQL + pgvector)
    participant Ren as Render (FastAPI Web Service)
    participant Ver as Vercel (React 19 SPA)

    Dev->>Supa: 1. Create Project & Execute supabase_schema.sql
    Dev->>Ren: 2. Deploy Web Service with Supabase DATABASE_URL
    Dev->>Dev: 3. Run seed_demo_users.py against Supabase
    Dev->>Ver: 4. Deploy Frontend with VITE_API_BASE_URL (Render)
    Ver-->>Dev: 5. Live Production Platform Ready (₹0 Cost)
```

---

### Step 1: Database Setup on Supabase (Time: ~3 Minutes)

1. Log in to [Supabase](https://supabase.com) and click **"New Project"**.
   - **Name**: `statskill-ai`
   - **Database Password**: Choose a strong password (e.g. `GovTechMoSPI2026!`) and note it down.
   - **Region**: Choose closest to target users (e.g. `ap-south-1` Mumbai or `ap-southeast-1` Singapore).
   - Click **"Create new project"** (takes ~90 seconds to provision).

2. **Initialize Database Schema & pgvector**:
   - In your Supabase project dashboard, navigate to **SQL Editor** (left sidebar).
   - Click **"New Query"**.
   - Open [`backend/scripts/supabase_schema.sql`](backend/scripts/supabase_schema.sql) from this repository, copy the entire SQL text, paste it into the editor, and click **"Run"**.
   - Output will confirm all 7 core tables created (`users`, `user_skills`, `courses`, `enrollments`, `quizzes`, `quiz_questions`, `competencies`) and the `vector` extension enabled.

3. **Obtain Connection String**:
   - Go to **Project Settings** -> **Database** -> **Connection string**.
   - Select the **URI** tab.
   - Copy the connection string:
     ```text
     postgresql://postgres:[YOUR-PASSWORD]@db.vupdeaqxftanhturjrrq.supabase.co:5432/postgres
     ```
   - *Note:* StatSkill AI's configuration automatically normalizes `postgresql://` to `postgresql+asyncpg://` at runtime.

---

### Step 2: Backend API Deployment on Render (Time: ~5 Minutes)

#### Option A: 1-Click Blueprint (Recommended)
Because this repository includes [`render.yaml`](render.yaml), Render can auto-configure the entire service:
1. Log in to [Render](https://render.com) and click **"New +"** -> **"Blueprint"**.
2. Select your `StatSkill AI` GitHub repository.
3. Render automatically reads `render.yaml` and prepares the `statskill-backend` service.
4. Input your environment variables when prompted (see table below) and click **"Apply"**.

#### Option B: Manual Web Service Setup
If you prefer configuring via the web dashboard:
1. Click **"New +"** -> **"Web Service"**.
2. Connect your GitHub repository.
3. Configure the following fields:
   - **Name**: `statskill-backend`
   - **Region**: Singapore or Frankfurt (choose nearest to your Supabase region)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free` (512 MB RAM, 0.1 CPU)

4. **Environment Variables Configuration**:
   Under the **Environment Variables** section, add:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `APP_ENV` | `production` | Enables production mode |
   | `DEBUG` | `false` | Disables debug query printing |
   | `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` | Your Supabase connection string from Step 1 |
   | `JWT_SECRET` | *(Click "Generate" or enter a 32+ char random string)* | Cryptographic key for session signing |
   | `CORS_ORIGINS` | `https://*.vercel.app,http://localhost:5173` | Allowed frontend domains |
   | `GEMINI_API_KEY` | *(Your Google AI Studio API Key)* | Free-tier LLM for RAG quiz generation |
   | `GROQ_API_KEY` | *(Your Groq Cloud API Key, optional)* | Ultra-fast fallback LLM inference |

5. Click **"Create Web Service"**. Render will install dependencies, build the container, and deploy.
6. Once deployed, note down your live backend URL (e.g. `https://statskill-backend.onrender.com`).
   - Test health check by visiting: `https://statskill-backend.onrender.com/health`
   - Expected response: `{"status":"healthy","database_connected":true,...}`

---

### Step 3: Seed Cloud Database with Demo Accounts (Time: ~2 Minutes)

Seed the live Supabase database with realistic official profiles (`analyst@mospi.gov.in`, `director@mospi.gov.in`, `field_officer@mospi.gov.in`):

From your local terminal inside `backend/`:
```bash
# Windows PowerShell:
$env:DATABASE_URL="postgresql+asyncpg://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
.\venv\Scripts\python.exe scripts\seed_demo_users.py

# Linux / macOS:
export DATABASE_URL="postgresql+asyncpg://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
python3 scripts/seed_demo_users.py
```
*Output will confirm 25 courses and 3 official demo users seeded successfully into Supabase!*

---

### Step 4: Frontend Deployment on Vercel (Time: ~3 Minutes)

1. Log in to [Vercel](https://vercel.com) and click **"Add New..."** -> **"Project"**.
2. Import your `StatSkill AI` GitHub repository.
3. Configure the project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   Add the following variable:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://statskill-backend.onrender.com` *(Your Render URL from Step 2, no trailing slash)*
5. Click **"Deploy"**. Vercel will build and deploy the React 19 app in ~45 seconds.
6. After deployment, update Render's `CORS_ORIGINS` variable with your exact Vercel production domain (e.g. `https://statskill-ai.vercel.app`) and trigger a quick redeploy on Render.

---

## ⚡ Handling Free-Tier Cold Starts (Zero UX Degradation)

Render's free-tier web service automatically suspends (spins down to 0) after **15 minutes of inactivity** to conserve cloud resources. When an official or evaluator visits the platform after an idle period, the first incoming request triggers a container boot taking **~30 to 45 seconds**.

### Built-in StatSkill AI Cold-Start Protections:
1. **Extended Client Timeout (60s)**:
   [`frontend/src/services/api.ts`](frontend/src/services/api.ts) sets Axios timeout to `60000ms`, preventing browser timeout errors during container spinning.
2. **Preemptive Health Ping**:
   [`frontend/src/components/ServerWakeNotification.tsx`](frontend/src/components/ServerWakeNotification.tsx) automatically dispatches a lightweight non-blocking probe to `/health` as soon as the user opens the web app.
3. **Interactive GovTech Wake Indicator**:
   If any API request is in-flight for more than 2.5 seconds, the application automatically displays an elegant, non-intrusive floating status banner:
   ```text
   🌐 Waking up Cloud Web Service (14s) [Render Free Tier (~30s)]
   Render instances sleep when idle. First request takes ~30-45s to boot. Please wait...
   ```
4. **Instant Auto-Dismiss**:
   Once the server wakes and returns HTTP 200, the banner flashes:
   ```text
   ✅ Cloud Web Service Active — FastAPI engine is awake and responding.
   ```
   and fades away cleanly within 2.8 seconds.

---

## 🔑 Demo Evaluator Credentials

Once deployed, evaluators can click the **1-Click Demo Buttons** on the login page or log in with:

| Cadre Role | Email | Password | Pre-loaded Data |
| :--- | :--- | :--- | :--- |
| **Statistical Analyst** | `analyst@mospi.gov.in` | `password123` | 20 sub-skills, 3 active course enrollments, 2 completed quizzes (English & Hindi) |
| **Director / Admin** | `director@mospi.gov.in` | `password123` | Administrative leadership portal, predictive training demand forecasting |
| **Field Operations Officer** | `field_officer@mospi.gov.in` | `password123` | High field data collection competency, technical ML capability deficits |

---

## 🛠️ Troubleshooting & Verification FAQ

### Q1: The backend fails to connect to Supabase with `asyncpg.exceptions.InvalidPasswordError`
- **Fix**: Check for special characters in your database password (e.g. `@`, `#`, `/`). If your password contains `@`, it must be URL-encoded (`%40`) or reset in Supabase Settings to alphanumeric characters.

### Q2: Direct link navigation on Vercel gives 404 (e.g. `/quiz` or `/admin`)
- **Fix**: Verify that [`frontend/vercel.json`](frontend/vercel.json) is present in the repository with the rewrite rule (`"source": "/(.*)", "destination": "/index.html"`).

### Q3: Browser console shows `CORS header 'Access-Control-Allow-Origin' missing`
- **Fix**: In the Render Dashboard, check the `CORS_ORIGINS` environment variable. Ensure your Vercel URL is included exactly (e.g. `https://statskill-ai.vercel.app` with no trailing slash).

### Q4: AI Quiz Generator returns fallback mock questions instead of custom PDF questions
- **Fix**: Ensure that `GEMINI_API_KEY` (or `GROQ_API_KEY`) is set in the Render environment variables. If no LLM key is configured, StatSkill AI gracefully falls back to syllabus ground-truth templates to prevent demo crashes.
