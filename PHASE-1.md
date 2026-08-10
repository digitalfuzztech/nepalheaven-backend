# Nepal Heaven — Phase 1 Customer Frontend

Implemented in this phase:

- Separate customer login at `/login`
- Separate admin login at `/admin`
- Shared authentication mechanism with two roles: `customer` and `admin`
- Admin dashboard at `/admin/dashboard`
- Customer registration at `/registration`
- Forgot/reset password frontend flow
- Customer dashboard at `/account`
- Persistent customer saved trips
- Package comparison for up to 3 trips at `/compare`
- Enhanced package search/filtering
- Customer booking flow at `/book/:slug`
- Frontend payment-method screen at `/booking/payment`
- Booking confirmation / thank-you page at `/booking/success`
- Global comparison bar
- Package cards wired to wishlist and comparison

## Phase 1 demo accounts

Admin:
- Email: `admin@nepalheaven.com`
- Password: `Admin@123`
- Login: `/admin`

Customer:
- Email: `traveller@example.com`
- Password: `Customer@123`
- Login: `/login`

Registration creates additional customer accounts locally.

## Important

This phase intentionally uses browser `localStorage` for the authentication/session, saved trips and comparison state. It is a frontend prototype only and is **not production authentication**.

Do not use the demo credentials or localStorage auth in production. Phase 2 will replace this with a real backend, PostgreSQL database, secure sessions/cookies, password hashing, email-based password recovery, and real booking/payment records.
