# Requirements review

Reviewed against the code and configuration currently in this repository on 14 October 2026. This is a source review; Firebase deployment state and live delivery were not verified.

## Backend and cloud services

| Requirement | Status | Evidence and remaining work |
|---|---|---|
| Node.js and Express REST API | Not implemented | The app is a Vite/React static site. There is no Express server, Firebase Functions backend, or working API route. `api/_lib` is empty. |
| User authentication and sessions | Implemented with Firebase Auth | Email/password, email verification, password recovery, and sign-out are in `src/auth/firebaseAuth.js`. |
| Server-side role authorization | Partially implemented | Roles are provisioned in Firestore and Firestore Security Rules enforce access. There is no server API middleware or Firebase custom-claims flow. |
| Incident storage and processing | Partially implemented | `src/incidentApi.js` writes directly from the browser to Firestore, with client validation and restrictive Firestore rules. There is no REST processing layer or audit-event history. |
| Dashboard data and analytics endpoints | Partially implemented | The admin workspace reads incident data and displays operational views. No API analytics endpoints, historical response-time analysis, or export pipeline exists. |
| Notification workflow and webhooks | Not implemented | No notification service, webhook endpoint, retry/delivery tracking, SMS provider, or PA integration exists. |
| Secure API endpoints and input validation | Partially implemented | Firestore rules enforce important record constraints; the browser also validates inputs. There are no API endpoints to authenticate, authorize, rate-limit, or validate. |
| Firebase Authentication | Implemented in code | `src/lib/firebase.js` initializes Auth; live project configuration and deployed state were not checked. |
| Firebase Firestore | Implemented in code | Incident, user, and safety check-in data use Firestore. Rules and indexes are included in the repository; deployment was not checked. |
| Firebase Cloud Messaging | Not implemented | No FCM token registration, service worker messaging handler, or server-side send workflow is present. The Firebase SDK dependency alone does not provide push delivery. |

## Emergency response capabilities

| Requirement | Status | Current behavior and remaining work |
|---|---|---|
| One-tap SOS with identity, time, and GPS | Partially implemented | A signed-in user can submit an incident report. Creation records identity and server timestamps; browser location is optional. There is no dedicated SOS flow. |
| Automatic nearest-officer dispatch | Not implemented | An admin manually selects an assigned responder. Responder availability, distance calculation, and automatic dispatch do not exist. |
| Automated incident severity and priority | Not implemented | The report form accepts a user-selected priority. The separate interactive triage guide does not classify or update saved incidents. |
| Live location sharing | Partially implemented | A report can store one location point. There is no continuous reporter/responder location stream, background tracking, or route navigation. |
| Campus-wide SMS, push, and PA alerts | Not implemented | Assigned responders receive in-app Firestore updates while signed in. No SMS, FCM, PA integration, or delivery receipts are present. |
| First-aid guidance | Partially implemented | An interactive informational guide and optional speech are present. It is not AI-generated, connected to responders, or clinically certified in this repository. |
| Emergency analytics | Partially implemented | Admins can review incident records and operational status. Automated trend/response-performance analytics and report exports are absent. |

## Recommended completion sequence

1. Add a Node.js/Express API deployment target and Firebase Admin verification middleware. Route privileged incident mutations and dashboard aggregation through it; keep Firestore Security Rules as a second authorization boundary.
2. Define and validate incident schemas, transition rules, rate limits, and an append-only status/audit event model. Add API-level authorization tests.
3. Implement an explicit SOS endpoint and incident workflow. Add responder availability and campus coordinates before attempting nearest-responder selection; otherwise “nearest” cannot be computed reliably.
4. Implement FCM token registration and a server-side notification queue with delivery/error records. Treat SMS and PA as separate integrations that require configured providers and campus-system access.
5. Decide triage policy with campus safety and medical stakeholders. Keep automated recommendations reviewable and avoid presenting them as diagnosis.
6. Add analytics endpoints for defined metrics and validate them against recorded status events before publishing response-performance figures.

The existing application should not be described as automatically dispatching responders, sending campus-wide alerts, sharing live locations, or providing AI/clinical triage until those workflows exist and are verified end to end.
