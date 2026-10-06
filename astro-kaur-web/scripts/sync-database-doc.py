import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
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
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def main():
    print("Syncing live database and storage schema to DATABASE.md...")

    # 1. Public Tables
    tables_res = run_sql("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    table_names = [t['table_name'] for t in tables_res]

    # 2. Buckets
    buckets = run_sql("""
        SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
        FROM storage.buckets
        ORDER BY name;
    """)

    # 3. Storage Policies
    storage_policies = run_sql("""
        SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'storage'
        ORDER BY tablename, cmd, policyname;
    """)

    now_iso = datetime.now(timezone.utc).isoformat()

    md = []
    md.append("# TheAstroKaur — Database Schema & Live Content Reference\n")
    md.append("> **Auto-Updated Documentation**  ")
    md.append(f"> Last synced: `{now_iso}`  ")
    md.append("> To re-sync this file anytime you make database changes, run: `python scripts/sync-database-doc.py`\n")
    md.append("---\n")
    md.append("## Architecture Overview & Relationships\n")
    md.append("```")
    md.append("AUTH USER (auth.users)")
    md.append("    │")
    md.append("    ▼ (1 : 1 auto-created via trg_auto_create_customer_profile)")
    md.append("CUSTOMER PROFILE (public.customer_profiles)")
    md.append("    │   ├── auth_user_id")
    md.append("    │   ├── display_name, email, role ('customer' | 'admin'), account_status")
    md.append("    │   ├── avatar_seed, avatar_url")
    md.append("    │   ├── Personal birth details (date_of_birth, time_of_birth, place_of_birth, time_uncertain)")
    md.append("    │   └── Optional partner details (partner_name, partner_date_of_birth, partner_time_of_birth, etc.)")
    md.append("    │")
    md.append("    ▼ (1 : N)")
    md.append("ORDER (public.orders)")
    md.append("    │   ├── auth_user_id, service_title, format, price_eur, status, scheduled_at")
    md.append("    │   ├── Client snapshot at booking (client_name, client_dob, client_tob, client_pob, client_time_uncertain)")
    md.append("    │   ├── Partner snapshot if applicable (partner_name, partner_dob, partner_tob, partner_pob, etc.)")
    md.append("    │   ├── Stripe receipt & payment details (payment_status, stripe_payment_intent_id)")
    md.append("    │   └── Customer review (review_rating, review_text, review_created_at)")
    md.append("    │")
    md.append("    ▼ (1 : 1 auto-snapshotted via trg_order_reading_details_snapshot)")
    md.append("READING DETAILS (public.reading_details)")
    md.append("        ├── order_id (FK -> orders.id)")
    md.append("        ├── customer_id (FK -> customer_profiles.id)")
    md.append("        ├── service_id (FK -> services.id)")
    md.append("        ├── Snapshot client info for astrologer (client_name, client_date_of_birth, etc.)")
    md.append("        ├── Snapshot partner info for astrologer (partner_name, partner_date_of_birth, etc.)")
    md.append("        ├── Google Calendar event ID")
    md.append("        └── Reading status & admin notes")
    md.append("```\n")
    md.append("---\n")
    md.append("## Table of Contents\n")

    for i, name in enumerate(table_names, 1):
        md.append(f"{i}. [`public.{name}`](#{i}-public{name.replace('_', '')})")
    md.append(f"{len(table_names) + 1}. [Storage Buckets & Policies](#{len(table_names) + 1}-storage-buckets--policies)")
    md.append(f"{len(table_names) + 2}. [Database Functions, Triggers & Security Policies](#{len(table_names) + 2}-database-functions-triggers--security-policies)")
    md.append("\n---\n")

    # Tables
    for i, tbl in enumerate(table_names, 1):
        print(f"Processing public.{tbl}...")
        cols = run_sql(f"""
            SELECT 
                column_name, 
                data_type, 
                is_nullable, 
                column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '{tbl}'
            ORDER BY ordinal_position;
        """)

        rows = run_sql(f"SELECT * FROM public.{tbl};")
        row_count = len(rows) if isinstance(rows, list) else 0

        md.append(f"### {i}. `public.{tbl}` ({row_count} row{'s' if row_count != 1 else ''})\n")
        md.append("| Column | Data Type | Nullable | Default |")
        md.append("| :--- | :--- | :--- | :--- |")

        if isinstance(cols, list):
            for c in cols:
                star_cols = [
                    'review_rating', 'review_text', 'review_created_at', 'role',
                    'order_id', 'client_name', 'client_dob', 'partner_name',
                    'stripe_payment_intent_id', 'avatar_url', 'account_status'
                ]
                is_star = c['column_name'] in star_cols
                col_name = f"⭐ **{c['column_name']}**" if is_star else f"`{c['column_name']}`"
                d_type = f"`{c['data_type']}`"
                nullable = "Yes" if c['is_nullable'] == 'YES' else "**No**"
                dflt = f"`{c['column_default']}`" if c['column_default'] is not None else "—"
                md.append(f"| {col_name} | {d_type} | {nullable} | {dflt} |")

        md.append("\n**Current Live Data:**\n")
        if row_count > 0:
            md.append("```json")
            md.append(json.dumps(rows, indent=2))
            md.append("```\n")
        else:
            md.append("*(Table is currently empty / 0 rows)*\n")
        md.append("---\n")

    # Storage Buckets Section
    storage_idx = len(table_names) + 1
    md.append(f"### {storage_idx}. Storage Buckets & Policies\n")
    md.append("#### Storage Buckets (`storage.buckets`)\n")
    md.append("| Bucket ID | Public | Max File Size | Allowed MIME Types | Created At |")
    md.append("| :--- | :--- | :--- | :--- | :--- |")
    for b in buckets:
        size_str = f"{b['file_size_limit'] / (1024*1024):.1f} MB" if b['file_size_limit'] else "Unlimited"
        mime_str = ", ".join(b['allowed_mime_types']) if b['allowed_mime_types'] else "Any"
        pub_str = "✅ Yes" if b['public'] else "❌ No (Private)"
        md.append(f"| `{b['id']}` | {pub_str} | `{size_str}` | `{mime_str}` | `{b['created_at']}` |")

    md.append("\n#### Storage RLS Policies (`storage.objects`)\n")
    md.append("| Policy Name | Command | Target Role | Security Expression / Condition |")
    md.append("| :--- | :--- | :--- | :--- |")
    for p in storage_policies:
        expr = p['qual'] or p['with_check'] or "—"
        expr_clean = expr.replace("\n", " ").replace("  ", " ")
        md.append(f"| `{p['policyname']}` | `{p['cmd']}` | `{p['roles']}` | `{expr_clean}` |")

    md.append("\n---\n")

    # Functions, Triggers & Public Policies
    ft_idx = len(table_names) + 2
    md.append(f"## {ft_idx}. Database Functions, Triggers & Security Policies\n")
    md.append("### 1. Helper Function: `public.is_admin()`\n")
    md.append("Prevents infinite recursion in PostgreSQL RLS policies by using `SECURITY DEFINER`:\n")
    md.append("```sql")
    md.append("CREATE OR REPLACE FUNCTION public.is_admin()")
    md.append("RETURNS boolean")
    md.append("LANGUAGE sql")
    md.append("SECURITY DEFINER")
    md.append("SET search_path = public")
    md.append("STABLE")
    md.append("AS $$")
    md.append("  SELECT EXISTS (")
    md.append("    SELECT 1 FROM public.customer_profiles")
    md.append("    WHERE auth_user_id = auth.uid() AND role = 'admin'")
    md.append("  );")
    md.append("$$;")
    md.append("```\n")

    md.append("### 2. Auto-Confirm New Users (`trg_auto_confirm_new_user`)\n")
    md.append("Ensures customers are instantly activated upon signup without getting blocked by \"Email not confirmed\".\n")

    md.append("### 3. Auto-Create Customer Profile (`trg_auto_create_customer_profile`)\n")
    md.append("Creates the user's `customer_profiles` entry server-side immediately upon user registration with role `'customer'` and account status `'active'`.\n")

    md.append("### 4. Order-to-Reading Details Snapshot (`trg_order_reading_details_snapshot`)\n")
    md.append("Automatically populates `reading_details` with full client and partner snapshots whenever a booking order is created.\n")

    md.append("### 5. Row Level Security Policies on Public Tables\n")
    md.append("- **`customer_profiles`**: SELECT, INSERT, UPDATE restricted to owner (`auth.uid() = auth_user_id`) or `is_admin()`. Unrestricted admin ALL access.\n")
    md.append("- **`orders`**: SELECT, INSERT, UPDATE restricted to owner (`auth.uid() = auth_user_id`) or `is_admin()`. Anon INSERT allowed for intake.\n")
    md.append("- **`reading_details`**: SELECT restricted to order/customer owner or `is_admin()`. Admin full access.\n")
    md.append("- **`services`**: Public read for active services. Admin full access.\n")
    md.append("- **`testimonials`**: Public read for published testimonials. Authenticated insert. Admin full access.\n")
    md.append("- **`contact_messages`**: Public insert. Admin full access.\n")
    md.append("- **`free_reading_requests`**: Public insert. Admin full access.\n")

    output_path = os.path.join(os.path.dirname(__file__), '..', 'DATABASE.md')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(md))

    print(f"\nSuccessfully created and synced: {output_path}")

if __name__ == '__main__':
    main()
