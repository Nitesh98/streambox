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

// ---------- video card (used on every list page) ----------
function thumbnail(video) {
  const img = el("img", { src: video.thumbnail, alt: "", loading: "lazy" });
  // If the image can't load, show a coloured box with the title instead.
  img.addEventListener("error", () => {
    img.replaceWith(el("div", { class: "thumb-fallback", text: video.title }));
  });
  return el("div", { class: "thumb" }, [
    img,
    el("span", { class: "duration", text: video.duration }),
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

function grid(list, emptyMessage) {
  if (list.length === 0) return el("p", { class: "empty", text: emptyMessage });
  return el("div", { class: "grid" }, list.map((v) => videoCard(v)));
}

// ---------- pages ----------
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

  const heading = query
    ? el("h2", { class: "page-title", text: `Results for "${params.get("q")}"` })
    : null;

  return [chips, heading, grid(list, "No videos match your search.")];
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

  const likeBtn = toggleButton("liked", video.id, "👍 Like", "👍 Liked");
  const laterBtn = toggleButton("later", video.id, "🕒 Watch later", "✅ Saved");
  const shareBtn = el("button", {
    class: "btn",
    text: "🔗 Share",
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        shareBtn.textContent = "✅ Link copied";
      } catch {
        shareBtn.textContent = "Copy the address bar link";
      }
    },
  });

  const upNext = videos.filter((v) => v.id !== video.id);

  return el("div", { class: "watch" }, [
    el("section", { class: "watch-main" }, [
      player,
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
      ]),
    ]),
    el("aside", { class: "up-next" }, [
      el("h2", { text: "Up next" }),
      ...upNext.map((v) => videoCard(v, { compact: true })),
    ]),
  ]);
}

function toggleButton(list, id, offLabel, onLabel) {
  const btn = el("button", { class: "btn" });
  const render = (on) => {
    btn.textContent = on ? onLabel : offLabel;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", String(on));
  };
  render(store.isIn(list, id));
  btn.addEventListener("click", () => render(store.toggle(list, id)));
  return btn;
}

const LIBRARY = {
  liked: { title: "Liked videos", empty: "Videos you like will show up here." },
  later: { title: "Watch later", empty: "Save videos to watch later and they'll show up here." },
  history: { title: "History", empty: "Videos you watch will show up here." },
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
          },
        })
      : null,
  ]);
  return [header, grid(list, info.empty)];
}

function notFound() {
  return el("div", { class: "empty" }, [
    el("h2", { text: "Page not found" }),
    el("a", { href: "#/", text: "Go back home" }),
  ]);
}

// ---------- router ----------
function route() {
  const hash = location.hash.slice(1) || "/";
  const [path, queryString = ""] = hash.split("?");
  const params = new URLSearchParams(queryString);
  const parts = path.split("/").filter(Boolean);

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
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === nav);
  });
  document.getElementById("search-input").value = params.get("q") || "";
  document.body.classList.remove("menu-open");
  window.scrollTo(0, 0);
}

// ---------- header controls ----------
document.getElementById("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const q = document.getElementById("search-input").value.trim();
  location.hash = q ? `#/?q=${encodeURIComponent(q)}` : "#/";
});

document.getElementById("menu-btn").addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});

const themeBtn = document.getElementById("theme-btn");
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(store.getTheme() || (prefersDark ? "dark" : "light"));
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  store.setTheme(next);
  applyTheme(next);
});

window.addEventListener("hashchange", route);
route();
