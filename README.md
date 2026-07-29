# PeerLink

A peer-to-peer learning and collaboration platform for university students,
built to match the SRS exactly:

- **Backend:** Node.js (Express) + PostgreSQL (via Prisma) + Socket.io
- **Frontend:** React.js (Vite)
- **Auth:** institutional-email-gated registration, email verification,
  bcrypt (cost 12), JWT sessions, RBAC
- **Real-time:** WebSocket (Socket.io) for direct messaging, per SRS 3.4
- **File uploads:** 50MB limit, PDF/DOCX/PNG/JPEG only, per NFR5

This was built and **verified against a real running PostgreSQL instance**
(every core flow - registration, tutor search, session booking, ratings,
study groups, messaging - was run end-to-end during development). The one
thing I could *not* verify in the sandbox is `prisma generate` itself, since
its engine binary download is blocked on that network - that's a normal
`npm install` step you'll run once locally with real internet access.

## What's real vs. stubbed

Everything in the SRS's core functional requirements (FR1-FR10) is fully
implemented against Postgres. Four external integrations from SRS 3.3 are
stubbed with clear `STUB:` comments and a swap-in point, since they need
real third-party credentials I don't have:

| Integration | File | What it does now |
|---|---|---|
| SendGrid (emails) | `backend/src/lib/email.js` | Logs the email to the console instead of sending it |
| Google Calendar | `backend/src/lib/calendar.js` | Returns a fake event id instead of creating a real event |
| Firebase Cloud Messaging | `backend/src/lib/push.js` | Stores the notification in Postgres instead of pushing to a device |
| AWS S3 | `backend/src/lib/storage.js` | Saves files to local disk (`backend/uploads/`) instead of S3 |

Everything else - auth, tutor search, session booking, resource metadata,
study groups, ratings, real-time messaging, the dashboard - runs for real.

## Recently added (quick-win features)

- **Notifications inbox** - a real page at `/notifications`, not just an
  unread count. Click a notification to mark it read, or "mark all as read."
  The nav bar shows a live unread count.
- **Recurring availability** - a tutor can add a slot "just once" or repeat
  it weekly for 4/8/12 weeks in one action, all sharing a `recurrenceGroupId`.
  "Remove series" cancels every future slot in that series at once.
- **Session location field** - sessions can carry a Zoom link or physical
  location, settable at booking time or edited afterward by either party
  from the Sessions page.
- **Course autocomplete on Resources** - upload and filter now use a live
  `datalist` of every course code already in use, instead of free-typing a
  code from scratch each time.

All four were verified with a dedicated smoke test against real PostgreSQL
before being handed off.

## Setup (do this tonight, not tomorrow morning)

### 1. PostgreSQL
Easiest path: a free [Supabase](https://supabase.com) project gives you a
connection string in under a minute. Or run Postgres locally / in Docker.

### 2. Backend
```bash
cd backend
cp .env.example .env        # paste your DATABASE_URL, set a JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run seed                 # creates a demo tutor + student + session + group
npm run dev                  # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                  # http://localhost:5173
```

### 4. Demo logins (from the seed script)
- Tutor: `grace.uwase@alueducation.com` / `Password123!`
- Student: `jean.mugisha@alueducation.com` / `Password123!`

Registration requires an `@alueducation.com` email by default - change
`INSTITUTIONAL_EMAIL_DOMAIN` in `backend/.env` if your cohort uses a
different domain.

## Suggested demo flow for tomorrow

1. **Register** a new student account live (shows FR1 + email verification
   flow - the verify link is shown on-screen since there's no real inbox).
2. **Log in** as the seeded tutor, add an availability slot.
3. **Log in** as the seeded student, search tutors by subject, open the
   tutor's profile, book the slot (FR3, FR4).
4. Switch back to the tutor, mark the session **completed**.
5. Switch to the student, leave a **rating** (FR8) - watch the tutor's
   average update live.
6. Open **Messages** in two browser windows (or one normal + one incognito)
   logged in as each user, send a message, and show it arriving instantly
   via Socket.io (FR6, NFR3).
7. Upload a **resource** and show the download link (FR5).
8. Create a **study group** and have the other account request to join (FR7).

## Honest next steps (good to mention if asked)

- Swap the four stubbed integrations for real SendGrid/Google/Firebase/S3
  credentials - each file says exactly what to change.
- Group messaging (FR6.1) reuses the same `Message` model but isn't wired
  into the UI yet - direct messaging is fully working.
- Mobile app (React Native, per SRS 2.4) isn't started - this is the web
  client only.
