# T-010 Summary: Background Job Setup for Task Assignment Notifications

## Overview
Implemented background job processing for sending email notifications when a task is assigned to a user, using BullMQ + Redis as specified in the architecture.

## Components Implemented

### 1. Email Provider Abstraction
- **`src/shared/email/email.provider.ts`**: Defines `EmailProvider` interface and `SendEmailOptions` type
- **`src/shared/email/dummy.email.provider.ts`**: Development implementation that logs emails instead of sending them
- **`src/shared/email/index.ts`**: Export barrel

### 2. Queue Infrastructure
- **`src/infrastructure/queue/queue.service.ts`**:
  - Sets up BullMQ queue named "task-notifications" (from `QUEUE_NAME_NOTIFICATIONS` env var)
  - Configures Redis connection using `REDIS_URL` environment variable
  - Implements retry configuration: 3 attempts with exponential backoff (starting at 1s delay)
  - Includes proper event listeners for job lifecycle (waiting, active, completed, failed)
  - Provides methods to add notification jobs and create workers
  - Handles graceful shutdown

### 3. Notification Service
- **`src/modules/notifications/notification.service.ts`**:
  - Retrieves task and user data via repositories with tenant isolation checks
  - Sends task assignment notifications via email provider
  - Processes notification jobs in worker context (`processTaskAssignmentNotification`)
  - Includes proper error handling, logging, and tenant validation
  - Verifies task and assignee belong to same tenant before sending notification
  - Generates both text and HTML email content

### 4. Task Service Modifications
- **`src/modules/tasks/task.service.ts`**:
  - Added imports for `QueueService` and `NotificationService`
  - Updated constructor to initialize queue and notification services
  - Modified `createTask()` to publish notification job when assigneeId is set
  - Modified `updateTask()` to publish notification job when assigneeId changes from original value
  - Uses `queueService.addNotificationJob()` with payload containing:
    - `taskId`: ID of the task
    - `assigneeUserId`: ID of the assigned user
    - `taskTitle`: Title of the task (for email content)

### 5. Worker Process
- **`src/worker.ts`**:
  - Entry point for background worker process
  - Initializes queue service, notification service, and dummy email provider
  - Creates worker listening to "task-notifications" queue
  - Processes jobs by calling `notificationService.processTaskAssignmentNotification()`
  - Handles graceful shutdown on SIGINT/SIGTERM signals
  - Logs startup and shutdown events

### 6. Configuration Updates
- **`.env`**:
  - Added `REDIS_URL="redis://localhost:6379"`
  - Added `QUEUE_NAME_NOTIFICATIONS="task-notifications"`

## How It Works

1. **Task Creation/Update**: When a task is created or updated with an assignee (via TaskService), a notification job is added to the BullMQ queue
2. **Job Processing**: The worker process listens to the queue and picks up jobs
3. **Notification Delivery**: For each job, the worker:
   - Retrieves task and user data via repositories
   - Validates tenant isolation (task and assignee must belong to same tenant)
   - Generates email content with task details
   - Sends email via the email provider (dummy in development)
4. **Reliability**: Jobs are configured with:
   - 3 retry attempts
   - Exponential backoff (1s, 2s, 4s delays)
   - Failed jobs retained for inspection
   - Successful jobs removed from queue

## Verification
The implementation was verified by:
1. Starting both API server (`bun run src/server.ts`) and worker (`bun run src/worker.ts`)
2. Creating a user and tenant via registration endpoint
3. Creating a task with an assignee ID
4. Observing in worker logs:
   - Job queued and processed
   - Email content logged by dummy email provider
   - Success completion messages
5. Testing assignment changes via task updates also triggered notifications
6. Checking Redis queues directly showed proper job flow (waiting → active → completed)

## Compliance with Requirements
✅ **Goal Met**: Implemented background job processing for task assignment notifications  
✅ **Technology**: Uses BullMQ + Redis as per architecture  
✅ **Job Payload**: Contains minimal data (taskId, assigneeUserId, taskTitle)  
✅ **Worker Process**: Listens to queue, processes jobs via services with tenant checks  
✅ **Idempotency**: Safe to retry (sending same email multiple times is acceptable for V1)  
✅ **Retry Configuration**: 3 attempts with exponential backoff  
✅ **Failed Job Handling**: Failed jobs logged and retained for manual inspection  
✅ **Separation of Concerns**: Notification service handles email logic, task service focuses on task operations  
✅ **Tenant Isolation**: Verified at service layer before processing notifications  
✅ **Email Abstraction**: Allows provider swapping without changing business logic  
✅ **Environment Config**: Uses REDIS_URL and QUEUE_NAME_NOTIFICATIONS as specified  

## Files Modified/Created
- Created: `src/shared/email/email.provider.ts`
- Created: `src/shared/email/dummy.email.provider.ts`
- Created: `src/shared/email/index.ts`
- Created: `src/infrastructure/queue/queue.service.ts`
- Created: `src/infrastructure/queue/index.ts`
- Created: `src/modules/notifications/notification.service.ts`
- Created: `src/modules/notifications/index.ts`
- Created: `src/worker.ts`
- Modified: `src/modules/tasks/task.service.ts`
- Modified: `.env`

This implementation satisfies all acceptance criteria outlined in T-010.md and follows the architectural patterns established in the codebase.