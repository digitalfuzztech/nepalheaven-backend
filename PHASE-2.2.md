# Nepal Heaven — Phase 2.2

## Real authentication

Phase 2.2 replaces the Phase 1 localStorage demo authentication with PostgreSQL-backed authentication using TanStack Start server functions.

### Implemented
- One `users` table with exactly two roles: `admin` and `customer`.
- Database-backed password hashing using Node.js `scrypt` (no browser-accessible password data).
- Database-backed sessions with random tokens stored as SHA-256 hashes.
- HttpOnly SameSite session cookie.
- Admin login at `/admin` -> `/admin/dashboard`.
- Customer login at `/login` -> `/account`.
- Customer registration at `/registration`.
- Server-side current-user lookup.
- Logout revokes the current session.
- Password reset tokens stored in PostgreSQL and expire after 30 minutes.
- Development reset token is surfaced by the frontend only in non-production mode until email delivery is implemented in Phase 3.

## Setup after extracting

1. Keep your existing `.env` and add:

```env
ADMIN_EMAIL=admin@nepalheaven.com
ADMIN_PASSWORD=Admin@123
```

2. Install dependencies:

```powershell
npm install
```

3. Apply the new Phase 2.2 tables/columns:

```powershell
npm run db:push
```

4. Seed the first real admin account:

```powershell
npm run db:seed
```

5. Start the app:

```powershell
npm run dev
```

## Test

### Admin
- Open `/admin`
- Sign in with the values in `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Confirm redirect to `/admin/dashboard`
- Refresh `/admin/dashboard`
- Sign out
- Confirm `/admin/dashboard` redirects back to `/admin`

### Customer
- Open `/registration`
- Create an account
- Confirm redirect to `/account`
- Refresh `/account`
- Sign out
- Sign back in through `/login`

### Password reset
- Open `/forgot-password`
- Use a registered email
- In development, use the generated reset link
- Set a new password
- Sign in with the new password

## Production note

Email delivery is intentionally not implemented yet. Phase 3 will connect password-reset email, lead email notifications, the `info@nepalheaven.com` inbox workflow, and WhatsApp.
