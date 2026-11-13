insert into public.categories (id, slug, name, position, active, show_on_home)
values
  ('77777777-7777-4777-8777-777777777701', 'temp-cat-ativa', 'Categoria Temp Ativa', 1, true, true),
  ('77777777-7777-4777-8777-777777777702', 'temp-cat-inativa', 'Categoria Temp Inativa', 2, false, false)
on conflict (id) do nothing;

insert into public.products (id, slug, name, category_id, status, price, colors)
values
  ('99999999-9999-4999-8999-999999999901', 'temp-produto-ativo', 'Produto Temporário Ativo', '77777777-7777-4777-8777-777777777701', 'active', 99.90, array['Preto']),
  ('99999999-9999-4999-8999-999999999902', 'temp-produto-rascunho', 'Produto Temporário Rascunho', '77777777-7777-4777-8777-777777777701', 'draft', 79.90, array['Branco'])
on conflict (id) do nothing;

insert into public.product_variants (id, product_id, name, price, active, position)
values
  ('66666666-6666-4666-8666-666666666601', '99999999-9999-4999-8999-999999999901', 'Variante Ativa', 89.90, true, 1),
  ('66666666-6666-4666-8666-666666666602', '99999999-9999-4999-8999-999999999901', 'Variante Inativa', 69.90, false, 2)
on conflict (id) do nothing;

insert into public.product_images (id, product_id, url, position, is_cover)
values
  ('55555555-5555-4555-8555-555555555501', '99999999-9999-4999-8999-999999999901', 'https://exemplo.com/ativa.webp', 1, true),
  ('55555555-5555-4555-8555-555555555502', '99999999-9999-4999-8999-999999999902', 'https://exemplo.com/draft.webp', 1, true)
on conflict (id) do nothing;

insert into public.product_private (product_id, stl_url, source_url, license, cost, notes)
values
  ('99999999-9999-4999-8999-999999999901', 'https://privado.interno/ativo.stl', 'https://makerworld.com/temp-ativo', 'CC BY', 20.00, 'Nota secreta ativa'),
  ('99999999-9999-4999-8999-999999999902', 'https://privado.interno/rascunho.stl', 'https://makerworld.com/temp-rascunho', 'Privada', 15.00, 'Nota secreta rascunho')
on conflict (product_id) do nothing;

insert into storage.objects (bucket_id, name, metadata)
select 'products', 'temp-test-file.webp', '{"mimetype":"image/webp"}'::jsonb
where not exists (
  select 1 from storage.objects where bucket_id = 'products' and name = 'temp-test-file.webp'
);

select
  (select count(*) from public.categories) as categories_count,
  (select count(*) from public.products) as products_count,
  (select count(*) from public.product_variants) as variants_count,
  (select count(*) from public.product_images) as images_count,
  (select count(*) from public.product_private) as private_count,
  (select count(*) from storage.objects where bucket_id = 'products' and name = 'temp-test-file.webp') as storage_count;
