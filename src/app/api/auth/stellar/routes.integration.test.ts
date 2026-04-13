import { describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { NextRequest } from "next/server";
import { POST as challengePOST } from "@/app/api/auth/stellar/challenge/route";
import { POST as verifyPOST } from "@/app/api/auth/stellar/verify/route";
import { POST as sessionPOST } from "@/app/api/auth/stellar/session/route";

describe("stellar auth routes", () => {
    it("rejects missing public key in challenge", async () => {
        const response = await challengePOST(
            new NextRequest("http://localhost/api/auth/stellar/challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            })
        );
        expect(response.status).toBe(400);
    });

    it("completes challenge -> verify -> session flow", async () => {
        const kp = Keypair.random();

        const challengeRes = await challengePOST(
            new NextRequest("http://localhost/api/auth/stellar/challenge", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    host: "localhost:3000",
                },
                body: JSON.stringify({ publicKey: kp.publicKey() }),
            })
        );
        expect(challengeRes.status).toBe(200);

        const challenge = await challengeRes.json();
        expect(challenge.success).toBe(true);

        const signature = Buffer.from(kp.sign(Buffer.from(challenge.message, "utf8"))).toString("base64");

        const verifyRes = await verifyPOST(
            new NextRequest("http://localhost/api/auth/stellar/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    publicKey: kp.publicKey(),
                    nonce: challenge.nonce,
                    message: challenge.message,
                    signature,
                }),
            })
        );
        expect(verifyRes.status).toBe(200);

        const verified = await verifyRes.json();
        expect(verified.success).toBe(true);
        expect(verified.sessionToken).toBeTruthy();

        const sessionRes = await sessionPOST(
            new NextRequest("http://localhost/api/auth/stellar/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionToken: verified.sessionToken,
                    publicKey: kp.publicKey(),
                }),
            })
        );

        expect(sessionRes.status).toBe(200);
        const session = await sessionRes.json();
        expect(session.success).toBe(true);
        expect(session.publicKey).toBe(kp.publicKey());
    });

    it("validates required fields in verify route", async () => {
        const response = await verifyPOST(
            new NextRequest("http://localhost/api/auth/stellar/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publicKey: "", nonce: "", message: "", signature: "" }),
            })
        );

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.success).toBe(false);
    });

    it("returns 401 for invalid verify signature", async () => {
        const kp = Keypair.random();

        const response = await verifyPOST(
            new NextRequest("http://localhost/api/auth/stellar/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    publicKey: kp.publicKey(),
                    nonce: "nonce",
                    message: "message",
                    signature: "bad-signature",
                }),
            })
        );

        expect(response.status).toBe(401);
        const json = await response.json();
        expect(json.success).toBe(false);
    });

    it("requires session token for session route", async () => {
        const response = await sessionPOST(
            new NextRequest("http://localhost/api/auth/stellar/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publicKey: "GABC" }),
            })
        );

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.success).toBe(false);
    });

    it("returns 401 for invalid session token", async () => {
        const response = await sessionPOST(
            new NextRequest("http://localhost/api/auth/stellar/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionToken: "invalid.token.payload",
                    publicKey: "GBAD",
                }),
            })
        );

        expect(response.status).toBe(401);
        const json = await response.json();
        expect(json.success).toBe(false);
    });
});
