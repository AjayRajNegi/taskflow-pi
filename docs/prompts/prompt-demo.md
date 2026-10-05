Implement email/password authentication with the following requirements:

## Functional
- Registration with email verification
- Login with email/password
- Password reset via email token
- Session management using httpOnly cookies with refresh tokens

## Security
- Passwords hashed with Argon2id (memory: 64MB, iterations: 3, parallelism: 4)
- Rate limiting: 5 attempts per 15 minutes per IP
- CSRF protection on all state-changing endpoints
- Session expiry: 24 hours absolute, 30 minutes idle

## Acceptance Criteria
- [ ] User can register with valid email and strong password
- [ ] Registration fails for weak passwords with specific error messages
- [ ] Email verification link expires after 24 hours
- [ ] Login rate-limited after 5 failed attempts
- [ ] Password reset token single-use, 1-hour expiry
- [ ] All auth endpoints return consistent error format

## Non-Goals
- Social login (OAuth/OIDC) — deferred to Phase 2
- MFA — deferred to Phase 2
- Admin user management UI — separate feature