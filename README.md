# Nagarika
**Submission for the Hack the Limit Hackathon**

A civic issue reporting and resolution platform with multilingual support, multi-agent AI verification, hazard-aware routing, and community engagement.

---

## Project Links

- **Frontend (Firebase Hosting)**: [https://civic-succedent.web.app](https://civic-succedent.web.app)
- **Backend API (Railway)**: [https://civic-succedent-production.up.railway.app](https://civic-succedent-production.up.railway.app)
- **YouTube Video Walkthrough**: [https://youtu.be/KM1cv3nBvdQ](https://youtu.be/KM1cv3nBvdQ)
- **GitHub**: [https://github.com/PravAl2028/CIVIC-SUCCEDENT](https://github.com/PravAl2028/CIVIC-SUCCEDENT)

---

## Demo Video

Watch the full walkthrough demonstrating Nagarika's multi-agent AI verification system, multilingual support, and civic issue resolution pipeline:

[![Watch Demo Video](https://img.shields.io/badge/Watch%20Demo%20Video-red?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/KM1cv3nBvdQ)

---

## Test Credentials (For Evaluators)

| Role | Username / Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin_civic_succedent` | `123456` | Accesses the Admin Control Panel, chat audit, and locks/unblocks flagged users. |
| **User 1** | `Leo` | `123456` | Active citizen with reports and verifications. |
| **User 2** | `Jerry` | `098765` | Active citizen. |

---

## The Problem

Civic infrastructure damage — potholes, water leaks, broken streetlights — routinely goes unreported. Existing channels are fragmented, slow, and provide no incentives for community action. At the same time, pedestrians and riders have no real-time way to know which routes are actually safe until they navigate straight into active hazards.

## The Solution

Nagarika turns spotting a hazard into a civic contribution:

1. **Scan** the hazard with your phone camera.
2. Let a **Gemini-powered multi-agent pipeline** verify and classify it.
3. Once verified, the app **automatically generates a formal complaint letter** and provides escalation guidance.

---

## How It Works

### 1. Report & Detect
Report civic issues with your phone camera. Each new report earns **+10 Civic Points**.

### 2. AI Appraisal
A server-side **Gemini Scanner Agent** analyzes uploaded images. It confirms the photo shows a genuine outdoor civic hazard and assigns a severity score (1–10). Full community consensus requires 2 verification votes.

### 3. Community Consensus
Connect with neighborhood citizens inside an AI-moderated chat lounge. A **Moderator Agent** filters chat spam and toxic messages. Two or more verifications trigger an automated official complaint draft.

### 4. Complaint Generation
When a report receives 2+ citizen verifications, the **Dispatcher Agent** generates a formal government complaint letter with RTI query templates and escalation guidance.

### 5. Issue Resolution
Resolve verified issues by submitting before/after photos. The **Resolver Agent** confirms resolution and awards **+25 Civic Points**.

### 6. Hazard-Aware Routing
Navigate around active hazards. The routing engine analyzes reported issues along a route, computes safety scores, and dynamically reroutes around danger zones.

---

## Multi-Agent AI Pipeline

Four Gemini-powered server-side agents handle validation, classification, and guidance:

| Agent | Role Tag | Description |
| :--- | :--- | :--- |
| **Scanner** | `Visual Inspector` | Analyzes uploaded camera snapshots, validates public outdoor damage, flags duplicates, and rates severity (1–10). |
| **Dispatcher** | `Alert Architect` | Drafts official municipal complaint letters with RTI queries and escalation guidance when a case receives 2+ verifications. |
| **Resolver** | `Resolution Verifier` | Reviews before vs. after repair photos to confirm resolution and awards civic points. |
| **Moderator** | `Quality Guardian` | Audits community chat logs, filters toxic content, and tracks neighborhood consensus votes. |

All agents use the `@google/genai` SDK with Gemini models. When the API is unavailable, agents fall back to deterministic simulation mode so the app remains functional.

---

## RAG & Knowledge Base

The Dispatcher Agent uses Retrieval-Augmented Generation (RAG) with a local knowledge base containing:

- **8 Government Departments**: Contact details, jurisdiction, escalation timelines
- **RTI Templates**: Pre-drafted Right to Information query templates by department
- **Government Schemes**: 3 active welfare schemes with eligibility criteria

Knowledge is embedded into agent prompts via `src/lib/rag.ts` to produce contextually accurate complaint letters.

---

## Hazard-Aware Routing

`src/lib/routing/` provides a complete hazard-aware navigation system:

| Module | Purpose |
| :--- | :--- |
| `hazardAnalyzer.ts` | Analyzes reported issues along a route segment, computes hazard density |
| `safetyScore.ts` | Assigns safety scores (0–100) to route segments based on active hazards |
| `bypassPlanner.ts` | Generates alternative routes that avoid high-hazard zones |
| `waypointGenerator.ts` | Creates intermediate waypoints for rerouted paths |
| `routeService.ts` | Orchestrates full route planning with hazard avoidance |

Integration with Geoapify Directions API for actual road routing. Additional modules `src/lib/hazardRouting.js` and `src/lib/navigationEngine.js` provide public OSRM routing and turn-by-turn session management.

---

## Gamification

**14 XP Actions** — earn points for civic contributions:

| Action | XP |
| :--- | :--- |
| Submit Report | +10 |
| Community Verify | +5 |
| Issue Resolved | +25 |
| Daily Login Streak | +5 |
| First Report | +20 |
| Refer Friend | +15 |
| Chat Verified | +5 |
| Correct Hazard ID | +10 |
| Route Safe Travel | +5 |
| Data Contribution | +10 |
| 7-Day Streak | +50 |
| 30-Day Streak | +100 |
| First Resolution | +80 |
| Top Weekly | +50 |

**8 Scout Ranks** (100 → 10,000 XP thresholds):
Scout I → Scout II → Scout III → Scout IV → Scout V → Scout VI → Scout VII → Scout VIII

---

## Technical Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **UI Components** | Leaflet.js (maps), Recharts (charts), Lucide Icons |
| **Backend API** | Node.js, Express, ESM (`server-api.mjs`) |
| **Frontend Hosting** | Firebase Hosting (SPA with cache headers) |
| **Backend Hosting** | Railway (Nixpacks build, Node.js runtime) |
| **Database & Auth** | Firebase Auth, Cloud Firestore (real-time listeners) |
| **AI** | Google GenAI SDK (`@google/genai`), Gemini models |
| **Geocoding** | Geoapify Geocoding & Directions API |
| **i18n** | English, Hindi (हिंदी), Telugu (తెలుగు) via LanguageContext |
| **RAG** | Local knowledge base (departments, RTI, schemes) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Firebase Hosting                         │
│              https://civic-succedent.web.app                 │
│   Built SPA (HTML/JS/CSS) + static images + index.html      │
│   SPA rewrites: /* → /index.html                            │
└────────────────────────┬─────────────────────────────────────┘
                         │ Cross-origin API calls
                         │ (VITE_API_URL configured at build)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                     Railway Backend                          │
│       https://civic-succedent-production.up.railway.app     │
│   Express API: /api/health, /api/validate-image,            │
│   /api/analyze-hazards, /api/generate-complaint,            │
│   /api/chat, /api/reverse-geocode                           │
│   @google/genai (ESM) — Gemini agent pipeline               │
└──────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

### Frontend (`VITE_` prefixed, in `.env`)
```
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_APP_ID
VITE_FIREBASE_API_KEY
VITE_GEOAPIFY_API_KEY
VITE_API_URL            # Backend URL (empty for local dev, Railway URL for production)
```

### Backend (`.env`)
```
GEMINI_API_KEY
GEMINI_SCANNER_MODEL=gemini-3.1-flash-lite
GEMINI_RESOLVER_MODEL=gemma-4-31b-it
GEMINI_DISPATCHER_MODEL=gemma-4-26a4b-it
```

See `.env.example` for a complete template.

---

## Installation & Local Setup

### Prerequisites
- Node.js v18+
- Google AI Studio API Key (Gemini)
- Firebase Project with Auth and Firestore enabled
- Geoapify API Key

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your API keys.

### 3. Run (Development)
```bash
npm run dev
```
Opens `http://localhost:3000` — Vite dev server with HMR + Express API on the same port.

### 4. Build for Production
```bash
# Build frontend only (for Firebase Hosting)
npm run build

# Build backend only (for Railway)
npm run build:server

# Build both
npm run build:all
```

---

## Deployment

### Firebase Hosting (Frontend)
```bash
firebase deploy --only hosting
```
Frontend builds with `VITE_API_URL=https://civic-succedent-production.up.railway.app` and deploys to Firebase Hosting.

### Railway (Backend)
Pushes to `main` branch trigger Railway auto-deploy. Build pipeline:
1. `npm ci` — install all dependencies
2. `npm run build:server` — esbuild bundles `server-api.ts` → `dist/server-api.mjs` (ESM, external Node modules)
3. `npm prune --omit=dev` — remove dev dependencies for smaller image

Runtime: `node dist/server-api.mjs`

---

## Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite dev server + Express API concurrently |
| `npm run build` | Build frontend for production (Vite) |
| `npm run build:server` | Build backend for Railway (esbuild → ESM) |
| `npm run build:all` | Build both frontend and backend |
| `npm run start` | Start production server (`node dist/server-api.mjs`) |
| `npm run lint` | Type-check with TypeScript (`tsc --noEmit`) |

---

## Project Structure

```
Nagarika/
├── server.ts                    # Dev server (Vite + Express, all-in-one)
├── server-api.ts                # Production API server (Railway, ESM)
├── src/
│   ├── App.tsx                  # Router + inline route components
│   ├── main.tsx                 # React entry point
│   ├── index.css                # Tailwind CSS
│   ├── agents/                  # AI agent implementations
│   │   ├── scannerAgent.ts      # Image analysis & severity scoring
│   │   ├── dispatcherAgent.ts   # Complaint letter generation (RAG)
│   │   ├── resolverAgent.ts     # Before/after resolution verification
│   │   └── moderatorAgent.ts    # Chat moderation & toxicity filtering
│   ├── context/
│   │   ├── AuthContext.tsx       # Firebase Auth + Firestore user profile
│   │   └── LanguageContext.tsx   # i18n (English, Hindi, Telugu)
│   ├── data/knowledge/          # RAG knowledge base
│   │   ├── departments.ts       # 8 govt departments with contacts
│   │   ├── rti.ts               # RTI query templates
│   │   └── schemes.ts           # Government welfare schemes
│   ├── i18n/                    # Translation files
│   │   ├── en.ts
│   │   ├── hi.ts
│   │   └── te.ts
│   ├── lib/
│   │   ├── constants.ts         # Types, enums, XP values, hood data
│   │   ├── geo.ts               # Geocoding (server + client)
│   │   ├── rag.ts               # RAG context retrieval
│   │   ├── xp.ts                # XP/rank calculation
│   │   ├── hazardRouting.js     # Public OSRM routing w/ hazard avoidance
│   │   ├── navigationEngine.js  # Turn-by-turn navigation sessions
│   │   └── routing/             # Hazard-aware routing system
│   │       ├── hazardAnalyzer.ts
│   │       ├── safetyScore.ts
│   │       ├── bypassPlanner.ts
│   │       ├── waypointGenerator.ts
│   │       └── routeService.ts
│   ├── pages/                   # Feature pages (real logic)
│   │   ├── ProfilePage.tsx
│   │   ├── ScanResultPage.tsx
│   │   ├── LeaderboardPage.tsx
│   │   ├── IssueDetailPage.tsx
│   │   └── ReportIssuePage.tsx
│   └── components/              # UI components (maps, chat, reports, etc.)
├── public/                      # Static assets (map_bg.jpg, favicon)
├── firebase.json                # Hosting config (SPA rewrites, cache headers)
├── railway.json                 # Railway build & healthcheck config
├── nixpacks.toml                # Nixpacks build pipeline
├── Procfile                     # Railway process: node dist/server-api.mjs
├── vite.config.ts               # Vite config (Tailwind, React plugin)
├── tsconfig.json                # TypeScript config (bundler, noEmit)
└── .env.example                 # Documented environment variables
```
