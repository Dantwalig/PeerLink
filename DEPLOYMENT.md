# Deploying PeerLink

Three pieces to stand up, in this order: **database → backend → frontend**.
Each depends on the one before it, so don't skip ahead.

Budget: everything below is free-tier friendly. Total time if nothing goes
wrong: ~30-40 minutes.

> **Note on platform choice:** the SRS names Railway. This deployment uses
> **Render** instead - functionally equivalent for this app (both support
> the long-lived connections Socket.io needs), Render was just what was
> actually used to stand this build up. See the README's "Changes from the
> SRS" section for the full reasoning on this and the other substitutions
> (Resend instead of SendGrid, `.ics`/built-in calendar instead of Google
> Calendar, Postgres instead of AWS S3/Firebase).

---

## 1. Push your code to GitHub

Render and Vercel both deploy by connecting to a GitHub repo.

```bash
cd peerlink
git init
git add .
git commit -m "Initial PeerLink MVP"
```

Create a new repo on GitHub, then:

```bash
git remote add origin https://github.com/<you>/peerlink.git
git branch -M main
git push -u origin main
```

---

## 2. Database - Supabase

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Pick a region close to you, set a database password (save it somewhere
   safe - never paste it into a chat or commit it to the repo).
3. Once it's provisioned: **Project Settings → Database → Connection string**.
   You need **two** versions:
   - **Pooled** ("Transaction" mode, port 6543, `?pgbouncer=true`) → this is `DATABASE_URL`
   - **Direct** ("Session" mode, port 5432) → this is `DIRECT_URL`
4. `schema.prisma` already has `directUrl` wired up, so once both env vars
   are set on Render, `prisma migrate deploy` automatically uses the direct
   connection and the app automatically uses the pooled one - no manual
   swapping needed (this is exactly the PgBouncer issue from your
   stand-up, now fixed at the Prisma config level instead of by hand).

---

## 3. Backend - Render

1. Go to [render.com](https://render.com) → New → **Web Service** → connect
   your GitHub repo.
2. **Root Directory** → `backend`.
3. **Build Command** → `npm install && npx prisma generate`
4. **Start Command** → `npm start`
5. **Instance Type** → Free is fine for grading; note the cold-start caveat below.
6. **Environment** tab - add everything from `backend/.env.example`:
   ```
   DATABASE_URL=<your Supabase POOLED connection string>
   DIRECT_URL=<your Supabase DIRECT connection string>
   JWT_SECRET=<generate a long random string>
   PORT=4000
   INSTITUTIONAL_EMAIL_DOMAIN=alueducation.com
   RESEND_API_KEY=<your Resend API key, or leave blank to log emails to console instead>
   EMAIL_FROM=PeerLink <onboarding@resend.dev>
   FRONTEND_URL=<leave blank for now, fill in after step 4>
   ```
7. **Create Web Service.** Once it's live, Render gives you a public URL
   like `https://peerlink-backend.onrender.com`. Save it.
8. **Run the migration once**, from your own laptop, using the DIRECT
   connection string (simplest in practice - you don't need Render's shell
   for a one-time migration):
   ```bash
   DATABASE_URL="<DIRECT connection string>" DIRECT_URL="<DIRECT connection string>" npx prisma migrate deploy
   DATABASE_URL="<DIRECT connection string>" DIRECT_URL="<DIRECT connection string>" npm run seed
   ```
9. Sanity check: visit `https://<your-render-url>/api/health` → should
   return `{"status":"ok"}`.

---

## 4. Frontend - Vercel

1. Go to [vercel.com](https://vercel.com) → Add New → Project → import the same GitHub repo.
2. **Root Directory** → `frontend`.
3. Framework preset should auto-detect Vite. Build command `npm run build`, output directory `dist`.
4. **Environment Variables:**
   ```
   VITE_API_URL=https://<your-render-url>/api
   VITE_SOCKET_URL=https://<your-render-url>
   ```
5. Deploy. Vercel gives you a URL like `https://peerlink.vercel.app`.

---

## 5. Close the loop - CORS

Back in Render → your backend's **Environment** → set:
```
FRONTEND_URL=https://peerlink.vercel.app
```
Render redeploys automatically on env var changes. Skip this and every
request gets CORS-blocked.

---

## 6. Verify end to end

- Open the Vercel URL, register a new account with an institutional email.
- If `RESEND_API_KEY` is set: check the inbox for a real verification email.
  If not: the API response includes a `devVerificationUrl` you can open directly.
- Check the browser's Network tab - requests should hit your Render URL and
  succeed (no CORS errors, no 401s).
- Book a session, then download its "Add to calendar" `.ics` file and open
  it - confirms the calendar feature works over the public deployment, not
  just localhost.
- Open two browser windows (or one + incognito), log in as two different
  seeded users, and confirm a message sent in one appears instantly in the
  other (proves Socket.io is actually connecting over the public URL).
- Upload a resource and download it back - confirms file bytes survive the
  round trip through Postgres on the live deployment.

---

## Known limitations to mention if asked

- **Cold starts.** Render's free tier spins down after ~15 minutes of
  inactivity and takes time to wake back up. If presenting live, hit
  `/api/health` a few minutes beforehand to warm it up.
- **Socket.io + multiple instances.** If you ever scale the backend to more
  than one instance, Socket.io needs sticky sessions or a Redis adapter.
  Not a concern at one instance, which is what you'll have by default.
- **File storage lives in Postgres**, not S3. Fine at student-project
  volume, but a database isn't the long-term right place for large binary
  files at real scale - if this ever needs to hold thousands of large
  files, move to S3/Supabase Storage (the change is isolated to
  `storage.js` and `routes/resources.js`).
- **Email needs `RESEND_API_KEY` to actually send.** Without it, the app
  still works end to end (links are returned in the API response instead)
  but no real email goes out - fine for grading, not for real users.
