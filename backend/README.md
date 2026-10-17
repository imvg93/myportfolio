# Gireesh Insight AI — Python FastAPI Backend

This is the high-performance Python backend powering the **Insight AI** feature for Gireesh's Portfolio. It provides:
- **FastAPI** web framework with interactive OpenAPI / Swagger documentation (`/docs`).
- **Pinecone Vector Search (RAG)** for context retrieval on skills, projects, and achievements.
- **Hugging Face Inference** for 384-dimensional sentence embeddings (`all-MiniLM-L6-v2`).
- **Multi-Model LLM Orchestration** supporting OpenAI (GPT-4o / GPT-4o-mini) and Hugging Face with first-person persona responses.
- **Data Ingestion Pipeline** via Python scripts (`scripts/upload_to_pinecone.py`).

---

## 🛠️ Quick Start

### 1. Create a Python Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

The backend automatically loads your `.env.local` or `.env` from the project root or the `backend/` directory.

Ensure the following are set:
```env
OPENAI_API_KEY=your_openai_api_key
HUGGINGFACE_API_KEY=your_hf_api_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=gireesh-life
```

### 4. Run the Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

Once running:
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 📡 API Endpoints

### 1. `POST /api/chat`
Conversational chat with RAG vector search and conversational memory.
```json
{
  "messages": [
    { "role": "user", "content": "What are your core technical skills?" }
  ]
}
```

### 2. `POST /api/ask`
Direct Q&A with cited vector sources from Pinecone.
```json
{
  "question": "Tell me about Gireesh's experience with Flutter."
}
```

### 3. `GET /health`
Inspects health and displays which API keys (OpenAI, HuggingFace, Pinecone) are active.

---

## 📦 Ingestion Script

To index personal and portfolio data into Pinecone:
```bash
python scripts/upload_to_pinecone.py
```

---

## 🐳 Docker Support

To build and run as a container:
```bash
docker build -t insight-ai-backend .
docker run -p 8000:8000 --env-file ../.env.local insight-ai-backend
```
