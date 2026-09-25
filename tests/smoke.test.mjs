// Browser test: opens the app and clicks through the main features.
// Run with: npm test
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

// A tiny web server for the app folder, so the test needs no extra tools.
const ROOT = new URL("..", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  try {
    const body = await readFile(join(ROOT, path.endsWith("/") ? path + "index.html" : path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "text/html" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const BASE = `http://127.0.0.1:${server.address().port}/`;
const SHOTS = process.env.SHOTS_DIR;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let dialogs = 0;
page.on("dialog", (d) => { dialogs++; d.dismiss(); });

const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });

// Home page lists all videos
await page.goto(BASE);
await page.waitForSelector(".card");
assert.equal(await page.locator(".grid .card").count(), 4, "home shows 4 videos");
assert.equal(await page.locator(".hero h1").count(), 1, "featured video shown");
assert.equal(await page.locator("text=Continue watching").count(), 0, "no continue row before watching");
await shot("home");

// Category filter
await page.click(".chip:has-text('Sci-Fi')");
await page.waitForFunction(() => document.querySelectorAll(".grid .card").length === 2);

// Search
await page.fill("#search-input", "sintel");
await page.press("#search-input", "Enter");
await page.waitForFunction(() => document.querySelectorAll(".grid .card").length === 1);

// Search text is shown as text, never run as code
const attack = '<img src=x onerror="alert(1)">';
await page.fill("#search-input", attack);
await page.press("#search-input", "Enter");
await page.waitForFunction((a) => document.querySelector(".page-title")?.textContent.includes(a), attack);
assert.equal(await page.locator("main img[src='x']").count(), 0, "no injected image");
assert.equal(dialogs, 0, "no script ran");

// Watch page, like and watch later
await page.goto(BASE + "#/watch/sintel");
await page.waitForSelector("video.player");
assert.equal(await page.textContent(".watch-title"), "Sintel");
assert.equal(await page.title(), "Sintel | StreamBox", "tab title shows the video");
assert.equal(await page.locator(".up-next .card").count(), 3);
await page.click("button:has-text('Like')");
await page.waitForSelector(".toast:has-text('Added to Liked videos')");
await page.click("button:has-text('Watch later')");
await shot("watch");

// Comments: post, survive reload, shown as text, delete
await page.fill(".comment-input", "Great movie!");
await page.click(".emoji-btn:has-text('🔥')");
assert.equal(await page.inputValue(".comment-input"), "Great movie!🔥", "emoji added");
assert.equal(await page.textContent(".counter"), "14/500", "counter counts characters");
await page.click("button:has-text('Post')");
await page.fill(".comment-input", attack);
await page.click("button:has-text('Post')");
assert.equal(await page.locator(".comment").count(), 2, "two comments posted");
await page.reload();
await page.waitForSelector(".comment");
assert.equal(await page.textContent(".comments-title"), "💬 2 comments");
assert.equal(await page.textContent(".comment .comment-text"), attack, "comment shown as plain text");
assert.equal(dialogs, 0, "no script ran from a comment");
await page.locator(".comment").first().locator("button:has-text('Delete')").click();
assert.equal(await page.locator(".comment").count(), 1, "comment deleted");
await page.locator(".comments").scrollIntoViewIfNeeded();
await shot("comments");

// Library pages remember it (and survive a reload)
await page.reload();
await page.goto(BASE + "#/library/liked");
await page.waitForSelector(".grid .card");
assert.equal(await page.locator(".grid .card").count(), 1, "liked list has 1");
await page.goto(BASE + "#/library/later");
await page.waitForSelector(".grid .card");
await page.goto(BASE + "#/library/history");
await page.waitForSelector(".grid .card");
await page.click("button:has-text('Clear history')");
await page.waitForSelector(".empty-state a:has-text('Browse videos')");

// Continue watching: a half-watched video shows on the home page with a progress bar
await page.evaluate(() => {
  const data = JSON.parse(localStorage.getItem("streambox:v1"));
  data.history = ["sintel"];
  data.progress = { sintel: { time: 300, duration: 888 } };
  localStorage.setItem("streambox:v1", JSON.stringify(data));
});
await page.goto(BASE + "#/");
await page.reload();
await page.waitForSelector("text=Continue watching");
assert.equal(await page.locator(".progress span").count() >= 1, true, "progress bar shown");

// Keyboard: "/" jumps to the search box
await page.keyboard.press("/");
assert.equal(await page.evaluate(() => document.activeElement.id), "search-input");

// Unknown pages show a friendly message
await page.goto(BASE + "#/watch/does-not-exist");
await page.waitForSelector("text=Page not found");
assert.equal(await page.title(), "StreamBox");

// Dark mode is remembered
await page.goto(BASE);
await page.click("#theme-btn");
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
await page.reload();
await page.waitForSelector(".card");
assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
await shot(`home-${theme}`);

// Phone-sized screen: no sideways scrolling
await page.setViewportSize({ width: 375, height: 800 });
await page.goto(BASE + "#/watch/big-buck-bunny");
await page.waitForSelector("video.player");
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
assert.equal(overflow, false, "no horizontal scroll on phones");
await page.click("#menu-btn");
await page.waitForSelector(".backdrop", { state: "visible" });
await page.mouse.click(350, 400);
assert.equal(await page.evaluate(() => document.body.classList.contains("menu-open")), false, "tapping outside closes menu");
await shot("mobile");

assert.deepEqual(errors, [], "no JavaScript errors");
await browser.close();
server.close();
console.log("All checks passed ✅");
