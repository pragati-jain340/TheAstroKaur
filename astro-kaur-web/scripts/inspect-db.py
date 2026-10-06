import json
import urllib.request
import urllib.error

import os

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

def main():
    report = {}

    # 1. Storage buckets
    print("Checking storage buckets...")
    report['buckets'] = run_sql("SELECT id, name, public, created_at, file_size_limit, allowed_mime_types FROM storage.buckets;")

    # 2. Storage policies
    print("Checking storage policies...")
    report['storage_policies'] = run_sql("""
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'storage';
    """)

    # 3. Public tables & row counts
    print("Checking public tables...")
    tables = run_sql("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    report['tables'] = tables

    # 4. Public RLS policies
    print("Checking public policies...")
    report['public_policies'] = run_sql("""
        SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
    """)

    # 5. Public Triggers
    print("Checking triggers...")
    report['triggers'] = run_sql("""
        SELECT trigger_name, event_manipulation, event_object_schema, event_object_table, action_statement
        FROM information_schema.triggers
        WHERE event_object_schema IN ('public', 'auth')
        ORDER BY event_object_schema, event_object_table, trigger_name;
    """)

    # 6. Customer profiles columns
    report['customer_profiles_cols'] = run_sql("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'customer_profiles'
        ORDER BY ordinal_position;
    """)

    # 7. Orders columns
    report['orders_cols'] = run_sql("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders'
        ORDER BY ordinal_position;
    """)

    # 8. Reading details columns
    report['reading_details_cols'] = run_sql("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reading_details'
        ORDER BY ordinal_position;
    """)

    with open('db_status_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    print("Done! Saved to db_status_report.json")

if __name__ == '__main__':
    main()
