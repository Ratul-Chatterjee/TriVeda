# Backend Technologies and Engineering Choices

## Runtime Stack
- Node.js + Express 5
- Prisma ORM
- PostgreSQL (Neon adapter)
- Axios for AI service calls
- JWT + cookie-parser for auth session token handling

## Why This Stack
- Express provides straightforward modular routing and middleware.
- Prisma offers typed schema-driven DB operations and migrations.
- PostgreSQL supports relational integrity with JSON flexibility.
- Separate AI service keeps ML dependencies isolated from API runtime.

## Module-Level Responsibilities
- Controllers: orchestration + validation + response shaping
- Routes: endpoint mapping
- DB config: adapter and client lifecycle
- Utils: reusable API response/error wrappers

## Data Design Strategy
- Normalize core transactional entities.
- Use JSON where treatment payload shape can evolve.
- Use explicit lifecycle tables for auditability and doctor alerts.

## Security and Operational Notes
- Use strong `JWT_SECRET` in production.
- Keep `httpOnly` cookies enabled for token transport.
- Restrict CORS origin via `FRONTEND_URL`.
- Introduce dedicated auth middleware for stricter route protection if scaling.

## Performance Considerations
- Add indexes for frequently filtered fields (doctorId, patientId, createdAt).
- Avoid N+1 query patterns by using Prisma `include` selectively.
- Keep OCR and RAG calls async with sensible timeouts.
