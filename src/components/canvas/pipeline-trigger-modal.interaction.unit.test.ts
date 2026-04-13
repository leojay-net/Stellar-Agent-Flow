/** @vitest-environment jsdom */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const flowState = {
    nodes: [
        {
            id: "n1",
            data: {
                agentName: "Orchestrator",
                category: "core",
                sponsor: "AgentFlow",
            },
        },
        {
            id: "n2",
            data: {
                agentName: "Stellar Reader",
                category: "chain",
                sponsor: "Stellar",
            },
        },
    ],
    edges: [{ id: "e1", source: "n1", target: "n2" }],
    flowName: "Demo Flow",
    pipelineTriggerOpen: true,
    setPipelineTriggerOpen: vi.fn(),
    runFlow: vi.fn(),
    flowStatus: "idle",
    connectedAddress: null as string | null,
};

vi.mock("@/store/flow-store", () => ({
    useFlowStore: () => flowState,
}));

vi.mock("@/lib/utils", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/utils")>();
    return {
        ...actual,
        buildTopologicalOrder: vi.fn(() => ["n1", "n2"]),
    };
});

import PipelineTriggerModal from "@/components/canvas/pipeline-trigger-modal";

describe("pipeline trigger modal interactions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        flowState.pipelineTriggerOpen = true;
        flowState.connectedAddress = null;
        flowState.flowStatus = "idle";
        flowState.nodes = [
            {
                id: "n1",
                data: { agentName: "Orchestrator", category: "core", sponsor: "AgentFlow" },
            },
            {
                id: "n2",
                data: { agentName: "Stellar Reader", category: "chain", sponsor: "Stellar" },
            },
        ];
    });

    it("does not render when closed", () => {
        flowState.pipelineTriggerOpen = false;
        render(React.createElement(PipelineTriggerModal));
        expect(screen.queryByText(/run pipeline/i)).toBeNull();
    });

    it("injects global wallet and amount params on execute", () => {
        render(React.createElement(PipelineTriggerModal));

        const wallet = screen.getByPlaceholderText(/paste stellar account/i);
        const amount = screen.getByPlaceholderText("0.001");

        fireEvent.change(wallet, { target: { value: "GABC" } });
        fireEvent.change(amount, { target: { value: "12.5" } });
        fireEvent.click(screen.getByRole("button", { name: /execute pipeline/i }));

        expect(flowState.runFlow).toHaveBeenCalledWith({
            globalParams: expect.objectContaining({
                walletAddress: "GABC",
                wallet_address: "GABC",
                address: "GABC",
                userAddress: "GABC",
                amountIn: "12.5",
                amount: "12.5",
                initialAmount: "12.5",
                paymentAmount: "12.5",
                minimumAmount: "12.5",
            }),
        });
    });

    it("autofills wallet from connected address", () => {
        flowState.connectedAddress = "GCONNECTED";
        render(React.createElement(PipelineTriggerModal));
        const wallet = screen.getByPlaceholderText(/paste stellar account/i) as HTMLInputElement;
        expect(wallet.value).toBe("GCONNECTED");
        expect(screen.getByText(/connected/i)).toBeTruthy();
    });

    it("closes on cancel and backdrop click", () => {
        render(React.createElement(PipelineTriggerModal));

        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
        expect(flowState.setPipelineTriggerOpen).toHaveBeenCalledWith(false);

        const backdrop = screen.getByText(/run pipeline/i).closest("div.fixed");
        expect(backdrop).toBeTruthy();
        fireEvent.click(backdrop as HTMLElement, { target: backdrop, currentTarget: backdrop });
        expect(flowState.setPipelineTriggerOpen).toHaveBeenCalledWith(false);
    });

    it("disables execute when no nodes are present", () => {
        flowState.nodes = [];
        render(React.createElement(PipelineTriggerModal));

        const execute = screen.getByRole("button", { name: /execute pipeline/i });
        expect(execute.getAttribute("disabled")).not.toBeNull();
    });
});
