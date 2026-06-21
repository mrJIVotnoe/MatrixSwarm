// Web Worker for offloading passport cryptographic operations (PBKDF2 GCM key derivation, encryption, and decryption)

let decryptedPassportMemory: string | null = null;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MatrixSwarmIdentityDB", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("identity")) {
        db.createObjectStore("identity");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredValue(key: string): Promise<any> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("identity", "readonly");
    const rx = tx.objectStore("identity").get(key);
    rx.onsuccess = () => resolve(rx.result);
    rx.onerror = () => reject(rx.error);
  });
}

async function setStoredValue(key: string, value: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("identity", "readwrite");
    tx.objectStore("identity").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteStoredValue(key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("identity", "readwrite");
    tx.objectStore("identity").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await self.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return self.crypto.subtle.deriveKey(
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

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  try {
    if (type === 'save_db_passport') {
      const { phrase, password } = payload;
      const enc = new TextEncoder();
      const salt = self.crypto.getRandomValues(new Uint8Array(16));
      const iv = self.crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
      const encrypted = await self.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(phrase)
      );

      const resultObj = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(encrypted))
      };
      
      const payloadString = "PBKDF2-GCM:" + JSON.stringify(resultObj);
      await setStoredValue('soul_passport', payloadString);
      decryptedPassportMemory = phrase;
      self.postMessage({ id, success: true, result: true });
    } else if (type === 'load_db_passport') {
      const { password } = payload;
      const encryptedString = await getStoredValue('soul_passport');
      if (!encryptedString) {
        self.postMessage({ id, success: false, error: "Passport not found in deep storage." });
        return;
      }
      if (!encryptedString.startsWith("PBKDF2-GCM:")) {
        decryptedPassportMemory = encryptedString;
        self.postMessage({ id, success: true, result: encryptedString });
        return;
      }
      const parsedPayload = JSON.parse(encryptedString.slice("PBKDF2-GCM:".length));
      const salt = new Uint8Array(parsedPayload.salt);
      const iv = new Uint8Array(parsedPayload.iv);
      const ciphertext = new Uint8Array(parsedPayload.ciphertext);
      const key = await deriveKey(password, salt);
      const decrypted = await self.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
      );
      const decryptedString = new TextDecoder().decode(decrypted);
      decryptedPassportMemory = decryptedString;
      self.postMessage({ id, success: true, result: decryptedString });
    } else if (type === 'check_db_passport') {
      const stored = await getStoredValue('soul_passport');
      self.postMessage({ id, success: true, result: !!stored });
    } else if (type === 'clear_db_passport') {
      await deleteStoredValue('soul_passport');
      decryptedPassportMemory = null;
      self.postMessage({ id, success: true, result: true });
    } else if (type === 'get_in_memory_passport') {
      self.postMessage({ id, success: true, result: decryptedPassportMemory });
    } else if (type === 'encrypt') {
      const { phrase, password } = payload;
      const enc = new TextEncoder();
      const salt = self.crypto.getRandomValues(new Uint8Array(16));
      const iv = self.crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
      const encrypted = await self.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(phrase)
      );

      const resultObj = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(encrypted))
      };
      
      self.postMessage({ id, success: true, result: "PBKDF2-GCM:" + JSON.stringify(resultObj) });
    } else if (type === 'decrypt') {
      const { encryptedString, password } = payload;
      if (!encryptedString.startsWith("PBKDF2-GCM:")) {
        self.postMessage({ id, success: true, result: encryptedString });
        return;
      }
      const parsedPayload = JSON.parse(encryptedString.slice("PBKDF2-GCM:".length));
      const salt = new Uint8Array(parsedPayload.salt);
      const iv = new Uint8Array(parsedPayload.iv);
      const ciphertext = new Uint8Array(parsedPayload.ciphertext);
      const key = await deriveKey(password, salt);
      const decrypted = await self.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
      );
      const decryptedString = new TextDecoder().decode(decrypted);
      self.postMessage({ id, success: true, result: decryptedString });
    } else {
      self.postMessage({ id, success: false, error: "Unknown request type" });
    }
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err.message || String(err) });
  }
};
