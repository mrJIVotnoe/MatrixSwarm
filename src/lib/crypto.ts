import { Wallet } from 'ethers';

export async function generateSeedPhrase(): Promise<string> {
  const wallet = Wallet.createRandom();
  return wallet.mnemonic!.phrase;
}

export function getKeysFromSeed(phrase: string): { privateKey: string, publicKey: string } {
  const wallet = Wallet.fromPhrase(phrase);
  return {
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey
  };
}

export async function deriveId(publicKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKey);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // Use first 16 chars as ID
}

export function validateSeedPhrase(phrase: string): boolean {
  try {
     Wallet.fromPhrase(phrase);
     return true;
  } catch (e) {
     return false;
  }
}

