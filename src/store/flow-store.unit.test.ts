import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import type { CanvasNodeData } from "@/types";
import { useFlowStore } from "@/store/flow-store";
import { AGENT_REGISTRY } from "@/data/agent-registry";

function makeNode(id: string, agentId: string, params: Record<string, string>): Node<CanvasNodeData> {
    return {
        id,
        type: "agentNode",
        position: { x: 0, y: 0 },
        data: {
            agentId,
            agentName: agentId,
            category: "core",
            iconKey: "Workflow",
            sponsor: "tests",
            label: agentId,
            parameterValues: params,
            executionStatus: "idle",
        },
    };
}

describe("flow store", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        useFlowStore.setState({
            nodes: [],
            edges: [],
            flowId: "flow-test",
            flowName: "Flow Test",
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
            authSessionToken: null,
            authExpiresAt: null,
        });
    });

    it("runs a chained flow and forwards auth headers", async () => {
        const nodes: Node<CanvasNodeData>[] = [
            makeNode("n1", "orchestrator-core", { executionMode: "sequential" }),
            makeNode("n2", "stellar-payment-planner", {
                source: "GSRC",
                destination: "GDST",
                amount: "1",
                assetCode: "XLM",
                network: "testnet",
            }),
        ];
        const edges: Edge[] = [{ id: "e1", source: "n1", target: "n2" }];

        useFlowStore.setState({
            nodes,
            edges,
            authSessionToken: "sess_123",
            connectedAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        });

        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    result: { action: "orchestrate", status: "initialized" },
                    executionTimeMs: 12,
                }),
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    result: { action: "stellar_payment_plan", status: "intent_ready", transaction: {} },
                    executionTimeMs: 14,
                }),
            } as Response);

        await useFlowStore.getState().runFlow();

        expect(fetchMock).toHaveBeenCalledTimes(2);

        const firstCall = fetchMock.mock.calls[0];
        const firstInit = firstCall[1] as RequestInit;
        expect((firstInit.headers as Record<string, string>)["X-AgentFlow-Session"]).toBe("sess_123");
        expect((firstInit.headers as Record<string, string>)["X-AgentFlow-Public-Key"]).toMatch(/^G/);

        const secondCall = fetchMock.mock.calls[1];
        const secondInit = secondCall[1] as RequestInit;
        const secondBody = JSON.parse(String(secondInit.body)) as {
            upstreamResult?: Record<string, unknown>;
        };
        expect(secondBody.upstreamResult?.action).toBe("orchestrate");

        const state = useFlowStore.getState();
        expect(state.flowStatus).toBe("completed");
        expect(state.nodes.find((n) => n.id === "n2")?.data.executionStatus).toBe("success");
    });

    it("sets policy check error when required params are missing", async () => {
        useFlowStore.setState({
            nodes: [
                makeNode("gateway-1", "stellar-x402-gateway", {
                    policyContractId: "",
                    policyAgentName: "",
                }),
            ],
        });

        await useFlowStore.getState().checkOnchainPolicy("gateway-1");

        const policyState = useFlowStore.getState().policyCheckByNode["gateway-1"];
        expect(policyState.status).toBe("error");
        expect(policyState.error).toMatch(/required/i);
    });

    it("stores successful onchain policy check result", async () => {
        useFlowStore.setState({
            nodes: [
                makeNode("gateway-2", "stellar-x402-gateway", {
                    policyContractId: "CA123",
                    policyAgentName: "agentflow",
                    policyNetwork: "testnet",
                }),
            ],
        });

        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                success: true,
                result: { mode: "x402", source: "onchain", cacheKey: "key-1" },
            }),
        } as Response);

        await useFlowStore.getState().checkOnchainPolicy("gateway-2");

        const policyState = useFlowStore.getState().policyCheckByNode["gateway-2"];
        expect(policyState.status).toBe("success");
        expect(policyState.mode).toBe("x402");
        expect(policyState.source).toBe("onchain");
    });

    it("adds warning log when trying to run an empty flow", async () => {
        await useFlowStore.getState().runFlow();

        const state = useFlowStore.getState();
        expect(state.isLogVisible).toBe(true);
        expect(state.executionLog.at(-1)?.message).toContain("Canvas is empty");
        expect(state.flowStatus).toBe("idle");
    });

    it("marks running nodes idle when flow is stopped", () => {
        useFlowStore.setState({
            flowStatus: "running",
            nodes: [
                {
                    ...makeNode("n-stop", "orchestrator-core", {}),
                    data: {
                        ...makeNode("n-stop", "orchestrator-core", {}).data,
                        executionStatus: "running",
                    },
                },
            ],
        });

        useFlowStore.getState().stopFlow();

        const state = useFlowStore.getState();
        expect(state.flowStatus).toBe("idle");
        expect(state.nodes[0].data.executionStatus).toBe("idle");
        expect(state.executionLog.at(-1)?.message).toContain("Flow stopped by user");
    });

    it("records network failure during agent execution", async () => {
        useFlowStore.setState({
            nodes: [makeNode("n-net", "orchestrator-core", { executionMode: "parallel" })],
            edges: [],
        });

        vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

        await useFlowStore.getState().runFlow();

        const state = useFlowStore.getState();
        expect(state.flowStatus).toBe("error");
        expect(state.nodes[0].data.executionStatus).toBe("error");
        expect(state.executionLog.some((entry) => entry.message.includes("Network error"))).toBe(true);
    });

    it("creates resolved negotiation session on successful response", async () => {
        useFlowStore.setState({
            nodes: [
                makeNode("na", "orchestrator-core", { executionMode: "sequential" }),
                makeNode("nb", "stellar-payment-planner", { amount: "1" }),
            ],
        });

        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                agreed: true,
                confidence: 0.92,
                summary: "Aligned params",
                agentAMessage: "I propose 1 XLM",
                agentBMessage: "Accepted",
            }),
        } as Response);

        await useFlowStore.getState().runNegotiation("na", "nb");

        const state = useFlowStore.getState();
        expect(state.isNegotiating).toBe(false);
        expect(state.negotiationSession?.status).toBe("resolved");
        expect(state.negotiationSession?.messages.length).toBe(2);
    });

    it("logs negotiation failures", async () => {
        useFlowStore.setState({
            nodes: [
                makeNode("na", "orchestrator-core", {}),
                makeNode("nb", "stellar-payment-planner", {}),
            ],
        });

        vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("negotiate down"));

        await useFlowStore.getState().runNegotiation("na", "nb");

        const state = useFlowStore.getState();
        expect(state.isNegotiating).toBe(false);
        expect(state.executionLog.at(-1)?.message).toContain("negotiate down");
    });

    it("imports valid flow JSON and logs success", () => {
        const importedNode = makeNode("imported-1", "orchestrator-core", { executionMode: "sequential" });
        useFlowStore.getState().importFlow(
            JSON.stringify({
                flow: {
                    name: "Imported Test Flow",
                    nodes: [importedNode],
                    edges: [],
                },
            })
        );

        const state = useFlowStore.getState();
        expect(state.flowName).toBe("Imported Test Flow");
        expect(state.nodes).toHaveLength(1);
        expect(state.isLogVisible).toBe(true);
        expect(state.executionLog.at(-1)?.message).toContain("Imported flow");
    });

    it("logs import errors for invalid JSON", () => {
        useFlowStore.getState().importFlow("{invalid-json");

        const state = useFlowStore.getState();
        expect(state.executionLog.at(-1)?.message).toContain("Import failed");
        expect(state.isLogVisible).toBe(true);
    });

    it("hydrates connected wallet and valid auth session from localStorage", () => {
        const memory = new Map<string, string>();
        Object.defineProperty(globalThis, "window", {
            value: {
                localStorage: {
                    getItem: (key: string) => memory.get(key) ?? null,
                    setItem: (key: string, value: string) => {
                        memory.set(key, value);
                    },
                    removeItem: (key: string) => {
                        memory.delete(key);
                    },
                },
            },
            configurable: true,
        });

        const future = new Date(Date.now() + 60_000).toISOString();
        globalThis.window.localStorage.setItem("agentflow:stellar:connectedAddress", "GTEST");
        globalThis.window.localStorage.setItem("agentflow:stellar:authSession", JSON.stringify({ token: "tok", expiresAt: future }));

        useFlowStore.getState().hydrateClientSession();

        const state = useFlowStore.getState();
        expect(state.connectedAddress).toBe("GTEST");
        expect(state.authSessionToken).toBe("tok");

        Reflect.deleteProperty(globalThis, "window");
    });

    it("drops invalid stored auth sessions during hydration", () => {
        const memory = new Map<string, string>();
        Object.defineProperty(globalThis, "window", {
            value: {
                localStorage: {
                    getItem: (key: string) => memory.get(key) ?? null,
                    setItem: (key: string, value: string) => {
                        memory.set(key, value);
                    },
                    removeItem: (key: string) => {
                        memory.delete(key);
                    },
                },
            },
            configurable: true,
        });

        globalThis.window.localStorage.setItem("agentflow:stellar:authSession", "not-json");

        useFlowStore.getState().hydrateClientSession();

        const state = useFlowStore.getState();
        expect(state.authSessionToken).toBeNull();
        expect(globalThis.window.localStorage.getItem("agentflow:stellar:authSession")).toBeNull();

        Reflect.deleteProperty(globalThis, "window");
    });

    it("adds an agent node and updates/removes it", () => {
        const agent = AGENT_REGISTRY[0];
        useFlowStore.getState().addAgentToCanvas(agent, { x: 10, y: 20 });

        const added = useFlowStore.getState().nodes[0];
        expect(added.data.agentId).toBe(agent.id);

        useFlowStore.setState({
            policyCheckByNode: {
                [added.id]: {
                    status: "success",
                    mode: "x402",
                    checkedAt: new Date().toISOString(),
                },
            },
            selectedNodeId: added.id,
            edges: [{ id: "e1", source: added.id, target: "other" }],
        });

        useFlowStore.getState().updateNodeParameter(added.id, "foo", "bar");
        const updated = useFlowStore.getState().nodes.find((n) => n.id === added.id);
        expect(updated?.data.parameterValues.foo).toBe("bar");
        expect(useFlowStore.getState().policyCheckByNode[added.id]).toBeUndefined();

        useFlowStore.getState().removeNode(added.id);
        const state = useFlowStore.getState();
        expect(state.nodes.find((n) => n.id === added.id)).toBeUndefined();
        expect(state.edges).toHaveLength(0);
        expect(state.selectedNodeId).toBeNull();
    });

    it("connects nodes and toggles inspector/log visibility", () => {
        useFlowStore.getState().onConnect({ source: "a", target: "b" });
        let state = useFlowStore.getState();
        expect(state.edges).toHaveLength(1);
        expect(state.edges[0].type).toBe("smoothstep");

        useFlowStore.getState().selectNode("a");
        state = useFlowStore.getState();
        expect(state.selectedNodeId).toBe("a");
        expect(state.inspectorOpen).toBe(true);

        useFlowStore.getState().toggleLog();
        expect(useFlowStore.getState().isLogVisible).toBe(true);
        useFlowStore.getState().clearLog();
        expect(useFlowStore.getState().executionLog).toHaveLength(0);
    });

    it("loads demo flow and clears canvas", () => {
        useFlowStore.getState().loadDemoFlow();
        let state = useFlowStore.getState();
        expect(state.nodes.length).toBeGreaterThan(0);
        expect(state.edges.length).toBeGreaterThan(0);
        expect(state.flowName).toContain("Stellar");

        useFlowStore.getState().clearCanvas();
        state = useFlowStore.getState();
        expect(state.nodes).toHaveLength(0);
        expect(state.edges).toHaveLength(0);
        expect(state.flowStatus).toBe("idle");
    });

    it("handles timeout errors in runFlow", async () => {
        useFlowStore.setState({
            nodes: [makeNode("n-timeout", "orchestrator-core", { executionMode: "parallel" })],
            edges: [],
        });

        vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("too slow", "TimeoutError"));

        await useFlowStore.getState().runFlow();

        const state = useFlowStore.getState();
        expect(state.flowStatus).toBe("error");
        expect(state.executionLog.some((entry) => entry.message.includes("Timed out after 60s"))).toBe(true);
    });

    it("returns early if runFlow is called while already running", async () => {
        useFlowStore.setState({ flowStatus: "running" });
        const fetchMock = vi.spyOn(globalThis, "fetch");

        await useFlowStore.getState().runFlow();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("updates localStorage through connection and session setters", () => {
        const memory = new Map<string, string>();
        Object.defineProperty(globalThis, "window", {
            value: {
                localStorage: {
                    getItem: (key: string) => memory.get(key) ?? null,
                    setItem: (key: string, value: string) => {
                        memory.set(key, value);
                    },
                    removeItem: (key: string) => {
                        memory.delete(key);
                    },
                },
            },
            configurable: true,
        });

        useFlowStore.getState().setConnectedAddress("GABC");
        expect(memory.get("agentflow:stellar:connectedAddress")).toBe("GABC");

        useFlowStore.getState().setAuthSession({ token: "tok", expiresAt: "2099-01-01T00:00:00Z" });
        expect(memory.get("agentflow:stellar:authSession")).toContain("tok");

        useFlowStore.getState().setConnectedAddress(null);
        useFlowStore.getState().setAuthSession(null);
        expect(memory.get("agentflow:stellar:connectedAddress")).toBeUndefined();
        expect(memory.get("agentflow:stellar:authSession")).toBeUndefined();

        Reflect.deleteProperty(globalThis, "window");
    });

    it("clears negotiation and toggles modal flags", () => {
        useFlowStore.setState({
            negotiationSession: {
                sessionId: "s1",
                participants: ["a", "b"],
                messages: [],
                status: "active",
            },
        });

        useFlowStore.getState().clearNegotiation();
        useFlowStore.getState().setPublishModalOpen(true);
        useFlowStore.getState().setPipelineTriggerOpen(true);
        useFlowStore.getState().setChatOpen(true);

        const state = useFlowStore.getState();
        expect(state.negotiationSession).toBeNull();
        expect(state.isPublishModalOpen).toBe(true);
        expect(state.pipelineTriggerOpen).toBe(true);
        expect(state.isChatOpen).toBe(true);
    });

    it("no-ops policy check for non-gateway nodes", async () => {
        useFlowStore.setState({
            nodes: [makeNode("n1", "orchestrator-core", {})],
        });

        await useFlowStore.getState().checkOnchainPolicy("n1");
        expect(useFlowStore.getState().policyCheckByNode["n1"]).toBeUndefined();
    });

    it("stores policy-check errors when endpoint responds with failure", async () => {
        useFlowStore.setState({
            nodes: [
                makeNode("gateway-err", "stellar-x402-gateway", {
                    policyContractId: "CA",
                    policyAgentName: "agent",
                    policyNetwork: "testnet",
                }),
            ],
        });

        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ success: false, error: "rpc failed" }),
        } as Response);

        await useFlowStore.getState().checkOnchainPolicy("gateway-err");
        const policy = useFlowStore.getState().policyCheckByNode["gateway-err"];
        expect(policy.status).toBe("error");
        expect(String(policy.error)).toContain("rpc failed");
    });

    it("returns early when negotiation nodes are missing", async () => {
        useFlowStore.setState({ nodes: [makeNode("only", "orchestrator-core", {})] });
        const fetchMock = vi.spyOn(globalThis, "fetch");

        await useFlowStore.getState().runNegotiation("only", "missing");

        expect(fetchMock).not.toHaveBeenCalled();
        expect(useFlowStore.getState().negotiationSession).toBeNull();
    });

    it("exports flow and logs success", async () => {
        useFlowStore.setState({
            nodes: [makeNode("n1", "orchestrator-core", {})],
            edges: [],
            flowName: "Export Me",
            flowId: "flow-exp",
        });

        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, flow: { id: "f" } }),
        } as Response);

        const click = vi.fn();
        Object.defineProperty(globalThis, "document", {
            value: {
                createElement: () => ({ click, href: "", download: "" }),
            },
            configurable: true,
        });
        vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
        vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

        await useFlowStore.getState().exportFlow();

        const state = useFlowStore.getState();
        expect(click).toHaveBeenCalled();
        expect(state.executionLog.at(-1)?.message).toContain("Flow exported");
        expect(state.isLogVisible).toBe(true);

        Reflect.deleteProperty(globalThis, "document");
    });

    it("logs export failures", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ success: false, error: "cannot export" }),
        } as Response);

        await useFlowStore.getState().exportFlow();

        const state = useFlowStore.getState();
        expect(state.executionLog.at(-1)?.message).toContain("Export failed");
        expect(state.isLogVisible).toBe(true);
    });
});
