# Civic-Succedent

Civic-Succedent is a full-stack, mobile-first municipal infrastructure monitoring platform. It allows citizens to report, verify, and resolve local civic defects (such as potholes, water leaks, broken streetlights, and garbage dumps) using a gamified map interface.

The platform uses server-side Gemini integration to classify defect images, moderate community chat, generate official municipal complaint letters, and verify repairs.

## Key Features

### 1. Patrol Grid (Defect Mapping)
- **Interactive Leaflet Map**: Displays markers for active, disputed, and resolved defects based on geographic location.
- **Live Image Capture**: Camera-only capture to ensure reports represent real-time physical defects.
- **Community Verification**: Users can vote to verify or dispute reports made by others in their neighborhood. Once a report receives 2 or more verifications, a formal complaint letter is drafted.

### 2. Route Planner (Safe Maps)
- **Defect Avoidance Routing**: Bypasses selected defect types (e.g., potholes, waterlogging) by recalculating routes using the Geoapify API.
- **Navigation Alerts**: Voice alerts announce upcoming defects along the route.

### 3. Community Feed & Chat
- **Real-Time Updates**: A central feed displaying user discussions, level-ups, and automated system reports.
- **Location Pinning**: Clicking a report alert in chat centers the map on the coordinates of the defect.
- **Area-Based Filtering**: Filter chat messages by neighborhood sector, with text search matching messages and usernames.

### 4. Game Concept & Mechanics
- **XP and Rank System**: Earn XP and coins by reporting, verifying, or resolving defects. Higher levels unlock ranks:
  - Level 1: Scout
  - Level 2: Scout Elite
  - Level 3: Patrol Ranger
  - Level 4: Ranger Captain
  - Level 5: City Guardian
  - Level 6: Guardian Commander
  - Level 7: Champion
  - Level 8: Legend
- **Scratch Cards**: Successfully resolving defects rewards users with interactive scratch cards to win random bonus coins or XP.
- **Simulation Mode**: Pin a local Civic HQ to earn passive coins per hour. Passive income can be boosted by upgrading the HQ or purchasing utility nodes (Solar Grid, Repair Depot, Tech Lab).

---

## Server-Side Automated Analysis

The backend Express server uses the `@google/genai` SDK to run analysis scripts:

1. **Defect Scanning (`src/agents/scannerAgent.ts`)**: Evaluates uploaded camera images, checks if they show public civic damage, and returns metadata including `damageType`, `severity`, and `fraudScore`.
2. **Resolution Verification (`src/agents/resolverAgent.ts`)**: Compares "before" and "after" images to verify if a reported defect has been repaired.
3. **Complaint Generation (`src/agents/dispatcherAgent.ts`)**: Generates formal complaint letters addressed to local authorities (such as BBMP or GHMC) when a defect receives enough community verifications.
4. **Chat Moderation (`src/agents/moderatorAgent.ts`)**: Automatically filters community chat messages for profanity, toxic content, or spam.

---

## Technical Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Leaflet, Lucide React, Motion.
- **Backend**: Node.js, Express.
- **Database & Auth**: Firebase Auth and Cloud Firestore.
- **API integrations**: Google GenAI SDK, Geoapify.

---

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Google AI Studio API key
- Firebase Project with Auth (Email/Password) and Firestore enabled

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_SCANNER_MODEL=gemini-3.1-flash-lite
GEMINI_RESOLVER_MODEL=gemma-4-31b-it
GEMINI_DISPATCHER_MODEL=gemma-4-26b-a4b-it

VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_API_KEY=your_firebase_client_api_key

VITE_GEOAPIFY_API_KEY=your_geoapify_key
```

### 3. Run the App
To start the backend server and the Vite dev environment:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

---

## Deployment

### Backend (e.g., Render)
1. Set up a Web Service linked to the repository.
2. Build Command: `npm install && npm run build`
3. Start Command: `npm start`
4. Set the environment variables in the Render settings dashboard.

### Frontend (Firebase Hosting)
1. Add a `.env.production` file pointing to your backend URL:
   ```env
   VITE_API_URL=https://your-backend-url.com
   ```
2. Build the production assets:
   ```bash
   npm run build
   ```
3. Deploy to Firebase:
   ```bash
   npx firebase-tools deploy --only hosting
   ```