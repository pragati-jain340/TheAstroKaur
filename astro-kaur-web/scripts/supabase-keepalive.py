"""Make one small, read-only database request, with bounded transient retries.

Uses the public services catalog and publishable key, never admin credentials.
Environment variables take precedence over local, git-ignored environment files.
Does not log keys, URLs, database rows, or upstream response bodies.
"""
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


def configuration():
    app = Path(__file__).resolve().parents[1]
    env = {}
    for path in (app.parent / '.env', app / '.env.local'):
        if path.exists():
            for line in path.read_text(encoding='utf-8-sig').splitlines():
                if line.strip() and not line.lstrip().startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env[key.strip()] = value.strip().strip('"').strip("'")
    env.update(os.environ)
    url = env.get('SUPABASE_URL') or env.get('NEXT_PUBLIC_SUPABASE_URL', '')
    key = (env.get('SUPABASE_PUBLISHABLE_KEY')
           or env.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', ''))
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != 'https' or not parsed.hostname or parsed.username
            or parsed.password or parsed.path not in ('', '/')
            or parsed.query or parsed.fragment):
        raise ValueError('Configure SUPABASE_URL with the HTTPS project origin.')
    if not key.startswith('sb_publishable_'):
        raise ValueError('Configure SUPABASE_PUBLISHABLE_KEY with a publishable key (not a secret/service-role key).')
    return url.rstrip('/'), key


def main():
    try:
        url, key = configuration()
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1

    # This goes through PostgREST to Postgres; an Auth health ping is insufficient.
    # Existing RLS policies apply. Only one catalog ID is requested; no writes.
    request = urllib.request.Request(
        f'{url}/rest/v1/services?select=id&limit=1',
        headers={'apikey': key, 'Accept': 'application/json', 'Cache-Control': 'no-cache'},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                if response.status != 200:
                    print('Supabase database check returned an unexpected status.', file=sys.stderr)
                    return 1
            print('Supabase database check succeeded (read-only).')
            return 0
        except urllib.error.HTTPError as error:
            print(f'Supabase database check failed: HTTP {error.code}.', file=sys.stderr)
            if error.code != 429 and error.code < 500:
                return 1
        except (urllib.error.URLError, TimeoutError, OSError):
            print('Supabase database check failed: connection error or timeout.', file=sys.stderr)
        if attempt < 2:
            time.sleep(2 ** (attempt + 1))

    print('Check Supabase project status; a paused project must be resumed in the dashboard.', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
