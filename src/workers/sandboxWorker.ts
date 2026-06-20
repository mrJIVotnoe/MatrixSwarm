// Digital Shell - Sandboxed Web Worker 
// Isolated from DOM and main thread's local storage (so no access to soul_passport)

// @ts-ignore
import init, { TrustEngine, AikidoCore, ArkStorage, AikidoMath } from '../../rust-core/pkg/swarm_wasm';

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
};

