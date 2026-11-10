"""Run only the reviewed booking migration and synthetic rollback checks.

Default: validate migration + tests in one rolled-back database transaction.
--apply: apply migration (does not enable booking or contact providers).
--test: run tests against the applied schema, always rolled back.
Never exports customer rows or environment values.
"""
import argparse
import json
import pathlib
import urllib.error
import urllib.parse
import urllib.request

app = pathlib.Path(__file__).resolve().parents[1]
env = {}
for path in [app.parent / '.env', app / '.env.local']:
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            if line.strip() and not line.lstrip().startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env[key.strip()] = value.strip().strip('"').strip("'")
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply', action='store_true')
parser.add_argument('--test', action='store_true')
args = parser.parse_args()
if args.apply and args.test:
    parser.error('Choose either --apply or --test')
initial = (app / 'migrations/20261019_booking.sql').read_text(encoding='utf-8')
hardening = (app / 'migrations/20261019_booking_payment_hardening.sql').read_text(encoding='utf-8')
google_accounts = (app / 'migrations/20261019_google_accounts.sql').read_text(encoding='utf-8')
tests = (app / 'tests/google.sql').read_text(encoding='utf-8')+'\n'+(app / 'tests/booking.sql').read_text(encoding='utf-8')
url = env.get('NEXT_PUBLIC_SUPABASE_URL', env.get('SUPABASE_URL', ''))
host = urllib.parse.urlparse(url).hostname
if not host or not host.endswith('.supabase.co'):
    raise SystemExit('Expected a configured Supabase project URL.')
token = env.get('SUPABASE_ACCESS_TOKEN')
if not token:
    raise SystemExit('SUPABASE_ACCESS_TOKEN is required locally for schema validation.')
endpoint=f'https://api.supabase.com/v1/projects/{host.split(".")[0]}/database/query'
probe=urllib.request.Request(endpoint,data=json.dumps({'query':"SELECT to_regclass('public.booking_reservations') IS NOT NULL AS installed",'read_only':True}).encode(),headers={'Authorization':f'Bearer {token}','Content-Type':'application/json'},method='POST')
with urllib.request.urlopen(probe,timeout=30) as response:
    installed=json.load(response)[0]['installed']
if args.test:
    query='BEGIN;\n'+tests+'\nROLLBACK;'
else:
    migrations=([initial] if not installed else [])+[hardening,google_accounts]
    # One transaction across all pending migration statements and optional tests.
    bodies=[sql.replace('BEGIN;','',1).rsplit('COMMIT;',1)[0] for sql in migrations]
    query='BEGIN;\n'+'\n'.join(bodies)+('\nCOMMIT;' if args.apply else '\n'+tests+'\nROLLBACK;')
request = urllib.request.Request(
    f'https://api.supabase.com/v1/projects/{host.split(".")[0]}/database/query',
    data=json.dumps({'query': query, 'read_only': False}).encode(),
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(request, timeout=90) as response:
        result = json.load(response)
    print('Booking migration applied; call booking remains disabled.' if args.apply else 'Booking schema/transaction checks passed; all test changes rolled back.')
    if not args.apply:
        print(json.dumps(result))
except urllib.error.HTTPError as error:
    print('Booking database operation failed:', error.code)
    print(error.read().decode())
    raise SystemExit(1)
