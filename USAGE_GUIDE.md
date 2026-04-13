# AgentFlow Usage Guide (Stellar)

## 1. Run Locally

```bash
cd agentflow
npm install
npm run dev
```

Open http://localhost:3000

## 2. Build a Flow

1. Add agents from the registry sidebar.
2. Connect nodes left-to-right to define data flow.
3. Configure params in the Inspector panel.
4. Click Run Flow.
5. Review outputs in the execution log and per-node result panel.

## 3. Suggested First Flow

Use this 4-node pipeline:
1. Horizon Account Reader
2. XLM Price Feed
3. Stellar Reasoner
4. Payment Intent Builder

Example run goals:
- Check account state and recent operations
- Pull XLM/USD context
- Generate recommendation text
- Produce a payment intent payload for external signing

## 4. Agent X

Open the chat panel and try:
- Build a Stellar treasury monitoring pipeline
- Build a Soroswap + Aquarius liquidity monitoring flow
- Build a MoneyGram offramp readiness flow

Agent X can scaffold a canvas flow from natural language and route execution through existing registry agents.

## 5. Stellar Account Input

The toolbar accepts a manual Stellar account value (G...).
Use a valid public key when running account or payment-oriented agents.

## 6. API Endpoints

- POST /api/agents/[agentId]
- POST /api/agent-execute
- POST /api/chat
- POST /api/negotiate
- GET /api/agents

Utility endpoints:
- POST /api/ens-resolve (compat path for federation-style resolution)
- GET /api/price-feed (XLM feed)
- POST /api/export-flow

## 7. Notes

- This repo intentionally excludes EVM wallet-connect flows.
- Transaction signing is modeled as payment intent output for Stellar-native or external signer integrations.
