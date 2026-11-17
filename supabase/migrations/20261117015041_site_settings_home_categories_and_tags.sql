-- Permitir até 3 categorias e até 2 tags destacadas na home em public.site_settings

alter table public.site_settings
  add column home_category_ids uuid[] not null default '{}'
    check (cardinality(home_category_ids) <= 3),
  add column home_featured_tags text[] not null default '{}'
    check (cardinality(home_featured_tags) <= 2);

update public.site_settings
set home_category_ids = array[home_category_id]
where home_category_id is not null
  and cardinality(home_category_ids) = 0;

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
