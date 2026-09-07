#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/*
  Renders apps/web/public/og.png from the same fonts, logo geometry and colour
  tokens the site itself uses, so the social preview cannot drift away from the
  landing page it advertises.

    bun run og

  Chrome renders it rather than an SVG rasteriser because the heading face is a
  variable woff2 at weight 350, and the rasterisers available here either drop
  the variation axis or substitute the fallback silently.
*/

const WIDTH = 1200;
const HEIGHT = 630;

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const root = fileURLToPath(new URL("..", import.meta.url));

const dataUrl = (path: string) =>
  `data:font/woff2;base64,${readFileSync(path).toString("base64")}`;

/* The fonts are a dependency of apps/web, so resolution is anchored there
   rather than at the workspace root. */
const fontFile = (family: string, file: string) =>
  fileURLToPath(
    import.meta.resolve(
      `@fontsource-variable/${family}/files/${file}`,
      new URL("../apps/web/package.json", import.meta.url).href
    )
  );

const heading = dataUrl(
  fontFile("funnel-display", "funnel-display-latin-wght-normal.woff2")
);
const body = dataUrl(fontFile("geist", "geist-latin-wght-normal.woff2"));

/* The one source of truth for the mark is the Logo component; this is its
   petal path, repeated on the same six rotations. */
const PETAL = "M-9-44H9L19-34L9-28L13-23L8-18H-8L-13-23L-9-28L-19-34Z";
const ANGLES = [0, 60, 120, 180, 240, 300];

const petals = ANGLES.map(
  (angle) => `<path d="${PETAL}" transform="rotate(${angle})" />`
).join("");

const logo = `<svg viewBox="-48 -48 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor">${petals}</svg>`;

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: "Funnel Display Variable";
        src: url("${heading}") format("woff2-variations");
        font-weight: 300 800;
      }
      @font-face {
        font-family: "Geist Variable";
        src: url("${body}") format("woff2-variations");
        font-weight: 100 900;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: ${WIDTH}px;
        height: ${HEIGHT}px;
        background: oklch(0.152 0.008 248);
        color: oklch(0.97 0 0);
        font-family: "Geist Variable", sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 72px 80px;
        position: relative;
        overflow: hidden;
      }
      /* The landing page sits on a dithered field; this is the same texture at
         the density that survives downscaling in a timeline. */
      .dither {
        position: absolute;
        inset: 0;
        background-image: radial-gradient(
          oklch(1 0 0 / 12%) 1px,
          transparent 1px
        );
        background-size: 4px 4px;
        opacity: 0.5;
      }
      .glow {
        position: absolute;
        top: -30%;
        right: -20%;
        width: 900px;
        height: 900px;
        background: radial-gradient(
          circle,
          oklch(0.62 0.13 220 / 22%) 0%,
          transparent 62%
        );
      }
      .row { position: relative; display: flex; align-items: center; gap: 12px; }
      .row svg { width: 30px; height: 30px; }
      .brand {
        font-family: "Funnel Display Variable", sans-serif;
        font-weight: 500;
        font-size: 30px;
        letter-spacing: -0.03em;
      }
      main { position: relative; }
      h1 {
        font-family: "Funnel Display Variable", sans-serif;
        font-weight: 350;
        font-size: 82px;
        line-height: 1.07;
        letter-spacing: -0.025em;
        max-width: 19ch;
      }
      p {
        margin-top: 26px;
        font-size: 26px;
        line-height: 1.45;
        max-width: 46ch;
        color: oklch(0.72 0.012 248);
      }
      .rule {
        position: relative;
        width: 84px;
        height: 3px;
        background: oklch(0.62 0.13 220);
      }
    </style>
  </head>
  <body>
    <div class="dither"></div>
    <div class="glow"></div>
    <div class="row">${logo}<span class="brand">Anpord</span></div>
    <main>
      <h1>Evals for harnesses running in sandboxes.</h1>
      <p>
        Run evals across sandboxes, harnesses and models to optimize
        performance, latency and cost.
      </p>
    </main>
    <div class="rule"></div>
  </body>
</html>`;

const work = mkdtempSync(join(tmpdir(), "anpord-og-"));
const page = join(work, "og.html");
const out = join(root, "apps/web/public/og.png");

writeFileSync(page, html);

const result = spawnSync(
  CHROME,
  [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${out}`,
    `file://${page}`,
  ],
  { encoding: "utf8" }
);

rmSync(work, { force: true, recursive: true });

if (result.status !== 0) {
  throw new Error(`Chrome could not render the preview: ${result.stderr}`);
}

process.stderr.write(`Wrote ${out} at ${WIDTH * 2}x${HEIGHT * 2}.\n`);
