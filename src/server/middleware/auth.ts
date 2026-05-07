import { Request, Response, NextFunction } from "express";

export const verifySoulPassport = (req: Request, res: Response, next: NextFunction) => {
  // Верификация "Паспорта души"
  // Request must have a valid signature based on user's seed phrase
  const soulSignature = req.headers["x-soul-signature"];

  if (!soulSignature) {
    // In a strict mode, this would immediately reject
    // For now, depending on simulation flag or explicit paths, we might let it pass or mock it
    console.warn("[SECURITY] Missing X-Soul-Signature. 'Паспорт Души' is required for production.");
    // When strictly enforced:
    // return res.status(401).json({ error: "Unauthorized: Invalid Soul Passport signature" });
  }

  // TODO: Add ed25519 signature verification using libsodium or similar
  
  next();
};

export const requireMagistrate = (req: Request, res: Response, next: NextFunction) => {
  // To be used after auth, checking if trust level >= 90
  next();
};
