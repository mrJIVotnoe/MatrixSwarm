use bip39::{Mnemonic, Language};
use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};

/// L1 - Identity Layer
/// Deterministic Ed25519 key generation from a BIP39 12-word seed phrase.
pub struct SwarmIdentity {
    pub signing_key: SigningKey,
    pub verifying_key: VerifyingKey,
}

impl SwarmIdentity {
    /// Creates a deterministic identity from a BIP39 mnemonic phrase.
    pub fn from_seed_phrase(phrase: &str) -> Result<Self, &'static str> {
        let mnemonic = Mnemonic::from_phrase(phrase, Language::English)
            .map_err(|_| "Invalid seed phrase")?;
        
        let entropy = mnemonic.entropy();
        // Use the first 32 bytes of the entropy for the Ed25519 signing key.
        let mut key_bytes = [0u8; 32];
        let len = std::cmp::min(entropy.len(), 32);
        key_bytes[..len].copy_from_slice(&entropy[..len]);
        
        let signing_key = SigningKey::from_bytes(&key_bytes);
        let verifying_key = signing_key.verifying_key();
        
        Ok(Self {
            signing_key,
            verifying_key,
        })
    }

    /// Signs a message (e.g., the 'Soul Passport') using the signing key.
    pub fn sign_message(&self, message: &[u8]) -> Signature {
        self.signing_key.sign(message)
    }

    /// Verifies another node's signed passport.
    pub fn verify_passport(public_key_bytes: &[u8; 32], message: &[u8], signature_bytes: &[u8; 64]) -> Result<(), ed25519_dalek::SignatureError> {
        let verifying_key = VerifyingKey::from_bytes(public_key_bytes)?;
        let signature = Signature::from_bytes(signature_bytes);
        verifying_key.verify(message, &signature)
    }

    /// Generates a Node ID from the public key.
    pub fn node_id(&self) -> String {
        let pk_bytes = self.verifying_key.to_bytes();
        // A simple deterministic hash or hex representation of public key.
        // For zero-cost, we might just format as hex.
        hex::encode(&pk_bytes[..8]) // short ID
    }
}

// Ensure hex dependency is included or write a small converter.
// Instead of raw hex crate, let's write a simple helper if needed or use std::fmt.
fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}
