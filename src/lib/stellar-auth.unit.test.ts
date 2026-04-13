import { describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
    createChallenge,
    validatePublicKey,
    validateSession,
    verifyChallengeSignature,
} from "@/lib/stellar-auth";

describe("stellar-auth", () => {
    it("validates a proper Stellar public key", () => {
        const kp = Keypair.random();
        expect(() => validatePublicKey(kp.publicKey())).not.toThrow();
    });

    it("rejects an invalid public key", () => {
        expect(() => validatePublicKey("not-a-stellar-key")).toThrow(/invalid Stellar public key/i);
    });

    it("creates challenge and verifies signed message", () => {
        const kp = Keypair.random();
        const challenge = createChallenge(kp.publicKey(), "localhost:3000");
        const signature = kp.sign(Buffer.from(challenge.message, "utf8")).toString("base64");

        const verified = verifyChallengeSignature(
            kp.publicKey(),
            challenge.nonce,
            challenge.message,
            signature
        );

        expect(verified.sessionToken).toBeTruthy();
        expect(verified.publicKey).toBe(kp.publicKey());
        expect(new Date(verified.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("rejects nonce replay after successful verification", () => {
        const kp = Keypair.random();
        const challenge = createChallenge(kp.publicKey(), "localhost:3000");
        const signature = kp.sign(Buffer.from(challenge.message, "utf8")).toString("base64");

        verifyChallengeSignature(kp.publicKey(), challenge.nonce, challenge.message, signature);

        expect(() =>
            verifyChallengeSignature(kp.publicKey(), challenge.nonce, challenge.message, signature)
        ).toThrow(/challenge not found|expired/i);
    });

    it("validates active session and enforces public key match", () => {
        const kp = Keypair.random();
        const challenge = createChallenge(kp.publicKey(), "localhost:3000");
        const signature = kp.sign(Buffer.from(challenge.message, "utf8")).toString("base64");
        const verified = verifyChallengeSignature(kp.publicKey(), challenge.nonce, challenge.message, signature);

        const session = validateSession(verified.sessionToken, kp.publicKey());
        expect(session.publicKey).toBe(kp.publicKey());

        const different = Keypair.random();
        expect(() => validateSession(verified.sessionToken, different.publicKey())).toThrow(
            /does not match public key/i
        );
    });
});
