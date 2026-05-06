import { Wallet } from 'ethers';

export interface Identity {
  mnemonic: string;
  privateKey: string;
  publicKey: string;
  address: string; // Ethers uses address, we can use it as ID hash
}

/**
 * Creates a brand new identity based on a strong BIP39 seed phrase
 */
export function createIdentity(): Identity {
  const wallet = Wallet.createRandom();
  return {
    mnemonic: wallet.mnemonic!.phrase,
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
    address: wallet.address,
  };
}

/**
 * Recovers identity from a mnemonic ("Паспорт Души")
 */
export function recoverIdentity(mnemonic: string): Identity {
  const wallet = Wallet.fromPhrase(mnemonic.trim());
  return {
    mnemonic: wallet.mnemonic!.phrase,
    privateKey: wallet.privateKey,
    publicKey: wallet.publicKey,
    address: wallet.address,
  };
}

/**
 * Sign data with the private key to prove identity
 */
export async function signData(privateKey: string, payload: string): Promise<string> {
  const wallet = new Wallet(privateKey);
  return await wallet.signMessage(payload);
}

/**
 * Verify a signature given a public address and payload
 */
import { verifyMessage } from 'ethers';

export function verifySignature(address: string, payload: string, signature: string): boolean {
  try {
    const recoveredAddress = verifyMessage(payload, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (err) {
    return false;
  }
}
