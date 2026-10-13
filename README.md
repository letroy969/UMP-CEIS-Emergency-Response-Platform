# UMP-CEIS — Campus Emergency Intelligence System

Campus safety reporting and incident management for the University of Mpumalanga.

## Capabilities

- Student accounts with Firebase email verification.
- Student incident reports, report history, and safety check-ins.
- Staff review of incidents, status updates, and responder/team assignment records.
- Campus map and general first-aid guidance.

Incident reports, assignments, status changes, user profiles, and safety check-ins are stored in Cloud Firestore. Firebase Authentication manages accounts, sign-in, and email verification. Assignments are records for staff coordination; the application does not send responder notifications or contact emergency services. First-aid and symptom guidance is informational and is not a diagnosis.

## Stack

- React 18 and Vite
- Firebase Authentication
- Cloud Firestore with Firebase Security Rules
- Vercel static hosting
- Web Speech API for optional spoken first-aid guidance

## Setup

Requirements: Node.js 18+ and npm 9+.

1. Install dependencies with `npm install`.
2. In the Firebase Console, enable **Authentication → Email/Password** and create a **Cloud Firestore** database.
3. Add `localhost` and your deployed hostname under Firebase Authentication's authorized domains.
4. Copy `.env.example` to `.env.local` and fill in the Firebase web app configuration values from **Project settings → Your apps**. Set the same `VITE_FIREBASE_*` values in the Vercel project environment for production.
5. Deploy `firebase.json`, `firestore.rules`, and `firestore.indexes.json` with `npx firebase-tools deploy --only firestore --project ump-ceis` or publish the rules and create the indexes in the Firebase Console. The rules permit users to create only student profiles; trusted staff roles must be assigned by an administrator in the Firebase Console.
6. Run the local frontend with `npm run dev`.

Firebase web configuration is used by the browser SDK. Never put Firebase Admin service-account credentials in Vite variables or frontend code.

Student signup requires an `@ump.ac.za` address and Firebase email verification. This confirms control of that mailbox only; it does not verify current enrolment. Staff access is provisioned separately by an administrator by changing the user's `role` in their Firestore `users/{uid}` profile to `staff`, `admin`, `security`, or `medical`. Signup form input cannot grant staff roles.

## Firestore data

- `users/{uid}`: profile and provisioned role.
- `incidents/{incidentId}`: incident report, assignment, and status history fields.
- `safetyCheckins/{checkinId}`: safety status and optional location.

Security Rules require verified accounts for incident and check-in access, restrict students to their own records, and reserve incident updates for provisioned staff.

The app no longer reads from Supabase. Existing Supabase accounts and records are not imported automatically; export and migrate them separately if they need to be retained in Firebase.

## Emergency use

The application does not automatically notify responders. For urgent assistance, call 10177 (SA EMS) or UMP Campus Security at +27 13 002 0010.
