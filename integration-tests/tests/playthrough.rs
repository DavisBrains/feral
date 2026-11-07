use anyhow::Result;
use near_workspaces::{Account, Contract, types::NearToken};
use serde_json::{Value, json};
fn h(n: u8) -> String {
    format!("{n:064x}")
}
async fn call(owner: &Account, c: &Contract, method: &str, args: Value) -> Result<()> {
    owner
        .call(c.id(), method)
        .args_json(args)
        .max_gas()
        .transact()
        .await?
        .into_result()?;
    Ok(())
}
async fn bal(c: &Contract, id: &str) -> Result<u128> {
    let s: String = c
        .view("ft_balance_of")
        .args_json(json!({"account_id":id}))
        .await?
        .json()?;
    Ok(s.parse()?)
}
async fn state(c: &Contract) -> Result<Value> {
    Ok(c.view("economy").await?.json()?)
}
async fn conservation(c: &Contract, ids: &[&str]) -> Result<()> {
    let e = state(c).await?;
    let mut total = bal(c, c.id().as_str()).await?;
    for id in ids {
        total += bal(c, id).await?;
    }
    let supply = e["supply"].as_str().unwrap().parse::<u128>()?;
    let burned = e["burned"].as_str().unwrap().parse::<u128>()?;
    assert_eq!(total, supply);
    assert_eq!(total + burned, 1000);
    Ok(())
}
#[tokio::test]
async fn sandbox_paper_playthrough_and_failure_paths() -> Result<()> {
    let worker = near_workspaces::sandbox().await?;
    let wasm = std::fs::read("../target/near/feral_controller/feral_controller.wasm")?;
    let c = worker.dev_deploy(&wasm).await?;
    let owner = worker.dev_create_account().await?;
    call(&owner, &c, "new", json!({"owner":owner.id()})).await?;
    let a = worker.dev_create_account().await?;
    let b = worker.dev_create_account().await?;
    let extinct = worker.dev_create_account().await?;
    for (actor, amount, hash) in [(&a, 250, 1), (&b, 145, 2), (&extinct, 5, 3)] {
        owner
            .call(c.id(), "register")
            .args_json(json!({"id":actor.id(),"amount":amount.to_string(),"strategy_hash":h(hash)}))
            .deposit(NearToken::from_millinear(200))
            .max_gas()
            .transact()
            .await?
            .into_result()?;
    }
    let ids = [a.id().as_str(), b.id().as_str(), extinct.id().as_str()];
    conservation(&c, &ids).await?;
    call(&owner, &c, "set_demand", json!({"version":1})).await?;
    call(&owner, &c, "tick", json!({"next_turn":1})).await?;
    assert_eq!(state(&c).await?["supply"], "980");
    conservation(&c, &ids).await?;
    let dead: Value = c
        .view("creature")
        .args_json(json!({"id":extinct.id()}))
        .await?
        .json()?;
    assert_eq!(dead["active"], false);
    let refusal=extinct.call(c.id(),"pay_creature").args_json(json!({"actor":extinct.id(),"provider":a.id(),"amount":"1","service_id":"dead-spend","output_hash":h(4)})).max_gas().transact().await?;
    assert!(refusal.is_failure());
    assert!(format!("{:?}", refusal).contains("extinct"));
    // Direct NEP-141 transfer also cannot escape the death lock.
    assert!(
        extinct
            .call(c.id(), "ft_transfer")
            .args_json(json!({"receiver_id":a.id(),"amount":"1"}))
            .deposit(NearToken::from_yoctonear(1))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    call(&owner,&c,"pay_creature",json!({"actor":a.id(),"provider":b.id(),"amount":"30","service_id":"translation-1","output_hash":h(4)})).await?;
    conservation(&c, &ids).await?;
    call(
        &owner,
        &c,
        "create_job",
        json!({"job_id":"card-1","amount":"90","expiry_turn":3,"requirements_hash":h(5)}),
    )
    .await?;
    call(
        &owner,
        &c,
        "claim_job",
        json!({"actor":a.id(),"job_id":"card-1"}),
    )
    .await?;
    call(
        &owner,
        &c,
        "settle_job",
        json!({"job_id":"card-1","output_hash":h(6)}),
    )
    .await?;
    assert_eq!(bal(&c, a.id().as_str()).await?, 300);
    conservation(&c, &ids).await?;
    let kid = format!("kid.{}", c.id());
    let funding = NearToken::from_millinear(60);
    let args = json!({"parent":a.id(),"child":kid,"nonce":1,"native":funding.as_yoctonear().to_string(),"strategy_hash":h(7),"mutation":1});
    let birth = owner
        .call(c.id(), "birth")
        .args_json(args.clone())
        .max_gas()
        .transact()
        .await?;
    println!("birth receipt {:?}", birth);
    birth.into_result()?;
    let child_id = kid.parse()?;
    let account = worker.view_account(&child_id).await?;
    assert_eq!(account.balance, funding);
    assert!(account.storage_usage > 0);
    println!(
        "real child native balance {} storage bytes {}",
        account.balance.as_yoctonear(),
        account.storage_usage
    );
    assert_eq!(bal(&c, &kid).await?, 100);
    assert_eq!(bal(&c, a.id().as_str()).await?, 200);
    let born: Value = c
        .view("creature")
        .args_json(json!({"id":kid}))
        .await?
        .json()?;
    assert_eq!(born["strategy_hash"], h(7));
    assert_eq!(born["parent"], a.id().as_str());
    let ids = [
        a.id().as_str(),
        b.id().as_str(),
        extinct.id().as_str(),
        kid.as_str(),
    ];
    conservation(&c, &ids).await?;
    assert!(
        owner
            .call(c.id(), "birth")
            .args_json(args)
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    assert!(
        owner
            .call(c.id(), "on_birth")
            .args_json(json!({"child":kid,"nonce":1}))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    assert!(
        owner
            .call(c.id(), "reconcile_birth")
            .args_json(json!({"child":kid,"nonce":1,"success":false,"evidence_hash":h(9)}))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    call(&owner, &c, "tick", json!({"next_turn":2})).await?;
    assert_eq!(state(&c).await?["supply"], "950");
    assert_eq!(bal(&c, a.id().as_str()).await?, 190);
    assert_eq!(bal(&c, b.id().as_str()).await?, 155);
    assert_eq!(bal(&c, &kid).await?, 90);
    conservation(&c, &ids).await?;
    // Existing direct child forces the create-account batch to fail and refund.
    let existing = c
        .as_account()
        .create_subaccount("existing")
        .initial_balance(NearToken::from_millinear(100))
        .transact()
        .await?
        .into_result()?;
    let before: Value = c
        .view("creature")
        .args_json(json!({"id":a.id()}))
        .await?
        .json()?;
    let failed_args = json!({"parent":a.id(),"child":existing.id(),"nonce":2,"native":funding.as_yoctonear().to_string(),"strategy_hash":h(8),"mutation":2});
    let failed = owner
        .call(c.id(), "birth")
        .args_json(failed_args)
        .max_gas()
        .transact()
        .await?;
    // Top-level callback returns false; an intermediate receipt failure is expected.
    println!("failed-account receipt {:?}", failed);
    let result: bool = failed.json()?;
    assert!(!result);
    assert_eq!(bal(&c, a.id().as_str()).await?, 190);
    assert_eq!(bal(&c, existing.id().as_str()).await?, 0);
    let after: Value = c
        .view("creature")
        .args_json(json!({"id":a.id()}))
        .await?
        .json()?;
    assert_eq!(before["native_reserve"], after["native_reserve"]);
    assert!(after["pending"].is_null());
    let failed: Value = c
        .view("birth_status")
        .args_json(json!({"child":existing.id()}))
        .await?
        .json()?;
    assert_eq!(failed["state"], "failed");
    conservation(&c, &ids).await?;
    // Repeated tick must fail without burning anything.
    assert!(
        owner
            .call(c.id(), "tick")
            .args_json(json!({"next_turn":2}))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    assert_eq!(state(&c).await?["supply"], "950");
    println!(
        "paper playthrough: 1000 initial, 50 burned, 950 supply; child funded; dead spend, duplicate birth, callback forgery and failed birth verified"
    );
    Ok(())
}
