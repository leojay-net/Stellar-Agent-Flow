import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/negotiate/route";

describe("POST /api/negotiate", () => {
    beforeEach(() => {
        process.env.GEMINI_API_KEY = "test-key";
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.GEMINI_API_KEY;
    });

    it("requires GEMINI_API_KEY", async () => {
        delete process.env.GEMINI_API_KEY;

        const response = await POST(
            new NextRequest("http://localhost/api/negotiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            })
        );

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.success).toBe(false);
    });

    it("returns parsed negotiation payload", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: JSON.stringify({
                                summary: "Consensus reached",
                                resolvedParams: { amount: "10" },
                                conflicts: [],
                                confidence: 0.98,
                                agentAMessage: "ok",
                                agentBMessage: "ok",
                                agreed: true,
                            }),
                        },
                    },
                ],
            }),
        } as Response);

        const response = await POST(
            new NextRequest("http://localhost/api/negotiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    initiatorAgentName: "A",
                    receiverAgentName: "B",
                    initiatorParams: { amount: "10" },
                    receiverParams: { amount: "12" },
                    negotiationGoal: "agree amount",
                }),
            })
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.source).toBe("gemini");
        expect(data.summary).toBe("Consensus reached");
    });

    it("retries Gemini after 429 and returns success", async () => {
        vi.spyOn(globalThis, "setTimeout").mockImplementation(((cb: TimerHandler) => {
            if (typeof cb === "function") cb();
            return 0 as unknown as ReturnType<typeof setTimeout>;
        }) as typeof setTimeout);

        let attempts = 0;
        vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
            attempts += 1;
            if (attempts === 1) {
                return {
                    ok: false,
                    status: 429,
                    text: async () => "rate limited",
                } as Response;
            }

            return {
                ok: true,
                json: async () => ({
                    choices: [
                        {
                            message: {
                                content: JSON.stringify({
                                    summary: "Recovered",
                                    resolvedParams: { amount: "5" },
                                    conflicts: [],
                                    confidence: 0.9,
                                    agentAMessage: "ok",
                                    agentBMessage: "ok",
                                    agreed: true,
                                }),
                            },
                        },
                    ],
                }),
            } as Response;
        });

        const response = await POST(
            new NextRequest("http://localhost/api/negotiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    initiatorAgentName: "A",
                    receiverAgentName: "B",
                    initiatorParams: { amount: "4" },
                    receiverParams: { amount: "5" },
                    negotiationGoal: "agree amount",
                }),
            })
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.summary).toBe("Recovered");
        expect(attempts).toBe(2);
    });

    it("returns 500 when Gemini returns invalid JSON", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: "not-json" } }] }),
        } as Response);

        const response = await POST(
            new NextRequest("http://localhost/api/negotiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    initiatorAgentName: "A",
                    receiverAgentName: "B",
                    initiatorParams: {},
                    receiverParams: {},
                    negotiationGoal: "test",
                }),
            })
        );

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(String(data.error)).toContain("invalid JSON");
    });
});
