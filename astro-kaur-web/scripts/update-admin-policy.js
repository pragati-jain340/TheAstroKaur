async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || '';
  const projectRef = 'qdnwmfriilknnwqrepuy';

  const sql = `
DROP POLICY IF EXISTS "Admin full access on customer_profiles" ON public.customer_profiles;

CREATE POLICY "Admins full access on customer_profiles"
ON public.customer_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customer_profiles cp
    WHERE cp.auth_user_id = auth.uid() AND cp.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_profiles cp
    WHERE cp.auth_user_id = auth.uid() AND cp.role = 'admin'
  )
);
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await res.text();
  console.log('Result:', text);
}

main().catch(console.error);
