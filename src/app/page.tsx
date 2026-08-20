"use client";

import styles from "./uni.module.css";
import SelectWallet from "./components/client/WalletHandle/SelectWallet";
import WalletAccountV6Tag from "./components/client/WalletHandle/WalletAccountV6Tag";
import { EmployeeClaimPanel, OrgPayrollPanel } from "./components/ShadowPayPayroll";
import { POOL_ADDRESS } from "@/utils/constants";

export default function Page() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="#" className={styles.brand}>
            <span className={styles.brandMark}>◈</span>
            <span>
              <div className={styles.brandName}>ShadowPay</div>
              <div className={styles.brandMono}>STRK20 · SN_MAIN</div>
            </span>
          </a>
          <div className={styles.navLinks}>
            <a href="#deploy">Deployment</a>
            <a href="#primitives">Primitives</a>
            <a href="#app">App</a>
            <SelectWallet variant="nav" />
          </div>
        </div>
      </nav>

      <section className={styles.heroCenter}>
        <a
          href="https://starkscan.co/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a"
          target="_blank"
          rel="noreferrer"
          className={styles.heroPill}
        >
          <span className={styles.heroPillDot} />
          Live on Starknet mainnet · private payroll on STRK20
        </a>

        <h1 className={styles.heroTitleCenter}>
          Pay your team.
          <br />
          No one sees <span className={styles.heroAccent}>who got what.</span>
        </h1>

        <p className={styles.heroSubCenter}>
          Shield STRK into the STRK20 pool, pay with private note to note transfers, then your
          team unshields to any address. Deposits and withdrawals are public and screened. Amounts
          and recipients inside the pool stay private.
        </p>

        <div className={styles.heroCtasCenter}>
          <a href="#app" className={styles.btnPrimary}>
            Open payroll
          </a>
          <a href="#primitives" className={styles.btnGhost}>
            See how it works
          </a>
        </div>

        <div className={styles.trustedRow}>
          <span className={styles.trustedLabel}>Pool verified on Starknet mainnet</span>
          <div className={styles.trustedChips}>
            <span className={styles.trustedChip}>SN_MAIN 0x534e5f4d41494e</span>
            <span className={styles.trustedChip}>STRK 0x0471…38d</span>
            <span className={styles.trustedChip}>Pool 0x0403…12a</span>
          </div>
        </div>

        <div className={styles.showcase}>
          <div className={styles.showcaseMain}>
            <div className={styles.showcaseHead}>
              <div>
                <div className={styles.showcaseKicker}>Vault balance · shielded notes</div>
                <div className={styles.showcaseBalance}>Private until you unshield</div>
                <div className={styles.showcaseHint}>Wallet holds viewing keys. Nothing leaves your device.</div>
              </div>
              <span className={styles.showcaseBadge}>Shielded</span>
            </div>
            <div className={styles.miniGrid}>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>Pool</div>
                <div className={styles.miniValue}>0x0403…12a</div>
                <div className={styles.miniSub}>STRK20 · 10 block finality</div>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>Token</div>
                <div className={styles.miniValue}>STRK</div>
                <div className={styles.miniSub}>0x0471…38d · screened deposits</div>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniLabel}>Privacy</div>
                <div className={styles.miniValue}>note → note</div>
                <div className={styles.miniSub}>Amount plus parties hidden</div>
              </div>
            </div>
            <div className={styles.codeInline}>
              <div className={styles.codeInlineHead}>payroll.cairo · privacy_invoke</div>
              <pre>{`let pool = ${POOL_ADDRESS.slice(0, 18)}…;
shield(pool, STRK, 5000);
transfer(pool, team[0], 1200); // OPEN placeholder
transfer(pool, team[1], 900);
unshield(pool, STRK, myAddr, 1200);`}</pre>
            </div>
          </div>

          <div className={styles.showcaseSide}>
            <div className={styles.sideCard}>
              <div className={styles.miniLabel}>Payroll run</div>
              <div className={styles.sideTitle}>Payroll run confirmed in one invoke per person</div>
              <p className={styles.sideText}>Sequential private transfers. Each tx is relayed, so the on chain sender is the relayer, not you.</p>
              <div className={styles.sideMeta}>
                <span className={styles.dotAccent} /> TIP-403 clear · OPEN resolved by wallet
              </div>
            </div>
            <div className={styles.sideCardGrad}>
              <div className={styles.miniLabel}>Viewing keys</div>
              <div className={styles.anonTitle}>Your keys stay in your wallet</div>
              <pre className={styles.anonCode}>{`hashKeccak -> sign -> Poseidon
strk20.starknet.io/app
PrivateRegistry never persisted
ContractDiscoveryProvider(pool)`}</pre>
            </div>
          </div>
        </div>
      </section>

      <section id="deploy" className={styles.section}>
        <div className={styles.sectionLabel}>Deployment · Starknet mainnet</div>
        <h2 className={styles.sectionTitle}>All authority lives on chain. Verify it here.</h2>
        <p className={styles.sectionSub}>Same pattern as remlo: every contract address is listed so judges can check without trusting this frontend.</p>
        <div className={styles.deployTable}>
          <div className={styles.deployRowHead}>
            <span>Contract</span>
            <span>Address</span>
            <span>Explorer</span>
          </div>
          <div className={styles.deployRow}>
            <span className={styles.deployName}>STRK20 pool</span>
            <span className={styles.deployAddr}>{POOL_ADDRESS}</span>
            <a href={`https://starkscan.co/contract/${POOL_ADDRESS}`} target="_blank" rel="noreferrer" className={styles.deployLink}>StarkScan</a>
          </div>
          <div className={styles.deployRow}>
            <span className={styles.deployName}>STRK token</span>
            <span className={styles.deployAddr}>0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d</span>
            <a href="https://starkscan.co/contract/0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d" target="_blank" rel="noreferrer" className={styles.deployLink}>StarkScan</a>
          </div>
          <div className={styles.deployRow}>
            <span className={styles.deployName}>Echo helper (3 action bundle)</span>
            <span className={styles.deployAddr}>0x78ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b</span>
            <a href="https://starkscan.co/contract/0x78ae662e0cc6d1ab2cfeaf2a51ba8783d88e31886f88a794d142f95a6f8735b" target="_blank" rel="noreferrer" className={styles.deployLink}>StarkScan</a>
          </div>
        </div>
        <div className={styles.deployNote}>Chain SN_MAIN · 10 block proof validity · deposits and withdrawals are public and screened by the compliance signer.</div>
      </section>

      <section id="primitives" className={styles.section}>
        <div className={styles.sectionLabel}>Primitives · three calls, one pool</div>
        <h2 className={styles.sectionTitle}>Shield, pay privately, then unshield</h2>
        <p className={styles.sectionSub}>Remlo has payroll, escrow and reputation. ShadowPay has shield, private transfer and unshield. Same table first thinking.</p>
        <div className={styles.primGrid}>
          <div className={styles.primCard}>
            <div className={styles.primNum}>01 · SHIELD</div>
            <h3>Fund the vault</h3>
            <p>Public <code>deposit</code> into the STRK20 pool. Your STRK becomes shielded notes. Wait 10 blocks before the next private move.</p>
            <pre className={styles.primCode}>{`shield(pool, STRK, 5000)
// public, screened
// viewing keys in wallet`}</pre>
          </div>
          <div className={`${styles.primCard} ${styles.primAccent}`}>
            <div className={styles.primNum}>02 · PAY</div>
            <h3>Pay privately</h3>
            <p>Private <code>note to note</code> to your team. Amount and recipients are hidden by the STARK proof. Relayer is the on chain sender.</p>
            <pre className={styles.primCode}>{`transfer(pool, team[0], 1200)
transfer(pool, team[1], 900)
// OPEN placeholder resolved
// by wallet`}</pre>
          </div>
          <div className={styles.primCard}>
            <div className={styles.primNum}>03 · UNSHIELD</div>
            <h3>They cash out</h3>
            <p>Employee discovers notes with viewing keys, then <code>withdraws</code> to any Starknet address. Public exit, private history.</p>
            <pre className={styles.primCode}>{`unshield(pool, STRK, addr, 900)
// public withdrawal
// private link hidden`}</pre>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>Privacy · honest, not hand waving</div>
        <h2 className={styles.sectionTitle}>What is private and what is not</h2>
        <div className={styles.callout}>
          <div className={`${styles.calloutCard} ${styles.calloutGood}`}>
            <h4>Private</h4>
            <ul>
              <li>Who paid whom in note to note transfers</li>
              <li>Amount of each private transfer</li>
              <li>Link between your shielded notes</li>
            </ul>
          </div>
          <div className={`${styles.calloutCard} ${styles.calloutWarn}`}>
            <h4>Public by design</h4>
            <ul>
              <li>Deposits and withdrawals, screened for compliance</li>
              <li>DeFi via shared anonymizer pool address visible, amounts and timing visible</li>
              <li>Relayer is the on chain sender for private txs</li>
            </ul>
          </div>
        </div>
        <div className={styles.flowBar}>
          <span>shield</span>
          <i>→</i>
          <span className={styles.flowPrivate}>private notes</span>
          <i>→</i>
          <span>unshield</span>
          <span className={styles.flowNote}>10 block wait between private moves · stay shielded longer for stronger privacy</span>
        </div>
      </section>

      <section id="app" className={styles.section}>
        <div className={styles.sectionLabel}>Live payroll · mainnet</div>
        <h2 className={styles.sectionTitle}>Run it on mainnet. Three txs touching the pool is the submission.</h2>
        <p className={styles.sectionSub}>Connect a STRK20 wallet, shield a small amount, do one private transfer, then unshield. Or use the batch panels below for the org and employee flow.</p>
        <div className={styles.panelWrap}>
          <div className={styles.panelHead}>
            <h3>ShadowPay payroll</h3>
            <span>SN_MAIN · Pool {POOL_ADDRESS.slice(0, 8)}…{POOL_ADDRESS.slice(-4)}</span>
          </div>
          <div className={styles.panelBody}>
            <WalletAccountV6Tag />
          </div>
        </div>
        <div className={styles.payrollGrid}>
          <OrgPayrollPanel />
          <EmployeeClaimPanel />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>ShadowPay · STRK20 Private Sprint</span>
        <span className={styles.footerDot}>·</span>
        <a href="https://github.com/starkience/strk20-hackathon" target="_blank" rel="noreferrer">Hackathon</a>
        <span className={styles.footerDot}>·</span>
        <a href={`https://starkscan.co/contract/${POOL_ADDRESS}`} target="_blank" rel="noreferrer">Pool on StarkScan</a>
      </footer>
    </div>
  );
}
