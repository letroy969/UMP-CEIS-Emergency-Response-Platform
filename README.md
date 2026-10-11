# UMP-CEIS — Campus Emergency Intelligence System

Campus safety reporting and incident management for the University of Mpumalanga.

## Capabilities

- Student and provisioned staff accounts with email verification.
- Student incident reports, report history, and safety check-ins.
- Staff review of incidents, status updates, and responder/team assignment records.
- Campus map and general first-aid guidance.

Incident reports, assignments, status changes, and safety check-ins are stored in Supabase. Assignments are records for staff coordination; the application does not send responder notifications or contact emergency services. The first-aid and symptom guidance is informational and is not a diagnosis.

## Stack

- React 18 and Vite
- Supabase Auth and Postgres with row-level security
- Vercel serverless functions for registration, verification, incident, and check-in APIs
- Web Speech API for optional spoken first-aid guidance

## Setup

Requirements: Node.js 18+ and npm 9+.

1. Install dependencies with `npm install`.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and set the required values. Configure the same server variables in Vercel for deployment. Keep service and Resend secrets out of `VITE_` variables.
4. Configure Supabase email/password authentication and a verified Resend sender. Set `APP_URL` to the site origin and `RESEND_FROM` to the verified sender.
5. Start the local app with `npx vercel dev` or `npm run dev` for the Vite client alone.

The `@ump.ac.za` email check confirms control of that mailbox; it does not verify enrolment or employment. Staff access must be provisioned through trusted Supabase `app_metadata.ceis_role` claims (`staff`, `admin`, `security`, or `medical`). Signup form input cannot grant staff roles.

## Database and API

Run `supabase/schema.sql` before using incident and check-in features. The schema applies RLS policies to incidents and safety check-ins. `/api/incidents` and `/api/checkins` validate the caller's Supabase access token and make requests with that user's token so database policies remain in force. Registration and email verification use the server-only `SUPABASE_SECRET_KEY`; data APIs use `SUPABASE_ANON_KEY` and the caller's access token.

## Emergency use

The application does not automatically notify responders. For urgent assistance, call 10177 (SA EMS) or UMP Campus Security at +27 13 002 0010.
