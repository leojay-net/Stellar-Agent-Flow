import { afterEach } from "vitest";

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
}

afterEach(() => {
    delete process.env.AGENTFLOW_AGENT_PAYMENT_MODES;
    delete process.env.MPP_SETTLEMENT_EXECUTOR_URL;
    delete process.env.SOROBAN_RPC_URL_TESTNET;
    delete process.env.SOROBAN_RPC_URL_MAINNET;
    delete process.env.NEXT_PUBLIC_SITE_URL;
});
