import dotenv from "dotenv";
import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer, getNetworkPassphrase } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

dotenv.config({ path: "x402/.env", quiet: true });

const STELLAR_PRIVATE_KEY = process.env.STELLAR_PRIVATE_KEY;
const RESOURCE_SERVER_URL = process.env.X402_RESOURCE_SERVER_URL || "http://localhost:4021";
const ENDPOINT_PATH = process.env.X402_ROUTE_PATH || "/agent-tool";
const NETWORK = process.env.X402_NETWORK || "stellar:testnet";
const STELLAR_RPC_URL = process.env.X402_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";

if (!STELLAR_PRIVATE_KEY) {
    console.error("STELLAR_PRIVATE_KEY is required in x402/.env");
    process.exit(1);
}

async function main() {
    const url = new URL(`${ENDPOINT_PATH}?agent=agentflow&objective=manage-contract-state`, RESOURCE_SERVER_URL).toString();

    const signer = createEd25519Signer(STELLAR_PRIVATE_KEY, NETWORK);
    const client = new x402Client().register(
        "stellar:*",
        new ExactStellarScheme(signer, { url: STELLAR_RPC_URL })
    );
    const httpClient = new x402HTTPClient(client);

    const firstTry = await fetch(url);
    if (firstTry.status !== 402) {
        const text = await firstTry.text();
        console.log(`Expected 402, got ${firstTry.status}: ${text}`);
        return;
    }

    const paymentRequired = httpClient.getPaymentRequiredResponse((name) => firstTry.headers.get(name));
    let paymentPayload = await client.createPaymentPayload(paymentRequired);

    const networkPassphrase = getNetworkPassphrase(NETWORK);
    const tx = new Transaction(paymentPayload.payload.transaction, networkPassphrase);
    const sorobanData = tx.toEnvelope().v1()?.tx()?.ext()?.sorobanData();

    if (sorobanData) {
        paymentPayload = {
            ...paymentPayload,
            payload: {
                ...paymentPayload.payload,
                transaction: TransactionBuilder.cloneFrom(tx, {
                    fee: "1",
                    sorobanData,
                    networkPassphrase,
                })
                    .build()
                    .toXDR(),
            },
        };
    }

    const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
    const paidResponse = await fetch(url, { method: "GET", headers: paymentHeaders });

    const settlement = httpClient.getPaymentSettleResponse((name) => paidResponse.headers.get(name));
    const bodyText = await paidResponse.text();

    console.log("Status:", paidResponse.status);
    console.log("Settlement:", settlement);
    console.log("Body:", bodyText);
}

main().catch((error) => {
    console.error("x402 client failed:", error);
    process.exit(1);
});
