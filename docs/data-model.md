# Data Model

This document defines the data model for the TaskFlow API, including entities, relationships, PostgreSQL DDL, and constraints.

## Entities and Relationships

The core entities in the system are:

- **Tenant**: Represents an isolated team or organization.
- **User**: Belongs to a tenant; authenticates to access the system.
- **Task**: Belongs to a tenant; can be assigned to a user within the same tenant.
- **Attachment**: Represents a file attached to a task; belongs to the same tenant as the task.
- **Subscription**: Represents the payment/subscription state of a tenant (optional).

Relationships:
- A Tenant has many Users (one-to-many).
- A Tenant has many Tasks (one-to-many).
- A Tenant has many Attachments (one-to-many).
- A Tenant has zero or one Subscription (one-to-zero-or-one).
- A User belongs to exactly one Tenant (many-to-one).
- A Task belongs to exactly one Tenant (many-to-one) and may be assigned to zero or one User (many-to-one, optional).
- An Attachment belongs to exactly one Tenant (many-to-one) and is attached to exactly one Task (many-to-one).

Background jobs (for notifications and payment retries) are managed by BullMQ and do not require persistent tables in this schema; BullMQ manages its own state.

## PostgreSQL DDL

```sql
-- Enable the UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'todo', -- e.g., 'todo', 'in_progress', 'done'
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL if unassigned
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Attachments table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760), -- 10 MB limit
    storage_key VARCHAR(255) NOT NULL, -- Key in storage provider (e.g., S3/R2)
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- e.g., 'active', 'trialing', 'past_due', 'canceled'
    plan_id VARCHAR(255), -- Identifier of the subscription plan
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## Primary Keys
- All tables use UUID as the primary key, generated via `uuid_generate_v4()`.
- This ensures global uniqueness and avoids exposing sequential IDs.

## Foreign Keys
- `users.tenant_id` references `tenants.id` (ON DELETE RESTRICT: prevents deleting a tenant with users).
- `tasks.tenant_id` references `tenants.id` (ON DELETE RESTRICT).
- `tasks.assignee_id` references `users.id` (ON DELETE SET NULL: if a user is deleted, tasks they are assigned to become unassigned).
- `attachments.tenant_id` references `tenants.id` (ON DELETE RESTRICT).
- `attachments.task_id` references `tasks.id` (ON DELETE CASCADE: deleting a task deletes its attachments).
- `subscriptions.tenant_id` references `tenants.id` (ON DELETE CASCADE: deleting a tenant deletes its subscription).

## Required Constraints (NOT NULL)
- `tenants.name`: Required.
- `users.tenant_id`, `users.email`, `users.password_hash`: Required.
- `tasks.tenant_id`, `tasks.title`: Required.
- `attachments.tenant_id`, `attachments.task_id`, `attachments.filename`, `attachments.size_bytes`, `attachments.storage_key`: Required.
- `subscriptions.tenant_id`, `subscriptions.status`: Required.

## Tenant-Isolation Constraints
- Every tenant-owned table (`users`, `tasks`, `attachments`, `subscriptions`) includes a `tenant_id` column.
- Foreign key constraints ensure `tenant_id` references a valid tenant.
- Application-level queries must always filter by `tenant_id` (or use Row-Level Security as defense-in-depth).
- No table allows cross-tenant references via foreign keys (e.g., a task's `assignee_id` must point to a user in the same tenant; this is enforced by application logic, not database constraints, because the database cannot easily enforce that two foreign keys point to rows with the same `tenant_id`). This is an **open question**: should we enforce same-tenant assignment via a trigger or application logic only?

## Indexes
1. **`users.email`**: Unique index (already created by `UNIQUE` constraint) for fast lookup by email during authentication.
2. **`users.tenant_id`**: Index (implicitly created by foreign key) to efficiently find all users in a tenant.
3. **`tasks.tenant_id`**: Index (implicitly created by foreign key) to efficiently find all tasks in a tenant.
4. **`tasks.assignee_id`**: Index (implicitly created by foreign key) to efficiently find tasks assigned to a user.
5. **`attachments.tenant_id`**: Index (implicitly created by foreign key) to efficiently find all attachments in a tenant.
6. **`attachments.task_id`**: Index (implicitly created by foreign key) to efficiently find attachments for a task.
7. **`subscriptions.tenant_id`**: Unique index (implicitly created by `UNIQUE` constraint) to enforce one subscription per tenant and for fast lookup.

## Important Uniqueness Constraints
- `users.email`: Ensures no duplicate email addresses across the system (global uniqueness). This is a design choice; alternatively, email could be unique per tenant. The requirements do not specify, so we chose global simplicity. **Open question**: should email be unique per tenant instead?
- `subscriptions.tenant_id`: Ensures at most one subscription per tenant.

## Cascade/Restrict Behavior
- **Tenants deletion**: 
  - `RESTRICT` on `users` and `tasks`: prevents deletion if users or tasks exist (to avoid orphaned data; application must delete users/tasks first).
  - `CASCADE` on `subscriptions`: deletes subscription when tenant is deleted.
- **Users deletion**: 
  - `SET NULL` on `tasks.assignee_id`: unassigns tasks from a deleted user.
  - `RESTRICT` is not applied to `users` via any foreign key (no table references users as a parent except for the self-referential? Actually, tasks reference users via assignee_id, which we set to SET NULL).
- **Tasks deletion**: 
  - `CASCADE` on `attachments`: deletes attachments when a task is deleted.
- **Attachments deletion**: No cascading dependencies.
- **Subscriptions deletion**: No cascading dependencies.

## PostgreSQL-Specific Considerations
- **UUIDs**: Using `uuid-ossp` extension for secure, unique identifiers.
- **Timestamps**: Using `TIMESTAMP WITH TIME ZONE` for consistent time handling.
- **Check constraint on attachment size**: Enforces the 10 MB limit at the database level.
- **Status fields**: Stored as `VARCHAR` to allow flexibility; application should validate against expected values (e.g., task status: 'todo', 'in_progress', 'done'; subscription status: per Razorpay). **Open question**: should we use PostgreSQL ENUM types for status fields to enforce validity at the database level?
- **Row-Level Security (RLS)**: The architecture mentions RLS as a possible defense-in-depth mechanism. To enable RLS, one would need to:
  ```sql
  ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
  -- Similarly for other tenant-owned tables.
  CREATE POLICY tenant_isolation ON tenants
      USING (id = current_tenant_id()); -- Requires a function to set current_tenant_id per session
  ```
  However, the architecture states that application-level tenant authorization must not be abandoned merely because RLS exists. RLS implementation is an **open question** for the implementation phase.

## Open Questions
1. **Task assignee tenant consistency**: Should the database enforce that a task's assignee belongs to the same tenant as the task? Currently, this is enforced by application logic only. Options: 
   - Add a trigger to check `users.tenant_id = tasks.tenant_id` on insert/update of `assignee_id`.
   - Keep as application logic only (simpler, but relies on correct implementation).
2. **Email uniqueness**: Should `users.email` be unique globally or per tenant? Current design: global uniqueness. Alternative: unique per tenant (allow same email in different tenants).
3. **Status fields as ENUM**: Should we use PostgreSQL ENUM types for `tasks.status` and `subscriptions.status` to enforce valid values at the database level? This would require migrations to change status values.
4. **Row-Level Security**: Should RLS be implemented as an additional layer? If so, what is the strategy for setting the tenant context per connection?
5. **Soft deletes**: Should we add `deleted_at` columns for auditability instead of hard deletes? The requirements do not specify.
6. **Additional task fields**: The requirements only specify that tasks must belong to a tenant. Other fields (title, description, status, assignee) are based on common task management conventions but are not explicitly required. The exact set should be clarified during implementation.
7. **Attachment filename uniqueness**: Should attachment filenames be unique per task or globally? Current design: no uniqueness constraint.
8. **Notification and payment state**: Should we store additional state for notifications (e.g., email sent status) or payment transactions beyond subscription state? The requirements specify maintaining subscription state and using background jobs for retries, but do not mandate storing historical attempts.
