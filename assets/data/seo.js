const PSB_SITE_URL='https://www.pipasstore.com.br';
const PSB_PUBLIC_PAGES={
 home:['Pipas, carretilhas e acessórios | Pipas Store Brasil','Compre pipas, carretilhas e acessórios com a Juninho Pipas. Retirada em Porto Velho e envio conforme as condições da loja. Atendimento pelo WhatsApp.'],
 loja:['Loja de pipas e acessórios | Pipas Store Brasil','Compare modelos, tamanhos e apresentações de pipas, carretilhas, rabiolas e materiais. Consulte seu CEP e monte seu pedido com atendimento pelo WhatsApp.'],
 contato:['Contato e loja em Porto Velho | Pipas Store Brasil','Endereço, horários e WhatsApp da Juninho Pipas em Porto Velho, Rondônia. Consulte retirada, entrega local e envio para outras cidades.'],
 faq:['Como comprar | Pipas Store Brasil','Entenda como escolher produtos, registrar seu pedido e confirmar estoque, entrega e pagamento pelo WhatsApp.'],
 'politica-entrega':['Entregas, frete e retirada | Pipas Store Brasil','Consulte retirada grátis em Porto Velho, entrega local e condições de envio para outras cidades. Mínimo por loja e frete confirmado antes do pagamento.'],
 'politica-troca':['Trocas e devoluções | Pipas Store Brasil','Conheça os canais de atendimento e as informações sobre trocas e devoluções dos pedidos da Pipas Store Brasil.'],
 privacidade:['Política de privacidade | Pipas Store Brasil','Informações sobre o uso de dados no atendimento e nos pedidos da Pipas Store Brasil.'],
 galeria:['Cultura pipeira e galeria | Pipas Store Brasil','Fotos da loja, encontros e cultura pipeira em Porto Velho. Conheça a comunidade da Juninho Pipas.'],
 eventos:['Eventos da cultura pipeira | Pipas Store Brasil','Acompanhe os encontros e eventos da cultura pipeira divulgados pela Pipas Store Brasil.'],
 aspiron:['ASPIRON e cultura pipeira em Rondônia | Pipas Store Brasil','Conheça a ASPIRON, associação que representa a cultura pipeira em Rondônia, e seus canais de contato.'],
 'cao-de-caca':['Cão de Caça | Pipas Store Brasil','Conheça a marca Cão de Caça e consulte a Juninho Pipas sobre produtos e disponibilidade.'],
 'seja-lojista':['Seja um lojista parceiro | Pipas Store Brasil','Conheça a parceria comercial e envie sua loja para análise na Pipas Store Brasil.'],
 'para-marcas':['Marcas, criadores e projetos | Pipas Store Brasil','Converse com a Juninho Pipas sobre conteúdo, encontros e projetos junto à cultura pipeira de Porto Velho, Rondônia.'],
 blog:['Conteúdo sobre cultura pipeira | Pipas Store Brasil','Conteúdos e informações sobre a cultura pipeira, produtos e comunidade.']
};
function psbSeoData(page,slug='') {
  const product=page==='produto'?bySlug(slug):null;
  const category=page==='loja'&&slug?categories.find(c=>c.slug===slug):null;
  const article=page==='blog'&&slug?blogPosts.find(p=>p.slug===slug):null;
  const valid=!!product || (!!PSB_PUBLIC_PAGES[page] && (!slug||!!category||!!article));
  const pathname=page==='home'?'/':'/'+page+(slug?'/'+slug:'');
  const url=PSB_SITE_URL+pathname;
  let [title,description]=PSB_PUBLIC_PAGES[page]||['Página não encontrada | Pipas Store Brasil','Acesse o catálogo da Pipas Store Brasil.'];
  if(product){title=product.nome+' | Pipas Store Brasil';description=psbProductDescription(product).replace(/&[^;]+;/g,' ').slice(0,155);}
  if(category){title=category.name+' | Pipas Store Brasil';description='Compare '+category.name.toLowerCase()+' e suas opções no catálogo da Pipas Store Brasil. Consulte seu CEP e confirme entrega e pagamento com a loja.';}
  if(article){title=article.title+' | Pipas Store Brasil';description=article.summary;}
  const privateTitles={carrinho:'Seu carrinho',checkout:'Finalizar pedido','portal-lojista':'Portal do lojista','painel-marketplace':'Administração'};
  if(privateTitles[page])title=privateTitles[page]+' | Pipas Store Brasil';
  let image=product?getProductMainImage(product.slug):'/assets/brand/logo-pipas-store.webp';
  if(image.startsWith('data:'))image='/assets/brand/logo-pipas-store.webp';
  image=new URL(image,PSB_SITE_URL).href;
  const schema=[];
  if(article)schema.push({'@context':'https://schema.org','@type':'Article',headline:article.title,description,url,image:new URL(article.img,PSB_SITE_URL).href,publisher:{'@type':'Organization',name:STORE.brand}});
  if(page==='home')schema.push({'@context':'https://schema.org','@type':'SportingGoodsStore',name:STORE.brand,alternateName:STORE.nome,url:PSB_SITE_URL+'/',image,telephone:'+'+STORE.waGeral,address:{'@type':'PostalAddress',streetAddress:STORE.endereco+', '+STORE.bairro,addressLocality:STORE.cidade,addressRegion:STORE.uf,addressCountry:'BR'}});
  if(product){
    const prices=product.variacoes.map(v=>v.preco).filter(p=>Number.isFinite(p)&&p>0);
    schema.push({'@context':'https://schema.org','@type':'Product',name:product.nome,description,url,image,sku:product.slug,category:catName(product.categoria),...(prices.length?{offers:{'@type':'AggregateOffer',priceCurrency:'BRL',lowPrice:Math.min(...prices),highPrice:Math.max(...prices),offerCount:prices.length,url}}:{})});
    schema.push({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{name:'Início',item:PSB_SITE_URL+'/'},{name:'Loja',item:PSB_SITE_URL+'/loja'},{name:product.nome,item:url}].map((i,n)=>({'@type':'ListItem',position:n+1,...i}))});
  }
  return {title,description,url,image,robots:valid?'index,follow':'noindex,follow',schema};
}
function psbUpdateSeo(page,slug) {
  const data=psbSeoData(page,slug);document.title=data.title;
  for(const [selector,value] of [['meta[name="description"]',data.description],['meta[name="robots"]',data.robots],['meta[property="og:title"]',data.title],['meta[property="og:description"]',data.description],['meta[property="og:image"]',data.image],['meta[property="og:url"]',data.url]]){
    document.querySelector(selector)?.setAttribute('content',value);
  }
  document.querySelector('link[rel="canonical"]')?.setAttribute('href',data.url);
  const node=document.getElementById('psb-page-schema');if(node)node.textContent=JSON.stringify(data.schema);
}
