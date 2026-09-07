// Checkout confirmado pelo servidor. Rascunhos ficam na sessão, fora do portal.
const PSB_CHECKOUT_DRAFT_KEY = 'psb_checkout_draft_v1';
const PSB_CHECKOUT_RECEIPTS_KEY = 'psb_checkout_receipts_v1';
let psbCheckoutBusy = false;
const psbEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function psbSessionRead(key, fallback) {
    try { return JSON.parse(sessionStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function psbCheckoutReceiptMarkup() {
    const receipts = psbSessionRead(PSB_CHECKOUT_RECEIPTS_KEY, []);
    if (!receipts.length) return '';
    return `<section class="section-sm"><div class="container"><div class="card" style="padding:24px" role="status"><h2>Pedido registrado</h2><p>A loja recebeu seu pedido. Continue no WhatsApp para confirmar disponibilidade, frete e pagamento.</p>${receipts.map(r => `<div style="margin-top:16px"><strong>${psbEscape(r.sellerName)}</strong><p style="overflow-wrap:anywhere">Pedido ${psbEscape(r.id)}</p><a class="btn btn-success" href="${psbEscape(getWaLink(r.phone,r.message))}" target="_blank" rel="noopener noreferrer">Continuar no WhatsApp</a></div>`).join('')}</div></div></section>`;
}
function psbCheckoutPendingMarkup() {
    const drafts=psbSessionRead(PSB_CHECKOUT_DRAFT_KEY,{});
    return Object.keys(drafts).map(id=>`<section class="section-sm"><div class="container"><div class="card" style="padding:24px"><h2>Confirmação pendente</h2><p>Retome sua tentativa para verificar o registro do mesmo pedido, sem duplicar.</p><button class="btn btn-primary" onclick="psbResumeDraft('${psbEscape(id)}')">Retomar pedido</button></div></div></section>`).join('');
}
async function psbResumeDraft(sellerId) {
    if(psbCheckoutBusy)return;
    const draft=psbSessionRead(PSB_CHECKOUT_DRAFT_KEY,{})[sellerId];
    if(draft)await psbCommitCheckoutDraft(sellerId,draft);
}
async function sendOrderWhatsApp(sellerId = DEFAULT_SELLER_ID) {
    if (psbCheckoutBusy) return;
    if (!window.__PSB_PRICE_TABLE_LOADED__) { showToast('Aguarde a confirmação dos preços.'); return; }
    const value = id => document.getElementById(id)?.value.trim() || '';
    const customer = Object.fromEntries(['Name','Phone','City','Cep','Address','Number','District','Complement','Delivery','Payment','Obs'].map(k=>[k.toLowerCase(), value('ck'+k)]));
    const destination = psbDestination();
    if(customer.name.length<2 || customer.name.length>120 || customer.phone.replace(/\D/g,'').length<8 || !psbDestinationKnown()) {
        showToast('Informe nome, telefone e confirme seu CEP.'); return;
    }
    if(psbNormalizeCep(customer.cep)!==psbNormalizeCep(destination.cep)) {
        showToast('O CEP foi alterado. Verifique o novo CEP antes de continuar.'); return;
    }
    customer.cep=psbFormatCep(destination.cep);
    customer.city=destination.city+'/'+destination.uf;
    customer.destinationType=psbDestinationType();
    customer.destination=destination;
    if(customer.destinationType==='external' && (!customer.address || !customer.number || !customer.district)) {
        showToast('Preencha endereço, número e bairro para o envio.'); return;
    }
    const issues=psbCartIssuesForSeller(sellerId);
    if(issues.length) { showToast(issues[0]); return; }
    const payload=psbBuildOrderPayload(sellerId,customer);
    if(!payload.items.length) { showToast('Não há itens dessa loja no carrinho.'); return; }
    const drafts=psbSessionRead(PSB_CHECKOUT_DRAFT_KEY,{});
    // Uma tentativa sem resposta deve repetir exatamente o mesmo pedido/identificador.
    const fingerprint=JSON.stringify({sellerId,customer,items:payload.items,subtotal:payload.subtotal});
    let draft=drafts[sellerId];
    if(draft && draft.fingerprint!==fingerprint) {
        showToast('Há um pedido aguardando confirmação. Retome a tentativa original antes de criar outro.');
        return;
    }
    if(!draft) {
        const now=new Date().toISOString();
        draft={fingerprint,seller:payload.seller,message:payload.text,cartItems:structuredClone(payload.items),order:{id:createOrderId(),sellerId,sellerName:payload.seller.nome,status:'aguardando-confirmacao',paymentReleased:false,createdAt:now,customer,items:payload.items.map(i=>({...i,preco:itemUnitPrice(i)})),subtotal:payload.subtotal,timeline:[{status:'aguardando-confirmacao',at:now,note:'Pedido registrado no site.'}]}};
        drafts[sellerId]=draft;
    }
    try { sessionStorage.setItem(PSB_CHECKOUT_DRAFT_KEY,JSON.stringify(drafts)); }
    catch { showToast('Não foi possível preservar sua tentativa. Libere o armazenamento do navegador antes de continuar.'); return; }
    await psbCommitCheckoutDraft(sellerId,draft);
}
async function psbCommitCheckoutDraft(sellerId,draft){
    const drafts=psbSessionRead(PSB_CHECKOUT_DRAFT_KEY,{});
    psbCheckoutBusy=true;
    const buttons=[...document.querySelectorAll('[data-checkout-submit]')];
    buttons.forEach(b=>{b.disabled=true;b.setAttribute('aria-busy','true');});
    try {
        showToast('Registrando pedido...');
        const result=await saveOrderToBackend(draft.order);
        if(!result.ok) throw new Error('Pedido não confirmado');
        const receipts=psbSessionRead(PSB_CHECKOUT_RECEIPTS_KEY,[]);
        if(!receipts.some(r=>r.id===draft.order.id)) receipts.push({id:draft.order.id,sellerName:draft.seller.nome,phone:draft.seller.phone,message:draft.message+'\n\nID do pedido: '+draft.order.id});
        sessionStorage.setItem(PSB_CHECKOUT_RECEIPTS_KEY,JSON.stringify(receipts));
        delete drafts[sellerId];
        sessionStorage.setItem(PSB_CHECKOUT_DRAFT_KEY,JSON.stringify(drafts));
        cart=cart.map(i=>{const ordered=draft.cartItems.find(o=>o.key===i.key);return ordered?{...i,qty:i.qty-ordered.qty}:i;}).filter(i=>i.qty>0);
        saveCart();
        trackEvent('order_registered',{orderId:draft.order.id,seller:sellerId,itens:draft.order.items.length,subtotal:draft.order.subtotal});
        router();
    } catch(error) {
        if(error.definitive) {
            delete drafts[sellerId];sessionStorage.setItem(PSB_CHECKOUT_DRAFT_KEY,JSON.stringify(drafts));
            showToast('Pedido não registrado. Confira os produtos e valores e tente novamente.');
        } else {
            showToast('Não recebemos a confirmação. Seu carrinho foi mantido; tente novamente para confirmar o mesmo pedido.');
        }
    } finally {
        psbCheckoutBusy=false;
        buttons.forEach(b=>{b.disabled=false;b.removeAttribute('aria-busy');});
    }
}
