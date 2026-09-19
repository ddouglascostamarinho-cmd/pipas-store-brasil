/* Brand presentation and progressive interaction. Buying rules stay in shipping.js. */
const PSB_CHAPTERS=[
  {name:'A cultura',kicker:'Porto Velho · Cultura pipeira',title:'Da rua.<br>Para <em>o céu.</em>',description:'Tem encontro, história e paixão em cada voo. Entre no universo da Juninho Pipas.',image:'/assets/gallery/galeria-2.webp',alt:'Pipas no céu ao pôr do sol em um encontro da comunidade',position:'center 73%',link:'/galeria',cta:'Conheça nossa cultura',caption:'Um encontro. Muitas histórias.'},
  {name:'A nossa casa',kicker:'Juninho Pipas · Porto Velho',title:'Toda paixão<br>tem <em>origem.</em>',description:'Uma loja feita de conversas, escolhas e gente que vive a cultura pipeira.',image:'/assets/gallery/galeria-1.webp',alt:'Parede de pipas e acessórios na loja Juninho Pipas',position:'center 48%',link:'/contato',cta:'Conheça a nossa loja',caption:'De perto, tudo ganha história.'},
  {name:'O próximo voo',kicker:'Pipas · Carretilhas · Acessórios',title:'Escolha.<br>Sinta. <em>Voe.</em>',description:'Encontre o modelo, o tamanho e os detalhes que vão acompanhar seu próximo voo.',image:'/assets/gallery/galeria-3.webp',alt:'Pipeiro acompanhando o voo de sua pipa ao pôr do sol',position:'center 60%',link:'/loja',cta:'Explore a coleção',caption:'O próximo voo começa com você.'}
];
let psbSelectedChapter=0;
let psbRevealObserver=null;
let psbReturnFocus=null;
let psbDrawerDirty=false;

function psbArrow(){return '<span aria-hidden="true">↗</span>';}
function psbBrandAction(href,text,secondary=false){return `<a class="brand-action${secondary?' brand-action-light':''}" href="${href}">${text}${psbArrow()}</a>`;}

renderHome=function(){
 const first=PSB_CHAPTERS[0];
 return `<div class="brand-experience">
 <section class="brand-hero" aria-label="O universo da Pipas Store">
  <img id="brandHeroImage" class="brand-hero-image" src="${first.image}" width="830" height="1400" fetchpriority="high" alt="${first.alt}">
  <div class="brand-hero-shade"></div>
  <div class="container brand-hero-content"><div class="brand-hero-copy" id="brandHeroCopy"><p class="brand-eyebrow" id="brandHeroKicker">${first.kicker}</p><h1 id="brandHeroTitle">${first.title}</h1><p class="brand-intro" id="brandHeroDescription">${first.description}</p><div class="brand-actions">${psbBrandAction('/loja','Encontre seu próximo voo')}<a id="brandHeroLink" class="brand-text-link" href="${first.link}">${first.cta} ${psbArrow()}</a></div></div><p class="brand-hero-caption" id="brandHeroCaption">${first.caption}<span>Porto Velho / Rondônia</span></p></div>
  <div class="container brand-chapters" aria-label="Explore os capítulos da marca">${PSB_CHAPTERS.map((c,i)=>`<button type="button" data-brand-chapter="${i}" aria-pressed="${i===0}" onclick="psbSelectChapter(${i})"><small>0${i+1}</small><span>${c.name}</span><span class="chapter-indicator" aria-hidden="true">↗</span></button>`).join('')}</div>
 </section>
 <section class="brand-manifesto container" data-reveal><p class="brand-eyebrow">Gente que vive isso</p><div><h2>Um fio conecta<br><em>muitas histórias.</em></h2><p>O cuidado de escolher a pipa. O encontro no fim da tarde. A emoção de olhar para cima. Nossa história acontece entre a loja e o céu de Porto Velho.</p></div><a class="brand-text-link" href="/galeria">Sinta essa cultura ${psbArrow()}</a></section>
 <section class="brand-collection" aria-labelledby="collectionTitle"><div class="container">
  <div class="brand-section-head" data-reveal><div><p class="brand-eyebrow">Escolhas para levar ao céu</p><h2 id="collectionTitle">O seu próximo<br><em>voo começa aqui.</em></h2></div><a class="brand-text-link" href="/loja">Explore todo o catálogo ${psbArrow()}</a></div>
  <div class="brand-collection-grid">
   <a class="brand-collection-item collection-pipa" href="/loja/pipas" data-reveal><div class="collection-photo"><img src="${psbStudioImage('mucha',true)||getProductMainImage('mucha')}" width="600" height="600" alt="Pipa Mucha com estampa ilustrada" loading="lazy" decoding="async"><span class="collection-explore" aria-hidden="true">Explorar ↗</span></div><div class="collection-label"><span><small>01 / Do papel ao céu</small><strong>Pipas</strong></span>${psbArrow()}</div></a>
   <div class="collection-side"><a class="brand-collection-item collection-reel" href="/loja/carretilhas" data-reveal><div class="collection-photo"><img src="${psbStudioImage('carretilhas-madeira',true)||getProductMainImage('carretilhas-madeira')}" width="600" height="600" alt="Coleção de carretilhas de madeira" loading="lazy" decoding="async"><span class="collection-explore" aria-hidden="true">Explorar ↗</span></div><div class="collection-label"><span><small>02 / O voo na sua mão</small><strong>Carretilhas</strong></span>${psbArrow()}</div></a>
   <a class="brand-collection-item collection-tail" href="/loja/rabiolas" data-reveal><div class="collection-photo"><img src="${psbStudioImage('rabiola-cotoco-curta-fita-10cm',true)||getProductMainImage('rabiola-cotoco-curta-fita-10cm')}" width="600" height="600" alt="Rabiola de fita azul" loading="lazy" decoding="async"></div><div class="collection-label"><span><small>03 / O detalhe faz o voo</small><strong>Rabiolas</strong></span>${psbArrow()}</div></a></div>
  </div>
  <div class="brand-category-links" aria-label="Mais categorias">${categories.filter(c=>!['pipas','carretilhas','rabiolas'].includes(c.slug)).map(c=>`<a href="/loja/${c.slug}">${c.name} ${psbArrow()}</a>`).join('')}</div>
 </div></section>
 <section class="brand-journey"><div class="container"><div class="brand-journey-heading" data-reveal><p class="brand-eyebrow">Diário de bordo / Chile, setembro de 2026</p><h2>De Porto Velho.<br><em>Para outros céus.</em></h2><p>A paixão pela pipa atravessa fronteiras. Acompanhe os registros de Juninho no Chile: os encontros, o festival e a emoção de voltar com uma nova história.</p></div><div class="brand-journey-grid"><a class="journey-feature" href="https://www.instagram.com/juninho_pipas.ro/reel/Ddbqz6CzMNv/" target="_blank" rel="noopener noreferrer" data-reveal><img src="/assets/stories/juninho-chile-trofeu-2026.jpg" width="720" height="1280" alt="Juninho com uma pipa e o troféu no Chile" loading="lazy" decoding="async"><span class="journey-caption"><small>01 / Uma conquista para contar</small><strong>O sonho ganhou<br>um novo capítulo.</strong><span>Ver vídeo no Instagram ↗</span></span></a><div class="journey-aside"><a class="journey-film" href="https://www.instagram.com/juninho_pipas.ro/reel/Ddco4gPPZVW/" target="_blank" rel="noopener noreferrer" data-reveal><img src="/assets/stories/chile-festival-2026.jpg" width="720" height="1280" alt="Pipas no céu noturno durante o festival no Chile" loading="lazy" decoding="async"><span class="journey-play" aria-hidden="true">▶</span><span class="journey-caption"><small>02 / Festival no Chile</small><strong>A mesma paixão.<br>Outro céu.</strong><span>Ver vídeo no Instagram ↗</span></span></a><div class="journey-footnote" data-reveal><span>Registros de quem<br><em>vive essa cultura.</em></span><a href="https://www.instagram.com/juninho_pipas.ro/" target="_blank" rel="noopener noreferrer">@juninho_pipas.ro ↗</a></div></div></div></div></section>
 <section class="brand-home-store container" data-reveal><div class="brand-store-copy"><p class="brand-eyebrow">Nossa casa em Porto Velho</p><h2>Entre.<br><em>A casa é sua.</em></h2><p>Juninho Pipas<br>${psbEscape(STORE.endereco)}, ${psbEscape(STORE.bairro)}.</p><p class="brand-hours">${psbEscape(STORE.horarios)}.</p><a class="brand-text-link" href="/contato">Como chegar e falar com a loja ${psbArrow()}</a></div><a class="brand-store-image" href="/contato" aria-label="Conheça a loja Juninho Pipas"><img src="/assets/gallery/galeria-1.webp" width="1280" height="720" alt="Pipas e acessórios expostos na Juninho Pipas" loading="lazy" decoding="async"></a></section>
 <section class="brand-invitation"><div class="container"><p class="brand-eyebrow" data-reveal">Para marcas, criadores e projetos</p><div class="brand-invitation-row" data-reveal><h2>Vamos fazer<br>parte da próxima<br><em>história?</em></h2><div><p>Existe uma cultura viva aqui. Vamos conversar sobre encontros, conteúdo e projetos com a comunidade pipeira.</p>${psbBrandAction('/para-marcas','Crie essa conexão',true)}<a class="brand-text-link" href="/seja-lojista">Quero fazer parte como lojista ${psbArrow()}</a></div></div><div class="brand-signature" aria-hidden="true">PAPEL. VENTO. CULTURA.</div></div></section>
 </div>`;
};

function renderBrandPartners(){
 return `<div class="brand-partners"><section class="container brand-partners-intro"><div data-reveal><p class="brand-eyebrow">Marcas · Criadores · Projetos</p><h1>Uma cultura viva.<br><em>Novas conexões.</em></h1><p class="brand-intro">A Pipas Store Brasil nasce da experiência da Juninho Pipas e da cultura pipeira de Porto Velho. Um ponto de encontro entre produtos, histórias e pessoas — da nossa loja aos encontros de pipas no Chile.</p>${psbBrandAction(getWaLink(STORE.waParceiro||STORE.waGeral,'Olá! Conheci a Pipas Store Brasil e gostaria de conversar sobre uma parceria de marca ou projeto.'),'Vamos conversar')}</div><figure><img src="/assets/stories/juninho-chile-trofeu-2026.jpg" width="720" height="1280" alt="Juninho com troféu e pipa no Chile" fetchpriority="high"><figcaption>Juninho no Chile / Setembro de 2026 · <a href="https://www.instagram.com/juninho_pipas.ro/reel/Ddbqz6CzMNv/" target="_blank" rel="noopener noreferrer">Veja o registro ↗</a></figcaption></figure></section><section class="container brand-partnerships"><p class="brand-eyebrow">O que podemos construir juntos</p>${[['01','Encontros que aproximam','Conversas sobre ações e experiências em encontros da comunidade, com atenção ao local, ao público e ao propósito do projeto.'],['02','Histórias que merecem espaço','Conteúdo sobre os produtos, a loja e as pessoas que fazem parte da cultura pipeira.'],['03','Parcerias com identidade','Projetos e colaborações pensados junto com a loja, respeitando a identidade da marca e da comunidade.']].map(([n,title,text])=>`<article data-reveal><span>${n}</span><h2>${title}</h2><p>${text}</p></article>`).join('')}</section><section class="brand-partners-close container" data-reveal><h2>Qual história<br><em>vamos criar?</em></h2><div><p>Conte sua ideia, o formato desejado e o período do projeto. Nossa equipe conversa com você sobre as possibilidades.</p>${psbBrandAction(getWaLink(STORE.waParceiro||STORE.waGeral,'Olá! Quero apresentar uma ideia de parceria para a Pipas Store Brasil.'),'Apresente sua ideia')}<p class="brand-hours">${psbEscape(STORE.horarios)}.</p></div></section></div>`;
}

renderGallery=function(){
 const scenes=[['galeria-2','Quando o céu vira encontro.','Pipas ao pôr do sol em um encontro da comunidade'],['galeria-1','Cada escolha tem uma história.','Coleção de pipas e acessórios na loja'],['galeria-3','O olhar de quem vive isso.','Pipeiro acompanhando seu voo'],['galeria-4','O nosso lugar é junto.','Participantes reunidos em um encontro de pipas']];
 return `<section class="brand-gallery container"><div class="brand-page-heading"><p class="brand-eyebrow">Porto Velho / Cultura pipeira</p><h1>De perto.<br><em>De verdade.</em></h1><p>Registros da loja, dos encontros e de quem dá vida à cultura pipeira.</p></div><div class="brand-gallery-recent"><a href="https://www.instagram.com/juninho_pipas.ro/reel/Ddbqz6CzMNv/" target="_blank" rel="noopener noreferrer"><img src="/assets/stories/juninho-chile-trofeu-2026.jpg" alt="Juninho com o troféu no Chile" width="720" height="1280"><span><small>Chile / Setembro de 2026</small><strong>Uma nova história<br>para compartilhar.</strong><span>Assista ao registro no Instagram ↗</span></span></a></div><div class="brand-photo-stories">${scenes.map(([file,title,alt],i)=>`<figure data-reveal><button type="button" class="brand-photo-button" onclick="openLightbox('/assets/gallery/${file}.webp')" aria-label="Ampliar foto: ${alt}"><img src="/assets/gallery/${file}.webp" alt="${alt}" loading="${i?'lazy':'eager'}" decoding="async" width="900" height="1400"><span aria-hidden="true">Ampliar ↗</span></button><figcaption><small>0${i+1} / Nossa cultura</small><h2>${title}</h2></figcaption></figure>`).join('')}</div><div class="brand-gallery-end"><h2>A próxima história<br><em>pode ser com você.</em></h2>${psbBrandAction('/para-marcas','Conheça as possibilidades')}</div></section>`;
};

renderEvents=function(){
 return `<section class="container brand-events"><div class="brand-page-heading"><p class="brand-eyebrow">Encontros / Cultura pipeira</p><h1>Na rua.<br><em>Em comunidade.</em></h1><p>Conheça os materiais divulgados dos encontros. Fale com a loja para confirmar a programação e saber sobre as próximas datas.</p></div><div class="brand-event-list">${[{image:REF.evento,date:'18 e 19 de julho de 2026',name:'Festival de Pipas em Porto Velho',place:'Murão · Zona Leste · Porto Velho'},{image:REF.eventUsina,date:'21 de junho',name:'Mega Festival de Pipas na Usina',place:'Usina · Bairro Nacional'}].map(e=>`<article data-reveal><img src="${e.image}" alt="Divulgação: ${e.name}" loading="lazy" decoding="async"><div><p class="brand-eyebrow">Programação divulgada / ${e.date}</p><h2>${e.name}</h2><p>${e.place}</p>${psbBrandAction(getWaLink(STORE.waGeral,'Olá! Quero informações sobre os próximos encontros e eventos de pipas.'),'Consulte os próximos encontros')}<a class="brand-text-link" href="/aspiron">Conheça a ASPIRON ${psbArrow()}</a></div></article>`).join('')}</div></section>`;
};

function psbSelectChapter(index){
 const c=PSB_CHAPTERS[index];if(!c)return;
 psbSelectedChapter=index;
 const title=document.getElementById('brandHeroTitle');if(!title)return;
 title.innerHTML=c.title;
 document.getElementById('brandHeroKicker').textContent=c.kicker;
 document.getElementById('brandHeroDescription').textContent=c.description;
 const photo=document.getElementById('brandHeroImage');photo.src=c.image;photo.alt=c.alt;photo.style.objectPosition=c.position;
 const link=document.getElementById('brandHeroLink');link.href=c.link;link.innerHTML=c.cta+' '+psbArrow();
 document.getElementById('brandHeroCaption').innerHTML=c.caption+'<span>Porto Velho / Rondônia</span>';
 document.querySelectorAll('[data-brand-chapter]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.brandChapter)===index)));
 const copy=document.getElementById('brandHeroCopy');copy.classList.remove('chapter-enter');void copy.offsetWidth;copy.classList.add('chapter-enter');
 trackEvent('select_brand_chapter',{slug:String(index)});
}

function psbInitExperience(){
 if(document.body?.dataset)document.body.dataset.page=psbRoute().page;
 psbRevealObserver?.disconnect();
 if(typeof IntersectionObserver==='function'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  psbRevealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('reveal-pending');psbRevealObserver.unobserve(entry.target);}}),{threshold:0.08});
  document.querySelectorAll('[data-reveal]').forEach(el=>{if(el.getBoundingClientRect().top>window.innerHeight+30){el.classList.add('reveal-pending');psbRevealObserver.observe(el);}});
 }
}

function psbCartDrawerMarkup(){
 if(!cart.length)return `<div class="drawer-empty"><span aria-hidden="true">↗</span><h3>Seu próximo voo<br>começa aqui.</h3><p>Escolha seus produtos e encontre uma combinação que é sua.</p><a href="/loja" class="brand-action" onclick="psbCloseCart()">Explore a coleção ${psbArrow()}</a></div>`;
 const live=!!window.__PSB_PRICE_TABLE_LOADED__;
 return `<div class="drawer-items">${cart.map((item,i)=>`<article class="drawer-item"><a href="/produto/${psbEscape(item.slug)}" onclick="psbCloseCart()"><img src="${psbEscape(getProductMainImage(item.slug))}" alt="${psbEscape(item.nome)}" width="90" height="110"></a><div><a href="/produto/${psbEscape(item.slug)}" onclick="psbCloseCart()">${psbEscape(item.nome)}</a><p>${psbEscape(item.variacao)}</p><small>${psbEscape(item.sellerName||STORE.nome)}</small><div class="drawer-item-bottom"><div class="drawer-quantity"><button type="button" data-qty-control="${i}-minus" aria-label="Diminuir quantidade de ${psbEscape(item.nome)}" onclick="psbDrawerQuantity(${i},-1)">−</button><span aria-label="Quantidade">${item.qty}</span><button type="button" data-qty-control="${i}-plus" aria-label="Aumentar quantidade de ${psbEscape(item.nome)}" onclick="psbDrawerQuantity(${i},1)">+</button></div><strong>${live?money(itemTotal(item)):'Consultando…'}</strong></div><button type="button" class="drawer-remove" onclick="psbDrawerRemove(${i})" aria-label="Remover ${psbEscape(item.nome)}">Remover</button></div></article>`).join('')}</div><div class="drawer-summary">${live?psbMinimumProgress():''}<div class="drawer-total"><span>Subtotal em produtos</span><strong>${live?money(totals().subtotal):'Consultando…'}</strong></div><p>Frete e disponibilidade confirmados pela loja antes do pagamento.</p><a class="brand-action" href="/carrinho" onclick="psbCloseCart()">Confira e finalize seu pedido ${psbArrow()}</a><button class="drawer-continue" type="button" onclick="psbCloseCart()">Continuar escolhendo</button></div>`;
}
function psbOpenCart(){
 const dialog=document.getElementById('cartDrawer');if(!dialog||typeof dialog.showModal!=='function')return false;
 document.getElementById('cartDrawerBody').innerHTML=psbCartDrawerMarkup();
 if(!dialog.open){psbReturnFocus=document.activeElement;psbDrawerDirty=false;dialog.showModal();document.body.classList.add('drawer-open');}
 return true;
}
function psbCloseCart(){
 const dialog=document.getElementById('cartDrawer');if(!dialog?.open)return;
 dialog.close();document.body.classList.remove('drawer-open');
 if(psbReturnFocus?.isConnected)psbReturnFocus.focus();
}
function psbDrawerQuantity(index,delta){
 const item=cart[index];if(!item)return;
 item.qty=Math.max(1,item.qty+delta);psbDrawerDirty=true;saveCart();
 document.getElementById('cartDrawerBody').innerHTML=psbCartDrawerMarkup();
 document.querySelector(`[data-qty-control="${index}-${delta>0?'plus':'minus'}"]`)?.focus();
}
function psbDrawerRemove(index){
 if(!cart[index])return;cart.splice(index,1);psbDrawerDirty=true;saveCart();
 document.getElementById('cartDrawerBody').innerHTML=psbCartDrawerMarkup();
 document.getElementById('cartDrawerClose')?.focus?.();
}
function psbRefreshCartPage(){
 const page=psbRoute().page;
 if(!psbDrawerDirty||!['carrinho','checkout'].includes(page))return;
 // Keep the buyer's work when quantities change from the checkout drawer.
 const fields=page==='checkout'?Array.from(document.querySelectorAll('#app input[id^="ck"],#app select[id^="ck"],#app textarea[id^="ck"]')).map(el=>({id:el.id,value:el.value})):[];
 psbRememberInputs();router();
 fields.filter(f=>f.id!=='ckPayment').forEach(f=>{const el=document.getElementById(f.id);if(el&&(!el.options||Array.from(el.options).some(o=>o.value===f.value)))el.value=f.value;});
 if(page==='checkout'){
  psbDeliveryChanged();const payment=fields.find(f=>f.id==='ckPayment'),el=document.getElementById('ckPayment');
  if(payment&&el&&Array.from(el.options).some(o=>o.value===payment.value))el.value=payment.value;
 }
}

document.addEventListener('DOMContentLoaded',()=>{
 psbInitExperience();
 const dialog=document.getElementById('cartDrawer');
 dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)psbCloseCart();}});
 dialog?.addEventListener('close',()=>{document.body.classList.remove('drawer-open');psbRefreshCartPage();psbDrawerDirty=false;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.getElementById('navMenu');if(menu?.classList.contains('active-menu')){menu.classList.remove('active-menu');document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false');document.querySelector('.menu-toggle')?.focus();}document.getElementById('lightbox')?.classList.remove('active');}});
 let scheduled=false;
 const update=()=>{document.body.classList.toggle('page-scrolled',window.scrollY>28);scheduled=false;};
 window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});update();
});
