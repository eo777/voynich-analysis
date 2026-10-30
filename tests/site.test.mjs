import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ROOT,build,contained,parseDocument,markdown,sha} from '../tools/build.mjs';
import {difference,selectedView,linkedState,viewLink} from '../theme/charts/heatmap.js';

test('authoring uses real Markdown; directives do not run inside fenced examples',()=>{
 const md=markdown((kind,id)=>`<figure data-kind="${kind}" data-id="${id}"></figure>`);
 assert.match(md.render('A **bold** sentence.\n\n::figure[test]'),/<strong>bold<\/strong>/);
 assert.match(md.render('::chart[test]'),/data-kind="chart"/);
 assert.doesNotMatch(md.render('```\n::figure[test]\n```'),/<figure/);
 assert.match(md.render('<style>body{color:red}</style>'),/&lt;style&gt;/);
 assert.throws(()=>md.render('::gallery[bad id]'),/Invalid media/);
});
test('front matter validates dates and draft flags',()=>{
 const text='---\ntitle: Example\ndate: "2026-10-30"\nsummary: A study\ndraft: true\n---\nPlain text';
 assert.equal(parseDocument(text).meta.draft,true);
 assert.equal(parseDocument(text).body,'Plain text');
 assert.throws(()=>parseDocument(text.replace('draft: true','draft: "true"')),/draft/);
 assert.throws(()=>parseDocument('No metadata'),/metadata/);
});
test('section links have unique IDs and explicit IDs survive title edits',()=>{
 const md=markdown(()=>''),html=md.render('## Same\n\n## Same\n\n## **Methods** {#methods}\n');
 assert.match(html,/id="same"/);assert.match(html,/id="same-2"/);assert.match(html,/id="methods"/);assert.doesNotMatch(html,/\{#methods\}/);
 assert.match(md.render('## Rewritten title {#methods}'),/href="#methods"/);
 assert.throws(()=>md.render('## One {#x}\n\n## Two {#x}'),/Duplicate heading/);
 assert.match(md.render('## Methods\n\n## Explicit {#methods}'),/id="methods-2"/);
});
test('chart links restore only validated settings for the named chart',()=>{
 const state={corpus:'poem',metric:'identity',coordinates:'discrete',layout:'mild'};
 const choices=Object.fromEntries(Object.entries(state).map(([k,v])=>[k,[[v,v]]]));
 const href=viewLink('https://example.invalid/article/','chart-example',state);
 assert.equal(new URL(href).hash,'#chart-example');assert.deepEqual(linkedState(href,'chart-example',{},choices),state);
 assert.deepEqual(linkedState(href,'other-chart',{},choices),{});
 assert.equal(linkedState(href.replace('metric=identity','metric=bad'),'chart-example',{metric:'js'},choices).metric,'js');
});
test('publication paths cannot escape their article',()=>{
 assert.throws(()=>contained(ROOT,'../private.txt'),/escapes/);
 assert.throws(()=>contained(ROOT,'C:/private.txt'),/relative/);
});
test('chart subtraction preserves masked cells and coordinate selection',()=>{
 assert.deepEqual(difference([[1,null,2]],[[.5,.2,null]]),[[.5,null,null]]);
 const data={corpora:{example:{metrics:{js:{discrete:{regular:{value:1}},continuous:{regular:{value:2},mild:{value:3}}}}}}};
 assert.equal(selectedView(data,{corpus:'example',metric:'js',coordinates:'discrete',layout:'mild'}).view.value,1);
 assert.equal(selectedView(data,{corpus:'example',metric:'js',coordinates:'continuous',layout:'mild'}).view.value,3);
});
test('all exported views have finite or explicitly masked values and compatible shapes',()=>{
 const d=JSON.parse(fs.readFileSync(path.join(ROOT,'articles/local-word-similarity/data/heatmaps.json')));
 assert.equal(Object.keys(d.corpora).length,6);let count=0;
 for(const c of Object.values(d.corpora))for(const metric of Object.values(c.metrics))for(const [kind,views] of Object.entries(metric))for(const v of Object.values(views)){
  assert(v.maximum>0&&v.bound>0);assert.equal(v.obs.length,v.nul.length);
  if(kind==='continuous'){assert.equal(v.obs.length,v.up.length);assert.equal(v.obs[0].length,v.x.length);assert.equal(v.line_obs.length,v.line_x.length);}
  for(let i=0;i<v.obs.length;i++){assert.equal(v.obs[i].length,v.nul[i].length);for(const field of [v.obs[i],v.nul[i]])for(const x of field)assert(x===null||Number.isFinite(x));}
  count++;
 }
 // Four non-poetry texts × 3 metrics × 2 coordinates,
 // plus two poems × 3 metrics × (3 continuous layouts + 1 ordinal).
 assert.equal(count,48);
});
test('draft assets stay private; editing article text rebuilds without editing theme files',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'voynich-site-test-'));
 try{
  fs.cpSync(path.join(ROOT,'theme'),path.join(root,'theme'),{recursive:true});fs.copyFileSync(path.join(ROOT,'site.config.mjs'),path.join(root,'site.config.mjs'));
  const dir=path.join(root,'articles/example');fs.mkdirSync(path.join(dir,'images'),{recursive:true});fs.mkdirSync(path.join(root,'articles/draft'),{recursive:true});
  const source='---\ntitle: Example\ndate: "2026-10-30"\nsummary: A test\n---\nOriginal wording.\n\n::figure[example]\n\n[Image](images/example.svg)';
  fs.writeFileSync(path.join(dir,'index.md'),source);fs.writeFileSync(path.join(dir,'media.yml'),'figures:\n  example:\n    title: Example\n    alt: One rectangle\n    src: images/example.svg\n');fs.writeFileSync(path.join(dir,'images/example.svg'),'<svg xmlns="http://www.w3.org/2000/svg"/>');
  fs.writeFileSync(path.join(root,'articles/draft/index.md'),'---\ntitle: Secret draft\ndate: "2026-10-30"\nsummary: Private\ndraft: true\n---\nDo not publish.');
  const css=sha(fs.readFileSync(path.join(root,'theme/assets/site.css')));
  await build(root);const output=path.join(root,'_site/articles/example/index.html');
  assert.match(fs.readFileSync(output,'utf8'),/Original wording/);assert(!fs.existsSync(path.join(root,'_site/articles/draft')));
  assert.match(fs.readFileSync(output,'utf8'),/href="\/voynich-analysis\/articles\/example\/images\/example.svg"/);
  assert.match(fs.readFileSync(output,'utf8'),/id="figure-example"/);
  assert.match(fs.readFileSync(path.join(root,'_site/articles/example/gallery/index.html'),'utf8'),/id="gallery-all-figure-example"/);
  fs.writeFileSync(path.join(dir,'index.md'),source.replace('Original wording.','Rewritten argument.'));await build(root);
  assert.match(fs.readFileSync(output,'utf8'),/Rewritten argument/);assert.equal(sha(fs.readFileSync(path.join(root,'theme/assets/site.css'))),css);
  fs.writeFileSync(path.join(dir,'index.md'),source.replace('::figure[example]','::figure[missing]'));await assert.rejects(build(root),/Unknown figure/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
