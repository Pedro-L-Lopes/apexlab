-- Remove exclusivamente os registros de demonstração (prefixo "demo-")
-- product_images, product_variants e product_private são apagados em cascata apenas para esses produtos.

delete from public.products
where slug like 'demo-%';

delete from public.categories
where slug like 'demo-%';
