# NeuroAI — Intelligent Adaptive Learning Platform

> An AI-powered education platform that personalizes learning in real-time using emotion detection, attention monitoring, adaptive content delivery, and career intelligence.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Our Solution](#our-solution)
3. [Key Features](#key-features)
4. [How It Works — The Adaptive Loop](#how-it-works--the-adaptive-loop)
5. [Technology Stack](#technology-stack)
6. [AI/ML Integrations](#aiml-integrations)
7. [User Roles & Flows](#user-roles--flows)
8. [Feature Deep Dive](#feature-deep-dive)
9. [Architecture Overview](#architecture-overview)
10. [Impact & Metrics](#impact--metrics)
11. [Future Scope](#future-scope)

---

## Problem Statement

Traditional education follows a one-size-fits-all approach. Every student is different — they learn at different speeds, get confused at different points, lose attention at different times, and have different career aspirations. Yet they all receive the same content, in the same format, at the same pace.

**Key pain points:**
- Students disengage when content doesn't match their learning style
- Teachers can't monitor 30+ students' emotional and cognitive states simultaneously
- No real-time feedback loop between student struggle and content adjustment
- Career guidance is generic, not personalized to individual skills and interests
- Interview preparation lacks realistic practice with AI-driven feedback

---

## Our Solution

**NeuroAI** is an intelligent adaptive learning platform that closes the feedback loop between *how a student is feeling/performing* and *what content they receive next*. It uses:

- **Real-time emotion detection** via webcam (facial expression analysis using Vision AI)
- **Attention monitoring** via face tracking, gaze direction, and screen focus
- **Adaptive content engine** that adjusts difficulty, format, and pacing based on student state
- **AI-powered teaching** that generates personalized explanations, quizzes, and study plans
- **Career intelligence** using ML-based skill matching, resume parsing, and live job data
- **AI Interview simulator** with voice-based mock interviews and post-interview analysis

---

## Key Features

| Feature | What It Does |
|---------|-------------|
| Diagnostic Assessment | Multi-modal test (text, audio, video, interactive) to identify learning style |
| Adaptive AI Teacher | Real-time teaching sessions that adapt based on confusion/engagement signals |
| Emotion Detection | Webcam-based facial analysis classifying happy/confused/frustrated/engaged/sad |
| Attention Monitoring | 10-second snapshots tracking face presence, gaze, head pose, screen focus |
| Content Adaptation Engine | Recommends format changes (video/diagram/text/interactive) based on signals |
| AI Study Plan Generator | Personalized day-by-day study plans with AI-generated schedules |
| Performance Prediction | ML models (Random Forest, XGBoost, LightGBM) predicting future scores |
| Career Recommendation | Skill-gap analysis, resume parsing, what-if simulation, live job listings |
| AI Interview System | Voice-based mock interviews (Vapi AI) with real-time transcript and analysis |
| Rapid Battle Mode | Real-time multiplayer quiz battles via WebSocket |
| AI Chatbot Mentor | Context-aware study mentor available on every page |
| Teacher Dashboard | Class-wide analytics, student risk detection, content studio |
| Leaderboard & Gamification | Competitive scoring across subjects to boost engagement |

---

## How It Works — The Adaptive Loop

```
                    +------------------+
                    |   Student Joins  |
                    |    a Session     |
                    +--------+---------+
                             |
                             v
              +-----------------------------+
              |  SIGNAL COLLECTION (every   |
              |  10 seconds, continuously)  |
              +-----------------------------+
              |                             |
    +---------+----------+      +----------+---------+
    | Attention Snapshot  |      | Emotion Detection  |
    | - Face present?     |      | - Happy/Confused/  |
    | - Gaze direction    |      |   Frustrated/Sad/  |
    | - Head pose (yaw,   |      |   Engaged/Neutral  |
    |   pitch, roll)      |      | - Webcam frame     |
    | - Screen focused?   |      |   analysis via     |
    | - Distraction count |      |   Vision AI        |
    +---------+----------+      +----------+---------+
              |                             |
              v                             v
    +-------------------------------------------+
    |       ADAPTIVE LEARNING ENGINE            |
    +-------------------------------------------+
    | Computes 3 core scores (0-100):           |
    |                                           |
    | Readiness Score  = quiz marks (45%) +     |
    |   completion rate (25%) + learning        |
    |   speed (15%) + attention (15%)           |
    |                                           |
    | Confidence Score = quiz marks (50%) +     |
    |   self-reported confidence (30%) +        |
    |   emotion positivity (20%)                |
    |                                           |
    | Confusion Score  = error rate (40%) +     |
    |   confused/frustrated emotions (35%) +    |
    |   inverse attention (25%)                 |
    +-------------------------------------------+
              |
              v
    +-------------------------------------------+
    |         DECISION ENGINE                   |
    +-------------------------------------------+
    | Case 1: Readiness >= 75    -> Advance     |
    | Case 2: Readiness 40-74   -> Practice     |
    | Case 3: Confusion >= 60   -> Simplify     |
    | Case 4: Engagement <= 35  -> Change format|
    +-------------------------------------------+
              |
              v
    +-------------------------------------------+
    |     CONTENT ADAPTATION                    |
    +-------------------------------------------+
    | Adjusts: difficulty level, content format |
    | (video/diagram/interactive/text), pacing, |
    | and topic progression in real-time        |
    +-------------------------------------------+
```

---

## Technology Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite | Build tool (fast HMR) |
| TailwindCSS | Styling |
| Chart.js / Recharts | Data visualization & analytics charts |
| Socket.IO Client | Real-time multiplayer battles |
| Vapi Web SDK | Voice-based AI interview interface |
| Google Generative AI | Client-side AI features |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database & ODM |
| Socket.IO | WebSocket server for real-time features |
| JWT | Authentication & authorization |
| Multer | File uploads (resumes, images) |
| Xenova Transformers | On-device ML inference |

### ML Service (Python)
| Technology | Purpose |
|-----------|---------|
| FastAPI | High-performance ML API |
| scikit-learn | Career recommendation models |
| Ollama | Local LLM integration |
| APScheduler | Background job scheduling (career graph updates) |

### Performance Predictor (Python)
| Technology | Purpose |
|-----------|---------|
| Random Forest | Ensemble prediction model |
| XGBoost | Gradient boosting model |
| LightGBM | Fast gradient boosting model |
| Google Gemini | AI-generated study recommendations |

### AI Providers (Multi-Provider Fallback)
| Provider | Use Case |
|---------|----------|
| Groq (LLaMA 3.1/3.3) | Primary: quiz generation, teaching, chatbot, interviews |
| Google Gemini 2.0 Flash | Secondary: content generation, vision analysis |
| OpenAI GPT-4o/GPT-5 | Tertiary fallback for all text generation |
| Groq Vision (LLaMA 3.2 11B) | Emotion detection from webcam frames |
| Vapi AI | Voice-based AI interviews (speech-to-text + TTS) |
| Ollama | Local LLM for career recommendations |

---

## AI/ML Integrations

### 1. Emotion Detection (Computer Vision)
- Captures webcam frames every few seconds
- Sends base64-encoded image to a multimodal Vision LLM
- Classifies 6 emotions: **happy, neutral, confused, frustrated, sad, engaged**
- Stores emotion logs per session for trend analysis
- Used by Adaptive Engine to detect confusion/frustration in real-time

### 2. Attention Monitoring (Browser-Based)
- Tracks face presence via browser face detection APIs
- Monitors head pose (yaw, pitch, roll) for engagement
- Detects gaze direction (looking at screen vs. away)
- Tracks tab/screen focus events
- Logs distraction events with timestamps
- Computes attention score per 10-second window

### 3. Adaptive Learning Engine (Rule-Based + AI)
- Collects 6 input signals: quiz marks, emotion score, attention score, engagement score, completion rate, learning speed
- Computes weighted readiness, confidence, and confusion scores
- Makes real-time decisions: advance, practice more, simplify, or change format
- Persists recommendations in database for analytics

### 4. Performance Prediction (ML Models)
- Three ensemble models trained on student data
- Predicts future subject scores with R-squared > 0.98
- Identifies at-risk students early
- Gemini AI generates personalized improvement recommendations

### 5. Career Recommendation (Content-Based + Collaborative Filtering)
- Parses resumes (PDF/text) using LLM extraction
- LinkedIn profile scraping for additional context
- scikit-learn vectorization for skill matching
- Multi-agent debate system for career path validation
- What-if simulation: "What if I learn Docker and Kubernetes?"
- Live job listings from Adzuna, JSearch APIs
- Causal career graph with reachability computation

### 6. AI Interview System (Voice AI)
- Generates role-specific interview questions via LLM (technical, behavioral, HR, mixed)
- Vapi AI provides real-time voice conversation (speech-to-text + text-to-speech)
- Real-time transcript capture during interview
- Post-interview analysis: scoring across communication, technical depth, confidence, structure
- Detailed report with strengths, weaknesses, and improvement suggestions

---

## User Roles & Flows

### Student Flow
```
Signup -> Diagnostic Assessment (Learning Style Detection)
   |
   v
Dashboard -> Study Plan Generation -> AI Teacher Sessions
   |              |                        |
   |              v                        v
   |         Daily Tasks &           Emotion + Attention
   |         Topic Progress          Monitoring (real-time)
   |              |                        |
   v              v                        v
Career Rec   Performance         Content Adaptation
& Interviews  Prediction          (format/difficulty)
   |              |                        |
   v              v                        v
Resume Parse  At-Risk Alerts      Simplified Explanations
& Skill Gap   to Teacher          or Format Changes
```

### Teacher Flow
```
Signup (gets unique class code) -> Share code with students
   |
   v
Teacher Dashboard:
  - Class-wide analytics (mastery heatmap)
  - Individual student drill-down
  - At-risk student detection (Struggling/At Risk/On Track)
  - Quiz & battle performance timelines
  - Content Studio (create/manage learning materials)
  - Learning style distribution of class
```

---

## Feature Deep Dive

### 1. Multi-Modal Diagnostic Assessment
The platform starts with a comprehensive diagnostic that tests students across **four learning modalities**:
- **Text Mode**: Reading comprehension and written problem-solving
- **Audio Mode**: Audio-based learning and listening comprehension
- **Video Mode**: Visual learning and observation skills
- **Interactive Mode**: Hands-on problem solving and experimentation

This determines the student's **dominant learning style** (Visual, Auditory, Reading/Writing, Kinesthetic) which drives all subsequent content recommendations.

---

### 2. AI Teacher Sessions
A fully adaptive teaching experience powered by LLMs:
- Generates **7-10 teaching blocks** per session (introduction, concept, example, visual, interactive check, revision, summary)
- Each block contains rich educational content (150+ words of actual subject matter)
- Visual blocks include **auto-generated concept diagrams** with nodes and edges
- Interactive checks assess understanding mid-session
- Adapts difficulty based on student responses
- Supports **daily progress tracking**, **revision sessions**, and **feedback analysis**

---

### 3. Real-Time Emotion + Attention Monitoring
During any learning session:
- Webcam captures frames periodically
- Vision AI classifies facial emotions
- Browser APIs track face position, gaze, and screen focus
- Combined into **Engagement Score** (0-100)
- If confusion detected for sustained period → triggers content simplification
- If attention drops → suggests format change (e.g., switch from text to video)
- All data logged for teacher review and long-term trend analysis

---

### 4. AI-Powered Study Plan Generator
- Students select subjects, set target marks, and exam deadline
- AI generates a **day-by-day personalized study plan**
- Factors in: learning style, current performance, weak topics, available hours
- Plans adapt as student progresses (completion tracking)
- Includes topic-level tests to validate mastery before advancing

---

### 5. Rapid Battle Mode (Real-Time Multiplayer)
- Students create/join battle rooms via WebSocket
- AI generates topic-specific MCQ questions in real-time
- Timer-based competitive quiz format
- Live scoring and leaderboard updates
- Results saved for teacher analytics and student progress tracking
- Gamification to boost engagement and healthy competition

---

### 6. Career Intelligence Module
A complete career guidance system:

| Feature | Description |
|---------|-------------|
| Resume Parsing | Upload PDF/text resume; LLM extracts skills, experience, certifications |
| LinkedIn Integration | Scrapes public LinkedIn data for additional skill context |
| Career Recommendations | ML model matches skills to career paths with confidence scores |
| What-If Simulation | "What if I learn React and AWS?" — shows how recommendations change |
| Skill-Gap Analysis | Identifies missing skills for target role with learning roadmap |
| Role Chat | AI advisor personas (mentor, recruiter, future-you) for career guidance |
| Market Trends | Real-time demand data for roles and skills |
| Live Jobs | Fetches live job listings from Adzuna/JSearch APIs (India-focused) |
| Career Graph | Causal graph showing role transitions and reachability |

---

### 7. AI Interview Simulator
End-to-end mock interview system:
- **Schedule**: Choose type (technical/behavioral/HR/mixed), topics, difficulty, duration
- **Prepare**: AI generates role-appropriate questions using LLM
- **Interview**: Real-time voice conversation with Vapi AI (speech-to-text + TTS)
- **Transcript**: Complete real-time transcript captured for review
- **Analysis**: Post-interview scoring on communication, technical depth, confidence, problem-solving
- **Report**: Detailed strengths/weaknesses with actionable improvement tips

Interview types and topics include:
- Technical: DSA, Java, Spring Boot, DBMS, OS, Computer Networks, System Design, OOP, SQL, AWS
- Behavioral: Teamwork, leadership, conflict resolution
- HR: Motivation, career goals, strengths/weaknesses
- Mixed: Combination of all types

---

### 8. Content Adaptation Engine
Recommends the optimal content format based on:
- Student's learning style (from diagnostic)
- Current confusion score
- Current engagement level
- Historical success with different formats
- Available formats: video, diagram, text explanation, interactive exercise, audio

---

### 9. AI Chatbot Mentor
- Available on every page as a persistent helper
- Context-aware (knows which page the student is on)
- Helps with: concept explanations, study planning, stress management, revision tips
- Maintains conversation history for continuity
- Powered by Groq (LLaMA 3.1) for fast responses

---

### 10. Teacher Dashboard & Analytics
Teachers get a comprehensive view of their class:
- **Student Status**: Each student tagged as On Track / At Risk / Struggling
- **Risk Detection Algorithm**: Based on mastery average, battle performance, attention level, and declining trends
- **Mastery Heatmap**: Subject-wise performance buckets (Mastered / Developing / Needs Work)
- **Quiz Timeline**: Chronological view of all quiz and battle attempts
- **Learning Style Distribution**: Visual breakdown of class learning preferences
- **Individual Drill-Down**: Deep analytics per student including emotion trends, attention patterns, concept gaps
- **Content Studio**: Create and manage learning resources for the class

---

### 11. Performance Prediction System
- Trained on student academic data (CGPA, marks, attendance, interest levels, study habits)
- Three ML models (Random Forest, XGBoost, LightGBM) for robust predictions
- Predicts per-subject scores with confidence intervals
- Identifies improvement potential (predicted score vs. current score)
- AI-generated personalized recommendations for each subject

---

### 12. Leaderboard & Gamification
- Global and subject-wise leaderboards
- Quiz scores, battle wins, and streaks tracked
- Encourages healthy competition and consistent study habits
- Visible to both students and teachers

---

## Architecture Overview

```
+------------------+     +------------------+     +------------------+
|   React Frontend |     |  Node.js Backend |     |  Python ML Svc   |
|   (Vite + TW)    |<--->|  (Express + WS)  |<--->|  (FastAPI)       |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        |  REST + WebSocket      |  REST API              |  REST API
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|  Vapi AI (Voice) |     |   MongoDB Atlas  |     |  scikit-learn    |
|  Interview Voice |     |   (All Data)     |     |  models + LLM    |
+------------------+     +------------------+     +------------------+
                                 |
                    +------------+------------+
                    |            |            |
              +---------+  +---------+  +---------+
              |  Groq   |  | Gemini  |  | OpenAI  |
              |  (LLM)  |  | (LLM)  |  |  (LLM)  |
              +---------+  +---------+  +---------+
```

### Multi-Provider AI Strategy
The system implements a **fallback chain** for AI reliability:
1. **Primary**: Groq (fastest inference, free tier available)
2. **Secondary**: Google Gemini (high quality, generous free tier)
3. **Tertiary**: OpenAI GPT-4o (most capable, paid)

If one provider fails (rate limit, outage), the system automatically falls through to the next. This ensures **zero downtime** for AI features.

---

## Impact & Metrics

| Metric | Value |
|--------|-------|
| API Endpoints | 18+ route modules, 50+ endpoints |
| AI Models Used | 6+ (LLaMA, Gemini, GPT-4o, XGBoost, Random Forest, LightGBM) |
| Real-Time Features | WebSocket battles, emotion tracking, attention monitoring |
| Prediction Accuracy | R-squared > 0.98 for performance prediction |
| Content Formats | 5 adaptive formats (video, diagram, text, interactive, audio) |
| Interview Types | 4 (technical, behavioral, HR, mixed) |
| Career Insights | Resume parsing, skill-gap, what-if simulation, live jobs |
| Modalities Assessed | 4 (text, audio, video, interactive) |

---

## What Makes NeuroAI Unique

1. **Closed Feedback Loop**: Unlike other ed-tech platforms, we don't just deliver content — we continuously sense student state and adapt in real-time.

2. **Multi-Signal Fusion**: We combine emotion + attention + quiz performance + engagement into a unified decision engine. No single signal alone drives decisions.

3. **Multi-Provider AI Resilience**: Our AI never goes down. Three providers with automatic fallback ensure consistent availability.

4. **End-to-End Career Pipeline**: From resume parsing to skill-gap to live jobs — students get a complete career trajectory, not just content delivery.

5. **Voice AI Interviews**: Real conversational mock interviews with AI, not just text-based Q&A. Students practice speaking, not just typing.

6. **Teacher Empowerment**: Teachers aren't replaced — they get superpowers. Real-time risk detection and class-wide analytics they could never compute manually.

7. **Gamified Learning**: Battle mode and leaderboards keep students coming back, turning studying into a social activity.

---

## Future Scope

- **Proctoring Integration**: Extend attention monitoring for exam integrity
- **Parent Dashboard**: Share progress reports with parents/guardians
- **Multi-Language Support**: Teaching in regional languages
- **Peer Tutoring Matching**: Connect struggling students with high-performers
- **Enterprise Training Module**: Adapt the platform for corporate L&D
- **Mobile App**: Native mobile experience for on-the-go learning
- **LMS Integration**: Plug into existing university learning management systems

---

## Team

> NeuroAI — Making education intelligent, personal, and accessible for every learner.

---

*Built with React, Node.js, Python, MongoDB, and cutting-edge AI/ML technologies.*
