# Dispatch — Scheduled Email & Editorial Dispatch Studio

A full-stack scheduled email studio built with a retro-editorial stationery aesthetic, persistent Redis/BullMQ delayed job queueing, SQLite/Prisma persistence, real-time 1-second dashboard tracking, and Ethereal SMTP delivery inspection.

## Key Features
- **Precision Scheduling & Queue Lifecycle:** Schedule emails to the exact minute, dispatch immediately (Send Now), Reschedule pending jobs, Cancel queued dispatches, or Retry failed jobs.
- **Bulk Campaigns, CSV Import & Staggered Throttling:** Add multiple recipients manually or via CSV upload, personalize subjects and bodies with dynamic `{{name}}` and `{{email}}` merge tags, and configure Bulk Stagger Delay to space out consecutive sends.
- **Editorial Stationery Templates & Live Split Preview:** Compose with a side-by-side live preview across 3 inline-styled HTML email layouts (Classic Editorial Letter, Blush Event Card, and Minimalist Note).
- **Real-Time Studio Dashboard:** Live 1-second countdown ticker, adaptive polling, slide-over email detail inspector drawer, duplicate-and-schedule workflow, search/status filtering, and CSV delivery history export.
- **Crash-Safe Recovery & Rate Limiting:** Automatic startup recovery re-enqueues pending SCHEDULED jobs from SQLite into BullMQ on server boot; configurable worker concurrency and sliding-window rate limiting protect SMTP throughput.
- **Authentication:** Email/password registration and login with JWT protection plus Continue with Google sign-in.

## Tech Stack
- **Frontend (:5173):** React, Vite, Tailwind CSS, React Router, Lucide Icons, `@react-oauth/google`
- **Backend (:5001):** Node.js, Express, JWT (`jsonwebtoken`), `bcryptjs`, `google-auth-library`
- **Queue & Mail:** BullMQ, Redis, Nodemailer, Ethereal Email
- **Database:** SQLite, Prisma ORM

## Local Setup
1. Start Redis locally: `brew services start redis`
2. Backend: `cd backend && npm install && npx prisma generate && npx prisma db push && npm run dev`
3. Frontend: `cd frontend && npm install && npm run dev`
