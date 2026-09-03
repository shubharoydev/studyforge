# StudyForge AI

An evidence-backed AI learning and study assistant.

## Problem

Students juggle dozens of PDFs, lecture notes, and textbook chapters. Generic AI assistants hallucinate, don't understand a student's specific curriculum, and offer no structured way to learn from the student's own material. There's no single tool that transforms study material into a grounded, quiz-driven, analytics-backed learning workspace.

## Solution

StudyForge AI ingests a student's own PDFs, extracts and indexes content with page-level precision, and provides:

- **RAG-powered Q&A** — every answer is grounded in the student's documents with page-level citations
- **Structured summaries** — AI-generated overviews, key concepts, definitions, and exam points
- **Quiz generation** — multiple-choice quizzes generated from the student's material
- **Performance analytics** — topic-wise accuracy, weak/strong areas, improvement trends
- **Personalized recommendations** — explainable suggestions on what to revise next

The core loop: **Documents → RAG → Grounded Answers → Quizzes → Performance Analysis → Personalized Learning**

## Features

| Feature | Description |
|---------|-------------|
| PDF Upload & Processing | Upload PDFs; automatic text extraction, cleaning, chunking, and embedding |
| AI Chat (RAG) | Ask questions; receive answers grounded in your documents with inline source citations [1][2] |
| Page-Level Citations | Every answer shows the exact document and page number |
| Document Summaries | Structured summaries: overview, key concepts, definitions, formulas, exam points |
| Quiz Generation | Generate MCQ quizzes from documents or topics at Easy/Medium/Hard difficulty |
| Quiz Taking | Interactive quiz UI with navigation, timer, and instant feedback |
| Scoring & Grading | Automatic scoring with per-question explanations and topic performance |
| Analytics Dashboard | Overall accuracy, topic-wise performance, improvement trend, activity feed |
| Weak Topic Detection | Automatic classification: weak (<60%), needs practice (60-80%), strong (≥80%) |
| Personalized Recommendations | Explainable suggestions based on quiz performance and study history |
| Demo Seed Data | Pre-populated demo account with ML lecture notes, quizzes, and analytics |
| Mock AI Provider | Full offline operation via extractive fallback — no API keys needed for demos |

## Architecture

```
Browser → Frontend (React + Vite + Tailwind)
              ↓
         Backend (Node.js + Fastify)
              ↓
    ┌─────────┴──────────┐
    ↓                    ↓
PostgreSQL+pgvector    File Storage
    ↓
Document Processing → Chunking → Embeddings → Vector Store
    ↓
RAG Retrieval → Context Building → LLM → Grounded Response + Citations
```

## RAG Pipeline

1. **Upload**: PDF → text extraction (unpdf, page-level) → cleaning → chunking (900 chars, 150 overlap)
2. **Embedding**: Chunks → OpenAI text-embedding-3-small (1536 dims) → stored in pgvector
3. **Retrieval**: Query → embedding → pgvector cosine similarity (top 6 chunks, min similarity 0.12)
   - Offline mode: keyword ranking with TF scoring (no vector search needed)
4. **Context**: Numbered source blocks [1], [2], ... with document name and page number
5. **Answer**: LLM instructed to cite sources inline with [n] markers, never invent facts
6. **Citations**: Parse [n] markers → map to document/page/excerpt → displayed in UI

## Tech Stack

### Frontend
- React 19, Vite 5, Tailwind CSS 3.4
- React Router 6, TanStack Query 5
- Recharts (analytics charts), Radix UI primitives
- Lucide icons, sonner (toasts), react-markdown

### Backend
- Node.js, Fastify 5
- Prisma ORM 6, PostgreSQL 16, pgvector
- Zod validation, bcryptjs, jsonwebtoken
- unpdf (PDF extraction), pino (logging)

### Database
- PostgreSQL 16 with pgvector extension
- Models: User, Document, DocumentChunk, Conversation, Message, Quiz, Question, QuizAttempt, QuizAnswer, Topic, UserTopicProgress, StudyRecommendation

### AI
- OpenAI-compatible provider abstraction (works with OpenAI, Groq, Ollama, LM Studio)
- Mock/offline providers: extractive chat + keyword retrieval + structured quiz generation
- Deterministic mock embeddings (hash-based vectors) for demo without API keys

## Project Structure

```
studyforge-ai/
├── backend/
│   ├── src/
│   │   ├── ai/              # AI provider abstraction and prompts
│   │   ├── db/              # Prisma client singleton
│   │   ├── documents/       # PDF processing, chunking, storage
│   │   ├── middleware/       # Auth, error handling
│   │   ├── rag/             # Retrieval and RAG pipeline
│   │   ├── routes/          # API route handlers
│   │   ├── schemas/         # Zod validation schemas
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Logger, errors, auth utils
│   │   ├── app.js           # Fastify app assembly
│   │   └── server.js        # Server bootstrap
│   ├── prisma/              # Schema and seed
│   ├── tests/               # Vitest test suites
│   └── scripts/             # DB setup scripts
├── frontend/
│   └── src/
│       ├── components/      # UI components + layout
│       ├── context/         # Auth context
│       ├── lib/             # API client, utilities
│       ├── pages/           # All page components
│       ├── App.jsx          # Root component
│       ├── main.jsx         # Entry point
│       ├── router.jsx       # Route definitions
│       └── index.css        # Global styles
├── docs/                    # Architecture, submission, demo
├── docker-compose.yml       # PostgreSQL + pgvector
├── .env.example             # Environment configuration
└── README.md
```

## Local Setup

### Prerequisites
- Node.js ≥ 18
- Docker Desktop (running)
- npm

### 1. Clone and install

```bash
git clone <repo> && cd studyforge-ai
npm --prefix backend install
npm --prefix frontend install
```

### 2. Start PostgreSQL

```bash
docker compose up -d db
```

Wait for healthy status:
```bash
docker compose ps  # should show "healthy"
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set AUTH_SECRET and DATABASE_URL
```

### 4. Set up database

```bash
npm --prefix backend run db:setup
npm --prefix backend run seed  # optional: populates demo account
```

### 5. Start development servers

```bash
# Terminal 1 — Backend (port 4000)
npm --prefix backend run dev

# Terminal 2 — Frontend (port 5173)
npm --prefix frontend run dev
```

Open http://localhost:5173

### Demo Login

```
Email:    demo@studyforge.ai
Password: demo1234
```

The demo account includes ML lecture notes, sample quizzes, and analytics data.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `AUTH_SECRET` | dev fallback | JWT signing secret (min 32 chars in production) |
| `PORT` | 4000 | Backend server port |
| `LLM_PROVIDER` | mock | `openai` or `mock` |
| `LLM_API_KEY` | — | Required if LLM_PROVIDER=openai |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| `LLM_MODEL` | `gpt-4o-mini` | Chat model |
| `EMBEDDING_PROVIDER` | mock | `openai` or `mock` |
| `EMBEDDING_API_KEY` | — | Required if EMBEDDING_PROVIDER=openai |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `STORAGE_DRIVER` | local | `local` or `supabase` |
| `MAX_UPLOAD_MB` | 25 | Maximum upload size in MB |

## Running Tests

```bash
npm --prefix backend run test
```

## Running Linting

```bash
npm --prefix backend run lint
npm --prefix frontend run lint
```

## Deployment

The application can be deployed to any platform supporting Node.js:

- **Backend**: Render, Railway, Fly.io — requires PostgreSQL + pgvector
- **Frontend**: Vercel, Netlify, Cloudflare Pages — set VITE_API_URL to backend URL
- **Database**: Supabase (managed PostgreSQL + pgvector), Neon, or any PostgreSQL 16 host

For production:
1. Set `LLM_PROVIDER=openai` and `EMBEDDING_PROVIDER=openai` with valid API keys
2. Set a strong `AUTH_SECRET` (≥ 32 chars)
3. Set `STORAGE_DRIVER=supabase` with Supabase credentials
4. Set `CORS_ORIGIN` to your frontend domain
5. Set `NODE_ENV=production`

## Security

- JWT authentication with bcrypt password hashing
- User data isolation (all queries scoped to authenticated user)
- File upload validation: MIME type check, magic byte check, size limits
- No secrets committed (`.env` in `.gitignore`)
- SQL injection prevented via Prisma parameterized queries + raw query parameter binding
- CORS configured to specific origins
- Rate limiting on all routes (stricter on auth and AI endpoints)
- Internal error details not exposed to clients in production

## Future Scope

- DOCX, PPTX, and image support (via OCR)
- Speech-to-text for lecture recordings
- Spaced repetition scheduling
- Collaborative study groups
- Mobile app (React Native)
- Browser extension for web article capture
- Advanced reranking models
- Multi-language support
- Dark mode

## Hackathon Problem Statement

**Track 01** — AI, ML & Emerging Technologies
**PS 03** — Generative AI for Productivity

StudyForge AI directly addresses this by using Generative AI (RAG + structured output) to transform passive study material into an active learning system — reducing time spent searching, improving retention through quizzes, and personalizing revision through analytics.

## Team

StudyForge AI — Inter-College Hackathon Team
