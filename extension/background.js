const API_BASE_URL = "http://localhost:4000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_SUMMARY") {
    const { title, url, bodyText } = message.payload;

    fetch(`${API_BASE_URL}/api/notes/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url, content: bodyText }),
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));

    return true;
  }

  if (message.type === "SAVE_NOTE") {
    const payload = message.payload;

    fetch(`${API_BASE_URL}/api/notes/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));

    return true;
  }

  return false;
});
