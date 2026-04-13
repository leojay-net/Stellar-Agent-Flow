import { rpc, xdr, scValToNative } from "@stellar/stellar-sdk";
import { createHash } from "node:crypto";

export type OnchainPaymentMode = "free" | "x402" | "mpp_charge" | "mpp_session";

interface OnchainPolicyInput {
    contractId: string;
    agentName: string;
    network: "testnet" | "mainnet";
}

export interface OnchainPolicyResult {
    mode: OnchainPaymentMode | null;
    source: "rpc" | "cache" | "unavailable";
    cacheKey: string;
}

interface PolicyCacheValue {
    mode: OnchainPaymentMode | null;
    expiresAtMs: number;
}

const POLICY_CACHE_TTL_MS = 20_000;
const policyCache = new Map<string, PolicyCacheValue>();

function deriveAgentIdHex(agentName: string) {
    return createHash("sha256").update(agentName.trim().toLowerCase()).digest("hex");
}

function sorobanRpcUrl(network: "testnet" | "mainnet") {
    if (network === "mainnet") {
        return process.env.SOROBAN_RPC_URL_MAINNET || "https://mainnet.sorobanrpc.com";
    }
    return process.env.SOROBAN_RPC_URL_TESTNET || "https://soroban-testnet.stellar.org";
}

function parsePaymentMode(raw: unknown): OnchainPaymentMode | null {
    if (typeof raw === "string") {
        const normalized = raw.trim().toLowerCase();
        if (normalized === "free" || normalized === "x402" || normalized === "mpp_charge" || normalized === "mpp_session") {
            return normalized;
        }
        return null;
    }

    if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
        const tag = raw[0].trim().toLowerCase();
        if (tag === "free" || tag === "x402" || tag === "mppcharge" || tag === "mppsession") {
            if (tag === "mppcharge") return "mpp_charge";
            if (tag === "mppsession") return "mpp_session";
            return tag as OnchainPaymentMode;
        }
    }

    return null;
}

function buildCacheKey(input: OnchainPolicyInput) {
    return `${input.network}:${input.contractId}:${input.agentName.trim().toLowerCase()}`;
}

function readCache(cacheKey: string): OnchainPaymentMode | null | undefined {
    const cached = policyCache.get(cacheKey);
    if (!cached) return undefined;
    if (cached.expiresAtMs <= Date.now()) {
        policyCache.delete(cacheKey);
        return undefined;
    }
    return cached.mode;
}

function writeCache(cacheKey: string, mode: OnchainPaymentMode | null) {
    policyCache.set(cacheKey, {
        mode,
        expiresAtMs: Date.now() + POLICY_CACHE_TTL_MS,
    });
}

export async function fetchOnchainPolicy(input: OnchainPolicyInput): Promise<OnchainPolicyResult> {
    const cacheKey = buildCacheKey(input);
    const cached = readCache(cacheKey);
    if (cached !== undefined) {
        return {
            mode: cached,
            source: "cache",
            cacheKey,
        };
    }

    try {
        const server = new rpc.Server(sorobanRpcUrl(input.network), { allowHttp: false, timeout: 8000 });

        const agentIdHex = deriveAgentIdHex(input.agentName);
        const key = xdr.ScVal.scvVec([
            xdr.ScVal.scvSymbol("Agent"),
            xdr.ScVal.scvBytes(Buffer.from(agentIdHex, "hex")),
        ]);

        const entry = await server.getContractData(input.contractId, key, rpc.Durability.Persistent);
        const contractData = entry.val.contractData();
        const native = scValToNative(contractData.val()) as Record<string, unknown> | unknown[] | unknown;

        if (!native || typeof native !== "object") {
            writeCache(cacheKey, null);
            return {
                mode: null,
                source: "unavailable",
                cacheKey,
            };
        }

        const data = native as Record<string, unknown>;
        const rawMode = data.payment_mode ?? data.paymentMode;
        const mode = parsePaymentMode(rawMode);
        writeCache(cacheKey, mode);

        return {
            mode,
            source: "rpc",
            cacheKey,
        };
    } catch {
        writeCache(cacheKey, null);
        return {
            mode: null,
            source: "unavailable",
            cacheKey,
        };
    }
}

export async function fetchOnchainPaymentMode(
    input: OnchainPolicyInput
): Promise<OnchainPaymentMode | null> {
    const policy = await fetchOnchainPolicy(input);
    return policy.mode;
}
