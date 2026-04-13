#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env, String,
};

#[derive(Clone)]
#[contracttype]
pub enum PaymentMode {
    Free,
    X402,
    MppCharge,
    MppSession,
}

#[derive(Clone)]
#[contracttype]
pub enum Visibility {
    Private,
    Community,
    Public,
}

#[derive(Clone)]
#[contracttype]
pub struct AgentConfig {
    pub owner: Address,
    pub metadata_uri: String,
    pub price_stroops: i128,
    pub enabled: bool,
    pub payment_mode: PaymentMode,
    pub visibility: Visibility,
    pub updated_at: u64,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Agent(BytesN<32>),
}

#[contracterror]
#[derive(Copy, Clone, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    AgentNotFound = 3,
}

#[contract]
pub struct AgentManagerContract;

fn read_admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

fn require_admin(env: &Env) -> Result<Address, Error> {
    let admin = read_admin(env)?;
    admin.require_auth();
    Ok(admin)
}

#[contractimpl]
impl AgentManagerContract {
    pub fn init(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.events().publish((symbol_short!("init"),), admin);
        Ok(())
    }

    pub fn admin(env: Env) -> Result<Address, Error> {
        read_admin(&env)
    }

    pub fn register_agent(
        env: Env,
        agent_id: BytesN<32>,
        owner: Address,
        metadata_uri: String,
        price_stroops: i128,
        enabled: bool,
        payment_mode: PaymentMode,
        visibility: Visibility,
    ) -> Result<(), Error> {
        let _ = require_admin(&env)?;
        let now = env.ledger().timestamp();
        let cfg = AgentConfig {
            owner,
            metadata_uri,
            price_stroops,
            enabled,
            payment_mode,
            visibility,
            updated_at: now,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Agent(agent_id.clone()), &cfg);
        env.events().publish((symbol_short!("register"),), agent_id);
        Ok(())
    }

    pub fn set_price(env: Env, agent_id: BytesN<32>, price_stroops: i128) -> Result<(), Error> {
        let _ = require_admin(&env)?;
        let key = DataKey::Agent(agent_id.clone());
        let mut cfg: AgentConfig = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::AgentNotFound)?;
        cfg.price_stroops = price_stroops;
        cfg.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &cfg);
        env.events().publish((symbol_short!("price"),), agent_id);
        Ok(())
    }

    pub fn set_enabled(env: Env, agent_id: BytesN<32>, enabled: bool) -> Result<(), Error> {
        let _ = require_admin(&env)?;
        let key = DataKey::Agent(agent_id.clone());
        let mut cfg: AgentConfig = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::AgentNotFound)?;
        cfg.enabled = enabled;
        cfg.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &cfg);
        env.events().publish((symbol_short!("enabled"),), agent_id);
        Ok(())
    }

    pub fn set_payment_mode(
        env: Env,
        agent_id: BytesN<32>,
        payment_mode: PaymentMode,
    ) -> Result<(), Error> {
        let _ = require_admin(&env)?;
        let key = DataKey::Agent(agent_id.clone());
        let mut cfg: AgentConfig = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::AgentNotFound)?;
        cfg.payment_mode = payment_mode;
        cfg.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &cfg);
        env.events().publish((symbol_short!("paymode"),), agent_id);
        Ok(())
    }

    pub fn set_visibility(
        env: Env,
        agent_id: BytesN<32>,
        visibility: Visibility,
    ) -> Result<(), Error> {
        let _ = require_admin(&env)?;
        let key = DataKey::Agent(agent_id.clone());
        let mut cfg: AgentConfig = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::AgentNotFound)?;
        cfg.visibility = visibility;
        cfg.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &cfg);
        env.events().publish((symbol_short!("visib"),), agent_id);
        Ok(())
    }

    pub fn transfer_owner(env: Env, agent_id: BytesN<32>, new_owner: Address) -> Result<(), Error> {
        let _ = require_admin(&env)?;
        let key = DataKey::Agent(agent_id.clone());
        let mut cfg: AgentConfig = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::AgentNotFound)?;
        cfg.owner = new_owner;
        cfg.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &cfg);
        env.events().publish((symbol_short!("owner"),), agent_id);
        Ok(())
    }

    pub fn get_agent(env: Env, agent_id: BytesN<32>) -> Result<AgentConfig, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Agent(agent_id))
            .ok_or(Error::AgentNotFound)
    }
}

#[cfg(test)]
mod test {
    use super::{AgentManagerContract, AgentManagerContractClient, PaymentMode, Visibility};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

    #[test]
    fn register_and_read_agent() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(AgentManagerContract, ());
        let client = AgentManagerContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        client.init(&admin);

        let agent_id = BytesN::<32>::from_array(&env, &[7; 32]);
        let metadata = String::from_str(&env, "ipfs://agent/meta.json");
        client.register_agent(
            &agent_id,
            &owner,
            &metadata,
            &100,
            &true,
            &PaymentMode::X402,
            &Visibility::Public,
        );

        client.set_payment_mode(&agent_id, &PaymentMode::MppCharge);
        client.set_visibility(&agent_id, &Visibility::Community);

        let loaded = client.get_agent(&agent_id);
        assert_eq!(loaded.owner, owner);
        assert_eq!(loaded.price_stroops, 100);
        assert!(loaded.enabled);
        assert!(matches!(loaded.payment_mode, PaymentMode::MppCharge));
        assert!(matches!(loaded.visibility, Visibility::Community));
    }
}
