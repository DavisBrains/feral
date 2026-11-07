use near_sdk::serde_json::Value;
use near_sdk::{AccountId, PanicOnDefault, env, near, require};
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct MockSigner {
    owner: AccountId,
    expected: String,
    response: String,
    last: Option<String>,
    calls: u64,
}
#[near]
impl MockSigner {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            owner,
            expected: String::new(),
            response: "null".into(),
            last: None,
            calls: 0,
        }
    }
    pub fn prepare(&mut self, expected: String, response: String) {
        require!(env::predecessor_account_id() == self.owner, "owner");
        self.expected = expected;
        self.response = response;
    }
    #[payable]
    pub fn sign(&mut self, request: Value) -> Value {
        require!(env::attached_deposit().as_yoctonear() == 1, "one yocto");
        require!(request["domain_id"] == 0, "ECDSA domain");
        require!(
            request["payload_v2"]["Ecdsa"].as_str() == Some(&self.expected),
            "expected digest"
        );
        require!(
            request["path"]
                .as_str()
                .unwrap()
                .starts_with("feral-sepolia-v1/"),
            "child scoped path"
        );
        self.last=Some(near_sdk::serde_json::json!({"predecessor":env::predecessor_account_id(),"request":request}).to_string());
        self.calls += 1;
        near_sdk::serde_json::from_str(&self.response).unwrap()
    }
    pub fn last_request(&self) -> Option<Value> {
        self.last
            .as_ref()
            .map(|s| near_sdk::serde_json::from_str(s).unwrap())
    }
    pub fn calls(&self) -> u64 {
        self.calls
    }
}
