// contentScript.js
console.log("InsightLens content script loaded:", window.location.href);
function cleanText(text) {
  return text
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function getCandidateRoot() {
  const selectors = [
    "article",
    "main",
    "[role='main']",
    ".article",
    ".post",
    ".content",
    "#content",
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText && el.innerText.length > 400) return el;
  }

  return null;
}

function getLargestTextContainer() {
  const candidates = Array.from(document.querySelectorAll("div, section"));
  let best = null;
  let bestLen = 0;

  for (const el of candidates) {
    const text = el.innerText || "";
    const len = text.length;

    // Ignore tiny blocks
    if (len < 800) continue;

    // Prefer containers with fewer links
    const links = el.querySelectorAll("a").length;
    const linkRatio = links / Math.max(1, len);

    // Heuristic: too many links = navigation
    if (linkRatio > 0.01) continue;

    if (len > bestLen) {
      bestLen = len;
      best = el;
    }
  }

  return best;
}

function extractMainText() {
  const root = getCandidateRoot() || getLargestTextContainer() || document.body;

  let text = root ? root.innerText : "";
  text = cleanText(text);

  // Hard limit to keep payload reasonable
  const MAX_CHARS = 15000;
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS) + "\n\n[Truncated]";
  }

  return text;
}

function getPageContent() {
  const title = document.title;
  const url = window.location.href;

  const bodyText = extractMainText();

  return { title, url, bodyText };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PAGE_CONTENT") {
    sendResponse(getPageContent());
  }
  return false;
});
