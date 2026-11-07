use anyhow::Result;
use near_workspaces::{Account, Contract};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    io::Write,
    path::PathBuf,
    process::{Command, Stdio},
};
fn sha(s: &str) -> String {
    format!("{:x}", Sha256::digest(s.as_bytes()))
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
#[tokio::test]
async fn controller_scoped_current_mpc_request_matches_ethers_and_mock_signature() -> Result<()> {
    let w = near_workspaces::sandbox().await?;
    let c = w
        .dev_deploy(&std::fs::read(
            "../target/near/feral_controller/feral_controller.wasm",
        )?)
        .await?;
    let m = w
        .dev_deploy(&std::fs::read(
            "../target/near/feral_mock_signer/feral_mock_signer.wasm",
        )?)
        .await?;
    let o = w.dev_create_account().await?;
    let a = w.dev_create_account().await?;
    call(&o, &c, "new", json!({"owner":o.id()})).await?;
    call(&o, &m, "new", json!({"owner":o.id()})).await?;
    call(&o,&c,"register",json!({"id":a.id(),"amount":"250","strategy_hash":sha("job=bilingual;min_price=90;birth_floor=120")})).await?;
    call(&o,&c,"create_job",json!({"job_id":"tool-job","amount":"90","expiry_turn":3,"requirements_hash":"a".repeat(64)})).await?;
    call(
        &o,
        &c,
        "claim_job",
        json!({"actor":a.id(),"job_id":"tool-job"}),
    )
    .await?;
    call(
        &o,
        &c,
        "settle_job",
        json!({"job_id":"tool-job","output_hash":"b".repeat(64)}),
    )
    .await?;
    let domain = json!({"chain_id":11155111,"treasury":format!("0x{}","11".repeat(20))});
    let config = json!({"signer":m.id(),"domain":domain,"campaign":"a".repeat(64),"token":format!("0x{}","22".repeat(20)),"recipient":format!("0x{}","33".repeat(20)),"per_voucher":"10","total_cap":"100"});
    call(&o, &c, "configure_tools", json!({"config":config})).await?;
    let now = w.view_block().await?.timestamp() / 1_000_000_000;
    let v = json!({"campaign":"a".repeat(64),"job":sha("tool-job"),"creature":sha(a.id().as_str()),"recipient":config["recipient"],"token":config["token"],"amount":"7","output_hash":"b".repeat(64),"nonce":0,"expiry":now+600});
    let d: String = c
        .view("preview_tool_digest")
        .args_json(json!({"voucher":v}))
        .await?
        .json()?;
    let module = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("app/voucher.mjs");
    let mut proc = Command::new("node")
        .arg(&module)
        .arg("digest")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()?;
    proc.stdin
        .take()
        .unwrap()
        .write_all(serde_json::to_string(&json!({"domain":domain,"voucher":v}))?.as_bytes())?;
    let r = proc.wait_with_output()?;
    assert!(r.status.success());
    let expected: Value = serde_json::from_slice(&r.stdout)?;
    assert_eq!(format!("0x{d}"), expected["digest"]);
    let signed = Command::new("node")
        .arg(&module)
        .arg("mock-sign")
        .arg(&d)
        .output()?;
    assert!(signed.status.success());
    let signed: Value = serde_json::from_slice(&signed.stdout)?;
    call(
        &o,
        &m,
        "prepare",
        json!({"expected":d,"response":signed["response"].to_string()}),
    )
    .await?;
    call(
        &o,
        &c,
        "request_tool_payment",
        json!({"actor":a.id(),"job_id":"tool-job","voucher":v}),
    )
    .await?;
    let l: Value = c
        .view("tool_liability")
        .args_json(json!({"nonce":0}))
        .await?
        .json()?;
    assert_eq!(l["state"], "signature-returned");
    assert_eq!(l["digest"], d);
    let signature: Value = serde_json::from_str(l["signature"].as_str().unwrap())?;
    assert_eq!(signature, signed["response"]);
    let req: Value = m.view("last_request").await?.json()?;
    assert_eq!(req["predecessor"], c.id().as_str());
    assert_eq!(
        req["request"]["path"],
        format!("feral-sepolia-v1/{}", a.id())
    );
    assert_eq!(req["request"]["domain_id"], 0);
    assert_eq!(req["request"]["payload_v2"]["Ecdsa"], d);
    assert!(
        o.call(c.id(), "request_tool_payment")
            .args_json(json!({"actor":a.id(),"job_id":"tool-job","voucher":v}))
            .max_gas()
            .transact()
            .await?
            .is_failure()
    );
    let count: u64 = m.view("calls").await?.json()?;
    assert_eq!(count, 1);
    std::fs::write(
        "../evidence/mock-mpc.json",
        serde_json::to_string_pretty(
            &json!({"network":"sandbox","request":req,"liability":l,"expected_fixture_signer":signed["expected_address"],"ethers_digest_matches":true,"signature_recovery_validated_locally":true,"public_mpc_called":false}),
        )?,
    )?;
    Ok(())
}
