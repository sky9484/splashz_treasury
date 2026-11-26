/** Splashz mark: a single wave crest on a cobalt tile, gold drop for BNB Chain. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" fill="var(--primary, #1F3FD6)" />
      <path d="M5 17.5c2.6-4.2 5.4-4.2 8 0s5.4 4.2 8 0" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="square" />
      <rect x="19.5" y="6" width="3.5" height="3.5" fill="var(--gold, #F0B90B)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <Logo />
      <span style={{ display: "flex", alignItems: "baseline", gap: 7, whiteSpace: "nowrap" }}>
        <b style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>splashz</b>
        <span className="xs muted">by Move Labs</span>
      </span>
    </span>
  );
}
