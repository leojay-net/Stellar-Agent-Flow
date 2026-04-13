"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Bot, User, Loader2, Sparkles, Play, Terminal } from "lucide-react";
import { useFlowStore } from "@/store/flow-store";
import { AGENT_REGISTRY } from "@/data/agent-registry";
import { cn } from "@/lib/utils";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    agentResult?: Record<string, unknown>;
    action?: string | null;
    agentId?: string | null;
    model?: string;
    timestamp: Date;
}

const QUICK_ACTIONS = [
    { label: "Build Stellar pipeline", message: "Build me a Stellar workflow with Horizon reader, AI analysis, and payment planner" },
    { label: "Build federation flow", message: "Create a federation resolution flow with Stellar account checks" },
    { label: "Run my flow", message: "Run the pipeline on the canvas" },
    { label: "Plan XLM payment", message: "Create a payment intent from one Stellar account to another for 10 XLM" },
    { label: "Check XLM price", message: "Get the current XLM/USD price" },
];

function renderMarkdown(text: string) {
    // Minimal markdown: bold, code blocks, inline code, line breaks
    return text
        .split(/```(\w*)\n([\s\S]*?)```/g)
        .map((part, i) => {
            if (i % 3 === 2) {
                // Code block content
                return (
                    <pre
                        key={i}
                        className="bg-zinc-900 border border-zinc-700/50 rounded-md px-3 py-2 text-[11px] overflow-x-auto my-2 text-emerald-300 font-mono whitespace-pre-wrap break-all"
                    >
                        {part}
                    </pre>
                );
            }
            if (i % 3 === 1) return null; // language identifier
            // Regular text: process bold, inline code, newlines
            return (
                <span key={i}>
                    {part.split("\n").map((line, li) => (
                        <span key={li}>
                            {li > 0 && <br />}
                            {line.split(/(\*\*.*?\*\*|`[^`]+`)/g).map((seg, si) => {
                                if (seg.startsWith("**") && seg.endsWith("**"))
                                    return <strong key={si} className="text-zinc-100 font-semibold">{seg.slice(2, -2)}</strong>;
                                if (seg.startsWith("`") && seg.endsWith("`"))
                                    return <code key={si} className="bg-zinc-800 text-blue-300 px-1 py-0.5 rounded text-[11px]">{seg.slice(1, -1)}</code>;
                                return <span key={si}>{seg}</span>;
                            })}
                        </span>
                    ))}
                </span>
            );
        });
}

export default function ChatPanel() {
    const {
        isChatOpen,
        setChatOpen,
        runFlow,
        clearCanvas,
        addAgentToCanvas,
        onConnect,
        setFlowName,
        updateNodeParameter,
    } = useFlowStore();

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "\ud83d\udc4b **Hey! I\u2019m your AgentFlow assistant.**\n\nI can help you run Stellar-native agents, execute your pipeline, and build workflows on the canvas in real-time.\n\nTry one of the quick actions below, or just type!",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (isChatOpen) inputRef.current?.focus();
    }, [isChatOpen]);

    const conversationHistory = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

    /* ── Build flow on canvas progressively (real-time) ─────────── */
    const buildFlowOnCanvas = useCallback(
        async (flowData: {
            flowName: string;
            agents: { id: string; params?: Record<string, string> }[];
            connections: [number, number][];
        }) => {
            clearCanvas();
            setFlowName(flowData.flowName);

            const buildMsgId = `build-${Date.now()}`;
            const nodeIds: string[] = [];

            const updateBuildMsg = (content: string) => {
                setMessages((prev) => {
                    const idx = prev.findIndex((m) => m.id === buildMsgId);
                    if (idx >= 0) {
                        const updated = [...prev];
                        updated[idx] = { ...updated[idx], content };
                        return updated;
                    }
                    return [
                        ...prev,
                        { id: buildMsgId, role: "assistant" as const, content, timestamp: new Date() },
                    ];
                });
            };

            for (let i = 0; i < flowData.agents.length; i++) {
                const agentSpec = flowData.agents[i];
                const agentDef = AGENT_REGISTRY.find((a) => a.id === agentSpec.id);
                if (!agentDef) continue;

                const done = nodeIds
                    .map((_, j) => {
                        const d = AGENT_REGISTRY.find((a) => a.id === flowData.agents[j].id);
                        return `\u2705 ${d?.name ?? flowData.agents[j].id}`;
                    })
                    .join("\n");

                updateBuildMsg(
                    `\ud83d\udd28 **Building \"${flowData.flowName}\"**\n\n${done}${done ? "\n" : ""}\u23f3 Adding **${agentDef.name}**\u2026`,
                );

                // Layout: up to 4 columns, then wrap to next row
                const cols = Math.min(flowData.agents.length, 4);
                const row = Math.floor(i / cols);
                const col = i % cols;
                addAgentToCanvas(agentDef, { x: 100 + col * 280, y: 150 + row * 220 });

                // Apply custom params if specified
                if (agentSpec.params) {
                    const latestNodes = useFlowStore.getState().nodes;
                    const newNode = latestNodes[latestNodes.length - 1];
                    for (const [key, value] of Object.entries(agentSpec.params)) {
                        updateNodeParameter(newNode.id, key, value);
                    }
                }

                const latestNodes = useFlowStore.getState().nodes;
                nodeIds.push(latestNodes[latestNodes.length - 1].id);
                await new Promise<void>((r) => setTimeout(r, 500));
            }

            // Wire up connections with a short delay between each
            for (const [fromIdx, toIdx] of flowData.connections) {
                if (nodeIds[fromIdx] && nodeIds[toIdx]) {
                    onConnect({
                        source: nodeIds[fromIdx],
                        target: nodeIds[toIdx],
                        sourceHandle: null,
                        targetHandle: null,
                    });
                    await new Promise<void>((r) => setTimeout(r, 250));
                }
            }

            const names = flowData.agents
                .map((a) => {
                    const d = AGENT_REGISTRY.find((d2) => d2.id === a.id);
                    return `\u2705 ${d?.name ?? a.id}`;
                })
                .join("\n");

            updateBuildMsg(
                `\ud83c\udf89 **Pipeline \"${flowData.flowName}\" ready!**\n\n${names}\n\n\ud83d\udd17 ${flowData.connections.length} connection(s) made.\n\nSay **\"run the pipeline\"** or click **Run Flow** to execute.`,
            );
        },
        [clearCanvas, setFlowName, addAgentToCanvas, updateNodeParameter, onConnect],
    );

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isLoading) return;

            const userMsg: ChatMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content: trimmed,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMsg]);
            setInput("");
            setIsLoading(true);

            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: trimmed,
                        conversationHistory,
                    }),
                });

                const data = await res.json() as {
                    reply?: string;
                    error?: string;
                    action?: string;
                    agentId?: string;
                    agentResult?: Record<string, unknown>;
                    model?: string;
                    flowData?: {
                        flowName: string;
                        agents: { id: string; params?: Record<string, string> }[];
                        connections: [number, number][];
                    };
                    connectFrom?: string;
                };

                // Handle run_pipeline action from the LLM
                if (data.action === "run_pipeline") {
                    runFlow();
                }

                // Handle build_flow — progressive canvas building in real-time
                if (data.action === "build_flow" && data.flowData) {
                    const buildReplyMsg: ChatMessage = {
                        id: `assistant-${Date.now()}`,
                        role: "assistant",
                        content: data.reply || "Building your workflow\u2026",
                        action: data.action,
                        model: data.model,
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, buildReplyMsg]);
                    await buildFlowOnCanvas(data.flowData);
                    return; // finally block handles setIsLoading(false)
                }

                // Handle add_agent — add single agent to existing canvas
                if (data.action === "add_agent" && data.agentId) {
                    const agentDef = AGENT_REGISTRY.find((a) => a.id === data.agentId);
                    if (agentDef) {
                        const storeState = useFlowStore.getState();
                        const existingNodes = storeState.nodes;
                        const maxX = existingNodes.length > 0
                            ? Math.max(...existingNodes.map((n) => n.position.x))
                            : -180;
                        const avgY = existingNodes.length > 0
                            ? existingNodes.reduce((s, n) => s + n.position.y, 0) / existingNodes.length
                            : 200;
                        addAgentToCanvas(agentDef, { x: maxX + 280, y: avgY });

                        if (data.connectFrom) {
                            const updatedNodes = useFlowStore.getState().nodes;
                            const newNode = updatedNodes[updatedNodes.length - 1];
                            const sourceNode = updatedNodes.find(
                                (n) => n.data.agentId === data.connectFrom,
                            );
                            if (sourceNode && newNode) {
                                onConnect({
                                    source: sourceNode.id,
                                    target: newNode.id,
                                    sourceHandle: null,
                                    targetHandle: null,
                                });
                            }
                        }
                    }
                }

                const assistantMsg: ChatMessage = {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: data.reply || data.error || "No response.",
                    agentResult: data.agentResult ?? undefined,
                    action: data.action,
                    agentId: data.agentId,
                    model: data.model,
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
            } catch (err) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `error-${Date.now()}`,
                        role: "assistant",
                        content: `⚠️ ${err instanceof Error ? err.message : "Connection failed"}`,
                        timestamp: new Date(),
                    },
                ]);
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, conversationHistory, runFlow, buildFlowOnCanvas, addAgentToCanvas, onConnect],
    );

    if (!isChatOpen) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-[420px] h-[620px] flex flex-col bg-[#1c1c1f] border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-center gap-2.5 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                        <Sparkles size={13} className="text-violet-400" />
                    </div>
                    <div>
                        <p className="text-[13px] font-semibold text-zinc-100">Agent X</p>
                        <p className="text-[10px] text-zinc-500">Your AI co-pilot for Stellar workflows</p>
                    </div>
                </div>
                <button
                    onClick={() => setChatOpen(false)}
                    className="text-zinc-600 hover:text-zinc-400 p-1 rounded transition-colors"
                >
                    <X size={15} />
                </button>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={cn(
                            "flex gap-2.5",
                            msg.role === "user" ? "justify-end" : "justify-start",
                        )}
                    >
                        {msg.role === "assistant" && (
                            <div className="w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Bot size={12} className="text-violet-400" />
                            </div>
                        )}
                        <div
                            className={cn(
                                "max-w-[85%] px-3 py-2.5 rounded-lg text-[12px] leading-relaxed",
                                msg.role === "user"
                                    ? "bg-blue-600/90 text-white rounded-br-sm"
                                    : "bg-zinc-800/80 text-zinc-300 rounded-bl-sm border border-zinc-700/40",
                            )}
                        >
                            {msg.role === "assistant" ? (
                                <div className="space-y-1">{renderMarkdown(msg.content)}</div>
                            ) : (
                                msg.content
                            )}
                            {/* Action badge */}
                            {msg.agentId && (
                                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-700/40">
                                    <Terminal size={10} className="text-emerald-400" />
                                    <span className="text-[10px] text-emerald-400 font-mono">{msg.agentId}</span>
                                </div>
                            )}
                            {/* Agent X badge */}
                            {msg.model && (
                                <div className="text-[9px] text-violet-500/60 mt-1 text-right font-medium">Agent X</div>
                            )}
                        </div>
                        {msg.role === "user" && (
                            <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <User size={12} className="text-blue-400" />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-2 text-zinc-500">
                        <div className="w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                            <Bot size={12} className="text-violet-400" />
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-800/80 px-3 py-2 rounded-lg border border-zinc-700/40">
                            <Loader2 size={12} className="animate-spin text-violet-400" />
                            <span className="text-[11px] text-zinc-500">Thinking…</span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* ── Quick actions ── */}
            {messages.length <= 2 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                    {QUICK_ACTIONS.map((qa) => (
                        <button
                            key={qa.label}
                            onClick={() => sendMessage(qa.message)}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-[11px] text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
                        >
                            <Play size={9} />
                            {qa.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Input ── */}
            <div className="px-4 py-3 border-t border-zinc-800 flex-shrink-0">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(input);
                            }
                        }}
                        placeholder="Tell your agents what to do…"
                        disabled={isLoading}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                    />
                    <button
                        onClick={() => sendMessage(input)}
                        disabled={isLoading || !input.trim()}
                        className={cn(
                            "p-2 rounded-md transition-colors flex-shrink-0",
                            !input.trim() || isLoading
                                ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                : "bg-violet-600 hover:bg-violet-500 text-white",
                        )}
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
