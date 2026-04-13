import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@xyflow/react", () => ({
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => React.createElement("div", { "data-testid": "rf-provider" }, children),
}));

vi.mock("@/components/registry/registry-sidebar", () => ({
    default: () => React.createElement("div", null, "RegistrySidebar"),
}));
vi.mock("@/components/canvas/flow-canvas", () => ({
    default: () => React.createElement("div", null, "FlowCanvas"),
}));
vi.mock("@/components/inspector/inspector-panel", () => ({
    default: () => React.createElement("div", null, "InspectorPanel"),
}));
vi.mock("@/components/canvas/activity-panel", () => ({
    default: () => React.createElement("div", null, "ActivityPanel"),
}));
vi.mock("@/components/canvas/toolbar", () => ({
    default: () => React.createElement("div", null, "Toolbar"),
}));
vi.mock("@/components/canvas/execution-log", () => ({
    default: () => React.createElement("div", null, "ExecutionLog"),
}));
vi.mock("@/components/modals/publish-agent-modal", () => ({
    default: () => React.createElement("div", null, "PublishAgentModal"),
}));
vi.mock("@/components/canvas/pipeline-trigger-modal", () => ({
    default: () => React.createElement("div", null, "PipelineTriggerModal"),
}));
vi.mock("@/components/canvas/chat-panel", () => ({
    default: () => React.createElement("div", null, "ChatPanel"),
}));

import HomePage from "@/app/page";

describe("app page", () => {
    it("renders the main shell with all primary regions", () => {
        const html = renderToStaticMarkup(React.createElement(HomePage));
        expect(html).toContain("Toolbar");
        expect(html).toContain("RegistrySidebar");
        expect(html).toContain("FlowCanvas");
        expect(html).toContain("InspectorPanel");
        expect(html).toContain("PublishAgentModal");
    });
});
