# AgentFlow — Skills Manifest

> **For LLM agents, AI orchestrators, and external systems.**
> This file describes how to interact with AgentFlow programmatically.

## Overview

AgentFlow is a multi-agent Web3 pipeline builder. It exposes **40+ callable agent endpoints** via a unified HTTP API. Each agent is a real, stateless HTTP endpoint that accepts a JSON body and returns structured results.

All agents follow the **AMP (Agent Messaging Protocol)** envelope format.

---

## Base URL

```
https://your-deployment.vercel.app
# or locally:
http://localhost:3000
```

---

## Authentication

No authentication required for agent endpoints (API keys for Venice/Gemini/Bankr are configured server-side).

---

## Chat Interface (Recommended for LLM agents)

The simplest way for another LLM agent to interact with AgentFlow is via the chat endpoint:

```
POST /api/chat
Content-Type: application/json

{
  "message": "Swap 0.01 ETH to USDC on Base",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "reply": "I'll execute a swap of 0.01 ETH to USDC...",
  "action": "run_agent",
  "agentId": "uniswap-v3-swap",
  "agentResult": { ... },
  "model": "llama-3.3-70b",
  "executionTimeMs": 3200
}
```

The chat endpoint understands natural language and will:
- Parse your intent
- Select the right agent
- Execute it
- Return the result

### Example Messages

| Intent       | Message                           |
| ------------ | --------------------------------- |
| Swap tokens  | `"Swap 0.001 ETH to USDC"`        |
| Stake ETH    | `"Stake 0.01 ETH with Lido"`      |
| Check price  | `"What is the ETH/USD price?"`    |
| Run pipeline | `"Execute the current pipeline"`  |
| List agents  | `"What agents do you have?"`      |
| Resolve ENS  | `"Resolve vitalik.eth"`           |
| Get balance  | `"Check my Bankr wallet balance"` |

---

## Direct Agent API

Each agent can be called directly:

```
POST /api/agents/{agentId}
Content-Type: application/json

{
  "paramName": "paramValue",
  ...
}
```

Or in AMP envelope format:

```json
{
  "ampVersion": "1.0",
  "flowId": "flow-123",
  "step": 1,
  "fromAgent": { "id": "your-agent-id" },
  "toAgent": { "id": "lido-staker" },
  "payload": {
    "minimumStakeEth": "0.01",
    "walletAddress": "0x..."
  },
  "timestamp": "2026-03-22T00:00:00Z"
}
```

**Response (AMP envelope):**
```json
{
  "ampVersion": "1.0",
  "agentId": "lido-staker",
  "success": true,
  "result": { ... },
  "executionTimeMs": 1200,
  "timestamp": "2026-03-22T00:00:01Z"
}
```

---

## Available Agents

### DeFi Agents

| Agent ID                   | Name                  | Sponsor   | Description                                                          |
| -------------------------- | --------------------- | --------- | -------------------------------------------------------------------- |
| `uniswap-swap-v4`          | Uniswap Swap          | Uniswap   | Builds token swap calldata using Uniswap v4 hooks on Base            |
| `uniswap-v3-swap`          | Uniswap V3 Swap       | Uniswap   | Real swap quote via Odos SOR + assembled tx calldata on Base mainnet |
| `uniswap-pool-quoter`      | Pool Quoter           | Uniswap   | Price estimates for Uniswap v3 pools                                 |
| `uniswap-permit2-approver` | Permit2 Approver      | Uniswap   | Manages Uniswap Permit2 token approvals                              |
| `uniswap-strategy-advisor` | Strategy Advisor      | Uniswap   | Venice LLM reasons EXECUTE/WAIT/SKIP over swap opportunity           |
| `lido-staker`              | Lido Staker           | Lido      | Stakes ETH via Lido — real APR, stETH balance, Bankr execution       |
| `lido-yield-treasury`      | Yield Treasury        | Lido      | Real stETH balance, accrued yield math                               |
| `lido-vault-monitor`       | Vault Monitor         | Lido      | Real balance + USD value + plain English summary                     |
| `venice-yield-strategy`    | Venice Yield Strategy | Venice.ai | Private LLM → COMPOUND/SWAP_TO_USDC/BRIDGE/HOLD JSON                 |
| `bankr-yield-executor`     | Yield Executor        | Bankr     | Executes yield strategy via Bankr agent wallet                       |
| `moonpay-fiat-bridge`      | MoonPay Bridge        | MoonPay   | Fiat on/off ramp via MoonPay                                         |
| `moonpay-swap-agent`       | MoonPay Swap          | MoonPay   | Token swap via MoonPay                                               |
| `celo-stable-transfer`     | Celo Transfer         | Celo      | Stable token transfers on Celo                                       |
| `zyfai-intent-solver`      | ZyfAI Solver          | ZyfAI     | Intent-based trade execution                                         |

### AI / LLM Agents

| Agent ID                  | Name            | Sponsor   | Description                                                         |
| ------------------------- | --------------- | --------- | ------------------------------------------------------------------- |
| `venice-private-reasoner` | Venice Reasoner | Venice.ai | Private LLM inference via Venice (llama-3.3-70b), no data retention |
| `bankr-ai-agent`          | Bankr AI Agent  | Bankr     | Natural language DeFi commands via Bankr                            |

### Oracle Agents

| Agent ID                 | Name             | Sponsor   | Description                               |
| ------------------------ | ---------------- | --------- | ----------------------------------------- |
| `chainlink-price-oracle` | Chainlink Oracle | Chainlink | Real-time price data from Chainlink feeds |

### Identity Agents

| Agent ID                    | Name          | Sponsor | Description                                          |
| --------------------------- | ------------- | ------- | ---------------------------------------------------- |
| `ens-name-resolver`         | ENS Resolver  | ENS     | Resolves .eth names to Ethereum addresses (on-chain) |
| `ens-super-agent-registrar` | ENS Registrar | ENS     | Register .eth subnames for agents                    |
| `self-identity-protocol`    | SELF Identity | SELF    | Verifies decentralized identity claims               |

### Auth / Delegation

| Agent ID                  | Name                | Sponsor  | Description                                  |
| ------------------------- | ------------------- | -------- | -------------------------------------------- |
| `metamask-delegation`     | MetaMask Delegation | MetaMask | Configures MetaMask Delegation Toolkit scope |
| `metamask-delegate-scope` | Delegate Scope      | MetaMask | Manages delegate permission scopes           |
| `metamask-sub-delegation` | Sub-Delegation      | MetaMask | Creates sub-delegations for agents           |

### Trust / Verification

| Agent ID                 | Name              | Sponsor  | Description                             |
| ------------------------ | ----------------- | -------- | --------------------------------------- |
| `erc8004-trust-verifier` | ERC-8004 Verifier | ERC-8004 | On-chain agent trust score verification |
| `arkhai-data-verifier`   | Arkhai Verifier   | Arkhai   | Data verification and attestation       |

### Chain / Execution

| Agent ID                    | Name               | Sponsor      | Description                             |
| --------------------------- | ------------------ | ------------ | --------------------------------------- |
| `base-transaction-executor` | Base TX Executor   | Base         | Routes transactions to Base L2          |
| `lit-access-control`        | Lit Access Control | Lit Protocol | Decentralized access control conditions |
| `lit-pkp-signer`            | Lit PKP Signer     | Lit Protocol | Programmable key pair signing           |

### Governance

| Agent ID                  | Name             | Sponsor  | Description                            |
| ------------------------- | ---------------- | -------- | -------------------------------------- |
| `snapshot-dao-voter`      | Snapshot Voter   | Snapshot | Scans active DAO proposals on Snapshot |
| `octant-impact-evaluator` | Impact Evaluator | Octant   | Evaluates public goods impact          |
| `octant-grant-allocator`  | Grant Allocator  | Octant   | Allocates grants to public goods       |

### Wallet Agents

| Agent ID                | Name            | Sponsor | Description                 |
| ----------------------- | --------------- | ------- | --------------------------- |
| `bankr-agent-wallet`    | Bankr Wallet    | Bankr   | EVM agent wallet via Bankr  |
| `bankr-balance-checker` | Balance Checker | Bankr   | Multi-chain balance queries |
| `moonpay-openwallet`    | MoonPay Wallet  | MoonPay | Open wallet integration     |

### Core / Orchestration

| Agent ID               | Name         | Sponsor   | Description                                 |
| ---------------------- | ------------ | --------- | ------------------------------------------- |
| `orchestrator-core`    | Orchestrator | AgentFlow | Manages execution order and message routing |
| `super-agent-composer` | Super Agent  | AgentFlow | Composes multiple agents into one           |

### NFT / Creative

| Agent ID               | Name       | Sponsor   | Description                      |
| ---------------------- | ---------- | --------- | -------------------------------- |
| `superrare-nft-lister` | NFT Lister | SuperRare | Lists NFTs on SuperRare          |
| `superrare-art-bidder` | Art Bidder | SuperRare | Places bids on SuperRare artwork |

### Autonomous Agents

| Agent ID              | Name         | Sponsor | Description                                   |
| --------------------- | ------------ | ------- | --------------------------------------------- |
| `olas-agent-service`  | Olas Service | Olas    | Deploys autonomous agent services             |
| `olas-mech-requester` | Olas Mech    | Olas    | Requests off-chain computations via Olas Mech |

---

## Key Agent Details

### uniswap-v3-swap

Real swap execution with Odos SOR routing through Uniswap v3/v4 on Base mainnet.

```
POST /api/agents/uniswap-v3-swap

{
  "tokenIn": "ETH",
  "tokenOut": "USDC",
  "amountIn": "0.001",
  "feeTier": "3000",
  "slippageBps": "50",
  "walletAddress": "0x..."
}
```

**Returns:** Real `amountOut`, `priceImpact`, `gasEstimate`, fully assembled `transaction` object (to/data/value/gas) ready for MetaMask signing.

### lido-staker

```
POST /api/agents/lido-staker

{
  "minimumStakeEth": "0.01",
  "walletAddress": "0x...",
  "autoCompound": "true"
}
```

**Returns:** Live Lido APR, current stETH balance, staking calldata.

### venice-private-reasoner

```
POST /api/agents/venice-private-reasoner

{
  "systemPrompt": "You are a DeFi analyst.",
  "model": "llama-3.3-70b",
  "maxTokens": "512"
}
```

**Returns:** Private LLM response (no data retention on Venice servers).

### chainlink-price-oracle

```
POST /api/agents/chainlink-price-oracle

{
  "pricePairs": "ETH/USD,BTC/USD"
}
```

**Returns:** Real-time prices from Chainlink feeds.

---

## Pipeline Execution

You can also execute a pre-built pipeline via the agent-execute endpoint:

```
POST /api/agent-execute

{
  "agentId": "uniswap-v3-swap",
  "agentName": "Uniswap V3 Swap",
  "parameterValues": { "tokenIn": "ETH", "tokenOut": "USDC", "amountIn": "0.001" },
  "upstreamResult": { ... },
  "endpointUrl": "/api/agents/uniswap-v3-swap",
  "flowId": "flow-123",
  "stepNumber": 1
}
```

The `upstreamResult` field carries the previous agent's output for chaining.

---

## Output Chaining

When agents are connected in a pipeline, each agent's output is automatically passed as `_upstream` (JSON-stringified) in the request body to the next agent. Agents can parse this to receive context from upstream steps.

---

## Agent Registry API

List all available agents:

```
GET /api/agents
```

Returns the full agent registry with IDs, names, descriptions, parameters, categories, and sponsors.

---

## Integration Examples

### Python
```python
import requests

# Chat interface
r = requests.post("http://localhost:3000/api/chat", json={
    "message": "Swap 0.001 ETH to USDC"
})
print(r.json()["reply"])

# Direct agent call
r = requests.post("http://localhost:3000/api/agents/chainlink-price-oracle", json={
    "pricePairs": "ETH/USD"
})
print(r.json()["result"])
```

### JavaScript/TypeScript
```typescript
const res = await fetch("http://localhost:3000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "Check ETH price" }),
});
const data = await res.json();
console.log(data.reply);
```

### cURL
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What agents do you have?"}'
```

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Description of what went wrong",
  "executionTimeMs": 150
}
```

HTTP status codes: `200` success, `400` bad request, `500` server error, `502` upstream failure.

---

## Rate Limits

- No rate limits on agent endpoints
- Venice LLM: subject to your API credit balance
- Gemini LLM: Google free tier limits apply
- Bankr: subject to Bankr API tier limits
- On-chain RPC calls: public endpoints (Base, Ethereum) may throttle

---

## Supported Chains

| Chain            | Chain ID | Status           |
| ---------------- | -------- | ---------------- |
| Base Mainnet     | 8453     |  Primary        |
| Ethereum Mainnet | 1        |  ENS, Chainlink |
| Base Sepolia     | 84532    |  Testing        |

---

## Contact

Built for the **Synthesis Hackathon** by AgentFlow.
