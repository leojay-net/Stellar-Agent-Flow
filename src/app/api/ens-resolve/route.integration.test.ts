import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/ens-resolve/route";

describe("/api/ens-resolve", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("validates required names query", async () => {
        const response = await GET(new NextRequest("http://localhost/api/ens-resolve"));
        expect(response.status).toBe(400);
    });

    it("returns format error for non-federation input", async () => {
        const response = await GET(new NextRequest("http://localhost/api/ens-resolve?names=vitalik.eth"));
        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data[0].resolved).toBe(false);
        expect(json.data[0].error).toMatch(/federation format/i);
    });

    it("resolves federation address when toml + server are available", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
            const url = String(input);
            if (url.includes("/.well-known/stellar.toml")) {
                return {
                    ok: true,
                    text: async () => 'FEDERATION_SERVER="https://fed.example.com/federation"',
                } as Response;
            }

            return {
                ok: true,
                json: async () => ({ account_id: "GABC123" }),
            } as Response;
        });

        const response = await GET(new NextRequest("http://localhost/api/ens-resolve?names=alice*example.com"));
        expect(response.status).toBe(200);
        const json = await response.json();

        expect(fetchMock).toHaveBeenCalled();
        expect(json.success).toBe(true);
        expect(json.data[0].resolved).toBe(true);
        expect(json.data[0].accountId).toBe("GABC123");
    });

    it("returns invalid format when user or domain is missing", async () => {
        const response = await GET(new NextRequest("http://localhost/api/ens-resolve?names=*example.com"));

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.data[0].resolved).toBe(false);
        expect(String(json.data[0].error)).toContain("Invalid federation format");
    });

    it("returns resolution error when stellar.toml is unavailable", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);

        const response = await GET(new NextRequest("http://localhost/api/ens-resolve?names=alice*example.com"));
        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.data[0].resolved).toBe(false);
        expect(String(json.data[0].error)).toContain("stellar.toml unavailable");
    });

    it("returns federation server status errors", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                text: async () => 'FEDERATION_SERVER="https://fed.example.com/federation"',
            } as Response)
            .mockResolvedValueOnce({
                ok: false,
                status: 502,
            } as Response);

        const response = await GET(new NextRequest("http://localhost/api/ens-resolve?names=alice*example.com"));
        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.data[0].resolved).toBe(false);
        expect(String(json.data[0].error)).toContain("federation server returned 502");
    });
});
