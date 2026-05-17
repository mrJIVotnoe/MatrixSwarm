use serde::Serialize;
use wasm_bindgen::prelude::*;
use std::sync::atomic::{AtomicUsize, Ordering};

// Extremely basic in-memory global metric counters since WASM runs in a single JS thread
static TOTAL_HEARTBEATS: AtomicUsize = AtomicUsize::new(0);
static SUCCESSFUL_HEARTBEATS: AtomicUsize = AtomicUsize::new(0);
static CRDT_SYNC_MS_ACCUM: AtomicUsize = AtomicUsize::new(0);
static CRDT_SYNC_COUNT: AtomicUsize = AtomicUsize::new(0);
static ISOLATION_BREACHES: AtomicUsize = AtomicUsize::new(0);

// Basic mock Trace ID logic
static TRACE_COUNTER: AtomicUsize = AtomicUsize::new(0);

pub fn get_next_trace_id() -> String {
    let id = TRACE_COUNTER.fetch_add(1, Ordering::SeqCst);
    format!("TRACE_{:08X}", id)
}

pub fn track_event(_event: &str) {
    let _trace_id = get_next_trace_id();
    // Use web_sys::console::log_1 in a real app, here we might just printf or mock.
    // Assuming console logging is acceptable but will avoid importing web_sys to prevent build issues if not enabled
    // Only compile-time string logic here
}

pub fn record_heartbeat(success: bool) {
    TOTAL_HEARTBEATS.fetch_add(1, Ordering::SeqCst);
    if success {
        SUCCESSFUL_HEARTBEATS.fetch_add(1, Ordering::SeqCst);
    }
}

pub fn record_crdt_sync(latency_ms: usize) {
    CRDT_SYNC_MS_ACCUM.fetch_add(latency_ms, Ordering::SeqCst);
    CRDT_SYNC_COUNT.fetch_add(1, Ordering::SeqCst);
}

pub fn track_isolation_breach() {
    ISOLATION_BREACHES.fetch_add(1, Ordering::SeqCst);
}

#[derive(Serialize)]
pub struct SwarmMetrics {
    pub heartbeat_success_rate: f64,
    pub crdt_sync_latency: f64,
    pub isolation_breach_attempts: usize,
}

#[wasm_bindgen]
pub struct MetricsEngine;

#[wasm_bindgen]
impl MetricsEngine {
    #[wasm_bindgen]
    pub fn get_metrics() -> String {
        let total_hb = TOTAL_HEARTBEATS.load(Ordering::SeqCst);
        let succ_hb = SUCCESSFUL_HEARTBEATS.load(Ordering::SeqCst);
        let rate = if total_hb > 0 {
            (succ_hb as f64 / total_hb as f64) * 100.0
        } else {
            100.0
        };

        let sync_accum = CRDT_SYNC_MS_ACCUM.load(Ordering::SeqCst);
        let sync_count = CRDT_SYNC_COUNT.load(Ordering::SeqCst);
        let avg_latency = if sync_count > 0 {
            sync_accum as f64 / sync_count as f64
        } else {
            0.0
        };

        let metrics = SwarmMetrics {
            heartbeat_success_rate: rate,
            crdt_sync_latency: avg_latency,
            isolation_breach_attempts: ISOLATION_BREACHES.load(Ordering::SeqCst),
        };

        serde_json::to_string(&metrics).unwrap_or_else(|_| "{}".to_string())
    }

    #[wasm_bindgen]
    pub fn mock_heartbeat(success: bool) {
        record_heartbeat(success);
    }

    #[wasm_bindgen]
    pub fn mock_crdt_sync(latency: usize) {
        record_crdt_sync(latency);
    }
}
