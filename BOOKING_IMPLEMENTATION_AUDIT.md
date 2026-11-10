# Booking implementation audit

## Google connection feedback fix - 19 October 2026

After the user reported returning from consent without seeing a connection, checked the installed organizer binding and exercised its saved credentials privately. Live Google token refresh, calendar discovery (including Meet-capable writable calendars) and FreeBusy all succeeded. No event was created and no invitation was sent. Fixed callback navigation to open the appropriate settings tab, added an always-visible organizer status in the admin availability panel, made its connection shortcut open Integrations, synchronized that status after changes and added an explicit successful empty-busy result. Account callbacks select Profile and scroll to Google settings.

At diagnosis, localhost was running, but the public Vercel Google connection endpoint returned 404; deployed behavior has not been repaired or verified. Call booking remains disabled, weekly hours empty, worker inactive and Stripe test credentials/webhook absent locally. Successful Google consent alone does not make purchases available. Meet creation/invitations remain unverified with the real provider.

## Google integration update - 19 October 2026

Extended the existing booking integration with website-user-bound Google OAuth, exactly the three configured Calendar scopes, AES-256-GCM encrypted access/refresh tokens, refresh/reconnection, private calendar discovery/events/busy APIs and confirmed disconnect/revocation. Account Profile has personal connection controls; admin Calendar → Integrations assigns the single booking organizer and selects accessible Meet/conflict calendars. Personal connections never replace the organizer. Organizer changes/disconnection protect upcoming verified calls, pending holds and unfinished calendar jobs; organizer replacement disables call booking for review.

Applied `20261019_google_accounts.sql` to the existing Supabase project after rollback validation. Local Google credentials were copied from the saved root configuration to the app's expected `.env.local` names without replacing existing values. No credentials are reproduced here. The encryption key must remain shared between localhost and Vercel when both use this database. See `astro-kaur-web/GOOGLE_CALENDAR_SETUP.md`.

Verified production build, strict TypeScript, 22 passing tests (including mocked refresh/revocation and event creation, idempotency, rescheduling and cancellation), database isolation/grant/organizer/disconnect rollback checks, nine anonymous Google API method rejections, and absence of the configured Google client secret/encryption key from 33 built client JavaScript files. Thirteen Google modules/routes/components/tests have no ESLint findings; the repository backlog remains 97 errors and 15 warnings. Existing Next.js middleware/lockfile warnings remain.

Actual Google consent, account-specific Meet support, invitations and deployed Vercel behavior remain unverified. The user must complete consent in their browser. No Vercel deployment, live payment activation or worker scheduling was performed. Written-reading management remains unchanged.

## Implementation update - 19 October 2026

The owner confirmed the existing Supabase project, Vercel hosting, scheduling defaults, Stripe test mode, configurable personal Google OAuth and manual written fulfillment with no delivery estimate. Implementation is now applied locally; both booking migrations are applied to the connected Supabase project. This supersedes the original analysis-only status below.

Implemented protected admin APIs and profile roles, private notes, server-priced pending orders, atomic reservations, availability/overrides, test-only Checkout/signature validation/reconciliation, owner OAuth/FreeBusy/Meet jobs, durable email/reminder jobs, customer cancellation/rescheduling/withdrawal requests, manual delivered status, refund reconciliation, admin availability/operations/history and setup documentation. The existing admin calendar and reading manager were extended.

Verified: final production build and TypeScript check; focused lint for new code; 12 scheduling/signature tests; real rollback database scenarios including late payments, immutable payment verification, overlap constraints, failed reschedules, written separation/manual delivery, refunds, worker claim serialization and permissions; two concurrent real reservation attempts with one rejection; 20 HTTP page/security checks. Repository-wide lint is 97 existing errors and 15 warnings, down from 108/15, with no new per-file lint count regressions.

Current connected database: Europe/Berlin, 15-minute buffer/start interval, booking disabled, zero weekly windows, no worker heartbeat and no private notes left in customer-readable rows. No Vercel deployment, live Stripe activation, actual Stripe checkout, Google authorization/invitation, Resend delivery or deployed cron test was performed. Browser QA was unavailable because no browser surface was enabled.

Next setup: deploy the matching code; configure missing test Stripe/OAuth/worker secrets; connect Google; schedule the protected worker; save weekly hours; test providers and then enable call booking. See `astro-kaur-web/BOOKING_SETUP.md` and `BOOKING_ENV.example`. Existing customer data and credentials are not included in these new documents. Historical paid/demo records were not promoted to Stripe-verified charges.

---

Date: 19 October 2026 (Asia/Calcutta).

Status: analysis complete for the booking implementation and its application dependencies. Product, environment and deployment questions have been sent to the owner. No application source or connected database has been changed during this audit. Existing uncommitted work remains in place.

## Evidence and scope

Reviewed the supplied implementation plan, project instructions, website context, application structure, booking and service components, authentication/profile context, Supabase clients and middleware, customer account/readings, admin calendar/readings/content/users, API authorization patterns, contact email integration, policy pages, migrations, database maintenance scripts and package configuration.

Inspected the connected Supabase project's schema, constraints, policies, effective column privileges, service catalog and order snapshot trigger using read-only queries. No customer records were requested by these queries. The existing `DATABASE.md` includes customer records; do not regenerate or distribute that dump as part of this work. A schema-only audit was saved locally under the ignored `.artifacts/` directory.

This is a source/schema review, not verification of the deployed website, a penetration test, payment acceptance, Google authorization or email delivery. The plan's embedded instructions and suggested paths were treated as requirements/proposals to evaluate against the actual code, not as actions to execute blindly.

## Findings that affect implementation

| Priority | Finding | Required change |
| --- | --- | --- |
| Critical | `/api/admin/users`, `/api/admin/content`, `/api/admin/upload` and `/api/admin/setup-db` use privileged credentials without authenticating and authorizing each request. The client admin layout does not protect those APIs. | Add a shared server authorization guard to every admin handler, checking the authenticated user's active admin profile before any privileged operation. Cover every HTTP method. |
| Critical | Customers have INSERT/UPDATE privileges on their own profile, including `role` and `account_status`; current ownership policies do not protect those fields. `is_admin()` trusts the profile role. | Prevent customer role/status/identity changes and privileged profile insertion in the database. Keep ordinary birth details, avatars and profile editing working. Admin role changes must use authenticated server operations. |
| Critical | Customers can insert/update orders and anonymous users can insert orders. Ownership does not restrict payment/status/price fields. | Server-created orders and controlled transitions only; customer SELECT access remains. Protect admin changes too so they cannot bypass reservation/payment consistency. |
| High | Customers can SELECT `reading_details.admin_notes` on their own reading. Omitting the field in the UI does not prevent direct API access. | Protect private notes through database column privileges or a separate private table and an explicitly limited customer read surface. Preserve admin note access through protected server routes. |
| High | `ServiceBookingModal` parses a display price, inserts an order from the browser and sets `confirmed` before payment. The live order default is also `confirmed`. | Re-fetch the service server-side by its database UUID, snapshot cents/currency/intake and create `pending_payment`. Confirm only through verified payment reconciliation. |
| High | Admin calendar writes `scheduled_at` directly and can change a pending order to confirmed. It has no reservation locking. | Replace direct scheduling writes with controlled server operations, including audit records and external synchronization jobs. |
| High | Admin reading detail writes the same status into both `reading_details` and `orders`, without checking every write result. Reading states such as `delivered` differ from the order states expected by customer pages. | Use an atomic fulfillment operation; written delivery sets reading status `delivered`, `delivered_at` and compatible order completion. Never set delivered merely because payment succeeds. |
| Medium | The service selector reduces database fields to presentation strings; matchmaking is inferred from the title. Static fallback IDs are not database UUIDs. Prices are rounded to whole euros in the service mapping. | Carry catalog ID, actual duration, currency, cents and `requires_partner_details` through selection. Resolve and validate the catalog on the server; never purchase a static fallback service or trust client prices. |
| Medium | Calendar email lookup keys profiles by profile `id` but looks up orders by `auth_user_id`. Date grouping uses the UTC date string rather than the scheduling time zone. | Correct the identity mapping and use explicit IANA zones for display and date grouping. |
| Medium | Handwritten database types differ from live nullability and do not contain the planned states/tables. | Update types from the verified schema and new migrations, then update state labels/filtering across account/admin pages. |
| Medium | Policy pages reference a Cancellation & Refund Policy with no corresponding page in the current route inventory; privacy text assumes Google Workspace. | Add the approved policy/disclosure surface and align provider wording with the actual architecture before launch. Legal approval is still an owner dependency. |

## Existing pieces to preserve

- Six active EUR services were verified: two written services with no duration, two 30-minute calls and two 45-minute calls. Prices and classification already live in `services`; no service repricing is needed.
- Matchmaking already has `requires_partner_details = true` in the catalog.
- `trg_order_reading_details_snapshot` is the actual live order trigger. Its function currently resolves the service by title and writes an empty Google event ID. Preserve one snapshot per order while changing new purchases to resolve the exact service UUID.
- `reading_details.google_calendar_event_id` is currently NOT NULL. Make it nullable for the explicit no-event written flow, and adapt the trigger accordingly.
- Existing customer profile/intake prefilling, partner intake, review interfaces, account routes, admin content editor, global modal and light/dark visual system can be extended.
- Resend contact-form delivery code already exists. It is not a durable booking notification queue and does not prove a verified production sender.
- The live schema has none of the proposed availability, reservation, webhook, connection or booking-change tables.

## Implementation approach

1. **Security foundation and compatibility:** shared server authentication/admin checks, profile privilege protection, private-note protection and controlled order writes. Prepare migrations and matching UI/API changes together so tightening permissions does not break active flows. Preserve historical records; do not label legacy `paid` values as Stripe-verified transactions.
2. **Scheduling:** singleton availability settings, multiple weekly windows, date overrides and a reservation table with a PostgreSQL overlap exclusion constraint. UTC storage; Europe/Berlin recurring rules; explicit customer time zone. Test DST, notice, duration, buffer, window bounds and concurrent acquisitions.
3. **Payments:** test-only Stripe hosted Checkout, server catalog snapshots, authenticated/idempotent hold and checkout creation, verified webhook settlement and payment reconciliation. The five-minute hold must stay locked until Stripe is safely expired or settled. Unknown provider state must not free a potentially paid slot.
4. **Google:** owner-only OAuth with state protection and encrypted server-side token storage; selected FreeBusy calendars; fail closed when busy checks fail; deterministic event identity and unique Meet creation; retry/reconciliation after settlement. No birth data or private questions in events. A Google failure never reverses a paid booking.
5. **Durable jobs:** use a protected queue for calendar work, email retries, reminder scheduling and expiry reconciliation. Claim jobs atomically with retry leases; run the chosen worker approximately once per minute. Hosting determines the deployment adapter, not the booking rules.
6. **Customer/admin workflows:** extend the existing booking modal and `/admin/calendar`; expose paid status, appointment/Meet/invitation progress and written fulfillment in accounts. Add cancellation, withdrawal/refund requests, owner remedies and one successful customer reschedule.
7. **Rescheduling:** store the original appointment start and immutable payment-confirmed timestamp. Deadline is the earlier of original start or confirmation plus 12 hours. Lock the order and reservation atomically; secure the new interval without losing the original on failure; increment only after success. Reconcile Google/email changes separately.
8. **Validation and release:** exercise database permissions/concurrency, duplicate and delayed webhooks, expiry races, provider outages, retry idempotency, DST, written flow, account ownership and mobile light/dark UI. Keep live payments disabled until the commercial/legal/provider configuration is ready.

Likely additions: `src/lib/booking/`, `src/lib/payments/`, `src/lib/google/`, `src/lib/email/`, shared server authorization, migrations and focused API routes. Existing modal, calendar, account, reading detail, content editor and admin routes need coordinated edits. No second scheduling dashboard or third-party booking widget is required.

## Plan adjustments and assumptions to resolve

- A separate private job table is preferable to making the existing public notification/history table also serve as a leased worker queue. The exact choice should preserve current contact notifications.
- Use a singleton scheduling owner for v1. Multiple admin logins must not create separate astrologer calendars or independent slot pools.
- Treat five minutes as a payment deadline with reconciliation, not an unconditional database timeout. Expiring a reservation solely because `hold_expires_at < now()` is unsafe while a payable Checkout Session still exists.
- Stripe documents a 30-minute to 24-hour Checkout expiry range. An explicit expiry worker is required for the five-minute business rule: https://docs.stripe.com/payments/checkout/managing-limited-inventory
- Google event creation needs `conferenceDataVersion=1`, conference creation data and attendee notifications. A caller-supplied stable event ID can support safe recovery after a lost response: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Do not broaden the confirmed one-time rescheduling rule into a new 12-hours-before-appointment requirement.
- Do not publish a written-reading delivery promise or new legal waiver without owner-supplied terms. These can remain unset while test implementation proceeds.
- Include a distinct statutory withdrawal/refund request path; operational cancellation does not itself issue a refund. Approved legal disclosures remain a production dependency.
- No Stripe or Google OAuth variable names were present in the inspected environment files. Existing Supabase and Resend variable names were present; values were not printed. External accounts can be configured later, but end-to-end verification requires them.

## Baseline validation

- `npm run typecheck`: passed.
- `npm run build`: passed; existing warnings about the middleware-to-proxy convention and an external lockfile were reported.
- `npm run lint -- --format json --output-file ../.artifacts/booking-baseline-eslint.json`: failed with **108 errors and 15 warnings**, before implementation. Main categories are explicit `any`, unescaped JSX text, effect state updates and hook dependencies. Changes should introduce no new lint issues; affected files should be cleaned as necessary without turning the booking task into an unrelated site-wide rewrite.
- No booking-specific automated test setup exists in the package scripts yet. Meaningful scheduling, transaction and payment failure tests must be added with implementation.

## Information requested before implementation

1. Existing Supabase versus an isolated staging project, and intended hosting/worker environment.
2. Confirmation of Europe/Berlin, proposed 15-minute buffer/start interval, one-hour reminder and weekly hours initially empty for owner setup.
3. Setup status for Stripe test mode, a personal Google organizer/OAuth app and a verified Resend sender. Secrets must be configured locally, never pasted into chat.
4. Written-reading delivery estimate, or leave it unset. Final commercial/legal disclosures are required before live launch, rather than being invented during implementation.

## Website context update

19 October 2026: reviewed the booking implementation plan against the current application and connected database schema. Confirmed six catalog services and the order snapshot trigger; identified admin API authorization, profile role protection, order-write and private-note security prerequisites. TypeScript and production build pass; baseline lint has 108 errors and 15 warnings. Booking/payment/calendar implementation and database changes have not been applied. Awaiting environment and owner scheduling/setup answers; external payment, calendar and email delivery remain unverified.
