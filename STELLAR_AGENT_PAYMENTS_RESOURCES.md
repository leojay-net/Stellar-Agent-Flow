# Stellar Agent Payments Resources

Quick links for building agent-managed payments with Soroban + x402.

## Core Docs

- Stellar docs home: https://developers.stellar.org/
- x402 on Stellar: https://developers.stellar.org/docs/build/agentic-payments/x402
- x402 quickstart: https://developers.stellar.org/docs/build/agentic-payments/x402/quickstart-guide
- MPP on Stellar: https://developers.stellar.org/docs/build/agentic-payments/mpp
- MPP session channels: https://developers.stellar.org/docs/build/agentic-payments/mpp/channel-guide

## Repos and SDKs

- x402 Stellar monorepo: https://github.com/stellar/x402-stellar
- x402 protocol repo: https://github.com/coinbase/x402
- MPP SDK: https://github.com/stellar/stellar-mpp-sdk
- x402 MCP server demo: https://github.com/jamesbachini/x402-mcp-stellar

## Soroban and Authorization

- Contract accounts: https://developers.stellar.org/docs/build/guides/contract-accounts
- Contract authorization: https://developers.stellar.org/docs/learn/fundamentals/contract-development/authorization
- Signing Soroban invocations: https://developers.stellar.org/docs/build/guides/transactions/signing-soroban-invocations

## Wallet and Tooling

- Stellar Wallets Kit: https://stellarwalletskit.dev/
- Stellar CLI: https://developers.stellar.org/docs/tools/cli
- Stellar Lab: https://developers.stellar.org/docs/tools/lab
- Scaffold Stellar: https://scaffoldstellar.org

## Suggested Build Path

1. Deploy `contracts/agent-manager` and initialize admin.
2. Register agent pricing and enable flags onchain.
3. Run `npm run dev:x402` and gate premium HTTP routes.
4. Use `npm run x402:client` for signed pay-per-request flow.
5. Connect AgentFlow node graph to `stellar-agent-manager` and `stellar-x402-gateway` agents.
