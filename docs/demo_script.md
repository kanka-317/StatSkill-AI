# StatSkill AI — 5-Minute Evaluator Presentation & Demo Script
### SIH Problem Statement 26101: AI-Powered Competency & Learning-Intelligence Platform for Government Statistical Cadres (MoSPI / NSSTA)

---

## ⏱️ Executive Timeline Overview (Total: 5 Minutes)

| Time | Phase | Target Screen / Flow | Key Message for Evaluators |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:45** | **The GovTech Problem & Vision** | Slide / Auth Landing Page | Why standard LMS fails statistical cadres & what SIH PS 26101 demands. |
| **0:45 - 1:30** | **Cadre Onboarding & Diagnostic** | 1-Click Login → Radar Dashboard | 20-subskill MoSPI framework & multi-axis competency baseline. |
| **1:30 - 2:45** | **Explainable Learning Intelligence** | Priority Deficits → Course Engine | Not keyword matching: gap-weighted recommendations linked to iGOT/NSSTA. |
| **2:45 - 4:00** | **RAG Assessment Pipeline** | AI MCQ Generator (PDF Upload) | Circular-to-Quiz in English & Hindi with adaptive competency elevation. |
| **4:00 - 4:45** | **Executive Leadership Analytics** | 1-Click Role Switch → Admin Portal | Predictive training demand forecasting for NSSTA quarterly calendars. |
| **4:45 - 5:00** | **Closing & ₹0 Free-Tier Architecture** | Architecture Diagram / Q&A | Full GovTech compliance with ₹0 taxpayer deployment cost. |

---

## 🎙️ Step-by-Step Script & Narration

### Part 1: The Problem & The Vision (0:00 - 0:45)
- **Screen**: [AuthPage](http://localhost:5173/auth)
- **Action**: Show the sleek, GovTech-branded landing page with quick evaluator demo credential buttons.
- **Spoken Narration**:
  > *"Respected Evaluators, India's statistical infrastructure handles GDP, CPI, and NSSO surveys driving trillion-dollar national policies. Yet, under the National Programme for Civil Services Capacity Building (Mission Karmayogi), training allocation in statistical cadres is still largely ad-hoc.
  >
  > When an officer needs training, conventional Learning Management Systems (LMS) offer static course lists. They cannot diagnose whether a Statistical Analyst has a 35% capability deficit in 'Survey Sampling Weights' versus 'Time Series Forecasting'.
  >
  > Today, we present **StatSkill AI** — an AI-powered competency diagnostic, explainable recommendation engine, and RAG-driven assessment pipeline built specifically for MoSPI and NSSTA."*

---

### Part 2: Cadre Onboarding & The Multi-Axis Diagnostic (0:45 - 1:30)
- **Screen**: Click **"Analyst Demo (1-Click)"** → Automatically signs in as **Rajesh Kumar** (`analyst@mospi.gov.in`) and lands on [DashboardPage](http://localhost:5173/dashboard).
- **Action**:
  1. Hover over the **Centerpiece 4-Domain Radar Chart**. Toggle the "Current Level" and "Required Benchmark" series chips.
  2. Scroll down to the **Priority Competency Deficits** cards.
  3. Click on **"Survey Sampling & Methodology"** to open the interactive **Skill Detail Modal**.
- **Spoken Narration**:
  > *"With one click, we sign in as Rajesh Kumar, a Statistical Analyst at the National Sample Survey Office (NSSO).
  >
  > Notice what greets him: not a course catalog, but an **empirical 4-domain competency diagnostic**: Statistical, Technical, Digital Governance, and Behavioural.
  >
  > The radar chart directly contrasts his self-assessed and assessed capabilities against the MoSPI Cadre Benchmark.
  >
  > Instantly, StatSkill AI isolates his top capability bottlenecks:
  > 1. Machine Learning & Predictive Modeling (-40% gap)
  > 2. Python for Data Science (-40% gap)
  > 3. Survey Sampling & Methodology (-35% gap)
  >
  > Clicking any skill launches a drill-down modal showing exactly where he stands and offers a 1-click action to take an AI quiz or filter corresponding courses."*

---

### Part 3: Explainable Course Recommendation Engine (1:30 - 2:45)
- **Screen**: Scroll to the **"Cadre Recommended Learning Modules"** section.
- **Action**:
  1. Filter by Domain dropdown: Select **"Statistical"**.
  2. Point out the **"Why this is recommended"** badge and toggle the **"Explain"** information banner.
  3. Click **"Enroll"** on *'Survey Sampling & Multi-stage Estimation'*. Show the instant optimistic state transition to "Enrolled".
- **Spoken Narration**:
  > *"Every course recommended here is explainable. StatSkill AI does not recommend Python just because it is popular. Look at the explanation:
  >
  > **'Recommended because your Survey Sampling competency is 35% below the required level for Statistical Analyst.'**
  >
  > These courses are mapped directly to mock **iGOT Karmayogi** and **NSSTA Academy** curricula. Officials can filter by domain, sort by priority deficit or duration, and enroll with instantaneous feedback."*

---

### Part 4: RAG-Powered AI MCQ Generator in English & Hindi (2:45 - 4:00)
- **Screen**: Navigate to [QuizPage](http://localhost:5173/quiz).
- **Action**:
  1. Click **"Load Sample NSSTA Manual"** (or upload `docs/sample-pdfs/NSSTA_Survey_Sampling_Manual.pdf`).
  2. Show the language selector: Toggle between **"English"** and **"हिन्दी (Hindi)"**. Keep Hindi or English selected.
  3. Click **"Generate Quiz with AI (RAG Pipeline)"**.
  4. Show the animated 3-step pipeline:
     - *Step 1: PyMuPDF extraction & whitespace cleaning*
     - *Step 2: Semantic chunking & conceptual retrieval*
     - *Step 3: LLM MCQ synthesis with ground-truth citations*
  5. Answer 4 of the 5 questions.
  6. Click **"Submit Assessment"** → Notice the prompt warning about unanswered questions. Click **"Submit Anyway"**.
  7. Show the **Adaptive Competency Elevation Banner**: Score + Proficiency elevated from 45% to 51% (+6%) in real-time!
- **Spoken Narration**:
  > *"Now for our flagship innovation: how do we continuously test and elevate competencies when statistical guidelines change?
  >
  > Here, an officer uploads an official PDF — like this NSSTA Sampling Manual.
  >
  > Our backend pipeline parses the PDF using PyMuPDF, semantically chunks the text, retrieves high-density conceptual paragraphs, and uses our LLM pipeline (Gemini / Groq) to generate rigorous, Cadre-aligned MCQs.
  >
  > Notice the language selector: StatSkill AI generates assessments in both **English and Hindi**, directly supporting Rajbhasha mandates and regional officers.
  >
  > Let's answer the questions and submit...
  >
  > Look at the results card: every answer is graded against the manual's exact ground truth with cited explanations. Crucially, **his proficiency score in Survey Sampling was adaptively elevated by +6% in the database**, directly updating his live radar!"*

---

### Part 5: Leadership Portal & Predictive Training Demand (4:00 - 4:45)
- **Screen**: Click **"Admin"** in the top navigation bar.
- **Action**:
  1. Non-admin gate appears: Click **"Switch to Admin Demo Mode (1-Click)"** → confirm modal.
  2. Lands on [AdminDashboardPage](http://localhost:5173/admin).
  3. Highlight the 4 KPI cards: 3 Registered Officials, 63.8% Org-wide Competency, 18.2% Capability Gap, 6 Active Enrollments.
  4. Point out **Chart 1 (Department-Wise Deficit)** and **Chart 2 (Predictive Training Demand)**.
  5. Use the **Division Filter dropdown** and sort the **Course Capacity Table** by clicking headers.
- **Spoken Narration**:
  > *"Now, let's look through the eyes of MoSPI Leadership and the Director of NSSTA.
  >
  > An LMS tells leadership how many people completed video lessons. **StatSkill AI tells leadership where systemic organizational vulnerabilities exist.**
  >
  > Here, in real time:
  > - **Department-Wise Capability Deficit**: NSSO has an average 28.5 point gap, whereas FOD has 22 points.
  > - **Predictive Training Demand**: This chart aggregates skill gaps across all officials to forecast exactly which courses NSSTA Academy must schedule in the upcoming quarterly training calendar.
  > - Administrators can sort uptake tables, filter by division, and track capacity uptake across both iGOT Karmayogi and NSSTA."*

---

### Part 6: Closing & The ₹0 Free-Tier Architecture (4:45 - 5:00)
- **Screen**: Return to Dashboard or open Architecture diagram.
- **Spoken Narration**:
  > *"To conclude: StatSkill AI turns training from passive compliance into an active, data-driven competency engine.
  >
  > And most importantly for public deployment: **every component of this prototype is built on a 100% free-tier architecture** — React on Vercel, FastAPI on Render, PostgreSQL with pgvector on Supabase, and LLM inference via Google Gemini and Groq — requiring **₹0 taxpayer expenditure** for evaluation and piloting.
  >
  > Thank you, and we look forward to your questions!"*
