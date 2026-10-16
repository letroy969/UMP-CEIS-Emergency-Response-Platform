# Requirements review

Reviewed against the source and deployment configuration in this repository on 16 October 2026. This is a source review; the live Firebase and Vercel projects were not inspected or deployed.

## Backend and cloud services

| Requirement | Status | Evidence and remaining work |
|---|---|---|
| Node.js and Express REST API | Implemented in source | `api/index.js` exposes the Express API for the Vercel deployment and Vite development server. Configure and verify the deployed environment separately. |
| User authentication and sessions | Implemented in source | Firebase email/password authentication, email verification, password reset, and sign-out are handled in `src/auth/firebaseAuth.js`. Any valid email may register; verification is required. |
| Server-side role authorization | Implemented in source | `api/_lib/auth.js` verifies Firebase ID tokens and reads current roles from Firestore. Responder access is approval-gated; admin roles are trusted-operator provisioned. |
| Incident storage and processing | Implemented in source | `api/index.js` validates reports, stores authenticated and anonymous incidents in Firestore, records incident events, handles assignments/status transitions, and restricts queries by role. |
| Dashboard data and analytics endpoints | Implemented in source | The admin portal subscribes to incidents and requests server-side dashboard analytics. Historical exports and custom performance reporting are not included. |
| Notification workflow and integrations | Partially implemented | FCM push is implemented; emergency notifications can also use Twilio SMS and a signed HTTPS PA webhook when configured. Delivery summaries are stored; there is no durable retry queue, and live provider configuration was not verified. |
| Secure API endpoints and input validation | Implemented in source | Authenticated routes validate Firebase ID tokens, verified email, roles, and request data. Firestore/Storage rules provide a separate client-side authorization boundary; anonymous SOS uses App Check, campus geofence validation, and rate limiting. |
| Firebase Authentication | Implemented in source | Email/password and verification flows are present. Enable the provider, configure authorized domains/password policy, and verify the project settings manually. |
| Firebase Firestore and Storage | Implemented in source | Collection paths, Firestore rules, composite indexes, and Storage rules are included. Collections are created by normal writes; live deployment and index readiness were not checked. |

## Emergency response capabilities

| Requirement | Status | Current behavior and remaining work |
|---|---|---|
| Signed-in SOS | Implemented in source | Creates a high-priority incident with server timestamp and optional GPS; the API can select a recently available nearby responder. |
| Anonymous SOS | Implemented in source | Requires Firebase App Check and a fresh, accurate GPS point inside the configured Mbombela campus boundary. The incident has no linked profile or emergency contacts. |
| Nearest-responder dispatch | Implemented in source | Uses server-recorded responder availability/location and a configurable maximum distance; verify presence updates, campus coverage, and dispatch notifications in staging. |
| Incident priority | Partially implemented | The reporter selects priority; the system does not automatically classify severity. |
| Location sharing | Partially implemented | Reports contain a point-in-time location, and responder presence can include current coordinates. Continuous reporter tracking and route navigation are not provided. |
| Push, SMS, and PA alerts | Partially implemented | FCM push is supported; Twilio and PA webhook delivery require server credentials and operational approval. Delivery is not guaranteed if providers are unconfigured or fail. |
| First-aid guidance | Informational | The app provides general first-aid guidance, not a diagnosis or substitute for professional care. |
| Emergency analytics | Partially implemented | Admins can view operational incident summaries and trends. Data exports and validated response-performance reporting are not included. |

## Deployment checks

1. Create the default Firestore database in Native mode, publish the included Firestore and Storage rules, and deploy the composite indexes.
2. Configure Firebase Authentication, authorized domains, App Check, browser Firebase settings, and server-only Firebase Admin credentials as described in `README.md`.
3. Bootstrap the first admin through a trusted Firebase Console operator. Verify sign-in, admin incident access, responder approval/assignment, and the privacy-limited emergency-contact endpoint in staging.
4. Configure and test FCM, and only then enable optional Twilio/PA integrations with approved credentials and delivery monitoring.
