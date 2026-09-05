# StatSkill AI (SIH PS 26101)
### AI-Powered Competency & Learning-Intelligence Platform for Government Officials

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deployment Cost](https://img.shields.io/badge/Deployment%20Cost-%E2%82%B90%20(100%25%20Free%20Tier)-brightgreen.svg)](#free-deployment-stack)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20SQLAlchemy%202.0-009688.svg)](/backend)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%20%2B%20Tailwind%20CSS-61DAFB.svg)](/frontend)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-336791.svg)](https://supabase.com)

---

## 📌 Problem Statement Overview (SIH PS 26101)
Government departments (such as the **Ministry of Statistics and Programme Implementation - MoSPI**, NSSO, and state-level planning bodies) handle vast amounts of public statistical data: National Accounts, Index of Industrial Production (IIP), Consumer Price Index (CPI), Annual Survey of Industries (ASI), and Periodic Labour Force Surveys (PLFS).

However, a key operational challenge is **identifying and addressing skill gaps in statistical competencies** across the civil workforce:
- Statistical techniques evolve rapidly (modern Python/R pipelines, automated data reconciliation, machine learning for survey validation).
- Competency benchmarks differ substantially by cadre, role, and administrative seniority.
- Training allocation is often ad-hoc rather than driven by empirical, AI-analyzed skill diagnostics.

**StatSkill AI** bridges this divide by providing an intelligent diagnostic, vector-based competency mapping, and personalized learning pathway generator for government officials.

---

## 🚀 Why StatSkill AI is NOT Just Another LMS

Traditional Learning Management Systems (LMS) treat civil service upskilling as a passive checklist. **StatSkill AI** transforms it into an empirical, data-driven competency engine:

| Traditional LMS (e.g. Moodle, generic portals) | StatSkill AI (SIH PS 26101 Platform) |
| :--- | :--- |
| **Catalog Browsing**: Passive directory of courses with zero individualized diagnosis. | **Diagnostic-First**: Immediate 4-domain radar diagnostic highlighting exact percentage capability gaps against cadre benchmarks. |
| **Keyword Search**: Matches courses by title keywords regardless of real need. | **Explainable AI Matching**: Ranks courses by gap magnitude with explicit rationale (*"Recommended because your Survey Sampling competency is 35% below benchmark"*). |
| **Static Pre-baked Quizzes**: Question banks written once and rapidly outdated. | **RAG-Powered Assessment Pipeline**: Upload ANY official training manual, circular, or gazette PDF to get instant, rigorous MCQs in **English and Hindi**. |
| **Disconnected Scores**: Assessment grades sit inert in separate tables. | **Adaptive Competency Elevation**: Assessment performance dynamically elevates the official's live radar profile in real time. |
| **Basic Completion Tracking**: Leadership only tracks video completion percentages. | **Predictive Training Demand**: Aggregates cross-cadre deficits into predictive training demand forecasts for NSSTA quarterly calendars. |

---

## 🎯 Quick Demo Access for Hackathon Evaluators

For immediate demonstration without manual registration, 3 realistic demo accounts are pre-seeded in the database:

| Role | Email | Password | Pre-loaded Data Profile |
| :--- | :--- | :--- | :--- |
| **Statistical Analyst** | `analyst@mospi.gov.in` | `password123` | 20 cadre skills, 3 enrolled courses, 2 completed quizzes (English & Hindi) |
| **Director / Admin** | `director@mospi.gov.in` | `password123` | Leadership privileges, cross-cadre department analytics, training forecasts |
| **Field Operations Officer** | `field_officer@mospi.gov.in` | `password123` | High field-data collection competency with technical ML deficits |

*Quick Evaluation Resources:*
- 🚀 **[15-Minute 100% Free-Tier Deployment Runbook](DEPLOYMENT.md)**
- ⏱️ **[5-Minute Evaluator Presentation & Demo Script](docs/demo_script.md)**
- 🏛️ **[System Architecture & ₹0 Free-Tier Matrix](docs/architecture.md)**
- 📄 **[Official Sample PDFs for Quiz Generation](docs/sample-pdfs/)**
- 📋 **[Full Button Functionality Audit & Changelog](CHANGE-LOG.md)**

---

## 💡 Product Concept & Key Capabilities

1. **GovTech Competency Framework Alignment**:
   - Structured statistical skill taxonomy designed for central and state statistical officers.
   - Built to align with the principles of the **Mission Karmayogi** National Programme for Civil Services Capacity Building (NPCSCB).

2. **Vector-Powered Competency Matching (`pgvector`)**:
   - Matches official proficiencies against department requirements using high-dimensional cosine distance embeddings.
   - Eliminates simple keyword mismatches and captures deep semantic capability relationships.

3. **Interactive Competency Radar & Gap Visualizer**:
   - Real-time interactive radar and bar analytics (built with **Recharts**) showing individual capability vs. cadre benchmark.

4. **Dynamic AI Learning Pathways**:
   - LLM-synthesized micro-modules and milestone recommendations powered by Google Gemini and Groq.

5. **100% Free-Tier Architecture (₹0 Deployment)**:
   - Engineered from day one to operate completely within legitimate free-tier service limits for hackathon prototyping and zero taxpayer cost.

---

## 🧱 Free Deployment Stack

| Layer | Service | Free Tier Allocation |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | Unlimited personal projects & automated global CDN |
| **Backend API** | [Render](https://render.com) | Free Web Service (auto-wakes on HTTP request) |
| **Database & Vectors** | [Supabase](https://supabase.com) | 500 MB PostgreSQL + `pgvector` built-in |
| **Storage (PDFs)** | [Supabase Storage](https://supabase.com) | 1 GB object storage for manuals and circulars |
| **LLM Inference** | [Google Gemini](https://aistudio.google.com) & [Groq](https://console.groq.com) | Gemini 1.5/2.0 Flash free tier & Groq Llama 3 free inference |
| **Authentication** | Self-Rolled JWT | Zero vendor lock-in or recurring auth subscription |

---

## 📂 Repository Structure

```text
StatSkill AI/
├── backend/                  # FastAPI Python backend
│   ├── alembic/              # Async database migration scripts
│   ├── app/
│   │   ├── api/v1/           # API v1 routes (health, auth, etc.)
│   │   ├── core/             # Settings (pydantic-settings), database, security
│   │   ├── models/           # SQLAlchemy models with pgvector embeddings
│   │   └── schemas/          # Pydantic validation schemas
│   ├── .env.example          # Environment variables template
│   ├── Dockerfile            # Container build definition
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 19 + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── services/         # Axios API clients
│   │   └── App.tsx           # Main application & prototype preview
│   ├── .env.example          # Frontend environment variables template
│   ├── Dockerfile            # Container build definition
│   └── package.json          # Node dependencies & scripts
├── docs/                     # Documentation & Presentation Assets
│   ├── architecture.md       # Mermaid system architecture diagram
│   ├── demo_script.md        # Hackathon pitch & demonstration script
│   └── stack.md              # Zero-cost cloud deployment runbook
├── docker-compose.yml        # Local development multi-container orchestration
└── README.md                 # Project guide & documentation
```

---

## 🚀 Getting Started Locally

You can run StatSkill AI locally using **Docker Compose** (recommended for all-in-one setup) or directly on your machine.

### Option A: Running with Docker Compose (Recommended)

**Prerequisites**: Docker & Docker Compose installed.

1. **Clone the repository and enter the directory**:
   ```bash
   git clone https://github.com/your-org/statskill-ai.git
   cd statskill-ai
   ```

2. **Start all services** (PostgreSQL with `pgvector`, FastAPI backend, and Vite frontend):
   ```bash
   docker-compose up --build
   ```

3. **Access the application**:
   - 🌐 **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
   - ⚡ **Backend API**: [http://localhost:8000](http://localhost:8000)
   - 📖 **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - 🩺 **System Health Endpoint**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

### Option B: Running Standalone (Without Docker)

#### 1. Backend Setup
1. Open a terminal and enter `/backend`:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase or local PostgreSQL URL
   ```
5. Launch the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### 2. Frontend Setup
1. Open a second terminal and enter `/frontend`:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Launch Vite development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔒 Security & Data Confidentiality
StatSkill AI is designed with public sector privacy principles:
- **Self-Rolled JWT**: No external identity providers hold government official records.
- **Role-Based Access Control (RBAC)**: Fine-grained access separation between officials, cadre supervisors, and platform administrators.
- **De-identified AI Queries**: Only statistical taxonomies and competence descriptions are passed to LLMs.

---

## 📄 License & Team
Developed for **Smart India Hackathon (SIH) — Problem Statement 26101**.
Licensed under the [MIT License](LICENSE).
