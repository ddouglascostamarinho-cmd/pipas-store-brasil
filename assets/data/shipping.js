/* ========================================================================
   FASE 1.6.2/1.6.3 - CEP, bloqueio de produtos e portal de envio externo
   - Cliente informa CEP e o site identifica Porto Velho x envio externo.
   - Produtos não permitidos para envio externo são bloqueados/ocultados.
   - Pedido mínimo externo por loja é validado no carrinho/checkout.
   - Portal do lojista edita configuração de envio externo, categorias e exceções por produto.
   ======================================================================== */
var PSB_DESTINATION_STORAGE_KEY = 'psb_customer_destination_16';
var PSB_SHIPPING_SETTINGS_STORAGE_KEY = 'psb_seller_shipping_settings_16';
var PSB_SHIPPING_RULES_STORAGE_KEY = 'psb_seller_shipping_rules_16';
var PSB_EXTERNAL_DEFAULT_MIN_ORDER = 90;
var PSB_DEFAULT_SHIPPING_SETTINGS = [
    { sellerId:'juninho-pipas', sellerName:'Juninho Pipas', originCep:'76820-680', originCity:'Porto Velho', originUf:'RO', localCity:'Porto Velho', localUf:'RO', allowExternalShipping:true, externalMinOrder:90, localDeliveryMessage:'Retirada local em Porto Velho ou entrega local combinada no atendimento.', externalShippingMessage:'Envio para fora de Porto Velho disponível a partir de R$ 90,00 em produtos.' },
    { sellerId:'pipas-store-brasil', sellerName:'Apex Rabiolas', originCep:'76820-680', originCity:'Porto Velho', originUf:'RO', localCity:'Porto Velho', localUf:'RO', allowExternalShipping:true, externalMinOrder:90, localDeliveryMessage:'Retirada local em Porto Velho ou entrega local combinada no atendimento.', externalShippingMessage:'Envio para fora de Porto Velho disponível a partir de R$ 90,00 em produtos.' }
];
var PSB_SHIPPING_CATEGORY_DEFAULTS = {
    linhas: 'normal',
    rabiolas: 'normal',
    carretilhas: 'normal',
    folhas: 'normal',
    colas: 'normal',
    pipas: 'package_only',
    fibras: 'quote_only',
    bambu: 'quote_only',
    formas: 'quote_only'
};
function psbDefaultShippingRules(){
    var sellers = PSB_DEFAULT_SHIPPING_SETTINGS;
    var rules = [];
    sellers.forEach(function(seller){
        rules.push({ ruleKey:seller.sellerId + '::all', sellerId:seller.sellerId, sellerName:seller.sellerName, scope:'all', categorySlug:'', productSlug:'', allowLocalSale:true, allowExternalSale:false, externalSaleMode:'blocked', externalMinQty:1, externalMinOrder:90, externalMessage:'Venda local liberada. Envio externo depende das categorias/produtos habilitados pela loja.', priority:100, active:true });
        Object.keys(PSB_SHIPPING_CATEGORY_DEFAULTS).forEach(function(cat){
            var mode = PSB_SHIPPING_CATEGORY_DEFAULTS[cat];
            rules.push({ ruleKey:seller.sellerId + '::cat::' + cat, sellerId:seller.sellerId, sellerName:seller.sellerName, scope:'category', categorySlug:cat, productSlug:'', allowLocalSale:true, allowExternalSale:mode !== 'blocked', externalSaleMode:mode, externalMinQty:1, externalMinOrder:90, externalMessage:psbModeMessage(mode, cat), priority:20, active:true });
        });
    });
    return rules;
}
function psbRead(key, fallback){
    try{
        var raw = localStorage.getItem(key);
        if(!raw) return fallback;
        var parsed = JSON.parse(raw);
        return parsed || fallback;
    }catch(error){
        console.warn('Falha ao carregar ' + key, error);
        return fallback;
    }
}
function psbWrite(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function psbNormalizeBool(value, fallback){
    if(typeof value === 'boolean') return value;
    if(value === 'true' || value === 'sim' || value === '1' || value === 1) return true;
    if(value === 'false' || value === 'nao' || value === 'não' || value === '0' || value === 0) return false;
    return fallback;
}
function psbNormalizeShippingSetting(row){
    return {
        sellerId: row.sellerId || row.seller_id || '',
        sellerName: row.sellerName || row.seller_name || '',
        originCep: row.originCep || row.origin_cep || '',
        originCity: row.originCity || row.origin_city || 'Porto Velho',
        originUf: row.originUf || row.origin_uf || 'RO',
        localCity: row.localCity || row.local_city || 'Porto Velho',
        localUf: row.localUf || row.local_uf || 'RO',
        allowExternalShipping: psbNormalizeBool(row.allowExternalShipping ?? row.allow_external_shipping, true),
        externalMinOrder: Number(row.externalMinOrder ?? row.external_min_order ?? PSB_EXTERNAL_DEFAULT_MIN_ORDER) || PSB_EXTERNAL_DEFAULT_MIN_ORDER,
        localDeliveryMessage: row.localDeliveryMessage || row.local_delivery_message || 'Retirada local em Porto Velho ou entrega local combinada no atendimento.',
        externalShippingMessage: row.externalShippingMessage || row.external_shipping_message || 'Envio para fora de Porto Velho disponível conforme regra da loja.',
        active: row.active !== false
    };
}
function psbNormalizeShippingRule(row){
    return {
        ruleKey: row.ruleKey || row.rule_key || '',
        sellerId: row.sellerId || row.seller_id || '',
        sellerName: row.sellerName || row.seller_name || '',
        scope: row.scope || 'all',
        categorySlug: row.categorySlug || row.category_slug || '',
        productSlug: row.productSlug || row.product_slug || '',
        allowLocalSale: psbNormalizeBool(row.allowLocalSale ?? row.allow_local_sale, true),
        allowExternalSale: psbNormalizeBool(row.allowExternalSale ?? row.allow_external_sale, false),
        externalSaleMode: row.externalSaleMode || row.external_sale_mode || 'blocked',
        externalMinQty: Number(row.externalMinQty ?? row.external_min_qty ?? 1) || 1,
        externalMinOrder: Number(row.externalMinOrder ?? row.external_min_order ?? PSB_EXTERNAL_DEFAULT_MIN_ORDER) || PSB_EXTERNAL_DEFAULT_MIN_ORDER,
        externalMessage: row.externalMessage || row.external_message || '',
        priority: Number(row.priority ?? 100) || 100,
        active: row.active !== false
    };
}
function psbLoadShippingSettings(){
    var data = psbRead(PSB_SHIPPING_SETTINGS_STORAGE_KEY, PSB_DEFAULT_SHIPPING_SETTINGS);
    if(!Array.isArray(data) || !data.length) data = PSB_DEFAULT_SHIPPING_SETTINGS;
    return data.map(psbNormalizeShippingSetting).filter(function(item){ return item.sellerId && item.active !== false; });
}
function psbSaveShippingSettings(items){ psbWrite(PSB_SHIPPING_SETTINGS_STORAGE_KEY, (items || []).map(psbNormalizeShippingSetting)); }
function psbLoadShippingRules(){
    var data = psbRead(PSB_SHIPPING_RULES_STORAGE_KEY, psbDefaultShippingRules());
    if(!Array.isArray(data) || !data.length) data = psbDefaultShippingRules();
    return data.map(psbNormalizeShippingRule).filter(function(item){ return item.sellerId && item.active !== false; });
}
function psbSaveShippingRules(items){ psbWrite(PSB_SHIPPING_RULES_STORAGE_KEY, (items || []).map(psbNormalizeShippingRule)); }
function psbGetShippingSetting(sellerId){
    return psbLoadShippingSettings().find(function(item){ return item.sellerId === sellerId; }) || psbNormalizeShippingSetting({ sellerId:sellerId, sellerName:getStoreById(sellerId)?.nome || sellerId });
}
function psbRuleSpecificity(rule){
    if(rule.scope === 'product') return 1;
    if(rule.scope === 'category') return 2;
    return 3;
}
function psbGetShippingRule(sellerId, product){
    var rules = psbLoadShippingRules().filter(function(rule){ return rule.sellerId === sellerId && rule.active !== false; });
    var candidates = rules.filter(function(rule){
        if(rule.scope === 'product') return rule.productSlug === product.slug;
        if(rule.scope === 'category') return rule.categorySlug === product.categoria;
        return rule.scope === 'all';
    });
    candidates.sort(function(a,b){ return psbRuleSpecificity(a) - psbRuleSpecificity(b) || (a.priority || 100) - (b.priority || 100); });
    return candidates[0] || psbNormalizeShippingRule({ sellerId:sellerId, scope:'all', allowLocalSale:true, allowExternalSale:false, externalSaleMode:'blocked', externalMinOrder:PSB_EXTERNAL_DEFAULT_MIN_ORDER });
}
function psbNormalizeCep(value){ return String(value || '').replace(/\D/g,'').slice(0,8); }
function psbFormatCep(value){ var cep = psbNormalizeCep(value); return cep.length === 8 ? cep.slice(0,5) + '-' + cep.slice(5) : cep; }
function psbDestination(){ return psbRead(PSB_DESTINATION_STORAGE_KEY, null); }
function psbSaveDestination(destination){ psbWrite(PSB_DESTINATION_STORAGE_KEY, destination); }
function psbClearDestination(){ localStorage.removeItem(PSB_DESTINATION_STORAGE_KEY); router(); }
function psbDestinationKnown(){ var d = psbDestination(); return !!(d && psbNormalizeCep(d.cep).length === 8 && d.city && d.uf); }
function psbDestinationType(){
    var d = psbDestination();
    if(!d || !d.city || !d.uf) return 'unknown';
    var city = normalizeText(d.city);
    var uf = String(d.uf || '').trim().toUpperCase();
    return city === 'porto velho' && uf === 'RO' ? 'local' : 'external';
}
function psbDestinationLabel(){
    var d = psbDestination();
    if(!d || !d.city || !d.uf) return 'CEP ainda não informado';
    return psbFormatCep(d.cep) + ' • ' + d.city + '/' + String(d.uf).toUpperCase();
}
function psbDestinationStatusHtml(){
    var type = psbDestinationType();
    if(type === 'local') return '<strong>Porto Velho/RO identificado.</strong> Compra liberada para retirada ou entrega local combinada.';
    if(type === 'external') return '<strong>Envio disponível para sua região.</strong> O catálogo foi ajustado conforme as regras da loja: pedido mínimo, disponibilidade e produtos permitidos para envio.';
    return '<strong>Informe seu CEP.</strong> Consulte a disponibilidade de compra local ou envio para sua região.';
}
function psbDestinationPanel(context='loja'){
    const d=psbDestination()||{},cep=psbFormatCep(d.cep||'');
    const input=`<div class="shipping-cep-grid"><input id="psbCep_${context}" class="form-control" placeholder="00000-000" value="${cep}" maxlength="9" aria-label="CEP para consulta" inputmode="numeric" autocomplete="postal-code" oninput="psbMaskCepInput(this)" onkeydown="if(event.key==='Enter'){psbVerifyCep('${context}')}"><button class="btn btn-primary" onclick="psbVerifyCep('${context}')">Verificar CEP</button></div>`;
    if(psbDestinationKnown())return `<div id="psbDestinationCard" class="card shipping-cep-card shipping-confirmed"><div><strong>Entrega para ${psbEscape(d.city)}/${psbEscape(d.uf)}</strong><p>CEP ${cep} · ${psbDestinationType()==='local'?'Retirada ou entrega local':'Frete confirmado antes do pagamento'}</p></div><details><summary>Alterar CEP</summary>${input}</details></div>`;
    return `<div id="psbDestinationCard" class="card shipping-cep-card"><h3>Consulte a entrega</h3><p class="text-gray">Informe seu CEP para verificar os produtos e as condições de envio.</p>${input}<small class="text-gray">Frete e prazo confirmados antes do pagamento.</small></div>`;
}
function psbMaskCepInput(input){
    var cep = psbNormalizeCep(input.value);
    input.value = psbFormatCep(cep);
}
async function psbVerifyCep(context){
    psbRememberInputs();
    var input = document.getElementById('psbCep_' + context) || document.getElementById('ckCep');
    var cep = psbNormalizeCep(input?.value || '');
    if(cep.length !== 8){ showToast('Informe um CEP válido com 8 números.'); return; }
    try{
        showToast('Consultando CEP...');
        var res = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
        if(!res.ok) throw new Error('CEP indisponível');
        var data = await res.json();
        if(data.erro) throw new Error('CEP não encontrado');
        var destination = {
            cep: cep,
            city: data.localidade || '',
            uf: String(data.uf || '').toUpperCase(),
            street: data.logradouro || '',
            district: data.bairro || '',
            complement: '',
            checkedAt: new Date().toISOString()
        };
        psbSaveDestination(destination);
        showToast(psbDestinationType() === 'local' ? 'CEP de Porto Velho identificado.' : 'CEP externo identificado. Regras de envio aplicadas.');
        router();
    }catch(error){
        console.warn('Falha ao consultar CEP.', error);
        showToast('Não consegui consultar esse CEP agora. Confira o número e tente novamente.');
    }
}
function psbModeLabel(mode){
    return ({ normal:'Envio externo liberado', package_only:'Fora da cidade somente pacote', quote_only:'Envio sob confirmação', blocked:'Somente local' })[mode] || 'Regra não definida';
}
function psbModeMessage(mode, categorySlug){
    if(mode === 'normal') return 'Envio externo liberado, respeitando o pedido mínimo da loja.';
    if(mode === 'package_only') return 'Fora de Porto Velho, venda somente por pacote quando houver essa opção cadastrada.';
    if(mode === 'quote_only') return 'Produto com embalagem maior. Envio externo sob confirmação operacional da loja.';
    return 'Disponível somente para venda local/retirada.';
}
function psbProductHasPackageOption(product){
    if(!product) return false;
    if(product.categoria !== 'pipas') return true;
    var text = normalizeText([product.nome, product.subtipo, product.desc, ...(product.variacoes || []).map(function(v){ return v.label; })].join(' '));
    return text.includes('pacote') || text.includes('kit') || /\b\d+\s*pipas\b/.test(text);
}
function psbSellerProductAvailability(sellerId, product){
    var type = psbDestinationType();
    var setting = psbGetShippingSetting(sellerId);
    var rule = psbGetShippingRule(sellerId, product);
    if(type === 'unknown') return { ok:true, pendingCep:true, mode:'unknown', rule:rule, setting:setting, reason:'Informe o CEP para validar envio.' };
    if(type === 'local'){
        if(rule.allowLocalSale === false) return { ok:false, mode:'blocked', rule:rule, setting:setting, reason:'Produto indisponível para venda local nesta loja.' };
        return { ok:true, mode:'local', rule:rule, setting:setting, reason:'Compra local liberada.' };
    }
    if(!setting.allowExternalShipping) return { ok:false, mode:'blocked', rule:rule, setting:setting, reason:'Esta loja não aceita envio para fora de Porto Velho.' };
    if(!rule.allowExternalSale || rule.externalSaleMode === 'blocked') return { ok:false, mode:'blocked', rule:rule, setting:setting, reason:rule.externalMessage || 'Produto disponível somente para Porto Velho.' };
    if(rule.externalSaleMode === 'package_only' && !psbProductHasPackageOption(product)) return { ok:false, mode:'package_only', rule:rule, setting:setting, reason:rule.externalMessage || 'Fora de Porto Velho, este produto é vendido somente por pacote.' };
    return { ok:true, mode:rule.externalSaleMode || 'normal', rule:rule, setting:setting, reason:rule.externalMessage || psbModeMessage(rule.externalSaleMode, product.categoria) };
}
function psbAvailableSellersForProduct(product){
    var sellers = sellersForProduct(product.slug);
    var type = psbDestinationType();
    if(type === 'unknown') return sellers;
    return sellers.filter(function(store){ return psbSellerProductAvailability(store.id, product).ok; });
}
function psbProductAvailabilityBadge(product){
    var type = psbDestinationType();
    if(type === 'unknown') return 'Informe CEP';
    var sellers = psbAvailableSellersForProduct(product);
    if(!sellers.length) return 'Somente local';
    if(type === 'local') return 'Disponível em Porto Velho';
    var modes = sellers.map(function(store){ return psbSellerProductAvailability(store.id, product).mode; });
    if(modes.includes('quote_only')) return 'Envio sob confirmação';
    if(modes.includes('package_only')) return 'Somente pacote';
    return 'Disponível para envio';
}
function psbCartIssuesForSeller(sellerId){
    if(!psbCatalogSyncedAt||!psbShippingSyncedAt)return ['Aguarde a consulta de disponibilidade. Se necessário, recarregue a página.'];
    const stale=(groupCartBySeller()[sellerId]?.items||[]).find(i=>!bySlug(i.slug)?.variacoes.some(v=>v.label===i.variacao)||!Number.isInteger(i.qty)||i.qty<1||i.qty>10000);
    if(stale)return ['Revise as variações e quantidades do carrinho antes de continuar.'];
    var issues = [];
    var destinationType = psbDestinationType();
    var group = groupCartBySeller()[sellerId];
    if(!group) return issues;
    if(!psbDestinationKnown()){
        issues.push('Informe o CEP para validar a disponibilidade de envio.');
        return issues;
    }
    group.items.forEach(function(item){
        var product = bySlug(item.slug);
        var availability = psbSellerProductAvailability(sellerId, product);
        if(!availability.ok) issues.push(item.nome + ': ' + availability.reason);
    });
    if(destinationType === 'external'){
        var setting = psbGetShippingSetting(sellerId);
        var min = Number(setting.externalMinOrder || PSB_EXTERNAL_DEFAULT_MIN_ORDER);
        if(sellerTotals(sellerId) < min) issues.push('Pedido mínimo para envio externo em ' + group.seller.nome + ': ' + money(min) + '.');
    }
    return issues;
}
function psbCartValidation(){
    var groups = Object.keys(groupCartBySeller());
    var issues = [];
    groups.forEach(function(sellerId){ issues = issues.concat(psbCartIssuesForSeller(sellerId)); });
    return { ok: issues.length === 0, issues: issues };
}
function psbGoCheckout(){
    var validation = psbCartValidation();
    if(!validation.ok){ showToast(validation.issues[0]); return; }
    psbNavigate('/checkout');
}
function psbShippingSummaryLine(sellerId){
    var type = psbDestinationType();
    if(type === 'local') return 'Retirada local ou entrega em Porto Velho combinada no atendimento.';
    if(type === 'external') return 'Envio externo com pedido mínimo de ' + money(psbGetShippingSetting(sellerId).externalMinOrder || PSB_EXTERNAL_DEFAULT_MIN_ORDER) + ' em produtos. Frete confirmado no atendimento antes do pagamento.';
    return 'Informe o CEP para validar a disponibilidade.';
}
let psbShippingPromise=null,psbShippingSyncedAt=0;
async function syncShippingFromBackend(options){
    options = options || {};
    if(!isOrdersBackendEnabled()||Date.now()-psbShippingSyncedAt<60000) return;
    if(psbShippingPromise)return psbShippingPromise;
    psbShippingPromise=(async()=>{try{
        var beforeSettings = localStorage.getItem(PSB_SHIPPING_SETTINGS_STORAGE_KEY) || '';
        var beforeRules = localStorage.getItem(PSB_SHIPPING_RULES_STORAGE_KEY) || '';
        const [settingsRes,rulesRes]=await Promise.all([
            fetch(supabaseRestBase()+'/psb_seller_shipping_settings?select=*&active=eq.true&order=seller_id.asc',{headers:supabaseHeaders('',true),signal:AbortSignal.timeout(15000)}),
            fetch(supabaseRestBase()+'/psb_seller_shipping_rules?select=*&active=eq.true&order=seller_id.asc,priority.asc',{headers:supabaseHeaders('',true),signal:AbortSignal.timeout(15000)})
        ]);
        if(!settingsRes.ok||!rulesRes.ok)throw new Error('Regras indisponíveis');
        psbShippingSyncedAt=Date.now();
        if(settingsRes && settingsRes.ok){ psbSaveShippingSettings(await settingsRes.json()); }
        if(rulesRes && rulesRes.ok){ psbSaveShippingRules(await rulesRes.json()); }
        var afterSettings = localStorage.getItem(PSB_SHIPPING_SETTINGS_STORAGE_KEY) || '';
        var afterRules = localStorage.getItem(PSB_SHIPPING_RULES_STORAGE_KEY) || '';
        if(options.rerender && (beforeSettings !== afterSettings || beforeRules !== afterRules)) router();
    }catch(error){
        console.warn('Não foi possível sincronizar regras de envio externo.');
    }finally{psbShippingPromise=null;}})();
    return psbShippingPromise;
}
function productCard(p){
const studio=psbStudioImage(p.slug,true);const image=studio||window.PSB_IMAGES?.[`${PRODUCT_IMAGE_BASE}/${p.slug}/principal.jpg`]?.thumb||getProductMainImage(p.slug);
return `<article class="card product-card premium-product-card seamless-card"><a class="product-img ${studio?'studio-image':''}" href="/produto/${p.slug}" aria-label="Ver ${p.nome}"><img src="${image}" alt="${p.nome}" loading="lazy" decoding="async" onerror="productImageFallback(this)"></a><div class="product-info"><div class="product-cat">${catName(p.categoria)}</div><div class="seamless-title"><h3 class="product-title"><a href="/produto/${p.slug}">${p.nome}</a></h3><a class="product-arrow" href="/produto/${p.slug}" aria-label="Ver produto: ${p.nome}"><span aria-hidden="true">→</span></a></div><div class="product-price">${productPriceLabel(p)}</div></div></article>`;
}
function applyFilters(){
    const c=document.getElementById('categoryFilter')?.value || 'all';
    if(psbRoute().page==='loja'){
        const path='/loja'+(c==='all'?'':'/'+c);
        if(psbRoutePath()!==path)history.replaceState({},'',path);
        psbUpdateSeo('loja',c==='all'?'':c);
    }
    const f=document.getElementById('familyFilter')?.value || 'all';
    const price=document.getElementById('priceFilter')?.value || 'all';
    const premium=document.getElementById('premiumFilter')?.checked;
    const sort=document.getElementById('sortFilter')?.value || 'relevancia';
    const q=normalizeText(document.getElementById('searchFilter')?.value || '');
    const destinationType = psbDestinationType();
    let list=[...products].filter(p => (c==='all'||p.categoria===c) && (f==='all'||p.nome===f) && (!premium || isPremium(p)) && (!q || productSearchText(p).includes(q)) && (destinationType !== 'external' || psbAvailableSellersForProduct(p).length > 0) && (price==='all' || (price==='ate20' && priceFrom(p)<=20) || (price==='20a50' && priceFrom(p)>20 && priceFrom(p)<=50) || (price==='50a100' && priceFrom(p)>50 && priceFrom(p)<=100) || (price==='acima100' && priceFrom(p)>100)));
    if(sort==='relevancia'){const featured=['mucha','carretilhas-madeira','rabiola-cotoco-curta-fita-10cm'];const rank=p=>featured.includes(p.slug)?featured.indexOf(p.slug):99;list.sort((a,b)=>rank(a)-rank(b)||relevanceScore(b)-relevanceScore(a)||a.nome.localeCompare(b.nome,'pt-BR'));}
    if(sort==='menor') list.sort((a,b)=>priceFrom(a)-priceFrom(b));
    if(sort==='maior') list.sort((a,b)=>priceFrom(b)-priceFrom(a));
    if(sort==='az') list.sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    const grid=document.getElementById('productGrid');
    const count=document.getElementById('filterCount');
    document.querySelectorAll('[data-cat-chip]').forEach(btn=>btn.classList.toggle('active', btn.dataset.catChip===c));
    if(grid){ grid.innerHTML=list.length?list.map(productCard).join(''):`<div class="empty-state premium-empty-state"><h3>Nenhum produto disponível para o CEP informado</h3><p class="text-gray">Altere o CEP, ajuste os filtros ou fale no WhatsApp para confirmar uma condição especial de envio.</p><div style="margin-top:16px;"><button class="btn btn-secondary" onclick="clearFilters()">Limpar filtros</button></div></div>`; }
    if(count) count.textContent=`${list.length} produto(s) encontrado(s)`;
    trackEvent('apply_filters',{categoria:c,familia:f,faixa:price,premium,ordenacao:sort,busca:q,resultado:list.length, destino:destinationType});
}
function renderShop(){
const chips=[{slug:'all',name:'Todos'},...categories].map(c=>`<button type="button" class="category-chip ${c.slug==='all'?'active':''}" data-cat-chip="${c.slug}" onclick="setCategoryFilter('${c.slug}')">${c.name}</button>`).join('');
return `<section class="section seamless-shop"><div class="container"><div class="seamless-shop-head"><div><p class="eyebrow">Pipas Store Brasil</p><h1>Encontre seu próximo voo.</h1></div><p>Escolha seus produtos.<br>A loja ajuda a fechar seu pedido.</p></div><div id="shopControlPanel" class="seamless-controls"><div class="shop-search-row"><label class="search-wrap"><span class="sr-only">Buscar produtos</span><input id="searchFilter" class="form-control shop-search-input" placeholder="Busque por produto, modelo ou tamanho" oninput="applyFilters()"></label><button class="btn btn-secondary" onclick="clearFilters()">Limpar</button></div><div class="category-chip-row" aria-label="Categorias do catálogo">${chips}</div></div><details class="seamless-filters"><summary>Filtros e opções de entrega</summary><div class="seamless-filter-grid"><div><label class="form-label" for="categoryFilter">Categoria</label><select id="categoryFilter" class="form-control" onchange="fillFamilyOptions();applyFilters()"><option value="all">Todas</option>${categories.map(c=>`<option value="${c.slug}">${c.name}</option>`).join('')}</select></div><div><label class="form-label" for="familyFilter">Produto</label><select id="familyFilter" class="form-control" onchange="applyFilters()"><option value="all">Todos</option></select></div><div><label class="form-label" for="priceFilter">Preço</label><select id="priceFilter" class="form-control" onchange="applyFilters()"><option value="all">Todos</option><option value="ate20">Até R$ 20</option><option value="20a50">R$ 20 a R$ 50</option><option value="50a100">R$ 50 a R$ 100</option><option value="acima100">Acima de R$ 100</option></select></div><div><label class="form-label" for="sortFilter">Ordenação</label><select id="sortFilter" class="form-control" onchange="applyFilters()"><option value="relevancia">Destaques</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option><option value="az">A–Z</option></select></div><label class="seamless-checkbox"><input id="premiumFilter" type="checkbox" onchange="applyFilters()"> Somente premium</label></div>${psbDestinationPanel('loja')}</details><p id="filterCount" class="text-gray seamless-count" role="status"></p><div class="grid-4" id="productGrid"></div><div class="seamless-trust"><span>Lojas homologadas</span><span>Pedido registrado no site</span><span>Atendimento humano</span></div></div></section>`;
}
function renderProduct(slug){
    const p = bySlug(slug);
    if(!p) return renderNotFound();
    trackEvent('view_product',{slug});
    const allProductSellers = sellersForProduct(p.slug);
    const availableSellers = psbAvailableSellersForProduct(p);
    const sellers = availableSellers.length ? availableSellers : allProductSellers;
    const rule = getProductRule(p.slug);
    const defaultSeller = sellers.find(s=>s.id === (rule.default_seller || DEFAULT_SELLER_ID)) || sellers[0] || getStoreById(DEFAULT_SELLER_ID);
    const related = products.filter(x=>x.categoria===p.categoria && x.slug!==p.slug).slice(0,4);
    const originalImage=getProductMainImage(p.slug);
    const mainImage=psbStudioImage(p.slug)||originalImage;
    const galleryImages=[...new Set([mainImage,originalImage,...getProductGalleryImages(p.slug)])];
    const thumbsHtml = galleryImages.map((img,i)=>{ const active = i===0 ? 'active' : ''; const initialStyle = i===0 ? 'display:block;' : 'display:none;'; const onError = i===0 ? 'productImageFallback(this); galleryThumbLoaded(this)' : 'galleryThumbError(this)'; return `<img class="gallery-thumb ${active}" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" src="${img}" alt="${p.nome}" style="${initialStyle}" onload="galleryThumbLoaded(this)" onerror="${onError}" onclick="setProductMainImage('${img}', this)">`; }).join('');
    const noDestination = !psbDestinationKnown();
    const noAvailable = psbDestinationKnown() && !availableSellers.length;
    const sellerHtml = sellers.length > 1 ? `<div class="form-group product-seller-select"><label class="form-label" for="sellerSelect">Escolha a loja vendedora</label><select id="sellerSelect" class="form-control" onchange="psbUpdateProductShipping()">${sellers.map(store=>`<option value="${store.id}" ${store.id === defaultSeller.id ? 'selected' : ''}>${store.nome} — ${store.label}</option>`).join('')}</select></div><p class="text-gray product-seller-note">${productSellerNote(p.slug)}</p>` : `<p class="text-gray product-seller-note"><strong style="color:var(--c-white);">${defaultSeller.nome}</strong> — ${defaultSeller.label}. ${productSellerNote(p.slug)}</p>`;
    const addDisabled = noDestination || noAvailable || !psbCatalogSyncedAt || !psbShippingSyncedAt;
    const ruleWarning = noDestination ? 'Informe seu CEP para liberar a compra e validar disponibilidade.' : (noAvailable ? 'Produto indisponível para envio ao CEP informado. Altere o CEP ou fale no WhatsApp.' : psbSellerProductAvailability(defaultSeller.id, p).reason);
    return `<section class="section product-section seamless-product"><div class="container"><div class="product-breadcrumb text-gray"><a href="/">Home</a> / <a href="/loja">Loja</a> / ${p.nome}</div><div class="product-detail-grid product-detail-compact"><div class="product-gallery-panel"><div class="gallery-main" role="button" tabindex="0" aria-label="Ampliar foto do produto" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}" onclick="openLightbox(this.querySelector('img').src)"><img data-product-main-image src="${mainImage}" alt="${p.nome}" onerror="productImageFallback(this)"></div><div class="gallery-thumbs" aria-label="Galeria do produto">${thumbsHtml}</div><p class="product-gallery-hint text-gray">${psbStudioImage(p.slug)?'Imagem de apresentação com fundo tratado por IA. A segunda miniatura mostra a fotografia original.':'Toque nas miniaturas para ver outras fotos do produto.'}</p></div><div class="product-buy-panel"><div class="tag-badge">${catName(p.categoria)}</div><h1 class="pd-title">${p.nome}</h1><p class="text-gray product-short-desc">${psbProductDescription(p)}</p><div class="card seller-card"><strong class="text-yellow">Loja vendedora</strong>${sellerHtml}<div class="marketplace-note product-rule-note"><strong>Disponibilidade para seu CEP</strong>${ruleWarning}</div></div><div class="product-price-row"><div id="pdPrice" class="pd-price">${money(p.variacoes[0].preco)}</div></div>${RABIOLA_SLUGS.includes(p.slug) ? `<p id="pdBulkNote" class="marketplace-note" style="margin:0 0 14px; padding:10px 12px; font-size:.86rem;">${productBulkNote(p, 1)}</p>` : ``}<div class="product-form-grid"><div class="form-group">${psbVariationMarkup(p)}</div><div class="form-group"><label class="form-label" for="qtyInput">Quantidade</label><div class="qty-selector"><button class="qty-btn" onclick="document.getElementById('qtyInput').stepDown(); updatePrice();">-</button><input id="qtyInput" class="qty-input" type="number" min="1" value="1" oninput="updatePrice()" onchange="updatePrice()"><button class="qty-btn" onclick="document.getElementById('qtyInput').stepUp(); updatePrice();">+</button></div></div></div><div id="productShippingInfo">${psbProductShippingInfo(p,defaultSeller.id)}</div>${psbDestinationPanel('produto')}<div class="product-actions"><button class="btn btn-primary" ${addDisabled?'disabled':''} onclick="addToCart('${p.slug}')">${noDestination?'Consultar CEP para comprar':noAvailable?'Indisponível para este CEP':addDisabled?'Confirmando disponibilidade…':'Adicionar ao carrinho'}</button><button class="btn btn-success" onclick="openWhatsApp('produto','Olá! Vim do site Pipas Store Brasil e quero fazer um pedido de ${p.nome}. Pode me ajudar?','${availableSellers[0]?.phone || STORE.waGeral}')">Falar no WhatsApp</button></div>${psbPurchaseGuide()}${psbProductSpecs(p)}<div class="product-mobile-sticky"><strong id="pdStickyPrice">${money(p.variacoes[0].preco)}</strong><button class="btn btn-primary" ${addDisabled?'disabled':''} onclick="addToCart('${p.slug}')">${noDestination?'Consultar CEP':noAvailable?'Indisponível':addDisabled?'Aguarde…':'Adicionar'}</button></div></div></div>${related.length?`<div class="related-section"><h2>Produtos relacionados</h2><div class="grid-4 related-grid">${related.map(productCard).join('')}</div></div>`:''}</div></section>`;
}
function addToCart(slug){
    const p=bySlug(slug);
    if(!p||!window.__PSB_PRICE_TABLE_LOADED__||!psbCatalogSyncedAt||!psbShippingSyncedAt){showToast('Aguarde a consulta de preços e disponibilidade.');return;}
    if(!psbDestinationKnown()){
        showToast('Informe seu CEP antes de adicionar produtos ao carrinho.');
        const el = document.getElementById('psbDestinationCard');
        if(el) el.scrollIntoView({block:'center', behavior:'smooth'});
        return;
    }
    const sel=document.getElementById('variationSelect');
    const sellerSel=document.getElementById('sellerSelect');
    const qtyInput=document.getElementById('qtyInput');
    const label=sel?sel.value:p.variacoes[0].label;
    const v=p.variacoes.find(x=>x.label===label) || p.variacoes[0];
    const seller = sellerSel ? getStoreById(sellerSel.value) : (psbAvailableSellersForProduct(p)[0] || sellersForProduct(slug)[0]);
    const qty=Math.max(1, parseInt(qtyInput?.value || 1,10) || 1);
    if(!seller){showToast('Nenhuma loja disponível para este produto.');return;}
    const availability = psbSellerProductAvailability(seller.id, p);
    if(!availability.ok){ showToast(availability.reason || 'Produto indisponível para o CEP informado.'); return; }
    const key=`${slug}-${label}-${seller.id}`;
    const found=cart.find(i=>i.key===key);
    if(found){
        found.qty += qty;
        found.preco = v.preco;
        found.bulkMinQty = v.bulkMinQty || p.bulkMinQty || null;
        found.bulkPreco = v.bulkPreco || p.bulkPreco || null;
        found.shippingRuleMode = availability.mode;
    } else {
        cart.push({ key, slug, nome:p.nome, categoria:p.categoria, variacao:label, preco:v.preco, bulkMinQty: v.bulkMinQty || p.bulkMinQty || null, bulkPreco: v.bulkPreco || p.bulkPreco || null, qty, img:getProductMainImage(slug), sellerId: seller.id, sellerName: seller.nome, sellerLabel: seller.label, sellerPhone: seller.phone, shippingRuleMode: availability.mode });
    }
    saveCart();
    showToast(availability.mode === 'quote_only' ? `Produto adicionado. Envio externo sob confirmação da loja ${seller.nome}.` : `Produto adicionado ao carrinho da loja ${seller.nome}.`);
    trackEvent('add_to_cart',{slug,variacao:label,qty,preco:variationUnitPrice(p,v,qty),seller:seller.id,destino:psbDestinationType(),regra:availability.mode});
}
function renderCart(){
    if(!cart.length) return `<section class="section"><div class="container"><div class="empty-state"><h1>Seu carrinho está vazio</h1><p class="text-gray">Selecione os produtos, escolha as variações e monte seu pedido.</p><a href="/loja" class="btn btn-primary">Ir para a loja</a></div></div></section>`;
    const {subtotal,total}=totals();
    const validation = psbCartValidation();
    const issuesHtml = validation.ok ? `` : `<div class="marketplace-note warning-note"><strong>Pendência para continuar:</strong><br>${validation.issues.map(function(issue){ return '• ' + issue; }).join('<br>')}</div>`;
    return `<section class="section"><div class="container"><h1>Carrinho</h1>${psbDestinationPanel('carrinho')}${psbMinimumProgress()}${issuesHtml}<div class="shop-layout" style="grid-template-columns:1.3fr .7fr;"><div><table class="cart-table"><thead><tr><th>Produto</th><th>Variação</th><th>Qtd</th><th>Total</th><th></th></tr></thead><tbody>${cart.map(i=>`<tr><td data-label="Produto"><div class="cart-item-info"><img class="cart-item-img" src="${i.img}" alt="${i.nome}" onerror="productImageFallback(this)"><div><strong>${i.nome}</strong><div class="text-gray">${catName(i.categoria)} • Vendido por ${i.sellerName || STORE.nome}</div><div class="text-gray" style="font-size:0.82rem;">${i.sellerLabel || 'Loja oficial de referência'} • ${psbShippingSummaryLine(i.sellerId || DEFAULT_SELLER_ID)}</div></div></div></td><td data-label="Variação">${i.variacao}${itemPricingNote(i) ? `<br><small class="text-yellow">${itemPricingNote(i)}</small>` : ``}</td><td data-label="Qtd"><div style="display:flex; gap:8px; align-items:center;"><button class="qty-btn" style="width:32px;height:32px;" onclick="changeQty('${i.key}',-1)">-</button><strong>${i.qty}</strong><button class="qty-btn" style="width:32px;height:32px;" onclick="changeQty('${i.key}',1)">+</button></div></td><td data-label="Total">${money(itemTotal(i))}</td><td data-label="Ação"><button class="btn-remove" onclick="removeItem('${i.key}')">Remover</button></td></tr>`).join('')}</tbody></table></div><aside class="summary-box"><h3>Resumo</h3><div style="display:flex; justify-content:space-between; margin:14px 0; color:var(--c-gray);"><span>Subtotal</span><strong style="color:var(--c-white);">${money(subtotal)}</strong></div><div style="display:flex; justify-content:space-between; margin:14px 0; color:var(--c-gray);"><span>Frete</span><strong style="color:var(--c-white);">${psbDestinationType()==='external'?'A calcular no atendimento':'A combinar'}</strong></div><div style="display:flex; justify-content:space-between; padding-top:18px; border-top:1px solid var(--c-border); font-size:1.25rem;"><span>Total parcial</span><strong class="text-yellow">${money(total)}</strong></div><p class="text-gray" style="font-size:0.9rem; margin-top:14px;">${psbDestinationType()==='external'?'Pedido externo precisa respeitar mínimo por loja.':'Os itens são organizados por loja vendedora para facilitar o atendimento.'}</p><button class="btn btn-primary btn-block" onclick="psbGoCheckout()">Continuar</button><button class="btn btn-secondary btn-block" style="margin-top:12px;" onclick="clearCart()">Limpar carrinho</button></aside></div></div></section>`;
}
function renderCheckout(){
    if(!cart.length) return `<section class="section"><div class="container"><div class="empty-state"><h2>Nada para finalizar</h2><p class="text-gray">Monte seu carrinho antes de seguir para o checkout.</p><a href="/loja" class="btn btn-primary">Voltar para loja</a></div></div></section>`;
    trackEvent('begin_checkout',{itens:cart.length});
    const sellerGroups = Object.values(groupCartBySeller());
    const {total}=totals();
    const destination = psbDestination() || {};
    const deliveryOptions = psbDestinationType() === 'external' ? `<option selected>Envio nacional com frete dos Correios/Melhor Envio</option>` : `<option selected>Retirada grátis na loja</option><option>Entrega local com taxa a consultar</option>`;
    return `<section class="section"><div class="container"><h1>Finalizar pedido</h1><p class="text-gray checkout-intro">Envie seu pedido. A loja confirma estoque, frete e prazo pelo WhatsApp antes do pagamento.</p>${psbDestinationPanel('checkout')}<div class="shop-layout" style="grid-template-columns:1.2fr .8fr;"><div><h2 class="checkout-step">Seus dados</h2><div class="form-group"><label class="form-label" for="ckName">Nome</label><input id="ckName" name="name" autocomplete="name" maxlength="120" class="form-control" placeholder="Seu nome" required></div><div class="form-group"><label class="form-label" for="ckPhone">Telefone</label><input id="ckPhone" name="tel" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" class="form-control" placeholder="DDD e número do WhatsApp" required></div><div class="grid-2"><div class="form-group"><label class="form-label" for="ckCep">CEP</label><input id="ckCep" aria-label="CEP confirmado" readonly class="form-control" value="${psbFormatCep(destination.cep || '')}" placeholder="00000-000" maxlength="9" inputmode="numeric" oninput="psbMaskCepInput(this)"></div><div class="form-group"><label class="form-label" for="ckCity">Cidade/UF</label><input id="ckCity" readonly class="form-control" value="${psbEscape(destination.city ? destination.city + '/' + destination.uf : '')}" placeholder="Sua cidade e estado"></div></div><div id="checkoutAddress"><h2 class="checkout-step">Endereço de entrega</h2><div class="form-group"><label class="form-label" for="ckAddress">Endereço</label><input id="ckAddress" class="form-control" value="${psbEscape(destination.street || '')}" placeholder="Rua/Avenida"></div><div class="grid-2"><div class="form-group"><label class="form-label" for="ckNumber">Número</label><input id="ckNumber" class="form-control" placeholder="Número"></div><div class="form-group"><label class="form-label" for="ckDistrict">Bairro</label><input id="ckDistrict" class="form-control" value="${psbEscape(destination.district || '')}" placeholder="Bairro"></div></div><div class="form-group"><label class="form-label" for="ckComplement">Complemento</label><input id="ckComplement" class="form-control" value="${psbEscape(destination.complement || '')}" placeholder="Apartamento, referência ou complemento"></div></div><div class="form-group"><label class="form-label" for="ckDelivery">Forma de entrega</label><select id="ckDelivery" class="form-control" onchange="psbDeliveryChanged()">${deliveryOptions}</select></div><div class="form-group"><label class="form-label" for="ckPayment">Forma de pagamento desejada</label><select id="ckPayment" class="form-control">${psbPaymentOptions(psbDestinationType()==='external'?'Envio nacional com frete dos Correios/Melhor Envio':'Retirada grátis na loja')}</select></div><div class="form-group"><label class="form-label" for="ckObs">Observações</label><textarea id="ckObs" class="form-control" placeholder="Detalhes importantes do pedido"></textarea></div>${sellerGroups.length===1?psbCheckoutButton(sellerGroups[0]):sellerGroups.map(psbCheckoutButton).join('')}<p class="text-gray" style="font-size:0.9rem; margin-top:12px;">Quando houver mais de uma loja no carrinho, o checkout cria um pedido separado por loja vendedora.</p></div><aside class="summary-box"><h3>Resumo do pedido</h3>${sellerGroups.map(group=>`<div class="card" style="padding:18px; margin-bottom:14px;"><strong style="color:var(--c-white);">${group.seller.nome}</strong><div class="text-gray" style="font-size:0.85rem; margin-bottom:8px;">${group.seller.label}</div>${group.items.map(i=>`<div style="display:flex; justify-content:space-between; gap:12px; margin:10px 0; color:var(--c-gray);"><span>${i.qty}x ${i.nome}<br><small>${i.variacao}</small>${itemPricingNote(i) ? `<br><small class="text-yellow">${itemPricingNote(i)}</small>` : ``}</span><strong style="color:var(--c-white);">${money(itemTotal(i))}</strong></div>`).join('')}<div style="display:flex; justify-content:space-between; margin-top:12px; padding-top:12px; border-top:1px solid var(--c-border);"><span>Subtotal da loja</span><strong class="text-yellow">${money(sellerTotals(group.seller.id))}</strong></div><small class="text-gray">${psbShippingSummaryLine(group.seller.id)}</small></div>`).join('')}<div style="display:flex; justify-content:space-between; margin-top:16px; padding-top:16px; border-top:1px solid var(--c-border);"><span>Total parcial geral</span><strong class="text-yellow">${money(total)}</strong></div><p class="text-gray" style="font-size:0.9rem; margin-top:12px;">O valor do frete será confirmado no atendimento antes do pagamento. O pedido já registra CEP, endereço completo e regras de envio da loja.</p></aside></div></div></section>`;
}
function psbCheckoutButton(group){
    var issues = psbCartIssuesForSeller(group.seller.id);
    var disabled = issues.length ? 'disabled' : '';
    var msg = issues.length ? `<p class="text-gray" style="font-size:.86rem; margin:8px 0 14px;">${issues[0]}</p>` : '';
    return `${msg}<button data-checkout-submit class="btn btn-success btn-block" ${disabled} onclick="sendOrderWhatsApp('${group.seller.id}')">Enviar pedido para ${group.seller.nome}</button>`;
}
function psbBuildOrderPayload(sellerId, customerData){
    const seller = getStoreById(sellerId);
    const items = (groupCartBySeller()[sellerId]?.items || []);
    const subtotal = sellerTotals(sellerId);
    const itemsText = items.map(i=>`• ${i.qty}x ${i.nome} | ${i.variacao} | ${money(itemTotal(i))}${itemPricingNote(i) ? ` (${itemPricingNote(i)})` : ''}`).join('\n');
    const destinationLine = customerData.destinationType === 'external' ? 'Envio externo' : 'Compra local Porto Velho';
    const addressLine = [customerData.address, customerData.number, customerData.district, customerData.complement].filter(Boolean).join(', ');
    return { seller, subtotal, items, text: `Olá! Quero confirmar meu pedido na ${seller.nome}.\n\nCliente: ${customerData.name}\nTelefone: ${customerData.phone}\nCEP: ${customerData.cep}\nCidade/UF: ${customerData.city}\nTipo: ${destinationLine}\nEndereço: ${addressLine || 'Não informado'}\nEntrega: ${customerData.delivery}\nPagamento: ${customerData.payment}\n\nItens:\n${itemsText}\n\nSubtotal: ${money(subtotal)}\nFrete: ${customerData.destinationType === 'external' ? 'calcular por Correios/Melhor Envio' : 'retirada/entrega local a combinar'}\nRegra: ${psbShippingSummaryLine(sellerId)}\n${customerData.obs?`Observações: ${customerData.obs}\n`:''}Por favor, confirmar disponibilidade e próximos passos.` };
}

var psbOriginalRenderStorePortal = renderStorePortal;
function psbRenderSellerShippingControls(store){
    var setting = psbGetShippingSetting(store.id);
    var rules = psbLoadShippingRules();
    var modeOptions = [['normal','Enviar normalmente'], ['package_only','Somente pacote'], ['quote_only','Sob confirmação'], ['blocked','Somente local']];
    var productModeOptions = [['inherit','Usar regra da categoria'], ['normal','Enviar normalmente'], ['package_only','Somente pacote'], ['quote_only','Sob confirmação'], ['blocked','Somente local']];
    var categoryRows = categories.map(function(cat){
        var current = rules.find(function(rule){ return rule.sellerId === store.id && rule.scope === 'category' && rule.categorySlug === cat.slug; }) || psbNormalizeShippingRule({ sellerId:store.id, scope:'category', categorySlug:cat.slug, allowExternalSale:false, externalSaleMode:'blocked', externalMinOrder:setting.externalMinOrder });
        return `<div class="shipping-rule-row"><div><strong>${cat.name}</strong><small class="text-gray">${psbModeLabel(current.externalSaleMode)}</small></div><select id="ship_rule_${store.id}_${cat.slug}" class="form-control">${modeOptions.map(function(opt){ return `<option value="${opt[0]}" ${current.externalSaleMode===opt[0]?'selected':''}>${opt[1]}</option>`; }).join('')}</select></div>`;
    }).join('');
    var sellerProducts = products.filter(function(product){
        return sellersForProduct(product.slug).some(function(seller){ return seller.id === store.id; });
    }).sort(function(a,b){ return catName(a.categoria).localeCompare(catName(b.categoria),'pt-BR') || a.nome.localeCompare(b.nome,'pt-BR'); });
    var productRows = sellerProducts.map(function(product){
        var current = rules.find(function(rule){ return rule.sellerId === store.id && rule.scope === 'product' && rule.productSlug === product.slug; });
        var value = current ? current.externalSaleMode : 'inherit';
        var label = current ? psbModeLabel(current.externalSaleMode) : 'Herdando regra da categoria';
        return `<div class="shipping-rule-row"><div><strong>${product.nome}</strong><small class="text-gray">${catName(product.categoria)} • ${label}</small></div><select id="ship_product_rule_${store.id}_${product.slug}" class="form-control">${productModeOptions.map(function(opt){ return `<option value="${opt[0]}" ${value===opt[0]?'selected':''}>${opt[1]}</option>`; }).join('')}</select></div>`;
    }).join('');
    return `<section class="section-sm"><div class="container"><div class="card shipping-admin-card"><div style="display:flex; justify-content:space-between; gap:16px; align-items:start; flex-wrap:wrap;"><div><span class="tag-badge">Gestão logística</span><h2>Configuração de envio externo</h2><p class="text-gray">Defina se a loja vende para fora de Porto Velho, pedido mínimo, categorias liberadas e exceções por produto.</p></div><button class="btn btn-primary" onclick="psbSaveSellerShippingAction('${store.id}')">Salvar envio externo</button></div><div class="grid-2" style="margin-top:20px;"><div><div class="form-group"><label class="form-label" for="ship_origin_cep_${store.id}">CEP de origem da loja</label><input id="ship_origin_cep_${store.id}" class="form-control" value="${setting.originCep || ''}" placeholder="76820-680"></div><div class="grid-2"><div class="form-group"><label class="form-label" for="ship_local_city_${store.id}">Cidade local</label><input id="ship_local_city_${store.id}" class="form-control" value="${setting.localCity || 'Porto Velho'}"></div><div class="form-group"><label class="form-label" for="ship_local_uf_${store.id}">UF</label><input id="ship_local_uf_${store.id}" class="form-control" value="${setting.localUf || 'RO'}" maxlength="2"></div></div><div class="form-group"><label class="form-label" for="ship_allow_external_${store.id}">Aceita venda fora de Porto Velho?</label><select id="ship_allow_external_${store.id}" class="form-control"><option value="true" ${setting.allowExternalShipping?'selected':''}>Sim</option><option value="false" ${!setting.allowExternalShipping?'selected':''}>Não</option></select></div><div class="form-group"><label class="form-label" for="ship_min_order_${store.id}">Pedido mínimo externo em produtos</label><input id="ship_min_order_${store.id}" class="form-control" type="number" min="0" step="1" value="${setting.externalMinOrder || 90}"></div><div class="marketplace-note"><strong>Política atual</strong><br>Porto Velho compra normal. Fora de Porto Velho respeita o pedido mínimo e as permissões configuradas abaixo.</div></div><div><h3 style="font-size:1rem; color:var(--c-white);">Categorias para envio externo</h3><div class="shipping-rule-list">${categoryRows}</div><p class="text-gray" style="font-size:.86rem; margin-top:12px;">Use “Somente pacote” para pipas e itens que não devem sair em unidade. Use “Sob confirmação” para produtos grandes ou frágeis.</p></div></div><details class="card" style="margin-top:20px; padding:18px;"><summary style="cursor:pointer; font-weight:900; color:var(--c-white);">Exceções por produto da loja</summary><p class="text-gray" style="margin-top:12px;">Aqui o lojista pode liberar, bloquear ou marcar um produto específico como “somente pacote”, mesmo que a categoria tenha outra regra.</p><div class="shipping-rule-list" style="margin-top:14px;">${productRows || '<p class="text-gray">Nenhum produto vinculado a esta loja ainda.</p>'}</div></details></div></div></section>`;
}
renderStorePortal = function(){
    var html = psbOriginalRenderStorePortal();
    var session = getStoreSession();
    if(!session?.storeId) return html;
    var store = getStoreById(session.storeId);
    return html + psbRenderSellerShippingControls(store);
};
async function psbUpsertShippingSettingToBackend(setting){
    if(!isOrdersBackendEnabled()) return { ok:false, disabled:true };
    var row = { seller_id:setting.sellerId, seller_name:setting.sellerName || getStoreById(setting.sellerId)?.nome || setting.sellerId, origin_cep:setting.originCep || null, origin_city:setting.originCity || 'Porto Velho', origin_uf:setting.originUf || 'RO', local_city:setting.localCity || 'Porto Velho', local_uf:String(setting.localUf || 'RO').toUpperCase(), allow_external_shipping:!!setting.allowExternalShipping, external_min_order:Number(setting.externalMinOrder || 90), local_delivery_message:setting.localDeliveryMessage || null, external_shipping_message:setting.externalShippingMessage || null, active:true, settings_payload:setting };
    var res = await fetch(supabaseRestBase() + '/psb_seller_shipping_settings?on_conflict=seller_id', { method:'POST', headers:supabaseHeaders('resolution=merge-duplicates,return=representation'), body:JSON.stringify(row) });
    if(!res.ok){ console.warn('Falha ao salvar configuração de envio.', res.status, await res.text().catch(function(){return '';})); return { ok:false, status:res.status }; }
    return { ok:true };
}
async function psbUpsertShippingRuleToBackend(rule){
    if(!isOrdersBackendEnabled()) return { ok:false, disabled:true };
    var row = { rule_key:rule.ruleKey, seller_id:rule.sellerId, seller_name:rule.sellerName || getStoreById(rule.sellerId)?.nome || rule.sellerId, scope:rule.scope, category_slug:rule.categorySlug || null, product_slug:rule.productSlug || null, allow_local_sale:rule.allowLocalSale !== false, allow_external_sale:rule.externalSaleMode !== 'blocked', external_sale_mode:rule.externalSaleMode, external_min_qty:Number(rule.externalMinQty || 1), external_min_order:Number(rule.externalMinOrder || 90), external_message:rule.externalMessage || psbModeMessage(rule.externalSaleMode, rule.categorySlug), priority:Number(rule.priority || 20), active:true, rule_payload:rule };
    var res = await fetch(supabaseRestBase() + '/psb_seller_shipping_rules?on_conflict=rule_key', { method:'POST', headers:supabaseHeaders('resolution=merge-duplicates,return=representation'), body:JSON.stringify(row) });
    if(!res.ok){ console.warn('Falha ao salvar regra de envio.', res.status, await res.text().catch(function(){return '';})); return { ok:false, status:res.status }; }
    return { ok:true };
}
async function psbDeactivateSellerProductShippingRulesFromBackend(storeId){
    if(!isOrdersBackendEnabled()) return { ok:false, disabled:true };
    var res = await fetch(supabaseRestBase() + '/psb_seller_shipping_rules?seller_id=eq.' + encodeURIComponent(storeId) + '&scope=eq.product', { method:'PATCH', headers:supabaseHeaders('return=minimal'), body:JSON.stringify({ active:false }) });
    if(!res.ok){ console.warn('Falha ao desativar exceções antigas de produto.', res.status, await res.text().catch(function(){return '';})); return { ok:false, status:res.status }; }
    return { ok:true };
}
async function psbSaveSellerShippingAction(storeId){
    var store = getStoreById(storeId);
    var settings = psbLoadShippingSettings().filter(function(item){ return item.sellerId !== storeId; });
    var minOrder = Number(document.getElementById('ship_min_order_' + storeId)?.value || 90) || 90;
    var setting = psbNormalizeShippingSetting({ sellerId:storeId, sellerName:store.nome, originCep:document.getElementById('ship_origin_cep_' + storeId)?.value || '', originCity:'Porto Velho', originUf:'RO', localCity:document.getElementById('ship_local_city_' + storeId)?.value || 'Porto Velho', localUf:document.getElementById('ship_local_uf_' + storeId)?.value || 'RO', allowExternalShipping:document.getElementById('ship_allow_external_' + storeId)?.value === 'true', externalMinOrder:minOrder, localDeliveryMessage:'Retirada local em Porto Velho ou entrega local combinada no atendimento.', externalShippingMessage:'Envio externo disponível a partir de ' + money(minOrder) + ' em produtos.' });
    settings.push(setting);
    psbSaveShippingSettings(settings);
    var allRules = psbLoadShippingRules().filter(function(rule){ return !(rule.sellerId === storeId && (rule.scope === 'category' || rule.scope === 'product')); });
    var categoryRules = categories.map(function(cat){
        var mode = document.getElementById('ship_rule_' + storeId + '_' + cat.slug)?.value || 'blocked';
        return psbNormalizeShippingRule({ ruleKey:storeId + '::cat::' + cat.slug, sellerId:storeId, sellerName:store.nome, scope:'category', categorySlug:cat.slug, productSlug:'', allowLocalSale:true, allowExternalSale:mode !== 'blocked', externalSaleMode:mode, externalMinQty:1, externalMinOrder:minOrder, externalMessage:psbModeMessage(mode, cat.slug), priority:20, active:true });
    });
    var sellerProducts = products.filter(function(product){
        return sellersForProduct(product.slug).some(function(seller){ return seller.id === storeId; });
    });
    var productRules = sellerProducts.map(function(product){
        var mode = document.getElementById('ship_product_rule_' + storeId + '_' + product.slug)?.value || 'inherit';
        if(mode === 'inherit') return null;
        return psbNormalizeShippingRule({ ruleKey:storeId + '::product::' + product.slug, sellerId:storeId, sellerName:store.nome, scope:'product', categorySlug:product.categoria, productSlug:product.slug, allowLocalSale:true, allowExternalSale:mode !== 'blocked', externalSaleMode:mode, externalMinQty:1, externalMinOrder:minOrder, externalMessage:psbModeMessage(mode, product.categoria), priority:5, active:true });
    }).filter(Boolean);
    var nextRules = categoryRules.concat(productRules);
    psbSaveShippingRules(allRules.concat(nextRules));
    showToast('Configuração salva localmente. Sincronizando Supabase...');
    try{
        await psbUpsertShippingSettingToBackend(setting);
        await psbDeactivateSellerProductShippingRulesFromBackend(storeId);
        await Promise.all(nextRules.map(psbUpsertShippingRuleToBackend));
        await syncShippingFromBackend();
        showToast('Regras de envio externo atualizadas.');
    }catch(error){
        console.warn(error);
        showToast('Configuração salva no navegador. Verifique conexão com Supabase.');
    }
    router();
}
