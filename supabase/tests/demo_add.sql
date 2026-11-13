-- Dados de demonstração para a Fase 3 (todos os slugs começam com "demo-")
-- Aplicável de forma idempotente; removível exclusivamente com supabase/tests/demo_remove.sql

-- 1. 4 Categorias ativas (visíveis na Home)
insert into public.categories (slug, name, position, active, show_on_home)
values
  ('demo-decoracao', 'Decoração & Casa', 1, true, true),
  ('demo-setup', 'Setup & Escritório', 2, true, true),
  ('demo-organizacao', 'Organização Modular', 3, true, true),
  ('demo-iluminacao', 'Luminárias & Arte', 4, true, true)
on conflict (slug) do update set
  name = excluded.name,
  position = excluded.position,
  active = excluded.active,
  show_on_home = excluded.show_on_home;

-- 2. 10 Produtos ativos
insert into public.products (
  slug, name, description, category_id, status, featured, position, price,
  material, print_time_min, width_mm, height_mm, depth_mm, weight_g, tags, colors
)
values
  (
    'demo-vaso-geometrico-voronoi',
    'Vaso Geométrico Voronoi',
    'Vaso escultural impresso em alta resolução com malha orgânica Voronoi. Ideal para plantas secas, arranjos minimalistas ou destaque em estantes.',
    (select id from public.categories where slug = 'demo-decoracao'),
    'active', true, 1, 64.90,
    'PLA Silk', 210, 120, 180, 120, 145,
    array['Voronoi', 'PLA Silk', 'Minimalista'],
    array['Azul Cobalto', 'Branco Pérola', 'Preto Fosco', 'Terracota']
  ),
  (
    'demo-suporte-headset-articulado',
    'Suporte Articulado para Headset',
    'Apoio ergonômico com haste dupla reforçada em PETG Carbon, base pesada antiderrapante e canaleta traseira para organizar o cabo.',
    (select id from public.categories where slug = 'demo-setup'),
    'active', true, 2, 79.90,
    'PETG Carbon', 260, 110, 240, 135, 210,
    array['Gamer', 'PETG', 'Articulado'],
    array['Preto Fosco', 'Grafite', 'Azul Royal']
  ),
  (
    'demo-luminaria-lua-topografica',
    'Luminária Lua Topográfica',
    'Esfera litofânica baseada no relevo lunar real da NASA. Acompanha base minimalista para fita ou lâmpada LED fria.',
    (select id from public.categories where slug = 'demo-iluminacao'),
    'active', true, 3, 129.90,
    'PLA Litofania', 480, 160, 160, 160, 280,
    array['LED', 'Litofania', 'Presente'],
    array['Branco Quente', 'Marfim']
  ),
  (
    'demo-organizador-modular-gridfinity',
    'Organizador Modular Gridfinity',
    'Kit de bandejas encaixáveis no padrão Gridfinity 42mm para manter gavetas e bancadas de trabalho sempre alinhadas.',
    (select id from public.categories where slug = 'demo-organizacao'),
    'active', true, 4, 49.90,
    'PLA+', 190, 210, 45, 140, 175,
    array['Modular', 'Gridfinity', 'Gaveta'],
    array['Cinza Espacial', 'Azul Cobalto', 'Branco']
  ),
  (
    'demo-stand-ergonomico-macbook',
    'Stand Ergonômico para Notebook',
    'Par de suportes em ângulo de 18 graus que elevam a tela para a altura dos olhos e liberam fluxo de ar sob o chassi.',
    (select id from public.categories where slug = 'demo-setup'),
    'active', true, 5, 69.90,
    'PETG', 230, 180, 95, 120, 195,
    array['Ergonomia', 'PETG', 'Minimalista'],
    array['Preto Fosco', 'Prata Metálico']
  ),
  (
    'demo-vaso-espiral-nordico',
    'Cachepô Espiral Nórdico',
    'Acabamento fosco sedoso com textura canelada em hélice contínua. Possui furo opcional de drenagem e pratinho acoplado.',
    (select id from public.categories where slug = 'demo-decoracao'),
    'active', true, 6, 44.90,
    'PLA Matte', 150, 130, 135, 130, 120,
    array['Plantas', 'Minimalista', 'PLA Matte'],
    array['Areia', 'Verde Sálvia', 'Terracota']
  ),
  (
    'demo-dock-magsafe-relogio',
    'Dock Duplo Celular & Relógio',
    'Base inclinada para carregador magnético e smartwatch com passagem oculta para cabos USB-C na parte traseira.',
    (select id from public.categories where slug = 'demo-setup'),
    'active', false, 7, 58.00,
    'PLA+', 165, 95, 115, 105, 130,
    array['Setup', 'Minimalista', 'Cabos'],
    array['Preto Fosco', 'Branco']
  ),
  (
    'demo-caixa-cabos-colmeia',
    'Caixa Organizadora Colmeia',
    'Organizador fechado com tampa ventilada em padrão hexagonal para réguas de tomada, fontes e excesso de cabos.',
    (select id from public.categories where slug = 'demo-organizacao'),
    'active', false, 8, 52.00,
    'PETG', 200, 240, 80, 110, 220,
    array['Cabos', 'Colmeia', 'Modular'],
    array['Preto Fosco', 'Cinza']
  ),
  (
    'demo-luminaria-plissada-zen',
    'Abajur Plissado Zen',
    'Cúpula translúcida com dobras paramétricas que difundem a luz sem ofuscar. Compatível com soquete E27 LED de baixa temperatura.',
    (select id from public.categories where slug = 'demo-iluminacao'),
    'active', false, 9, 139.00,
    'PLA Translúcido', 390, 190, 260, 190, 310,
    array['LED', 'Minimalista', 'PLA Translúcido'],
    array['Âmbar', 'Branco Leitoso']
  ),
  (
    'demo-escultura-parametrica-onda',
    'Escultura Paramétrica Onda',
    'Peça artística produzida sob medida em resina 8K com acabamento acetinado. Consulte tamanhos personalizados pelo WhatsApp.',
    (select id from public.categories where slug = 'demo-decoracao'),
    'active', false, 10, null,
    'Resina 8K', 340, 150, 220, 95, 240,
    array['Escultura', 'Resina 8K', 'Sob Medida'],
    array['Grafite Fosco', 'Azul Cobalto']
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category_id = excluded.category_id,
  status = excluded.status,
  featured = excluded.featured,
  position = excluded.position,
  price = excluded.price,
  material = excluded.material,
  print_time_min = excluded.print_time_min,
  width_mm = excluded.width_mm,
  height_mm = excluded.height_mm,
  depth_mm = excluded.depth_mm,
  weight_g = excluded.weight_g,
  tags = excluded.tags,
  colors = excluded.colors;

-- 3. Limpar variantes e imagens apenas dos produtos demo-* antes de reinserir (idempotência)
delete from public.product_variants
where product_id in (select id from public.products where slug like 'demo-%');

delete from public.product_images
where product_id in (select id from public.products where slug like 'demo-%');

-- 4. Variantes ativas (para testar cards empilhados, selo N OPÇÕES e seletor de variantes)
insert into public.product_variants (
  product_id, name, price, width_mm, height_mm, depth_mm, weight_g, attributes, active, position
)
values
  (
    (select id from public.products where slug = 'demo-vaso-geometrico-voronoi'),
    'Compacto (14cm)', 54.90, 95, 140, 95, 105,
    '{"tamanho":"P","altura":"14 cm"}'::jsonb, true, 1
  ),
  (
    (select id from public.products where slug = 'demo-vaso-geometrico-voronoi'),
    'Padrão (18cm)', 64.90, 120, 180, 120, 145,
    '{"tamanho":"M","altura":"18 cm"}'::jsonb, true, 2
  ),
  (
    (select id from public.products where slug = 'demo-vaso-geometrico-voronoi'),
    'Grande (24cm)', 89.90, 155, 240, 155, 230,
    '{"tamanho":"G","altura":"24 cm"}'::jsonb, true, 3
  ),
  (
    (select id from public.products where slug = 'demo-suporte-headset-articulado'),
    'Mesa (Base Ponderada)', 79.90, 110, 240, 135, 210,
    '{"montagem":"Mesa"}'::jsonb, true, 1
  ),
  (
    (select id from public.products where slug = 'demo-suporte-headset-articulado'),
    'Grampo Sob a Mesa', 69.90, 90, 145, 115, 155,
    '{"montagem":"Clamp"}'::jsonb, true, 2
  ),
  (
    (select id from public.products where slug = 'demo-luminaria-lua-topografica'),
    'Diâmetro 16cm', 129.90, 160, 160, 160, 280,
    '{"diametro":"16 cm"}'::jsonb, true, 1
  ),
  (
    (select id from public.products where slug = 'demo-luminaria-lua-topografica'),
    'Diâmetro 20cm', 169.90, 200, 200, 200, 390,
    '{"diametro":"20 cm"}'::jsonb, true, 2
  ),
  (
    (select id from public.products where slug = 'demo-organizador-modular-gridfinity'),
    'Kit 4 Módulos', 49.90, 210, 45, 140, 175,
    '{"pecas":"4 módulos"}'::jsonb, true, 1
  ),
  (
    (select id from public.products where slug = 'demo-organizador-modular-gridfinity'),
    'Kit 8 Módulos', 84.90, 290, 45, 210, 330,
    '{"pecas":"8 módulos"}'::jsonb, true, 2
  ),
  (
    (select id from public.products where slug = 'demo-organizador-modular-gridfinity'),
    'Kit Completo 12 Módulos', 119.90, 360, 45, 250, 480,
    '{"pecas":"12 módulos"}'::jsonb, true, 3
  );

-- 5. Imagens placeholder locais em public/demo/
insert into public.product_images (product_id, url, position, is_cover)
values
  ((select id from public.products where slug = 'demo-vaso-geometrico-voronoi'), '/demo/vaso-voronoi.webp', 1, true),
  ((select id from public.products where slug = 'demo-vaso-geometrico-voronoi'), '/demo/vaso-voronoi-detalhe.webp', 2, false),
  ((select id from public.products where slug = 'demo-suporte-headset-articulado'), '/demo/suporte-headset.webp', 1, true),
  ((select id from public.products where slug = 'demo-luminaria-lua-topografica'), '/demo/luminaria-lua.webp', 1, true),
  ((select id from public.products where slug = 'demo-organizador-modular-gridfinity'), '/demo/organizador-gridfinity.webp', 1, true),
  ((select id from public.products where slug = 'demo-stand-ergonomico-macbook'), '/demo/stand-notebook.webp', 1, true),
  ((select id from public.products where slug = 'demo-vaso-espiral-nordico'), '/demo/vaso-spiral.webp', 1, true),
  ((select id from public.products where slug = 'demo-dock-magsafe-relogio'), '/demo/dock-magsafe.webp', 1, true),
  ((select id from public.products where slug = 'demo-caixa-cabos-colmeia'), '/demo/caixa-colmeia.webp', 1, true),
  ((select id from public.products where slug = 'demo-luminaria-plissada-zen'), '/demo/luminaria-zen.webp', 1, true),
  ((select id from public.products where slug = 'demo-escultura-parametrica-onda'), '/demo/escultura-onda.webp', 1, true);

-- 6. Dados privados de teste (para confirmar que nunca aparecem na área pública)
insert into public.product_private (product_id, stl_url, source_url, license, cost, notes)
values
  (
    (select id from public.products where slug = 'demo-vaso-geometrico-voronoi'),
    'https://interno.privado/modelos/vaso-voronoi-secreto.stl',
    'https://makerworld.com/models/demo-voronoi',
    'CC BY 4.0',
    18.50,
    'SEGREDO_PRIVADO_VORONOI: bico 0.4mm, 3 paredes'
  ),
  (
    (select id from public.products where slug = 'demo-suporte-headset-articulado'),
    'https://interno.privado/modelos/suporte-headset-secreto.stl',
    'https://makerworld.com/models/demo-headset',
    'Comercial Própria',
    24.00,
    'SEGREDO_PRIVADO_HEADSET: preenchimento 35% gyroid'
  ),
  (
    (select id from public.products where slug = 'demo-luminaria-lua-topografica'),
    'https://interno.privado/modelos/lua-secreta.stl',
    'https://makerworld.com/models/demo-lua',
    'Uso Comercial Permitido',
    32.00,
    'SEGREDO_PRIVADO_LUA: imprimir com 100% infill na casca'
  )
on conflict (product_id) do update set
  stl_url = excluded.stl_url,
  source_url = excluded.source_url,
  license = excluded.license,
  cost = excluded.cost,
  notes = excluded.notes;

select
  (select count(*) from public.categories where slug like 'demo-%') as demo_categories,
  (select count(*) from public.products where slug like 'demo-%') as demo_products,
  (select count(*) from public.product_variants where product_id in (select id from public.products where slug like 'demo-%')) as demo_variants,
  (select count(*) from public.product_images where product_id in (select id from public.products where slug like 'demo-%')) as demo_images,
  (select count(*) from public.product_private where product_id in (select id from public.products where slug like 'demo-%')) as demo_private;
