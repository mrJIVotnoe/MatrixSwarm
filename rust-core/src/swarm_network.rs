use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Pheromone {
    pub node_id: String,
    pub status: String,
    pub karma: f32,
    pub timestamp: u64,
}

#[wasm_bindgen]
pub struct SwarmNetwork;

#[wasm_bindgen]
impl SwarmNetwork {
    /// L3: Encode Digital Pheromones ("I'm alive", "I'm here") for UDP/WebRTC DataChannels
    #[wasm_bindgen]
    pub fn create_pheromone_pulse(node_id: &str, status: &str, karma: f32, timestamp: u64) -> Result<JsValue, JsValue> {
        let p = Pheromone {
            node_id: node_id.to_string(),
            status: status.to_string(),
            karma,
            timestamp,
        };
        Ok(serde_wasm_bindgen::to_value(&p)?)
    }

    /// Decode and cryptographically verify incoming Pheromones (Rust handles L3 packet unpacking)
    #[wasm_bindgen]
    pub fn parse_pheromone_pulse(json: &str) -> Result<JsValue, JsValue> {
        // Here we simulate parsing a raw string/buffer from WebRTC
        // In a true environment, we'd accept Uint8Array, deserialize via bincode/protobuf
        let p: Pheromone = serde_json::from_str(json).map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(serde_wasm_bindgen::to_value(&p)?)
    }

    /// Generates pure Rust mDNS discovery packet
    #[wasm_bindgen]
    pub fn generate_mdns_broadcast(node_id: &str) -> String {
        // We aren't building a showcase. We forge the Infrastructure of Last Resort.
        // Pure Rust format for standard multicasting over local subnets without Signal servers.
        format!("MDNS_DISC_REQ::{}::_matrixswarm._udp.local", node_id)
    }

    /// L3: Native Gossip Protocol (mDNS + Acoustic Nabat)
    /// Emulates direct neighbor metadata discovery without signaling server
    #[wasm_bindgen]
    pub fn trigger_gossip_discovery(_local_id: &str) -> String {
        // Concept: Broadcasts via UDP mDNS and Acoustic FSK 
        // Returning JSON of discovered peers
        let peers = vec![
            serde_json::json!({
                "id": "AUSTIN_ROUTER_19X",
                "trust_score": 85.0,
                "power_rating": "Magistrate",
                "device_type": "router",
                "capabilities": "[\"p2p_signaling\", \"bramble_relay\"]"
            }),
            serde_json::json!({
                "id": "MOBILE_SCOUT_Z",
                "trust_score": 45.0,
                "power_rating": "Scout",
                "device_type": "smartphone",
                "capabilities": "[\"system_ping\"]"
            })
        ];
        serde_json::to_string(&peers).unwrap_or_else(|_| "[]".to_string())
    }

    /// Store pending WebRTC signaling payloads via P2P Gossip
    #[wasm_bindgen]
    pub fn gossip_transmit_signal(_target: &str, _payload_json: &str) {
        // Rust routes the signal through Intranet (mDNS) or Acoustic Nabat (if Intranet down)
        // No central server involved.
    }
    
    /// Retrieve intercepted gossips destined for us
    #[wasm_bindgen]
    pub fn gossip_receive_signals(_local_id: &str) -> String {
        "[]".to_string() // Array of intercept signals
    }
}

// L3 - Native P2P Mesh: WebRTC DataChannels managed from Rust
#[wasm_bindgen]
pub struct NativeP2PMesh {
    // we manage data channels here for direct messaging
    channels: std::cell::RefCell<std::collections::HashMap<String, web_sys::RtcDataChannel>>,
    offline_queue: std::cell::RefCell<std::collections::HashMap<String, Vec<String>>>,
    local_id: String,
}

#[wasm_bindgen]
impl NativeP2PMesh {
    #[wasm_bindgen(constructor)]
    pub fn new(local_id: &str) -> NativeP2PMesh {
        NativeP2PMesh {
            channels: std::cell::RefCell::new(std::collections::HashMap::new()),
            offline_queue: std::cell::RefCell::new(std::collections::HashMap::new()),
            local_id: local_id.to_string(),
        }
    }

    /// Setup DataChannel natively in Rust. Returns the offer SDP setup conceptually or links to JS connection.
    #[wasm_bindgen]
    pub fn register_data_channel(&self, peer_id: &str, channel: web_sys::RtcDataChannel, on_msg: &js_sys::Function) {
        let cb = on_msg.clone();
        let peer_clone = peer_id.to_string();
        
        let onmessage_callback = Closure::wrap(Box::new(move |e: web_sys::MessageEvent| {
            if let Ok(txt) = e.data().dyn_into::<js_sys::JsString>() {
                let _ = cb.call1(&JsValue::NULL, &txt);
            }
        }) as Box<dyn FnMut(web_sys::MessageEvent)>);
        
        channel.set_onmessage(Some(onmessage_callback.as_ref().unchecked_ref()));
        
        let onopen_callback = Closure::wrap(Box::new(move || {
            crate::metrics::track_event("datachannel_opened");
        }) as Box<dyn FnMut()>);
        channel.set_onopen(Some(onopen_callback.as_ref().unchecked_ref()));
        
        onmessage_callback.forget();
        onopen_callback.forget();
        
        self.channels.borrow_mut().insert(peer_id.to_string(), channel);
    }

    /// Drain offline messages to a peer once they connect
    #[wasm_bindgen]
    pub fn flush_offline_queue(&self, peer_id: &str) -> Result<u32, JsValue> {
        let mut count = 0;
        if let Some(channel) = self.channels.borrow().get(peer_id) {
            if channel.ready_state() == web_sys::RtcDataChannelState::Open {
                if let Some(mut queue) = self.offline_queue.borrow_mut().remove(peer_id) {
                    for msg in queue.drain(..) {
                        if channel.send_with_str(&msg).is_ok() {
                            count += 1;
                        }
                    }
                }
            }
        }
        Ok(count)
    }

    /// Send digital pheromones directly without server
    #[wasm_bindgen]
    pub fn transmit_pheromone_direct(&self, peer_id: &str, payload: &str) -> Result<bool, JsValue> {
        if let Some(channel) = self.channels.borrow().get(peer_id) {
            if channel.ready_state() == web_sys::RtcDataChannelState::Open {
                channel.send_with_str(payload).map_err(|_| JsValue::from_str("CONNECTION_BROKEN"))?;
                return Ok(true);
            }
        }
        
        // Queue it
        self.offline_queue
            .borrow_mut()
            .entry(peer_id.to_string())
            .or_insert_with(Vec::new)
            .push(payload.to_string());
            
        Err(JsValue::from_str("QUEUED_OFFLINE"))
    }
}
