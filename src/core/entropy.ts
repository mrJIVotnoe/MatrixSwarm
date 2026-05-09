import { createHash } from 'crypto';

export class EntropyPool {
  private pool: string[] = [];
  private maxPoolSize = 1000;

  // Add entropy from user actions (clicks, mouse moves, timing)
  public addEntropy(source: string, x: number, y: number, timeMs: number) {
    const raw = `${source}:${x},${y}:${timeMs}:${Math.random()}`;
    this.pool.push(raw);
    if (this.pool.length > this.maxPoolSize) {
      this.pool.shift();
    }
  }

  // Generate a cryptographic seed from the chaotic pool of user interactions
  public async generateSeed(): Promise<string> {
    if (this.pool.length === 0) return "00000000000000000000000000000000";
    
    // Combine all events into a single chaotic string
    const chaos = this.pool.join('|');
    
    // Hash it using WebCrypto
    const encoder = new TextEncoder();
    const data = encoder.encode(chaos);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  public getLevel(): number {
    return Math.min(100, Math.floor((this.pool.length / 50) * 100)); // 0 to 100%
  }
}

export const globalEntropyPool = new EntropyPool();
