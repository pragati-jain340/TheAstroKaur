const fs = require('fs');

async function runSql(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN || '';
  const projectRef = 'qdnwmfriilknnwqrepuy';

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { status: res.status, text };
  }
}

async function main() {
  const query = process.argv[2] || `
    SELECT 
        conname, 
        contype,
        pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class cl ON cl.oid = c.conrelid
    WHERE cl.relname = 'customer_profiles';
  `;

  const result = await runSql(query);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
