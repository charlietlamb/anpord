import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer, { type Browser } from "puppeteer-core";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((path): path is string => path !== undefined);

export interface OwnBrowser {
  readonly browser: Browser;
  readonly close: () => Promise<void>;
}

export const launchChrome = async (): Promise<OwnBrowser> => {
  const executablePath = CHROME_CANDIDATES.find((path) => existsSync(path));
  if (executablePath === undefined) {
    throw new Error(
      `No Chrome found. Looked in:\n  ${CHROME_CANDIDATES.join("\n  ")}\nSet CHROME_PATH.`
    );
  }
  const profile = await mkdtemp(join(tmpdir(), "anpord-perf-chrome-"));
  const browser = await puppeteer.launch({
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
    ],
    defaultViewport: null,
    executablePath,
    headless: true,
    userDataDir: profile,
  });
  return {
    browser,
    close: async () => {
      await browser.close();
      await rm(profile, { force: true, recursive: true });
    },
  };
};

export const signedInContext = async (
  browser: Browser,
  baseUrl: string,
  cookieHeader: string
) => {
  const context = await browser.createBrowserContext();
  const separator = cookieHeader.indexOf("=");
  await context.setCookie({
    domain: new URL(baseUrl).hostname,
    httpOnly: true,
    name: cookieHeader.slice(0, separator),
    path: "/",
    sameSite: "Lax",
    value: cookieHeader.slice(separator + 1),
  });
  return context;
};
