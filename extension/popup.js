// popup.js

const summarizeButton = document.getElementById("summarizeButton");
const saveButton = document.getElementById("saveButton");
const statusDiv = document.getElementById("status");
const resultDiv = document.getElementById("result");
const summaryTextEl = document.getElementById("summaryText");
const insightsListEl = document.getElementById("insightsList");

if (
  !summarizeButton ||
  !saveButton ||
  !statusDiv ||
  !resultDiv ||
  !summaryTextEl ||
  !insightsListEl
) {
  console.error(
    "Popup DOM elements missing. Check popup.html IDs: summarizeButton, saveButton, status, result, summaryText, insightsList."
  );
}

let lastPayload = null;

function setStatus(text, isError = false) {
  statusDiv.textContent = text;
  statusDiv.style.color = isError ? "red" : "black";
}

function showResult(summary, keyInsights) {
  summaryTextEl.textContent = summary || "";
  insightsListEl.innerHTML = "";

  (keyInsights || []).forEach((insight) => {
    const li = document.createElement("li");
    li.textContent = insight;
    insightsListEl.appendChild(li);
  });

  resultDiv.classList.remove("hidden");
}

function getActiveTabId() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id;
      resolve(tabId || null);
    });
  });
}

function injectContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["contentScript.js"],
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(true);
      }
    );
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

summarizeButton.addEventListener("click", async () => {
  console.log("Summarize clicked");
  setStatus("Reading page content...");
  resultDiv.classList.add("hidden");
  saveButton.disabled = true;
  lastPayload = null;

  const tabId = await getActiveTabId();
  if (!tabId) {
    setStatus("No active tab found.", true);
    return;
  }

  // Inject content script (reliable even if auto-injection fails)
  try {
    await injectContentScript(tabId);
  } catch (err) {
    console.error("Injection failed:", err);
    setStatus(
      "Cannot inject content script on this page. Try a normal https:// page.",
      true
    );
    return;
  }

  let content;
  try {
    content = await sendMessageToTab(tabId, { type: "GET_PAGE_CONTENT" });
  } catch (err) {
    console.error("Content script error:", err);
    setStatus("Content script not responding.", true);
    return;
  }

  if (!content) {
    setStatus("Unable to read page content.", true);
    return;
  }

  setStatus("Summarizing...");

  let response;
  try {
    response = await sendMessageToBackground({
      type: "FETCH_SUMMARY",
      payload: {
        title: content.title,
        url: content.url,
        bodyText: content.bodyText,
      },
    });
  } catch (err) {
    console.error("Background message error:", err);
    setStatus("Background service worker error.", true);
    return;
  }

  if (!response?.ok) {
    console.error("Summarize failed:", response);
    setStatus(response?.error || "Summarize failed", true);
    return;
  }

  const data = response.data;
  showResult(data.summary, data.key_insights || []);
  setStatus("Done.");

  lastPayload = {
    title: content.title,
    url: content.url,
    summary: data.summary,
    key_insights: data.key_insights || [],
  };

  saveButton.disabled = false;
});

saveButton.addEventListener("click", async () => {
  if (!lastPayload) return;

  setStatus("Saving...");

  let response;
  try {
    response = await sendMessageToBackground({
      type: "SAVE_NOTE",
      payload: lastPayload,
    });
  } catch (err) {
    console.error("Save error:", err);
    setStatus("Background service worker error while saving.", true);
    return;
  }

  if (!response?.ok) {
    console.error("Save failed:", response);
    setStatus(response?.error || "Save failed", true);
    return;
  }

  setStatus(`Saved. Note ID: ${response.data.note_id}`);
  saveButton.disabled = true;
});
