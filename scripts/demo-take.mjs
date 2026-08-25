// demo-take: config-driven desktop demo take runner. Generic, any project:
// ALL project data (URLs, selectors, wallet extension pages, scene steps)
// lives in the config file; this runner has none of it.
//
// Usage: node demo-take.mjs <config.json>            (real take: every scene)
//        node demo-take.mjs <config.json> dry        (dryScenes only, clamped holds, no recorder)
//        node demo-take.mjs <config.json> mux [out]  (stop recorder + auto-mux, head trim always)
//        node demo-take.mjs <config.json> plan       (validate + print the program, no driving)
//
// Config schema (JSON):
//   driver: driver base (default http://127.0.0.1:9333, the wallet-remote resident driver)
//   browserProcess: process name for the window-rect lookup (default "Google Chrome for Testing")
//   voDir / timeline / recFile / out / lead / holdScale: paths + mux knobs
//   dryScenes: beat numbers that run in dry mode
//   scenes: [{ beat, name, note?, actions: [action, ...] }]
//
// Action vocabulary (every primitive a real take needed, nothing speculative):
//   {t:"hold", ms}                        wait (dry clamps to 700ms)
//   {t:"eval", page, code}                run JS in the page
//   {t:"cmove", page, x, y}               move the drawn cursor
//   {t:"cclick", page, x, y}              drawn-cursor click at coordinates
//   {t:"click", page, text}               driver text click
//   {t:"wheel", page, dy}                 scroll
//   {t:"goto", page, url}                 navigate (never history.back: about:blank plague)
//   {t:"waitText", page, re, notRe?, timeoutMs?, selector?, fatal?}
//                                         poll page text (or selector innerText) for re and not notRe;
//                                         fatal:true throws on timeout
//   {t:"hybridClick", page, label}        drawn cursor to button text + DOM click (camera + mechanics)
//   {t:"hybridJs", page, find}            same for a JS locator expression returning an element
//   {t:"findClick", page, find}           evaluate locator to "x,y" then cclick it (camera-real click)
//   {t:"retry", times?, until:{page, selector?, re, notRe?}, actions:[...]}
//                                         check condition, run actions until satisfied or times out
//
// Pacing: silent. Each beat's VO duration is measured from voDir and waited
// with a marker logged to the timeline; the VO is muxed at those markers in
// post by demo-mux.mjs (nobody hears audio live). The take ALWAYS finishes
// through demo-mux.mjs: recorder stop, flush check, mux with the head-lead
// trim (first VO line lands ~1s after video start). There is no take-to-
// deliverable path that skips it.
import { spawn, execSync } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, existsSync, readdirSync, appendFileSync, writeFileSync, rmSync } from "node:fs";
const exec = promisify(spawn);

const CONFIG_PATH = process.argv[2];
const MODE = process.argv[3] || "real"; // real | dry | mux | plan
const MUX_OUT_ARG = process.argv[4];
if (!CONFIG_PATH || !existsSync(CONFIG_PATH)) {
  console.error("usage: node demo-take.mjs <config.json> [dry|mux|plan]");
  process.exit(1);
}
const CONFIG = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));

const BASE = CONFIG.driver || "http://127.0.0.1:9333";
const BEATS = CONFIG.voDir || "/tmp/vo-beats";
const TIMELINE = CONFIG.timeline || "/tmp/take-timeline.jsonl";
const REC_FILE = CONFIG.recFile || "/tmp/demo-take.mov";
const OUT = MUX_OUT_ARG || CONFIG.out || "demo-video/demo-final.mp4";
const LEAD = CONFIG.lead ?? 1.0;
const HOLD_SCALE = CONFIG.holdScale ?? 0.6;
const DRY = MODE === "dry";

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
const hold = DRY ? (ms) => sleep(Math.min(ms, 700)) : (ms) => sleep(ms * HOLD_SCALE);

// ---------- VO pacing (silent, marker-logged) ----------
const BEAT_DUR = {};
function measureBeats() {
  for (const f of readdirSync(BEATS).filter((f) => f.endsWith(".wav"))) {
    const n = parseInt(f.match(/beat-(\d+)/)[1], 10);
    BEAT_DUR[n] = parseFloat(
      execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${BEATS}/${f}`).toString()
    );
  }
  say("beat durations (s): " + JSON.stringify(BEAT_DUR));
}

async function beat(n) {
  if (DRY) return;
  say(`beat ${n}: silent pacing ${BEAT_DUR[n]?.toFixed(1) ?? "?"}s`);
  appendFileSync(TIMELINE, JSON.stringify({ beat: n, start: Date.now(), dur: BEAT_DUR[n] ?? 0 }) + "\n");
  await sleep((BEAT_DUR[n] ?? 8) * 1000 + 250);
}

// ---------- page helpers ----------
async function pageText(page, selector) {
  const code = `(function(){ const el=${selector ? `document.querySelector(${JSON.stringify(selector)})` : "document.body"}; return el ? el.innerText : ""; })()`;
  return (await R(`/eval?page=${page}&code=${encodeURIComponent(code)}`)).result || "";
}

async function matchesUntil(u) {
  const t = await pageText(u.page, u.selector);
  return new RegExp(u.re).test(t) && (!u.notRe || !new RegExp(u.notRe).test(t));
}

async function waitText(a) {
  const re = new RegExp(a.re);
  const notRe = a.notRe ? new RegExp(a.notRe) : null;
  const t0 = Date.now();
  const timeoutMs = a.timeoutMs ?? 20000;
  while (Date.now() - t0 < timeoutMs) {
    const t = await pageText(a.page, a.selector);
    if (re.test(t) && (!notRe || !notRe.test(t))) return true;
    await sleep(800);
  }
  say(`!! waitText timeout (${timeoutMs}ms): /${a.re}/${a.notRe ? ` not /${a.notRe}/` : ""} on ${a.page}`);
  if (a.fatal) throw new Error(`waitText fatal: ${a.re} never appeared on ${a.page}`);
  return false;
}

function locatorJs(find) {
  return `(function(){ const el=(${find})(); if(!el) return "nf"; const r=el.getBoundingClientRect(); return (r.x+r.width/2|0)+","+(r.y+r.height/2|0); })()`;
}

async function hybridClick(page, label) {
  // camera: move drawn cursor to the button; mechanics: DOM click (coordinate-proof)
  const pos = (await R(`/eval?page=${page}&code=${encodeURIComponent(`(function(){ const b=[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="${label}"); if(!b) return "nf"; const r=b.getBoundingClientRect(); return (r.x+r.width/2|0)+","+(r.y+r.height/2|0); })()`)}`)).result;
  if (pos === "nf") return say(`!! hybridClick: no button "${label}" on ${page}`);
  await R(`/cmove?page=${page}&x=${pos.split(",")[0]}&y=${pos.split(",")[1]}`);
  await sleep(300);
  return (
    await R(`/eval?page=${page}&code=${encodeURIComponent(`(function(){ window.__demoClick && window.__demoClick(); const b=[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="${label}"); if(!b) return "nf"; b.click(); return "clicked"; })()`)}`)
  ).result;
}

async function hybridJs(page, find) {
  const pos = (await R(`/eval?page=${page}&code=${encodeURIComponent(locatorJs(find))}`)).result;
  if (!pos || pos === "nf") return say(`!! hybridJs: locator found nothing on ${page}`);
  await sleep(400);
  await R(`/cmove?page=${page}&x=${pos.split(",")[0]}&y=${pos.split(",")[1]}`);
  await sleep(250);
  return (
    await R(`/eval?page=${page}&code=${encodeURIComponent(`(function(){ const el=(${find})(); if(!el) return "nf"; window.__demoClick && window.__demoClick(); el.click(); return "clicked"; })()`)}`)
  ).result;
}

async function findClick(a) {
  // camera-real click on a JS-located element: locator returns "x,y", drawn cursor travels there
  const pos = (await R(`/eval?page=${a.page}&code=${encodeURIComponent(locatorJs(a.find))}`)).result;
  if (!pos || pos === "nf") return say(`!! findClick: locator found nothing on ${a.page}`);
  await R(`/cclick?page=${a.page}&x=${pos}`);
  return "clicked";
}

// ---------- action runner ----------
async function runAction(a) {
  switch (a.t) {
    case "hold": return hold(a.ms);
    case "eval": return R(`/eval?page=${a.page}&code=${encodeURIComponent(a.code)}`);
    case "cmove": return R(`/cmove?page=${a.page}&x=${a.x}&y=${a.y}`);
    case "cclick": return R(`/cclick?page=${a.page}&x=${a.x}&y=${a.y}`);
    case "wheel": return R(`/wheel?page=${a.page}&dy=${a.dy}`);
    case "click": return R(`/click?page=${a.page}&text=${encodeURIComponent(a.text)}`);
    case "goto": return R(`/goto?page=${a.page}&url=${encodeURIComponent(a.url)}`);
    case "waitText": return waitText(a);
    case "hybridClick": return hybridClick(a.page, a.label);
    case "hybridJs": return hybridJs(a.page, a.find);
    case "findClick": return findClick(a);
    case "retry": {
      const times = a.times ?? 3;
      for (let i = 0; i < times; i++) {
        if (await matchesUntil(a.until)) return say(`retry satisfied after ${i} attempt(s)`);
        say(`retry attempt ${i + 1}/${times}`);
        for (const sub of a.actions) await runAction(sub);
      }
      return matchesUntil(a.until);
    }
    default: throw new Error(`unknown action type: ${a.t}`);
  }
}

function describeAction(a) {
  switch (a.t) {
    case "hold": return `hold ${a.ms}ms`;
    case "eval": return `eval ${a.page}`;
    case "cmove": return `cmove ${a.page} ${a.x},${a.y}`;
    case "cclick": return `cclick ${a.page} ${a.x},${a.y}`;
    case "wheel": return `wheel ${a.page} ${a.dy}`;
    case "click": return `click ${a.page} "${a.text}"`;
    case "goto": return `goto ${a.page} ${a.url}`;
    case "waitText": return `waitText ${a.page} /${a.re}/${a.notRe ? ` !/${a.notRe}/` : ""}${a.fatal ? " fatal" : ""}`;
    case "hybridClick": return `hybridClick ${a.page} "${a.label}"`;
    case "hybridJs": return `hybridJs ${a.page}`;
    case "findClick": return `findClick ${a.page}`;
    case "retry": return `retry x${a.times ?? 3} until /${a.until.re}/ [${a.actions.map(describeAction).join(", ")}]`;
    default: return `?${a.t}`;
  }
}

// ---------- recorder ----------
async function restartRecorder() {
  try {
    const pids = execSync("ps aux | grep '[s]creencapture -v' | awk '{print $2}'").toString().trim().split("\n").filter(Boolean);
    for (const pid of pids) {
      try { process.kill(parseInt(pid, 10), "SIGINT"); } catch {}
    }
    if (pids.length) say(`${pids.length} old recorder(s) stopped (flushed)`);
    await sleep(2500);
  } catch {}
  // screencapture -v only writes the file at STOP (verified empirically):
  // clear any stale output, spawn, then verify the PROCESS is alive.
  try { rmSync(REC_FILE); } catch {}
  // REGION RECORDING: capture only the browser window's rect. The desktop
  // around it (other apps, dock, notifications, wrong space) can never enter
  // the frame, so the take is immune to desktop state.
  const proc = CONFIG.browserProcess || "Google Chrome for Testing";
  const rect = execSync(`osascript -e 'tell application "System Events" to tell application process "${proc}" to get {position, size} of window 1'`).toString().trim();
  const [x, y, w, h] = rect.split(", ").map((n) => parseInt(n, 10));
  say(`recording window region ${x},${y} ${w}x${h}`);
  spawn("screencapture", ["-v", `-R${x},${y},${w},${h}`, REC_FILE], { detached: true, stdio: "ignore" }).unref();
  await sleep(2500);
  const alive = execSync(`ps aux | grep "[screencapture -v -R" | wc -l`).toString().trim() !== "0";
  if (!alive) throw new Error("recorder process died - aborting take");
  say(`recorder verified alive -> ${REC_FILE}`);
}

async function stopRecorderAndMux() {
  // screencapture -v flushes ONLY on SIGINT (writes the file at stop)
  try {
    const pids = execSync("ps aux | grep '[s]creencapture -v' | awk '{print $2}'").toString().trim().split("\n").filter(Boolean);
    for (const pid of pids) process.kill(parseInt(pid, 10), "SIGINT");
    say(`stopping recorder (${pids.length} pid) to flush ${REC_FILE}`);
  } catch {}
  const t0 = Date.now();
  while (!existsSync(REC_FILE) && Date.now() - t0 < 30000) await sleep(1000);
  if (!existsSync(REC_FILE)) throw new Error("recorder never flushed " + REC_FILE);
  const dur = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${REC_FILE}`).toString());
  if (dur < 60) throw new Error(`suspicious footage duration ${dur}s - not muxing`);
  say(`footage flushed: ${dur.toFixed(1)}s -> auto-muxing (head trim is not optional)`);
  // The take ALWAYS ends through demo-mux: first VO lands ~1s after video start.
  execSync(
    `node ${new URL("./demo-mux.mjs", import.meta.url).pathname}` +
      ` --footage ${REC_FILE} --out ${OUT} --timeline ${TIMELINE} --vo-dir ${BEATS} --lead ${LEAD}`,
    { stdio: "inherit" }
  );
  say(`FINAL -> ${OUT} (head-trimmed, VO at markers)`);
}

// ---------- run ----------
(async () => {
  if (MODE === "plan") {
    say(`config OK: ${CONFIG.scenes.length} scenes -> ${OUT}, footage ${REC_FILE}, vo ${BEATS}, lead ${LEAD}s`);
    if (CONFIG.dryScenes) say(`dry scenes: beats ${CONFIG.dryScenes.join(", ")}`);
    for (const s of CONFIG.scenes) {
      console.log(`  scene ${s.beat} ${s.name}${s.note ? ` (${s.note})` : ""}:`);
      for (const a of s.actions) console.log(`    - ${describeAction(a)}`);
    }
    return;
  }
  if (MODE === "mux") return stopRecorderAndMux();

  say(DRY ? `DRY pass (beats ${CONFIG.dryScenes?.join(", ") ?? "none"})` : "REAL take");
  measureBeats();
  if (!DRY) {
    writeFileSync(TIMELINE, JSON.stringify({ recorderStart: Date.now() }) + "\n");
    await restartRecorder();
  }
  for (const s of CONFIG.scenes) {
    if (DRY && !(CONFIG.dryScenes || []).includes(s.beat)) continue;
    await beat(s.beat);
    for (const a of s.actions) await runAction(a);
    say(`scene ${s.beat} (${s.name}) done`);
  }
  if (DRY) return say("DRY complete");
  await stopRecorderAndMux();
})();
