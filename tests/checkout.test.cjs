const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {createApp}=require('./harness.cjs');
function checkout(fetchImpl){
 const values={ckName:'Cliente de teste',ckPhone:'00000000000',ckCity:'Porto Velho/RO',ckCep:'76820-680',ckDelivery:'Retirada grátis na loja',ckPayment:'Pix',ckAddress:'Rua de teste',ckNumber:'1',ckDistrict:'Bairro',ckComplement:'',ckObs:''};
 const fields=Object.fromEntries(Object.entries(values).map(([k,value])=>[k,{value}]));
 const a=createApp({fetch:fetchImpl,document:{getElementById:id=>fields[id]||{addEventListener(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}}});
 a.context.csv=fs.readFileSync(path.join(__dirname,'../assets/data/tabela-precos.csv'),'utf8');
 a.run(`applyPriceTable(parsePriceCsv(csv));window.__PSB_PRICE_TABLE_LOADED__=true;psbCatalogSyncedAt=Date.now();psbShippingSyncedAt=Date.now();showToast=()=>{};router=()=>{};trackEvent=()=>{};saveCart=()=>{};psbSaveDestination({cep:'76820680',city:'Porto Velho',uf:'RO'});saveSellerOffers([{offerKey:'test',sellerId:'juninho-pipas',scope:'all',active:true}]);cart=[{key:'mucha-unit-juninho',slug:'mucha',nome:'Mucha',categoria:'pipas',variacao:'50cm - Unidade',qty:1,preco:2.5,sellerId:'juninho-pipas'}];`);
 return {...a,fields};
}
test('timeout mantém carrinho; repetição confirma o mesmo número sem abrir popup',async()=>{
 const bodies=[];const a=checkout(async(_url,opts)=>{const body=JSON.parse(opts.body);bodies.push(body);if(bodies.length===1)throw new Error('timeout');return {ok:true,json:async()=>({confirmed:true,order_number:body.p_order.id})};});
 a.context.open=()=>{throw new Error('Não deve abrir janela após await');};
 await a.run('sendOrderWhatsApp()');assert.equal(a.run('cart.length'),1);assert.equal(a.run('loadOrders().length'),0);
 await a.run('sendOrderWhatsApp()');assert.equal(bodies[0].p_order.id,bodies[1].p_order.id);assert.equal(a.run('cart.length'),0);assert.equal(a.run('loadOrders().length'),0);assert.match(a.run('psbCheckoutReceiptMarkup()'),/Continuar no WhatsApp/);
});
test('clique duplo gera uma única requisição',async()=>{
 let resolve;let calls=0;const a=checkout(async(_u,o)=>{calls++;await new Promise(r=>resolve=r);return {ok:true,json:async()=>({confirmed:true,order_number:JSON.parse(o.body).p_order.id})};});
 const first=a.run('sendOrderWhatsApp()');await a.run('sendOrderWhatsApp()');assert.equal(calls,1);resolve();await first;
});
test('CEP divergente não envia pedido',async()=>{let calls=0;const a=checkout(async()=>{calls++;});a.fields.ckCep.value='01001-000';await a.run('sendOrderWhatsApp()');assert.equal(calls,0);});
test('sem preço confirmado não envia pedido',async()=>{let calls=0;const a=checkout(async()=>{calls++;});a.run('window.__PSB_PRICE_TABLE_LOADED__=false');await a.run('sendOrderWhatsApp()');assert.equal(calls,0);});
test('falha de gravação não confirma status no cache',async()=>{const a=checkout();a.run("saveOrders([{id:'test',status:'aguardando-confirmacao',timeline:[]}]);updateOrderInBackend=async()=>({ok:false})");await assert.rejects(a.run("updateOrderStatus('test','pago')"));assert.equal(a.run('loadOrders()[0].status'),'aguardando-confirmacao');});
test('nenhuma oferta válida não reabre vendedor por fallback',()=>{const a=checkout();a.run('saveSellerOffers([])');assert.equal(a.run("sellersForProduct('mucha').length"),0);});
test('catálogo indisponível não habilita preços internos',async()=>{const a=checkout(async()=>({ok:false,status:503}));await a.run('loadPriceTable()');assert.equal(a.context.__PSB_PRICE_TABLE_LOADED__,false);});
test('número de pedido não depende do relógio',()=>{const a=checkout();const ids=a.run('Array.from({length:1000},()=>createOrderId())');assert.equal(new Set(ids).size,1000);});
