import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/stellar-auth";

export const maxDuration = 20;

interface SessionBody {
    sessionToken?: string;
    publicKey?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as SessionBody;
        const sessionToken = (body.sessionToken || "").trim();
        const publicKey = (body.publicKey || "").trim();

        if (!sessionToken) {
            return NextResponse.json({ success: false, error: "sessionToken is required" }, { status: 400 });
        }

        const session = validateSession(sessionToken, publicKey || undefined);
        return NextResponse.json({ success: true, ...session });
    } catch (error) {
        const message = error instanceof Error ? error.message : "session invalid";
        return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
}
