import { randomUUID } from "node:crypto";

export type MppRail = "mpp_charge" | "mpp_session";

export interface MppIntentInput {
    rail: MppRail;
    agentId: string;
    payer: string;
    amountStroops: string;
    assetCode?: string;
    network?: "testnet" | "mainnet";
    objective?: string;
}

export function createMppSettlementIntent(input: MppIntentInput) {
    const amountStroops = input.amountStroops || "100000";
    const assetCode = (input.assetCode || "XLM").toUpperCase();
    const network = input.network || "testnet";
    const intentId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    return {
        action: "mpp_settlement_intent",
        status: "intent_ready",
        rail: input.rail,
        mode: input.rail === "mpp_session" ? "session" : "charge",
        intentId,
        expiresAt,
        network: `stellar:${network}`,
        payment: {
            agentId: input.agentId,
            payer: input.payer,
            amountStroops,
            assetCode,
            objective: input.objective || "premium agent execution",
        },
    };
}
