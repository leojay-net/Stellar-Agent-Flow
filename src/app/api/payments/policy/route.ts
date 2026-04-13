import { NextRequest, NextResponse } from "next/server";
import { fetchOnchainPolicy } from "@/lib/stellar-policy";

export const maxDuration = 60;

interface PolicyCheckBody {
    contractId: string;
    agentName: string;
    network?: "testnet" | "mainnet";
}

export async function POST(request: NextRequest) {
    const start = Date.now();

    try {
        const body = (await request.json()) as PolicyCheckBody;
        const contractId = (body.contractId || "").trim();
        const agentName = (body.agentName || "").trim();
        const network = body.network === "mainnet" ? "mainnet" : "testnet";

        if (!contractId || !agentName) {
            return NextResponse.json(
                {
                    success: false,
                    error: "contractId and agentName are required",
                    executionTimeMs: Date.now() - start,
                    source: "policy-check",
                },
                { status: 400 }
            );
        }

        const result = await fetchOnchainPolicy({
            contractId,
            agentName,
            network,
        });

        return NextResponse.json({
            success: true,
            result,
            executionTimeMs: Date.now() - start,
            source: "policy-check",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            {
                success: false,
                error: message,
                executionTimeMs: Date.now() - start,
                source: "policy-check",
            },
            { status: 500 }
        );
    }
}
