# ADR 001: Adopt Modular Monolith Architecture

## Status
Accepted

## Context
The TaskFlow API requires a multi-tenant backend with strong data isolation, background job processing, file attachments, and payment integration. The team needs to deliver a production‑oriented REST API quickly while maintaining clear module boundaries and low operational overhead. Alternatives considered include a split architecture (microservice‑lite) and a traditional layered monolith.

## Decision
We will implement the system as a **modular monolith** using TypeScript and Bun. All application modules (auth, tenants, users, tasks, notifications, files, payments) reside in a single codebase and run within the main API process. Background jobs are handled by separate worker processes that share the same codebase. Tenant isolation is enforced via application‑level filtering (and optionally PostgreSQL Row‑Level Security). Communication between modules occurs through direct method calls; background jobs use BullMQ + Redis.

## Consequences
### Positive
- Simple deployment and local development (single artifact).
- Low infrastructure overhead (API + worker + PostgreSQL + Redis + storage).
- Straightforward end‑to‑end testing and ACID transactions across modules.
- Clear module boundaries facilitate future extraction to services if needed.
- Faster iteration due to reduced distributed‑systems complexity.

### Negative
- Modules share the same process; a bug in one module could affect others (mitigated by error boundaries).
- Independent scaling of individual modules is not possible initially (can be addressed by scaling the whole API/worker pool).
- Risk of gradual coupling if module boundaries are not maintained.

## Alternatives Considered
1. **Split Architecture (Microservice‑lite)** – Separate services for tasks, notifications, files, payments, etc., communicating via an event bus. Rejected because of higher operational complexity, increased latency, and challenges with cross‑service transactions, which are unnecessary for the current scale and team size.
2. **Traditional Layered Monolith** – All code in a single layer without explicit module boundaries. Rejected because it makes it harder to enforce separation of concerns and would impede future modularity or service extraction.