/** @vitest-environment jsdom */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const flowState = {
    nodes: [
        {
            id: "gateway-1",
            data: {
                agentId: "stellar-x402-gateway",
                agentName: "Stellar X402 Gateway",
                category: "payments",
                sponsor: "Stellar",
                parameterValues: {
                    policyContractId: "CA123",
                    policyAgentName: "agentflow",
                    policyNetwork: "testnet",
                },
                executionStatus: "idle",
                executionResult: undefined,
            },
        },
        {
            id: "node-2",
            data: {
                agentId: "orchestrator-core",
                agentName: "Orchestrator",
                category: "core",
                sponsor: "AgentFlow",
                parameterValues: {},
                executionStatus: "idle",
                executionResult: undefined,
            },
        },
    ],
    edges: [{ id: "e1", source: "gateway-1", target: "node-2" }],
    selectedNodeId: "gateway-1",
    inspectorOpen: true,
    isNegotiating: false,
    negotiationSession: null as null | {
        status: "resolved" | "active";
        resolution?: string;
        messages: Array<{ agentName: string; content: string }>;
    },
    policyCheckByNode: {} as Record<string, { status: string; mode?: string; error?: string; checkedAt?: string }>,
    setInspectorOpen: vi.fn(),
    updateNodeParameter: vi.fn(),
    removeNode: vi.fn(),
    runNegotiation: vi.fn(),
    clearNegotiation: vi.fn(),
    checkOnchainPolicy: vi.fn(),
    runFlow: vi.fn(),
};

vi.mock("@/store/flow-store", () => {
    const useFlowStore = ((selector?: (s: typeof flowState) => unknown) => {
        if (selector) return selector(flowState);
        return flowState;
    }) as ((selector?: (s: typeof flowState) => unknown) => unknown) & {
        getState: () => typeof flowState;
    };
    useFlowStore.getState = () => flowState;
    return { useFlowStore };
});

import InspectorPanel from "@/components/inspector/inspector-panel";

describe("inspector panel interactions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        flowState.inspectorOpen = true;
        flowState.selectedNodeId = "gateway-1";
        flowState.negotiationSession = null;
        flowState.policyCheckByNode = {};
    });

    it("deletes the selected node and closes inspector", () => {
        render(React.createElement(InspectorPanel));

        fireEvent.click(screen.getByTitle(/delete node/i));
        expect(flowState.removeNode).toHaveBeenCalledWith("gateway-1");
        expect(flowState.setInspectorOpen).toHaveBeenCalledWith(false);
    });

    it("runs onchain policy check and renders success state", () => {
        flowState.policyCheckByNode = {
            "gateway-1": {
                status: "success",
                mode: "x402",
                source: "rpc",
                checkedAt: new Date().toISOString(),
            },
        } as Record<string, { status: string; mode?: string; source?: string; checkedAt?: string }>;

        render(React.createElement(InspectorPanel));

        fireEvent.click(screen.getByTestId("policy-check-button"));
        expect(flowState.checkOnchainPolicy).toHaveBeenCalledWith("gateway-1");
        expect(screen.getByTestId("policy-check-success")).toBeTruthy();
    });

    it("triggers negotiation with connected nodes", () => {
        render(React.createElement(InspectorPanel));

        fireEvent.click(screen.getByRole("button", { name: /negotiate/i }));
        fireEvent.click(screen.getByRole("button", { name: /orchestrator/i }));

        expect(flowState.runNegotiation).toHaveBeenCalledWith("gateway-1", "node-2");
    });

    it("runs flow from quick action", () => {
        render(React.createElement(InspectorPanel));
        fireEvent.click(screen.getByRole("button", { name: /run flow/i }));
        expect(flowState.runFlow).toHaveBeenCalled();
    });

    it("shows connect-first hint on negotiate tab with no connected nodes", () => {
        flowState.edges = [];
        render(React.createElement(InspectorPanel));

        fireEvent.click(screen.getByRole("button", { name: /negotiate/i }));
        expect(screen.getByText(/connect this node to another agent first/i)).toBeTruthy();
    });

    it("renders policy error state", () => {
        flowState.policyCheckByNode = {
            "gateway-1": {
                status: "error",
                error: "policy lookup failed",
            },
        };

        render(React.createElement(InspectorPanel));
        expect(screen.getByTestId("policy-check-error")).toBeTruthy();
        expect(screen.getByText(/policy lookup failed/i)).toBeTruthy();
    });

    it("updates params from select/boolean controls", () => {
        render(React.createElement(InspectorPanel));

        const selects = screen.getAllByRole("combobox");
        fireEvent.change(selects[0], { target: { value: "mpp_charge" } });

        const toggles = screen.getAllByRole("button");
        const maybeToggle = toggles.find((b) => b.className.includes("inline-flex h-5 w-9"));
        if (maybeToggle) fireEvent.click(maybeToggle);

        expect(flowState.updateNodeParameter).toHaveBeenCalled();
    });

    it("renders execution result transaction notice", () => {
        flowState.nodes[0].data.executionStatus = "success";
        flowState.nodes[0].data.executionResult = {
            transaction: { source: "GSRC", destination: "GDST" },
        };

        render(React.createElement(InspectorPanel));
        fireEvent.click(screen.getByRole("button", { name: /result/i }));
        expect(screen.getByText(/stellar payment intent ready/i)).toBeTruthy();
    });
});
