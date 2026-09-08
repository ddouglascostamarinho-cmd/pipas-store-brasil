-- Data correction requested by the shop owner on 2026-09-08.
-- Executed via Supabase SQL; no schema, access or historical order changes.
begin;
update public.psb_catalog_products
set variations='[{"label":"Pacote","preco":35}]'::jsonb,
    tiers='{"base":35,"bulkMinQty":100,"bulkPrice":34}'::jsonb,
    updated_at=now()
where slug in ('rabiola-cotoco-normal-20cm','rabiola-cotoco-normal-fita-10cm');
update public.psb_catalog_products
set variations='[{"label":"Pacote","preco":50}]'::jsonb, tiers='{"base":50,"bulkMinQty":1,"bulkPrice":50}'::jsonb, updated_at=now()
where slug in ('rabiola-cabelinho-anjo','rabiola-cotoco-curta-fita-10cm');
insert into public.psb_catalog_products(slug,product_name,category_slug,variations,tiers,allowed_sellers)
values
('rabiola-cotoco-normal-10cm-75m','Rabiola Cotoco - Normal 10cm - 75m','rabiolas','[{"label":"Pacote de 75 m","preco":10}]'::jsonb,null,null),
('rabiola-cotoco-normal-10cm-100m','Rabiola Cotoco - Normal 10cm - 100m','rabiolas','[{"label":"Pacote de 100 m","preco":14}]'::jsonb,null,null)
on conflict (slug) do nothing;
commit;
