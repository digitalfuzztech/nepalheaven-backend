# Nepal Heaven — Phase 2.1

## Database foundation

Added PostgreSQL + Drizzle ORM foundation without replacing the working Phase 1 frontend authentication or data layer yet.

### Added
- Drizzle ORM and Drizzle Kit
- postgres-js driver
- Argon2 dependency for upcoming real password hashing
- PostgreSQL schema for users, destinations, packages, itineraries, bookings, payments, leads, lead activities, media, blog/CMS data, testimonials, FAQs and site settings
- `.env.example` with `DATABASE_URL`
- `drizzle.config.ts`
- `src/db/index.ts`
- `src/db/schema/*`
- DB configuration check script

### Not changed yet
- Phase 1 localStorage authentication
- Phase 1 customer UI
- Phase 1 booking UI
- Phase 1 lead forms
- Admin CMS/CRM implementation

## Next step: Phase 2.2

1. Configure a real PostgreSQL database.
2. Run the first Drizzle migration.
3. Seed the admin account and current Nepal Heaven content.
4. Replace localStorage authentication with secure server-side sessions.
