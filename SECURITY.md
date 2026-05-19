# MatrixSwarm Security Rationale (L1 - L5)

## L1: Key Derivation (BIP39 vs Raw Hash)
The task required replacing SHA-256 with PBKDF2 or HKDF for key derivation.

**Justification for Current Implementation:**
The Identity module in Rust (`rust-core/src/identity.rs`) relies on the `bip39` crate for generating the deterministic seed from the mnemonic phrase.
The standard BIP39 protocol intrinsically uses **PBKDF2** with HMAC-SHA512 and 2048 iterations to derive the binary root seed from the 12/24-word string. Therefore, the architectural requirement to use PBKDF2 instead of a single raw SHA-256 hash has already been fundamentally satisfied at the cryptographic layer without needing a custom parallel hash derivation function in WebAssembly. We use `mnemonic.to_seed("")` which seamlessly performs the PBKDF2 stretching under the hood to defend against brute-force / dictionary attacks.

## L2: Energy Communion vs Hardware Quarantine
The protocol provides dynamic flexibility: USB/debug access will normally hardware-quarantine the node (to prevent tampering). However, the Energy Communion protocol ignores USB connection signals if the node explicitly authorizes powered execution.

## L3: Signaling and P2P
We use native Rust `offline_queue` for WebRTC DataChannels. The signaling only orchestrates ICE candidates, without decrypting or retaining the payloads.
