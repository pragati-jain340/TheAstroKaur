import os
import json
import urllib.request
import urllib.error

def load_env(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ.setdefault(key.strip(), val.strip())

load_env('.env.local')
load_env('../.env')

TOKEN = os.environ.get('SUPABASE_ACCESS_TOKEN', '')
PROJECT_REF = 'qdnwmfriilknnwqrepuy'
URL = f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query'

def run_sql(sql):
    req = urllib.request.Request(
        URL,
        data=json.dumps({'query': sql}).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {TOKEN}',
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            return json.loads(data)
    except urllib.error.HTTPError as e:
        return {'error': e.read().decode('utf-8'), 'code': e.code}
    except Exception as e:
        return {'error': str(e)}

if __name__ == '__main__':
    migration_path = os.environ.get('MIGRATION_FILE', 'migrations/20261015_create_free_readings.sql')
    with open(migration_path, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    print(f"Applying migration from {migration_path}...")
    res = run_sql(sql)
    print("Result:", res)
