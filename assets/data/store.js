/* ==========================================================================
   1. CORE DATA & TRACKING
   ========================================================================== */
document.getElementById('currentYear').textContent = new Date().getFullYear();

window.psbEvents = [];
window.dataLayer = window.dataLayer || [];

function trackEvent(name, payload = {}) {
    const ev = { event: name, timestamp: new Date().toISOString(), ...payload };
    window.psbEvents.push(ev);
    window.dataLayer.push(ev);
    console.log('[Track]', name, payload);
}


// =================================================================
// CONFIGURAÇÃO DE ACESSO (sobrescrevível por window.__PSB_CONFIG__)
// Para produção, configurar via servidor antes do carregamento:
//   window.__PSB_CONFIG__ = {
//     adminPin: 'PIN_SEGURO',
//     stores: [{ id:'juninho-pipas', login:'...', password:'...' }]
//   };
// =================================================================
const __PSB_CFG = (typeof window !== 'undefined' && window.__PSB_CONFIG__) || {};

const STORE = {
    nome: 'Juninho Pipas',
    brand: 'Pipas Store Brasil',
    fundador: 'Mauro César Nogueira Pinheiro Ferreira',
    endereco: 'Rua Inácio Mendes, 7700',
    bairro: 'Bairro JK1',
    cidade: 'Porto Velho',
    uf: 'RO',
    mapLink: 'https://maps.google.com/?q=Rua+In%C3%A1cio+Mendes,+7700+-+Bairro+JK1+-+Porto+Velho,+RO',
    waGeral: '5569993840970',
    waParceiro: '5569992656686',
    waAspiron: '5569999412054',
    instagram: '@juninho_pipas.ro',
    email: 'mauropelegrinopvh@hotmail.com',
    horarios: 'Segunda a sábado, em horário comercial'
};

const __PSB_STORE_OVERRIDE = (__PSB_CFG.stores || []).find(s => s.id === 'juninho-pipas') || {};
const MARKETPLACE_STORES = [
    {
        id: 'juninho-pipas',
        nome: 'Juninho Pipas',
        label: 'Loja oficial homologada',
        phone: STORE.waGeral,
        cidade: 'Porto Velho/RO',
        responsavel: STORE.fundador,
        instagram: STORE.instagram,
        enderecoComercial: `${STORE.endereco}, ${STORE.bairro}`,
        destaque: true,
        status: 'approved',
        paymentMode: 'manual',
        pixKey: '',
        cardIntegration: 'manual',
        login: __PSB_STORE_OVERRIDE.login || 'juninho',
        password: ''
    },
    {
        id: 'pipas-store-brasil',
        nome: 'Apex Rabiolas',
        label: 'Loja parceira homologada',
        phone: STORE.waParceiro,
        cidade: 'Porto Velho/RO',
        destaque: false,
        status: 'approved',
        paymentMode: 'manual',
        pixKey: '',
        cardIntegration: 'manual',
        login: 'lojista-pipas-store-brasil',
        password: '',
        catalogScope: ['rabiolas']
    }
];
const DEFAULT_SELLER_ID = 'juninho-pipas';
const PRODUCT_RULES = {
    'linha-cao-de-caca': {
        sell_mode: 'exclusive',
        allowed_sellers: ['juninho-pipas'],
        default_seller: 'juninho-pipas',
        requires_stock_confirmation: true,
        catalog_status: 'ativo',
        note: 'Venda exclusiva da Juninho Pipas.'
    },
    'rabiola-500m': {
        sell_mode: 'restricted',
        allowed_sellers: ['pipas-store-brasil'],
        default_seller: 'pipas-store-brasil',
        requires_stock_confirmation: true,
        catalog_status: 'ativo',
        note: 'Venda exclusiva da Apex Rabiolas.'
    }
};
const PARTNER_STORE_STORAGE_KEY = 'psb_partner_stores_23';
const PENDING_PARTNER_STORE_STORAGE_KEY = 'psb_pending_partner_stores_23';
const ORDERS_STORAGE_KEY = 'psb_marketplace_orders_23';
const PRODUCT_REQUESTS_STORAGE_KEY = 'psb_product_requests_23';
const SELLER_OFFERS_STORAGE_KEY = 'psb_seller_offers_23';
const SELLERS_BACKEND_SYNC_KEY = 'psb_sellers_backend_last_sync_23';
const SELLER_PROFILE_OVERRIDES_STORAGE_KEY = 'psb_seller_profile_overrides_23';
const STORE_ACCESS_STORAGE_KEY = 'psb_store_access_23';
const STORE_SESSION_STORAGE_KEY = 'psb_store_session_23';
const ADMIN_SESSION_STORAGE_KEY = 'psb_admin_session_23';
const ORDERS_BACKEND_SYNC_KEY = 'psb_orders_backend_last_sync_23';
// Acesso administrativo (controlado por configuração interna)
const ADMIN_ACCESS_PIN = __PSB_CFG.adminPin || window.__PSB_ADMIN_PIN__ || '__DISABLED__';
const slugify = value => (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const readJSON = (key, fallback = []) => {
    try {
        const raw = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
        return Array.isArray(fallback) ? (Array.isArray(raw) ? raw : fallback) : (raw || fallback);
    } catch (error) {
        console.warn(`Falha ao carregar ${key}.`, error);
        return fallback;
    }
};
const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const loadStoreAccess = () => readJSON(STORE_ACCESS_STORAGE_KEY, {});
const saveStoreAccess = access => writeJSON(STORE_ACCESS_STORAGE_KEY, access);
const loadSellerProfileOverrides = () => readJSON(SELLER_PROFILE_OVERRIDES_STORAGE_KEY, {});
const saveSellerProfileOverrides = profiles => writeJSON(SELLER_PROFILE_OVERRIDES_STORAGE_KEY, profiles);
const loadPartnerStores = () => readJSON(PARTNER_STORE_STORAGE_KEY, []);
const savePartnerStores = stores => writeJSON(PARTNER_STORE_STORAGE_KEY, stores);
const loadPendingPartnerStores = () => []; // Old device drafts are not submitted applications.
const savePendingPartnerStores = stores => writeJSON(PENDING_PARTNER_STORE_STORAGE_KEY, stores);
const loadOrders = () => readJSON(ORDERS_STORAGE_KEY, []);
const saveOrders = orders => writeJSON(ORDERS_STORAGE_KEY, orders);

// Registro central de pedidos assistidos via Supabase.
// Se o Supabase não estiver configurado, o site continua usando localStorage como fallback provisório.
const getSupabaseConfig = () => window.PSB_SUPABASE_CONFIG || {};
const isOrdersBackendEnabled = () => {
    const cfg = getSupabaseConfig();
    return !!(cfg.enabled && cfg.url && cfg.anonKey && !String(cfg.url).includes('COLE_AQUI') && !String(cfg.anonKey).includes('COLE_AQUI'));
};
const supabaseRestBase = () => String(getSupabaseConfig().url || '').replace(/\/$/, '') + '/rest/v1';

const normalizeRemoteOrder = row => {
    const payload = row.order_payload || {};
    return {
        ...payload,
        id: row.order_number || payload.id,
        sellerId: row.seller_id || payload.sellerId || DEFAULT_SELLER_ID,
        sellerName: row.seller_name || payload.sellerName || STORE.nome,
        status: row.status || payload.status || 'aguardando-confirmacao',
        paymentReleased: typeof row.payment_released === 'boolean' ? row.payment_released : !!payload.paymentReleased,
        createdAt: row.created_at || payload.createdAt || new Date().toISOString(),
        updatedAt: row.updated_at || payload.updatedAt || row.created_at || payload.createdAt,
        customer: row.customer || payload.customer || {},
        items: row.items || payload.items || [],
        subtotal: Number(row.subtotal ?? payload.subtotal ?? 0),
        timeline: row.timeline || payload.timeline || []
    };
};
const mergeOrders = (localOrders, remoteOrders) => {
    const map = new Map();
    [...localOrders, ...remoteOrders].forEach(order => {
        if(order?.id) map.set(order.id, order);
    });
    return [...map.values()].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};
async function saveOrderToBackend(order){
    if(!isOrdersBackendEnabled()) throw new Error('Registro central indisponível');
    const res=await fetch(supabaseRestBase()+'/rpc/psb_submit_order',{
        method:'POST',headers:supabaseHeaders('',true),body:JSON.stringify({p_order:order}),signal:AbortSignal.timeout(20000)
    });
    if(!res.ok){const error=new Error('Falha ao registrar pedido: '+res.status);error.definitive=res.status>=400&&res.status<500&&![408,429].includes(res.status);throw error;}
    const data=await res.json();
    if(data.order_number!==order.id||data.confirmed!==true)throw new Error('Confirmação de pedido inválida');
    return {ok:true,data};
}
async function updateOrderInBackend(order){
    if(!isOrdersBackendEnabled()||!order?.id||!await psbEnsureAuthSession())return {ok:false};
    const res=await fetch(supabaseRestBase()+'/psb_orders?order_number=eq.'+encodeURIComponent(order.id),{
        method:'PATCH',headers:supabaseHeaders('return=representation'),
        body:JSON.stringify({status:order.status,payment_released:order.paymentReleased,timeline:order.timeline,updated_at:order.updatedAt}),signal:AbortSignal.timeout(15000)
    });
    if(!res.ok)return {ok:false,status:res.status};
    const data=await res.json();
    return {ok:Array.isArray(data)&&data.length===1,data};
}
let __psbSyncingOrders = false;
async function syncOrdersFromBackend({ rerender = false } = {}){
    if(!isOrdersBackendEnabled() || __psbSyncingOrders || !localStorage.getItem(PSB_AUTH_SESSION_KEY)) return;
    __psbSyncingOrders = true;
    const before = localStorage.getItem(ORDERS_STORAGE_KEY) || '[]';
    try{
        if(!await psbEnsureAuthSession()) return;
        const res = await fetch(`${supabaseRestBase()}/psb_orders?select=*&order=created_at.desc&limit=300`, {
            headers: supabaseHeaders()
        });
        if(!res.ok) throw new Error(`Falha ao sincronizar pedidos: ${res.status}`);
        const rows = await res.json();
        const remoteOrders = Array.isArray(rows) ? rows.map(normalizeRemoteOrder) : [];
        const merged = remoteOrders;
        saveOrders(merged);
        localStorage.setItem(ORDERS_BACKEND_SYNC_KEY, new Date().toISOString());
        const after = localStorage.getItem(ORDERS_STORAGE_KEY) || '[]';
        if(rerender && before !== after) router();
    }catch(error){
        console.warn('Não foi possível sincronizar pedidos do backend.', error);
        if(rerender) showToast('Não foi possível atualizar pedidos do banco. Mostrando cache local.');
    }finally{
        __psbSyncingOrders = false;
    }
}
const backendStatusLabel = () => isOrdersBackendEnabled() ? 'Registro central ativo' : 'Registro central não configurado';

const loadProductRequests = () => []; // Remote queues are rendered by requests.js.
const saveProductRequests = requests => writeJSON(PRODUCT_REQUESTS_STORAGE_KEY, requests);

const DEFAULT_SELLER_OFFERS = [
    { offerKey:'juninho-pipas::all', sellerId:'juninho-pipas', sellerName:'Juninho Pipas', scope:'all', productSlug:'', categorySlug:'', active:true, useCatalogPrice:true },
    // Exceção comercial: Juninho vende o catálogo geral, exceto rabiolas.
    { offerKey:'juninho-pipas::cat::rabiolas', sellerId:'juninho-pipas', sellerName:'Juninho Pipas', scope:'category', productSlug:'', categorySlug:'rabiolas', active:false, useCatalogPrice:true },
    { offerKey:'pipas-store-brasil::cat::rabiolas', sellerId:'pipas-store-brasil', sellerName:'Apex Rabiolas', scope:'category', productSlug:'', categorySlug:'rabiolas', active:true, useCatalogPrice:true }
];
const makeOfferKey = (sellerId, scope, value='') => {
    if(scope === 'all') return `${sellerId}::all`;
    if(scope === 'category') return `${sellerId}::cat::${value}`;
    return `${sellerId}::prod::${value}`;
};
const normalizeSellerOffer = offer => ({
    offerKey: offer.offerKey || offer.offer_key || makeOfferKey(offer.sellerId || offer.seller_id, offer.scope || 'product', offer.productSlug || offer.product_slug || offer.categorySlug || offer.category_slug || ''),
    sellerId: offer.sellerId || offer.seller_id,
    sellerName: offer.sellerName || offer.seller_name || '',
    scope: offer.scope || 'product',
    productSlug: offer.productSlug || offer.product_slug || '',
    categorySlug: offer.categorySlug || offer.category_slug || '',
    active: offer.active !== false,
    useCatalogPrice: offer.useCatalogPrice ?? offer.use_catalog_price ?? true,
    priceOverride: offer.priceOverride ?? offer.price_override ?? null,
    updatedAt: offer.updatedAt || offer.updated_at || new Date().toISOString()
});
const mergeSellerOffers = (...groups) => {
    const map = new Map();
    groups.flat().filter(Boolean).map(normalizeSellerOffer).forEach(offer => {
        if(offer.offerKey && offer.sellerId) map.set(offer.offerKey, offer);
    });
    return Array.from(map.values());
};
const loadSellerOffers = () => readJSON(SELLER_OFFERS_STORAGE_KEY, []);
const saveSellerOffers = offers => writeJSON(SELLER_OFFERS_STORAGE_KEY, mergeSellerOffers(offers));
const normalizeRemoteSeller = row => ({
    id: row.seller_id || row.id,
    nome: row.seller_name || row.name || row.seller_payload?.nome || 'Loja parceira',
    label: row.label || row.seller_payload?.label || 'Loja parceira homologada',
    phone: row.phone || row.seller_payload?.phone || STORE.waParceiro,
    cidade: row.city || row.cidade || row.seller_payload?.cidade || 'Porto Velho/RO',
    status: row.status || row.seller_payload?.status || 'approved',
    login: row.login || row.seller_payload?.login || '',
    password: row.password || row.seller_payload?.password || '',
    paymentMode: row.payment_mode || row.seller_payload?.paymentMode || 'manual',
    cardIntegration: row.card_integration || row.seller_payload?.cardIntegration || 'manual',
    pixKey: row.pix_key || row.seller_payload?.pixKey || '',
    destaque: !!(row.seller_payload?.destaque),
    responsavel: row.seller_payload?.responsavel || '',
    cpfCnpj: row.seller_payload?.cpfCnpj || '',
    instagram: row.seller_payload?.instagram || '',
    enderecoComercial: row.seller_payload?.enderecoComercial || '',
    operationDescription: row.seller_payload?.operationDescription || '',
    observacoes: row.seller_payload?.observacoes || '',
    categoriesRequested: row.seller_payload?.categoriesRequested || ''
});
async function upsertSellerToBackend(store){
    if(!isOrdersBackendEnabled() || !store?.id) return { ok:false, disabled:true };
    const row = {
        seller_id: store.id,
        seller_name: store.nome,
        label: store.label || 'Loja parceira homologada',
        phone: store.phone || STORE.waParceiro,
        city: store.cidade || '',
        status: store.status || 'approved',
        login: store.login || '',
        password: store.password || '',
        payment_mode: store.paymentMode || 'manual',
        card_integration: store.cardIntegration || 'manual',
        pix_key: store.pixKey || '',
        updated_at: new Date().toISOString(),
        seller_payload: store
    };
    const res = await fetch(`${supabaseRestBase()}/psb_sellers?on_conflict=seller_id`, {
        method: 'POST',
        headers: supabaseHeaders('resolution=merge-duplicates,return=representation'),
        body: JSON.stringify(row)
    });
    if(!res.ok){
        const detail = await res.text().catch(()=> '');
        console.warn('Não foi possível salvar loja no Supabase.', res.status, detail);
        return { ok:false, status:res.status, detail };
    }
    return { ok:true, data: await res.json().catch(()=>[]) };
}
async function deleteSellerFromBackend(storeId){
    if(!isOrdersBackendEnabled() || !storeId) return { ok:false, disabled:true };
    const encoded = encodeURIComponent(storeId);
    const [offersRes, sellerRes] = await Promise.all([
        fetch(`${supabaseRestBase()}/psb_seller_offers?seller_id=eq.${encoded}`, {
            method: 'DELETE',
            headers: supabaseHeaders('return=minimal')
        }),
        fetch(`${supabaseRestBase()}/psb_sellers?seller_id=eq.${encoded}`, {
            method: 'DELETE',
            headers: supabaseHeaders('return=minimal')
        })
    ]);
    if(!offersRes.ok || !sellerRes.ok){
        const detail = [
            !offersRes.ok ? `ofertas ${offersRes.status}: ${await offersRes.text().catch(()=> '')}` : '',
            !sellerRes.ok ? `loja ${sellerRes.status}: ${await sellerRes.text().catch(()=> '')}` : ''
        ].filter(Boolean).join(' | ');
        console.warn('Falha ao excluir loja no Supabase.', detail);
        return { ok:false, detail };
    }
    return { ok:true };
}

async function upsertSellerOfferToBackend(offer){
    if(!isOrdersBackendEnabled() || !offer?.sellerId) return { ok:false, disabled:true };
    const item = normalizeSellerOffer(offer);
    const row = {
        offer_key: item.offerKey,
        seller_id: item.sellerId,
        seller_name: item.sellerName || getStoreById(item.sellerId)?.nome || item.sellerId,
        scope: item.scope,
        product_slug: item.productSlug || null,
        category_slug: item.categorySlug || null,
        active: !!item.active,
        use_catalog_price: item.useCatalogPrice !== false,
        price_override: item.priceOverride === '' ? null : item.priceOverride,
        updated_at: new Date().toISOString(),
        offer_payload: item
    };
    const res = await fetch(`${supabaseRestBase()}/psb_seller_offers?on_conflict=offer_key`, {
        method: 'POST',
        headers: supabaseHeaders('resolution=merge-duplicates,return=representation'),
        body: JSON.stringify(row)
    });
    if(!res.ok){
        const detail = await res.text().catch(()=> '');
        console.warn('Não foi possível salvar permissão de venda no Supabase.', res.status, detail);
        return { ok:false, status:res.status, detail };
    }
    return { ok:true, data: await res.json().catch(()=>[]) };
}
let __psbSyncingCatalog = false;
let psbCatalogSyncedAt = 0;
async function syncMarketplaceCatalogFromBackend({ rerender = false } = {}){
    if(!isOrdersBackendEnabled() || __psbSyncingCatalog || Date.now()-psbCatalogSyncedAt<60000) return;
    __psbSyncingCatalog = true;
    const beforeOffers = localStorage.getItem(SELLER_OFFERS_STORAGE_KEY) || '[]';
    const beforeStores = localStorage.getItem(PARTNER_STORE_STORAGE_KEY) || '[]';
    const beforeProfiles = localStorage.getItem(SELLER_PROFILE_OVERRIDES_STORAGE_KEY) || '{}';
    try{
        const [sellerRes, offerRes, privateRes] = await Promise.all([
            fetch(`${supabaseRestBase()}/psb_public_sellers?select=*&order=seller_id.asc`, { headers: supabaseHeaders('',true),signal:AbortSignal.timeout(15000) }).catch(()=>null),
            fetch(`${supabaseRestBase()}/psb_seller_offers?select=*&order=updated_at.desc`, { headers: supabaseHeaders('',true),signal:AbortSignal.timeout(15000) }).catch(()=>null),
            (async()=>await psbEnsureAuthSession()?fetch(supabaseRestBase()+'/psb_sellers?select=*',{headers:supabaseHeaders(),signal:AbortSignal.timeout(15000)}):null)().catch(()=>null)
        ]);
        if(!sellerRes?.ok||!offerRes?.ok) throw new Error('Catálogo indisponível');
        psbCatalogSyncedAt=Date.now();
        if(sellerRes?.ok){
            const rows = await sellerRes.json();
            const privateRows=privateRes?.ok?await privateRes.json():[];
            const baseIds = new Set(MARKETPLACE_STORES.map(store => store.id));
            const remoteStores = (Array.isArray(rows)?rows:[]).map(row=>{const privateRow=privateRows.find(r=>r.seller_id===row.seller_id);if(privateRow)return normalizeRemoteSeller(privateRow);const base=MARKETPLACE_STORES.find(s=>s.id===row.seller_id)||{};return {id:row.seller_id,nome:row.seller_name,label:row.label,phone:row.phone,cidade:row.city,status:row.status,login:base.login||''};}).filter(s=>s.id);
            const profileOverrides = loadSellerProfileOverrides();
            const remoteIds = new Set(remoteStores.map(store => store.id));
            const map = new Map();
            remoteStores.forEach(store => {
                profileOverrides[store.id] = { ...(profileOverrides[store.id] || {}), ...store };
                if(!baseIds.has(store.id)) map.set(store.id, store);
            });
            Object.keys(profileOverrides).forEach(id => {
                if(!baseIds.has(id) && !remoteIds.has(id)) delete profileOverrides[id];
            });
            saveSellerProfileOverrides(profileOverrides);
            // Com backend ativo e resposta válida, o Supabase é a fonte central para lojas parceiras.
            // Isso evita que uma loja excluída reapareça por dados antigos deste navegador.
            savePartnerStores(Array.from(map.values()));
        }
        if(offerRes?.ok){
            const rows = await offerRes.json();
            const remoteOffers = Array.isArray(rows) ? rows.map(normalizeSellerOffer) : [];
            saveSellerOffers(remoteOffers);
        }
        localStorage.setItem(SELLERS_BACKEND_SYNC_KEY, new Date().toISOString());
        const afterOffers = localStorage.getItem(SELLER_OFFERS_STORAGE_KEY) || '[]';
        const afterStores = localStorage.getItem(PARTNER_STORE_STORAGE_KEY) || '[]';
        const afterProfiles = localStorage.getItem(SELLER_PROFILE_OVERRIDES_STORAGE_KEY) || '{}';
        if(rerender && (beforeOffers !== afterOffers || beforeStores !== afterStores || beforeProfiles !== afterProfiles)) router();
    }catch(error){
        console.warn('Não foi possível sincronizar lojas/ofertas do Supabase.', error);
    }finally{
        __psbSyncingCatalog = false;
    }
}
const offerMatchesProduct = (offer, product) => {
    if(!offer?.active || !product) return false;
    if(offer.scope === 'all') return true;
    if(offer.scope === 'category') return offer.categorySlug === product.categoria;
    if(offer.scope === 'product') return offer.productSlug === product.slug;
    return false;
};
const sellerCanSellProduct = (store, product, offers = loadSellerOffers()) => {
    if(!store?.id || !product) return false;
    const sellerOffers = offers.filter(offer => offer.sellerId === store.id);

    // Produto específico marcado funciona como exceção positiva fora da categoria.
    const productOffer = sellerOffers.find(offer => offer.scope === 'product' && offer.productSlug === product.slug);
    if(productOffer?.active) return true;

    // A categoria tem precedência sobre a permissão global. Assim é possível liberar
    // todo o catálogo e desmarcar apenas uma categoria, como Rabiolas.
    const categoryOffer = sellerOffers.find(offer => offer.scope === 'category' && offer.categorySlug === product.categoria);
    if(categoryOffer) return !!categoryOffer.active;

    const allOffer = sellerOffers.find(offer => offer.scope === 'all');
    if(allOffer) return !!allOffer.active;


    return false;
};
const buildSellerOffer = (store, scope, value, active) => normalizeSellerOffer({
    offerKey: makeOfferKey(store.id, scope, value),
    sellerId: store.id,
    sellerName: store.nome,
    scope,
    productSlug: scope === 'product' ? value : '',
    categorySlug: scope === 'category' ? value : '',
    active: !!active,
    useCatalogPrice: true,
    updatedAt: new Date().toISOString()
});
const isExplicitOfferActive = (storeId, scope, value='') => loadSellerOffers().some(offer => offer.sellerId === storeId && offer.scope === scope && ((scope === 'all') || (scope === 'category' && offer.categorySlug === value) || (scope === 'product' && offer.productSlug === value)) && offer.active);

const allStores = () => {
    const access = loadStoreAccess();
    const profileOverrides = loadSellerProfileOverrides();
    const map = new Map();
    [...MARKETPLACE_STORES, ...loadPartnerStores()].forEach(store => {
        if(!store || !store.id) return;
        const current = map.get(store.id) || {};
        map.set(store.id, { ...current, ...store, ...(profileOverrides[store.id] || {}), ...(access[store.id] || {}) });
    });
    return Array.from(map.values());
};
const approvedStores = () => allStores().filter(store => store.status === 'approved');
const inactiveStores = () => allStores().filter(store => store.status === 'inactive');
const isCoreStore = id => MARKETPLACE_STORES.some(store => store.id === id);
const pendingPartnerStores = () => loadPendingPartnerStores();
const getStoreById = id => allStores().find(store => store.id === id) || MARKETPLACE_STORES[0];
const getProductRule = slug => ({
    sell_mode: 'restricted',
    allowed_sellers: [DEFAULT_SELLER_ID],
    default_seller: DEFAULT_SELLER_ID,
    requires_stock_confirmation: true,
    catalog_status: 'ativo',
    ...(PRODUCT_RULES[slug] || {})
});
const sellersForProduct = slug => {
    const product = bySlug(slug);
    if(!product) return [];
    const stores = approvedStores();
    const offers = loadSellerOffers();
    const rule = getProductRule(slug);
    const explicitRule = PRODUCT_RULES[slug];
    const sellers = stores.filter(store => {
        // Regras comerciais explícitas do produto limitam quais lojas podem aparecer,
        // mesmo que exista uma permissão global antiga no navegador ou no Supabase.
        if(explicitRule && ['exclusive', 'restricted'].includes(rule.sell_mode) && !rule.allowed_sellers.includes(store.id)) return false;
        return sellerCanSellProduct(store, product, offers);
    });
    return sellers;
};
const productSellerNote = slug => {
    const count = sellersForProduct(slug).length;
    if(count > 1) return 'Produto disponível em mais de uma loja homologada. Escolha a loja antes de adicionar ao carrinho.';
    const rule = getProductRule(slug);
    if(rule.note) return rule.note;
    if(rule.sell_mode === 'exclusive') return 'Venda exclusiva da Juninho Pipas.';
    if(rule.sell_mode === 'restricted') return 'Vendido por uma loja autorizada da Pipas Store. Consulte a disponibilidade para seu CEP.';
    return 'Se nenhuma loja for escolhida, o pedido segue por padrão para a Juninho Pipas.';
};
const groupCartBySeller = () => cart.reduce((acc, item) => {
    const sellerId = item.sellerId || DEFAULT_SELLER_ID;
    if(!acc[sellerId]) acc[sellerId] = { seller: getStoreById(sellerId), items: [] };
    acc[sellerId].items.push(item);
    return acc;
}, {});
const createCredentials = name => ({
    login: `lojista-${(slugify(name) || 'parceiro').slice(0, 18)}`,
    password: String(Math.floor(100000 + Math.random() * 900000))
});
const getStoreSession = () => readJSON(STORE_SESSION_STORAGE_KEY, null);
const setStoreSession = session => writeJSON(STORE_SESSION_STORAGE_KEY, session);
const clearStoreSession = () => localStorage.removeItem(STORE_SESSION_STORAGE_KEY);
const isAdminSessionActive = () => localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) === '1';
const setAdminSession = active => active ? localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, '1') : localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
const createOrderId = () => `PSB-${crypto.randomUUID()}`;
const createMarketplaceOrder = (sellerId, customerData) => {
    const payload = buildOrderMessage(sellerId, customerData);
    const orders = loadOrders();
    const order = {
        id: createOrderId(),
        sellerId,
        sellerName: payload.seller.nome,
        status: 'aguardando-confirmacao',
        paymentReleased: false,
        createdAt: new Date().toISOString(),
        customer: customerData,
        items: payload.items,
        subtotal: payload.subtotal,
        timeline: [{ status: 'aguardando-confirmacao', at: new Date().toISOString(), note: 'Pedido criado no checkout do marketplace.' }]
    };
    orders.unshift(order);
    saveOrders(orders);
    return { order, payload };
};
const updateOrderStatus = async (orderId,status,note='') => {
    const orders=loadOrders();const old=orders.find(o=>o.id===orderId);if(!old)return null;
    const order={...old,status,paymentReleased:['aprovado-para-pagamento','pago','em-separacao','enviado','concluido'].includes(status),updatedAt:new Date().toISOString(),timeline:[...(old.timeline||[]),{status,at:new Date().toISOString(),note}]};
    const result=await updateOrderInBackend(order);
    if(!result.ok)throw new Error('Gravação não confirmada');
    const confirmed=normalizeRemoteOrder(result.data[0]);
    saveOrders(orders.map(o=>o.id===orderId?confirmed:o));return confirmed;
};
const generateStoreAccess = id => {
    const store = allStores().find(item => item.id === id);
    if(!store) return null;
    const access = loadStoreAccess();
    const creds = {
        login: `lojista-${(slugify(store.nome) || 'parceiro').slice(0, 18)}`,
        password: String(Math.floor(100000 + Math.random() * 900000))
    };
    access[id] = creds;
    saveStoreAccess(access);
    return creds;
};
const approvePartnerStore = id => {
    const pending = loadPendingPartnerStores();
    const partner = pending.find(store => store.id === id);
    if(!partner) return null;
    const approvedStore = {
        ...partner,
        status: 'approved',
        label: 'Loja parceira homologada',
        aprovadoEm: new Date().toISOString()
    };
    const currentApproved = loadPartnerStores().filter(store => store.id !== id);
    savePendingPartnerStores(pending.filter(store => store.id !== id));
    savePartnerStores([...currentApproved, approvedStore]);
    const creds = generateStoreAccess(approvedStore.id);
    return { ...approvedStore, ...creds };
};
const rejectPartnerStore = id => {
    const pending = loadPendingPartnerStores();
    const partner = pending.find(store => store.id === id);
    if(!partner) return null;
    savePendingPartnerStores(pending.filter(store => store.id !== id));
    return partner;
};
async function loginStorePortal(){ const login = document.getElementById('storeLogin')?.value.trim().toLowerCase(); const password = document.getElementById('storePassword')?.value.trim(); const store = allStores().find(item => item.status === 'approved' && (item.login || '').toLowerCase() === login); if(!store){ showToast('Credenciais inválidas, loja inativa ou ainda não homologada.'); return; } const email = PSB_SELLER_AUTH_EMAILS[store.id]; if(!email){ showToast('Login ainda não migrado para o novo sistema. Fale com o administrador.'); return; } const ok = await psbSignIn(email, password); if(!ok){ showToast('Credenciais inválidas, loja inativa ou ainda não homologada.'); return; } setStoreSession({ storeId: store.id, loginAt: new Date().toISOString() }); showToast(`Acesso liberado para ${store.nome}.`); if(psbRoute().page === 'portal-lojista') router(); else psbNavigate('/portal-lojista'); }
  function logoutStorePortal(){ psbSignOut(); clearStoreSession(); showToast('Sessão do lojista encerrada.'); router(); }
function loginAdminPortal(){ const pin = document.getElementById('adminPin')?.value.trim(); if(pin !== ADMIN_ACCESS_PIN){ showToast('PIN administrativo inválido.'); return; } setAdminSession(true); showToast('Acesso administrativo confirmado.'); router(); }
function logoutAdminPortal(){ setAdminSession(false); showToast('Sessão administrativa encerrada.'); router(); }



const psbStatusBusy=new Set();
async function changeOrderStatus(orderId,status,note=''){
    if(psbStatusBusy.has(orderId))return;psbStatusBusy.add(orderId);
    try{const order=await updateOrderStatus(orderId,status,note);if(!order){showToast('Pedido não encontrado.');return;}showToast('Status confirmado para '+order.id);router();}
    catch{showToast('Não foi possível salvar o status. Tente novamente.');router();}
    finally{psbStatusBusy.delete(orderId);}
}
function changeOrderStatusFromSelect(orderId, selectEl){ const status = selectEl?.value || ''; if(!status) return; const note = selectEl.options[selectEl.selectedIndex]?.text || 'Status atualizado pela loja.'; changeOrderStatus(orderId, status, note); }
function readImageAsDataUrl(file){
    return new Promise((resolve, reject)=>{
        if(!file){ resolve(''); return; }
        const reader = new FileReader();
        reader.onload = ()=> resolve(reader.result);
        reader.onerror = ()=> reject(new Error('Falha ao ler a imagem.'));
        reader.readAsDataURL(file);
    });
}


const REF = {
    hero: '/assets/institutional/hero-loja.webp',
    img1: '/assets/gallery/galeria-1.webp',
    img2: '/assets/gallery/galeria-2.webp',
    img3: '/assets/gallery/galeria-3.webp',
    img4: '/assets/gallery/galeria-4.webp',
    img5: '/assets/gallery/galeria-5.webp',
    img6: '/assets/gallery/galeria-6.webp',
    logoJ: '/assets/brand/logo-juninho.webp',
    logoC: '/assets/brand/logo-cao.webp',
    logoA: '/assets/brand/logo-aspiron.webp',
    logoFull: '/assets/brand/logo-pipas-store.webp',
    blogPlaceholder: '/assets/blog/blog-placeholder.webp',
    evento: '/assets/events/evento-porto-velho.webp',
    eventUsina: '/assets/events/evento-usina.webp',
    loja: '/assets/institutional/loja-juninho.webp',
    fachada: '/assets/institutional/fachada.webp'
};

const getWaLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
const money = val => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatOrderDate = (value, { short = false } = {}) => {
    if(!value) return 'não informado';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return 'não informado';
    const timeZone = 'America/Porto_Velho';
    const dateOptions = short
        ? { timeZone, day:'2-digit', month:'2-digit' }
        : { timeZone, day:'2-digit', month:'2-digit', year:'numeric' };
    const datePart = new Intl.DateTimeFormat('pt-BR', dateOptions).format(date);
    const timePart = new Intl.DateTimeFormat('pt-BR', { timeZone, hour:'2-digit', minute:'2-digit' }).format(date);
    return `${datePart} às ${timePart}`;
};
const PRODUCT_IMAGE_BASE = '/assets/products';
const PRODUCT_PLACEHOLDER = `${PRODUCT_IMAGE_BASE}/placeholder.jpg`;
const PRODUCT_PLACEHOLDER_SVG = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#171B22"/><stop offset="1" stop-color="#08090D"/></linearGradient><radialGradient id="r" cx="50%" cy="20%" r="75%"><stop stop-color="#FFD400" stop-opacity="0.22"/><stop offset="1" stop-color="#FFD400" stop-opacity="0"/></radialGradient></defs><rect width="900" height="650" fill="url(#g)"/><rect width="900" height="650" fill="url(#r)"/><path d="M180 398 L450 118 L720 398 Z" fill="none" stroke="#FFD400" stroke-width="20" stroke-linejoin="round"/><path d="M450 118 V398" stroke="#FFD400" stroke-width="12"/><path d="M180 398 H720" stroke="#2A3038" stroke-width="16"/><circle cx="450" cy="398" r="8" fill="#FFD400"/><text x="450" y="500" fill="#F5F7FA" font-size="44" font-family="Arial, sans-serif" font-weight="800" text-anchor="middle">PIPAS STORE</text><text x="450" y="550" fill="#A8B0BC" font-size="25" font-family="Arial, sans-serif" text-anchor="middle">imagem em breve</text></svg>');
const PRODUCT_GALLERY_FILES = ['galeria-01.jpg', 'galeria-02.jpg', 'galeria-03.jpg'];
function psbStudioImage(slug,card=false){return ['mucha','carretilhas-madeira','rabiola-cotoco-curta-fita-10cm'].includes(slug)?'/assets/studio/pilot/'+slug+(card?'.card':'')+'.webp':null;}
function psbProductPhotoSlug(slug){return ['rabiola-cotoco-normal-10cm-75m','rabiola-cotoco-normal-10cm-100m'].includes(slug)?'rabiola-cotoco-normal-fita-10cm':slug;}
function getProductMainImage(slug){ slug=psbProductPhotoSlug(slug); const path=`${PRODUCT_IMAGE_BASE}/${slug}/principal.jpg`;return window.PSB_IMAGES?.[path]?.src||path; }
function getProductGalleryImages(slug){ slug=psbProductPhotoSlug(slug); return PRODUCT_GALLERY_FILES.map(file=>window.PSB_IMAGES?.[`${PRODUCT_IMAGE_BASE}/${slug}/${file}`]?.src).filter(Boolean); }
function productImageFallback(img){ if(!img) return; img.onerror = null; img.src = PRODUCT_PLACEHOLDER_SVG; img.classList.add('placeholder-img'); }
function galleryThumbLoaded(img){ if(img) img.style.display = 'block'; }
function galleryThumbError(img){ if(img) img.remove(); }
function setProductMainImage(src, thumb){ const main = document.querySelector('[data-product-main-image]'); if(!main) return; main.src = src; document.querySelectorAll('.gallery-thumb').forEach(t=>t.classList.remove('active')); if(thumb) thumb.classList.add('active'); }

const PRICE_TABLE_URL = '/assets/data/tabela-precos.csv';
const RABIOLA_SLUGS = ['rabiola-cotoco-normal-20cm', 'rabiola-cotoco-normal-fita-10cm', 'rabiola-cabelinho-anjo', 'rabiola-cotoco-curta-fita-10cm', 'rabiola-cotoco-normal-10cm-75m', 'rabiola-cotoco-normal-10cm-100m'];
      const RABIOLA_PRICE_TIERS = {
              'rabiola-cotoco-normal-20cm': { base: 35, bulkMinQty: 100, bulkPrice: 34 },
              'rabiola-cotoco-normal-fita-10cm': { base: 35, bulkMinQty: 100, bulkPrice: 34 },
              'rabiola-cabelinho-anjo': null,
              'rabiola-cotoco-curta-fita-10cm': null
      };
      function rabiolaTierFor(slug){ return RABIOLA_PRICE_TIERS[slug] || null; }
      function rabiolaUnitPriceFor(slug, qty){
              const tier = rabiolaTierFor(slug);
              if(!tier) return null;
              const q = Number(qty || 0);
              if(tier.superBulkMinQty && q >= tier.superBulkMinQty) return tier.superBulkPrice;
              if(q >= tier.bulkMinQty) return tier.bulkPrice;
              return tier.base;
      }
      function rabiolaPricingNoteFor(slug, qty){
              const tier = rabiolaTierFor(slug);
              if(!tier || (tier.bulkPrice >= tier.base && !tier.superBulkMinQty)) return RABIOLA_SLUGS.includes(slug) ? 'Preço fixo por pacote, sem desconto por quantidade.' : '';
              const q = Number(qty || 0);
              if(tier.superBulkMinQty && q >= tier.superBulkMinQty) return `Preço de lojista aplicado: ${money(tier.superBulkPrice)} cada (${tier.superBulkMinQty}+ pacotes).`;
              if(q >= tier.bulkMinQty) return `Preço especial aplicado: ${money(tier.bulkPrice)} cada (${tier.bulkMinQty}+ pacotes).`;
              return `A partir de ${tier.bulkMinQty} pacotes deste modelo: ${money(tier.bulkPrice)} por pacote.`;
      }
function splitCsvLine(line, delimiter = ';'){
    const result = [];
    let current = '';
    let inQuotes = false;
    for(let i = 0; i < line.length; i++){
        const char = line[i];
        const next = line[i + 1];
        if(char === '"' && inQuotes && next === '"'){
            current += '"';
            i++;
            continue;
        }
        if(char === '"'){
            inQuotes = !inQuotes;
            continue;
        }
        if(char === delimiter && !inQuotes){
            result.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }
    result.push(current.trim());
    return result;
}
function parsePriceValue(value){
    const normalized = String(value || '').replace(/\s/g, '').replace(/R\$/gi, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}
function parsePriceCsv(text){
    const cleaned = String(text || '').replace(/^\uFEFF/, '');
    const lines = cleaned.split(/\r?\n/).filter(line => line.trim());
    if(lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]).map(header => header.replace(/^\uFEFF/, '').trim());
    return lines.slice(1).map(line => {
        const values = splitCsvLine(line);
        return headers.reduce((row, header, index) => {
            row[header] = (values[index] || '').trim();
            return row;
        }, {});
    });
}
function applyPriceTable(rows){
    const grouped = rows.reduce((acc, row) => {
        const active = String(row.ativo || '').trim().toLowerCase();
        if(active && !['sim','s','yes','1','true','ativo'].includes(active)) return acc;
        const slug = (row.slug_produto || '').trim();
        const preco = parsePriceValue(row.preco);
        if(!slug || preco === null) return acc;
        if(!acc[slug]) acc[slug] = [];
        acc[slug].push({ ...row, precoNumber: preco });
        return acc;
    }, {});
    products.forEach(product => {
        const rowsForProduct = grouped[product.slug];
        if(!rowsForProduct || !rowsForProduct.length) return;
        product.nome = rowsForProduct[0].produto || product.nome;
        product.subtipo = product.nome;
        product.resumo = `Produto oficial ${STORE.nome}.`;
        product.variacoes = rowsForProduct.map(row => ({
            label: row.label_site || row.variacao || 'Padrão',
            preco: row.precoNumber,
            variacao: row.variacao || '',
            tipoVenda: row.tipo_venda || '',
            unidadePreco: row.unidade_preco || '',
            quantidadePacote: row.quantidade_pacote || '',
            observacao: row.observacao || ''
        }));
    });
}
let psbPricePromise=null;
async function loadPriceTable(){
    if(psbPricePromise)return psbPricePromise;
    psbPricePromise=(async()=>{
        window.__PSB_PRICE_TABLE_LOADING__=true;
        try{
            const res=await fetch(supabaseRestBase()+'/psb_catalog_products?select=*&order=slug.asc',{headers:supabaseHeaders('',true),cache:'no-cache',signal:AbortSignal.timeout(15000)});
            if(!res.ok)throw new Error('Catálogo indisponível');
            const rows=await res.json();
            if(!Array.isArray(rows)||!rows.length)throw new Error('Catálogo vazio');
            for(const p of products){
                const row=rows.find(r=>r.slug===p.slug);
                if(!row||!Array.isArray(row.variations)||!row.variations.length)throw new Error('Produto sem preço confirmado');
                if(row.variations.some(v=>typeof v.preco!=='number'||!Number.isFinite(v.preco)||v.preco<0||!v.label))throw new Error('Preço inválido');
            }
            for(const p of products){const row=rows.find(r=>r.slug===p.slug);p.nome=row.product_name;p.variacoes=row.variations;p.catalogUpdatedAt=row.updated_at;if(row.tiers)RABIOLA_PRICE_TIERS[p.slug]=row.tiers;else delete RABIOLA_PRICE_TIERS[p.slug];}
            cart=cart.map(i=>{const p=bySlug(i.slug),v=p?.variacoes.find(v=>v.label===i.variacao);return v?{...i,nome:p.nome,preco:v.preco}:i;});
            saveCart();window.__PSB_PRICE_TABLE_LOADED__=true;
        }catch{window.__PSB_PRICE_TABLE_LOADED__=false;}
        finally{window.__PSB_PRICE_TABLE_LOADING__=false;psbPricePromise=null;}
    })();return psbPricePromise;
}
function psbPriceLoadingMarkup(){
    return '<section class="section"><div class="container"><div class="empty-state" role="status"><h1>'+ (window.__PSB_PRICE_TABLE_LOADING__?'Confirmando os preços…':'Catálogo temporariamente indisponível')+'</h1><p>Estamos consultando os valores atuais para você comprar com confiança.</p>'+(!window.__PSB_PRICE_TABLE_LOADING__?'<button class="btn btn-primary" onclick="loadPriceTable().then(()=>router())">Tentar novamente</button>':'')+'</div></div></section>';
}


/* ==========================================================================
   2. CATALOG DATA (FAMÍLIA + VARIAÇÕES)
   ========================================================================== */
const categories = [
    { slug: 'linhas', name: 'Linhas' },
    { slug: 'pipas', name: 'Pipas' },
    { slug: 'carretilhas', name: 'Carretilhas' },
    { slug: 'folhas', name: 'Folhas' },
    { slug: 'fibras', name: 'Fibras' },
    { slug: 'bambu', name: 'Bambu' },
    { slug: 'formas', name: 'Formas para fabricar pipas' },
    { slug: 'colas', name: 'Colas' },
    { slug: 'rabiolas', name: 'Rabiolas' }
];

const genFibras = () => {
    const vars = [];
    ['42cm', '45cm', '50cm', '100cm', '205cm'].forEach(comp => {
        ['1.4', '1.6', '1.8', '2.0', '2.2', '2.5', '2.7', '3.0'].forEach(esp => {
            vars.push({ label: `${comp} - Espessura ${esp}`, preco: 35 });
        });
    });
    return vars;
};

const pipasVars1 = [ {label: '50cm', preco: 1.6}, {label: '55cm', preco: 1.9}, {label: '57cm', preco: 2.0}, {label: '60cm', preco: 2.2}, {label: '62cm', preco: 2.5}, {label: '72cm', preco: 6.0} ];
const pipasVars2 = [ {label: '50cm', preco: 2.0}, {label: '55cm', preco: 2.5}, {label: '57cm', preco: 2.5}, {label: '60cm', preco: 3.0}, {label: '62cm', preco: 3.5}, {label: '72cm', preco: 4.0} ];

let idC = 1;
const createProduct = (slug, nome, cat, tags, img, vars, desc = '') => {
    return {
        id: idC++, slug, nome, categoria: cat, subtipo: nome,
        resumo: `Produto oficial ${STORE.nome}.`,
        desc: desc || 'Material de alta qualidade e performance, ideal para a prática da cultura pipeira.',
        seller: STORE.nome, img: img, galeria: [img, REF.img2], tags,
        variacoes: vars
    };
};

const products = [
    // Linhas
    createProduct('linha-chilena', 'Linha Chilena', 'linhas', ['premium', 'competicao', 'destaque'], REF.img3, [
        {label: '100jds', preco: 10}, {label: '200jds', preco: 15}, {label: '500jds', preco: 25}, {label: '1000jds', preco: 50}, {label: '2000jds', preco: 85}, {label: '3000jds', preco: 130}, {label: '6000jds', preco: 200}, {label: '12000jds', preco: 350}
    ]),
    createProduct('linha-indonesia', 'Linha Indonésia', 'linhas', ['premium', 'competicao'], REF.img3, [
        {label: '1000jds', preco: 80}, {label: '2000jds', preco: 150}, {label: '3000jds', preco: 300}, {label: '6000jds', preco: 450}
    ]),
    createProduct('linha-vera-cruz', 'Linha Vera Cruz', 'linhas', ['competicao'], REF.img4, [
        {label: '500jds', preco: 12}, {label: '1000jds', preco: 20}, {label: '3000jds', preco: 65}, {label: '6000jds', preco: 100}, {label: '12000jds', preco: 150}
    ]),
    createProduct('linha-ultra', 'Linha Ultra', 'linhas', ['competicao'], REF.img4, [
        {label: '500jds', preco: 10}, {label: '1000jds', preco: 20}, {label: '6000jds', preco: 85}, {label: '12000jds', preco: 130}
    ]),
    createProduct('linha-bold', 'Linha Bold', 'linhas', ['competicao'], REF.img4, [
        {label: '500jds', preco: 10}, {label: '1000jds', preco: 20}, {label: '6000jds', preco: 85}, {label: '12000jds', preco: 130}
    ]),
    createProduct('linha-circulo', 'Linha Circulo', 'linhas', ['competicao'], REF.img4, [
        {label: '500jds', preco: 10}, {label: '1000jds', preco: 20}, {label: '6000jds', preco: 85}, {label: '12000jds', preco: 130}
    ]),
    createProduct('linha-pro-combate', 'Linha Pro Combate', 'linhas', ['competicao'], REF.img4, [
        {label: '500jds', preco: 10}, {label: '1000jds', preco: 20}, {label: '6000jds', preco: 85}, {label: '12000jds', preco: 130}
    ]),

    // Pipas
    createProduct('mucha', 'Mucha', 'pipas', ['iniciante', 'destaque'], REF.img1, pipasVars1),
    createProduct('mucha-mucha', 'Mucha Mucha', 'pipas', ['iniciante'], REF.img1, pipasVars1),
    createProduct('charuto', 'Charuto', 'pipas', ['competicao'], REF.img1, pipasVars2),
    createProduct('cachorro-louco', 'Cachorro Louco', 'pipas', ['competicao'], REF.img1, pipasVars2),
    createProduct('vanda', 'Vanda', 'pipas', ['competicao'], REF.img1, pipasVars2),
    createProduct('gt', 'GT', 'pipas', ['competicao'], REF.img1, pipasVars2),
    createProduct('come-rato', 'Come Rato', 'pipas', ['iniciante'], REF.img1, pipasVars2),
    createProduct('briti', 'Britt', 'pipas', ['competicao'], REF.img1, pipasVars2),
    createProduct('latao', 'Latão', 'pipas', ['iniciante'], REF.img1, pipasVars2),
    createProduct('carrapeto', 'Carrapeto', 'pipas', ['iniciante'], REF.img1, pipasVars2),

    // Carretilhas
    createProduct('carretilhas-madeira', 'Carretilhas Madeira', 'carretilhas', ['premium', 'equipe', 'destaque'], REF.img2, [
        {label: '10 pol', preco: 110}, {label: '11 pol', preco: 120}, {label: '12 pol', preco: 150}, {label: '14 pol', preco: 170}, {label: '20 pol', preco: 295}
    ]),
    createProduct('carretilhas-plastico', 'Carretilhas Plástico', 'carretilhas', ['iniciante'], REF.img2, [
        {label: 'Pequena', preco: 20}, {label: 'Média', preco: 35}, {label: 'Grande', preco: 45}
    ]),
    createProduct('latas', 'Latas', 'carretilhas', ['iniciante'], REF.img2, [ {label: 'Padrão', preco: 6} ]),

    // Folhas
    createProduct('folhas-cores', 'Folhas de cores', 'folhas', ['fabricacao'], REF.img5, [
        {label: '45x45 pct100und', preco: 24}, {label: '50x50 pct100und', preco: 24}, {label: '45x70 pct100und', preco: 24}
    ]),
    createProduct('folhas-desenhadas', 'Folhas desenhadas', 'folhas', ['fabricacao'], REF.img5, [
        {label: '45x45 pct100und', preco: 24}, {label: '50x50 pct100und', preco: 28}, {label: '45x70 pct100und', preco: 40}
    ]),
    createProduct('folhas-corte-recorte', 'Folhas Corte e Recorte', 'folhas', ['fabricacao'], REF.img5, [
        {label: '45x45 pct100und', preco: 65}, {label: '50x50 pct100und', preco: 80}, {label: '45x70 pct100und', preco: 80}
    ]),
    createProduct('folhas-laminadas', 'Folhas laminadas', 'folhas', ['fabricacao'], REF.img5, [
        {label: '45x45 pct100und', preco: 65}, {label: '50x50 pct100und', preco: 80}, {label: '45x70 pct100und', preco: 80}
    ]),

    // Fibras
    createProduct('fibra', 'Fibra', 'fibras', ['fabricacao'], REF.img2, genFibras()),

    // Bambu
    createProduct('bambu', 'Bambu', 'bambu', ['fabricacao'], REF.img2, [
        {label: '52cm', preco: 80}, {label: '55cm', preco: 130}, {label: '57cm', preco: 140}, {label: '60cm', preco: 150}, {label: '62cm', preco: 160}, {label: '70cm', preco: 180}, {label: '72cm', preco: 185}
    ]),

    // Formas
    createProduct('forma-fabricar', 'Forma para fabricar pipas', 'formas', ['fabricacao'], REF.img2, [
        {label: '50cm', preco: 70}, {label: '55cm', preco: 85}, {label: '60cm', preco: 70}, {label: '70cm', preco: 90}
    ]),

    // Colas
    createProduct('cola', 'Cola', 'colas', ['fabricacao'], REF.img5, [
        {label: '1lt', preco: 35}, {label: '5lt', preco: 130}
    ]),

    // Rabiolas
    createProduct('rabiola-cotoco-normal-20cm', 'Rabiola Cotoco - Normal 20cm', 'rabiolas', ['complementos', 'reposicao'], REF.img2, [ {label: 'Pacote', preco: 35} ], 'Rabiola Cotoco Normal, folhete de 20 cm e espaçamento de 25 cm. Confira abaixo o desconto por quantidade.'),
          createProduct('rabiola-cotoco-normal-fita-10cm', 'Rabiola Cotoco - Normal fita 10cm', 'rabiolas', ['complementos', 'reposicao'], REF.img2, [ {label: 'Pacote', preco: 35} ], 'Rabiola Cotoco Normal, folhete de 10 cm e espaçamento de 15 cm. Confira abaixo o desconto por quantidade.'),
          createProduct('rabiola-cabelinho-anjo', 'Rabiola Cabelinho de Anjo', 'rabiolas', ['complementos', 'reposicao'], REF.img2, [ {label: 'Pacote', preco: 50} ], 'Rabiola Cabelinho de Anjo, folhete de 30 cm e espaçamento de 30 a 35 cm. Preço por pacote.'),
          createProduct('rabiola-cotoco-curta-fita-10cm', 'Rabiola Cotoco - Curta fita 10cm', 'rabiolas', ['complementos', 'reposicao'], REF.img2, [ {label: 'Pacote', preco: 50} ], 'Rabiola Cotoco Curta, folhete de 10 cm e espaçamento de 5 a 10 cm. Preço por pacote.'),
      ];

products.push(
    createProduct('rabiola-cotoco-normal-10cm-75m','Rabiola Cotoco - Normal 10cm - 75m','rabiolas',['complementos','reposicao'],PRODUCT_PLACEHOLDER_SVG,[{label:'Pacote de 75 m',preco:10}],'Rabiola Cotoco Normal de 75 m, folhete de 10 cm e espaçamento de 15 cm. Preço fixo por pacote.'),
    createProduct('rabiola-cotoco-normal-10cm-100m','Rabiola Cotoco - Normal 10cm - 100m','rabiolas',['complementos','reposicao'],PRODUCT_PLACEHOLDER_SVG,[{label:'Pacote de 100 m',preco:14}],'Rabiola Cotoco Normal de 100 m, folhete de 10 cm e espaçamento de 15 cm. Preço fixo por pacote.')
);

const blogPosts = [
    { slug: 'historia-juninho-pipas', cat: 'marca', title: 'Como nasceu a Juninho Pipas', summary: 'Da varanda de casa até a loja física em Porto Velho, conheça a trajetória guiada por amor e paixão pela arte de soltar pipas.', img: REF.blogPlaceholder },
    { slug: 'trajetoria-loja-fisica', cat: 'marca', title: 'Da varanda de casa à loja física', summary: 'O crescimento orgânico, o atendimento humano e a construção de um ecossistema pipeiro de credibilidade.', img: REF.blogPlaceholder },
    { slug: 'trajetoria-porto-velho', cat: 'marca', title: 'A trajetória da Juninho Pipas em Porto Velho', summary: 'Como a loja se consolidou e hoje atende todo o Brasil com variedade e confiança.', img: REF.blogPlaceholder },
    { slug: 'escolher-linha', cat: 'produto', title: 'Como escolher a linha ideal', summary: 'Diferenças entre modelos de linha, variações e critérios de compra responsável.', img: REF.blogPlaceholder },
    { slug: 'escolher-pipa', cat: 'produto', title: 'Como escolher a pipa certa para o seu perfil', summary: 'Modelos Mucha, Charuto ou GT: descubra qual se adapta melhor ao seu estilo e vento local.', img: REF.blogPlaceholder },
    { slug: 'montar-kit', cat: 'produto', title: 'Como montar um kit eficiente', summary: 'As combinações ideais entre pipa, carretilha e rabiola para lazer, eventos e prática organizada.', img: REF.blogPlaceholder },
    { slug: 'pratica-responsavel', cat: 'cultura', title: 'A prática de soltar pipas com responsabilidade', summary: 'Por que é fundamental escolher locais apropriados, longe da rede elétrica, respeitando o espaço público.', img: REF.blogPlaceholder },
    { slug: 'papel-aspiron', cat: 'cultura', title: 'O papel da ASPIRON na valorização da cultura pipeira', summary: 'A Associação dos Pipeiros do Estado de Rondônia e sua luta por organização e reconhecimento.', img: REF.blogPlaceholder },
    { slug: 'boas-praticas', cat: 'cultura', title: 'Boas práticas e segurança nos locais apropriados', summary: 'Regras de ouro para aproveitar o festival e os pipódromos sem colocar ninguém em risco.', img: REF.blogPlaceholder }
];

/* ==========================================================================
   3. CART, HELPERS, RENDER E ROUTER
   ========================================================================== */
let cart = JSON.parse(localStorage.getItem('psb_cart_23') || '[]');
let currentToast;
const app = document.getElementById('app');
const priceFrom = p => {
          const base = Math.min(...p.variacoes.map(v => v.preco));
          const tier = rabiolaTierFor(p.slug);
          return tier ? Math.min(base, tier.bulkPrice) : base;
};
      const moneyFrom = p => money(priceFrom(p));
      function productPriceLabel(p){
                const tier = rabiolaTierFor(p.slug);
                if(tier && tier.bulkPrice < tier.base) return `${money(tier.base)} / pacote • ${tier.bulkMinQty}+ por ${money(tier.bulkPrice)}`;
                if(p.categoria==='rabiolas' && p.variacoes.length===1) return `${money(p.variacoes[0].preco)} / pacote`;
                return `A partir de ${moneyFrom(p)}`;
      }
      function variationUnitPrice(product, variation, qty = 1){
                const tier = rabiolaTierFor(product?.slug);
                if(tier){ const uPrice = rabiolaUnitPriceFor(product.slug, qty); if(uPrice !== null) return uPrice; }
                return variation?.preco || 0;
      }
      function itemUnitPrice(item){
                const tier = rabiolaTierFor(item?.slug);
                if(tier){ const uPrice = rabiolaUnitPriceFor(item.slug, item?.qty); if(uPrice !== null) return uPrice; }
                return item?.preco || 0;
      }
      function itemTotal(item){ return Math.round(itemUnitPrice(item) * (Number(item?.qty || 0) || 0) * 100) / 100; }
      function itemPricingNote(item){
                return rabiolaPricingNoteFor(item?.slug, item?.qty);
      }
      function productBulkNote(product, qty = 1){
                return rabiolaPricingNoteFor(product?.slug, qty);
      }
const bySlug = slug => products.find(p => p.slug === slug);
const totals = () => ({ subtotal: Math.round(cart.reduce((a,i)=>a+itemTotal(i),0)*100)/100, total: Math.round(cart.reduce((a,i)=>a+itemTotal(i),0)*100)/100 });
const sellerTotals = sellerId => Math.round((groupCartBySeller()[sellerId]?.items || []).reduce((acc,item)=>acc + itemTotal(item),0)*100)/100;
const families = () => [...new Set(products.map(p => p.nome))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
const catName = slug => (categories.find(c => c.slug === slug) || {}).name || slug;
const isPremium = p => (p.tags || []).includes('premium');
const categoryPriority = { linhas: 5, pipas: 4, carretilhas: 3, folhas: 2, fibras: 2, bambu: 2, formas: 2, colas: 1, rabiolas: 1 };
const relevanceScore = p => (((p.tags || []).includes('destaque') ? 100 : 0) + ((p.tags || []).includes('premium') ? 30 : 0) + ((categoryPriority[p.categoria] || 0) * 10));
const galleryImgs = [REF.fachada, REF.loja, REF.img1, REF.img2, REF.img3, REF.img4, REF.img5, REF.img6, REF.evento, REF.eventUsina];
const articleText = {
  marca: ['A trajetória da Juninho Pipas é marcada por presença local, relacionamento com a comunidade e crescimento construído com atendimento humano.', 'A loja física em Porto Velho fortaleceu confiança, recorrência e reputação para atender clientes que buscam variedade, agilidade e credibilidade.', 'O blog reforça a história da marca, a autoridade no segmento e a conexão com a comunidade pipeira.'],
  produto: ['O catálogo foi organizado por famílias e variações para facilitar comparação, reduzir ruído visual e acelerar a conclusão do pedido.', 'Linhas, pipas e carretilhas lideram a jornada comercial, enquanto materiais de fabricação complementam ticket médio e recompra.', 'A lógica do site prioriza clareza: o cliente entende a família, escolhe a variação e conclui pelo WhatsApp com confirmação humana.'],
  cultura: ['A prática de soltar pipas deve acontecer com responsabilidade, em locais apropriados, longe da rede elétrica e observando a legislação vigente.', 'A ASPIRON atua como elo entre comunidade, eventos, orientação e valorização da cultura pipeira em Rondônia.', 'Eventos organizados, boas práticas e informação correta elevam o nível da comunidade e fortalecem o esporte, a cultura e o lazer com responsabilidade.']
};
const buildOrderMessage = (sellerId, customerData) => {
    const seller = getStoreById(sellerId);
    const items = (groupCartBySeller()[sellerId]?.items || []);
    const subtotal = sellerTotals(sellerId);
    const itemsText = items.map(i=>`• ${i.qty}x ${i.nome} | ${i.variacao} | ${money(itemTotal(i))}${itemPricingNote(i) ? ` (${itemPricingNote(i)})` : ''}`).join('\n');
    return {
        seller,
        subtotal,
        items,
        text: `Olá! Quero confirmar meu pedido na ${seller.nome}.\n\nCliente: ${customerData.name}\nTelefone: ${customerData.phone}\nCidade/UF: ${customerData.city}\nEntrega: ${customerData.delivery}\nPagamento: ${customerData.payment}\n\nItens:\n${itemsText}\n\nSubtotal: ${money(subtotal)}\nFrete: a confirmar\n${customerData.obs?`Observações: ${customerData.obs}\n`:''}Por favor, confirmar disponibilidade e próximos passos.`
    };
};

function saveCart(){ localStorage.setItem('psb_cart_23', JSON.stringify(cart)); updateCartCount(); }
function updateCartCount(){ const count = cart.reduce((acc,i)=>acc+i.qty,0); const el = document.getElementById('cartCount'); if(el) el.textContent = count; }
function showToast(msg='✅ Produto adicionado ao pedido.'){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(currentToast); currentToast=setTimeout(()=>t.classList.remove('show'),2200); }
function toggleMenu(){const open=document.getElementById('navMenu').classList.toggle('active-menu');document.querySelector('.menu-toggle').setAttribute('aria-expanded',String(open));}
function toggleAccordion(el){ el.parentElement.classList.toggle('active'); }
function openLightbox(src){ const lb=document.getElementById('lightbox'); document.getElementById('lightbox-img').src=src; lb.classList.add('active'); }
function closeLightbox(e){ if(!e || e.target.id==='lightbox' || e.target.classList.contains('lightbox-close')) document.getElementById('lightbox').classList.remove('active'); }
function clearCart(){ if(!cart.length) return; if(!confirm('Deseja limpar todo o carrinho?')) return; cart=[]; saveCart(); showToast('Carrinho limpo com sucesso.'); router(); }
function clearFilters(){ const category=document.getElementById('categoryFilter'); const family=document.getElementById('familyFilter'); const price=document.getElementById('priceFilter'); const sort=document.getElementById('sortFilter'); const premium=document.getElementById('premiumFilter'); const search=document.getElementById('searchFilter'); if(category) category.value='all'; if(price) price.value='all'; if(sort) sort.value='relevancia'; if(premium) premium.checked=false; if(search) search.value=''; fillFamilyOptions(); if(family) family.value='all'; applyFilters(); showToast('Filtros redefinidos.'); }
function fillFooterContact(){ document.getElementById('footerContactInfo').innerHTML = `<h4 style="color:var(--c-white); font-size:1.1rem;">Contato</h4><p class="text-gray" style="font-size:0.95rem;"><strong style="color:var(--c-white);">Endereço:</strong><br>${STORE.endereco}, ${STORE.bairro}<br>${STORE.cidade} - ${STORE.uf}</p><p class="text-gray" style="font-size:0.95rem;"><strong style="color:var(--c-white);">WhatsApp:</strong> <a href="${getWaLink(STORE.waGeral,'Olá! Quero falar com a Pipas Store Brasil.')}" target="_blank" rel="noopener noreferrer">+55 69 99384-0970</a><br><strong style="color:var(--c-white);">Instagram:</strong> ${STORE.instagram}<br><strong style="color:var(--c-white);">Email:</strong> ${STORE.email}</p><p class="text-gray" style="font-size:0.95rem;"><strong style="color:var(--c-white);">Horários:</strong><br>${STORE.horarios}</p><button class="btn btn-secondary btn-block" onclick="openMap()">Abrir no Google Maps</button>`; }
function openWhatsApp(origin='site', txt='Olá! Quero atendimento da Pipas Store Brasil.', phone=STORE.waGeral) { trackEvent('open_whatsapp',{origin, phone}); const waWindow = window.open(getWaLink(phone || STORE.waGeral, txt), '_blank', 'noopener,noreferrer'); if(!waWindow) showToast('Não foi possível abrir o Whatsapp. Verifique o bloqueador de pop-up.'); }
function openPartnerWhatsApp(txt='Olá! Quero falar sobre parceria comercial com a Pipas Store Brasil.') { trackEvent('open_partner_whatsapp',{origin: location.hash || '#/seja-lojista'}); const waWindow = window.open(getWaLink(STORE.waParceiro || STORE.waGeral, txt), '_blank', 'noopener,noreferrer'); if(!waWindow) showToast('Não foi possível abrir o WhatsApp do setor de parcerias. Verifique o bloqueador de pop-up.'); }
function openMap(){ trackEvent('open_map',{origin: location.hash || '#/home'}); const mapWindow = window.open(STORE.mapLink, '_blank', 'noopener,noreferrer'); if(!mapWindow) showToast('Não foi possível abrir o mapa. Verifique o bloqueador de pop-up.'); }


function removeItem(key){ cart = cart.filter(i=>i.key!==key); saveCart(); router(); }
function changeQty(key,delta){ const item=cart.find(i=>i.key===key); if(!item) return; item.qty=Math.max(1,item.qty+delta); saveCart(); router(); }

function normalizeText(value){ return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function setCategoryFilter(slug){ const category=document.getElementById('categoryFilter'); if(category) category.value=slug; fillFamilyOptions(); applyFilters(); const panel=document.getElementById('shopControlPanel'); if(panel) panel.scrollIntoView({block:'nearest'}); }
function productSearchText(p){ return normalizeText([p.nome, p.desc, catName(p.categoria), p.categoria, ...(p.variacoes||[]).map(v=>v.label), ...(p.tags||[])].join(' ')); }
function shopTrustRail(){ return `<div class="trust-rail"><div class="trust-pill"><strong>Loja homologada</strong>Juninho Pipas oficial</div><div class="trust-pill"><strong>Pedido registrado</strong>Histórico no sistema</div><div class="trust-pill"><strong>Pagamento seguro</strong>Só após confirmação</div><div class="trust-pill"><strong>Atendimento humano</strong>Fechamento via WhatsApp</div></div>`; }
function updatePrice(){ const p = bySlug((psbRoute().slug||'')); const sel=document.getElementById('variationSelect'); const price=document.getElementById('pdPrice'); const sticky=document.getElementById('pdStickyPrice'); const qtyInput=document.getElementById('qtyInput'); if(!p||!sel||!price) return; const v=p.variacoes.find(x=>x.label===sel.value) || p.variacoes[0]; const qty=Math.max(1, parseInt(qtyInput?.value || 1,10) || 1); const unitPrice = variationUnitPrice(p,v,qty); price.textContent = money(unitPrice); if(sticky) sticky.textContent = money(unitPrice); const note=document.getElementById('pdBulkNote'); if(note) note.textContent = productBulkNote(p, qty); trackEvent('select_variation',{slug:p.slug,variacao:v.label,preco:unitPrice,qty}); }

function fillFamilyOptions(){ const familySel=document.getElementById('familyFilter'); if(!familySel) return; const currentValue = familySel.value || 'all'; const cat=document.getElementById('categoryFilter')?.value || 'all'; const base = cat==='all' ? products : products.filter(p=>p.categoria===cat); const familyOptions = [...new Set(base.map(p=>p.nome))].sort((a,b)=>a.localeCompare(b,'pt-BR')); familySel.innerHTML = `<option value="all">Todas as famílias</option>` + familyOptions.map(n=>`<option value="${n}">${n}</option>`).join(''); familySel.value = familyOptions.includes(currentValue) ? currentValue : 'all'; }

function psbBrowseCategory(slug){window.psbNextCategory=slug;if(psbRoute().page==='loja')router();}
function setIntent(){ return; }

function renderHome(){
const featured=['mucha','carretilhas-madeira','rabiola-cotoco-curta-fita-10cm'].map(bySlug).filter(Boolean);
const cats=[['pipas','Pipas','Do papel ao céu.','mucha'],['carretilhas','Carretilhas','O voo na sua mão.','carretilhas-madeira'],['rabiolas','Rabiolas','O detalhe faz o voo.','rabiola-cotoco-curta-fita-10cm']];
return `<div class="premium-home"><section class="editorial-hero"><div class="editorial-copy"><p class="eyebrow">Pipas Store Brasil · Cultura em movimento</p><h1>Feita de papel.<br>Movida a<br><em>paixão.</em></h1><p class="editorial-intro">Pipas, carretilhas e acessórios.<br>Retirada em Porto Velho e envio para outras regiões, conforme as condições da loja.</p><div class="editorial-actions"><a class="btn btn-primary" href="/loja">Comprar pipas e acessórios <span aria-hidden="true">↗</span></a><a class="editorial-link" href="/seja-lojista">Faça parte como lojista →</a></div><p class="hero-origin">De Porto Velho para a cultura pipeira.</p></div><figure class="editorial-photo"><img src="/assets/gallery/galeria-1.webp" width="1280" height="720" fetchpriority="high" alt="Parede de pipas coloridas na loja Juninho Pipas"><figcaption><span>Dentro da nossa casa</span><strong>Juninho Pipas / Porto Velho, RO</strong></figcaption></figure></section><div class="editorial-trust"><span>01 <strong>Lojas homologadas</strong></span><span>02 <strong>Pedido registrado no site</strong></span><span>03 <strong>Atendimento de quem entende</strong></span></div><section class="editorial-categories"><div class="container"><div class="editorial-heading"><div><p class="eyebrow">Encontre o seu próximo voo</p><h2>O céu é só<br>o começo.</h2></div><a href="/loja" class="editorial-link">Todas as categorias ↗</a></div><div class="category-collection">${cats.map(([cat,title,desc,slug],i)=>`<a class="category-tile" href="/loja/${cat}"><div class="category-top"><span>0${i+1}</span><span aria-hidden="true">↗</span></div><img src="${psbStudioImage(slug,true)||getProductMainImage(slug)}" alt="${title}" loading="lazy" decoding="async" width="600" height="600"><div><h3>${title}</h3><p>${desc}</p></div></a>`).join('')}</div></div></section><section class="section editorial-selection"><div class="container"><div class="editorial-heading"><div><p class="eyebrow">Escolhas para levar ao céu</p><h2>Seu próximo pedido<br>começa por aqui.</h2></div><a class="editorial-link" href="/loja">Ver catálogo completo ↗</a></div><div class="grid-4">${featured.map(productCard).join('')}</div></div></section><section class="editorial-culture"><img src="/assets/gallery/galeria-2.webp" alt="Comunidade pipeira reunida ao pôr do sol" loading="lazy" decoding="async" width="900" height="1600"><div class="container"><p class="eyebrow">Muito além da loja</p><h2>A nossa essência<br>vem de quem<br><em>vive isso.</em></h2><p>O encontro, a oficina, o primeiro voo.<br>A cultura pipeira se constrói junto.</p><div class="editorial-actions"><a href="/galeria" class="btn btn-primary">Conheça nossa comunidade ↗</a><a href="/eventos" class="editorial-link">Encontros e eventos →</a></div></div></section><section class="editorial-network"><div class="container"><span>Gente que faz parte dessa história</span><div><a href="/contato">Juninho Pipas</a><a href="/aspiron">ASPIRON</a><a href="/cao-de-caca">Cão de Caça</a></div></div></section><section class="section editorial-partner"><div class="container"><div><p class="eyebrow">Para quem vive de pipa</p><h2>Sua loja tem história.<br>Vamos dar a ela<br><em>novos caminhos.</em></h2></div><div><p>Traga seus produtos para um espaço feito para o nosso nicho. Receba pedidos e acompanhe sua operação no portal do lojista.</p><a href="/seja-lojista" class="btn btn-primary">Conhecer a parceria ↗</a><a href="/portal-lojista" class="editorial-link">Já sou parceiro →</a></div></div></section></div>`;
}






function renderCao(){ return `<section class="section"><div class="container"><div class="grid-2" style="align-items:center;"><div><img src="${REF.logoC}" alt="Cão de Caça" style="max-width:360px; margin-bottom:20px;" loading="lazy"><span class="tag-badge">Linha parceira premium</span><h1>Linha de Competição Cão de Caça</h1><p class="text-gray">Presença de marca, qualidade e posicionamento premium para quem busca linha parceira com identidade forte e conexão com a comunidade.</p><p class="text-gray">Responsável Rondônia: Juninho Pipas. Instagram: ${STORE.instagram}.</p><div class="marketplace-note" style="margin:18px 0;"><strong style="display:block; margin-bottom:8px; color:var(--c-white);">Regra comercial vigente</strong>A Linha Cão de Caça é de venda exclusiva da <strong style="color:var(--c-white);">Juninho Pipas</strong> dentro da estrutura do marketplace.</div><div style="display:flex; gap:12px; flex-wrap:wrap;"><button class="btn btn-primary" onclick="openWhatsApp('cao-de-caca','Olá! Quero saber mais sobre a Linha de Competição Cão de Caça.')">Falar no WhatsApp</button><a class="btn btn-secondary" href="/loja">Ver catálogo</a></div></div><div class="card" style="padding:30px;"><h3>Diferenciais</h3><ul class="text-gray" style="padding-left:18px;"><li>Foco em qualidade e performance.</li><li>Tipos de linhas em evidência: Vera Cruz, Círculo, Ultra e Boldline.</li><li>Complementos de marca como camisas e bandeiras.</li><li>Comunicação premium e alinhada à identidade visual do ecossistema.</li></ul></div></div></div></section>`; }
function renderAspiron(){ return `<section class="section"><div class="container"><div class="grid-2" style="align-items:center; margin-bottom:34px;"><div><img src="${REF.logoA}" alt="ASPIRON" style="max-width:200px; margin-bottom:16px;" loading="lazy"><span class="tag-badge">Institucional</span><h1>ASPIRON: esporte, cultura, lazer e responsabilidade</h1><p class="text-gray">A ASPIRON – Associação dos Pipeiros do Estado de Rondônia atua para valorizar, organizar e representar a comunidade pipeira, promovendo orientação, festivais, campeonatos e diálogo institucional.</p><p class="text-gray">Fundada em 2022 por Juninho Pipas, a associação reforça uma pauta de responsabilidade, pertencimento e desenvolvimento da prática em ambientes adequados.</p><a class="btn btn-success" href="https://wa.me/5569999412054" target="_blank" rel="noopener noreferrer">Falar com a ASPIRON</a></div><div class="card" style="padding:28px;"><h3>Base legal e responsabilidade</h3><p class="text-gray">A comercialização, posse e uso de determinados tipos de linha seguem regras específicas e devem observar cadastro, autorização, locais apropriados e legislação vigente.</p><ul class="text-gray" style="padding-left:18px;"><li><a href="https://www.portovelho.ro.gov.br/artigo/44911/" target="_blank" rel="noopener noreferrer">Decreto Municipal nº 20.041/2024</a> — regula a prática de soltar pipas no município e estabelece o Dia do Pipeiro em <strong>17 de julho</strong>.</li><li><a href="https://leismunicipais.com.br/a/ro/p/porto-velho/lei-ordinaria/2025/331/3306/" target="_blank" rel="noopener noreferrer">Lei Municipal nº 3.306/2025</a> — política municipal para lazer seguro com pipas, em vigor a partir de 18/09/2025.</li><li><a href="https://sapl.al.ro.leg.br/norma/9302" target="_blank" rel="noopener noreferrer">Lei Estadual nº 4.726/2020</a>, alterada pela Lei nº 5.445/2022 — regras específicas sobre comercialização, posse e uso de determinados tipos de linha em áreas autorizadas e nos termos da legislação aplicável.</li></ul></div></div><div class="grid-3"><div class="card" style="padding:24px;"><h3>História</h3><p class="text-gray">A associação nasce da necessidade de organização, representação e fortalecimento de uma cultura que movimenta lazer, eventos e comunidade em Rondônia.</p></div><div class="card" style="padding:24px;"><h3>Missão e atuação</h3><p class="text-gray">Orientar, apoiar festivais e campeonatos, promover boas práticas, ampliar diálogo institucional e valorizar a cultura pipeira com responsabilidade.</p></div><div class="card" style="padding:24px;"><h3>Pipódromo e próximos passos</h3><p class="text-gray">A construção do futuro pipódromo está sendo acompanhada de perto, com foco em estrutura adequada, segurança e fortalecimento da prática organizada.</p></div></div><div style="margin-top:40px;"><h2>Boas práticas</h2><div class="grid-3"><div class="card" style="padding:22px;">Praticar em locais apropriados</div><div class="card" style="padding:22px;">Respeitar o espaço público</div><div class="card" style="padding:22px;">Observar a legislação vigente</div><div class="card" style="padding:22px;">Buscar orientação da ASPIRON</div><div class="card" style="padding:22px;">Valorizar a comunidade</div><div class="card" style="padding:22px;">Participar de eventos organizados</div></div></div><div class="card" style="padding:28px; margin-top:40px;"><h2>Festival de Pipas de Porto Velho</h2><p class="text-gray">Evento em destaque da agenda, nos dias <strong>18 e 19/07/2026</strong>, no Murão, Zona Leste, em Porto Velho/RO, organizado pela ASPIRON com apoio municipal e expectativa de público de 5.000 pessoas.</p></div></div></section>`; }
function renderEvents(){ return `<section class="section"><div class="container"><span class="tag-badge">Agenda</span><h1>Próximos eventos</h1><p class="text-gray" style="max-width:860px; margin-bottom:28px;">A agenda oficial já conta com eventos relevantes em Porto Velho. A página agora destaca os materiais reais enviados pelo cliente para reforçar prova social e tração da comunidade.</p><div class="grid-2" style="align-items:start;"><div class="card" style="overflow:hidden;"><img src="${REF.evento}" alt="Festival de Pipas em Porto Velho" style="width:100%; border-radius:0;" loading="lazy"><div style="padding:24px;"><span class="tag-badge">18 e 19 de julho</span><h2 style="font-size:1.6rem;">Festival de Pipas em Porto Velho</h2><p class="text-gray">Murão, Zona Leste, Porto Velho/RO. Evento com forte presença de patrocinadores, apoio institucional e ativação da comunidade pipeira no estado.</p><div style="display:flex; gap:12px; flex-wrap:wrap;"><button class="btn btn-success" onclick="openWhatsApp('eventos-murao','Olá! Quero informações sobre o Festival de Pipas em Porto Velho, no Murão.')">Quero informações</button><a class="btn btn-secondary" href="/aspiron">Ver ASPIRON</a></div></div></div><div class="card" style="overflow:hidden;"><img src="${REF.eventUsina}" alt="Mega Festival de Pipas na Usina" style="width:100%; border-radius:0;" loading="lazy"><div style="padding:24px;"><span class="tag-badge">21 de junho</span><h2 style="font-size:1.6rem;">Mega Festival de Pipas na Usina</h2><p class="text-gray">Usina, Bairro Nacional. Programação divulgada com início às <strong>9h</strong> e encerramento às <strong>19h30</strong>, com mensagem aberta para todos os pipeiros.</p><div style="display:flex; gap:12px; flex-wrap:wrap;"><button class="btn btn-success" onclick="openWhatsApp('eventos-usina','Olá! Quero informações sobre o Mega Festival de Pipas na Usina, Bairro Nacional.')">Quero informações</button><a class="btn btn-secondary" href="/aspiron">Ver ASPIRON</a></div></div></div></div></div></section>`; }
function renderGallery(){ return `<section class="section"><div class="container"><h1>Galeria</h1><p class="text-gray">Seleção visual da loja, produtos, comunidade e eventos.</p><div class="grid-4">${galleryImgs.map(img=>`<a class="card product-img" onclick="openLightbox('${img}')"><img src="${img}" alt="Galeria Pipas Store Brasil" loading="lazy" onerror="this.closest('a')?.remove()"></a>`).join('')}</div></div></section>`; }
function renderBlog(){ return `<section class="section"><div class="container"><span class="tag-badge">Conteúdo estratégico</span><h1>Blog</h1><p class="text-gray">História da marca, guias de compra e cultura pipeira com responsabilidade, em uma área separada da loja para complementar a operação comercial.</p><div class="grid-3">${blogPosts.map(p=>`<article class="card"><a class="product-img" href="/blog/${p.slug}"><img src="${p.img}" alt="${p.title}" loading="lazy" onerror="this.src=REF.blogPlaceholder"></a><div class="product-info"><div class="product-cat">${p.cat}</div><h3 class="product-title">${p.title}</h3><p class="text-gray">${p.summary}</p><a class="btn btn-secondary btn-block" href="/blog/${p.slug}">Ler artigo</a></div></article>`).join('')}</div></div></section>`; }
function renderArticle(slug){ const post=blogPosts.find(p=>p.slug===slug); if(!post) return renderNotFound(); const paragraphs = articleText[post.cat] || articleText.cultura; return `<section class="section"><div class="container" style="max-width:900px;"><a href="/blog" class="text-yellow">← Voltar para o blog</a><div style="margin-top:18px;"><img src="${post.img}" alt="${post.title}" style="width:100%; max-height:420px; object-fit:cover; border-radius:16px; border:1px solid var(--c-border);" loading="lazy"></div><div style="margin-top:24px;"><span class="tag-badge">${post.cat}</span><h1>${post.title}</h1><p class="text-gray" style="font-size:1.05rem;">${post.summary}</p>${paragraphs.map(t=>`<p class="text-gray">${t}</p>`).join('')}</div></div></section>`; }
function renderContact(){ return `<section class="section"><div class="container"><span class="tag-badge">Contato e retirada</span><h1>Contato</h1><div class="grid-2" style="align-items:start;"><div class="card" style="padding:28px;"><h3>Loja física</h3><p class="text-gray"><strong style="color:var(--c-white);">Endereço:</strong><br>${STORE.endereco}, ${STORE.bairro}<br>${STORE.cidade} - ${STORE.uf}</p><p class="text-gray"><strong style="color:var(--c-white);">Horários:</strong><br>${STORE.horarios}</p><p class="text-gray"><strong style="color:var(--c-white);">WhatsApp:</strong> +55 69 99384-0970<br><strong style="color:var(--c-white);">Instagram:</strong> ${STORE.instagram}<br><strong style="color:var(--c-white);">Email:</strong> ${STORE.email}</p><p class="text-gray">Compra online com confirmação via WhatsApp, retirada local disponível e envio nacional com frete confirmado no atendimento.</p><div style="display:flex; gap:12px; flex-wrap:wrap;"><button class="btn btn-primary" onclick="openMap()">Abrir no Google Maps</button><button class="btn btn-success" onclick="openWhatsApp('contato','Olá! Quero falar com a Pipas Store Brasil.')">Chamar no WhatsApp</button></div></div><div><img src="${REF.fachada}" alt="Fachada da loja Juninho Pipas" style="border-radius:16px; border:1px solid var(--c-border);" loading="lazy"><p class="text-gray" style="margin-top:12px; font-size:0.92rem;">Fachada real da loja física em Porto Velho/RO, reforçando presença local e credibilidade operacional.</p></div></div></div></section>`; }
function renderFaq(){ const faqs=[['Como funciona a compra?','Você escolhe os produtos no site, envia o pedido e a loja confirma a disponibilidade antes da etapa de pagamento.'],['Quais formas de pagamento existem?','Pix com comprovante via WhatsApp, link de pagamento enviado manualmente, transferência sob validação manual, cartão presencial e dinheiro na retirada.'],['Tem retirada local?','Sim. A retirada na loja é grátis em Porto Velho.'],['Como funciona a entrega local?','A entrega local pode ser feita conforme triagem do pedido, com taxa a consultar no atendimento.'],['Tem envio nacional?','Sim. O envio nacional está disponível e o frete é calculado no atendimento após a confirmação do pedido.'],['Como entram novos lojistas?','A loja interessada envia cadastro público, entra como pendente, passa por homologação manual e só recebe credenciais após aprovação.']]; return `<section class="section"><div class="container"><h1>Perguntas frequentes</h1>${faqs.map(([q,a])=>`<div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(this)">${q}<span>+</span></div><div class="accordion-body"><p>${a}</p></div></div>`).join('')}</div></section>`; }
function renderDelivery(){return `<section class="section"><div class="container"><h1>Entregas e retirada</h1>${psbDeliveryDetails()}</div></section>`;}
function renderTrade(){ return `<section class="section"><div class="container"><h1>Trocas e Devoluções</h1><div class="card" style="padding:28px;"><p class="text-gray">Solicitações passam por análise da equipe. Produtos personalizados, itens com uso ou avarias causadas após recebimento não entram automaticamente em troca.</p><p class="text-gray">Fale com a equipe pelo WhatsApp para abrir o atendimento e receber as orientações do caso.</p></div></div></section>`; }
function renderPrivacy(){ return `<section class="section"><div class="container"><h1>Política de Privacidade</h1><div class="card" style="padding:28px;"><p class="text-gray">Os dados informados no pedido são utilizados para contato, confirmação de disponibilidade, organização do atendimento e fechamento comercial.</p><p class="text-gray">A Pipas Store Brasil não vende dados pessoais e trata as informações com foco operacional, comercial e de suporte ao cliente.</p></div></div></section>`; }
function renderPartner(){ const stores = approvedStores(); const partnerOnly = stores.filter(store => store.id !== DEFAULT_SELLER_ID); const pending = pendingPartnerStores(); return `<section class="section"><div class="container"><span class="tag-badge">O próximo capítulo da sua loja</span><h1>Seu lugar na<br>cultura pipeira.</h1><p class="text-gray" style="max-width:920px;">Sua experiência, seus produtos e a sua história em um espaço dedicado a quem vive de pipa. Envie seu cadastro para análise e conheça o plano para lojas parceiras.</p><div class="partner-pricing-card"><div class="partner-pricing-grid"><div><span class="tag-badge">Lojista Fundador</span><h2 style="margin-top:14px;">Plano anual para primeiras lojas homologadas</h2><p class="text-gray">Condição comercial de entrada para lojas aprovadas na fase inicial da Pipas Store Brasil. A ativação acontece somente após análise, aprovação e confirmação do pagamento.</p><div class="partner-benefits"><div class="partner-benefit"><span><strong>Cadastro da loja</strong> no marketplace com análise manual.</span></div><div class="partner-benefit"><span><strong>Portal do lojista</strong> para acompanhar pedidos vinculados à loja.</span></div><div class="partner-benefit"><span><strong>Sem comissão sobre vendas</strong> nesta fase inicial assistida.</span></div><div class="partner-benefit"><span><strong>Pedido com confirmação de estoque</strong> antes do pagamento do cliente.</span></div></div></div><div class="partner-price-box"><div class="partner-price">R$ 497<small>por ano • condição de Lojista Fundador</small></div><p class="text-gray" style="margin-top:16px;">Vagas limitadas para as primeiras lojas homologadas. Após a fase inicial, o valor poderá ser reajustado para novos parceiros.</p><button class="btn btn-primary btn-block" onclick="document.getElementById('partnerStoreName')?.scrollIntoView({behavior:'smooth',block:'center'})">Solicitar análise</button><button class="btn btn-success btn-block" style="margin-top:10px;" onclick="openPartnerWhatsApp('Olá! Quero informações sobre o Plano Lojista Fundador da Pipas Store Brasil.')">Falar com parcerias</button><p class="text-gray" style="font-size:.85rem; margin-top:12px;">Atendimento de parcerias: +55 69 99265-6686</p></div></div></div><div style="display:flex; gap:12px; flex-wrap:wrap; margin:18px 0 8px;"><a class="btn btn-primary" href="/loja">Conhecer o catálogo</a><a class="btn btn-secondary" href="/portal-lojista">Portal do lojista</a><a class="btn btn-secondary" href="/painel-marketplace">Área administrativa</a></div><div class="grid-3" style="margin-top:28px;"><div class="card" style="padding:24px;"><h3>Catálogo único</h3><p class="text-gray">Uma vitrine organizada para o cliente encontrar o produto e escolher a loja.</p></div><div class="card" style="padding:24px;"><h3>Confirmação antes do pagamento</h3><p class="text-gray">O pedido entra pendente, a loja confirma estoque e só depois a operação avança para pagamento.</p></div><div class="card" style="padding:24px;"><h3>Credenciais após aprovação</h3><p class="text-gray">O acesso ao portal do lojista só é gerado após homologação no painel administrativo.</p></div></div><div class="grid-2" style="align-items:start; margin-top:34px;"><div class="card" style="padding:28px;"><h3>Lojas homologadas</h3><div class="store-chip-list" style="margin-top:16px;">${stores.map(store=>`<span class="store-chip">${store.nome} • ${store.cidade}</span>`).join('')}</div><div class="marketplace-note" style="margin-top:18px;"><strong style="display:block; margin-bottom:8px; color:var(--c-white);">Modelo operacional</strong>Cadastro → homologação → geração de acesso → confirmação de estoque → liberação do pagamento.</div><p class="text-gray" style="margin-top:18px;">Hoje há <strong style="color:var(--c-white);">${approvedStores().length}</strong> loja(s) homologada(s) na estrutura, com a Juninho Pipas como referência operacional.</p><p class="text-gray" style="margin-top:10px;">Cadastros pendentes: <strong style="color:var(--c-white);">${pending.length}</strong></p><div style="margin-top:18px;"><a class="btn btn-secondary" href="/loja">Ver produtos com seleção de loja</a></div></div><div class="card" style="padding:28px;"><h3>Solicitação de nova loja</h3><p class="text-gray">Preencha os dados comerciais para análise. A ativação ocorre somente após homologação e pagamento anual do Plano Lojista Fundador.</p><div class="form-group"><label class="form-label" for="partnerStoreName">Nome da loja</label><input id="partnerStoreName" class="form-control" placeholder="Ex.: Pipas Norte"></div><div class="form-group"><label class="form-label" for="partnerOwnerName">Nome do responsável</label><input id="partnerOwnerName" class="form-control" placeholder="Nome do responsável"></div><div class="form-group"><label class="form-label" for="partnerDocument">CPF/CNPJ</label><input id="partnerDocument" class="form-control" placeholder="CPF ou CNPJ"></div><div class="form-group"><label class="form-label" for="partnerStorePhone">WhatsApp comercial</label><input id="partnerStorePhone" class="form-control" placeholder="(69) 99999-9999"></div><div class="form-group"><label class="form-label" for="partnerInstagram">Instagram</label><input id="partnerInstagram" class="form-control" placeholder="@perfil_da_loja"></div><div class="form-group"><label class="form-label" for="partnerStoreCity">Cidade / UF</label><input id="partnerStoreCity" class="form-control" placeholder="Ex.: Rio Branco/AC"></div><div class="form-group"><label class="form-label" for="partnerStoreAddress">Endereço comercial</label><input id="partnerStoreAddress" class="form-control" placeholder="Rua, número e bairro"></div><div class="form-group"><label class="form-label" for="partnerPaymentMode">Fluxo de pagamento</label><select id="partnerPaymentMode" class="form-control"><option value="manual">Manual via atendimento</option><option value="automatico">Automático após aprovação</option></select></div><div class="form-group"><label class="form-label" for="partnerCardIntegration">Integração de cartão</label><select id="partnerCardIntegration" class="form-control"><option value="manual">Não integrada</option><option value="maquininha">Maquininha / captura manual</option><option value="gateway">Gateway / checkout online</option></select></div><div class="form-group"><label class="form-label" for="partnerCategories">Categorias e linhas que deseja vender</label><textarea id="partnerCategories" class="form-control" placeholder="Ex.: Linha Chilena, Linha Indonésia, Pipas 60cm"></textarea></div><div class="form-group"><label class="form-label" for="partnerOperation">Descrição da operação</label><textarea id="partnerOperation" class="form-control" placeholder="Estrutura, cobertura geográfica, diferenciais e capacidade operacional"></textarea></div><div class="form-group"><label class="form-label" for="partnerStoreNotes">Observações</label><textarea id="partnerStoreNotes" class="form-control" placeholder="Informações adicionais relevantes"></textarea></div><button class="btn btn-primary btn-block" onclick="registerPartnerStore()">Enviar para homologação</button><button class="btn btn-success btn-block" style="margin-top:12px;" onclick="openPartnerWhatsApp('Olá! Quero falar sobre parceria comercial com a Pipas Store Brasil.')">Falar sobre parceria</button><div class="step-list" style="margin-top:18px;"><div class="step-item"><strong class="text-yellow">1. Cadastro</strong><p class="text-gray" style="margin:8px 0 0;">Loja, responsável, CPF/CNPJ, canais e operação.</p></div><div class="step-item"><strong class="text-yellow">2. Homologação</strong><p class="text-gray" style="margin:8px 0 0;">Aprovação interna, definição de mix, confirmação do plano anual e geração de credenciais.</p></div><div class="step-item"><strong class="text-yellow">3. Operação</strong><p class="text-gray" style="margin:8px 0 0;">Loja aprovada e ativada recebe acesso ao portal para acompanhar pedidos e solicitar novos produtos.</p></div></div></div></div></div></section>`; }
function renderMarketplaceSpec(){ return `<section class="section"><div class="container"><span class="tag-badge">Documento executivo</span><h1>Especificação Funcional do Marketplace</h1><p class="text-gray" style="max-width:980px;">Documento-base para evolução da Pipas Store Brasil para um marketplace controlado, escalável e profissional. A diretriz consolidada é: <strong style="color:var(--c-white);">catálogo centralizado, lojistas homologados, confirmação de estoque via painel e pagamento liberado somente após aprovação da loja</strong>.</p><div class="grid-3" style="margin-top:28px;"><div class="card" style="padding:24px;"><h3>Modelo aprovado</h3><p class="text-gray">Marketplace controlado com governança central. Lojista não altera produto livremente e o site mantém consistência comercial.</p></div><div class="card" style="padding:24px;"><h3>Princípio operacional</h3><p class="text-gray">Pedido entra no sistema, loja confirma disponibilidade, pagamento é liberado depois da validação e a operação ganha rastreabilidade.</p></div><div class="card" style="padding:24px;"><h3>Diretriz visual</h3><p class="text-gray">Imagem principal padronizada por produto e galeria complementar com fotos reais por loja, preservando padrão e credibilidade.</p></div></div><div class="card" style="padding:30px; margin-top:34px;"><span class="tag-badge">Bloco 1</span><h2>Regras de sellers por produto</h2><div class="grid-3"><div class="card" style="padding:22px;"><h3>Open</h3><p class="text-gray">Produto pode ser vendido por todas as lojas homologadas habilitadas naquela categoria.</p></div><div class="card" style="padding:22px;"><h3>Restricted</h3><p class="text-gray">Produto pertence ao catálogo central, porém só pode ser vendido por um grupo específico de lojas autorizadas.</p></div><div class="card" style="padding:22px;"><h3>Exclusive</h3><p class="text-gray">Produto de venda exclusiva de uma loja. Exemplo consolidado: <strong style="color:var(--c-white);">Linha Cão de Caça = exclusiva da Juninho Pipas</strong>.</p></div></div><div class="grid-2" style="align-items:start; margin-top:24px;"><div><h3>Campos funcionais mínimos por produto</h3><ul class="text-gray" style="padding-left:18px;"><li><strong style="color:var(--c-white);">sell_mode</strong>: open, restricted ou exclusive</li><li><strong style="color:var(--c-white);">allowed_sellers</strong>: lista de lojas habilitadas</li><li><strong style="color:var(--c-white);">default_seller</strong>: Juninho Pipas como fallback operacional</li><li><strong style="color:var(--c-white);">requires_stock_confirmation</strong>: confirmação obrigatória antes do pagamento</li><li><strong style="color:var(--c-white);">catalog_status</strong>: ativo, suspenso ou em revisão</li></ul></div><div><h3>Política comercial consolidada</h3><ul class="text-gray" style="padding-left:18px;"><li>Catálogo continua centralizado pela operação principal</li><li>Lojistas parceiros não criam nem editam produtos livremente</li><li>Inclusão de novos itens/linhas ocorre por solicitação e homologação</li><li>Produtos exclusivos preservam margem, identidade e conflito zero entre sellers</li></ul></div></div></div><div class="card" style="padding:30px; margin-top:34px;"><span class="tag-badge">Bloco 2</span><h2>Fluxo do lojista parceiro</h2><div class="step-list" style="margin-top:18px;"><div class="step-item"><strong class="text-yellow">1. Cadastro</strong><p class="text-gray" style="margin:8px 0 0;">Loja envia formulário com dados cadastrais, responsável, cidade/UF, WhatsApp, cobertura, meios de pagamento, categorias que deseja vender e ciência do plano anual de ativação.</p></div><div class="step-item"><strong class="text-yellow">2. Análise interna</strong><p class="text-gray" style="margin:8px 0 0;">Operação central avalia documentação, aderência comercial, capacidade operacional, reputação e compatibilidade com o ecossistema.</p></div><div class="step-item"><strong class="text-yellow">3. Homologação</strong><p class="text-gray" style="margin:8px 0 0;">Após aprovação, a loja é ativada no sistema, vinculada aos produtos permitidos e recebe login e senha do painel.</p></div><div class="step-item"><strong class="text-yellow">4. Operação no painel</strong><p class="text-gray" style="margin:8px 0 0;">O lojista acessa apenas os próprios pedidos, confirma ou reprova disponibilidade, informa prazo e acompanha o status operacional.</p></div><div class="step-item"><strong class="text-yellow">5. Solicitações controladas</strong><p class="text-gray" style="margin:8px 0 0;">Alterações de preço, mix, inclusão de linha ou material visual passam por formulário de solicitação e aprovação central.</p></div></div><div class="grid-2" style="margin-top:24px;"><div class="marketplace-note"><strong style="display:block; margin-bottom:8px; color:var(--c-white);">Permissões do lojista</strong>Confirmar estoque, atualizar status do pedido, consultar histórico e solicitar ajustes cadastrais.</div><div class="marketplace-note"><strong style="display:block; margin-bottom:8px; color:var(--c-white);">Bloqueios do lojista</strong>Sem edição livre de nome, preço-base, fotos principais, categorias, descrições e regras comerciais do catálogo.</div></div></div><div class="card" style="padding:30px; margin-top:34px;"><span class="tag-badge">Bloco 3</span><h2>Fluxo do cliente no marketplace</h2><div class="grid-3"><div class="card" style="padding:22px;"><h3>1. Descoberta</h3><p class="text-gray">Cliente navega no catálogo central, entende família, variação, faixa de preço e lojas habilitadas.</p></div><div class="card" style="padding:22px;"><h3>2. Escolha da loja</h3><p class="text-gray">Na página do produto, o cliente escolhe a loja vendedora. Se não escolher, o pedido vai por padrão para a Juninho Pipas.</p></div><div class="card" style="padding:22px;"><h3>3. Pedido pendente</h3><p class="text-gray">Pedido entra como <strong style="color:var(--c-white);">aguardando confirmação da loja</strong>, sem cobrança imediata.</p></div></div><div class="grid-3" style="margin-top:18px;"><div class="card" style="padding:22px;"><h3>4. Confirmação</h3><p class="text-gray">Loja analisa disponibilidade e aprova, reprova ou aprova parcialmente o pedido.</p></div><div class="card" style="padding:22px;"><h3>5. Pagamento</h3><p class="text-gray">Após aprovação, o sistema libera Pix e cartão online. Isso reduz cancelamento e retrabalho com reembolso.</p></div><div class="card" style="padding:22px;"><h3>6. Pós-pagamento</h3><p class="text-gray">Pedido segue para separação, entrega/retirada/envio e fechamento operacional.</p></div></div><h3 style="margin-top:24px;">Regras de experiência</h3><ul class="text-gray" style="padding-left:18px;"><li>Na primeira fase profissional, preferir 1 pedido = 1 loja para reduzir complexidade de frete e SLA</li><li>Status visíveis ao cliente: aguardando confirmação, aprovado para pagamento, pago, em separação, enviado, concluído, cancelado</li><li>SLA recomendado de resposta da loja: 30 minutos a 2 horas, com regra de expiração ou redirecionamento operacional</li><li>WhatsApp permanece como canal de notificação e exceção, não como motor central da operação</li></ul></div><div class="card" style="padding:30px; margin-top:34px;"><span class="tag-badge">Bloco 4</span><h2>Modelo visual das imagens por produto e por loja</h2><div class="grid-3"><div class="card" style="padding:22px;"><h3>Camada 1</h3><p class="text-gray">Imagem principal padronizada da plataforma para manter consistência visual do catálogo.</p></div><div class="card" style="padding:22px;"><h3>Camada 2</h3><p class="text-gray">Fotos reais da loja selecionada entram como galeria complementar, reforçando autenticidade e reduzindo objeção.</p></div><div class="card" style="padding:22px;"><h3>Camada 3</h3><p class="text-gray">Aviso visual quando a imagem for ilustrativa: apresentação e embalagem podem variar conforme a loja escolhida.</p></div></div><div class="grid-2" style="align-items:start; margin-top:24px;"><div><h3>Padrão recomendado</h3><ul class="text-gray" style="padding-left:18px;"><li>Não usar apenas fotos da Juninho para todo seller no longo prazo</li><li>Não deixar cada loja subir qualquer imagem sem validação</li><li>Não depender só de IA para representar produto físico real</li><li>Adotar padrão híbrido: imagem institucional + prova visual da loja</li></ul></div><div><h3>Dados visuais exigidos no onboarding</h3><ul class="text-gray" style="padding-left:18px;"><li>Logo da loja</li><li>Foto de operação/fachada</li><li>Fotos reais dos produtos que deseja vender</li><li>Padrão mínimo de enquadramento e iluminação</li><li>Aprovação central antes da publicação</li></ul></div></div></div><div class="card" style="padding:30px; margin-top:34px;"><span class="tag-badge">Bloco 5</span><h2>Requisitos da futura implementação no site</h2><div class="grid-2" style="align-items:start;"><div><h3>Backoffice e governança</h3><ul class="text-gray" style="padding-left:18px;"><li>Painel administrativo central para homologar lojas, ativar sellers e controlar catálogo</li><li>Painel do lojista com login e senha, restrito à própria operação</li><li>Matriz produto x seller com regras open, restricted e exclusive</li><li>Formulário interno para solicitação de alteração de catálogo</li><li>Logs de auditoria para confirmação, aprovação e alterações</li></ul></div><div><h3>Motor operacional</h3><ul class="text-gray" style="padding-left:18px;"><li>Fluxo de pedidos com status e SLA</li><li>Confirmação de estoque antes do pagamento</li><li>Integração de Pix e cartão online após aprovação</li><li>Notificações por painel, e-mail e WhatsApp de apoio</li><li>Relatórios por loja, pedido, tempo de resposta e taxa de conversão</li></ul></div></div><div class="grid-3" style="margin-top:24px;"><div class="card" style="padding:22px;"><h3>Fase 1</h3><p class="text-gray">Cadastro de lojista, homologação manual, painel, confirmação de estoque, liberação de pagamento e produtos exclusivos.</p></div><div class="card" style="padding:22px;"><h3>Fase 2</h3><p class="text-gray">Controle de estoque por loja, relatórios operacionais, solicitação de ajustes e padrão visual por seller.</p></div><div class="card" style="padding:22px;"><h3>Fase 3</h3><p class="text-gray">Split financeiro, automação avançada, subcontas e operação marketplace robusta em escala.</p></div></div><div class="marketplace-note" style="margin-top:24px;"><strong style="display:block; margin-bottom:8px; color:var(--c-white);">Decisão executiva consolidada</strong>Implementar primeiro o modelo profissional viável: painel do lojista + confirmação de estoque + pagamento após aprovação + catálogo centralizado + regras de exclusividade por produto.</div></div></div></section>`; }
function renderStorePortal(){
    const session = getStoreSession();
    if(!session?.storeId){
        return `<section class="section"><div class="container"><span class="tag-badge">Portal do lojista</span><h1>Acesso do lojista</h1><div class="grid-2" style="align-items:start;"><div class="card" style="padding:28px;"><h3>Login da operação parceira</h3><p class="text-gray">Credenciais são liberadas após homologação no painel administrativo.</p><div class="form-group"><label class="form-label" for="storeLogin">Login</label><input id="storeLogin" class="form-control" placeholder="Seu e-mail de acesso" autocomplete="username"></div><div class="form-group"><label class="form-label" for="storePassword">Senha</label><input id="storePassword" type="password" autocomplete="current-password" class="form-control" placeholder="Sua senha"></div><button class="btn btn-primary btn-block" onclick="loginStorePortal()">Entrar no portal</button></div><div class="card" style="padding:28px;"><h3>Como funciona</h3><div class="step-list" style="margin-top:18px;"><div class="step-item"><strong class="text-yellow">1. Homologação</strong><p class="text-gray" style="margin:8px 0 0;">Loja aprovada pela operação central.</p></div><div class="step-item"><strong class="text-yellow">2. Acesso</strong><p class="text-gray" style="margin:8px 0 0;">Recebe login e senha temporária para visualizar pedidos.</p></div><div class="step-item"><strong class="text-yellow">3. Gestão</strong><p class="text-gray" style="margin:8px 0 0;">Confirma estoque, atualiza status e solicita novas linhas para cadastro.</p></div></div></div></div></div></section>`;
    }
    const store = getStoreById(session.storeId);
    const orders = loadOrders()
        .filter(order => order.sellerId === session.storeId)
        .sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const requests = loadProductRequests().filter(request => request.storeId === session.storeId);
    const openOrders = orders.filter(order => !['concluido','reprovado','cancelado'].includes(order.status));
    const waitingOrders = orders.filter(order => order.status === 'aguardando-confirmacao');
    const statusOptions = [
        ['aprovado-para-pagamento','Aprovar estoque'],
        ['reprovado','Reprovar'],
        ['pago','Marcar como pago'],
        ['em-separacao','Em separação'],
        ['enviado','Enviado'],
        ['concluido','Concluir']
    ];
    const orderCard = order => {
        const itens = (order.items || []).map(item=>`• ${item.qty}x ${item.nome} | ${item.variacao}`).join('<br>');
        const createdLabel = formatOrderDate(order.createdAt, { short:true });
        const createdFull = formatOrderDate(order.createdAt);
        const updatedFull = formatOrderDate(order.updatedAt || order.createdAt);
        return `<details class="portal-order-card"><summary><div><strong>${order.id}</strong><span>${order.customer?.name || 'Cliente'} • ${money(order.subtotal || 0)}</span><small class="portal-order-date">Recebido: ${createdLabel}</small></div><em>${order.status}</em></summary><div class="portal-order-body"><p><strong>Recebido em:</strong> ${createdFull}</p><p><strong>Última atualização:</strong> ${updatedFull}</p><p><strong>Cliente:</strong> ${order.customer?.name || '-'} • ${order.customer?.phone || '-'}</p><p><strong>Cidade/UF:</strong> ${order.customer?.city || '-'}</p><p><strong>Pagamento:</strong> ${order.customer?.payment || '-'}</p><p><strong>Subtotal:</strong> ${money(order.subtotal || 0)}</p><div class="text-gray portal-items">${itens || 'Sem itens listados.'}</div><div class="portal-status-row"><label class="form-label">Alterar status</label><select class="form-control" onchange="changeOrderStatusFromSelect('${order.id}', this)"><option value="">Selecionar ação</option>${statusOptions.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></div><div class="portal-quick-actions"><button class="btn btn-primary" onclick="changeOrderStatus('${order.id}','aprovado-para-pagamento','Estoque confirmado pela loja.')">Aprovar</button><button class="btn btn-secondary" onclick="changeOrderStatus('${order.id}','reprovado','Indisponibilidade informada pela loja.')">Reprovar</button><button class="btn btn-secondary" onclick="changeOrderStatus('${order.id}','concluido','Pedido concluído.')">Concluir</button></div></div></details>`;
    };
    return `<section class="section portal-page"><div class="container"><div class="portal-header"><div><span class="tag-badge">Portal do lojista</span><h1>${store.nome}</h1><p class="text-gray">Pedidos centralizados, confirmação de estoque e solicitações de catálogo.</p></div><div class="portal-header-actions"><a class="btn btn-secondary" href="/loja">Ver catálogo</a><button class="btn btn-primary" onclick="logoutStorePortal()">Sair</button></div></div><div class="portal-stats"><div class="card"><strong>Pedidos</strong><span>${orders.length}</span></div><div class="card"><strong>Aguardando</strong><span>${waitingOrders.length}</span></div><div class="card"><strong>Abertos</strong><span>${openOrders.length}</span></div></div><div class="portal-layout"><div class="card portal-orders-box"><div class="portal-section-title"><h3>Pedidos da loja</h3><span class="text-gray">${orders.length} registro(s)</span></div>${orders.length ? orders.map(orderCard).join('') : `<div class="empty-state"><h3>Nenhum pedido recebido</h3><p class="text-gray">Assim que um cliente criar pedidos para esta loja, eles aparecerão aqui.</p></div>`}</div><details class="card portal-request-panel"><summary>Solicitar inclusão/ajuste de produto</summary><div class="portal-request-body"><p class="text-gray">Use este formulário para pedir cadastro de novas linhas, ajustes de mix ou atualização de materiais visuais.</p><div class="form-group"><label class="form-label" for="requestProductName">Produto / linha</label><input id="requestProductName" class="form-control" placeholder="Ex.: Linha Vera Cruz 3000jds"></div><div class="form-group"><label class="form-label" for="requestType">Tipo de solicitação</label><select id="requestType" class="form-control"><option value="cadastro">Cadastrar nova linha</option><option value="ativacao">Ativar produto para minha loja</option><option value="ajuste">Solicitar ajuste comercial</option><option value="imagem">Enviar atualização visual</option></select></div><div class="form-group"><label class="form-label" for="requestPhoto">Foto do produto</label><input id="requestPhoto" class="form-control" type="file" accept="image/jpeg,image/png,image/webp"><p class="text-gray" style="margin-top:8px; font-size:0.88rem;">Envie JPG, PNG ou WEBP com até 2MB.</p></div><div class="form-group"><label class="form-label" for="requestDetails">Justificativa</label><textarea id="requestDetails" class="form-control" placeholder="Detalhe o que precisa ser ajustado e por quê."></textarea></div><button class="btn btn-primary btn-block" onclick="submitProductRequest()">Enviar solicitação</button>${psbQueueMarkup('products')}${requests.length ? `<div style="margin-top:18px;"><h4 style="font-size:1rem; color:var(--c-white);">Histórico recente</h4>${requests.slice(0,5).map(request=>`<div class="step-item" style="margin-top:10px;"><strong class="text-yellow">${request.productName}</strong><p class="text-gray" style="margin:8px 0 0;">${request.requestType} • ${request.status}</p><p class="text-gray" style="margin:8px 0 0;">Foto enviada: ${request.photoName || 'não informada'}</p></div>`).join('')}</div>` : ''}</div></details></div></div></section>`;
}

async function provisionStoreAccessAction(id){
    const creds = generateStoreAccess(id);
    const store = getStoreById(id);
    if(!creds || !store){ showToast('Não foi possível gerar acesso para a loja.'); return; }
    await upsertSellerToBackend(store);
    showToast(`Acesso do lojista atualizado para ${store.nome}.`);
    router();
}
const escapeAttr = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function saveStoreProfileLocal(store){
    const profiles = loadSellerProfileOverrides();
    profiles[store.id] = { ...(profiles[store.id] || {}), ...store };
    saveSellerProfileOverrides(profiles);
    if(!isCoreStore(store.id)){
        const partners = loadPartnerStores();
        const idx = partners.findIndex(item => item.id === store.id);
        if(idx >= 0){ partners[idx] = { ...partners[idx], ...store }; savePartnerStores(partners); }
    }
}
function updateSellerOfferNamesLocal(store){
    const offers = loadSellerOffers().map(offer => offer.sellerId === store.id ? { ...offer, sellerName: store.nome, updatedAt:new Date().toISOString() } : offer);
    saveSellerOffers(offers);
    return offers.filter(offer => offer.sellerId === store.id);
}
async function saveSellerProfileAction(storeId){
    const store = getStoreById(storeId);
    if(!store){ showToast('Loja não encontrada.'); return; }
    const name = document.getElementById(`edit_${storeId}_nome`)?.value.trim();
    const phoneRaw = document.getElementById(`edit_${storeId}_phone`)?.value.trim() || '';
    const phone = phoneRaw.replace(/\D/g,'');
    const city = document.getElementById(`edit_${storeId}_cidade`)?.value.trim();
    if(!name || phone.length < 10 || !city){ showToast('Preencha nome, WhatsApp válido e cidade/UF.'); return; }
    const updated = {
        ...store,
        nome:name,
        responsavel:document.getElementById(`edit_${storeId}_responsavel`)?.value.trim() || '',
        cpfCnpj:document.getElementById(`edit_${storeId}_documento`)?.value.trim() || '',
        phone,
        instagram:document.getElementById(`edit_${storeId}_instagram`)?.value.trim() || '',
        cidade:city,
        enderecoComercial:document.getElementById(`edit_${storeId}_endereco`)?.value.trim() || '',
        label:document.getElementById(`edit_${storeId}_label`)?.value.trim() || 'Loja parceira homologada',
        observacoes:document.getElementById(`edit_${storeId}_observacoes`)?.value.trim() || '',
        updatedAt:new Date().toISOString()
    };
    saveStoreProfileLocal(updated);
    const sellerOffers = updateSellerOfferNamesLocal(updated);
    showToast('Dados da loja salvos. Sincronizando...');
    try{
        const sellerResult = await upsertSellerToBackend(updated);
        const offerResults = await Promise.all(sellerOffers.map(upsertSellerOfferToBackend));
        const failed = [sellerResult, ...offerResults].some(result => result && result.ok === false && !result.disabled);
        showToast(failed ? 'Dados salvos localmente, mas houve falha na sincronização com o banco.' : `Dados de ${updated.nome} atualizados.`);
    }catch(error){
        console.warn(error);
        showToast('Dados salvos localmente, mas não sincronizaram com o banco.');
    }
    router();
}
async function setSellerActiveAction(storeId, active){
    const store = getStoreById(storeId);
    if(!store){ showToast('Loja não encontrada.'); return; }
    const updated = { ...store, status: active ? 'approved' : 'inactive', updatedAt:new Date().toISOString() };
    saveStoreProfileLocal(updated);
    if(!active){
        if(getStoreSession()?.storeId === storeId) clearStoreSession();
        cart = cart.filter(item => (item.sellerId || DEFAULT_SELLER_ID) !== storeId);
        saveCart();
    }
    try{
        const result = await upsertSellerToBackend(updated);
        showToast(result && result.ok === false && !result.disabled
            ? `Status alterado localmente, mas não sincronizou com o banco.`
            : `${updated.nome} ${active ? 'reativada' : 'desativada'} com sucesso.`);
    }catch(error){
        console.warn(error);
        showToast(`Status alterado localmente. Falha ao sincronizar com o banco.`);
    }
    router();
}
async function deleteSellerAction(storeId){
    const store = getStoreById(storeId);
    if(!store){ showToast('Loja não encontrada.'); return; }
    if(isCoreStore(storeId)){ showToast('Esta é uma loja estrutural do sistema. Desative-a em vez de excluir.'); return; }
    const ok = confirm(`Excluir definitivamente a loja ${store.nome}?

O cadastro, acesso e permissões serão removidos. O histórico de pedidos será preservado.`);
    if(!ok) return;
    const partners = loadPartnerStores().filter(item => item.id !== storeId);
    savePartnerStores(partners);
    savePendingPartnerStores(loadPendingPartnerStores().filter(item => item.id !== storeId));
    const access = loadStoreAccess(); delete access[storeId]; saveStoreAccess(access);
    const profiles = loadSellerProfileOverrides(); delete profiles[storeId]; saveSellerProfileOverrides(profiles);
    saveSellerOffers(loadSellerOffers().filter(offer => offer.sellerId !== storeId));
    if(getStoreSession()?.storeId === storeId) clearStoreSession();
    cart = cart.filter(item => (item.sellerId || DEFAULT_SELLER_ID) !== storeId);
    saveCart();
    showToast('Loja removida localmente. Excluindo do banco...');
    try{
        const result = await deleteSellerFromBackend(storeId);
        showToast(result.ok || result.disabled ? `${store.nome} excluída. Histórico de pedidos preservado.` : 'Loja removida localmente, mas o banco recusou a exclusão.');
    }catch(error){
        console.warn(error);
        showToast('Loja removida localmente, mas houve falha ao excluir no banco.');
    }
    router();
}
function renderSellerProfileEditor(store){
    return `<details class="admin-seller-control"><summary>Editar dados da loja</summary><div class="admin-catalog-body"><div class="admin-store-edit-grid"><div class="form-group"><label class="form-label" for="edit_${store.id}_nome">Nome da loja *</label><input id="edit_${store.id}_nome" class="form-control" value="${escapeAttr(store.nome)}"></div><div class="form-group"><label class="form-label" for="edit_${store.id}_responsavel">Responsável</label><input id="edit_${store.id}_responsavel" class="form-control" value="${escapeAttr(store.responsavel || '')}"></div><div class="form-group"><label class="form-label" for="edit_${store.id}_documento">CPF/CNPJ</label><input id="edit_${store.id}_documento" class="form-control" value="${escapeAttr(store.cpfCnpj || '')}"></div><div class="form-group"><label class="form-label" for="edit_${store.id}_phone">WhatsApp *</label><input id="edit_${store.id}_phone" class="form-control" value="${escapeAttr(store.phone || '')}" placeholder="5569999999999"></div><div class="form-group"><label class="form-label" for="edit_${store.id}_instagram">Instagram</label><input id="edit_${store.id}_instagram" class="form-control" value="${escapeAttr(store.instagram || '')}"></div><div class="form-group"><label class="form-label" for="edit_${store.id}_cidade">Cidade/UF *</label><input id="edit_${store.id}_cidade" class="form-control" value="${escapeAttr(store.cidade || '')}" placeholder="Porto Velho/RO"></div><div class="form-group admin-store-edit-wide"><label class="form-label" for="edit_${store.id}_endereco">Endereço comercial</label><input id="edit_${store.id}_endereco" class="form-control" value="${escapeAttr(store.enderecoComercial || '')}"></div><div class="form-group admin-store-edit-wide"><label class="form-label" for="edit_${store.id}_label">Identificação exibida no marketplace</label><input id="edit_${store.id}_label" class="form-control" value="${escapeAttr(store.label || '')}" placeholder="Loja parceira homologada"></div><div class="form-group admin-store-edit-wide"><label class="form-label" for="edit_${store.id}_observacoes">Observações administrativas</label><textarea id="edit_${store.id}_observacoes" class="form-control">${escapeAttr(store.observacoes || '')}</textarea></div></div><div class="admin-control-actions"><button class="btn btn-primary" onclick="saveSellerProfileAction('${store.id}')">Salvar dados da loja</button></div></div></details>`;
}
function renderSellerCatalogControls(store){
    const offers = loadSellerOffers().filter(offer => offer.sellerId === store.id);
    const allOffer = offers.find(offer => offer.scope === 'all');
    const allChecked = !!allOffer?.active;
    const categoryHtml = categories.map(cat => {
        const categoryOffer = offers.find(offer => offer.scope === 'category' && offer.categorySlug === cat.slug);
        const checked = categoryOffer ? !!categoryOffer.active : allChecked;
        return `<label class="permission-card"><input type="checkbox" id="perm_${store.id}_cat_${cat.slug}" ${checked ? 'checked' : ''}>${cat.name}</label>`;
    }).join('');
    const productHtml = products.map(product => `<label class="permission-card"><input type="checkbox" id="perm_${store.id}_prod_${product.slug}" ${isExplicitOfferActive(store.id,'product',product.slug) ? 'checked' : ''}><span><strong style="color:var(--c-white);">${product.nome}</strong><br><small>${catName(product.categoria)} • ${moneyFrom(product)}</small></span></label>`).join('');
    return `<details class="admin-seller-control"><summary>Configurar produtos da loja</summary><div class="admin-catalog-body"><p class="text-gray">Marque as categorias que esta loja pode vender. Se "Liberar todo o catálogo" estiver ativo, uma categoria desmarcada passa a funcionar como exceção de bloqueio. Produtos específicos podem ser usados como exceção positiva.</p><label class="permission-card" style="margin:10px 0;"><input type="checkbox" id="perm_${store.id}_all" ${allChecked ? 'checked' : ''}>Liberar todo o catálogo para esta loja</label><h4 style="color:var(--c-white); margin:14px 0 8px;">Categorias permitidas</h4><div class="permission-grid">${categoryHtml}</div><details><summary style="cursor:pointer; color:var(--c-yellow); font-weight:800; text-transform:uppercase;">Produtos específicos +</summary><div class="product-permission-list" style="margin-top:10px;">${productHtml}</div></details><div class="admin-control-actions"><button class="btn btn-primary" onclick="saveSellerPermissionsAction('${store.id}')">Salvar permissões</button><button class="btn btn-secondary" onclick="syncMarketplaceCatalogFromBackend({rerender:true})">Sincronizar</button></div></div></details>`;
}
async function saveSellerPermissionsAction(storeId){
    const store = getStoreById(storeId);
    if(!store){ showToast('Loja não encontrada.'); return; }
    const allChecked = !!document.getElementById(`perm_${storeId}_all`)?.checked;
    const next = [buildSellerOffer(store, 'all', '', allChecked)];
    categories.forEach(cat => next.push(buildSellerOffer(store, 'category', cat.slug, !!document.getElementById(`perm_${storeId}_cat_${cat.slug}`)?.checked)));
    products.forEach(product => next.push(buildSellerOffer(store, 'product', product.slug, !!document.getElementById(`perm_${storeId}_prod_${product.slug}`)?.checked)));
    const others = loadSellerOffers().filter(offer => offer.sellerId !== storeId);
    saveSellerOffers([...others, ...next]);
    showToast('Permissões salvas localmente. Sincronizando com o Supabase...');
    try{
        await upsertSellerToBackend(store);
        const results = await Promise.all(next.map(upsertSellerOfferToBackend));
        const failed = results.filter(result => result && result.ok === false && !result.disabled);
        showToast(failed.length ? 'Permissões salvas no navegador. Verifique se a estrutura do banco foi aplicada.' : `Permissões de ${store.nome} atualizadas.`);
    }catch(error){
        console.warn(error);
        showToast('Permissões salvas localmente, mas não sincronizaram com o banco.');
    }
    router();
}
function renderAdminPortal(){
    const pending = pendingPartnerStores();
    const approved = approvedStores();
    const inactive = inactiveStores();
    const managedStores = [...approved, ...inactive].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    const orders = loadOrders();
    const requests = loadProductRequests();
    if(!isAdminSessionActive()){
        return `<section class="section"><div class="container"><span class="tag-badge">Área administrativa</span><h1>Painel do marketplace</h1><div class="card" style="padding:28px; max-width:520px;"><h3>Acesso administrativo</h3><p class="text-gray">Acesso restrito à operação central para homologar lojas, editar cadastros, controlar acessos e acompanhar o fluxo operacional.</p><div class="form-group"><label class="form-label" for="adminPin">PIN administrativo</label><input id="adminPin" class="form-control" placeholder="PIN de acesso administrativo"></div><button class="btn btn-primary btn-block" onclick="loginAdminPortal()">Entrar no painel</button></div></div></section>`;
    }
    const pendingHtml = psbQueueMarkup('partners');
    const approvedHtml = managedStores.length ? managedStores.map(store=>{
        const isActive = store.status === 'approved';
        const core = isCoreStore(store.id);
        const statusLabel = isActive ? (store.id === DEFAULT_SELLER_ID ? 'Loja principal ativa' : 'Homologada') : 'Desativada';
        const statusClass = isActive ? 'text-yellow' : 'text-gray';
        return `<div class="step-item admin-store-card" style="margin-top:10px;"><div class="admin-store-card-head"><div><strong class="${statusClass}">${store.nome}</strong><p class="text-gray" style="margin:6px 0 0;">${store.cidade || 'Cidade não informada'} • ${store.label || 'Loja parceira'}</p></div><span class="admin-store-status ${isActive ? 'active' : 'inactive'}">${statusLabel}</span></div><p class="text-gray" style="margin:10px 0 0;">WhatsApp: <strong style="color:var(--c-white);">${store.phone || 'não informado'}</strong>${store.enderecoComercial ? `<br>Endereço: <strong style="color:var(--c-white);">${store.enderecoComercial}</strong>` : ''}</p><p class="text-gray" style="margin:8px 0 0;">Login: <strong style="color:var(--c-white);">${store.login || 'não gerado'}</strong><br>Senha temporária: <strong style="color:var(--c-white);">${store.password || 'não gerada'}</strong></p><div class="admin-store-actions"><button class="btn btn-secondary btn-sm" onclick="provisionStoreAccessAction('${store.id}')">Gerar ou regerar acesso</button>${isActive ? `<button class="btn btn-secondary btn-sm" onclick="setSellerActiveAction('${store.id}', false)">Desativar loja</button>` : `<button class="btn btn-primary btn-sm" onclick="setSellerActiveAction('${store.id}', true)">Reativar loja</button>`}${!core ? `<button class="btn btn-danger btn-sm" onclick="deleteSellerAction('${store.id}')">Excluir definitivamente</button>` : `<span class="admin-core-note">Loja estrutural: exclusão bloqueada</span>`}</div>${renderSellerProfileEditor(store)}${renderSellerCatalogControls(store)}</div>`;
    }).join('') : `<div class="empty-state"><h3>Nenhuma loja cadastrada</h3><p class="text-gray">As lojas homologadas aparecerão aqui para gestão administrativa.</p></div>`;
    const requestHtml = psbQueueMarkup('products');
    return `<section class="section"><div class="container"><div style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; align-items:center;"><div><span class="tag-badge">Área administrativa</span><h1>Governança do marketplace</h1><p class="text-gray">Homologação, edição cadastral, ativação/desativação, exclusão de lojas, acessos e permissões de venda.</p></div><button class="btn btn-primary" onclick="logoutAdminPortal()">Sair</button></div><div class="grid-4" style="margin-top:28px;"><div class="card" style="padding:22px;"><h3>Pendências</h3><p class="text-gray">Consulte a fila de cadastros abaixo.</p></div><div class="card" style="padding:22px;"><h3>Homologadas</h3><p class="text-gray">${approved.length} loja(s) ativas.</p></div><div class="card" style="padding:22px;"><h3>Desativadas</h3><p class="text-gray">${inactive.length} loja(s) temporariamente fora do marketplace.</p></div><div class="card" style="padding:22px;"><h3>Pedidos abertos</h3><p class="text-gray">${orders.filter(order => !['concluido','reprovado','cancelado'].includes(order.status)).length} pedido(s) ativos.</p></div></div><div class="grid-2" style="align-items:start; margin-top:34px;"><div class="card" style="padding:28px;"><h3>Cadastros pendentes</h3>${pendingHtml}</div><div class="card" style="padding:28px;"><h3>Gestão das lojas</h3><p class="text-gray">Edite dados comerciais, controle o status da loja e gerencie permissões sem alterar o histórico dos pedidos.</p>${approvedHtml}<div style="margin-top:22px;"><h4 style="font-size:1rem; color:var(--c-white);">Solicitações de catálogo</h4>${requestHtml}</div></div></div></div></section>`;
}

function renderNotFound(){ return `<section class="section"><div class="container"><div class="empty-state"><h1>Página não encontrada</h1><p class="text-gray">A rota solicitada não existe ou ainda não está disponível.</p><a href="/" class="btn btn-primary">Voltar para Home</a></div></div></section>`; }
function router(){ const {page,slug}=psbRoute(); if(document.body?.dataset)document.body.dataset.page=page; if(['loja','produto','carrinho','checkout'].includes(page)&&!window.__PSB_PRICE_TABLE_LOADED__){if(!window.__PSB_PRICE_TABLE_LOADING__||app.dataset?.prerendered!==psbRoutePath()){app.innerHTML=psbPriceLoadingMarkup();if(app.dataset)delete app.dataset.prerendered;}psbUpdateSeo(page,slug);return;} if(app.dataset)delete app.dataset.prerendered; const routes={ home: renderHome, loja: renderShop, produto: ()=>renderProduct(slug), carrinho: renderCart, checkout: renderCheckout, 'cao-de-caca': renderCao, aspiron: renderAspiron, eventos: renderEvents, galeria: renderGallery, blog: ()=> slug ? renderArticle(slug) : renderBlog(), contato: renderContact, faq: renderFaq, 'politica-entrega': renderDelivery, 'politica-troca': renderTrade, privacidade: renderPrivacy, 'seja-lojista': renderPartner, 'para-marcas': renderBrandPartners, 'portal-lojista': renderStorePortal }; app.innerHTML = (['home','carrinho','checkout'].includes(page)?psbCheckoutReceiptMarkup()+psbCheckoutPendingMarkup():'')+(routes[page] || renderNotFound)(); document.querySelectorAll('[data-route]').forEach(a=>a.classList.toggle('active', a.dataset.route===page)); document.getElementById('navMenu').classList.remove('active-menu');document.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false'); document.getElementById('waFab').href = getWaLink(STORE.waGeral, 'Olá! Quero atendimento da Pipas Store Brasil.'); fillFooterContact(); updateCartCount(); if(page==='loja'){ fillFamilyOptions(); if(slug&&categories.some(c=>c.slug===slug))window.psbNextCategory=slug;if(window.psbNextCategory){document.getElementById('categoryFilter').value=window.psbNextCategory;window.psbNextCategory=null;fillFamilyOptions();} applyFilters(); }  if(['portal-lojista','painel-marketplace'].includes(page)){ syncOrdersFromBackend({ rerender:true }); } psbAfterRender(); psbInitExperience(); psbUpdateSeo(page,slug); trackEvent('view_page',{page,slug}); window.scrollTo({top:0,behavior:'instant'}); }

window.addEventListener('load',async function(){
    window.__PSB_PRICE_TABLE_LOADING__=true;
    router();
    await Promise.all([loadPriceTable(),syncMarketplaceCatalogFromBackend(),syncShippingFromBackend()]);
    if(psbRoute().page==='home'){fillFooterContact();updateCartCount();}
    else router();
    if(document.getElementById('cartDrawer')?.open)psbOpenCart();
});
