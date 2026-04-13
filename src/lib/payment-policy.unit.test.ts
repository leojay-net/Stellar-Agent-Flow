import { describe, expect, it, vi } from "vitest";
import { resolvePaymentPolicy } from "@/lib/payment-policy";
import * as stellarPolicy from "@/lib/stellar-policy";

describe("payment-policy", () => {
    it("uses env override when configured", async () => {
        process.env.AGENTFLOW_AGENT_PAYMENT_MODES = JSON.stringify({
            "stellar-x402-gateway": "mpp_session",
        });

        const result = await resolvePaymentPolicy("stellar-x402-gateway", {
            paymentRail: "x402",
        });

        expect(result.mode).toBe("mpp_session");
        expect(result.source).toBe("env");
        expect(result.authRequired).toBe(true);
    });

    it("uses onchain mode when contract policy is available", async () => {
        const spy = vi
            .spyOn(stellarPolicy, "fetchOnchainPaymentMode")
            .mockResolvedValue("free");

        const result = await resolvePaymentPolicy("stellar-x402-gateway", {
            paymentRail: "x402",
            policyContractId: "C123",
            policyAgentName: "agentflow",
            policyNetwork: "testnet",
        });

        expect(result.mode).toBe("free");
        expect(result.source).toBe("onchain");
        expect(result.authRequired).toBe(false);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("falls back to paymentRail when onchain mode is unavailable", async () => {
        vi.spyOn(stellarPolicy, "fetchOnchainPaymentMode").mockResolvedValue(null);

        const result = await resolvePaymentPolicy("stellar-x402-gateway", {
            paymentRail: "mpp_charge",
            policyContractId: "C123",
            policyAgentName: "agentflow",
        });

        expect(result.mode).toBe("mpp_charge");
        expect(result.source).toBe("request");
        expect(result.authRequired).toBe(true);
    });

    it("defaults to free for non-gateway agents", async () => {
        const result = await resolvePaymentPolicy("stellar-horizon-reader", {});

        expect(result.mode).toBe("free");
        expect(result.source).toBe("default");
        expect(result.authRequired).toBe(false);
    });
});
