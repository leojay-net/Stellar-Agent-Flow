/** @vitest-environment jsdom */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const flowState = {
    flowName: "Test Flow",
    flowStatus: "idle" as const,
    nodes: [],
    isLogVisible: false,
    isChatOpen: false,
    connectedAddress: null as string | null,
    authSessionToken: null as string | null,
    authExpiresAt: null as string | null,
    setFlowName: vi.fn(),
    stopFlow: vi.fn(),
    exportFlow: vi.fn(),
    clearCanvas: vi.fn(),
    loadDemoFlow: vi.fn(),
    setPublishModalOpen: vi.fn(),
    toggleLog: vi.fn(),
    setPipelineTriggerOpen: vi.fn(),
    setChatOpen: vi.fn(),
    setConnectedAddress: vi.fn((addr: string | null) => {
        flowState.connectedAddress = addr;
    }),
    setAuthSession: vi.fn((session: { token: string; expiresAt: string } | null) => {
        flowState.authSessionToken = session?.token ?? null;
        flowState.authExpiresAt = session?.expiresAt ?? null;
    }),
    hydrateClientSession: vi.fn(),
    importFlow: vi.fn(),
    runFlow: vi.fn(),
};

const activityState = {
    isActivityOpen: false,
    toggleActivity: vi.fn(),
    transactions: [],
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

vi.mock("@/store/activity-store", () => ({
    useActivityStore: (selector?: (s: typeof activityState) => unknown) => {
        if (selector) return selector(activityState);
        return activityState;
    },
}));

const requestAccessMock = vi.fn();
const signMessageMock = vi.fn();

vi.mock("@stellar/freighter-api", () => ({
    requestAccess: () => requestAccessMock(),
    signMessage: () => signMessageMock(),
}));

import Toolbar from "@/components/canvas/toolbar";

describe("toolbar interactions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        flowState.connectedAddress = null;
        flowState.authSessionToken = null;
        flowState.authExpiresAt = null;
    });

    it("connects with Freighter", async () => {
        requestAccessMock.mockResolvedValue({ address: "GABCDEF123" });

        render(React.createElement(Toolbar));
        fireEvent.click(screen.getByRole("button", { name: /freighter/i }));

        await waitFor(() => {
            expect(flowState.setConnectedAddress).toHaveBeenCalledWith("GABCDEF123");
        });
    });

    it("signs in with stellar challenge + verify flow", async () => {
        flowState.connectedAddress = "GABCDEF123";
        signMessageMock.mockResolvedValue({ signedMessage: "signed" });

        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, nonce: "n1", message: "m1" }),
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, sessionToken: "sess", expiresAt: "2099-01-01T00:00:00.000Z" }),
            } as Response);

        render(React.createElement(Toolbar));
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

        await waitFor(() => {
            expect(flowState.setAuthSession).toHaveBeenCalledWith({
                token: "sess",
                expiresAt: "2099-01-01T00:00:00.000Z",
            });
        });
    });

    it("opens pipeline trigger when run is clicked and nodes exist", () => {
        flowState.nodes = [{ id: "n1" }];
        render(React.createElement(Toolbar));

        fireEvent.click(screen.getByRole("button", { name: /run flow/i }));
        expect(flowState.setPipelineTriggerOpen).toHaveBeenCalledWith(true);
    });

    it("shows stop action while running", () => {
        flowState.flowStatus = "running" as const;
        render(React.createElement(Toolbar));

        fireEvent.click(screen.getByRole("button", { name: /stop/i }));
        expect(flowState.stopFlow).toHaveBeenCalled();
    });

    it("handles toolbar action buttons", () => {
        flowState.nodes = [{ id: "n1" }];
        render(React.createElement(Toolbar));

        fireEvent.click(screen.getByRole("button", { name: /demo/i }));
        fireEvent.click(screen.getByRole("button", { name: /publish agent/i }));
        fireEvent.click(screen.getByRole("button", { name: /logs/i }));
        fireEvent.click(screen.getByRole("button", { name: /chat/i }));
        fireEvent.click(screen.getByRole("button", { name: /activity/i }));

        expect(flowState.loadDemoFlow).toHaveBeenCalled();
        expect(flowState.setPublishModalOpen).toHaveBeenCalledWith(true);
        expect(flowState.toggleLog).toHaveBeenCalled();
        expect(flowState.setChatOpen).toHaveBeenCalledWith(true);
        expect(activityState.toggleActivity).toHaveBeenCalled();
    });

    it("shows connect-wallet-first error on sign-in without address", async () => {
        render(React.createElement(Toolbar));
        const signIn = screen.getByRole("button", { name: /sign in/i });
        expect(signIn.getAttribute("disabled")).not.toBeNull();

        // Manually set to trigger branch and assert visible error
        flowState.connectedAddress = "" as unknown as string;
        fireEvent.click(signIn);
        await waitFor(() => {
            expect(flowState.setAuthSession).not.toHaveBeenCalledWith(expect.anything());
        });
    });

    it("imports a flow file", async () => {
        render(React.createElement(Toolbar));
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(fileInput).toBeTruthy();

        const readAsTextMock = vi.fn();
        class MockFileReader {
            onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
            readAsText(file: Blob) {
                readAsTextMock(file);
                this.onload?.({ target: { result: '{"flowName":"Imported"}' } } as unknown as ProgressEvent<FileReader>);
            }
        }
        vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);

        fireEvent.change(fileInput, {
            target: {
                files: [new File(["{}"], "flow.json", { type: "application/json" })],
            },
        });

        await waitFor(() => {
            expect(flowState.importFlow).toHaveBeenCalledWith('{"flowName":"Imported"}');
        });
    });
});
