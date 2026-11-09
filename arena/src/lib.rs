//! Feral v2: the playable arena. v1 (ctrl.feral-039832.testnet) stays frozen as
//! the recorded proof run. Every world changing method here is owner (keeper)
//! only or NFT holder only, and every number a visitor can move is bounded on
//! chain: the season budget, the job reward, the sponsorship size, the number
//! of lives and the one step mutation a child may inherit.
use near_contract_standards::fungible_token::{
    FungibleToken,
    core::FungibleTokenCore,
    events::{FtBurn, FtMint},
    metadata::{FT_METADATA_SPEC, FungibleTokenMetadata, FungibleTokenMetadataProvider},
    resolver::FungibleTokenResolver,
};
use near_contract_standards::non_fungible_token::{
    NonFungibleToken, Token, TokenId,
    core::NonFungibleTokenCore,
    metadata::{NFT_METADATA_SPEC, NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata},
};
use near_sdk::collections::{LookupMap, UnorderedMap};
use near_sdk::json_types::U128;
use near_sdk::serde_json::{Value, json};
use near_sdk::{AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseError, PromiseOrValue, env, near, require};

pub const UPKEEP: u128 = 10;
pub const SEED: u128 = 1000;
pub const CHILD_MUNCH: u128 = 60;
pub const PARENT_FLOOR: u128 = 20;
pub const ACCOUNT_NEAR: u128 = 2_000_000_000_000_000_000_000; // 0.002 NEAR per keyless life account
pub const MAX_LIVES: usize = 7;
pub const MAX_JOBS: usize = 48;
pub const MAX_BIDS: usize = 8;
pub const PRICES: [u128; 8] = [20, 30, 40, 50, 60, 70, 80, 90];
pub const FLOORS: [u128; 5] = [100, 120, 140, 160, 180];
pub const KINDS: [&str; 3] = ["short", "bilingual", "translation"];
pub const GOALS: [&str; 3] = ["work", "save", "breed"];
pub const CHANGES: [&str; 6] = ["price down", "price up", "breeding floor down", "breeding floor up", "next job kind", "previous job kind"];

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Debug)]
pub struct Genome {
    pub job: u8,
    pub price: u8,
    pub floor: u8,
}
impl Genome {
    pub fn check(&self) {
        require!((self.job as usize) < 3 && (self.price as usize) < 8 && (self.floor as usize) < 5, "genome bounds");
    }
    pub fn manifest(&self) -> String {
        format!("job={};min_price={};birth_floor={}", KINDS[self.job as usize], PRICES[self.price as usize], FLOORS[self.floor as usize])
    }
    pub fn hash(&self) -> String {
        hex(&env::sha256(self.manifest().as_bytes()))
    }
    pub fn min_price(&self) -> u128 {
        PRICES[self.price as usize]
    }
    pub fn birth_floor(&self) -> u128 {
        FLOORS[self.floor as usize]
    }
    /// Exactly one bounded change from the fixed safe set. The contract
    /// derives the child; the caller only names which change.
    pub fn mutate(&self, change: u8) -> Genome {
        let mut g = *self;
        match change {
            0 => { require!(g.price > 0, "price already at minimum"); g.price -= 1 }
            1 => { require!(g.price < 7, "price already at maximum"); g.price += 1 }
            2 => { require!(g.floor > 0, "floor already at minimum"); g.floor -= 1 }
            3 => { require!(g.floor < 4, "floor already at maximum"); g.floor += 1 }
            4 => g.job = (g.job + 1) % 3,
            5 => g.job = (g.job + 2) % 3,
            _ => env::panic_str("unknown change"),
        }
        g
    }
    /// Which job kinds this policy may bid on. Bilingual workers can also take
    /// short captions; translators only sell translation as a service.
    pub fn can_take(&self, kind: u8) -> bool {
        match self.job {
            0 => kind == 0,
            1 => kind == 0 || kind == 1,
            _ => false,
        }
    }
}
pub fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Life {
    pub name: String,
    pub season: u32,
    pub lineage: AccountId,
    pub parent: Option<AccountId>,
    pub genome: Genome,
    pub strategy_hash: String,
    pub active: bool,
    pub born_turn: u64,
    pub died_turn: Option<u64>,
    pub nonce: u64,
    pub pending: Option<AccountId>,
    pub goal: u8,
    pub fed: U128,
    pub sponsored: U128,
    pub earned: U128,
    pub burned: U128,
    pub mutation: Option<u8>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Bid {
    pub actor: AccountId,
    pub price: U128,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Job {
    pub id: String,
    pub season: u32,
    pub kind: u8,
    pub reward: U128,
    pub from_budget: bool,
    pub demand_version: u64,
    pub posted_turn: u64,
    pub expiry_turn: u64,
    pub bids: Vec<Bid>,
    pub claimant: Option<AccountId>,
    pub price: Option<U128>,
    pub provider: Option<AccountId>,
    pub service_price: Option<U128>,
    pub translation_hash: Option<String>,
    pub output_hash: Option<String>,
    pub state: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Season {
    pub id: u32,
    pub status: String,
    pub pilot: String,
    pub turn: u64,
    pub target_turns: u64,
    pub budget: U128,
    pub budget_left: U128,
    pub demand: u8,
    pub demand_version: u64,
    pub market: U128,
    pub escrow: U128,
    pub pending: U128,
    pub burned: U128,
    pub lives: Vec<AccountId>,
    pub jobs: Vec<String>,
    pub births: u32,
    pub started_block: u64,
    pub ended_turn: Option<u64>,
    pub closed: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct ToolLiability {
    pub job: String,
    pub actor: AccountId,
    pub digest: String,
    pub state: String,
    pub sepolia_tx: Option<String>,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Arena {
    owner: AccountId,
    token: FungibleToken,
    lives_nft: NonFungibleToken,
    lives: UnorderedMap<AccountId, Life>,
    jobs: LookupMap<String, Job>,
    seasons: LookupMap<u32, Season>,
    current: u32,
    minted: u128,
    burned_total: u128,
    tools: LookupMap<u64, ToolLiability>,
    next_tool: u64,
}

const FOUNDERS: [(&str, Genome, u128); 3] = [
    ("moss", Genome { job: 1, price: 4, floor: 1 }, 70),
    ("echo", Genome { job: 2, price: 1, floor: 4 }, 50),
    ("ash", Genome { job: 0, price: 2, floor: 1 }, 30),
];

#[near]
impl Arena {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        let mut token = FungibleToken::new(b"t".to_vec());
        token.internal_register_account(&env::current_account_id());
        Self {
            lives_nft: NonFungibleToken::new(b"n".to_vec(), owner.clone(), Some(b"nm".to_vec()), None::<Vec<u8>>, None::<Vec<u8>>),
            owner,
            token,
            lives: UnorderedMap::new(b"l".to_vec()),
            jobs: LookupMap::new(b"j".to_vec()),
            seasons: LookupMap::new(b"s".to_vec()),
            current: 0,
            minted: 0,
            burned_total: 0,
            tools: LookupMap::new(b"tl".to_vec()),
            next_tool: 0,
        }
    }

    // ---------- seasons ----------
    /// Mints a fresh finite seed of 1000 MUNCH and creates three real keyless
    /// founder accounts. `pilot` is the hash of the visitor holding the helm.
    pub fn start_season(&mut self, pilot: String, target_turns: u64, budget: U128) -> Promise {
        self.only_owner();
        hash64(&pilot);
        require!((4..=12).contains(&target_turns) && budget.0 >= 40 && budget.0 <= 200, "season bounds");
        if self.current > 0 {
            require!(self.season_ref().closed, "close the current season first");
        }
        require!(self.token.ft_balance_of(env::current_account_id()).0 == 0, "unclaimed MUNCH");
        let id = self.current + 1;
        self.current = id;
        self.token.internal_deposit(&env::current_account_id(), SEED);
        self.minted += SEED;
        FtMint { owner_id: &env::current_account_id(), amount: U128(SEED), memo: Some("season seed") }.emit();
        let allocated: u128 = FOUNDERS.iter().map(|f| f.2).sum();
        let market = SEED - allocated - budget.0;
        self.seasons.insert(&id, &Season {
            id, status: "starting".into(), pilot, turn: 0, target_turns, budget, budget_left: budget, demand: 0, demand_version: 1,
            market: U128(market), escrow: U128(0), pending: U128(allocated), burned: U128(0), lives: vec![], jobs: vec![],
            births: 0, started_block: env::block_height(), ended_turn: None, closed: false,
        });
        self.solvent(3 * ACCOUNT_NEAR);
        let mut p: Option<Promise> = None;
        for (name, _, _) in FOUNDERS.iter() {
            let acct = self.life_id(id, name, 0);
            let one = Promise::new(acct).create_account().transfer(NearToken::from_yoctonear(ACCOUNT_NEAR));
            p = Some(match p { None => one, Some(x) => x.and(one) });
        }
        p.unwrap().then(
            Promise::new(env::current_account_id()).function_call(
                "on_founders", json!({ "season": id }).to_string().into_bytes(), NearToken::from_yoctonear(0), Gas::from_tgas(60)),
        )
    }
    #[private]
    pub fn on_founders(&mut self, season: u32) -> bool {
        require!(env::promise_results_count() == 3, "three results");
        let mut s = self.seasons.get(&season).expect("season");
        require!(s.status == "starting", "founders resolved");
        let mut all = true;
        for (i, (name, genome, amount)) in FOUNDERS.iter().enumerate() {
            let ok = matches!(env::promise_result_checked(i as u64, 64), Ok(_));
            let acct = self.life_id(season, name, 0);
            s.pending.0 -= amount;
            if ok {
                self.add_life(&mut s, &acct, name, acct.clone(), None, *genome, None);
                self.token.internal_register_account(&acct);
                self.move_token(&env::current_account_id(), &acct, *amount);
            } else {
                all = false;
                s.market.0 += amount;
            }
        }
        s.status = if all { "live".into() } else { "failed".into() };
        self.seasons.insert(&season, &s);
        all
    }
    /// Ends the season: every remaining MUNCH of the season is burned so the
    /// next seed starts from zero. Outcome (won, lost) is kept.
    pub fn close_season(&mut self, reason: String) {
        self.only_owner();
        require!(reason.len() <= 40, "reason bounds");
        let mut s = self.season_ref();
        require!(!s.closed, "already closed");
        require!(s.status != "starting" && s.pending.0 == 0, "birth or founders pending");
        if s.status == "live" { s.status = format!("abandoned:{reason}"); s.ended_turn = Some(s.turn); }
        let mut total = 0u128;
        for id in s.lives.clone() {
            let b = self.balance(&id);
            if b > 0 { self.token.internal_withdraw(&id, b); total += b; }
            self.token.accounts.remove(&id);
            self.lives.remove(&id);
            self.burn_life_nft(&id);
        }
        let own = self.balance(&env::current_account_id());
        if own > 0 { self.token.internal_withdraw(&env::current_account_id(), own); total += own; }
        for j in s.jobs.iter() { self.jobs.remove(j); }
        self.burned_total += total;
        if total > 0 { FtBurn { owner_id: &env::current_account_id(), amount: U128(total), memo: Some("season close") }.emit(); }
        s.market = U128(0); s.escrow = U128(0); s.budget_left = U128(0);
        s.closed = true;
        self.seasons.insert(&s.id, &s);
    }

    // ---------- visitor levers (keeper relays, contract bounds) ----------
    pub fn set_demand(&mut self, kind: u8) {
        self.only_owner();
        let mut s = self.live_season();
        require!(kind < 2 && kind != s.demand, "demand change bounds");
        s.demand = kind;
        s.demand_version += 1;
        env::log_str(&format!("demand {} v{}", KINDS[kind as usize], s.demand_version));
        self.seasons.insert(&s.id, &s);
    }
    /// A job paid by the market (keeper's turn job) or by the visitor budget.
    pub fn post_job(&mut self, job_id: String, reward: U128, from_budget: bool, expiry_turns: u64) {
        self.only_owner();
        let mut s = self.live_season();
        require!(!job_id.is_empty() && job_id.len() <= 40 && self.jobs.get(&job_id).is_none(), "job id");
        require!((30..=100).contains(&reward.0) && (1..=3).contains(&expiry_turns), "job bounds");
        require!(s.jobs.len() < MAX_JOBS, "job capacity");
        if from_budget { require!(s.budget_left.0 >= reward.0, "visitor budget exhausted"); s.budget_left.0 -= reward.0; }
        else { require!(s.market.0 >= reward.0, "market exhausted"); s.market.0 -= reward.0; }
        s.escrow.0 += reward.0;
        s.jobs.push(job_id.clone());
        self.jobs.insert(&job_id, &Job {
            id: job_id.clone(), season: s.id, kind: s.demand, reward, from_budget, demand_version: s.demand_version, posted_turn: s.turn,
            expiry_turn: s.turn + expiry_turns, bids: vec![], claimant: None, price: None, provider: None, service_price: None,
            translation_hash: None, output_hash: None, state: "open".into(),
        });
        self.seasons.insert(&s.id, &s);
    }
    /// Feeding and sponsorship both require holding the creature's life NFT.
    pub fn feed(&mut self, actor: AccountId) {
        self.life_holder(&actor);
        self.spend_budget(&actor, UPKEEP, true);
    }
    pub fn sponsor(&mut self, actor: AccountId, amount: U128) {
        self.life_holder(&actor);
        require!((20..=60).contains(&amount.0), "sponsorship bounds");
        self.spend_budget(&actor, amount.0, false);
    }
    pub fn set_goal(&mut self, actor: AccountId, goal: u8) {
        self.life_holder(&actor);
        require!(goal < 3, "goal bounds");
        let mut l = self.alive(&actor);
        l.goal = goal;
        self.lives.insert(&actor, &l);
    }

    // ---------- creature actions (keeper submits model decisions) ----------
    pub fn bid(&mut self, actor: AccountId, job_id: String, price: U128) {
        self.only_owner();
        let l = self.alive(&actor);
        let mut job = self.live_job(&job_id);
        require!(job.state == "open", "job not open");
        require!(l.genome.can_take(job.kind), "policy does not take this job");
        require!(price.0 >= l.genome.min_price() && price.0 <= job.reward.0, "bid bounds");
        require!(job.bids.len() < MAX_BIDS && !job.bids.iter().any(|b| b.actor == actor), "bid exists");
        job.bids.push(Bid { actor, price });
        self.jobs.insert(&job_id, &job);
    }
    /// The contract picks the winner: lowest live bid, earliest on ties.
    pub fn award(&mut self, job_id: String) -> AccountId {
        self.only_owner();
        let mut job = self.live_job(&job_id);
        require!(job.state == "open", "job not open");
        let best = job.bids.iter().filter(|b| self.lives.get(&b.actor).map(|l| l.active).unwrap_or(false))
            .min_by_key(|b| b.price.0).cloned().expect("no live bids");
        job.claimant = Some(best.actor.clone());
        job.price = Some(best.price);
        job.state = "awarded".into();
        self.jobs.insert(&job_id, &job);
        best.actor
    }
    /// The claimant buys a translation from a translator at the translator's
    /// own policy price. Paid on delivery of the hashed translation.
    pub fn buy_translation(&mut self, job_id: String, provider: AccountId, translation_hash: String) {
        self.only_owner();
        hash64(&translation_hash);
        let mut job = self.live_job(&job_id);
        require!(job.state == "awarded" && job.kind == 1 && job.provider.is_none(), "translation not needed");
        let claimant = job.claimant.clone().unwrap();
        self.alive(&claimant);
        let p = self.alive(&provider);
        require!(provider != claimant && p.genome.job == 2, "provider must be a living translator");
        let price = p.genome.min_price();
        self.move_token(&claimant, &provider, price);
        let mut pl = p; pl.earned.0 += price; self.lives.insert(&provider, &pl);
        job.provider = Some(provider);
        job.service_price = Some(U128(price));
        job.translation_hash = Some(translation_hash);
        self.jobs.insert(&job_id, &job);
    }
    pub fn settle(&mut self, job_id: String, output_hash: String) {
        self.only_owner();
        hash64(&output_hash);
        let mut job = self.live_job(&job_id);
        require!(job.state == "awarded", "job not awarded");
        if job.kind == 1 { require!(job.provider.is_some(), "bilingual card needs a paid translation"); }
        let actor = job.claimant.clone().unwrap();
        let mut l = self.alive(&actor);
        let price = job.price.unwrap().0;
        let mut s = self.season_ref();
        self.move_token(&env::current_account_id(), &actor, price);
        s.escrow.0 -= job.reward.0;
        let rest = job.reward.0 - price;
        if job.from_budget { s.budget_left.0 += rest } else { s.market.0 += rest }
        l.earned.0 += price;
        self.lives.insert(&actor, &l);
        job.output_hash = Some(output_hash);
        job.state = "paid".into();
        self.jobs.insert(&job_id, &job);
        self.seasons.insert(&s.id, &s);
    }
    /// Unpaid jobs whose demand changed or that expired go back to their payer.
    pub fn cancel_job(&mut self, job_id: String) {
        self.only_owner();
        let mut job = self.jobs.get(&job_id).expect("unknown job");
        let mut s = self.season_ref();
        require!(job.season == s.id && (job.state == "open" || job.state == "awarded"), "job closed");
        let claimant_dead = job.claimant.as_ref().map(|c| !self.lives.get(c).unwrap().active).unwrap_or(false);
        require!(job.demand_version != s.demand_version || s.turn > job.expiry_turn || claimant_dead || s.status != "live", "still live");
        s.escrow.0 -= job.reward.0;
        if job.from_budget { s.budget_left.0 += job.reward.0 } else { s.market.0 += job.reward.0 }
        job.state = "cancelled".into();
        self.jobs.insert(&job_id, &job);
        self.seasons.insert(&s.id, &s);
    }
    /// Funded reproduction. The child inherits the parent's policy with exactly
    /// one change from CHANGES, derived here, and gets a real keyless account.
    pub fn birth(&mut self, parent: AccountId, change: u8) -> Promise {
        self.only_owner();
        let mut s = self.live_season();
        let mut p = self.alive(&parent);
        require!(p.goal != 1, "goal forbids birth");
        require!(p.pending.is_none(), "birth pending");
        require!(s.lives.len() < MAX_LIVES, "terrarium full");
        let need = p.genome.birth_floor().max(CHILD_MUNCH + PARENT_FLOOR);
        require!(self.balance(&parent) >= need, "birth reserves");
        p.genome.mutate(change); // bounds checked now, derived again in on_birth
        let nonce = p.nonce + 1;
        let child = self.life_id(s.id, &self.root_name(&p), s.births + 1);
        require!(self.lives.get(&child).is_none(), "child ID used");
        self.solvent(ACCOUNT_NEAR);
        self.move_token(&parent, &env::current_account_id(), CHILD_MUNCH);
        s.pending.0 += CHILD_MUNCH;
        s.births += 1;
        p.nonce = nonce;
        p.pending = Some(child.clone());
        self.lives.insert(&parent, &p);
        self.seasons.insert(&s.id, &s);
        Promise::new(child.clone()).create_account().transfer(NearToken::from_yoctonear(ACCOUNT_NEAR)).then(
            Promise::new(env::current_account_id()).function_call(
                "on_birth", json!({"parent": parent, "child": child, "nonce": nonce, "change": change}).to_string().into_bytes(),
                NearToken::from_yoctonear(0), Gas::from_tgas(30)),
        )
    }
    #[private]
    pub fn on_birth(&mut self, parent: AccountId, child: AccountId, nonce: u64, change: u8) -> bool {
        require!(env::promise_results_count() == 1, "one result");
        let ok = match env::promise_result_checked(0, 64) { Ok(_) => true, Err(PromiseError::Failed) => false, Err(_) => env::panic_str("ambiguous") };
        let mut p = self.lives.get(&parent).expect("parent");
        require!(p.pending.as_ref() == Some(&child) && p.nonce == nonce, "birth already resolved");
        let mut s = self.seasons.get(&p.season).expect("season");
        s.pending.0 -= CHILD_MUNCH;
        p.pending = None;
        self.lives.insert(&parent, &p);
        if ok {
            let genome = p.genome.mutate(change);
            let name = format!("{}-{}", self.root_name(&p), s.births);
            self.add_life(&mut s, &child, &name, p.lineage.clone(), Some(parent.clone()), genome, Some(change));
            self.token.internal_register_account(&child);
            self.move_token(&env::current_account_id(), &child, CHILD_MUNCH);
        } else {
            self.move_token(&env::current_account_id(), &parent, CHILD_MUNCH);
        }
        self.seasons.insert(&s.id, &s);
        ok
    }
    /// One turn: every living creature burns its upkeep or goes extinct, then
    /// the win condition is checked from chain state.
    pub fn tick(&mut self) -> Value {
        self.only_owner();
        let mut s = self.live_season();
        require!(s.pending.0 == 0, "birth pending");
        s.turn += 1;
        let mut burned = 0u128;
        let mut died = vec![];
        for id in s.lives.clone() {
            let mut l = self.lives.get(&id).unwrap();
            if !l.active { continue; }
            if self.balance(&id) < UPKEEP {
                l.active = false;
                l.died_turn = Some(s.turn);
                env::log_str(&format!("extinction {id} turn {}", s.turn));
                died.push(id.clone());
            } else {
                self.token.internal_withdraw(&id, UPKEEP);
                FtBurn { owner_id: &id, amount: U128(UPKEEP), memo: Some("upkeep") }.emit();
                l.burned.0 += UPKEEP;
                burned += UPKEEP;
            }
            self.lives.insert(&id, &l);
        }
        s.burned.0 += burned;
        self.burned_total += burned;
        let lineages = self.lineages_alive(&s);
        if lineages < 2 { s.status = "lost".into(); s.ended_turn = Some(s.turn); }
        else if s.turn >= s.target_turns { s.status = "won".into(); s.ended_turn = Some(s.turn); }
        self.seasons.insert(&s.id, &s);
        json!({"turn": s.turn, "burned": burned.to_string(), "died": died, "lineages_alive": lineages, "status": s.status})
    }

    // ---------- Sepolia tool liability (states only; payment needs approval) ----------
    pub fn reserve_tool(&mut self, job_id: String, digest: String) -> u64 {
        self.only_owner();
        hash64(&digest);
        let job = self.jobs.get(&job_id).expect("unknown job");
        require!(job.state == "paid", "accepted work required");
        let n = self.next_tool;
        self.next_tool += 1;
        self.tools.insert(&n, &ToolLiability { job: job_id, actor: job.claimant.unwrap(), digest, state: "reserved".into(), sepolia_tx: None });
        n
    }
    /// Trusted observer step: only after the Sepolia ToolPaid receipt is seen.
    pub fn reconcile_tool_paid(&mut self, nonce: u64, sepolia_tx: String) {
        self.only_owner();
        require!(sepolia_tx.len() == 66 && sepolia_tx.starts_with("0x") && sepolia_tx[2..].bytes().all(|b| b.is_ascii_hexdigit()), "tx hash");
        let mut t = self.tools.get(&nonce).expect("unknown liability");
        require!(t.state == "reserved" || t.state == "signature-returned", "already reconciled");
        t.state = "paid-reconciled".into();
        t.sepolia_tx = Some(sepolia_tx);
        self.tools.insert(&nonce, &t);
    }
    pub fn tool_liability(&self, nonce: u64) -> Option<ToolLiability> { self.tools.get(&nonce) }

    // ---------- views ----------
    pub fn season(&self, id: Option<u32>) -> Option<Season> { self.seasons.get(&id.unwrap_or(self.current)) }
    pub fn lives_of(&self, season: Option<u32>) -> Vec<Value> {
        let Some(s) = self.seasons.get(&season.unwrap_or(self.current)) else { return vec![] };
        s.lives.iter().map(|id| {
            let l = self.lives.get(id).unwrap();
            json!({"id": id, "balance": self.balance(id).to_string(), "life": l, "policy": l.genome.manifest(),
                   "holder": self.lives_nft.owner_by_id.get(&id.to_string())})
        }).collect()
    }
    pub fn jobs_of(&self, season: Option<u32>) -> Vec<Job> {
        let Some(s) = self.seasons.get(&season.unwrap_or(self.current)) else { return vec![] };
        s.jobs.iter().filter_map(|j| self.jobs.get(j)).collect()
    }
    pub fn economy(&self) -> Value {
        json!({"season": self.current, "minted": self.minted.to_string(), "burned_total": self.burned_total.to_string(),
               "supply": self.token.total_supply.to_string(), "contract_munch": self.balance(&env::current_account_id()).to_string(),
               "owner": self.owner, "upkeep": UPKEEP.to_string(), "child_munch": CHILD_MUNCH.to_string(),
               "changes": CHANGES, "kinds": KINDS, "goals": GOALS})
    }
    pub fn preview_child(&self, parent: AccountId, change: u8) -> Value {
        let g = self.lives.get(&parent).expect("unknown").genome.mutate(change);
        json!({"genome": g, "policy": g.manifest(), "strategy_hash": g.hash()})
    }
}

impl Arena {
    fn only_owner(&self) { require!(env::predecessor_account_id() == self.owner, "owner only"); }
    fn season_ref(&self) -> Season { self.seasons.get(&self.current).expect("no season") }
    fn live_season(&self) -> Season { let s = self.season_ref(); require!(s.status == "live", "season not live"); s }
    fn life_id(&self, season: u32, name: &str, n: u32) -> AccountId {
        let label = if n == 0 { format!("s{season}-{name}") } else { format!("s{season}-{name}-k{n}") };
        format!("{label}.{}", env::current_account_id()).parse().unwrap()
    }
    fn root_name(&self, l: &Life) -> String { l.lineage.as_str().split('.').next().unwrap().splitn(2, '-').nth(1).unwrap().to_string() }
    fn alive(&self, id: &AccountId) -> Life {
        let l = self.lives.get(id).expect("unknown creature");
        require!(l.active, "extinct");
        require!(l.season == self.current, "not this season");
        l
    }
    fn live_job(&self, id: &str) -> Job {
        let s = self.live_season();
        let j = self.jobs.get(&id.to_string()).expect("unknown job");
        require!(j.season == s.id && j.demand_version == s.demand_version && s.turn <= j.expiry_turn, "job not live");
        j
    }
    fn life_holder(&self, actor: &AccountId) {
        require!(self.lives_nft.owner_by_id.get(&actor.to_string()).as_ref() == Some(&env::predecessor_account_id()), "life NFT holder only");
    }
    fn spend_budget(&mut self, actor: &AccountId, amount: u128, feed: bool) {
        let mut s = self.live_season();
        let mut l = self.alive(actor);
        require!(s.budget_left.0 >= amount, "visitor budget exhausted");
        s.budget_left.0 -= amount;
        self.move_token(&env::current_account_id(), actor, amount);
        if feed { l.fed.0 += amount } else { l.sponsored.0 += amount }
        self.lives.insert(actor, &l);
        self.seasons.insert(&s.id, &s);
    }
    fn add_life(&mut self, s: &mut Season, id: &AccountId, name: &str, lineage: AccountId, parent: Option<AccountId>, genome: Genome, mutation: Option<u8>) {
        genome.check();
        self.lives.insert(id, &Life { name: name.into(), season: s.id, lineage, parent: parent.clone(), genome, strategy_hash: genome.hash(), active: true,
            born_turn: s.turn, died_turn: None, nonce: 0, pending: None, goal: 0, fed: U128(0), sponsored: U128(0), earned: U128(0), burned: U128(0), mutation });
        s.lives.push(id.clone());
        let holder = parent.and_then(|p| self.lives_nft.owner_by_id.get(&p.to_string())).unwrap_or(self.owner.clone());
        let tid: TokenId = id.to_string();
        self.lives_nft.internal_mint_with_refund(tid.clone(), holder.clone(), Some(TokenMetadata {
            title: Some(format!("Feral life {name}")), description: Some("Holder may feed, sponsor and set a goal. Cannot withdraw the creature's MUNCH.".into()),
            extra: Some(json!({"season": s.id, "policy": genome.manifest(), "strategy_hash": genome.hash()}).to_string()), ..Default::default() }), None);
        near_contract_standards::non_fungible_token::events::NftMint { owner_id: &holder, token_ids: &[&tid], memo: Some("funded life") }.emit();
    }
    /// Season close burns the season's life NFTs so storage is reclaimed.
    fn burn_life_nft(&mut self, id: &AccountId) {
        let tid: TokenId = id.to_string();
        let Some(holder) = self.lives_nft.owner_by_id.remove(&tid) else { return };
        if let Some(m) = self.lives_nft.token_metadata_by_id.as_mut() { m.remove(&tid); }
        if let Some(per) = self.lives_nft.tokens_per_owner.as_mut() {
            if let Some(mut set) = per.get(&holder) {
                set.remove(&tid);
                if set.is_empty() { per.remove(&holder); } else { per.insert(&holder, &set); }
            }
        }
        near_contract_standards::non_fungible_token::events::NftBurn { owner_id: &holder, token_ids: &[&tid], authorized_id: None, memo: Some("season close") }.emit();
    }
    fn lineages_alive(&self, s: &Season) -> u32 {
        let mut seen: Vec<AccountId> = vec![];
        for id in s.lives.iter() { let l = self.lives.get(id).unwrap(); if l.active && !seen.contains(&l.lineage) { seen.push(l.lineage) } }
        seen.len() as u32
    }
    fn balance(&self, id: &AccountId) -> u128 { self.token.accounts.get(id).unwrap_or(0) }
    fn move_token(&mut self, from: &AccountId, to: &AccountId, amount: u128) {
        require!(self.balance(from) >= amount, "insufficient MUNCH");
        self.token.internal_transfer(from, to, amount, None);
    }
    fn solvent(&self, extra: u128) {
        let storage = env::storage_usage() as u128 * env::storage_byte_cost().as_yoctonear();
        require!(env::account_balance().as_yoctonear() >= storage + extra + 50 * ACCOUNT_NEAR, "arena native budget");
    }
}
fn hash64(h: &str) { require!(h.len() == 64 && h.bytes().all(|b| b.is_ascii_hexdigit()), "32 byte hex hash"); }

// Standard token surfaces. Creature accounts are keyless, and the arena's own
// escrow cannot be moved through ft_transfer.
#[near]
impl FungibleTokenCore for Arena {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        require!(env::predecessor_account_id() != env::current_account_id(), "escrow locked");
        require!(self.lives.get(&env::predecessor_account_id()).is_none(), "creature MUNCH moves only through the game");
        self.token.ft_transfer(receiver_id, amount, memo)
    }
    #[payable]
    fn ft_transfer_call(&mut self, _receiver_id: AccountId, _amount: U128, _memo: Option<String>, _msg: String) -> PromiseOrValue<U128> {
        env::panic_str("ft_transfer_call disabled in the arena")
    }
    fn ft_total_supply(&self) -> U128 { self.token.ft_total_supply() }
    fn ft_balance_of(&self, account_id: AccountId) -> U128 { self.token.ft_balance_of(account_id) }
}
#[near]
impl FungibleTokenResolver for Arena {
    #[private]
    fn ft_resolve_transfer(&mut self, sender_id: AccountId, receiver_id: AccountId, amount: U128) -> U128 {
        self.token.ft_resolve_transfer(sender_id, receiver_id, amount)
    }
}
#[near]
impl FungibleTokenMetadataProvider for Arena {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        FungibleTokenMetadata { spec: FT_METADATA_SPEC.into(), name: "Feral MUNCH (arena)".into(), symbol: "MUNCH".into(), icon: None, reference: None, reference_hash: None, decimals: 0 }
    }
}
#[near]
impl NonFungibleTokenCore for Arena {
    #[payable]
    fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>, memo: Option<String>) {
        self.lives_nft.nft_transfer(receiver_id, token_id, approval_id, memo)
    }
    #[payable]
    fn nft_transfer_call(&mut self, _r: AccountId, _t: TokenId, _a: Option<u64>, _m: Option<String>, _msg: String) -> PromiseOrValue<bool> {
        env::panic_str("nft_transfer_call disabled in the arena")
    }
    fn nft_token(&self, token_id: TokenId) -> Option<Token> { self.lives_nft.nft_token(token_id) }
}
#[near]
impl NonFungibleTokenMetadataProvider for Arena {
    fn nft_metadata(&self) -> NFTContractMetadata {
        NFTContractMetadata { spec: NFT_METADATA_SPEC.into(), name: "Feral Lives (arena)".into(), symbol: "LIFE".into(), icon: None, base_uri: None, reference: None, reference_hash: None }
    }
}

#[cfg(test)]
mod tests;
