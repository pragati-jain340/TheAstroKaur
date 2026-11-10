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
- `extra/` and `readings_logo/`: original artwork and asset sources.
- `generate_wheel_assets.py`: regenerates the two active wheel SVGs from `extra/extracted_wheel.png`. Install its dependencies with `python -m pip install pillow numpy scipy`, then run `python generate_wheel_assets.py`.
- `PROJECT_BRIEF.md`, the homepage specification, and `stitch_minimalist_astrology_website/`: product specifications and design references.

Python database maintenance scripts use the standard library. Review scripts and their target environment before running them; some apply database changes.
