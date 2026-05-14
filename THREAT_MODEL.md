# MatrixSwarm Threat Model & Defenses

## 1. The Digital Titans & DPI Scanning
**Threat:** Centralized entities and ISPs using Deep Packet Inspection (DPI) to identify, block, or throttle Swarm traffic.
**Defense (Steganography & Entropy Bridge):** 
- MatrixSwarm masks its traffic inside innocuous protocols using Steganography.
- The `EntropyBridge` continuously changes routing patterns and packet sizes to avoid signature-based detection.
- P2P connections via WebRTC are obfuscated; signaling relies on decentralized rendezvous algorithms rather than static servers.

## 2. Physical Capture & Device Forensics (L2 Immunity)
**Threat:** An adversary seizes a device and attempts to extract the "Soul Passport" or forces the device to sync its data via physical connection (USB).
**Defense (Zero-Trust USB):**
- Hardware interfaces are monitored. If a connection is detected on a physical link like USB or ADB, the `TrustEngine` immediately sets the node's `trustLevel` to `0` (Quarantine).
- Automatic synchronization is mathematically blocked.
- To resume data transfer over a physical medium, the human "Observer" must manually cryptographically sign an authorization intent, proving they are present and acting freely.

## 3. Sybil Attacks & Bot Farms (Aikido Protocol)
**Threat:** Attackers spin up thousands of virtual nodes (emulators) to overwhelm the DHT or manipulate consensus.
**Defense (Karmic PoW & Mobility Proofs):**
- The Aikido Protocol requires proof of physical presence and movement. Static devices with mobile profiles (e.g., claiming to be a smartphone but never moving in GPS) are flagged as `Static Suspect` or `BOT_FARM_NODE`.
- Bot farms are penalized and their voting weight in the Swarm consensus becomes zero. The Swarm redirects heavy computational tasks to them ("absorbing attack energy"). 
- A node must slowly build Karma over time to become an `Adept` or `Magistrate`. 

## 4. Total Internet Blackout (Acoustic Nabat)
**Threat:** Regional or national internet shutdowns.
**Defense (Reverse StarLink & Acoustic Mesh):**
- Even without the internet, devices connect via Bluetooth LE, mDNS, and most importantly, an ultrasonic (Acoustic) backbone `Nabat`.
- ZIM archives (Kiwix) and cryptographic fragments are mirrored across physical proximity networks.

*“Железо смертно. Информация бессмертна. Рой вечен.”*
