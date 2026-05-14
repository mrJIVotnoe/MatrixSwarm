// Железо смертно. Информация бессмертна. Рой вечен.
import { WasmIdentity } from '../core/wasm_bridge';
import { globalEntropyPool } from '../core/entropy';

export async function generateSeedPhrase(): Promise<string> {
  const entropy = await globalEntropyPool.generateSeed();
  const passport = await WasmIdentity.forgePassport(entropy);
  return passport.seed_phrase;
}

export async function getKeysFromSeed(phrase: string): Promise<{ privateKey: string, publicKey: string, nodeId: string }> {
  const passport = await WasmIdentity.recoverFromSeed(phrase);
  return {
    privateKey: "HIDDEN_IN_RUST",
    publicKey: passport.public_key,
    nodeId: passport.node_id
  };
}

export async function deriveId(publicKey: string): Promise<string> {
  throw new Error("Deprecated. Node ID should be derived directly via WasmIdentity.recoverFromSeed");
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

