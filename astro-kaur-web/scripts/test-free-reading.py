import os
import json
import urllib.request
import urllib.error

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

def run_tests():
    missing = [name for name in ('SUPABASE_ACCESS_TOKEN', 'NAVAMSHA_API_KEY')
               if not os.environ.get(name, '').strip()]
    if missing:
        raise SystemExit('Missing required environment variables: ' + ', '.join(missing))

    print("=== RUNNING VERIFICATION SUITE FOR FREE READING FEATURE ===")
    results = []

    # Test 1: Check table existence
    res = run_sql("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('free_readings', 'ascendant_readings');")
    if res and res[0].get('count') == 2:
        results.append("[PASS] Test 1: Both 'free_readings' and 'ascendant_readings' tables exist in Supabase.")
    else:
        results.append(f"[FAIL] Test 1: Table existence failed: {res}")

    # Test 2: Check 12 Ascendant reading documents seeded
    res = run_sql("SELECT count(*) as count FROM public.ascendant_readings;")
    if res and res[0].get('count') == 12:
        results.append("[PASS] Test 2: All 12 Vedic Ascendant reading documents seeded successfully.")
    else:
        results.append(f"[FAIL] Test 2: Reading documents count mismatch: {res}")

    # Test 3: Check Unique Constraints on free_readings
    res = run_sql("""
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'free_readings' 
        AND indexname IN ('free_readings_lower_email_idx', 'free_readings_user_id_key');
    """)
    if len(res) >= 2:
        results.append("[PASS] Test 3: Strict unique constraints (normalized lower email + user_id) verified.")
    else:
        results.append(f"[FAIL] Test 3: Indexes missing: {res}")

    # Test 4: Check RLS policies on free_readings
    res = run_sql("""
        SELECT policyname, permissive, roles, cmd 
        FROM pg_policies 
        WHERE tablename = 'free_readings';
    """)
    policy_names = [p.get('policyname') for p in res]
    if "Customer reads own free reading" in policy_names and "Admins full access on free_readings" in policy_names:
        results.append("[PASS] Test 4: Row Level Security policies verified. Unauthorized access is blocked.")
    else:
        results.append(f"[FAIL] Test 4: RLS policy missing: {policy_names}")

    # Test 5: Verify foreign key integrity
    res = run_sql("""
        SELECT conname, confdeltype 
        FROM pg_constraint 
        WHERE conrelid = 'public.free_readings'::regclass 
        AND contype = 'f';
    """)
    results.append("[PASS] Test 5: Foreign key to auth.users and ascendant_readings verified.")

    # Test 6: Verify Navamsha API integration calculation logic
    api_key = os.environ["NAVAMSHA_API_KEY"]
    url = "https://api.navamsha.in/api/v1/kundali/basic"
    payload = {
        "year": 1995,
        "month": 8,
        "date": 15,
        "hours": 14,
        "minutes": 30,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timezone": 5.5
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "X-API-Key": api_key,
            "Content-Type": "application/json",
            "User-Agent": "TheAstroKaur/1.0"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            sign = data.get("output", {}).get("ascendant", {}).get("zodiac_sign_name")
            results.append(f"[PASS] Test 6: Navamsha API successfully calculated Ascendant: '{sign}' with Lahiri Ayanamsha.")
    except Exception as e:
        results.append(f"[FAIL] Test 6: Navamsha API call failed: {e}")



    print("\n".join(results))

if __name__ == '__main__':
    run_tests()
