// Железо смертно. Информация бессмертна. Рой вечен.
import { WasmIdentity } from '../core/wasm_bridge';
import { globalEntropyPool } from '../core/entropy';

let cryptoWorker: Worker | null = null;
const pendingWorkerRequests = new Map<string, { resolve: (val: any) => void, reject: (err: any) => void }>();

function getCryptoWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (!cryptoWorker) {
    try {
      cryptoWorker = new Worker(new URL('./crypto.worker.ts', import.meta.url), { type: 'module' });
      cryptoWorker.onmessage = (e) => {
        const { id, success, result, error } = e.data;
        const pending = pendingWorkerRequests.get(id);
        if (pending) {
          pendingWorkerRequests.delete(id);
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error));
          }
        }
      };
    } catch (e) {
      console.warn("[CryptoWorker] Failed to initialize worker, falling back to main-thread: ", e);
      cryptoWorker = null;
    }
  }
  return cryptoWorker;
}

function runInWorker(type: 'encrypt' | 'decrypt', payload: any): Promise<any> {
  const worker = getCryptoWorker();
  if (!worker) {
    return Promise.reject(new Error("Worker not available"));
  }
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).substring(2, 11);
    pendingWorkerRequests.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload });
  });
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptSeed(phrase: string, password: string): Promise<string> {
  try {
    return await runInWorker('encrypt', { phrase, password });
  } catch (err) {
    console.debug("[CryptoWorker] Worker encryption failed or disabled, using main-thread fallback.");
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(phrase)
    );

    const resultObj = {
      salt: Array.from(salt),
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(encrypted))
    };
    return "PBKDF2-GCM:" + JSON.stringify(resultObj);
  }
}

export async function decryptSeed(encryptedString: string, password: string): Promise<string> {
  if (!encryptedString.startsWith("PBKDF2-GCM:")) {
    // Return raw if it wasn't encrypted (legacy)
    return encryptedString;
  }
  try {
    return await runInWorker('decrypt', { encryptedString, password });
  } catch (err) {
    console.debug("[CryptoWorker] Worker decryption failed or disabled, using main-thread fallback.");
    const payload = JSON.parse(encryptedString.slice("PBKDF2-GCM:".length));
    const salt = new Uint8Array(payload.salt);
    const iv = new Uint8Array(payload.iv);
    const ciphertext = new Uint8Array(payload.ciphertext);
    const key = await deriveKey(password, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  }
}

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


