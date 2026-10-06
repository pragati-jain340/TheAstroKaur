const fs = require('fs');

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || '';
  const projectRef = 'qdnwmfriilknnwqrepuy';

  const sql = `
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can insert their own orders'
    ) THEN
        CREATE POLICY "Users can insert their own orders" 
        ON public.orders FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = auth_user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Anon can create orders via intake'
    ) THEN
        CREATE POLICY "Anon can create orders via intake" 
        ON public.orders FOR INSERT 
        TO anon 
        WITH CHECK (true);
    END IF;
END $$;
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Result:', text);
}

main().catch(console.error);
