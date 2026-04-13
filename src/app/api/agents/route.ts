// ============================================================
// API Route: /api/agents
// GET  — list all community-published custom agents
// POST — publish a new custom agent to the registry
// Uses a module-level in-memory store (persists across requests
// while the dev server is running; ideal for hackathon use).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import type { AgentDefinition } from "@/types";
import { COMMUNITY_AGENTS_STORE as CUSTOM_AGENTS_STORE } from "@/lib/agent-store";

// CUSTOM_AGENTS_STORE is the module-level singleton from @/lib/agent-store,
// shared across both /api/agents and /api/agents/[agentId] routes.

// ── GET /api/agents ─────────────────────────────────────────
export async function GET() {
    const agents = Array.from(CUSTOM_AGENTS_STORE.values());
    return NextResponse.json({ success: true, agents, total: agents.length });
}

// ── POST /api/agents ─────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description, category, sponsor, endpointUrl } = body as {
            name: string;
            description: string;
            category: string;
            sponsor?: string;
            endpointUrl?: string;
        };

        if (!name?.trim() || !description?.trim()) {
            return NextResponse.json(
                { success: false, error: "name and description are required" },
                { status: 400 }
            );
        }

        const id = `community-${name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")}-${Date.now()}`;

        const agent: AgentDefinition = {
            id,
            name: name.trim(),
            description: description.trim(),
            category: (category as AgentDefinition["category"]) || "core",
            sponsor: sponsor?.trim() || "Community",
            version: "1.0.0",
            iconKey: "Box",
            parameters: [
                {
                    name: "input",
                    label: "Input",
                    type: "text",
                    defaultValue: "",
                    required: false,
                    description: "Input payload for the agent",
                },
            ],
            tags: [category || "custom", "community"],
            endpointUrl: endpointUrl?.trim() || undefined,
            isCustom: true,
        };

        CUSTOM_AGENTS_STORE.set(id, agent);

        return NextResponse.json({ success: true, agent }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
