# TheAstroKaur

Vedic astrology website built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

## Run the website

```powershell
cd astro-kaur-web
npm ci
npm run dev
```

Configure `astro-kaur-web/.env.local` with credentials for your environment. Keep environment files out of Git. See [web application documentation](astro-kaur-web/README.md) for commands and structure.

## Repository contents

- `astro-kaur-web/`: website, API routes, database migrations, and maintenance scripts.
- `supabase/`: Supabase configuration and the authenticated free-reading Edge Function.
- `astro-kaur-web/public/`: website images, optimized reading illustrations, wheel SVGs, zodiac icons, and uploaded content.
- `astro-kaur-web/PRODUCT.md` and `astro-kaur-web/DESIGN.md`: current product and design guidance.
- `astro-kaur-web/BOOKING_SETUP.md` and `astro-kaur-web/GOOGLE_CALENDAR_SETUP.md`: integration setup and operating instructions.
- `PROJECT_BRIEF.md` and `BOOKING_IMPLEMENTATION_AUDIT.md`: original business requirements and historical implementation notes; use current source and setup guides for implemented behavior.

Python database maintenance scripts use the standard library. Review scripts and their target environment before running them; some apply database changes.
