delete from public.products
where id in (
  '99999999-9999-4999-8999-999999999901',
  '99999999-9999-4999-8999-999999999902'
);

delete from public.categories
where id in (
  '77777777-7777-4777-8777-777777777701',
  '77777777-7777-4777-8777-777777777702'
);

select
  (select count(*) from public.categories) as categories_count,
  (select count(*) from public.products) as products_count,
  (select count(*) from public.product_variants) as variants_count,
  (select count(*) from public.product_images) as images_count,
  (select count(*) from public.product_private) as private_count;
