#!/usr/bin/env node
// demo-mux: footage + timeline markers + VO beats -> final demo video.
// The head trim is NOT optional: the recorder starts before scene 1, so the
// footage head carries silence. This always trims (firstMarker - LEAD) seconds
// off the front so the video opens with footage moving and the first VO line
// lands LEAD seconds in. Later lines shift by the same amount, sync preserved.
//
// Usage:
//   node scripts/demo-mux.mjs \
//     --footage /tmp/demo-take.mov \
//     --out demo-video/demo-final.mp4 \
//     [--timeline /tmp/take-timeline.jsonl] \
//     [--vo-dir /tmp/vo-beats] \
//     [--lead 1.0] \
//     [--scale 1282:986]   (default: half the source when width >= 2000, else source)
//
// Timeline format (written by demo-take.mjs): first line {"recorderStart": ms},
// then {"beat": N, "start": ms, ...} with beats 1-indexed mapping to
// zero-indexed vo files beat-00.wav.. (the known off-by-one hazard, handled here).
// If a line's marker would land before the previous line finished, the later
// line waits (prevEnd + GAP), which generalizes the old manual L3 nudge.

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";

const LEAD_DEFAULT = 1.0;
const GAP = 0.15;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function ffprobeJson(file, entries) {
  const r = spawnSync("ffprobe", ["-v", "error", ...entries, "-of", "json", file], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffprobe failed on ${file}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

function wavDuration(file) {
  const j = ffprobeJson(file, ["-show_entries", "format=duration"]);
  return parseFloat(j.format.duration);
}

const footage = arg("footage");
const out = arg("out");
const timelinePath = arg("timeline", "/tmp/take-timeline.jsonl");
const voDir = arg("vo-dir", "/tmp/vo-beats");
const lead = parseFloat(arg("lead", String(LEAD_DEFAULT)));
// TTS wavs ship quiet (peaks around -4dB); the approved cuts play them hot.
const gain = parseFloat(arg("gain", "3.5"));
if (!footage || !out) {
  console.error("need --footage and --out (see header for usage)");
  process.exit(1);
}

// 1. Timeline -> per-beat offsets in seconds from recorder start.
const lines = readTimeline(timelinePath);
function readTimeline(p) {
  statSync(p);
  return readFileSync(p, "utf8").trim().split("\n").map((l) => JSON.parse(l));
}
const recorderStart = lines.find((l) => l.recorderStart)?.recorderStart;
if (!recorderStart) throw new Error(`no recorderStart line in ${timelinePath}`);
const beats = lines.filter((l) => l.beat).sort((a, b) => a.beat - b.beat);

// 2. VO files, sorted; beats are 1-indexed, files are 0-indexed.
const voFiles = readdirSync(voDir).filter((f) => /^beat-.*\.wav$/.test(f)).sort();
if (voFiles.length < beats.length) {
  throw new Error(`timeline has ${beats.length} beats but ${voDir} only has ${voFiles.length} files`);
}

// 3. Head trim: first line lands `lead` seconds after video start.
const firstOffset = (beats[0].start - recorderStart) / 1000;
const headTrim = Math.max(0, firstOffset - lead);

// 4. Line starts: marker shifted by headTrim; never before previous line ends.
const durs = voFiles.map((f) => wavDuration(`${voDir}/${f}`));
const starts = [];
let prevEnd = 0;
beats.forEach((b, i) => {
  const marker = (b.start - recorderStart) / 1000 - headTrim;
  const s = Math.max(marker, i === 0 ? 0 : prevEnd + GAP);
  starts.push(s);
  prevEnd = s + durs[i];
});

// 5. Scale: retina captures (width >= 2000) get halved unless --scale given.
let scale = arg("scale");
if (!scale) {
  const v = ffprobeJson(footage, ["-select_streams", "v:0", "-show_entries", "stream=width,height"]);
  const { width, height } = v.streams[0];
  scale = width >= 2000 ? `${Math.round(width / 2)}:${Math.round(height / 2)}` : `${width}:${height}`;
}

// 6. ffmpeg: trim the footage input only, adelay each line, amix, encode.
const args = ["-y", "-v", "error"];
if (headTrim > 0) args.push("-ss", headTrim.toFixed(3));
args.push("-i", footage);
voFiles.forEach((f) => args.push("-i", `${voDir}/${f}`));

const fc = [];
voFiles.forEach((f, i) => {
  fc.push(`[${i + 1}:a]adelay=delays=${Math.round(starts[i] * 1000)}:all=1[a${i}]`);
});
fc.push(`${voFiles.map((_, i) => `[a${i}]`).join("")}amix=inputs=${voFiles.length}:duration=longest:normalize=0,volume=${gain}dB[aout]`);
fc.push(`[0:v]scale=${scale}[v]`);
args.push(
  "-filter_complex", fc.join(";"),
  "-map", "[v]", "-map", "[aout]",
  "-c:v", "libx264", "-crf", "22", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "128k",
  "-movflags", "+faststart",
  out,
);

console.log(`mux: ${voFiles.length} VO lines, head trim ${headTrim.toFixed(2)}s (first line lands at ${lead}s), gain +${gain}dB`);
starts.forEach((s, i) => console.log(`  beat ${beats[i].beat} -> ${voFiles[i]} @ ${s.toFixed(2)}s (dur ${durs[i].toFixed(2)}s)`));
const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (r.status !== 0) throw new Error("ffmpeg failed");
const final = ffprobeJson(out, ["-show_entries", "format=duration"]);
console.log(`done: ${out} (${parseFloat(final.format.duration).toFixed(1)}s), first VO at ~${lead}s, scale ${scale}`);
