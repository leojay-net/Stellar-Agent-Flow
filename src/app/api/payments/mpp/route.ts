import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/stellar-auth";
import { createMppSettlementIntent } from "@/lib/mpp";

export const maxDuration = 60;

interface MppRequestBody {
    rail: "mpp_charge" | "mpp_session";
    agentId: string;
    amountStroops?: string;
    assetCode?: string;
    network?: "testnet" | "mainnet";
    objective?: string;
    execute?: boolean;
}

export async function POST(request: NextRequest) {
    const start = Date.now();

    try {
        const body = (await request.json()) as MppRequestBody;
        if (body.rail !== "mpp_charge" && body.rail !== "mpp_session") {
            return NextResponse.json(
                {
                    success: false,
                    error: "rail must be mpp_charge or mpp_session",
                    executionTimeMs: Date.now() - start,
                },
                { status: 400 }
            );
        }

        const sessionToken = request.headers.get("X-AgentFlow-Session") || "";
        const publicKey = request.headers.get("X-AgentFlow-Public-Key") || "";
        const session = validateSession(sessionToken, publicKey);

        const result = createMppSettlementIntent({
            rail: body.rail,
            agentId: body.agentId || "agentflow",
            payer: session.publicKey,
            amountStroops: body.amountStroops || "100000",
            assetCode: body.assetCode || "XLM",
            network: body.network === "mainnet" ? "mainnet" : "testnet",
            objective: body.objective || "premium agent execution",
        });

        if (body.execute) {
            const executorUrl = (process.env.MPP_SETTLEMENT_EXECUTOR_URL || "").trim();
            if (!executorUrl) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "MPP_SETTLEMENT_EXECUTOR_URL is not configured",
                        result,
                        executionTimeMs: Date.now() - start,
                        source: "mpp",
                    },
                    { status: 501 }
                );
            }

            const settleResponse = await fetch(executorUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intent: result,
                    session: {
                        publicKey: session.publicKey,
                    },
                }),
            });

            const settleBody = (await settleResponse.json().catch(() => ({}))) as Record<string, unknown>;
            if (!settleResponse.ok) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "MPP executor rejected settlement",
                        executorStatus: settleResponse.status,
                        executorResponse: settleBody,
                        result,
                        executionTimeMs: Date.now() - start,
                        source: "mpp",
                    },
                    { status: 502 }
                );
            }

            return NextResponse.json({
                success: true,
                result,
                settlement: {
                    status: "submitted",
                    executorUrl,
                    response: settleBody,
                },
                executionTimeMs: Date.now() - start,
                source: "mpp",
            });
        }

        return NextResponse.json({
            success: true,
            result,
            executionTimeMs: Date.now() - start,
            source: "mpp",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const status = message.includes("session") ? 401 : 500;

        return NextResponse.json(
            {
                success: false,
                error: message,
                executionTimeMs: Date.now() - start,
                source: "mpp",
            },
            { status }
        );
    }
}
