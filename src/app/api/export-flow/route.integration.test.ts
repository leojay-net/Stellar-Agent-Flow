import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/export-flow/route";

describe("/api/export-flow", () => {
    it("returns endpoint description via GET", async () => {
        const response = await GET();
        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.ampVersion).toBe("1.0");
    });

    it("returns 400 when required payload is missing", async () => {
        const response = await POST(
            new NextRequest("http://localhost/api/export-flow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nodes: [] }),
            })
        );

        expect(response.status).toBe(400);
    });

    it("exports a valid flow payload", async () => {
        const response = await POST(
            new NextRequest("http://localhost/api/export-flow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    flowName: "Test Flow",
                    flowId: "flow-123",
                    nodes: [
                        {
                            id: "n1",
                            type: "agentNode",
                            data: {
                                agentId: "orchestrator-core",
                                agentName: "Orchestrator",
                                parameterValues: { executionMode: "sequential" },
                            },
                            position: { x: 100, y: 200 },
                        },
                    ],
                    edges: [],
                }),
            })
        );

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.flow.nodeCount).toBe(1);
        expect(json.flow.flowId).toBe("flow-123");
        expect(json.flow.agents[0].agentId).toBe("orchestrator-core");
    });

    it("uses defaults for missing flowId and flowName", async () => {
        const response = await POST(
            new NextRequest("http://localhost/api/export-flow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nodes: [
                        {
                            id: "n1",
                            type: "agentNode",
                            data: { label: "Fallback Label" },
                            position: { x: 0, y: 0 },
                        },
                    ],
                    edges: [
                        {
                            id: "e1",
                            source: "n1",
                            target: "n2",
                        },
                    ],
                }),
            })
        );

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.flow.flowName).toBe("Untitled Flow");
        expect(String(json.flow.flowId)).toMatch(/^flow-/);
        expect(json.flow.agents[0].agentName).toBe("Fallback Label");
    });

    it("returns 500 for invalid JSON body", async () => {
        const response = await POST(
            new NextRequest("http://localhost/api/export-flow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{invalid",
            })
        );

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(json.success).toBe(false);
    });
});
