import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import MarkdownIt from 'markdown-it';
import nunjucks from 'nunjucks';
import YAML from 'yaml';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
export function contained(root,relative){
  if(typeof relative!=='string'||!relative||/^[a-z]+:|^[/\\]/i.test(relative))throw new Error(`Expected a relative path: ${relative}`);
  const absolute=path.resolve(root,relative);
  if(!absolute.startsWith(path.resolve(root)+path.sep))throw new Error(`Path escapes its content directory: ${relative}`);
  if(fs.existsSync(absolute)&&!fs.realpathSync(absolute).startsWith(fs.realpathSync(root)+path.sep))throw new Error(`Symlink escapes content directory: ${relative}`);
  return absolute;
}
export function parseDocument(source){
  const match=source.replace(/^\uFEFF/,'').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if(!match)throw new Error('Article needs YAML metadata between --- lines.');
  const meta=YAML.parse(match[1]);
  for(const key of ['title','date','summary'])if(typeof meta?.[key]!=='string'||!meta[key].trim())throw new Error(`Missing article ${key}`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)||Number.isNaN(Date.parse(meta.date)))throw new Error('Use a YYYY-MM-DD date.');
  if(meta.tags&&!Array.isArray(meta.tags))throw new Error('tags must be a YAML list.');
  if(meta.draft!==undefined&&typeof meta.draft!=='boolean')throw new Error('draft must be true or false.');
  return {meta,body:match[2]};
}
export function markdown(renderMedia){
  const md=new MarkdownIt({html:false,linkify:false,typographer:false});
  md.block.ruler.before('paragraph','media_reference',(state,start,end,silent)=>{
    const line=state.src.slice(state.bMarks[start]+state.tShift[start],state.eMarks[start]);
    if(!line.startsWith('::'))return false;
    const match=line.match(/^::(figure|chart|gallery)\[([a-z0-9-]+)\]\s*$/);
    if(!match)throw new Error(`Invalid media reference: ${line}`);
    if(silent)return true;
    const token=state.push('media_reference','',0);token.block=true;token.meta={kind:match[1],id:match[2]};state.line=start+1;return true;
  });
  md.renderer.rules.media_reference=(tokens,index)=>renderMedia(tokens[index].meta.kind,tokens[index].meta.id)+'\n';
  md.core.ruler.after('inline','heading_links',state=>{
    const used=new Set(),explicit=new Set();
    for(let i=0;i<state.tokens.length;i++)if(state.tokens[i].type==='heading_open'){
      const match=state.tokens[i+1].content.match(/\s+\{#([a-z][a-z0-9-]*)\}\s*$/);
      if(match){if(explicit.has(match[1]))throw new Error(`Duplicate heading ID: ${match[1]}`);explicit.add(match[1]);}
    }
    for(let i=0;i<state.tokens.length;i++)if(state.tokens[i].type==='heading_open'){
      const heading=state.tokens[i],inline=state.tokens[i+1],match=inline.content.match(/\s+\{#([a-z][a-z0-9-]*)\}\s*$/);
      if(match){inline.content=inline.content.slice(0,match.index);inline.children=[];md.inline.parse(inline.content,md,state.env,inline.children);}
      const label=inline.children.filter(t=>['text','code_inline','image'].includes(t.type)).map(t=>t.content).join('');
      const base=label.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'section';
      let id=match?.[1]||base,n=1;while(used.has(id)||(!match&&explicit.has(id)))id=`${base}-${++n}`;
      used.add(id);heading.attrSet('id',id);
      const open=new state.Token('link_open','a',1);open.attrSet('href','#'+id);open.attrSet('class','permalink');open.attrSet('data-copy-link','');open.attrSet('aria-label',`Copy link to ${label}`);
      const text=new state.Token('text','',0);text.content='Link';inline.children.push(open,text,new state.Token('link_close','a',-1));
    }
  });
  return md;
}
function walk(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);if(e.isSymbolicLink())throw new Error(`Symlinks are not published: ${p}`);
    return e.isDirectory()?walk(p):[p];
  });
}
export async function build(root=ROOT){
  const site=(await import(pathToFileURL(path.join(root,'site.config.mjs')).href)).default;
  if(!/^\/[-a-z0-9/]*$/i.test(site.basePath)||site.basePath.endsWith('/'))throw new Error('basePath must be a leading-slash path without a trailing slash.');
  const out=path.join(root,'_site');
  // Delete only the dedicated, generated output directory.
  if(path.dirname(out)!==path.resolve(root)||path.basename(out)!=='_site')throw new Error('Unsafe output directory');
  fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
  const write=(relative,data)=>{const p=contained(out,relative);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data);};
  const url=relative=>site.basePath+'/'+relative.replace(/^\//,'');
  const asset=relative=>url(relative)+'?v='+sha(fs.readFileSync(contained(root,relative))).slice(0,12);
  const env=new nunjucks.Environment(new nunjucks.FileSystemLoader(path.join(root,'theme/templates'),{noCache:true}),{autoescape:true});
  env.addGlobal('url',url);env.addGlobal('asset',asset);
  const render=(template,data)=>env.render(template,{site,...data});
  for(const folder of ['theme/assets','theme/charts'])for(const p of walk(path.join(root,folder))){
    if(!['.css','.js','.svg','.woff2'].includes(path.extname(p)))continue;
    write(path.relative(root,p).split(path.sep).join('/'),fs.readFileSync(p));
  }
  const articles=[];
  for(const entry of fs.readdirSync(path.join(root,'articles'),{withFileTypes:true})){
    if(!entry.isDirectory()||entry.name.startsWith('_'))continue;
    if(!/^[a-z0-9-]+$/.test(entry.name))throw new Error(`Invalid article slug: ${entry.name}`);
    const dir=path.join(root,'articles',entry.name);const doc=parseDocument(fs.readFileSync(path.join(dir,'index.md'),'utf8'));
    if(doc.meta.draft)continue;
    const article={...doc.meta,slug:entry.name,path:`articles/${entry.name}/`,tags:doc.meta.tags||[]};
    const mediaPath=path.join(dir,'media.yml');const media=fs.existsSync(mediaPath)?YAML.parse(fs.readFileSync(mediaPath,'utf8')):{};
    let instances=new Set();
    const instanceId=id=>{if(instances.has(id))throw new Error(`Duplicate media placement: ${id}`);instances.add(id);return id;};
    const resource=relative=>{
      if(!/^(images|data)\//.test(relative))throw new Error(`Article media must be under images/ or data/: ${relative}`);
      const p=contained(dir,relative);if(!fs.statSync(p).isFile())throw new Error(`Missing media: ${relative}`);
      return url(article.path+relative)+'?v='+sha(fs.readFileSync(p)).slice(0,12);
    };
    const figure=id=>{
      const item=media.figures?.[id];if(!item)throw new Error(`Unknown figure ${id} in ${entry.name}`);
      if(!item.title||!item.alt)throw new Error(`Figure ${id} needs a title and alt text`);
      const bytes=fs.readFileSync(contained(dir,item.src));
      // Reserve the exported PNG's aspect ratio before lazy loading; fragment
      // targets below scientific figures must not move when an image arrives.
      const dimensions=bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}:{};
      return {...item,...dimensions,src:resource(item.src),download:item.download?resource(item.download):null};
    };
    const chart=id=>{
      const item=media.charts?.[id];if(!item)throw new Error(`Unknown chart ${id} in ${entry.name}`);
      if(!site.charts[item.type])throw new Error(`Unregistered chart type: ${item.type}`);
      return {...item,module:asset(site.charts[item.type]),data:resource(item.data),fallback:resource(item.fallback),preset:JSON.stringify(item.preset||{})};
    };
    const renderItem=(kind,id,context='')=>{
      const instance=instanceId(`${context}${kind}-${id}`);
      if(kind==='figure')return render('figure.njk',{item:figure(id),instance});
      if(kind==='chart')return render('chart.njk',{item:chart(id),instance});
      throw new Error(`Unsupported gallery item: ${kind}`);
    };
    const gallery=(id,provided=null)=>{
      const spec=provided||media.galleries?.[id];if(!spec||!spec.items?.length)throw new Error(`Unknown or empty gallery: ${id}`);
      const instance=instanceId(`gallery-${id}`);
      const items=spec.items.map(ref=>{
        const [kind,itemid]=ref.split(':');if(!itemid)throw new Error(`Gallery item must be figure:id or chart:id: ${ref}`);
        const item=kind==='figure'?figure(itemid):chart(itemid);
        return {title:item.title,thumbnail:kind==='figure'?item.src:item.fallback,html:renderItem(kind,itemid,instance+'-')};
      });
      return render('gallery.njk',{instance,title:spec.title||'Figures',items});
    };
    const md=markdown((kind,id)=>kind==='gallery'?gallery(id):renderItem(kind,id));
    md.core.ruler.after('inline','article_links',state=>{
      for(const token of state.tokens)for(const child of token.children||[]){
        const attr=child.type==='link_open'?'href':child.type==='image'?'src':null;
        if(!attr)continue;const ref=child.attrGet(attr);
        if(!ref||/^[a-z]+:|^#|^\/\//i.test(ref))continue;
        if(ref.startsWith('/'))throw new Error('Article links must be relative or fully qualified.');
        const resolved=path.posix.normalize(article.path+ref);
        if(resolved.startsWith('../'))throw new Error('Article link escapes the site.');
        child.attrSet(attr,url(resolved));
      }
    });
    const content=md.render(doc.body);
    for(const folder of ['images','data'])for(const p of walk(path.join(dir,folder))){
      if(!['.png','.svg','.jpg','.jpeg','.webp','.gif','.json','.csv','.pdf'].includes(path.extname(p).toLowerCase()))throw new Error(`Unsupported published asset: ${p}`);
      write(article.path+path.relative(dir,p).split(path.sep).join('/'),fs.readFileSync(p));
    }
    write(article.path+'index.html',render('article.njk',{article,content,title:article.title,description:article.summary,pagePath:article.path}));
    const all=[...Object.keys(media.figures||{}).map(id=>'figure:'+id),...Object.keys(media.charts||{}).map(id=>'chart:'+id)];
    instances=new Set();
    const galleryHTML=all.length?gallery('all',{title:'All figures and interactive charts',items:all}):'<p>No figures in this article.</p>';
    write(article.path+'gallery/index.html',render('gallery-page.njk',{article,gallery:galleryHTML,title:article.title+' — figure gallery',description:article.summary,pagePath:article.path+'gallery/'}));
    articles.push(article);
  }
  articles.sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));
  for(const [file,title,intro] of [['index.html',site.title,site.description],['articles/index.html','Articles','Browse the studies and visual comparisons.']])write(file,render('index.njk',{title,intro,articles,pagePath:file==='index.html'?'':'articles/'}));
  write('404.html',render('404.njk',{title:'Page not found',pagePath:'404.html'}));
  write('.nojekyll','');
  const esc=x=>String(x).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
  write('feed.xml',`<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>${esc(site.title)}</title><link>${esc(site.url+url(''))}</link><description>${esc(site.description)}</description>${articles.map(a=>`<item><title>${esc(a.title)}</title><link>${esc(site.url+url(a.path))}</link><guid>${esc(site.url+url(a.path))}</guid><pubDate>${new Date(a.date+'T12:00:00Z').toUTCString()}</pubDate><description>${esc(a.summary)}</description></item>`).join('')}</channel></rss>`);
  write('sitemap.xml',`<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','articles/',...articles.map(a=>a.path)].map(p=>`<url><loc>${esc(site.url+url(p))}</loc></url>`).join('')}</urlset>`);
  const manifest={version:1,articles:articles.map(a=>a.slug),files:Object.fromEntries(walk(out).map(p=>[path.relative(out,p).split(path.sep).join('/'),sha(fs.readFileSync(p))]))};
  write('build-manifest.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({articles:articles.length,files:Object.keys(manifest.files).length,output:'_site'}));return {out,site,articles,manifest};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
