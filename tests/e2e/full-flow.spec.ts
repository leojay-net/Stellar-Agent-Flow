import { test, expect } from "@playwright/test";
import { Keypair } from "@stellar/stellar-sdk";

test("full auth -> execute -> mpp flow", async ({ request }) => {
    const kp = Keypair.random();

    const challengeRes = await request.post("/api/auth/stellar/challenge", {
        data: {
            publicKey: kp.publicKey(),
        },
    });
    expect(challengeRes.ok()).toBeTruthy();
    const challenge = await challengeRes.json();

    const signature = Buffer.from(kp.sign(Buffer.from(challenge.message, "utf8"))).toString("base64");

    const verifyRes = await request.post("/api/auth/stellar/verify", {
        data: {
            publicKey: kp.publicKey(),
            nonce: challenge.nonce,
            message: challenge.message,
            signature,
        },
    });
    const verified = await verifyRes.json();
    expect(verifyRes.ok(), JSON.stringify(verified)).toBeTruthy();
    expect(verified.sessionToken).toBeTruthy();

    const executeRes = await request.post("/api/agent-execute", {
        headers: {
            "X-AgentFlow-Session": verified.sessionToken,
            "X-AgentFlow-Public-Key": kp.publicKey(),
        },
        data: {
            agentId: "stellar-x402-gateway",
            agentName: "Stellar Payment Gateway",
            parameterValues: {
                paymentRail: "mpp_charge",
                agent: "agentflow",
                objective: "premium routing",
                amountStroops: "120000",
                assetCode: "XLM",
                network: "testnet",
            },
            endpointUrl: "/api/agents/stellar-x402-gateway",
            flowId: "e2e-flow",
            stepNumber: 1,
        },
    });

    const execute = await executeRes.json();
    expect(executeRes.ok(), JSON.stringify(execute)).toBeTruthy();
    expect(execute.success).toBe(true);
    expect(execute.result.action).toBe("mpp_settlement_intent");

    const mppRes = await request.post("/api/payments/mpp", {
        headers: {
            "X-AgentFlow-Session": verified.sessionToken,
            "X-AgentFlow-Public-Key": kp.publicKey(),
        },
        data: {
            rail: "mpp_charge",
            agentId: "agentflow",
            amountStroops: "120000",
            execute: false,
        },
    });

    const mpp = await mppRes.json();
    expect(mppRes.ok(), JSON.stringify(mpp)).toBeTruthy();
    expect(mpp.success).toBe(true);
    expect(mpp.result.action).toBe("mpp_settlement_intent");
});
