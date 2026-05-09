use wasm_bindgen::prelude::*;
use std::collections::{HashMap, HashSet};

#[wasm_bindgen]
pub struct SwarmCore {
    routing_table: HashMap<u32, Vec<String>>,
    crdt_store: HashMap<String, u64>,
}

#[wasm_bindgen]
impl SwarmCore {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            routing_table: HashMap::new(),
            crdt_store: HashMap::new(),
        }
    }

    /// Kademlia XOR routing implementation
    #[wasm_bindgen]
    pub fn update_routing(&mut self, node_id: &str, peer_id: &str) {
        let dist = Self::xor_distance(node_id, peer_id);
        let bucket = if dist == 0 { 0 } else { dist.ilog2() };
        let entries = self.routing_table.entry(bucket).or_insert_with(Vec::new);
        if !entries.contains(&peer_id.to_string()) {
            entries.push(peer_id.to_string());
        }
    }

    fn xor_distance(a: &str, b: &str) -> u32 {
        let ba = a.as_bytes();
        let bb = b.as_bytes();
        let mut d = 0;
        for i in 0..std::cmp::min(ba.len(), bb.len()) {
            d += (ba[i] ^ bb[i]) as u32;
        }
        d
    }

    /// Heavy Compute Allocation (Prime / PoW)
    #[wasm_bindgen]
    pub fn execute_compute_task(seed: &str, start: u32, end: u32) -> u32 {
        let mut prime_count = 0;
        for n in start..end {
            if Self::is_prime(n) {
                prime_count += 1;
            }
        }
        prime_count
    }

    fn is_prime(n: u32) -> bool {
        if n < 2 { return false; }
        if n == 2 || n == 3 { return true; }
        if n % 2 == 0 || n % 3 == 0 { return false; }
        let mut i = 5;
        while i * i <= n {
            if n % i == 0 || n % (i + 2) == 0 { return false; }
            i += 6;
        }
        true
    }
}
