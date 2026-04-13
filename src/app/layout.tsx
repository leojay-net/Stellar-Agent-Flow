import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://agentflow-pink.vercel.app";

export const metadata: Metadata = {
  title: "AgentFlow — Stellar Multi-Agent Orchestrator",
  description:
    "Compose, wire, and execute Stellar ecosystem AI agents on a visual canvas.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "AgentFlow — Stellar Multi-Agent Orchestrator",
    description:
      "Compose, wire, and execute Stellar ecosystem AI agents on a visual canvas.",
    url: siteUrl,
    siteName: "AgentFlow",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "AgentFlow — Stellar Multi-Agent Orchestrator",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentFlow — Stellar Multi-Agent Orchestrator",
    description:
      "Build and run Stellar-native AI agent pipelines.",
    images: [`${siteUrl}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
