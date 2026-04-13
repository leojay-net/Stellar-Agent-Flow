"use client";

// ============================================================
// Activity Panel — Real-time transaction tracker sidebar
// Shows full lifecycle of every on-chain action:
//   preparing → awaiting_signature → pending → confirmed/failed
// ============================================================

import { useRef, useEffect } from "react";
import {
    X, Trash2, ExternalLink, Loader2,
    CheckCircle2, XCircle, Clock, Wallet,
    ArrowUpRight, ShieldCheck, AlertTriangle,
    Send, Pen,
} from "lucide-react";
import { useActivityStore, type TxPhase, type TrackedTransaction } from "@/store/activity-store";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils";

// ── Phase badge config ────────────────────────────────────────────────────────
const PHASE_CONFIG: Record<TxPhase, {
    icon: React.ReactNode;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    animate?: boolean;
}> = {
    preparing: {
        icon: <Wallet size={11} />,
        label: "Preparing",
        color: "text-zinc-400",
        bgColor: "bg-zinc-500/10",
        borderColor: "border-zinc-700/50",
    },
    awaiting_signature: {
        icon: <Pen size={11} />,
        label: "Sign in Wallet",
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-700/30",
        animate: true,
    },
    pending: {
        icon: <Loader2 size={11} className="animate-spin" />,
        label: "Pending",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-700/30",
        animate: true,
    },
    confirmed: {
        icon: <CheckCircle2 size={11} />,
        label: "Confirmed",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-700/30",
    },
    failed: {
        icon: <XCircle size={11} />,
        label: "Failed",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-700/30",
    },
    cancelled: {
        icon: <AlertTriangle size={11} />,
        label: "Cancelled",
        color: "text-zinc-500",
        bgColor: "bg-zinc-500/10",
        borderColor: "border-zinc-700/50",
    },
};

// ── Single transaction card ───────────────────────────────────────────────────
function TransactionCard({ tx }: { tx: TrackedTransaction }) {
    const config = PHASE_CONFIG[tx.phase];

    return (
        <div className={cn(
            "border rounded-lg overflow-hidden transition-all duration-200",
            config.borderColor,
            tx.phase === "pending" && "shadow-[0_0_0_1px_rgba(59,130,246,0.15)]",
            tx.phase === "confirmed" && "shadow-[0_0_0_1px_rgba(16,185,129,0.15)]",
        )}>
            {/* Card header */}
            <div className={cn("px-3 py-2 flex items-center gap-2", config.bgColor)}>
                <span className={config.color}>{config.icon}</span>
                <span className={cn("text-[11px] font-medium flex-1", config.color)}>
                    {config.label}
                </span>
                <span className="text-[10px] text-zinc-600">
                    {formatTimestamp(tx.createdAt)}
                </span>
            </div>

            {/* Card body */}
            <div className="px-3 py-2.5 bg-[#1c1c1f] space-y-2">
                {/* Action */}
                <div className="flex items-start gap-2">
                    <ArrowUpRight size={11} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-zinc-200 font-medium">{tx.action}</p>
                        <p className="text-[10px] text-zinc-500">{tx.agentName}</p>
                    </div>
                </div>

                {/* Value */}
                {tx.valueEth && (
                    <div className="flex items-center gap-2">
                        <Send size={10} className="text-zinc-600" />
                        <span className="text-[11px] text-zinc-300 font-mono">{tx.valueEth} XLM</span>
                        <span className="text-[10px] text-zinc-600">on {tx.chainName}</span>
                    </div>
                )}

                {/* Addresses */}
                {tx.to && (
                    <p className="text-[10px] text-zinc-600 font-mono">
                        To: {tx.to.slice(0, 10)}…{tx.to.slice(-6)}
                    </p>
                )}

                {/* Block info */}
                {tx.blockNumber && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80">
                        <ShieldCheck size={10} />
                        Block #{tx.blockNumber.toLocaleString()}
                        {tx.gasUsed && <span className="text-zinc-600">· Gas: {Number(tx.gasUsed).toLocaleString()}</span>}
                    </div>
                )}

                {/* Error */}
                {tx.errorMessage && (
                    <p className="text-[10px] text-red-400 break-words">{tx.errorMessage}</p>
                )}

                {/* Explorer link */}
                {tx.explorerUrl && (
                    <a
                        href={tx.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <ExternalLink size={9} />
                        View on Explorer
                    </a>
                )}

                {/* Tx hash */}
                {tx.txHash && (
                    <p className="text-[9px] text-zinc-700 font-mono break-all">
                        {tx.txHash}
                    </p>
                )}
            </div>

            {/* Timeline */}
            <div className="px-3 py-2 bg-[#18181b] border-t border-zinc-800/60">
                <div className="flex flex-col gap-1">
                    {tx.timeline.map((step, i) => {
                        const stepConfig = PHASE_CONFIG[step.phase];
                        return (
                            <div key={i} className="flex items-center gap-2">
                                {/* Timeline connector */}
                                <div className="flex flex-col items-center w-3">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                        step.phase === "confirmed" && "bg-emerald-500",
                                        step.phase === "failed" && "bg-red-500",
                                        step.phase === "pending" && "bg-blue-500",
                                        step.phase === "awaiting_signature" && "bg-amber-500",
                                        step.phase === "preparing" && "bg-zinc-600",
                                        step.phase === "cancelled" && "bg-zinc-600",
                                    )} />
                                    {i < tx.timeline.length - 1 && (
                                        <div className="w-px h-2 bg-zinc-800 mt-0.5" />
                                    )}
                                </div>
                                <span className={cn("text-[9px]", stepConfig.color)}>
                                    {stepConfig.label}
                                </span>
                                <span className="text-[9px] text-zinc-700">
                                    {formatTimestamp(step.timestamp)}
                                </span>
                                {step.detail && (
                                    <span className="text-[9px] text-zinc-600 truncate flex-1">
                                        {step.detail}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Main Activity Panel ───────────────────────────────────────────────────────
export default function ActivityPanel() {
    const { transactions, isActivityOpen, toggleActivity, clearActivity } = useActivityStore();
    const topRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isActivityOpen && topRef.current) {
            topRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [transactions, isActivityOpen]);

    if (!isActivityOpen) return null;

    const pendingCount = transactions.filter((t) => t.phase === "pending" || t.phase === "awaiting_signature").length;
    const confirmedCount = transactions.filter((t) => t.phase === "confirmed").length;

    return (
        <div className="w-80 bg-[#1c1c1f] border-l border-zinc-800 flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-zinc-100">Activity</span>
                        {pendingCount > 0 && (
                            <span className="text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded-full font-medium animate-pulse">
                                {pendingCount} pending
                            </span>
                        )}
                        {confirmedCount > 0 && (
                            <span className="text-[10px] bg-emerald-600/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                                {confirmedCount} ✓
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-0.5">On-chain transaction tracker</p>
                </div>
                <button
                    onClick={clearActivity}
                    className="text-zinc-600 hover:text-zinc-400 p-1 rounded transition-colors mr-1"
                    title="Clear activity"
                >
                    <Trash2 size={12} />
                </button>
                <button
                    onClick={toggleActivity}
                    className="text-zinc-600 hover:text-zinc-400 p-1 rounded transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Transaction list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                <div ref={topRef} />
                {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                        <Clock size={24} className="text-zinc-700 mb-2" />
                        <p className="text-[12px] text-zinc-600">No transactions yet</p>
                        <p className="text-[10px] text-zinc-700 mt-1 max-w-[200px]">
                            Run a flow with tx_ready agents, then sign to see transactions tracked here.
                        </p>
                    </div>
                ) : (
                    transactions.map((tx) => <TransactionCard key={tx.id} tx={tx} />)
                )}
            </div>

            {/* Footer stats */}
            {transactions.length > 0 && (
                <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center gap-3 text-[10px] text-zinc-600">
                    <span>{transactions.length} total</span>
                    {confirmedCount > 0 && <span className="text-emerald-500">{confirmedCount} confirmed</span>}
                    {transactions.filter((t) => t.phase === "failed").length > 0 && (
                        <span className="text-red-500">{transactions.filter((t) => t.phase === "failed").length} failed</span>
                    )}
                </div>
            )}
        </div>
    );
}
