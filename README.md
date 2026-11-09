# Scrape Data from Mobile Apps

Slide deck for the talk **"Scrape Data from Mobile Apps"** (Mobile Dev Talk #24), with animated canvas diagrams.

## Requirements

- Node.js `>=22.12.0`
- pnpm or npm

## Getting started

```bash
npm install
npm run dev        # start the dev server (vite)
```

Or with pnpm:

```bash
pnpm install
pnpm run dev
```

## Scripts

| Script                | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | Start the Vite dev server                                |
| `npm run build`       | Build reveal.js and all plugins into `dist/`             |
| `npm run build:es5`   | Build the ES5 bundle                                     |
| `npm run build:styles`| Build only the CSS themes                                |
| `npm run package`     | Create a distributable zip                               |
| `npm test`            | Run the test suite                                       |

`index.html` loads its assets from `dist/`, so run `npm run build` once before opening the slides without the dev server.

## Project structure

```
index.html        Slide deck content and styles
talk/             Animated canvas diagrams used by the slides (diagrams.js)
css/              reveal.js styles and themes (source SCSS)
js/               reveal.js core source
plugin/           reveal.js plugins (highlight, markdown, math, notes, search, zoom)
dist/             Generated build output (not committed)
scripts/          Build, banner, packaging and test scripts
test/             reveal.js test pages
```

## Diagrams

Diagrams are drawn on `<canvas>` elements in `index.html` and animated by `talk/diagrams.js`:

```html
<canvas class="viz" data-scene="api" data-w="1100" data-h="300"></canvas>
```

Available scenes: `api`, `attest`, `fingerprint`, `hmac`, `layers`, `orbit`, `proxy`. Animations run only for canvases on the current slide and restart each time the slide is entered.

## Credits

- [reveal.js](https://github.com/hakimel/reveal.js) by Hakim El Hattab and contributors, MIT licensed. See [LICENSE](LICENSE).
- Documentation and demos: [revealjs.com](https://revealjs.com/)
