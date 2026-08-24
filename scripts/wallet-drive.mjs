// One-shot driver: attaches to the running wallet session page and runs one action.
// Usage: node scripts/wallet-drive.mjs <action> [args]
// Actions: shot, click <text>, fill <selector> <text>, goto <url>, read-address, text
import { chromium } from "playwright";

const PROFILE = "/tmp/ready-wallet-profile";
// connect over CDP is not enabled; instead re-launch attach is not possible for
// a running context — so we talk to it via a tiny HTTP bridge the session exposes.
// Simpler: this script reuses the same persistent profile IF the session died.
// For a live session we use chrome devtools protocol via the debug port.

const DEBUG_PORT = 9222;
const [action, ...args] = process.argv.slice(2);

async function main() {
  // find the page through the CDP endpoint
  const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json().catch(() => null);
  if (!list) {
    console.error("no debug port; relaunch not supported here");
    process.exit(2);
  }
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${DEBUG_PORT}`);
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const page =
    pages.find((p) => p.url().startsWith("chrome-extension://")) ?? pages[0];
  if (!page) throw new Error("no page");

  switch (action) {
    case "shot":
      await page.screenshot({ path: args[0] ?? "scripts/wallet-step.png" });
      console.log("url:", page.url());
      break;
    case "text":
      console.log((await page.locator("body").innerText()).slice(0, 3000));
      break;
    case "click": {
      const target = args.join(" ");
      await page.getByText(target, { exact: false }).first().click({ timeout: 5000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: "scripts/wallet-step.png" });
      console.log("clicked:", target, "| url:", page.url());
      break;
    }
    case "clickRole": {
      // clickRole "button" "Create a new wallet"
      const [role, name] = args;
      await page.getByRole(role, { name }).first().click({ timeout: 5000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: "scripts/wallet-step.png" });
      console.log("clicked role:", role, name, "| url:", page.url());
      break;
    }
    case "fill": {
      const [sel, val] = args;
      await page.locator(sel).first().fill(val, { timeout: 5000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: "scripts/wallet-step.png" });
      console.log("filled", sel);
      break;
    }
    case "goto": {
      await page.goto(args[0], { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: "scripts/wallet-step.png" });
      console.log("url:", page.url());
      break;
    }
    default:
      console.error("unknown action", action);
  }
  await browser.close();
}
main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
