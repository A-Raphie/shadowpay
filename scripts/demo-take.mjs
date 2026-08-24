// ShadowPay demo take runner. Paced by VO beats (/tmp/vo-beats/beat-NN.wav).
// Usage: node scripts/demo-take.mjs        (real take: scenes 1-7, spends ~10 STRK)
//        node scripts/demo-take.mjs dry    (coordinate lock pass: scenes 1-3 + 7, no VO, no spend)
import { spawn, execSync } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(spawn);

const BASE = "http://127.0.0.1:9333";
const BEATS = "/tmp/vo-beats";
const REC_FILE = "/tmp/shadowpay-take.mov";
const DRY = process.argv[2] === "dry";

const R = async (path) => {
  try {
    const r = await fetch(BASE + path);
    return await r.json();
  } catch (e) {
    return { error: String(e) };
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const say = console.log.bind(console, `[take]`);
const HOLD_SCALE = 0.6;
const hold = DRY ? (ms) => sleep(Math.min(ms, 700)) : (ms) => sleep(ms * HOLD_SCALE);

function playBeat(n) {
  return new Promise((resolve) => {
    const f = `${BEATS}/beat-${String(n).padStart(2, "0")}.wav`;
    const p = spawn("afplay", [f]);
    p.on("exit", resolve);
    p.on("error", () => resolve());
  });
}

async function beat(n) {
  if (DRY) return;
  say(`beat ${n} playing`);
  const { appendFileSync } = await import("node:fs");
  appendFileSync("/tmp/take-timeline.jsonl", JSON.stringify({ beat: n, start: Date.now() }) + "\n");
  await playBeat(n);
  await sleep(250);
}

async function waitText(page, re, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const r = await R(`/text?page=${page}`);
    if (r.text && re.test(r.text)) return true;
    await sleep(800);
  }
  return false;
}

async function findButton(page, label) {
  // returns "x,y" center of a button whose trimmed text matches
  return (
    await R(
      `/eval?page=${page}&code=${encodeURIComponent(
        `(function(){ const b=[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="${label}"); if(!b) return "nf"; const r=b.getBoundingClientRect(); return (r.x+r.width/2|0)+","+(r.y+r.height/2|0); })()`
      )}`
    )
  ).result;
}

async function restartRecorder() {
  try {
    const pid = execSync("ps aux | grep '[s]creencapture -v' | awk '{print $2}'").toString().trim().split("\n")[0];
    if (pid) {
      process.kill(parseInt(pid), "SIGINT");
      say("old recorder stopped (flushed)");
      await sleep(2500);
    }
  } catch {}
  spawn("screencapture", ["-v", REC_FILE], { detached: true, stdio: "ignore" }).unref();
  await sleep(1500);
  say(`recorder rolling -> ${REC_FILE}`);
}

// ---------- Scenes ----------


async function hybridClick(page, label) {
  // camera: move drawn cursor to the button; mechanics: DOM click (coordinate-proof)
  const pos = (
    await R(`/eval?page=${page}&code=${encodeURIComponent(
      `(function(){ const b=[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="${label}"); if(!b) return "nf"; const r=b.getBoundingClientRect(); return (r.x+r.width/2|0)+","+(r.y+r.height/2|0); })()`
    )}`)
  ).result;
  if (pos === "nf") return "nf";
  await R(`/cmove?page=${page}&x=${pos.split(",")[0]}&y=${pos.split(",")[1]}`);
  await sleep(300);
  return (
    await R(`/eval?page=${page}&code=${encodeURIComponent(
      `(function(){ window.__demoClick && window.__demoClick(); const b=[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="${label}"); if(!b) return "nf"; b.click(); return "clicked"; })()`
    )}`)
  ).result;
}


async function hybridJs(page, jsFind) {
  const pos = (await R(`/eval?page=${page}&code=${encodeURIComponent(`(function(){ const el=(${jsFind})(); if(!el) return "nf"; el.scrollIntoView({block:"center"}); const r=el.getBoundingClientRect(); return (r.x+r.width/2|0)+","+(r.y+r.height/2|0); })()`)}`)).result;
  if (pos === "nf") return "nf";
  await sleep(400);
  await R(`/cmove?page=${page}&x=${pos.split(",")[0]}&y=${pos.split(",")[1]}`);
  await sleep(250);
  return (await R(`/eval?page=${page}&code=${encodeURIComponent(`(function(){ const el=(${jsFind})(); if(!el) return "nf"; window.__demoClick && window.__demoClick(); el.click(); return "clicked"; })()`)}`)).result;
}

async function panelText() {
  return (await R(`/eval?page=app&code=${encodeURIComponent(`(function(){ const p=document.querySelector("[class*=panelWrap]"); return p ? p.innerText : ""; })()`)}`)).result || "";
}

async function scene1() {
  await R(`/eval?page=app&code=${encodeURIComponent(`window.scrollTo(0, 0)`)}`);
  await sleep(800);
  await R(`/cmove?page=app&x=640&y=430`);
  await hold(2500);
  await R(`/wheel?page=app&dy=350`);
  await hold(2000);
  await R(`/cmove?page=app&x=640&y=520`);
  await hold(2500);
}

async function scene2() {
  await R(`/wheel?page=app&dy=700`);
  await hold(1500);
  await R(`/cmove?page=app&x=520&y=560`);
  await hold(1800);
  await R(`/cmove?page=app&x=780&y=560`);
  await hold(1800);
}

async function scene3() {
  await R(`/wheel?page=app&dy=650`);
  await hold(1200);
  // StarkScan link on the pool row (first deployLink)
  const pos = (
    await R(
      `/eval?page=app&code=${encodeURIComponent(
        `(function(){ const a=[...document.querySelectorAll("a")].find(x=>/starkscan/i.test(x.href)); if(!a) return "nf"; const r=a.getBoundingClientRect(); return (r.x+r.width/2|0)+","+(r.y+r.height/2|0); })()`
      )}`
    )
  ).result;
  if (pos === "nf") return say("!! starkscan link not found");
  await R(`/cclick?page=app&x=${pos}`);
  await hold(3500);
  await R(`/goto?page=app&url=${encodeURIComponent("https://shadowpay-green.vercel.app/")}`);
  await hold(1200);
}

async function scene4() {
  // disconnect so the Connect moment is on camera
  await hybridJs("app", `()=>[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="Disconnect")`).catch(()=>{});
  await sleep(1200);

  // MANDATORY: reload the app once with the wallet ready. Pages loaded before
  // the wallet finished waking never receive the injection (known wallet-connect
  // lesson: reload is the fix, not a fallback).
  await R(`/eval?page=app&code=${encodeURIComponent(`location.reload()`)}`);
  await sleep(4500);
  await R(`/eval?page=app&code=${encodeURIComponent(`document.querySelector("[class*=panelWrap]")?.scrollIntoView({block:"center"})`)}`);
  await sleep(1000);

  // Connect -> picker -> Ready X, each step verified with retries
  for (let attempt = 0; attempt < 3; attempt++) {
    const panel = await panelText();
    if (/MAINNET/i.test(panel) && !/Connect a Wallet/i.test(panel)) break;
    say(`connect attempt ${attempt + 1}`);
    await hybridJs("app", `()=>[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="Connect")`);
    await sleep(1500);
    await hybridJs("app", `()=>[...document.querySelectorAll("button,div,span")].find(e=>e.textContent.trim()==="Ready X")`);
    await sleep(2500);
    // approval may surface in the wallet window
    await hybridJs("ext", `()=>[...document.querySelectorAll("button")].filter(e=>e.textContent.trim()==="Connect").pop()`).catch(()=>{});
    await sleep(2000);
    // EIP-6963 announces only reach pages loaded while the wallet is unlocked:
    // reload the app so the announcements re-fire, then retry
    await R(`/eval?page=app&code=${encodeURIComponent(`location.reload()`)}`);
    await sleep(4000);
    await R(`/eval?page=app&code=${encodeURIComponent(`document.querySelector("[class*=panelWrap]").scrollIntoView({block:"center"})`)}`);
    await sleep(1000);
  }
  // the reload + AutoReconnect handshake can take ~15s: poll before declaring failure
  let panel = "";
  const isConnectedPanel = (txt) => /MAINNET/i.test(txt) && !/Connect a Wallet/i.test(txt);
  for (let i = 0; i < 25; i++) {
    panel = await panelText();
    if (isConnectedPanel(panel)) break;
    await sleep(1000);
  }
  say("panel after connect:", JSON.stringify(panel.slice(0, 120)));
  if (!isConnectedPanel(panel)) throw new Error("wallet did not connect");

  // amount 7 (retry the set until the CTA enables)
  for (let i = 0; i < 5; i++) {
    await R(`/eval?page=app&code=${encodeURIComponent(`(function(){ const ip=document.querySelector("input[class*=bigInput]"); if(!ip) return "no-input"; ip.focus(); const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set; set.call(ip,"7"); ip.dispatchEvent(new Event("input",{bubbles:true})); return ip.value; })()`)}`);
    await sleep(600);
    const st = (await R(`/eval?page=app&code=${encodeURIComponent(`(function(){ const b=[...document.querySelectorAll("button")].find(e=>e.className.includes("btnCta")&&/shield/i.test(e.textContent)); return JSON.stringify({found: !!b, disabled: b?b.disabled:null, amount: document.querySelector("input[class*=bigInput]")?.value}); })()`)}`)).result;
    const s = JSON.parse(st || "{}");
    say(`cta state: ${st}`);
    if (s.found && !s.disabled) break;
    await sleep(1500);
  }

  // 10-block guard wait (only if a countdown is showing)
  for (let i = 0; i < 40; i++) {
    const g = JSON.parse((await R(`/eval?page=app&code=${encodeURIComponent(`(function(){ const w=[...document.querySelectorAll("div")].find(e=>/more blocks/i.test(e.textContent)); const b=[...document.querySelectorAll("button")].find(e=>e.className.includes("btnCta")&&/shield/i.test(e.textContent)); return JSON.stringify({guard: !!w, disabled: b?b.disabled:null}); })()`)}`)).result || "{}");
    if (!g.guard && g.disabled === false) break;
    await sleep(3000);
  }

  // Shield (hybrid: camera cursor + DOM click)
  const sh = await hybridJs("app", `()=>[...document.querySelectorAll("button")].find(e=>e.className.includes("btnCta")&&/shield/i.test(e.textContent))`);
  say("shield click:", sh);
  const rvw = await waitText("ext", /Review shield/i, 30000);
  say("review shield:", rvw ? "visible" : "NOT FOUND");
  if (!rvw) throw new Error("wallet review did not appear");
  await sleep(1200);
  const clicked = await hybridClick("ext", "Confirm");
  say("confirm hybrid click:", clicked);
  if (clicked !== "clicked") throw new Error("Confirm failed to click");
  const got = await waitText("app", /Confirmed|Transaction|0x[0-9a-f]{8}/i, 60000);
  say("receipt:", got ? "landed" : "timeout");
  await hold(2500);
}

async function scene5() {
  // wallet activity: real private transfer entry
  await R(`/eval?page=ext&code=${encodeURIComponent(`(function(){ const a=[...document.querySelectorAll("a")].find(a=>a.getAttribute("href")==="/account/activity"); if(a){a.click(); return "nav";} return "no-link"; })()`)}`);
  await sleep(2200);
  await R(`/click?page=ext&text=Private%20transfer`);
  await hold(4000);
}

async function scene6() {
  await R(`/goto?page=ext&url=${encodeURIComponent("chrome-extension://dlcobpjiigpikoobohmabehhmhfoodbb/account/activity")}`);
  await sleep(2000);
  await R(`/click?page=ext&text=Unshield`);
  await hold(3500);
  await R(`/eval?page=app&code=${encodeURIComponent(`window.scrollTo(0, document.body.scrollHeight)`)}`);
  await hold(2500);
}

async function scene7() {
  await R(`/goto?page=app&url=${encodeURIComponent("https://github.com/A-Raphie/shadowpay")}`);
  await hold(5000);
}

// ---------- Run ----------
(async () => {
  say(DRY ? "DRY pass (no VO, no spend)" : "REAL take");
  if (!DRY) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync("/tmp/take-timeline.jsonl", JSON.stringify({ recorderStart: Date.now() }) + "\n");
    await restartRecorder();
  }
  await beat(1); await scene1(); say("scene 1 done");
  await beat(2); await scene2(); say("scene 2 done");
  await beat(3); await scene3(); say("scene 3 done");
  if (!DRY) {
    await beat(4); await scene4(); say("scene 4 done");
    await beat(5); await scene5(); say("scene 5 done");
    await beat(6); await scene6(); say("scene 6 done");
  }
  await beat(7); await scene7(); say("scene 7 done");
  say(DRY ? "DRY complete" : `TAKE COMPLETE -> ${REC_FILE} (stop the recorder to flush)`);
})();
