# TheAstroKaur — website context

## Google Calendar update - 19 October 2026

Local code now supports Google OAuth for active website users with the three configured Calendar scopes, encrypted user-bound token storage/refresh, calendar discovery, busy/event reading and disconnect/revocation. Personal controls are in Account → Profile; Calendar → Integrations lets the administrator connect the one booking organizer and select Meet-capable/conflict calendars. Customer connections cannot replace that organizer. Upcoming paid calls, holds and unfinished calendar jobs guard organizer changes/disconnection. Existing appointment event/Meet/invitation jobs and manual written-reading management are retained.

The Google account migration is applied to the existing Supabase project and local credentials are configured privately. Actual Google consent and provider outcomes require browser testing. Build, TypeScript, 22 tests, database rollback checks and nine anonymous Google API checks pass; lint backlog remains 97 errors/15 warnings. No code was deployed to Vercel by this task. Call booking remains disabled; Stripe test setup, worker scheduling and owner hours remain dependencies. See `astro-kaur-web/GOOGLE_CALENDAR_SETUP.md` for exact localhost/Vercel setup. This update supersedes older statements below that Google configuration is absent.

## Latest implementation update - 19 October 2026

The custom booking implementation is now present in local code, and its two scheduling/payment/security migrations have been applied to the existing Supabase project. This update supersedes older booking implementation descriptions below. The matching code has not been deployed to Vercel by this task.

Calls now use server-validated catalog prices/durations, time-zone-aware availability, five-minute atomic holds, Stripe test-only Checkout and verified settlement, and queued Google Calendar/Meet/invitation and email/reminder work. The existing admin calendar includes weekly windows, date blocks/extra hours, integrations, availability preview and job/request monitoring. Customer reading details include payment/Meet/fulfillment status, cancellation, one successful reschedule within the confirmed 12-hour/original-start cutoff and withdrawal/refund requests. Admin reading management preserves manual preparation/delivery, private notes and adds audited booking/refund controls.

Written readings have no slots/events/Meet/reminders or delivery estimates. Payment queues customer and owner acknowledgements; the owner personally contacts the customer and delivers the reading through Zoho Mail, then marks Delivered in admin.

Security changes include server admin guards, protected profile roles/status, server-only order writes, private note storage and backend-only booking transactions. Existing demo payment labels were not converted to verified charges. TypeScript/build pass; 12 code tests, database rollback/concurrency scenarios and 20 HTTP checks pass. Existing repository-wide lint backlog is 97 errors/15 warnings. Browser-based mobile/light/dark QA and real provider end-to-end testing remain outstanding.

Call booking is disabled; weekly hours are empty. The worker is not scheduled/configured yet. Stripe test credentials/webhook, personal Google OAuth/encryption configuration, worker deployment/secrets/schedule and owner hours remain setup dependencies. Existing Resend configuration was retained, with delivery unverified. Live keys/events are refused in code. See `astro-kaur-web/BOOKING_SETUP.md` for exact setup and release limitations.

---

Snapshot date: 18 October 2026 (Asia/Kolkata).
Basis: current local working files, including uncommitted changes. This is a code review snapshot, not confirmation of what is deployed or that external services work in production. No credentials or customer records are included.

## Purpose and brand

TheAstroKaur is a astrology website offering personal readings for self-discovery, relationships, career, and life direction. The tagline is “Written In The Stars”. Its tone should be warm, thoughtful, clear, and grounded. Avoid fear-based selling, guaranteed predictions, invented testimonials, or promises of medical, legal, or financial outcomes.

The default founder introduction describes an analytical background, education in India and Germany, and a career in IT and technology, followed by an interest in recurring life patterns and astrology. This copy can be edited through the admin area; do not invent additional qualifications or personal history.

## Source priority and freshness

- Use the owner's newest explicit decisions first.
- For implementation, use the newest relevant code and this dated snapshot.
- For visible appearance, use recent, dated screenshots; screenshots show only the captured state.
- `PROJECT_BRIEF.md` and the homepage content specification describe original intentions. They are not a reliable inventory of implemented features.
- Some public content comes from Supabase, including service information and editable About/Vision content. Local defaults do not prove the current database values.
- An uploaded file does not automatically stay synchronized with the repository, deployment, or database. Replace this snapshot after significant changes.

## Current appearance

The design is spacious, celestial, and editorial: large serif headings, simpler sans-serif body text, fine gold outlines, rounded buttons, illustrated service cards, and pale zodiac artwork in the background.

Main colors observed in active components:

| Role | Color |
| --- | --- |
| Light page background | `#FAF8F5` |
| Main dark text / dark page background | `#0F172A` |
| Gold accent and primary actions | `#E5B842` |
| Plum accent | `#6B3448` |
| Dark surface, used in forms | `#1E293B` |

The hero says “Look to the Stars. A Deeper Look at You.” Its second line is italic gold. A large astrology wheel appears beside the text on desktop and below it on phones. Primary actions include “Explore My Readings” and “Meet TheAstroKaur”.

The navbar contains the emblem, wordmark, tagline, section navigation, free-reading entry, theme control, account control, and a booking action. Mobile navigation collapses into a menu. Light/dark mode is saved in local storage and initially follows the system preference if no saved choice exists.

The original brief calls for Season Mix and Matter fonts. The implementation currently loads Geist/Geist Mono variables, sets an Arial/Helvetica body fallback, and uses `font-serif` on many headings. Do not describe the brief's font choices as already implemented.

Included screenshots are existing local QA captures from 16 October 2026, not newly captured production images:

- `screenshots/home-desktop-light.png`: desktop hero and navigation.
- `screenshots/home-mobile-dark.png`: mobile hero in dark mode.
- `screenshots/readings-desktop-light.png`: service cards. The heading is captured partway through its animation; this is not the intended final heading text.

These captures include the development indicator. They do not document every page or interaction. The service-card capture reflects database content at capture time, which may differ from static defaults.

## Pages and navigation

| Route / area | Current purpose |
| --- | --- |
| `/` | Hero, readings/services, About preview, Vision, reviews, final call to action, footer |
| `/#about`, `/#readings`, `/#vision`, `/#reviews` | Homepage sections |
| Contact | Shared contact modal; navigation opens the modal |
| `/free-reading` | Complimentary rising-sign/Ascendant flow |
| `/auth/login`, `/auth/confirm` | Login and authentication confirmation |
| `/account` | Customer profile, readings, receipts interface |
| `/account/readings/[id]` | Individual reading detail |
| `/admin` | Administration overview |
| `/admin/readings`, `/admin/readings/[id]` | Reading records and status/detail management |
| `/admin/calendar` | Internal scheduling calendar |
| `/admin/users`, `/admin/users/[id]` | Customer and account management |
| `/admin/content` | About, Vision, free-reading interpretation, and service content editing |
| `/admin/testimonials` | Testimonial management |
| `/privacy-policy`, `/terms-of-service`, `/disclaimer` | Existing policy/disclaimer pages; existence does not establish legal approval |

`/about` redirects to the homepage About section. `/terms` and `/astrology-disclaimer` preserve legacy links through redirects. Separate `/services` and `/contact` pages listed in older planning documents are not in the current route inventory.

## Services

These are the six static fallback offerings in `ServicesPreview.tsx`. Database content can override titles, prices, formats, descriptions, and images. Confirm actual values before publishing new commercial copy.

| Service | Format | Fallback price |
| --- | --- | --- |
| Matchmaking Reading | Voice call, 45 minutes | EUR 60 |
| Future Partner Reading | Written/text reading | EUR 20 |
| Career & Money Reading | Written/text reading | EUR 20 |
| Career & Money Guidance | Voice call, 30 minutes | EUR 40 |
| Relationship Karma | Voice call, 30 minutes | EUR 40 |
| Extensive Birth Chart Reading | Voice call, 45 minutes | EUR 60 |

Do not assume a written reading has an appointment duration. The existing service-card screenshot labels the career voice service “Career & Money Reading (Voice Call)”, illustrating a database/default naming difference.

## Features present in code

### Reading intake

The shared booking modal collects name, email input, birth date, birth time or an uncertain-time choice, birthplace, and optional focus questions. Saved profile details prefill the form. Matchmaking requests collect a second person's birth details. Per-reading edits are presented as separate from saved profile edits.

Submission currently inserts an `orders` record into Supabase and displays a submitted state. The code sets the order status to `confirmed`; this alone is not proof of payment or a booked external appointment. The selected service price is included in that record. The inspected submission does not perform Stripe Checkout or an external appointment booking. Do not describe this as a complete paid booking journey.

### Free rising-sign reading

The `/free-reading` page composes `RisingSignSection`. That component uses `/api/geocode` for birthplace lookup and `/api/free-reading` for eligibility and calculation. The API requires authentication, checks for an existing completed claim, calls the Navamsha Kundali Basic API for an Ascendant, and uses interpretation content. Regular users are intended to receive one complimentary reading and revisit it later; admin testing can bypass that allowance. Code presence does not prove external configuration, calculation accuracy, or concurrent-request enforcement.

### Accounts

Supabase-backed sign-up/sign-in and profile state are present. The account page includes personal and partner birth details, uncertain-time flags, avatar selection, password updates, reading history/status, and a receipts interface. A receipts tab does not establish automated invoicing or payment capture.

### Reviews

Public reviews and review submission interfaces exist. The reviews API checks reading ownership and completed status before accepting a review. Admin testimonial management exists. Do not invent review counts, testimonials, ratings, or customer identities.

### Contact

The contact modal submits to `/api/contact`. The route validates input, includes anti-spam handling, attempts to store the enquiry in `contact_messages`, and uses Resend when configured. Delivery depends on sender/domain/API setup. Do not treat an enquiry being recorded as guaranteed email delivery.

### Admin

The admin area includes reading lists/details and status updates, user management, content editing, testimonial management, and a calendar. The calendar displays scheduled and unscheduled orders and can save internal appointment times. It explicitly describes Google Calendar as disconnected. Google Calendar event fields are not evidence of a working synchronization service.

## Architecture for technical discussions

- Application: `astro-kaur-web/`.
- Declared stack: Next.js 16.3.7 App Router, React 19.2.8, TypeScript, Tailwind CSS 4, Motion 13.5, Supabase JS and SSR clients. These are package declarations, not independent production-version verification.
- Routes/API handlers: `src/app/`.
- Modular sections: `src/components/home/`; shared navigation/footer: `src/components/layout/`.
- Shared modals: auth, reading intake, and contact are mounted from `src/app/layout.tsx`.
- Authentication/profile state: `src/context/AuthContext.tsx`.
- Default About/Vision copy: `src/lib/homeContent.ts`.
- Astrology content: `src/lib/astrology/`.
- Database clients/types: `src/lib/supabase/`.
- Relevant data entities include profiles, customer_profiles, services, orders, reading_details, free_readings, ascendant_readings, testimonials, and contact_messages. Types are not a verified live schema.
- Assets: `public/` contains active optimized assets; originals are stored separately. Asset aliases/redirects exist in `next.config.ts`.
- An additional Supabase free-reading Edge Function exists; the inspected page uses the Next.js API route. Do not assume both paths are active.

Useful code references: `src/app/page.tsx`, `src/components/home/ServicesPreview.tsx`, `src/components/services/ServiceBookingModal.tsx`, `src/components/home/RisingSignSection.tsx`, `src/app/api/free-reading/route.ts`, `src/app/api/contact/route.ts`, `src/app/api/reviews/route.ts`, `src/app/account/page.tsx`, and `src/app/admin/calendar/page.tsx`.

## Planned or unverified

Original plans include Google Calendar Appointment Schedules, Stripe payments, Google Meet calls, secure intake after payment, and possible future FAQ AI support, blog content, WhatsApp notifications, and multiple astrologers. Treat these as plans unless newer evidence confirms implementation. Do not recommend them as brand-new ideas without acknowledging their existing planning status.

Production URL/state, current database content, actual payment acceptance, external calendar synchronization, email deliverability, and end-to-end privacy/access controls were not verified for this upload pack. Existing lint issues are noted in the application README; this snapshot does not certify code quality or launch readiness.

## Keeping this source useful

After a meaningful release, refresh the date, feature inventory, service values, known gaps, and screenshots. Add a short changelog stating what changed and whether it is local, staged, or deployed. Never upload `.env`, `.env.local`, API tokens, service-role keys, passwords, database exports, real birth details, private readings, or unsanitized customer/admin screenshots.
