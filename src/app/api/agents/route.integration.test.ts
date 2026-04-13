import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/agents/route";

describe("/api/agents", () => {
    it("lists community agents", async () => {
        const response = await GET();
        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(Array.isArray(json.agents)).toBe(true);
        expect(typeof json.total).toBe("number");
    });

    it("validates required fields on publish", async () => {
        const response = await POST(
            new NextRequest("http://localhost/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "", description: "" }),
            })
        );

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.success).toBe(false);
    });

    it("publishes a community agent", async () => {
        const response = await POST(
            new NextRequest("http://localhost/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: "Coverage Agent",
                    description: "agent used by integration tests",
                    category: "core",
                    sponsor: "Tests",
                }),
            })
        );

        expect(response.status).toBe(201);
        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.agent.id.startsWith("community-coverage-agent-")).toBe(true);
        expect(json.agent.isCustom).toBe(true);
    });
});
