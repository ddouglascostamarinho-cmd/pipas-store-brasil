const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('./harness.cjs');
const variants=[{label:'50cm - Unidade',preco:2.5},{label:'50cm - Pacote 25un sem rabiola',preco:40},{label:'50cm - Pacote 25un com rabiola',preco:60},{label:'55cm - Unidade',preco:3},{label:'55cm - Pacote 25un sem rabiola',preco:45}];
test('pipa choices retain exact catalog SKU labels; unfamiliar labels fall back',()=>{
 const app=createApp();app.context.sample={categoria:'pipas',variacoes:variants};
 assert.deepEqual(Array.from(app.run('psbPipaChoices(sample)').map(c=>c.label)),variants.map(v=>v.label));
 app.context.sample.variacoes=[{label:'Novo kit especial',preco:9}];
 assert.equal(app.run('psbPipaChoices(sample)'),null);
 assert.match(app.run('psbVariationMarkup(sample)'),/Novo kit especial/);
 assert.doesNotMatch(app.run('psbVariationMarkup(sample)'),/id="variationSelect"[^>]*hidden/);
});
test('changing size with unavailable tail preserves package and picks a valid priced SKU',()=>{
 const nodes={pipaSize:{value:'55cm',focus(){}},pipaPack:{value:'Pacote 25un'},pipaTail:{value:'com rabiola'},variationSelect:{value:variants[2].label},pipaChoiceControls:{},selectedOption:{},pdPrice:{},pdStickyPrice:{},qtyInput:{value:'1'},pdBulkNote:{}};
 const app=createApp({document:{getElementById:id=>nodes[id]||{addEventListener(){}},querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}}});
 app.context.variants=variants;app.run("bySlug('mucha').variacoes=variants; location.hash='#/produto/mucha'; psbChangePipaChoice('pipaSize')");
 assert.equal(nodes.variationSelect.value,'55cm - Pacote 25un sem rabiola');
 assert.match(nodes.pdPrice.textContent,/45,00/);
 assert.equal(nodes.pdPrice.textContent,nodes.pdStickyPrice.textContent);
 assert.equal(nodes.selectedOption.textContent,nodes.variationSelect.value);
});
test('copy describes the seller and does not mislabel the buyer as a store',()=>{
 const app=createApp();assert.doesNotMatch(app.run("productSellerNote('mucha')"),/disponível apenas para lojas/);
 assert.match(app.run("psbProductInformation(bySlug('mucha'))"),/pacote/);
 assert.doesNotMatch(app.run("psbProductInformation(bySlug('mucha'))"),/posse e uso de determinados tipos de linha/);
 assert.match(app.run('psbPurchaseGuide()'),/antes do pagamento/);
});
