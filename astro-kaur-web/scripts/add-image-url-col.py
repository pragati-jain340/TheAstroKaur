import os
import json
import urllib.request
import urllib.error

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "qdnwmfriilknnwqrepuy")
URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

def run_sql(sql):
    req = urllib.request.Request(
        URL,
        data=json.dumps({"query": sql}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            return json.loads(data)
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode("utf-8"), "code": e.code}
    except Exception as e:
        return {"error": str(e)}

res = run_sql("ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url text;")
print("Result:", res)
cols = run_sql("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'services'
    ORDER BY ordinal_position;
""")
print("Columns:", [c["column_name"] for c in cols])
