"use client";

import { useState } from "react";
import { X, Trash2, Zap, MessageSquare, ChevronDown, AlertCircle, RefreshCw } from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { AGENT_REGISTRY, CATEGORY_COLORS } from "@/data/agent-registry";
import { cn } from "@/lib/utils";

type InspectorTab = "params" | "negotiate" | "result";

export default function InspectorPanel() {
    const {
        nodes,
        edges,
        selectedNodeId,
        inspectorOpen,
        setInspectorOpen,
        updateNodeParameter,
        removeNode,
        runNegotiation,
        isNegotiating,
        negotiationSession,
        clearNegotiation,
        policyCheckByNode,
        checkOnchainPolicy,
    } = useFlowStore();

    const [activeTab, setActiveTab] = useState<InspectorTab>("params");
    const [isSigning, setIsSigning] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [txError, setTxError] = useState<string | null>(null);

    const handleSignAndSubmit = async (transaction: any) => {
        setIsSigning(true);
        setTxHash(null);
        setTxError(null);

        try {
            const { Horizon, TransactionBuilder, Asset, Networks, Operation } = await import("@stellar/stellar-sdk");
            const { signTransaction, getNetwork } = await import("@stellar/freighter-api");

            const net = await getNetwork();
            const networkPassphrase = net.networkPassphrase ?? Networks.TESTNET;

            const server = new Horizon.Server(
                networkPassphrase === Networks.TESTNET
                    ? "https://horizon-testnet.stellar.org"
                    : "https://horizon.stellar.org"
            );

            let sourceAccount;
            try {
                sourceAccount = await server.loadAccount(transaction.source);
            } catch (err) {
                throw new Error("Source account not found on network. It might not be funded.");
            }

            const isNative = transaction.assetCode === "XLM" || !transaction.assetCode;
            const asset = isNative
                ? Asset.native()
                : new Asset(transaction.assetCode, transaction.source); // Minimal custom asset assumption

            let txBuilder = new TransactionBuilder(sourceAccount, {
                fee: "100",
                networkPassphrase: networkPassphrase,
            });

            txBuilder = txBuilder.addOperation(
                Operation.payment({
                    destination: transaction.destination,
                    asset: asset,
                    amount: transaction.amount.toString(),
                })
            );

            const tx = txBuilder.setTimeout(300).build();
            const xdr = tx.toXDR();

            const signedRes = await signTransaction(xdr, {
                networkPassphrase: networkPassphrase
            });

            if (signedRes.error || !signedRes.signedTxXdr) {
                throw new Error(signedRes.error?.message || "Freighter did not return signed transaction");
            }

            setTxHash("Submitting to network...");
            const signedTxXdrStr = typeof signedRes.signedTxXdr === "string"
                ? signedRes.signedTxXdr
                : Buffer.from(signedRes.signedTxXdr as any).toString("base64");

            const signedTx = TransactionBuilder.fromXDR(signedTxXdrStr, networkPassphrase);
            const submitRes = await server.submitTransaction(signedTx as any) as any;

            if (!submitRes.successful && !submitRes.hash) {
                throw new Error("Transaction failed on network");
            }

            setTxHash(submitRes.hash || submitRes.id);

        } catch (err: any) {
            setTxError(err.message || "Failed to sign or submit transaction");
            setTxHash(null);
        } finally {
            setIsSigning(false);
        }
    };

    if (!inspectorOpen || !selectedNodeId) return null;

    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode) return null;

    const { agentId, agentName, parameterValues, executionStatus, executionResult } = selectedNode.data;
    const agentDef = AGENT_REGISTRY.find((a) => a.id === agentId);
    const categoryColor = CATEGORY_COLORS[selectedNode.data.category] ?? "#3b82f6";
    const isPaymentGateway = agentId === "stellar-x402-gateway";
    const policyState = policyCheckByNode[selectedNodeId];

    // Find adjacent connected nodes for negotiation
    const connectedNodeIds = edges
        .filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
        .map((e) => (e.source === selectedNodeId ? e.target : e.source))
        .filter((id) => id !== selectedNodeId);

    const connectedNodes = nodes.filter((n) => connectedNodeIds.includes(n.id));

    return (
        <div className="w-72 bg-[#27272a] border-l border-zinc-800 flex flex-col flex-shrink-0">
            {/* Header */}
            <div className="flex items-center px-3 py-2.5 border-b border-zinc-800 flex-shrink-0">
                <div
                    className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: categoryColor }}
                />
                <span className="text-[12px] font-medium text-zinc-200 truncate flex-1">{agentName}</span>
                <button
                    onClick={() => {
                        removeNode(selectedNodeId);
                        setInspectorOpen(false);
                    }}
                    className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors mr-0.5"
                    title="Delete node"
                >
                    <Trash2 size={12} />
                </button>
                <button
                    onClick={() => setInspectorOpen(false)}
                    className="text-zinc-600 hover:text-zinc-400 p-1 rounded transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Agent meta */}
            <div className="px-3 py-2 border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span
                        className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide"
                        style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                    >
                        {selectedNode.data.category}
                    </span>
                    <span className="text-[10px] text-zinc-600">{selectedNode.data.sponsor}</span>
                </div>
                {agentDef && (
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{agentDef.description}</p>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 flex-shrink-0">
                {(["params", "negotiate", "result"] as InspectorTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "flex-1 py-2 text-[11px] capitalize transition-colors",
                            activeTab === tab
                                ? "text-blue-400 border-b border-blue-500"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">

                {/* Params tab */}
                {activeTab === "params" && agentDef && (
                    <div className="p-3 space-y-3">
                        {agentDef.parameters.map((param) => (
                            <div key={param.name}>
                                <label className="block text-[11px] text-zinc-400 mb-1">
                                    {param.label}
                                    {param.required && <span className="text-red-500 ml-0.5">*</span>}
                                </label>
                                {param.type === "select" && param.options ? (
                                    <div className="relative">
                                        <select
                                            value={parameterValues[param.name] ?? param.defaultValue}
                                            onChange={(e) => updateNodeParameter(selectedNodeId, param.name, e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[12px] rounded px-2 py-1.5 appearance-none outline-none focus:border-blue-500 transition-colors"
                                        >
                                            {param.options.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                    </div>
                                ) : param.type === "textarea" ? (
                                    <textarea
                                        value={parameterValues[param.name] ?? param.defaultValue}
                                        onChange={(e) => updateNodeParameter(selectedNodeId, param.name, e.target.value)}
                                        rows={3}
                                        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[12px] rounded px-2 py-1.5 outline-none focus:border-blue-500 transition-colors resize-none"
                                    />
                                ) : param.type === "boolean" ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() =>
                                                updateNodeParameter(
                                                    selectedNodeId,
                                                    param.name,
                                                    (parameterValues[param.name] ?? param.defaultValue) === "true" ? "false" : "true"
                                                )
                                            }
                                            className={cn(
                                                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                                                (parameterValues[param.name] ?? param.defaultValue) === "true"
                                                    ? "bg-blue-600"
                                                    : "bg-zinc-700"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                                                    (parameterValues[param.name] ?? param.defaultValue) === "true"
                                                        ? "translate-x-[18px]"
                                                        : "translate-x-[3px]"
                                                )}
                                            />
                                        </button>
                                        <span className="text-[12px] text-zinc-400">
                                            {(parameterValues[param.name] ?? param.defaultValue) === "true" ? "Enabled" : "Disabled"}
                                        </span>
                                    </div>
                                ) : (
                                    <input
                                        type={param.type === "number" ? "number" : "text"}
                                        value={parameterValues[param.name] ?? param.defaultValue}
                                        onChange={(e) => updateNodeParameter(selectedNodeId, param.name, e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[12px] rounded px-2 py-1.5 outline-none focus:border-blue-500 transition-colors"
                                    />
                                )}
                                <p className="text-[10px] text-zinc-600 mt-0.5">{param.description}</p>
                            </div>
                        ))}

                        {isPaymentGateway && (
                            <div className="pt-2 border-t border-zinc-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-zinc-300">Onchain Policy</span>
                                    <button
                                        data-testid="policy-check-button"
                                        onClick={() => checkOnchainPolicy(selectedNodeId)}
                                        disabled={policyState?.status === "loading"}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] transition-colors",
                                            policyState?.status === "loading"
                                                ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                                                : "bg-blue-600 hover:bg-blue-500 text-white"
                                        )}
                                    >
                                        <RefreshCw size={11} className={policyState?.status === "loading" ? "animate-spin" : ""} />
                                        {policyState?.status === "loading" ? "Checking..." : "Check"}
                                    </button>
                                </div>

                                {!policyState && (
                                    <p className="text-[10px] text-zinc-600">
                                        Validate policyContractId and policyAgentName against Soroban runtime state.
                                    </p>
                                )}

                                {policyState?.status === "error" && (
                                    <div data-testid="policy-check-error" className="rounded border border-red-800/60 bg-red-900/20 p-2 text-[10px] text-red-300">
                                        {policyState.error}
                                    </div>
                                )}

                                {policyState?.status === "success" && (
                                    <div data-testid="policy-check-success" className="rounded border border-emerald-800/60 bg-emerald-900/10 p-2 space-y-1">
                                        <div className="text-[11px] text-emerald-300">
                                            Mode: <span className="font-medium">{policyState.mode || "unavailable"}</span>
                                        </div>
                                        <div className="text-[10px] text-zinc-400">
                                            Source: {policyState.source || "unknown"}
                                        </div>
                                        {policyState.checkedAt && (
                                            <div className="text-[10px] text-zinc-500">
                                                Checked: {new Date(policyState.checkedAt).toLocaleTimeString()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Negotiate tab */}
                {activeTab === "negotiate" && (
                    <div className="p-3 space-y-3">
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Use Venice.ai LLM to negotiate parameter alignment between this agent and a connected agent.
                        </p>

                        {connectedNodes.length === 0 ? (
                            <div className="text-[11px] text-zinc-600 bg-zinc-800 rounded p-3 text-center">
                                Connect this node to another agent first.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <span className="text-[11px] text-zinc-400">Negotiate with:</span>
                                {connectedNodes.map((connNode) => (
                                    <button
                                        key={connNode.id}
                                        disabled={isNegotiating}
                                        onClick={() => runNegotiation(selectedNodeId, connNode.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded border text-[12px] transition-colors",
                                            isNegotiating
                                                ? "border-zinc-700 text-zinc-600 cursor-not-allowed"
                                                : "border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-300"
                                        )}
                                    >
                                        <MessageSquare size={12} />
                                        {connNode.data.agentName}
                                        {isNegotiating && <span className="ml-auto text-[10px] text-zinc-600">negotiating…</span>}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Negotiation result */}
                        {negotiationSession && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-zinc-400">Result</span>
                                    <button
                                        onClick={clearNegotiation}
                                        className="text-[10px] text-zinc-600 hover:text-zinc-400"
                                    >
                                        clear
                                    </button>
                                </div>
                                <div
                                    className={cn(
                                        "rounded border p-2.5 text-[11px]",
                                        negotiationSession.status === "resolved"
                                            ? "border-emerald-700/50 bg-emerald-500/5 text-emerald-300"
                                            : "border-amber-700/50 bg-amber-500/5 text-amber-300"
                                    )}
                                >
                                    <div className="font-medium mb-1 capitalize">{negotiationSession.status}</div>
                                    <div className="text-zinc-400 leading-relaxed">{negotiationSession.resolution}</div>
                                </div>

                                {/* Conversation */}
                                <div className="space-y-1.5">
                                    {negotiationSession.messages.map((msg, idx) => (
                                        <div key={idx} className="bg-zinc-800 rounded p-2">
                                            <div className="text-[10px] text-zinc-500 mb-0.5 font-medium">{msg.agentName}</div>
                                            <div className="text-[11px] text-zinc-300 leading-relaxed">{msg.content}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Result tab */}
                {activeTab === "result" && (
                    <div className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                            <div
                                className={cn(
                                    "w-2 h-2 rounded-full",
                                    executionStatus === "idle" && "bg-zinc-600",
                                    executionStatus === "running" && "bg-blue-500 animate-pulse",
                                    executionStatus === "success" && "bg-emerald-500",
                                    executionStatus === "error" && "bg-red-500"
                                )}
                            />
                            <span className="text-[12px] text-zinc-300 capitalize">{executionStatus}</span>
                            {executionStatus === "idle" && (
                                <span className="text-[10px] text-zinc-600 ml-1">— run the flow to see results</span>
                            )}
                        </div>

                        {executionResult ? (
                            <>
                                <pre className="bg-zinc-800 rounded p-2.5 text-[10px] text-zinc-300 overflow-auto max-h-64 whitespace-pre-wrap leading-relaxed">
                                    {JSON.stringify(executionResult, null, 2)}
                                </pre>
                                {executionResult.transaction && typeof executionResult.transaction === "object" && (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-700/30 rounded-md px-3 py-2">
                                            <AlertCircle size={12} />
                                            <span>Stellar payment intent ready. Sign and submit with your Stellar wallet integration.</span>
                                        </div>

                                        <button
                                            onClick={() => handleSignAndSubmit(executionResult.transaction)}
                                            disabled={isSigning}
                                            className="w-full flex justify-center items-center gap-2 py-1.5 text-[11px] font-medium bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50"
                                        >
                                            {isSigning ? "Signing..." : "Sign with Freighter"}
                                        </button>

                                        {txHash && (
                                            <div className="text-[10px] text-emerald-400 break-all bg-emerald-500/10 p-2 border border-emerald-500/20 rounded">
                                                Success! Hash:
                                                <br />
                                                <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" className="underline hover:text-emerald-300">
                                                    {txHash}
                                                </a>
                                            </div>
                                        )}
                                        {txError && (
                                            <div className="text-[10px] text-red-400 break-all bg-red-500/10 p-2 border border-red-500/20 rounded">
                                                Error: {txError}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-24 text-zinc-700 text-[12px]">
                                No result yet.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Quick run button */}
            <div className="px-3 py-2.5 border-t border-zinc-800 flex-shrink-0">
                <button
                    onClick={() => useFlowStore.getState().runFlow()}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 py-1.5 text-[12px] font-medium rounded transition-colors",
                        "bg-blue-600 hover:bg-blue-500 text-white"
                    )}
                >
                    <Zap size={12} />
                    Run Flow
                </button>
            </div>
        </div>
    );
}
