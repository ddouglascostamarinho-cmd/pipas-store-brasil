/* Events are ready for a tag manager. No identifier or customer data is sent. */
let psbLastViewedRoute='';
let psbCheckoutViewed=false;
function psbTrackEvent(name,payload={}) {
  if(name==='view_page'){
    const route=psbRoutePath();if(route===psbLastViewedRoute)return;
    psbLastViewedRoute=route;if(psbRoute().page!=='checkout')psbCheckoutViewed=false;
  }
  if(name==='begin_checkout'){if(psbCheckoutViewed)return;psbCheckoutViewed=true;}
  const allowed=['page','slug','variacao','preco','qty','seller','itens','subtotal','categoria','faixa','premium','ordenacao','resultado','destino','regra','origin'];
  const safe=Object.fromEntries(allowed.filter(k=>payload[k]!==undefined).map(k=>[k,payload[k]]));
  const ev={event:name,timestamp:new Date().toISOString(),...safe};
  window.psbEvents.push(ev);if(window.psbEvents.length>500)window.psbEvents.shift();
  window.dataLayer.push(ev);
  if(name==='view_product'){
    const p=bySlug(payload.slug);if(p)window.dataLayer.push({event:'view_item',ecommerce:{currency:'BRL',items:[{item_id:p.slug,item_name:p.nome,item_category:catName(p.categoria)}]}});
  }
  if(name==='order_registered')window.dataLayer.push({event:'generate_lead',currency:'BRL',value:payload.subtotal,method:'pedido_assistido'});
}
trackEvent=psbTrackEvent;
document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]');if(!link)return;
  if((link.getAttribute('href')||'').startsWith('https://wa.me/'))trackEvent('open_whatsapp',{origin:psbRoutePath()});
});
