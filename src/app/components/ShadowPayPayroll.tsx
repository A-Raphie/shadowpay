"use client";

import { useState } from "react";
import { num } from "starknet";
import type { WALLET_API } from "@starknet-io/types-js";
import styles from "../uni.module.css";
import * as constants from "@/utils/constants";
import { useStoreWallet } from "./Wallet/walletContext";

type TeamRow = { address: string; amount: string; label: string };

function parseAmountToWei(s: string): bigint | null {
  const t = s.trim();
  if (!t) return null;
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [whole, fracRaw = ""] = t.split(".");
  const frac = (fracRaw + "000000000000000000").slice(0, 18);
  try {
    return BigInt(whole) * 10n ** 18n + BigInt(frac);
  } catch {
    return null;
  }
}

export function OrgPayrollPanel() {
  const myWalletAccount = useStoreWallet((s) => s.myWalletAccount);
  const address = useStoreWallet((s) => s.address);
  const isConnected = useStoreWallet((s) => s.isConnected);

  const [rows, setRows] = useState<TeamRow[]>([
    { address: "", amount: "1", label: "Alice" },
  ]);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const addRow = () => setRows((r) => [...r, { address: "", amount: "1", label: "" }]);
  const updateRow = (i: number, patch: Partial<TeamRow>) =>
    setRows((r) => r.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const runBatch = async () => {
    if (!myWalletAccount) {
      setLog((l) => [...l, "Connect a wallet first."]);
      return;
    }
    setRunning(true);
    setLog([]);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const wei = parseAmountToWei(row.amount);
      let to: string;
      try {
        to = num.toHex(row.address.trim());
      } catch {
        setLog((l) => [...l, `#${i + 1} ${row.label || "·"}: bad address, skipped.`]);
        continue;
      }
      if (wei === null || wei === 0n) {
        setLog((l) => [...l, `#${i + 1} ${row.label || "·"}: bad amount, skipped.`]);
        continue;
      }
      const actions: WALLET_API.STRK20_ACTION[] = [
        { type: "transfer", token: constants.addrSTRK, amount: num.toHex(wei), recipient: to },
      ];
      try {
        setLog((l) => [...l, `#${i + 1} ${row.label || to.slice(0, 10)}… → ${row.amount} STRK · proving…`]);
        const r: any = await myWalletAccount.strk20InvokeTransaction(actions);
        const txH: string = r.transaction_hash ?? r?.transactionHash ?? String(r);
        setLog((l) => [...l, `#${i + 1} tx ${txH.slice(0, 10)}… submitted · waiting…`]);
        const provider: any = (myWalletAccount as any).provider ?? constants.myFrontendProviders[0];
        try {
          await provider.waitForTransaction?.(txH, { retries: 400, retryInterval: 3000 });
          setLog((l) => [...l, `#${i + 1} confirmed · ${txH}`]);
        } catch {
          setLog((l) => [...l, `#${i + 1} sent · ${txH} (confirm in Voyager)`]);
        }
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        const screened = /screen|compliance|denied|blocked/i.test(msg);
        setLog((l) => [...l, `#${i + 1} failed: ${screened ? "screened · try smaller amount" : msg}`]);
      }
    }
    setRunning(false);
  };

  return (
    <div className={styles.payrollCard}>
      <div className={styles.payrollHead}>
        <div>
          <div className={styles.payrollTitle}>Org · batch pay (private)</div>
          <div className={styles.payrollHint}>
            Sequential private note→note transfers. Each tx is relayed; amount + parties stay private.
          </div>
        </div>
        <button className={styles.btnGhost} style={{ padding: "8px 12px", fontSize: 12 }} onClick={addRow}>
          + Add
        </button>
      </div>

      <div className={styles.payrollRows}>
        {rows.map((row, i) => (
          <div key={i} className={styles.payrollRow}>
            <input
              className={styles.payrollInput}
              placeholder="0x… Starknet address"
              value={row.address}
              onChange={(e) => updateRow(i, { address: e.target.value })}
              spellCheck={false}
            />
            <input
              className={`${styles.payrollInput} ${styles.payrollAmount}`}
              placeholder="1"
              value={row.amount}
              onChange={(e) => updateRow(i, { amount: e.target.value })}
              inputMode="decimal"
            />
            <span className={styles.payrollUnit}>STRK</span>
            <input
              className={`${styles.payrollInput} ${styles.payrollLabel}`}
              placeholder="label"
              value={row.label}
              onChange={(e) => updateRow(i, { label: e.target.value })}
            />
            <button className={styles.payrollRemove} onClick={() => removeRow(i)} aria-label="Remove">
              ×
            </button>
          </div>
        ))}
      </div>

      {!isConnected ? (
        <div className={styles.warn} style={{ marginTop: 10 }}>
          Connect a wallet to pay. Self-address prefill works for a dry run.
          {address ? "" : " Paste a teammate address above."}
        </div>
      ) : null}

      <button className={styles.btnCta} disabled={running || !isConnected} onClick={runBatch} style={{ marginTop: 12 }}>
        {running ? "Paying…" : `Pay ${rows.length} privately`}
      </button>

      {log.length ? <pre className={styles.receiptNote} style={{ marginTop: 10 }}>{log.join("\n")}</pre> : null}

      <div className={styles.payrollFoot}>
        Honest: deposits/withdrawals are public + screened; <b>note→note</b> hides who + how much. Stay shielded longer for stronger privacy.
      </div>
    </div>
  );
}

export function EmployeeClaimPanel() {
  const myWalletAccount = useStoreWallet((s) => s.myWalletAccount);
  const address = useStoreWallet((s) => s.address);
  const isConnected = useStoreWallet((s) => s.isConnected);
  const [amount, setAmount] = useState("1");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const doDiscover = async () => {
    if (!myWalletAccount) { setNote("Connect a wallet first."); return; }
    setNote("Discovering…");
    try {
      const r: any = await (myWalletAccount as any).strk20Balances?.([]);
      const arr = r?.value ?? r;
      if (Array.isArray(arr) && arr.length) {
        setNote(arr.map((b: any) => `${b.token ?? b[0] ?? "token"}: ${String(b.amount ?? b[1] ?? b.balance ?? "")}`).join("\n"));
      } else if (Array.isArray(arr) && !arr.length) {
        setNote("No shielded notes yet · you have not been paid privately on this account.");
      } else {
        setNote(typeof arr === "string" ? arr : JSON.stringify(arr, null, 2));
      }
    } catch (e: any) {
      setNote(e?.message ?? String(e));
    }
  };

  const doUnshield = async () => {
    if (!myWalletAccount) { setNote("Connect a wallet first."); return; }
    const wei = parseAmountToWei(amount);
    if (wei === null || wei === 0n) { setNote("Bad amount."); return; }
    const recipient = to.trim() || address;
    if (!recipient) { setNote("No recipient address."); return; }
    let recHex: string;
    try { recHex = num.toHex(recipient); } catch { setNote("Bad recipient address."); return; }
    setBusy(true);
    setNote("Proving unshield…");
    try {
      const actions: WALLET_API.STRK20_ACTION[] = [
        { type: "withdraw", token: constants.addrSTRK, amount: num.toHex(wei), recipient: recHex },
      ];
      const r: any = await myWalletAccount.strk20InvokeTransaction(actions);
      const txH: string = r.transaction_hash ?? String(r);
      setNote(`Submitted ${txH} · waiting for confirmation…`);
      const provider: any = (myWalletAccount as any).provider ?? constants.myFrontendProviders[0];
      try { await provider.waitForTransaction?.(txH, { retries: 400, retryInterval: 3000 }); setNote(`Unshield confirmed · ${txH}`); } catch { setNote(`Sent · ${txH} · check Voyager`); }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setNote(/screen|compliance/i.test(msg) ? `Screened · ${msg}` : msg);
    } finally { setBusy(false); }
  };

  return (
    <div className={styles.payrollCard}>
      <div className={styles.payrollTitle}>Employee · claim privately</div>
      <div className={styles.payrollHint}>Discover shielded notes, then unshield to any Starknet address.</div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button className={styles.btnGhost} style={{ padding: "10px 14px", fontSize: 13 }} onClick={doDiscover} disabled={!isConnected}>
          Discover my notes
        </button>
        <span className={styles.payrollHint} style={{ alignSelf: "center" }}>
          Uses wallet viewing keys · nothing leaves your device.
        </span>
      </div>

      <div className={styles.payrollRows} style={{ marginTop: 12 }}>
        <div className={styles.payrollRow}>
          <input className={`${styles.payrollInput} ${styles.payrollAmount}`} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          <span className={styles.payrollUnit}>STRK →</span>
          <input className={styles.payrollInput} placeholder={address ? `${address.slice(0, 10)}… (self)` : "0x… recipient (default: self)"} value={to} onChange={(e) => setTo(e.target.value)} spellCheck={false} />
        </div>
      </div>

      <button className={styles.btnCta} disabled={busy || !isConnected} onClick={doUnshield} style={{ marginTop: 10 }}>
        {busy ? "Unshielding…" : "Unshield to address"}
      </button>

      {note ? <pre className={styles.receiptNote} style={{ marginTop: 10 }}>{note}</pre> : null}
    </div>
  );
}
