"""Prove the actual reservation constraint rejects concurrent acquisitions.

Uses two synthetic unowned orders and dates in 2099, then deletes only those
orders in finally. Does not alter availability, real orders or service prices.
"""
import concurrent.futures
import json
import pathlib
import urllib.error
import urllib.request
import uuid

root=pathlib.Path(__file__).resolve().parents[1]
env={}
for path in [root.parent/'.env',root/'.env.local']:
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key,value=line.split('=',1);env[key.strip()]=value.strip().strip('"').strip("'")
host=env['NEXT_PUBLIC_SUPABASE_URL'].split('//')[1].split('.')[0]
def sql(query):
    req=urllib.request.Request(f'https://api.supabase.com/v1/projects/{host}/database/query',data=json.dumps({'query':query,'read_only':False}).encode(),headers={'Authorization':'Bearer '+env['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'},method='POST')
    with urllib.request.urlopen(req,timeout=35) as response:return json.load(response)
ids=[str(uuid.uuid4()),str(uuid.uuid4())]
try:
    for order_id in ids:
        sql(f"INSERT INTO public.orders(id,service_title,format,price_eur,status) VALUES('{order_id}','Synthetic concurrency check','voice_call',0,'pending_payment');")
    def acquire(order_id):
        try:
            sql(f"BEGIN; INSERT INTO public.booking_reservations(order_id,starts_at,ends_at,blocked_until,state,hold_expires_at) VALUES('{order_id}','2099-01-01T10:00Z','2099-01-01T10:30Z','2099-01-01T10:45Z','held',now()+interval '5 minutes'); SELECT pg_sleep(1); COMMIT;")
            return 'acquired'
        except urllib.error.HTTPError as error:
            body=error.read().decode()
            if '23P01' in body or 'exclusion constraint' in body:return 'collision_rejected'
            raise RuntimeError(body) from error
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        outcomes=list(executor.map(acquire,ids))
    if sorted(outcomes)!=['acquired','collision_rejected']:raise RuntimeError('Unexpected concurrency outcomes: '+repr(outcomes))
    print('Concurrent acquisition passed: exactly one hold acquired; the other rejected by PostgreSQL.')
finally:
    sql("DELETE FROM public.orders WHERE id IN ('"+"','".join(ids)+"') AND service_title='Synthetic concurrency check';")
    print('Synthetic concurrency fixtures removed.')
