# MiniLedger

Track money lent to friends. Backend (Node.js + TypeScript + PostgreSQL) with phone/OTP auth, loan entries, repayment, summary. Mobile app (React Native / Expo).

## Project structure

- `backend/` – Express + TypeScript API
- `mobile/` – React Native (Expo) app

## Backend setup

Prerequisites: Node.js 18+, PostgreSQL 14+.

1. Create database:
   ```bash
   psql -U postgres -c "CREATE DATABASE miniledger;"
   ```
2. Install deps:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # edit .env if needed
   ```
3. Run migrations:
   ```bash
   npm run migrate
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:4000. OTPs are printed to the server console.

5. Run tests:
   ```bash
   npm test
   ```

### API

- `POST /auth/send-otp` `{ phone }`
- `POST /auth/verify-otp` `{ phone, code }` → `{ token, user }`
- `GET /loans` (auth) list entries
- `POST /loans` (auth) add entry; multipart with optional `receipt` image
- `PATCH /loans/:id/repay` (auth) mark repaid
- `GET /loans/summary` (auth) → total_lent, total_repaid, outstanding, overdue_amount, overdue_count

## Mobile app setup

1. Install deps:
   ```bash
   cd mobile
   npm install
   ```
2. Start:
   ```bash
   npx expo start
   ```
   - Android emulator uses `http://10.0.2.2:4000` (auto).
   - iOS simulator / web uses `http://localhost:4000`.
   - For a physical device, edit `API_BASE` in `mobile/src/api.ts` to your machine's LAN IP.

3. Run on device/emulator via Expo Go.

## Notes

- OTP is mocked: the server prints the code to its log; enter that code in the app.
- Overdue = not repaid and due_date before today.
- Receipt upload is optional (bonus).
