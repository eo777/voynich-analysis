// Shared explanatory component: registered scan overlays and one-pair kernels.
const NS='http://www.w3.org/2000/svg';
const node=(name,attrs={},text)=>{const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;};
const el=(name,cls,text)=>{const e=document.createElement(name);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const colors={target:'#df741b',source:'#8b3fb2',candidate:'#087f8c',context:'#64748b'};
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*Math.max(0,Math.min(1,t))));
const rgb=a=>`rgb(${a.join(',')})`;
export function methodLink(href,id,state){
 const url=new URL(href);url.hash=id;url.searchParams.set('chart',id);
 for(const key of ['corpus','metric','coordinates','layout','pair','overlay','labels'])url.searchParams.delete(key);
 for(const [key,value] of Object.entries(state))url.searchParams.set(key,value);
 return url.href;
}
export async function mount(root,{source}){
 const response=await fetch(source);if(!response.ok)throw new Error(`Method data: HTTP ${response.status}`);
 const d=await response.json(),figure=root.closest('[data-chart-module]'),params=new URL(location.href).searchParams;
 const state={pair:String(d.examples[0].source),overlay:'candidates',labels:'off'};
 const choices={pair:d.examples.map(e=>[String(e.source),e.label]),overlay:[['candidates','Eligible source boxes'],['similarity','JS similarity to target'],['weight','Weight at the marked offset']],labels:[['off','Handwriting'],['on','EVA labels']]};
 if(params.get('chart')===figure.id)for(const [key,options] of Object.entries(choices)){const value=params.get(key);if(options.some(([v])=>v===value))state[key]=value;}
 root.replaceChildren();const controls=el('div','chart-controls');
 for(const [key,label] of [['pair','Example source'],['overlay','Page overlay'],['labels','Word labels']]){
  const wrap=el('label',null,label),select=el('select');select.setAttribute('aria-label',label);
  for(const [value,text] of choices[key]){const option=el('option',null,text);option.value=value;select.append(option);}
  select.value=state[key];select.addEventListener('change',()=>{state[key]=select.value;draw();});wrap.append(select);controls.append(wrap);
 }
 const grid=el('div','method-grid'),page=el('section','method-page'),field=el('section','method-field');
 const pageTitle=el('h4',null,'1 · Keep the actual word rectangles'),fieldTitle=el('h4',null,'2 · Spread each pair over nearby offsets');
 const pageMount=el('div'),fieldMount=el('div'),legend=el('p','method-legend'),fieldNote=el('p','method-legend');
 page.append(pageTitle,pageMount,legend);field.append(fieldTitle,fieldMount,fieldNote);grid.append(page,field);
 const result=el('div','method-result'),credit=el('p','chart-note');credit.textContent=d.credits.image+'. '+d.credits.coordinates+'.';
 grid.append(result);root.append(controls,grid,credit);
 function draw(){
  const example=d.examples.find(e=>String(e.source)===state.pair);
  figure.querySelector('[data-chart-link]').href=methodLink(location.href,figure.id,state);
  const svg=node('svg',{viewBox:`0 0 ${d.width} ${d.height}`,role:'img','aria-label':`Manuscript ${d.folio}: target qokeedy and eligible source rectangles`});
  svg.append(node('title',{},`Actual ${d.folio} image with registered analysis rectangles`));
  svg.append(node('image',{href:new URL(d.image,new URL(source,location.href)).href,width:d.width,height:d.height}));
  const maximum=Math.max(...Object.values(example.weights));
  for(const word of d.words){
   let color=colors[word.role],opacity=word.role==='context'?.01:.07;
   if(word.role==='candidate'&&state.overlay==='similarity'){color=rgb(mix([235,244,249],[10,92,128],word.similarity/100));opacity=.68;}
   if(word.role==='candidate'&&state.overlay==='weight'){color=rgb(mix([248,245,250],[101,38,149],(example.weights[word.id]||0)/maximum));opacity=word.above?.70:.04;}
   const selected=word.id===example.source,target=word.id===d.target;
   const polygon=node('polygon',{points:word.polygon.map(p=>p.join(',')).join(' '),fill:color,'fill-opacity':opacity,stroke:selected?colors.source:target?colors.target:color,'stroke-width':selected||target?5:2,'stroke-dasharray':word.role==='context'?'6 5':'none'});
   polygon.append(node('title',{},`${word.label}${target?' · target':word.role==='context'?' · excluded from this target’s pairs':` · JS ${word.similarity.toFixed(1)}; ${word.above?'above-line':'same-line'} source`}`));svg.append(polygon);
   if(state.labels==='on'||target||selected){
    const x=word.polygon.reduce((s,p)=>s+p[0],0)/4,y=word.polygon.reduce((s,p)=>s+p[1],0)/4;
    svg.append(node('text',{x,y,'text-anchor':'middle','dominant-baseline':'middle','font-size':20,'font-family':'system-ui,sans-serif',fill:'#17262c',stroke:'white','stroke-width':5,'paint-order':'stroke'},word.label));
   }
  }
  pageMount.replaceChildren(svg);
  legend.textContent=state.overlay==='candidates'?`Orange: target. Purple outline: selected source. Teal: ${d.above_count} above-line + ${d.current_line_count} same-line candidates. Dashed gray: excluded. The current-line sources are handled separately.`:state.overlay==='similarity'?'Blue fill: JS similarity to this target, from pale (0) to dark (100). This is the observed word-pair score, without shuffle subtraction. Orange/purple outlines identify the target and selected source.':'Purple fill: normalized positional weight at the marked offset, from pale (zero) to dark (the largest share). Only the above-line pairs enter this illustration’s mean. This color does not measure word similarity.';
  // The field is evaluated analytically over the boxes; the fine mesh only renders it.
  const canvas=document.createElement('canvas');canvas.width=d.x.length;canvas.height=d.up.length;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(canvas.width,canvas.height);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const color=mix([253,251,255],[91,35,145],example.field[canvas.height-1-y][x]),at=(y*canvas.width+x)*4;
   pixels.data.set([...color,255],at);
  }
  ctx.putImageData(pixels,0,0);
  const graph=node('svg',{viewBox:'0 0 440 355',role:'img','aria-label':`Positional kernel for ${example.label}; not a similarity score`});
  const xp=x=>48+(x+6)/12*350,yp=u=>20+(9.5-u)/9*260;
  graph.append(node('rect',{x:48,y:20,width:350,height:260,fill:'#fdfbff'}));
  graph.append(node('image',{href:canvas.toDataURL('image/png'),x:48,y:20,width:350,height:260,preserveAspectRatio:'none'}));
  for(const x of [-6,-3,0,3,6])graph.append(node('text',{x:xp(x),y:315,'text-anchor':'middle','font-size':12,fill:'#243337'},x));
  for(const y of [1,3,6,9])graph.append(node('text',{x:39,y:yp(y)+4,'text-anchor':'end','font-size':12,fill:'#243337'},'−'+y));
  graph.append(node('text',{x:xp(0),y:301,'text-anchor':'middle','font-size':24,fill:colors.target},'★'));
  graph.append(node('circle',{cx:xp(example.x),cy:yp(example.up),r:5,fill:'none',stroke:'#281331','stroke-width':2}));
  graph.append(node('text',{x:223,y:342,'text-anchor':'middle','font-size':12,fill:'#243337'},'Horizontal offset · page-median word advances'));
  graph.append(node('text',{transform:'translate(13 150) rotate(-90)','text-anchor':'middle','font-size':12,fill:'#243337'},'Vertical offset · line pitches'));
  fieldMount.replaceChildren(graph);
  fieldNote.textContent='Purple: this pair’s positional weight, scaled from 0 (white) to its peak (dark). The circle marks its center displacement. The star is the target; the current-line strip is omitted here. Kernel tails do not add later words to the candidate set.';
  result.replaceChildren(el('h4',null,'3 · Average similarity with those weights'),el('p','method-formula','Mean at an offset = Σ (pair weight × pair similarity) / Σ pair weight'));
  result.append(el('p',null,`${example.label.split(' — ')[0]} → qokeedy: ${example.similarity.toFixed(1)} JS similarity points. At horizontal offset ${example.x.toFixed(2)} and ${example.up.toFixed(2)} line pitches above, this pair supplies ${(example.source_share*100).toFixed(1)}% of the positional weight among the ${d.above_count} above-line sources of this target. Their weighted mean is ${example.mean.toFixed(1)}.`));
  result.append(el('p','chart-note','This is one target for explanation. The published map pools all eligible word pairs across targets, applies support masks, and subtracts the shuffle mean at each location. The analysis uses the original recorded rectangles; image registration is for display only.'));
 }
 draw();
}
