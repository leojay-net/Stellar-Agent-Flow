import { randomBytes, randomUUID, createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { Keypair } from "@stellar/stellar-sdk";

export interface StellarAuthChallenge {
    nonce: string;
    message: string;
    expiresAt: string;
}

interface NonceRecord {
    nonce: string;
    message: string;
    expiresAtMs: number;
}

interface SessionRecord {
    token: string;
    publicKey: string;
    expiresAtMs: number;
}

const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// Use globalThis to survive Next.js hot-module reloads in dev mode.
// Without this, the Maps would be reset each time the module is re-evaluated,
// causing session tokens created in /verify to vanish before /session can read them.
declare global {
    // eslint-disable-next-line no-var
    var __stellarAuthStore__: { nonceStore: Map<string, NonceRecord>; sessionStore: Map<string, SessionRecord> } | undefined;
}
if (!globalThis.__stellarAuthStore__) {
    globalThis.__stellarAuthStore__ = {
        nonceStore: new Map<string, NonceRecord>(),
        sessionStore: new Map<string, SessionRecord>(),
    };
}
const { nonceStore, sessionStore } = globalThis.__stellarAuthStore__;

function storeKey(publicKey: string, nonce: string) {
    return `${publicKey}:${nonce}`;
}

function nowMs() {
    return Date.now();
}

function trimExpired() {
    const now = nowMs();
    for (const [k, v] of nonceStore.entries()) {
        if (v.expiresAtMs <= now) {
            nonceStore.delete(k);
        }
    }

    for (const [k, v] of sessionStore.entries()) {
        if (v.expiresAtMs <= now) {
            sessionStore.delete(k);
        }
    }
}

function decodeSignature(signature: string): Buffer {
    const s = signature.trim();
    if (!s) throw new Error("signature is required");

    // Hex support: deadbeef... or 0xdeadbeef...
    const hex = s.startsWith("0x") ? s.slice(2) : s;
    if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
        return Buffer.from(hex, "hex");
    }

    // Base64 support
    return Buffer.from(s, "base64");
}

export function validatePublicKey(publicKey: string) {
    if (!publicKey || !publicKey.startsWith("G")) {
        throw new Error("invalid Stellar public key");
    }
    try {
        Keypair.fromPublicKey(publicKey);
    } catch {
        throw new Error("invalid Stellar public key");
    }
}

export function createChallenge(publicKey: string, domain: string): StellarAuthChallenge {
    validatePublicKey(publicKey);
    trimExpired();

    const nonce = randomBytes(16).toString("hex");
    const issuedAt = new Date().toISOString();
    const expiresAtMs = nowMs() + NONCE_TTL_MS;
    const expiresAt = new Date(expiresAtMs).toISOString();

    const message = [
        "AgentFlow Stellar Sign-In",
        `Domain: ${domain}`,
        `Public Key: ${publicKey}`,
        `Nonce: ${nonce}`,
        `Issued At: ${issuedAt}`,
        `Expires At: ${expiresAt}`,
        "Purpose: authenticate to AgentFlow",
    ].join("\n");

    nonceStore.set(storeKey(publicKey, nonce), { nonce, message, expiresAtMs });

    return { nonce, message, expiresAt };
}

export function verifyChallengeSignature(
    publicKey: string,
    nonce: string,
    message: string,
    signature: string,
) {
    validatePublicKey(publicKey);
    trimExpired();

    const key = storeKey(publicKey, nonce);
    const record = nonceStore.get(key);
    if (!record) {
        throw new Error("challenge not found or expired");
    }

    if (record.expiresAtMs <= nowMs()) {
        nonceStore.delete(key);
        throw new Error("challenge expired");
    }

    if (record.message !== message) {
        throw new Error("challenge message mismatch");
    }

    const kp = Keypair.fromPublicKey(publicKey);
    const sigBytes = decodeSignature(signature);
    const msgBytes = Buffer.from(message, "utf8");

    // Try multiple verification approaches to handle wallet differences:
    // 1. Raw UTF-8 bytes (standard Stellar SDK / nacl)
    // 2. SHA-256 of the message (some wallet extensions hash before signing)
    // 3. Freighter 5.0+ standard: SHA-256 of "Stellar Signed Message:\n" + message
    const prefixedMsgBytes = Buffer.concat([Buffer.from("Stellar Signed Message:\n", "utf8"), msgBytes]);

    const valid =
        kp.verify(msgBytes, sigBytes) ||
        kp.verify(createHash("sha256").update(msgBytes).digest(), sigBytes) ||
        kp.verify(createHash("sha256").update(prefixedMsgBytes).digest(), sigBytes);

    if (!valid) {
        throw new Error("invalid signature");
    }

    // One-time nonce, prevent replay.
    nonceStore.delete(key);

    const sessionToken = randomUUID();
    const expiresAtMs = nowMs() + SESSION_TTL_MS;
    const expiresAt = new Date(expiresAtMs).toISOString();
    sessionStore.set(sessionToken, {
        token: sessionToken,
        publicKey,
        expiresAtMs,
    });

    return {
        sessionToken,
        publicKey,
        expiresAt,
    };
}

export function validateSession(sessionToken: string, publicKey?: string) {
    trimExpired();
    const token = (sessionToken || "").trim();
    if (!token) {
        throw new Error("session token is required");
    }

    const record = sessionStore.get(token);
    if (!record) {
        throw new Error("invalid or expired session");
    }

    if (record.expiresAtMs <= nowMs()) {
        sessionStore.delete(token);
        throw new Error("session expired");
    }

    if (publicKey && record.publicKey !== publicKey) {
        throw new Error("session does not match public key");
    }

    return {
        sessionToken: record.token,
        publicKey: record.publicKey,
        expiresAt: new Date(record.expiresAtMs).toISOString(),
    };
}
