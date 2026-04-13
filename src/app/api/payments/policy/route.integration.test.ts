import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/payments/policy/route";
import * as stellarPolicy from "@/lib/stellar-policy";

function makeRequest(body: unknown) {
    return new NextRequest("http://localhost/api/payments/policy", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
}

describe("POST /api/payments/policy", () => {
    it("validates required inputs", async () => {
        const response = await POST(makeRequest({ contractId: "", agentName: "" }));
        expect(response.status).toBe(400);
    });

    it("returns policy check payload", async () => {
        vi.spyOn(stellarPolicy, "fetchOnchainPolicy").mockResolvedValue({
            mode: "x402",
            source: "rpc",
            cacheKey: "test:key",
        });

        const response = await POST(
            makeRequest({
                contractId: "C123",
                agentName: "agentflow",
                network: "testnet",
            })
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.result.mode).toBe("x402");
        expect(data.result.source).toBe("rpc");
    });
});
