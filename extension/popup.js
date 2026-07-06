// popup.js

const summarizeButton = document.getElementById("summarizeButton");
const saveButton = document.getElementById("saveButton");
const statusDiv = document.getElementById("status");
const resultDiv = document.getElementById("result");
const summaryTextEl = document.getElementById("summaryText");
const insightsListEl = document.getElementById("insightsList");
const highlightsListEl = document.getElementById("highlightsList");
const authSection = document.getElementById("authSection");
const authStatus = document.getElementById("authStatus");
const authUser = document.getElementById("authUser");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const openDashboardButton = document.getElementById("openDashboardButton");
const retryButton = document.getElementById("retryButton");

if (
  !summarizeButton ||
  !saveButton ||
  !statusDiv ||
  !resultDiv ||
  !summaryTextEl ||
  !insightsListEl ||
  !highlightsListEl ||
  !authSection ||
  !authStatus ||
  !authUser ||
  !emailInput ||
  !passwordInput ||
  !loginButton ||
  !logoutButton ||
  !openDashboardButton ||
  !retryButton
) {
  console.error(
    "Popup DOM elements missing. Check popup.html IDs: summarizeButton, saveButton, status, result, summaryText, insightsList."
  );
  throw new Error("Popup failed to initialize: missing DOM elements.");
}

const DASHBOARD_URL =
  typeof __DASHBOARD_URL__ !== "undefined"
    ? __DASHBOARD_URL__
    : "http://localhost:3000";
let authToken = null;
let authEmail = null;
let authPromptVisible = false;
let lastPayload = null;
// The last failed async action, so the Retry button can re-run it.
let lastAction = null;

function setAuthUI() {
  if (authToken) {
    authSection.classList.add("hidden");
    authStatus.classList.remove("hidden");
    authUser.textContent = authEmail ? `Signed in as ${authEmail}` : "Signed in";
  } else {
    authStatus.classList.add("hidden");
    if (authPromptVisible) {
      authSection.classList.remove("hidden");
    } else {
      authSection.classList.add("hidden");
    }
    authUser.textContent = "";
  }
}

function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["authToken", "authEmail"], (items) => {
      resolve({
        token: items.authToken || null,
        email: items.authEmail || null,
      });
    });
  });
}

function storeAuth(token, email) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ authToken: token, authEmail: email }, resolve);
  });
}

function clearAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["authToken", "authEmail"], resolve);
  });
}

// busy => show spinner; isError => red text. Theme-aware (the popup is dark).
function setStatus(text, { isError = false, busy = false } = {}) {
  statusDiv.textContent = text;
  statusDiv.classList.toggle("error", isError);
  statusDiv.classList.toggle("busy", busy);
}

function showRetry(action) {
  lastAction = action;
  retryButton.classList.remove("hidden");
}

function hideRetry() {
  lastAction = null;
  retryButton.classList.add("hidden");
}

function showResult(summary, keyInsights, highlights) {
  summaryTextEl.textContent = summary || "";
  insightsListEl.innerHTML = "";
  highlightsListEl.innerHTML = "";

  (keyInsights || []).forEach((insight) => {
    const li = document.createElement("li");
    li.textContent = insight;
    insightsListEl.appendChild(li);
  });

  (highlights || []).forEach((highlight) => {
    const li = document.createElement("li");
    li.textContent = highlight;
    highlightsListEl.appendChild(li);
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

async function loadAuth() {
  const stored = await getStoredAuth();
  authToken = stored.token;
  authEmail = stored.email;
  setAuthUI();
}

function showAuthPrompt() {
  authPromptVisible = true;
  setAuthUI();
}

loginButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    setStatus("Email and password required.", { isError: true });
    return;
  }

  loginButton.disabled = true;
  setStatus("Signing in...", { busy: true });
  try {
    const response = await sendMessageToBackground({
      type: "AUTH_LOGIN",
      payload: { email, password },
    });

    if (!response?.ok) {
      setStatus(response?.error || "Login failed", { isError: true });
      return;
    }

    authToken = response.data.token;
    authEmail = response.data.user?.email || email;
    await storeAuth(authToken, authEmail);
    setAuthUI();
    setStatus("Signed in.");
  } catch (err) {
    console.error("Login error:", err);
    setStatus("Login failed.", { isError: true });
  } finally {
    loginButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await clearAuth();
  authToken = null;
  authEmail = null;
  setAuthUI();
  setStatus("Signed out.");
});

openDashboardButton.addEventListener("click", async () => {
  chrome.tabs.create({ url: DASHBOARD_URL });
});

retryButton.addEventListener("click", () => {
  const action = lastAction;
  hideRetry();
  if (action) action();
});

async function runSummarize() {
  hideRetry();
  resultDiv.classList.add("hidden");
  saveButton.disabled = true;
  lastPayload = null;
  summarizeButton.disabled = true;
  setStatus("Reading page content...", { busy: true });

  try {
    const tabId = await getActiveTabId();
    if (!tabId) {
      setStatus("No active tab found.", { isError: true });
      return;
    }

    try {
      await injectContentScript(tabId);
    } catch (err) {
      console.error("Injection failed:", err);
      setStatus(
        "Cannot summarize this page. Try a normal https:// page.",
        { isError: true }
      );
      return;
    }

    let content;
    try {
      content = await sendMessageToTab(tabId, { type: "GET_PAGE_CONTENT" });
    } catch (err) {
      console.error("Content script error:", err);
      setStatus("Content script not responding.", { isError: true });
      showRetry(runSummarize);
      return;
    }

    if (!content) {
      setStatus("Unable to read page content.", { isError: true });
      return;
    }

    setStatus("Summarizing...", { busy: true });

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
      setStatus("Background service worker error.", { isError: true });
      showRetry(runSummarize);
      return;
    }

    if (!response?.ok) {
      console.error("Summarize failed:", response);
      setStatus(response?.error || "Summarize failed", { isError: true });
      showRetry(runSummarize);
      return;
    }

    const data = response.data;
    showResult(data.summary, data.key_insights || [], data.highlights || []);
    setStatus("Done.");

    lastPayload = {
      title: content.title,
      url: content.url,
      summary: data.summary,
      key_insights: data.key_insights || [],
      highlights: data.highlights || [],
    };

    saveButton.disabled = false;
  } finally {
    summarizeButton.disabled = false;
  }
}

async function runSave() {
  if (!lastPayload) return;

  if (!authToken) {
    showAuthPrompt();
    setStatus("Please sign in to save notes.", { isError: true });
    return;
  }

  hideRetry();
  saveButton.disabled = true;
  setStatus("Saving...", { busy: true });

  let response;
  try {
    response = await sendMessageToBackground({
      type: "SAVE_NOTE",
      payload: lastPayload,
    });
  } catch (err) {
    console.error("Save error:", err);
    setStatus("Background service worker error while saving.", { isError: true });
    saveButton.disabled = false;
    showRetry(runSave);
    return;
  }

  if (!response?.ok) {
    console.error("Save failed:", response);
    setStatus(response?.error || "Save failed", { isError: true });
    saveButton.disabled = false;
    if (response?.code === "TOKEN_EXPIRED") {
      authToken = null;
      authEmail = null;
      setAuthUI();
      showAuthPrompt();
    } else {
      showRetry(runSave);
    }
    return;
  }

  setStatus("Saved ✓");
  saveButton.disabled = true;
}

summarizeButton.addEventListener("click", runSummarize);
saveButton.addEventListener("click", runSave);

loadAuth();
