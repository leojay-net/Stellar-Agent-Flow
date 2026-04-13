/** @vitest-environment jsdom */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const flowState = {
    addAgentToCanvas: vi.fn(),
};

vi.mock("@/store/flow-store", () => ({
    useFlowStore: () => flowState,
}));

import RegistrySidebar from "@/components/registry/registry-sidebar";

describe("registry sidebar interactions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("loads community agents and adds selected agents to canvas", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                agents: [
                    {
                        id: "community-agent-1",
                        name: "Community Agent",
                        sponsor: "Community",
                        category: "ai",
                        iconKey: "BrainCircuit",
                        tags: ["community"],
                        description: "demo",
                        endpointUrl: "/api/agents/community-agent-1",
                        parameters: [],
                    },
                ],
            }),
        } as Response);

        render(React.createElement(RegistrySidebar));

        await waitFor(() => {
            expect(screen.getByTestId("registry-agent-community-agent-1")).toBeTruthy();
        });

        fireEvent.click(screen.getByTestId("registry-agent-orchestrator-core"));
        fireEvent.click(screen.getByTestId("registry-agent-community-agent-1"));

        expect(flowState.addAgentToCanvas).toHaveBeenCalledTimes(2);
    });

    it("filters by search query", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ agents: [] }),
        } as Response);

        render(React.createElement(RegistrySidebar));

        fireEvent.change(screen.getByTestId("registry-search-input"), {
            target: { value: "this-will-not-match" },
        });

        await waitFor(() => {
            expect(screen.getByText(/no agents match your search/i)).toBeTruthy();
        });
    });

    it("refreshes community agents via button and publish event", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ agents: [] }),
        } as Response);

        render(React.createElement(RegistrySidebar));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        fireEvent.click(screen.getByTitle(/refresh community agents/i));
        expect(fetchMock).toHaveBeenCalledTimes(2);

        act(() => {
            window.dispatchEvent(new Event("agentflow:agent-published"));
        });
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(3);
        });
    });
});
