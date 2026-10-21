import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function signToken(userId: number, phone: string) {
  return jwt.sign({ userId, phone }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number; phone: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: number; phone: string };
}
