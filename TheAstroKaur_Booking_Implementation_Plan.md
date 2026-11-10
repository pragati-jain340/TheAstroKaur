# TheAstroKaur — Booking, Payments & Email Implementation Plan

**Plan date:** 18 October 2026  
**Status:** Product architecture selected; one-time rescheduling deadline confirmed as 12 hours after payment-confirmed booking. Cancellation/refund terms remain subject to German/EU legal review; no integration deployed.  
**Reference:** `WEBSITE_CONTEXT.md` (18 Oct 2026) and database schema snapshot (18 Oct 2026 16:22 UTC). The snapshot is not a substitute for inspecting current migrations/source code before changing production.

## 1. Goal and architectural decision

Build a single-astrologer appointment and written-reading ordering system **within the existing Next.js + Supabase website**, preserving TheAstroKaur's celestial, cream/navy/gold/plum, mobile-friendly light/dark design. No Zoho Bookings subscription and no Google Workspace subscription are required for the intended v1.

| Responsibility | System | Source of truth |
|---|---|---|
| Services, prices, reading formats and customer orders | Existing Supabase tables | Supabase |
| Weekly availability, exceptions, confirmed appointments and 5-minute holds | New Supabase scheduling tables | Supabase |
| Personal conflicts | Google Calendar FreeBusy | Google Calendar for external busy time; does not override confirmed Supabase orders |
| Google Meet links + calendar invitations | Google Calendar Events API | Google event as an external representation of confirmed booking |
| Payment processing | Stripe test mode first; owner live account later | Stripe for actual payment truth, reconciled into Supabase |
| Automated customer and owner emails | Existing Resend integration | Database notification queue for whether emails were requested/sent |
| Owner's manual written readings and customer support | Zoho Mail Free, subject to account eligibility | Mailbox |

**Principle:** Google Calendar is not the booking database. Google errors must not silently delete or unconfirm an already-paid order. A customer's browser redirect is not evidence of successful payment.

## 2. Two purchase flows

### A. Voice calls — schedule, pay, meet
1. Customer chooses one of four `voice_call` services and supplies the existing birth/intake fields.
2. Website displays time slots for the selected service's duration (30 or 45 minutes from `services.duration_minutes`). All services use the same astrologer's availability.
3. Customer chooses a slot. Server revalidates duration, working hours, Google busy intervals, existing confirmed bookings and live holds.
4. Server atomically reserves the slot for **5 minutes** in Supabase; creates a pending order and Stripe test Checkout Session.
5. On verified payment success, the server marks the order paid and booking confirmed **once**, then queues the Google event and email jobs.
6. Calendar job creates a unique Google Meet link and sends a Google Calendar invitation to the customer. Resend sends a branded confirmation with date, time zone, Meet URL and account link.
7. A queued reminder (proposed: 1 hour prior) is sent automatically; cancellation and rescheduling update both systems.
8. If checkout is abandoned/expired, release the reservation and expire any still-open Stripe Checkout Session; never mark a slot confirmed just because checkout redirected.

### B. Written readings — pay, fulfill manually
1. Customer chooses one of two `text` services; collects birth details/questions with **no appointment picker**.
2. Stripe verifies payment; create/update paid order in Supabase.
3. Resend sends the order acknowledgement to the customer and notifies the owner.
4. Owner prepares the reading and manually emails it through `reading@domain` using Zoho Mail.
5. Owner marks the order *delivered* in the existing admin readings interface; store `delivered_at`. The customer sees fulfillment status in `/account`.
6. Delivery estimate must be set/approved by the owner before showing it publicly. No Google event or Meet link is created.

Existing `services` data already distinguishes these: four `voice_call` offerings (30/45 minutes) and two `text` offerings (`duration_minutes = NULL`). Pull titles/prices/durations from the database; **do not hardcode service prices**.

## 3. Owner-facing design

Extend existing `/admin/calendar`; do not create a second scheduling dashboard.

**Availability tab**
- IANA scheduling time zone: `Europe/Berlin` by default (daylight saving handled automatically).
- Weekly recurring windows, allowing multiple windows per day (e.g., Tuesday 18:00–19:30 and 20:00–21:00).
- Specific-date overrides: whole-day leave, block time, or add special hours.
- Minimum notice: **15 minutes**; maximum advance window: **3 days**; customer payment hold: **5 minutes**.
- Configurable session buffer (proposed initial **15 minutes**, explicitly an editable proposal).
- Appointment start-time granularity (proposed **15 minutes**).
- Preview upcoming availability in both owner time and selected customer time zones.

**Calendar/appointments tab**
- Read-only external busy periods and confirmed website bookings displayed together, distinctly labeled.
- Search/filter pending payments, confirmed calls, and written orders.
- Manual block-time action and cancellation/rescheduling controls.
- Integrations status: connected account/calendar, most recent sync, last failure, reconnect action.
- Never display customer birth details in Google Calendar event descriptions.

**Service admin:** Reuse existing `/admin/content` services editor. Maintain a `voice_call` / `text` classification and a non-null duration only for calls.

## 4. Customer-facing design

Keep the existing service cards and `ServiceBookingModal`; add branching after service selection:

- **Voice:** Step 1 Reading details → Step 2 Date/time (3-day range, responsive calendar, local time zone disclosure) → Step 3 Review/checkout → Step 4 Confirmation.
- **Written:** Step 1 Reading details → Step 2 Review/checkout → Step 3 Order confirmed / preparation status.
- Show the service's *actual* duration, EUR price, any clear payment terms, and selected appointment in the customer's time zone. The time zone must be visible on the summary and email.
- During checkout display a 5-minute countdown based on server `hold_expires_at`, not the client's clock alone.
- On expired hold show “This time is no longer reserved. Please choose another available slot.”
- Customer account: appointment time, paid status, Meet URL (once available), calendar invitation status and written-reading fulfillment status.
- Design: reuse existing modal, typography, spacing, gold accents and mobile light/dark components. No third-party booking widget.

## 5. Database migration plan

### Reuse, do not recreate
- `services`: `format`, `duration_minutes`, `price_cents`, `currency`, `is_active`, `requires_partner_details` already exist.
- `orders`: user ID, reading snapshots, `status`, `payment_status`, `scheduled_at`, `stripe_payment_intent_id`, `stripe_receipt_url` already exist.
- `reading_details`: reading status, customer/service/order references, existing `google_calendar_event_id` already exists; triggered snapshot creation should be preserved and tested.
- `customer_profiles`: customer auth and saved intake fields already exist.
- `website_notifications`: can be reused/extended for email job tracking.

### Add new tables (four primary tables)

**`availability_settings`** — one row per astrologer (or single global row for v1)
- `owner_auth_user_id` or singleton ID, `timezone` default `Europe/Berlin`
- `min_notice_minutes` = 15, `advance_window_days` = 3, `hold_minutes` = 5
- `buffer_minutes` configurable, `slot_step_minutes` configurable
- optional global `booking_enabled`, `updated_at`

**`availability_windows`** — repeating weekly intervals
- `id`, `owner_id`, `weekday` (0–6, document convention), `start_local TIME`, `end_local TIME`, `enabled`
- multiple rows on the same weekday supported; validate `end_local > start_local` and non-overlapping owner-entered windows

**`availability_overrides`** — exceptional local dates
- `id`, `owner_id`, `local_date`, `mode` (`blocked` or `extra_open`), optional `start_local` / `end_local`, note, `created_at`
- whole-day blocks and partial-day blocks supported; interpretation rules deterministic

**`booking_reservations`** — single transactional slot-locking table
- `id`, `order_id`, `owner_id`, `starts_at TIMESTAMPTZ`, `ends_at TIMESTAMPTZ`, `blocked_until TIMESTAMPTZ` (end + buffer)
- `state` (`held`, `confirmed`, `expired`, `cancelled`), `hold_expires_at TIMESTAMPTZ`, timestamps
- PostgreSQL exclusion constraint prevents overlapping `[starts_at, blocked_until)` intervals for a given owner **while state is `held` or `confirmed`**.
- Expired rows must first transition to `expired` transactionally before a new hold can use the time; *do not* try to build a partial index using `now()`.

Example constraint sketch (adapt exact identifiers/type/extension to verified migrations):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.booking_reservations
ADD CONSTRAINT no_active_booking_overlap
EXCLUDE USING gist (
  owner_id WITH =,
  tstzrange(starts_at, blocked_until, '[)') WITH &&
)
WHERE (state IN ('held', 'confirmed'));
```

This guarantees no *database-local* overlapping active reservations even if two people click the same slot concurrently. Google external events can still race, so query FreeBusy before committing and reconcile conflicts.

### Extend existing tables (targeted additions)

**`orders`**: add `service_id` (FK), `scheduled_end_at`, `stripe_checkout_session_id` (unique), `price_cents_snapshot`, `currency_snapshot`, `customer_email_snapshot`, `payment_verified_at` and `booking_confirmed_at` (set once when the paid booking is first confirmed). Keep `service_title` and `price_eur` for historical compatibility; snapshot authoritative server-side price at purchase. Change new order's default/status path from prematurely `confirmed` to `pending_payment` (after checking current UI and constraints). A new `paid` state must mean verified settlement, not user-set value.

**`reading_details`**: reuse `google_calendar_event_id`; add nullable `meet_url`, `calendar_sync_status`, `delivered_at`, perhaps `delivery_status`. For a written order event ID and URL remain null/empty; migrate the existing event-ID column to nullable only if its `NOT NULL` constraint blocks the intended flow.

**`website_notifications`**: add a deduplication key, scheduling timestamp, provider message ID and richer retry/status tracking, or create an equivalent private `notification_jobs` table if the existing table has incompatible semantics.

**`google_calendar_connections`** (optional fifth table, only if tokens must persist in DB): admin owner ID, organizer calendar ID, list of FreeBusy calendars, status, last successful sync and **encrypted token reference**. Secrets must never be exposed via publicly queryable rows or client responses. A server-side secret vault can replace persisted token columns.

**`stripe_webhook_events`** (recommended small helper table): Stripe event ID (unique), received/processed timestamps, outcome. Makes retries idempotent and auditable.

### Critical database-security prerequisite
The uploaded RLS snapshot currently allows authenticated users to update their own `orders`, and anonymous users to insert orders. It also uses `status = 'confirmed'` as the default even though payment may be pending. Before enabling real payments:
- Remove unrestricted client-side writes to payment/order status and Stripe identifier fields.
- Insert orders and modify payment status **server-side only**, using authenticated trusted backend calls/controlled RPCs; customers may SELECT their own orders.
- Verify all RLS and column privileges on orders, reading details, holds, settings, integrations and notifications. Guard admin endpoints with server-side admin checks.
- Audit old demo orders that may show `payment_status='paid'` without a Stripe PaymentIntent; do not reinterpret legacy fixtures as verified charges.
- Maintain transactional relationships with the existing `trg_order_reading_details_snapshot` trigger rather than duplicating or breaking it.

## 6. Slot calculation and concurrency

For the selected 30/45-minute service, construct candidate starts on configured 15-minute increments inside the owner's weekly/open override intervals, only when all constraints hold:
- candidate starts at least **15 minutes** after server current time;
- starts within **3 days** of current time, measured consistently in owner’s time zone;
- whole appointment + buffer fits inside allowed working window (unless owner explicitly permits buffer after closing);
- interval does not intersect owner blocks, Google FreeBusy ranges, a confirmed reservation or unexpired temporary hold;
- UTC `TIMESTAMPTZ` is used for storage, with IANA `Europe/Berlin` for local weekly rules and customer time-zone rendering.

**Always revalidate on the server during `POST /api/bookings/hold`**; client-rendered slot lists are advisory. Atomic DB exclusion rejects the loser when simultaneous holds collide. If Google FreeBusy cannot be checked, do not present the slot as guaranteed; choose a conservative temporary-unavailable behavior until it recovers.

### 5-minute payment timer — important Stripe detail
Stripe Checkout's `expires_at` is restricted to **30 minutes–24 hours**, so it cannot be set to 5 minutes when creating a Session. Our 5-minute rule must be enforced **by our database and a server-side expiry worker**, which calls Stripe's explicit **Expire a Checkout Session** endpoint for still-open sessions. A visible browser countdown alone is not sufficient.

The expiry worker should run approximately every minute, and checkout/payment state must be reconciled **before freeing the hold**. If the card charge has progressed before the deadline but the webhook is delayed, handle that state safely. Restrict the first version to payment methods with an immediate final status; asynchronous payment methods require a longer hold or a dedicated paid-but-unbooked refund/manual-resolution path. Do not silently release a reservation while an unexpired payable Stripe session remains usable.

Stripe webhook handlers must verify the signature; check payment/session IDs and expected amount/currency; be idempotent; use appropriate events including `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`; never fulfill from success-page query parameters alone.

## 7. Google Calendar and Meet

1. For development use an existing Google account selected by the developer, never the owner's Allianz work account. After buying the domain and configuring Zoho Mail, optionally create a free Google account using `booking@yourdomain.com` as its sign-in address; reauthorize the website and migrate the organizer calendar deliberately.
2. Create a Google Cloud project and OAuth Web application; authorize the organizer **once** using secure server-side OAuth with offline refresh access. Restrict access to the calendar(s) needed. Store refresh tokens encrypted/server-side only.
3. Owner may optionally share **free/busy-only** access from her personal calendar to the business account. Do not request or use Allianz employer calendar access.
4. The availability API queries Google Calendar `freeBusy.query` for all selected conflict calendars.
5. After Stripe payment is verified, `events.insert` creates the event in the business calendar, with `conferenceData.createRequest` for a **unique** Google Meet (`conferenceDataVersion=1`) and the customer's email as an attendee (`sendUpdates=all`). Poll/retrieve if conference generation is pending.
6. Save Google event ID and Meet URL to `reading_details`. Notify customer only once the link is ready, with retry/failure handling. Avoid placing personal birth information, relationship questions or notes in Google Calendar descriptions.
7. Rescheduling/cancellation initiated in TheAstroKaur updates/deletes the event and lets Google send updated invitation notices.
8. Changes made directly on Google Calendar are treated as conflicts or sync alerts; a deleted external event must not cancel a paid order automatically. Periodic reconciliation is enough for v1; Google push/watch can be added after launch.

**OAuth launch requirement:** Google's external OAuth app left in *Testing* can issue refresh tokens that expire after seven days. Set up the correct production/publishing mode and review applicable verification requirements; test background token refresh before launch.

## 8. Email architecture and reliability

- **`support@domain`**: inbound help/replies, Zoho Mail Free mailbox.
- **`reading@domain`**: manually send finished written readings via Zoho alias to the same inbox.
- **`booking@domain`**: Resend automated confirmations/reminders; use Zoho alias for replies.
- Verify the purchased domain and correct SPF/DKIM/DMARC. No customer email should go out from an unverified production sender.
- Google independently sends actual calendar invitations (RSVP + Meet) after the confirmed event is created.
- Queue Resend messages after payment verification: `voice_confirmed`, `text_order_received`, `owner_new_order`, `reminder`, `cancelled`, `rescheduled`.
- Idempotent queue key `(order_id, email_type, recipient)` or equivalent per-event attempt; retry temporary provider errors without duplicating messages.
- Send customer-visible dates in customer's selected IANA time zone and optionally also Europe/Berlin. Don't include detailed birth data or private questions in email bodies.

## 9. Proposed server routes and modules

These are **proposed** paths, not verified-existing files:

| Next.js path | Purpose |
|---|---|
| `src/app/api/availability/route.ts` | Compute available starts for a specific service/date |
| `src/app/api/bookings/hold/route.ts` | Validate selection and atomically acquire 5-minute hold |
| `src/app/api/checkout/route.ts` | Create Stripe test Checkout Session from server-side price |
| `src/app/api/stripe/webhook/route.ts` | Verify webhook and settle order + reservation atomically |
| `src/app/api/google/connect/route.ts` | Admin-only OAuth initiation |
| `src/app/api/google/callback/route.ts` | OAuth callback, token exchange and persistence |
| `src/app/api/admin/availability/route.ts` | Admin weekly/exception settings |
| `src/app/api/admin/bookings/[id]/route.ts` | Admin cancel, reschedule, delivered status |
| Scheduled worker/Edge Function | Reconcile expired holds, Stripe payments, Google events, email retries and reminders |

Use cohesive modules under `src/lib/booking/`, `src/lib/payments/`, `src/lib/google/` and `src/lib/email/`. Extend `src/components/services/ServiceBookingModal.tsx` and `src/app/admin/calendar/page.tsx`, not duplicate them.

## 10. Implementation phases and gates

| Phase | Deliverables | Exit test |
|---|---|---|
| **0. Audit + safety** | Inspect current code/migrations/triggers and lock down order writes; backup and stage DB migrations | Customers cannot set `paid` or `confirmed` themselves; legacy pages continue working |
| **1. Availability** | Settings/windows/overrides tables, admin UI, time-zone-correct slot API | 30/45-minute calls fit correctly, 15-min notice/3-day limit/DST tested |
| **2. Booking & test payment** | Customer picker, atomic holds, checkout test, webhook, expiry worker | Simultaneous users cannot take same slot; 5-minute timeout and late webhook tests pass |
| **3. Google calendar + Meet** | Owner OAuth, FreeBusy, events + invitations, retry sync | Existing busy time excluded; each paid voice order gets exactly one event/unique link |
| **4. Resend and written fulfillment** | Confirmation/reminder templates, notification queue, written statuses | Written orders never require time or Meet; owner can mark delivered |
| **5. Release validation** | Mobile light/dark UI, account details, accessibility, RLS, log monitoring, refund handling | Full simulated voice/text booking and failure matrix pass; production switch gated |

Initial manual testing should use **synthetic customer/birth data**, not real private readings.

## 11. Essential failure/edge-case tests

- Two customers simultaneously select the same appointment; only one hold succeeds.
- A 45-minute appointment cannot occupy a 30-minute gap.
- Customer closes checkout; 5-minute hold expires and remains unbookable until stale Stripe Checkout is expired/reconciled.
- Payment succeeds immediately but webhook is delayed; no lost paid order, no double booking.
- Stripe retries or sends duplicate/out-of-order webhooks; only one confirmation/event/email.
- Async payment method is not silently treated as final payment.
- Personal Google busy event blocks a previously displayed slot; revalidation prevents ordinary conflicts.
- Google permission revoked/outage; store confirmed order and retry; show clear admin alert.
- Event created successfully but first response lost; event ID/idempotency avoids duplicate Google Meet invitations.
- October and March Europe/Berlin DST transitions; no nonexistent local slots or doubled ambiguous slots.
- Customer changes browser time zone; booking remains at same instant.
- Cancellation/reschedule changes Supabase first and reconciles Calendar; customer is notified.
- Written order bypasses slot reservation, calendar invitation and Meet generation.
- No authenticated customer can edit arbitrary price, status, schedule, or another customer's records.

## 12. Cancellation, refunds, and one-time rescheduling (proposed; legal review required)

**Owner's requested commercial policy:** For voice appointments, customer-initiated cancellation after successful payment ordinarily does not receive a *voluntary* refund. The customer may complete **one** self-service reschedule **within 12 hours after the original payment-confirmed booking** (and before the appointment starts), provided an eligible new slot is available. Later changes require contacting `support@domain`. This does not waive mandatory consumer rights or prevent statutory refunds, chargebacks, or owner-initiated remedies.

**Confirmed timing rule (19 October 2026):** The one-time rescheduling window begins when Stripe payment is verified and the original booking becomes confirmed, **not** when a customer first selects a slot. Self-service rescheduling closes at the earlier of (a) **12 hours after confirmation** or (b) **the original appointment start time**. This is **not** a requirement to reschedule at least 12 hours before the appointment. Example: a booking confirmed Monday at 2:00 PM may be rescheduled once until Tuesday at 2:00 AM, unless the original consultation starts earlier. The replacement appointment must be a future available slot and satisfy the normal scheduling rules.

### Voice-call customer experience

- Before payment show a concise summary of the cancellation/rescheduling conditions, linked full policy, and any legally required withdrawal information/consents. Record the version/time of the disclosed policy and the customer's acknowledgment when appropriate; do not use pre-ticked consent boxes for legally required express consents.
- `/account/readings/[id]` displays **Reschedule** only while `reschedule_count = 0`, the booking is paid/confirmed, and server time is before `min(booking_confirmed_at + 12 hours, original_appointment_start)`. Customer chooses a new available date/time, receives a final confirmation dialog, and only then does the backend change the reservation. All readings share the same owner calendar and normal 3-day advance-booking window unless the owner creates an exception. Show the exact deadline in the customer’s time zone.
- Atomically acquire/recheck the new slot before releasing the old confirmed appointment; refuse concurrent collisions. On success update `orders.scheduled_at`, `scheduled_end_at`, `booking_reservations`, Google Calendar event and invitation, and queue a Resend notice. Count **one completed reschedule**, not attempts that fail to find or secure a new slot.
- **Cancel** asks for explicit confirmation and explains that a voluntary refund is generally not offered. Cancellation releases the booked time, updates the Google event/invites and sends Resend notices. Keep paid transaction records intact. Never automatically issue a Stripe refund solely because customer clicked cancel.
- If a customer has already rescheduled, is outside the allowed window or misses the call, show a **Contact support** path; the owner can choose a documented discretionary exception.
- If the owner cancels or cannot provide the booked consultation, provide a suitable alternative or required refund/remedy, without forcing the customer to accept rescheduling. Handle statutory withdrawal/refund requests separately from voluntary cancellation.

### Written readings

- No appointment/date to reschedule. Customer may contact `support@domain` about changes and legal withdrawal/refund rights. The owner emails the finished reading manually using Zoho Mail; do not automatically mark delivery on payment.
- Distinguish preparations begun, delivered/completed and cancellation/withdrawal rights. A blanket “no refund from payment” rule must not automatically be imposed on written services or digital-content arrangements.

### Database and API extensions

- Add `orders.reschedule_count` (default 0), `booking_confirmed_at` (set once after verified payment and kept unchanged through rescheduling), `cancelled_at`, `cancelled_by`, optional `cancellation_reason`; record refund decisions separately from operational cancellation (`refund_status`, Stripe refund reference, amount, reason) if these fields do not already exist. Compute the self-service deadline from `booking_confirmed_at`, not `updated_at` or the rescheduled appointment time.
- Add `booking_change_log` or similarly protected audit records (`order_id`, action, previous/new UTC slot, actor, reason, timestamp). Do not overwrite history when the user moves appointments.
- Add authenticated server endpoints for **request reschedule**, **cancel**, and **statutory withdrawal/refund request**. Confirm identity and status server-side; enforce the 12-hour-from-confirmation deadline, original appointment-start cutoff, and one-successful-change limit atomically; ensure customers cannot update counters, time ranges or payment fields directly via RLS. Persist idempotency and retry external Google/Resend sync failures.
- Show customer cancellation, rescheduling, and policy-disclosure information in the admin dashboard; enable owner to issue exceptions/refunds as appropriate, with audit trail.

### German/EU compliance checkpoint before launch

- The German BGB §§ 312g and 356 generally provide statutory withdrawal rights for eligible online service contracts, with conditional exceptions, including specific-date leisure services and fully performed services with required consumer consent/acknowledgment. Do **not** assume astrology appointments qualify as exempt; written reports may be treated differently. Have the actual offering and checkout disclosures reviewed.
- As of 19 June 2026, Germany requires a visible online withdrawal function for web-concluded consumer contracts **when statutory withdrawal rights apply** (new § 356a BGB). This is separate from a voluntary **Cancel booking** button.
- Required refunds due to consumer law, owner nonperformance or billing error must remain possible notwithstanding the no-voluntary-refund preference. A policy cannot prevent valid card disputes.

References: https://www.gesetze-im-internet.de/englisch_bgb/englisch_bgb.html ; https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm ; https://www.evz.de/themen/einkaufen-digitales/online-handel/widerrufsbutton/

## 13. Out of scope for v1 / deferred decisions

- No multi-astrologer scheduling or Google Workspace.
- No automated written-reading content generation; owner sends manually via Zoho Mail.
- No guaranteed instant availability if external calendar is unreachable.
- Optional after launch: Google push event watchers, multi-currency display, complex recurrence rules, WhatsApp notifications. (One-time customer self-service rescheduling is **in scope** for v1.)
- Owner approves explicit written-reading delivery estimates, applicable withdrawal/refund terms and buffer default before customer-facing publication. The 12-hour-from-booking interpretation is already confirmed.
- Do not enable **live Stripe** until account/business eligibility, taxes, applicable consumer terms and privacy obligations are addressed.

## 14. Immediate next tasks

1. Create a staging branch, snapshot migrations and review `ServiceBookingModal`, admin calendar, order insertion, order triggers and RLS.
2. Make an additive, reversible Supabase migration for scheduling tables and only the needed order/reading columns.
3. Remove unsafe direct writes to payment fields and replace the existing immediate `status='confirmed'` path with pending/verified transitions.
4. Build the admin availability settings and deterministic availability calculation first, **without Stripe or Google integration**.
5. Add Stripe test-mode holds and idempotent webhook settlement.
6. Connect owner-only free Google account; implement FreeBusy, Meet and invitation generation.
7. Implement Resend templates/notification retry and written-reading delivered workflow.
8. Run staging QA; replace test accounts/keys with owner-approved credentials later; launch only after eligibility and compliance checks.

## 15. Reference documentation

- Stripe Checkout Session creation (minimum configured 30-minute expiration): https://docs.stripe.com/api/checkout/sessions/create
- Stripe manual session expiration: https://docs.stripe.com/api/checkout/sessions/expire
- Stripe Checkout asynchronous webhooks: https://docs.stripe.com/payments/existing-customers
- Google Calendar FreeBusy API: https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- Google Events API and conference creation: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Google server-side OAuth and offline access: https://developers.google.com/identity/protocols/oauth2/web-server

---

**Status update for `WEBSITE_CONTEXT.md`:** 19 October 2026 — architecture approved, not implemented. Planned: custom multi-duration slots, 15-minute notice, 3-day window, 5-minute holds, Stripe test checkout, Google Calendar + Meet invitations, Resend transactional emails, Zoho Mail manual written-reading delivery. Database migration required for availability, atomic reservations, payment/session state and safe permissions. Customer confirmed one self-service reschedule within 12 hours after the original payment-confirmed booking, and before the original appointment starts; no voluntary refund for customer cancellations, subject to applicable legal rights and review. Development will initially use an existing Google account; switch to a free custom-domain Google sign-in later. Production services, actual integrations and external compliance remain unverified.
