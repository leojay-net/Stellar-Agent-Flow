import { NextRequest, NextResponse } from "next/server";
import { clampTimeout } from "@/lib/server-timeout";
import { validateSession } from "@/lib/stellar-auth";
import { resolvePaymentPolicy } from "@/lib/payment-policy";

export const maxDuration = 60;

interface AgentExecuteRequest {
    agentId: string;
    agentName: string;
    parameterValues: Record<string, string>;
    upstreamResult?: Record<string, unknown>;
    endpointUrl?: string;
    flowId: string;
    stepNumber: number;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body = (await request.json()) as AgentExecuteRequest;
        const { agentId, parameterValues, upstreamResult, endpointUrl, flowId, stepNumber } = body;

        const paymentPolicy = await resolvePaymentPolicy(agentId, parameterValues || {});
        if (paymentPolicy.authRequired) {
            const sessionToken = request.headers.get("X-AgentFlow-Session") || "";
            const publicKey = request.headers.get("X-AgentFlow-Public-Key") || undefined;
            try {
                validateSession(sessionToken, publicKey);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unauthorized";
                return NextResponse.json(
                    {
                        success: false,
                        agentId,
                        error: `Auth required for ${paymentPolicy.mode} agent: ${message}`,
                        paymentPolicySource: paymentPolicy.source,
                        executionTimeMs: Date.now() - startTime,
                        source: "auth",
                    },
                    { status: 401 }
                );
            }
        }

        if (!agentId) {
            return NextResponse.json(
                {
                    success: false,
                    agentId: "",
                    error: "agentId is required",
                    executionTimeMs: Date.now() - startTime,
                    source: "validation",
                },
                { status: 400 }
            );
        }

        if (endpointUrl && endpointUrl.startsWith("/api/agents/")) {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
            const absoluteUrl = `${baseUrl}${endpointUrl}`;
            return await executeInternalAgent(
                agentId,
                absoluteUrl,
                parameterValues,
                upstreamResult,
                flowId,
                stepNumber,
                startTime,
                request,
                paymentPolicy.mode
            );
        }

        if (endpointUrl && (endpointUrl.startsWith("http://") || endpointUrl.startsWith("https://"))) {
            return await executeCustomEndpoint(agentId, endpointUrl, parameterValues, flowId, stepNumber, startTime);
        }

        return NextResponse.json({
            success: true,
            agentId,
            result: {
                action: "noop",
                status: "completed",
                note: "No endpointUrl configured for this agent.",
            },
            executionTimeMs: Date.now() - startTime,
            source: "noop",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            {
                success: false,
                agentId: "",
                error: message,
                executionTimeMs: Date.now() - startTime,
                source: "error",
            },
            { status: 500 }
        );
    }
}

async function executeInternalAgent(
    agentId: string,
    absoluteUrl: string,
    params: Record<string, string>,
    upstreamResult: Record<string, unknown> | undefined,
    flowId: string,
    step: number,
    startTime: number,
    request: NextRequest,
    paymentMode: string
): Promise<NextResponse> {
    try {
        const forwardedSession = request.headers.get("X-AgentFlow-Session");
        const forwardedPublicKey = request.headers.get("X-AgentFlow-Public-Key");

        const response = await fetch(absoluteUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Flow-Id": flowId,
                "X-Step": String(step),
                "X-AgentFlow-Payment-Mode": paymentMode,
                ...(forwardedSession ? { "X-AgentFlow-Session": forwardedSession } : {}),
                ...(forwardedPublicKey ? { "X-AgentFlow-Public-Key": forwardedPublicKey } : {}),
            },
            body: JSON.stringify({
                ...params,
                ...(upstreamResult ? { _upstream: JSON.stringify(upstreamResult) } : {}),
            }),
            signal: AbortSignal.timeout(clampTimeout(55000)),
        });

        const data = await response.json();
        if (!response.ok || data.success === false) {
            return NextResponse.json(
                {
                    success: false,
                    agentId,
                    error: data.error || `Agent returned ${response.status}`,
                    executionTimeMs: Date.now() - startTime,
                    source: "agent-api",
                },
                { status: response.ok ? 500 : response.status }
            );
        }

        return NextResponse.json({
            success: true,
            agentId,
            result: data.result ?? data,
            executionTimeMs: Date.now() - startTime,
            source: "agent-api",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal agent call failed";
        return NextResponse.json(
            {
                success: false,
                agentId,
                error: message,
                executionTimeMs: Date.now() - startTime,
                source: "agent-api",
            },
            { status: 500 }
        );
    }
}

async function executeCustomEndpoint(
    agentId: string,
    endpointUrl: string,
    params: Record<string, string>,
    flowId: string,
    step: number,
    startTime: number
): Promise<NextResponse> {
    try {
        const ampMessage = {
            ampVersion: "1.0",
            flowId,
            step,
            fromAgent: { id: "agentflow-orchestrator" },
            toAgent: { id: agentId },
            payload: params,
            timestamp: new Date().toISOString(),
        };

        const response = await fetch(endpointUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "AgentFlow/1.0",
                "X-Flow-Id": flowId,
                "X-Step": String(step),
            },
            body: JSON.stringify(ampMessage),
            signal: AbortSignal.timeout(clampTimeout(30000)),
        });

        if (!response.ok) {
            throw new Error(`Endpoint returned ${response.status}: ${response.statusText}`);
        }

        const result = (await response.json()) as Record<string, unknown>;
        return NextResponse.json({
            success: true,
            agentId,
            result,
            executionTimeMs: Date.now() - startTime,
            source: "custom-endpoint",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Network error";
        return NextResponse.json(
            {
                success: false,
                agentId,
                error: `Custom endpoint failed: ${message}`,
                executionTimeMs: Date.now() - startTime,
                source: "custom-endpoint",
            },
            { status: 502 }
        );
    }
}
