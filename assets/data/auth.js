const PSB_AUTH_SESSION_KEY='psb_auth_session_23';
const PSB_SELLER_AUTH_EMAILS={'juninho-pipas':'juninho@lojistas.pipasstore.com.br','pipas-store-brasil':'lojista2@psb-internal.app'};
let __psbAuthToken=null, __psbAuthUser=null, psbRefreshPromise=null, psbAuthGeneration=0, psbRefreshTimer;
function psbStoreAuth(data) {
    __psbAuthToken=data.access_token; __psbAuthUser=data.user;
    const expiresAt=data.expires_at || Math.floor(Date.now()/1000)+(data.expires_in||3600);
    localStorage.setItem(PSB_AUTH_SESSION_KEY,JSON.stringify({...data,expires_at:expiresAt}));
    clearTimeout(psbRefreshTimer);
    psbRefreshTimer=setTimeout(()=>{psbEnsureAuthSession().catch(()=>{});},Math.max(1000,(expiresAt*1000-Date.now()-60000)));
}
async function psbEnsureAuthSession() {
    let session;
    try{session=JSON.parse(localStorage.getItem(PSB_AUTH_SESSION_KEY)||'null');}catch{return false;}
    if(!session?.access_token) return false;
    if(session.expires_at*1000>Date.now()+60000) { __psbAuthToken=session.access_token;__psbAuthUser=session.user;return true; }
    if(psbRefreshPromise) return psbRefreshPromise;
    if(!session.refresh_token) { psbClearAuth();return false; }
    const generation=psbAuthGeneration;
    psbRefreshPromise=(async()=>{
        const cfg=getSupabaseConfig();
        const res=await fetch(cfg.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:cfg.anonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),signal:AbortSignal.timeout(15000)});
        if(generation!==psbAuthGeneration)return false;
        if(!res.ok){if(res.status===400||res.status===401)psbClearAuth();return false;}
        const data=await res.json();
        if(generation!==psbAuthGeneration)return false;
        psbStoreAuth(data);return true;
    })().finally(()=>{psbRefreshPromise=null;});
    return psbRefreshPromise;
}
async function psbSignIn(email,password) {
    try {
        const cfg=getSupabaseConfig();
        const res=await fetch(cfg.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:cfg.anonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(15000)});
        if(!res.ok)return false;
        psbStoreAuth(await res.json());return true;
    }catch{return false;}
}
function psbClearAuth() {
    if(typeof psbClearQueues==='function')psbClearQueues();
    psbAuthGeneration++;clearTimeout(psbRefreshTimer);
    __psbAuthToken=null;__psbAuthUser=null;
    for(const key of [PSB_AUTH_SESSION_KEY,'psb_marketplace_orders_23','psb_store_session_23','psb_admin_session_23'])localStorage.removeItem(key);
}
function psbSignOut() {
    const token=__psbAuthToken;
    psbClearAuth();
    if(token){const cfg=getSupabaseConfig();fetch(cfg.url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:cfg.anonKey,Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)}).catch(()=>{});}
}
const supabaseHeaders=(prefer='',publicRequest=false)=>{
    const key=getSupabaseConfig().anonKey;
    const headers={apikey:key,Authorization:'Bearer '+(!publicRequest&&__psbAuthToken||key),'Content-Type':'application/json'};
    if(prefer)headers.Prefer=prefer;
    return headers;
};
