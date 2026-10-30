import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {methodLink} from '../theme/charts/continuous-method.js';

test('method example uses earlier sources and reproduces its weighted calculation',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('../articles/local-word-similarity/data/continuous-method.json',import.meta.url)));
 const words=new Map(d.words.map(w=>[w.id,w]));assert.equal(words.get(d.target).label,'qokeedy');
 for(const w of d.words){assert(w.box[2]>w.box[0]&&w.box[3]>w.box[1]);if(w.role==='candidate')assert(w.id<d.target);}
 assert.equal(d.above_count,d.words.filter(w=>w.above).length);
 for(const example of d.examples){
  assert(words.get(example.source).above);let total=0,numerator=0;
  for(const [id,w] of Object.entries(example.weights)){assert(w>=0);assert(words.get(Number(id)).above);total+=w;numerator+=w*words.get(Number(id)).similarity;}
  assert(Math.abs(total-1)<1e-6);assert(Math.abs(numerator/total-example.mean)<1e-5);
  assert.equal(example.field.length,d.up.length);assert.equal(example.field[0].length,d.x.length);
  for(const row of example.field)for(const v of row)assert(Number.isFinite(v)&&v>=0&&v<=1.00001);
 }
 assert(d.validation.kernel_quadrature_max_error<1e-9);assert(d.validation.unit_integral);
});
test('method links name the exact example and overlay without stale heatmap options',()=>{
 const u=new URL(methodLink('https://example.invalid/article/?metric=identity&corpus=test','chart-method',{pair:'32387',overlay:'weight',labels:'on'}));
 assert.equal(u.hash,'#chart-method');assert.equal(u.searchParams.get('pair'),'32387');assert.equal(u.searchParams.get('overlay'),'weight');assert(!u.searchParams.has('metric'));assert(!u.searchParams.has('corpus'));
});
