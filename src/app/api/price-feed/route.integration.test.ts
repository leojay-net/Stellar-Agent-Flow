import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/price-feed/route";

describe("/api/price-feed", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns XLM/USD price when provider is reachable", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ stellar: { usd: 0.123 } }),
        } as Response);

        const response = await GET(new NextRequest("http://localhost/api/price-feed?pairs=XLM/USD"));
        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data[0].pair).toBe("XLM/USD");
        expect(json.data[0].price).toBe(0.123);
        expect(json.data[0].source).toBe("coingecko");
    });

    it("returns unsupported source for non-XLM pairs", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ stellar: { usd: 0.123 } }),
        } as Response);

        const response = await GET(new NextRequest("http://localhost/api/price-feed?pairs=BTC/USD"));
        const json = await response.json();

        expect(json.data[0].pair).toBe("BTC/USD");
        expect(json.data[0].source).toBe("unsupported_pair");
        expect(json.data[0].price).toBeNull();
    });
});
