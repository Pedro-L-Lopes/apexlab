# Catálogo 3D

Vitrine online de produtos de impressão 3D com área pública para clientes (busca, filtros por categoria/cor, galeria, orçamento via WhatsApp) e painel administrativo protegido para cadastro de peças, categorias, configurações da loja e importação de modelos 3D por link (individual e em lote).

## Stack

- **Framework:** Next.js 16 (App Router com `cacheComponents` e `proxy.ts`)
- **Estilo:** Tailwind CSS v4 + Motion (`LazyMotion`)
- **Banco, Auth e Storage:** Supabase (PostgreSQL com RLS + `GRANT` explícito, Supabase Auth e bucket `products`)
- **Processamento de imagem:** `sharp` (conversão para WebP no servidor até 1600 px)

---

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha os valores do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publicavel-anon
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Importante:** este projeto **nunca** utiliza `SUPABASE_SERVICE_ROLE_KEY`. Toda segurança e isolamento entre área pública e área administrativa é garantida por **RLS (`is_admin()`)** e **permissões `GRANT` explícitas** no PostgreSQL.

---

## Como rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Comandos úteis de verificação:

```bash
npm run lint
npm run build
npm run start
```

---

## Migrations e tipos do banco

1. Crie uma nova migration local:
   ```bash
   npx supabase migration new nome_da_migration
   ```
2. Sempre que criar uma tabela nova no schema `public`, inclua os `GRANT` explícitos para `anon` e/ou `authenticated` (o banco remoto bloqueia tabelas sem `GRANT`, mesmo com RLS configurado).
3. Confira o plano antes de aplicar no banco remoto:
   ```bash
   npx supabase db push --remote --dry-run
   ```
4. Aplique no Supabase remoto e regenere a tipagem TypeScript:
   ```bash
   npx supabase db push --remote
   npx supabase gen types typescript --linked > types/database.ts
   ```

---

## Como adicionar um administrador

O acesso ao `/admin` e às rotas `/api/admin/*` exige usuário autenticado no Supabase Auth **e** cadastrado na tabela `public.admins`.

1. Crie o usuário em **Authentication → Users** no painel do Supabase (ou faça o primeiro cadastro/login).
2. Copie o `id` (UUID) do usuário e execute no **SQL Editor** do Supabase:
   ```sql
   insert into public.admins (user_id)
   values ('UUID-DO-USUARIO-AQUI')
   on conflict (user_id) do nothing;
   ```

---

## Dados de demonstração

Os scripts de demonstração usam prefixo `demo-` nos slugs para facilitar a limpeza antes de colocar a loja em produção:

- **Inserir dados de demonstração:**
  ```bash
  npx supabase db query --linked -f supabase/tests/demo_add.sql
  ```
- **Remover apenas os dados de demonstração (`demo-*`):**
  ```bash
  npx supabase db query --linked -f supabase/tests/demo_remove.sql
  ```

---

## Suíte de testes de segurança (RLS + Storage)

Para validar que usuários anônimos conseguem ler apenas o catálogo ativo e nunca acessam tabelas internas (`product_private`, `import_jobs`, `admins`), rascunhos, gravações ou listagem/upload no Storage, consulte [supabase/tests/README.md](supabase/tests/README.md):

```bash
npx supabase db query --linked -f supabase/tests/insert_temp.sql
node supabase/tests/test-anon-rls.mjs
npx supabase db query --linked -f supabase/tests/cleanup_temp.sql
```

---

## Deploy na Vercel

1. Conecte o repositório na Vercel (preset **Next.js**).
2. Em **Settings → Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (URL final de produção, ex.: `https://sualoja.vercel.app`)
3. No painel do Supabase (**Authentication → URL Configuration**), adicione a URL de produção da Vercel em **Site URL** e em **Redirect URLs**.
4. Antes de divulgar o catálogo real, execute `supabase/tests/demo_remove.sql` no SQL Editor (ou via CLI) e configure nome, WhatsApp e cor primária em `/admin/configuracoes`.
