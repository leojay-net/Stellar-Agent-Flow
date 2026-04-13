import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/agents/[agentId]/route";
import * as stellarAuth from "@/lib/stellar-auth";
import * as mpp from "@/lib/mpp";

async function invokeAgent(
    agentId: string,
    payload: Record<string, unknown>,
    headers: Record<string, string> = {}
) {
    return POST(
        new NextRequest(`http://localhost/api/agents/${agentId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify(payload),
        }),
        { params: Promise.resolve({ agentId }) }
    );
}

describe("/api/agents/[agentId]", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns 404 for unknown agents", async () => {
        const response = await invokeAgent("missing-agent", {});
        expect(response.status).toBe(404);

        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/unknown stellar agent/i);
    });

    it("returns network snapshot when horizon reader account is omitted", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ _embedded: { records: [{ sequence: "123" }] } }),
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ _embedded: { records: [{ code: "USDC" }] } }),
            } as Response);

        const response = await invokeAgent("stellar-horizon-reader", { payload: { network: "testnet" } });
        expect(response.status).toBe(200);

        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.result.action).toBe("stellar_network_snapshot");
        expect(json.result.network).toBe("testnet");
    });

    it("requires owner when registering an agent on soroban manager", async () => {
        const response = await invokeAgent("stellar-agent-manager", {
            payload: {
                contractId: "CA123",
                action: "register_agent",
                agentName: "Test Agent",
            },
        });

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/owner is required/i);
    });

    it("returns auth required for mpp rail without signed session", async () => {
        const response = await invokeAgent("stellar-x402-gateway", {
            payload: {
                paymentRail: "mpp_charge",
            },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.result.status).toBe("auth_required");
        expect(json.result.rail).toBe("mpp_charge");
    });

    it("returns soroswap routing context with mocked API calls", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ([
                    { network: "mainnet", assets: [{ code: "XLM", name: "Stellar Lumens", contract: "CDLZFC3" }, { code: "USDC", name: "USD Coin", contract: "CCWFH6" }] },
                ]),
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ address: "CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH" }),
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ _embedded: { records: [{ source_amount: "66.0", destination_amount: "10.0", path: [] }] } }),
            } as Response);

        const response = await invokeAgent("soroswap-amm-aggregator", {
            payload: { tokenIn: "XLM", tokenOut: "USDC", amount: "10", network: "mainnet" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.result.action).toBe("soroswap_routing_context");
        expect(json.result.protocol).toBe("Soroswap");
        expect(json.result.source).toBe("live");
        expect(json.result.routerContract).toBe("CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH");
    });

    it("returns soroswap routing context simulated when API calls fail", async () => {
        vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));

        const response = await invokeAgent("soroswap-amm-aggregator", {
            payload: { tokenIn: "XLM", tokenOut: "USDC", amount: "10", network: "mainnet" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.result.action).toBe("soroswap_routing_context");
        expect(json.result.source).toBe("simulated");
    });

    it("returns live orderbook data for stellarx-sdex-terminal", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                bids: [{ price: "0.1500", amount: "500.0" }],
                asks: [{ price: "0.1510", amount: "300.0" }],
            }),
        } as Response);

        const response = await invokeAgent("stellarx-sdex-terminal", {
            payload: { pair: "XLM/USDC", network: "mainnet" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("orderbook_snapshot");
        expect(json.result.source).toBe("live");
        expect(json.result.bestBid.price).toBe("0.1500");
        expect(json.result.bestAsk.price).toBe("0.1510");
        expect(typeof json.result.midPrice).toBe("string");
    });

    it("returns simulated orderbook when asset pair is unknown", async () => {
        const response = await invokeAgent("stellarx-sdex-terminal", {
            payload: { pair: "UNKNOWNA/UNKNOWNB", network: "mainnet" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("orderbook_snapshot");
        expect(json.result.source).toBe("simulated");
        expect(json.result.error).toMatch(/unknown asset issuer/i);
    });

    it("returns live path-finding for stellar-broker-router", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                _embedded: {
                    records: [{
                        source_amount: "66.5",
                        destination_amount: "10.0",
                        path: [],
                    }],
                },
            }),
        } as Response);

        const response = await invokeAgent("stellar-broker-router", {
            payload: { tokenIn: "XLM", tokenOut: "USDC", amount: "10", network: "mainnet" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("routing_paths");
        expect(json.result.source).toBe("live");
        expect(json.result.bestPath.sourceAmount).toBe("66.5");
        expect(json.result.bestPath.destinationAmount).toBe("10.0");
        expect(typeof json.result.bestPath.impliedRate).toBe("string");
    });

    it("returns simulated routing paths when Horizon returns no paths", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async () => ({ _embedded: { records: [] } }),
        } as Response);

        const response = await invokeAgent("xbull-swap-api", {
            payload: { tokenIn: "XLM", tokenOut: "USDC", amount: "10", network: "mainnet" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("routing_paths");
        expect(json.result.source).toBe("simulated");
        expect(json.result.bestPath).toBeNull();
    });

    it("returns aquarius liquidity with live AQUA stats and orderbook", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ asset: "AQUA-GBNZI...", trustlines: { total: 190000 }, payments: 303000000, trades: 132000000, supply: "999000000000" }),
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    bids: [{ price: "0.15", amount: "400.0" }],
                    asks: [{ price: "0.16", amount: "200.0" }],
                }),
            } as Response);

        const response = await invokeAgent("aquarius-liquidity", {
            payload: { pair: "XLM/USDC", metric: "depth" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("aquarius_liquidity");
        expect(json.result.source).toBe("live");
        expect(json.result.aquaToken.payments).toBe(303000000);
        expect(json.result.xlmUsdcOrderbook.bestBid.price).toBe("0.15");
    });

    it("returns blend lending context with known pool contract", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async () => ({ trustlines: { total: 7000000 }, payments: 100000, trades: 50000 }),
        } as Response);

        const response = await invokeAgent("blend-lending", {
            payload: { pool: "xlm-usdc", action: "rates", network: "mainnet" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("blend_lending_context");
        expect(json.result.protocol).toBe("Blend");
        expect(json.result.poolContract).toBeTruthy();
        expect(json.result.xlmContext.trustlines.total).toBe(7000000);
    });

    it("returns ecosystem profile for general ecosystem agents enriched with ledger data", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async () => ({ _embedded: { records: [{ sequence: "55000000" }] } }),
        } as Response);

        const response = await invokeAgent("phoenix-defi-suite", {
            payload: { module: "dex" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("ecosystem_profile");
        expect(json.result.protocol).toBe("Phoenix");
        expect(json.result.source).toBe("live");
        expect(json.result.stellarNetworkContext).toBeTruthy();
    });

    it("parses top-level amp payload for orchestrator agent", async () => {
        const response = await invokeAgent("orchestrator-core", {
            ampVersion: "1.0",
            flowId: "f1",
            step: 1,
            fromAgent: { id: "a" },
            toAgent: { id: "b" },
            timestamp: new Date().toISOString(),
            executionMode: "parallel",
            timeoutSeconds: 45,
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.result.action).toBe("orchestrate");
        expect(json.result.executionMode).toBe("parallel");
        expect(json.result.timeoutSeconds).toBe("45");
    });

    it("returns account data for horizon reader when account is provided", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    account_id: "GACCOUNT",
                    sequence: "123",
                    balances: [{ asset_type: "native", balance: "10.5" }],
                }),
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ _embedded: { records: [{ id: "op-1" }] } }),
            } as Response);

        const response = await invokeAgent("stellar-horizon-reader", {
            payload: { account: "GACCOUNT", network: "testnet" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("stellar_account_read");
        expect(json.result.account).toBe("GACCOUNT");
        expect(json.result.balances[0].asset).toBe("native");
    });

    it("fails horizon reader when account lookup fails", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ _embedded: { records: [] } }) } as Response);

        const response = await invokeAgent("stellar-horizon-reader", {
            payload: { account: "GBAD", network: "testnet" },
        });

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(String(json.error)).toContain("Horizon account lookup failed");
    });

    it("validates federation format before remote calls", async () => {
        const response = await invokeAgent("stellar-federation-resolver", {
            payload: { address: "not-federation" },
        });

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(String(json.error)).toContain("federation format");
    });

    it("resolves federation addresses through toml and federation server", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({
                ok: true,
                text: async () => 'FEDERATION_SERVER = "https://fed.example.com/federation"',
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stellar_address: "alice*example.com",
                    account_id: "G123",
                    memo_type: "text",
                    memo: "hello",
                }),
            } as Response);

        const response = await invokeAgent("stellar-federation-resolver", {
            payload: { address: "alice*example.com" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("federation_resolve");
        expect(json.result.resolved).toBe(true);
        expect(json.result.accountId).toBe("G123");
    });

    it("returns mixed price responses for supported and unsupported pairs", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ stellar: { usd: 0.123 } }),
        } as Response);

        const response = await invokeAgent("stellar-asset-pricer", {
            payload: { pairs: "XLM/USD,BTC/USD" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("price_fetch");
        expect(json.result.prices[0].price).toBe(0.123);
        expect(json.result.prices[1].source).toBe("unsupported_pair");
    });

    it("fails reasoner without Gemini key", async () => {
        delete process.env.GEMINI_API_KEY;
        const response = await invokeAgent("stellar-ai-reasoner", {
            payload: { userMessage: "Analyze this flow" },
        });

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(String(json.error)).toContain("GEMINI_API_KEY");
    });

    it("returns reasoner response from Gemini", async () => {
        process.env.GEMINI_API_KEY = "test-key";
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: "Use Soroban for settlement" } }] }),
        } as Response);

        const response = await invokeAgent("stellar-ai-reasoner", {
            payload: { userMessage: "What should we do?" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("stellar_reasoning");
        expect(json.result.response).toContain("Soroban");
    });

    it("requires source and destination for payment planner", async () => {
        const response = await invokeAgent("stellar-payment-planner", {
            payload: { source: "", destination: "" },
        });

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(String(json.error)).toContain("source and destination are required");
    });

    it("builds a payment planner intent when required params exist", async () => {
        const response = await invokeAgent("stellar-payment-planner", {
            payload: {
                source: "GSRC",
                destination: "GDST",
                amount: "5",
                assetCode: "usdc",
                network: "mainnet",
            },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("stellar_payment_plan");
        expect(json.result.transaction.assetCode).toBe("USDC");
    });

    it("returns invoke-ready payload for manager set_payment_mode", async () => {
        const response = await invokeAgent("stellar-agent-manager", {
            payload: {
                contractId: "CA123",
                action: "set_payment_mode",
                agentName: "Test Agent",
                paymentMode: "mpp_session",
            },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.status).toBe("invoke_ready");
        expect(String(json.result.invokeCommand)).toContain("set_payment_mode");
        expect(String(json.result.invokeCommand)).toContain("MppSession");
    });

    it("fails manager for unsupported actions", async () => {
        const response = await invokeAgent("stellar-agent-manager", {
            payload: {
                contractId: "CA123",
                action: "do_magic",
                agentName: "Test Agent",
            },
        });

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(String(json.error)).toContain("Unsupported action");
    });

    it("returns x402 probe payload when health and paid endpoints are reachable", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({ ok: true, json: async () => ({ service: "ok" }) } as Response)
            .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

        const response = await invokeAgent("stellar-x402-gateway", {
            payload: {
                paymentRail: "x402",
                x402BaseUrl: "https://pay.example.com",
                agent: "alpha",
            },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("payment_gateway_probe");
        expect(json.result.status).toBe("reachable");
    });

    it("returns payment_required status when x402 probe returns 402", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce({ ok: true, json: async () => ({ service: "ok" }) } as Response)
            .mockResolvedValueOnce({ ok: true, status: 402 } as Response);

        const response = await invokeAgent("stellar-x402-gateway", {
            payload: {
                paymentRail: "x402",
                x402BaseUrl: "https://pay.example.com",
                agent: "alpha",
            },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.status).toBe("payment_required");
    });

    it("fails x402 rail when healthcheck is not ok", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 500 } as Response);

        const response = await invokeAgent("stellar-x402-gateway", {
            payload: {
                paymentRail: "x402",
                x402BaseUrl: "https://pay.example.com",
            },
        });

        expect(response.status).toBe(500);
        const json = await response.json();
        expect(String(json.error)).toContain("healthcheck failed");
    });

    it("creates mpp settlement intent when session headers are valid", async () => {
        vi.spyOn(stellarAuth, "validateSession").mockReturnValue({
            publicKey: "GUSER",
            issuedAt: Date.now(),
            expiresAt: Date.now() + 1000,
        });
        vi.spyOn(mpp, "createMppSettlementIntent").mockReturnValue({
            action: "mpp_settlement_intent",
            status: "intent_ready",
            rail: "mpp_charge",
            settlement: { amountStroops: "100000" },
        } as unknown as ReturnType<typeof mpp.createMppSettlementIntent>);

        const response = await invokeAgent(
            "stellar-x402-gateway",
            {
                payload: {
                    paymentRail: "mpp_charge",
                    amountStroops: "100000",
                    agent: "premium-agent",
                },
            },
            {
                "X-AgentFlow-Session": "sess",
                "X-AgentFlow-Public-Key": "GUSER",
            }
        );

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("mpp_settlement_intent");
        expect(json.result.settlementEndpoint).toBe("/api/payments/mpp");
    });

    it("returns drafted payload for super-agent composer", async () => {
        const response = await invokeAgent("super-agent-composer", {
            payload: { superAgentName: "My Agent", visibility: "private" },
        });

        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.result.action).toBe("compose_super_agent");
        expect(json.result.status).toBe("drafted");
        expect(json.result.visibility).toBe("private");
    });
});
