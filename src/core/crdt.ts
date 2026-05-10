// Quantum Responsibility (Epoch III Prep)
// Conflict-Free Replicated Data Types (CRDT)

import { CrdtRegister } from './wasm_bridge';

/**
 * LWW-Element-Dictionary (Last-Writer-Wins)
 * Allows the Swarm to collapse into a synchronized result instantly without consensus bottlenecks.
 */
export class QuantumMemoryMap<T> {
  // Use Rust CRDT Register under the hood
  private rustRegister = new CrdtRegister();

  // Synchronize state instantly (Observer effect)
  public set(key: string, value: T, timestamp: number = Date.now()): void {
    // For universal support, we store the combined generic object inside the rust register string `status` field.
    // In a full implementation, we could have a more generic protobuf/JSON register in Rust.
    this.rustRegister.merge_state(key, JSON.stringify(value), 50.0, timestamp);
  }

  public get(key: string): T | undefined {
    const raw = this.rustRegister.get_node_state(key);
    if (!raw || typeof raw !== 'object' || !raw.status) return undefined;
    try {
      return JSON.parse(raw.status) as T;
    } catch {
      return undefined;
    }
  }

  public merge(remoteState: Map<string, { value: T; timestamp: number }>): void {
    for (const [key, remoteData] of remoteState.entries()) {
      this.set(key, remoteData.value, remoteData.timestamp);
    }
  }

  public export(): Map<string, { value: T; timestamp: number }> {
    const rawExport = this.rustRegister.export_state();
    const map = new Map<string, { value: T; timestamp: number }>();
    if (rawExport && rawExport !== "{}") {
      try {
        const parsed = JSON.parse(rawExport);
        for (const key in parsed) {
          map.set(key, { value: JSON.parse(parsed[key].status) as T, timestamp: parsed[key].timestamp });
        }
      } catch (e) {}
    }
    return map;
  }
}
