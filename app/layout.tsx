import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRADE_PREFLIGHT_OS // KSA CARGO & STANDARDS GATEWAY",
  description: "Air-Gapped Preflight Anomaly Engine & ZATCA/FASAH Verification Gateway",
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