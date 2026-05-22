# NeuroLearn Diagnostic Assessment System

## Folder structure

```
backend/
├── constants/educationSubjects.js
├── data/assessmentContent.js
├── models/
│   ├── StudentProfile.js
│   ├── SubjectPerformance.js
│   ├── DiagnosticAssessment.js
│   └── LearningStyleReport.js
├── services/
│   ├── diagnosticAnalysisService.js
│   └── aiAnalysisService.js
├── middleware/validateDiagnostic.js
├── controllers/diagnosticController.js
└── routes/diagnosticRoutes.js

src/
├── constants/diagnostic.js
├── services/diagnosticApi.js
├── hooks/
│   ├── useDiagnosticFlow.js
│   └── useAssessmentTimer.js
├── components/diagnostic/
│   ├── ProgressStepper.jsx
│   ├── OnboardingForm.jsx
│   ├── ModalityAssessment.jsx
│   ├── AssessmentAnalyzing.jsx
│   └── DiagnosticReportView.jsx
└── pages/Diagnostic.jsx
```

## API routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/diagnostic/config` | No | Education levels list |
| GET | `/api/diagnostic/subjects/:level` | No | Subjects for education level |
| GET | `/api/diagnostic/status` | Yes | Current step + profile state |
| POST | `/api/diagnostic/onboarding` | Yes | Submit onboarding + subjects |
| GET | `/api/diagnostic/assessment-content` | Yes | Text/audio/video content |
| POST | `/api/diagnostic/assessment/text` | Yes | Submit text modality results |
| POST | `/api/diagnostic/assessment/audio` | Yes | Submit audio modality results |
| POST | `/api/diagnostic/assessment/video` | Yes | Submit video modality results |
| POST | `/api/diagnostic/analyze` | Yes | Run AI + save report |
| GET | `/api/diagnostic/report` | Yes | Full diagnostic report |
| GET | `/api/diagnostic/profile` | Yes | Student profile + subjects |

## Environment

Backend `.env`:

```
MONGODB_URI=...
JWT_SECRET=...
GEMINI_API_KEY=...
```

## Sample AI prompt

See `backend/services/aiAnalysisService.js` — `DIAGNOSTIC_SYSTEM_PROMPT` and `buildAnalysisPrompt()`.

## User flow

1. `/diagnostic` → Onboarding (3 steps)
2. Text assessment → Audio → Video
3. Auto AI analysis
4. Diagnostic report dashboard

## Run

**Terminal 1 — Backend**
```bash
cd backend
npm install
npm start
```
Wait for: `Connected to MongoDB` and `Server is running on port 5000`

**Terminal 2 — Frontend**
```bash
npm install
npm run dev
```

**Root `.env`**
```
VITE_API_URL=http://localhost:5000
```

**Backend `backend/.env`**
```
MONGODB_URI=mongodb+srv://.../neurolearn?retryWrites=true&w=majority
JWT_SECRET=your_long_random_secret
PORT=5000
GEMINI_API_KEY=...
```

Restart Vite after changing `.env`. If onboarding fails with 401, log out and log in again (JWT secret may have changed).

**Health check:** http://localhost:5000/api/health should show `"routes": ["auth","profile","quiz","diagnostic"]`

Set `GEMINI_API_KEY` in `backend/.env` for full AI reports.
