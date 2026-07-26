# Nagarika
**Submission for the Hack the Limit Hackathon**  

A community issue reporting and resolution platform with multilingual support, RAG agents, and civic engagement.

---

## 🔗 Project Links
- **Deployed Application (Demo)**: [https://civic-succedent.web.app](https://civic-succedent.web.app)
- **YouTube Video Walkthrough**: [https://youtu.be/KM1cv3nBvdQ](https://youtu.be/KM1cv3nBvdQ)

---

## 🎥 Demo Video

Watch the full walkthrough demonstrating Nagarika's multi-agent AI verification system, multilingual support, and civic issue resolution pipeline:

[![Watch Demo Video](https://img.shields.io/badge/Watch%20Demo%20Video-red?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/KM1cv3nBvdQ)

---

## 🔑 Test Credentials (For Evaluators)
To test the application across different permission levels and roles, use the pre-configured accounts below:

| Role | Username / Email | Password | Details |
| :--- | :--- | :--- | :--- |
**Admin** | `admin_civic_succedent` | `123456` | Accesses the Admin Control Panel, chat audit, and locks/unblocks flagged users. |
| **User 1** | `Leo` | `123456` | Active citizen with reports and verifications. |
| **User 2** | `Jerry` | `098765` | Active citizen. |
---

## 📋 Walkthrough of Core Application Features

Below is a detailed walkthrough of the application's core features and user flows:

### 1. Landing Page
The portal homepage highlighting the citizen reporting platform and real-time civic issue entry.

### 2. Dashboard
The primary interface showing active issues, recent reports, civic points, and quick action tiles.

### 3. Issue Reporting
Report civic issues via camera scan with AI-powered damage classification and severity scoring.

### 4. Issue Feed
Scrollable list of active and resolved issues with category and severity filters.

### 5. Community Map
Interactive Leaflet map showing all reported issues with category and severity filters.

### 6. AI Complaint Generation
When 2+ citizens verify a report, the Dispatcher Agent generates a formal municipal complaint letter.

### 7. Local Community Chat Lounge
Active community lounge showing localized warnings, reports, and AI-moderated chat logs.

### 8. Citizen Profile & Civic Points
Profile dashboard showing civic points, reports filed, resolves statistics, and language settings.

### 9. AI Agent Configuration
Admin control panel for configuring Gemini model engines (Scanner, Dispatcher, Resolver, Moderator) in real-time.

### 10. Analytics & Leaderboard
Analytics dashboard with community health charts and a civic contribution leaderboard.

---

## ⚠️ The Problem
Civic infrastructure damage — potholes, water leaks, broken streetlights — routinely goes unreported. Existing channels are fragmented, slow, and provide no incentives for community action. At the same time, pedestrians and riders have no real-time way to know which routes are actually safe until they navigate straight into active hazards.

## 💡 The Solution
Nagarika turns spotting a hazard into a civic contribution:
1. **Scan** the hazard with your phone camera.
2. Let a **Gemini-powered multi-agent pipeline** verify and classify it.
3. Once verified, the app **automatically generates a formal complaint letter** and provides escalation guidance.

---

## 🎮 How It Works

### 1. Report & Detect
Report civic issues with your phone camera. Each new report earns **+10 Civic Points**.

### 2. AI Appraisal
A server-side **Gemini Scanner Agent** analyzes uploaded images. It confirms the photo shows a genuine outdoor civic hazard and assigns a severity score (1-10). Full community consensus requires 2 verification votes.

### 3. Community Consensus
Connect with neighborhood citizens inside an AI-moderated chat lounge. A **Moderator Agent** filters chat spam and toxic messages. Two or more verifications trigger an automated official complaint draft.

### 4. Complaint Generation
When a report receives 2+ citizen verifications, the **Dispatcher Agent** generates a formal government complaint letter with RTI query templates and escalation guidance.

### 5. Issue Resolution
Resolve verified issues by submitting before/after photos. The **Resolver Agent** confirms resolution and awards **+25 Civic Points**.

---

## 🤖 Multi-Agent AI Pipeline
Seven Gemini-powered server-side agents handle the validation, classification, and guidance of the application:

| Agent | Role Tag | Description / What It Does |
| :--- | :--- | :--- |
| **Scanner** | `Visual Inspector` | Analyzes uploaded camera snapshots, validates that it shows public outdoor damage, flags duplicates, and rates severity (1-10). |
| **Moderator** | `Quality Guardian` | Audits community chat logs, filters toxic content, and tracks neighborhood consensus votes. |
| **Dispatcher** | `Alert Architect` | Drafts official municipal complaint letters with RTI queries when a case receives 2+ verifications. |
| **Resolver** | `Resolution Verifier` | Reviews "before" vs "after" repair photos to confirm resolution and awards civic points. |
| **Classifier** | `Issue Classifier` | Classifies issues into categories and scores severity using RAG knowledge context. |
| **Router** | `Department Router` | Recommends the specific municipal authority to contact with escalation timelines. |
| **Insights** | `Data Analyst` | Aggregates ward-level issue data and drafts civic action plans. |

---

## 🛠️ Technical Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Leaflet.js, Recharts, Lucide Icons.
- **Backend API**: Node.js, Express.
- **Database & Auth**: Firebase Auth and Cloud Firestore (real-time listeners).
- **APIs & SDKs**: Google GenAI SDK (`@google/genai`), Geoapify Geocoding API.
- **i18n**: English, Hindi (हिंदी), Telugu (తెలుగు) with LanguageContext.
- **RAG**: Local knowledge base (government departments, RTI templates, legal rights, government schemes).



---

## 🚀 Installation & Local Setup

### Prerequisites
- Node.js (v18 or higher)
- Google AI Studio API Key (Gemini)
- Firebase Project with Auth and Firestore enabled
- Geoapify API Key

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

VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_API_KEY=your-client-api-key

VITE_GEOAPIFY_API_KEY=your_geoapify_key
```

### 3. Run the Application
Start the backend Express server and the Vite dev server concurrently:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.