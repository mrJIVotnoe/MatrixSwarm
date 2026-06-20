// Web Worker for offloading passport cryptographic operations (PBKDF2 GCM key derivation, encryption, and decryption)

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
    if (type === 'encrypt') {
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
