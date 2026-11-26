"use client";
import { useEffect, useState } from "react";

const KEY = "splashz.disclaimer.v1";

/** First-visit gate, versioned so a change in wording asks everyone again. */
export function DisclaimerGate() {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "accepted") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, "accepted");
    } catch {
      /* private mode: gate shows again next visit */
    }
    setOpen(false);
  };

  return (
    <div className="scrim" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="disc-title">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#15171C" strokeWidth="2" aria-hidden="true">
            <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <h2 id="disc-title" style={{ fontSize: 24 }}>Before you continue</h2>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Please confirm the following to use Splashz.</p>
        <div className="terms" tabIndex={0}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>By continuing, I confirm that:</div>
          <ol>
            <li>I am not a US person, and I am not located in a country or territory under sanctions.</li>
            <li>I have read and agree to the Terms of Use and Privacy Policy.</li>
            <li>Funds, bonds and vaults can lose value. Target and past yields are not promises, and some products are for sophisticated investors only.</li>
            <li>Splashz never holds my money. Products are run by licensed fund managers or on-chain protocols, and tokenized stocks are issued by third-party tokenizers.</li>
            <li>This is a testnet demo on BNB Smart Chain Testnet. Nothing shown is an offer, and testnet tokens have no value.</li>
          </ol>
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 20, height: 20, accentColor: "#15171C" }} />
          I confirm all of the above and agree to continue.
        </label>
        <button className="btn primary block" disabled={!agreed} onClick={accept}>Agree and continue</button>
      </div>
    </div>
  );
}
