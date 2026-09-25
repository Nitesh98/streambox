// StreamBox main app: routing and page rendering.
// Pages are chosen by the part of the URL after "#", for example
// "#/watch/sintel". This works on GitHub Pages with no server setup.
//
// Security note: all text is added with textContent (never innerHTML),
// so a search like "<script>" is shown as plain text and can't run code.

import { videos, categories, findVideo } from "./videos.js";
import * as store from "./storage.js";

const app = document.getElementById("app");

// ---------- small helper to build HTML elements ----------
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child);
  }
  return node;
}

// "125" seconds -> "2:05"
function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

// ---------- toast: small message at the bottom of the screen ----------
const toastBox = el("div", { class: "toast-box", role: "status", "aria-live": "polite" });
document.body.append(toastBox);

function toast(message) {
  const item = el("div", { class: "toast", text: message });
  toastBox.append(item);
  setTimeout(() => item.classList.add("hide"), 2200);
  setTimeout(() => item.remove(), 2600);
}

// ---------- watch progress helpers ----------
// A video counts as "in progress" between 2% and 95% watched.
function progressFraction(videoId) {
  const p = store.getProgress(videoId);
  if (!p) return 0;
  const f = p.time / p.duration;
  return f > 0.02 && f < 0.95 ? f : 0;
}

// ---------- video card (used on every list page) ----------
function thumbnail(video) {
  const img = el("img", { src: video.thumbnail, alt: "", loading: "lazy" });
  // If the image can't load, show a box with the title instead.
  img.addEventListener("error", () => {
    img.replaceWith(el("div", { class: "thumb-fallback", text: video.title }));
  });
  const fraction = progressFraction(video.id);
  let bar = null;
  if (fraction) {
    const fill = el("span");
    fill.style.width = `${(fraction * 100).toFixed(1)}%`; // set in JS: the security policy blocks inline style attributes
    bar = el("div", { class: "progress", "aria-label": `${Math.round(fraction * 100)}% watched` }, [fill]);
  }
  return el("div", { class: "thumb" }, [
    img,
    el("span", { class: "play-icon", "aria-hidden": "true", text: "▶" }),
    el("span", { class: "duration", text: video.duration }),
    bar,
  ]);
}

function videoCard(video, { compact = false } = {}) {
  return el("a", { class: compact ? "card compact" : "card", href: `#/watch/${video.id}` }, [
    thumbnail(video),
    el("div", { class: "card-info" }, [
      el("h3", { text: video.title }),
      el("p", { class: "meta", text: video.creator }),
      el("p", { class: "meta", text: `${video.year} · ${video.category}` }),
    ]),
  ]);
}

function emptyState(icon, message, linkText = "Browse videos", href = "#/") {
  return el("div", { class: "empty-state" }, [
    el("div", { class: "empty-icon", "aria-hidden": "true", text: icon }),
    el("p", { text: message }),
    el("a", { class: "btn primary", href, text: linkText }),
  ]);
}

function grid(list, empty) {
  if (list.length === 0) return empty;
  return el("div", { class: "grid" }, list.map((v) => videoCard(v)));
}

// ---------- pages ----------
function hero(video) {
  const img = el("img", { class: "hero-bg", src: video.thumbnail, alt: "" });
  img.addEventListener("error", () => img.remove());
  const fraction = progressFraction(video.id);
  return el("section", { class: "hero" }, [
    img,
    el("div", { class: "hero-content" }, [
      el("p", { class: "hero-label", text: "⭐ Featured" }),
      el("h1", { text: video.title }),
      el("p", { class: "hero-meta", text: `${video.year} · ${video.category} · ${video.duration}` }),
      el("p", { class: "hero-text", text: video.description }),
      el("div", { class: "hero-actions" }, [
        el("a", { class: "btn primary big", href: `#/watch/${video.id}`, text: fraction ? "▶ Resume" : "▶ Play" }),
        toggleButton("later", video.id, "🕒 Watch later", "✅ Saved", "big"),
      ]),
    ]),
  ]);
}

function homePage(params) {
  const query = (params.get("q") || "").trim().toLowerCase();
  const category = params.get("cat") || "All";

  const list = videos.filter((v) => {
    const matchesCategory = category === "All" || v.category === category;
    const matchesSearch =
      !query ||
      [v.title, v.creator, v.category, v.description].some((text) =>
        text.toLowerCase().includes(query)
      );
    return matchesCategory && matchesSearch;
  });

  const chips = el(
    "div",
    { class: "chips" },
    categories.map((cat) => {
      const next = new URLSearchParams(params);
      cat === "All" ? next.delete("cat") : next.set("cat", cat);
      const qs = next.toString();
      return el("a", {
        class: cat === category ? "chip active" : "chip",
        href: `#/${qs ? "?" + qs : ""}`,
        text: cat,
      });
    })
  );

  if (query) {
    return [
      el("h2", { class: "page-title", text: `Results for "${params.get("q")}"` }),
      grid(list, emptyState("🔍", "No videos match your search. Try another word.", "Clear search")),
    ];
  }

  // Front page: featured video changes every day, plus "Continue watching".
  const isFront = category === "All";
  const featured = videos[Math.floor(Date.now() / 86400000) % videos.length];
  const continueList = store
    .getList("history")
    .map(findVideo)
    .filter((v) => v && progressFraction(v.id));

  return [
    isFront ? hero(featured) : null,
    isFront && continueList.length
      ? el("section", { class: "row-section" }, [
          el("h2", { class: "section-title", text: "▶ Continue watching" }),
          el("div", { class: "grid" }, continueList.map((v) => videoCard(v))),
        ])
      : null,
    el("section", { class: "row-section" }, [
      isFront ? el("h2", { class: "section-title", text: "Browse" }) : null,
      chips,
      grid(list, emptyState("🎬", "No videos in this category yet.")),
    ]),
  ];
}

function watchPage(id) {
  const video = findVideo(id);
  if (!video) return notFound();

  store.addToHistory(video.id);

  const player = el("video", {
    class: "player",
    src: video.src,
    poster: video.thumbnail,
    controls: "",
    preload: "metadata",
    playsinline: "",
  });
  const stage = el("div", { class: "stage" }, [player]);

  // Resume where you left off.
  player.addEventListener("loadedmetadata", () => {
    const saved = store.getProgress(video.id);
    if (saved && progressFraction(video.id)) {
      player.currentTime = saved.time;
      toast(`Resuming from ${formatTime(saved.time)}`);
    }
  });

  // Save your place every few seconds, and when you pause or leave.
  let lastSave = 0;
  const saveProgress = () => store.setProgress(video.id, player.currentTime, player.duration);
  player.addEventListener("timeupdate", () => {
    if (Date.now() - lastSave > 5000) {
      lastSave = Date.now();
      saveProgress();
    }
  });
  player.addEventListener("pause", saveProgress);
  onLeave = saveProgress;

  // Friendly message if the video can't load.
  player.addEventListener("error", () => {
    stage.append(
      el("div", { class: "stage-overlay" }, [
        el("p", { text: "😕 This video couldn't load." }),
        el("p", { class: "meta", text: "Check your internet connection and try again." }),
        el("button", { class: "btn primary", text: "Try again", onclick: () => route() }),
      ])
    );
  });

  const upNext = videos.filter((v) => v.id !== video.id);

  // When the video ends, play the next one after a short countdown.
  player.addEventListener("ended", () => {
    store.clearProgress(video.id);
    const next = upNext[0];
    if (!next) return;
    let seconds = 5;
    const label = el("p", { class: "meta" });
    const overlay = el("div", { class: "stage-overlay" }, [
      el("p", { class: "overlay-kicker", text: "Up next" }),
      el("h2", { text: next.title }),
      label,
      el("div", { class: "hero-actions" }, [
        el("a", { class: "btn primary", href: `#/watch/${next.id}`, text: "▶ Play now" }),
        el("button", {
          class: "btn",
          text: "Cancel",
          onclick: () => {
            clearInterval(timer);
            overlay.remove();
          },
        }),
      ]),
    ]);
    const tick = () => {
      if (!overlay.isConnected) return clearInterval(timer);
      label.textContent = `Playing in ${seconds}…`;
      if (seconds-- <= 0) {
        clearInterval(timer);
        location.hash = `#/watch/${next.id}`;
      }
    };
    const timer = setInterval(tick, 1000);
    stage.append(overlay);
    tick();
  });

  const likeBtn = toggleButton("liked", video.id, "👍 Like", "👍 Liked");
  const laterBtn = toggleButton("later", video.id, "🕒 Watch later", "✅ Saved");
  const shareBtn = el("button", {
    class: "btn",
    text: "🔗 Share",
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        toast("Link copied to clipboard");
      } catch {
        toast("Copy the link from the address bar");
      }
    },
  });

  return el("div", { class: "watch" }, [
    el("section", { class: "watch-main" }, [
      stage,
      el("h1", { class: "watch-title", text: video.title }),
      el("div", { class: "watch-bar" }, [
        el("div", {}, [
          el("strong", { text: video.creator }),
          el("p", { class: "meta", text: `${video.year} · ${video.category} · ${video.duration}` }),
        ]),
        el("div", { class: "actions" }, [likeBtn, laterBtn, shareBtn]),
      ]),
      el("div", { class: "description" }, [
        el("p", { text: video.description }),
        el("p", { class: "meta", text: `License: ${video.license}. © ${video.creator}.` }),
        el("p", { class: "meta shortcuts", text: "⌨️ Shortcuts: Space play/pause · F fullscreen · M mute · ← → skip 5s" }),
      ]),
      commentsSection(video.id),
    ]),
    el("aside", { class: "up-next" }, [
      el("h2", { text: "Up next" }),
      ...upNext.map((v) => videoCard(v, { compact: true })),
    ]),
  ]);
}

const TOGGLE_MESSAGES = {
  liked: ["Added to Liked videos", "Removed from Liked videos"],
  later: ["Saved to Watch later", "Removed from Watch later"],
};

function toggleButton(list, id, offLabel, onLabel, extraClass = "") {
  const btn = el("button", { class: `btn ${extraClass}`.trim() });
  const render = (on) => {
    btn.textContent = on ? onLabel : offLabel;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", String(on));
  };
  render(store.isIn(list, id));
  btn.addEventListener("click", () => {
    const on = store.toggle(list, id);
    render(on);
    toast(TOGGLE_MESSAGES[list][on ? 0 : 1]);
  });
  return btn;
}

// ---------- comments ----------
function timeAgo(time) {
  const seconds = Math.floor((Date.now() - time) / 1000);
  const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [name, size] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${name}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

const EMOJIS = ["😀", "😂", "😍", "🔥", "👏"];

function commentsSection(videoId) {
  const list = el("ul", { class: "comment-list" });
  const count = el("h2", { class: "comments-title" });

  const render = () => {
    const comments = store.getComments(videoId);
    count.textContent = `💬 ${comments.length} comment${comments.length === 1 ? "" : "s"}`;
    list.replaceChildren(
      ...comments.map((c) =>
        el("li", { class: "comment" }, [
          el("p", { class: "comment-head" }, [
            el("strong", { text: "You" }),
            el("span", { class: "meta", text: ` · ${timeAgo(c.time)}` }),
          ]),
          el("p", { class: "comment-text", text: c.text }),
          el("button", {
            class: "link-btn",
            text: "Delete",
            onclick: () => {
              store.deleteComment(videoId, c.id);
              render();
              toast("Comment deleted");
            },
          }),
        ])
      )
    );
  };

  const input = el("textarea", {
    class: "comment-input",
    placeholder: "Add a comment... (Ctrl + Enter to post)",
    maxlength: String(store.MAX_COMMENT_LENGTH),
    rows: "3",
    "aria-label": "Add a comment",
  });
  const counter = el("span", { class: "meta counter" });
  const postBtn = el("button", { class: "btn primary", type: "submit", text: "Post" });

  const update = () => {
    counter.textContent = `${input.value.length}/${store.MAX_COMMENT_LENGTH}`;
    postBtn.disabled = input.value.trim() === "";
  };
  input.addEventListener("input", update);

  // Emoji buttons insert the emoji where the cursor is.
  const emojiBar = el(
    "div",
    { class: "emoji-bar" },
    EMOJIS.map((emoji) =>
      el("button", {
        type: "button",
        class: "emoji-btn",
        text: emoji,
        "aria-label": `Add ${emoji}`,
        onclick: () => {
          if (input.value.length + emoji.length > store.MAX_COMMENT_LENGTH) return;
          const { selectionStart: from, selectionEnd: to } = input;
          input.setRangeText(emoji, from, to, "end");
          input.focus();
          update();
        },
      })
    )
  );

  const form = el("form", {
    class: "comment-card",
    onsubmit: (event) => {
      event.preventDefault();
      if (store.addComment(videoId, input.value)) {
        input.value = "";
        update();
        render();
        toast("Comment posted");
      }
    },
  }, [
    input,
    el("div", { class: "comment-footer" }, [emojiBar, el("div", { class: "comment-actions" }, [counter, postBtn])]),
  ]);

  // Ctrl + Enter (or Cmd + Enter on Mac) posts the comment.
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  update();
  render();
  return el("section", { class: "comments" }, [count, form, list]);
}

const LIBRARY = {
  liked: { title: "Liked videos", icon: "👍", empty: "Videos you like will show up here." },
  later: { title: "Watch later", icon: "🕒", empty: "Save videos to watch later and they'll show up here." },
  history: { title: "History", icon: "📜", empty: "Videos you watch will show up here." },
};

function libraryPage(name) {
  const info = LIBRARY[name];
  if (!info) return notFound();

  const list = store.getList(name).map(findVideo).filter(Boolean);
  const header = el("div", { class: "page-header" }, [
    el("h2", { class: "page-title", text: info.title }),
    name === "history" && list.length
      ? el("button", {
          class: "btn",
          text: "Clear history",
          onclick: () => {
            store.clearHistory();
            route();
            toast("History cleared");
          },
        })
      : null,
  ]);
  return [header, grid(list, emptyState(info.icon, info.empty))];
}

function notFound() {
  return emptyState("🤔", "Page not found. It may have moved or never existed.", "Go back home");
}

// ---------- router ----------
// Runs when you leave a page (or close the tab), e.g. to save video progress.
let onLeave = null;
window.addEventListener("pagehide", () => onLeave?.());

function pageTitle(parts, params) {
  if (parts[0] === "watch") return findVideo(decodeURIComponent(parts[1] || ""))?.title;
  if (parts[0] === "library") return LIBRARY[parts[1]]?.title;
  if (params.get("q")) return `${params.get("q")} - Search`;
  return null;
}

function route() {
  const hash = location.hash.slice(1) || "/";
  const [path, queryString = ""] = hash.split("?");
  const params = new URLSearchParams(queryString);
  const parts = path.split("/").filter(Boolean);

  onLeave?.();
  onLeave = null;

  let page;
  let nav = "home";
  if (parts.length === 0) page = homePage(params);
  else if (parts[0] === "watch" && parts[1]) {
    page = watchPage(decodeURIComponent(parts[1]));
    nav = null;
  } else if (parts[0] === "library" && parts[1]) {
    page = libraryPage(parts[1]);
    nav = parts[1];
  } else page = notFound();

  app.replaceChildren(...[].concat(page).filter(Boolean));
  const title = pageTitle(parts, params);
  document.title = title ? `${title} | StreamBox` : "StreamBox";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === nav);
  });
  document.getElementById("search-input").value = params.get("q") || "";
  closeMenu();
  window.scrollTo(0, 0);
}

// ---------- header controls ----------
document.getElementById("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const q = document.getElementById("search-input").value.trim();
  location.hash = q ? `#/?q=${encodeURIComponent(q)}` : "#/";
});

// Mobile menu: a dark backdrop behind it closes the menu when tapped.
const backdrop = el("div", { class: "backdrop", onclick: () => closeMenu() });
document.body.append(backdrop);
function closeMenu() {
  document.body.classList.remove("menu-open");
}
document.getElementById("menu-btn").addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});

const themeBtn = document.getElementById("theme-btn");
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}
// Dark by default, like most video apps; people can switch to light.
applyTheme(store.getTheme() || "dark");
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  store.setTheme(next);
  applyTheme(next);
});

// ---------- keyboard shortcuts ----------
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
  const typing = event.target.closest("input, textarea, [contenteditable]");
  if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
  // Let Space still press a focused button or link.
  if (event.key === " " && event.target.closest("button, a")) return;

  if (event.key === "/") {
    event.preventDefault();
    document.getElementById("search-input").focus();
    return;
  }

  const player = document.querySelector("video.player");
  if (!player) return;
  const key = event.key.toLowerCase();
  if (key === " " || key === "k") {
    event.preventDefault();
    player.paused ? player.play().catch(() => {}) : player.pause();
  } else if (key === "f") {
    document.fullscreenElement ? document.exitFullscreen() : player.requestFullscreen?.();
  } else if (key === "m") {
    player.muted = !player.muted;
    toast(player.muted ? "Muted" : "Sound on");
  } else if (key === "arrowleft" || key === "arrowright") {
    event.preventDefault();
    player.currentTime = Math.max(0, player.currentTime + (key === "arrowleft" ? -5 : 5));
  }
});

window.addEventListener("hashchange", route);
route();
