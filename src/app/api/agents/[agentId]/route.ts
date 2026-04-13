import { NextRequest, NextResponse } from "next/server";
import { clampTimeout } from "@/lib/server-timeout";
import { createHash } from "node:crypto";
import { validateSession } from "@/lib/stellar-auth";
import { createMppSettlementIntent } from "@/lib/mpp";

export const maxDuration = 60;

type Params = Record<string, string>;

function ok(agentId: string, result: Record<string, unknown>, start: number) {
    return NextResponse.json({
        ampVersion: "1.0",
        agentId,
        success: true,
        result,
        executionTimeMs: Date.now() - start,
        timestamp: new Date().toISOString(),
    });
}

function fail(agentId: string, error: string, start: number, status = 500) {
    return NextResponse.json(
        {
            ampVersion: "1.0",
            agentId,
            success: false,
            error,
            executionTimeMs: Date.now() - start,
            timestamp: new Date().toISOString(),
        },
        { status }
    );
}

function parseBody(body: Record<string, unknown>): Params {
    if (body.payload && typeof body.payload === "object") {
        return body.payload as Params;
    }
    const { ampVersion, flowId, step, fromAgent, toAgent, timestamp, ...rest } = body;
    void ampVersion;
    void flowId;
    void step;
    void fromAgent;
    void toAgent;
    void timestamp;
    return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, String(v)]));
}

function horizonBase(network: string) {
    return network === "mainnet" ? "https://horizon.stellar.org" : "https://horizon-testnet.stellar.org";
}

async function callLLM(systemPrompt: string, userMessage: string, maxTokens: number) {
    const geminiKey = process.env.GEMINI_API_KEY;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
    ];

    if (!geminiKey) {
        throw new Error("GEMINI_API_KEY is required for Stellar AI reasoning.");
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${geminiKey}` },
            body: JSON.stringify({ model: "gemini-3.1-flash-lite-preview", messages, max_tokens: maxTokens }),
            signal: AbortSignal.timeout(clampTimeout(55000)),
        });
        if (r.ok) {
            const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
            return { text: j.choices?.[0]?.message?.content ?? "", model: "gemini" };
        }
        if ((r.status === 429 || r.status === 503) && attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
            continue;
        }
        break;
    }

    throw new Error("Gemini request failed for Stellar AI reasoning.");
}

async function handleOrchestrator(params: Params) {
    return {
        action: "orchestrate",
        executionMode: params.executionMode || "sequential",
        timeoutSeconds: params.timeoutSeconds || "30",
        status: "initialized",
    };
}

async function handleHorizonReader(params: Params) {
    const account = params.account;
    const network = params.network || "testnet";

    const base = horizonBase(network);

    // Demo-friendly path: if no account is provided, return a network snapshot.
    if (!account) {
        const [ledgerRes, assetsRes] = await Promise.all([
            fetch(`${base}/ledgers?order=desc&limit=1`, { signal: AbortSignal.timeout(clampTimeout(15000)) }),
            fetch(`${base}/assets?order=desc&limit=5`, { signal: AbortSignal.timeout(clampTimeout(15000)) }),
        ]);

        const latestLedger = ledgerRes.ok
            ? (await ledgerRes.json() as { _embedded?: { records?: Record<string, unknown>[] } })._embedded?.records?.[0] ?? null
            : null;
        const topAssets = assetsRes.ok
            ? (await assetsRes.json() as { _embedded?: { records?: Record<string, unknown>[] } })._embedded?.records?.slice(0, 5) ?? []
            : [];

        return {
            action: "stellar_network_snapshot",
            network,
            latestLedger,
            topAssets,
            source: "stellar-horizon",
            note: "No account provided, returned network snapshot for demo execution.",
        };
    }

    const [accountRes, opsRes] = await Promise.all([
        fetch(`${base}/accounts/${account}`, { signal: AbortSignal.timeout(clampTimeout(15000)) }),
        fetch(`${base}/accounts/${account}/operations?limit=5&order=desc`, { signal: AbortSignal.timeout(clampTimeout(15000)) }),
    ]);

    if (!accountRes.ok) {
        throw new Error(`Horizon account lookup failed with ${accountRes.status}`);
    }

    const accountData = (await accountRes.json()) as {
        account_id: string;
        sequence: string;
        balances?: { asset_type: string; asset_code?: string; balance: string }[];
    };

    const opsData = opsRes.ok ? (await opsRes.json()) as { _embedded?: { records?: Record<string, unknown>[] } } : null;

    return {
        action: "stellar_account_read",
        network,
        account: accountData.account_id,
        sequence: accountData.sequence,
        balances: (accountData.balances || []).map((b) => ({
            asset: b.asset_code || b.asset_type,
            balance: b.balance,
        })),
        recentOperations: opsData?._embedded?.records?.slice(0, 5) || [],
        source: "stellar-horizon",
    };
}

async function handleFederationResolver(params: Params) {
    const address = params.address || "";
    if (!address.includes("*")) {
        throw new Error("address must be federation format: user*domain.com");
    }

    const [name, domain] = address.split("*");
    if (!name || !domain) {
        throw new Error("invalid federation address format");
    }

    const tomlRes = await fetch(`https://${domain}/.well-known/stellar.toml`, {
        signal: AbortSignal.timeout(clampTimeout(15000)),
    });
    if (!tomlRes.ok) {
        throw new Error(`unable to load stellar.toml for ${domain}`);
    }

    const toml = await tomlRes.text();
    const serverMatch = toml.match(/^FEDERATION_SERVER\s*=\s*"([^"]+)"/m);
    if (!serverMatch) {
        throw new Error("FEDERATION_SERVER not found in stellar.toml");
    }

    const federationServer = serverMatch[1];
    const fedRes = await fetch(`${federationServer}?q=${encodeURIComponent(address)}&type=name`, {
        signal: AbortSignal.timeout(clampTimeout(15000)),
    });
    if (!fedRes.ok) {
        throw new Error(`federation query failed with ${fedRes.status}`);
    }

    const fedData = (await fedRes.json()) as {
        stellar_address?: string;
        account_id?: string;
        memo_type?: string;
        memo?: string;
    };

    return {
        action: "federation_resolve",
        input: address,
        resolved: Boolean(fedData.account_id),
        stellarAddress: fedData.stellar_address || address,
        accountId: fedData.account_id || null,
        memoType: fedData.memo_type || null,
        memo: fedData.memo || null,
        federationServer,
    };
}

async function handleAssetPricer(params: Params) {
    const pairInput = params.pairs || "XLM/USD";
    const pairs = pairInput.split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);

    const xlmRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd", {
        signal: AbortSignal.timeout(clampTimeout(15000)),
    });
    if (!xlmRes.ok) {
        throw new Error(`price provider failed with ${xlmRes.status}`);
    }
    const xlmData = (await xlmRes.json()) as { stellar?: { usd?: number } };
    const xlmUsd = xlmData.stellar?.usd ?? 0;

    return {
        action: "price_fetch",
        prices: pairs.map((pair) => {
            if (pair === "XLM/USD") {
                return { pair, price: xlmUsd, source: "coingecko" };
            }
            return { pair, price: null, source: "unsupported_pair" };
        }),
    };
}

async function handleReasoner(params: Params) {
    const systemPrompt = params.systemPrompt || "You are a Stellar strategy assistant.";
    const userMessage = params.userMessage || params.input || "Analyze this Stellar workflow.";
    const maxTokens = parseInt(params.maxTokens || "512", 10);
    const llm = await callLLM(systemPrompt, userMessage, maxTokens);

    return {
        action: "stellar_reasoning",
        model: llm.model,
        response: llm.text,
    };
}

async function handlePaymentPlanner(params: Params) {
    const source = params.source || "";
    const destination = params.destination || "";
    const amount = params.amount || "1.0";
    const assetCode = (params.assetCode || "XLM").toUpperCase();
    const network = params.network || "testnet";

    if (!source || !destination) {
        throw new Error("source and destination are required");
    }

    return {
        action: "stellar_payment_plan",
        status: "intent_ready",
        network,
        transaction: {
            source,
            destination,
            amount,
            assetCode,
            kind: "payment",
            note: "Sign and submit this payment intent with your Stellar wallet or backend signer.",
        },
    };
}

function deriveAgentIdHex(agentName: string) {
    return createHash("sha256").update(agentName.trim().toLowerCase()).digest("hex");
}

async function handleAgentManager(params: Params) {
    const contractId = params.contractId || "";
    const action = params.action || "register_agent";
    const agentName = params.agentName || "Unnamed Agent";
    const owner = params.owner || "";
    const metadataUri = params.metadataUri || "ipfs://agent/metadata.json";
    const priceStroops = params.priceStroops || "100000";
    const enabled = (params.enabled || "true") === "true";
    const paymentMode = params.paymentMode || "x402";
    const visibility = params.visibility || "public";
    const network = params.network || "testnet";

    const paymentModeCli =
        paymentMode === "free"
            ? "Free"
            : paymentMode === "mpp_charge"
                ? "MppCharge"
                : paymentMode === "mpp_session"
                    ? "MppSession"
                    : "X402";

    const visibilityCli =
        visibility === "private"
            ? "Private"
            : visibility === "community"
                ? "Community"
                : "Public";

    if (!contractId) {
        throw new Error("contractId is required");
    }

    const agentIdHex = deriveAgentIdHex(agentName);

    let args: string[] = [];
    if (action === "register_agent") {
        if (!owner) {
            throw new Error("owner is required for register_agent");
        }
        args = [
            `--agent_id ${agentIdHex}`,
            `--owner ${owner}`,
            `--metadata_uri ${metadataUri}`,
            `--price_stroops ${priceStroops}`,
            `--enabled ${enabled}`,
            `--payment_mode ${paymentModeCli}`,
            `--visibility ${visibilityCli}`,
        ];
    } else if (action === "set_price") {
        args = [`--agent_id ${agentIdHex}`, `--price_stroops ${priceStroops}`];
    } else if (action === "set_enabled") {
        args = [`--agent_id ${agentIdHex}`, `--enabled ${enabled}`];
    } else if (action === "set_payment_mode") {
        args = [`--agent_id ${agentIdHex}`, `--payment_mode ${paymentModeCli}`];
    } else if (action === "set_visibility") {
        args = [`--agent_id ${agentIdHex}`, `--visibility ${visibilityCli}`];
    } else if (action === "transfer_owner") {
        if (!owner) {
            throw new Error("owner is required for transfer_owner");
        }
        args = [`--agent_id ${agentIdHex}`, `--new_owner ${owner}`];
    } else if (action === "get_agent") {
        args = [`--agent_id ${agentIdHex}`];
    } else {
        throw new Error(`Unsupported action: ${action}`);
    }

    const invokeCommand = [
        "stellar contract invoke",
        `--id ${contractId}`,
        `--network ${network}`,
        `-- ${action}`,
        ...args,
    ].join(" ");

    return {
        action: "soroban_agent_management",
        status: "invoke_ready",
        contractId,
        method: action,
        derivedAgentIdHex: agentIdHex,
        policy: {
            owner: owner || null,
            paymentMode,
            visibility,
        },
        invokeCommand,
        note: "Use the generated command with a configured Stellar identity (--source <name>) to execute onchain. Soroban enum args may require exact CLI encoding depending on your Stellar CLI version.",
    };
}

async function handlePaymentGateway(
    params: Params,
    auth: { sessionToken?: string; publicKey?: string }
) {
    const rail = params.paymentRail || "x402";

    if (rail === "mpp_charge" || rail === "mpp_session") {
        if (!auth.sessionToken || !auth.publicKey) {
            return {
                action: "mpp_gateway_auth_required",
                status: "auth_required",
                rail,
                note: "MPP settlement requires a signed-in Stellar wallet session.",
            };
        }

        const session = validateSession(auth.sessionToken, auth.publicKey);

        const intent = createMppSettlementIntent({
            rail,
            agentId: params.agent || "agentflow",
            payer: session.publicKey,
            amountStroops: params.amountStroops || "100000",
            assetCode: params.assetCode || "XLM",
            network: (params.network === "mainnet" ? "mainnet" : "testnet"),
            objective: params.objective || "fetch premium routing insight",
        });

        return {
            ...intent,
            docs:
                rail === "mpp_charge"
                    ? "https://developers.stellar.org/docs/build/agentic-payments/mpp/charge-guide"
                    : "https://developers.stellar.org/docs/build/agentic-payments/mpp/channel-guide",
            settlementEndpoint: "/api/payments/mpp",
        };
    }

    const baseUrl = (params.x402BaseUrl || process.env.X402_RESOURCE_SERVER_URL || "http://localhost:4021").replace(/\/$/, "");
    const agent = params.agent || "agentflow";
    const objective = params.objective || "fetch premium routing insight";
    const healthUrl = `${baseUrl}/health`;
    const paidUrl = `${baseUrl}/agent-tool?agent=${encodeURIComponent(agent)}&objective=${encodeURIComponent(objective)}`;

    const healthRes = await fetch(healthUrl, { signal: AbortSignal.timeout(clampTimeout(12000)) });
    if (!healthRes.ok) {
        throw new Error(`x402 server healthcheck failed with ${healthRes.status}`);
    }

    const health = (await healthRes.json()) as Record<string, unknown>;
    const probe = await fetch(paidUrl, { method: "GET", signal: AbortSignal.timeout(clampTimeout(12000)) });

    return {
        action: "payment_gateway_probe",
        status: probe.status === 402 ? "payment_required" : "reachable",
        rail: "x402",
        server: health,
        paidEndpoint: paidUrl,
        probeStatus: probe.status,
        note: probe.status === 402
            ? "Endpoint is correctly paywalled. Use `npm run x402:client` to sign and retry with payment."
            : "Endpoint did not return 402; verify paywall configuration if payment gating is expected.",
    };
}

async function handleSuperAgent(params: Params) {
    return {
        action: "compose_super_agent",
        superAgentName: params.superAgentName || "Unnamed Super Agent",
        visibility: params.visibility || "community",
        chain: "stellar",
        status: "drafted",
    };
}

const ECOSYSTEM_AGENT_MAP: Record<string, {
    protocol: string;
    segment: "dex" | "lending" | "routing" | "payments" | "rwa" | "infrastructure" | "anchor" | "wallet";
    layer: "sdex" | "soroban" | "application";
    links: string[];
    capabilities: string[];
}> = {
    "soroswap-amm-aggregator": {
        protocol: "Soroswap",
        segment: "dex",
        layer: "soroban",
        links: ["https://docs.soroswap.finance/01-concepts/aggregator"],
        capabilities: ["AMM routing", "Swap aggregation", "Liquidity pathing"],
    },
    "aquarius-liquidity": {
        protocol: "Aquarius",
        segment: "dex",
        layer: "soroban",
        links: ["https://docs.aqua.network/"],
        capabilities: ["Liquidity incentives", "Depth monitoring", "Reward analytics"],
    },
    "phoenix-defi-suite": {
        protocol: "Phoenix",
        segment: "dex",
        layer: "soroban",
        links: ["https://docs.soroswap.finance/smart-contracts/soroswap-aggregator/supported-amms"],
        capabilities: ["Composable DeFi primitives", "AMM modules", "Pool analytics"],
    },
    "stellarx-sdex-terminal": {
        protocol: "StellarX",
        segment: "dex",
        layer: "sdex",
        links: ["https://www.stellarx.com/"],
        capabilities: ["Orderbook discovery", "SDEX market views", "Trade intelligence"],
    },
    "lumenswap-liquidity-terminal": {
        protocol: "LumenSwap",
        segment: "dex",
        layer: "sdex",
        links: ["https://lumenswap.io/"],
        capabilities: ["Swap interface", "Pool awareness", "Market snapshots"],
    },
    "blend-lending": {
        protocol: "Blend",
        segment: "lending",
        layer: "soroban",
        links: ["https://www.blend.capital/"],
        capabilities: ["Isolated pools", "Risk segmentation", "Rate discovery"],
    },
    "aquarius-yield-bridge": {
        protocol: "Aquarius Yield Bridge",
        segment: "routing",
        layer: "application",
        links: ["https://stellarchain.dev/projects/338"],
        capabilities: ["Cross-chain yield routing", "Strategy signals", "Exposure planning"],
    },
    "stellar-broker-router": {
        protocol: "Stellar Broker",
        segment: "routing",
        layer: "application",
        links: ["https://stellarplaybook.com/defi-on-stellar/swaps"],
        capabilities: ["Liquidity routing", "SDEX + AMM pathing", "Execution planning"],
    },
    "xbull-swap-api": {
        protocol: "xBull Swap API",
        segment: "routing",
        layer: "application",
        links: ["https://xbull.app/"],
        capabilities: ["Developer swap routing", "API-first integration", "Quote preparation"],
    },
    "moneygram-offramp": {
        protocol: "MoneyGram",
        segment: "payments",
        layer: "application",
        links: ["https://www.moneygram.com/"],
        capabilities: ["Cash in/out corridors", "Off-ramp planning", "Remittance flow design"],
    },
    "circle-usdc-rail": {
        protocol: "Circle",
        segment: "payments",
        layer: "application",
        links: ["https://www.circle.com/usdc"],
        capabilities: ["USDC settlement", "Stablecoin rail mapping", "Treasury flow support"],
    },
    "sdf-ecosystem-intel": {
        protocol: "Stellar Development Foundation",
        segment: "infrastructure",
        layer: "application",
        links: ["https://stellar.org/foundation"],
        capabilities: ["Ecosystem funding context", "Program mapping", "Roadmap tracking"],
    },
    "franklin-benji-rwa": {
        protocol: "Franklin Templeton BENJI",
        segment: "rwa",
        layer: "application",
        links: ["https://www.franklintempleton.com/"],
        capabilities: ["Tokenized fund intelligence", "RWA allocation context", "Institutional rail insights"],
    },
    "ondo-rwa-gateway": {
        protocol: "Ondo Finance",
        segment: "rwa",
        layer: "application",
        links: ["https://ondo.finance/"],
        capabilities: ["RWA gateway analysis", "Treasury mapping", "Yield product context"],
    },
    "centrifuge-rwa-markets": {
        protocol: "Centrifuge",
        segment: "rwa",
        layer: "application",
        links: ["https://centrifuge.io/"],
        capabilities: ["Credit pool mapping", "RWA issuance context", "Market segmentation"],
    },
    "etherfuse-rwa-issuer": {
        protocol: "Etherfuse",
        segment: "rwa",
        layer: "application",
        links: ["https://www.etherfuse.com/"],
        capabilities: ["Tokenized instrument context", "Issuer workflow support", "RWA distribution mapping"],
    },
    "tempo-anchor-rail": {
        protocol: "Tempo",
        segment: "anchor",
        layer: "application",
        links: ["https://tempo.eu.com/"],
        capabilities: ["Anchor corridor analysis", "Cross-border payouts", "On/off-ramp planning"],
    },
    "flutterwave-anchor-intel": {
        protocol: "Flutterwave",
        segment: "anchor",
        layer: "application",
        links: ["https://flutterwave.com/"],
        capabilities: ["Africa rails intelligence", "Fiat access mapping", "Anchor partnership context"],
    },
    "scopuly-trading-wallet": {
        protocol: "Scopuly",
        segment: "wallet",
        layer: "application",
        links: ["https://scopuly.com/"],
        capabilities: ["Wallet activity intelligence", "Trading context", "Market usage insights"],
    },
    "balanced-liquidity-intel": {
        protocol: "Balanced",
        segment: "dex",
        layer: "application",
        links: ["https://alphagrowth.io/projects/top-dex-projects-on-stellar-by-transaction"],
        capabilities: ["Liquidity trend context", "Trading volume insights", "Market participation signals"],
    },
    "velo-liquidity-intel": {
        protocol: "Velo",
        segment: "dex",
        layer: "application",
        links: ["https://alphagrowth.io/projects/top-dex-projects-on-stellar-by-transaction"],
        capabilities: ["Cross-market liquidity signals", "Volume context", "DEX activity tracking"],
    },
};

// Known Stellar asset issuers (classic SDEX assets, not Soroban wrapped)
const KNOWN_ISSUERS: Record<string, Record<string, string>> = {
    mainnet: {
        USDC: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        EURC: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP",
        BTC: "GDKIIIL2YPRSCSFAYT7FQCH4VXF34YNBIORTYCOKJK5CZ762LX2ND4L4",
        ETH: "GDLW7I64UY2HG4PWVJB2KYLG5HWPRCIDD3WUVRFJMJASX4CB7HJVDSO",
        yXLM: "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55",
    },
    testnet: {
        USDC: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    },
};

// Soroswap mainnet token contract IDs (from api.soroswap.finance)
const SOROSWAP_XLM_MAINNET = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const SOROSWAP_ROUTER_MAINNET = "CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH";

// Parse a "CODE/COUNTER" pair string into Horizon asset query params
function assetParams(code: string, network: string, prefix: string) {
    const upper = code.trim().toUpperCase();
    if (upper === "XLM" || upper === "NATIVE") {
        return `${prefix}_asset_type=native`;
    }
    const issuer = KNOWN_ISSUERS[network]?.[upper] || "";
    if (!issuer) return null;
    const type = upper.length <= 4 ? "credit_alphanum4" : "credit_alphanum12";
    return `${prefix}_asset_type=${type}&${prefix}_asset_code=${upper}&${prefix}_asset_issuer=${issuer}`;
}

async function handleSoroswap(params: Params) {
    const network = params.network || "mainnet";
    const tokenIn = (params.tokenIn || "XLM").toUpperCase();
    const tokenOut = (params.tokenOut || "USDC").toUpperCase();
    const amount = params.amount || "100";

    const [tokensRes, routerRes] = await Promise.allSettled([
        fetch(`https://api.soroswap.finance/api/tokens`, { signal: AbortSignal.timeout(clampTimeout(10000)) }),
        fetch(`https://api.soroswap.finance/api/${network}/router`, { signal: AbortSignal.timeout(clampTimeout(10000)) }),
    ]);

    const tokenList = tokensRes.status === "fulfilled" && tokensRes.value.ok
        ? ((await tokensRes.value.json()) as { network: string; assets: { code: string; name: string; contract: string }[] }[])
            .find((n) => n.network === network)?.assets ?? []
        : [];

    const routerAddress = routerRes.status === "fulfilled" && routerRes.value.ok
        ? ((await routerRes.value.json()) as { address?: string }).address ?? SOROSWAP_ROUTER_MAINNET
        : SOROSWAP_ROUTER_MAINNET;

    // Use Horizon SDEX strict-receive paths as a routing-context proxy
    const base = horizonBase(network);
    const srcAssets = tokenIn === "XLM" ? "source_assets=native" : (() => {
        const p = assetParams(tokenIn, network, "source");
        return p ?? null;
    })();
    const dstParams = assetParams(tokenOut, network, "destination");

    let sdexPaths: unknown[] = [];
    if (srcAssets && dstParams) {
        const pathRes = await fetch(
            `${base}/paths/strict-receive?${srcAssets}&${dstParams}&destination_amount=${amount}&limit=3`,
            { signal: AbortSignal.timeout(clampTimeout(10000)) }
        ).catch(() => null);
        if (pathRes?.ok) {
            const pathData = (await pathRes.json()) as { _embedded?: { records?: unknown[] } };
            sdexPaths = pathData._embedded?.records?.slice(0, 3) ?? [];
        }
    }

    const tokenInMeta = tokenList.find((t) => t.code === tokenIn);
    const tokenOutMeta = tokenList.find((t) => t.code === tokenOut);

    return {
        action: "soroswap_routing_context",
        source: tokenList.length > 0 ? "live" : "simulated",
        network,
        protocol: "Soroswap",
        routerContract: routerAddress,
        swap: { tokenIn, tokenOut, amount },
        tokenInMeta: tokenInMeta ?? null,
        tokenOutMeta: tokenOutMeta ?? null,
        sdexPathsForContext: sdexPaths,
        supportedTokens: tokenList.slice(0, 10),
        note: "Soroswap routing uses Soroban AMM contracts. SDEX paths shown for comparison only.",
        links: ["https://app.soroswap.finance", "https://docs.soroswap.finance"],
    };
}

async function handleHorizonOrderbook(agentId: string, params: Params) {
    const network = params.network || "mainnet";
    const pairRaw = params.pair || "XLM/USDC";
    const [sellCode, buyCode] = pairRaw.split("/").map((s) => s.trim().toUpperCase());
    const base = horizonBase(network);

    const sellP = assetParams(sellCode || "XLM", network, "selling");
    const buyP = assetParams(buyCode || "USDC", network, "buying");

    const profile = ECOSYSTEM_AGENT_MAP[agentId];

    if (!sellP || !buyP) {
        return {
            action: "orderbook_snapshot",
            source: "simulated",
            pair: pairRaw,
            network,
            error: `Unknown asset issuer for pair ${pairRaw} on ${network}`,
            fallback: profile ? { protocol: profile.protocol, capabilities: profile.capabilities } : null,
        };
    }

    const obRes = await fetch(
        `${base}/order_book?${sellP}&${buyP}&limit=5`,
        { signal: AbortSignal.timeout(clampTimeout(10000)) }
    ).catch(() => null);

    if (!obRes?.ok) {
        return {
            action: "orderbook_snapshot",
            source: "simulated",
            pair: pairRaw,
            network,
            error: `Horizon orderbook returned ${obRes?.status ?? "unavailable"}`,
            fallback: profile ? { protocol: profile.protocol, capabilities: profile.capabilities } : null,
        };
    }

    const ob = (await obRes.json()) as {
        bids?: { price: string; amount: string }[];
        asks?: { price: string; amount: string }[];
        base?: unknown;
        counter?: unknown;
    };

    const bestBid = ob.bids?.[0] ?? null;
    const bestAsk = ob.asks?.[0] ?? null;
    const midPrice = bestBid && bestAsk
        ? ((parseFloat(bestBid.price) + parseFloat(bestAsk.price)) / 2).toFixed(7)
        : null;

    return {
        action: "orderbook_snapshot",
        source: "live",
        protocol: profile?.protocol ?? agentId,
        pair: pairRaw,
        network,
        bestBid,
        bestAsk,
        midPrice,
        topBids: ob.bids?.slice(0, 5) ?? [],
        topAsks: ob.asks?.slice(0, 5) ?? [],
        horizonUrl: `${base}/order_book?${sellP}&${buyP}`,
        links: profile?.links ?? [],
    };
}

async function handleHorizonPaths(agentId: string, params: Params) {
    const network = params.network || "mainnet";
    const tokenIn = (params.tokenIn || "XLM").toUpperCase();
    const tokenOut = (params.tokenOut || "USDC").toUpperCase();
    const amount = params.amount || "100";
    const base = horizonBase(network);

    const profile = ECOSYSTEM_AGENT_MAP[agentId];

    // For strict-receive: fixed destination amount, find cheapest source
    // source_assets=native (or type:code:issuer), destination_asset params, destination_amount
    const dstP = assetParams(tokenOut, network, "destination");
    const sourceAssetsParam = tokenIn === "XLM"
        ? "source_assets=native"
        : (() => {
            const issuer = KNOWN_ISSUERS[network]?.[tokenIn];
            if (!issuer) return null;
            const type = tokenIn.length <= 4 ? "credit_alphanum4" : "credit_alphanum12";
            return `source_assets=${type}:${tokenIn}:${issuer}`;
        })();

    if (!sourceAssetsParam || !dstP) {
        return {
            action: "routing_paths",
            source: "simulated",
            swap: { tokenIn, tokenOut, amount },
            network,
            error: `Unknown asset pair ${tokenIn}/${tokenOut} on ${network}`,
            fallback: profile ? { protocol: profile.protocol, capabilities: profile.capabilities } : null,
        };
    }

    const pathRes = await fetch(
        `${base}/paths/strict-receive?${sourceAssetsParam}&${dstP}&destination_amount=${amount}&limit=5`,
        { signal: AbortSignal.timeout(clampTimeout(10000)) }
    ).catch(() => null);

    if (!pathRes?.ok) {
        return {
            action: "routing_paths",
            source: "simulated",
            swap: { tokenIn, tokenOut, amount },
            network,
            error: `Horizon paths returned ${pathRes?.status ?? "unavailable"}`,
            fallback: profile ? { protocol: profile.protocol, capabilities: profile.capabilities } : null,
        };
    }

    const data = (await pathRes.json()) as {
        _embedded?: {
            records?: {
                source_asset_type: string;
                source_asset_code?: string;
                source_amount: string;
                destination_asset_type?: string;
                destination_asset_code?: string;
                destination_amount: string;
                path?: { asset_type: string; asset_code?: string }[];
            }[];
        };
    };

    const paths = data._embedded?.records ?? [];
    const best = paths[0] ?? null;

    return {
        action: "routing_paths",
        source: paths.length > 0 ? "live" : "simulated",
        protocol: profile?.protocol ?? agentId,
        swap: { tokenIn, tokenOut, requestedAmount: amount },
        network,
        bestPath: best
            ? {
                sourceAmount: best.source_amount,
                destinationAmount: best.destination_amount,
                hops: best.path?.map((p) => p.asset_code ?? "XLM") ?? [],
                impliedRate: best.source_amount
                    ? (parseFloat(best.destination_amount) / parseFloat(best.source_amount)).toFixed(7)
                    : null,
            }
            : null,
        allPaths: paths.slice(0, 5).map((p) => ({
            sourceAmount: p.source_amount,
            destinationAmount: p.destination_amount,
            hops: p.path?.map((h) => h.asset_code ?? "XLM") ?? [],
        })),
        links: profile?.links ?? [],
    };
}

async function handleAquariusLiquidity(params: Params) {
    const metric = params.metric || "depth";
    const pair = params.pair || "XLM/USDC";
    const network = "mainnet"; // Aquarius is mainnet-only

    // Fetch AQUA token stats from StellarExpert
    const aquaRes = await fetch(
        "https://api.stellar.expert/explorer/public/asset/AQUA-GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
        { signal: AbortSignal.timeout(clampTimeout(10000)) }
    ).catch(() => null);

    // Fetch XLM/USDC orderbook as a liquidity proxy
    const base = horizonBase(network);
    const obRes = await fetch(
        `${base}/order_book?selling_asset_type=native&buying_asset_type=credit_alphanum4&buying_asset_code=USDC&buying_asset_issuer=${KNOWN_ISSUERS.mainnet.USDC}&limit=5`,
        { signal: AbortSignal.timeout(clampTimeout(10000)) }
    ).catch(() => null);

    const aquaStat = aquaRes?.ok ? ((await aquaRes.json()) as Record<string, unknown>) : null;
    const ob = obRes?.ok ? ((await obRes.json()) as { bids?: { price: string; amount: string }[]; asks?: { price: string; amount: string }[] }) : null;

    return {
        action: "aquarius_liquidity",
        source: aquaStat || ob ? "live" : "simulated",
        protocol: "Aquarius",
        metric,
        pair,
        network,
        aquaToken: aquaStat ? {
            asset: "AQUA",
            payments: (aquaStat as Record<string, unknown>).payments ?? null,
            trades: (aquaStat as Record<string, unknown>).trades ?? null,
            trustlines: (aquaStat as Record<string, unknown>).trustlines ?? null,
            volume: (aquaStat as Record<string, unknown>).volume ?? null,
            supply: (aquaStat as Record<string, unknown>).supply ?? null,
        } : null,
        xlmUsdcOrderbook: ob ? {
            bestBid: ob.bids?.[0] ?? null,
            bestAsk: ob.asks?.[0] ?? null,
            bidDepth: ob.bids?.reduce((s, b) => s + parseFloat(b.amount), 0).toFixed(2) ?? null,
            askDepth: ob.asks?.reduce((s, a) => s + parseFloat(a.amount), 0).toFixed(2) ?? null,
        } : null,
        links: ["https://aqua.network", "https://swap.aqua.network", "https://docs.aqua.network"],
        note: "Aquarius AMM pools use Soroban contracts; orderbook depth shown as on-chain liquidity proxy.",
    };
}

async function handleBlendLending(params: Params) {
    const pool = params.pool || "xlm-usdc";
    const action = params.action || "rates";
    const network = params.network || "mainnet";

    // Known Blend v2 mainnet contract addresses
    const BLEND_MAINNET = {
        backstop: "CAO3AGAMZVRMHITL36EJ2VZQWKYRPWMQAPDQD276CPHCAPIVBFHLMVXR",
        pools: {
            "xlm-usdc": "CCLBPEYS3OWVPLM55XTAB4ILFBWXNFTDVD5MTOFV3HFGQXIIGWJZIVS4",
        } as Record<string, string>,
    };

    const poolContract = BLEND_MAINNET.pools[pool] ?? null;

    // Fetch asset stats from StellarExpert as a proxy for lending activity
    const xlmStatRes = await fetch(
        "https://api.stellar.expert/explorer/public/asset/XLM",
        { signal: AbortSignal.timeout(clampTimeout(10000)) }
    ).catch(() => null);

    const xlmStat = xlmStatRes?.ok ? ((await xlmStatRes.json()) as Record<string, unknown>) : null;

    return {
        action: "blend_lending_context",
        source: "live",
        protocol: "Blend",
        pool,
        poolContract,
        metric: action,
        network,
        blendProtocol: {
            backstopContract: BLEND_MAINNET.backstop,
            version: "v2",
            docs: "https://docs.blend.capital",
            sdk: "@blend-capital/blend-sdk",
        },
        xlmContext: xlmStat ? {
            trustlines: (xlmStat as Record<string, unknown>).trustlines ?? null,
            payments: (xlmStat as Record<string, unknown>).payments ?? null,
            trades: (xlmStat as Record<string, unknown>).trades ?? null,
        } : null,
        note: `Blend v2 pool '${pool}' at ${poolContract ?? "address pending"}. Use @blend-capital/blend-sdk with Soroban RPC to fetch live rates and positions.`,
        links: ["https://blend.capital", "https://docs.blend.capital", "https://github.com/blend-capital/blend-sdk-js"],
    };
}

async function handleEcosystemProfile(agentId: string, params: Params) {
    const profile = ECOSYSTEM_AGENT_MAP[agentId];
    if (!profile) {
        throw new Error(`No ecosystem profile configured for ${agentId}`);
    }

    const pair = params.pair || null;
    const amount = params.amount || null;
    const query = params.query || null;

    // Fetch a live Stellar network stat to enrich the profile
    let networkStat: unknown = null;
    try {
        const res = await fetch("https://horizon.stellar.org/ledgers?order=desc&limit=1", {
            signal: AbortSignal.timeout(clampTimeout(8000)),
        });
        if (res.ok) {
            const j = (await res.json()) as { _embedded?: { records?: unknown[] } };
            networkStat = j._embedded?.records?.[0] ?? null;
        }
    } catch {
        // non-fatal
    }

    return {
        action: "ecosystem_profile",
        source: networkStat ? "live" : "simulated",
        protocol: profile.protocol,
        segment: profile.segment,
        layer: profile.layer,
        capabilities: profile.capabilities,
        links: profile.links,
        inputs: { pair, amount, query },
        stellarNetworkContext: networkStat,
        status: "active",
        note: `${profile.protocol} mapped into the Stellar ecosystem market graph and ready for super-agent composition.`,
    };
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ agentId: string }> }) {
    const start = Date.now();
    const { agentId } = await ctx.params;

    try {
        const body = (await request.json()) as Record<string, unknown>;
        const params = parseBody(body);

        switch (agentId) {
            case "orchestrator-core":
                return ok(agentId, await handleOrchestrator(params), start);
            case "stellar-horizon-reader":
                return ok(agentId, await handleHorizonReader(params), start);
            case "stellar-federation-resolver":
                return ok(agentId, await handleFederationResolver(params), start);
            case "stellar-asset-pricer":
                return ok(agentId, await handleAssetPricer(params), start);
            case "stellar-ai-reasoner":
                return ok(agentId, await handleReasoner(params), start);
            case "stellar-payment-planner":
                return ok(agentId, await handlePaymentPlanner(params), start);
            case "stellar-agent-manager":
                return ok(agentId, await handleAgentManager(params), start);
            case "stellar-x402-gateway":
                return ok(
                    agentId,
                    await handlePaymentGateway(params, {
                        sessionToken: request.headers.get("X-AgentFlow-Session") || undefined,
                        publicKey: request.headers.get("X-AgentFlow-Public-Key") || undefined,
                    }),
                    start
                );
            case "super-agent-composer":
                return ok(agentId, await handleSuperAgent(params), start);
            case "soroswap-amm-aggregator":
                return ok(agentId, await handleSoroswap(params), start);
            case "aquarius-liquidity":
                return ok(agentId, await handleAquariusLiquidity(params), start);
            case "blend-lending":
                return ok(agentId, await handleBlendLending(params), start);
            case "stellarx-sdex-terminal":
            case "lumenswap-liquidity-terminal":
                return ok(agentId, await handleHorizonOrderbook(agentId, params), start);
            case "stellar-broker-router":
            case "xbull-swap-api":
                return ok(agentId, await handleHorizonPaths(agentId, params), start);
            case "phoenix-defi-suite":
            case "aquarius-yield-bridge":
            case "moneygram-offramp":
            case "circle-usdc-rail":
            case "sdf-ecosystem-intel":
            case "franklin-benji-rwa":
            case "ondo-rwa-gateway":
            case "centrifuge-rwa-markets":
            case "etherfuse-rwa-issuer":
            case "tempo-anchor-rail":
            case "flutterwave-anchor-intel":
            case "scopuly-trading-wallet":
            case "balanced-liquidity-intel":
            case "velo-liquidity-intel":
                return ok(agentId, await handleEcosystemProfile(agentId, params), start);
            default:
                return fail(agentId, `Unknown Stellar agent: ${agentId}`, start, 404);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return fail(agentId, message, start, 500);
    }
}
