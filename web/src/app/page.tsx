import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { Arrow } from "@/components/Arrow";
import { HeroCard } from "@/components/landing/HeroCard";
import { LiveTicker } from "@/components/landing/LiveTicker";
import { LiveStrip } from "@/components/LiveStrip";

function LaunchApp({ big = false }: { big?: boolean }) {
  return (
    <Link href="/app" className="btn primary" style={big ? { padding: "12px 24px" } : undefined}>
      <span className="ico"><Arrow /></span>Launch app
    </Link>
  );
}

const PRODUCTS = [
  {
    tag: ["Testnet live", "green"],
    title: "Funds and bonds",
    body: "Money market, Shariah income and government bond funds from licensed fund managers in Malaysia and Indonesia.",
    points: ["Subscribe in your own name", "Units held in your wallet", "NAV signed by the manager, checked on-chain"],
  },
  {
    tag: ["Testnet live", "green"],
    title: "Stablecoin vaults",
    body: "Stable yield from the biggest lending markets on BNB Chain and Ethereum, in a vault you can leave any time.",
    points: ["Live Venus, Lista and Aave rates", "ERC-4626 shares in your wallet", "Rate source recorded on-chain"],
  },
  {
    tag: ["Preview", "amber"],
    title: "Tokenized stocks",
    body: "Tokenized US stocks with live 24/7 on-chain prices. Orders go to a licensed tokenizer partner once that partnership is signed.",
    points: ["Live prices, 24/7", "Buy with USDT", "Trading opens with the partner"],
  },
] as const;

const FLOW = [
  ["Connect", "Open the app and connect MetaMask. No sign-up form, no password, no Splashz account."],
  ["Confirm eligibility", "Funds need it once. Real funds run KYC here; on testnet you self-certify."],
  ["Subscribe", "Your stablecoin goes from your wallet to the fund trustee. Units come back at the signed NAV."],
  ["Redeem or hold", "Request a redemption any time. It stays pending until the trustee pays, and you can cancel."],
];

const WHY = [
  ["Your keys, your units", "Splashz contracts route money; they never hold it. Every unit and vault share sits in your wallet."],
  ["Licensed on the other side", "Funds and bonds are run by licensed fund managers. We are the rails, not the manager."],
  ["NAV you can check", "Each NAV is signed by the manager (EIP-712) and rejected if it is old, replayed or jumps too far."],
  ["Real rates, or none", "Vault rates come from DefiLlama. If a source is down we show “unavailable”, never a guess."],
  ["Receipts by default", "Subscriptions, redemptions and vault moves are contract events, linked to BscScan."],
  ["Built for Southeast Asia", "Starting with Malaysian and Indonesian products, for stablecoin holders in the region."],
];

const FAQ = [
  ["Is this live with real money?", "No. This is BNB Smart Chain testnet. Test USDT has no value, and the fund NAVs are posted by our team for demonstration. The vault rates shown are real mainnet data."],
  ["Does Splashz hold my funds?", "No. Subscriptions go straight to the fund trustee, and units are minted to your wallet. The routing contract's own balance is always zero."],
  ["Who manages the funds?", "Licensed fund managers in Malaysia and Indonesia. Splashz provides the technology between you and them."],
  ["Which wallets work?", "MetaMask, on BNB Smart Chain Testnet (chain ID 97). The app asks MetaMask to switch network for you."],
  ["When can I buy tokenized stocks?", "Prices are live now. Orders open once a licensed tokenizer partner is connected, because tokenized stocks are securities."],
];

export default function Landing() {
  return (
    <div>
      <header className="lnav">
        <Link href="/" aria-label="Splashz home"><Wordmark /></Link>
        <nav aria-label="Sections">
          <a href="#products">Products</a>
          <a href="#how">How it works</a>
          <a href="#why">Why Splashz</a>
          <a href="#faq">FAQ</a>
        </nav>
        <LaunchApp />
      </header>

      <section className="hero">
        <div className="wrap">
          <div className="chainpill rise"><i />Built on BNB Chain · testnet live</div>
          <h1 className="rise" style={{ marginTop: 22 }}>
            Idle stablecoins, <em>put to work</em> without leaving your wallet.
          </h1>
          <p className="lede rise">
            Licensed funds and bonds from Malaysia and Indonesia, live stablecoin vaults and tokenized stocks. One app, and every holding stays in your own wallet.
          </p>
          <div className="rise" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <LaunchApp big />
            <a href="#how" className="btn outline" style={{ padding: "12px 24px" }}>
              <span className="ico"><Arrow dir="down" /></span>How it works
            </a>
          </div>
          <HeroCard />
          <div style={{ marginTop: 40 }}><LiveStrip /></div>
          <div className="eyebrow grey" style={{ margin: "40px 0 12px" }}>Live stablecoin supply rates · BNB Chain and Ethereum · DefiLlama</div>
        </div>
        <div style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="wrap" style={{ padding: 0 }}>
            <LiveTicker />
          </div>
        </div>
      </section>

      <section id="products" className="lsec" style={{ borderTop: 0 }}>
        <div className="wrap">
          <div className="eyebrow">Products</div>
          <h2>Three ways to earn. One wallet.</h2>
          <p className="sub">Pick what fits the money you have sitting still, and see exactly where it goes before you sign anything.</p>
          <div className="products">
            {PRODUCTS.map((p) => (
              <article key={p.title}>
                <span className={`tag ${p.tag[1]}`} style={{ alignSelf: "flex-start" }}>{p.tag[0]}</span>
                <h3 style={{ fontSize: 24 }}>{p.title}</h3>
                <p className="muted small" style={{ margin: 0, lineHeight: 1.6 }}>{p.body}</p>
                <ul>{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="lsec" style={{ background: "var(--ground-2)" }}>
        <div className="wrap">
          <div className="eyebrow">How it works</div>
          <h2>From connect to units in your wallet, in four steps.</h2>
          <ol className="flow" style={{ padding: 0 }}>
            {FLOW.map(([t, d], i) => (
              <li key={t}>
                <span className="n">0{i + 1}</span>
                <h3>{t}</h3>
                <p className="muted small" style={{ margin: 0, lineHeight: 1.6 }}>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="why" className="lsec">
        <div className="wrap">
          <div className="eyebrow">Why Splashz</div>
          <h2>The yield of a fund. The control of a wallet.</h2>
          <p className="sub">Most yield apps ask you to hand over your stablecoins. We route them to licensed managers and on-chain markets, and the receipt comes back to you.</p>
          <div className="feat">
            {WHY.map(([t, d]) => (
              <div key={t}><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="lsec" style={{ paddingTop: 0, borderTop: 0 }}>
        <div className="wrap">
          <div className="panel dark" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 40, padding: 44 }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--gold)" }}>Proof</div>
              <h2 style={{ marginTop: 14 }}>Every step is a contract event you can open.</h2>
              <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.65, margin: "16px 0 0" }}>
                The Portfolio page reads receipts straight from BNB Chain. There is no Splashz database standing between you and your record.
              </p>
            </div>
            <div className="mono" style={{ border: "1px solid rgba(255,255,255,0.16)", padding: 20, lineHeight: 1.9, color: "rgba(255,255,255,0.85)" }}>
              <div style={{ color: "var(--gold)" }}>event Subscribed(</div>
              <div>&nbsp;&nbsp;orderId, investor,</div>
              <div>&nbsp;&nbsp;amount, fee, shares,</div>
              <div>&nbsp;&nbsp;nav, trustee)</div>
              <div style={{ color: "var(--gold)", marginTop: 6 }}>event RedemptionRequested(…)</div>
              <div style={{ color: "var(--gold)" }}>event RedemptionSettled(…)</div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="lsec">
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 48 }}>
          <div>
            <div className="eyebrow">Questions</div>
            <h2>Before you launch</h2>
          </div>
          <div>
            {FAQ.map(([q, a]) => (
              <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section className="lsec" style={{ paddingTop: 0, borderTop: 0 }}>
        <div className="wrap">
          <div className="panel blue" style={{ padding: "56px 48px", display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div className="eyebrow" style={{ color: "rgba(255,255,255,0.75)" }}>Ready</div>
              <h2 style={{ color: "#fff", fontSize: 40, marginTop: 12, maxWidth: 560 }}>Connect a wallet and try the full flow on testnet.</h2>
            </div>
            <Link href="/app" className="btn" style={{ background: "#fff", color: "var(--primary)", padding: "12px 24px" }}>
              <span className="ico" style={{ background: "var(--primary-soft)" }}><Arrow /></span>Launch app
            </Link>
          </div>
        </div>
      </section>

      <footer className="lfoot">
        <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between" }}>
          <div>
            <Wordmark />
            <p style={{ margin: "12px 0 0" }}>© 2026 Move Labs Sdn Bhd · earn.splashz.xyz</p>
          </div>
          <p style={{ maxWidth: 560, margin: 0 }}>
            Testnet demonstration on BNB Smart Chain. Not an offer or solicitation. Funds, bonds and vaults can lose value, and past or target yields are not promises. Not available to US persons.
          </p>
        </div>
      </footer>
    </div>
  );
}
