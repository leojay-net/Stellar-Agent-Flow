// ============================================================
// API Route: /api/negotiate
// Real agent-to-agent natural language negotiation via Gemini
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { clampTimeout } from "@/lib/server-timeout";

export const maxDuration = 60;

export interface NegotiateRequest {
    initiatorAgentId: string;
    initiatorAgentName: string;
    receiverAgentId: string;
    receiverAgentName: string;
    initiatorParams: Record<string, string>;
    receiverParams: Record<string, string>;
    negotiationGoal: string;
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(request: NextRequest) {
    try {
        const body: NegotiateRequest = await request.json();

        const {
            initiatorAgentName = "Agent A",
            receiverAgentName = "Agent B",
            initiatorParams = {},
            receiverParams = {},
            negotiationGoal = "reach consensus",
            conversationHistory = [],
        } = body;

        const geminiKey = process.env.GEMINI_API_KEY;

        if (!geminiKey) {
            return NextResponse.json({ success: false, error: "GEMINI_API_KEY is required for negotiation." }, { status: 500 });
        }

        const systemPrompt = `You are a multi-agent negotiation engine. Two AI agents are negotiating to agree on execution parameters for a shared task.

Agent A: "${initiatorAgentName}"
Agent A current parameters: ${JSON.stringify(initiatorParams, null, 2)}

Agent B: "${receiverAgentName}"  
Agent B current parameters: ${JSON.stringify(receiverParams, null, 2)}

Negotiation goal: "${negotiationGoal}"

Your job is to:
1. Analyze the compatibility of both agents' parameters
2. Propose concrete, merged parameter values that satisfy both agents
3. Identify any conflicts and resolve them with reasoned compromise
4. Return a structured response with: a brief negotiation summary, resolved parameter values, and confidence score

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Brief explanation of negotiation outcome",
  "resolvedParams": { "key": "value" },
  "conflicts": ["list of any conflicts found"],
  "confidence": 0.95,
  "agentAMessage": "What Agent A would say to Agent B",
  "agentBMessage": "What Agent B would say in response",
  "agreed": true
}`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...(Array.isArray(conversationHistory) ? conversationHistory : []),
            {
                role: "user",
                content: `Please negotiate and reach consensus on parameters for executing the goal: "${negotiationGoal}"`,
            },
        ];

        let lastGeminiError = "";
        let data: { choices?: { message?: { content?: string } }[] } | null = null;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${geminiKey}` },
                body: JSON.stringify({
                    model: "gemini-3.1-flash-lite-preview",
                    messages,
                    max_tokens: 800,
                    response_format: { type: "json_object" },
                }),
                signal: AbortSignal.timeout(clampTimeout(30000)),
            });

            if (res.ok) {
                data = await res.json() as { choices?: { message?: { content?: string } }[] };
                break;
            }

            const text = await res.text();
            lastGeminiError = `Gemini API error ${res.status}: ${text.slice(0, 200)}`;
            if ((res.status === 429 || res.status === 503) && attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
                continue;
            }
            break;
        }

        if (!data) {
            throw new Error(lastGeminiError || "Gemini API request failed.");
        }
        const rawContent = data.choices?.[0]?.message?.content || "{}";

        let parsedResult: Record<string, unknown>;

        try {
            parsedResult = JSON.parse(rawContent);
        } catch {
            throw new Error("Gemini returned invalid JSON for negotiation result.");
        }

        if (Object.keys(parsedResult).length === 0) {
            throw new Error("Gemini returned an empty negotiation result.");
        }

        return NextResponse.json({
            success: true,
            source: "gemini",
            model: "gemini-3.1-flash-lite-preview",
            ...parsedResult,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[negotiate] Error:", errorMessage);
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
