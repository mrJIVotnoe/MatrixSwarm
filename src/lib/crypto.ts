// Железо смертно. Информация бессмертна. Рой вечен.
import { WasmIdentity } from '../core/wasm_bridge';
import { globalEntropyPool } from '../core/entropy';

export async function generateSeedPhrase(): Promise<string> {
  const entropy = await globalEntropyPool.generateSeed();
  const passport = await WasmIdentity.forgePassport(entropy);
  return passport.seed_phrase;
}

export async function getKeysFromSeed(phrase: string): Promise<{ privateKey: string, publicKey: string }> {
  // Wasm validation
  const passport = await WasmIdentity.recoverFromSeed(phrase);
  return {
    privateKey: "HIDDEN_IN_RUST",
    publicKey: passport.public_key
  };
}

export async function deriveId(publicKey: string): Promise<string> {
  // Now returning Blake3 node_id generated from WASM (simulated here)
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKey);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return "WASM_" + hashHex.substring(0, 12).toUpperCase();
}

export async function validateSeedPhrase(phrase: string): Promise<boolean> {
  try {
     await WasmIdentity.recoverFromSeed(phrase);
     return true;
  } catch (e) {
     return false;
  }
}

export async function soulMigration(oldPhrase: string, newPhrase: string, legacyKarma: number) {
  return await WasmIdentity.soulMigration(oldPhrase, newPhrase, legacyKarma);
}

