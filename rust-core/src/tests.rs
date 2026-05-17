use crate::aikido::AikidoMath;
use crate::identity::IdentityCore;
use crate::crdt::KarmaCRDT;

#[test]
fn test_aikido_bot_farm() {
    // 9 static nodes out of 10 -> >80%, should be detected
    let is_farm = AikidoMath::detect_bot_farm(9, 1, 10);
    assert!(is_farm, "90% static nodes should trigger bot farm detection");

    let is_not_farm = AikidoMath::detect_bot_farm(5, 5, 10);
    assert!(!is_not_farm, "50% static nodes should NOT trigger bot farm detection");
}

#[test]
fn test_soul_passport_generation() {
    let mut core = IdentityCore::new();
    let passport_json = core.forge_passport("some_human_entropy_here");
    assert!(passport_json.contains("public_key"));
    assert!(passport_json.contains("seed_phrase"));
}

#[test]
fn test_crdt_delta_collapse() {
    let mut crdt = KarmaCRDT::new();
    crdt.add_karma("node1", 5);
    crdt.add_karma("node1", 10);

    let deltas = crdt.export_deltas_since(0);
    assert!(deltas.len() > 2); // basic check for JSON output

    let mut crdt2 = KarmaCRDT::new();
    let merged = crdt2.merge_deltas(&deltas);
    assert_eq!(merged, 1); // one karma block
    assert!(crdt2.export_all().contains("node1"));
}
