# UMP-CEIS — Campus Emergency Intelligence System

Campus safety reporting and incident management for the University of Mpumalanga.

See [REQUIREMENTS_REVIEW.md](REQUIREMENTS_REVIEW.md) for the implementation status against the backend, Firebase, and emergency-response requirements.

## Capabilities

- UMP-only accounts with Firebase email verification and password recovery.
- Student and staff incident reports, report history, and safety check-ins.
- Protected admin incident monitoring, analytics, status management, and responder dispatch.
- A protected responder workspace with live alerts for assigned incidents and response status updates.
- Campus map and general first-aid guidance.

Incident reports, assignments, status changes, user profiles, and safety check-ins are stored in Cloud Firestore. Firebase Authentication manages accounts, sign-in, password recovery, and email verification. Responders see in-app, real-time alerts while signed in; the application does not send push/SMS notifications or contact emergency services. First-aid and symptom guidance is informational and is not a diagnosis.

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
3. Under **Authentication → Settings → Password policy**, enforce a minimum length of 12 and require lowercase letters, uppercase letters, numbers, and non-alphanumeric characters. The signup form checks the same policy.
4. Under **Authentication → Settings → Authorized domains**, add `localhost` for local development and the exact hostname used by your deployed app. Local email verification links use `localhost` even if the dev page was opened as `127.0.0.1`. Password-reset emails use Firebase's hosted handler without a custom continue URL.
5. Copy `.env.example` to `.env.local` and fill in the Firebase web app configuration values from **Project settings → Your apps**. Set the same `VITE_FIREBASE_*` values in the Vercel project environment for production.
6. Deploy `firebase.json`, `firestore.rules`, and `firestore.indexes.json` with `npx firebase-tools deploy --only firestore --project ump-ceis` or publish the rules and create the indexes in the Firebase Console.
7. Set the server-only `GROQ_API_KEY` in `.env.local` for local chatbot use, then run the app and API together with `npm run dev`.

Firebase web configuration is used by the browser SDK. Never put Firebase Admin service-account credentials in Vite variables or frontend code.
The UMP-CEIS chatbot requires a server-only `GROQ_API_KEY`; add it to the Vercel project environment and, for local development, to `.env.local`. The Vite development server mounts the existing API locally, so `npm run dev` serves the frontend and API together. Do not prefix the key with `VITE_` or expose it in browser code. The optional `GROQ_MODEL` variable overrides the default `openai/gpt-oss-120b` model. After changing either variable in Vercel, redeploy the application.

Self-service signup is for students only and requires an `@ump.ac.za` address, a password that meets the configured policy, and Firebase email verification. Verification confirms control of that mailbox only; it does not verify current enrolment or employment. Users choose between the Student and Staff sign-in portals, but portal selection does not grant privileges. Staff, admin, and responder accounts must be provisioned by a trusted administrator in the Firestore `users/{uid}` profile. Use the `roles` array for multiple portals, for example `roles: ["student", "admin"]`; the older single `role` field remains supported. Legacy `security` and `medical` roles are also treated as responders. For the first administrator, create and verify an account, then promote its profile using a trusted Firebase Console account. Never let a user promote their own role.

Students and staff use the same incident form and can read only reports they submitted. Admins can monitor all reports, view system analytics, update statuses, and assign incidents to provisioned responders. Responders can see only incidents assigned to their account and advance them through acknowledgement, on-scene, and resolved states. Firestore Security Rules enforce these permissions independently of the UI.

## Firestore data

- `users/{uid}`: profile and provisioned role.
- `incidents/{incidentId}`: incident report, assignment, and status history fields.
- `safetyCheckins/{checkinId}`: safety status and optional location.

Security Rules require verified accounts for incident and check-in access, restrict students to their own records, and reserve incident updates for provisioned staff.

The app no longer reads from Supabase. Existing Supabase accounts and records are not imported automatically; export and migrate them separately if they need to be retained in Firebase.

## Emergency use

The application does not automatically notify responders. For urgent assistance, call 10177 (SA EMS) or UMP Campus Security at +27 13 002 0010.
