const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain','.csv':'text/csv'};
http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 const dest=path.resolve(root,'.'+pathname);
 if(!dest.startsWith(root+path.sep)&&dest!==root){res.writeHead(403);res.end();return;}
 if(/\/(?:\.git|node_modules|supabase|tests|scripts|docs)(?:\/|$)/.test(pathname)){res.writeHead(404);res.end();return;}
 let file=dest;if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 const status=fs.existsSync(file)&&fs.statSync(file).isFile()?200:404;
 if(status===404)file=path.join(root,'404.html');
 res.writeHead(status,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}).listen(4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173'));
