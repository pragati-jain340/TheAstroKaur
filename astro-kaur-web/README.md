# TheAstroKaur — Web Application

Premium, minimalist Vedic astrology website built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## Codebase Architecture & File Structure Standards

To ensure long-term consistency and prevent page files from becoming monolithic, all pages and components follow this modular structure:

```
astro-kaur-web/
├── public/                                # Static web-optimized assets
│   ├── astro-emblem-light.png             # Active celestial emblem (light mode)
│   ├── astro-emblem-dark.png              # Active celestial emblem (dark mode)
│   ├── Bg_light_mode.png                  # Transparent ambient background (light)
│   ├── Bg_dark_mode.png                   # Transparent ambient background (dark)
│   ├── astrology-wheel-light.svg          # 100% transparent rotating wheel (light mode: charcoal + gold)
│   ├── astrology-wheel-dark.svg           # 100% transparent rotating wheel (dark mode: antique gold)
│   ├── astrology-wheel.svg                # Fallback transparent horoscope wheel
│   └── owner.jpeg                         # Founder portrait
│
├── src/
│   ├── app/                               # Next.js App Router (Routing only)
│   │   ├── layout.tsx                     # Global Root Layout (html, body, metadata, fonts)
│   │   ├── globals.css                    # Tailwind CSS + global keyframes (astroWheelSpin)
│   │   ├── page.tsx                       # Homepage route ("/") — clean composition (<20 lines)
│   │   ├── about/page.tsx                 # About page route ("/about")
│   │   ├── services/page.tsx              # Services / Readings route ("/services")
│   │   ├── free-reading/page.tsx          # Free Rising Sign reading route ("/free-reading")
│   │   └── contact/page.tsx               # Contact page route ("/contact")
│   │
│   ├── components/                        # Modular, reusable UI components
│   │   ├── layout/                        # Shared layout wrappers
│   │   │   ├── Navbar.tsx                 # Site-wide navigation header & brand lockup
│   │   │   └── Footer.tsx                 # Site-wide footer & legal links
│   │   │
│   │   ├── home/                          # Homepage-specific modular sections
│   │   │   ├── HeroSection.tsx            # Hero (headings, CTAs, bg artwork, AstrologyWheel)
│   │   │   ├── ServicesPreview.tsx        # Highlighted reading cards
│   │   │   └── AboutPreview.tsx           # Founder intro teaser
│   │   │
│   │   ├── about/                         # About page-specific sections
│   │   ├── services/                      # Services page-specific sections & booking cards
│   │   ├── free-reading/                  # Rising sign birth-details intake form
│   │   ├── contact/                       # Contact form & enquiry handlers
│   │   ├── ui/                            # Shared primitive UI (buttons, cards, badges)
│   │   │   └── ThemeToggle.tsx            # Light/Dark mode switch with celestial icons
│   │   └── AstrologyWheel.tsx             # Core continuous rotating Vedic chakra component
│   │
│   └── lib/                               # Utilities, Supabase client & types
│       └── supabase/
│           ├── client.ts
│           ├── server.ts
│           └── types.ts
```

### Architectural Principles:
1. **Lightweight Page Files:** Every `app/**/page.tsx` must remain a lightweight page orchestrator (< 50 lines). It imports and composes section components rather than declaring inline markup.
2. **Feature-Based Components:** Sections for a specific page reside in `src/components/<feature>/` (e.g. `src/components/home/`, `src/components/about/`).
3. **Shared Components:** Reusable navigation, footers, and cards live in `src/components/layout/` and `src/components/ui/`.
4. **Root Layout Integrity:** `src/app/layout.tsx` is the single root layout for the entire app. It defines global fonts, site metadata, and HTML wrappers.
