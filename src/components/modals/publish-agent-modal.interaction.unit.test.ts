/** @vitest-environment jsdom */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const flowState = {
    isPublishModalOpen: true,
    setPublishModalOpen: vi.fn(),
    addAgentToCanvas: vi.fn(),
};

vi.mock("@/store/flow-store", () => ({
    useFlowStore: (selector?: (s: typeof flowState) => unknown) => {
        if (selector) return selector(flowState);
        return flowState;
    },
}));

import PublishAgentModal from "@/components/modals/publish-agent-modal";

describe("publish agent modal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, "dispatchEvent");
        Object.defineProperty(window, "location", {
            value: { origin: "http://localhost:3000" },
            configurable: true,
        });
        Object.defineProperty(navigator, "clipboard", {
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
            configurable: true,
        });
    });

    it("publishes an agent and shows success state", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                agent: {
                    id: "community-agent-1",
                    name: "Agent One",
                    category: "core",
                    sponsor: "Community",
                    description: "desc",
                    iconKey: "Cpu",
                    version: "1.0.0",
                    parameters: [],
                    tags: [],
                    endpointUrl: "/api/agents/community-agent-1",
                    isCustom: true,
                },
            }),
        } as Response);

        render(React.createElement(PublishAgentModal));

        fireEvent.change(screen.getByPlaceholderText(/my custom agent/i), { target: { value: "Agent One" } });
        fireEvent.change(screen.getByPlaceholderText(/what does this agent do/i), { target: { value: "Does useful work" } });
        fireEvent.click(screen.getByRole("button", { name: /publish agent/i }));

        await waitFor(() => {
            expect(flowState.addAgentToCanvas).toHaveBeenCalled();
            expect(screen.getByText(/agent published/i)).toBeTruthy();
        });
    });

    it("shows server error when publish fails", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: false,
            json: async () => ({ error: "publish failed" }),
        } as Response);

        render(React.createElement(PublishAgentModal));

        fireEvent.change(screen.getByPlaceholderText(/my custom agent/i), { target: { value: "Agent Two" } });
        fireEvent.change(screen.getByPlaceholderText(/what does this agent do/i), { target: { value: "desc" } });
        fireEvent.click(screen.getByRole("button", { name: /publish agent/i }));

        await waitFor(() => {
            expect(screen.getByText(/publish failed/i)).toBeTruthy();
        });
    });

    it("blocks submit when required fields are empty", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch");
        render(React.createElement(PublishAgentModal));

        fireEvent.click(screen.getByRole("button", { name: /publish agent/i }));

        await waitFor(() => {
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    it("closes on cancel and backdrop click", () => {
        render(React.createElement(PublishAgentModal));

        fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
        expect(flowState.setPublishModalOpen).toHaveBeenCalledWith(false);

        const backdrop = document.querySelector(".absolute.inset-0.bg-black\\/60");
        expect(backdrop).toBeTruthy();
        fireEvent.click(backdrop as Element);
        expect(flowState.setPublishModalOpen).toHaveBeenCalledWith(false);
    });

    it("copies endpoint and closes from success state", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                agent: {
                    id: "community-agent-copy",
                    name: "Copy Agent",
                    category: "core",
                    sponsor: "Community",
                    description: "desc",
                    iconKey: "Cpu",
                    version: "1.0.0",
                    parameters: [],
                    tags: [],
                    endpointUrl: "/api/agents/community-agent-copy",
                    isCustom: true,
                },
            }),
        } as Response);

        render(React.createElement(PublishAgentModal));
        fireEvent.change(screen.getByPlaceholderText(/my custom agent/i), { target: { value: "Copy Agent" } });
        fireEvent.change(screen.getByPlaceholderText(/what does this agent do/i), { target: { value: "Copies endpoint" } });
        fireEvent.click(screen.getByRole("button", { name: /publish agent/i }));

        await waitFor(() => {
            expect(screen.getByText(/agent published/i)).toBeTruthy();
        });

        const copyButton = document.querySelector("button[title='Copy endpoint']") as HTMLButtonElement;
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalled();
        });

        fireEvent.click(screen.getByRole("button", { name: /done/i }));
        expect(flowState.setPublishModalOpen).toHaveBeenCalledWith(false);
    });
});
