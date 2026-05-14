use wasm_bindgen::prelude::*;
use std::rc::Rc;
use std::cell::RefCell;
use web_sys::{RtcPeerConnection, RtcDataChannel, RtcDataChannelInit, MessageEvent};

#[wasm_bindgen]
pub struct NativeNetworkLayer {
    // We store standard RTCPeerConnections per peer
    connections: RefCell<std::collections::HashMap<String, RtcPeerConnection>>,
    channels: RefCell<std::collections::HashMap<String, RtcDataChannel>>,
    // local node id
    node_id: String,
}

#[wasm_bindgen]
impl NativeNetworkLayer {
    #[wasm_bindgen(constructor)]
    pub fn new(node_id: &str) -> NativeNetworkLayer {
        NativeNetworkLayer {
            connections: RefCell::new(std::collections::HashMap::new()),
            channels: RefCell::new(std::collections::HashMap::new()),
            node_id: node_id.to_string(),
        }
    }

    /// Setup a WebRTC Peer Connection locally in Rust for pure P2P Mesh
    #[wasm_bindgen]
    pub fn initiate_peer_connection(
        &self, 
        peer_id: &str, 
        on_signal_needed: &js_sys::Function, // Callback to fallback signaling server (Matchmaker)
        on_message_received: &js_sys::Function
    ) -> Result<(), JsValue> {
        let pc = RtcPeerConnection::new()?;
        
        let mut dci = RtcDataChannelInit::new();
        dci.ordered(true);
        let channel = pc.create_data_channel_with_data_channel_dict("matrix_swarm", &dci);
        
        // Setup channel onmessage
        let cb_func = on_message_received.clone();
        let peer_clone = peer_id.to_string();
        let onmessage_callback = Closure::wrap(Box::new(move |e: MessageEvent| {
            if let Ok(txt) = e.data().dyn_into::<js_sys::JsString>() {
                // Digital Pheromone or L3 Data passing cleanly through Rust layer
                let _ = cb_func.call1(&JsValue::NULL, &txt);
            }
        }) as Box<dyn FnMut(MessageEvent)>);
        
        channel.set_onmessage(Some(onmessage_callback.as_ref().unchecked_ref()));
        onmessage_callback.forget();
        
        self.channels.borrow_mut().insert(peer_id.to_string(), channel);
        self.connections.borrow_mut().insert(peer_id.to_string(), pc);
        
        Ok(())
    }

    /// Broadcast Digital Pheromone directly over WebRTC Data Channels (no backend)
    #[wasm_bindgen]
    pub fn broadcast_pheromone(&self, payload: &str) {
        let channels = self.channels.borrow();
        for (_, channel) in channels.iter() {
            let _ = channel.send_with_str(payload);
        }
    }
}
