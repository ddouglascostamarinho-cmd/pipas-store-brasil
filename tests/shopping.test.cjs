const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createApp}=require('./harness.cjs');
function shop(){const a=createApp();a.context.csv=fs.readFileSync('assets/data/tabela-precos.csv','utf8');a.run('applyPriceTable(parsePriceCsv(csv));trackEvent=()=>{};psbCatalogSyncedAt=Date.now();psbShippingSyncedAt=Date.now();');return a;}
test('clean and legacy product URLs select the same product',()=>{
 const a=shop();a.run("location.pathname='/produto/mucha';location.hash=''");assert.equal(a.run('psbRoute().slug'),'mucha');
 a.run("location.pathname='/';location.hash='#/produto/mucha'");assert.equal(a.run('psbRoutePath()'),'/produto/mucha');
 a.run("location.hash='';location.pathname='/portal-lojista'");assert.equal(a.run('psbRoute().page'),'portal-lojista');
});
test('payment methods follow pickup, local delivery and national shipping',()=>{
 const a=shop();for(const delivery of ['Entrega local com taxa a consultar','Envio nacional com frete dos Correios/Melhor Envio']){a.context.delivery=delivery;assert.doesNotMatch(a.run('psbPaymentOptions(delivery)'),/presencial|Dinheiro/);}
 assert.match(a.run("psbPaymentOptions('Retirada grátis na loja')"),/Cartão presencial/);
});
test('CEP confirmed has one compact, editable destination instead of another request',()=>{
 const a=shop();a.run("psbSaveDestination({cep:'01001000',city:'São Paulo',uf:'SP'})");
 const html=a.run("psbDestinationPanel('checkout')");assert.match(html,/shipping-confirmed/);assert.match(html,/Alterar CEP/);assert.doesNotMatch(html,/Informe seu CEP/);
 assert.match(html,/aria-label="CEP para consulta"/);
});
test('minimum is shown before adding and shortfall uses the selected seller subtotal',()=>{
 const a=shop();a.run("psbSaveDestination({cep:'01001000',city:'São Paulo',uf:'SP'});cart=[{key:'x',slug:'mucha',nome:'Mucha',categoria:'pipas',variacao:bySlug('mucha').variacoes[0].label,qty:1,preco:2.5,sellerId:'juninho-pipas'}]");
 assert.match(a.run("psbProductShippingInfo(bySlug('mucha'),'juninho-pipas')"),/90,00/);
 assert.match(a.run('psbMinimumProgress()'),/87,50/);
 a.run("cart[0].qty=36");assert.match(a.run('psbMinimumProgress()'),/Mínimo de envio atingido/);
});
test('75m and 100m rabiolas use the matching photograph approved by the owner',()=>{
 const a=shop();for(const slug of ['rabiola-cotoco-normal-10cm-75m','rabiola-cotoco-normal-10cm-100m']){a.context.slug=slug;assert.equal(a.run('getProductMainImage(slug)'),a.run("getProductMainImage('rabiola-cotoco-normal-fita-10cm')"));assert.ok(a.run('getProductGalleryImages(slug).length')>0);}
});
test('product metadata is individual; private and missing routes are not indexed',()=>{
 const a=shop();const d=a.run("psbSeoData('produto','mucha')");assert.equal(d.url,'https://www.pipasstore.com.br/produto/mucha');assert.match(d.title,/Mucha/);assert.equal(d.schema[0]['@type'],'Product');
 for(const page of ['checkout','carrinho','portal-lojista','painel-marketplace']){a.context.page=page;assert.equal(a.run('psbSeoData(page).robots'),'noindex,follow');}
 assert.equal(a.run("psbSeoData('produto','produto-inexistente').robots"),'noindex,follow');
 assert.equal(a.run("psbSeoData('blog','artigo-inexistente').robots"),'noindex,follow');
});

test('all public internal links have a generated document for direct visits',()=>{
 const files=JSON.parse(fs.readFileSync('scripts/generated-pages.json','utf8'));
 for(const file of files)for(const [,href] of fs.readFileSync(file,'utf8').matchAll(/href="(\/[^"#?]*)"/g)){
   const target=href==='/'?'index.html':href.slice(1)+(href.startsWith('/assets/')?'':'/index.html');
   assert.ok(fs.existsSync(target),`${file} links to missing ${target}`);
 }
});

test('private clean routes ignore forged local sessions and stay behind login',async()=>{
 const listeners={};const elements=new Map();
 const element=()=>({innerHTML:'',textContent:'',dataset:{},setAttribute(){},classList:{remove(){},toggle(){}},style:{},addEventListener(){}});
 const a=createApp({addEventListener:(type,fn)=>(listeners[type]??=[]).push(fn),document:{getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}}});
 a.run("location.pathname='/painel-marketplace';localStorage.setItem('psb_admin_session_23','true');localStorage.setItem('psb_store_session_23',JSON.stringify({storeId:'juninho-pipas'}));trackEvent=()=>{};fillFooterContact=()=>{};updateCartCount=()=>{};syncOrdersFromBackend=()=>{};");
 // Install only the auth guard, then exercise both paths with no valid Supabase session.
 await listeners.load[0]();a.run('router()');assert.match(elements.get('app').innerHTML,/type="password"/);assert.doesNotMatch(elements.get('app').innerHTML,/Governança do marketplace/);
 a.run("location.pathname='/portal-lojista';router()");assert.match(elements.get('app').innerHTML,/type="password"/);assert.doesNotMatch(elements.get('app').innerHTML,/portal-order-card/);
});
test('generated product documents have content, independent canonicals and no static price offers',()=>{
 const files=JSON.parse(fs.readFileSync('scripts/generated-pages.json','utf8')).filter(p=>p.startsWith('produto/'));
 assert.equal(files.length,34);
 for(const file of files){const html=fs.readFileSync(file,'utf8');assert.match(html,/<h1/);assert.match(html,/rel="canonical" href="https:\/\/www.pipasstore.com.br\/produto\//);assert.doesNotMatch(html,/href="#\//);const schema=JSON.parse(html.match(/id="psb-page-schema">([\s\S]*?)<\/script>/)[1]);assert.equal(schema[0]['@type'],'Product');assert.equal(schema[0].offers,undefined);}
});
test('analytics excludes contact and order identifiers and does not count orders as payments',()=>{
 const a=createApp();a.run("trackEvent('order_registered',{orderId:'private',phone:'private',subtotal:90,seller:'juninho-pipas'});");
 assert.doesNotMatch(a.run('JSON.stringify(dataLayer)'),/private|purchase/);assert.match(a.run('JSON.stringify(dataLayer)'),/generate_lead/);
});
