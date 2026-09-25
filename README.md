# StreamBox

A video streaming web app, inspired by YouTube, built with plain **HTML, CSS and JavaScript**. It has no frameworks, no backend and no build step.

**Live demo:** https://nitesh98.github.io/streambox/

![Watch page](docs/screenshot-watch.png)

## Features

- **Home feed** with a responsive video grid and category filters
- **Search** across titles, creators, categories and descriptions
- **Watch page** with an HTML5 video player, video details and an "Up next" list
- **Like, Watch later and History**, saved in the browser with `localStorage`
- **Share** button that copies the video link
- **Dark / light mode** that follows your system setting and remembers your choice
- **Works on phones** with a slide-out menu (see the mobile screenshot below)
- **Shareable URLs** for every page using hash routing (`#/watch/sintel`)

<img src="docs/screenshot-mobile.png" alt="Mobile view" width="260" />

## Security and privacy

- **No secrets:** the app needs no API keys or passwords, so nothing sensitive is in the code.
- **XSS-safe rendering:** all text is added with `textContent`, never `innerHTML`, so user input such as a search for `<script>` is shown as text and can't run. A test checks this.
- **Content Security Policy:** the page only runs scripts from its own site.
- **Private by design:** likes and history stay in your own browser and are never sent to a server.

## Tech stack

| Area | Used |
|---|---|
| UI | HTML5, CSS (Grid, Flexbox, custom properties for theming) |
| Logic | JavaScript ES modules, hash-based router, DOM APIs |
| Storage | `localStorage` |
| Testing | Playwright browser tests |
| CI / hosting | GitHub Actions, GitHub Pages |

## Project structure

```
index.html        page layout (header, sidebar, main area)
css/style.css     all styling, light/dark themes, mobile layout
js/app.js         router and page rendering
js/videos.js      the video catalogue: add videos here
js/storage.js     likes, watch later, history, theme
tests/            automated browser test
```

## Run it locally

1. Download the code: `git clone https://github.com/nitesh98/streambox.git`
2. Open the folder in VS Code and start any local web server, for example the **Live Server** extension (right-click `index.html` → "Open with Live Server").

To run the tests:

```bash
npm install
npx playwright install chromium
npm test
```

## Video credits

All videos are open movies by the [Blender Foundation](https://studio.blender.org/films/), released under Creative Commons Attribution licenses: *Big Buck Bunny*, *Elephants Dream*, *Sintel* and *Tears of Steel*.

StreamBox is a learning project and isn't affiliated with YouTube or Google.

## Ideas for next steps

- Comments on videos (saved in the browser)
- Playlists
- Keyboard shortcuts (space to play or pause, F for fullscreen)
- Rebuild in React
