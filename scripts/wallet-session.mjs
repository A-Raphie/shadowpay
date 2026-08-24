// Launch a persistent Chromium with the Ready X extension loaded.
// Usage: node scripts/wallet-session.mjs          (launch + report extension UI)
//        node scripts/wallet-session.mjs shot     (screenshot active page)
import { chromium } from "playwright";
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PROFILE = "/tmp/ready-wallet-profile";
const EXT_SRC_ROOT = join(
  process.env.HOME,
  "Library/Application Support/Google/Chrome/Default/Extensions/dlcobpjiigpikoobohmabehhmhfoodbb"
);
const EXT_DST = "/tmp/readyx-ext";

// vendor the newest version dir of the extension (real installed asset, never hand-drawn)
if (!existsSync(EXT_DST)) {
  const versions = readdirSync(EXT_SRC_ROOT).sort();
  const latest = versions[versions.length - 1];
  cpSync(join(EXT_SRC_ROOT, latest), EXT_DST, { recursive: true });
  console.log("vendored Ready X", latest);
}
mkdirSync(PROFILE, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  viewport: { width: 1280, height: 860 },
  args: [
    `--disable-extensions-except=${EXT_DST}`,
    `--load-extension=${EXT_DST}`,
    "--window-size=1280,860",
    "--remote-debugging-port=9222",
  ],
});

// find the extension service worker / pages to learn its id
let extId = null;
for (const w of ctx.serviceWorkers()) {
  const url = w.url();
  const m = url.match(/chrome-extension:\/\/([a-p]{32})/);
  if (m) extId = m[1];
}
ctx.on("serviceworker", (w) => {
  const m = w.url().match(/chrome-extension:\/\/([a-p]{32})/);
  if (m && !extId) extId = m[1];
});

console.log("extension id:", extId);
const page = ctx.pages()[0] ?? (await ctx.newPage());
const mode = process.argv[2] ?? "launch";

if (mode === "launch") {
  // read manifest to find the extension's entry page
  const { readFileSync } = await import("node:fs");
  const manifest = JSON.parse(readFileSync(join(EXT_DST, "manifest.json"), "utf8"));
  console.log("manifest action:", JSON.stringify(manifest.action ?? {}));
  if (extId) {
    await page.goto(`chrome-extension://${extId}/${(manifest.action?.default_path) ?? "index.html"}`, { waitUntil: "domcontentloaded" }).catch((e) => console.log("nav err", e.message.slice(0, 80)));
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scripts/wallet-1.png" });
  console.log("page url:", page.url());
  console.log("title:", await page.title().catch(() => "?"));
}

ctx.on("close", () => process.exit(0));
// keep alive
setInterval(() => {}, 1 << 30);
