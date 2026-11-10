# TheAstroKaur web application

Next.js App Router application using React, TypeScript, Tailwind CSS, Motion, and Supabase.

## Commands

Run these commands from `astro-kaur-web/`:

```powershell
npm ci
npm run dev
npm run typecheck
npm run lint
npm run build
npm start
```

The development server runs at http://localhost:3000. Configure credentials in `.env.local`; environment files must stay out of Git. `typecheck` also rejects unused local variables and parameters. Lint currently reports existing typing, React hook, and markup issues; a successful build does not imply a clean lint run.

## Structure

- `src/app/`: public pages, account and admin pages, authentication, and API routes.
- `src/components/`: shared layout, feature components, and active modals.
- `src/context/AuthContext.tsx`: authentication, profile updates, and modal state.
- `src/lib/homeContent.ts`: shared About and Vision defaults.
- `src/lib/astrology/`: default reading content and ascendant interpretations.
- `src/lib/avatar/`: avatar definitions, validation, WebP conversion, and storage helpers.
- `src/lib/supabase/`: Supabase clients, middleware, and database types.
- `public/`: active images, twelve service WebPs, zodiac SVGs, and uploaded content.
- `migrations/` and `supabase-migration.sql`: database setup and migration history.
- `scripts/`: database inspection, migration, seeding, and documentation utilities.

The homepage composes sections from `src/components/home/`. Profile editing lives on `/account`; administration lives under `/admin`. Contact and booking use global modals. `/about`, `/terms`, and `/astrology-disclaimer` preserve existing links with redirects.

Keep original artwork outside `public/` and serve optimized assets from `public/`. `next.config.ts` redirects legacy service-image names, portrait paths, and wheel aliases to their canonical assets so saved URLs remain valid. Uploaded content may be referenced by the database even when its filename does not appear in source code.

## Database documentation

For a best-effort Free-plan keep-alive, see [SUPABASE_KEEPALIVE.md](SUPABASE_KEEPALIVE.md).
The repository includes an external GitHub Actions database check every eight
hours; configure its repository secrets and push the workflow to the default
branch to activate it.

`DATABASE.md` contains a schema and content snapshot. With Python 3.12+ installed and `SUPABASE_ACCESS_TOKEN` configured, refresh it using:

```powershell
npm run db:sync
```

This runs the canonical `scripts/sync-database-doc.py` implementation. It reads `.env.local` and the repository's root `.env`. Other maintenance scripts can modify the database; inspect them before use.

## Booking implementation (19 October 2026)

See [BOOKING_SETUP.md](BOOKING_SETUP.md) for the implemented flows, applied Supabase migrations, Stripe test mode, Google OAuth, Resend, worker scheduling and remaining release configuration. Call booking is disabled until owner setup is complete. Live Stripe keys are rejected.

Run `npm run test:booking`, `npm run typecheck` and `npm run build` for code checks. `npm run db:booking:test` runs synthetic database checks in a rollback transaction. The existing repository-wide lint backlog is recorded in the booking audit.
