/**
 * MatrixSwarm Benchmark Engine
 * Used to verify node performance and detect virtualization.
 */

export interface BenchmarkResult {
  cpu_score: number;
  ram_score: number;
  is_vm: boolean;
  verified_at: Date;
}

export async function runBenchmark(): Promise<BenchmarkResult> {
  console.log("[BENCHMARK] Starting performance verification...");
  
  // CPU Benchmark: Simple prime calculation
  const cpuStart = Date.now();
  let primes = 0;
  for (let i = 2; i < 500000; i++) {
    let isPrime = true;
    for (let j = 2; j <= Math.sqrt(i); j++) {
      if (i % j === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primes++;
  }
  const cpuDuration = Date.now() - cpuStart;
  const cpuScore = Math.floor(1000000 / cpuDuration);

  // RAM Benchmark: Memory allocation and access
  const ramStart = Date.now();
  const size = 10 * 1024 * 1024; // 10MB
  const buffer = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    buffer[i] = i % 256;
  }
  const ramDuration = Date.now() - ramStart;
  const ramScore = Math.floor(1000000 / ramDuration);

  // VM Detection (Conceptual)
  // In a real browser/node environment, we'd check for specific hardware signatures
  // Here we use a heuristic based on timing jitter
  const jitterStart = performance.now();
  for(let i=0; i<1000; i++) { Math.sqrt(i); }
  const jitterEnd = performance.now();
  const isVM = (jitterEnd - jitterStart) > 0.5; // Heuristic: VMs often have higher jitter

  console.log(`[BENCHMARK] CPU: ${cpuScore}, RAM: ${ramScore}, VM_DETECTED: ${isVM}`);

  return {
    cpu_score: cpuScore,
    ram_score: ramScore,
    is_vm: isVM,
    verified_at: new Date()
  };
}
