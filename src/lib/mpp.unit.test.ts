import { describe, expect, it } from "vitest";
import { createMppSettlementIntent } from "@/lib/mpp";

describe("mpp intent", () => {
    it("creates deterministic shape for charge rail", () => {
        const result = createMppSettlementIntent({
            rail: "mpp_charge",
            agentId: "agentflow",
            payer: "GABC",
            amountStroops: "250000",
            assetCode: "USDC",
            network: "testnet",
            objective: "premium quote",
        });

        expect(result.action).toBe("mpp_settlement_intent");
        expect(result.mode).toBe("charge");
        expect(result.payment.assetCode).toBe("USDC");
        expect(result.payment.amountStroops).toBe("250000");
    });

    it("creates session mode for mpp_session rail", () => {
        const result = createMppSettlementIntent({
            rail: "mpp_session",
            agentId: "agentflow",
            payer: "GABC",
            amountStroops: "100000",
        });

        expect(result.mode).toBe("session");
        expect(result.network).toBe("stellar:testnet");
        expect(result.intentId).toBeTruthy();
    });
});
