//! Offline decoder. Never opens a key, signs, contacts RPC or broadcasts.
use anyhow::{Context, Result, ensure};
use near_primitives::{transaction::SignedTransaction, views::SignedTransactionView};
use serde_json::{Value, json};

fn inspect(value: Value) -> Result<Value> {
    let signed: SignedTransaction = serde_json::from_value(
        value
            .get("signed_transaction_as_base64")
            .context("missing signed transaction")?
            .clone(),
    )
    .context("invalid signed transaction")?;
    let hash = signed.get_hash();
    ensure!(
        signed
            .signature
            .verify(hash.as_ref(), signed.transaction.public_key()),
        "invalid signature"
    );
    let block_hash = signed.transaction.block_hash().to_string();
    let mut transaction = serde_json::to_value(SignedTransactionView::from(signed))?;
    transaction.as_object_mut().unwrap().remove("signature");
    Ok(json!({"hash":hash.to_string(),"block_hash":block_hash,"transaction":transaction}))
}
fn main() -> Result<()> {
    let filename = std::env::args()
        .nth(1)
        .context("expected protected signed file path")?;
    let value = serde_json::from_slice(&std::fs::read(filename)?)?;
    println!("{}", inspect(value)?);
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    use near_crypto::{KeyType, SecretKey, Signature};
    use near_primitives::{
        hash::CryptoHash,
        transaction::{Transaction, TransactionV0},
    };
    fn fixture(valid: bool) -> (Value, String) {
        // Public local fixture only. Never a network account key.
        let key = SecretKey::from_seed(KeyType::ED25519, "public-local-decoder-fixture");
        let tx = Transaction::V0(TransactionV0 {
            signer_id: "fixture.testnet".parse().unwrap(),
            public_key: key.public_key(),
            nonce: 42,
            receiver_id: "other.testnet".parse().unwrap(),
            block_hash: CryptoHash::default(),
            actions: vec![],
        });
        let hash = tx.get_hash_and_size().0;
        let sig = if valid {
            key.sign(hash.as_ref())
        } else {
            Signature::empty(KeyType::ED25519)
        };
        (
            json!({"signed_transaction_as_base64":SignedTransaction::new(sig,tx)}),
            hash.to_string(),
        )
    }
    #[test]
    fn canonical_hash_and_metadata_without_signature() {
        let (value, hash) = fixture(true);
        let result = inspect(value).unwrap();
        assert_eq!(result["hash"], hash);
        assert_eq!(result["transaction"]["nonce"], 42);
        assert!(result["transaction"].get("signature").is_none());
        assert!(result.get("signed_transaction_as_base64").is_none());
    }
    #[test]
    fn invalid_signature_refused() {
        assert!(inspect(fixture(false).0).is_err());
    }
    #[test]
    fn missing_or_malformed_blob_refused() {
        assert!(inspect(json!({})).is_err());
        assert!(inspect(json!({"signed_transaction_as_base64":"not base64"})).is_err());
    }
}
