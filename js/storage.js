// Saves likes, watch later and history in the browser (localStorage).
// Nothing is sent to any server, so the data stays private on the device.
// Every read and write is wrapped in try/catch because some browsers
// (private mode, blocked cookies) do not allow storage.

const KEY = "streambox:v1";

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return {
      liked: Array.isArray(data?.liked) ? data.liked : [],
      later: Array.isArray(data?.later) ? data.later : [],
      history: Array.isArray(data?.history) ? data.history : [],
      theme: data?.theme === "dark" || data?.theme === "light" ? data.theme : null,
      comments: data?.comments && typeof data.comments === "object" ? data.comments : {},
      progress: data?.progress && typeof data.progress === "object" ? data.progress : {},
    };
  } catch {
    return { liked: [], later: [], history: [], theme: null, comments: {}, progress: {} };
  }
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the app still works, it just won't remember.
  }
}

export function getList(name) {
  return [...state[name]];
}

export function isIn(name, id) {
  return state[name].includes(id);
}

export function toggle(name, id) {
  state[name] = isIn(name, id)
    ? state[name].filter((x) => x !== id)
    : [id, ...state[name]];
  save();
  return isIn(name, id);
}

export function addToHistory(id) {
  // Most recent first, no duplicates, keep the last 50.
  state.history = [id, ...state.history.filter((x) => x !== id)].slice(0, 50);
  save();
}

export function clearHistory() {
  state.history = [];
  save();
}

export function getTheme() {
  return state.theme;
}

export function setTheme(theme) {
  state.theme = theme;
  save();
}

// ---------- comments ----------
// Stored per video: { "sintel": [{ id, text, time }, ...] }, newest first.

export const MAX_COMMENT_LENGTH = 500;

export function getComments(videoId) {
  const list = state.comments[videoId];
  return Array.isArray(list) ? [...list] : [];
}

export function addComment(videoId, text) {
  const clean = text.trim().slice(0, MAX_COMMENT_LENGTH);
  if (!clean) return null;
  const comment = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: clean, time: Date.now() };
  state.comments[videoId] = [comment, ...getComments(videoId)];
  save();
  return comment;
}

export function deleteComment(videoId, commentId) {
  state.comments[videoId] = getComments(videoId).filter((c) => c.id !== commentId);
  save();
}

// ---------- watch progress (for "Continue watching" and resume) ----------
// Stored per video: { "sintel": { time: 125, duration: 888 } } in seconds.

export function getProgress(videoId) {
  const p = state.progress[videoId];
  const valid = p && Number.isFinite(p.time) && Number.isFinite(p.duration) && p.duration > 0;
  return valid ? { time: p.time, duration: p.duration } : null;
}

export function setProgress(videoId, time, duration) {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return;
  state.progress[videoId] = { time: Math.floor(time), duration: Math.floor(duration) };
  save();
}

export function clearProgress(videoId) {
  delete state.progress[videoId];
  save();
}
