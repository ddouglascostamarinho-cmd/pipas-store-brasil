-- Pipas Store Brasil - Registro central de pedidos assistidos
-- Execute este SQL no Supabase em: SQL Editor -> New query -> Run

create extension if not exists pgcrypto;

create table if not exists public.psb_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  seller_id text not null,
  seller_name text,
  status text not null default 'aguardando-confirmacao',
  payment_released boolean not null default false,
  customer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  timeline jsonb not null default '[]'::jsonb,
  order_payload jsonb not null default '{}'::jsonb,
  source text not null default 'site',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_psb_orders_seller_id on public.psb_orders (seller_id);
create index if not exists idx_psb_orders_status on public.psb_orders (status);
create index if not exists idx_psb_orders_created_at on public.psb_orders (created_at desc);

alter table public.psb_orders enable row level security;

drop policy if exists "PSB public insert assisted orders" on public.psb_orders;
drop policy if exists "PSB public read assisted orders" on public.psb_orders;
drop policy if exists "PSB public update assisted orders" on public.psb_orders;

-- MVP assistido: permite que o site público crie pedidos e que o portal leia/atualize status.
-- Importante: isso é uma solução provisória. Na Fase 2, substituir por autenticação real e políticas por usuário/lojista.
create policy "PSB public insert assisted orders"
on public.psb_orders
for insert
to anon
with check (true);

create policy "PSB public read assisted orders"
on public.psb_orders
for select
to anon
using (true);

create policy "PSB public update assisted orders"
on public.psb_orders
for update
to anon
using (true)
with check (true);
