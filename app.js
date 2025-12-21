/**
 * DRAVIS Frontend - LangChain + Ollama Version
 */

const API_BASE = location.hostname.includes("127.0.0.1") || location.hostname.includes("localhost")
    ? "http://127.0.0.1:8000"
    : "https://YOUR-PRODUCTION-URL.com";
// -------------------------------------------------------------
// GLOBAL STATE
// -------------------------------------------------------------
const state = {
    isDarkMode: localStorage.getItem("dravis_darkMode") === "true",
    isPINSet: false,
    isAuthenticated: true, // keep it simple for now
    currentTab: "chat",
    currentConversationId: null,
    useDocuments: false,
    documents: {},
};

// -------------------------------------------------------------
// INIT
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    applyTheme();
    setupEventListeners();
    await checkSystemStatus();
    await initPIN();
    await loadDocuments();
    await newConversation();
});

// -------------------------------------------------------------
// THEME
// -------------------------------------------------------------
function applyTheme() {
    const body = document.body;
    const toggle = document.getElementById("themeToggle");

    if (state.isDarkMode) {
        body.classList.add("dark-mode");
        body.classList.remove("light-mode");
        if (toggle) toggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        body.classList.add("light-mode");
        body.classList.remove("dark-mode");
        if (toggle) toggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    localStorage.setItem("dravis_darkMode", state.isDarkMode);
    applyTheme();
}

// -------------------------------------------------------------
// BASIC BACKEND STATUS CHECK  (uses `/` from langchain_backend.py)
// -------------------------------------------------------------
async function checkSystemStatus() {
    const backendEl = document.getElementById("backendStatus");
    const ragEl = document.getElementById("ragStatus");
    const modelEl = document.getElementById("modelStatus");

    try {
        const res = await fetch(`${API_BASE}/`);
        const data = await res.json();

        if (backendEl) backendEl.textContent = "✓ Online";
        if (ragEl) ragEl.textContent = "RAG not configured";
        if (modelEl) modelEl.textContent = data.model || "Unknown model";
    } catch (e) {
        console.error("Health check error:", e);
        if (backendEl) backendEl.textContent = "✗ Offline";
        if (ragEl) ragEl.textContent = "-";
        if (modelEl) modelEl.textContent = "-";
    }
}

// -------------------------------------------------------------
// EVENT LISTENERS
// -------------------------------------------------------------
function setupEventListeners() {
    // Theme
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

    // Top tab buttons
    document.querySelectorAll(".tab-button").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchTab(tab);
        });
    });

    // Sidebar tabs
    document.querySelectorAll(".sidebar-nav-item").forEach((item) => {
        item.addEventListener("click", (e) => {
            const tab = e.currentTarget.dataset.tab;
            document.querySelectorAll(".sidebar-nav-item").forEach((i) =>
                i.classList.remove("active")
            );
            e.currentTarget.classList.add("active");
            switchTab(tab);
        });
    });

    // Chat send
    const sendBtn = document.getElementById("sendBtn");
    const chatInput = document.getElementById("chatInput");
    if (sendBtn) sendBtn.addEventListener("click", sendMessage);
    if (chatInput) {
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // New conversation button (if you add it later)
    const newConvBtn = document.getElementById("newConvBtn");
    if (newConvBtn) newConvBtn.addEventListener("click", newConversation);

    // Document upload
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");

    if (uploadArea && fileInput) {
        uploadArea.addEventListener("click", () => fileInput.click());
        uploadArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            uploadArea.classList.add("drag-over");
        });
        uploadArea.addEventListener("dragleave", () => {
            uploadArea.classList.remove("drag-over");
        });
        uploadArea.addEventListener("drop", (e) => {
            e.preventDefault();
            uploadArea.classList.remove("drag-over");
            if (e.dataTransfer.files.length > 0) {
                handleDocumentUpload(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                handleDocumentUpload(e.target.files[0]);
            }
        });
    }

    // Quiz
    const quizGenerateBtn = document.getElementById("generateQuizBtn");
    if (quizGenerateBtn) quizGenerateBtn.addEventListener("click", generateQuiz);

    // Export chat
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) exportBtn.addEventListener("click", exportChat);
}

// -------------------------------------------------------------
// TAB SWITCHING
// -------------------------------------------------------------
function switchTab(tabName) {
    state.currentTab = tabName;

    document.querySelectorAll(".tab-button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
    });

    const activeTab = document.getElementById(`${tabName}Tab`);
    if (activeTab) activeTab.classList.add("active");
}

// -------------------------------------------------------------
// PIN (minimal – doesn't block usage right now)
// -------------------------------------------------------------
async function initPIN() {
    // Right now we just allow usage.
    state.isPINSet = false;
    state.isAuthenticated = true;
}

// -------------------------------------------------------------
// CHAT + MESSAGE RENDERING (LANGCHAIN VERSION)
// -------------------------------------------------------------
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatMessageText(text) {
    if (!text) return "";
    let html = escapeHtml(text);
    html = html
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, "<i>$1</i>")
        .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/^- (.*)$/gm, "• $1")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>");
    return html;
}

function addMessageToUI(role, text) {
    const container = document.getElementById("messagesContainer");
    if (!container) return;

    // Clear placeholder if present
    if (
        container.children.length === 1 &&
        container.children[0].dataset &&
        container.children[0].dataset.placeholder === "true"
    ) {
        container.innerHTML = "";
    }

    const wrapper = document.createElement("div");
    wrapper.className = role === "user" ? "message user" : "message assistant";

    wrapper.innerHTML = `
        <div class="message-bubble">
            ${formatMessageText(text)}
        </div>
    `;

    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
}

async function newConversation() {
    state.currentConversationId = null;
    const container = document.getElementById("messagesContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="text-center text-slate-400 py-8" data-placeholder="true">
            <p class="text-lg">Start a conversation</p>
            <p class="text-sm mt-2">Ask me anything about your studies!</p>
        </div>
    `;
}

/**
 * ✅ LANGCHAIN CHAT CALL
 * Uses POST /chat with body: { message, conversation_id? }
 * Expects response: { response: "...", conversation_id?: "..." }
 */
async function sendMessage() {
    const input = document.getElementById("chatInput");
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    addMessageToUI("user", message);

    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                conversation_id: state.currentConversationId || null,
            }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const detail = data && data.detail ? data.detail : "Chat request failed";
            throw new Error(detail);
        }

        if (data.conversation_id) {
            state.currentConversationId = data.conversation_id;
        }

        addMessageToUI("assistant", data.response || "(empty response)");
    } catch (e) {
        console.error("Chat error:", e);
        addMessageToUI(
            "assistant",
            "⚠️ Failed to reach LangChain backend.<br><br>" +
                "Make sure it's running:<br><code>python langchain_backend.py</code>"
        );
    }
}

// -------------------------------------------------------------
// DOCUMENTS (will work once backend endpoints exist)
// -------------------------------------------------------------
async function loadDocuments() {
    console.log("📁 Documents feature disabled temporarily (no backend).");

    state.documents = {}; // no docs yet
    const container = document.getElementById("documentsList");
    if (container) {
        container.innerHTML = `<p class="text-slate-400 text-sm">
            Document support will be enabled soon!
        </p>`;
    }
}

function renderDocuments() {
    const container = document.getElementById("documentsList");
    if (!container) return;

    const docs = state.documents;
    if (!docs || Object.keys(docs).length === 0) {
        container.innerHTML =
            '<p class="text-slate-400 text-sm">No documents uploaded yet</p>';
        return;
    }

    container.innerHTML = Object.entries(docs)
        .map(([id, doc]) => {
            return `
            <div class="document-item">
                <div class="document-info">
                    <i class="fas fa-file"></i>
                    <div>
                        <div class="document-name">${escapeHtml(doc.filename)}</div>
                        <div class="text-xs text-slate-400">
                            ${doc.file_size_mb} MB · ${new Date(
                doc.upload_time
            ).toLocaleString()}
                        </div>
                    </div>
                </div>
                <div class="document-actions">
                    <button class="btn btn-secondary btn-sm" onclick="explainDocument('${id}')">
                        Explain
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteDocument('${id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
        })
        .join("");
}

async function handleDocumentUpload(file) {
    const formData = new FormData();
    formData.append("file", file);

    const uploadStatus = document.getElementById("uploadStatus");
    if (uploadStatus) uploadStatus.textContent = "Uploading...";

    try {
        const res = await fetch(`${API_BASE}/documents/upload`, {
            method: "POST",
            body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Upload failed");

        state.documents[data.doc_id] = data.metadata;
        renderDocuments();

        if (uploadStatus) uploadStatus.textContent = "Uploaded successfully ✔";
        setTimeout(() => {
            if (uploadStatus) uploadStatus.textContent = "";
        }, 3000);
    } catch (e) {
        console.error("Upload error:", e);
        if (uploadStatus) uploadStatus.textContent = "Upload failed ❌";
    }
}

async function explainDocument(doc_id) {
    const container = document.getElementById("documentExplanationOutput");
    if (!container) return;

    container.innerHTML =
        "<p class='text-slate-400 text-sm'>Generating explanation...</p>";

    try {
        const res = await fetch(`${API_BASE}/documents/${doc_id}/explain`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Explanation failed");

        container.innerHTML = `
            <h2 class="text-lg font-semibold mb-2">${escapeHtml(
                data.filename
            )} - Explanation</h2>
            <div class="markdown-output">
                ${formatMessageText(data.explanation)}
            </div>
        `;
    } catch (e) {
        console.error("Explain error:", e);
        container.innerHTML =
            "<p class='text-red-500'>❌ Failed to explain document: " +
            e.message +
            "</p>";
    }
}

async function deleteDocument(doc_id) {
    if (!confirm("Delete this document permanently?")) return;

    try {
        const res = await fetch(`${API_BASE}/documents/${doc_id}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error("Delete failed");
        delete state.documents[doc_id];
        renderDocuments();
    } catch (e) {
        alert("Error deleting document: " + e.message);
    }
}

// -------------------------------------------------------------
// QUIZ (placeholder until backend quiz endpoint exists)
// -------------------------------------------------------------
async function generateQuiz() {
    alert(
        "Quiz generation will be connected once the /quiz/generate endpoint is implemented in the backend."
    );
}

// -------------------------------------------------------------
// EXPORT CHAT (will work once endpoint exists)
// -------------------------------------------------------------
async function exportChat() {
    if (!state.currentConversationId) {
        alert("No conversation to export.");
        return;
    }

    try {
        const res = await fetch(
            `${API_BASE}/chat/${state.currentConversationId}/export`,
            { method: "POST" }
        );
        if (!res.ok) return alert("Failed to export chat.");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `conversation_${state.currentConversationId}.md`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Export failed: " + e.message);
    }
}