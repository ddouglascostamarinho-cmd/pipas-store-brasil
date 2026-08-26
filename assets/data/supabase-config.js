// Configuração central do Supabase da Pipas Store Brasil.
// A chave abaixo é a chave pública (anon/publishable) do frontend e depende de RLS no banco.
window.PSB_SUPABASE_CONFIG = {
  enabled: true,
  url: "https://eizhgmwxdxjrmdtyjxfn.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpemhnbXd4ZHhqcm1kdHlqeGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzYzMjgsImV4cCI6MjA5ODM1MjMyOH0.KXJ5jeYqAlTwRpXNeCbH3sOoexAvjdgD2mI99v8b7B4"
};

// Neutraliza o PIN administrativo legado embutido no index.
// O acesso administrativo válido é feito exclusivamente pelo Supabase Auth + role=admin.
window.__PSB_CONFIG__ = Object.assign({}, window.__PSB_CONFIG__ || {}, {
  adminPin: "__DISABLED_USE_SUPABASE_AUTH__"
});
window.__PSB_ADMIN_PIN__ = "__DISABLED_USE_SUPABASE_AUTH__";

(function installPsbSecurityPatch(){
  const ADMIN_AUTH_EMAIL = 'admin@pipasstore.com.br';

  window.addEventListener('load', function(){
    const legacyRouter = typeof window.router === 'function' ? window.router : null;
    const legacyRenderMarketplaceAdmin = typeof window.renderMarketplaceAdmin === 'function' ? window.renderMarketplaceAdmin : null;
    let adminVerified = false;

    const currentPage = () => ((location.hash || '#/home').replace('#/','').split('/')[0] || 'home');

    async function readOwnRole(){
      try{
        if(typeof supabaseRestBase !== 'function' || typeof supabaseHeaders !== 'function') return null;
        const res = await fetch(`${supabaseRestBase()}/psb_user_roles?select=role,seller_id&limit=1`, {
          headers: supabaseHeaders()
        });
        if(!res.ok) return null;
        const rows = await res.json();
        return Array.isArray(rows) && rows.length ? rows[0] : null;
      }catch(e){
        return null;
      }
    }

    function adminLoginMarkup(){
      return `<section class="section"><div class="container"><span class="tag-badge">Área administrativa</span><h1>Painel do marketplace</h1><div class="card" style="padding:28px; max-width:560px;"><h3>Acesso administrativo seguro</h3><p class="text-gray">Este painel usa autenticação real do Supabase. O antigo PIN local foi desativado.</p><div class="form-group"><label class="form-label">Conta administrativa</label><input class="form-control" value="${ADMIN_AUTH_EMAIL}" readonly></div><div class="form-group"><label class="form-label">Senha</label><input id="adminAuthPassword" type="password" autocomplete="current-password" class="form-control" placeholder="Senha da conta administrativa" onkeydown="if(event.key==='Enter') loginAdminPortal()"></div><button class="btn btn-primary btn-block" onclick="loginAdminPortal()">Entrar com Supabase Auth</button><p class="text-gray" style="font-size:.82rem; margin-top:14px;">A senha não é armazenada no cadastro da loja nem no navegador pela Pipas Store.</p></div></div></section>`;
    }

    function renderSecureAdmin(){
      if(!adminVerified) return adminLoginMarkup();
      if(!legacyRenderMarketplaceAdmin) return '<section class="section"><div class="container"><div class="empty-state"><h3>Painel indisponível</h3></div></div></section>';
      return legacyRenderMarketplaceAdmin();
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
        if(typeof psbSignOut === 'function') psbSignOut();
        if(typeof setAdminSession === 'function') setAdminSession(false);

        const signed = typeof psbSignIn === 'function' && await psbSignIn(ADMIN_AUTH_EMAIL, password);
        if(!signed){
          adminVerified = false;
          if(typeof showToast === 'function') showToast('Credenciais administrativas inválidas.');
          return;
        }

        const role = await readOwnRole();
        if(!role || role.role !== 'admin'){
          adminVerified = false;
          if(typeof psbSignOut === 'function') psbSignOut();
          if(typeof setAdminSession === 'function') setAdminSession(false);
          if(typeof showToast === 'function') showToast('Esta conta não possui permissão administrativa.');
          return;
        }

        adminVerified = true;
        if(typeof setAdminSession === 'function') setAdminSession(true);
        if(typeof showToast === 'function') showToast('Acesso administrativo autenticado pelo Supabase.');
        renderAdminRoute();
      }catch(e){
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
      if(typeof showToast === 'function') showToast('Sessão administrativa encerrada.');
      renderAdminRoute();
    };

    // O gerador de senha local do MVP foi desativado. Senhas devem existir apenas no Supabase Auth.
    window.provisionStoreAccessAction = function(){
      if(typeof showToast === 'function') showToast('Geração local de senha desativada por segurança. O acesso deve ser provisionado no Supabase Auth.');
    };

    // Homologa a loja sem criar ou persistir senha local.
    window.approvePartnerStoreAction = async function(id){
      try{
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

        if(typeof loadStoreAccess === 'function' && typeof saveStoreAccess === 'function'){
          const access = loadStoreAccess() || {};
          if(access[id]){
            delete access[id];
            saveStoreAccess(access);
          }
        }

        if(typeof upsertSellerToBackend === 'function') await upsertSellerToBackend(approvedStore);
        if(typeof showToast === 'function') showToast(`Loja ${approvedStore.nome} homologada. O login deve ser provisionado no Supabase Auth.`);
        renderAdminRoute();
      }catch(e){
        if(typeof showToast === 'function') showToast('Falha ao homologar a loja com segurança.');
      }
    };

    const secureRouter = function(){
      if(currentPage() === 'painel-marketplace') return renderAdminRoute();
      if(legacyRouter) return legacyRouter();
    };

    window.router = secureRouter;

    // O listener antigo continua existindo; este executa depois e garante a rota administrativa segura.
    window.addEventListener('hashchange', function(){
      if(currentPage() === 'painel-marketplace') renderAdminRoute();
    });

    if(currentPage() === 'painel-marketplace') renderAdminRoute();
  });
})();
