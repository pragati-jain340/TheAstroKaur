# Supabase keep-alive

Free-plan projects can be paused for low database activity over a seven-day
period. Supabase says a few database requests per day is typically enough to
avoid pausing, but gives no guarantee. Paid plans avoid inactivity pausing.
See [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Enable the schedule

1. In this repository's GitHub **Settings > Secrets and variables > Actions**,
   add two **repository secrets**:
   - `SUPABASE_URL`: the project URL already used by the website.
   - `SUPABASE_PUBLISHABLE_KEY`: the website's `sb_publishable_...` key.
     Do not use a Supabase secret key or service-role key.
2. Push `.github/workflows/supabase-keepalive.yml` and
   `astro-kaur-web/scripts/supabase-keepalive.py` to the repository's default
   branch. The workflow belongs at the repository root, outside the Next.js app.
3. In GitHub **Actions > Supabase keep-alive**, choose **Run workflow** and
   confirm the `Check Supabase database` step succeeds.

The job runs every eight hours: approximately **5:47 AM, 1:47 PM, and 9:47 PM
India time**. Each run reads at most one ID from the existing public `services`
catalog through the Supabase REST API. It respects RLS, changes no records, and
prints no row data or keys. Transient errors get up to three attempts with a
15-second timeout per request. Persistent errors fail the workflow so failures
are visible in Actions; enable GitHub Actions failure notifications if desired.

The schedule runs independently of visitors, Vercel deployments, and Supabase's
own database scheduler. No new tables, database migrations, API routes, or
Vercel cron configuration are required.

## Check locally

From the repository root, with the existing `.env` or `astro-kaur-web/.env.local`:

```powershell
python astro-kaur-web/scripts/supabase-keepalive.py
```

The script accepts `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` and their existing
`NEXT_PUBLIC_` equivalents. Process environment variables override local files.
The GitHub job gets its configuration from repository secrets, not Vercel's
environment variables; these must be configured separately.

## Limits

- An already paused project must first be resumed in the Supabase dashboard.
  A ping does not resume it. A successful ping also does not prove all Auth
  endpoints are healthy or establish the cause of an earlier website timeout.
- GitHub can delay or drop scheduled runs, and disables scheduled workflows in
  public repositories after 60 days without repository activity. Re-enable the
  workflow in Actions if this happens. See
  [GitHub scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
- This is a best-effort free-plan measure. For a production booking website
  that must remain available regardless of activity, use a Supabase paid plan.
