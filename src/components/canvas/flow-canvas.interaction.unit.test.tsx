/** @vitest-environment jsdom */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const flowState = {
    nodes: [] as Array<{ id: string; data: { agentId?: string } }>,
    edges: [],
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    selectNode: vi.fn(),
    addAgentToCanvas: vi.fn(),
    loadDemoFlow: vi.fn(),
};

vi.mock("@/store/flow-store", () => ({
    useFlowStore: () => flowState,
}));

vi.mock("@xyflow/react", () => {
    const ReactFlow = ({ onPaneClick, onNodeClick, children }: {
        onPaneClick?: () => void;
        onNodeClick?: (_evt: unknown, node: { id: string }) => void;
        children?: React.ReactNode;
    }) => React.createElement(
        "div",
        { "data-testid": "mock-reactflow" },
        React.createElement("button", { onClick: () => onPaneClick?.() }, "pane"),
        React.createElement("button", { onClick: () => onNodeClick?.(null, { id: "node-1" }) }, "node"),
        children
    );

    return {
        ReactFlow,
        Background: () => React.createElement("div"),
        Controls: () => React.createElement("div"),
        MiniMap: () => React.createElement("div"),
        BackgroundVariant: { Dots: "dots" },
        useReactFlow: () => ({
            screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
        }),
    };
});

import FlowCanvas from "@/components/canvas/flow-canvas";

describe("flow canvas interactions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        flowState.nodes = [];
    });

    it("shows empty state and loads demo flow", () => {
        render(React.createElement(FlowCanvas));

        expect(screen.getByText(/start building your flow/i)).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: /load demo flow/i }));
        expect(flowState.loadDemoFlow).toHaveBeenCalled();
    });

    it("adds dropped agents to canvas", () => {
        render(React.createElement(FlowCanvas));

        const canvas = screen.getByTestId("mock-reactflow").parentElement;
        expect(canvas).toBeTruthy();

        fireEvent.drop(canvas as HTMLElement, {
            clientX: 111,
            clientY: 222,
            dataTransfer: {
                getData: (key: string) =>
                    key === "agent"
                        ? JSON.stringify({ id: "stellar-asset-pricer", name: "Pricer" })
                        : "",
            },
        });

        expect(flowState.addAgentToCanvas).toHaveBeenCalledWith(
            expect.objectContaining({ id: "stellar-asset-pricer" }),
            { x: 111, y: 222 }
        );
    });

    it("selects and deselects nodes from canvas events", () => {
        flowState.nodes = [{ id: "node-1", data: { agentId: "orchestrator-core" } }];
        render(React.createElement(FlowCanvas));

        fireEvent.click(screen.getByRole("button", { name: "node" }));
        expect(flowState.selectNode).toHaveBeenCalledWith("node-1");

        fireEvent.click(screen.getByRole("button", { name: "pane" }));
        expect(flowState.selectNode).toHaveBeenCalledWith(null);
    });
});
