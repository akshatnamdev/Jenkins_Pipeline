from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.llms import Ollama
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
import uvicorn

# ========================
# FASTAPI APP
# ========================
app = FastAPI(title="DRAVIS LangChain Backend", version="1.0")

# ========================
# CORS FIX (FULL ACCESS)
# ========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # allow all frontends
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# LANGCHAIN MODEL
# ========================
llm = Ollama(model="phi3:mini")
memory = ConversationBufferMemory()
conversation = ConversationChain(
    llm=llm,
    memory=memory,
    verbose=False
)

# ========================
# REQUEST BODY
# ========================
class ChatRequest(BaseModel):
    message: str

# ========================
# HEALTH CHECK
# ========================
@app.get("/health")
async def health():
    return {"status": "ok", "model": "phi3:mini"}

# ========================
# CHAT ENDPOINT
# ========================
@app.post("/chat")
async def chat(payload: ChatRequest):
    try:
        reply = conversation.predict(input=payload.message)
        return {"response": reply}
    except Exception as e:
        return {"error": str(e)}

# ========================
# RUN SERVER
# ========================
if __name__ == "__main__":
    uvicorn.run("langchain_backend:app", host="127.0.0.1", port=8000, reload=True)