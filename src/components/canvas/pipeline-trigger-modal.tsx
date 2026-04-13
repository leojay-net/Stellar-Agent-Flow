"use client";

import { useState, useMemo, useEffect } from "react";
import { Play, X, ArrowRight, ChevronRight, Zap, Wallet, Coins, CheckCircle2 } from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { buildTopologicalOrder } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/data/agent-registry";
import { cn } from "@/lib/utils";

// ── Icon for each category dot ────────────────────────────────────────────────
function CategoryDot({ category }: { category: string }) {
    const color = CATEGORY_COLORS[category] ?? "#3b82f6";
    return (
        <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: color }}
        />
    );
}

export default function PipelineTriggerModal() {
    const {
        nodes,
        edges,
        flowName,
        pipelineTriggerOpen,
        setPipelineTriggerOpen,
        runFlow,
        flowStatus,
        connectedAddress,
    } = useFlowStore();

    // Global inputs injected into every agent that has a matching param name
    const [walletAddress, setWalletAddress] = useState(
        process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? ""
    );
    const [initialAmount, setInitialAmount] = useState("");
    const [amountUnit, setAmountUnit] = useState("XLM");

    // Auto-fill wallet address from connected wallet
    useEffect(() => {
        if (connectedAddress) {
            setWalletAddress(connectedAddress);
        }
    }, [connectedAddress]);

    // Build the ordered list of nodes for the preview
    const orderedNodes = useMemo(() => {
        if (nodes.length === 0) return [];
        const orderedIds = buildTopologicalOrder(
            nodes.map((n) => n.id),
            edges
        );
        return orderedIds
            .map((id) => nodes.find((n) => n.id === id))
            .filter(Boolean) as typeof nodes;
    }, [nodes, edges]);

    if (!pipelineTriggerOpen) return null;

    const handleExecute = () => {
        const globalParams: Record<string, string> = {};

        // Inject wallet address into every common param name agents use
        if (walletAddress.trim()) {
            const walletKeys = ["walletAddress", "wallet_address", "address", "userAddress"];
            for (const k of walletKeys) globalParams[k] = walletAddress.trim();
        }

        // Inject amount into every common param name
        if (initialAmount.trim()) {
            const amountKeys = ["amountIn", "amount", "initialAmount", "paymentAmount", "minimumAmount"];
            for (const k of amountKeys) globalParams[k] = initialAmount.trim();
        }

        runFlow({ globalParams });
    };

    const isRunning = flowStatus === "running";

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setPipelineTriggerOpen(false); }}
        >
            <div className="w-[440px] max-h-[90vh] flex flex-col bg-[#1c1c1f] border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center px-5 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                            <Zap size={13} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-zinc-100">Run Pipeline</p>
                            <p className="text-[10px] text-zinc-500">{flowName} · {orderedNodes.length} agent{orderedNodes.length !== 1 ? "s" : ""} · sequential</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setPipelineTriggerOpen(false)}
                        className="text-zinc-600 hover:text-zinc-400 p-1 rounded transition-colors"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* ── Pipeline order preview ── */}
                <div className="px-5 py-4 border-b border-zinc-800/60 overflow-y-auto max-h-48">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Execution Order</p>
                    <div className="flex flex-col gap-1.5">
                        {orderedNodes.map((node, i) => (
                            <div key={node.id} className="flex items-start gap-2.5">
                                {/* Step number */}
                                <span className="text-[10px] text-zinc-600 w-4 text-right flex-shrink-0 mt-0.5">
                                    {i + 1}
                                </span>
                                {/* Connector */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <CategoryDot category={node.data.category} />
                                    {i < orderedNodes.length - 1 && (
                                        <div className="w-px flex-1 min-h-[10px] bg-zinc-800 mt-1" />
                                    )}
                                </div>
                                {/* Agent info */}
                                <div className="flex items-center gap-2 pb-2 flex-1 min-w-0">
                                    <span className="text-[12px] text-zinc-300 font-medium truncate">
                                        {node.data.agentName}
                                    </span>
                                    <span className="text-[10px] text-zinc-600 flex-shrink-0">
                                        {node.data.sponsor}
                                    </span>
                                </div>
                                {/* Arrow to next */}
                                {i < orderedNodes.length - 1 && (
                                    <ChevronRight size={11} className="text-zinc-700 flex-shrink-0 mt-0.5" />
                                )}
                            </div>
                        ))}
                        {orderedNodes.length === 0 && (
                            <p className="text-[12px] text-zinc-600">No agents on canvas yet.</p>
                        )}
                    </div>
                </div>

                {/* ── Global inputs ── */}
                <div className="px-5 py-4 space-y-3 border-b border-zinc-800/60">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                        Global Inputs <span className="text-zinc-700 normal-case">(optional — applied to all agents)</span>
                    </p>

                    {/* Wallet address */}
                    <div>
                        <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1.5">
                            <Wallet size={11} />
                            Wallet Address
                            {connectedAddress && (
                                <span className="flex items-center gap-1 text-emerald-400 ml-auto">
                                    <CheckCircle2 size={10} />
                                    Connected
                                </span>
                            )}
                        </label>
                        <input
                            type="text"
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                            placeholder="G... (paste Stellar account or use toolbar value)"
                            className={cn(
                                "w-full bg-zinc-900 border rounded-md px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors font-mono",
                                connectedAddress
                                    ? "border-emerald-700/50 focus:border-emerald-500/60"
                                    : "border-zinc-700 focus:border-blue-500/60"
                            )}
                        />
                    </div>

                    {/* Initial amount */}
                    <div>
                        <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1.5">
                            <Coins size={11} />
                            Initial Amount
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={initialAmount}
                                onChange={(e) => setInitialAmount(e.target.value)}
                                placeholder="0.001"
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/60 transition-colors"
                            />
                            <select
                                value={amountUnit}
                                onChange={(e) => setAmountUnit(e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-2 text-[12px] text-zinc-300 focus:outline-none focus:border-blue-500/60 transition-colors"
                            >
                                <option value="XLM">XLM</option>
                                <option value="USDC">USDC</option>
                                <option value="AQUA">AQUA</option>
                                <option value="EURC">EURC</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ── Output chaining notice ── */}
                <div className="px-5 py-3 border-b border-zinc-800/60">
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <ArrowRight size={11} className="text-emerald-500 flex-shrink-0" />
                        <span>
                            Each agent&apos;s output is automatically passed as context to the next agent in the pipeline.
                        </span>
                    </div>
                </div>

                {/* ── Footer actions ── */}
                <div className="flex items-center justify-between px-5 py-4 gap-3">
                    <button
                        onClick={() => setPipelineTriggerOpen(false)}
                        className="px-4 py-2 text-[12px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExecute}
                        disabled={orderedNodes.length === 0 || isRunning}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2 text-[13px] font-medium rounded-md transition-colors",
                            orderedNodes.length === 0 || isRunning
                                ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-500 text-white"
                        )}
                    >
                        <Play size={12} />
                        Execute Pipeline
                    </button>
                </div>
            </div>
        </div>
    );
}
