# Email Setup Guide for Footcandle Members Portal

## Overview

Phase 2 includes a complete email draft system. Emails are drafted and queued in the database but **not automatically sent** until you configure an email service. This guide shows you how to set it up.

## Step 1: Create Supabase Storage Bucket (for posters)

**In Supabase Dashboard:**

1. Go to **Storage** (left sidebar)
2. Click **Create new bucket**
3. Name it: `film-posters`
4. Make it **Public** (so members can see the posters)
5. Click **Create bucket**

This bucket will store uploaded movie posters.

---

## Step 2: Configure Email Service

You have two main options:

### Option A: Supabase Email (Simple)

Supabase has built-in email via Resend. This is the easiest for getting started.

1. Go to **Authentication** → **Email Templates**
2. Click **Configure** next to the default template
3. Supabase will guide you through Resend setup
4. Note: You get a limited free tier (100 emails/day)

### Option B: SendGrid, Mailgun, or AWS SES (Production)

For higher volume, use a dedicated email service:

**SendGrid:**
1. Sign up at sendgrid.com
2. Create an API key
3. In Supabase, go to **Project Settings** → **Email**
4. Select SendGrid as the provider
5. Paste your API key

**Mailgun:**
1. Sign up at mailgun.com
2. Get your domain and API key
3. Configure in Supabase Email settings

**AWS SES:**
1. Set up in AWS Console
2. Verify your domain
3. Configure in Supabase or use Lambda functions

---

## Step 3: Wire Up Email Sending

Once you've configured an email service, the system will:

1. **Draft emails** in the admin dashboard (Film Screenings, Renewal Reminders, Announcements)
2. **Queue them** in the `email_queue` table
3. **Review them** in the Email Queue admin page
4. **Send them** by clicking the Send button

**Flow:**
```
Admin creates announcement
    ↓
Email drafted in queue
    ↓
Admin reviews in Email Queue
    ↓
Admin clicks "Send"
    ↓
Email sent via configured service
    ↓
Status updated to "sent"
```

---

## Step 4: Automatic Renewal Reminders (Future)

Currently, renewal reminders are **on-demand** (you manually send them).

To enable **automatic reminders** when memberships expire:

1. Set up a Supabase Edge Function that runs on a schedule
2. It checks for expired memberships
3. Automatically creates and sends reminder emails

Instructions for this coming in a future update.

---

## Testing Email

**Before going live:**

1. Create a test film screening
2. Invite a test member (yourself)
3. Send a test renewal reminder
4. Verify email arrives
5. Check Email Queue shows status as "sent"

---

## Troubleshooting

**Email not sending?**
- Check that your email service is configured in Supabase
- Look at Email Queue — is status "draft" or "sent"?
- Check your email service's error logs (SendGrid, Mailgun, etc.)
- Make sure the domain is verified

**Posters not uploading?**
- Make sure `film-posters` bucket exists and is public
- Check browser console for errors
- Verify file size isn't too large

**Members not receiving emails?**
- Check their email address in the members table
- Verify email service daily sending limit isn't exceeded
- Check spam folder

---

## Recommended Setup

For a non-profit like Footcandle Film Society:

1. **Start with Supabase Email** (free 100/day) for testing
2. **Move to Mailgun** ($5-10/month) for production
3. **Enable automatic renewal reminders** once email is working

This gives you plenty of capacity for monthly announcements + renewal reminders.

