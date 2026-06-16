# NeuroAI — Career Recommendation ML Service

This is the Python ML service (FastAPI + scikit-learn + Ollama gpt) merged into NeuroAI.

## Start

```bash
# From NeuroAI root:
npm run ml-service

# Or directly:
cd ml_service && python3 main.py
```

Runs on **http://localhost:8000**

## Requires
- Python 3.10+
- Ollama api key

## Install Python deps
```bash
cd ml_service
pip3 install -r requirements.txt
```

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /recommend | Career recommendations |
| POST | /simulate | What-if skill simulation |
| POST | /skill-gap | Skill gap + roadmap |
| POST | /parse-resume | PDF/text resume extraction |
| POST | /role-chat | AI advisor chat (mentor/recruiter/future_you) |
| GET  | /market-trends | Market demand data |
| GET  | /live-jobs | Live job listings |
| GET  | /health | Health check |

All endpoints in the NeuroAI frontend go through the Node.js backend proxy at `/api/career/*`.
