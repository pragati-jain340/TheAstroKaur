# The Astro Kaur — Website Project Brief

**Version:** 2.0
**Last updated:** 28 September 2026
**Status:** Consolidated working brief — confirmed decisions separated from pending decisions

This document is the current source of truth for the first release of TheAstroKaur. It replaces conflicting or outdated assumptions in earlier drafts. Where a decision has not been made, it is explicitly marked **Pending** rather than treated as a requirement.

---

## 1. Project overview

TheAstroKaur is a premium, modern Vedic astrology website for a single astrologer operating from Germany. The site should make Vedic astrology feel practical and empowering — a framework for self-awareness, conscious choices, and personal growth — not fear-based prediction.

The site should help visitors understand the astrologer and available readings, choose a service, complete the appropriate purchase or appointment flow, and contact the business.

The experience should feel calm, warm, thoughtful, and trustworthy, with a modern editorial aesthetic and a subtle Vedic astrology identity.

The first launch serves one astrologer, but the technical design must allow additional approved astrologer profiles in the future.

### Confirmed business settings

| Item | Decision |
|---|---|
| Business location | Germany |
| Business time zone | `Europe/Berlin` |
| Pricing currency | EUR (\u20ac) |
| Booking approach for appointment-based readings | Automatic booking |
| Reading delivery | Both written/text readings and live voice calls |
| Customer accounts | Customer accounts are part of the intended setup; exact launch scope should be kept minimal |
| AI chat | Later phase, not a launch requirement |

---

## 2. Goals and first-release scope

### First-release goals
- Present the astrologer, approach, and six confirmed services clearly.
- Let visitors discover services and take the correct action for each one.
- Use Google Calendar Appointment Schedules and Stripe for eligible voice-call appointment booking and payment, after verifying the owner's Google plan supports paid schedules.
- Provide contact information and a contact route.
- Include the Free Reading navigation entry, without inventing its functionality.
- Publish the required legal pages and make them easy to find.
- Work well on mobile, tablet, laptop, and desktop from the first implementation.
- Keep booking and payment records in their respective source systems rather than building a competing booking engine.

### Not included in the first release unless separately approved
- AI chat or AI-generated readings.
- A custom calendar/availability engine or duplicate booking database.
- A separate "Book a Reading" page.
- A Free Reading form or workflow.
- Blog/insights, WhatsApp notifications, multi-astrologer directory, or advanced analytics.
- Unconfirmed refund automation, review submission/account flows, or detailed customer birth-data intake workflows.

---

## 3. Website structure and navigation

### Public navigation
**Home | About | Services | Free Reading | Contact**

### Pages and areas

1. **Home** — hero, concise introduction, services preview or service section, approach, testimonials, FAQs, and calls to action as content is finalised.
2. **About** — the astrologer's story, background, and approach.
3. **Services** — all six service cards and their relevant actions. Services and booking discovery are combined here.
4. **Free Reading** — navigation entry/page placeholder only for now. Content and functionality are pending.
5. **Contact** — contact details and a contact form if approved for launch.
6. **Privacy Policy** — separate legal page.
7. **Terms of Service** — separate legal page.
8. **Cancellation & Refund Policy** — separate legal page.
9. **Astrology Disclaimer** — separate legal page.
10. **Admin Dashboard** — private area, only if website-managed administration is included in the launch scope.

Testimonials and FAQs should be sections on the homepage unless there is a later reason to make them separate pages. Do not create a separate booking page.

### Shared header and footer
- Use a consistent header, typography, colour system, and footer across public pages.
- The shared footer must include a **Legal** section linking to all four legal pages.
- Add contextual legal links near relevant booking/payment actions and personal-data collection forms.
- Add a short astrology disclaimer near the Services section, linking to the full Astrology Disclaimer page.

---

## 4. Confirmed service catalogue

The following six services and prices are the approved catalogue. Do not replace them with services from any older brief.

Each service card should include its title, concise description, price, delivery format/duration, and its own **Book a Reading** action. The six cards should be horizontally scrollable, with accessible controls and a responsive layout.

### 1. Future Partner Reading
- **Format:** Text-based reading
- **Price:** \u20ac20
- **Description:** Insights into the qualities of a future partner, possible places or circumstances of meeting, and marriage timelines.
- **Action:** Purchase/reading fulfilment flow — **Pending**. Do not assume this is a timed appointment.

### 2. Career & Finance Reading
- **Format:** Text-based reading
- **Price:** \u20ac20
- **Description:** Insights into suitable professions, promotion timelines, and money flow.
- **Action:** Purchase/reading fulfilment flow — **Pending**. Do not assume this is a timed appointment.

### 3. Future Partner / Relationship Karma
- **Format:** 30-minute voice call
- **Price:** \u20ac40
- **Description:** Explore relationships, lessons, marriage, attracting a partner, and possible circumstances of meeting.
- **Action:** Appointment booking.

### 4. Career & Finance Reading
- **Format:** 30-minute voice call
- **Price:** \u20ac40
- **Description:** Explore suitable professions, promotions, financial growth, and career changes.
- **Action:** Appointment booking.

### 5. Matchmaking Reading
- **Format:** 45-minute voice call
- **Price:** \u20ac60
- **Description:** Compare two birth charts, discuss compatibility strengths and weaknesses, and explore ways to strengthen the relationship.
- **Action:** Appointment booking.
- **Birth-info required:** Two complete sets of birth details (see intake form below) — one for the client and one for their partner.

### 6. Extensive Birth Chart Reading
- **Format:** 45-minute voice call
- **Price:** \u20ac60
- **Description:** Explore life path, purpose and direction, karmic lessons, and emotional patterns.
- **Action:** Appointment booking.

### Service interaction rules
- Keep the two \u20ac20 text readings distinct from appointment-based services.
- The \u20ac40 services use 30-minute appointment slots.
- The \u20ac60 services use 45-minute appointment slots.
- Each card's CTA must lead to the correct service-specific action.
- Do not display unconfirmed durations for text readings.
- Do not imply that the text-reading purchase or delivery flow is final until the owner confirms it.

### Secure birth-information intake form

After a voice-call booking is confirmed, the client receives a one-time, expiring secure intake link (sent via Resend to their booking email). The form collects the minimum birth details needed for the reading.

**Standard fields — all voice-call services (services 3–6):**

| Field | Notes |
|---|---|
| Date of birth | Day / Month / Year |
| Time of birth | As precise as known; client may note if uncertain |
| Place of birth | City and country |

**Matchmaking Reading only — collect two complete sets:**

| Set | Date of birth | Time of birth | Place of birth |
|---|---|---|---|
| Person 1 (client) | ✓ | ✓ | ✓ |
| Person 2 (partner) | ✓ | ✓ | ✓ |

**Rules:**
- Never collect birth information through Google Calendar booking fields, the Calendar event, or the confirmation email.
- Store intake responses in Supabase under strict Row Level Security; only the astrologer/admin may read them.
- The intake link must expire after use or after a set time window.
- Do not include birth details in any email body, refund record, or admin note.

---

## 5. Booking and payment architecture

### Source of truth
For voice-call services, **Google Calendar Appointment Schedules** is the planned appointment system and **Stripe** is the planned payment system. The website must not implement a second scheduling engine or maintain duplicate booking/payment records.

### Voice-call booking flow
1. Visitor selects a €40 or €60 voice-call service on the Services page.
2. The relevant Google Calendar Appointment Schedule opens or is embedded.
3. The visitor chooses an available slot.
4. Payment is collected through the connected Stripe flow in EUR.
5. The appointment is confirmed automatically after payment succeeds.
6. Google Calendar sends the confirmation email with the **Google Meet** link and configured reminders.
7. A Resend email is sent to the client with a one-time, expiring secure intake link to collect birth details (if not already on file).

### What Google Calendar manages
- Working hours, recurring availability, holidays, and scheduling window
- Busy-time conflict checking against selected Google Calendars
- Buffer time and maximum number of daily bookings
- One-time booking of each available slot
- Customer-local display time zone; the visitor can see their own time zone on the booking page
- **Google Meet** link generation — confirmed conferencing method for all voice-call readings
- Calendar invitations, booking confirmations, cancellations, and up to five reminders
- Stripe payment collection in EUR, subject to the Google account's eligible plan

The business and administrator time zone is **Europe/Berlin (Germany)**. The astrologer configures availability in this time zone. An 8:00 PM Berlin appointment might display as 11:30 PM India Standard Time to a visitor in India; it remains one exact calendar appointment.

### Important setup checks
- **Google plan:** Purchase **Google Workspace Business Standard** — this plan supports paid Appointment Schedules with Stripe. ✅ Confirmed.
- Set the conferencing method to **Google Meet** on all four voice-call Appointment Schedules. ✅ Confirmed.
- Configure availability, working hours, holidays, booking notice, buffers, and cancellation settings once the owner confirms their schedule.
- Test the booking journey, payment, confirmation, Meet link, and time-zone display before launch.
- Business time zone: `Europe/Berlin`. The booking experience must display correct local times to visitors in all time zones.

### €20 text-reading flow — confirmed

**Confirmed flow:**

```text
Visitor clicks the CTA on a €20 service card
  → Stripe payment link (one per service, configured by owner)
  → Visitor completes payment on Stripe
  → Stripe redirects back to the TheAstroKaur website (success page)
  → Website checks whether birth details are already on file for this email
  → If not: show the secure birth-information intake form (DOB, time of birth, place of birth)
  → Form submission saved to Supabase under RLS
  → Resend sends acknowledgement email to client and notification to admin
  → Astrologer delivers the reading manually
```

- Do not route these services into timed appointment slots or Google Calendar.
- The Stripe payment links are created and managed by the owner in the Stripe dashboard.
- The Stripe redirect URL (success page) is a website route that handles the post-payment intake check.

### Privacy rule for the Google booking page
Only collect the minimum booking information in Google Calendar: name, email, and any essential non-sensitive service-selection information. Do **not** place birth date, birth time, birthplace, personal questions, or relationship information in the Calendar event title, description, or normal booking email.

### No duplicate systems
- Do not build a custom booking calendar for version one.
- Do not duplicate Google Calendar appointment records in Supabase.
- Do not treat the website admin dashboard as the source of truth for payments or refunds.
- Stripe remains the source of truth for payment transactions.

---

## 6. Free Reading — Rising Sign Reading

The Free Reading offer is a **Rising Sign (Ascendant) Reading**. A **Free Reading** entry must appear in the public navigation.

### What it is
A short, personalised reading of the client's Rising Sign (Ascendant) based on their birth details. The Rising Sign shapes the outward personality, life approach, and first impressions — making it a meaningful and accessible introduction to Vedic astrology.

### Confirmed details
- **Offer:** One free Rising Sign reading per person.
- **Delivery format:** Pending confirmation (text-based or voice note — to be confirmed by the business owner).
- **Eligibility:** Open to anyone who submits the required birth details. One per person.

### Birth details required
The free reading form must collect:

| Field | Notes |
|---|---|
| Full name | For the reading personalisation |
| Email address | For delivery of the reading |
| Date of birth | Day / Month / Year |
| Time of birth | As precise as known; client may note if uncertain |
| Place of birth | City and country |

### Implementation rules
- Build a simple public request form on the Free Reading page.
- Store submissions in the `free_reading_requests` Supabase table (re-add this table to the data model).
- Send an acknowledgement email via Resend when the request is received.
- The admin reviews and delivers the reading manually through the admin dashboard.
- Clearly state the one-per-person limit on the page.
- Do not store or expose birth details in any email body or admin-visible log beyond the secure intake record.
- Delivery method and any automation should be confirmed before building the fulfilment workflow.

---

## 7. Design direction and brand

### Desired feel
- Premium, modern, warm, calm, feminine, and celestial.
- Vedic-inspired, without excessive mystical imagery or a mass-market astrology-app look.
- Editorial and minimal, with clear hierarchy and accessible interactions.
- Responsive by construction; do not defer mobile/desktop adaptation to a later retrofit.

The brand should balance two ideas:
1. Ancient Vedic wisdom.
2. A thoughtful, analytical, practical modern approach.

### Inspiration references
- https://astrotalk.com/ \u2014 service discovery and booking clarity.
- https://www.sarvam.ai/ \u2014 strong modern hero and visual hierarchy.
- https://www.poetriesclub.in/ \u2014 minimal, calm editorial aesthetic and warm Indian cultural identity.

Use these as inspiration, not as templates to copy.

### Confirmed colour palette

#### Light mode

| Token | Hex | Usage |
|---|---|---|
| Page background | `#FFFEF5` | Warm ivory — all page backgrounds |
| Card background | `#FFFFFF` | Service cards, testimonial cards, form surfaces |
| Main text | `#292832` | Headings, body text, button labels |
| Secondary text | `#625D55` | Descriptions, captions, placeholders |
| Primary button | `#F4ED9B` | Butter yellow — all primary CTAs |
| Button text | `#292832` | Text on all primary buttons |
| Accent | `#D4855A` | Terracotta — links, hover states, highlights |
| Chakra / linework | `#B87936` | Golden amber — celestial icons, logo tones, decorative lines |
| Decorative gradient | Cream `#FFFEF5` → soft lavender | Hero backgrounds, vision section |
| Borders | `#E7E1D5` | Card borders, dividers, input outlines |

#### Dark mode

| Token | Hex | Usage |
|---|---|---|
| Page background | `#171821` | Deep navy-charcoal |
| Card background | `#2B2D3D` | Cards and surfaces |
| Main text | `#F8F3E9` | Warm off-white — headings and body |
| Secondary text | `#C2C0C8` | Muted lavender-gray |
| Primary button | `#F4ED9B` | Same butter yellow — consistent across modes |
| Button text | `#292832` | Dark text on yellow button |
| Accent | `#E99A60` | Muted amber |
| Chakra / linework | `#D8B56A` | Warm gold |
| Decorative gradient | Deep plum → muted lavender | Hero and vision sections |
| Borders | `#343542` | Subtle dark borders |

**Logo note:** The existing logo's golden tones match `#B87936` naturally. No logo colour change needed for light mode. Provide a dark-mode variant with the wordmark in `#F8F3E9` and celestial elements in `#D8B56A`.

Colour palette confirmed. Logo ✅ Portrait ✅ Typography ✅

### Typography

| Element | Font | Tailwind CSS class |
| --- | --- | --- |
| Headings | Season Mix | `font-season-mix` |
| Body text | Matter | `font-matter` |

Load both font families locally or through an approved web-font provider during implementation, with suitable fallback fonts and `font-display: swap`. Apply `font-season-mix` to display headings only and use `font-matter` for paragraphs, navigation, buttons, forms, and other interface text.

### Homepage section backgrounds — confirmed

Each homepage section must have a **distinct background** to create visual breathing room and prevent sections from blending together.

| Section | Background | Notes |
|---|---|---|
| Header | `#FFFEF5` with bottom border `#E7E1D5` | Sticky, minimal |
| Hero | Cream `#FFFEF5` → soft lavender gradient (right half) | Creates depth behind portrait |
| Services | `#FFFEF5` flat ivory | Clean, neutral |
| About preview | `#FFFFFF` white | Contrast card-like feel |
| Vision | `#F0EDF8` lavender-tinted | Distinct from ivory — separates section visually |
| Testimonials | `#FFFFFF` white | Card surface |
| FAQ | `#FFFEF5` ivory | Consistent with services |
| Final CTA | `#171821` deep navy-charcoal | Strong dark contrast block |
| Footer | `#171821` | Continuous with CTA block |

### Service card interaction — confirmed
- Default: white card, `#E7E1D5` border, subtle shadow
- On hover: subtle gold left-border `#B87936` (4px), slight scale-up (1.02), smooth transition (200ms ease)
- Price: displayed in bold `#292832`
- "View Reading →" link in terracotta `#D4855A`

### Animations and effects — confirmed

| Effect | Library | Where |
|---|---|---|
| **Rotating Vedic chakra / mandala** | Lottie (`lottie-react`) — source from lottiefiles.com | Hero — behind/around the owner portrait |
| **Scroll-reveal on headings and cards** | Framer Motion `whileInView` + `initial/animate` | All section headings, service cards, about section |
| **Floating star particles** | `@tsparticles/react` | Hero background only — subtle, low density |
| **Glowing orb behind portrait** | CSS radial gradient + blur | Hero portrait area |
| **Parallax text rising from chakra** | Framer Motion `useScroll` + `useTransform` | Hero — text phrases emerge as user scrolls |
| **Service card hover glow** | CSS transition + box-shadow | Service section cards |
| **Twinkling star accents** | CSS keyframe opacity animation | Hero and Vision section |

**Lottie source:** https://lottiefiles.com — search "mandala", "yantra", "chakra", or "celestial". Download as `.json`. Use a slow rotation (40–60 second loop), at 15–25% opacity so it doesn't overpower the portrait.

**Performance rule:** All animations must respect `prefers-reduced-motion`. Wrap Framer Motion and particle effects with a check and disable or reduce them if the user has reduced motion enabled.

Only publish testimonials and claims supplied or approved by the business owner.

**Assets:** Use `logo_light_theme.png` for light mode header, `logo_dark_theme.png` for dark mode header. Use `owner_image.jpeg` as the hero and About section portrait — crop to shoulders-up for hero use. Generate WebP versions for all assets before production build.

---

## 8. About-page source material

Use this story as the foundation for the About page, preserving its meaning while editing it for polished website copy:

> Graduating from top universities in India and abroad and building a career in technology, I was trained to think analytically and rely on logic, evidence, and structured reasoning. Like many people, I believed that success and life's outcomes were entirely within my control, leaving little room for ancient wisdom such as Vedic astrology.
>
> Everything changed when I began noticing recurring patterns in my own life\u2014similar challenges, relationships, and turning points that seemed to repeat themselves. Searching for answers led me to Vedic astrology, not as a prediction tool, but as a profound framework for self-awareness and personal growth.

### Vision

> My vision is to bridge the gap between ancient Vedic wisdom and the modern world.
>
> I aspire to make Vedic astrology accessible, practical, and empowering for people across the globe\u2014not as a tool to predict or fear the future, but as a guide for self-awareness, conscious choices, and personal transformation.
>
> Through authentic Vedic knowledge, compassion, and practical guidance, I hope to help people understand their unique life path, embrace their strengths, navigate challenges with confidence, and live with greater purpose and clarity.

---

## 9. Legal, privacy, and trust

Because the business operates in Germany and processes personal/birth information, create four separate pages before launch:

1. Privacy Policy
2. Terms of Service
3. Cancellation & Refund Policy
4. Astrology Disclaimer

Requirements:
- Link all four pages from the shared footer.
- Add contextual links beside relevant booking/payment and personal-data collection points.
- Include a brief disclaimer near Services that links to the full Astrology Disclaimer page.
- Minimise personal data collection and explain its purpose.
- Use cookie consent only if non-essential cookies or analytics are used.
- Obtain permission before publishing testimonials.
- Define retention and deletion practices before collecting customer data.
- Have legal copy and Germany-specific GDPR/consumer-protection implementation reviewed by a qualified professional before launch.

**Important:** Do not treat any older draft's detailed cancellation deadlines, refund rules, or automated refund workflow as approved policy. The final cancellation and withdrawal terms need to be confirmed and reviewed, including the distinction between digital text readings and scheduled voice readings.

---

## 10. Technical architecture

The following stack is retained as the proposed implementation baseline. It can be adjusted if a confirmed business requirement or implementation constraint calls for it.

| Area | Proposed technology |
|---|---|
| Web application | Next.js App Router + TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| General interface icons | Lucide |
| Astrology symbols | `zodiacfonts` |
| Forms and validation | React Hook Form + Zod |
| Database/auth/storage | Supabase |
| Website-specific email | Resend |
| Voice appointment booking | Google Calendar Appointment Schedules |
| Payments | Stripe, subject to Google plan eligibility |
| Deployment | Vercel |
| Testing | Vitest + Playwright |
| Image handling | Next Image; Sharp for server-side image processing if uploads are implemented |

### Architecture principles
- Keep the app in one repository unless a concrete technical reason requires separation.
- Use Next.js server routes/actions for privileged website-specific operations.
- Do not recreate scheduling, calendar events, payment processing, or booking confirmations already handled by Google Calendar and Stripe.
- Use privacy-first analytics only after the privacy/cookie approach is decided.
- Any private customer data stored in Supabase must be protected with appropriate Row Level Security and server-side access controls.

### Astrology-symbol policy

`zodiacfonts@1.1.1` is installed in the project kit. It provides 55 free, commercially usable astrology symbols: zodiac signs, planets, lunar phases, celestial nodes, houses, major aspects, and retrograde.

- Load Zodiac Fonts from the locally installed npm package through its CSS import. Do not use its CDN.
- Use the self-hosted icon font for astrology symbols so each glyph inherits the surrounding CSS `currentColor` and works naturally with Tailwind styling.
- Use only the 55 included free glyphs. The package stylesheet also includes class names for paid glyphs; do not use these without the appropriate licence and font files.
- Use `zodiacfonts` for astrology-specific content: planets, signs, lunar phases, nodes, chart houses, and aspects.
- Use Lucide for general interface actions and controls, such as menu, arrows, calendar, mail, account, and check icons.
- Astrology symbols are decorative by default and must use `aria-hidden="true"`. If a symbol conveys information on its own, provide an accessible text label.

### UI component policy

Use shadcn/ui as the default component foundation for buttons, cards, forms, inputs, dialogs, sheets/drawers, tables, tabs, toasts, tooltips, accordions, date pickers, calendars, and the admin sidebar. Add components through the shadcn CLI so their source is part of this project and can be styled to match the brand.

Do not rebuild a standard component when a suitable shadcn/ui component exists. Create a custom component only when:

- The needed interaction is not available from shadcn/ui.
- The component is a distinctive branded/public-facing composition (for example, the hero, service presentation, testimonial display, or visual astrology motifs).
- The booking interface is introduced in a future version that replaces Google Calendar Appointment Schedules.

Use shadcn's Recharts-based Area Chart and related charts only in the private dashboard \u2014 for example, booking volume, revenue, confirmed sessions, and email-delivery trends. Public marketing pages do not need decorative charts.

### Email responsibilities
- Google Calendar sends its native appointment confirmations, invitations, cancellations, and configured reminders.
- Resend may be used for website-specific emails, such as contact-form acknowledgements, once those flows are approved.
- Do not assume Resend workflows for free-reading requests, secure birth-data intake, or reading delivery are in scope until those workflows are decided.
- Configure domain authentication (SPF, DKIM, and DMARC) if Resend is used with a custom domain.

---

## 11. Customer accounts and admin

Customer accounts were selected as part of the intended setup, but the exact features and whether they are required at initial launch need to be kept proportionate to the confirmed user journeys.

Do not build account-dependent features \u2014 such as review submission, profile-photo uploads, or customer dashboards \u2014 unless their purpose and launch priority are confirmed.

A private Admin Dashboard may be used for website-managed content if needed. It must not duplicate Google Calendar's booking administration or Stripe's payment/refund controls.

Do not implement the older draft's fixed username/password design, customer OTP flow, review approval system, refund queue, or detailed account/profile data model without explicit approval.

### Supabase data model (version one \u2014 subject to confirmed scope)

- `profiles` \u2014 astrologer biography, portrait, public profile status, specialties
- `customer_profiles` \u2014 authenticated customer ID, verified email, display name, avatar style/seed or private photo path
- `services` \u2014 public service content and the matching Google Appointment Schedule URL
- `testimonials` \u2014 authenticated customer ID, author display name, text, consent, approval/publish status
- `contact_messages` \u2014 enquiry and status
- `website_notifications` \u2014 Resend email type, recipient, status, retries, send time

Add `free_reading_requests` now — Rising Sign Free Reading is confirmed and the form is in scope for v1.
Do not add tables for `refund_requests` or `chat_conversations` until those workflows are confirmed and approved.

- `free_reading_requests` — name, email, DOB, time of birth, place of birth, submission status, delivery status

Do not duplicate live booking, payment, calendar-event, or Google Meet data in Supabase during version one.

Every table holding private customer information must have Supabase Row Level Security policies. Ordinary visitors must never be able to read another customer's messages, requests, or future intake data.

---

## 12. Future phases

These are ideas for later consideration, not first-release requirements.

- **AI assistant:** FAQ and navigation support only at first; clearly disclose that it is AI and do not present it as the astrologer. Uses CopilotKit + AG-UI after the booking core is stable.
- Blog or insights.
- WhatsApp notifications.
- Multi-astrologer profiles and moderated image upload.
- More advanced analytics and operational reporting.
- Custom booking calendar to replace Google Calendar Appointment Schedules.
- Secure post-booking birth-information intake form, using one-time, expiring links sent by Resend to the booking email address.

Any future AI assistant must avoid medical, legal, financial, or fear-based claims; must not expose private client data; and must direct paid-reading requests to the appropriate service flow.

---

## 13. Pending decisions checklist

### ✅ Resolved — confirmed and ready to build

- [x] **Voice-call format:** Google Meet. All four voice-call services use Google Meet.
- [x] **Google plan:** Google Workspace Business Standard (to be purchased before launch).
- [x] **Text readings (€20) flow:** Stripe payment link → redirect to website → birth-info intake form if details not on file → admin delivers reading manually.
- [x] **Free Reading:** Rising Sign (Ascendant) Reading. Public form collects name, email, DOB, time of birth, place of birth.
- [x] **Brand assets:** Logo ✅, portrait ✅, colour palette ✅, typography (Season Mix + Matter) ✅.
- [x] **Data handling:** Birth details collected via secure on-site form; stored in Supabase under RLS; never in emails or Calendar events.
- [x] **Domain/email:** `theastrokaur.com` and `hello@theastrokaur.com` — use as placeholders in code. **Dev/test email: `pragatijain841@gmail.com`** (use this in Resend and all test flows until the custom domain is live).

### ⏳ Still pending — fill in before launch, not before building

- [ ] **Availability:** Working days/hours, max sessions per day, buffer time between sessions, minimum advance notice required.
- [ ] **Contact details:** Public email, WhatsApp number (if any), social media profile links.
- [ ] **FAQ answers:** Six questions are drafted; write the actual answers.
- [ ] **Testimonials:** Collect genuine client reviews with permission to publish.
- [ ] **Legal policy:** Final cancellation, rescheduling, withdrawal, and refund terms — reviewed by a qualified professional for Germany/GDPR.
- [ ] **Customer accounts:** Which account features (if any) are needed at v1 launch.
- [ ] **Admin scope:** Which content the owner needs to manage through the private dashboard at launch.

---

## 14. Suggested implementation sequence

1. Confirm the pending decisions that affect the core service and payment journeys.
2. Finalise the brand system and responsive page layouts.
3. Build the shared header/footer and public pages.
4. Implement the six service cards and service-specific CTA destinations.
5. Configure and test Google Calendar Appointment Schedules + Stripe for the four voice-call services, after plan eligibility is confirmed.
6. Implement the agreed text-reading purchase and delivery flow.
7. Add the approved contact functionality.
8. Publish reviewed legal pages and contextual legal links.
9. Add only the approved minimum admin/customer-account functionality.
10. Test responsive behaviour, accessibility, privacy/security, payment, time zones, and the complete customer journeys before launch.

---

## 15. First-release acceptance criteria

The first release is ready when:
- Visitors can understand who TheAstroKaur is and what the six services offer.
- The six services display the correct descriptions, prices, formats, and durations.
- Each service CTA leads to the correct flow; text readings are not mistakenly treated as timed appointments.
- Voice-call services use the configured external appointment/payment flow without duplicate booking records.
- Booking and payment are tested end-to-end, including time-zone handling.
- The Free Reading entry exists without unapproved functionality.
- All four legal pages are accessible from the shared footer, with contextual links where relevant.
- The website is responsive and usable across supported screen sizes.
- No unapproved service, price, duration, workflow, refund rule, or customer-data collection is presented as final.

---

## 16. Codebase architecture and file structure standards

To keep the codebase maintainable, fast, and prevent `page.tsx` from growing into a monolithic file as more pages are added, all code follows this strict modular structure:

```
astro-kaur-web/
├── public/                                # Static web-optimized assets
│   ├── astro-emblem-light.png             # Active celestial emblem (light mode)
│   ├── astro-emblem-dark.png              # Active celestial emblem (dark mode)
│   ├── Bg_light_mode.png                  # Transparent ambient background (light)
│   ├── Bg_dark_mode.png                   # Transparent ambient background (dark)
│   ├── astrology-wheel.svg                # Centered, transparent rotating horoscope wheel
│   └── owner.jpeg                         # Founder portrait
│
├── src/
│   ├── app/                               # Next.js App Router (Routing only)
│   │   ├── layout.tsx                     # Global Root Layout (html, body, metadata, fonts)
│   │   ├── globals.css                    # Tailwind CSS + global keyframes (astroWheelSpin)
│   │   ├── page.tsx                       # Homepage route ("/") — clean composition (~20 lines)
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
│   │   └── AstrologyWheel.tsx             # Core continuous rotating Vedic chakra component
│   │
│   └── lib/                               # Utilities, Supabase client & types
│       └── supabase/
│           ├── client.ts
│           ├── server.ts
│           └── types.ts
```

### Architectural rules:
1. **Lightweight Page Files:** Every `app/**/page.tsx` must remain a lightweight page orchestrator (< 50 lines). It imports and composes section components rather than declaring inline markup.
2. **Feature-Based Components:** Sections for a specific page reside in `src/components/<feature>/` (e.g. `src/components/home/`, `src/components/about/`).
3. **Shared Components:** Reusable navigation, footers, and cards live in `src/components/layout/` and `src/components/ui/`.
4. **Root Layout Integrity:** `src/app/layout.tsx` is the single root layout for the entire app. It defines global fonts, site metadata, and HTML wrappers.

