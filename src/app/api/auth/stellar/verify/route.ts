import { NextRequest, NextResponse } from "next/server";
import { verifyChallengeSignature } from "@/lib/stellar-auth";

export const maxDuration = 20;

interface VerifyBody {
    publicKey?: string;
    nonce?: string;
    message?: string;
    signature?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as VerifyBody;
        const publicKey = (body.publicKey || "").trim();
        const nonce = (body.nonce || "").trim();
        const message = body.message || "";
        const signature = (body.signature || "").trim();

        if (!publicKey || !nonce || !message || !signature) {
            return NextResponse.json(
                { success: false, error: "publicKey, nonce, message, and signature are required" },
                { status: 400 }
            );
        }

        const session = verifyChallengeSignature(publicKey, nonce, message, signature);

        return NextResponse.json({
            success: true,
            authMethod: "stellar-signature",
            ...session,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "signature verification failed";
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}
