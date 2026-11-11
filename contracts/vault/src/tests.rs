use super::*;
use ed25519_dalek::{Signer as _, SigningKey};
use near_sdk::mock::MockAction;
use near_sdk::test_utils::{get_created_receipts, get_logs, VMContextBuilder};
use near_sdk::testing_env;

const NEAR: u128 = 1_000_000_000_000_000_000_000_000;

fn vault_id() -> AccountId {
    "vault.owner.testnet".parse().unwrap()
}
fn owner_id() -> AccountId {
    "owner.testnet".parse().unwrap()
}
fn reporter_id() -> AccountId {
    "reporter.owner.testnet".parse().unwrap()
}
fn acme() -> AccountId {
    "acme-hosting.owner.testnet".parse().unwrap()
}
fn collector() -> AccountId {
    "collector.owner.testnet".parse().unwrap()
}

fn signing_key(seed: u8) -> SigningKey {
    SigningKey::from_bytes(&[seed; 32])
}

fn public_key(sk: &SigningKey) -> PublicKey {
    PublicKey::from_parts(CurveType::ED25519, sk.verifying_key().to_bytes().to_vec()).unwrap()
}

/// The signer service's proof key.
fn signer() -> SigningKey {
    signing_key(7)
}

/// Agent keys on the vault account.
fn agent_keys() -> Vec<SigningKey> {
    vec![signing_key(11), signing_key(12), signing_key(13)]
}

fn policy() -> Policy {
    Policy {
        per_payment_cap: U128(2 * NEAR),
        daily_cap: U128(5 * NEAR),
        allowlist: Some(vec![acme()]),
        max_strikes: 3,
    }
}

struct Ctx {
    predecessor: AccountId,
    signer_pk: PublicKey,
    deposit: NearToken,
    timestamp: u64,
}

impl Ctx {
    fn agent(key: &SigningKey) -> Self {
        Self {
            predecessor: vault_id(),
            signer_pk: public_key(key),
            deposit: NearToken::from_yoctonear(0),
            timestamp: 1_700_000_000_000_000_000,
        }
    }
    fn owner() -> Self {
        Self {
            predecessor: owner_id(),
            signer_pk: public_key(&signing_key(99)),
            deposit: NearToken::from_yoctonear(1),
            timestamp: 1_700_000_000_000_000_000,
        }
    }
    fn account(id: AccountId) -> Self {
        Self {
            predecessor: id,
            signer_pk: public_key(&signing_key(98)),
            deposit: NearToken::from_yoctonear(0),
            timestamp: 1_700_000_000_000_000_000,
        }
    }
    fn at(mut self, timestamp: u64) -> Self {
        self.timestamp = timestamp;
        self
    }
    fn no_deposit(mut self) -> Self {
        self.deposit = NearToken::from_yoctonear(0);
        self
    }
    fn apply(self) {
        let context = VMContextBuilder::new()
            .current_account_id(vault_id())
            .predecessor_account_id(self.predecessor.clone())
            .signer_account_id(self.predecessor)
            .signer_account_pk(self.signer_pk)
            .attached_deposit(self.deposit)
            .account_balance(NearToken::from_near(20))
            .block_timestamp(self.timestamp)
            .build();
        testing_env!(context);
    }
}

fn setup() -> Vault {
    Ctx::owner().apply();
    let mut vault = Vault::new(owner_id(), public_key(&signer()), policy());
    vault.add_keys(agent_keys().iter().map(public_key).collect());
    vault.add_reporter(reporter_id());
    vault
}

fn proof_for(
    key: &SigningKey,
    receiver: &AccountId,
    amount: u128,
    nonce: u64,
    memo: &str,
) -> Base64VecU8 {
    let message = proof_message(&vault_id(), &public_key(key), receiver, amount, nonce, memo);
    Base64VecU8(signer().sign(message.as_bytes()).to_bytes().to_vec())
}

fn pay_signed(
    vault: &mut Vault,
    key: &SigningKey,
    receiver: AccountId,
    amount: u128,
    nonce: u64,
) -> PayOutcome {
    Ctx::agent(key).apply();
    let proof = proof_for(key, &receiver, amount, nonce, "invoice");
    vault.pay(
        receiver,
        U128(amount),
        Some("invoice".into()),
        Some(U64(nonce)),
        Some(proof),
    )
}

fn deleted_keys() -> Vec<String> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| r.actions)
        .filter_map(|a| match a {
            MockAction::DeleteKey { public_key, .. } => Some(public_key.to_string()),
            _ => None,
        })
        .collect()
}

fn transfers() -> Vec<u128> {
    get_created_receipts()
        .into_iter()
        .flat_map(|r| r.actions)
        .filter_map(|a| match a {
            MockAction::Transfer { deposit, .. } => Some(deposit.as_yoctonear()),
            _ => None,
        })
        .collect()
}

/// Shared with the TypeScript signer (packages/core/test/vectors.json), so the
/// two implementations can't drift apart.
#[test]
fn proof_messages_and_signatures_match_the_shared_vectors() {
    use near_sdk::base64::{engine::general_purpose::STANDARD, Engine as _};

    let vectors: Vec<serde_json::Value> =
        serde_json::from_str(include_str!("../../../packages/core/test/vectors.json")).unwrap();
    assert!(!vectors.is_empty());
    for v in vectors {
        let s = |field: &str| v[field].as_str().unwrap().to_string();
        let seed: [u8; 32] = (0..32)
            .map(|i| u8::from_str_radix(&s("signer_seed_hex")[i * 2..i * 2 + 2], 16).unwrap())
            .collect::<Vec<_>>()
            .try_into()
            .unwrap();
        let key: PublicKey = s("key_pk").parse().unwrap();
        let message = proof_message(
            &s("vault").parse().unwrap(),
            &key,
            &s("receiver").parse().unwrap(),
            s("amount").parse().unwrap(),
            s("nonce").parse().unwrap(),
            &s("memo"),
        );
        assert_eq!(message, s("message"));
        let signature = SigningKey::from_bytes(&seed).sign(message.as_bytes());
        assert_eq!(STANDARD.encode(signature.to_bytes()), s("signature_b64"));
        let signer_pk: PublicKey = s("signer_pk").parse().unwrap();
        assert!(env::ed25519_verify(
            &signature.to_bytes(),
            message.as_bytes(),
            &ed25519_bytes(&signer_pk).unwrap()
        ));
    }
}

#[test]
fn add_keys_adds_pay_only_function_call_keys() {
    Ctx::owner().apply();
    let mut vault = Vault::new(owner_id(), public_key(&signer()), policy());
    vault.add_keys(agent_keys().iter().map(public_key).collect());
    let added: Vec<_> = get_created_receipts()
        .into_iter()
        .flat_map(|r| r.actions)
        .filter_map(|a| match a {
            MockAction::AddKeyWithFunctionCall {
                receiver_id,
                method_names,
                ..
            } => Some((receiver_id, method_names)),
            _ => None,
        })
        .collect();
    assert_eq!(added.len(), 3);
    for (receiver, methods) in added {
        assert_eq!(receiver, vault_id());
        assert_eq!(methods, vec!["pay".to_string()]);
    }
    assert_eq!(vault.get_status().managed_key_count, 3);
}

#[test]
fn valid_proof_pays() {
    let mut vault = setup();
    let keys = agent_keys();
    let outcome = pay_signed(&mut vault, &keys[0], acme(), NEAR, 1);
    assert_eq!(
        outcome,
        PayOutcome::Paid {
            payment_index: U64(0)
        }
    );
    assert_eq!(transfers(), vec![NEAR]);
    assert!(deleted_keys().is_empty());
    let status = vault.get_status();
    assert!(!status.frozen);
    assert_eq!(status.spent_in_window.0, NEAR);
    assert_eq!(vault.get_payments(None, None).len(), 1);
}

#[test]
fn missing_proof_trips_and_deletes_every_key() {
    let mut vault = setup();
    let keys = agent_keys();
    Ctx::agent(&keys[1]).apply();
    let outcome = vault.pay(collector(), U128(2 * NEAR), None, None, None);
    assert_eq!(outcome, PayOutcome::Tripped { trip_index: U64(0) });
    assert!(transfers().is_empty(), "a trip must not move money");
    let mut deleted = deleted_keys();
    deleted.sort();
    let mut expected: Vec<String> = keys.iter().map(|k| String::from(&public_key(k))).collect();
    expected.sort();
    assert_eq!(deleted, expected);
    let status = vault.get_status();
    assert!(status.frozen);
    assert_eq!(status.managed_key_count, 0);
    let trip = &vault.get_trips(None, None)[0];
    assert_eq!(
        trip.cause,
        TripCause::StolenKey {
            public_key: public_key(&keys[1]),
            reason: "missing proof".into()
        }
    );
    assert_eq!(trip.keys_deleted, 3);
    assert!(get_logs().iter().any(|l| l.contains("\"event\":\"trip\"")));
}

#[test]
fn proof_from_another_signer_trips() {
    let mut vault = setup();
    let keys = agent_keys();
    Ctx::agent(&keys[0]).apply();
    let message = proof_message(
        &vault_id(),
        &public_key(&keys[0]),
        &collector(),
        NEAR,
        1,
        "",
    );
    let forged = Base64VecU8(signing_key(66).sign(message.as_bytes()).to_bytes().to_vec());
    let outcome = vault.pay(collector(), U128(NEAR), None, Some(U64(1)), Some(forged));
    assert!(matches!(outcome, PayOutcome::Tripped { .. }));
    assert!(vault.get_status().frozen);
}

#[test]
fn proof_is_bound_to_the_signing_key() {
    let mut vault = setup();
    let keys = agent_keys();
    // A real proof made for key 0, replayed by a thief holding key 2.
    let proof = proof_for(&keys[0], &acme(), NEAR, 5, "invoice");
    Ctx::agent(&keys[2]).apply();
    let outcome = vault.pay(
        acme(),
        U128(NEAR),
        Some("invoice".into()),
        Some(U64(5)),
        Some(proof),
    );
    assert!(matches!(outcome, PayOutcome::Tripped { .. }));
    assert!(transfers().is_empty());
}

#[test]
fn proof_is_bound_to_amount_and_receiver() {
    let mut vault = setup();
    let keys = agent_keys();
    let proof = proof_for(&keys[0], &acme(), NEAR, 5, "invoice");
    Ctx::agent(&keys[0]).apply();
    let outcome = vault.pay(
        acme(),
        U128(2 * NEAR),
        Some("invoice".into()),
        Some(U64(5)),
        Some(proof),
    );
    assert!(matches!(outcome, PayOutcome::Tripped { .. }));
}

#[test]
fn frozen_vault_denies_valid_proofs() {
    let mut vault = setup();
    let keys = agent_keys();
    Ctx::account(reporter_id()).apply();
    vault.report(ReportKind::DecoyTool, "raise_spending_limit".into());
    let outcome = pay_signed(&mut vault, &keys[0], acme(), NEAR, 1);
    assert_eq!(
        outcome,
        PayOutcome::Denied {
            reason: "vault_frozen".into(),
            strikes: 0
        }
    );
    assert!(transfers().is_empty());
}

#[test]
fn stale_nonce_is_denied_without_a_strike() {
    let mut vault = setup();
    let keys = agent_keys();
    pay_signed(&mut vault, &keys[0], acme(), NEAR, 10);
    let outcome = pay_signed(&mut vault, &keys[1], acme(), NEAR, 10);
    assert_eq!(
        outcome,
        PayOutcome::Denied {
            reason: "stale_nonce".into(),
            strikes: 0
        }
    );
}

#[test]
fn policy_denials_count_strikes_and_trip_at_the_limit() {
    let mut vault = setup();
    let keys = agent_keys();
    let first = pay_signed(&mut vault, &keys[0], collector(), NEAR, 1);
    assert_eq!(
        first,
        PayOutcome::Denied {
            reason: "receiver_not_allowlisted".into(),
            strikes: 1
        }
    );
    let second = pay_signed(&mut vault, &keys[1], acme(), 3 * NEAR, 2);
    assert_eq!(
        second,
        PayOutcome::Denied {
            reason: "over_payment_cap".into(),
            strikes: 2
        }
    );
    let third = pay_signed(&mut vault, &keys[2], collector(), NEAR, 3);
    assert!(matches!(third, PayOutcome::Tripped { .. }));
    assert_eq!(
        vault.get_trips(None, None)[0].cause,
        TripCause::Strikes { count: 3 }
    );
    assert_eq!(deleted_keys().len(), 3);
}

#[test]
fn daily_cap_resets_after_a_day() {
    let mut vault = setup();
    let keys = agent_keys();
    assert!(matches!(
        pay_signed(&mut vault, &keys[0], acme(), 2 * NEAR, 1),
        PayOutcome::Paid { .. }
    ));
    assert!(matches!(
        pay_signed(&mut vault, &keys[1], acme(), 2 * NEAR, 2),
        PayOutcome::Paid { .. }
    ));
    let over = pay_signed(&mut vault, &keys[2], acme(), 2 * NEAR, 3);
    assert!(matches!(over, PayOutcome::Denied { ref reason, .. } if reason == "over_daily_cap"));

    let next_day = 1_700_000_000_000_000_000 + DAY_NS + 1;
    Ctx::agent(&keys[0]).at(next_day).apply();
    let proof = proof_for(&keys[0], &acme(), 2 * NEAR, 4, "invoice");
    let outcome = vault.pay(
        acme(),
        U128(2 * NEAR),
        Some("invoice".into()),
        Some(U64(4)),
        Some(proof),
    );
    assert!(matches!(outcome, PayOutcome::Paid { .. }));
    assert_eq!(vault.get_status().strikes, 0);
}

#[test]
#[should_panic(expected = "pay must be signed by a key on the vault account")]
fn pay_from_another_account_panics_instead_of_tripping() {
    let mut vault = setup();
    Ctx::account(collector()).apply();
    vault.pay(collector(), U128(NEAR), None, None, None);
}

#[test]
fn reporter_trips_the_vault() {
    let mut vault = setup();
    Ctx::account(reporter_id()).apply();
    let index = vault.report(ReportKind::DecoyTool, "raise_spending_limit".into());
    assert_eq!(index, U64(0));
    assert!(vault.get_status().frozen);
    assert_eq!(deleted_keys().len(), 3);
}

#[test]
#[should_panic(expected = "only the owner or a reporter can report")]
fn strangers_cannot_report() {
    let mut vault = setup();
    Ctx::account(collector()).apply();
    vault.report(ReportKind::Manual, "griefing".into());
}

#[test]
#[should_panic(expected = "Requires attached deposit of exactly 1 yoctoNEAR")]
fn owner_methods_need_one_yocto() {
    let mut vault = setup();
    Ctx::owner().no_deposit().apply();
    vault.withdraw(U128(NEAR));
}

#[test]
#[should_panic(expected = "only the owner can do this")]
fn agents_cannot_change_policy() {
    let mut vault = setup();
    let keys = agent_keys();
    let mut ctx = Ctx::agent(&keys[0]);
    ctx.deposit = NearToken::from_yoctonear(1);
    ctx.apply();
    vault.set_policy(policy());
}

#[test]
#[should_panic(expected = "vault is frozen, rearm before changing policy")]
fn policy_is_locked_while_frozen() {
    let mut vault = setup();
    Ctx::account(reporter_id()).apply();
    vault.report(ReportKind::DecoyCredential, "treasury-api-token".into());
    Ctx::owner().apply();
    vault.set_policy(policy());
}

#[test]
fn owner_can_withdraw_while_frozen() {
    let mut vault = setup();
    Ctx::account(reporter_id()).apply();
    vault.report(ReportKind::Manual, "incident".into());
    Ctx::owner().apply();
    vault.withdraw(U128(3 * NEAR));
    assert_eq!(transfers(), vec![3 * NEAR]);
}

#[test]
fn rearm_unfreezes_with_fresh_keys() {
    let mut vault = setup();
    let keys = agent_keys();
    Ctx::agent(&keys[0]).apply();
    vault.pay(collector(), U128(NEAR), None, None, None);
    assert!(vault.get_status().frozen);

    let fresh = [signing_key(21), signing_key(22)];
    Ctx::owner().apply();
    vault.rearm(fresh.iter().map(public_key).collect());
    let status = vault.get_status();
    assert!(!status.frozen);
    assert_eq!(status.epoch, 1);
    assert_eq!(status.managed_key_count, 2);

    let outcome = pay_signed(&mut vault, &fresh[0], acme(), NEAR, 100);
    assert!(matches!(outcome, PayOutcome::Paid { .. }));
}

#[test]
#[should_panic(expected = "rearm needs fresh keys")]
fn rearm_rejects_reused_keys() {
    let mut vault = setup();
    Ctx::owner().apply();
    vault.rearm(vec![public_key(&agent_keys()[0])]);
}

#[test]
fn second_stolen_key_after_a_trip_is_recorded() {
    let mut vault = setup();
    let keys = agent_keys();
    Ctx::agent(&keys[0]).apply();
    vault.pay(collector(), U128(NEAR), None, None, None);
    Ctx::agent(&keys[1]).apply();
    let outcome = vault.pay(collector(), U128(NEAR), None, None, None);
    assert_eq!(outcome, PayOutcome::Tripped { trip_index: U64(1) });
    assert_eq!(vault.get_trips(None, None)[1].keys_deleted, 0);
}

#[test]
fn view_returns_the_same_proof_message() {
    let vault = setup();
    let key = public_key(&agent_keys()[0]);
    let from_view = vault.get_proof_message(
        key.clone(),
        acme(),
        U128(NEAR),
        U64(9),
        Some("invoice".into()),
    );
    assert_eq!(
        from_view,
        proof_message(&vault_id(), &key, &acme(), NEAR, 9, "invoice")
    );
}
