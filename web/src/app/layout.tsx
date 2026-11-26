import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Splashz · Earn on idle stablecoins",
  description: "Licensed funds and bonds, live stablecoin vaults and tokenized stocks, on BNB Chain. Your assets stay in your wallet. By Move Labs.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialState = cookieToInitialState(wagmiConfig, (await headers()).get("cookie"));
  return (
    <html lang="en">
      <head>
        {/* Cabinet Grotesk + Satoshi, free from Indian Type Foundry via Fontshare */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800&f[]=satoshi@400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
