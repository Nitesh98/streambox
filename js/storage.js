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
    };
  } catch {
    return { liked: [], later: [], history: [], theme: null };
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
