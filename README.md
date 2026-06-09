# Footcandle Film Society — Members Portal

A Next.js-based membership portal for Footcandle Film Society members to view their status, attendance history, and upcoming screenings.

## Features (Phase 1)

- 🔐 Magic-link email authentication (no passwords)
- 👤 Member dashboard showing:
  - Membership status (Active/Expired/Canceled)
  - Renewal date and auto-renew status
  - Attendance count and history
  - Next upcoming screening
  - Admin announcements
- 📍 Venue tracking (Newton vs Hickory)
- 💳 Payment link to Eventive for renewals

## Tech Stack

- **Next.js 14** - React framework
- **Supabase** - Authentication & database
- **Recharts** - Analytics visualizations (Phase 3)
- **Vercel** - Hosting

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.local.example` to `.env.local` and update:
```
NEXT_PUBLIC_SUPABASE_URL=https://rcjvdvyaqfpbqjunmqjf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=https://members.footcandle.org
```

### 3. Run Locally
```bash
npm run dev
```
Open http://localhost:3000

### 4. Deploy to Vercel

#### Option A: From GitHub (Recommended)
```bash
git init
git add .
git commit -m "Initial: Members portal"
git remote add origin https://github.com/YOUR-USERNAME/footcandle-members-portal.git
git push -u origin main
```
Then in Vercel: "Add New Project" → Select the GitHub repo → Deploy

#### Option B: Upload to Vercel
1. Go to vercel.com
2. "Add New" → "Project"
3. Scroll to "Don't want to use Git?" → "Upload"
4. Drag this folder
5. Deploy

## Architecture

### Database Tables Used
- `members` - Member profiles with status, renewal date, autorenew flag
- `events` - Screenings with date, venue, location_city
- `checkins` - Attendance records (member_id, event_id, checked_in_at)
- `admin_notes` - Announcements pushed to members

### Authentication Flow
1. User enters email on login page
2. Supabase sends magic link to their email
3. Click link → auth callback exchanges code for session
4. Redirects to dashboard → shows their data

## Next Steps

- **Phase 2**: Admin dashboard for creating announcements
- **Phase 3**: Analytics dashboard (attendance trends, venue comparison, renewal tracking)

## Support

Questions? Check the Footcandle project folder for `SETUP-COMPLETE.md` and other docs.
