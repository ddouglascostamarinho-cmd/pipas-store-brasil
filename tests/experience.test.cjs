const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('./harness.cjs');

function basket(){
 const a=createApp();
 a.run("trackEvent=()=>{};cart=[{key:'mucha-test',slug:'mucha',nome:'Mucha',categoria:'pipas',variacao:'60cm',qty:1,preco:2.5,bulkMinQty:10,bulkPreco:2,sellerId:'juninho-pipas'}];psbSaveDestination({cep:'01001000',city:'São Paulo',uf:'SP'});");
 return a;
}
test('brand home remains usable when the live price service is unavailable',()=>{
 const a=createApp();
 a.run("fillFooterContact=()=>{};updateCartCount=()=>{};psbAfterRender=()=>{};trackEvent=()=>{};window.__PSB_PRICE_TABLE_LOADED__=false;router()");
 assert.match(a.run('app.innerHTML'),/brand-hero/);
 assert.match(a.run('app.innerHTML'),/href="\/loja"/);
 assert.doesNotMatch(a.run('app.innerHTML'),/pdPrice|product-price/);
});
test('drawer hides cached prices until authoritative pricing is loaded',()=>{
 const a=basket();a.run('window.__PSB_PRICE_TABLE_LOADED__=false');
 assert.match(a.run('psbCartDrawerMarkup()'),/Consultando/);
 assert.doesNotMatch(a.run('psbCartDrawerMarkup()'),/R\$/);
 a.run('window.__PSB_PRICE_TABLE_LOADED__=true');
 assert.match(a.run('psbCartDrawerMarkup()'),/2,50/);
});
test('drawer quantity edits preserve bulk pricing, minimums and persisted cart',()=>{
 const a=basket();a.run('window.__PSB_PRICE_TABLE_LOADED__=true;psbDrawerQuantity(0,1)');
 assert.equal(a.run('totals().subtotal'),5);
 assert.match(a.run('psbCartDrawerMarkup()'),/85,00/);
 a.run("cart[0].slug='rabiola-cotoco-normal-20cm';cart[0].qty=99;cart[0].preco=35;psbDrawerQuantity(0,1)");
 assert.equal(a.run('totals().subtotal'),3400);
 assert.equal(JSON.parse(a.storage.get('psb_cart_23'))[0].qty,100);
 a.run('cart[0].qty=1;psbDrawerQuantity(0,-1)');assert.equal(a.run('cart[0].qty'),1);
 a.run('psbDrawerRemove(0)');assert.equal(a.run('cart.length'),0);assert.equal(a.storage.get('psb_cart_23'),'[]');
 assert.match(a.run('psbCartDrawerMarkup()'),/drawer-empty/);
});
test('partner presentation resolves as a public route with its own metadata',()=>{
 const a=createApp();a.run("location.pathname='/para-marcas';fillFooterContact=()=>{};updateCartCount=()=>{};psbAfterRender=()=>{};trackEvent=()=>{};router()");
 assert.match(a.run('app.innerHTML'),/brand-partners/);
 const seo=a.run("psbSeoData('para-marcas')");assert.equal(seo.robots,'index,follow');assert.equal(seo.url,'https://www.pipasstore.com.br/para-marcas');
});
