// ShadowPay demo take runner. Paced by VO beats (/tmp/vo-beats/beat-NN.wav).
// Usage: node scripts/demo-take.mjs        (real take: scenes 1-7, spends ~10 STRK)
//        node scripts/demo-take.mjs dry    (coordinate lock pass: scenes 1-3 + 7, no VO, no spend)
//        node scripts/demo-take.mjs mux [out.mp4]  (stop recorder + mux with head trim, no scenes)
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

// Beat durations measured once from the segmented VO files. The take plays NO
// audio: it silently waits each beat's duration and logs a marker, and the VO
// is muxed at those marker offsets in post (nobody hears anything live).
const BEAT_DUR = {};
async function measureBeats() {
  const { readdirSync } = await import("node:fs");
  const { execSync } = await import("node:child_process");
  for (const f of readdirSync(BEATS).filter((f) => f.endsWith(".wav"))) {
    const n = parseInt(f.match(/beat-(\d+)/)[1], 10);
    const d = parseFloat(
      execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${BEATS}/${f}`).toString()
    );
    BEAT_DUR[n] = d;
  }
  say("beat durations (s): " + JSON.stringify(BEAT_DUR));
}

async function beat(n) {
  if (DRY) return;
  say(`beat ${n}: silent pacing ${BEAT_DUR[n]?.toFixed(1) ?? "?"}s`);
  const { appendFileSync } = await import("node:fs");
  appendFileSync("/tmp/take-timeline.jsonl", JSON.stringify({ beat: n, start: Date.now(), dur: BEAT_DUR[n] ?? 0 }) + "\n");
  await sleep((BEAT_DUR[n] ?? 8) * 1000 + 250);
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
    const pids = execSync("ps aux | grep '[s]creencapture -v' | awk '{print $2}'").toString().trim().split("\n").filter(Boolean);
    for (const pid of pids) {
      try { process.kill(parseInt(pid), "SIGINT"); } catch {}
    }
    if (pids.length) say(`${pids.length} old recorder(s) stopped (flushed)`);
    await sleep(2500);
  } catch {}
  // screencapture -v only writes the file at STOP (verified empirically):
  // clear any stale output, spawn, then verify the PROCESS is alive.
  const { rmSync } = await import("node:fs");
  try { rmSync(REC_FILE); } catch {}
  // REGION RECORDING: capture only the browser window's rect. The desktop
  // around it (other apps, dock, notifications, wrong space) can never enter
  // the frame, so the take is immune to desktop state.
  const rect = execSync(`osascript -e 'tell application "System Events" to tell application process "Google Chrome for Testing" to get {position, size} of window 1'`).toString().trim();
  const [x, y, w, h] = rect.split(", ").map((n) => parseInt(n, 10));
  say(`recording window region ${x},${y} ${w}x${h}`);
  spawn("screencapture", ["-v", `-R${x},${y},${w},${h}`, REC_FILE], { detached: true, stdio: "ignore" }).unref();
  await sleep(2500);
  const alive = execSync(`ps aux | grep "[s]creencapture -v -R" | wc -l`).toString().trim() !== "0";
  if (!alive) throw new Error("recorder process died - aborting take");
  say(`recorder verified alive -> ${REC_FILE}`);
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
  if (!pos || pos === "nf") return "nf";
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

  // HISTORY MODE (zero cost): the wallet Activity holds the real executed pool
  // transactions (5 verified, hashes in strk20.json). Show the newest Shield.
  await R(`/goto?page=ext&url=${encodeURIComponent("chrome-extension://dlcobpjiigpikoobohmabehhmhfoodbb/account/activity")}`);
  await sleep(2500);
  await R(`/click?page=ext&text=Shield`);
  await hold(4000);
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
const MUX_OUT = process.argv[3] || new URL("../demo-video/shadowpay-demo-final.mp4", import.meta.url).pathname;

async function stopRecorderAndMux() {
  // screencapture -v flushes ONLY on SIGINT (writes the file at stop)
  try {
    const pids = execSync("ps aux | grep '[s]creencapture -v' | awk '{print $2}'").toString().trim().split("\n").filter(Boolean);
    for (const pid of pids) process.kill(parseInt(pid, 10), "SIGINT");
    say(`stopping recorder (${pids.length} pid) to flush ${REC_FILE}`);
  } catch {}
  const { existsSync } = await import("node:fs");
  const t0 = Date.now();
  while (!existsSync(REC_FILE) && Date.now() - t0 < 30000) await sleep(1000);
  if (!existsSync(REC_FILE)) throw new Error("recorder never flushed " + REC_FILE);
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${REC_FILE}`).toString());
  if (dur < 60) throw new Error(`suspicious footage duration ${dur}s - not muxing`);
  say(`footage flushed: ${dur.toFixed(1)}s -> auto-muxing (head trim is not optional)`);
  // The take ALWAYS ends through demo-mux: first VO lands ~1s after video start.
  execSync(`node ${new URL("./demo-mux.mjs", import.meta.url).pathname} --footage ${REC_FILE} --out ${MUX_OUT}`, { stdio: "inherit" });
  say(`FINAL -> ${MUX_OUT} (head-trimmed, VO at markers)`);
}

(async () => {
  if (process.argv[2] === "mux") {
    // just finish: stop any running recorder, verify the flush, mux + head trim
    return stopRecorderAndMux();
  }
  say(DRY ? "DRY pass (no VO, no spend)" : "REAL take");
  await measureBeats();
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
  if (DRY) return say("DRY complete");
  await stopRecorderAndMux();
})();
