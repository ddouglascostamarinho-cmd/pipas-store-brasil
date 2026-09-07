function psbRenderCatalogAdmin(){
 if(!window.__PSB_PRICE_TABLE_LOADED__)return '';
 return `<section class="section-sm"><div class="container"><h2>Preços do catálogo</h2><p>Os valores salvos aqui são usados pela loja e pela validação dos pedidos.</p>${products.map(p=>`<details class="card" style="padding:18px;margin-top:12px"><summary>${psbEscape(p.nome)}</summary><div style="margin-top:16px">${p.variacoes.map((v,i)=>`<label for="price_${p.slug}_${i}" style="display:block;margin-top:12px">${psbEscape(v.label)}</label><input id="price_${p.slug}_${i}" class="form-control" type="number" min="0" max="1000000" step="0.01" value="${v.preco}">`).join('')}${rabiolaTierFor(p.slug)?`<p style="margin-top:16px">Faixas por quantidade</p>${Object.entries(rabiolaTierFor(p.slug)).map(([key,value])=>`<label for="tier_${p.slug}_${key}">${({base:'Preço unitário',bulkMinQty:'Quantidade mínima para desconto',bulkPrice:'Preço com desconto',superBulkMinQty:'Quantidade mínima de lojista',superBulkPrice:'Preço de lojista'})[key]}</label><input id="tier_${p.slug}_${key}" class="form-control" type="number" min="0" step="${key.includes('Qty')?'1':'0.01'}" value="${value}">`).join('')}`:''}<button class="btn btn-primary" style="margin-top:16px" onclick="psbSaveCatalogPrice('${p.slug}',this)">Salvar preços de ${psbEscape(p.nome)}</button></div></details>`).join('')}</div></section>`;
}
async function psbSaveCatalogPrice(slug,button){
 const product=bySlug(slug);if(!product)return;
 const variations=product.variacoes.map((v,i)=>({...v,preco:Number(document.getElementById(`price_${slug}_${i}`).value)}));
 let tiers=rabiolaTierFor(slug);if(tiers)tiers=Object.fromEntries(Object.keys(tiers).map(k=>[k,Number(document.getElementById(`tier_${slug}_${k}`).value)]));
 if(variations.some(v=>!Number.isFinite(v.preco)||v.preco<0||v.preco>1000000)||tiers&&Object.values(tiers).some(v=>!Number.isFinite(v)||v<=0)) {showToast('Revise os valores informados.');return;}
 if(tiers&&(!Number.isInteger(tiers.bulkMinQty)||tiers.superBulkMinQty&&(!Number.isInteger(tiers.superBulkMinQty)||tiers.superBulkMinQty<=tiers.bulkMinQty))){showToast('Revise as quantidades das faixas de desconto.');return;}
 if(tiers)variations.forEach(v=>v.preco=tiers.base);
 button.disabled=true;
 try{
  if(!await psbEnsureAuthSession())throw new Error('Sessão expirada');
  const url=supabaseRestBase()+'/psb_catalog_products?slug=eq.'+encodeURIComponent(slug)+'&updated_at=eq.'+encodeURIComponent(product.catalogUpdatedAt);
  const res=await fetch(url,{method:'PATCH',headers:supabaseHeaders('return=representation'),body:JSON.stringify({variations,tiers,updated_at:new Date().toISOString()}),signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw new Error('Falha de gravação');
  const rows=await res.json();if(rows.length!==1){showToast('O preço mudou em outra sessão. Recarregue o catálogo antes de salvar.');return;}
  product.variacoes=rows[0].variations;product.catalogUpdatedAt=rows[0].updated_at;
  if(rows[0].tiers)RABIOLA_PRICE_TIERS[slug]=rows[0].tiers;
  showToast('Preços confirmados no catálogo.');
 }catch{showToast('Não foi possível confirmar a gravação dos preços.');}
 finally{button.disabled=false;}
}
