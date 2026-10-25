import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://trade.miu33archstudio.xyz/preflight"),
  title: "TRADE_PREFLIGHT_OS // KSA CARGO & STANDARDS GATEWAY",
  description: "Air-Gapped Preflight Anomaly Engine & ZATCA/FASAH Verification Gateway",
  openGraph: {
    title: "TRADE_PREFLIGHT_OS // KSA CARGO & STANDARDS GATEWAY",
    description: "Universal Mill Manifest Parity • MTC Metallurgy • SASO 2831 • ZATCA Phase-2 QR",
    url: "https://trade.miu33archstudio.xyz/preflight",
    siteName: "TRADE_PREFLIGHT_OS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRADE_PREFLIGHT_OS // KSA CARGO & STANDARDS GATEWAY",
    description: "Air-Gapped Preflight Anomaly Engine & ZATCA/FASAH Verification Gateway",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-obsidian text-zinc-200">
        {children}
      </body>
    </html>
  );
}