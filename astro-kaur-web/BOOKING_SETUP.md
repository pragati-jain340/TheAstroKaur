# Booking implementation and setup

19 October 2026. The booking code is implemented locally and the two booking migrations have been applied to the existing Supabase project. The website code has **not been deployed to Vercel** by this task. Deploy the matching code before using the new database permissions: the former browser-side intake/scheduling writes are intentionally no longer permitted.

## Confirmed owner workflow

- Calls: Europe/Berlin, at least 15 minutes' notice, a rolling three-day booking horizon in owner local time, five-minute payment reservations, 15-minute buffer and 15-minute start increments. Weekly hours start empty and call booking starts disabled. The full call and buffer must fit inside an opening. Blocks override all openings. Starts in an ambiguous autumn DST hour are offered once; consultations crossing a clock change are omitted.
- Calls use Google FreeBusy for personal conflicts and Supabase for atomic holds/confirmed bookings. Provider failures retain paid records and queue retries. A browser redirect cannot confirm payment.
- Written readings: no picker, reservation, calendar event, reminder or Meet link. Stripe-verified payment queues a customer confirmation and owner notification. The owner contacts the customer personally through Zoho Mail using the eventual `reading@your-domain` address, discusses timing and emails the reading manually. No delivery estimate or delivery deadline is configured. The admin reading status can later be set to Delivered.
- Customer rescheduling: one completed change before the earlier of original appointment start or 12 hours after original payment-confirmed booking. Failed changes preserve the original slot and allowance. Owner exceptions are protected and audited.
- Cancellation does not automatically issue a refund. Withdrawal/refund requests are recorded separately. Admins can issue full **test** refunds or record that a request was reviewed; Stripe refund events reconcile partial/full amounts. Refunds do not themselves cancel an appointment, so the owner handles any service change separately.

## 1. Deploy the matching code

Deploy `astro-kaur-web/` to the existing Vercel project using the normal repository workflow. Keep existing Supabase and Resend variables. The new server clients use `SUPABASE_SECRET_KEY`; do not replace it with a public key. No deployment or environment values were published by this task.

The example variable names are in `BOOKING_ENV.example`. Add real values only to `.env.local` and Vercel's environment settings. Redeploy after changing Vercel variables. Do not paste secrets into chat or commit them.

Required new variables:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Exact canonical HTTPS Vercel/custom-domain origin, without a path. Local development can use `http://localhost:3000`. |
| `STRIPE_SECRET_KEY` | A test secret/restricted key beginning `sk_test_` or `rk_test_`. Live keys are refused in code. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this environment's snapshot webhook endpoint. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth Web application credentials from the selected Google Cloud project. |
| `GOOGLE_REDIRECT_URI` | This environment's exact registered callback: site origin plus `/api/google/callback`. |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | 32 cryptographically random bytes, base64 encoded. Retain this value across redeployments; changing it requires reconnecting Google. |
| `BOOKING_WORKER_SECRET` | A separate random secret of at least 32 characters for the worker endpoint. |

Generate each random secret locally, without reusing a Supabase or Stripe key. For example, `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"`. Save the output directly in the relevant secret settings and keep it private.

Optional email overrides:

- `BOOKING_FROM_EMAIL`: verified Resend sender; otherwise existing `RESEND_FROM_EMAIL` is used.
- `BOOKING_OWNER_EMAIL`: owner notification recipient; otherwise existing `CONTACT_EMAIL` is used.
- `BOOKING_REPLY_TO`: support/booking mailbox that can receive replies.

The Zoho reading mailbox is a manual workflow and needs no OAuth/API integration here. Use your actual purchased domain; do not configure the literal placeholder `reading@domain.com`. Existing Resend credentials were preserved; sender verification and external delivery were not tested.

## 2. Stripe test setup

1. Select a Stripe sandbox/test environment and add its test key to Vercel and local configuration.
2. Create a **snapshot** webhook destination at `https://YOUR-SITE/api/stripe/webhook` with:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`
3. Save that endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`. Local Stripe CLI forwarding has its own signing secret: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
4. Only cards are allowed by the Checkout configuration. No client-supplied price is accepted; cents/currency are snapshotted from the active catalog.
5. Use synthetic intake details and Stripe test payment data. Check the paid state in `/account/readings/[id]` and the matching Stripe test dashboard record.

The five-minute call deadline is implemented by Supabase state and explicit Stripe session expiration. Until reconciliation proves a session is expired or paid, its reservation remains blocking. Unknown payment state is never treated as permission to free a slot. Checkout creation itself is marked atomically so an untouched abandoned order can be expired without creating a Stripe session. Written orders use a normal payment-checkout lifetime and display no appointment countdown.

Settlement checks the verified card charge creation time. A charge started before the call hold deadline can be confirmed despite a delayed webhook; a payment started afterward is preserved as `payment_review` for an owner remedy rather than silently becoming an appointment.

Relevant references: [Stripe webhooks](https://docs.stripe.com/webhooks), [limited inventory and Checkout expiry](https://docs.stripe.com/payments/checkout/managing-limited-inventory), [explicit session expiration](https://docs.stripe.com/api/checkout/sessions/expire).

## 3. Google Calendar and Meet

1. Choose the personal Google account authorized for development. Do not use an employer account/calendar.
2. Enable Google Calendar API in its Google Cloud project. Create an OAuth Web application and consent configuration.
3. Register the exact redirect URI `https://YOUR-SITE/api/google/callback`. Register `http://localhost:3000/api/google/callback` separately if testing locally.
4. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` and the stable encryption key. Open `/admin/calendar`, then Integrations, then Connect Google Calendar. An active site admin must initiate and finish the organizer flow.
5. Grant exactly the configured `calendar.freebusy`, `calendar.readonly` and `calendar.events` scopes. No email/profile scope is requested. The authorized primary calendar identifies the connected account. Access and refresh tokens are encrypted with AES-256-GCM, bound to the website user and stored in a server-only table. No token is returned to the browser.
6. Select a Meet-capable calendar with owner/writer access and any additional accessible calendars that should block availability. The organizer is always included in conflict checks. Customers can separately connect their own Google account under Account → Profile; this never assigns them as the booking organizer.
7. Confirm a synthetic paid call. Verify exactly one event/invitation, its correct time and Meet URL. Test revocation/reconnection, rescheduling and cancellation. Google may generate the conference asynchronously; the queue retries.

See [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md) for exact localhost/Vercel configuration and consent, refresh, isolation and disconnect checks. Replacing an organizer/calendar or disconnecting is blocked while paid upcoming calls, pending holds or unfinished calendar synchronization jobs exist. A successful organizer/calendar replacement disables new call booking until the owner reviews availability and enables it again. Reconnecting the same Google account preserves the selection.

Use the correct OAuth publishing mode before production: external apps left in Testing may have short-lived refresh tokens. See [Google offline OAuth](https://developers.google.com/identity/protocols/oauth2/web-server) and [event/conference creation](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).

## 4. Once-per-minute worker

The protected endpoint is `POST /api/internal/booking-worker` (GET is also accepted). It requires `Authorization: Bearer BOOKING_WORKER_SECRET`.

Use Supabase Cron plus `pg_net` to call the deployed Vercel endpoint. This avoids depending on the Vercel plan's cron interval. Configure two private Supabase Vault secrets through the dashboard:

- `theastrokaur_booking_worker_url`: the complete deployed HTTPS worker URL.
- `theastrokaur_booking_worker_token`: the same value as Vercel's `BOOKING_WORKER_SECRET`.

Then run `migrations/booking_worker_cron_setup.sql` through the Supabase SQL editor. This setup file was **not** executed: it needs the deployed URL and private worker token first. Keep Vercel deployment protection compatible with this server-to-server endpoint; an authorization redirect/HTML response means the worker is not running. Do not include a protection-bypass token in a public URL.

Verify cron invocations and their HTTP outcomes in the database dashboard. The worker processes bounded batches, retains unknown payment locks, claims jobs with expiring leases and retries providers. Calendar identity and email provider idempotency protect retries after lost responses. Email payloads freeze on the first attempt. Retries stop before the provider's idempotency window can be exceeded; older ambiguous sends require owner review. Failed jobs and retry controls appear in the existing admin calendar's Operations tab.

Checkout requires a worker heartbeat from the past two minutes. A missing or stopped schedule therefore blocks new purchases instead of accepting orders whose payment timeout/emails cannot be serviced. The latest heartbeat appears in the Integrations tab.

The worker also queues hourly reconciliation for future paid calls. Externally deleted events produce an admin alert; they do not cancel the paid order. [Resend documents its idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys).

## 5. Owner setup and operating checks

1. Keep call booking disabled until Stripe test mode, Google and the worker are configured.
2. Save weekly hours and any date exceptions in `/admin/calendar`. Multiple windows per weekday are supported. Preview saved slots in owner/customer zones.
3. Enable call booking and test two sessions competing for one slot. The database exclusion constraint accepts only one overlapping active reservation.
4. Confirm that a written order sends only its acknowledgement/owner notification, retains preparation status and can be marked Delivered in `/admin/readings/[id]` after manual email delivery.
5. Review payment-review orders, requests and failed jobs. Cancelled/rescheduled reminders are skipped. Birth data and private questions are excluded from calendar descriptions and booking emails.

## Validation performed

- Production build and TypeScript validation.
- Focused ESLint checks for new modules/components/routes/tests.
- Automated scheduling/notice/buffer/override/DST/rescheduling tests and real Stripe signature/tampering/test-only checks.
- Real database tests in rollback transactions: snapshots, overlap exclusion, payment matching, duplicate/out-of-order settlement, failed reschedule rollback, cancellation, written separation, profile role protection, private-table grants and backend-only settlement access.
- A concurrent PostgreSQL test with two competing reservations: one accepted and one rejected; synthetic fixtures cleaned up.
- HTTP smoke/security checks: public pages load, old/new admin routes reject anonymous access, unsigned webhooks reject and the worker rejects missing credentials.

The existing repository had 108 lint errors and 15 warnings before this work; the complete repository's current result is recorded in the implementation audit. No usable browser surface was available in this session, so interactive mobile/light/dark QA is still required. Stripe checkout, Google authorization/Meet invitations, live Resend delivery and the scheduled deployed worker remain unverified until their configuration is completed.

## Database maintenance and release limitations

- Applied migrations: `20261019_booking.sql`, `20261019_booking_payment_hardening.sql`, then `20261019_google_accounts.sql`.
- `npm run db:booking:test` runs synthetic rollback checks against the installed schema. `npm run db:booking:concurrency` briefly creates two explicitly synthetic orders and removes them in `finally`.
- `python scripts/booking-db.py` validates pending booking/Google statements and tests in a rollback transaction. `--apply` installs the booking schema if absent and reapplies the idempotent hardening and Google statements. Run only with the intended local project configuration. Do not use old maintenance scripts to restore the former anonymous/customer order-write policies.
- Private reading notes were copied to `reading_private_notes` and cleared from customer-readable rows. Customer profile/intake edits remain available; role/status/identity changes are server controlled. Admin user deletion now refuses accounts with verified financial records; deactivate those accounts instead.
- Do not regenerate `DATABASE.md` with customer records for sharing. The booking additions are documented here without private data.
- The cancellation page records the requested commercial behavior; it is not legal sign-off. Before live launch, finalize applicable terms, consumer withdrawal disclosures/function, privacy/provider notices, business eligibility and tax handling. The in-account withdrawal request is implemented, but the public legal withdrawal process still needs review. No express waiver or early-performance consent is silently introduced.
- Live Stripe keys/events are refused by code. Enabling live payments is outside this implementation and requires a deliberate reviewed change.
