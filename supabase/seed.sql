-- Seed opcional de desenvolvimento (5 categorias e 3 produtos em draft)
-- Nota: a linha única de site_settings já é criada na migration inicial.

insert into public.categories (id, slug, name, position, active, show_on_home)
values
  ('11111111-1111-4111-8111-111111111101', 'decoracao', 'Decoração', 1, true, true),
  ('11111111-1111-4111-8111-111111111102', 'organizacao', 'Organização', 2, true, true),
  ('11111111-1111-4111-8111-111111111103', 'utilidades', 'Utilidades', 3, true, true),
  ('11111111-1111-4111-8111-111111111104', 'colecionaveis', 'Colecionáveis', 4, true, false),
  ('11111111-1111-4111-8111-111111111105', 'acessorios-setup', 'Acessórios de Setup', 5, true, true)
on conflict (slug) do nothing;

insert into public.products (
  id,
  slug,
  name,
  description,
  category_id,
  status,
  featured,
  position,
  price,
  material,
  print_time_min,
  width_mm,
  height_mm,
  depth_mm,
  weight_g,
  tags,
  colors
)
values
  (
    '22222222-2222-4222-8222-222222222201',
    'vaso-geometrico-minimalista',
    'Vaso Geométrico Minimalista',
    'Vaso decorativo com textura facetada ideal para plantas secas e suculentas.',
    '11111111-1111-4111-8111-111111111101',
    'draft',
    true,
    1,
    59.90,
    'PLA Fosco',
    240,
    120,
    180,
    120,
    145,
    array['vaso', 'minimalista', 'decoracao'],
    array['Branco Fosco', 'Areia', 'Preto']
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    'suporte-headset-mesa',
    'Suporte de Headset para Mesa',
    'Suporte ergonômico com encaixe firme para manter o setup organizado.',
    '11111111-1111-4111-8111-111111111105',
    'draft',
    false,
    2,
    49.90,
    'PETG',
    190,
    95,
    220,
    110,
    130,
    array['setup', 'headset', 'organizacao'],
    array['Preto', 'Grafite']
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    'organizador-cabos-modular',
    'Organizador de Cabos Modular',
    'Conjunto modular para organizar cabos USB e fontes na mesa de trabalho.',
    '11111111-1111-4111-8111-111111111102',
    'draft',
    false,
    3,
    34.90,
    'PLA+',
    110,
    140,
    35,
    45,
    65,
    array['cabos', 'mesa', 'modular'],
    array['Branco', 'Cinza', 'Azul']
  )
on conflict (slug) do nothing;

insert into public.product_private (product_id, stl_url, source_url, license, cost, notes)
values
  ('22222222-2222-4222-8222-222222222201', 'https://exemplo.interno/stl/vaso-geometrico.stl', 'https://makerworld.com/example/vaso', 'CC BY 4.0', 14.50, 'Imprimir com 3 paredes e 15% de preenchimento.'),
  ('22222222-2222-4222-8222-222222222202', 'https://exemplo.interno/stl/suporte-headset.stl', 'https://makerworld.com/example/headset', 'Uso Comercial Permitido', 12.00, 'Usar PETG para maior resistência mecânica.'),
  ('22222222-2222-4222-8222-222222222203', 'https://exemplo.interno/stl/organizador-cabos.stl', null, 'Criação Própria', 7.80, 'Altura de camada 0.2mm sem suportes.')
on conflict (product_id) do nothing;
