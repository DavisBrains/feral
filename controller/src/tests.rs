use super::*;
use near_sdk::{test_utils::VMContextBuilder, testing_env};
fn id(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn hash(n: u8) -> String {
    format!("{n:064x}")
}
fn ctx(predecessor: &str, deposit: u128) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(id("feral.test"))
        .predecessor_account_id(id(predecessor))
        .account_balance(NearToken::from_near(100))
        .attached_deposit(NearToken::from_yoctonear(deposit));
    testing_env!(b.build());
}
fn setup() -> Controller {
    ctx("owner.test", 0);
    let mut c = Controller::new(id("owner.test"));
    c.register(id("a.test"), U128(250), hash(1));
    c.register(id("b.test"), U128(145), hash(2));
    c.register(id("c.test"), U128(5), hash(3));
    c
}
fn conserved(c: &Controller) {
    let sum: u128 = c.creatures.keys().map(|id| c.balance(&id)).sum();
    assert_eq!(sum + c.balance(&id("feral.test")), c.token.total_supply);
    assert_eq!(c.token.total_supply + c.burned, 1000);
    assert_eq!(
        c.balance(&id("feral.test")),
        c.market + c.pending_munch + c.job_escrow
    );
}
#[test]
fn paper_playthrough() {
    let mut c = setup();
    conserved(&c);
    c.set_demand(1);
    c.tick(1);
    assert!(!c.creature(id("c.test")).unwrap().active);
    assert_eq!(c.token.total_supply, 980);
    conserved(&c);
    c.pay_creature(
        id("a.test"),
        id("b.test"),
        U128(30),
        "translation-1".into(),
        hash(4),
    );
    conserved(&c);
    c.create_job("card-1".into(), U128(90), 3, hash(5));
    c.claim_job(id("a.test"), "card-1".into());
    c.settle_job("card-1".into(), hash(6));
    assert_eq!(c.balance(&id("a.test")), 300);
    conserved(&c);
    c.creatures.get(&id("a.test")).unwrap();
    let mut a = c.creatures.get(&id("a.test")).unwrap();
    a.native_reserve = U128(MIN_CHILD_NEAR * 2);
    c.creatures.insert(&id("a.test"), &a);
    let _p = c.birth(
        id("a.test"),
        id("kid.feral.test"),
        1,
        U128(MIN_CHILD_NEAR),
        hash(7),
        1,
    );
    assert_eq!(c.balance(&id("a.test")), 200);
    assert_eq!(c.pending_munch, 100);
    conserved(&c);
    c.complete_birth(id("kid.feral.test"), 1, true);
    conserved(&c);
    c.tick(2);
    assert_eq!(c.balance(&id("a.test")), 190);
    assert_eq!(c.balance(&id("b.test")), 155);
    assert_eq!(c.balance(&id("c.test")), 5);
    assert_eq!(c.balance(&id("kid.feral.test")), 90);
    assert_eq!(c.token.total_supply, 950);
    conserved(&c);
}
#[test]
fn failed_birth_refunds_even_if_parent_dies() {
    let mut c = setup();
    let mut a = c.creatures.get(&id("a.test")).unwrap();
    a.native_reserve = U128(MIN_CHILD_NEAR);
    c.creatures.insert(&id("a.test"), &a);
    let _p = c.birth(
        id("a.test"),
        id("kid.feral.test"),
        1,
        U128(MIN_CHILD_NEAR),
        hash(7),
        1,
    );
    for t in 1..=16 {
        c.tick(t);
    }
    assert!(!c.creature(id("a.test")).unwrap().active);
    c.complete_birth(id("kid.feral.test"), 1, false);
    assert!(!c.creature(id("a.test")).unwrap().active);
    assert_eq!(
        c.creature(id("a.test")).unwrap().native_reserve.0,
        MIN_CHILD_NEAR
    );
    assert_eq!(c.balance(&id("a.test")), 100);
    conserved(&c);
}
#[test]
fn successful_cleanup_after_parent_death() {
    let mut c = setup();
    let mut a = c.creatures.get(&id("a.test")).unwrap();
    a.native_reserve = U128(MIN_CHILD_NEAR);
    c.creatures.insert(&id("a.test"), &a);
    let _p = c.birth(
        id("a.test"),
        id("kid.feral.test"),
        1,
        U128(MIN_CHILD_NEAR),
        hash(7),
        1,
    );
    for t in 1..=16 {
        c.tick(t);
    }
    c.complete_birth(id("kid.feral.test"), 1, true);
    assert!(c.creature(id("kid.feral.test")).unwrap().active);
    assert!(!c.creature(id("a.test")).unwrap().active);
    conserved(&c);
}
#[test]
#[should_panic(expected = "extinct")]
fn dead_cannot_pay() {
    let mut c = setup();
    c.tick(1);
    c.pay_creature(
        id("c.test"),
        id("a.test"),
        U128(1),
        "attack".into(),
        hash(8),
    );
}
#[test]
fn deposit_does_not_revive() {
    let mut c = setup();
    c.tick(1);
    c.move_token(&id("a.test"), &id("c.test"), 50);
    c.tick(2);
    assert!(!c.creature(id("c.test")).unwrap().active);
    assert_eq!(c.balance(&id("c.test")), 55);
}
#[test]
#[should_panic(expected = "turn sequence")]
fn repeated_tick_refused() {
    let mut c = setup();
    c.tick(1);
    c.tick(1);
}
#[test]
#[should_panic(expected = "service replay")]
fn service_replay_refused() {
    let mut c = setup();
    for _ in 0..2 {
        c.pay_creature(id("a.test"), id("b.test"), U128(30), "same".into(), hash(8));
    }
}
#[test]
#[should_panic(expected = "job not live")]
fn job_replay_refused() {
    let mut c = setup();
    c.create_job("card".into(), U128(90), 3, hash(5));
    c.claim_job(id("a.test"), "card".into());
    c.settle_job("card".into(), hash(6));
    c.settle_job("card".into(), hash(6));
}
#[test]
#[should_panic(expected = "owner only")]
fn unauthorized_tick_refused() {
    let mut c = setup();
    ctx("attacker.test", 0);
    c.tick(1);
}
#[test]
#[should_panic(expected = "birth already resolved or nonce")]
fn callback_duplicate_refused() {
    let mut c = setup();
    let mut a = c.creatures.get(&id("a.test")).unwrap();
    a.native_reserve = U128(MIN_CHILD_NEAR);
    c.creatures.insert(&id("a.test"), &a);
    let _p = c.birth(
        id("a.test"),
        id("kid.feral.test"),
        1,
        U128(MIN_CHILD_NEAR),
        hash(7),
        1,
    );
    c.complete_birth(id("kid.feral.test"), 1, true);
    c.complete_birth(id("kid.feral.test"), 1, false);
}
#[test]
#[should_panic(expected = "child ID used")]
fn duplicate_birth_refused() {
    let mut c = setup();
    let mut a = c.creatures.get(&id("a.test")).unwrap();
    a.native_reserve = U128(MIN_CHILD_NEAR * 2);
    c.creatures.insert(&id("a.test"), &a);
    let _p = c.birth(
        id("a.test"),
        id("kid.feral.test"),
        1,
        U128(MIN_CHILD_NEAR),
        hash(7),
        1,
    );
    let _p = c.birth(
        id("a.test"),
        id("kid.feral.test"),
        2,
        U128(MIN_CHILD_NEAR),
        hash(8),
        2,
    );
}
#[test]
#[should_panic(expected = "insufficient MUNCH")]
fn underflow_refused() {
    let mut c = setup();
    c.pay_creature(
        id("a.test"),
        id("b.test"),
        U128(u128::MAX),
        "huge".into(),
        hash(8),
    );
}

#[test]
fn exactly_ten_survives_once_then_dies() {
    let mut c = setup();
    c.move_token(&id("a.test"), &id("c.test"), 5);
    c.tick(1);
    assert!(c.creature(id("c.test")).unwrap().active);
    assert_eq!(c.balance(&id("c.test")), 0);
    c.tick(2);
    assert!(!c.creature(id("c.test")).unwrap().active);
    conserved(&c);
}
#[test]
#[should_panic(expected = "birth reserves")]
fn reserved_money_cannot_fund_second_birth() {
    let mut c = setup();
    let mut a = c.creatures.get(&id("a.test")).unwrap();
    a.native_reserve = U128(MIN_CHILD_NEAR * 2);
    c.creatures.insert(&id("a.test"), &a);
    let _p = c.birth(
        id("a.test"),
        id("kid.feral.test"),
        1,
        U128(MIN_CHILD_NEAR),
        hash(7),
        1,
    );
    c.complete_birth(id("kid.feral.test"), 1, true);
    c.pay_creature(id("a.test"), id("b.test"), U128(40), "help".into(), hash(8));
    let _p = c.birth(
        id("a.test"),
        id("kid2.feral.test"),
        2,
        U128(MIN_CHILD_NEAR),
        hash(9),
        2,
    );
}
#[test]
#[should_panic(expected = "job not live")]
fn stale_demand_cannot_pay() {
    let mut c = setup();
    c.create_job("card".into(), U128(90), 3, hash(5));
    c.claim_job(id("a.test"), "card".into());
    c.set_demand(1);
    c.settle_job("card".into(), hash(6));
}
#[test]
#[should_panic]
fn native_overflow_refused() {
    let mut c = setup();
    let mut a = c.creatures.get(&id("a.test")).unwrap();
    a.native_reserve = U128(u128::MAX);
    c.creatures.insert(&id("a.test"), &a);
    ctx("owner.test", 1);
    c.deposit_native(id("a.test"));
}
