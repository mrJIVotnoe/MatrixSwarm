import { WasmEntropyBridge } from './wasm_bridge';

export class EntropyPool {
  private currentSalt: string = "INITIAL_SWARM_SALT";
  private eventCount: number = 0;

  // Add entropy from user actions (clicks, mouse moves, timing)
  public addEntropy(source: string, x: number, y: number, timeMs: number) {
    const moveVector = `${source}_[${x},${y}]`;
    const delay = Math.floor(timeMs);
    
    // Rust absorbs the human chaos instantly, modifying the active salt
    this.currentSalt = WasmEntropyBridge.absorbHumanEntropy(moveVector, delay, this.currentSalt);
    this.eventCount += 1;
  }

  // Retrieve the cryptographic seed cultivated by human-machine Symbiosis
  public async generateSeed(): Promise<string> {
    if (this.eventCount === 0) return "00000000000000000000000000000000";
    
    // The salt has been continuously hashed via Rust Blake3
    const finalSeed = this.currentSalt.substring(0, 32); 
    return finalSeed.padEnd(32, '0');
  }
  
  public getLevel(): number {
    return Math.min(100, Math.floor((this.eventCount / 50) * 100)); // 0 to 100%
  }
}

export const globalEntropyPool = new EntropyPool();
