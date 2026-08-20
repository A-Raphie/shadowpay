# ShadowPay — Architecture

## Stack
- Next.js 16, React 19, TypeScript, starknet.js 10, zustand
- get-starknet v6 (WalletAccountV6), Wallet API route (wallet holds keys + proves)
- No proving service, no indexer hosting (ContractDiscoveryProvider over RPC)
- Cairo helper optional: cairo/src/lib.cairo (Scarb, starknet 2.18.0)

## Scaffold source
Fork of Akashneelesh/strk20-starter-kit. WalletAccountV6Tag + SelectWallet + provider contexts retained.

## Chain config (mainnet)
- CHAIN_ID SN_MAIN (0x534e5f4d41494e)
- RPC https://rpc.starknet.lava.build (frontend), Alchemy via NEXT_PUBLIC_PROVIDER_URL
- POOL_ADDRESS 0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a
- STRK 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
- Echo helper 0x78ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b (optional)
- Strk20Networks {0:"MAINNET",2:"SEPOLIA"}, providers indexed [0 mainnet, 2 sepolia]

## Submission wires
- strk20.json at repo root: { transactions:[hash×3], contracts:[addr], demo_video, demo_url }
- Demo discovery: strk20.json demo_url → GitHub Pages → repo Website field → latest deployment
- Registry: one PR to registry.json (repo_url + telegram bare usernames)
- Placeholders "OPEN"/"${poolAddress}"/"${openNoteIds[0]}" are literal — wallet substitutes, never hex-normalize
- Prover lag: latestBlock - lastTxBlock ≥10 between private txs; deposits are public + screened

## UI
Dark vault theme. winsznx-landing for landing, winsznx-ui for app shell. Not Settle/Pricewise reuse. 64px sections, 1120px container, mono labels.

## Deploy
Vercel. Env NEXT_PUBLIC_PROVIDER_URL (+ optional NEXT_PUBLIC_STRK20_ECHO_HELPER_SEPOLIA). Website field set.
