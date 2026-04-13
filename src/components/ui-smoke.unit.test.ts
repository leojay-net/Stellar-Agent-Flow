import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Node } from "@xyflow/react";
import type { CanvasNodeData } from "@/types";

const mockFlowState: Record<string, unknown> = {
    nodes: [],
    edges: [],
    flowName: "Smoke Flow",
    flowStatus: "idle",
    isLogVisible: true,
    executionLog: [{ id: "log-1", timestamp: new Date(), agentName: "System", message: "hello", level: "info" }],
    pipelineTriggerOpen: true,
    connectedAddress: "GTESTACCOUNT",
    isChatOpen: true,
    isPublishModalOpen: true,
    selectedNodeId: "node-1",
    inspectorOpen: true,
    negotiationSession: null,
    isNegotiating: false,
    policyCheckByNode: {
        "node-1": { status: "success", mode: "x402", source: "onchain", checkedAt: new Date().toISOString() },
    },
    setFlowName: vi.fn(),
    stopFlow: vi.fn(),
    exportFlow: vi.fn(),
    clearCanvas: vi.fn(),
    loadDemoFlow: vi.fn(),
    setPublishModalOpen: vi.fn(),
    toggleLog: vi.fn(),
    setPipelineTriggerOpen: vi.fn(),
    setChatOpen: vi.fn(),
    setConnectedAddress: vi.fn(),
    setAuthSession: vi.fn(),
    hydrateClientSession: vi.fn(),
    runFlow: vi.fn(),
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    addAgentToCanvas: vi.fn(),
    updateNodeParameter: vi.fn(),
    removeNode: vi.fn(),
    selectNode: vi.fn(),
    setInspectorOpen: vi.fn(),
    checkOnchainPolicy: vi.fn(),
    clearNegotiation: vi.fn(),
    runNegotiation: vi.fn(),
    importFlow: vi.fn(),
    authSessionToken: null,
    authExpiresAt: null,
};

const mockActivityState: Record<string, unknown> = {
    transactions: [],
    isActivityOpen: true,
    toggleActivity: vi.fn(),
    clearActivity: vi.fn(),
};

vi.mock("@xyflow/react", () => ({
    Handle: ({ type }: { type: string }) => React.createElement("span", null, `handle-${type}`),
    Position: { Left: "left", Right: "right" },
    ReactFlow: ({ children }: { children: React.ReactNode }) => React.createElement("div", { "data-testid": "reactflow" }, children),
    Background: () => React.createElement("div", null, "Background"),
    Controls: () => React.createElement("div", null, "Controls"),
    MiniMap: () => React.createElement("div", null, "MiniMap"),
    BackgroundVariant: { Dots: "dots" },
    useReactFlow: () => ({ screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }) }),
}));

vi.mock("@stellar/freighter-api", () => ({
    requestAccess: vi.fn(async () => ({ address: "GTEST" })),
    signMessage: vi.fn(async () => ({ signedMessage: "sig" })),
}));

vi.mock("@/store/flow-store", () => {
    const useFlowStore = ((selector?: (s: Record<string, unknown>) => unknown) => {
        if (selector) return selector(mockFlowState);
        return mockFlowState;
    }) as ((selector?: (s: Record<string, unknown>) => unknown) => unknown) & {
        getState: () => Record<string, unknown>;
        setState: (partial: Partial<Record<string, unknown>>) => void;
    };
    useFlowStore.getState = () => mockFlowState;
    useFlowStore.setState = (partial) => {
        Object.assign(mockFlowState, partial);
    };
    return { useFlowStore };
});

vi.mock("@/store/activity-store", () => {
    const useActivityStore = ((selector?: (s: Record<string, unknown>) => unknown) => {
        if (selector) return selector(mockActivityState);
        return mockActivityState;
    }) as ((selector?: (s: Record<string, unknown>) => unknown) => unknown) & {
        getState: () => Record<string, unknown>;
        setState: (partial: Partial<Record<string, unknown>>) => void;
    };
    useActivityStore.getState = () => mockActivityState;
    useActivityStore.setState = (partial) => {
        Object.assign(mockActivityState, partial);
    };
    return { useActivityStore };
});

import ActivityPanel from "@/components/canvas/activity-panel";
import AgentNode from "@/components/canvas/agent-node";
import ChatPanel from "@/components/canvas/chat-panel";
import ExecutionLog from "@/components/canvas/execution-log";
import FlowCanvas from "@/components/canvas/flow-canvas";
import PipelineTriggerModal from "@/components/canvas/pipeline-trigger-modal";
import Toolbar from "@/components/canvas/toolbar";
import InspectorPanel from "@/components/inspector/inspector-panel";
import PublishAgentModal from "@/components/modals/publish-agent-modal";
import RegistrySidebar from "@/components/registry/registry-sidebar";

function makeNode(id: string, agentId: string, category = "core"): Node<CanvasNodeData> {
    return {
        id,
        type: "agentNode",
        position: { x: 10, y: 10 },
        data: {
            agentId,
            agentName: agentId,
            category: category as CanvasNodeData["category"],
            iconKey: "Cpu",
            sponsor: "tests",
            label: agentId,
            parameterValues: {},
            executionStatus: "idle",
        },
    };
}

describe("ui smoke", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        Object.assign(mockFlowState, {
            flowName: "Smoke Flow",
            flowStatus: "idle",
            isLogVisible: true,
            executionLog: [{ id: "log-1", timestamp: new Date(), agentName: "System", message: "hello", level: "info" }],
            nodes: [
                makeNode("node-1", "stellar-x402-gateway", "payments"),
                makeNode("node-2", "orchestrator-core", "core"),
            ],
            edges: [{ id: "edge-1", source: "node-1", target: "node-2" }],
            selectedNodeId: "node-1",
            inspectorOpen: true,
            policyCheckByNode: {
                "node-1": { status: "success", mode: "x402", source: "onchain", checkedAt: new Date().toISOString() },
            },
            pipelineTriggerOpen: true,
            isChatOpen: true,
            isPublishModalOpen: true,
        });

        Object.assign(mockActivityState, {
            isActivityOpen: true,
            transactions: [
                {
                    id: "tx-1",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    agentName: "planner",
                    agentId: "stellar-payment-planner",
                    action: "Create payment",
                    chainId: 148,
                    chainName: "Stellar Testnet",
                    from: "GSRC",
                    to: "GDST",
                    valueEth: "10",
                    phase: "confirmed",
                    timeline: [{ phase: "confirmed", timestamp: new Date(), detail: "ok" }],
                },
            ],
        });

        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ agents: [], success: true }),
        } as Response);
    });

    it("renders canvas and panel components", () => {
        const html = [
            renderToStaticMarkup(React.createElement(ActivityPanel)),
            renderToStaticMarkup(React.createElement(ExecutionLog)),
            renderToStaticMarkup(React.createElement(FlowCanvas)),
            renderToStaticMarkup(React.createElement(PipelineTriggerModal)),
            renderToStaticMarkup(React.createElement(Toolbar)),
            renderToStaticMarkup(React.createElement(ChatPanel)),
        ].join("\n");

        expect(html).toContain("Activity");
        expect(html).toContain("Execution Log");
        expect(html).toContain("Run Pipeline");
        expect(html).toContain("Agent X");
        expect(html).toContain("Run Flow");
    });

    it("renders agent node and inspector/modal/sidebar components", () => {
        const agentNodeHtml = renderToStaticMarkup(
            React.createElement(AgentNode, {
                id: "node-1",
                data: {
                    ...makeNode("node-1", "stellar-x402-gateway", "payments").data,
                    executionStatus: "success",
                    executionResult: { status: "tx_ready", transaction: { to: "GDEST" } },
                },
                selected: true,
                type: "agentNode",
                zIndex: 1,
                dragging: false,
                selectable: true,
                deletable: true,
                isConnectable: true,
                sourcePosition: "right",
                targetPosition: "left",
                xPos: 0,
                yPos: 0,
                dragHandle: undefined,
            } as unknown as Parameters<typeof AgentNode>[0]),
        );

        const html = [
            agentNodeHtml,
            renderToStaticMarkup(React.createElement(InspectorPanel)),
            renderToStaticMarkup(React.createElement(PublishAgentModal)),
            renderToStaticMarkup(React.createElement(RegistrySidebar)),
        ].join("\n");

        expect(html).toContain("TX READY");
        expect(html).toContain("Onchain Policy");
        expect(html).toContain("Publish Agent");
        expect(html).toContain("Community");
    });
});
