// Decode pool tx receipts: entrypoint, events, pool touch, fee. Usage: node scripts/inspect-tx.mjs <hash>...
import { RpcProvider, hash } from "starknet";

const p = new RpcProvider({ nodeUrl: "https://rpc.starknet.lava.build" });
const POOL = "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";

const known = {};
for (const n of [
  "apply_actions",
  "set_viewing_key",
  "deposit",
  "transfer",
  "withdraw",
  "ViewingKeySet",
  "Deposit",
  "FeeCollected",
  "ApplyActions",
]) {
  try {
    known[hash.getSelectorFromName(n)] = n;
  } catch {}
  try {
    known[hash.getSelectorFromName(n.toLowerCase())] = n.toLowerCase();
  } catch {}
}

const label = (sel) => known[sel] ?? sel.slice(0, 14);

for (const t of process.argv.slice(2)) {
  try {
    const r = await p.getTransactionReceipt(t);
    let entry = "?";
    try {
      const tx = await p.getTransaction(t);
      entry = tx.entrypoint ?? (tx.calldata ? "multi/" + (tx.calldata.length ?? "?") : "?");
      if (tx.entrypoint) entry = tx.entrypoint;
    } catch {}
    const evs = r.events ?? [];
    const norm = (s) => {
      let h = s.toString(16);
      if (h.startsWith("0x")) h = h.slice(2);
      return "0x" + h.padStart(64, "0");
    };
    const names = [...new Set(evs.map((e) => label(norm(e.keys[0]))))];
    const poolEvent = evs.some(
      (e) => e.from_address && e.from_address.toLowerCase() === POOL.toLowerCase()
    );
    const sources = [...new Set(evs.map((e) => (e.from_address ?? "").slice(0, 10)))];
    // which contracts were invoked (from calldata addresses is unreliable; use events)
    const feeAmt = r.actual_fee ? (Number(r.actual_fee.amount) / 1e18).toFixed(4) : "?";
    // STRK transfers of exactly 6.0 (fee collection pattern per issue 156)
    const sixStrk = evs.filter((e) => e.from_address === "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d").length;
    console.log(
      `${t.slice(0, 12)} | ${r.execution_status ?? r.status} | entry: ${entry} | events: ${names.join(",")} | pool: ${poolEvent} | from: ${sources.join(",")} | gas: ${feeAmt} STRK`
    );
  } catch (e) {
    console.log(`${t.slice(0, 12)} | ERR ${e.message.slice(0, 90)}`);
  }
}
