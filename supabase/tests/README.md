# Suíte de testes de segurança (RLS anônimo)
1. Inserir dados temporários: `npx supabase db query --remote --yes -f supabase/tests/insert_temp.sql`
2. Rodar testes como `anon` (lê chaves públicas de `.env.local`): `node --experimental-websocket supabase/tests/test-anon-rls.mjs`
3. Limpar banco: `npx supabase db query --remote --yes -f supabase/tests/cleanup_temp.sql`
4. Limpar storage: `npx supabase storage rm ss:///products/temp-test-file.webp --remote --experimental --yes`
