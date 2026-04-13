import express from "express";
import dotenv from "dotenv";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

dotenv.config({ path: "x402/.env", quiet: true });

const PORT = Number(process.env.X402_PORT || "4021");
const ROUTE_PATH = process.env.X402_ROUTE_PATH || "/agent-tool";
const PRICE = process.env.X402_PRICE || "$0.01";
const NETWORK = process.env.X402_NETWORK || "stellar:testnet";
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://www.x402.org/facilitator";
const PAY_TO = process.env.X402_PAY_TO || "";

if (!PAY_TO) {
    console.error("X402_PAY_TO is required in x402/.env");
    process.exit(1);
}

const app = express();

app.get("/health", (_req, res) => {
    res.json({
        service: "agentflow-x402",
        status: "ok",
        route: ROUTE_PATH,
        network: NETWORK,
        price: PRICE,
    });
});

app.use(
    paymentMiddlewareFromConfig(
        {
            [`GET ${ROUTE_PATH}`]: {
                accepts: [
                    {
                        scheme: "exact",
                        network,
                        maxAmountRequired: PRICE,
                        resource: "https://agentflow.local/x402/agent-tool",
                        payTo: PAY_TO,
                        asset: "USDC",
                        outputSchema: {
                            type: "object",
                            properties: {
                                tool: { type: "string" },
                                insight: { type: "string" },
                                recommendation: { type: "string" },
                            },
                            required: ["tool", "insight", "recommendation"],
                        },
                    },
                ],
            },
        },
        new HTTPFacilitatorClient({ url: FACILITATOR_URL }),
        [{ network: NETWORK, server: new ExactStellarScheme() }]
    )
);

app.get(ROUTE_PATH, (req, res) => {
    const agent = String(req.query.agent || "agentflow");
    const objective = String(req.query.objective || "route paid tool access");

    res.json({
        tool: "stellar-agent-management-premium",
        insight: `Paid x402 request accepted for ${agent} on ${NETWORK}.`,
        recommendation: `Execute objective '${objective}' with paid entitlement and meter usage by request count.`,
    });
});

app.listen(PORT, () => {
    console.log(`x402 Stellar paywall listening on http://localhost:${PORT}${ROUTE_PATH}`);
});
