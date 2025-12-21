"""
Updated RAG (Retrieval Augmented Generation) module using NEW ChromaDB API
with automatic in-memory fallback and sentence-transformer embeddings.
"""

from typing import List, Dict
import traceback
import numpy as np

from config import settings
from sentence_transformers import SentenceTransformer

# Try importing new chromadb
try:
    import chromadb
    _HAS_CHROMA = True
except Exception:
    chromadb = None
    _HAS_CHROMA = False


# ---------------------------------------------------------------------------
# BACKUP MEMORY DB (your original logic preserved)
# ---------------------------------------------------------------------------
class InMemoryCollection:
    def __init__(self):
        self.ids: List[str] = []
        self.documents: List[str] = []
        self.metadatas: List[Dict] = []
        self.embeddings: np.ndarray | None = None

    def add(self, ids, embeddings, documents, metadatas):
        self.ids.extend(ids)
        self.documents.extend(documents)
        self.metadatas.extend(metadatas)
        emb = np.array(embeddings, dtype=np.float32)
        if self.embeddings is None:
            self.embeddings = emb
        else:
            self.embeddings = np.vstack([self.embeddings, emb])

    def query(self, query_embeddings, n_results=5, include=None):
        if self.embeddings is None or len(self.embeddings) == 0:
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

        q = np.array(query_embeddings, dtype=np.float32)
        emb_norm = self.embeddings / np.linalg.norm(self.embeddings, axis=1, keepdims=True)
        q_norm = q / np.linalg.norm(q, axis=1, keepdims=True)
        sims = q_norm @ emb_norm.T

        results = {"documents": [], "metadatas": [], "distances": []}
        for row in sims:
            idx = np.argsort(-row)[:n_results]
            results["documents"].append([self.documents[i] for i in idx])
            results["metadatas"].append([self.metadatas[i] for i in idx])
            results["distances"].append([float(1 - row[i]) for i in idx])
        return results

    def get(self, where=None, include=None):
        if where and "doc_id" in where:
            doc_id = where["doc_id"]
            return {"ids": [self.ids[i] for i, meta in enumerate(self.metadatas) if meta.get("doc_id") == doc_id]}
        return {"ids": self.ids}

    def delete(self, ids):
        keep = [i for i, _id in enumerate(self.ids) if _id not in ids]
        self.ids = [self.ids[i] for i in keep]
        self.documents = [self.documents[i] for i in keep]
        self.metadatas = [self.metadatas[i] for i in keep]
        if self.embeddings is not None:
            self.embeddings = self.embeddings[keep]

    def count(self):
        return len(self.ids)


# ---------------------------------------------------------------------------
# RAG SYSTEM
# ---------------------------------------------------------------------------
class RAGSystem:
    def __init__(self):
        self.embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        self.use_chroma = False

        if _HAS_CHROMA:
            try:
                # THE NEW, CORRECT CHROMA CLIENT (NO DEPRECATION ERROR)
                self.client = chromadb.PersistentClient(str(settings.CHROMA_DB_DIR))

                self.collection = self.client.get_or_create_collection(
                    name="documents",
                    metadata={"hnsw:space": "cosine"},  # cosine similarity
                )

                self.use_chroma = True
                print("🔵 ChromaDB initialized successfully (PersistentClient)")
            except Exception:
                traceback.print_exc()
                print("⚠️ Failed to initialize ChromaDB. Falling back to memory DB.")
                self.collection = InMemoryCollection()
        else:
            print("⚠️ ChromaDB not installed, using in-memory backend")
            self.collection = InMemoryCollection()

    # -------------------------------------------------------------------
    def add_document(self, doc_id, chunks, metadata):
        try:
            embeddings = self.embedding_model.encode(chunks)

            ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
            metadatas = [
                {
                    "doc_id": doc_id,
                    "filename": metadata.get("filename", ""),
                    "chunk_index": i,
                    "file_type": metadata.get("file_type", ""),
                }
                for i in range(len(chunks))
            ]

            if self.use_chroma:
                self.collection.add(
                    ids=ids,
                    documents=chunks,
                    metadatas=metadatas,
                    embeddings=embeddings.tolist()
                )
            else:
                self.collection.add(ids=ids, documents=chunks, metadatas=metadatas, embeddings=embeddings.tolist())
        except Exception as e:
            print("❌ ERROR adding document to RAG:", e)
            traceback.print_exc()

    # -------------------------------------------------------------------
    def search(self, query, top_k=5):
        try:
            query_embedding = self.embedding_model.encode([query]).tolist()

            if self.use_chroma:
                results = self.collection.query(
                    query_embeddings=query_embedding,
                    n_results=top_k,
                )
            else:
                results = self.collection.query(
                    query_embeddings=query_embedding,
                    n_results=top_k,
                )

            docs = []
            if results.get("documents") and results["documents"][0]:
                for content, meta in zip(results["documents"][0], results["metadatas"][0]):
                    docs.append({"content": content, "metadata": meta})
            return docs
        except Exception as e:
            print("❌ ERROR searching RAG:", e)
            traceback.print_exc()
            return []

    # -------------------------------------------------------------------
    def delete_document(self, doc_id):
        try:
            results = self.collection.get(where={"doc_id": doc_id})
            if results.get("ids"):
                self.collection.delete(results["ids"])
                return True
            return False
        except:
            traceback.print_exc()
            return False

    # -------------------------------------------------------------------
    def get_collection_stats(self):
        try:
            return {
                "total_chunks": self.collection.count(),
                "embedding_model": settings.EMBEDDING_MODEL,
                "persistent": self.use_chroma,
            }
        except:
            return {"total_chunks": 0}


rag_system = RAGSystem()
