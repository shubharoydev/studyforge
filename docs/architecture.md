# StudyForge AI — Architecture Documentation

## System Overview

StudyForge AI follows a clean three-tier architecture: Frontend → Backend → Database, with AI services abstracted behind provider interfaces.

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (SPA)                       │
│  React + Vite + Tailwind + TanStack Query + React Router │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST + SSE (streaming)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend (Fastify + Node.js)              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Auth     │  │ Documents│  │   Chat   │  │ Quizzes │ │
│  │  Routes   │  │  Routes  │  │  Routes  │  │ Routes  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌────▼────┐ │
│  │  Auth    │  │ Documents│  │   Chat   │  │  Quiz   │ │
│  │ Service  │  │ Service  │  │ Service  │  │ Service │ │
│  └──────────┘  └────┬─────┘  └────┬─────┘  └─────────┘ │
│                     │              │                      │
│                ┌────▼─────┐  ┌────▼─────┐                │
│                │ Document │  │   RAG    │                │
│                │Processor │  │ Pipeline │                │
│                └────┬─────┘  └────┬─────┘                │
│                     │              │                      │
│                ┌────▼─────┐  ┌────▼─────┐                │
│                │ Vector   │  │ Retriever│                │
│                │  Store   │  │(vec/kw)  │                │
│                └──────────┘  └──────────┘                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              AI Provider Layer                     │   │
│  │  ┌──────────────┐    ┌──────────────────────┐    │   │
│  │  │ OpenAI        │    │ Mock (Offline)        │    │   │
│  │  │ - Chat LLM    │    │ - Extractive Chat     │    │   │
│  │  │ - Embeddings  │    │ - Keyword Retrieval   │    │   │
│  │  └──────────────┘    │ - Hash Embeddings      │    │   │
│  │                       └──────────────────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬───────────────────────┬────────────┘
                     │                       │
              ┌──────▼──────┐        ┌───────▼──────┐
              │ PostgreSQL  │        │ File Storage  │
              │ + pgvector  │        │ (local/S3)    │
              └─────────────┘        └──────────────┘
```

## Database Architecture

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Document : owns
    User ||--o{ Conversation : has
    User ||--o{ Quiz : creates
    User ||--o{ QuizAttempt : takes
    User ||--o{ Topic : studies
    User ||--o{ StudyRecommendation : receives

    Document ||--o{ DocumentChunk : contains
    Document ||--o{ Quiz : referenced_by
    Document }o--o{ DocumentSummary : has

    Conversation ||--o{ Message : contains

    Quiz ||--o{ Question : contains
    Quiz ||--o{ QuizAttempt : has

    QuizAttempt ||--o{ QuizAnswer : contains

    Topic ||--o{ UserTopicProgress : tracked_by
```

### Key Models

| Model | Purpose |
|-------|---------|
| User | Authentication and account management |
| Document | Uploaded file metadata, status, summary |
| DocumentChunk | Chunked text with page numbers, embeddings |
| Conversation | Chat session container |
| Message | Individual chat messages with citations |
| Quiz | Quiz configuration |
| Question | Individual quiz questions with options and explanations |
| QuizAttempt | A quiz submission record |
| QuizAnswer | Individual answer in an attempt |
| Topic | Unique topic names per user |
| UserTopicProgress | Accuracy tracking per topic per user |
| StudyRecommendation | Generated personalized recommendations |

### pgvector Integration

The `DocumentChunk` model has an `embedding` field using PostgreSQL's `vector(1536)` type, managed via Prisma's `Unsupported("vector(1536)")` type and raw SQL for inserts and queries.

Cosine similarity search:
```sql
SELECT c.*, 1 - (c.embedding <=> $1::vector) AS similarity
FROM "DocumentChunk" c
JOIN "Document" d ON d."id" = c."documentId"
WHERE d."userId" = $2 AND d."status" = 'READY'
ORDER BY c.embedding <=> $1::vector
LIMIT $3
```

An `ivfflat` or `hnsw` index can be created for production-scale deployments.

## RAG Pipeline

### Document Processing Flow

```mermaid
flowchart TD
    A[Upload PDF] --> B[Save to Storage]
    B --> C[Create Document Record: UPLOADING]
    C --> D[Extract Text per Page: unpdf]
    D --> E[Clean: normalize, remove hyphens, strip boilerplate]
    E --> F[Chunk: 900 chars, 150 overlap, page tracking]
    F --> G[Generate Embeddings: OpenAI or Mock]
    G --> H[Insert Chunks + Embeddings via pgvector]
    H --> I[Mark Document: READY]
    D -->|Error| J[Mark Document: FAILED + Message]
```

### RAG Answer Flow

```mermaid
flowchart TD
    A[User Question] --> B[Generate Query Embedding]
    B --> C[Search pgvector: Top 6 Chunks]
    C --> D{Chunks Found?}
    D -->|No| E[Return: "Not found in your material"]
    D -->|Yes| F[Build Numbered Context Blocks]
    F --> G[Construct LLM Prompt with System Rules]
    G --> H[Send to LLM with Context + History]
    H --> I[Parse [n] Citation Markers]
    I --> J[Map Citations to Document/Page/Excerpt]
    J --> K[Return Answer + Citations]
```

### Offline Mode (Mock)

When `LLM_PROVIDER=mock` or `EMBEDDING_PROVIDER=mock`:
- **Retrieval**: Keyword ranking with TF scoring (no vector search needed)
- **Chat**: Extractive — picks highest-scoring sentences from retrieved chunks
- **Quiz Generation**: Parses definitions from context, builds MCQs deterministically
- **Summaries**: TF-based extraction of overview, concepts, definitions

This allows the entire application to run without any API keys.

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB

    Client->>API: POST /api/auth/login {email, password}
    API->>DB: SELECT user WHERE email = ?
    DB-->>API: user row
    API->>API: bcrypt.compare(password, hash)
    API->>API: jwt.sign({sub: id, email, name}, secret, '7d')
    API-->>Client: {token, user}

    Note over Client: Store token in localStorage

    Client->>API: GET /api/documents (Authorization: Bearer <token>)
    API->>API: jwt.verify(token, secret)
    API->>API: Set request.user = {id, email, name}
    API->>DB: SELECT documents WHERE userId = request.user.id
    DB-->>API: documents
    API-->>Client: {documents: [...]}
```

## Quiz Generation Flow

```mermaid
flowchart TD
    A[Generate Request: count, difficulty, topic] --> B[Gather Chunks from Document/Topic/All Docs]
    B --> C[Build Context Blocks]
    C --> D[Prompt LLM with Quiz Schema + Context]
    D --> E{Valid JSON?}
    E -->|No| F[Retry with feedback - up to 3 attempts]
    F --> D
    E -->|Yes| G[Validate with Zod Schema]
    G -->|Invalid| F
    G -->|Valid| H[Create Quiz + Questions in DB]
    H --> I[Return Quiz with Sanitized Questions]
```

## Deployment Architecture

```mermaid
flowchart LR
    subgraph Frontend
        A[Vite Build] -->|Static| B[Vercel / Netlify]
    end
    subgraph Backend
        C[Node.js + Fastify] --> D[Render / Railway / Fly.io]
    end
    subgraph Database
        E[PostgreSQL + pgvector] --> F[Supabase / Neon]
    end
    subgraph Storage
        G[File Storage] --> H[Supabase Storage / Local]
    end

    B -->|API calls| D
    D -->|SQL + pgvector| E
    D -->|File I/O| G
```

## Design Decisions

1. **Mock providers**: Every feature works offline for demos. No API keys required to run the full flow.
2. **pgvector over external vector DB**: Single database reduces operational complexity for a hackathon project.
3. **In-process job queue**: Document processing runs asynchronously in the same process. Sufficient for hackathon scale; production would use Bull/BullMQ + Redis.
4. **Extractive mock LLM**: Rather than template-based nonsense, the mock provider extracts real sentences from the student's documents — making demos genuinely useful.
5. **Zod validation for AI output**: Structured AI responses are validated with schemas, not parsed from free-form text.
6. **Citations parsed from [n] markers**: The LLM is instructed to cite sources with bracket numbers, which are parsed and mapped to document/page metadata.
