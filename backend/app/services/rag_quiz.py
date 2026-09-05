import json
import re
import logging
from typing import List, Dict, Any, Optional
import httpx
import pymupdf as fitz  # PyMuPDF

from app.core.config import settings

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract clean text from PDF bytes using PyMuPDF (fitz)."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_parts = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            if text and text.strip():
                text_parts.append(text.strip())
        doc.close()
        full_text = "\n\n".join(text_parts)
        if not full_text.strip():
            raise ValueError("No extractable text found in the PDF. It may be scanned or empty.")
        return full_text
    except Exception as e:
        logger.error(f"PyMuPDF text extraction failed: {e}")
        raise ValueError(f"Could not read PDF document: {str(e)}")


def chunk_text(text: str, chunk_size: int = 2500, overlap: int = 300) -> List[str]:
    """
    Split text into sentence-aware chunks of ~500-800 tokens (~2000-3000 chars)
    with sliding overlap to preserve contextual continuity.
    """
    cleaned_text = re.sub(r"[ \t]+", " ", text)
    cleaned_text = re.sub(r"\n{3,}", "\n\n", cleaned_text).strip()

    paragraphs = cleaned_text.split("\n\n")
    chunks: List[str] = []
    current_chunk: List[str] = []
    current_len = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        para_len = len(para)
        if current_len + para_len > chunk_size and current_chunk:
            combined = "\n\n".join(current_chunk)
            chunks.append(combined)
            # Retain overlap from end of current chunk
            overlap_text = combined[-overlap:] if len(combined) > overlap else ""
            current_chunk = [overlap_text, para] if overlap_text else [para]
            current_len = len(overlap_text) + para_len
        else:
            current_chunk.append(para)
            current_len += para_len

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks if chunks else [text[:chunk_size]]


def retrieve_salient_chunks(chunks: List[str], query: str = "", top_k: int = 4) -> List[str]:
    """
    Ranks chunks by relevance to query/topic or information density
    and returns the top-k chunks.
    """
    if len(chunks) <= top_k:
        return chunks

    if not query.strip():
        # Choose chunks spaced evenly across the document to cover intro, core, and conclusion
        step = max(1, len(chunks) // top_k)
        selected = [chunks[i] for i in range(0, min(len(chunks), top_k * step), step)]
        return selected[:top_k]

    # Keyword density scoring
    keywords = set(re.findall(r"\w+", query.lower()))
    scored_chunks = []
    for idx, chunk in enumerate(chunks):
        words = re.findall(r"\w+", chunk.lower())
        score = sum(1 for w in words if w in keywords)
        # Add slight position bonus for early core concepts
        pos_bonus = 1.0 / (idx + 1)
        scored_chunks.append((score + pos_bonus, chunk))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored_chunks[:top_k]]


def clean_json_response(raw_text: str) -> str:
    """Removes markdown code fences and extraneous text surrounding JSON."""
    text = raw_text.strip()
    # Remove markdown code blocks if present
    if "```" in text:
        match = re.search(r"```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```", text, re.DOTALL)
        if match:
            return match.group(1).strip()
        # Fallback: strip line with ```
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text, flags=re.MULTILINE)
        text = re.sub(r"\n?```$", "", text, flags=re.MULTILINE)

    # Attempt to locate first '[' and last ']'
    start_bracket = text.find("[")
    end_bracket = text.rfind("]")
    if start_bracket != -1 and end_bracket != -1 and end_bracket > start_bracket:
        return text[start_bracket : end_bracket + 1]

    return text.strip()


async def call_gemini_api(prompt: str) -> str:
    """Calls Google Gemini API (gemini-1.5-flash) using free-tier REST endpoint."""
    api_key = settings.GEMINI_API_KEY.strip()
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    # Try gemini-flash-latest, fallback to gemini-3.6-flash if needed
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 2048,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        if response.status_code != 200:
            logger.warning(f"Gemini flash latest failed with {response.status_code}: {response.text}")
            # Try gemini-3.6-flash
            url_v2 = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={api_key}"
            response = await client.post(url_v2, json=payload)
            if response.status_code != 200:
                raise ValueError(f"Gemini API returned HTTP {response.status_code}: {response.text}")

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError("No candidate generation returned by Gemini.")
        return candidates[0]["content"]["parts"][0]["text"]


async def call_groq_api(prompt: str) -> str:
    """Calls Groq Cloud API using OpenAI-compatible endpoint with active models."""
    api_key = settings.GROQ_API_KEY.strip()
    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured.")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # Try models in order of priority
    models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b", "allam-2-7b"]
    last_error = None

    for model_name in models_to_try:
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert assessment creator for government statisticians and data officers. Return ONLY valid JSON array without markdown backticks.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 2048,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0]["message"]["content"]
            else:
                last_error = f"Groq model {model_name} returned {response.status_code}: {response.text}"
                logger.warning(last_error)

    raise ValueError(f"Groq API failed on all attempted models: {last_error}")


def generate_fallback_mcqs(
    text_sample: str,
    num_questions: int,
    topic_hint: str = "",
    skill_name: str = "",
    language: str = "English",
) -> List[Dict[str, Any]]:
    """
    Intelligent document-grounded fallback MCQ generator.
    Extracts authentic key sentences from the document to generate verifiable questions
    in the requested language (English / Hindi) when LLM keys are absent or rate-limited.
    """
    is_hindi = language.lower() in ["hindi", "hi"]

    # Clean sentences from document
    raw_sentences = [
        s.strip()
        for s in re.split(r"(?<=[.?!])\s+", text_sample)
        if len(s.strip()) > 35 and not s.strip().startswith(("#", "-", "*", "http"))
    ]

    target_domain = skill_name or topic_hint or ("सांख्यिकीय पद्धति" if is_hindi else "Statistical Methodology")
    questions = []

    for i in range(min(num_questions, max(1, len(raw_sentences)))):
        sent = raw_sentences[i % len(raw_sentences)] if raw_sentences else f"Official competency standards in {target_domain} require systematic data validation."
        
        if is_hindi:
            q_text = f"प्रस्तुत दस्तावेज़ के अनुसार, {target_domain} के संबंध में निम्नलिखित में से कौन सा कथन स्थापित प्रोटोकॉल को सही रूप से दर्शाता है?"
            correct = f"{sent} (यह आधिकारिक दस्तावेज़ में स्पष्ट रूप से उल्लिखित है।)"
            distractor_1 = f"यह प्रोटोकॉल आधिकारिक सर्वेक्षणों में {target_domain} के प्रत्यक्ष अनुप्रयोग को हतोत्साहित करता है।"
            distractor_2 = f"प्रशासनिक डेटा रजिस्टरों को संभालते समय सभी स्वचालित सत्यापन प्रक्रियाओं को छोड़ दिया जाना चाहिए।"
            distractor_3 = f"सांख्यिकीय अनुमान केवल गुणात्मक आकलन तक सीमित हैं, बिना किसी प्रसरण सत्यापन के।"
            explanation = f"दस्तावेज़ के आधिकारिक पाठ पर आधारित: '{sent[:110]}...'"
            diff_label = "Easy" if i % 3 == 0 else ("Medium" if i % 3 == 1 else "Hard")
        else:
            q_text = f"According to the uploaded document on {target_domain}, which statement correctly reflects the established protocol?"
            correct = sent
            distractor_1 = f"The protocol discourages direct application of {target_domain} principles in official surveys."
            distractor_2 = f"All automated validations must be bypassed when handling public administrative registries."
            distractor_3 = f"Statistical estimations are restricted to purely qualitative assessments without variance checks."
            explanation = f"Based directly on the official source text: '{sent[:120]}...'"
            diff_label = "Easy" if i % 3 == 0 else ("Medium" if i % 3 == 1 else "Hard")

        letters = ["A", "B", "C", "D"]
        correct_idx = (i + 1) % 4
        opts = [distractor_1, distractor_2, distractor_3]
        opts.insert(correct_idx, correct)

        questions.append({
            "question": f"प्रश्न {i+1}: {q_text}" if is_hindi else f"Question {i+1}: {q_text}",
            "options": {
                "A": opts[0],
                "B": opts[1],
                "C": opts[2],
                "D": opts[3],
            },
            "correct_answer": letters[correct_idx],
            "explanation": explanation,
            "difficulty": diff_label,
        })

    # Pad if needed
    while len(questions) < num_questions:
        idx = len(questions) + 1
        if is_hindi:
            questions.append({
                "question": f"प्रश्न {idx}: {target_domain} के संदर्भ में, व्यवस्थित त्रुटि ट्रैकिंग का प्राथमिक उद्देश्य क्या है?",
                "options": {
                    "A": "सर्वेक्षण के सभी गैर-प्रतिचयन त्रुटियों को बिना बजट सीमा के समाप्त करना",
                    "B": "मानक त्रुटि को मापना और सांख्यिकीय पुनरावृत्तियों में प्रतिलिपि योग्यता सुनिश्चित करना",
                    "C": "आधिकारिक क्षेत्रीय गणना को काल्पनिक मॉडलों से प्रतिस्थापित करना",
                    "D": "राष्ट्रीय रिपोर्टों में प्रतिचयन प्रसरणों को प्रलेखित करने से बचना",
                },
                "correct_answer": "B",
                "explanation": "मानक त्रुटि परिमाणीकरण और पुनरुत्पादकता राष्ट्रीय सांख्यिकीय गुणवत्ता ढाँचों के मूलभूत सिद्धांत हैं।",
                "difficulty": "Medium",
            })
        else:
            questions.append({
                "question": f"Question {idx}: In the context of {target_domain}, what is the primary objective of systematic error tracking?",
                "options": {
                    "A": "To eliminate all non-sampling errors completely without budget constraints",
                    "B": "To quantify standard error and ensure reproducibility across statistical iterations",
                    "C": "To replace official field enumeration with speculative models",
                    "D": "To avoid documenting sampling variances in national reports",
                },
                "correct_answer": "B",
                "explanation": "Standard error quantification and reproducibility are foundational principles in national statistical quality frameworks.",
                "difficulty": "Medium",
            })

    return questions[:num_questions]


async def generate_mcqs_from_content(
    content: str,
    num_questions: int = 5,
    topic_hint: str = "",
    skill_name: str = "",
    language: str = "English",
) -> List[Dict[str, Any]]:
    """
    Orchestrates RAG-to-MCQ generation using configured LLMs (Gemini / Groq)
    with strict JSON enforcement, multilingual support (English / Hindi), and resilient fallback.
    """
    lang_instruction = (
        f"LANGUAGE REQUIREMENT: Generate all questions, options (A, B, C, D), and explanations strictly in {language}."
        if language.lower() not in ["english", "en"]
        else "LANGUAGE REQUIREMENT: Generate all questions, options, and explanations in English."
    )

    prompt = f"""You are an assessment author for official statistical and data governance cadres (Mission Karmayogi / MoSPI).
Generate exactly {num_questions} high-quality, practical multiple-choice questions from the document excerpt below.

Focus Topic / Competency Area: {topic_hint or skill_name or "Official Statistics and Data Governance"}
Target Language: {language}

Document Excerpt:
\"\"\"{content[:6000]}\"\"\"

STRICT REQUIREMENTS:
1. {lang_instruction}
2. Return ONLY a valid JSON array of objects, with NO markdown code fences (no ```json).
3. Each object MUST have this exact schema:
[
  {{
    "question": "Clear, direct question testing knowledge or application",
    "options": {{
      "A": "Option text",
      "B": "Option text",
      "C": "Option text",
      "D": "Option text"
    }},
    "correct_answer": "A",
    "explanation": "One concise sentence explaining why this answer is correct based on the text.",
    "difficulty": "Medium"
  }}
]
4. 'correct_answer' must be one of: "A", "B", "C", "D".
5. 'difficulty' must be one of: "Easy", "Medium", "Hard".
6. Questions must be directly grounded in the provided document content.
"""

    # 1. Try Gemini if key exists
    if settings.GEMINI_API_KEY.strip():
        try:
            logger.info(f"Calling Gemini API for MCQ generation in {language}...")
            raw_response = await call_gemini_api(prompt)
            cleaned = clean_json_response(raw_response)
            parsed = json.loads(cleaned)
            if isinstance(parsed, list) and len(parsed) > 0:
                logger.info(f"Successfully generated {len(parsed)} questions via Gemini in {language}.")
                return parsed[:num_questions]
        except Exception as e:
            logger.warning(f"Gemini generation failed: {e}. Falling back...")

    # 2. Try Groq if key exists
    if settings.GROQ_API_KEY.strip():
        try:
            logger.info(f"Calling Groq API for MCQ generation in {language}...")
            raw_response = await call_groq_api(prompt)
            cleaned = clean_json_response(raw_response)
            parsed = json.loads(cleaned)
            if isinstance(parsed, list) and len(parsed) > 0:
                logger.info(f"Successfully generated {len(parsed)} questions via Groq in {language}.")
                return parsed[:num_questions]
        except Exception as e:
            logger.warning(f"Groq generation failed: {e}. Falling back...")

    # 3. Intelligent fallback generator (grounded in document text)
    logger.info(f"Generating grounded MCQs via intelligent text extraction engine in {language}...")
    return generate_fallback_mcqs(content, num_questions, topic_hint, skill_name, language)

