/** @vitest-environment jsdom */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const flowState = {
    isChatOpen: true,
    setChatOpen: vi.fn(),
    runFlow: vi.fn(),
    clearCanvas: vi.fn(),
    setFlowName: vi.fn(),
    updateNodeParameter: vi.fn(),
    onConnect: vi.fn(),
    addAgentToCanvas: vi.fn((agent: { id: string }) => {
        flowState.nodes.push({
            id: `node-${flowState.nodes.length + 1}`,
            data: { agentId: agent.id },
            position: { x: 0, y: 0 },
            type: "agentNode",
        });
    }),
    nodes: [
        {
            id: "node-1",
            data: { agentId: "orchestrator-core" },
            position: { x: 0, y: 0 },
            type: "agentNode",
        },
    ] as Array<{ id: string; data: { agentId: string }; position: { x: number; y: number }; type: string }>,
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

import ChatPanel from "@/components/canvas/chat-panel";

describe("chat panel interactions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        flowState.nodes = [
            {
                id: "node-1",
                data: { agentId: "orchestrator-core" },
                position: { x: 0, y: 0 },
                type: "agentNode",
            },
        ];
    });

    it("sends prompt and triggers run flow action", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                action: "run_pipeline",
                reply: "Running pipeline now",
                model: "gemini",
            }),
        } as Response);

        render(React.createElement(ChatPanel));

        const input = screen.getByPlaceholderText(/tell your agents what to do/i);
        fireEvent.change(input, {
            target: { value: "run my flow" },
        });
        const sendButton = input.parentElement?.querySelector("button");
        expect(sendButton).toBeTruthy();
        fireEvent.click(sendButton as HTMLButtonElement);

        await waitFor(() => {
            expect(flowState.runFlow).toHaveBeenCalled();
            expect(screen.getByText(/running pipeline now/i)).toBeTruthy();
        });
    });

    it("handles add_agent action by adding to canvas", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                action: "add_agent",
                agentId: "stellar-asset-pricer",
                reply: "Added Stellar Asset Pricer",
            }),
        } as Response);

        render(React.createElement(ChatPanel));

        const input = screen.getByPlaceholderText(/tell your agents what to do/i);
        fireEvent.change(input, {
            target: { value: "add stellar pricer" },
        });
        fireEvent.keyDown(input, {
            key: "Enter",
            code: "Enter",
        });

        await waitFor(() => {
            expect(flowState.addAgentToCanvas).toHaveBeenCalled();
            expect(screen.getByText(/added stellar asset pricer/i)).toBeTruthy();
        });
    });

    it("builds flow from build_flow action", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                action: "build_flow",
                reply: "Building your flow",
                model: "gemini",
                flowData: {
                    flowName: "Auto Flow",
                    agents: [{ id: "orchestrator-core" }, { id: "stellar-asset-pricer" }],
                    connections: [[0, 1]],
                },
            }),
        } as Response);

        render(React.createElement(ChatPanel));

        fireEvent.click(screen.getByRole("button", { name: /build stellar pipeline/i }));

        await waitFor(() => {
            expect(flowState.clearCanvas).toHaveBeenCalled();
            expect(flowState.setFlowName).toHaveBeenCalledWith("Auto Flow");
            expect(flowState.addAgentToCanvas).toHaveBeenCalledTimes(2);
            expect(flowState.onConnect).toHaveBeenCalled();
        }, { timeout: 3000 });
    });

    it("closes chat panel from header action", () => {
        render(React.createElement(ChatPanel));

        const headerButtons = screen.getAllByRole("button");
        fireEvent.click(headerButtons[0]);

        expect(flowState.setChatOpen).toHaveBeenCalledWith(false);
    });

    it("shows connection error message when chat request fails", async () => {
        vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

        render(React.createElement(ChatPanel));
        fireEvent.change(screen.getByPlaceholderText(/tell your agents what to do/i), {
            target: { value: "hello" },
        });
        fireEvent.keyDown(screen.getByPlaceholderText(/tell your agents what to do/i), {
            key: "Enter",
            code: "Enter",
        });

        await waitFor(() => {
            expect(screen.getByText(/network down/i)).toBeTruthy();
        });
    });
});
