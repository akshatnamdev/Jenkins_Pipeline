"""FastAPI backend server for DRAVIS (Cleaned & Fixed for new LLM Manager)"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from pathlib import Path
import tempfile

from config import settings
from document_processor import document_processor
from rag_system import rag_system
from llm_manager import LLMManager
llm_manager = LLMManager()
from quiz_speech import quiz_generator, speech_manager, QuizDifficulty
from security import security_manager, language_detector


# ------------------------------------------------------------------ #
# APP SETUP (CREATE APP FIRST!!!)
# ------------------------------------------------------------------ #
app = FastAPI(title="DRAVIS Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------ #
# MODELS
# ------------------------------------------------------------------ #
class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    use_documents: bool = False
    mode: str = "normal"  # normal, exam_prep, practice, vocabulary


# ------------------------------------------------------------------ #
# HEALTH
# ------------------------------------------------------------------ #
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_ready": llm_manager.model_ready,
        "rag_ready": True,
    }


# ------------------------------------------------------------------ #
# CHAT
# ------------------------------------------------------------------ #
@app.post("/chat")
async def chat_endpoint(payload: ChatRequest):
    doc_context = ""
    if payload.use_documents:
        results = rag_system.search(payload.message, top_k=4)
        doc_context = "\n\n".join(r["content"] for r in results)

    return llm_manager.generate_response(
        message=payload.message,
        conversation_id=payload.conversation_id,
        mode=payload.mode,
        use_documents=payload.use_documents,
        doc_context=doc_context,
    )


# ------------------------------------------------------------------ #
# CHAT HISTORY
# ------------------------------------------------------------------ #
@app.get("/chat/{conversation_id}/history")
async def get_chat_history(conversation_id: str):
    if conversation_id not in llm_manager.conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "conversation_id": conversation_id,
        "messages": llm_manager.conversations[conversation_id]
    }


# ------------------------------------------------------------------ #
# DOCUMENTS
# ------------------------------------------------------------------ #
@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        documents_dir: Path = settings.DOCUMENTS_DIR
        documents_dir.mkdir(parents=True, exist_ok=True)

        dest_path = documents_dir / file.filename
        content = await file.read()
        with open(dest_path, "wb") as f:
            f.write(content)

        doc_info = document_processor.add_document(dest_path, file.filename)
        rag_system.add_document(doc_info["doc_id"], doc_info["chunks"], doc_info["metadata"])

        return doc_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents")
async def list_documents():
    docs = document_processor.get_all_documents()
    return {"documents": docs, "total": len(docs)}


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    try:
        success = document_processor.delete_document(doc_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")

        rag_system.delete_document(doc_id)
        return {"message": "Document deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------ #
# QUIZ / SPEECH / SECURITY / LANGUAGE DETECTION
# ------------------------------------------------------------------ #
@app.post("/speech/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        temp_path = Path(tempfile.gettempdir()) / file.filename
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        return speech_manager.transcribe_audio(str(temp_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/quiz/generate")
async def generate_quiz(request: dict):
    try:
        difficulty = QuizDifficulty(request["difficulty"])
        content = None
        if request.get("use_documents"):
            docs = rag_system.search(request["topic"], top_k=5)
            content = "\n".join(doc["content"] for doc in docs)

        return quiz_generator.generate_quiz(
            topic=request["topic"],
            num_questions=request["num_questions"],
            difficulty=difficulty,
            content=content,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------ #
# RUN SERVER
# ------------------------------------------------------------------ #
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT)
