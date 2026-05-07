// Quantum Responsibility (Epoch III Prep)
// Conflict-Free Replicated Data Types (CRDT)

/**
 * LWW-Element-Dictionary (Last-Writer-Wins)
 * Allows the Swarm to collapse into a synchronized result instantly without consensus bottlenecks.
 */
export class QuantumMemoryMap<T> {
  private state = new Map<string, { value: T; timestamp: number }>();

  // Synchronize state instantly (Observer effect)
  public set(key: string, value: T, timestamp: number = Date.now()): void {
    const existing = this.state.get(key);
    if (!existing || existing.timestamp < timestamp) {
      this.state.set(key, { value, timestamp });
    }
  }

  public get(key: string): T | undefined {
    return this.state.get(key)?.value;
  }

  public merge(remoteState: Map<string, { value: T; timestamp: number }>): void {
    for (const [key, remoteData] of remoteState.entries()) {
      this.set(key, remoteData.value, remoteData.timestamp);
    }
  }

  public export(): Map<string, { value: T; timestamp: number }> {
    return new Map(this.state);
  }
}
