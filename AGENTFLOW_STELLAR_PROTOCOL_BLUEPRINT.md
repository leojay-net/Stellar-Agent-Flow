# AgentFlow Stellar Protocol Blueprint

## Product Thesis

AgentFlow is a protocol and marketplace for Stellar-native agents.

- Protocol teams can upload specialized agents (example: a Soroswap agent that understands only Soroswap features).
- Agent owners choose monetization mode per agent:
  - free,
  - paid per request via x402,
  - high-frequency/session billing via MPP.
- Agent definitions and policy are managed onchain in Soroban (agent manager contract).
- Builders compose multiple specialized agents into a Super Agent that solves broader user prompts.
- Public Super Agents are reusable by anyone, honoring free/paid policy.

This is effectively n8n for protocol-native agents on Stellar.

## High-Level Flow

1. Protocol/creator publishes an agent.
2. Agent is registered in the Soroban agent manager contract.
3. Creator sets:
   - metadata,
   - enabled/disabled,
   - payment policy (free or paid).
4. End users run a single agent or compose several into a Super Agent.
5. Runtime checks policy:
   - free: execute immediately,
   - paid: enforce x402 or MPP flow.
6. Execution output is returned to user and usage is metered.

## Data and Control Planes

### Onchain Control Plane (Soroban)

Current contract already supports:
- init admin
- register agent
- set price
- set enabled
- get agent

Recommended next additions:
- owner per agent (not only global admin)
- payment mode enum: FREE | X402 | MPP_CHARGE | MPP_SESSION
- revenue split map (creator %, protocol %, platform %)
- allowlist/visibility flags (private/community/public)
- versioning and deprecation status
- optional staking/slashing for quality guarantees

### Offchain Runtime Plane

- Agent execution APIs run tool logic.
- Paywall middleware enforces paid access.
- Negotiation/orchestration composes specialist agents.
- Logs and usage analytics feed creator dashboards.

## Wallets on Stellar (What to Use)

Current codebase status:
- Freighter wallet connection is integrated in the UI.
- Signature-based challenge/verify auth endpoints are integrated.
- Multi-wallet modal routing (Wallets Kit full module set) is the next upgrade.

Recommended wallet stack:
- Primary browser wallet UX: Stellar Wallets Kit.
- Support wallet providers that can sign auth entries and transactions (for x402 and Soroban auth):
  - Freighter (desktop extension),
  - Albedo,
  - Hana,
  - HOT,
  - Klever,
  - OneKey.

Implementation target:
- Connect wallet from UI.
- Persist selected wallet/session.
- Expose standardized methods in client:
  - connect(), disconnect(), getAddress(),
  - signTransaction(),
  - signAuthEntry() for x402 flows.

## Auth on Stellar (What to Use)

Use layered auth:

1. App auth (user identity)
- SIWS-style challenge (Sign-In with Stellar) using wallet signature.
- Server issues short-lived session/JWT after signature verification.

2. Contract auth (Soroban authorization)
- For state-changing contract calls, rely on Soroban require_auth semantics.
- For machine-paid calls (x402), sign auth entries as required by the payment scheme.

3. Agent/API auth
- Protect paid endpoints with x402/MPP verification.
- Optional API key for internal service-to-service calls, but not as primary payment gate.

## Payments Beyond x402

### x402 (pay per request)
Best for:
- premium tool calls,
- one-off paid actions,
- easy web-native paid HTTP access.

### MPP Charge intent
Best for:
- deterministic per-call charging with richer machine payment semantics.

### MPP Session intent (channels)
Best for:
- rapid multi-step Super Agent loops,
- high-frequency interactions where per-call onchain settlement is expensive.

Pragmatic rollout:
1. Keep x402 as first paid path.
2. Add MPP Charge as alternative settlement mode.
3. Add MPP Session for power users and high-throughput flows.

## Super Agent Composition Model

Single-purpose agents remain narrow and protocol-specific.

Super Agent adds cross-protocol intelligence by wiring specialists together.

Example:
- Soroswap Agent executes swap route.
- Blend Agent handles post-swap lending action.
- Payment/Policy Agent enforces paid/free policy.
- Orchestrator handles sequencing and retries.

Output: one user prompt, many specialist agents under the hood.

## Minimum Production Roadmap

### Phase 1 (now)
- Solidify Soroban agent registry schema.
- Integrate Stellar Wallets Kit + SIWS login.
- Keep x402 paywall operational for paid endpoints.

### Phase 2
- Add MPP Charge mode support.
- Add creator dashboard: usage, revenue, failures.
- Add onchain policy fields (visibility, owner, payment mode).

### Phase 3
- Add MPP Session channels for high-frequency Super Agents.
- Add revenue-sharing settlement and payout jobs.
- Add quality scoring/reputation and optional staking.

## Demo Narrative (Hackathon)

"AgentFlow is a protocol where anyone can publish Stellar-native specialist agents. A protocol like Soroswap can upload an agent that deeply understands Soroswap. The agent can be free or paid using machine payments (x402 today, MPP next). Every agent is managed by a Soroban contract. Users can run single agents or compose them into Super Agents, such as Soroswap + Blend in one flow. If published publicly, anyone can reuse those Super Agents with free or paid access rules. Think n8n for interoperable protocol agents on Stellar."
