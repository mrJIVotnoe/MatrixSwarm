use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct LocalSdpExchange {
    pub node_id: String,
    pub sdp_type: String, // "offer" or "answer"
    pub sdp_data: String,
    pub timestamp: u64,
}

#[wasm_bindgen]
pub struct SdpDiscovery;

#[wasm_bindgen]
impl SdpDiscovery {
    /// Compresses a local SDP content into a clean, compact string prefix for QR transmission
    #[wasm_bindgen]
    pub fn encode_sdp_to_qr(node_id: &str, sdp_type: &str, sdp_raw: &str) -> String {
        let exchange = LocalSdpExchange {
            node_id: node_id.to_string(),
            sdp_type: sdp_type.to_string(),
            sdp_data: sdp_raw.to_string(),
            timestamp: js_sys::Date::now() as u64,
        };
        let serialized = serde_json::to_string(&exchange).unwrap_or_default();
        let encoded = hex::encode(serialized);
        format!("SWARMQR://{}", encoded)
    }

    /// Decodes an invitation QR payload back into SDP details
    #[wasm_bindgen]
    pub fn decode_sdp_from_qr(qr_payload: &str) -> Result<JsValue, JsValue> {
        if !qr_payload.starts_with("SWARMQR://") {
            return Err(JsValue::from_str("INVALID_SWARM_QR_PREFIX"));
        }
        let hex_data = &qr_payload["SWARMQR://".len()..];
        let bytes = hex::decode(hex_data).map_err(|e| JsValue::from_str(&e.to_string()))?;
        let json_str = String::from_utf8(bytes).map_err(|e| JsValue::from_str(&e.to_string()))?;
        let exchange: LocalSdpExchange = serde_json::from_str(&json_str)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        Ok(serde_wasm_bindgen::to_value(&exchange)?)
    }

    /// Returns a mock JSON of local LAN mDNS / UDP peers discovered offline
    #[wasm_bindgen]
    pub fn scan_local_mdns_peers() -> String {
        let peers = vec![
            serde_json::json!({
                "id": "LAN_ROUTER_NODE",
                "ip": "192.168.1.1",
                "device_type": "router",
                "karma": 99.0,
                "status": "online"
            }),
            serde_json::json!({
                "id": "LAN_SMART_TV_NODE",
                "ip": "192.168.1.45",
                "device_type": "smart_tv",
                "karma": 75.0,
                "status": "online"
            })
        ];
        serde_json::to_string(&peers).unwrap_or_else(|_| "[]".to_string())
    }
}
