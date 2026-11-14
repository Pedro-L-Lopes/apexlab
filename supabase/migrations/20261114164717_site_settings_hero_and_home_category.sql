-- Adicionar colunas hero_mode e home_category_id em public.site_settings (Seção 5)

alter table public.site_settings
  add column hero_mode text not null default 'text'
    check (hero_mode in ('text', 'image', 'none')),
  add column home_category_id uuid
    references public.categories(id) on delete set null;

-- Reafirmar grants explícitos de leitura/atualização em site_settings (Seção 6)
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
