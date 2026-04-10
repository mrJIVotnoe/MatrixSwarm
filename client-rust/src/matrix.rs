use aes::Aes256;
use cbc::Decryptor;
use cipher::{BlockDecryptMut, KeyIvInit};
use sha2::{Digest, Sha256};
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct MatrixEchoMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub isp: String,
    pub strategy: String,
    pub target: String,
    pub success: bool,
    pub timestamp: i64,
}

pub struct MatrixBridge {
    pub swarm_key: String,
}

impl MatrixBridge {
    pub fn decrypt(&self, encrypted_body: &str) -> Result<MatrixEchoMessage, Box<dyn std::error::Error>> {
        if !encrypted_body.starts_with("ECHO_V2:") {
            return Err("Invalid message prefix".into());
        }

        let payload = &encrypted_body[8..];
        let parts: Vec<&str> = payload.split(':').collect();
        if parts.len() != 2 {
            return Err("Invalid message format".into());
        }

        let iv_hex = parts[0];
        let ciphertext_base64 = parts[1];

        let iv = hex::decode(iv_hex)?;
        let ciphertext = general_purpose::STANDARD.decode(ciphertext_base64)?;

        // Derive key using SHA256
        let mut hasher = Sha256::new();
        hasher.update(self.swarm_key.as_bytes());
        let key = hasher.finalize();

        type Aes256CbcDec = Decryptor<Aes256>;
        let mut buf = ciphertext.to_vec();
        
        let decryptor = Aes256CbcDec::new_from_slices(&key, &iv)?;
        let decrypted_data = decryptor.decrypt_into_bytes_mut(&mut buf)?;

        let msg: MatrixEchoMessage = serde_json::from_slice(decrypted_data)?;
        Ok(msg)
    }
}
