-- Grants explícitos para roles anon e authenticated (o RLS continua filtrando o acesso)

-- Leitura pública (o RLS filtra as linhas)
grant select on
  public.site_settings, public.categories, public.products,
  public.product_images, public.product_variants
to anon, authenticated;

-- Admin logado: escrita (RLS + is_admin() decidem quem pode)
grant update on public.site_settings to authenticated;
grant insert, update, delete on
  public.categories, public.products,
  public.product_images, public.product_variants
to authenticated;

-- Tabelas internas: nada para anon
grant select, insert, update, delete on
  public.product_private, public.import_jobs, public.admins
to authenticated;
