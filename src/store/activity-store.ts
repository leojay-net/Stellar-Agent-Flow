// ============================================================
// AgentFlow — Transaction Activity Tracker Store
// Tracks the full lifecycle of Stellar transactions:
//   pending → confirmed → finalized  OR  pending → failed
// ============================================================

import { create } from "zustand";
import { generateId } from "@/lib/utils";

export type TxPhase =
    | "preparing"     // Agent is building the transaction intent
    | "awaiting_signature"  // Waiting for user to sign in wallet
    | "pending"       // Submitted to mempool, waiting for inclusion
    | "confirmed"     // Included in a block
    | "failed"        // Reverted or user rejected
    | "cancelled";    // User cancelled before signing

export interface TrackedTransaction {
    id: string;
    /** Which agent produced this transaction */
    agentName: string;
    agentId: string;
    /** Human-readable action description */
    action: string;
    /** Transaction details */
    txHash: string | null;
    chainId: number;
    chainName: string;
    /** Addresses */
    from: string | null;
    to: string | null;
    /** Value transferred (in XLM / native asset) */
    valueEth: string | null;
    /** Current phase in the lifecycle */
    phase: TxPhase;
    /** Block number if confirmed */
    blockNumber: number | null;
    /** Gas used if confirmed */
    gasUsed: string | null;
    /** Timestamps for each phase transition */
    timeline: { phase: TxPhase; timestamp: Date; detail?: string }[];
    /** Explorer URL */
    explorerUrl: string | null;
    /** Error message if failed */
    errorMessage: string | null;
    /** Created at */
    createdAt: Date;
}

export interface ActivityStore {
    transactions: TrackedTransaction[];
    isActivityOpen: boolean;

    // Actions
    setActivityOpen: (open: boolean) => void;
    toggleActivity: () => void;

    /** Create a new tracked transaction in "preparing" phase */
    trackTransaction: (opts: {
        agentName: string;
        agentId: string;
        action: string;
        chainId: number;
        chainName: string;
        to?: string;
        from?: string;
        valueEth?: string;
    }) => string; // returns the tracking ID

    /** Update phase of a tracked transaction */
    updatePhase: (trackingId: string, phase: TxPhase, detail?: string) => void;

    /** Set the tx hash once submitted */
    setTxHash: (trackingId: string, txHash: string, explorerUrl: string) => void;

    /** Mark as confirmed with block info */
    confirmTransaction: (trackingId: string, opts: {
        blockNumber: number;
        gasUsed?: string;
    }) => void;

    /** Mark as failed */
    failTransaction: (trackingId: string, errorMessage: string) => void;

    /** Clear all transactions */
    clearActivity: () => void;
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
    transactions: [],
    isActivityOpen: false,

    setActivityOpen: (open) => set({ isActivityOpen: open }),
    toggleActivity: () => set((s) => ({ isActivityOpen: !s.isActivityOpen })),

    trackTransaction: (opts) => {
        const id = generateId("tx");
        const now = new Date();
        const tx: TrackedTransaction = {
            id,
            agentName: opts.agentName,
            agentId: opts.agentId,
            action: opts.action,
            txHash: null,
            chainId: opts.chainId,
            chainName: opts.chainName,
            from: opts.from ?? null,
            to: opts.to ?? null,
            valueEth: opts.valueEth ?? null,
            phase: "preparing",
            blockNumber: null,
            gasUsed: null,
            timeline: [{ phase: "preparing", timestamp: now }],
            explorerUrl: null,
            errorMessage: null,
            createdAt: now,
        };
        set((s) => ({
            transactions: [tx, ...s.transactions],
            isActivityOpen: true,
        }));
        return id;
    },

    updatePhase: (trackingId, phase, detail) => {
        set((s) => ({
            transactions: s.transactions.map((tx) =>
                tx.id === trackingId
                    ? {
                        ...tx,
                        phase,
                        timeline: [...tx.timeline, { phase, timestamp: new Date(), detail }],
                    }
                    : tx
            ),
        }));
    },

    setTxHash: (trackingId, txHash, explorerUrl) => {
        set((s) => ({
            transactions: s.transactions.map((tx) =>
                tx.id === trackingId
                    ? {
                        ...tx,
                        txHash,
                        explorerUrl,
                        phase: "pending" as TxPhase,
                        timeline: [...tx.timeline, { phase: "pending" as TxPhase, timestamp: new Date(), detail: `Tx: ${txHash.slice(0, 10)}…` }],
                    }
                    : tx
            ),
        }));
    },

    confirmTransaction: (trackingId, opts) => {
        set((s) => ({
            transactions: s.transactions.map((tx) =>
                tx.id === trackingId
                    ? {
                        ...tx,
                        phase: "confirmed" as TxPhase,
                        blockNumber: opts.blockNumber,
                        gasUsed: opts.gasUsed ?? null,
                        timeline: [
                            ...tx.timeline,
                            {
                                phase: "confirmed" as TxPhase,
                                timestamp: new Date(),
                                detail: `Block #${opts.blockNumber}${opts.gasUsed ? ` · Gas: ${opts.gasUsed}` : ""}`,
                            },
                        ],
                    }
                    : tx
            ),
        }));
    },

    failTransaction: (trackingId, errorMessage) => {
        set((s) => ({
            transactions: s.transactions.map((tx) =>
                tx.id === trackingId
                    ? {
                        ...tx,
                        phase: "failed" as TxPhase,
                        errorMessage,
                        timeline: [
                            ...tx.timeline,
                            { phase: "failed" as TxPhase, timestamp: new Date(), detail: errorMessage },
                        ],
                    }
                    : tx
            ),
        }));
    },

    clearActivity: () => set({ transactions: [] }),
}));
