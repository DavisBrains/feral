use anyhow::{Result, bail};
use near_workspaces::{Account, AccountId, Contract, Worker, network::Sandbox, types::NearToken};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    io::Write,
    path::PathBuf,
    process::{Command, Stdio},
};
fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .to_path_buf()
}
fn sha(x: &[u8]) -> String {
    format!("{:x}", Sha256::digest(x))
}
fn policy(n: u8) -> String {
    sha(match n {
        0 => b"job=bilingual;min_price=90;birth_floor=120",
        1 => b"job=bilingual;min_price=80;birth_floor=140",
        2 => b"job=translation;min_price=30;birth_floor=180",
        3 => b"job=short;min_price=40;birth_floor=120",
        _ => panic!(),
    })
}
struct Session {
    w: Worker<Sandbox>,
    c: Contract,
    o: Account,
    actors: Vec<AccountId>,
    events: Vec<Value>,
}
impl Session {
    async fn balance(&self, id: &AccountId) -> Result<u128> {
        let s: String = self
            .c
            .view("ft_balance_of")
            .args_json(json!({"account_id":id}))
            .await?
            .json()?;
        Ok(s.parse()?)
    }
    async fn emit(&mut self, kind: &str, data: Value, receipt: Option<String>) -> Result<()> {
        let economy: Value = self.c.view("economy").await?.json()?;
        let mut creatures = vec![];
        let mut sum = self.balance(self.c.id()).await?;
        for id in &self.actors {
            let c: Value = self
                .c
                .view("creature")
                .args_json(json!({"id":id}))
                .await?
                .json()?;
            if c.is_null() {
                continue;
            }
            let balance = self.balance(id).await?;
            sum += balance;
            let life: Value = self
                .c
                .view("nft_token")
                .args_json(json!({"token_id":id}))
                .await?
                .json()?;
            let native = self
                .w
                .view_account(id)
                .await?
                .balance
                .as_yoctonear()
                .to_string();
            creatures.push(json!({"id":id,"balance":balance,"native_total":native,"life_owner":life["owner_id"],"creature":c}));
        }
        let supply = economy["supply"].as_str().unwrap().parse::<u128>()?;
        let burned = economy["burned"].as_str().unwrap().parse::<u128>()?;
        assert_eq!(sum, supply);
        assert_eq!(sum + burned, 1000);
        self.events.push(json!({"seq":self.events.len(),"kind":kind,"data":data,"receipt":receipt,"state":{"economy":economy,"creatures":creatures}}));
        let run = json!({"network":"local NEAR sandbox","controller":self.c.id(),"opening":"The era of programmable money starts here.","controlled_participants":true,"events":self.events});
        std::fs::write(
            root().join("evidence/terrarium-run.json"),
            serde_json::to_string_pretty(&run)?,
        )?;
        Ok(())
    }
    async fn tx(
        &mut self,
        kind: &str,
        method: &str,
        args: Value,
        deposit: NearToken,
    ) -> Result<()> {
        let r = self
            .o
            .call(self.c.id(), method)
            .args_json(args.clone())
            .deposit(deposit)
            .max_gas()
            .transact()
            .await?;
        let hash = r.outcomes()[0].transaction_hash.to_string();
        r.into_result()?;
        self.emit(kind, json!({"method":method,"args":args}), Some(hash))
            .await
    }
    async fn decide(
        &mut self,
        id: &AccountId,
        jobs: Value,
        has_translation: bool,
        can_reproduce: bool,
    ) -> Result<Value> {
        let c: Value = self
            .c
            .view("creature")
            .args_json(json!({"id":id}))
            .await?
            .json()?;
        let balance = self.balance(id).await?;
        let obs = json!({"actor":id,"policy":c["mutation"],"active":c["active"],"balance":balance,"jobs":jobs,"has_translation":has_translation,"needs_translation":true,"provider_active":true,"can_reproduce":can_reproduce});
        let mut child = Command::new("node")
            .arg(root().join("agents/brain.mjs"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()?;
        child
            .stdin
            .take()
            .unwrap()
            .write_all(serde_json::to_string(&obs)?.as_bytes())?;
        let output = child.wait_with_output()?;
        if !output.status.success() {
            bail!("brain process failed")
        }
        let d: Value = serde_json::from_slice(&output.stdout)?;
        self.emit(
            "decision",
            json!({"actor":id,"observation":obs,"result":d}),
            None,
        )
        .await?;
        if std::env::var("FERAL_REQUIRE_MODEL").ok().as_deref() == Some("1")
            && d["mode"] != "local-model"
        {
            bail!("live model required, fallback occurred: {d}")
        };
        Ok(d["decision"].clone())
    }
}
#[tokio::main]
async fn main() -> Result<()> {
    let w = near_workspaces::sandbox().await?;
    let c = w
        .dev_deploy(&std::fs::read(
            root().join("target/near/feral_controller/feral_controller.wasm"),
        )?)
        .await?;
    let o = w.dev_create_account().await?;
    let a = w.dev_create_account().await?;
    let b = w.dev_create_account().await?;
    let ash = w.dev_create_account().await?;
    let kid: AccountId = format!("pip.{}", c.id()).parse()?;
    o.call(c.id(), "new")
        .args_json(json!({"owner":o.id()}))
        .max_gas()
        .transact()
        .await?
        .into_result()?;
    let mut s = Session {
        w,
        c,
        o,
        actors: vec![
            a.id().clone(),
            b.id().clone(),
            ash.id().clone(),
            kid.clone(),
        ],
        events: vec![],
    };
    let zero = NearToken::from_yoctonear(0);
    for (id, amount, p) in [(a.id(), 250, 0), (b.id(), 145, 2), (ash.id(), 5, 3)] {
        s.o.call(s.c.id(), "register")
            .args_json(json!({"id":id,"amount":amount.to_string(),"strategy_hash":policy(p)}))
            .deposit(NearToken::from_millinear(200))
            .max_gas()
            .transact()
            .await?
            .into_result()?;
    }
    s.emit("seeded",json!({"labels":{a.id().as_str():"Moss",b.id().as_str():"Echo",ash.id().as_str():"Ash",kid.as_str():"Pip"}}),None).await?;
    s.tx("old-demand","create_job",json!({"job_id":"short-v0","amount":"40","expiry_turn":3,"requirements_hash":sha(b"short transcript")}),zero).await?;
    let old = s
        .decide(ash.id(), json!([{"kind":"short","reward":40}]), true, false)
        .await?;
    if old["action"] != "bid" {
        bail!("old demand agent chose {old}")
    }
    s.tx("old-bid","bid_job",json!({"actor":ash.id(),"job_id":"short-v0","price":old["price"].as_u64().unwrap().to_string()}),zero).await?;
    s.tx("demand-shock", "set_demand", json!({"version":1}), zero)
        .await?;
    s.tx(
        "old-work-cancelled",
        "cancel_job",
        json!({"job_id":"short-v0"}),
        zero,
    )
    .await?;
    s.tx("extinction", "tick", json!({"next_turn":1}), zero)
        .await?;
    let dead = s
        .decide(
            ash.id(),
            json!([{"kind":"bilingual","reward":90}]),
            false,
            false,
        )
        .await?;
    assert_eq!(dead["action"], "wait");
    let attack=ash.call(s.c.id(),"pay_creature").args_json(json!({"actor":ash.id(),"provider":a.id(),"amount":"1","service_id":"after-death","output_hash":"a".repeat(64)})).max_gas().transact().await?;
    assert!(attack.is_failure());
    s.emit(
        "refused-after-death",
        json!({"actor":ash.id(),"expected_failure":true,"reason":"extinct"}),
        Some(attack.outcomes()[0].transaction_hash.to_string()),
    )
    .await?;
    let jobs = json!([{"kind":"bilingual","reward":90}]);
    let help = s.decide(a.id(), jobs.clone(), false, false).await?;
    if help["action"] != "collaborate" {
        bail!("producer chose {help}")
    }
    let quote = s
        .decide(
            b.id(),
            json!([{"kind":"translation","reward":30}]),
            true,
            false,
        )
        .await?;
    if quote["action"] != "bid" {
        bail!("provider chose {quote}")
    }
    let input = std::env::var("FERAL_TRANSCRIPT")
        .map(PathBuf::from)
        .unwrap_or(root().join("agents/inputs/demo-transcript.json"));
    let out = root().join("evidence/live-work");
    let output = Command::new("node")
        .arg(root().join("agents/tools.mjs"))
        .arg(&input)
        .arg(&out)
        .output()?;
    if !output.status.success() {
        bail!("tool failed")
    };
    let manifest: Value = serde_json::from_slice(&output.stdout)?;
    s.emit("work-generated",json!({"manifest":manifest,"input":input.file_name().unwrap().to_string_lossy(),"artifact":"live-work/card.svg","translation_source":"supplied bilingual transcript"}),None).await?;
    s.tx("paid-collaboration","pay_creature",json!({"actor":a.id(),"provider":b.id(),"amount":"30","service_id":"translation-v1","output_hash":manifest["translation_sha256"]}),zero).await?;
    let bid = s.decide(a.id(), jobs.clone(), true, false).await?;
    if bid["action"] != "bid" {
        bail!("producer bid chose {bid}")
    }
    s.tx("work-escrow","create_job",json!({"job_id":"bilingual-v1","amount":"90","expiry_turn":4,"requirements_hash":manifest["source_sha256"]}),zero).await?;
    s.tx("parent-bid","bid_job",json!({"actor":a.id(),"job_id":"bilingual-v1","price":bid["price"].as_u64().unwrap().to_string()}),zero).await?;
    s.tx(
        "work-claimed",
        "claim_job",
        json!({"actor":a.id(),"job_id":"bilingual-v1"}),
        zero,
    )
    .await?;
    s.tx(
        "work-paid",
        "settle_job",
        json!({"job_id":"bilingual-v1","output_hash":manifest["output_sha256"]}),
        zero,
    )
    .await?;
    let birth = s.decide(a.id(), json!([]), true, true).await?;
    if birth["action"] != "reproduce" {
        bail!("parent chose {birth}")
    }
    s.tx("funded-birth","birth",json!({"parent":a.id(),"child":kid,"nonce":1,"native":NearToken::from_millinear(60).as_yoctonear().to_string(),"strategy_hash":policy(1),"mutation":1}),zero).await?;
    s.tx("next-breath", "tick", json!({"next_turn":2}), zero)
        .await?;
    let child_bid = s.decide(&kid, jobs, true, false).await?;
    if child_bid["action"] != "bid" {
        bail!("child chose {child_bid}")
    };
    assert_ne!(child_bid["price"], bid["price"]);
    s.tx("child-work-escrow","create_job",json!({"job_id":"child-first","amount":"90","expiry_turn":4,"requirements_hash":manifest["source_sha256"]}),zero).await?;
    s.tx("child-first-bid","bid_job",json!({"actor":kid,"job_id":"child-first","price":child_bid["price"].as_u64().unwrap().to_string()}),zero).await?;
    assert_eq!(s.balance(a.id()).await?, 190);
    assert_eq!(s.balance(b.id()).await?, 155);
    assert_eq!(s.balance(ash.id()).await?, 5);
    assert_eq!(s.balance(&kid).await?, 90);
    s.emit("complete",json!({"child_bid":child_bid["price"],"parent_bid":bid["price"],"supply":950,"burned":50,"no_public_chain_actions":true}),None).await?;
    println!(
        "Completed local terrarium with {} structured events",
        s.events.len()
    );
    Ok(())
}
