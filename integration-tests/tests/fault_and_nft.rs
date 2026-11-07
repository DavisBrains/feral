use anyhow::Result;
use near_workspaces::{Account, Contract, types::NearToken};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
fn policy(i: u8) -> String {
    let p = match i {
        0 => "job=bilingual;min_price=90;birth_floor=120",
        1 => "job=bilingual;min_price=80;birth_floor=140",
        _ => panic!(),
    };
    format!("{:x}", Sha256::digest(p.as_bytes()))
}
async fn call(o: &Account, c: &Contract, m: &str, a: Value) -> Result<()> {
    o.call(c.id(), m)
        .args_json(a)
        .max_gas()
        .transact()
        .await?
        .into_result()?;
    Ok(())
}
async fn balance(c: &Contract, id: &str) -> Result<u128> {
    let s: String = c
        .view("ft_balance_of")
        .args_json(json!({"account_id":id}))
        .await?
        .json()?;
    Ok(s.parse()?)
}
#[tokio::test]
async fn created_account_failed_callback_recovers_without_refund_and_native_reconciles()
-> Result<()> {
    let w = near_workspaces::sandbox().await?;
    let c = w
        .dev_deploy(&std::fs::read("../target/fault/feral_controller.wasm")?)
        .await?;
    let o = w.dev_create_account().await?;
    let a = w.dev_create_account().await?;
    call(&o, &c, "new", json!({"owner":o.id()})).await?;
    o.call(c.id(), "register")
        .args_json(json!({"id":a.id(),"amount":"250","strategy_hash":policy(0)}))
        .deposit(NearToken::from_millinear(200))
        .max_gas()
        .transact()
        .await?
        .into_result()?;
    let kid = format!("faultkid.{}", c.id());
    let kid_id = kid.parse()?;
    call(&o, &c, "inject_callback_failure", json!({"child":kid})).await?;
    w.fast_forward(5).await?;
    let owner_before = o.view_account().await?.balance.as_yoctonear();
    let controller_before = c.view_account().await?.balance.as_yoctonear();
    let r=o.call(c.id(),"birth").args_json(json!({"parent":a.id(),"child":kid,"nonce":1,"native":NearToken::from_millinear(60).as_yoctonear().to_string(),"strategy_hash":policy(1),"mutation":1})).max_gas().transact().await?;
    assert!(r.is_failure());
    assert!(format!("{:?}", r).contains("injected callback failure"));
    let account = w.view_account(&kid_id).await?;
    assert_eq!(account.balance, NearToken::from_millinear(60));
    assert_eq!(balance(&c, &kid).await?, 0);
    assert_eq!(balance(&c, a.id().as_str()).await?, 150);
    let pending: Value = c
        .view("birth_status")
        .args_json(json!({"child":kid}))
        .await?
        .json()?;
    assert_eq!(pending["state"], "pending");
    w.fast_forward(5).await?;
    let owner_after = o.view_account().await?.balance.as_yoctonear();
    let controller_after = c.view_account().await?.balance.as_yoctonear();
    let gross: u128 = r
        .outcomes()
        .iter()
        .map(|x| x.tokens_burnt.as_yoctonear())
        .sum();
    println!(
        "native raw owner {owner_before} -> {owner_after}; controller {controller_before} -> {controller_after}; child {}; gross {gross}",
        account.balance.as_yoctonear()
    );
    let net_signed = (owner_before + controller_before) as i128
        - (owner_after + controller_after + account.balance.as_yoctonear()) as i128;
    assert!(net_signed > 0, "net protocol debit {net_signed}");
    let net = net_signed as u128;
    assert!(net > 0 && gross >= net);
    let rebate = gross - net;
    // Sender is charged actual gross gas after unused gas refunds. Contract rewards
    // explain the difference between gross gas charges and total account debit.
    assert_eq!(owner_before - owner_after, gross);
    assert_eq!(
        controller_after + account.balance.as_yoctonear() - controller_before,
        rebate
    );
    let report = json!({"network":"sandbox","transaction":r.outcomes()[0].transaction_hash.to_string(),"owner_before":owner_before.to_string(),"owner_after":owner_after.to_string(),"controller_before":controller_before.to_string(),"controller_after":controller_after.to_string(),"child_total":account.balance.as_yoctonear().to_string(),"child_storage_bytes":account.storage_usage,"child_storage_backing":(account.storage_usage as u128*10_000_000_000_000_000_000u128).to_string(),"gross_gas_charge":gross.to_string(),"contract_reward":rebate.to_string(),"net_protocol_debit":net.to_string(),"identity":"before total = after total + gross gas charges - contract rewards; storage backing is included in total"});
    std::fs::write(
        "../evidence/native-reconciliation.json",
        serde_json::to_string_pretty(&report)?,
    )?;
    println!("native reconciliation {}", report);
    // Time passing or another tick must not refund a successfully created account.
    call(&o, &c, "tick", json!({"next_turn":1})).await?;
    assert_eq!(balance(&c, a.id().as_str()).await?, 140);
    assert_eq!(balance(&c, &kid).await?, 0);
    call(&o,&c,"reconcile_birth",json!({"child":kid,"nonce":1,"success":true,"evidence_hash":format!("{:x}",Sha256::digest(format!("{:?}",r).as_bytes()))})).await?;
    assert_eq!(balance(&c, a.id().as_str()).await?, 140);
    assert_eq!(balance(&c, &kid).await?, 100);
    let life: Value = c
        .view("nft_token")
        .args_json(json!({"token_id":kid}))
        .await?
        .json()?;
    assert_eq!(life["owner_id"], o.id().as_str());
    assert!(
        o.call(c.id(), "reconcile_birth")
            .args_json(
                json!({"child":kid,"nonce":1,"success":false,"evidence_hash":"a".repeat(64)})
            )
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    let mut audits = vec![report];
    for (name, nonce, creation_fails) in [("existing", 2, true), ("second", 3, false)] {
        let target = format!("{name}.{}", c.id());
        let target_id = target.parse()?;
        if creation_fails {
            c.as_account()
                .create_subaccount(name)
                .initial_balance(NearToken::from_millinear(100))
                .transact()
                .await?
                .into_result()?;
        }
        w.fast_forward(5).await?;
        let before_o = o.view_account().await?.balance.as_yoctonear();
        let before_c = c.view_account().await?.balance.as_yoctonear();
        let before_child = if creation_fails {
            w.view_account(&target_id).await?.balance.as_yoctonear()
        } else {
            0
        };
        let result=o.call(c.id(),"birth").args_json(json!({"parent":a.id(),"child":target,"nonce":nonce,"native":NearToken::from_millinear(60).as_yoctonear().to_string(),"strategy_hash":policy(1),"mutation":1})).max_gas().transact().await?;
        let outcome: bool = result.clone().json()?;
        assert_eq!(outcome, !creation_fails);
        w.fast_forward(5).await?;
        let after_o = o.view_account().await?.balance.as_yoctonear();
        let after_c = c.view_account().await?.balance.as_yoctonear();
        let child = w.view_account(&target_id).await?;
        let after_child = child.balance.as_yoctonear();
        let charges: u128 = result
            .outcomes()
            .iter()
            .map(|x| x.tokens_burnt.as_yoctonear())
            .sum();
        let debit = before_o + before_c + before_child - after_o - after_c - after_child;
        assert_eq!(before_o - after_o, charges);
        assert!(charges >= debit && debit > 0);
        let rewards = charges - debit;
        assert_eq!(after_c + after_child - before_c - before_child, rewards);
        if creation_fails {
            assert_eq!(after_child, before_child);
            assert_eq!(balance(&c, a.id().as_str()).await?, 140);
        } else {
            assert_eq!(after_child, NearToken::from_millinear(60).as_yoctonear());
            assert_eq!(balance(&c, a.id().as_str()).await?, 40);
        }
        audits.push(json!({"case":if creation_fails{"failed batch and refunded funding"}else{"successful creation and callback"},"transaction":result.outcomes()[0].transaction_hash.to_string(),"before_total":(before_o+before_c+before_child).to_string(),"after_total":(after_o+after_c+after_child).to_string(),"gross_gas_charge":charges.to_string(),"contract_reward":rewards.to_string(),"net_protocol_debit":debit.to_string(),"child_total":after_child.to_string(),"child_storage_backing":(child.storage_usage as u128*10_000_000_000_000_000_000u128).to_string()}));
    }
    std::fs::write(
        "../evidence/native-reconciliation.json",
        serde_json::to_string_pretty(
            &json!({"network":"sandbox","cases":audits,"storage_is_part_of_total_not_an_extra_charge":true}),
        )?,
    )?;
    Ok(())
}
#[tokio::test]
async fn nft_permissions_follow_owner_and_do_not_drain_or_revive() -> Result<()> {
    let w = near_workspaces::sandbox().await?;
    let c = w
        .dev_deploy(&std::fs::read(
            "../target/near/feral_controller/feral_controller.wasm",
        )?)
        .await?;
    let o = w.dev_create_account().await?;
    let a = w.dev_create_account().await?;
    let holder = w.dev_create_account().await?;
    call(&o, &c, "new", json!({"owner":o.id()})).await?;
    call(
        &o,
        &c,
        "register",
        json!({"id":a.id(),"amount":"250","strategy_hash":policy(0)}),
    )
    .await?;
    call(&o, &c, "set_goal", json!({"actor":a.id(),"goal":2})).await?;
    o.call(c.id(), "nft_transfer")
        .args_json(json!({"receiver_id":holder.id(),"token_id":a.id()}))
        .deposit(NearToken::from_yoctonear(1))
        .max_gas()
        .transact()
        .await?
        .into_result()?;
    assert!(
        o.call(c.id(), "set_goal")
            .args_json(json!({"actor":a.id(),"goal":1}))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    call(&holder, &c, "set_goal", json!({"actor":a.id(),"goal":1})).await?;
    assert!(
        o.call(c.id(), "sponsor")
            .args_json(json!({"actor":a.id(),"amount":"1"}))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    holder
        .call(c.id(), "storage_deposit")
        .args_json(json!({"account_id":holder.id()}))
        .deposit(NearToken::from_millinear(10))
        .max_gas()
        .transact()
        .await?
        .into_result()?;
    a.call(c.id(), "ft_transfer")
        .args_json(json!({"receiver_id":holder.id(),"amount":"20"}))
        .deposit(NearToken::from_yoctonear(1))
        .max_gas()
        .transact()
        .await?
        .into_result()?;
    call(
        &holder,
        &c,
        "sponsor",
        json!({"actor":a.id(),"amount":"20"}),
    )
    .await?;
    assert_eq!(balance(&c, a.id().as_str()).await?, 250);
    assert_eq!(balance(&c, holder.id().as_str()).await?, 0);
    // Permission is not a withdrawal right and cannot exceed the holder's balance.
    assert!(
        holder
            .call(c.id(), "sponsor")
            .args_json(json!({"actor":a.id(),"amount":"1"}))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    for turn in 1..=26 {
        call(&o, &c, "tick", json!({"next_turn":turn})).await?;
    }
    assert!(
        holder
            .call(c.id(), "set_goal")
            .args_json(json!({"actor":a.id(),"goal":2}))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    assert!(
        holder
            .call(c.id(), "sponsor")
            .args_json(json!({"actor":a.id(),"amount":"1"}))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    Ok(())
}
