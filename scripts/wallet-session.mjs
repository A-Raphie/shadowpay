// Launch a persistent Chromium with a real wallet extension loaded (vendored
// from the user's installed Chrome, never hand-drawn). Generic, any wallet.
//
// Usage: node wallet-session.mjs [extId] [profileDir] [extDstDir]
//   extId      Chrome Web Store id of the installed extension (REQUIRED in practice)
//   profileDir persistent profile dir (default /tmp/wallet-profile)
//   extDstDir  where the vendored extension copy lives (default /tmp/wallet-ext)
// Example (Ready X):
//   node wallet-session.mjs dlcobpjiigpikoobohmabehhmhfoodbb /tmp/ready-wallet-profile /tmp/readyx-ext
import { chromium } from "playwright";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const EXT_ID = process.argv[2];
const PROFILE = process.argv[3] || "/tmp/wallet-profile";
const EXT_DST = process.argv[4] || "/tmp/wallet-ext";
if (!EXT_ID) {
  console.error("usage: node wallet-session.mjs <extId> [profileDir] [extDstDir]");
  process.exit(1);
}
const EXT_SRC_ROOT = join(
  process.env.HOME,
  `Library/Application Support/Google/Chrome/Default/Extensions/${EXT_ID}`
);
if (!existsSync(EXT_SRC_ROOT)) {
  console.error(`extension ${EXT_ID} is not installed in this Chrome profile`);
  process.exit(1);
}

// vendor the newest version dir of the extension (real installed asset, never hand-drawn)
if (!existsSync(EXT_DST)) {
  const versions = readdirSync(EXT_SRC_ROOT).sort();
  const latest = versions[versions.length - 1];
  cpSync(join(EXT_SRC_ROOT, latest), EXT_DST, { recursive: true });
  console.log(`vendored extension ${EXT_ID} ${latest}`);
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
    "--hide-crash-restore-bubble",
  ],
});

// find the extension service worker / pages to learn its runtime id
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
const mode = process.argv[5] ?? "launch";

if (mode === "launch") {
  // read manifest to find the extension's entry page
  const manifest = JSON.parse(readFileSync(join(EXT_DST, "manifest.json"), "utf8"));
  console.log("manifest action:", JSON.stringify(manifest.action ?? {}));
  if (extId) {
    await page.goto(`chrome-extension://${extId}/${(manifest.action?.default_path) ?? "index.html"}`, { waitUntil: "domcontentloaded" }).catch((e) => console.log("nav err", e.message.slice(0, 80)));
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "wallet-session.png" });
  console.log("page url:", page.url());
  console.log("title:", await page.title().catch(() => "?"));
}

ctx.on("close", () => process.exit(0));
// keep alive
setInterval(() => {}, 1 << 30);
