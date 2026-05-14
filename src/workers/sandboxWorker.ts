// Digital Shell - Sandboxed Web Worker 
// Isolated from DOM and main thread's local storage (so no access to soul_passport)

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, jobId } = e.data;
  
  if (type === 'EXECUTE_ZIM_QUERY') {
     console.log(`[SandboxWorker] Received ZIM query request for: ${payload.query}`);
     // Simulate intensive task or parsing Kiwix ZIM archive
     setTimeout(() => {
        self.postMessage({
           type: 'ZIM_QUERY_RESULT',
           jobId,
           result: `Found 42 results for "${payload.query}" in offline Wikipedia shard.`
        });
     }, 1500);
  }
  
  if (type === 'P2P_PROCESS_PAYLOAD') {
    // Isolated processing of potentially untrusted incoming data
    try {
      // Simulate validation
      if (payload.includes('MALICIOUS')) {
         throw new Error("Payload failed sandbox heuristics");
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
};
