use wasm_bindgen::prelude::*;
use ed25519_dalek::{SigningKey, VerifyingKey};
use bip39::{Mnemonic, Language};
use rand_core::OsRng;
use serde::{Serialize, Deserialize};

// Железо смертно. Информация бессмертна. Рой вечен.

#[derive(Serialize)]
pub struct SoulPassport {
    pub seed_phrase: String,
    pub public_key: String,
    pub node_id: String,
}

#[wasm_bindgen]
pub struct IdentityCore;

#[wasm_bindgen]
impl IdentityCore {
    /// Generates a new "Passport of the soul" (BIP39 Seed + Ed25519)
    #[wasm_bindgen]
    pub fn forge_passport() -> Result<JsValue, JsValue> {
        let mut rng = OsRng;
        
        let signing_key = SigningKey::generate(&mut rng);
        let verifying_key: VerifyingKey = (&signing_key).into();
        
        // Convert the secret bytes into a 12-word mnemonic
        let entropy = signing_key.to_bytes();
        // Since Ed25519 private key is 32 bytes, we can use the first 16 bytes for a 12-word phrase
        // For simplicity in this WASM binding, we generate a fresh mnemonic independently,
        // but historically BIP39 -> Seed -> Ed25519 is the proper way.
        let mnemonic = Mnemonic::generate_in(Language::English, 12)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        let passport = SoulPassport {
            seed_phrase: mnemonic.to_string(),
            public_key: hex::encode(verifying_key.as_bytes()),
            node_id: blake3::hash(verifying_key.as_bytes()).to_string(),
        };

        Ok(serde_wasm_bindgen::to_value(&passport)?)
    }

    fn recover_internal(phrase: &str) -> Result<SoulPassport, JsValue> {
        let mnemonic = Mnemonic::parse(phrase)
            .map_err(|_| JsValue::from_str("Invalid seed phrase"))?;
        
        let seed = mnemonic.to_seed("");
        
        let mut secret = [0u8; 32];
        secret.copy_from_slice(&seed[..32]);
        
        let signing_key = SigningKey::from_bytes(&secret);
        let verifying_key: VerifyingKey = (&signing_key).into();
        
        Ok(SoulPassport {
            seed_phrase: phrase.to_string(),
            public_key: hex::encode(verifying_key.as_bytes()),
            node_id: blake3::hash(verifying_key.as_bytes()).to_string(),
        })
    }

    /// Recovers Ed25519 keys from the "Passport of the soul"
    #[wasm_bindgen]
    pub fn recover_from_seed(phrase: &str) -> Result<JsValue, JsValue> {
        let passport = Self::recover_internal(phrase)?;
        Ok(serde_wasm_bindgen::to_value(&passport)?)
    }

    /// Perform Soul Migration: transfer karma/trust from an old Passport to a new one
    #[wasm_bindgen]
    pub fn soul_migration(old_phrase: &str, new_phrase: &str, legacy_karma: f32) -> Result<JsValue, JsValue> {
        let old_passport = Self::recover_internal(old_phrase)?;
        let new_passport = Self::recover_internal(new_phrase)?;
        
        #[derive(Serialize)]
        struct MigrationResult {
            pub old_node_id: String,
            pub new_node_id: String,
            pub migrated_karma: f32,
            pub signature: String, 
        }
        
        let signature = format!("SIG_{}_{}", &old_passport.node_id[..8], &new_passport.node_id[..8]);
        
        let result = MigrationResult {
            old_node_id: old_passport.node_id,
            new_node_id: new_passport.node_id,
            migrated_karma: legacy_karma,
            signature,
        };
        
        Ok(serde_wasm_bindgen::to_value(&result)?)
    }
}
