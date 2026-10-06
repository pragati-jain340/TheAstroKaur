const fs = require('fs');
const path = require('path');

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
  console.log('Fetching live database schema and contents from Supabase...');

  // 1. Get all public tables
  const tablesResult = await runSql(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const tableNames = tablesResult.map(t => t.table_name);

  // 2. Build Markdown content
  let md = `# TheAstroKaur — Database Schema & Live Content Reference\n\n`;
  md += `> **Auto-Updated Documentation**  \n`;
  md += `> Last synced: \`${new Date().toISOString()}\`  \n`;
  md += `> To re-sync this file anytime you make database changes, run: \`npm run db:sync\`\n\n`;
  md += `---\n\n`;

  md += `## Architecture Overview & Relationships\n\n`;
  md += `\`\`\`\n`;
  md += `AUTH USER (auth.users)\n`;
  md += `    │\n`;
  md += `    ▼ (1 : 1 auto-created via trg_auto_create_customer_profile)\n`;
  md += `CUSTOMER PROFILE (public.customer_profiles)\n`;
  md += `    │   ├── auth_user_id\n`;
  md += `    │   ├── display_name, email, role ('customer' | 'admin')\n`;
  md += `    │   ├── Personal birth details (date_of_birth, time_of_birth, place_of_birth, time_uncertain)\n`;
  md += `    │   └── Optional partner details (partner_name, partner_date_of_birth, partner_time_of_birth, etc.)\n`;
  md += `    │\n`;
  md += `    ▼ (1 : N)\n`;
  md += `ORDER (public.orders)\n`;
  md += `    │   ├── auth_user_id, service_title, format, price_eur, status, scheduled_at\n`;
  md += `    │   ├── Client snapshot at booking (client_name, client_dob, client_tob, client_pob, client_time_uncertain)\n`;
  md += `    │   ├── Partner snapshot if applicable (partner_name, partner_dob, partner_tob, partner_pob, etc.)\n`;
  md += `    │   ├── Stripe receipt & payment details\n`;
  md += `    │   └── Customer review (review_rating, review_text, review_created_at)\n`;
  md += `    │\n`;
  md += `    ▼ (1 : 1 auto-snapshotted via trg_create_reading_details)\n`;
  md += `READING DETAILS (public.reading_details)\n`;
  md += `        ├── order_id (FK -> orders.id)\n`;
  md += `        ├── customer_id (FK -> customer_profiles.id)\n`;
  md += `        ├── service_id (FK -> services.id)\n`;
  md += `        ├── Snapshot client info for astrologer (client_name, client_date_of_birth, etc.)\n`;
  md += `        ├── Snapshot partner info for astrologer (partner_name, partner_date_of_birth, etc.)\n`;
  md += `        ├── Google Calendar event ID\n`;
  md += `        └── Reading status & admin notes\n`;
  md += `\`\`\`\n\n`;
  md += `---\n\n`;

  md += `## Table of Contents\n\n`;

  tableNames.forEach((name, idx) => {
    md += `${idx + 1}. [\`public.${name}\`](#${idx + 1}-public${name.replace(/_/g, '')})\n`;
  });

  md += `\n---\n\n`;

  for (let i = 0; i < tableNames.length; i++) {
    const tbl = tableNames[i];
    console.log(`Processing public.${tbl}...`);

    // Fetch column details
    const cols = await runSql(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = '${tbl}'
      ORDER BY ordinal_position;
    `);

    // Fetch rows
    const rows = await runSql(`SELECT * FROM public.${tbl};`);
    const rowCount = Array.isArray(rows) ? rows.length : 0;

    md += `### ${i + 1}. \`public.${tbl}\` (${rowCount} row${rowCount === 1 ? '' : 's'})\n\n`;

    // Columns Table
    md += `| Column | Data Type | Nullable | Default |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    if (Array.isArray(cols)) {
      cols.forEach(c => {
        const isStar = ['review_rating', 'review_text', 'review_created_at', 'role', 'order_id', 'client_name', 'client_dob', 'partner_name', 'stripe_payment_intent_id'].includes(c.column_name);
        const colName = isStar ? `⭐ **${c.column_name}**` : `\`${c.column_name}\``;
        const dType = `\`${c.data_type}\``;
        const nullable = c.is_nullable === 'YES' ? 'Yes' : '**No**';
        const dflt = c.column_default ? `\`${c.column_default}\`` : '—';
        md += `| ${colName} | ${dType} | ${nullable} | ${dflt} |\n`;
      });
    }

    md += `\n**Current Live Data:**\n\n`;
    if (rowCount > 0) {
      md += `\`\`\`json\n${JSON.stringify(rows, null, 2)}\n\`\`\`\n\n`;
    } else {
      md += `*(Table is currently empty / 0 rows)*\n\n`;
    }

    md += `---\n\n`;
  }

  // 3. Security & Policies section
  md += `## Database Functions, Triggers & Security Policies\n\n`;
  md += `### 1. Helper Function: \`public.is_admin()\`\n`;
  md += `Prevents infinite recursion in PostgreSQL RLS policies by using \`SECURITY DEFINER\`:\n\n`;
  md += `\`\`\`sql\n`;
  md += `CREATE OR REPLACE FUNCTION public.is_admin()\n`;
  md += `RETURNS boolean\n`;
  md += `LANGUAGE sql\n`;
  md += `SECURITY DEFINER\n`;
  md += `SET search_path = public\n`;
  md += `STABLE\n`;
  md += `AS $$\n`;
  md += `  SELECT EXISTS (\n`;
  md += `    SELECT 1 FROM public.customer_profiles\n`;
  md += `    WHERE auth_user_id = auth.uid() AND role = 'admin'\n`;
  md += `  );\n`;
  md += `$$;\n`;
  md += `\`\`\`\n\n`;

  md += `### 2. Auto-Confirm New Users (\`trg_auto_confirm_new_user\`)\n`;
  md += `Ensures customers are instantly activated upon signup without getting blocked by "Email not confirmed".\n\n`;

  md += `### 3. Auto-Create Customer Profile (\`trg_auto_create_customer_profile\`)\n`;
  md += `Creates the user's \`customer_profiles\` entry server-side immediately upon user registration.\n\n`;

  md += `### 4. Order-to-Reading Details Snapshot (\`trg_create_reading_details\`)\n`;
  md += `Automatically populates \`reading_details\` with full client and partner snapshots whenever a booking order is created.\n\n`;

  md += `### 5. Row Level Security Policies\n`;
  md += `- **\`customer_profiles\`**: SELECT, INSERT, UPDATE restricted to owner (\`auth.uid() = auth_user_id\`) or \`is_admin()\`\n`;
  md += `- **\`orders\`**: SELECT, UPDATE restricted to owner or \`is_admin()\`\n`;
  md += `- **\`reading_details\`**: SELECT restricted to owner or \`is_admin()\`\n`;

  const outputPath = path.join(__dirname, '..', 'DATABASE.md');
  fs.writeFileSync(outputPath, md, 'utf8');
  console.log(`\nSuccessfully created and synced: ${outputPath}`);
}

main().catch(err => {
  console.error('Error during sync:', err);
  process.exit(1);
});
