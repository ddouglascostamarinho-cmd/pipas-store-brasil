// Configuração central do Supabase da Pipas Store Brasil.
// A chave abaixo é a chave pública (anon/publishable) do frontend e depende de RLS no banco.
window.PSB_SUPABASE_CONFIG = {
  enabled: true,
  url: "https://eizhgmwxdxjrmdtyjxfn.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpemhnbXd4ZHhqcm1kdHlqeGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzYzMjgsImV4cCI6MjA5ODM1MjMyOH0.KXJ5jeYqAlTwRpXNeCbH3sOoexAvjdgD2mI99v8b7B4"
};

// Neutraliza a autenticação administrativa legada antes do script principal carregar.
// O acesso válido é feito exclusivamente pelo Supabase Auth + psb_user_roles.
window.__PSB_CONFIG__ = Object.assign({}, window.__PSB_CONFIG__ || {}, {
  adminPin: "__DISABLED_USE_SUPABASE_AUTH__",
  stores: []
});
window.__PSB_ADMIN_PIN__ = "__DISABLED_USE_SUPABASE_AUTH__";

(function installPsbSecurityPatch(){
  const ADMIN_AUTH_EMAIL = 'admin@pipasstore.com.br';
  const ORDERS_KEY = 'psb_marketplace_orders_23';
  const STORE_SESSION_KEY = 'psb_store_session_23';
  const STORE_ACCESS_KEY = 'psb_store_access_23';
  const PARTNER_STORES_KEY = 'psb_partner_stores_23';
  const PENDING_STORES_KEY = 'psb_pending_partner_stores_23';
  const PRODUCT_REQUESTS_KEY = 'psb_product_requests_23';
  const PROFILE_OVERRIDES_KEY = 'psb_seller_profile_overrides_23';

  window.addEventListener('load', function(){
    const legacyRouter = typeof window.router === 'function' ? window.router : null;
    const legacyRenderAdmin = typeof window.renderAdminPortal === 'function'
      ? window.renderAdminPortal
      : (typeof window.renderMarketplaceAdmin === 'function' ? window.renderMarketplaceAdmin : null);
    const legacyRenderStorePortal = typeof window.renderStorePortal === 'function' ? window.renderStorePortal : null;

    let adminVerified = false;
    let sellerVerifiedId = null;

    const currentPage = () => ((location.hash || '#/home').replace('#/','').split('/')[0] || 'home');

    function escapeHtmlValue(value){
      return String(value ?? '')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function sanitizeDeep(value){
      if(typeof value === 'string') return escapeHtmlValue(value);
      if(Array.isArray(value)) return value.map(sanitizeDeep);
      if(value && typeof value === 'object'){
        const out = {};
        Object.keys(value).forEach(key => { out[key] = sanitizeDeep(value[key]); });
        return out;
      }
      return value;
    }

    function withSanitizedStorage(keys, renderFn){
      const snapshots = new Map();
      try{
        keys.forEach(key => {
          const raw = localStorage.getItem(key);
          snapshots.set(key, raw);
          if(!raw) return;
          try{
            const parsed = JSON.parse(raw);
            localStorage.setItem(key, JSON.stringify(sanitizeDeep(parsed)));
          }catch(_){ }
        });
        return renderFn();
      } finally {
        snapshots.forEach((raw, key) => {
          if(raw === null) localStorage.removeItem(key);
          else localStorage.setItem(key, raw);
        });
      }
    }

    async function readOwnRole(){
      try{
        if(typeof supabaseRestBase !== 'function' || typeof supabaseHeaders !== 'function') return null;
        const res = await fetch(`${supabaseRestBase()}/psb_user_roles?select=role,seller_id&limit=1`, {
          headers: supabaseHeaders()
        });
        if(!res.ok) return null;
        const rows = await res.json();
        return Array.isArray(rows) && rows.length ? rows[0] : null;
      }catch(_){
        return null;
      }
    }

    // Remove credenciais locais herdadas do MVP da memória e do storage.
    // A fonte de verdade de senha passa a ser apenas o Supabase Auth.
    try{
      localStorage.removeItem(STORE_ACCESS_KEY);
      if(typeof MARKETPLACE_STORES !== 'undefined' && Array.isArray(MARKETPLACE_STORES)){
        MARKETPLACE_STORES.forEach(store => {
          if(store && typeof store === 'object'){
            delete store.password;
            delete store.senha;
          }
        });
      }
    }catch(_){ }

    function sellerLoginMarkup(){
      return `<section class="section"><div class="container"><span class="tag-badge">Portal do lojista</span><h1>Acesso do lojista</h1><div class="grid-2" style="align-items:start;"><div class="card" style="padding:28px;"><h3>Login da operação parceira</h3><p class="text-gray">Acesso validado pelo Supabase Auth e vinculado à loja cadastrada.</p><div class="form-group"><label class="form-label">Login</label><input id="storeLogin" class="form-control" autocomplete="username" placeholder="lojista-sualoja"></div><div class="form-group"><label class="form-label">Senha</label><input id="storePassword" type="password" autocomplete="current-password" class="form-control" placeholder="Senha da conta"></div><button class="btn btn-primary btn-block" onclick="loginStorePortal()">Entrar no portal</button></div><div class="card" style="padding:28px;"><h3>Segurança do acesso</h3><p class="text-gray">O navegador só libera os dados da loja após validar a conta no Supabase e confirmar o vínculo seller_id da sessão.</p></div></div></div></section>`;
    }

    function renderSecureStorePortal(){
      let session = null;
      try{
        session = typeof getStoreSession === 'function' ? getStoreSession() : JSON.parse(localStorage.getItem(STORE_SESSION_KEY) || 'null');
      }catch(_){ }

      if(!session?.storeId || sellerVerifiedId !== session.storeId){
        return sellerLoginMarkup();
      }

      if(!legacyRenderStorePortal) return '<section class="section"><div class="container"><div class="empty-state"><h3>Portal indisponível</h3></div></div></section>';

      return withSanitizedStorage(
        [ORDERS_KEY, PRODUCT_REQUESTS_KEY, PARTNER_STORES_KEY, PENDING_STORES_KEY, PROFILE_OVERRIDES_KEY],
        () => legacyRenderStorePortal()
      );
    }

    window.renderStorePortal = renderSecureStorePortal;

    window.loginStorePortal = async function(){
      const login = document.getElementById('storeLogin')?.value.trim().toLowerCase() || '';
      const password = document.getElementById('storePassword')?.value || '';
      if(!login || !password){
        if(typeof showToast === 'function') showToast('Informe login e senha do lojista.');
        return;
      }

      try{
        const store = typeof allStores === 'function'
          ? allStores().find(item => item?.status === 'approved' && String(item.login || '').toLowerCase() === login)
          : null;
        if(!store){
          if(typeof showToast === 'function') showToast('Credenciais inválidas, loja inativa ou não homologada.');
          return;
        }

        const email = typeof PSB_SELLER_AUTH_EMAILS !== 'undefined' ? PSB_SELLER_AUTH_EMAILS[store.id] : null;
        if(!email){
          if(typeof showToast === 'function') showToast('Esta loja ainda não possui acesso migrado para o Supabase Auth.');
          return;
        }

        sellerVerifiedId = null;
        if(typeof psbSignOut === 'function') psbSignOut();
        if(typeof clearStoreSession === 'function') clearStoreSession();

        const signed = typeof psbSignIn === 'function' && await psbSignIn(email, password);
        if(!signed){
          if(typeof showToast === 'function') showToast('Credenciais inválidas, loja inativa ou não homologada.');
          return;
        }

        const role = await readOwnRole();
        if(!role || role.role !== 'seller' || role.seller_id !== store.id){
          if(typeof psbSignOut === 'function') psbSignOut();
          if(typeof clearStoreSession === 'function') clearStoreSession();
          if(typeof showToast === 'function') showToast('A conta autenticada não possui vínculo com esta loja.');
          return;
        }

        sellerVerifiedId = store.id;
        if(typeof setStoreSession === 'function') setStoreSession({ storeId:store.id, loginAt:new Date().toISOString() });
        if(typeof showToast === 'function') showToast(`Acesso autenticado para ${store.nome}.`);
        if(location.hash === '#/portal-lojista') window.router();
        else location.hash = '#/portal-lojista';
      }catch(_){
        sellerVerifiedId = null;
        if(typeof psbSignOut === 'function') psbSignOut();
        if(typeof clearStoreSession === 'function') clearStoreSession();
        if(typeof showToast === 'function') showToast('Não foi possível validar o acesso do lojista.');
      }
    };

    window.logoutStorePortal = function(){
      sellerVerifiedId = null;
      if(typeof psbSignOut === 'function') psbSignOut();
      if(typeof clearStoreSession === 'function') clearStoreSession();
      localStorage.removeItem(ORDERS_KEY);
      if(typeof showToast === 'function') showToast('Sessão do lojista encerrada.');
      window.router();
    };

    function adminLoginMarkup(){
      return `<section class="section"><div class="container"><span class="tag-badge">Área administrativa</span><h1>Painel do marketplace</h1><div class="card" style="padding:28px; max-width:560px;"><h3>Acesso administrativo seguro</h3><p class="text-gray">Este painel usa Supabase Auth e exige role=admin no banco. O PIN local do MVP está desativado.</p><div class="form-group"><label class="form-label">Conta administrativa</label><input class="form-control" value="${ADMIN_AUTH_EMAIL}" readonly></div><div class="form-group"><label class="form-label">Senha</label><input id="adminAuthPassword" type="password" autocomplete="current-password" class="form-control" placeholder="Senha da conta administrativa" onkeydown="if(event.key==='Enter') loginAdminPortal()"></div><button class="btn btn-primary btn-block" onclick="loginAdminPortal()">Entrar com Supabase Auth</button><p class="text-gray" style="font-size:.82rem; margin-top:14px;">A senha não é armazenada no cadastro da loja.</p></div></div></section>`;
    }

    function renderSecureAdmin(){
      if(!adminVerified) return adminLoginMarkup();
      if(!legacyRenderAdmin) return '<section class="section"><div class="container"><div class="empty-state"><h3>Painel indisponível</h3></div></div></section>';
      return withSanitizedStorage(
        [ORDERS_KEY, PRODUCT_REQUESTS_KEY, PARTNER_STORES_KEY, PENDING_STORES_KEY, PROFILE_OVERRIDES_KEY],
        () => legacyRenderAdmin()
      );
    }

    function renderAdminRoute(){
      if(currentPage() !== 'painel-marketplace'){
        if(legacyRouter) return legacyRouter();
        return;
      }

      const appEl = document.getElementById('app');
      if(!appEl) return;
      appEl.innerHTML = renderSecureAdmin();

      document.querySelectorAll('[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === 'painel-marketplace'));
      const navMenu = document.getElementById('navMenu');
      if(navMenu) navMenu.classList.remove('active-menu');
      if(typeof fillFooterContact === 'function') fillFooterContact();
      if(typeof updateCartCount === 'function') updateCartCount();
      if(typeof trackEvent === 'function') trackEvent('view_page', { page:'painel-marketplace' });

      if(adminVerified){
        if(typeof syncMarketplaceCatalogFromBackend === 'function') syncMarketplaceCatalogFromBackend({ rerender:false });
        if(typeof syncOrdersFromBackend === 'function') syncOrdersFromBackend({ rerender:false });
      }
      window.scrollTo({ top:0, behavior:'smooth' });
    }

    window.renderMarketplaceAdmin = renderSecureAdmin;

    window.loginAdminPortal = async function(){
      const password = document.getElementById('adminAuthPassword')?.value || '';
      if(!password){
        if(typeof showToast === 'function') showToast('Informe a senha administrativa.');
        return;
      }

      try{
        adminVerified = false;
        sellerVerifiedId = null;
        if(typeof psbSignOut === 'function') psbSignOut();
        if(typeof setAdminSession === 'function') setAdminSession(false);
        if(typeof clearStoreSession === 'function') clearStoreSession();

        const signed = typeof psbSignIn === 'function' && await psbSignIn(ADMIN_AUTH_EMAIL, password);
        if(!signed){
          if(typeof showToast === 'function') showToast('Credenciais administrativas inválidas.');
          return;
        }

        const role = await readOwnRole();
        if(!role || role.role !== 'admin'){
          if(typeof psbSignOut === 'function') psbSignOut();
          if(typeof setAdminSession === 'function') setAdminSession(false);
          if(typeof showToast === 'function') showToast('Esta conta não possui permissão administrativa.');
          return;
        }

        adminVerified = true;
        if(typeof setAdminSession === 'function') setAdminSession(true);
        if(typeof showToast === 'function') showToast('Acesso administrativo autenticado pelo Supabase.');
        renderAdminRoute();
      }catch(_){
        adminVerified = false;
        if(typeof psbSignOut === 'function') psbSignOut();
        if(typeof setAdminSession === 'function') setAdminSession(false);
        if(typeof showToast === 'function') showToast('Não foi possível validar o acesso administrativo.');
      }
    };

    window.logoutAdminPortal = function(){
      adminVerified = false;
      if(typeof psbSignOut === 'function') psbSignOut();
      if(typeof setAdminSession === 'function') setAdminSession(false);
      localStorage.removeItem(ORDERS_KEY);
      if(typeof showToast === 'function') showToast('Sessão administrativa encerrada.');
      renderAdminRoute();
    };

    // Geração local de senha foi desativada. Senhas devem existir somente no Supabase Auth.
    window.provisionStoreAccessAction = function(){
      if(typeof showToast === 'function') showToast('Geração local de senha desativada. Gerencie o acesso no Supabase Auth.');
    };

    // Homologa a loja sem criar nem persistir senha local.
    window.approvePartnerStoreAction = async function(id){
      try{
        if(!adminVerified){
          if(typeof showToast === 'function') showToast('Autenticação administrativa necessária.');
          return;
        }
        if(typeof loadPendingPartnerStores !== 'function' || typeof savePendingPartnerStores !== 'function' || typeof loadPartnerStores !== 'function' || typeof savePartnerStores !== 'function'){
          if(typeof showToast === 'function') showToast('Não foi possível homologar a loja.');
          return;
        }

        const pending = loadPendingPartnerStores();
        const partner = pending.find(store => store.id === id);
        if(!partner){
          if(typeof showToast === 'function') showToast('Loja pendente não encontrada.');
          return;
        }

        const approvedStore = {
          ...partner,
          status: 'approved',
          label: 'Loja parceira homologada',
          aprovadoEm: new Date().toISOString()
        };
        delete approvedStore.password;
        delete approvedStore.senha;

        const currentApproved = loadPartnerStores().filter(store => store.id !== id);
        savePendingPartnerStores(pending.filter(store => store.id !== id));
        savePartnerStores([...currentApproved, approvedStore]);
        localStorage.removeItem(STORE_ACCESS_KEY);

        if(typeof upsertSellerToBackend === 'function') await upsertSellerToBackend(approvedStore);
        if(typeof showToast === 'function') showToast(`Loja ${approvedStore.nome} homologada. O acesso deve ser criado no Supabase Auth.`);
        renderAdminRoute();
      }catch(_){
        if(typeof showToast === 'function') showToast('Falha ao homologar a loja com segurança.');
      }
    };

    const secureRouter = function(){
      if(currentPage() === 'painel-marketplace') return renderAdminRoute();
      if(legacyRouter) return legacyRouter();
    };
    window.router = secureRouter;

    // O listener original continua existindo; este garante que a rota admin passe pela verificação segura.
    window.addEventListener('hashchange', function(){
      if(currentPage() === 'painel-marketplace') renderAdminRoute();
    });

    // Revalida sessão persistida no Supabase. localStorage isolado, sozinho, não libera portal.
    readOwnRole().then(function(role){
      try{
        if(role?.role === 'admin'){
          adminVerified = true;
          if(typeof setAdminSession === 'function') setAdminSession(true);
        }else if(role?.role === 'seller' && role.seller_id){
          let session = null;
          try{ session = typeof getStoreSession === 'function' ? getStoreSession() : JSON.parse(localStorage.getItem(STORE_SESSION_KEY) || 'null'); }catch(_){ }
          if(session?.storeId === role.seller_id) sellerVerifiedId = role.seller_id;
        }

        if(currentPage() === 'painel-marketplace') renderAdminRoute();
        else if(currentPage() === 'portal-lojista' && legacyRouter) legacyRouter();
      }catch(_){ }
    });

    if(currentPage() === 'painel-marketplace') renderAdminRoute();
  });
})();
