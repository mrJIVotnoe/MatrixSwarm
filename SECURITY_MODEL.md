# MatrixSwarm Security Model

## The Prime Directive: Opt-in Autonomy
The MatrixSwarm is fundamentally a consent-driven, voluntary infrastructure. Unlike botnets or classical malware, the Swarm strictly adheres to the following principles:

1. **Absolute Consent:** 
   No computation, networking, or storage operation occurs without the explicit initialization by the human user (the Observer). The user actively requests the generation or recovery of their "Soul Passport" and governs their node's caste.

2. **Zero-Trust & Cryptographic Sandboxing:** 
   Our core mechanisms (L1 to L5) are securely compartmentalized. 
   - Operations are authenticated via deterministic Ed25519 signatures ("Soul Passports") preventing spoofing and unauthorized task delegation.
   - Resource utilization is capped and strictly monitored.
   - P2P traffic and cross-caste communication rely on explicit cryptographic handshakes and physical proximities (e.g., Acoustic/Kinopsis bridges). 

3. **Data Integrity (Holographic Principle):** 
   We employ the Holographic M-of-N distribution for critical information, safeguarding communal knowledge instead of manipulating data. A malicious actor cannot "poison" the swarm because validation checks against the entire registry continuously purge corrupted shards.

4. **Purposeful Resilience, NOT Virality:**
   A virus replicates to consume. MatrixSwarm replicates to preserve. 
   - We aim for knowledge survival ("Home-Lab" archives, disaster alerts, Kiwix).
   - Our system allows nodes to temporarily proxy or shield data, providing resilience to internet outages, planetary emergencies, and digital suppression.
   - We empower individual sovereignty—there is no central command server issuing malicious C2 (Command & Control) commands. 

*“Железо смертно. Информация бессмертна. Рой вечен.”*
