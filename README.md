# UMP-CEIS — Campus Emergency Intelligence System

Campus safety reporting and incident management for the University of Mpumalanga.

See [REQUIREMENTS_REVIEW.md](REQUIREMENTS_REVIEW.md) for the implementation status against the backend, Firebase, and emergency-response requirements.

## Capabilities

- Verified-email accounts with responder-access requests and admin-provisioned privileges.
- Student and staff incident reports, report history, and safety check-ins.
- Optional report photos and short videos, stored privately and retained for 90 days.
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
2. In the Firebase Console, enable **Authentication → Email/Password** and create the **default Cloud Firestore database in Native mode**. Choose the database location carefully; Firebase does not let you change it later. The app uses one Firestore database with collection- and document-level role checks, not separate databases for each role. The app does not require Firebase Cloud Storage or a Firebase billing-plan upgrade.
3. Under **Authentication → Settings → Password policy**, enforce a minimum length of 12 and require lowercase letters, uppercase letters, numbers, and non-alphanumeric characters. The signup form checks the same policy. Enable multi-factor authentication for administrator accounts where available.
4. Under **Authentication → Settings → Authorized domains**, add `localhost` for local development and the exact hostname used by your deployed app. Local email verification links use `localhost` even if the dev page was opened as `127.0.0.1`. Password-reset emails use Firebase's hosted handler without a custom continue URL.
5. Copy `.env.example` to `.env.local` and fill in the Firebase web app configuration values from **Project settings → Your apps**. Set the same `VITE_FIREBASE_*` values in the Vercel project environment for production.
6. Deploy Firestore rules and indexes with `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project ump-ceis`. Alternatively, in the Console, open **Firestore Database → Rules** and publish `firestore.rules`; open **Indexes** and create the composite indexes listed in `firestore.indexes.json`. Do not use permissive test-mode rules. Firebase creates collections/documents on the first successful app write; you do not pre-create empty tables. In **Google Cloud Console → Firestore → Time-to-live**, enable TTL for collection group `apiRateLimits` on the `expiresAt` field so expired rate-limit documents are removed.
7. Set `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, and `CRON_SECRET` as server-only environment variables locally and in Vercel. Locally, you can instead set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file path or sign in using Google Application Default Credentials. The Firebase identity must be allowed to verify users and access Firestore. Authenticated reporting returns HTTP 503 until server credentials are configured; never paste service-account JSON into chat or prefix it with `VITE_`. Vercel runs `/api/cleanup-evidence` daily; its `CRON_SECRET` protects automatic deletion of evidence 90 days after upload.
8. For optional private evidence uploads, create a private Cloudflare R2 bucket and a bucket-scoped S3 API token. Set `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` as server-only environment variables locally and in Vercel. Configure the bucket CORS policy as described in [Cloudflare R2 evidence uploads](#cloudflare-r2-evidence-uploads). Do not enable public bucket access or expose R2 credentials in Vite variables. Until these server variables and bucket CORS are configured, evidence uploads return an explicit unavailable/error message; Firestore-backed reporting continues to work.
9. For anonymous SOS, register the web app with Firebase App Check and a reCAPTCHA v3 site key in the Firebase Console. Add the public site key as `VITE_FIREBASE_APP_CHECK_SITE_KEY` and set `FIREBASE_APP_CHECK_APP_ID` to the same Firebase web app's App ID on the API server. Generate a separate random server-only `SOS_RATE_LIMIT_SECRET` (at least 32 characters) for HMAC-keyed IP rate limits. The endpoint requires valid App Check, a fresh GPS fix with accuracy of 100 m or better inside the server-verified Mbombela campus polygon, and applies an 8-request/10-minute source limit. Configure and monitor reCAPTCHA/App Check before launch; these controls reduce abuse but cannot prove a caller's location or intent.
10. Set the server-only `GROQ_API_KEY` in `.env.local` for local chatbot use, then run the app and API together with `npm run dev`.

Firebase web configuration is used by the browser SDK. Never put Firebase Admin service-account credentials, R2 credentials, or `CRON_SECRET` in Vite variables or frontend code. For local ADC setup, run `gcloud auth application-default login` with an account authorized for the Firebase project, or set `GOOGLE_APPLICATION_CREDENTIALS` to a secure local service-account JSON file; restart Vite after updating `.env.local`.
The UMP-CEIS chatbot requires a server-only `GROQ_API_KEY`; add it to the Vercel project environment and, for local development, to `.env.local`. The Vite development server mounts the existing API locally, so `npm run dev` serves the frontend and API together. Do not prefix the key with `VITE_` or expose it in browser code. The optional `GROQ_MODEL` variable overrides the default `openai/gpt-oss-120b` model. After changing either variable in Vercel, redeploy the application.

### Configure the server and evidence uploads

Complete these steps for a working deployment. Evidence uploads use Cloudflare R2; no Firebase Storage bucket or Firebase billing upgrade is required.

1. **Create Firebase Admin credentials.** In Google Cloud Console for project `ump-ceis`, create a dedicated service account. Grant only the Firebase Authentication, Firestore, App Check, and Firebase Cloud Messaging permissions the enabled server features require. Create and download a JSON key securely. Never commit the key or send it in chat.
2. **Set up local server credentials.** In `.env.local`, set `FIREBASE_PROJECT_ID=ump-ceis` and `FIREBASE_SERVICE_ACCOUNT_JSON` to the complete one-line JSON contents of the service-account key. Alternatively, use Google Application Default Credentials as described above. Set `CRON_SECRET` to a random value with at least 32 characters. Keep all three server-only: do not use a `VITE_` prefix.
3. **Create the R2 bucket.** In the Cloudflare dashboard, open **R2 Object Storage**, create a bucket in the location/jurisdiction appropriate for your data policy, and keep it private. Note the Cloudflare account ID and bucket name. Review Cloudflare's current pricing, storage location options, and limits before storing sensitive evidence.
4. **Create a bucket-scoped R2 API token.** Create an S3-compatible API token restricted to this bucket, with object read/write/delete and bucket-list access. Copy the Access Key ID and Secret Access Key when shown; the secret may only be shown once. Do not enable public bucket access.
5. **Configure R2 CORS.** In the bucket's **Settings → CORS Policy**, allow `PUT` from the exact local and production site origins. For example, replace `https://your-production-hostname` and use:

   ```json
   [
     {
       "AllowedOrigins": [
         "http://localhost:5173",
         "https://your-production-hostname"
       ],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": [
         "cache-control",
         "content-type",
         "x-amz-meta-uid"
       ],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

6. **Set local R2 configuration.** Add `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` to `.env.local`. These are server-only; never prefix them with `VITE_`. Restart the local Vite/API process after changing environment variables.
7. **Configure Vercel.** Under the Vercel project **Settings → Environment Variables**, add the Firebase web app values as `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`. Add the server-only values `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, and all four `R2_*` variables for the environments you deploy. Ensure the production `APP_URL` exactly matches the site origin allowed by R2 CORS. Add the App Check and chatbot variables too if those features are enabled. Redeploy after saving environment variables.
8. **Test end-to-end.** Sign in with a verified account, submit an incident with an allowed image, and open its evidence from the incident view. Confirm a different unauthorized account cannot open the evidence. Check the Vercel function logs if upload fails; a browser CORS error usually means the R2 CORS origin/header list does not exactly match the live request.

The API issues upload and view URLs valid for five minutes, checks uploaded file type/size/owner before registering it in Firestore, and rate-limits upload URL requests. The daily `/api/cleanup-evidence` job removes objects after 90 days; keep `CRON_SECRET` configured in Vercel for retention cleanup to run.

Any valid email address can register, but email verification is required before the account can sign in or access protected features. Verification proves control of the mailbox only; it does not prove university affiliation, responder training, or employment. A new account receives only the standard student-level role. A signup may request responder access, but it remains pending until an administrator approves it in the **Access Requests** section of the admin portal. The user cannot grant roles to themselves. Admin access is never self-service; a trusted Firebase project administrator must provision it.

### Bootstrap the first administrator

1. Use the app's signup page to create the initial administrator's account with the intended email address and a strong password. Verify the email using the link Firebase sends.
2. Sign in once through the Student portal. This creates the verified account's `users/{uid}` profile in Firestore. Sign out.
3. In **Firebase Console → Authentication → Users**, copy that user's UID. In **Firestore Database → Data**, open `users`, select the document whose ID is that UID, and change its `role` field from `student` to the string `admin`. If a `roles` field already exists, remove it or set it to an array containing `admin`; the `roles` array takes precedence when both forms are present.
4. Save the document and sign in again using the Admin portal. The API and Firestore rules will now recognize the account as an administrator.
5. Protect the account and project: use MFA, limit Firebase Console/IAM access to trusted operators, and never grant Firebase project-owner permissions to ordinary CEIS admins. CEIS admin rights are application roles, not Firebase project-owner access.

To provision an additional admin, a trusted Firebase project administrator repeats the profile-role change for that verified user's UID. To onboard responders, ask them to select **Request responder access** during signup; approve or reject the verified request in the admin portal. Do not grant roles by changing client-side code or trusting the portal selection.

Students and staff use the same incident form and can read only reports they submitted. Admins can monitor all reports, view system analytics, update statuses, and assign incidents to provisioned responders. Responders can see only incidents assigned to their account and advance them through acknowledgement, on-scene, and resolved states. Firestore Security Rules enforce these permissions independently of the UI.

## Firestore data

- `users/{uid}`: profile, approved role, and pending responder-access request metadata.
- `users/{uid}/emergencyContacts/{contactId}`: private emergency contacts. Users manage their own contacts; admins and the responder assigned to an active linked incident can retrieve them on demand through the authenticated API. Anonymous incidents have no linked profile or contacts.
- `users/{uid}/private/preferences`: private accessibility preferences.
- `users/{uid}/pushTokens/{tokenId}`: private device notification tokens.
- `incidents/{incidentId}`: authenticated and anonymous incident reports, assignment, status, location, and evidence metadata. Evidence files themselves are stored in the private R2 bucket. Anonymous SOS records are marked `isAnonymous` and `isSOS`; they are visible to admins and to the assigned responder only.
- `incidents/{incidentId}/events/{eventId}`: status, dispatch, evidence, and sensitive-contact access audit events.
- `safetyCheckins/{checkinId}`: safety status and optional location.
- `responderPresence/{uid}`: server-managed responder availability and short-lived location.
- `campusAlerts/{alertId}` and `notificationDeliveries/{deliveryId}`: campus alert and notification-delivery records.
- `apiRateLimits/{key}`: server-managed API abuse limits.

All protected operations require a verified Firebase email. Firestore rules keep profiles, preferences, check-ins, and incident records scoped by account/role. Incident creation, evidence upload authorization, assignment, role approval, emergency-contact disclosure, and status transitions pass through the authenticated server API; never expose Admin SDK or R2 credentials to the browser. Admins can review all incidents and manage responder requests; responders can read and update only assignments dispatched to them. Emergency contacts are not included in incident list payloads and are disclosed only when an admin or the currently assigned responder explicitly opens them; responder access ends when the incident is resolved.

The app no longer reads from Supabase. Existing Supabase accounts and records are not imported automatically; export and migrate them separately if they need to be retained in Firebase.

## Emergency use

The application does not automatically notify responders. For urgent assistance, call 10177 (SA EMS) or UMP Campus Security at +27 13 002 0010.

Incident evidence is private: verified reporters can upload evidence to their own incident, while admins and the assigned responder can request short-lived view links. Evidence is limited to three files per report (images up to 10 MB each and one video up to 40 MB); recordings stop at two minutes. Cloudflare R2 credentials and bucket CORS must be configured before uploads work. Set `CRON_SECRET` and the R2 server variables in the Vercel project to enable uploads and its daily 90-day evidence-retention job.
