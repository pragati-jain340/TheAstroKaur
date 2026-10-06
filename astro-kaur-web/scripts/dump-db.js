const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = 'qdnwmfriilknnwqrepuy';

async function runSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  return await res.json();
}

async function main() {
  const tables = [
    'orders',
    'customer_profiles',
    'testimonials',
    'services',
    'contact_messages',
    'free_reading_requests',
    'reading_details',
    'profiles',
    'website_notifications'
  ];

  const report = {};

  for (const tbl of tables) {
    const cols = await runSql(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = '${tbl}'
      ORDER BY ordinal_position;
    `);

    const rows = await runSql(`SELECT * FROM public.${tbl};`);

    report[tbl] = {
      columns: cols,
      rowCount: Array.isArray(rows) ? rows.length : 0,
      rows: rows
    };
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);
