window.addEventListener('error', function(e){
    try { console.warn('[PSB:err]', e.message, e.filename + ':' + e.lineno); } catch(_){}
});
window.addEventListener('unhandledrejection', function(e){
    try { console.warn('[PSB:rej]', e.reason); } catch(_){}
});
