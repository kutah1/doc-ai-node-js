📘 PROJECT REQUIREMENTS & BUILD SPEC
DocSense AI – Policy & Document Interpreter
Node.js Backend (REVISED EDITION)
1. PROJECT OVERVIEW
Project Name

DocSense AI – Policy & Document Interpreter (Node.js Backend)

Purpose

This project is a Node.js replication of an existing Python FastAPI RAG backend. It must preserve:

Architecture

Security model

Multi-tenant data isolation

Retrieval-Augmented Generation (RAG)

Strict grounding rules

API-key and JWT authentication

This is backend-only. No frontend. No UI. No SDK.

2. PROBLEM STATEMENT

Institutions such as schools, churches, NGOs, and SMEs store critical documents that:

Are difficult to interpret

Are frequently misapplied

Are not searchable by meaning

This causes:

Policy misuse

Administrative errors

Legal and compliance risk

3. SOLUTION SUMMARY

A backend-only AI system that:

Ingests documents

Chunks and embeds them

Stores embeddings securely with per-user ownership

Exposes authenticated APIs

Answers questions strictly grounded in uploaded documents

This is not a chatbot.
It is an institutional-grade RAG backend.

4. CORE CONSTRAINTS (NON-NEGOTIABLE)

Backend-only

Language: Node.js (JavaScript, not TypeScript)

Framework: Express.js

Vector DB: Supabase (Postgres + pgvector)

Vector search: Supabase RPC function

LLM provider: OpenRouter

Embeddings:

Local fastembed (Node.js supported)

OR OpenAI Embeddings (fallback / alternative)

Authentication:

Supabase JWT (Bearer)

Custom API Keys

Multi-tenancy enforced at database level

Manual testing only

.env.example uses placeholders only

No architectural shortcuts

No extra frameworks

5. SYSTEM ARCHITECTURE
Client (Postman / curl / external app)
        ↓
Auth Middleware (JWT or API Key)
        ↓
Express.js Backend
        ↓
Supabase (Postgres + pgvector + Storage)
        ↓
OpenRouter (LLM reasoning)


Embeddings are generated inside the backend, never in the client.

6. EMBEDDING STRATEGY (UPDATED & VERIFIED)
Supported Embedding Modes

This backend must support two embedding modes, selectable via environment variable.

Mode A: Local Embeddings (fastembed – Node.js)

Package: fastembed (Node.js supported)

Model: BAAI/bge-base-en-v1.5

Dimension: 768

Inference: Local ONNX runtime

No API calls

Matches Python version exactly

Mode B: API Embeddings (OpenAI)

Package: openai

Model: text-embedding-3-small

Dimension: 1536

Used as:

Fallback

Cloud-first deployment option

Embedding Mode Selection
EMBEDDING_PROVIDER=fastembed
# or
EMBEDDING_PROVIDER=openai


⚠️ The database vector dimension MUST match the chosen provider.
⚠️ Do not mix providers in the same database.

7. DATABASE DESIGN (SUPABASE)
Enable pgvector
create extension if not exists vector;

Table: documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  source text,
  created_at timestamp default now()
);


Purpose:

Stores document metadata

Enforces per-user ownership

Table: document_chunks
fastembed version (768-dim)
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  embedding vector(768),
  created_at timestamp default now()
);

OpenAI version (1536-dim)
embedding vector(1536)

Table: api_keys
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  api_key text unique not null,
  name text not null,
  created_at timestamp with time zone default now(),
  last_used_at timestamp with time zone,
  is_active boolean default true not null
);

RPC FUNCTION (MANDATORY, MULTI-TENANT)
fastembed version
create or replace function match_document_chunks (
  query_embedding vector(768),
  owner_id uuid,
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on dc.document_id = d.id
  where
    d.owner_id = match_document_chunks.owner_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;


(OpenAI version identical except vector size.)

8. FILE & FOLDER STRUCTURE (LOCKED)
project-root/
│
├── src/
│   ├── index.js
│   │
│   ├── config/
│   │   └── index.js
│   │
│   ├── db/
│   │   ├── supabaseClient.js
│   │   └── index.js
│   │
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── models/
│   │   ├── authSchemas.js
│   │   ├── documentSchemas.js
│   │   ├── apiKeySchemas.js
│   │   └── usageMetricSchemas.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── documents.js
│   │   ├── ask.js
│   │   ├── apiKeys.js
│   │   ├── multipart.js
│   │   └── metrics.js
│   │
│   ├── services/
│   │   ├── embeddingService.js
│   │   └── openRouterService.js
│   │
│   └── utils/
│       ├── chunker.js
│       └── fileProcessor.js
│
├── .env.example
├── package.json
└── README.md

9. REQUIRED PACKAGES (STABLE, LOW-RISK)
{
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.4.0",

    "@supabase/supabase-js": "^2.55.0",
    "zod": "^3.27.0",

    "axios": "^1.6.8",
    "openai": "^4.47.0",

    "fastembed": "^2.1.0",

    "uuid": "^9.0.1",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0"
  }
}


All versions selected for:

Active maintenance

Low CVE exposure

Wide production usage

10. ENVIRONMENT VARIABLES
.env.example
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Embeddings
EMBEDDING_PROVIDER=fastembed
FASTEMBED_MODEL=bge-base-en-v1.5
OPENAI_API_KEY=your-openai-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# OpenRouter
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=mistralai/devstral-2512:free

# App
APP_ENV=development

11. CORE MODULE RESPONSIBILITIES
middleware/auth.js

Accepts:

Authorization: Bearer <JWT>

X-API-Key: <api_key>

Resolves user identity

Attaches req.userId

Rejects unauthorized requests

services/embeddingService.js

Initializes embedding provider at startup

Uses:

fastembed if enabled

OpenAI otherwise

Returns vector of correct dimension

Never mutates embeddings

services/openRouterService.js

Grounding is mandatory.

System prompt must include:

Answer ONLY from the provided context.
If the answer is not present, say you do not know.

No exceptions.

utils/chunker.js

Chunk size ≈ 500 characters

Optional overlap

Deterministic output

No AI logic

utils/fileProcessor.js

Supports PDF, DOCX, TXT

Rejects unsupported formats gracefully

Never crashes server

12. API ENDPOINTS (MANDATORY)

POST /auth/signup

POST /auth/login

POST /upload-doc

POST /ask

POST /api/api-keys

GET /api/api-keys

DELETE /api/api-keys/:keyId

POST /api/multipart

GET /api/metrics (optional)

All protected endpoints require authentication.

13. MANUAL TESTING REQUIREMENTS

App boots cleanly

JWT auth works

API key auth works

Multi-user isolation enforced

Vector search filters by owner_id

Ungrounded queries return “I do not know”

Multipart upload succeeds

Storage uploads succeed

14. HANDOFF INSTRUCTION (STRICT)

Follow this document exactly.
Do not add frameworks.
Do not simplify logic.
Do not alter architecture.
Implement file-by-file.

15. WHY THIS PROJECT MATTERS

This backend is:

RAG-native

Institution-safe

Ownership-aware

Agent-ready

Commercially expandable

Quiet power. No noise. No shortcuts 🔒📚

NEXT (OPTIONAL)

I can now:

Convert this into a Claude Code / Gemini build prompt

Add a Postman collection

Add a deployment hardening checklist

Design Project 2: Agentic Policy Reasoners

Say the word and we keep forging 🔧🧠