import request from "supertest";
import app from "../src/index";
import { pool } from "../src/db";

describe("auth", () => {
  it("rejects invalid phone", async () => {
    const res = await request(app).post("/auth/send-otp").send({ phone: "abc" });
    expect(res.status).toBe(400);
  });

  it("sends otp and verifies", async () => {
    const phone = "+919999999999";
    const send = await request(app).post("/auth/send-otp").send({ phone });
    expect(send.status).toBe(200);

    const otpRow = await pool.query("SELECT code FROM otps WHERE phone=$1 ORDER BY created_at DESC LIMIT 1", [phone]);
    const code = otpRow.rows[0].code;

    const verify = await request(app).post("/auth/verify-otp").send({ phone, code });
    expect(verify.status).toBe(200);
    expect(verify.body.token).toBeTruthy();
  });

  it("rejects wrong otp", async () => {
    const phone = "+919999999999";
    await request(app).post("/auth/send-otp").send({ phone });
    const verify = await request(app).post("/auth/verify-otp").send({ phone, code: "000000" });
    expect(verify.status).toBe(400);
  });
});
