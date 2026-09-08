/* Presentation only: prices, SKU labels and purchase eligibility stay authoritative. */
function psbDisplayEscape(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function psbPipaChoices(product) {
  if (product.categoria !== 'pipas' || !product.variacoes.length) return null;
  const choices = product.variacoes.map(v => {
    const match = v.label.match(/^(\d+(?:[.,]\d+)?\s*cm)\s*-\s*(Unidade|Pacote\s+\d+\s*un)(?:\s+(com|sem)\s+rabiola)?$/i);
    if (!match) return null;
    return {label:v.label, size:match[1], pack:match[2], tail:match[3] ? match[3].toLowerCase()+' rabiola' : 'Conforme unidade'};
  });
  // Unknown or duplicate option shapes keep the complete, original selector.
  if (choices.some(c => !c) || new Set(choices.map(c => [c.size,c.pack,c.tail].join('|'))).size !== choices.length) return null;
  return choices;
}
function psbChoiceSelect(id, title, values, selected) {
  return `<div class="choice-field"><label class="form-label" for="${id}">${title}</label><select id="${id}" class="form-control" onchange="psbChangePipaChoice('${id}')">${[...new Set(values)].map(v => `<option value="${psbDisplayEscape(v)}" ${v===selected?'selected':''}>${psbDisplayEscape(v)}</option>`).join('')}</select></div>`;
}
function psbPipaControls(choices, selected) {
  const sized = choices.filter(c => c.size===selected.size);
  const packed = sized.filter(c => c.pack===selected.pack);
  return `<fieldset class="pipa-choices"><legend>Monte sua opção</legend>${psbChoiceSelect('pipaSize','Tamanho',choices.map(c=>c.size),selected.size)}${psbChoiceSelect('pipaPack','Apresentação',sized.map(c=>c.pack),selected.pack)}${packed.some(c=>c.tail!=='Conforme unidade')?psbChoiceSelect('pipaTail','Rabiola',packed.map(c=>c.tail),selected.tail):''}</fieldset>`;
}
function psbVariationMarkup(product) {
  const choices = psbPipaChoices(product);
  const label = product.categoria==='carretilhas'?'Tamanho / modelo':'Variação';
  return `${choices?`<div id="pipaChoiceControls">${psbPipaControls(choices,choices[0])}</div>`:''}<label class="form-label ${choices?'sr-only':''}" for="variationSelect">${label}</label><select id="variationSelect" class="form-control" ${choices?'hidden':''} onchange="updatePrice()">${product.variacoes.map(v=>`<option value="${psbDisplayEscape(v.label)}">${psbDisplayEscape(v.label)} — ${money(v.preco)}</option>`).join('')}</select><p class="selected-option" id="selectedOption" aria-live="polite" ${choices?'': 'hidden'}>${psbDisplayEscape(product.variacoes[0].label)}</p>`;
}
function psbChangePipaChoice(changed) {
  const product = bySlug(location.hash.split('/')[2] || '');
  const choices = product && psbPipaChoices(product);
  if (!choices) return;
  const size = document.getElementById('pipaSize').value;
  const pack = document.getElementById('pipaPack').value;
  const tail = document.getElementById('pipaTail')?.value;
  const sized = choices.filter(c=>c.size===size);
  const packed = sized.filter(c=>c.pack===pack);
  const next = packed.find(c=>c.tail===tail) || packed[0] || sized[0];
  if (!next) return;
  document.getElementById('variationSelect').value = next.label;
  document.getElementById('pipaChoiceControls').innerHTML = psbPipaControls(choices,next);
  document.getElementById('selectedOption').textContent = next.label;
  document.getElementById(changed)?.focus();
  updatePrice();
}
function psbProductDescription(product) {
  if(product.slug==='mucha') return 'Pipa Mucha. Escolha o tamanho e a apresentação: unidade ou pacote, conforme as opções disponíveis abaixo.';
  if(product.slug==='carretilhas-madeira') return 'Carretilhas de madeira em diferentes tamanhos. Escolha a medida abaixo e consulte a loja sobre as estampas disponíveis.';
  if(product.categoria==='rabiolas') return psbDisplayEscape(product.nome)+'. Confira a apresentação e o desconto por quantidade abaixo.';
  if(product.desc==='Material de alta qualidade e performance, ideal para a prática da cultura pipeira.') return psbDisplayEscape(product.nome)+'. Compare as opções disponíveis abaixo e escolha a medida ou apresentação para seu pedido.';
  return psbDisplayEscape(product.desc);
}
function psbPurchaseGuide() {
  return '<div class="purchase-guide"><strong>Como funciona sua compra</strong><ol><li>Consulte seu CEP e adicione os produtos.</li><li>Registre seu pedido no site.</li><li>Continue no WhatsApp: a loja confirma disponibilidade, frete, prazo e pagamento.</li></ol><p>O frete é confirmado antes do pagamento.</p></div>';
}
function psbProductInformation(product) {
  if(product.categoria==='linhas') return 'A comercialização, posse e uso de determinados tipos de linha seguem regras específicas e devem observar cadastro, autorização, locais apropriados e legislação vigente.';
  if(product.categoria==='rabiolas') return 'A quantidade se refere à apresentação selecionada. Os descontos são calculados automaticamente conforme a quantidade e a tabela atual. Confirme a cor e o conteúdo do pacote com a loja antes do pagamento.';
  if(product.categoria==='pipas') return 'Confira o tamanho e a apresentação selecionados. As opções de pacote indicam se incluem rabiola. Para a unidade, confirme os acessórios com a loja. Consulte a disponibilidade da estampa desejada antes do pagamento.';
  if(product.categoria==='carretilhas') return 'A foto apresenta modelos da coleção. Confira o tamanho selecionado e confirme a estampa e os acessórios incluídos com a loja antes do pagamento.';
  return 'Confira a medida e a apresentação selecionadas. A loja confirma disponibilidade, conteúdo do pedido, prazo e frete antes do pagamento.';
}
