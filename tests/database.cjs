const fs=require('node:fs');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const quote=s=>'"'+s.replaceAll('"','""')+'"';
(async()=>{
 const db=new PGlite();const b=JSON.parse(fs.readFileSync(__dirname+'/../supabase/baseline/schema-before-release.json','utf8'));
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;grant usage on schema auth to anon,authenticated;`);
 for(const t of b.tables) await db.exec(`create table public.${quote(t.name)} (${t.columns.map(c=>quote(c.name)+' '+c.type+(c.notnull?' not null':'')+(c.default?' default '+c.default:'')).join(',')});alter table public.${quote(t.name)} enable row level security;`);
 await db.exec('alter table public.psb_security_audit_log alter column id add generated always as identity');
 for(const f of b.functions)await db.exec(f);
 for(const kind of ['p','u','c','f'])for(const t of b.tables)for(const c of t.constraints||[])if(c.kind===kind)await db.exec(`alter table public.${quote(t.name)} add constraint ${quote(c.name)} ${c.def};`);
 for(const p of b.policies)await db.exec(`create policy ${quote(p.policyname)} on public.${quote(p.tablename)} as ${p.permissive} for ${p.cmd} to ${p.roles.map(quote).join(',')}${p.qual?' using ('+p.qual+')':''}${p.with_check?' with check ('+p.with_check+')':''};`);
 for(const g of b.grants)if(b.tables.some(t=>t.name===g.table_name))await db.exec(`grant ${g.privilege_type} on public.${quote(g.table_name)} to ${quote(g.grantee)};`);
 for(const t of b.triggers)await db.exec(t);
 await db.exec(`revoke execute on function public.psb_write_security_audit() from public,anon,authenticated;insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');insert into public.psb_sellers(seller_id,seller_name,status) values('juninho-pipas','Loja de teste','approved'),('pipas-store-brasil','Outra loja','approved');insert into public.psb_user_roles(user_id,role,seller_id) values('11111111-1111-4111-8111-111111111111','seller','juninho-pipas'),('22222222-2222-4222-8222-222222222222','seller','pipas-store-brasil'),('33333333-3333-4333-8333-333333333333','admin',null);insert into public.psb_seller_offers(offer_key,seller_id,scope,active) values('test1','juninho-pipas','all',true),('test2','pipas-store-brasil','all',true);`);
 await db.exec(fs.readFileSync(__dirname+'/../supabase/migrations/20260907190835_checkout_reliability.sql','utf8'));
 await db.exec(fs.readFileSync(__dirname+'/../docs/rabiola-prices-2026-09-08.sql','utf8'));

 const role=async(r,id='')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.role',$1,false),set_config('request.jwt.claim.sub',$2,false)",[r,id]);if(r)await db.exec('set role '+r);};
 const submit=async o=>(await db.query('select public.psb_submit_order($1::jsonb) as receipt',[JSON.stringify(o)])).rows[0].receipt;
 let n=0;const results=[];
 const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS',name);};
 const order=()=>({id:`PSB-00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`,sellerId:'juninho-pipas',sellerName:'Loja de teste',customer:{name:'Teste & exemplo',phone:'00000000000',city:'Porto Velho/RO'},items:[{slug:'mucha',nome:'Mucha',variacao:'50cm - Unidade',qty:1,preco:2.5,sellerId:'juninho-pipas'}],subtotal:2.5,timeline:[]});
 await role('anon');
 await check('Visitante não lê pedidos',()=>assert.rejects(db.query('select * from public.psb_orders')));
 await check('Visitante não lê vendedores privados',()=>assert.rejects(db.query('select * from public.psb_sellers')));
 await check('Projeção pública sem login/Pix/credenciais',async()=>{const r=await db.query('select * from public.psb_public_sellers');assert.equal(r.rows.length,2);assert.equal('login' in r.rows[0],false);assert.equal('pix_key' in r.rows[0],false);});
 const first=order();
 await check('Pedido anônimo confirmado sem SELECT',async()=>assert.equal((await submit(first)).confirmed,true));
 await check('Repetição usa mesmo número sem duplicar',async()=>{assert.equal((await submit(first)).order_number,first.id);await role('');assert.equal((await db.query('select count(*)::int as n from public.psb_orders')).rows[0].n,1);await role('anon');});
 for(const [label,mutate] of [['quantidade nula',o=>o.items[0].qty=null],['quantidade fracionada',o=>o.items[0].qty=1.5],['preço nulo',o=>o.items[0].preco=null],['produto fictício',o=>o.items[0].slug='inexistente'],['variação fictícia',o=>o.items[0].variacao='inventada'],['preço adulterado',o=>o.items[0].preco=.01],['subtotal adulterado',o=>o.subtotal=100]])await check('Rejeita '+label,async()=>{const o=order();mutate(o);await assert.rejects(submit(o));});
 await check('Desconto em 100 pacotes calculado no servidor',async()=>{const o=order();o.items=[{slug:'rabiola-cotoco-normal-20cm',nome:'Rabiola',variacao:'Pacote',qty:100,preco:34,sellerId:'juninho-pipas'}];o.subtotal=3400;assert.equal((await submit(o)).confirmed,true);});
 for(const [slug,label,base,bulk] of [
  ['rabiola-cotoco-normal-fita-10cm','Pacote',35,34],
  ['rabiola-cotoco-normal-20cm','Pacote',35,34],
  ['rabiola-cotoco-curta-fita-10cm','Pacote',50,50],
  ['rabiola-cabelinho-anjo','Pacote',50,50],
  ['rabiola-cotoco-normal-10cm-75m','Pacote de 75 m',10,10],
  ['rabiola-cotoco-normal-10cm-100m','Pacote de 100 m',14,14]
 ]) await check('Preço correto e valor antigo rejeitado: '+slug,async()=>{
  for(const qty of [1,6,99,100,101]){const price=qty>=100?bulk:base;const o=order();o.items=[{slug,nome:slug,variacao:label,qty,preco:price,sellerId:'juninho-pipas'}];o.subtotal=qty*price;assert.equal((await submit(o)).confirmed,true);}
  const invalid=order();const price=base===35?40:base===50?45:34;invalid.items=[{slug,nome:slug,variacao:label,qty:100,preco:price,sellerId:'juninho-pipas'}];invalid.subtotal=price*100;await assert.rejects(submit(invalid));
 });
 await role('authenticated','22222222-2222-4222-8222-222222222222');
 await check('Outra loja não lê nem altera o pedido',async()=>{assert.equal((await db.query('select * from public.psb_orders where order_number=$1',[first.id])).rows.length,0);assert.equal((await db.query("update public.psb_orders set status='pago' where order_number=$1 returning order_number",[first.id])).rows.length,0);});
 await role('authenticated','11111111-1111-4111-8111-111111111111');
 await check('Lojista atualiza status sem recodificar cliente',async()=>{const r=await db.query("update public.psb_orders set status='pago' where order_number=$1 returning customer,status,payment_released",[first.id]);assert.equal(r.rows[0].customer.name,'Teste &amp; exemplo');assert.equal(r.rows[0].payment_released,true);});
 await check('Lojista não altera cliente nem valor',()=>assert.rejects(db.query("update public.psb_orders set subtotal=1 where order_number=$1",[first.id])));
 await role('');
 await db.exec("update public.psb_catalog_products set variations='[{\"label\":\"50cm\",\"preco\":3}]' where slug='mucha'");
 await role('anon');
 await check('Repetição após mudança de preço mantém confirmação original',async()=>assert.equal((await submit(first)).confirmed,true));
 await role('');
 await check('Tentativas inválidas não deixam reservas',async()=>{const r=await db.query('select (select count(*)::int from public.psb_orders) as orders,(select count(*)::int from psb_private.order_keys) as keys');assert.equal(r.rows[0].orders,r.rows[0].keys);});

 await db.close();
})().catch(e=>{console.error(e);process.exit(1);});
