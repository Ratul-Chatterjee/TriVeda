# System HLD (High-Level Design)

## Objective
TriVeda is a multi-role Ayurvedic healthcare platform with three main user sides:
- Patient side
- Doctor side
- Admin side

## Context Diagram
```mermaid
flowchart LR
  Patient --> FE[Frontend]
  Doctor --> FE
  Admin --> FE

  FE --> BE[Backend API]
  BE --> DB[(PostgreSQL)]
  BE --> AI[AI Microservice]

  AI --> RAG[(Herb + Research KB)]
  AI --> OCR[(OCR Processing)]
```

## Subsystems
1. Frontend (React)
- Role-specific dashboards and workflows.
- Uses TanStack Query + Axios API wrappers.

2. Backend (Express + Prisma)
- Business logic and RBAC-adjacent role split.
- Persistence and transactional consistency.

3. AI Microservice (FastAPI)
- Triage, RAG assistant, OCR analysis.

4. Data Layer (PostgreSQL)
- Core transactional entities and plan lifecycle objects.

## Request Lifecycle
```mermaid
sequenceDiagram
  participant U as User (Any Role)
  participant FE as Frontend
  participant BE as Backend
  participant DB as PostgreSQL
  participant AI as AI Service

  U->>FE: UI action
  FE->>BE: API request
  BE->>DB: Read/Write transaction
  alt AI needed
    BE->>AI: AI request
    AI-->>BE: AI response
  end
  BE-->>FE: ApiResponse wrapper
  FE-->>U: Updated UI state
```

## Non-Functional Highlights
- Modularity by feature (controllers/routes).
- API-level validation and sanitization in controller boundaries.
- JSON fields for flexible clinical/treatment structures.
- AI dependency isolated behind backend gateway calls.

## Risks and Notes
- Matchmaker endpoint contract should be validated across backend and AI service deployments.
- OCR and RAG startup dependencies can fail independently; health monitoring is required.
