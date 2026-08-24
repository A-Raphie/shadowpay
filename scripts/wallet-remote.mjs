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

const EXT_ID = "dlcobpjiigpikoobohmabehhmhfoodbb";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const ctx = browser.contexts()[0];

function pickPage(which) {
  const pages = ctx.pages();
  if (which === "ext") {
    return (
      pages.find((p) => p.url().includes(EXT_ID)) ??
      pages.find((p) => p.url().startsWith("chrome-extension://")) ??
      null
    );
  }
  if (which === "app") return pages.find((p) => p.url().includes("shadowpay")) ?? null;
  return pages[0] ?? null;
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
        const p = pickPage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        const t = await p.locator("body").innerText();
        return json(res, 200, { url: p.url(), text: t.slice(0, 2500) });
      }
      case "shot": {
        const p = pickPage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        const path = q.get("path") ?? "scripts/remote-shot.png";
        await p.screenshot({ path });
        return json(res, 200, { ok: true, path, url: p.url() });
      }
      case "click": {
        const p = pickPage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        const text = q.get("text");
        if (text) await p.getByText(text, { exact: q.get("exact") === "1" }).first().click({ timeout: 4000 });
        else if (q.get("role")) await p.getByRole(q.get("role"), { name: q.get("name") ?? "" }).first().click({ timeout: 4000 });
        else if (q.get("xy")) { const [x, y] = q.get("xy").split(",").map(Number); await p.mouse.click(x, y); }
        await p.waitForTimeout(600);
        return json(res, 200, { ok: true, url: p.url(), text: (await p.locator("body").innerText()).slice(0, 800) });
      }
      case "wheel": {
        const p = pickPage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        await p.mouse.wheel(0, Number(q.get("dy") ?? 500));
        await p.waitForTimeout(500);
        return json(res, 200, { ok: true, text: (await p.locator("body").innerText()).slice(0, 800) });
      }
      case "eval": {
        const p = pickPage(q.get("page"));
        if (!p) return json(res, 404, { error: "no page" });
        const r = await p.evaluate(q.get("code"));
        return json(res, 200, { result: String(r).slice(0, 1500) });
      }
      default:
        return json(res, 400, { error: "unknown cmd " + cmd });
    }
  } catch (e) {
    return json(res, 500, { error: e.message.slice(0, 200) });
  }
}).listen(9333, () => console.log("wallet-remote on 9333"));
