# Google Calendar setup and testing

The website uses its existing Supabase login. Google authorization is a separate consent step. Adding a Google test user alone does not connect their calendar.

19 October 2026 diagnostic update: the saved organizer connection passed live OAuth refresh, calendar discovery and FreeBusy checks. Returning from consent now opens the connection tab and displays status. Real event creation/Meet/invitations still require the booking checks below. Google is connected even if no busy periods or paid appointments exist.

## Local connection

Your existing credentials were copied privately from the root `.env` into `astro-kaur-web/.env.local`. The app expects `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; root aliases `CLIENT_ID` and `CLIENT_SECRET` are not read directly by the app. Existing secret values were preserved.

Local settings:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

Keep the existing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_TOKEN_ENCRYPTION_KEY` private. The encryption key is exactly 32 random bytes encoded as Base64. It belongs to this application, not to any particular Google account.

1. Restart the development server from `astro-kaur-web` with `npm run dev`. Open `http://localhost:3000` (use port 3000, matching the callback).
2. Sign in with your existing active website administrator account.
3. Open `/admin/calendar` → Integrations → Connect Google Calendar.
4. Select your personal Google account listed under Google Auth Platform → Audience → Test users. Approve all three Calendar permissions.
5. Return to the admin calendar. Confirm the account shows Connected, choose a Meet-capable organizer calendar and conflict calendars, then save. Use “Check next three days” to verify Calendar access.

Any active website user can instead connect a personal calendar under `/account` → Profile. This shows their own accessible calendars and busy periods; it does not replace the organizer. One Google account can belong to only one active website connection. Use the same website login for your development organizer throughout testing.

## Google Cloud configuration

- Project/app: `TheAstroKaur Development`; Calendar API enabled; OAuth client type Web application.
- External audience in Testing, with the personal Google account added as a test user.
- Data Access contains exactly these requested scopes:
  - `https://www.googleapis.com/auth/calendar.freebusy`
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/calendar.events`
- Authorized redirect URIs contain both:
  - `http://localhost:3000/api/google/callback`
  - `https://theastrokaur-astro-kaur-web.vercel.app/api/google/callback`
- Authorized JavaScript origins are not required for this server authorization-code flow.

The app requests offline access and checks the granted scopes. Google can expire Calendar refresh tokens after seven days while this external app remains in Testing. The UI then asks for reconnection. [Google OAuth documentation](https://developers.google.com/identity/protocols/oauth2) and [web server/offline flow](https://developers.google.com/identity/protocols/oauth2/web-server).

## Vercel

Set these in the existing Vercel project's Production environment and redeploy:

```env
NEXT_PUBLIC_SITE_URL=https://theastrokaur-astro-kaur-web.vercel.app
GOOGLE_REDIRECT_URI=https://theastrokaur-astro-kaur-web.vercel.app/api/google/callback
```

Also add the same private `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_TOKEN_ENCRYPTION_KEY`. When localhost and Vercel use the same Supabase project, they must share the encryption key and OAuth client credentials so both can read the saved connection. Use environment-specific site/redirect URLs. Do not use a changing Vercel preview address unless its exact callback has been registered separately.

Sign in on the deployed website and repeat the consent/check steps if needed. No domain purchase or Zoho mailbox is required to connect your personal Google Calendar.

## Complete booking check

Calendar consent alone does not enable purchases. Follow [BOOKING_SETUP.md](BOOKING_SETUP.md) for Stripe **test mode**, its verified webhook, the once-per-minute worker and weekly hours. Keep calls disabled until those dependencies are ready.

1. With synthetic customer details, select a call slot and complete Stripe test payment. A redirect alone must not confirm payment.
2. After verified payment and worker processing, confirm one organizer event at the correct instant, a Google Meet URL, and the customer's invitation. Check both customer and Europe/Berlin displays, including a different customer time zone.
3. Reschedule within the existing allowance: the event should move, the Meet link should remain usable, and no second appointment should appear. Cancel another test call and check its calendar cancellation.
4. Buy a written reading: confirm customer/owner notifications and existing admin status controls. It must have no appointment, Meet link or automatic delivery deadline.

## Security and recovery checks

- Sign out: all `/api/google/*` operations require an active website login. An invalid OAuth state or a callback completed under a different website login is rejected.
- Use a second website login and a different Google account: each sees only its own connection/calendars. The booking organizer must remain unchanged.
- Decline a required Calendar permission: the callback should ask for all three permissions and avoid storing an incomplete connection.
- Revoke app access from your Google account, then refresh/check availability. The app should refresh an expired access token automatically or show Reconnect when the grant is invalid. It never returns provider tokens.
- Disconnect your test connection: Google revocation is attempted and local tokens are removed. If provider revocation cannot be confirmed, the UI tells you to remove access in Google account settings. Existing events stay in Google Calendar.
- The organizer cannot be replaced/disconnected while upcoming paid calls, pending holds or unfinished calendar jobs exist. Reconnecting the same account is allowed. Changing the organizer/calendar disables call booking for owner review.

When the owner takes over, resolve the development organizer's commitments, disconnect it, sign in as the owner's website administrator, and connect the owner's Google account. Keep the application encryption key stable; it does not need replacing for a new calendar owner.

The `20261019_google_accounts.sql` migration adds private per-user encrypted storage and an organizer binding. Browser roles cannot read token storage or execute its mutation functions. A legacy singleton connection requires consent again to establish a user binding.

Automated tests mock Google responses and run real database isolation checks in rollback transactions. Actual consent, account-specific Meet support, invitations and provider delivery require the manual checks above; automated checks cannot establish those outcomes.
