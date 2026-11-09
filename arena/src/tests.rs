use super::*;
use near_sdk::{PromiseResult, test_utils::VMContextBuilder, testing_env};
fn id(s: &str) -> AccountId { s.parse().unwrap() }
const ME: &str = "play.test";
const KEEPER: &str = "keeper.test";
fn ctx(pred: &str) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(id(ME)).predecessor_account_id(id(pred)).account_balance(NearToken::from_near(10));
    testing_env!(b.build());
}
fn results(r: Vec<PromiseResult>) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(id(ME)).predecessor_account_id(id(ME)).account_balance(NearToken::from_near(10));
    testing_env!(b.build(), near_sdk::test_vm_config(), near_sdk::RuntimeFeesConfig::test(), Default::default(), r);
}
fn ok() -> PromiseResult { PromiseResult::Successful(vec![]) }
fn pilot() -> String { "ab".repeat(32) }
fn h(n: u8) -> String { format!("{n:064x}") }
fn moss(s: u32) -> AccountId { id(&format!("s{s}-moss.{ME}")) }
fn echo(s: u32) -> AccountId { id(&format!("s{s}-echo.{ME}")) }
fn ash(s: u32) -> AccountId { id(&format!("s{s}-ash.{ME}")) }
fn season(a: &mut Arena, target: u64, budget: u128) {
    ctx(KEEPER);
    let _ = a.start_season(pilot(), target, U128(budget));
    results(vec![ok(), ok(), ok()]);
    assert!(a.on_founders(a.current));
    ctx(KEEPER);
}
fn setup() -> Arena {
    ctx(KEEPER);
    let mut a = Arena::new(id(KEEPER));
    season(&mut a, 6, 150);
    a
}
/// Every MUNCH is somewhere: creatures plus the arena's pools equal supply,
/// and minted minus burned equals supply.
fn conserved(a: &Arena) {
    let s = a.season_ref();
    let lives: u128 = s.lives.iter().map(|i| a.balance(i)).sum();
    let own = a.balance(&id(ME));
    assert_eq!(own, s.market.0 + s.escrow.0 + s.budget_left.0 + s.pending.0, "arena pools");
    assert_eq!(lives + own, a.token.total_supply, "supply");
    assert_eq!(a.minted - a.burned_total, a.token.total_supply, "minted minus burned");
}
fn bal(a: &Arena, i: &AccountId) -> u128 { a.balance(i) }

#[test]
fn season_seeds_three_founders_and_budget() {
    let a = setup();
    let s = a.season_ref();
    assert_eq!(s.status, "live");
    assert_eq!((bal(&a, &moss(1)), bal(&a, &echo(1)), bal(&a, &ash(1))), (70, 50, 30));
    assert_eq!(s.budget_left.0, 150);
    assert_eq!(s.market.0, 1000 - 150 - 150);
    assert_eq!(a.lives_nft.owner_by_id.get(&moss(1).to_string()), Some(id(KEEPER)));
    conserved(&a);
}
#[test]
fn founders_failure_returns_seed_to_market() {
    ctx(KEEPER);
    let mut a = Arena::new(id(KEEPER));
    let _ = a.start_season(pilot(), 6, U128(150));
    results(vec![ok(), PromiseResult::Failed, ok()]);
    assert!(!a.on_founders(1));
    assert_eq!(a.season_ref().status, "failed");
    conserved(&a);
    ctx(KEEPER);
    a.close_season("retry".into());
    assert_eq!(a.token.total_supply, 0);
}
#[test]
#[should_panic(expected = "founders resolved")]
fn founder_callback_replay_refused() {
    let mut a = setup();
    results(vec![ok(), ok(), ok()]);
    a.on_founders(1);
}
#[test]
fn ash_burns_down_on_old_demand_then_dies() {
    let mut a = setup();
    a.set_demand(1); // the visitor's demand shock
    for t in 1..=3 { a.tick(); assert_eq!(bal(&a, &ash(1)), 30 - 10 * t); }
    assert!(a.lives.get(&ash(1)).unwrap().active);
    a.tick();
    let l = a.lives.get(&ash(1)).unwrap();
    assert!(!l.active);
    assert_eq!(l.died_turn, Some(4));
    conserved(&a);
}
#[test]
#[should_panic(expected = "extinct")]
fn dead_creature_cannot_bid() {
    let mut a = setup();
    for _ in 0..4 { a.tick(); }
    a.post_job("j1".into(), U128(60), false, 2);
    a.bid(ash(1), "j1".into(), U128(40));
}
#[test]
fn bilingual_job_needs_paid_translation_and_lowest_bid_wins() {
    let mut a = setup();
    a.set_demand(1);
    a.post_job("v1".into(), U128(80), true, 2);
    assert_eq!(a.season_ref().budget_left.0, 70);
    a.bid(moss(1), "v1".into(), U128(70));
    let w = a.award("v1".into());
    assert_eq!(w, moss(1));
    a.buy_translation("v1".into(), echo(1), h(1));
    assert_eq!((bal(&a, &moss(1)), bal(&a, &echo(1))), (40, 80));
    a.settle("v1".into(), h(2));
    assert_eq!(bal(&a, &moss(1)), 110);
    assert_eq!(a.season_ref().budget_left.0, 80); // 10 unspent reward returns to the visitor
    conserved(&a);
}
#[test]
#[should_panic(expected = "bilingual card needs a paid translation")]
fn bilingual_settle_without_translation_refused() {
    let mut a = setup();
    a.set_demand(1);
    a.post_job("v1".into(), U128(80), true, 2);
    a.bid(moss(1), "v1".into(), U128(60));
    a.award("v1".into());
    a.settle("v1".into(), h(2));
}
#[test]
fn several_bidders_lowest_wins_on_short_job() {
    let mut a = setup();
    a.post_job("s1".into(), U128(70), true, 2);
    a.bid(moss(1), "s1".into(), U128(60));
    a.bid(ash(1), "s1".into(), U128(40));
    assert_eq!(a.award("s1".into()), ash(1));
    a.settle("s1".into(), h(3));
    assert_eq!(bal(&a, &ash(1)), 70);
    conserved(&a);
}
#[test]
#[should_panic(expected = "policy does not take this job")]
fn translator_cannot_bid_on_cards() {
    let mut a = setup();
    a.post_job("s1".into(), U128(70), true, 2);
    a.bid(echo(1), "s1".into(), U128(40));
}
#[test]
#[should_panic(expected = "bid bounds")]
fn bid_below_policy_floor_refused() {
    let mut a = setup();
    a.post_job("s1".into(), U128(70), true, 2);
    a.bid(ash(1), "s1".into(), U128(30));
}
#[test]
fn demand_change_cancels_old_job_back_to_payer() {
    let mut a = setup();
    a.post_job("s1".into(), U128(70), true, 2);
    a.set_demand(1);
    a.cancel_job("s1".into());
    assert_eq!(a.season_ref().budget_left.0, 150);
    conserved(&a);
}
#[test]
#[should_panic(expected = "visitor budget exhausted")]
fn visitor_budget_is_enforced_on_chain() {
    let mut a = setup();
    for _ in 0..3 { a.sponsor(moss(1), U128(50)); }
    a.feed(moss(1));
}
#[test]
fn feed_and_sponsor_move_budget_to_creature() {
    let mut a = setup();
    a.feed(ash(1));
    a.sponsor(echo(1), U128(40));
    assert_eq!((bal(&a, &ash(1)), bal(&a, &echo(1))), (40, 90));
    assert_eq!(a.season_ref().budget_left.0, 100);
    conserved(&a);
}
#[test]
#[should_panic(expected = "life NFT holder only")]
fn non_holder_cannot_sponsor() {
    let mut a = setup();
    ctx("intruder.test");
    a.sponsor(moss(1), U128(20));
}
#[test]
#[should_panic(expected = "owner only")]
fn visitor_cannot_tick_directly() {
    let mut a = setup();
    ctx("intruder.test");
    a.tick();
}
#[test]
fn birth_derives_parent_policy_plus_one_change() {
    let mut a = setup();
    a.sponsor(moss(1), U128(60)); // 130 >= floor 120
    let parent = a.lives.get(&moss(1)).unwrap().genome;
    let _ = a.birth(moss(1), 0);
    results(vec![ok()]);
    let child = id(&format!("s1-moss-k1.{ME}"));
    assert!(a.on_birth(moss(1), child.clone(), 1, 0));
    let c = a.lives.get(&child).unwrap();
    assert_eq!(c.genome, Genome { price: parent.price - 1, ..parent });
    assert_eq!(c.lineage, moss(1));
    assert_eq!(c.parent, Some(moss(1)));
    assert_eq!(c.strategy_hash, c.genome.hash());
    assert_eq!((bal(&a, &moss(1)), bal(&a, &child)), (70, 60));
    assert_eq!(a.lives_nft.owner_by_id.get(&child.to_string()), Some(id(KEEPER)));
    conserved(&a);
    // differs in exactly one gene
    let diff = (c.genome.job != parent.job) as u8 + (c.genome.price != parent.price) as u8 + (c.genome.floor != parent.floor) as u8;
    assert_eq!(diff, 1);
}
#[test]
fn failed_birth_refunds_parent() {
    let mut a = setup();
    a.sponsor(moss(1), U128(60));
    let _ = a.birth(moss(1), 4);
    results(vec![PromiseResult::Failed]);
    let child = id(&format!("s1-moss-k1.{ME}"));
    assert!(!a.on_birth(moss(1), child.clone(), 1, 4));
    assert_eq!(bal(&a, &moss(1)), 130);
    assert!(a.lives.get(&child).is_none());
    conserved(&a);
}
#[test]
#[should_panic(expected = "birth pending")]
fn duplicate_birth_refused_while_pending() {
    let mut a = setup();
    a.sponsor(moss(1), U128(60));
    let _ = a.birth(moss(1), 0);
    let _ = a.birth(moss(1), 1);
}
#[test]
#[should_panic(expected = "birth already resolved")]
fn birth_callback_replay_refused() {
    let mut a = setup();
    a.sponsor(moss(1), U128(60));
    let _ = a.birth(moss(1), 0);
    results(vec![ok()]);
    let child = id(&format!("s1-moss-k1.{ME}"));
    a.on_birth(moss(1), child.clone(), 1, 0);
    results(vec![ok()]);
    a.on_birth(moss(1), child, 1, 0);
}
#[test]
#[should_panic(expected = "birth reserves")]
fn birth_needs_earned_reserve() {
    let mut a = setup();
    let _ = a.birth(moss(1), 0);
}
#[test]
#[should_panic(expected = "goal forbids birth")]
fn save_goal_forbids_birth() {
    let mut a = setup();
    a.sponsor(moss(1), U128(60));
    a.set_goal(moss(1), 1);
    let _ = a.birth(moss(1), 0);
}
#[test]
#[should_panic(expected = "price already at minimum")]
fn mutation_is_bounded() {
    Genome { job: 0, price: 0, floor: 0 }.mutate(0);
}
#[test]
fn win_after_target_turns_with_two_lineages() {
    let mut a = setup();
    for _ in 0..4 { a.feed(ash(1)); }
    for _ in 0..5 { a.tick(); }
    assert_eq!(a.season_ref().status, "live");
    let r = a.tick();
    assert_eq!(r["status"], "won");
    assert_eq!(a.season_ref().ended_turn, Some(6));
}
#[test]
fn lose_when_fewer_than_two_lineages() {
    let mut a = setup();
    let mut last = json!(null);
    for _ in 0..6 { last = a.tick(); if a.season_ref().status != "live" { break } }
    assert_eq!(last["status"], "lost"); // echo dies at turn 6 after ash at 4
    assert_eq!(a.season_ref().ended_turn, Some(6));
    conserved(&a);
}
#[test]
#[should_panic(expected = "season not live")]
fn no_actions_after_season_ends() {
    let mut a = setup();
    for _ in 0..6 { a.tick(); if a.season_ref().status != "live" { break } }
    a.feed(moss(1));
}
#[test]
fn close_burns_everything_then_new_season_starts_clean() {
    let mut a = setup();
    a.tick();
    a.close_season("visitor reset".into());
    assert_eq!(a.token.total_supply, 0);
    assert!(a.season_ref().status.starts_with("abandoned"));
    season(&mut a, 8, 100);
    assert_eq!(a.current, 2);
    assert_eq!(bal(&a, &moss(2)), 70);
    assert_eq!(a.token.total_supply, 1000);
    conserved(&a);
    assert!(a.lives.get(&moss(1)).is_none());
    assert!(a.lives_nft.owner_by_id.get(&moss(1).to_string()).is_none());
}
#[test]
#[should_panic(expected = "close the current season first")]
fn one_season_at_a_time() {
    let mut a = setup();
    let _ = a.start_season(pilot(), 6, U128(150));
}
#[test]
#[should_panic(expected = "ft_transfer_call disabled")]
fn transfer_call_disabled() {
    let mut a = setup();
    let _ = a.ft_transfer_call(id("x.test"), U128(1), None, "".into());
}
#[test]
fn tool_liability_reconciles_once() {
    let mut a = setup();
    a.post_job("s1".into(), U128(70), true, 2);
    a.bid(ash(1), "s1".into(), U128(40));
    a.award("s1".into());
    a.settle("s1".into(), h(3));
    let n = a.reserve_tool("s1".into(), h(9));
    a.reconcile_tool_paid(n, format!("0x{}", "1".repeat(64)));
    assert_eq!(a.tool_liability(n).unwrap().state, "paid-reconciled");
}
#[test]
#[should_panic(expected = "already reconciled")]
fn tool_reconcile_twice_refused() {
    let mut a = setup();
    a.post_job("s1".into(), U128(70), true, 2);
    a.bid(ash(1), "s1".into(), U128(40));
    a.award("s1".into());
    a.settle("s1".into(), h(3));
    let n = a.reserve_tool("s1".into(), h(9));
    a.reconcile_tool_paid(n, format!("0x{}", "1".repeat(64)));
    a.reconcile_tool_paid(n, format!("0x{}", "2".repeat(64)));
}

#[test]
fn plain_translation_job_paid_to_translator_without_card() {
    let mut a = setup();
    a.set_demand(2);
    a.post_job("t1".into(), U128(60), true, 2);
    a.bid(echo(1), "t1".into(), U128(40));
    assert_eq!(a.award("t1".into()), echo(1));
    a.settle("t1".into(), h(4));
    assert_eq!(bal(&a, &echo(1)), 90);
    assert_eq!(a.season_ref().budget_left.0, 110); // 20 unspent reward returns to the visitor
    conserved(&a);
}
#[test]
#[should_panic(expected = "policy does not take this job")]
fn card_maker_cannot_take_plain_translation() {
    let mut a = setup();
    a.set_demand(2);
    a.post_job("t1".into(), U128(60), true, 2);
    a.bid(moss(1), "t1".into(), U128(60));
}
#[test]
#[should_panic(expected = "demand change bounds")]
fn demand_kind_out_of_range_refused() {
    let mut a = setup();
    a.set_demand(3);
}
