# AgentFlow (Stellar Edition)

Visual orchestration for Stellar-native agents.

## What It Is

AgentFlow lets users compose specialized Stellar agents on a node canvas, run them in sequence, and publish reusable super agents.

The current build is fully Stellar-focused:
- Stellar account and payment intent workflows
- Horizon and federation-aware utilities
- Stellar ecosystem protocol/startup agents (DEX, lending, wallets, anchors, RWAs)
- AI-assisted pipeline composition through Agent X

## Core Features

- Drag-and-drop flow canvas with execution order control
- Agent registry with protocol-specific presets
- Agent execution API with structured JSON outputs
- Agent X chat for natural-language flow generation
- Export/import and publish flow support

## Architecture

- Frontend: Next.js + React + React Flow
- State: Zustand stores for canvas, flow execution, and activity
- Backend: Next.js route handlers under src/app/api
- Agent runtime: Registry-driven routes with Stellar-focused handlers

## Stellar Agent Coverage

Representative categories in this repo:
- Core: orchestrator, super-agent composer, negotiation and execution utilities
- Network: Horizon account ops, federation resolver, XLM price monitor
- DeFi: Soroswap, Aquarius, Phoenix, StellarX, LumenSwap
- Credit/Lending: Blend, Stellar Broker
- Wallets/Payments: xBull, MoneyGram, Circle USDC
- Ecosystem/RWA/Infra: SDF, Franklin, Ondo, Centrifuge, Etherfuse, anchors

## Quick Start

```bash
cd agentflow
npm install
npm run dev
```

Open http://localhost:3000

Wallet + auth quick path:
- Click `Wallets` in the toolbar for multi-wallet connect (Wallets Kit auth modal), or `Freighter` for direct Freighter connect.
- Click `Sign In` to complete Stellar signature challenge auth.
- Auth endpoints used by UI:
	- `POST /api/auth/stellar/challenge`
	- `POST /api/auth/stellar/session`
	- `POST /api/auth/stellar/verify`

## Soroban Agent Manager Contract

An onchain manager contract is included at `contracts/agent-manager`.

```bash
cd contracts/agent-manager
cargo build --target wasm32-unknown-unknown --release
```

Use the `Stellar Agent Manager` node in the canvas to generate contract invoke commands for `register_agent`, `set_price`, `set_enabled`, and `get_agent`.

## x402 Stellar Integration

Run the x402 paywall sidecar:

```bash
cp x402/.env.example x402/.env
# set X402_PAY_TO and STELLAR_PRIVATE_KEY
npm run dev:x402
```

Test paid client flow:

```bash
npm run x402:client
```

Use the `Stellar Payment Gateway` node in AgentFlow to select `x402`, `mpp_charge`, or `mpp_session` rail behavior.

Optional onchain policy mode:
- Set `policyContractId`, `policyAgentName`, and `policyNetwork` on the payment gateway node.
- Runtime execution resolves payment mode from Soroban `agent-manager` storage first, then falls back to node `paymentRail`.
- Validate contract reads with `POST /api/payments/policy` using `{ contractId, agentName, network }`.

## Resource Links

- Stellar x402 docs: https://developers.stellar.org/docs/build/agentic-payments/x402
- Stellar x402 quickstart: https://developers.stellar.org/docs/build/agentic-payments/x402/quickstart-guide
- Stellar MPP docs: https://developers.stellar.org/docs/build/agentic-payments/mpp
- x402 Stellar repo: https://github.com/stellar/x402-stellar
- Curated project link pack in this repo: `STELLAR_AGENT_PAYMENTS_RESOURCES.md`

## Build

This repository uses webpack mode for production build compatibility on environments without native SWC bindings:

```bash
npm run build
npm start
```

## Environment

Create .env.local and configure keys only for services you use (for example LLM providers). The app is usable without optional providers for core local flow testing.

Optional payment policy override:
- `AGENTFLOW_AGENT_PAYMENT_MODES` JSON map (example: `{"stellar-x402-gateway":"mpp_session"}`) to force runtime payment mode by agent id.
- `SOROBAN_RPC_URL_TESTNET` and `SOROBAN_RPC_URL_MAINNET` to override default Soroban RPC endpoints used for onchain policy reads.
- `MPP_SETTLEMENT_EXECUTOR_URL` to enable `POST /api/payments/mpp` execution handoff (`execute: true`) to an external settlement worker.

## API Routes

- /api/agents
- /api/agents/[agentId]
- /api/agent-execute
- /api/auth/stellar/challenge
- /api/auth/stellar/session
- /api/auth/stellar/verify
- /api/payments/mpp
- /api/payments/policy
- /api/chat
- /api/ens-resolve (compat path returning Stellar federation semantics)
- /api/price-feed (XLM-centric feed)
- /api/export-flow
- /api/negotiate

## Product Direction

AgentFlow is designed so protocols/startups can ship dedicated agents, and users can combine them into super agents tailored to real workflows.

High-level protocol architecture and wallet/auth/payment strategy:
- AGENTFLOW_STELLAR_PROTOCOL_BLUEPRINT.md
