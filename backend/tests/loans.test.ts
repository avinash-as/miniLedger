import request from "supertest";
import app from "../src/index";
import { pool } from "../src/db";

async function getToken(phone = "+919999999999") {
  await request(app).post("/auth/send-otp").send({ phone });
  const otpRow = await pool.query("SELECT code FROM otps WHERE phone=$1 ORDER BY created_at DESC LIMIT 1", [phone]);
  const code = otpRow.rows[0].code;
  const verify = await request(app).post("/auth/verify-otp").send({ phone, code });
  return verify.body.token as string;
}

describe("loans", () => {
  let token: string;
  beforeEach(async () => {
    token = await getToken();
  });

  it("creates a loan", async () => {
    const res = await request(app)
      .post("/loans")
      .set("Authorization", `Bearer ${token}`)
      .send({ friend_name: "Alice", amount: 100, due_date: "2025-01-01" });
    expect(res.status).toBe(201);
    expect(res.body.friend_name).toBe("Alice");
  });

  it("validates input", async () => {
    const res = await request(app)
      .post("/loans")
      .set("Authorization", `Bearer ${token}`)
      .send({ friend_name: "", amount: -5, due_date: "bad" });
    expect(res.status).toBe(400);
  });

  it("marks repaid", async () => {
    const create = await request(app)
      .post("/loans")
      .set("Authorization", `Bearer ${token}`)
      .send({ friend_name: "Bob", amount: 50, due_date: "2025-01-01" });
    const id = create.body.id;
    const repay = await request(app).patch(`/loans/${id}/repay`).set("Authorization", `Bearer ${token}`);
    expect(repay.status).toBe(200);
    expect(repay.body.repaid).toBe(true);
  });

  it("summary", async () => {
    await request(app).post("/loans").set("Authorization", `Bearer ${token}`).send({ friend_name: "A", amount: 100, due_date: "2020-01-01" });
    await request(app).post("/loans").set("Authorization", `Bearer ${token}`).send({ friend_name: "B", amount: 40, due_date: "2030-01-01" });
    const s = await request(app).get("/loans/summary").set("Authorization", `Bearer ${token}`);
    expect(s.status).toBe(200);
    expect(s.body.total_lent).toBe(140);
    expect(s.body.overdue_amount).toBe(100);
  });
});
