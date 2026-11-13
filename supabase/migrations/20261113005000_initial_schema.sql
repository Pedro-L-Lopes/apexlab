-- Migration inicial: Catálogo de Impressão 3D
-- Tabelas, índices, view, storage, RLS e linha inicial de site_settings

-- ============================================================================
-- 1. Tipos Enum
-- ============================================================================
create type public.product_status as enum ('draft', 'active', 'hidden');
create type public.import_job_status as enum ('pending', 'processing', 'done', 'error');

-- ============================================================================
-- 2. Função auxiliar de updated_at
-- ============================================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 3. Tabelas
-- ============================================================================

-- 3.1 site_settings (linha única garantida por constraint)
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Catálogo 3D',
  description text not null default '',
  logo_url text,
  banner_url text,
  primary_color text not null default '#1F4FFF',
  whatsapp text not null default '' check (whatsapp ~ '^[0-9]*$'),
  whatsapp_message_template text not null default 'Olá! Tenho interesse no produto *{produto}* ({variante}). Link: {link}',
  instagram text,
  updated_at timestamptz not null default now()
);

create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row
  execute function public.handle_updated_at();

-- 3.2 categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  position int not null default 0,
  active boolean not null default true,
  show_on_home boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3.3 products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  status public.product_status not null default 'draft',
  featured boolean not null default false,
  position int not null default 0,
  price numeric(10, 2) check (price is null or price >= 0),
  material text,
  print_time_min int check (print_time_min is null or print_time_min >= 0),
  width_mm int check (width_mm is null or width_mm >= 0),
  height_mm int check (height_mm is null or height_mm >= 0),
  depth_mm int check (depth_mm is null or depth_mm >= 0),
  weight_g int check (weight_g is null or weight_g >= 0),
  tags text[] not null default '{}',
  colors text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_products_updated_at
  before update on public.products
  for each row
  execute function public.handle_updated_at();

-- 3.4 product_images
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  position int not null default 0,
  is_cover boolean not null default false
);

-- No máximo 1 imagem de capa por produto
create unique index product_images_one_cover_idx
  on public.product_images (product_id)
  where (is_cover = true);

-- 3.5 product_variants
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(10, 2) check (price is null or price >= 0),
  width_mm int check (width_mm is null or width_mm >= 0),
  height_mm int check (height_mm is null or height_mm >= 0),
  depth_mm int check (depth_mm is null or depth_mm >= 0),
  weight_g int check (weight_g is null or weight_g >= 0),
  attributes jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  position int not null default 0
);

-- 3.6 product_private (nunca exposta ao público)
create table public.product_private (
  product_id uuid primary key references public.products(id) on delete cascade,
  stl_url text,
  source_url text,
  license text,
  cost numeric(10, 2) check (cost is null or cost >= 0),
  notes text
);

-- 3.7 admins
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- 3.8 import_jobs
create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  stl_url text,
  status public.import_job_status not null default 'pending',
  error_message text,
  product_id uuid references public.products(id) on delete set null,
  extracted_data jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. Índices
-- ============================================================================
create index idx_products_status_category_position
  on public.products (status, category_id, position);

create index idx_products_tags_gin
  on public.products using gin (tags);

create index idx_product_images_product_position
  on public.product_images (product_id, position);

create index idx_categories_parent_position
  on public.categories (parent_id, position);

-- ============================================================================
-- 5. View pública products_listing
-- ============================================================================
create or replace view public.products_listing
with (security_invoker = true) as
select
  p.id,
  p.slug,
  p.name,
  p.description,
  p.category_id,
  p.featured,
  p.position,
  p.price,
  p.material,
  p.print_time_min,
  p.width_mm,
  p.height_mm,
  p.depth_mm,
  p.weight_g,
  p.tags,
  p.colors,
  p.created_at,
  p.updated_at,
  least(
    p.price,
    (
      select min(pv.price)
      from public.product_variants pv
      where pv.product_id = p.id
        and pv.active = true
        and pv.price is not null
    )
  ) as starting_price,
  (
    select pi.url
    from public.product_images pi
    where pi.product_id = p.id
    order by pi.is_cover desc, pi.position asc
    limit 1
  ) as cover_image_url,
  (
    select count(*)::int
    from public.product_variants pv
    where pv.product_id = p.id
      and pv.active = true
  ) as active_variants_count
from public.products p
where p.status = 'active';

grant select on public.products_listing to anon, authenticated;

-- ============================================================================
-- 6. Segurança (RLS + função is_admin)
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.site_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_private enable row level security;
alter table public.admins enable row level security;
alter table public.import_jobs enable row level security;

-- site_settings: leitura pública; escrita apenas admin
create policy "site_settings_select_public"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "site_settings_insert_admin"
  on public.site_settings for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "site_settings_update_admin"
  on public.site_settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "site_settings_delete_admin"
  on public.site_settings for delete
  to authenticated
  using ((select public.is_admin()));

-- categories: leitura pública apenas ativas (ou admin); escrita apenas admin
create policy "categories_select_public_active"
  on public.categories for select
  to anon, authenticated
  using (active = true or (select public.is_admin()));

create policy "categories_insert_admin"
  on public.categories for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "categories_update_admin"
  on public.categories for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "categories_delete_admin"
  on public.categories for delete
  to authenticated
  using ((select public.is_admin()));

-- products: leitura pública apenas status = 'active' (ou admin); escrita apenas admin
create policy "products_select_public_active"
  on public.products for select
  to anon, authenticated
  using (status = 'active' or (select public.is_admin()));

create policy "products_insert_admin"
  on public.products for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "products_update_admin"
  on public.products for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "products_delete_admin"
  on public.products for delete
  to authenticated
  using ((select public.is_admin()));

-- product_images: leitura pública apenas de produtos ativos (ou admin); escrita apenas admin
create policy "product_images_select_public_active"
  on public.product_images for select
  to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.products p
      where p.id = product_images.product_id
        and p.status = 'active'
    )
  );

create policy "product_images_insert_admin"
  on public.product_images for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "product_images_update_admin"
  on public.product_images for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "product_images_delete_admin"
  on public.product_images for delete
  to authenticated
  using ((select public.is_admin()));

-- product_variants: leitura pública apenas ativas de produtos ativos (ou admin); escrita apenas admin
create policy "product_variants_select_public_active"
  on public.product_variants for select
  to anon, authenticated
  using (
    (select public.is_admin())
    or (
      active = true
      and exists (
        select 1
        from public.products p
        where p.id = product_variants.product_id
          and p.status = 'active'
      )
    )
  );

create policy "product_variants_insert_admin"
  on public.product_variants for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "product_variants_update_admin"
  on public.product_variants for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "product_variants_delete_admin"
  on public.product_variants for delete
  to authenticated
  using ((select public.is_admin()));

-- product_private: acesso total restrito a admin
create policy "product_private_select_admin"
  on public.product_private for select
  to authenticated
  using ((select public.is_admin()));

create policy "product_private_insert_admin"
  on public.product_private for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "product_private_update_admin"
  on public.product_private for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "product_private_delete_admin"
  on public.product_private for delete
  to authenticated
  using ((select public.is_admin()));

-- admins: acesso total restrito a admin
create policy "admins_select_admin"
  on public.admins for select
  to authenticated
  using ((select public.is_admin()));

create policy "admins_insert_admin"
  on public.admins for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "admins_update_admin"
  on public.admins for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "admins_delete_admin"
  on public.admins for delete
  to authenticated
  using ((select public.is_admin()));

-- import_jobs: acesso total restrito a admin
create policy "import_jobs_select_admin"
  on public.import_jobs for select
  to authenticated
  using ((select public.is_admin()));

create policy "import_jobs_insert_admin"
  on public.import_jobs for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "import_jobs_update_admin"
  on public.import_jobs for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "import_jobs_delete_admin"
  on public.import_jobs for delete
  to authenticated
  using ((select public.is_admin()));

-- ============================================================================
-- 7. Storage Bucket (products) e Políticas
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy "products_storage_select_admin"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'products' and (select public.is_admin()));

create policy "products_storage_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'products' and (select public.is_admin()));

create policy "products_storage_update_admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'products' and (select public.is_admin()))
  with check (bucket_id = 'products' and (select public.is_admin()));

create policy "products_storage_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'products' and (select public.is_admin()));

-- ============================================================================
-- 8. Dados iniciais obrigatórios (linha única de site_settings)
-- ============================================================================
insert into public.site_settings (
  id,
  name,
  description,
  primary_color,
  whatsapp,
  whatsapp_message_template,
  instagram
)
values (
  1,
  'Catálogo 3D',
  '',
  '#1F4FFF',
  '',
  'Olá! Tenho interesse no produto *{produto}* ({variante}). Link: {link}',
  null
)
on conflict (id) do nothing;
