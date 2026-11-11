//! Telltale vault: every agent key is a tripwire.
//!
//! The vault holds an AI agent's money. Agents spend through function-call keys
//! on the vault account that may only call `pay`. A payment counts only when it
//! carries an ed25519 proof from the Telltale signer, bound to the key that
//! signed the transaction. A call without a valid proof means the key was used
//! outside the signer, so the vault trips: it freezes and deletes every agent
//! key in the same call. Nothing about which keys are "bait" is stored on-chain.

use near_sdk::json_types::{Base64VecU8, U128, U64};
use near_sdk::serde_json::{self, json};
use near_sdk::store::{IterableSet, Vector};
use near_sdk::{
    assert_one_yocto, env, near, require, AccountId, Allowance, BorshStorageKey, CurveType,
    NearToken, PanicOnDefault, Promise, PublicKey,
};

/// Domain separator and first line of every proof message.
pub const PROOF_DOMAIN: &str = "telltale-pay-v1";
/// Method names agent keys may call.
pub const AGENT_KEY_METHODS: &str = "pay";

const DAY_NS: u64 = 86_400 * 1_000_000_000;
const MAX_MANAGED_KEYS: u32 = 24;
const MAX_KEYS_PER_CALL: usize = 12;
const MAX_MEMO_BYTES: usize = 256;
const MAX_DETAIL_BYTES: usize = 512;
const MAX_ALLOWLIST: usize = 64;
const MAX_PAGE: u32 = 100;
/// Balance kept back for gas and storage headroom.
const RESERVE: NearToken = NearToken::from_millinear(50);

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum StorageKey {
    ManagedKeys,
    Reporters,
    Payments,
    Trips,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Policy {
    /// Largest single payment, in yoctoNEAR.
    pub per_payment_cap: U128,
    /// Largest total per 24-hour window, in yoctoNEAR.
    pub daily_cap: U128,
    /// When set, payments may only go to these accounts.
    pub allowlist: Option<Vec<AccountId>>,
    /// Denied payments with a valid proof that trip the vault. 0 turns it off.
    pub max_strikes: u8,
}

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ReportKind {
    DecoyTool,
    DecoyCredential,
    Manual,
}

#[near(serializers = [json, borsh])]
#[serde(tag = "kind", rename_all = "snake_case")]
#[derive(Clone, Debug, PartialEq)]
pub enum TripCause {
    /// A vault key was used without a valid signer proof.
    StolenKey {
        public_key: PublicKey,
        reason: String,
    },
    /// A reporter saw a decoy tool or credential being used.
    Report { report: ReportKind, detail: String },
    /// Too many denied payments in one window.
    Strikes { count: u8 },
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Trip {
    pub cause: TripCause,
    pub epoch: u32,
    pub block_height: U64,
    pub timestamp_ms: U64,
    pub predecessor_id: AccountId,
    pub signer_pk: PublicKey,
    pub keys_deleted: u32,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Payment {
    pub receiver_id: AccountId,
    pub amount: U128,
    pub memo: Option<String>,
    pub epoch: u32,
    pub block_height: U64,
    pub timestamp_ms: U64,
    pub signer_pk: PublicKey,
}

#[near(serializers = [json])]
#[serde(tag = "status", rename_all = "snake_case")]
#[derive(Debug, PartialEq)]
pub enum PayOutcome {
    Paid { payment_index: U64 },
    Denied { reason: String, strikes: u8 },
    Tripped { trip_index: U64 },
}

#[near(serializers = [json])]
#[derive(Debug)]
pub struct Status {
    pub frozen: bool,
    pub epoch: u32,
    pub managed_key_count: u32,
    pub spent_in_window: U128,
    pub window_start_ms: U64,
    pub strikes: u8,
    pub last_nonce: U64,
    pub balance: U128,
    pub available: U128,
    pub payment_count: U64,
    pub trip_count: U64,
}

#[near(serializers = [json])]
#[derive(Debug)]
pub struct Config {
    pub owner_id: AccountId,
    pub signer_pk: PublicKey,
    pub policy: Policy,
    pub reporters: Vec<AccountId>,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Vault {
    owner_id: AccountId,
    signer_pk: PublicKey,
    policy: Policy,
    frozen: bool,
    epoch: u32,
    managed_keys: IterableSet<PublicKey>,
    reporters: IterableSet<AccountId>,
    last_nonce: u64,
    window_start: u64,
    spent_in_window: u128,
    strikes: u8,
    payments: Vector<Payment>,
    trips: Vector<Trip>,
}

/// Builds the exact message the signer signs for a payment.
pub fn proof_message(
    vault_id: &AccountId,
    key: &PublicKey,
    receiver_id: &AccountId,
    amount: u128,
    nonce: u64,
    memo: &str,
) -> String {
    let memo_hash = env::sha256_array(memo.as_bytes());
    format!(
        "{PROOF_DOMAIN}\nvault:{vault_id}\nkey:{}\nto:{receiver_id}\namount:{amount}\nnonce:{nonce}\nmemo:{}",
        String::from(key),
        to_hex(&memo_hash)
    )
}

fn to_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0x0f) as usize] as char);
    }
    out
}

fn ed25519_bytes(pk: &PublicKey) -> Option<[u8; 32]> {
    if pk.curve_type() != CurveType::ED25519 {
        return None;
    }
    pk.as_bytes()[1..].try_into().ok()
}

fn validate_policy(policy: &Policy) {
    require!(
        policy.per_payment_cap.0 > 0,
        "per_payment_cap must be above zero"
    );
    require!(
        policy.daily_cap.0 >= policy.per_payment_cap.0,
        "daily_cap must be at least per_payment_cap"
    );
    if let Some(list) = &policy.allowlist {
        require!(list.len() <= MAX_ALLOWLIST, "allowlist is too long");
    }
    require!(policy.max_strikes <= 20, "max_strikes must be 20 or less");
}

fn emit(event: &str, data: serde_json::Value) {
    let payload = json!({
        "standard": "telltale",
        "version": "1.0.0",
        "event": event,
        "data": [data],
    });
    env::log_str(&format!("EVENT_JSON:{payload}"));
}

fn now_ms() -> U64 {
    U64(env::block_timestamp_ms())
}

#[near]
impl Vault {
    #[init]
    pub fn new(owner_id: AccountId, signer_pk: PublicKey, policy: Policy) -> Self {
        require!(
            ed25519_bytes(&signer_pk).is_some(),
            "signer_pk must be an ed25519 key"
        );
        validate_policy(&policy);
        Self {
            owner_id,
            signer_pk,
            policy,
            frozen: false,
            epoch: 0,
            managed_keys: IterableSet::new(StorageKey::ManagedKeys),
            reporters: IterableSet::new(StorageKey::Reporters),
            last_nonce: 0,
            window_start: env::block_timestamp(),
            spent_in_window: 0,
            strikes: 0,
            payments: Vector::new(StorageKey::Payments),
            trips: Vector::new(StorageKey::Trips),
        }
    }

    // ---------------------------------------------------------------- agents

    /// Pays `amount` yoctoNEAR to `receiver_id`. Must be signed by a key on the
    /// vault account and carry a signer proof for that key. A missing or
    /// invalid proof trips the vault instead of failing.
    pub fn pay(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        nonce: Option<U64>,
        proof: Option<Base64VecU8>,
    ) -> PayOutcome {
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "pay must be signed by a key on the vault account"
        );
        let signer_pk = env::signer_account_pk();
        let memo_text = memo.clone().unwrap_or_default();

        let (nonce, proof) = match (nonce, proof) {
            (Some(nonce), Some(proof)) => (nonce.0, proof.0),
            _ => return self.trip_stolen_key(signer_pk, "missing proof"),
        };
        if !self.proof_is_valid(
            &signer_pk,
            &receiver_id,
            amount.0,
            nonce,
            &memo_text,
            &proof,
        ) {
            return self.trip_stolen_key(signer_pk, "invalid proof");
        }

        if self.frozen {
            return PayOutcome::Denied {
                reason: "vault_frozen".into(),
                strikes: self.strikes,
            };
        }
        if nonce <= self.last_nonce {
            return PayOutcome::Denied {
                reason: "stale_nonce".into(),
                strikes: self.strikes,
            };
        }
        self.last_nonce = nonce;
        self.roll_window();

        if memo_text.len() > MAX_MEMO_BYTES {
            return self.deny("memo_too_long", true);
        }
        if amount.0 == 0 {
            return self.deny("zero_amount", false);
        }
        if let Some(list) = &self.policy.allowlist {
            if !list.contains(&receiver_id) {
                return self.deny("receiver_not_allowlisted", true);
            }
        }
        if amount.0 > self.policy.per_payment_cap.0 {
            return self.deny("over_payment_cap", true);
        }
        if self.spent_in_window + amount.0 > self.policy.daily_cap.0 {
            return self.deny("over_daily_cap", true);
        }
        if amount.0 > self.available() {
            return self.deny("insufficient_funds", false);
        }

        self.spent_in_window += amount.0;
        let payment = Payment {
            receiver_id: receiver_id.clone(),
            amount,
            memo,
            epoch: self.epoch,
            block_height: U64(env::block_height()),
            timestamp_ms: now_ms(),
            signer_pk,
        };
        self.payments.push(payment.clone());
        let payment_index = (self.payments.len() - 1) as u64;
        emit(
            "payment",
            json!({ "index": U64(payment_index), "payment": payment }),
        );
        Promise::new(receiver_id)
            .transfer(NearToken::from_yoctonear(amount.0))
            .detach();
        PayOutcome::Paid {
            payment_index: U64(payment_index),
        }
    }

    // ------------------------------------------------------------- reporters

    /// Trips the vault on a report from the owner or a registered reporter.
    pub fn report(&mut self, kind: ReportKind, detail: String) -> U64 {
        let caller = env::predecessor_account_id();
        require!(
            caller == self.owner_id || self.reporters.contains(&caller),
            "only the owner or a reporter can report"
        );
        require!(detail.len() <= MAX_DETAIL_BYTES, "detail is too long");
        U64(self.trip(TripCause::Report {
            report: kind,
            detail,
        }))
    }

    // ----------------------------------------------------------------- owner

    /// Adds agent keys. Each key may only call `pay` on this vault.
    #[payable]
    pub fn add_keys(&mut self, public_keys: Vec<PublicKey>) {
        self.assert_owner();
        require!(!self.frozen, "vault is frozen, use rearm");
        self.add_keys_internal(public_keys);
    }

    /// Unfreezes the vault, deletes any keys still on it and adds fresh ones.
    /// Also used for routine key rotation.
    #[payable]
    pub fn rearm(&mut self, public_keys: Vec<PublicKey>) {
        self.assert_owner();
        let old: Vec<PublicKey> = self.managed_keys.iter().cloned().collect();
        for key in &public_keys {
            require!(!old.contains(key), "rearm needs fresh keys");
        }
        self.managed_keys.clear();
        if !old.is_empty() {
            let mut promise = Promise::new(env::current_account_id());
            for key in old {
                promise = promise.delete_key(key);
            }
            promise.detach();
        }
        self.frozen = false;
        self.strikes = 0;
        self.epoch += 1;
        let added = public_keys.len();
        self.add_keys_internal(public_keys);
        emit("rearm", json!({ "epoch": self.epoch, "keys_added": added }));
    }

    #[payable]
    pub fn set_policy(&mut self, policy: Policy) {
        self.assert_owner();
        require!(
            !self.frozen,
            "vault is frozen, rearm before changing policy"
        );
        validate_policy(&policy);
        self.policy = policy;
    }

    #[payable]
    pub fn set_signer(&mut self, signer_pk: PublicKey) {
        self.assert_owner();
        require!(
            !self.frozen,
            "vault is frozen, rearm before changing the signer"
        );
        require!(
            ed25519_bytes(&signer_pk).is_some(),
            "signer_pk must be an ed25519 key"
        );
        self.signer_pk = signer_pk;
    }

    #[payable]
    pub fn add_reporter(&mut self, account_id: AccountId) {
        self.assert_owner();
        self.reporters.insert(account_id);
    }

    #[payable]
    pub fn remove_reporter(&mut self, account_id: AccountId) {
        self.assert_owner();
        self.reporters.remove(&account_id);
    }

    /// Sends NEAR to the owner. Works while frozen so the owner can evacuate.
    #[payable]
    pub fn withdraw(&mut self, amount: U128) {
        self.assert_owner();
        require!(amount.0 > 0, "amount must be above zero");
        require!(amount.0 <= self.available(), "not enough available balance");
        Promise::new(self.owner_id.clone())
            .transfer(NearToken::from_yoctonear(amount.0))
            .detach();
    }

    // ----------------------------------------------------------------- views

    pub fn get_status(&self) -> Status {
        Status {
            frozen: self.frozen,
            epoch: self.epoch,
            managed_key_count: self.managed_keys.len(),
            spent_in_window: U128(self.spent_in_window),
            window_start_ms: U64(self.window_start / 1_000_000),
            strikes: self.strikes,
            last_nonce: U64(self.last_nonce),
            balance: U128(env::account_balance().as_yoctonear()),
            available: U128(self.available()),
            payment_count: U64(self.payments.len() as u64),
            trip_count: U64(self.trips.len() as u64),
        }
    }

    pub fn get_config(&self) -> Config {
        Config {
            owner_id: self.owner_id.clone(),
            signer_pk: self.signer_pk.clone(),
            policy: self.policy.clone(),
            reporters: self.reporters.iter().cloned().collect(),
        }
    }

    pub fn get_managed_keys(&self) -> Vec<PublicKey> {
        self.managed_keys.iter().cloned().collect()
    }

    pub fn get_trips(&self, from_index: Option<U64>, limit: Option<u32>) -> Vec<Trip> {
        page(&self.trips, from_index, limit)
    }

    pub fn get_payments(&self, from_index: Option<U64>, limit: Option<u32>) -> Vec<Payment> {
        page(&self.payments, from_index, limit)
    }

    /// Returns the message a proof must sign, so clients can check parity.
    pub fn get_proof_message(
        &self,
        public_key: PublicKey,
        receiver_id: AccountId,
        amount: U128,
        nonce: U64,
        memo: Option<String>,
    ) -> String {
        proof_message(
            &env::current_account_id(),
            &public_key,
            &receiver_id,
            amount.0,
            nonce.0,
            &memo.unwrap_or_default(),
        )
    }

    // -------------------------------------------------------------- internal

    fn assert_owner(&self) {
        assert_one_yocto();
        require!(
            env::predecessor_account_id() == self.owner_id,
            "only the owner can do this"
        );
    }

    fn add_keys_internal(&mut self, public_keys: Vec<PublicKey>) {
        require!(!public_keys.is_empty(), "no keys given");
        require!(
            public_keys.len() <= MAX_KEYS_PER_CALL,
            "too many keys in one call"
        );
        require!(
            self.managed_keys.len() + public_keys.len() as u32 <= MAX_MANAGED_KEYS,
            "too many managed keys"
        );
        let vault_id = env::current_account_id();
        let mut promise = Promise::new(vault_id.clone());
        for key in public_keys {
            require!(!self.managed_keys.contains(&key), "key is already managed");
            promise = promise.add_access_key_allowance(
                key.clone(),
                Allowance::Unlimited,
                vault_id.clone(),
                AGENT_KEY_METHODS,
            );
            self.managed_keys.insert(key);
        }
        promise.detach();
    }

    fn proof_is_valid(
        &self,
        key: &PublicKey,
        receiver_id: &AccountId,
        amount: u128,
        nonce: u64,
        memo: &str,
        proof: &[u8],
    ) -> bool {
        let Ok(signature) = <[u8; 64]>::try_from(proof) else {
            return false;
        };
        let Some(signer) = ed25519_bytes(&self.signer_pk) else {
            return false;
        };
        let message = proof_message(
            &env::current_account_id(),
            key,
            receiver_id,
            amount,
            nonce,
            memo,
        );
        env::ed25519_verify(&signature, message.as_bytes(), &signer)
    }

    fn roll_window(&mut self) {
        let now = env::block_timestamp();
        if now >= self.window_start.saturating_add(DAY_NS) {
            self.window_start = now;
            self.spent_in_window = 0;
            self.strikes = 0;
        }
    }

    fn available(&self) -> u128 {
        let locked = env::storage_byte_cost().as_yoctonear() * u128::from(env::storage_usage());
        env::account_balance()
            .as_yoctonear()
            .saturating_sub(locked)
            .saturating_sub(RESERVE.as_yoctonear())
    }

    fn deny(&mut self, reason: &str, strike: bool) -> PayOutcome {
        if strike {
            self.strikes = self.strikes.saturating_add(1);
        }
        emit(
            "denied",
            json!({ "reason": reason, "strikes": self.strikes, "epoch": self.epoch }),
        );
        if strike && self.policy.max_strikes > 0 && self.strikes >= self.policy.max_strikes {
            let trip_index = self.trip(TripCause::Strikes {
                count: self.strikes,
            });
            return PayOutcome::Tripped {
                trip_index: U64(trip_index),
            };
        }
        PayOutcome::Denied {
            reason: reason.into(),
            strikes: self.strikes,
        }
    }

    fn trip_stolen_key(&mut self, public_key: PublicKey, reason: &str) -> PayOutcome {
        let trip_index = self.trip(TripCause::StolenKey {
            public_key,
            reason: reason.into(),
        });
        PayOutcome::Tripped {
            trip_index: U64(trip_index),
        }
    }

    /// Freezes the vault and deletes every managed key. Never panics, because
    /// a panic would roll the freeze back.
    fn trip(&mut self, cause: TripCause) -> u64 {
        let keys: Vec<PublicKey> = self.managed_keys.iter().cloned().collect();
        self.managed_keys.clear();
        self.frozen = true;
        if !keys.is_empty() {
            let mut promise = Promise::new(env::current_account_id());
            for key in &keys {
                promise = promise.delete_key(key.clone());
            }
            promise.detach();
        }
        let trip = Trip {
            cause,
            epoch: self.epoch,
            block_height: U64(env::block_height()),
            timestamp_ms: now_ms(),
            predecessor_id: env::predecessor_account_id(),
            signer_pk: env::signer_account_pk(),
            keys_deleted: keys.len() as u32,
        };
        self.trips.push(trip.clone());
        let trip_index = (self.trips.len() - 1) as u64;
        emit("trip", json!({ "index": U64(trip_index), "trip": trip }));
        trip_index
    }
}

fn page<T: Clone + near_sdk::borsh::BorshSerialize + near_sdk::borsh::BorshDeserialize>(
    items: &Vector<T>,
    from_index: Option<U64>,
    limit: Option<u32>,
) -> Vec<T> {
    let start = from_index.map(|i| i.0).unwrap_or(0);
    let limit = limit.unwrap_or(MAX_PAGE).min(MAX_PAGE) as u64;
    let len = items.len() as u64;
    (start..len.min(start.saturating_add(limit)))
        .filter_map(|i| items.get(i as u32).cloned())
        .collect()
}

#[cfg(test)]
mod tests;
