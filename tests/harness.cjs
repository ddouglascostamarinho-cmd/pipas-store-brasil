const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
function createApp(overrides = {}) {
  const storage = new Map();
  const element = {addEventListener(){},classList:{add(){},remove(){},toggle(){}},style:{},querySelector(){return null;},querySelectorAll(){return [];}};
  const context = vm.createContext({
    console, crypto:webcrypto, URL, URLSearchParams, AbortSignal, structuredClone, setTimeout, clearTimeout,
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
    sessionStorage:{getItem:k=>storage.get('session:'+k)??null,setItem:(k,v)=>storage.set('session:'+k,String(v)),removeItem:k=>storage.delete('session:'+k)},
    document:{getElementById:()=>element,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},
    location:{hash:'',pathname:'/',origin:'http://localhost'}, history:{replaceState(){},pushState(){}}, navigator:{}, addEventListener(){}, scrollTo(){},
    fetch:async()=>{throw new Error('Unexpected network request in isolated test');},
    ...overrides
  });
  context.window=context;
  const root=path.resolve(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'scripts/site-template.html'),'utf8');
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if(/application\/ld\+json/.test(m[1]))continue;
    const src=m[1].match(/src="([^"]+)"/);
    if(src){const p=path.join(root,src[1]);if(fs.existsSync(p))vm.runInContext(fs.readFileSync(p,'utf8'),context);}
    else vm.runInContext(m[2],context);
  }
  return {context,storage,run:code=>vm.runInContext(code,context)};
}
module.exports={createApp};
