// ============================================================
// API Route: /api/export-flow
// Exports the current canvas flow as an AMP-compatible JSON.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nodes, edges, flowName, flowId } = body;

        if (!nodes || !edges) {
            return NextResponse.json({ error: "Missing nodes or edges in request body" }, { status: 400 });
        }

        const ampFlow = {
            ampVersion: "1.0",
            exportedAt: new Date().toISOString(),
            flowId: flowId || `flow-${Date.now()}`,
            flowName: flowName || "Untitled Flow",
            nodeCount: nodes.length,
            edgeCount: edges.length,
            agents: nodes.map((node: { id: string; type: string; data: { agentId?: string; agentName?: string; label?: string; parameterValues?: Record<string, string> }; position: { x: number; y: number } }) => ({
                id: node.id,
                type: node.type,
                agentId: node.data?.agentId,
                agentName: node.data?.agentName || node.data?.label,
                parameterValues: node.data?.parameterValues || {},
                position: node.position,
            })),
            connections: edges.map((edge: { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }) => ({
                id: edge.id,
                from: edge.source,
                to: edge.target,
                fromHandle: edge.sourceHandle,
                toHandle: edge.targetHandle,
            })),
        };

        return NextResponse.json({ success: true, flow: ampFlow });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to export flow";
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        description: "POST to this endpoint with { nodes, edges, flowName, flowId } to export your flow as AMP JSON.",
        ampVersion: "1.0",
    });
}
