-- Central queues. Anonymous applicants receive a receipt, never SELECT access to personal data.
create table public.psb_partner_applications (
 id uuid primary key,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=16000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 seller_id text,
 review_note text not null default '' check(length(review_note)<=2000),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 check(length(coalesce(payload->>'nome','')) between 2 and 160),
 check(length(coalesce(payload->>'responsavel','')) between 2 and 160),
 check(length(coalesce(payload->>'cidade','')) between 2 and 160),
 check(coalesce(payload->>'phone','') ~ '^[0-9]{10,13}$'),
 check(coalesce(payload->>'cpfCnpj','') ~ '^([0-9]{11}|[0-9]{14})$')
);
alter table public.psb_partner_applications enable row level security;
revoke all on public.psb_partner_applications from public,anon,authenticated;
grant insert(id,payload) on public.psb_partner_applications to anon,authenticated;
grant select,update(status,seller_id,review_note,reviewed_at) on public.psb_partner_applications to authenticated;
create policy application_submit on public.psb_partner_applications for insert to anon,authenticated with check(status='pending' and seller_id is null and reviewed_at is null);
create policy application_admin_read on public.psb_partner_applications for select to authenticated using((select public.psb_is_admin()));
create policy application_admin_review on public.psb_partner_applications for update to authenticated using((select public.psb_is_admin())) with check((select public.psb_is_admin()));
create index applications_pending_date on public.psb_partner_applications(status,created_at desc);
create table psb_private.application_keys(id uuid primary key);
alter table psb_private.application_keys enable row level security;
revoke all on psb_private.application_keys from public,anon,authenticated;
grant insert on psb_private.application_keys to anon,authenticated;
create policy application_key_insert on psb_private.application_keys for insert to anon,authenticated with check(true);
create function public.psb_submit_partner_application(p_id uuid,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare constraint_name text;
begin
 begin
  insert into psb_private.application_keys(id) values(p_id);
 exception when unique_violation then
  get stacked diagnostics constraint_name=CONSTRAINT_NAME;
  if constraint_name<>'application_keys_pkey' then raise;end if;
  return jsonb_build_object('confirmed',true,'id',p_id);
 end;
 insert into public.psb_partner_applications(id,payload) values(p_id,p_payload);
 return jsonb_build_object('confirmed',true,'id',p_id);
end $$;
revoke all on function public.psb_submit_partner_application(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.psb_submit_partner_application(uuid,jsonb) to anon,authenticated;
create function public.psb_review_partner_application(p_id uuid,p_approve boolean) returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare a public.psb_partner_applications;sid text;p jsonb;
begin
 if not public.psb_is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 select * into strict a from public.psb_partner_applications where id=p_id for update;
 if a.status<>'pending' then return jsonb_build_object('id',a.id,'status',a.status,'seller_id',a.seller_id);end if;
 if p_approve is null then raise exception 'Decision required';end if;
 if p_approve then
  p=a.payload;sid='parceiro-'||replace(a.id::text,'-','');
  insert into public.psb_sellers(seller_id,seller_name,label,phone,city,status,payment_mode,card_integration,seller_payload)
  values(sid,p->>'nome','Loja parceira homologada',p->>'phone',p->>'cidade','approved','manual','manual',jsonb_build_object('id',sid,'nome',p->>'nome','responsavel',p->>'responsavel','cpfCnpj',p->>'cpfCnpj','instagram',p->>'instagram','enderecoComercial',p->>'enderecoComercial','cidade',p->>'cidade','phone',p->>'phone','status','approved'));
 end if;
 update public.psb_partner_applications set status=case when p_approve then 'approved' else 'rejected' end,seller_id=sid,reviewed_at=now() where id=p_id;
 return jsonb_build_object('id',p_id,'status',case when p_approve then 'approved' else 'rejected' end,'seller_id',sid);
end $$;
revoke all on function public.psb_review_partner_application(uuid,boolean) from public,anon,authenticated;
grant execute on function public.psb_review_partner_application(uuid,boolean) to authenticated;

create table public.psb_product_requests (
 id uuid primary key,
 seller_id text not null references public.psb_sellers(seller_id),
 product_name text not null check(length(btrim(product_name)) between 2 and 200),
 request_type text not null check(request_type in ('cadastro','ativacao','ajuste','imagem')),
 details text not null check(length(btrim(details)) between 5 and 5000),
 photo_path text not null unique,
 photo_name text not null check(length(photo_name) between 1 and 200),
 status text not null default 'pendente' check(status in ('pendente','em-analise','concluido','recusado')),
 review_note text not null default '' check(length(review_note)<=2000),
 created_at timestamptz not null default now(),
 check(photo_path ~ ('^'||seller_id||'/'||id::text||'\.(jpg|png|webp)$'))
);
alter table public.psb_product_requests enable row level security;
revoke all on public.psb_product_requests from public,anon,authenticated;
grant select on public.psb_product_requests to authenticated;
grant insert(id,seller_id,product_name,request_type,details,photo_path,photo_name),update(status,review_note) on public.psb_product_requests to authenticated;
create policy product_request_read on public.psb_product_requests for select to authenticated using(seller_id=(select public.psb_current_seller_id()) or (select public.psb_is_admin()));
create policy product_request_insert on public.psb_product_requests for insert to authenticated with check(seller_id=(select public.psb_current_seller_id()) and status='pendente' and review_note='' and exists(select 1 from public.psb_public_sellers s where s.seller_id=psb_product_requests.seller_id and s.status='approved') and exists(select 1 from storage.objects o where o.bucket_id='psb-product-requests' and o.name=photo_path));
create policy product_request_review on public.psb_product_requests for update to authenticated using((select public.psb_is_admin())) with check((select public.psb_is_admin()));
create index product_requests_seller_date on public.psb_product_requests(seller_id,created_at desc);
create index product_requests_status_date on public.psb_product_requests(status,created_at desc);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('psb-product-requests','psb-product-requests',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy request_photo_insert on storage.objects for insert to authenticated with check(bucket_id='psb-product-requests' and split_part(name,'/',1)=(select public.psb_current_seller_id()) and name ~ '^[a-z0-9-]+/[0-9a-f-]{36}\.(jpg|png|webp)$' and exists(select 1 from public.psb_public_sellers s where s.seller_id=(select public.psb_current_seller_id()) and s.status='approved'));
create policy request_photo_read on storage.objects for select to authenticated using(bucket_id='psb-product-requests' and (split_part(name,'/',1)=(select public.psb_current_seller_id()) or (select public.psb_is_admin())));
-- Files are immutable. No public URLs, overwrite or client-side delete permissions.
