import fs from 'node:fs';
import path from 'node:path';
import {ROOT,sha} from './build.mjs';
import site from '../site.config.mjs';
const out=path.join(ROOT,'_site'),manifest=JSON.parse(fs.readFileSync(path.join(out,'build-manifest.json'),'utf8'));
let references=0;
const pageIds=new Map();
for(const name of Object.keys(manifest.files).filter(x=>x.endsWith('.html'))){
 const ids=[...fs.readFileSync(path.join(out,name),'utf8').matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 if(new Set(ids).size!==ids.length)throw new Error(`Duplicate fragment IDs: ${name}`);pageIds.set(name,new Set(ids));
}
for(const [name,hash] of Object.entries(manifest.files)){
 const file=path.join(out,name),data=fs.readFileSync(file);if(sha(data)!==hash)throw new Error(`Build changed after generation: ${name}`);
 if(/\.(html|js|json|css|xml|svg)$/.test(name)){
  const text=data.toString('utf8');if(/(?:\b[A-Z]:[\\/]|file:\/\/\/|Users[\\/]+eoetk)/i.test(text))throw new Error(`Local path in publication: ${name}`);
  if(/INVALID_DO_NOT_USE_markov|currier_audit|markov_extended/.test(text))throw new Error(`Retired analysis reference in publication: ${name}`);
  if(name.endsWith('.html')){
   if(/<style\b|\sstyle=/.test(text))throw new Error(`CSS must be shared, not embedded in pages: ${name}`);
   for(const m of text.matchAll(/\b(?:src|href|data-chart-module|data-chart-source)="([^"]+)"/g)){
    const raw=m[1].replaceAll('&amp;','&');
    if(/^https?:|^data:|^mailto:/.test(raw))continue;
    const hash=raw.includes('#')?decodeURIComponent(raw.slice(raw.indexOf('#')+1)):'';
    let ref=raw.split('?')[0].split('#')[0];
    if(!ref){if(hash&&!pageIds.get(name).has(hash))throw new Error(`Missing fragment: ${name} -> #${hash}`);references++;continue;}
    if(!ref.startsWith(site.basePath+'/'))throw new Error(`Link is not project-path safe: ${name} -> ${ref}`);
    ref=decodeURIComponent(ref.slice(site.basePath.length+1));let target=path.join(out,ref);
    if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
    if(!fs.existsSync(target))throw new Error(`Missing link: ${name} -> ${ref}`);references++;
    const targetName=path.relative(out,target).split(path.sep).join('/');
    if(hash&&pageIds.has(targetName)&&!pageIds.get(targetName).has(hash))throw new Error(`Missing fragment: ${name} -> ${raw}`);
   }
  }
 }
}
console.log(JSON.stringify({checkedFiles:Object.keys(manifest.files).length,checkedReferences:references,noLocalPaths:true,noEmbeddedPageStyles:true}));
