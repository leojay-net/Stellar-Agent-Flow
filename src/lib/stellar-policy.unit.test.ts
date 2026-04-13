import { beforeEach, describe, expect, it, vi } from "vitest";

const sdkMocks = vi.hoisted(() => ({
    getContractData: vi.fn(),
    scValToNative: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", () => ({
    rpcServerConstructed: vi.fn(),
    rpc: {
        Server: class MockServer {
            constructor() {
                // constructor side-effect to prove server creation path if needed
            }

            getContractData = sdkMocks.getContractData;
        },
        Durability: { Persistent: "Persistent" },
    },
    xdr: {
        ScVal: {
            scvVec: vi.fn((value: unknown) => value),
            scvSymbol: vi.fn((value: string) => value),
            scvBytes: vi.fn((value: Buffer) => value),
        },
    },
    scValToNative: sdkMocks.scValToNative,
}));

import { fetchOnchainPaymentMode, fetchOnchainPolicy } from "@/lib/stellar-policy";

describe("stellar-policy", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        sdkMocks.getContractData.mockReset();
        sdkMocks.scValToNative.mockReset();
    });

    it("returns rpc mode for string payment_mode", async () => {
        sdkMocks.getContractData.mockResolvedValue({
            val: { contractData: () => ({ val: () => ({}) }) },
        });
        sdkMocks.scValToNative.mockReturnValue({ payment_mode: "x402" });

        const result = await fetchOnchainPolicy({
            contractId: "C1",
            agentName: "Stellar Pricer",
            network: "testnet",
        });

        expect(result.mode).toBe("x402");
        expect(result.source).toBe("rpc");
    });

    it("normalizes enum-like array payment mode", async () => {
        sdkMocks.getContractData.mockResolvedValue({
            val: { contractData: () => ({ val: () => ({}) }) },
        });
        sdkMocks.scValToNative.mockReturnValue({ paymentMode: ["mppcharge"] });

        const result = await fetchOnchainPolicy({
            contractId: "C2",
            agentName: "Gateway",
            network: "mainnet",
        });

        expect(result.mode).toBe("mpp_charge");
        expect(result.source).toBe("rpc");
    });

    it("returns unavailable when native policy payload is not an object", async () => {
        sdkMocks.getContractData.mockResolvedValue({
            val: { contractData: () => ({ val: () => ({}) }) },
        });
        sdkMocks.scValToNative.mockReturnValue("not-an-object");

        const result = await fetchOnchainPolicy({
            contractId: "C3",
            agentName: "Policyless",
            network: "testnet",
        });

        expect(result.mode).toBeNull();
        expect(result.source).toBe("unavailable");
    });

    it("uses cache on repeated lookups", async () => {
        sdkMocks.getContractData.mockResolvedValue({
            val: { contractData: () => ({ val: () => ({}) }) },
        });
        sdkMocks.scValToNative.mockReturnValue({ payment_mode: "free" });

        const input = {
            contractId: "C4",
            agentName: "Cached Agent",
            network: "testnet" as const,
        };

        const first = await fetchOnchainPolicy(input);
        const second = await fetchOnchainPolicy(input);

        expect(first.source).toBe("rpc");
        expect(second.source).toBe("cache");
        expect(sdkMocks.getContractData).toHaveBeenCalledTimes(1);
    });

    it("refreshes cache after ttl expires", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

        sdkMocks.getContractData.mockResolvedValue({
            val: { contractData: () => ({ val: () => ({}) }) },
        });
        sdkMocks.scValToNative.mockReturnValueOnce({ payment_mode: "free" }).mockReturnValueOnce({ payment_mode: "x402" });

        const input = {
            contractId: "C5",
            agentName: "Expiring Agent",
            network: "testnet" as const,
        };

        const first = await fetchOnchainPolicy(input);
        vi.setSystemTime(new Date("2024-01-01T00:00:21Z"));
        const second = await fetchOnchainPolicy(input);

        expect(first.mode).toBe("free");
        expect(second.mode).toBe("x402");
        expect(second.source).toBe("rpc");
        expect(sdkMocks.getContractData).toHaveBeenCalledTimes(2);
    });

    it("returns unavailable when rpc call throws", async () => {
        sdkMocks.getContractData.mockRejectedValue(new Error("rpc down"));

        const result = await fetchOnchainPolicy({
            contractId: "C6",
            agentName: "Failing Agent",
            network: "testnet",
        });

        expect(result.mode).toBeNull();
        expect(result.source).toBe("unavailable");
    });

    it("returns payment mode via helper", async () => {
        sdkMocks.getContractData.mockResolvedValue({
            val: { contractData: () => ({ val: () => ({}) }) },
        });
        sdkMocks.scValToNative.mockReturnValue({ payment_mode: "mpp_session" });

        const mode = await fetchOnchainPaymentMode({
            contractId: "C7",
            agentName: "Wrapper Agent",
            network: "testnet",
        });

        expect(mode).toBe("mpp_session");
    });
});