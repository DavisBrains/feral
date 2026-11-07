use near_sdk::{AccountId, env, json_types::U128, near, require};
#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub struct Domain {
    pub chain_id: u64,
    pub treasury: String,
}
#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub struct Voucher {
    pub campaign: String,
    pub job: String,
    pub creature: String,
    pub recipient: String,
    pub token: String,
    pub amount: U128,
    pub output_hash: String,
    pub nonce: u64,
    pub expiry: u64,
}
#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub struct ToolConfig {
    pub signer: AccountId,
    pub domain: Domain,
    pub campaign: String,
    pub token: String,
    pub recipient: String,
    pub per_voucher: U128,
    pub total_cap: U128,
}
#[near(serializers=[borsh,json])]
#[derive(Clone)]
pub struct Liability {
    pub actor: AccountId,
    pub voucher: Voucher,
    pub digest: String,
    pub state: String,
    pub signature: Option<String>,
}
#[near(serializers=[json])]
#[derive(Clone)]
pub enum Payload {
    Ecdsa(String),
}
#[near(serializers=[json])]
pub struct SignRequest {
    pub path: String,
    pub payload_v2: Payload,
    pub domain_id: u64,
}
pub fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
pub fn bytes(s: &str, n: usize) -> Vec<u8> {
    let s = s.strip_prefix("0x").unwrap_or(s);
    require!(
        s.len() == n * 2 && s.bytes().all(|b| b.is_ascii_hexdigit()),
        "hex width"
    );
    (0..n)
        .map(|i| u8::from_str_radix(&s[2 * i..2 * i + 2], 16).unwrap())
        .collect()
}
fn number(n: u128) -> Vec<u8> {
    let mut b = vec![0; 16];
    b.extend(n.to_be_bytes());
    b
}
fn address(s: &str) -> Vec<u8> {
    let mut b = vec![0; 12];
    b.extend(bytes(s, 20));
    b
}
fn hash(s: &str) -> Vec<u8> {
    env::keccak256(s.as_bytes())
}
pub fn digest(d: &Domain, v: &Voucher) -> String {
    let mut domain =
        hash("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    domain.extend(hash("FeralTreasury"));
    domain.extend(hash("1"));
    domain.extend(number(d.chain_id as u128));
    domain.extend(address(&d.treasury));
    let domain = env::keccak256(&domain);
    let mut data = hash(
        "Voucher(bytes32 campaign,bytes32 job,bytes32 creature,address recipient,address token,uint256 amount,bytes32 outputHash,uint256 nonce,uint256 expiry)",
    );
    for s in [&v.campaign, &v.job, &v.creature] {
        data.extend(bytes(s, 32));
    }
    data.extend(address(&v.recipient));
    data.extend(address(&v.token));
    data.extend(number(v.amount.0));
    data.extend(bytes(&v.output_hash, 32));
    data.extend(number(v.nonce as u128));
    data.extend(number(v.expiry as u128));
    let mut input = vec![0x19, 0x01];
    input.extend(domain);
    input.extend(env::keccak256(&data));
    hex(&env::keccak256(&input))
}
