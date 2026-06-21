// Asynchronous Message Bus for the Sandbox Web Worker
// Keeps the soul passport, karma engines, and ZIM archives strictly inside the "Digital Shell" Web Worker

export class WorkerBus {
  private static worker: Worker | null = null;
  private static resolvers = new Map<string, (val: any) => void>();
  private static rejecters = new Map<string, (err: any) => void>();

  public static init() {
    if (this.worker) return;
    try {
      this.worker = new Worker(new URL('../workers/sandboxWorker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        const { type, jobId, result, error } = e.data;
        const resolve = this.resolvers.get(jobId);
        const reject = this.rejecters.get(jobId);

        if (error) {
          if (reject) reject(new Error(error));
        } else {
          if (resolve) resolve(result);
        }

        this.resolvers.delete(jobId);
        this.rejecters.delete(jobId);
      };
      
      this.worker.onerror = (e) => {
        console.error("[WorkerBus] General background worker error:", e);
      };
    } catch (e) {
      console.error("[WorkerBus] Worker instantiation failed! Falling back.", e);
    }
  }

  private static send(type: string, payload: any): Promise<any> {
    this.init();
    const jobId = "JOB_" + Math.random().toString(36).substring(2, 11).toUpperCase();
    return new Promise((resolve, reject) => {
      this.resolvers.set(jobId, resolve);
      this.rejecters.set(jobId, reject);
      if (this.worker) {
        this.worker.postMessage({ type, payload, jobId });
      } else {
        reject(new Error("Web Worker unavailable"));
      }
    });
  }

  /**
   * Performs an asynchronous, non-blocking offline Louver/ZIM search
   */
  public static executeZimQuery(query: string): Promise<string> {
    return this.send('EXECUTE_ZIM_QUERY', { query });
  }

  /**
   * Processes soul passport and karma accumulation safely on the background thread
   */
  public static calculateSoulPassport(
    action: 'ADD_KARMA' | 'REGISTER_MINI_JACK' | 'REGISTER_ACOUSTIC', 
    params: { amount?: number; role?: string; present?: boolean; active?: boolean } = {}
  ): Promise<{ trustLevel: number; trustScore: number }> {
    return this.send('CALCULATE_SOUL_PASSPORT', {
      action,
      amount: params.amount,
      role: params.role,
      present: params.present,
      active: params.active
    });
  }

  /**
   * Executes high-intensity Aikido geo-coordinate distance computation in worker
   */
  public static runAikidoDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> {
    return this.send('RUN_AIKIDO_MATH', { lat1, lon1, lat2, lon2 });
  }

  /**
   * Forges a new soul passport securely inside the sandbox worker
   */
  public static forgePassport(entropy: string): Promise<any> {
    return this.send('FORGE_PASSPORT', { entropy });
  }

  /**
   * Recovers soul passport from a seed phrase securely inside the worker
   */
  public static recoverPassport(phrase: string): Promise<any> {
    return this.send('RECOVER_PASSPORT', { phrase });
  }

  /**
   * Signs a message inside the sandboxed background worker
   */
  public static signMessage(phrase: string, message: string): Promise<string> {
    return this.send('SIGN_MESSAGE', { phrase, message });
  }

  /**
   * Derives a subkey securely inside the background worker
   */
  public static deriveHkdfKey(master_secret: string, info: string): Promise<string> {
    return this.send('DERIVE_HKDF_KEY', { master_secret, info });
  }

  /**
   * Securely migrates soul containers in wasm worker context
   */
  public static soulMigration(oldPhrase: string, newPhrase: string, legacyKarma: number): Promise<string> {
    return this.send('SOUL_MIGRATION', { oldPhrase, newPhrase, legacyKarma });
  }

  /**
   * Exports an encrypted legacy container fully isolated
   */
  public static exportLegacyContainer(phrase: string, karma: number, isGuard: boolean): Promise<any> {
    return this.send('EXPORT_LEGACY_CONTAINER', { phrase, karma, isGuard });
  }

  /**
   * Imports an encrypted legacy container fully isolated
   */
  public static importLegacyContainer(encryptedHex: string, newPhrase: string): Promise<string> {
    return this.send('IMPORT_LEGACY_CONTAINER', { encryptedHex, newPhrase });
  }

  /**
   * Verifies signature safely inside wasm context
   */
  public static verifySignature(publicKeyHex: string, message: string, signatureHex: string): Promise<boolean> {
    return this.send('VERIFY_SIGNATURE', { publicKeyHex, message, signatureHex });
  }
}
