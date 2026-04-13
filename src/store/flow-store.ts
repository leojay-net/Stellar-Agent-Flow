// ============================================================
// AgentFlow — Zustand Store
// Real execution engine — calls API routes, no simulations.
// ============================================================

import { create } from "zustand";
import { type Node, type Edge, addEdge, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import type {
    CanvasNodeData,
    ExecutionLogEntry,
    FlowExecutionStatus,
    NegotiationSession,
    AgentDefinition,
    OnchainPolicyCheckState,
} from "@/types";
import { AGENT_REGISTRY } from "@/data/agent-registry";
import { buildTopologicalOrder, generateId } from "@/lib/utils";

const LS_CONNECTED_ADDRESS = "agentflow:stellar:connectedAddress";
const LS_AUTH_SESSION = "agentflow:stellar:authSession";

export interface FlowStore {
    // ── Canvas state ──────────────────────────────────────────
    nodes: Node<CanvasNodeData>[];
    edges: Edge[];
    flowId: string;
    flowName: string;

    // ── Execution state ───────────────────────────────────────
    flowStatus: FlowExecutionStatus;
    executionLog: ExecutionLogEntry[];
    isLogVisible: boolean;

    // ── Inspector state ───────────────────────────────────────
    selectedNodeId: string | null;
    inspectorOpen: boolean;
    policyCheckByNode: Record<string, OnchainPolicyCheckState>;

    // ── Negotiation state ─────────────────────────────────────
    negotiationSession: NegotiationSession | null;
    isNegotiating: boolean;

    // ── Publish modal state ───────────────────────────────────
    isPublishModalOpen: boolean;

    // ── Pipeline trigger modal ────────────────────────────────
    pipelineTriggerOpen: boolean;
    setPipelineTriggerOpen: (open: boolean) => void;

    // ── Chat panel ──────────────────────────────────────────────
    isChatOpen: boolean;
    setChatOpen: (open: boolean) => void;

    // ── Wallet connection ─────────────────────────────────────
    connectedAddress: string | null;
    setConnectedAddress: (addr: string | null) => void;
    authSessionToken: string | null;
    authExpiresAt: string | null;
    setAuthSession: (session: { token: string; expiresAt: string } | null) => void;
    hydrateClientSession: () => void;

    // ── Canvas actions ────────────────────────────────────────
    onNodesChange: (changes: Parameters<typeof applyNodeChanges>[0]) => void;
    onEdgesChange: (changes: Parameters<typeof applyEdgeChanges>[0]) => void;
    onConnect: (connection: Parameters<typeof addEdge>[0]) => void;
    addAgentToCanvas: (agent: AgentDefinition, position?: { x: number; y: number }) => void;
    updateNodeParameter: (nodeId: string, paramName: string, value: string) => void;
    removeNode: (nodeId: string) => void;
    setFlowName: (name: string) => void;

    // ── Execution actions ─────────────────────────────────────
    runFlow: (opts?: { globalParams?: Record<string, string> }) => Promise<void>;
    stopFlow: () => void;
    clearLog: () => void;
    toggleLog: () => void;

    // ── Inspector actions ─────────────────────────────────────
    selectNode: (nodeId: string | null) => void;
    setInspectorOpen: (open: boolean) => void;
    checkOnchainPolicy: (nodeId: string) => Promise<void>;

    // ── Negotiation actions ───────────────────────────────────
    runNegotiation: (nodeAId: string, nodeBId: string) => Promise<void>;
    clearNegotiation: () => void;

    // ── Publish modal ─────────────────────────────────────────
    setPublishModalOpen: (open: boolean) => void;

    // ── Flow I/O ──────────────────────────────────────────────
    loadDemoFlow: () => void;
    exportFlow: () => Promise<void>; importFlow: (json: string) => void; clearCanvas: () => void;
}

const DEMO_FLOW_NODES: Node<CanvasNodeData>[] = [
    {
        id: "node-demo-1",
        type: "agentNode",
        position: { x: 80, y: 200 },
        data: {
            agentId: "orchestrator-core",
            agentName: "Orchestrator",
            category: "core",
            iconKey: "Workflow",
            sponsor: "AgentFlow",
            label: "Orchestrator",
            parameterValues: { executionMode: "sequential", timeoutSeconds: "30" },
            executionStatus: "idle",
        },
    },
    {
        id: "node-demo-2",
        type: "agentNode",
        position: { x: 360, y: 100 },
        data: {
            agentId: "stellar-horizon-reader",
            agentName: "Horizon Reader",
            category: "chain",
            iconKey: "Activity",
            sponsor: "Stellar",
            label: "Horizon Reader",
            parameterValues: { account: "", network: "testnet" },
            executionStatus: "idle",
        },
    },
    {
        id: "node-demo-3",
        type: "agentNode",
        position: { x: 360, y: 310 },
        data: {
            agentId: "stellar-ai-reasoner",
            agentName: "Stellar AI Reasoner",
            category: "ai",
            iconKey: "BrainCircuit",
            sponsor: "AgentFlow",
            label: "Stellar AI Reasoner",
            parameterValues: {
                systemPrompt: "You are a Stellar ecosystem strategy assistant.",
                userMessage: "Given account activity, propose a payment automation strategy.",
                maxTokens: "256",
            },
            executionStatus: "idle",
        },
    },
    {
        id: "node-demo-4",
        type: "agentNode",
        position: { x: 640, y: 200 },
        data: {
            agentId: "stellar-payment-planner",
            agentName: "Payment Planner",
            category: "payments",
            iconKey: "Route",
            sponsor: "Stellar",
            label: "Payment Planner",
            parameterValues: { source: "", destination: "", amount: "1.0", assetCode: "XLM", network: "testnet" },
            executionStatus: "idle",
        },
    },
];

const DEMO_FLOW_EDGES: Edge[] = [
    { id: "edge-demo-1", source: "node-demo-1", target: "node-demo-2", type: "smoothstep" },
    { id: "edge-demo-2", source: "node-demo-1", target: "node-demo-3", type: "smoothstep" },
    { id: "edge-demo-3", source: "node-demo-2", target: "node-demo-4", type: "smoothstep" },
    { id: "edge-demo-4", source: "node-demo-3", target: "node-demo-4", type: "smoothstep" },
];

function buildSuccessSummary(result: Record<string, unknown> | undefined, ms: number): string {
    if (!result) return `Completed in ${ms}ms`;
    // Pull out a meaningful snippet from the result
    const snippets: string[] = [];
    if (typeof result.pairs === "object" && Array.isArray(result.pairs) && result.pairs.length > 0) {
        const first = result.pairs[0] as Record<string, unknown>;
        snippets.push(`${first.pair} $${first.price}`);
        if (result.pairs.length > 1) {
            const second = result.pairs[1] as Record<string, unknown>;
            snippets.push(`${second.pair} $${second.price}`);
        }
    } else if (result.totalUsd) {
        snippets.push(`$${result.totalUsd} USD`);
    } else if (result.currentAprPct) {
        snippets.push(`APR ${Number(result.currentAprPct).toFixed(2)}%`);
    } else if (result.activeProposals !== undefined) {
        snippets.push(`${result.activeProposals} active proposals`);
    } else if (result.status) {
        snippets.push(String(result.status));
    } else if (result.action) {
        snippets.push(String(result.action));
    }

    // Flag transaction-ready results
    if (result.status === "tx_ready") {
        snippets.push("🔐 READY TO SIGN — click agent → Result tab");
    } else if (result.status === "submitted_via_bankr") {
        snippets.push("📤 Submitted via Bankr");
    } else if (result.status === "calldata_prepared" || result.calldata) {
        snippets.push("📋 Calldata prepared — sign to execute");
    }

    // Show action context for DeFi agents
    if (result.action === "stellar_account_read" && result.account) {
        snippets.push(`Account ${String(result.account).slice(0, 8)}...`);
    }
    if (result.action === "stellar_payment_plan" && result.transaction) {
        snippets.push("Stellar payment intent ready");
    }

    const summary = snippets.length > 0 ? ` — ${snippets.join(", ")}` : "";
    return `Completed in ${ms}ms${summary}`;
}

function addLog(
    state: Pick<FlowStore, "executionLog" | "flowId">,
    level: ExecutionLogEntry["level"],
    agentName: string,
    message: string,
    data?: Record<string, unknown>
): ExecutionLogEntry[] {
    const entry: ExecutionLogEntry = {
        id: generateId(),
        timestamp: new Date(),
        agentName,
        message,
        level,
        data,
    };
    return [...state.executionLog, entry];
}

export const useFlowStore = create<FlowStore>((set, get) => ({
    nodes: [],
    edges: [],
    flowId: generateId(),
    flowName: "Untitled Flow",
    flowStatus: "idle",
    executionLog: [],
    isLogVisible: false,
    selectedNodeId: null,
    inspectorOpen: false,
    policyCheckByNode: {},
    negotiationSession: null,
    isNegotiating: false,
    isPublishModalOpen: false,
    pipelineTriggerOpen: false,
    isChatOpen: false,
    connectedAddress: null,
    setConnectedAddress: (addr) => {
        if (typeof window !== "undefined") {
            if (addr) window.localStorage.setItem(LS_CONNECTED_ADDRESS, addr);
            else window.localStorage.removeItem(LS_CONNECTED_ADDRESS);
        }
        set({ connectedAddress: addr });
    },
    authSessionToken: null,
    authExpiresAt: null,
    setAuthSession: (session) => {
        if (typeof window !== "undefined") {
            if (session) window.localStorage.setItem(LS_AUTH_SESSION, JSON.stringify(session));
            else window.localStorage.removeItem(LS_AUTH_SESSION);
        }
        set({
            authSessionToken: session?.token ?? null,
            authExpiresAt: session?.expiresAt ?? null,
        });
    },
    hydrateClientSession: () => {
        if (typeof window === "undefined") return;

        const connectedAddress = window.localStorage.getItem(LS_CONNECTED_ADDRESS);
        const authRaw = window.localStorage.getItem(LS_AUTH_SESSION);

        let authSessionToken: string | null = null;
        let authExpiresAt: string | null = null;
        if (authRaw) {
            try {
                const parsed = JSON.parse(authRaw) as { token?: string; expiresAt?: string };
                if (parsed.token && parsed.expiresAt && new Date(parsed.expiresAt).getTime() > Date.now()) {
                    authSessionToken = parsed.token;
                    authExpiresAt = parsed.expiresAt;
                } else {
                    window.localStorage.removeItem(LS_AUTH_SESSION);
                }
            } catch {
                window.localStorage.removeItem(LS_AUTH_SESSION);
            }
        }

        set({
            connectedAddress: connectedAddress || null,
            authSessionToken,
            authExpiresAt,
        });
    },

    // ── Canvas actions ────────────────────────────────────────

    onNodesChange: (changes) =>
        set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) as Node<CanvasNodeData>[] })),

    onEdgesChange: (changes) =>
        set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

    onConnect: (connection) =>
        set((state) => ({ edges: addEdge({ ...connection, type: "smoothstep" }, state.edges) })),

    addAgentToCanvas: (agent, position = { x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 }) => {
        const nodeId = `node-${generateId()}`;
        const defaultParams: Record<string, string> = {};
        for (const param of agent.parameters) {
            defaultParams[param.name] = param.defaultValue;
        }
        const newNode: Node<CanvasNodeData> = {
            id: nodeId,
            type: "agentNode",
            position,
            data: {
                agentId: agent.id,
                agentName: agent.name,
                category: agent.category,
                iconKey: agent.iconKey,
                sponsor: agent.sponsor,
                label: agent.name,
                parameterValues: defaultParams,
                executionStatus: "idle",
            },
        };
        set((state) => ({ nodes: [...state.nodes, newNode] }));
    },

    updateNodeParameter: (nodeId, paramName, value) => {
        set((state) => ({
            nodes: state.nodes.map((node) =>
                node.id === nodeId
                    ? {
                        ...node,
                        data: {
                            ...node.data,
                            parameterValues: { ...node.data.parameterValues, [paramName]: value },
                        },
                    }
                    : node
            ),
            policyCheckByNode: Object.fromEntries(
                Object.entries(state.policyCheckByNode).filter(([id]) => id !== nodeId)
            ),
        }));
    },

    removeNode: (nodeId) => {
        set((state) => ({
            nodes: state.nodes.filter((n) => n.id !== nodeId),
            edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
            policyCheckByNode: Object.fromEntries(
                Object.entries(state.policyCheckByNode).filter(([id]) => id !== nodeId)
            ),
        }));
    },

    setFlowName: (name) => set({ flowName: name }),

    // ── Execution engine ──────────────────────────────────────

    runFlow: async (opts?: { globalParams?: Record<string, string> }) => {
        const state = get();
        if (state.flowStatus === "running") return;
        if (state.nodes.length === 0) {
            set({ isLogVisible: true });
            set((s) => ({
                executionLog: addLog(s, "warn", "System", "Canvas is empty. Add agents to run a flow."),
            }));
            return;
        }

        const flowId = state.flowId;
        const globalParams = opts?.globalParams ?? {};
        const sessionToken = state.authSessionToken;
        const publicKey = state.connectedAddress;

        set({
            flowStatus: "running",
            isLogVisible: true,
            pipelineTriggerOpen: false,
            executionLog: addLog(state, "info", "System", `Starting flow "${state.flowName}" — ${state.nodes.length} agents`),
        });

        // Mark all nodes as idle first
        set((s) => ({
            nodes: s.nodes.map((n) => ({
                ...n,
                data: { ...n.data, executionStatus: "idle" as const, executionResult: undefined },
            })) as Node<CanvasNodeData>[],
        }));

        const orderedNodeIds = buildTopologicalOrder(
            state.nodes.map((n) => n.id),
            state.edges
        );

        let stepNumber = 0;
        let hasError = false;
        // Output chaining: each agent's result is passed as upstreamResult to the next
        let upstreamResult: Record<string, unknown> | undefined;

        for (const nodeId of orderedNodeIds) {
            if (get().flowStatus !== "running") break;

            const currentState = get();
            const node = currentState.nodes.find((n) => n.id === nodeId);
            if (!node) continue;

            const { agentId, agentName, parameterValues } = node.data;
            const agentDef = AGENT_REGISTRY.find((a) => a.id === agentId);

            stepNumber++;

            // Merge: globalParams first, then node-specific params win (most specific wins)
            const mergedParams: Record<string, string> = {
                ...globalParams,
                ...parameterValues,
            };

            // Mark as running
            set((s) => ({
                nodes: s.nodes.map((n) =>
                    n.id === nodeId
                        ? { ...n, data: { ...n.data, executionStatus: "running" as const } }
                        : n
                ) as Node<CanvasNodeData>[],
                executionLog: addLog(s, "info", agentName,
                    `Step ${stepNumber}${upstreamResult ? " ← chaining from previous agent" : ""}…`
                ),
            }));

            try {
                const response = await fetch("/api/agent-execute", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(sessionToken ? { "X-AgentFlow-Session": sessionToken } : {}),
                        ...(publicKey ? { "X-AgentFlow-Public-Key": publicKey } : {}),
                    },
                    body: JSON.stringify({
                        agentId,
                        agentName,
                        parameterValues: mergedParams,
                        upstreamResult,
                        endpointUrl: agentDef?.endpointUrl,
                        flowId,
                        stepNumber,
                    }),
                    signal: AbortSignal.timeout(60000),
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || `HTTP ${response.status}`);
                }

                // Chain: this agent's output becomes the next agent's upstream context
                upstreamResult = data.result;

                set((s) => ({
                    nodes: s.nodes.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...n.data, executionStatus: "success" as const, executionResult: data.result } }
                            : n
                    ) as Node<CanvasNodeData>[],
                    executionLog: addLog(
                        s,
                        "success",
                        agentName,
                        buildSuccessSummary(data.result, data.executionTimeMs),
                        data.result
                    ),
                }));
            } catch (error) {
                hasError = true;
                let errorMessage = error instanceof Error ? error.message : "Unknown error";
                if (error instanceof DOMException && error.name === "TimeoutError") {
                    errorMessage = "Timed out after 60s — agent or upstream LLM too slow";
                } else if (error instanceof TypeError && errorMessage.includes("fetch")) {
                    errorMessage = "Network error — is the dev server running?";
                }

                set((s) => ({
                    nodes: s.nodes.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...n.data, executionStatus: "error" as const } }
                            : n
                    ) as Node<CanvasNodeData>[],
                    executionLog: addLog(s, "error", agentName, `Failed: ${errorMessage}`),
                }));
            }
        }

        const finalStatus: FlowExecutionStatus = hasError ? "error" : "completed";
        set((s) => ({
            flowStatus: finalStatus,
            executionLog: addLog(
                s,
                hasError ? "error" : "success",
                "System",
                hasError
                    ? "Flow completed with errors."
                    : `Flow completed successfully — ${stepNumber} agent(s) executed.`
            ),
        }));
    },

    stopFlow: () => {
        set((state) => ({
            flowStatus: "idle",
            nodes: state.nodes.map((n) => ({
                ...n,
                data: {
                    ...n.data,
                    executionStatus: n.data.executionStatus === "running" ? "idle" : n.data.executionStatus,
                },
            })) as Node<CanvasNodeData>[],
            executionLog: addLog(state, "warn", "System", "Flow stopped by user."),
        }));
    },

    clearLog: () => set({ executionLog: [] }),
    toggleLog: () => set((state) => ({ isLogVisible: !state.isLogVisible })),

    // ── Inspector ─────────────────────────────────────────────

    selectNode: (nodeId) => set({ selectedNodeId: nodeId, inspectorOpen: nodeId !== null }),
    setInspectorOpen: (open) => set({ inspectorOpen: open }),
    checkOnchainPolicy: async (nodeId) => {
        const state = get();
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node || node.data.agentId !== "stellar-x402-gateway") return;

        const params = node.data.parameterValues;
        const contractId = (params.policyContractId || "").trim();
        const agentName = (params.policyAgentName || params.agent || "").trim();
        const network = params.policyNetwork === "mainnet" ? "mainnet" : "testnet";

        if (!contractId || !agentName) {
            set((s) => ({
                policyCheckByNode: {
                    ...s.policyCheckByNode,
                    [nodeId]: {
                        status: "error",
                        error: "policyContractId and policyAgentName are required",
                        checkedAt: new Date().toISOString(),
                    },
                },
            }));
            return;
        }

        set((s) => ({
            policyCheckByNode: {
                ...s.policyCheckByNode,
                [nodeId]: {
                    status: "loading",
                    checkedAt: s.policyCheckByNode[nodeId]?.checkedAt,
                },
            },
        }));

        try {
            const response = await fetch("/api/payments/policy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contractId, agentName, network }),
                signal: AbortSignal.timeout(15000),
            });

            const data = (await response.json()) as {
                success?: boolean;
                error?: string;
                result?: { mode?: string | null; source?: string; cacheKey?: string };
            };

            if (!response.ok || !data.success) {
                throw new Error(data.error || `Policy check failed with HTTP ${response.status}`);
            }

            set((s) => ({
                policyCheckByNode: {
                    ...s.policyCheckByNode,
                    [nodeId]: {
                        status: "success",
                        mode: data.result?.mode ?? null,
                        source: data.result?.source,
                        cacheKey: data.result?.cacheKey,
                        checkedAt: new Date().toISOString(),
                    },
                },
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Policy check failed";
            set((s) => ({
                policyCheckByNode: {
                    ...s.policyCheckByNode,
                    [nodeId]: {
                        status: "error",
                        error: errorMessage,
                        checkedAt: new Date().toISOString(),
                    },
                },
            }));
        }
    },

    // ── Negotiation ───────────────────────────────────────────

    runNegotiation: async (nodeAId, nodeBId) => {
        const state = get();
        const nodeA = state.nodes.find((n) => n.id === nodeAId);
        const nodeB = state.nodes.find((n) => n.id === nodeBId);

        if (!nodeA || !nodeB) return;

        set({ isNegotiating: true, isLogVisible: true });

        set((s) => ({
            executionLog: addLog(
                s,
                "info",
                "Negotiation",
                `Starting negotiation between ${nodeA.data.agentName} and ${nodeB.data.agentName}`
            ),
        }));

        try {
            const response = await fetch("/api/negotiate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(state.authSessionToken ? { "X-AgentFlow-Session": state.authSessionToken } : {}),
                    ...(state.connectedAddress ? { "X-AgentFlow-Public-Key": state.connectedAddress } : {}),
                },
                body: JSON.stringify({
                    initiatorAgentId: nodeA.data.agentId,
                    initiatorAgentName: nodeA.data.agentName,
                    receiverAgentId: nodeB.data.agentId,
                    receiverAgentName: nodeB.data.agentName,
                    initiatorParams: nodeA.data.parameterValues,
                    receiverParams: nodeB.data.parameterValues,
                    negotiationGoal: "Optimize inter-agent parameter handoff for maximum flow efficiency",
                    conversationHistory: [],
                }),
            });

            const result = await response.json();

            const session: NegotiationSession = {
                sessionId: generateId(),
                participants: [nodeA.data.agentId, nodeB.data.agentId],
                messages: [
                    {
                        role: "user",
                        agentId: nodeA.data.agentId,
                        agentName: nodeA.data.agentName,
                        content: result.agentAMessage || "Initiating negotiation.",
                        timestamp: new Date(),
                    },
                    {
                        role: "assistant",
                        agentId: nodeB.data.agentId,
                        agentName: nodeB.data.agentName,
                        content: result.agentBMessage || "Acknowledged.",
                        timestamp: new Date(),
                    },
                ],
                status: result.agreed ? "resolved" : "active",
                resolution: result.summary,
            };

            set((s) => ({
                negotiationSession: session,
                isNegotiating: false,
                executionLog: addLog(
                    s,
                    result.agreed ? "success" : "warn",
                    "Negotiation",
                    result.agreed
                        ? `Agreement reached (confidence: ${Math.round((result.confidence || 0) * 100)}%): ${result.summary}`
                        : `Negotiation ongoing: ${result.summary}`
                ),
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Negotiation failed";
            set((s) => ({
                isNegotiating: false,
                executionLog: addLog(s, "error", "Negotiation", errorMessage),
            }));
        }
    },

    clearNegotiation: () => set({ negotiationSession: null }),

    // ── Publish modal ─────────────────────────────────────────

    setPublishModalOpen: (open) => set({ isPublishModalOpen: open }),
    setPipelineTriggerOpen: (open) => set({ pipelineTriggerOpen: open }),
    setChatOpen: (open) => set({ isChatOpen: open }),

    // ── Flow I/O ──────────────────────────────────────────────

    loadDemoFlow: () => {
        set({
            nodes: DEMO_FLOW_NODES,
            edges: DEMO_FLOW_EDGES,
            flowName: "Stellar Account + AI Payment Flow",
            flowId: generateId(),
            flowStatus: "idle",
            executionLog: [],
            selectedNodeId: null,
            policyCheckByNode: {},
        });
    },

    exportFlow: async () => {
        const state = get();
        try {
            const response = await fetch("/api/export-flow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nodes: state.nodes,
                    edges: state.edges,
                    flowName: state.flowName,
                    flowId: state.flowId,
                }),
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            // Download the exported flow as a JSON file
            const blob = new Blob([JSON.stringify(data.flow, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${state.flowName.replace(/\s+/g, "-").toLowerCase()}.amp.json`;
            link.click();
            URL.revokeObjectURL(url);

            set((s) => ({
                executionLog: addLog(s, "success", "System", `Flow exported as AMP JSON: ${state.flowName}`),
                isLogVisible: true,
            }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Export failed";
            set((s) => ({
                executionLog: addLog(s, "error", "System", `Export failed: ${errorMessage}`),
                isLogVisible: true,
            }));
        }
    },

    clearCanvas: () => {
        set({
            nodes: [],
            edges: [],
            flowId: generateId(),
            flowStatus: "idle",
            selectedNodeId: null,
            inspectorOpen: false,
            policyCheckByNode: {},
            executionLog: [],
            negotiationSession: null,
        });
    },

    importFlow: (json: string) => {
        try {
            const parsed = JSON.parse(json);
            // Support AMP export format: { flow: { nodes, edges, name } } OR raw { nodes, edges }
            const flow = parsed.flow ?? parsed;
            const importedNodes = (flow.nodes ?? []) as Node<CanvasNodeData>[];
            const importedEdges = (flow.edges ?? []) as Edge[];
            const importedName = flow.name ?? flow.flowName ?? "Imported Flow";
            set((s) => ({
                nodes: importedNodes,
                edges: importedEdges,
                flowName: importedName,
                flowId: generateId(),
                flowStatus: "idle" as FlowExecutionStatus,
                selectedNodeId: null,
                inspectorOpen: false,
                policyCheckByNode: {},
                executionLog: addLog(s, "success", "System", `Imported flow "${importedName}" — ${importedNodes.length} agents, ${importedEdges.length} connections.`),
                isLogVisible: true,
            }));
        } catch {
            set((s) => ({
                executionLog: addLog(s, "error", "System", "Import failed: invalid AMP JSON file."),
                isLogVisible: true,
            }));
        }
    },
}));
