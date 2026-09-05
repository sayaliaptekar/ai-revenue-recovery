# AI Revenue Recovery System

A non-chatbot fintech dashboard for Track 3: AI Revenue Recovery.

## Stack
- Frontend: React + Vite + Axios + Recharts + CSS
- Backend: Node.js + Express
- Database: PostgreSQL
- AI: OpenAI Responses API (server-side only)
- Auth: JWT + bcrypt

## 1. Requirements
Install:
- Node.js LTS
- PostgreSQL
- VS Code
- Git

## 2. Database
Create a PostgreSQL database named `revenue_recovery`.

Then run:
```bash
psql -U postgres -d revenue_recovery -f database/schema.sql
psql -U postgres -d revenue_recovery -f database/seed.sql
```

If `psql` is not in PATH, open pgAdmin Query Tool, create the database, and run the two SQL files there.

## 3. Backend
```bash
cd backend
npm install
copy .env.example .env
```
Edit `.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/revenue_recovery
JWT_SECRET=change_this_to_a_long_random_secret
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.5
```
Start:
```bash
npm run dev
```

## 4. Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal (normally http://localhost:5173).

## Demo login
Email: merchant@demo.com
Password: Demo@123

## API
- POST `/api/auth/login`
- GET `/api/dashboard`
- GET `/api/payments`
- GET `/api/payments/:id`
- POST `/api/recovery/analyze`
- POST `/api/recovery/approve`
- POST `/api/simulator/run`

## Important
Never put `OPENAI_API_KEY` in the React frontend. Keep it in `backend/.env` and never commit `.env`.
