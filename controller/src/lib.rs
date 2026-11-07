pub mod voucher;
use near_contract_standards::fungible_token::{
    FungibleToken,
    core::FungibleTokenCore,
    metadata::{FT_METADATA_SPEC, FungibleTokenMetadata, FungibleTokenMetadataProvider},
    resolver::FungibleTokenResolver,
};
use near_contract_standards::non_fungible_token::{
    NonFungibleToken, NonFungibleTokenResolver, Token, TokenId,
    core::NonFungibleTokenCore,
    metadata::{
        NFT_METADATA_SPEC, NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata,
    },
};
use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::collections::{LookupMap, UnorderedMap, UnorderedSet};
use near_sdk::json_types::U128;
use near_sdk::{
    AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseError, PromiseOrValue,
    assert_one_yocto, env, near, require,
};
use std::collections::HashMap;
use voucher::{Liability, Payload, SignRequest, ToolConfig, Voucher};

const UPKEEP: u128 = 10;
const CHILD_MUNCH: u128 = 100;
const PARENT_FLOOR: u128 = 20;
const MIN_CHILD_NEAR: u128 = 60_000_000_000_000_000_000_000;
const MAX_CREATURES: u64 = 32;

#[near(serializers=[borsh, json])]
#[derive(Clone)]
pub struct Creature {
    pub active: bool,
    pub parent: Option<AccountId>,
    pub strategy_hash: String,
    pub mutation: u8,
    pub born_turn: u64,
    pub nonce: u64,
    pub pending: Option<AccountId>,
    pub native_reserve: U128,
}
#[near(serializers=[borsh, json])]
#[derive(Clone)]
pub struct Birth {
    pub parent: AccountId,
    pub child: AccountId,
    pub nonce: u64,
    pub native: U128,
    pub strategy_hash: String,
    pub mutation: u8,
    pub state: String,
}
#[near(serializers=[borsh, json])]
#[derive(Clone)]
pub struct Job {
    pub demand: u64,
    pub amount: U128,
    pub expiry_turn: u64,
    pub requirements_hash: String,
    pub claimant: Option<AccountId>,
    pub output_hash: Option<String>,
    pub paid: bool,
    pub agreed_price: Option<U128>,
}
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Controller {
    owner: AccountId,
    tool_config: Option<ToolConfig>,
    tool_liabilities: LookupMap<u64, Liability>,
    tool_jobs: UnorderedSet<String>,
    tool_committed: u128,
    next_tool_nonce: u64,
    token: FungibleToken,
    lives: NonFungibleToken,
    goals: LookupMap<AccountId, u8>,
    nft_in_flight: UnorderedSet<TokenId>,
    #[cfg(feature = "fault-injection")]
    fault_child: Option<AccountId>,
    creatures: UnorderedMap<AccountId, Creature>,
    births: LookupMap<AccountId, Birth>,
    jobs: LookupMap<String, Job>,
    bids: LookupMap<String, U128>,
    services: UnorderedSet<String>,
    turn: u64,
    demand: u64,
    market: u128,
    pending_munch: u128,
    job_escrow: u128,
    burned: u128,
    pending_births: u64,
}

#[near]
impl Controller {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        let mut token = FungibleToken::new(b"t".to_vec());
        token.internal_register_account(&env::current_account_id());
        token.internal_deposit(&env::current_account_id(), 1000);
        let lives = NonFungibleToken::new(
            b"n".to_vec(),
            owner.clone(),
            Some(b"nm".to_vec()),
            None::<Vec<u8>>,
            None::<Vec<u8>>,
        );
        Self {
            lives,
            goals: LookupMap::new(b"go".to_vec()),
            nft_in_flight: UnorderedSet::new(b"nf".to_vec()),
            #[cfg(feature = "fault-injection")]
            fault_child: None,
            tool_config: None,
            tool_liabilities: LookupMap::new(b"tl".to_vec()),
            tool_jobs: UnorderedSet::new(b"tj".to_vec()),
            tool_committed: 0,
            next_tool_nonce: 0,
            owner,
            token,
            creatures: UnorderedMap::new(b"c"),
            births: LookupMap::new(b"b"),
            jobs: LookupMap::new(b"j"),
            bids: LookupMap::new(b"bd".to_vec()),
            services: UnorderedSet::new(b"s"),
            turn: 0,
            demand: 0,
            market: 1000,
            pending_munch: 0,
            job_escrow: 0,
            burned: 0,
            pending_births: 0,
        }
    }
    #[payable]
    pub fn register(&mut self, id: AccountId, amount: U128, strategy_hash: String) {
        self.only_owner();
        Self::hash(&strategy_hash);
        let initial_policy = (0..=3)
            .find(|&m| Self::policy_hash(m) == strategy_hash)
            .expect("unknown strategy manifest");
        require!(!self.creatures.get(&id).is_some(), "creature exists");
        require!(self.births.get(&id).is_none(), "birth ID used");
        require!(
            id != env::current_account_id(),
            "controller is not a creature"
        );
        require!(
            self.creatures.len() + self.pending_births < MAX_CREATURES
                && amount.0 > 0
                && self.market >= amount.0,
            "allocation"
        );
        self.ensure_token_account(&id);
        self.move_token(&env::current_account_id(), &id, amount.0);
        self.market -= amount.0;
        self.creatures.insert(
            &id,
            &Creature {
                active: true,
                parent: None,
                strategy_hash,
                mutation: initial_policy,
                born_turn: self.turn,
                nonce: 0,
                pending: None,
                native_reserve: U128(env::attached_deposit().as_yoctonear()),
            },
        );
        self.mint_life(&id, self.owner.clone());
        self.solvent_native();
    }
    pub fn tick(&mut self, next_turn: u64) {
        self.only_owner();
        require!(
            next_turn == self.turn.checked_add(1).unwrap(),
            "turn sequence"
        );
        self.turn = next_turn;
        let ids: Vec<_> = self.creatures.keys().collect();
        for id in ids {
            let mut c = self.creatures.get(&id).unwrap();
            if !c.active {
                continue;
            }
            let balance = self.balance(&id);
            if balance < UPKEEP {
                // Return normally so extinction is committed, never panic here.
                c.active = false;
                self.creatures.insert(&id, &c);
                env::log_str(&format!("extinction {id} turn {}", self.turn));
            } else {
                self.token.internal_withdraw(&id, UPKEEP);
                near_contract_standards::fungible_token::events::FtBurn {
                    owner_id: &id,
                    amount: U128(UPKEEP),
                    memo: Some("upkeep"),
                }
                .emit();
                self.burned = self.burned.checked_add(UPKEEP).unwrap();
                env::log_str(&format!("burn {id} {UPKEEP}"));
            }
        }
    }
    pub fn set_demand(&mut self, version: u64) {
        self.only_owner();
        require!(version > self.demand, "demand sequence");
        self.demand = version;
    }
    pub fn create_job(
        &mut self,
        job_id: String,
        amount: U128,
        expiry_turn: u64,
        requirements_hash: String,
    ) {
        self.only_owner();
        Self::id(&job_id);
        Self::hash(&requirements_hash);
        require!(self.jobs.get(&job_id).is_none(), "job exists");
        require!(
            amount.0 > 0 && amount.0 <= self.market && expiry_turn >= self.turn,
            "job bounds"
        );
        self.market -= amount.0;
        self.job_escrow = self.job_escrow.checked_add(amount.0).unwrap();
        self.jobs.insert(
            &job_id,
            &Job {
                demand: self.demand,
                amount,
                expiry_turn,
                requirements_hash,
                claimant: None,
                output_hash: None,
                paid: false,
                agreed_price: None,
            },
        );
    }
    pub fn bid_job(&mut self, actor: AccountId, job_id: String, price: U128) {
        self.actor(&actor);
        let job = self.jobs.get(&job_id).expect("unknown job");
        self.live_job(&job);
        require!(job.claimant.is_none(), "claimed");
        let c = self.creatures.get(&actor).unwrap();
        let floor = match c.mutation {
            0 => 90,
            1 => 80,
            2 => 30,
            3 => 40,
            _ => env::panic_str("policy"),
        };
        require!(price.0 >= floor && price.0 <= job.amount.0, "bid bounds");
        let key = format!("{job_id}/{actor}");
        require!(self.bids.get(&key).is_none(), "bid exists");
        self.bids.insert(&key, &price);
    }
    pub fn bid(&self, actor: AccountId, job_id: String) -> Option<U128> {
        self.bids.get(&format!("{job_id}/{actor}"))
    }
    pub fn claim_job(&mut self, actor: AccountId, job_id: String) {
        self.actor(&actor);
        let mut job = self.jobs.get(&job_id).expect("unknown job");
        self.live_job(&job);
        require!(job.claimant.is_none(), "claimed");
        job.agreed_price = self.bids.get(&format!("{job_id}/{actor}"));
        job.claimant = Some(actor);
        self.jobs.insert(&job_id, &job);
    }
    pub fn settle_job(&mut self, job_id: String, output_hash: String) {
        self.only_owner();
        Self::hash(&output_hash);
        let mut job = self.jobs.get(&job_id).expect("unknown job");
        self.live_job(&job);
        let actor = job.claimant.clone().expect("unclaimed");
        self.active(&actor);
        let price = job.agreed_price.unwrap_or(job.amount).0;
        self.move_token(&env::current_account_id(), &actor, price);
        self.market += job.amount.0 - price;
        self.job_escrow -= job.amount.0;
        job.paid = true;
        job.output_hash = Some(output_hash);
        self.jobs.insert(&job_id, &job);
    }
    pub fn cancel_job(&mut self, job_id: String) {
        self.only_owner();
        let job = self.jobs.get(&job_id).expect("unknown job");
        require!(
            !job.paid && (self.turn > job.expiry_turn || self.demand != job.demand),
            "still live"
        );
        self.job_escrow -= job.amount.0;
        self.market += job.amount.0;
        let mut cancelled = job;
        cancelled.paid = true;
        self.jobs.insert(&job_id, &cancelled);
    }
    pub fn pay_creature(
        &mut self,
        actor: AccountId,
        provider: AccountId,
        amount: U128,
        service_id: String,
        output_hash: String,
    ) {
        self.actor(&actor);
        self.active(&provider);
        Self::id(&service_id);
        Self::hash(&output_hash);
        require!(actor != provider && amount.0 > 0, "payment bounds");
        require!(!self.services.contains(&service_id), "service replay");
        self.move_token(&actor, &provider, amount.0);
        self.services.insert(&service_id);
        env::log_str(&format!("service {service_id} {output_hash}"));
    }
    pub fn set_strategy(&mut self, actor: AccountId, strategy_hash: String, mutation: u8) {
        self.actor(&actor);
        Self::hash(&strategy_hash);
        require!(
            mutation <= 3 && Self::policy_hash(mutation) == strategy_hash,
            "mutation bounds"
        );
        let mut c = self.creatures.get(&actor).unwrap();
        c.strategy_hash = strategy_hash;
        c.mutation = mutation;
        self.creatures.insert(&actor, &c);
    }
    #[payable]
    pub fn deposit_native(&mut self, actor: AccountId) {
        // Deposits can never revive an extinct creature.
        let mut c = self.creatures.get(&actor).expect("unknown creature");
        c.native_reserve.0 = c
            .native_reserve
            .0
            .checked_add(env::attached_deposit().as_yoctonear())
            .unwrap();
        self.creatures.insert(&actor, &c);
    }
    pub fn birth(
        &mut self,
        parent: AccountId,
        child: AccountId,
        nonce: u64,
        native: U128,
        strategy_hash: String,
        mutation: u8,
    ) -> Promise {
        self.actor(&parent);
        require!(
            self.goals.get(&parent).unwrap_or(0) != 1,
            "goal forbids birth"
        );
        Self::hash(&strategy_hash);
        require!(
            self.creatures.len() + self.pending_births < MAX_CREATURES,
            "capacity"
        );
        require!(mutation <= 3 && native.0 >= MIN_CHILD_NEAR, "birth bounds");
        let suffix = format!(".{}", env::current_account_id());
        let label = child
            .as_str()
            .strip_suffix(&suffix)
            .expect("direct subaccount required");
        require!(
            !label.is_empty() && !label.contains('.'),
            "direct subaccount required"
        );
        require!(
            self.births.get(&child).is_none() && !self.creatures.get(&child).is_some(),
            "child ID used"
        );
        let mut p = self.creatures.get(&parent).unwrap();
        require!(
            p.pending.is_none() && nonce == p.nonce.checked_add(1).unwrap(),
            "birth nonce or pending"
        );
        require!(
            self.balance(&parent) >= CHILD_MUNCH + PARENT_FLOOR && p.native_reserve.0 >= native.0,
            "birth reserves"
        );
        require!(
            mutation != p.mutation && Self::policy_hash(mutation) == strategy_hash,
            "child needs bounded strategy change"
        );
        self.solvent_native();
        self.move_token(&parent, &env::current_account_id(), CHILD_MUNCH);
        self.pending_munch += CHILD_MUNCH;
        self.pending_births += 1;
        p.native_reserve.0 -= native.0;
        p.nonce = nonce;
        p.pending = Some(child.clone());
        self.creatures.insert(&parent, &p);
        self.births.insert(
            &child,
            &Birth {
                parent,
                child: child.clone(),
                nonce,
                native,
                strategy_hash,
                mutation,
                state: "pending".into(),
            },
        );
        self.solvent_native();
        Promise::new(child.clone())
            .create_account()
            .transfer(NearToken::from_yoctonear(native.0))
            .then(
                Promise::new(env::current_account_id()).function_call(
                    "on_birth",
                    near_sdk::serde_json::to_vec(
                        &near_sdk::serde_json::json!({"child":child,"nonce":nonce}),
                    )
                    .unwrap(),
                    NearToken::from_yoctonear(0),
                    Gas::from_tgas(20),
                ),
            )
    }
    #[private]
    pub fn on_birth(&mut self, child: AccountId, nonce: u64) -> bool {
        #[cfg(feature = "fault-injection")]
        require!(
            self.fault_child.as_ref() != Some(&child),
            "injected callback failure after creation"
        );
        require!(env::promise_results_count() == 1, "one result required");
        let success = match env::promise_result_checked(0, 64) {
            Ok(_) => true,
            Err(PromiseError::Failed) => false,
            Err(_) => env::panic_str("ambiguous result; reconcile"),
        };
        self.complete_birth(child, nonce, success);
        success
    }
    pub fn reconcile_birth(
        &mut self,
        child: AccountId,
        nonce: u64,
        success: bool,
        evidence_hash: String,
    ) {
        // Trusted recovery only. No timeout refund. Owner must independently inspect
        // account creation AND native refund receipts before choosing a failure.
        self.only_owner();
        Self::hash(&evidence_hash);
        self.complete_birth(child, nonce, success);
        env::log_str(&format!("trusted birth reconciliation {evidence_hash}"));
    }
    #[cfg(feature = "fault-injection")]
    pub fn inject_callback_failure(&mut self, child: AccountId) {
        self.only_owner();
        self.fault_child = Some(child);
    }
    pub fn list_creatures(&self) -> Vec<(AccountId, Creature)> {
        self.creatures.iter().collect()
    }
    pub fn goal(&self, actor: AccountId) -> u8 {
        self.goals.get(&actor).unwrap_or(0)
    }
    pub fn set_goal(&mut self, actor: AccountId, goal: u8) {
        self.life_owner(&actor);
        self.active(&actor);
        require!(goal <= 2, "goal bounds");
        self.goals.insert(&actor, &goal);
    }
    pub fn sponsor(&mut self, actor: AccountId, amount: U128) {
        self.life_owner(&actor);
        self.active(&actor);
        require!(amount.0 > 0, "positive sponsorship");
        let source = env::predecessor_account_id();
        self.ft_sender_guard(&source);
        self.move_token(&source, &actor, amount.0);
    }
    pub fn configure_tools(&mut self, config: ToolConfig) {
        self.only_owner();
        require!(self.tool_config.is_none(), "tools already configured");
        require!(
            config.domain.chain_id == 11155111
                && config.per_voucher.0 > 0
                && config.total_cap.0 >= config.per_voucher.0,
            "tool config bounds"
        );
        voucher::bytes(&config.domain.treasury, 20);
        voucher::bytes(&config.recipient, 20);
        voucher::bytes(&config.token, 20);
        voucher::bytes(&config.campaign, 32);
        self.tool_config = Some(config);
    }
    pub fn preview_tool_digest(&self, voucher: Voucher) -> String {
        voucher::digest(
            &self
                .tool_config
                .as_ref()
                .expect("tools not configured")
                .domain,
            &voucher,
        )
    }
    pub fn request_tool_payment(
        &mut self,
        actor: AccountId,
        job_id: String,
        voucher: Voucher,
    ) -> Promise {
        self.actor(&actor);
        let config = self.tool_config.clone().expect("tools not configured");
        let job = self.jobs.get(&job_id).expect("unknown job");
        require!(
            job.paid
                && job.claimant.as_ref() == Some(&actor)
                && job.output_hash.as_ref() == Some(&voucher.output_hash),
            "accepted work required"
        );
        require!(
            voucher.campaign == config.campaign
                && voucher.recipient == config.recipient
                && voucher.token == config.token,
            "fixed destination"
        );
        require!(
            voucher.creature == voucher::hex(&env::sha256(actor.as_bytes()))
                && voucher.job == voucher::hex(&env::sha256(job_id.as_bytes())),
            "actor and job binding"
        );
        require!(
            voucher.nonce == self.next_tool_nonce && !self.tool_jobs.contains(&job_id),
            "tool replay"
        );
        let now = env::block_timestamp() / 1_000_000_000;
        require!(
            voucher.expiry > now && voucher.expiry <= now + 3600,
            "voucher expiry bounds"
        );
        require!(
            voucher.amount.0 > 0
                && voucher.amount.0 <= config.per_voucher.0
                && self.tool_committed.checked_add(voucher.amount.0).unwrap() <= config.total_cap.0,
            "tool cap"
        );
        let digest = voucher::digest(&config.domain, &voucher);
        let nonce = voucher.nonce;
        self.tool_committed += voucher.amount.0;
        self.next_tool_nonce = self.next_tool_nonce.checked_add(1).unwrap();
        self.tool_jobs.insert(&job_id);
        self.tool_liabilities.insert(
            &nonce,
            &Liability {
                actor: actor.clone(),
                voucher,
                digest: digest.clone(),
                state: "reserved".into(),
                signature: None,
            },
        );
        let request = SignRequest {
            path: format!("feral-sepolia-v1/{actor}"),
            payload_v2: Payload::Ecdsa(digest),
            domain_id: 0,
        };
        Promise::new(config.signer)
            .function_call(
                "sign",
                near_sdk::serde_json::to_vec(&near_sdk::serde_json::json!({"request":request}))
                    .unwrap(),
                NearToken::from_yoctonear(1),
                Gas::from_tgas(60),
            )
            .then(
                Promise::new(env::current_account_id()).function_call(
                    "on_tool_signature",
                    near_sdk::serde_json::to_vec(&near_sdk::serde_json::json!({"nonce":nonce}))
                        .unwrap(),
                    NearToken::from_yoctonear(0),
                    Gas::from_tgas(15),
                ),
            )
    }
    #[private]
    pub fn on_tool_signature(&mut self, nonce: u64) -> bool {
        require!(env::promise_results_count() == 1, "one signature result");
        let mut l = self
            .tool_liabilities
            .get(&nonce)
            .expect("unknown liability");
        require!(l.state == "reserved", "signature already resolved");
        let ok = match env::promise_result_checked(0, 4096) {
            Ok(result) => {
                l.signature = Some(String::from_utf8(result).expect("UTF8 signature"));
                l.state = "signature-returned".into();
                true
            }
            Err(_) => {
                l.state = "sign-failed-reserved".into();
                false
            }
        };
        // No paid state and no automatic release on a failed or missing broadcast.
        self.tool_liabilities.insert(&nonce, &l);
        ok
    }
    pub fn tool_liability(&self, nonce: u64) -> Option<Liability> {
        self.tool_liabilities.get(&nonce)
    }
    pub fn strategy_manifest(&self, mutation: u8) -> String {
        Self::policy(mutation).into()
    }
    pub fn creature(&self, id: AccountId) -> Option<Creature> {
        self.creatures.get(&id)
    }
    pub fn birth_status(&self, child: AccountId) -> Option<Birth> {
        self.births.get(&child)
    }
    pub fn job(&self, job_id: String) -> Option<Job> {
        self.jobs.get(&job_id)
    }
    pub fn economy(&self) -> near_sdk::serde_json::Value {
        near_sdk::serde_json::json!({"turn":self.turn,"demand":self.demand,"market":self.market.to_string(),"pending":self.pending_munch.to_string(),"job_escrow":self.job_escrow.to_string(),"burned":self.burned.to_string(),"supply":self.token.total_supply.to_string()})
    }
}
impl Controller {
    fn mint_life(&mut self, actor: &AccountId, holder: AccountId) {
        let c = self.creatures.get(actor).unwrap();
        let token_id = actor.to_string();
        self.lives.internal_mint_with_refund(token_id.clone(), holder.clone(), Some(TokenMetadata { title:Some(format!("Feral life {actor}")), description:Some("Goal and sponsorship permission. No right to drain creature funds.".into()), extra:Some(near_sdk::serde_json::json!({"actor":actor,"parent":c.parent,"strategy_hash":c.strategy_hash}).to_string()), ..Default::default() }),None);
        near_contract_standards::non_fungible_token::events::NftMint {
            owner_id: &holder,
            token_ids: &[&token_id],
            memo: Some("funded life"),
        }
        .emit();
    }
    fn life_owner(&self, actor: &AccountId) {
        require!(
            !self.nft_in_flight.contains(&actor.to_string()),
            "life transfer pending"
        );
        require!(
            self.lives.owner_by_id.get(&actor.to_string()).as_ref()
                == Some(&env::predecessor_account_id()),
            "life owner only"
        );
    }
    fn policy(mutation: u8) -> &'static str {
        match mutation {
            0 => "job=bilingual;min_price=90;birth_floor=120",
            1 => "job=bilingual;min_price=80;birth_floor=140",
            2 => "job=translation;min_price=30;birth_floor=180",
            3 => "job=short;min_price=40;birth_floor=120",
            _ => env::panic_str("mutation bounds"),
        }
    }
    fn policy_hash(mutation: u8) -> String {
        env::sha256(Self::policy(mutation).as_bytes())
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect()
    }
    fn only_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "owner only");
    }
    fn active(&self, id: &AccountId) {
        require!(
            self.creatures.get(id).expect("unknown creature").active,
            "extinct"
        );
    }
    fn actor(&self, id: &AccountId) {
        self.active(id);
        require!(
            env::predecessor_account_id() == *id || env::predecessor_account_id() == self.owner,
            "actor authorization"
        );
    }
    fn hash(h: &str) {
        require!(
            h.len() == 64 && h.bytes().all(|b| b.is_ascii_hexdigit()),
            "32 byte hex hash"
        );
    }
    fn id(s: &str) {
        require!(!s.is_empty() && s.len() <= 96, "ID bounds");
    }
    fn balance(&self, id: &AccountId) -> u128 {
        self.token.accounts.get(id).unwrap_or(0)
    }
    fn ensure_token_account(&mut self, id: &AccountId) {
        if self.token.accounts.get(id).is_none() {
            self.token.internal_register_account(id);
        }
    }
    fn move_token(&mut self, from: &AccountId, to: &AccountId, amount: u128) {
        require!(self.balance(from) >= amount, "insufficient MUNCH");
        self.token.internal_transfer(from, to, amount, None);
    }
    fn live_job(&self, job: &Job) {
        require!(
            !job.paid && job.demand == self.demand && self.turn <= job.expiry_turn,
            "job not live"
        );
    }
    fn solvent_native(&self) {
        let obligations = self
            .creatures
            .values()
            .fold(0u128, |a, c| a.checked_add(c.native_reserve.0).unwrap());
        let storage = (env::storage_usage() as u128)
            .checked_mul(env::storage_byte_cost().as_yoctonear())
            .unwrap();
        require!(
            env::account_balance().as_yoctonear()
                >= obligations
                    .checked_add(storage)
                    .unwrap()
                    .checked_add(MIN_CHILD_NEAR)
                    .unwrap(),
            "controller native overhead"
        );
    }
    fn complete_birth(&mut self, child: AccountId, nonce: u64, success: bool) {
        let mut b = self.births.get(&child).expect("unknown birth");
        require!(
            b.state == "pending" && b.nonce == nonce,
            "birth already resolved or nonce"
        );
        let mut parent = self.creatures.get(&b.parent).unwrap();
        require!(parent.pending.as_ref() == Some(&child), "pending mismatch");
        // This cleanup deliberately does not call active(parent).
        if success {
            self.ensure_token_account(&child);
            self.move_token(&env::current_account_id(), &child, CHILD_MUNCH);
            self.creatures.insert(
                &child,
                &Creature {
                    active: true,
                    parent: Some(b.parent.clone()),
                    strategy_hash: b.strategy_hash.clone(),
                    mutation: b.mutation,
                    born_turn: self.turn,
                    nonce: 0,
                    pending: None,
                    native_reserve: U128(0),
                },
            );
            let nft_owner = self
                .lives
                .owner_by_id
                .get(&b.parent.to_string())
                .expect("parent life missing");
            self.mint_life(&child, nft_owner);
            b.state = "complete".into();
        } else {
            self.move_token(&env::current_account_id(), &b.parent, CHILD_MUNCH);
            parent.native_reserve.0 = parent.native_reserve.0.checked_add(b.native.0).unwrap();
            b.state = "failed".into();
        }
        parent.pending = None;
        self.creatures.insert(&b.parent, &parent);
        self.pending_munch -= CHILD_MUNCH;
        self.pending_births -= 1;
        self.births.insert(&child, &b);
    }
    fn ft_sender_guard(&self, sender: &AccountId) {
        require!(
            *sender != env::current_account_id(),
            "controller escrow locked"
        );
        if self.creatures.get(sender).is_some() {
            self.active(sender);
        }
    }
}
#[near]
impl FungibleTokenCore for Controller {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.ft_sender_guard(&env::predecessor_account_id());
        self.token.ft_transfer(receiver_id, amount, memo);
    }
    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.ft_sender_guard(&env::predecessor_account_id());
        self.token.ft_transfer_call(receiver_id, amount, memo, msg)
    }
    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }
    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}
#[near]
impl FungibleTokenResolver for Controller {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let before = self.token.total_supply;
        let result = self
            .token
            .ft_resolve_transfer(sender_id, receiver_id, amount);
        self.burned += before - self.token.total_supply;
        result
    }
}
#[near]
impl StorageManagement for Controller {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        self.token.storage_deposit(account_id, registration_only)
    }
    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        self.token.storage_withdraw(amount)
    }
    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        assert_one_yocto();
        let id = env::predecessor_account_id();
        require!(
            !self.creatures.get(&id).is_some() && id != env::current_account_id(),
            "game accounts cannot unregister"
        );
        let before = self.token.total_supply;
        let result = self.token.storage_unregister(force);
        self.burned += before - self.token.total_supply;
        result
    }
    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }
    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}
#[near]
impl FungibleTokenMetadataProvider for Controller {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        FungibleTokenMetadata {
            spec: FT_METADATA_SPEC.into(),
            name: "Feral MUNCH".into(),
            symbol: "MUNCH".into(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: 0,
        }
    }
}

#[cfg(test)]
mod tests;

#[near]
impl NonFungibleTokenCore for Controller {
    #[payable]
    fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        require!(
            !self.nft_in_flight.contains(&token_id),
            "life transfer pending"
        );
        self.lives
            .nft_transfer(receiver_id, token_id, approval_id, memo);
    }
    #[payable]
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool> {
        require!(
            !self.nft_in_flight.contains(&token_id),
            "life transfer pending"
        );
        let result =
            self.lives
                .nft_transfer_call(receiver_id, token_id.clone(), approval_id, memo, msg);
        self.nft_in_flight.insert(&token_id);
        result
    }
    fn nft_token(&self, token_id: TokenId) -> Option<Token> {
        self.lives.nft_token(token_id)
    }
}
#[near]
impl NonFungibleTokenResolver for Controller {
    #[private]
    fn nft_resolve_transfer(
        &mut self,
        previous_owner_id: AccountId,
        receiver_id: AccountId,
        token_id: TokenId,
        approved_account_ids: Option<HashMap<AccountId, u64>>,
    ) -> bool {
        let result = self.lives.nft_resolve_transfer(
            previous_owner_id,
            receiver_id,
            token_id.clone(),
            approved_account_ids,
        );
        self.nft_in_flight.remove(&token_id);
        result
    }
}
#[near]
impl NonFungibleTokenMetadataProvider for Controller {
    fn nft_metadata(&self) -> NFTContractMetadata {
        NFTContractMetadata {
            spec: NFT_METADATA_SPEC.into(),
            name: "Feral Lives".into(),
            symbol: "LIFE".into(),
            icon: None,
            base_uri: None,
            reference: None,
            reference_hash: None,
        }
    }
}
