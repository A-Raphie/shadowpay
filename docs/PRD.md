# ShadowPay — PRD

## Vision
Private payroll on Starknet via STRK20. Every Starknet payroll today is public — sender, recipient, amount all visible. ShadowPay fixes it: shield treasury → private note→note transfers → employees unshield. Who paid whom is private.

## Hackathon
STRK20 Private Sprint (starkience/strk20-hackathon). Aug 14–31, 2026. $5k in STRK (2.5/1.5/1k). One track. Judging: 30% STRK20 depth, 30% working mainnet product, 25% innovation, 15% docs/OSS.

## Hard requirements to win
- Public repo + LICENSE
- Live demo anyone can open (Vercel, repo Website field set)
- 3 verified mainnet txs against pool 0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a in strk20.json
- 3-min demo video in strk20.json
- Registry PR (fork → add repo_url + telegram to registry.json)

## Users
- Org / Treasury operator — funds payroll, shields, batch-pays
- Employee — discovers private notes, unshields to chosen address

## MVP scope (Phase A)
- Connect wallet (Ready primary, graceful degrade)
- Shielded treasury balance (discoverNotes/reduce)
- Add team (address + amount + label)
- Pay privately: shield if needed → sequential private transfers (or single privacy_invoke batch if Cairo helper ready)
- Employee view: discover private notes → unshield → receipt
- Tx list with Voyager links, strk20.json auto-populated
- Honest privacy copy: deposits/withdrawals public, note→note private

## Non-goals (MVP)
- Sub-accounts / unlinkable identities (not shipped)
- Confidential compute orders (not shipped)
- Recurring subscriptions, DeFi yield routing (stretch: Ghost Vault)
- Persisted PrivateRegistry

## Success
Hub shows 3 green verified txs, live demo, video public, repo builds from README.
