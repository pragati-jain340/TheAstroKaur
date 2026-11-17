"""Validate the exceptional refunds migration with rollback-only fixtures; --apply installs it."""
import argparse
import json
import pathlib
import urllib.error
import urllib.parse
import urllib.request

app = pathlib.Path(__file__).resolve().parents[1]
values = {}
for path in [app.parent / '.env', app / '.env.local']:
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                if value.strip().strip('"').strip("'"):
                    values[key.strip()] = value.strip().strip('"').strip("'")
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply', action='store_true')
parser.add_argument('--notifications', action='store_true', help='Validate/install paired booking emails instead of the base refunds schema')
parser.add_argument('--admin-booking', action='store_true', help='Validate/install the admin self-booking guard')
args = parser.parse_args()
if args.notifications and args.admin_booking: parser.error('Choose one migration at a time')
host = urllib.parse.urlparse(values.get('NEXT_PUBLIC_SUPABASE_URL', values.get('SUPABASE_URL', ''))).hostname
if not host or not host.endswith('.supabase.co') or not values.get('SUPABASE_ACCESS_TOKEN'):
    raise SystemExit('A configured Supabase URL and valid SUPABASE_ACCESS_TOKEN are required.')
migration = '20261117_booking_email_notifications.sql' if args.notifications else '20261117_exceptional_refunds.sql'
checks_file = 'booking-notifications.sql' if args.notifications else 'refunds.sql'
if args.admin_booking:
    migration = '20261118_disable_admin_self_booking.sql'
    checks_file = 'admin-self-booking.sql'
sql = (app / 'migrations' / migration).read_text(encoding='utf-8').replace('BEGIN;', '', 1).rsplit('COMMIT;', 1)[0]
checks = (app / 'tests' / checks_file).read_text(encoding='utf-8')
query = 'BEGIN;\n' + sql + ('\nCOMMIT;' if args.apply else '\n' + checks + '\nROLLBACK;')
request = urllib.request.Request(f'https://api.supabase.com/v1/projects/{host.split(".")[0]}/database/query', data=json.dumps({'query': query, 'read_only': False}).encode(), headers={'Authorization': 'Bearer ' + values['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(request, timeout=60) as response:
        result = json.load(response)
    print(('Admin self-booking guard applied; free reading verification is unchanged.' if args.admin_booking else 'Booking email notification migration applied. No emails sent.' if args.notifications else 'Exceptional refund migration applied. No refunds issued or bookings cancelled.') if args.apply else 'Migration and synthetic transaction checks passed. All test changes rolled back.')
    if not args.apply:
        print(json.dumps(result))
except urllib.error.HTTPError as error:
    print('Refund database operation failed:', error.code)
    print(error.read().decode())
    raise SystemExit(1)
