import { fetchOnchainPaymentMode } from "@/lib/stellar-policy";

export type PaymentMode = "free" | "x402" | "mpp_charge" | "mpp_session";

export interface ResolvedPaymentPolicy {
    mode: PaymentMode;
    authRequired: boolean;
    source: "default" | "request" | "env" | "onchain";
}

const VALID_PAYMENT_MODES: PaymentMode[] = ["free", "x402", "mpp_charge", "mpp_session"];

function normalizePaymentMode(value: string | undefined | null): PaymentMode | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (!VALID_PAYMENT_MODES.includes(normalized as PaymentMode)) {
        return null;
    }
    return normalized as PaymentMode;
}

function parseEnvPaymentModes(): Record<string, PaymentMode> {
    const raw = process.env.AGENTFLOW_AGENT_PAYMENT_MODES || "";
    if (!raw) return {};

    try {
        const parsed = JSON.parse(raw) as Record<string, string>;
        const result: Record<string, PaymentMode> = {};
        for (const [agentId, mode] of Object.entries(parsed)) {
            const normalized = normalizePaymentMode(mode);
            if (normalized) {
                result[agentId] = normalized;
            }
        }
        return result;
    } catch {
        return {};
    }
}

export async function resolvePaymentPolicy(
    agentId: string,
    parameterValues: Record<string, string>
): Promise<ResolvedPaymentPolicy> {
    const envOverrides = parseEnvPaymentModes();
    if (envOverrides[agentId]) {
        const mode = envOverrides[agentId];
        return { mode, authRequired: mode !== "free", source: "env" };
    }

    if (agentId === "stellar-x402-gateway") {
        const policyContractId = (parameterValues.policyContractId || "").trim();
        const policyAgentName = (parameterValues.policyAgentName || parameterValues.agent || "").trim();
        const policyNetwork = parameterValues.policyNetwork === "mainnet" ? "mainnet" : "testnet";
        if (policyContractId && policyAgentName) {
            const onchainMode = await fetchOnchainPaymentMode({
                contractId: policyContractId,
                agentName: policyAgentName,
                network: policyNetwork,
            });
            if (onchainMode) {
                return { mode: onchainMode, authRequired: onchainMode !== "free", source: "onchain" };
            }
        }

        const mode = normalizePaymentMode(parameterValues.paymentRail) || "x402";
        return { mode, authRequired: mode !== "free", source: "request" };
    }

    return { mode: "free", authRequired: false, source: "default" };
}
