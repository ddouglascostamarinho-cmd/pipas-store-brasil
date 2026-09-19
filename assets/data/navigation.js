/* Real URLs, with migration of links shared before September 2026. */
function psbRoute() {
  const path = (location.hash || '').startsWith('#/') ? location.hash.slice(1) : (location.pathname || '/');
  const parts = path.replace(/^\/+|\/+$/g, '').split('/');
  return {page: parts[0] || 'home', slug: parts[1] || ''};
}
function psbRoutePath() {
  const {page,slug}=psbRoute();
  return page==='home' ? '/' : '/'+page+(slug?'/'+slug:'');
}
function psbNavigate(path, replace=false) {
  const url=new URL(path.replace(/^#/,''),location.origin);
  if(url.origin!==location.origin)return;
  history[replace?'replaceState':'pushState']({},'',url.pathname+url.search);
  if(typeof router==='function')router();
}
document.addEventListener('click',event=>{
  if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
  const link=event.target.closest?.('a[href]');
  if(!link || link.target || link.hasAttribute('download'))return;
  const href=link.getAttribute('href');
  if(!href?.startsWith('/') || href.startsWith('//') || href.startsWith('/assets/'))return;
  event.preventDefault();psbNavigate(href);
});
window.addEventListener('popstate',()=>router());
window.addEventListener('hashchange',()=>{
  if((location.hash||'').startsWith('#/'))psbNavigate(psbRoutePath(),true);
});
if((location.hash||'').startsWith('#/') || location.pathname==='/home') {
  history.replaceState({},'',psbRoutePath());
}
