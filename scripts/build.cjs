/* Commit generated HTML so static hosts need no server rewrite or build setting. */
const fs=require('node:fs');
const path=require('node:path');
const {createApp}=require('../tests/harness.cjs');
const app=createApp();
app.context.csv=fs.readFileSync('assets/data/tabela-precos.csv','utf8');
app.run('applyPriceTable(parsePriceCsv(csv));window.__PSB_PRICE_TABLE_LOADED__=true;trackEvent=()=>{}');
const routes=['/',...Array.from(app.run('Object.keys(PSB_PUBLIC_PAGES)')).filter(k=>k!=='home').map(k=>'/'+k),...Array.from(app.run('categories.map(c=>"/loja/"+c.slug)')),...Array.from(app.run('products.map(p=>"/produto/"+p.slug)')),...Array.from(app.run('blogPosts.map(p=>"/blog/"+p.slug)')),'/carrinho','/checkout','/portal-lojista','/painel-marketplace'];
const template=fs.readFileSync('scripts/site-template.html','utf8');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const files=[];
for(const route of routes){
 const [page='home',slug='']=route.slice(1).split('/');
 app.context.routePage=page||'home';app.context.routeSlug=slug;
 const data=app.run('psbSeoData(routePage,routeSlug)');
 // The live database is authoritative for prices. Do not publish stale static offers.
 data.schema.forEach(item=>{if(item['@type']==='Product')delete item.offers;});
 let body='';
 if(page==='produto')body=app.run('renderProduct(routeSlug)');
 else if(page==='blog'&&slug)body=app.run('renderArticle(routeSlug)');
 else if(page==='loja'){
   body=app.run('renderShop()').replace('<div class="grid-4" id="productGrid"></div>',`<div class="grid-4" id="productGrid">${app.run('products.filter(p=>!routeSlug||p.categoria===routeSlug).map(productCard).join("")')}</div>`);
 } else {
  const render={'':'renderHome',home:'renderHome',contato:'renderContact',faq:'renderFaq','politica-entrega':'renderDelivery','politica-troca':'renderTrade',privacidade:'renderPrivacy',galeria:'renderGallery',eventos:'renderEvents',aspiron:'renderAspiron','cao-de-caca':'renderCao','seja-lojista':'renderPartner',blog:'renderBlog',carrinho:'renderCart',checkout:'renderCheckout','portal-lojista':'renderStorePortal','painel-marketplace':'renderNotFound'}[page];
  if(render)body=app.run(render+'()');
 }
 // Initial markup supplies content, while live pricing remains a runtime responsibility.
 body=body.replace(/<div class="product-price">[\s\S]*?<\/div>/g,'<div class="product-price">Consulte as opções</div>')
   .replace(/(<div id="pdPrice" class="pd-price">)[\s\S]*?<\/div>/,'$1Consultando preço…</div>')
   .replace(/(<strong id="pdStickyPrice">)[\s\S]*?<\/strong>/,'$1Consultar</strong>')
   .replace(/(<p id="pdBulkNote"[^>]*>)[\s\S]*?<\/p>/,'$1Consultando condições de quantidade…</p>')
   .replace(/ — R\$[\s\u00a0]*[\d.,]+(?=<\/option>)/g,'')
   .replace(/<(input|select|button|textarea)\b(?![^>]*\bdisabled\b)/g,'<$1 disabled')
   .replace(/onload="galleryThumbLoaded\(this\)"/g,'onload="if(typeof galleryThumbLoaded===\'function\')galleryThumbLoaded(this)"')
   .replace(/onerror="([^"]*)"/g,(_,code)=>'onerror="if(typeof productImageFallback===\'function\'){'+code+'}"');
 // No account or order data can be part of the isolated build.
 if(['/checkout','/portal-lojista','/painel-marketplace','/carrinho'].includes(route))body='<section class="section"><div class="container"><h1>'+({'/checkout':'Finalizar pedido','/portal-lojista':'Portal do lojista','/painel-marketplace':'Administração','/carrinho':'Carrinho'}[route])+'</h1><p>Carregando…</p></div></section>';
 let html=template.replace(/<title>[\s\S]*?<\/title>/,'<title>'+escape(data.title)+'</title>')
 .replace(/(<meta name="description" content=")[^"]*/,(_,prefix)=>prefix+escape(data.description))
 .replace(/(<meta name="robots" content=")[^"]*/,(_,prefix)=>prefix+data.robots)
 .replace(/(<link rel="canonical" href=")[^"]*/,(_,prefix)=>prefix+data.url)
 .replace(/(<meta property="og:title" content=")[^"]*/,(_,prefix)=>prefix+escape(data.title))
 .replace(/(<meta property="og:description" content=")[^"]*/,(_,prefix)=>prefix+escape(data.description))
 .replace(/(<meta property="og:image" content=")[^"]*/,(_,prefix)=>prefix+data.image)
 .replace('<meta property="og:locale"',`<meta property="og:url" content="${data.url}">\n<meta property="og:locale"`)
 .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,()=>'<script type="application/ld+json" id="psb-page-schema">'+JSON.stringify(data.schema).replace(/</g,'\\u003c')+'</script>')
 .replace(/<main id="app"[^>]*>[\s\S]*?<\/main>/,()=>`<main id="app" tabindex="-1" data-prerendered="${route}">${body}<noscript><p>Ative o JavaScript para consultar o CEP e registrar seu pedido. Você também pode falar com a loja pelo WhatsApp.</p></noscript></main>`);
 const file=route==='/'?'index.html':route.slice(1)+'/index.html';
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);files.push(file);
}
const publicRoutes=routes.filter(r=>!['/carrinho','/checkout','/portal-lojista','/painel-marketplace'].includes(r));
fs.writeFileSync('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+publicRoutes.map(r=>'  <url><loc>https://www.pipasstore.com.br'+r+'</loc></url>').join('\n')+'\n</urlset>\n');
fs.writeFileSync('robots.txt','User-agent: *\nAllow: /\n\nSitemap: https://www.pipasstore.com.br/sitemap.xml\n');
const notFound=template.replace(/<title>[\s\S]*?<\/title>/,'<title>Página não encontrada | Pipas Store Brasil</title>').replace('<meta name="robots" content="index,follow">','<meta name="robots" content="noindex,follow">').replace(/<main id="app"[^>]*><\/main>/,'<main id="app"><h1>Página não encontrada</h1><a href="/loja">Ver catálogo</a></main>');
fs.writeFileSync('404.html',notFound);
fs.writeFileSync('scripts/generated-pages.json',JSON.stringify(files,null,2)+'\n');
console.log('Geradas '+files.length+' páginas, sitemap e robots.txt.');
