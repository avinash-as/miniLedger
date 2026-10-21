import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query } from "../db";
import { AuthRequest } from "../middleware/authMiddleware";

const router = Router();

const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only images allowed"));
    cb(null, true);
  },
});

// List loans
router.get("/", async (req: AuthRequest, res: Response) => {
  const r = await query(
    "SELECT id, friend_name, amount, due_date, repaid, repaid_at, receipt_path, created_at FROM loans WHERE user_id=$1 ORDER BY created_at DESC",
    [req.userId]
  );
  res.json(r.rows);
});

// Add loan
router.post("/", upload.single("receipt"), async (req: AuthRequest, res: Response) => {
  const { friend_name, amount, due_date } = req.body || {};
  if (!friend_name || typeof friend_name !== "string" || friend_name.trim().length === 0) {
    return res.status(400).json({ error: "friend_name required" });
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: "amount must be positive number" });
  }
  if (!due_date || isNaN(Date.parse(due_date))) {
    return res.status(400).json({ error: "valid due_date required (YYYY-MM-DD)" });
  }
  const receipt_path = req.file ? req.file.filename : null;
  const r = await query(
    "INSERT INTO loans(user_id, friend_name, amount, due_date, receipt_path) VALUES($1,$2,$3,$4,$5) RETURNING *",
    [req.userId, friend_name.trim(), amt, due_date, receipt_path]
  );
  res.status(201).json(r.rows[0]);
});

// Mark repaid
router.patch("/:id/repay", async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });
  const r = await query(
    "UPDATE loans SET repaid=TRUE, repaid_at=NOW() WHERE id=$1 AND user_id=$2 AND repaid=FALSE RETURNING *",
    [id, req.userId]
  );
  if (r.rows.length === 0) return res.status(404).json({ error: "Loan not found or already repaid" });
  res.json(r.rows[0]);
});

// Summary
router.get("/summary", async (req: AuthRequest, res: Response) => {
  const r = await query(
    `SELECT
      COALESCE(SUM(amount),0) AS total_lent,
      COALESCE(SUM(CASE WHEN repaid THEN amount ELSE 0 END),0) AS total_repaid,
      COALESCE(SUM(CASE WHEN repaid=FALSE AND due_date < CURRENT_DATE THEN amount ELSE 0 END),0) AS overdue_amount,
      COUNT(*)::int AS total_count,
      COUNT(*) FILTER (WHERE repaid=FALSE AND due_date < CURRENT_DATE)::int AS overdue_count
     FROM loans WHERE user_id=$1`,
    [req.userId]
  );
  const row = r.rows[0];
  res.json({
    total_lent: Number(row.total_lent),
    total_repaid: Number(row.total_repaid),
    outstanding: Number(row.total_lent) - Number(row.total_repaid),
    overdue_amount: Number(row.overdue_amount),
    total_count: row.total_count,
    overdue_count: row.overdue_count,
  });
});

export default router;
