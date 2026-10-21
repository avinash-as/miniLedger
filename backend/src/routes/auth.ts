import { Router, Request, Response } from "express";
import { query } from "../db";
import { signToken } from "../auth";

const router = Router();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/send-otp", async (req: Request, res: Response) => {
  const { phone } = req.body || {};
  if (!phone || typeof phone !== "string" || !/^\+?[0-9]{7,15}$/.test(phone)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }
  const code = generateOtp();
  const expires = new Date(Date.now() + 5 * 60 * 1000);
  await query("INSERT INTO otps(phone, code, expires_at) VALUES($1,$2,$3)", [phone, code, expires]);
  console.log(`[OTP] phone=${phone} code=${code}`);
  res.json({ message: "OTP sent", phone });
});

router.post("/verify-otp", async (req: Request, res: Response) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ error: "phone and code required" });
  const r = await query(
    "SELECT id FROM otps WHERE phone=$1 AND code=$2 AND used=FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
    [phone, code]
  );
  if (r.rows.length === 0) return res.status(400).json({ error: "Invalid or expired OTP" });
  await query("UPDATE otps SET used=TRUE WHERE id=$1", [r.rows[0].id]);
  // upsert user
  const u = await query(
    "INSERT INTO users(phone) VALUES($1) ON CONFLICT (phone) DO UPDATE SET phone=EXCLUDED.phone RETURNING id, phone",
    [phone]
  );
  const user = u.rows[0];
  const token = signToken(user.id, user.phone);
  res.json({ token, user: { id: user.id, phone: user.phone } });
});

export default router;
