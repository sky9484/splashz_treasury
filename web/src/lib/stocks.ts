/** Pyth Core equity feeds (Hermes ids). Verify against Pyth Terminal before production. */
export const EQUITIES = [
  { ticker: "AAPL", name: "Apple", id: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688" },
  { ticker: "NVDA", name: "NVIDIA", id: "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593" },
  { ticker: "TSLA", name: "Tesla", id: "0x16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1" },
  { ticker: "MSFT", name: "Microsoft", id: "0xd0ca23c1cc005e004ccf1db5bf76aeb6a49218f43dac3d4b275e92de12ded4d1" },
  { ticker: "AMZN", name: "Amazon", id: "0xb5d0e0fa58a1f8b81498ae670ce93c872d14434b72c364885d4fa1b257cbb07a" },
  { ticker: "GOOG", name: "Alphabet", id: "0xe65ff435be42630439c96396653a342829e877e2aafaeaf1a10d0ee5fd2cf3f2" },
  { ticker: "META", name: "Meta", id: "0x78a3e3b8e676a8f73c439f5d749737034b139bbbe899ba5775216fba596607fe" },
] as const;

export type Quote = {
  ticker: string;
  name: string;
  price: number | null;
  conf: number | null;
  publishTime: number | null;
  stale: boolean;
};

type HermesParsed = { id: string; price: { price: string; conf: string; expo: number; publish_time: number } };

const norm = (id: string) => id.toLowerCase().replace(/^0x/, "");

/** Pure: map a Hermes /v2/updates/price/latest?parsed=true body to quotes. Stale = older than maxAgeSec. */
export function parseHermes(body: unknown, nowSec: number, maxAgeSec = 15 * 60): Quote[] {
  const parsed = ((body as { parsed?: HermesParsed[] } | null)?.parsed ?? []) as HermesParsed[];
  const byId = new Map(parsed.map((p) => [norm(p.id), p]));
  return EQUITIES.map((e) => {
    const p = byId.get(norm(e.id));
    if (!p) return { ticker: e.ticker, name: e.name, price: null, conf: null, publishTime: null, stale: true };
    const scale = Math.pow(10, p.price.expo);
    const price = Number(p.price.price) * scale;
    const conf = Number(p.price.conf) * scale;
    return { ticker: e.ticker, name: e.name, price, conf, publishTime: p.price.publish_time, stale: nowSec - p.price.publish_time > maxAgeSec };
  });
}
