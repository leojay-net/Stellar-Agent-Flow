import { NextRequest, NextResponse } from "next/server";
import { createChallenge } from "@/lib/stellar-auth";

export const maxDuration = 20;

interface ChallengeBody {
    publicKey?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as ChallengeBody;
        const publicKey = (body.publicKey || "").trim();
        if (!publicKey) {
            return NextResponse.json({ success: false, error: "publicKey is required" }, { status: 400 });
        }

        const domain = request.headers.get("host") || "agentflow.local";
        const challenge = createChallenge(publicKey, domain);

        return NextResponse.json({
            success: true,
            publicKey,
            ...challenge,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "failed to create challenge";
        return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
}
