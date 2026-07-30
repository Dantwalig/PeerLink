# PeerLink

A peer-to-peer learning and collaboration platform for university students,
built from the SRS - with a few deliberate deviations from it, explained
below.

- **Backend:** Node.js (Express) + PostgreSQL (via Prisma, hosted on Supabase) + Socket.io
- **Frontend:** React.js (Vite)
- **Auth:** institutional-email-gated registration, real email verification
  via Resend, bcrypt (cost 12), JWT sessions, RBAC
- **Real-time:** WebSocket (Socket.io) for direct messaging, per SRS 3.4
- **File uploads:** 50MB limit, PDF/DOCX/PNG/JPEG only, per NFR5 - stored
  directly in Postgres, not S3

This was built and **verified against a real running PostgreSQL instance**
at every stage - registration, tutor search, session booking, ratings,
study groups, messaging, recurring availability, ICS calendar files, and
resource uploads were all run end-to-end (several via a real HTTP round
trip through the actual route/multer code, not just raw SQL). The one
thing that couldn't be verified in the dev sandbox is `prisma generate`
itself and a live Resend send, since both need external hosts that were
network-blocked there - that's a normal one-time step you'll run locally
with real internet access.

## Changes from the SRS

The SRS specifies Railway, Google Calendar, SendGrid, Firebase, and AWS S3.
This build uses different, deliberately-chosen alternatives instead - here's
what changed and why.

### Deployment: Render, not Railway
No functional difference to PeerLink itself; Render was simply the platform
actually used to deploy this build. See `DEPLOYMENT.md` for Render-specific
steps (root directory, build/start commands, environment variables).

### Calendar: real `.ics` files + a built-in calendar view, not Google Calendar
Google Calendar's API needs an OAuth consent flow - a registered Google
Cloud project, a verified app, per-user authorization. That's real
infrastructure with nothing to do with PeerLink's own functionality, and it
doesn't demo well for a student project (a judge would need to actually
grant OAuth access to a stranger's app).

The practical alternative: **`GET /sessions/:id/calendar.ics`** generates a
real file in the iCalendar standard - the same format Google Calendar,
Outlook, and Apple Calendar all import natively. No API key, no OAuth, no
third-party account, and the session still ends up in whichever calendar
app the user actually uses. This was verified by parsing the generated file
with an independent third-party ICS parser (not just visual inspection),
confirming it's genuinely spec-compliant.

On top of that, per your instruction to add a built-in calendar as a
fallback: there's also a **`/calendar`** page in the app itself - a month
grid showing every upcoming and past session, no download required.

### Email: Resend, not SendGrid
Functionally a straight swap - same idea (transactional email API), same
graceful-degradation pattern as your faithhoopers project's email setup
(no API key → logs to console and hands back the link directly, instead of
failing registration). `backend/src/lib/email.js` uses Resend's HTTP API
directly via Node's built-in `fetch`, so there's no extra dependency to
install. Sign up free at [resend.com](https://resend.com), verify a sending
domain (or use their shared test domain for a demo), and set
`RESEND_API_KEY` + `EMAIL_FROM`.

Also added while wiring this up: a `POST /auth/verify/resend` endpoint and
matching UI on the Login page, so a lost or expired verification email
isn't a dead end.

### File storage: Postgres, not AWS S3 or Firebase
`backend/src/lib/storage.js` uses multer's in-memory storage, and
`routes/resources.js` writes the raw file bytes straight into a Postgres
`Bytes` column on `Resource` - nothing touches local disk or any external
service. This was verified with a real HTTP upload → Postgres → download
round trip, confirming the downloaded bytes match the original exactly.

Notifications (FR9) were already Postgres-only and didn't need to change -
`push.js` now says so explicitly rather than describing itself as a
placeholder for Firebase Cloud Messaging, since per your instructions,
Firebase isn't part of this build's design at all.

### Database: Supabase, matching your provided connection strings exactly
`schema.prisma`'s datasource block now uses Prisma's `directUrl` field -
the officially recommended fix for the exact PgBouncer issue flagged in
the team stand-up. The app runs on the pooled connection (`DATABASE_URL`,
port 6543) for normal queries; `prisma migrate`/`db push` automatically use
the direct, non-pooled connection (`DIRECT_URL`, port 5432) instead - no
more manually swapping connection strings for migrations.

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
- **"Add to calendar"** - a real `.ics` download button on every confirmed
  session, plus the built-in `/calendar` month view described above.
- **Resend-verification flow** - if a verification email expires or gets
  lost, the Login page offers to send a fresh one.

## Setup (do this tonight, not tomorrow morning)

### 1. PostgreSQL - Supabase
Go to [supabase.com](https://supabase.com) → New Project. Once it's
provisioned, **Project Settings → Database → Connection string** gives you
two URLs you need:
- **Pooled** (port 6543, `?pgbouncer=true`) → `DATABASE_URL`
- **Direct** (port 5432) → `DIRECT_URL`

### 2. Backend
```bash
cd backend
cp .env.example .env        # paste DATABASE_URL, DIRECT_URL, set a JWT_SECRET
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
different domain. Without `RESEND_API_KEY` set, verification/reset links
are returned directly in the API response instead of emailed - fine for
local dev and grading, real email needs the key configured.

## Suggested demo flow for tomorrow

1. **Register** a new student account live (shows FR1 + real email
   verification - or the on-screen dev link if Resend isn't configured).
2. **Log in** as the seeded tutor, add a recurring weekly availability slot.
3. **Log in** as the seeded student, search tutors by subject, open the
   tutor's profile, book a slot with a Zoom link as the location (FR3, FR4).
4. Download the session's **"Add to calendar"** `.ics` file, and/or show
   the built-in `/calendar` view.
5. Switch back to the tutor, mark the session **completed**.
6. Switch to the student, leave a **rating** (FR8) - watch the tutor's
   average update live.
7. Open **Messages** in two browser windows (or one normal + one incognito)
   logged in as each user, send a message, and show it arriving instantly
   via Socket.io (FR6, NFR3).
8. Upload a **resource**, show course autocomplete, and download it back.
9. Create a **study group** and have the other account request to join (FR7).
10. Open **Notifications** and show the unread badge clearing.

## Honest next steps (good to mention if asked)

- Group messaging (FR6.1) reuses the same `Message` model but isn't wired
  into the UI yet - direct messaging is fully working.
- Mobile app (React Native, per SRS 2.4) isn't started - this is the web
  client only.
- If push notifications (not just in-app) are ever wanted, Web Push
  (browser-native, no vendor account needed) is a lighter next step than
  Firebase Cloud Messaging - a genuinely separate feature, not a loose end
  of the current design.

## What else could make this better (not yet built)

A few ideas worth considering for a future iteration, roughly in order of
effort vs. payoff:
- **Admin panel** - the SRS defines a Platform Administrator user class,
  but there's no admin UI yet to verify tutors, moderate content, or see
  platform-wide stats.
- **Tutor verification badge** - `isTutor` is currently self-declared at
  registration; a real "pending → admin-approved" flow would make
  "Verified Tutor" meaningful rather than a checkbox.
- **Smart tutor matching** - suggest tutors based on a student's own
  subjects/faculty instead of pure search; a good SQL query dressed up as
  a feature, not real ML, but demos well.
- **Gamification** - streaks, completed-session badges, or a top-rated-tutor
  leaderboard; cheap to build, memorable in a presentation.

