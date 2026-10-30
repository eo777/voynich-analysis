import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './build.mjs';
import site from '../site.config.mjs';
const out=path.join(ROOT,'_site'),port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.xml':'application/xml'};
http.createServer((req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/'||u.pathname===site.basePath){res.writeHead(302,{Location:site.basePath+'/'});res.end();return;}
  if(!u.pathname.startsWith(site.basePath+'/')){res.writeHead(404);res.end('Not found');return;}
  const relative=decodeURIComponent(u.pathname.slice(site.basePath.length+1));let p=path.resolve(out,relative||'.');
  if(p!==out&&!p.startsWith(out+path.sep)){res.writeHead(403);res.end();return;}
  if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
  if(!fs.existsSync(p)){res.writeHead(404,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(out,'404.html')));return;}
  res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(p).pipe(res);
 }catch{res.writeHead(400);res.end('Bad request');}
}).listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}${site.basePath}/`));
