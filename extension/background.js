// Configure API_BASE_URL before distributing the extension.
// For production, replace this with your deployed API URL.
const API_BASE_URL =
  typeof __API_BASE_URL__ !== "undefined"
    ? __API_BASE_URL__
    : "http://localhost:4000";

// Wrap fetch with an abortable timeout so a slow/unreachable server can never
// leave the popup spinning forever.
async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Turn raw fetch/HTTP errors into messages a human can act on.
function describeError(err) {
  if (err?.name === "AbortError") {
    return "Request timed out. Check your connection and try again.";
  }
  if (err?.name === "TypeError") {
    return "Cannot reach the server. Is it running, and is CORS configured?";
  }
  return err?.message || "Something went wrong.";
}

async function postJson(path, body, { token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["authToken"], (items) => resolve(items?.authToken || null));
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_SUMMARY") {
    const { title, url, bodyText } = message.payload;
    postJson("/api/notes/summarize", { title, url, content: bodyText })
      .then(({ res, data }) => {
        if (!res.ok) throw new Error(data?.error || "Summarize failed");
        sendResponse({ ok: true, data });
      })
      .catch((err) => sendResponse({ ok: false, error: describeError(err) }));
    return true;
  }

  if (message.type === "SAVE_NOTE") {
    getStoredToken().then((token) => {
      postJson("/api/notes/save", message.payload, { token })
        .then(({ res, data }) => {
          if (res.status === 401) {
            // Token is missing/expired — clear it so the popup re-prompts.
            chrome.storage.local.remove(["authToken", "authEmail"]);
            sendResponse({ ok: false, error: "Session expired. Please sign in again.", code: "TOKEN_EXPIRED" });
            return;
          }
          if (!res.ok) throw new Error(data?.error || "Save failed");
          sendResponse({ ok: true, data });
        })
        .catch((err) => sendResponse({ ok: false, error: describeError(err) }));
    });
    return true;
  }

  if (message.type === "AUTH_LOGIN") {
    const { email, password } = message.payload || {};
    postJson("/api/auth/login", { email, password })
      .then(({ res, data }) => {
        if (!res.ok) throw new Error(data?.error || "Login failed");
        sendResponse({ ok: true, data });
      })
      .catch((err) => sendResponse({ ok: false, error: describeError(err) }));
    return true;
  }

  return false;
});
