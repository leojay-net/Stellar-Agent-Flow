import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/agent-execute/route";
import * as paymentPolicy from "@/lib/payment-policy";
import * as stellarAuth from "@/lib/stellar-auth";

function makeRequest(body: unknown, headers?: Record<string, string>) {
    return new NextRequest("http://localhost/api/agent-execute", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(headers || {}),
        },
        body: JSON.stringify(body),
    });
}

describe("POST /api/agent-execute", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns 400 when agentId is missing", async () => {
        vi.spyOn(paymentPolicy, "resolvePaymentPolicy").mockResolvedValue({
            mode: "free",
            authRequired: false,
            source: "default",
        });

        const response = await POST(
            makeRequest({
                agentId: "",
                agentName: "x",
                parameterValues: {},
                flowId: "flow",
                stepNumber: 1,
            })
        );

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toMatch(/agentId is required/i);
    });

    it("returns 401 when auth is required and no valid session is provided", async () => {
        vi.spyOn(paymentPolicy, "resolvePaymentPolicy").mockResolvedValue({
            mode: "mpp_charge",
            authRequired: true,
            source: "request",
        });

        const response = await POST(
            makeRequest({
                agentId: "stellar-x402-gateway",
                agentName: "Stellar Payment Gateway",
                parameterValues: { paymentRail: "mpp_charge" },
                endpointUrl: "/api/agents/stellar-x402-gateway",
                flowId: "flow",
                stepNumber: 1,
            })
        );

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toMatch(/auth required/i);
    });

    it("executes internal agent when policy is free", async () => {
        vi.spyOn(paymentPolicy, "resolvePaymentPolicy").mockResolvedValue({
            mode: "free",
            authRequired: false,
            source: "default",
        });

        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, result: { action: "ok" } }),
        } as Response);

        const response = await POST(
            makeRequest({
                agentId: "stellar-x402-gateway",
                agentName: "Stellar Payment Gateway",
                parameterValues: { paymentRail: "x402" },
                endpointUrl: "/api/agents/stellar-x402-gateway",
                flowId: "flow",
                stepNumber: 1,
            })
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.result.action).toBe("ok");
        expect(fetchMock).toHaveBeenCalled();
    });

    it("returns failure payload when internal agent responds with success=false", async () => {
        vi.spyOn(paymentPolicy, "resolvePaymentPolicy").mockResolvedValue({
            mode: "free",
            authRequired: false,
            source: "default",
        });

        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ success: false, error: "agent rejected request" }),
        } as Response);

        const response = await POST(
            makeRequest({
                agentId: "stellar-x402-gateway",
                agentName: "Stellar Payment Gateway",
                parameterValues: { paymentRail: "x402" },
                endpointUrl: "/api/agents/stellar-x402-gateway",
                flowId: "flow",
                stepNumber: 1,
            })
        );

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(String(data.error)).toContain("agent rejected request");
    });

    it("executes custom endpoint and wraps amp message", async () => {
        vi.spyOn(paymentPolicy, "resolvePaymentPolicy").mockResolvedValue({
            mode: "free",
            authRequired: false,
            source: "default",
        });

        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ external: "ok" }),
        } as Response);

        const response = await POST(
            makeRequest({
                agentId: "external-agent",
                agentName: "External Agent",
                parameterValues: { amount: "10" },
                endpointUrl: "https://example.com/hook",
                flowId: "flow-ext",
                stepNumber: 2,
            })
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.source).toBe("custom-endpoint");
        expect(fetchMock).toHaveBeenCalledWith(
            "https://example.com/hook",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("returns 502 when custom endpoint fails", async () => {
        vi.spyOn(paymentPolicy, "resolvePaymentPolicy").mockResolvedValue({
            mode: "free",
            authRequired: false,
            source: "default",
        });

        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: false,
            status: 500,
            statusText: "Internal Error",
        } as Response);

        const response = await POST(
            makeRequest({
                agentId: "external-agent",
                agentName: "External Agent",
                parameterValues: { amount: "10" },
                endpointUrl: "https://example.com/hook",
                flowId: "flow-ext",
                stepNumber: 2,
            })
        );

        expect(response.status).toBe(502);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(String(data.error)).toContain("Custom endpoint failed");
    });

    it("forwards authenticated internal calls when session validates", async () => {
        vi.spyOn(paymentPolicy, "resolvePaymentPolicy").mockResolvedValue({
            mode: "mpp_session",
            authRequired: true,
            source: "request",
        });
        vi.spyOn(stellarAuth, "validateSession").mockImplementation(() => undefined);

        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, result: { ok: true } }),
        } as Response);

        const response = await POST(
            makeRequest(
                {
                    agentId: "stellar-x402-gateway",
                    agentName: "Stellar Payment Gateway",
                    parameterValues: { paymentRail: "mpp_session" },
                    endpointUrl: "/api/agents/stellar-x402-gateway",
                    flowId: "flow",
                    stepNumber: 1,
                },
                {
                    "X-AgentFlow-Session": "session-token",
                    "X-AgentFlow-Public-Key": "GABC",
                }
            )
        );

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/api/agents/stellar-x402-gateway"),
            expect.objectContaining({
                headers: expect.objectContaining({
                    "X-AgentFlow-Session": "session-token",
                    "X-AgentFlow-Public-Key": "GABC",
                }),
            })
        );
    });
});
