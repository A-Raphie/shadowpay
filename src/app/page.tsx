"use client";

import styles from "./uni.module.css";
import SelectWallet from "./components/client/WalletHandle/SelectWallet";
import WalletAccountV6Tag from "./components/client/WalletHandle/WalletAccountV6Tag";

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
            <a href="#how">How it works</a>
            <a href="#privacy">Privacy</a>
            <a href="#app">App</a>
            <SelectWallet variant="nav" />
          </div>
        </div>
      </nav>

      <header className={styles.hero}>
        <div>
          <div className={styles.kicker}>
            <span className={styles.kickerDot} /> Private payroll · Starknet
          </div>
          <h1 className={styles.heroTitle}>
            Every Starknet
            <br />
            payroll is public.
            <br />
            <span className={styles.heroAccent}>ShadowPay fixes it.</span>
          </h1>
          <p className={styles.heroSub}>
            Shield STRK into the STRK20 pool, pay your team with private
            note→note transfers, and let them unshield on demand. Deposits and
            withdrawals are public — who paid whom and how much stays private.
          </p>
          <div className={styles.heroCtas}>
            <a href="#app" className={styles.btnPrimary}>
              Open payroll →
            </a>
            <a
              href="https://starkscan.co/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a"
              target="_blank"
              rel="noreferrer"
              className={styles.btnGhost}
            >
              View pool
            </a>
          </div>
          <div className={styles.metaRow}>
            <span>
              Pool <b>0x0403…12a</b>
            </span>
            <span>
              Token <b>STRK 0x0471…38d</b>
            </span>
            <span>
              Chain <b>SN_MAIN</b>
            </span>
          </div>
        </div>

        <div className={styles.codeCard} aria-hidden>
          <div className={styles.codeHead}>
            <span>payroll.cairo — privacy_invoke</span>
            <span className={styles.codeDots}>
              <i style={{ background: "#ff5a6a" }} />
              <i style={{ background: "#ffb86b" }} />
              <i style={{ background: "#7cf0a8" }} />
            </span>
          </div>
          <pre className={styles.codeBody}>
            <code>
              {`// Org shields, then pays — all private
let pool = 0x040337b1af3c66...ffe812a;
shield(pool, STRK, 5000); // public deposit

// private note → note — amount + parties hidden
transfer(pool, team[0], 1200); // OPEN placeholder
transfer(pool, team[1],  900); // resolved by wallet
transfer(pool, team[2], 1500);

// Employee unshields to any address
unshield(pool, STRK, myAddr, 1200);

// DeFi? one invoke via anonymizer — same pool
privacy_invoke(Ekubo, pool, noteId);`}
            </code>
          </pre>
        </div>
      </header>

      <section id="how" className={styles.section}>
        <div className={styles.sectionLabel}>01 — How it works</div>
        <h2 className={styles.sectionTitle}>Shield → Pay privately → Unshield</h2>
        <p className={styles.sectionSub}>
          Wallet holds your viewing keys and proves. STRK20 handles the rest —
          no hosted prover. Amounts and recipients are hidden in private
          transfers; deposits and withdrawals stay public and screened.
        </p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>01 — SHIELD</div>
            <h3>Fund the vault</h3>
            <p>
              Public <code>deposit</code> into the STRK20 pool. Your STRK becomes
              shielded notes. 10-block finality before next private move.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>02 — PAY</div>
            <h3>Pay privately</h3>
            <p>
              Private <code>note→note</code> transfers to your team. Each tx is
              relayed — on-chain sender is the relayer, not you.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>03 — UNSHIELD</div>
            <h3>They cash out</h3>
            <p>
              Employee connects, discovers notes, and <code>unshields</code> to any
              Starknet address with a public withdrawal.
            </p>
          </div>
        </div>
      </section>

      <section id="privacy" className={styles.section}>
        <div className={styles.sectionLabel}>02 — What is private</div>
        <h2 className={styles.sectionTitle}>Honest privacy, no hand-waving</h2>
        <div className={styles.callout}>
          <div className={`${styles.calloutCard} ${styles.calloutGood}`}>
            <h4>Private</h4>
            <ul>
              <li>Who paid whom in note→note transfers</li>
              <li>Amount of each private transfer</li>
              <li>Link between your shielded notes</li>
            </ul>
          </div>
          <div className={`${styles.calloutCard} ${styles.calloutWarn}`}>
            <h4>Public — by design</h4>
            <ul>
              <li>Deposits (shield) and withdrawals (unshield) — screened</li>
              <li>DeFi via shared anonymizer: pool address visible, amounts/timing visible</li>
              <li>Relayer is the on-chain sender for private txs</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="app" className={styles.section}>
        <div className={styles.sectionLabel}>03 — App</div>
        <h2 className={styles.sectionTitle}>Run it on mainnet</h2>
        <p className={styles.sectionSub}>
          Connect a STRK20 wallet (Ready recommended), shield a small amount, do
          a private transfer, then unshield. Three verified mainnet txs touching
          the pool is your hackathon submission.
        </p>
        <div className={styles.panelWrap}>
          <div className={styles.panelHead}>
            <h3>ShadowPay payroll</h3>
            <span>SN_MAIN · Pool 0x0403…12a</span>
          </div>
          <div className={styles.panelBody}>
            <WalletAccountV6Tag />
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>ShadowPay — STRK20 Private Sprint</span>
        <span className={styles.footerDot}>·</span>
        <a
          href="https://github.com/starkience/strk20-hackathon"
          target="_blank"
          rel="noreferrer"
        >
          Hackathon
        </a>
        <span className={styles.footerDot}>·</span>
        <a
          href="https://starkscan.co/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a"
          target="_blank"
          rel="noreferrer"
        >
          Pool on Voyager
        </a>
      </footer>
    </div>
  );
}
