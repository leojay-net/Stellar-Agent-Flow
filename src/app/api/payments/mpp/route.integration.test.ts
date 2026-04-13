import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Keypair } from "@stellar/stellar-sdk";
import { POST } from "@/app/api/payments/mpp/route";
import { createChallenge, verifyChallengeSignature } from "@/lib/stellar-auth";

function makeRequest(body: unknown, headers?: Record<string, string>) {
    return new NextRequest("http://localhost/api/payments/mpp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(headers || {}),
        },
        body: JSON.stringify(body),
    });
}

describe("POST /api/payments/mpp", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.MPP_SETTLEMENT_EXECUTOR_URL;
    });

    it("returns 400 for invalid rail", async () => {
        const response = await POST(
            makeRequest({
                rail: "x402",
                agentId: "agentflow",
            })
        );

        expect(response.status).toBe(400);
    });

    it("returns 401 when session is missing", async () => {
        const response = await POST(
            makeRequest({
                rail: "mpp_charge",
                agentId: "agentflow",
            })
        );

        expect(response.status).toBe(401);
    });

    it("returns intent for authenticated request", async () => {
        const kp = Keypair.random();
        const challenge = createChallenge(kp.publicKey(), "localhost");
        const signature = kp.sign(Buffer.from(challenge.message, "utf8")).toString("base64");
        const verified = verifyChallengeSignature(kp.publicKey(), challenge.nonce, challenge.message, signature);

        const response = await POST(
            makeRequest(
                {
                    rail: "mpp_session",
                    agentId: "agentflow",
                    amountStroops: "123000",
                },
                {
                    "X-AgentFlow-Session": verified.sessionToken,
                    "X-AgentFlow-Public-Key": kp.publicKey(),
                }
            )
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.result.action).toBe("mpp_settlement_intent");
        expect(data.result.mode).toBe("session");
    });

    it("returns 501 when execute is requested without executor URL", async () => {
        const kp = Keypair.random();
        const challenge = createChallenge(kp.publicKey(), "localhost");
        const signature = kp.sign(Buffer.from(challenge.message, "utf8")).toString("base64");
        const verified = verifyChallengeSignature(kp.publicKey(), challenge.nonce, challenge.message, signature);

        const response = await POST(
            makeRequest(
                {
                    rail: "mpp_charge",
                    agentId: "agentflow",
                    execute: true,
                },
                {
                    "X-AgentFlow-Session": verified.sessionToken,
                    "X-AgentFlow-Public-Key": kp.publicKey(),
                }
            )
        );

        expect(response.status).toBe(501);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(String(data.error)).toContain("MPP_SETTLEMENT_EXECUTOR_URL");
    });

    it("returns 502 when executor rejects settlement", async () => {
        const kp = Keypair.random();
        const challenge = createChallenge(kp.publicKey(), "localhost");
        const signature = kp.sign(Buffer.from(challenge.message, "utf8")).toString("base64");
        const verified = verifyChallengeSignature(kp.publicKey(), challenge.nonce, challenge.message, signature);

        process.env.MPP_SETTLEMENT_EXECUTOR_URL = "https://executor.example.com/settle";
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: false,
            status: 403,
            json: async () => ({ error: "forbidden" }),
        } as Response);

        const response = await POST(
            makeRequest(
                {
                    rail: "mpp_charge",
                    agentId: "agentflow",
                    execute: true,
                },
                {
                    "X-AgentFlow-Session": verified.sessionToken,
                    "X-AgentFlow-Public-Key": kp.publicKey(),
                }
            )
        );

        expect(response.status).toBe(502);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.executorStatus).toBe(403);
    });

    it("returns settlement details when executor accepts", async () => {
        const kp = Keypair.random();
        const challenge = createChallenge(kp.publicKey(), "localhost");
        const signature = kp.sign(Buffer.from(challenge.message, "utf8")).toString("base64");
        const verified = verifyChallengeSignature(kp.publicKey(), challenge.nonce, challenge.message, signature);

        process.env.MPP_SETTLEMENT_EXECUTOR_URL = "https://executor.example.com/settle";
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ txHash: "ABC123" }),
        } as Response);

        const response = await POST(
            makeRequest(
                {
                    rail: "mpp_session",
                    agentId: "agentflow",
                    execute: true,
                },
                {
                    "X-AgentFlow-Session": verified.sessionToken,
                    "X-AgentFlow-Public-Key": kp.publicKey(),
                }
            )
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.settlement.status).toBe("submitted");
        expect(data.settlement.response.txHash).toBe("ABC123");
    });
});
