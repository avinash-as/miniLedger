import { pool } from "../src/db";

beforeAll(async () => {
  // ensure schema exists
  // migrations already run; but run here for safety
});

beforeEach(async () => {
  await pool.query("DELETE FROM loans");
  await pool.query("DELETE FROM otps");
  await pool.query("DELETE FROM users");
});

afterAll(async () => {
  await pool.end();
});
