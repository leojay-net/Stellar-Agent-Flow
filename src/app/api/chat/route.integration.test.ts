import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
    beforeEach(() => {
        process.env.GEMINI_API_KEY = "test-key";
        process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.GEMINI_API_KEY;
        delete process.env.NEXT_PUBLIC_SITE_URL;
    });

    it("validates empty messages", async () => {
        const response = await POST(
            new NextRequest("http://localhost/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "   " }),
            })
        );

        expect(response.status).toBe(400);
    });

    it("returns assistant reply from Gemini call", async () => {
        vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                        ? input.toString()
                        : (input as Request).url;

            if (url.includes("generativelanguage.googleapis.com")) {
                return {
                    ok: true,
                    json: async () => ({
                        choices: [
                            {
                                message: {
                                    content: '{"action":"run_agent","agentId":"orchestrator-core","params":{"executionMode":"parallel"}}',
                                },
                            },
                        ],
                    }),
                } as Response;
            }

            return {
                ok: true,
                json: async () => ({ success: true, result: { action: "orchestrate" } }),
            } as Response;
        });

        const response = await POST(
            new NextRequest("http://localhost/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "run orchestrator" }),
            })
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(typeof data.reply).toBe("string");
        expect(String(data.reply)).toContain("run_agent");
        expect(data.model).toBe("gemini-3.1-flash-lite-preview");
    });

    it("returns 500 when GEMINI_API_KEY is missing", async () => {
        delete process.env.GEMINI_API_KEY;

        const response = await POST(
            new NextRequest("http://localhost/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "hello" }),
            })
        );

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(String(data.error)).toContain("GEMINI_API_KEY");
    });

    it("retries Gemini on 503 and then succeeds", async () => {
        vi.spyOn(globalThis, "setTimeout").mockImplementation(((cb: TimerHandler) => {
            if (typeof cb === "function") cb();
            return 0 as unknown as ReturnType<typeof setTimeout>;
        }) as typeof setTimeout);

        let attempts = 0;
        vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
            const url =
                typeof input === "string"
                    ? input
                    : input instanceof URL
                        ? input.toString()
                        : (input as Request).url;

            if (url.includes("generativelanguage.googleapis.com")) {
                attempts += 1;
                if (attempts === 1) {
                    return {
                        ok: false,
                        status: 503,
                        text: async () => "busy",
                    } as Response;
                }
                return {
                    ok: true,
                    json: async () => ({ choices: [{ message: { content: "hello from gemini" } }] }),
                } as Response;
            }

            return {
                ok: true,
                json: async () => ({ success: true }),
            } as Response;
        });

        const response = await POST(
            new NextRequest("http://localhost/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "say hi" }),
            })
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.reply).toContain("hello from gemini");
        expect(attempts).toBe(2);
    });

    it("appends agent error when run_agent execution fails", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [
                        {
                            message: {
                                content: '```json\n{"action":"run_agent","agentId":"stellar-pricer","params":{"pair":"XLM/USD"}}\n```',
                            },
                        },
                    ],
                }),
            } as Response)
            .mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => "agent failed",
            } as Response);

        const response = await POST(
            new NextRequest("http://localhost/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "run price check" }),
            })
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(String(data.reply)).toContain("Agent Error");
        expect(data.action).toBe("run_agent");
    });
});
