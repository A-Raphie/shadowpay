// E2E: wallet connect flow against the live automated wallet browser.
// Verifies the exact chain that broke across takes:
//   1. app loads and the picker lists Ready X (injection + discovery)
//   2. Connect -> Ready X -> panel shows Disconnect + MAINNET
//   3. RELOAD: AutoReconnect restores the session without a picker click
//   4. amount 7 + Shield CTA enables
//   5. (no transaction is sent)
// Usage: node scripts/e2e-connect.mjs [url]
import { chromium } from "playwright";

const URL = process.argv[2] ?? "https://shadowpay-green.vercel.app/";
const EXT_ID = "dlcobpjiigpikoobohmabehhmhfoodbb";
const failures = [];
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " - " + detail : ""}`);
  if (!cond) failures.push(name);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const ctx = browser.contexts()[0];

// clean stage: keep exactly one wallet tab + one fresh app tab
for (const p of ctx.pages()) await p.close().catch(() => {});
const ext = await ctx.newPage();
await ext.goto(`chrome-extension://${EXT_ID}/index.html`, { waitUntil: "domcontentloaded" });
await ext.waitForTimeout(2000);
let extText = await ext.locator("body").innerText();
if (/Unlock/.test(extText)) {
  const pass = (await import("node:fs")).readFileSync("/tmp/demo-wallet-credentials.txt", "utf8").split("\n")[0];
  const i = ext.locator("input[type=password]").first();
  await i.fill(pass);
  await i.press("Enter");
  await ext.waitForTimeout(2500);
  extText = await ext.locator("body").innerText();
}
ok("wallet unlocked", !/Unlock/.test(extText));

const app = await ctx.newPage();
const errors = [];
app.on("pageerror", (e) => errors.push(String(e).slice(0, 100)));
await app.goto(URL, { waitUntil: "load", timeout: 60000 });
await app.waitForTimeout(3000);

// 1. picker lists Ready X (skip if AutoReconnect already connected us)
let autoConnected = /Disconnect/.test(await app.locator("body").innerText());
if (autoConnected) {
  ok("AutoReconnect on first load", true, "(connected before picker step)");
} else {
  await app.getByRole("button", { name: "Connect", exact: true }).first().click();
  await app.waitForTimeout(1200);
  let modal = await app.locator("body").innerText();
  ok("picker lists Ready X", /Ready X/.test(modal));

  // 2. connect through the picker
  await app.getByText("Ready X", { exact: true }).first().click();
}
// fresh origins need a one-time dapp approval in the wallet window
for (let i = 0; i < 10; i++) {
  const extT = await ext.locator("body").innerText().catch(() => "");
  if (/Read your wallet address/.test(extT)) {
    await ext.getByRole("button", { name: "Connect" }).last().click().catch(() => {});
    break;
  }
  await sleep(800);
}
let connected = false;
for (let i = 0; i < 15; i++) {
  await sleep(1000);
  const t = await app.locator("body").innerText();
  if (/Disconnect/.test(t) && /MAINNET/i.test(t)) { connected = true; break; }
}
ok("connect -> Disconnect + MAINNET", connected);

// 3. reload -> AutoReconnect restores session
await app.reload({ waitUntil: "load" });
await app.waitForTimeout(5000);
let reconnected = false;
for (let i = 0; i < 15; i++) {
  const t = await app.locator("body").innerText();
  if (/Disconnect/.test(t)) { reconnected = true; break; }
  await sleep(1000);
}
ok("reload -> AutoReconnect", reconnected);

// 4. amount + Shield CTA enabled
await app.locator("#app").scrollIntoViewIfNeeded().catch(() => {});
const st = await app.evaluate(() => {
  const i = document.querySelector("input[class*=bigInput]");
  if (i) {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    set.call(i, "7");
    i.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const b = [...document.querySelectorAll("button")].find((e) => e.className.includes("btnCta") && /shield/i.test(e.textContent));
  return { amount: i ? i.value : null, cta: b ? { disabled: b.disabled } : null };
});
ok("amount input accepts 7", st.amount === "7", JSON.stringify(st));
ok("Shield CTA enabled", st.cta && st.cta.disabled === false);

ok("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));

await browser.close();
console.log(failures.length ? `\nE2E FAIL: ${failures.join(", ")}` : "\nE2E CONNECT PASS");
process.exit(failures.length ? 1 : 0);
