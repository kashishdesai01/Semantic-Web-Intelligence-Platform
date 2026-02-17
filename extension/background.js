const API_BASE_URL = "http://localhost:4000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_SUMMARY") {
    const { title, url, bodyText } = message.payload;

    fetch(`${API_BASE_URL}/api/notes/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url, content: bodyText }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Summarize failed");
        }
        return data;
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));

    return true;
  }

  if (message.type === "SAVE_NOTE") {
    const payload = message.payload;

    chrome.storage.local.get(["authToken"], (items) => {
      const token = items?.authToken;

      fetch(`${API_BASE_URL}/api/notes/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data?.error || "Save failed");
          }
          return data;
        })
        .then((data) => sendResponse({ ok: true, data }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
    });

    return true;
  }

  if (message.type === "AUTH_LOGIN") {
    const { email, password } = message.payload || {};
    fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Login failed");
        }
        return data;
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));

    return true;
  }

  return false;
});
