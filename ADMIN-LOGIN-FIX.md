# Admin login fix

The temporary Phase 1 auth flow now uses a deterministic browser-session flow.

Admin:
- `/admin` → admin login
- credentials: `admin@nepalheaven.com` / `Admin@123`
- successful login performs a clean browser navigation to `/admin/dashboard`
- `/admin/dashboard` independently restores the browser session and verifies `role === admin`
- sign out clears the session and returns to `/admin`

Customer:
- `/login` → customer login
- successful login navigates to `/account`

This is still frontend-only demo authentication. It must be replaced by real secure authentication during the backend/database phase.
