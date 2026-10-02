# Architecture: TaskFlow API

## Style
Modular monolith with clear module boundaries.

## Modules
- auth: Authentication, sessions, API keys
- tenants: Tenant management, isolation
- tasks: Task CRUD, assignment
- files: Upload, storage, retrieval
- notifications: Email, in-app
- billing: Payment, subscription

## Infrastructure
- PostgreSQL (primary datastore)
- Redis (cache, rate limiting, sessions)
- S3 (file storage)
- BullMQ (background jobs)
- Stripe (payments)
- SendGrid (email)

## Deployment
- Docker container
- Fly.io or AWS ECS
- GitHub Actions CI/CD