# Exceptional refunds

Bookings are non-refundable by default, subject to applicable statutory rights and owner-approved exceptions. Customers use **Get help with this booking**, which opens support with the booking reference. It does not create a refund or cancel a booking.

## Administrator flow

Open a reading, expand **Exceptional payment actions**, enter an exception reason, review the remaining refundable balance, and explicitly confirm. This calls the server's authenticated admin endpoint and Stripe `POST /v1/refunds`. Cancellation is a separate action and never calls Stripe's refund API. A refund does not cancel a reading, release a reservation, or remove it from the upcoming calendar.

The current integration deliberately supports Stripe **test mode only** and refunds the remaining balance. Live keys and live webhook events remain rejected. Do not remove that guard as part of routine refund maintenance.

## Tracking and recovery

`booking_refunds` stores server-only operations and Stripe references. The database reserves an operation under an order lock; repeat submissions reuse its ID as the Stripe idempotency key. A lost provider response remains unconfirmed until reconciliation. It is never assumed to have failed. A definite rejection is recorded separately.

Stripe refund-created, refund-updated, refund-failed, and charge-refunded events trigger authoritative API retrieval. Pending, requires-action, succeeded, failed, and cancelled outcomes are tracked independently of booking status. Refresh payment status also reconciles refunds created in Stripe's dashboard. Only succeeded amounts count towards the refunded balance.

Refund status notifications use the existing booking email outbox, deduplicated by Stripe refund reference and status. Obsolete pending notifications are skipped. Existing SMTP retry and uncertain-send safeguards still apply. The booking worker also checks outstanding refunds; it never creates one during reconciliation.

## Local setup

Configure `STRIPE_SECRET_KEY` with a test key and `STRIPE_WEBHOOK_SECRET` in the ignored `.env.local`. Start the website and its Stripe listener/booking worker together:

Email delivery also requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and the intended `BOOKING_OWNER_EMAIL` in `astro-kaur-web/.env.local` (with optional `SMTP_FROM` and `BOOKING_REPLY_TO`). Next.js does not load the parent repository's `.env`. Configure these separately in Vercel for hosted deployments. Queued emails preserve their original recipients across retries; changing a recipient setting applies to newly queued messages.

```sh
npm run dev
```

This starts the Stripe CLI forwarder for payment and refund events, records its signing secret locally, and invokes the booking worker every 30 seconds. `npm run dev:web` starts only Next.js; pair that with `npm run booking:local` when starting services separately. `npm run booking:local -- --webhook-only` starts forwarding without processing queued emails or other worker jobs. The CLI API key is passed through its environment, not command-line arguments.

Apply the additive schema using `python scripts/refund-db.py --apply`. Running the same script without `--apply` validates the migration and synthetic transaction checks, then rolls back all test changes. The script requires a current Supabase personal access token. Refund controls stay unavailable if the migration has not been installed; ordinary booking reads still work.

For a hosted test environment, register `/api/stripe/webhook` as the Stripe snapshot webhook endpoint for the checkout events plus `charge.refunded`, `refund.created`, `refund.updated`, and `refund.failed`, and schedule the existing booking worker. Never use the localhost CLI signing secret for a hosted endpoint.

## Verification

`npm run test:booking` covers refund amounts, payment matching, admin-only mutations, idempotency/recovery, pending/failed results, webhook signature checks, and refund emails. The SQL checks verify independent cancellation/refunding, reservation retention, duplicate events, role restrictions and notification deduplication. Verification does not issue real refunds or send customer emails.

## Customer and administrator emails

The booking email notification migration queues separate customer and owner jobs for cancellation, admin rescheduling and refund status changes. Both jobs are committed with the event, have independent retries, and cannot disclose the owner's private links to the customer. Existing booking confirmation jobs already notify both recipients. A paid voice reading also sends a payment confirmation before its appointment is selected.

Booking/payment confirmation emails include an inline payment summary and the hosted Stripe payment receipt link. A succeeded-refund email includes its amount and Stripe refund reference plus the hosted receipt and refund-details link when supplied by Stripe. Pending and failed refund messages do not claim that a refund receipt or completed repayment exists. This uses Stripe's hosted charge receipt, rather than creating a separately billed invoice or an invented PDF.

Validate with `python scripts/refund-db.py --notifications`, then install with `python scripts/refund-db.py --notifications --apply`. These commands do not send queued emails. Keep the combined `npm run dev` process running during local testing to process the outbox. Owner emails use BOOKING_OWNER_EMAIL, then CONTACT_EMAIL, then SMTP_USER.

## Opt-in Stripe API verification

Run `node --conditions=react-server --import tsx scripts/verify-stripe-refund.ts` to exercise the actual application refund service against Stripe's test API. It creates one isolated EUR 1.00 test-card payment, refunds it, retrieves the result and verifies repeat-request idempotency. It refuses live keys. Website database operations are held in memory in this probe; use the rollback-only SQL checks above to validate the real ledger and notification transactions. The probe leaves the synthetic payment/refund visible in Stripe's test dashboard and does not refund an existing booking or send customer emails.
