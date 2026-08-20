# ShadowPay — Private payroll on Starknet

Every Starknet payroll is public. ShadowPay fixes it — shield STRK into the STRK20 privacy pool, pay your team with unlinkable note→note transfers, and let them unshield on demand.

Built for the [STRK20 Private Sprint](https://github.com/starkience/strk20-hackathon) (starkience/strk20-hackathon, deadline Aug 31 23:59 UTC). Registration PR: [#140](https://github.com/starkience/strk20-hackathon/pull/140).

> **Live demo:** Vercel deploy after `vercel --prod` — repo **Website** field is the hub's discovery path (`strk20.json demo_url` → Pages → Website → deployment). Until then: `npm run dev` locally.

## What is private, what is not

Honest accounting — overclaiming costs you on judging depth.

| Private (inside the pool) | Public — by design |
|---|---|
| Who paid whom in `note→note` transfers | `deposit` (shield) and `withdraw` (unshield) — screened by the compliance signer, amount + token visible |
| Amount of each private transfer | DeFi via shared anonymizers (Ekubo, Vesu, Echo): pool address visible, amounts/timing visible |
| Link between your shielded notes | On-chain sender for private txs is the **relayer**, not you — eligibility is the `Deposit` event's `user_addr` |

Deposits/withdrawals stay public and screened. Privacy lives in the `note→note` step and is strictly stronger the longer you stay shielded.

## How it works

```
Org:  Connect → Shield 5000 STRK (public deposit) ─┐
                  │ 10-block finality               │
      Private note→note to team[0] 1200  ───────────┼─→ pool 0x0403…12a (SN_MAIN)
      Private note→note to team[1]  900             │   proofs verified on-chain
      Private note→note to team[2] 1500  ───────────┘

Employee: Connect → discoverNotes → "you were paid privately" → unshield to any Starknet address
```

Wallet holds viewing keys and proves — no hosted prover. Placeholders `"OPEN"`, `"${poolAddress}"`, `"${openNoteIds[0]}"` are substituted by the wallet, never hex-normalized.

## Stack

Next.js 16 · React 19 · TypeScript · starknet.js 10 · `WalletAccountV6` + `strk20InvokeTransaction` · zustand · `get-starknet` v6 discovery. Default `ContractDiscoveryProvider(poolContract)`, no indexer.

## Run locally

```bash
npm install
cp .env.example .env.local   # add your Alchemy Starknet RPC key
npm run dev                  # http://localhost:3000
```

`.env.local` (see `.env.example`):

```
NEXT_PUBLIC_PROVIDER_URL=your-alchemy-key        # Starknet RPC (falls back to Lava public RPC if omitted)
NEXT_PUBLIC_STRK20_ECHO_HELPER_SEPOLIA=0x0        # echo helper on Sepolia, or leave 0x0 to disable Echo
```

Primary wallet: **Ready**. The app degrades gracefully for others (Xverse Wallet API landing).

### The 3-tx submission flow (mainnet)

1. **Shield** — public `deposit` 2–3 STRK → capture `tx1` (wait 10 blocks)
2. **Private transfer** — `note→note` 1 STRK to self or teammate → `tx2` (relayed, wait 10 blocks)
3. **Unshield / Echo `privacy_invoke`** — withdraw 1 STRK or invoke echo helper `0x78ae…35b` → `tx3`

Each hash goes in `strk20.json` at the repo root. Hub verifies: exists + succeeded + touched the pool + carries your contract event if you list `contracts`.

## Deploy

```bash
vercel --prod   # set NEXT_PUBLIC_PROVIDER_URL in Vercel env, then set repo Website field
```

The hub discovers the demo in order: `strk20.json:demo_url` → GitHub Pages → repo **Website** → latest Vercel deployment.

## Addresses

- **Pool (SN_MAIN):** `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`
- **STRK (SN_MAIN):** `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`
- **Echo helper (SN_MAIN):** `0x78ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b` (class `0x2a4482a13cb7f70dce6f7ba99c4ee6ce404379abeddd9b831b6bf24eb71e137`)

## Project structure

```
src/app/page.tsx                          # vault landing + app panel (WalletAccountV6Tag)
src/app/components/client/WalletHandle/   # SelectWallet + shield/transfer/unshield/echo
src/utils/constants.ts                    # pool, token, providers, echo helper
cairo/src/lib.cairo                       # echo anonymizer (deploy your own for Sepolia)
```

## Links

STRK20 by example · [Privacy SDK](https://github.com/starkware-libs/starknet-privacy) · [WalletAccount guide](https://starknet-js.com/docs/next/guides/account/walletAccount/#with-get-starknet-v6) · Pool on [Voyager](https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a)

## License

MIT — see [LICENSE](./LICENSE). Bootstrapped from [PhilippeR26/Starknet-WalletAccount](https://github.com/PhilippeR26/Starknet-WalletAccount) and the [STRK20 starter kit](https://github.com/Akashneelesh/strk20-starter-kit).
