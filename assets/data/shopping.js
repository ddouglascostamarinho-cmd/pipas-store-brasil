/* Purchase guidance uses the same seller rules and catalog as checkout. */
function psbPaymentMethods(delivery) {
  const options=['Pix com envio de comprovante no WhatsApp','Link de pagamento enviado manualmente','Transferência sob validação manual'];
  if(delivery==='Retirada grátis na loja')options.push('Cartão presencial na retirada','Dinheiro na retirada');
  return options;
}
function psbPaymentOptions(delivery, selected='') {
  return psbPaymentMethods(delivery).map(value=>`<option ${value===selected?'selected':''}>${psbEscape(value)}</option>`).join('');
}
function psbDeliveryChanged() {
  const payment=document.getElementById('ckPayment');
  if(payment)payment.innerHTML=psbPaymentOptions(document.getElementById('ckDelivery').value,payment.value);
  const pickup=document.getElementById('ckDelivery')?.value==='Retirada grátis na loja';
  const address=document.getElementById('checkoutAddress');if(address)address.hidden=pickup;
}
function psbMinimumForSeller(sellerId) {
  return Number(psbGetShippingSetting(sellerId).externalMinOrder || PSB_EXTERNAL_DEFAULT_MIN_ORDER);
}
function psbProductShippingInfo(product, sellerId) {
  const minimum=psbMinimumForSeller(sellerId);
  const availability=psbSellerProductAvailability(sellerId,product);
  const type=psbDestinationType();
  if(type==='external' && !availability.ok)return `<p class="shipping-purchase-note" role="status">${psbEscape(availability.reason)}</p>`;
  if(type==='local')return '<p class="shipping-purchase-note">Retirada grátis na loja. Entrega em Porto Velho com taxa confirmada no atendimento.</p>';
  return `<p class="shipping-purchase-note" role="status"><strong>Envio para outras cidades: mínimo de ${money(minimum)} em produtos desta loja.</strong><br>Frete e prazo confirmados pelo WhatsApp antes do pagamento.${type==='unknown'?' Consulte seu CEP para verificar os produtos disponíveis.':''}</p>`;
}
function psbUpdateProductShipping() {
  const p=bySlug(psbRoute().slug);if(!p)return;
  const sellerId=document.getElementById('sellerSelect')?.value || psbAvailableSellersForProduct(p)[0]?.id || sellersForProduct(p.slug)[0]?.id;
  const node=document.getElementById('productShippingInfo');
  if(node&&sellerId)node.innerHTML=psbProductShippingInfo(p,sellerId);
}
function psbMinimumProgress() {
  if(psbDestinationType()!=='external')return '';
  return Object.values(groupCartBySeller()).map(group=>{
    const minimum=psbMinimumForSeller(group.seller.id),subtotal=sellerTotals(group.seller.id);
    const remaining=Math.max(0,Math.round((minimum-subtotal)*100)/100);
    const suggestions=remaining?products.filter(p=>!group.items.some(i=>i.slug===p.slug)&&sellersForProduct(p.slug).some(s=>s.id===group.seller.id)&&psbSellerProductAvailability(group.seller.id,p).ok).slice(0,3):[];
    return `<section class="minimum-progress" aria-label="Mínimo de envio da loja ${psbEscape(group.seller.nome)}"><strong>${psbEscape(group.seller.nome)}</strong><p>${remaining?`Faltam <strong>${money(remaining)}</strong> para atingir o mínimo de envio de ${money(minimum)}.`:'Mínimo de envio atingido. Frete confirmado antes do pagamento.'}</p><progress max="${minimum}" value="${Math.min(subtotal,minimum)}" aria-label="${money(subtotal)} de ${money(minimum)}"></progress>${suggestions.length?`<p class="text-gray">Complete seu pedido nesta loja:</p><div class="cart-suggestions">${suggestions.map(p=>`<a href="/produto/${p.slug}">${psbEscape(p.nome)} <span>${productPriceLabel(p)}</span></a>`).join('')}</div>`:''}</section>`;
  }).join('');
}
function psbProductSpecs(product) {
  const options=psbPipaChoices(product);
  const pairs=[['Modelo',product.nome]];
  if(options){
    pairs.push(['Tamanhos disponíveis',[...new Set(options.map(v=>v.size))].join(', ')]);
    pairs.push(['Apresentações',[...new Set(options.map(v=>v.pack))].join(' ou ')]);
    pairs.push(['Estampa e acessórios','Confirme a estampa desejada e os acessórios da opção escolhida com a loja.']);
  } else pairs.push(['Opções de compra',product.variacoes.map(v=>v.label).join(' · ')]);
  return `<details class="product-specs" open><summary>Detalhes do produto</summary><dl>${pairs.map(([key,value])=>`<div><dt>${psbEscape(key)}</dt><dd>${psbEscape(value)}</dd></div>`).join('')}</dl><p>${psbProductInformation(product)}</p></details>`;
}
let psbFormMemory=null;
let psbPurchaseMemory=null;
function psbRememberInputs() {
  if(psbRoute().page==='checkout')psbFormMemory=Object.fromEntries(['Name','Phone','Obs'].map(k=>[k,document.getElementById('ck'+k)?.value||'']));
  if(psbRoute().page==='produto')psbPurchaseMemory={slug:psbRoute().slug,variation:document.getElementById('variationSelect')?.value,qty:document.getElementById('qtyInput')?.value};
}
function psbAfterRender() {
  if(psbRoute().page==='checkout'){
    if(psbFormMemory)for(const [k,v] of Object.entries(psbFormMemory)){const node=document.getElementById('ck'+k);if(node)node.value=v;}
    psbDeliveryChanged();
  }
  if(psbRoute().page==='produto'&&psbPurchaseMemory?.slug===psbRoute().slug){
    const p=bySlug(psbRoute().slug),selected=p.variacoes.find(v=>v.label===psbPurchaseMemory.variation);
    if(selected){
      document.getElementById('variationSelect').value=selected.label;
      document.getElementById('qtyInput').value=psbPurchaseMemory.qty;
      const choices=psbPipaChoices(p),controls=document.getElementById('pipaChoiceControls');
      if(choices&&controls)controls.innerHTML=psbPipaControls(choices,choices.find(c=>c.label===selected.label));
      const label=document.getElementById('selectedOption');if(label)label.textContent=selected.label;
      updatePrice();
    }
    psbPurchaseMemory=null;
  }
}
function psbDeliveryDetails() {
  return `<div class="delivery-info"><p>O pedido é registrado no site. A loja confirma disponibilidade, prazo e frete pelo WhatsApp antes de você pagar.</p><div class="grid-3"><section><h2>Retirada na loja</h2><p>Grátis em Porto Velho. Aguarde a confirmação de que o pedido está pronto antes de se deslocar.</p><p>${psbEscape(STORE.endereco)}, ${psbEscape(STORE.bairro)}.</p></section><section><h2>Entrega local</h2><p>Entrega em Porto Velho com taxa e prazo combinados no atendimento, conforme o endereço e os produtos.</p></section><section><h2>Outras cidades</h2><p>Consulte seu CEP para verificar disponibilidade. O mínimo é calculado por loja, sem incluir o frete.</p><ul>${approvedStores().map(s=>`<li>${psbEscape(s.nome)}: a partir de <strong>${money(psbMinimumForSeller(s.id))}</strong> em produtos, conforme as regras de envio.</li>`).join('')}</ul></section></div><h2>Frete e prazo</h2><p>O valor considera destino, peso e volume da embalagem. Produtos grandes ou frágeis podem precisar de confirmação adicional. O prazo de preparação e a previsão de entrega são informados no atendimento; o registro do pedido não confirma postagem nem estoque.</p><h2>Atendimento</h2><p>${psbEscape(STORE.horarios)}.</p><p>Pedidos enviados fora do horário ficam registrados para atendimento na próxima abertura.</p><a href="${getWaLink(STORE.waGeral,'Olá! Quero consultar as condições de entrega.')}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Consultar entrega pelo WhatsApp</a></div>`;
}
