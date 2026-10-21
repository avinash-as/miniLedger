import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../auth";

export interface AuthRequest extends Request {
  userId?: number;
  phone?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.userId;
    req.phone = payload.phone;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
