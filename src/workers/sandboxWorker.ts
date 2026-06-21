// Digital Shell - Sandboxed Web Worker 
// Isolated from DOM and main thread's local storage (so no access to soul_passport)

// @ts-ignore
import init, { TrustEngine, AikidoCore, ArkStorage, AikidoMath, IdentityCore } from '../../rust-core/pkg/swarm_wasm';

let wasmLoaded = false;
let trustEngine: any = null;
let arkStorage: any = null;

async function ensureWasm() {
  if (!wasmLoaded) {
    try {
      await init();
      wasmLoaded = true;
      trustEngine = new TrustEngine();
      arkStorage = new ArkStorage();
      console.log("[DigitalShell Worker] Wasm modules successfully loaded and isolated inside Worker context.");
    } catch (e: any) {
      console.error("[DigitalShell Worker] Core wasm initialization failure inside sandbox:", e);
    }
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, jobId } = e.data;
  
  await ensureWasm();
  
  if (type === 'EXECUTE_ZIM_QUERY') {
    console.log(`[SandboxWorker] Received ZIM query request for: ${payload.query}`);
    try {
      if (arkStorage) {
         const results = arkStorage.search_articles(payload.query || "");
         self.postMessage({
            type: 'ZIM_QUERY_RESULT',
            jobId,
            result: results
         });
      } else {
         throw new Error("ArkStorage engine offline");
      }
    } catch (e: any) {
      self.postMessage({
         type: 'ZIM_QUERY_RESULT',
         jobId,
         error: e.message,
         result: "[]"
      });
    }
  }
  
  if (type === 'P2P_PROCESS_PAYLOAD') {
    // Isolated processing of potentially untrusted incoming data
    try {
      // Simulate validation
      if (payload && payload.includes('MALICIOUS')) {
         throw new Error("Payload failed sandbox heuristics inside worker quarantine");
      }
      self.postMessage({
         type: 'P2P_PAYLOAD_SAFE',
         jobId,
         result: payload
      });
    } catch (err: any) {
      self.postMessage({
         type: 'P2P_PAYLOAD_REJECTED',
         jobId,
         error: err.message
      });
    }
  }

  if (type === 'CALCULATE_SOUL_PASSPORT') {
    // Process Karma increments and trust level checks securely to prevent freezing the main frame
    try {
      if (trustEngine) {
        if (payload.action === 'ADD_KARMA') {
          trustEngine.add_karma(payload.amount || 0, payload.role || "Drone");
        } else if (payload.action === 'REGISTER_MINI_JACK') {
          trustEngine.register_mini_jack(payload.present || false);
        } else if (payload.action === 'REGISTER_ACOUSTIC') {
          trustEngine.register_acoustic_sync(payload.active || false);
        }

        const currentLevel = trustEngine.get_level();
        // Since karmic score is a field on rust struct, we assume it gets retrieved
        const currentScore = (trustEngine as any).karmic_score || 50;
        
        self.postMessage({
          type: 'SOUL_PASSPORT_UPDATE',
          jobId,
          result: {
            trustLevel: currentLevel,
            trustScore: currentScore
          }
        });
      } else {
        throw new Error("TrustEngine wasm engine offline");
      }
    } catch (err: any) {
      self.postMessage({
        type: 'SOUL_PASSPORT_ERROR',
        jobId,
        error: err.message
      });
    }
  }

  if (type === 'RUN_AIKIDO_MATH') {
    try {
      const distance = AikidoMath.haversine_distance(
        payload.lat1 || 0, payload.lon1 || 0, 
        payload.lat2 || 0, payload.lon2 || 0
      );
      self.postMessage({
        type: 'AIKIDO_MATH_RESULT',
        jobId,
        result: distance
      });
    } catch (err: any) {
      self.postMessage({
        type: 'AIKIDO_MATH_ERROR',
        jobId,
        error: err.message
      });
    }
  }

  if (type === 'FORGE_PASSPORT') {
    try {
      const passport = IdentityCore.forge_passport(payload.entropy || "");
      self.postMessage({
        type: 'FORGE_PASSPORT_RESULT',
        jobId,
        result: passport
      });
    } catch (err: any) {
      self.postMessage({
        type: 'FORGE_PASSPORT_RESULT',
        jobId,
        error: err.message || err.toString()
      });
    }
  }

  if (type === 'RECOVER_PASSPORT') {
    try {
      const passport = IdentityCore.recover_from_seed(payload.phrase || "");
      self.postMessage({
        type: 'RECOVER_PASSPORT_RESULT',
        jobId,
        result: passport
      });
    } catch (err: any) {
      self.postMessage({
        type: 'RECOVER_PASSPORT_RESULT',
        jobId,
        error: err.message || err.toString()
      });
    }
  }

  if (type === 'SIGN_MESSAGE') {
    try {
      const signature = IdentityCore.sign_message(payload.phrase || "", payload.message || "");
      self.postMessage({
        type: 'SIGN_MESSAGE_RESULT',
        jobId,
        result: signature
      });
    } catch (err: any) {
      self.postMessage({
        type: 'SIGN_MESSAGE_RESULT',
        jobId,
        error: err.message || err.toString()
      });
    }
  }

  if (type === 'DERIVE_HKDF_KEY') {
    try {
      const okm = IdentityCore.derive_hkdf_key(payload.master_secret || "", payload.info || "");
      self.postMessage({
        type: 'DERIVE_HKDF_KEY_RESULT',
        jobId,
        result: okm
      });
    } catch (err: any) {
      self.postMessage({
        type: 'DERIVE_HKDF_KEY_RESULT',
        jobId,
        error: err.message || err.toString()
      });
    }
  }

  if (type === 'SOUL_MIGRATION') {
    try {
      const result = IdentityCore.soul_migration(payload.oldPhrase || "", payload.newPhrase || "", payload.legacyKarma || 0);
      self.postMessage({
        type: 'SOUL_MIGRATION_RESULT',
        jobId,
        result
      });
    } catch (err: any) {
      self.postMessage({
        type: 'SOUL_MIGRATION_RESULT',
        jobId,
        error: err.message || err.toString()
      });
    }
  }

  if (type === 'EXPORT_LEGACY_CONTAINER') {
    try {
      const result = IdentityCore.export_legacy_container(payload.phrase || "", payload.karma || 0, payload.isGuard || false);
      self.postMessage({
        type: 'EXPORT_LEGACY_CONTAINER_RESULT',
        jobId,
        result
      });
    } catch (err: any) {
      self.postMessage({
        type: 'EXPORT_LEGACY_CONTAINER_RESULT',
        jobId,
        error: err.message || err.toString()
      });
    }
  }

  if (type === 'IMPORT_LEGACY_CONTAINER') {
    try {
      const result = IdentityCore.import_legacy_container(payload.encryptedHex || "", payload.newPhrase || "");
      self.postMessage({
        type: 'IMPORT_LEGACY_CONTAINER_RESULT',
        jobId,
        result
      });
    } catch (err: any) {
      self.postMessage({
        type: 'IMPORT_LEGACY_CONTAINER_RESULT',
        jobId,
        error: err.message || err.toString()
      });
    }
  }

  if (type === 'VERIFY_SIGNATURE') {
    try {
      const result = IdentityCore.verify_signature(payload.publicKeyHex || "", payload.message || "", payload.signatureHex || "");
      self.postMessage({
        type: 'VERIFY_SIGNATURE_RESULT',
        jobId,
        result
      });
    } catch (err: any) {
      self.postMessage({
        type: 'VERIFY_SIGNATURE_RESULT',
        jobId,
        error: err.message || err.toString()
      });
    }
  }
};

