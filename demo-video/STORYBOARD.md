# Demo Script: ShadowPay
**Hackathon:** STRK20 Private Sprint (starkience/strk20-hackathon)
**Time limit:** 3:00
**Judging:** STRK20 integration depth 30%, Working mainnet product 30%, Innovation 25%, Docs/open-source 15%

**Setup:** Bundled Chromium 1282x986 centered on empty Desktop 2, Ready X wallet (mainnet, account 0x06F6…27f1), drawn Mac-style cursor (cursor.js live injection, click rings), screencapture -v of Desktop 2, no burned captions, VO muxed after.

**One-message test:** "Payroll where the chain pays, but never tells."

### Scene 1: Hook (0:00-0:12)
**Criterion:** Innovation
**Show:** Landing hero: "Pay your team. No one sees who got what." + trust chips (SN_MAIN, STRK, Pool 0x0403…12a)
**Say:** On Starknet, a salary is public record. Anyone can watch every paycheck land, and total up what anyone earns. This is ShadowPay: payroll where the chain pays, but never tells.
**Action:** Hold on hero 4s, slow scroll as "Pool verified on Starknet mainnet" chips pass. Cursor drifts.
**Visual:** drawn cursor idle drift.

### Scene 2: Honest privacy (0:12-0:30)
**Criterion:** Innovation
**Show:** "What is private and what is not" callouts + shield → private notes → unshield flow bar
**Say:** Here is the honest split. Going in and coming out, deposits and withdrawals are public, and screened for compliance. In between, note to note transfers hide the amount and both sides. Not a mixer. Notes, with real proofs.
**Action:** Cursor hovers the Private card, then the Public by design card. Pause 1s each.

### Scene 3: Deployment proof (0:30-0:48)
**Criterion:** Working mainnet
**Show:** Deployment table: pool 0x0403…12a, STRK token, echo helper, each with StarkScan link
**Say:** All of it runs against the canonical pool on mainnet, right now. Every address on screen is clickable, straight to StarkScan.
**Action:** Scroll to deployment section, hover the pool row, cursor clicks the StarkScan link, explorer loads in same tab, hold 3s, back to app.
**Visual:** Same-tab navigation (no new tab).

### Scene 4: Connect and shield (0:48-1:30)
**Criterion:** Integration depth + Working mainnet
**Show:** App panel: Connect → Ready X approval in wallet window → amount 7 typed → Shield → wallet Review screen (-7.0 STRK / +1.0 [STRK] shielded / 6.0 reserved for pool fee / $0.17) → Confirm → app receipt with tx hash
**Say:** I connect Ready X and shield seven stark. The wallet shows exactly what happens: one comes back as a shielded note, six covers the pool fee, and the deposit is screened. Signed. On chain. And the receipt lands in the app with a hash I can audit.
**Action:** drawn cursor: click Connect → approve in wallet window → click amount field, type 7 → click Shield → wallet review appears → click Confirm → wait → receipt card visible with hash + explorer link.
**Visual:** All clicks via drawn cursor with rings; speak the numbers on screen (seven, one, six).

### Scene 5: Private transfer (1:30-2:10)
**Criterion:** Integration depth
**Show:** 10-block countdown in app → SEND tab, amount 1, Self transfer → wallet review (Private send: -1.0 [STRK] to +1.0 [STRK]) → Confirm → receipt
**Say:** Notes mature for ten blocks, and the app counts them down for me. Now the part nobody can see: I send one shielded token, note to note. No amount on chain. No sender. No receiver. Just a nullifier and a proof.
**Action:** Wait on countdown (compress in edit if needed), click SEND, type 1, click Self transfer, Confirm in wallet, receipt appears.

### Scene 6: Unshield and employee side (2:10-2:35)
**Criterion:** Working mainnet
**Show:** UNSHIELD tab, 0.5, → wallet review (0.5 [STRK] out, 0.5 STRK public in) → Confirm → receipt → quick scroll past Org batch pay + Employee claim panels
**Say:** And out again. Half a shielded token becomes public again, spendable at any address. For a team, the org panel pays many people in one private batch, and employees claim with their own viewing keys.
**Action:** Click UNSHIELD, type 0.5, Confirm, receipt, scroll to payroll panels, hold 2s.

### Scene 7: Close (2:35-2:50)
**Criterion:** Docs + all
**Show:** Footer + repo README on screen: github.com/A-Raphie/shadowpay, live URL, pool address
**Say:** Four verified mainnet transactions are listed by hash in the repo. The app, the source, and the pool are on screen right now. ShadowPay: the chain pays, never tells.
**Action:** Navigate to repo README, hold links on screen 5s. No clicks.

---

**Time budget:**
| Criterion | Allocated | Scenes |
|-----------|-----------|--------|
| Integration depth (30%) | 50s | 4, 5 |
| Working mainnet (30%) | 48s | 3, 4, 6 |
| Innovation (25%) | 40s | 1, 2 |
| Docs/open-source (15%) | 15s | 7 |
| **Total** | **2:50** | |

**Submission checklist:**
- [x] Live URL shown: https://shadowpay-green.vercel.app
- [x] GitHub shown: https://github.com/A-Raphie/shadowpay
- [x] Contract address shown: pool 0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a
- [x] Chain/explorer shown: SN_MAIN, starkscan.co
- [x] Demo video: this recording (published unlisted, URL into strk20.json demo_video)
