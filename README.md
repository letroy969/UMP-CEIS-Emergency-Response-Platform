# UMP-CEIS — Campus Emergency Intelligence System

**University of Mpumalanga** · Mbombela Campus  
Advanced Diploma in ICT Applications Development · Phase 2–4 Academic Project

---

## Overview

UMP-CEIS is a full-stack campus emergency response platform built in React. It combines a public-facing institutional landing site with a secure multi-role Command Centre for real-time incident management.

```
Landing Site  ──→  Login Portal  ──→  Student Portal
                              └──→  Admin / Security / Medical Command Centre
```

---

## Features

### Public Landing Site
- Institutional UMP branding with animated hero, feature sections, and chatbot
- Phase roadmap (Phases 1–4) with live demo access
- **First Aid Library** — 4 guides (CPR, Choking, Bleeding, Burns) with:
  - Animated SVG simulations per step
  - Voice Instructor Mode (Web Speech API)
- **Emergency Aid Engine** — Triage + First Aid + Voice (Demo Mode):
  - 18-symptom intake with custom situation text field
  - Per-symptom detail collection
  - Voice-guided step-by-step first aid with live animation
  - Background risk scoring (P1–P4)
  - Auto emergency alert overlay for P1/P2 incidents
- **Hospital Finder** — GPS-simulated nearest facility detection
- **Analytics Dashboard** — Incident trends, response times, location hotspots

### Command Centre
- **Two login portals**: Student (student number) and Staff/Admin (staff number)
- **Input validation**: Format rules, password strength meter, forgot-password flow
- **Student Portal**: Report incidents, safety check-in, campus map, report history
- **Admin Command Centre** (6 views):
  - Live dashboard with real-time KPIs
  - Incident management with full lifecycle (NEW → CLOSED)
  - Live SVG campus map (40 buildings, Mbombela)
  - Dispatch engine with team assignment
  - Analytics with intelligence feedback
  - Input layer (operator logging + IoT sensor panel)

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | React 18 + Vite 4                   |
| Styling     | CSS-in-JS (inline styles + keyframes) |
| Maps        | Custom SVG campus map (campus PDF data) |
| Voice       | Web Speech API (SpeechSynthesisUtterance) |
| Fonts       | IBM Plex Serif / Sans / Mono (Google Fonts) |
| Build       | Vite with React plugin              |
| Deployment  | Vercel / Netlify ready              |

---

## Project Structure

```
ump-ceis/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx            # Entry point
│   ├── index.css           # Global CSS reset + keyframes
│   ├── App.jsx             # Root router (landing ↔ command centre)
│   ├── constants.js        # Shared tokens: colours, DB, buildings, symptoms
│   ├── LandingSite.jsx     # Public marketing site + First Aid + Triage Engine
│   └── CommandCenter.jsx   # Login portal + Student Portal + Admin Dashboard
├── index.html
├── package.json
├── vite.config.js
└── .gitignore
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ump-ceis.git
cd ump-ceis

# Install dependencies
npm install

# Start dev server (opens at http://localhost:5173)
npm run dev
```

### Build for Production

```bash
npm run build
# Output in dist/ — ready for Vercel, Netlify, or any static host
```

### Preview Production Build

```bash
npm run preview
```

---

## Demo Credentials

### Student Portal
| Student Number | Password    | Name           |
|----------------|-------------|----------------|
| `20240001`     | `UMP@2024!` | Sipho Dlamini  |
| `20230158`     | `UMP@2023$` | Bongani Nkosi  |

### Staff / Admin Command Centre
| Staff Number | Password      | Role          | Department       |
|--------------|---------------|---------------|------------------|
| `STAFF001`   | `Admin@2024!` | Administrator | ICT Services     |
| `ADM001`     | `Admin@UMP1!` | Administrator | Administration   |
| `SEC001`     | `Guard@2024!` | Security      | Campus Security  |
| `NUR001`     | `Nurse@UMP2!` | Medical       | Health & Wellness|

> **Note:** These are development mock credentials. In production, authentication will connect to the UMP institutional database via secure API.

---

## Architecture

```
Input Layer (L1)
  Student / Staff Portal  ──┐
  Sensor / IoT Triggers   ──┤──→ Event Processing Engine
  Security Operator Input ──┘         ↓
                                AI Classification (L2)
                                      ↓
                              Priority Assignment P1–P4 (L3)
                                      ↓
                              Dispatch Engine (L4)
                                      ↓
                          Live Monitoring Dashboard (L5)
                                      ↓
                         Analytics & Intelligence Feedback (L6)
                              GET /analytics/incident-trends
                              GET /analytics/response-times
                              GET /analytics/location-hotspots
```

---

## Deployment to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo at [vercel.com](https://vercel.com) for automatic deployments on every push.

---

## Roadmap

- [ ] **Phase 5**: Backend API (Node.js / Express + MongoDB)
- [ ] **Phase 6**: UMP database integration (live student/staff authentication)
- [ ] **Phase 7**: Push notifications (Firebase FCM)
- [ ] **Phase 8**: Native mobile app (React Native)
- [ ] **Phase 9**: IoT sensor integration (MQTT broker)
- [ ] **Phase 10**: AI risk prediction model deployment

---

## Academic Context

This project is developed as part of the **DICT421 / DICT431** module requirements for the Advanced Diploma in ICT Applications Development at the University of Mpumalanga. It demonstrates:

- Full-stack React application architecture
- Multi-role authentication and access control
- Real-time data visualisation and campus geolocation
- Emergency response system design patterns
- Phase-driven academic presentation framework

---

## Author

**Sihle Dladla** · Student No. 20241337  
University of Mpumalanga · ICT Applications Development  

---

*UMP-CEIS is a demo/academic system. In emergencies, always call 10177 (SA EMS) or +27 13 002 0010 (UMP Campus Security).*
