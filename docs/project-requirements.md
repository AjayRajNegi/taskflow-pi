# Product Requirements: TaskFlow API

## Problem Statement
Small teams need a simple task management API with multi-tenant support,
background notifications, and file attachments.

## Target Users
- Small teams (5-50 people)
- Developers integrating via API

## Business Requirements
- Multi-tenant with data isolation
- REST API with OpenAPI spec
- Email notifications on task assignment
- File attachments (max 10MB)
- Payment integration for premium features

## Non-Goals
- Web UI (Phase 2)
- Mobile apps
- Real-time collaboration

## Success Metrics
- API response time p99 < 200ms
- 99.9% uptime
- Zero cross-tenant data leaks

## Risks
- Tenant isolation failure — mitigated by row-level security
- Payment provider outage — mitigated by queue + retry
- File storage cost overrun — mitigated by size limits and retention policy