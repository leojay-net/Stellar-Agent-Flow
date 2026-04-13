import { beforeEach, describe, expect, it } from "vitest";
import { useActivityStore } from "@/store/activity-store";

describe("activity store", () => {
    beforeEach(() => {
        useActivityStore.setState({
            transactions: [],
            isActivityOpen: false,
        });
    });

    it("tracks a transaction and toggles activity panel", () => {
        const id = useActivityStore.getState().trackTransaction({
            agentName: "Planner",
            agentId: "stellar-payment-planner",
            action: "Create payment",
            chainId: 148,
            chainName: "Stellar Testnet",
            to: "GDST...",
            from: "GSRC...",
            valueEth: "10",
        });

        const state = useActivityStore.getState();
        expect(id).toBeTruthy();
        expect(state.isActivityOpen).toBe(true);
        expect(state.transactions).toHaveLength(1);
        expect(state.transactions[0].phase).toBe("preparing");
        expect(state.transactions[0].timeline).toHaveLength(1);
    });

    it("moves transaction through pending to confirmed", () => {
        const id = useActivityStore.getState().trackTransaction({
            agentName: "Gateway",
            agentId: "stellar-x402-gateway",
            action: "Settle",
            chainId: 148,
            chainName: "Stellar Testnet",
        });

        useActivityStore.getState().setTxHash(id, "ABC123", "https://stellar.expert/explorer/testnet/tx/ABC123");
        useActivityStore.getState().confirmTransaction(id, { blockNumber: 12345, gasUsed: "0" });

        const tx = useActivityStore.getState().transactions[0];
        expect(tx.phase).toBe("confirmed");
        expect(tx.txHash).toBe("ABC123");
        expect(tx.blockNumber).toBe(12345);
        expect(tx.timeline.map((t) => t.phase)).toEqual(["preparing", "pending", "confirmed"]);
    });

    it("marks a transaction as failed and clears activity", () => {
        const id = useActivityStore.getState().trackTransaction({
            agentName: "Gateway",
            agentId: "stellar-x402-gateway",
            action: "Settle",
            chainId: 148,
            chainName: "Stellar Testnet",
        });

        useActivityStore.getState().failTransaction(id, "signature rejected");
        let tx = useActivityStore.getState().transactions[0];
        expect(tx.phase).toBe("failed");
        expect(tx.errorMessage).toContain("signature rejected");

        useActivityStore.getState().clearActivity();
        tx = useActivityStore.getState().transactions[0] as unknown as typeof tx;
        expect(useActivityStore.getState().transactions).toHaveLength(0);
        expect(tx).toBeUndefined();
    });

    it("supports explicit open state and toggle", () => {
        useActivityStore.getState().setActivityOpen(true);
        expect(useActivityStore.getState().isActivityOpen).toBe(true);

        useActivityStore.getState().toggleActivity();
        expect(useActivityStore.getState().isActivityOpen).toBe(false);
    });

    it("appends timeline entries via updatePhase", () => {
        const id = useActivityStore.getState().trackTransaction({
            agentName: "Planner",
            agentId: "stellar-payment-planner",
            action: "Create payment",
            chainId: 148,
            chainName: "Stellar Testnet",
        });

        useActivityStore.getState().updatePhase(id, "awaiting_signature", "waiting on wallet");

        const tx = useActivityStore.getState().transactions[0];
        expect(tx.phase).toBe("awaiting_signature");
        expect(tx.timeline).toHaveLength(2);
        expect(tx.timeline[1].detail).toContain("wallet");
    });

    it("does not mutate transactions for unknown tracking ids", () => {
        const id = useActivityStore.getState().trackTransaction({
            agentName: "Gateway",
            agentId: "stellar-x402-gateway",
            action: "Settle",
            chainId: 148,
            chainName: "Stellar Testnet",
        });

        useActivityStore.getState().setTxHash("missing", "HASH", "https://example.com");
        useActivityStore.getState().confirmTransaction("missing", { blockNumber: 1 });
        useActivityStore.getState().failTransaction("missing", "boom");

        const tx = useActivityStore.getState().transactions.find((t) => t.id === id);
        expect(tx?.phase).toBe("preparing");
        expect(tx?.txHash).toBeNull();
        expect(tx?.timeline).toHaveLength(1);
    });
});
