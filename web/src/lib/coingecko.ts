/** Server-side CoinGecko call. Works keyless; COINGECKO_API_KEY (free demo key) raises the rate limit. */
export async function coingecko(path: string): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  const key = process.env.COINGECKO_API_KEY;
  try {
    const res = await fetch(`https://api.coingecko.com${path}`, {
      headers: key ? { "x-cg-demo-api-key": key } : undefined,
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn("[coingecko] HTTP", res.status);
      return { ok: false, error: `CoinGecko HTTP ${res.status}` };
    }
    return { ok: true, body: await res.json() };
  } catch (e) {
    console.warn("[coingecko] fetch failed", e);
    return { ok: false, error: "CoinGecko unreachable" };
  }
}
