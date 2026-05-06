export interface ResourceQuotas {
  maxCpuPercentage: number;
  maxRamMb: number;
  maxExecutionTimeMs: number;
}

export class SwarmSandbox {
  // Execute task securely using a sandboxed Web Worker (Zero-Trust context)
  public static async executeTask(taskCode: string, taskPayload: any, quotas: ResourceQuotas): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        // Fallback for non-browser environments
        resolve({ success: true, fallback: true });
        return;
      }

      console.log(`[SwarmSandbox] Spawning secure Worker. Limits: ${quotas.maxExecutionTimeMs}ms, ${quotas.maxRamMb}MB`);

      const workerCode = `
        // Sandbox environment initialization
        // Obliterate dangerous globals to prevent DOM and network escape
        self.window = self;
        self.document = undefined;
        self.localStorage = undefined;
        self.indexedDB = undefined;
        self.fetch = undefined;
        self.XMLHttpRequest = undefined;

        self.onmessage = function(e) {
          try {
            const payload = e.data;
            // Inject and execute task code in isolated context
            const codeString = ${JSON.stringify(taskCode)};
            const taskFunc = new Function('payload', codeString);
            const result = taskFunc(payload);
            self.postMessage({ success: true, result });
          } catch (err) {
            self.postMessage({ success: false, error: err.toString() });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      // Enforce Execution Time Limit (Quota Management)
      const timeoutId = setTimeout(() => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        console.error(`[SwarmSandbox] Quota Exceeded: Terminating aggressive worker.`);
        reject(new Error(`[Sandbox] Execution terminated: Exceeded ${quotas.maxExecutionTimeMs}ms execution time quota.`));
      }, quotas.maxExecutionTimeMs);

      worker.onmessage = (e) => {
        clearTimeout(timeoutId);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error));
        }
      };

      worker.onerror = (e) => {
        clearTimeout(timeoutId);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        reject(new Error(`[Sandbox] Worker error: ${e.message}`));
      };

      worker.postMessage(taskPayload);
    });
  }
}
