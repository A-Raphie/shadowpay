// Resident wallet-browser driver. Connects to the Chromium CDP port once and
// serves fast one-line commands over HTTP so each action is a curl, not a new
// process. Usage: node scripts/wallet-remote.mjs   (stays running)
//
//   curl 'http://127.0.0.1:9333/pages'
//   curl 'http://127.0.0.1:9333/text?page=ext'
//   curl 'http://127.0.0.1:9333/shot?page=ext&path=scripts/x.png'
//   curl 'http://127.0.0.1:9333/click?page=ext&text=Spot'
//   curl 'http://127.0.0.1:9333/wheel?page=ext&dy=600'
//   curl 'http://127.0.0.1:9333/eval?page=app&code=document.title'
import { chromium } from "playwright";
import { createServer } from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { injectCursor, moveCursor, cursorPos } = require("/Users/raphie/.agents/skills/demo-video/scripts/cursor.js");

const EXT_ID = "dlcobpjiigpikoobohmabehhmhfoodbb";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const ctx = browser.contexts()[0];

async function ensureCursor(pg) {
  try {
    const has = await pg.evaluate(() => !!window.__demoMove);
    if (has) return true;
    await injectCursor(pg);
    return await pg.evaluate(() => !!window.__demoMove);
  } catch {
    return false;
  }
}
// inject on all current pages
for (const pg of ctx.pages()) await ensureCursor(pg);
// and on every future page (wallet approval tabs)
ctx.on("page", (pg) => {
  pg.waitForLoadState("domcontentloaded").catch(() => {});
  ensureCursor(pg);
});

function pickPage(which) {
  const pages = ctx.pages();
  if (which === "ext") {
    // STRICT: only a live extension page counts, no fallback to pages[0]
    return pages.find((p) => p.url().includes(EXT_ID)) ?? null;
  }
  if (which === "app") return pages.find((p) => /shadowpay/.test(p.url())) ?? null;
  return pages[0] ?? null;
}

// Recover a missing surface tab instead of driving about:blank:
// app -> open the site fresh; ext -> open the wallet fullpage UI.
// Sweep orphaned blanks so they never accumulate or get driven by mistake.
async function sweepBlanks() {
  for (const pg of ctx.pages()) {
    try {
      if (pg.url() === "about:blank" || pg.url() === "") await pg.close();
    } catch {}
  }
}

async function ensurePage(which) {
  await sweepBlanks();
  let p = pickPage(which);
  if (p && p.url() !== "about:blank") return p;
  const url =
    which === "ext"
      ? `chrome-extension://${EXT_ID}/index.html`
      : "https://shadowpay-green.vercel.app/";
  p = await ctx.newPage();
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  await p.waitForTimeout(1200);
  if (p.url() === "about:blank") {
    // navigation raced or was blocked: close and retry once, never hand back a blank
    await p.close().catch(() => {});
    p = await ctx.newPage();
    await p.goto(url, { waitUntil: "load", timeout: 60000 });
    await p.waitForTimeout(1200);
  }
  await ensureCursor(p);
  return p;
}

const json = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const q = u.searchParams;
  const cmd = u.pathname.slice(1);
  try {
    switch (cmd) {
      case "pages":
        return json(res, 200, ctx.pages().map((p) => p.url().slice(0, 100)));
      case "text": {
        const p = await ensurePage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        const t = await p.locator("body").innerText();
        return json(res, 200, { url: p.url(), text: t.slice(0, 2500) });
      }
      case "shot": {
        const p = await ensurePage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        const path = q.get("path") ?? "scripts/remote-shot.png";
        await p.screenshot({ path });
        return json(res, 200, { ok: true, path, url: p.url() });
      }
      case "click": {
        const p = await ensurePage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        const text = q.get("text");
        if (text) await p.getByText(text, { exact: q.get("exact") === "1" }).first().click({ timeout: 4000 });
        else if (q.get("role")) await p.getByRole(q.get("role"), { name: q.get("name") ?? "" }).first().click({ timeout: 4000 });
        else if (q.get("xy")) { const [x, y] = q.get("xy").split(",").map(Number); await p.mouse.click(x, y); }
        await p.waitForTimeout(600);
        return json(res, 200, { ok: true, url: p.url(), text: (await p.locator("body").innerText()).slice(0, 800) });
      }
      case "wheel": {
        const p = await ensurePage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        await p.mouse.wheel(0, Number(q.get("dy") ?? 500));
        await p.waitForTimeout(500);
        return json(res, 200, { ok: true, text: (await p.locator("body").innerText()).slice(0, 800) });
      }
      case "eval": {
        const p = await ensurePage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        const r = await p.evaluate(q.get("code"));
        return json(res, 200, { result: String(r).slice(0, 1500) });
      }
      case "cmove": {
        // human drawn-cursor move to viewport coords
        const p = await ensurePage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        const x = Number(q.get("x")), y = Number(q.get("y"));
        await p.bringToFront().catch(() => {});
        await ensureCursor(p);
        await moveCursor(p, x, y);
        return json(res, 200, { ok: true, at: await cursorPos(p) });
      }
      case "cclick": {
        // drawn-cursor move + click ring + real CDP click
        const p = await ensurePage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        const x = Number(q.get("x")), y = Number(q.get("y"));
        await p.bringToFront().catch(() => {});
        await ensureCursor(p);
        await moveCursor(p, x, y);
        await p.evaluate(() => window.__demoClick && window.__demoClick());
        await p.waitForTimeout(250 + Math.floor(Math.random() * 150));
        await p.mouse.click(x, y);
        await p.waitForTimeout(500);
        return json(res, 200, { ok: true, url: p.url(), text: (await p.locator("body").innerText()).slice(0, 600) });
      }
      case "goto": {
        const p = await ensurePage(q.get("page"));
        await p.goto(q.get("url"), { waitUntil: "domcontentloaded", timeout: 45000 });
        await p.waitForTimeout(1200);
        await ensureCursor(p);
        return json(res, 200, { ok: true, url: p.url() });
      }
      default:
        return json(res, 400, { error: "unknown cmd " + cmd });
    }
  } catch (e) {
    return json(res, 500, { error: e.message.slice(0, 200) });
  }
}).listen(9333, () => console.log("wallet-remote on 9333"));
