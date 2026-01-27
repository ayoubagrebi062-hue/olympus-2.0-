# Auth Flow Guide

## Purpose
Document the login/signup flow, redirect rules, and error handling so future changes are safe.

## Entry Points
- `/login` server page checks session and redirects authenticated users to `/`.
- `/signup` server page checks session and redirects authenticated users to `/`.

## Redirect Rules
- `redirect` query param is accepted only if it is a relative path.
- Invalid redirect values are ignored and default to `/`.

## Client Behavior
### Login
- Validates email + password.
- Detects offline mode before auth call.
- If session exists, redirect to `redirect` target.
- If no session, shows verify‑email message.

### Signup
- Validates name, email, password strength, confirm password, terms.
- Detects offline mode before auth call.
- If session exists, redirect to `redirect` target.
- If no session, shows verify‑email message.

## Error Handling
- Supabase error messages are normalized into user‑friendly text.
- Network errors are shown as offline guidance.

## Files
- `src/app/login/page.tsx`
- `src/app/login/LoginFormClient.tsx`
- `src/app/signup/page.tsx`
- `src/app/signup/SignupFormClient.tsx`
