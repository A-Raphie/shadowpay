// ShadowPay CLI-QA harness. Read-only smoke tests over the same RPC + HTTP
// endpoints the UI uses. Usage:
//   node scripts/qa.mjs rpc
//   node scripts/qa.mjs pool
//   node scripts/qa.mjs strk <address>
//   node scripts/qa.mjs links <site-url>
import { RpcProvider, Contract } from "starknet";

const RPC =
  process.env.NEXT_PUBLIC_PROVIDER_URL || "https://rpc.starknet.lava.build";
const provider = new RpcProvider({ nodeUrl: RPC });

const POOL =
  "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";
const STRK =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result;
}

const normAddr = (a) => {
  if (!/^0x[0-9a-fA-F]+$/.test(a)) throw new Error(`bad address: ${a}`);
  return a;
};

const cmds = {
  async rpc() {
    const h = await rpc("starknet_blockNumber", []);
    const hash = await rpc("starknet_blockHashAndNumber", []);
    console.log(`block ${h} hash ${hash.block_hash} via ${RPC}`);
    if (typeof h !== "number") throw new Error("block not a number");
  },

  async pool() {
    const cls = await rpc("starknet_getClassAt", ["latest", POOL]);
    const hash = await rpc("starknet_getClassHashAt", ["latest", POOL]);
    const abi = JSON.stringify(cls.abi ?? []);
    const hasClient = /IClient|shield|unshield|transfer/i.test(abi);
    console.log(`pool class ${hash}`);
    console.log(`abi entries ${cls.abi?.length}, privacy fns: ${hasClient}`);
    if (!hasClient) throw new Error("pool ABI missing privacy entrypoints");
  },

  async strk(addr) {
    const owner = normAddr(addr ?? "0x1");
    // same path the UI uses: starknet.js Contract, v10 options-object shape
    const { abi } = await provider.getClassAt(STRK);
    const erc20 = new Contract({ abi, address: STRK, providerOrAccount: provider });
    const res = await erc20.balanceOf(owner);
    console.log(`STRK balance raw ${res.balance?.toString?.() ?? String(res)} for ${owner}`);
    if (res === undefined) throw new Error("empty balance response");
  },

  async links(site) {
    if (!site) throw new Error("links needs a site url");
    const html = await (await fetch(site)).text();
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const uniq = [...new Set(hrefs)].filter(
      (h) => h.startsWith("http") && !h.includes("maas")
    );
    let bad = 0;
    for (const href of uniq) {
      const code = await fetch(href, { method: "HEAD" })
        .then((r) => r.status)
        .catch(() => "ERR");
      const ok = code === 200 || code === 301 || code === 302 || code === 308;
      if (!ok) bad++;
      console.log(`${ok ? "ok " : "BAD"} ${code} ${href}`);
    }
    console.log(`${uniq.length} links checked, ${bad} bad`);
    if (bad) throw new Error(`${bad} dead links`);
  },
};

const [cmd, ...rest] = process.argv.slice(2);
if (!cmds[cmd]) {
  console.error(`unknown or missing command. one of: ${Object.keys(cmds).join(", ")}`);
  process.exit(2);
}
try {
  await cmds[cmd](...rest);
} catch (e) {
  console.error(`QA FAIL [${cmd}]: ${e.message}`);
  process.exit(1);
}
