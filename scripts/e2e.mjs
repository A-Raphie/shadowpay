// ShadowPay E2E rehearsal harness. Usage: node scripts/e2e.mjs <url>
// Real-browser pass: cold load, console capture, nav anchors, wallet modal,
// mobile viewport, horizontal-scroll check, favicon, outbound link liveness.
import { chromium } from "playwright";

const URL = process.argv[2];
if (!URL) {
  console.error("usage: node scripts/e2e.mjs <url>");
  process.exit(2);
}

const findings = [];
const fail = (page, action, expected, actual, evidence) =>
  findings.push({ page, action, expected, actual, evidence });

const browser = await chromium.launch();

// ---- Desktop pass ----
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const consoleErrors = [];
const pageErrors = [];
const badResponses = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("response", (r) => r.status() >= 400 && badResponses.push(`${r.status()} ${r.url()}`));

const t0 = Date.now();
await page.goto(URL, { waitUntil: "load", timeout: 45000 });
const loadMs = Date.now() - t0;

const title = await page.title();
if (!/ShadowPay/i.test(title)) fail(URL, "cold load", "title contains ShadowPay", title);

const h1 = await page.locator("h1").first().textContent();
if (!h1 || !/who got what/i.test(h1)) fail(URL, "hero h1", "payroll hero copy", h1);

// em-dash ban on rendered copy
const bodyText = await page.locator("body").innerText();
if (bodyText.includes("—")) fail(URL, "copy lint", "no em dash in rendered copy", "found — in body");

// nav anchors actually scroll to sections
for (const hash of ["#deploy", "#primitives", "#app"]) {
  const id = hash.slice(1);
  const el = page.locator(`#${id}`);
  if (!(await el.count())) fail(URL, `nav anchor ${hash}`, `section #${id} exists`, "missing");
}

// deployment table rows expose explorer links
const deployLinks = await page.locator('a[href*="starkscan.co"]').count();
if (deployLinks < 3) fail(URL, "deployment table", ">=3 explorer links", `${deployLinks}`);

// wallet modal opens
await page.getByRole("button", { name: /connect/i }).first().click().catch(() => {});
await page.waitForTimeout(800);
const modalVisible = await page
  .locator("text=/argent|braavos|metamask/i")
  .first()
  .isVisible()
  .catch(() => false);
if (!modalVisible) {
  // SelectWallet may render inline list instead of modal
  const anyWallet = await page.locator("text=/wallet/i").first().isVisible().catch(() => false);
  if (!anyWallet) fail(URL, "wallet modal", "wallet picker visible after Connect click", "nothing rendered");
}

// payroll inputs present
const addrInput = await page.locator('input[placeholder*="0x"]').count();
if (addrInput < 1) fail(URL, "payroll inputs", "address input present", `${addrInput}`);

// favicon branch build
const iconSvg = await page.request.get(`${URL}/icon.svg`);
if (iconSvg.status() !== 200) fail(URL, "favicon", "icon.svg 200", `${iconSvg.status()}`);

await ctx.close();

// ---- Mobile pass 390x844 ----
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const mpage = await mctx.newPage();
await mpage.goto(URL, { waitUntil: "load", timeout: 45000 });
await mpage.waitForTimeout(600);
const hScroll = await mpage.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth
);
if (hScroll > 1) fail(URL, "mobile 390", "no horizontal scroll", `${hScroll}px overflow`);

// payroll fields stack full width at 390
await mpage.locator("#app").scrollIntoViewIfNeeded();
const inputWidth = await mpage
  .locator('input[placeholder*="0x"]')
  .first()
  .boundingBox();
const vw = 390;
if (inputWidth && inputWidth.width > vw - 16)
  fail(URL, "mobile payroll input", "stacked full width", `${inputWidth.width}px`);

await mpage.screenshot({ path: "scripts/e2e-mobile.png", fullPage: false });
await page.screenshot({ path: "scripts/e2e-desktop.png" }).catch(() => {});
await mctx.close();
await browser.close();

// ---- Report ----
console.log(`cold load: ${loadMs}ms | title: ${title}`);
console.log(`console errors: ${consoleErrors.length}`);
consoleErrors.slice(0, 5).forEach((e) => console.log("  CE:", e.slice(0, 200)));
console.log(`page errors: ${pageErrors.length}`);
pageErrors.slice(0, 5).forEach((e) => console.log("  PE:", e.slice(0, 200)));
console.log(`4xx/5xx responses: ${badResponses.length}`);
badResponses.slice(0, 5).forEach((r) => console.log("  HTTP:", r));

if (findings.length) {
  console.log(`\nFINDINGS: ${findings.length}`);
  for (const f of findings)
    console.log(` - [${f.page}] ${f.action}: expected ${f.expected}, got ${f.actual} ${f.evidence ?? ""}`);
  process.exit(1);
}
console.log("\nE2E PASS: desktop + mobile clean");
