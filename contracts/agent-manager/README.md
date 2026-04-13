# Agent Manager Soroban Contract

This contract provides an onchain control plane for AgentFlow agents.

## What It Stores

- Admin address with authority to modify agent records
- Agent config by `agent_id` (`BytesN<32>`):
- `owner` (agent controller address)
- `metadata_uri` (offchain metadata pointer)
- `price_stroops` (base price unit)
- `enabled` (availability switch)
- `payment_mode` (`Free`, `X402`, `MppCharge`, `MppSession`)
- `visibility` (`Private`, `Community`, `Public`)
- `updated_at` (ledger timestamp)

## Contract Methods

- `init(admin)`
- `admin()`
- `register_agent(agent_id, owner, metadata_uri, price_stroops, enabled, payment_mode, visibility)`
- `set_price(agent_id, price_stroops)`
- `set_enabled(agent_id, enabled)`
- `set_payment_mode(agent_id, payment_mode)`
- `set_visibility(agent_id, visibility)`
- `transfer_owner(agent_id, new_owner)`
- `get_agent(agent_id)`

## Build

```bash
cd contracts/agent-manager
cargo build --target wasm32-unknown-unknown --release
```

## Deploy (Testnet)

Requires Stellar CLI and configured identity.

```bash
stellar contract build
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/agent_manager.wasm \
  --source alice \
  --network testnet
```

## Example Invocation

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- register_agent \
  --agent_id <32-BYTE-HEX> \
  --owner <STELLAR_G_ADDRESS> \
  --metadata_uri ipfs://agent/alpha.json \
  --price_stroops 100000 \
  --enabled true \
  --payment_mode X402 \
  --visibility Public
```
