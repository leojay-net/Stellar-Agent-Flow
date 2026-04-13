import { NextRequest, NextResponse } from "next/server";

async function fetchXlmUsd(): Promise<number | null> {
    try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd", {
            next: { revalidate: 60 },
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { stellar?: { usd?: number } };
        return json.stellar?.usd ?? null;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const pairs = (searchParams.get("pairs") || "XLM/USD")
        .split(",")
        .map((p) => p.trim().toUpperCase())
        .filter(Boolean);

    const xlmUsd = await fetchXlmUsd();

    const data = pairs.map((pair) => {
        if (pair === "XLM/USD") {
            return {
                pair,
                price: xlmUsd,
                updatedAt: new Date().toISOString(),
                source: "coingecko",
            };
        }

        return {
            pair,
            price: null,
            updatedAt: null,
            source: "unsupported_pair",
        };
    });

    return NextResponse.json({ success: true, data, fetchedAt: new Date().toISOString() });
}
