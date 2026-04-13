// ============================================================
// Shared in-memory community agents store.
// Module-level singleton — persists across API route calls
// within the same Node.js process (dev server / long-lived server).
// For Vercel serverless: survives within a warm function instance.
// ============================================================

import type { AgentDefinition } from "@/types";

export const COMMUNITY_AGENTS_STORE = new Map<string, AgentDefinition>([
    [
        "community-coingecko-tracker",
        {
            id: "community-coingecko-tracker",
            name: "Stellar Market Tracker",
            description:
                "Fetches Stellar market data such as XLM and Stellar USDC spot prices.",
            category: "oracle",
            sponsor: "Community",
            version: "1.0.0",
            iconKey: "LineChart",
            parameters: [
                {
                    name: "asset",
                    label: "Asset",
                    type: "text",
                    defaultValue: "XLM",
                    required: true,
                    description: "Asset to query (XLM, USDC, AQUA)",
                },
                {
                    name: "vsCurrency",
                    label: "vs Currency",
                    type: "text",
                    defaultValue: "usd",
                    required: false,
                    description: "Quote currency (usd, eur, btc…)",
                },
            ],
            tags: ["price", "oracle", "community", "coingecko"],
            endpointUrl: "/api/agents/community-coingecko-tracker",
            isCustom: true,
        },
    ],
    [
        "community-gas-estimator",
        {
            id: "community-gas-estimator",
            name: "Stellar Fee Estimator",
            description:
                "Estimates Stellar base fee and fee stats using Horizon endpoints.",
            category: "chain",
            sponsor: "Community",
            version: "1.0.0",
            iconKey: "Zap",
            parameters: [
                {
                    name: "network",
                    label: "Network",
                    type: "select",
                    options: ["testnet", "mainnet"],
                    defaultValue: "testnet",
                    required: true,
                    description: "Stellar network to query fees for",
                },
            ],
            tags: ["stellar", "fees", "community"],
            endpointUrl: "/api/agents/community-gas-estimator",
            isCustom: true,
        },
    ],
]);
