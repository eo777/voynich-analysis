// Native SVG renderer. Shared presentation; article files supply data and presets.
const cache=new Map();
const NS='http://www.w3.org/2000/svg';
const svgNode=(name,attrs={},text)=>{const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;};
const el=(name,cls,text)=>{const e=document.createElement(name);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
export const difference=(observed,mean)=>observed.map((row,i)=>row.map((v,j)=>v===null||mean[i][j]===null?null:v-mean[i][j]));
export function selectedView(data,state){
 const corpus=data.corpora[state.corpus];if(!corpus)throw new Error('Unknown corpus');
 const group=corpus.metrics[state.metric][state.coordinates];
 return {corpus,view:group[state.coordinates==='discrete'?'regular':state.layout]||group.regular};
}
const hex=s=>s.trim().replace('#','').match(/.{2}/g).map(x=>parseInt(x,16));
const mix=(a,b,t)=>'#'+a.map((x,i)=>Math.round(x+(b[i]-x)*Math.max(0,Math.min(1,t))).toString(16).padStart(2,'0')).join('');
export function linkedState(href,id,state,choices){
 const params=new URL(href).searchParams,result={...state};
 if(params.get('chart')===id)for(const [key,options] of Object.entries(choices)){const value=params.get(key);if(options.some(([v])=>v===value))result[key]=value;}
 return result;
}
export function viewLink(href,id,state){
 const url=new URL(href);url.hash=id;url.searchParams.set('chart',id);
 for(const key of ['corpus','metric','coordinates','layout'])url.searchParams.set(key,state[key]);
 return url.href;
}
export async function mount(root,{source,preset={}}){
 if(!cache.has(source))cache.set(source,fetch(source).then(r=>{if(!r.ok)throw new Error(`Chart data: HTTP ${r.status}`);return r.json();}));
 const data=await cache.get(source);const figure=root.closest('[data-chart-module]');
 let state={corpus:'voynich',metric:'js',coordinates:'continuous',layout:'regular',...preset};
 root.replaceChildren();const controls=el('div','chart-controls'),surface=el('div','chart-surface'),note=el('p','chart-note'),hover=el('p','chart-hover','Hover over a cell to read its value.');hover.setAttribute('aria-live','polite');
 const selectors={};
 const choices={corpus:Object.entries(data.corpora).map(([id,c])=>[id,c.label]),metric:[['js','JS similarity'],['identity','Identity'],['edit1','Exactly one edit']],coordinates:[['continuous','Continuous spatial'],['discrete','Discrete ordinal']],layout:[['regular','Regular spacing'],['mild','Mild dispersion'],['dispersed','Greater dispersion']]};
 state=linkedState(location.href,figure.id,state,choices);
 for(const [key,label] of [['corpus','Text'],['metric','Metric'],['coordinates','Coordinates'],['layout','Poetry spacing']]){
  const wrap=el('label',null,label),select=el('select');select.setAttribute('aria-label',label);
  for(const [value,title] of choices[key]){const option=el('option',null,title);option.value=value;select.append(option);}select.value=state[key];selectors[key]=select;
  select.addEventListener('change',()=>{state[key]=select.value;draw();});wrap.append(select);controls.append(wrap);
 }
 const download=el('button',null,'Download current SVG');download.type='button';controls.append(download);root.append(controls,surface,note,hover);
 function draw(){
  figure.querySelector('[data-chart-link]').href=viewLink(location.href,figure.id,state);
  const {corpus,view:v}=selectedView(data,state);selectors.layout.disabled=state.coordinates==='discrete'||!corpus.poetry;
  const css=getComputedStyle(root),color=name=>css.getPropertyValue(name).trim();
  const raw=[hex(color('--chart-raw-low')),hex(color('--chart-raw-mid')),hex(color('--chart-raw-high'))],negative=hex(color('--chart-negative')),neutral=hex(color('--chart-neutral')),positive=hex(color('--chart-positive'));
  const fill=(value,delta)=>{if(value===null)return color('--chart-missing');if(delta){const t=value/v.bound;return t<0?mix(neutral,negative,-t):mix(neutral,positive,t);}const t=value/v.maximum;return t<.5?mix(raw[0],raw[1],t*2):mix(raw[1],raw[2],t*2-1);};
  const svg=svgNode('svg',{viewBox:'0 0 1020 410',role:'img','aria-label':`${corpus.label}: observed, shuffled mean, and difference; ${data.metrics[state.metric].label}`,'font-family':css.fontFamily,'font-size':12});
  svg.append(svgNode('title',{},`${corpus.label} — ${data.metrics[state.metric].label}`));svg.append(svgNode('desc',{},'Earlier lines appear above the target. Current-line sources are left of the star. The target and later current-line words are excluded. Values can be downloaded as JSON.'));
  svg.append(svgNode('rect',{width:1020,height:410,fill:color('--surface')}));
  const fields=[v.obs,v.nul,difference(v.obs,v.nul)],lineFields=state.coordinates==='continuous'?[v.line_obs,v.line_nul,v.line_obs.map((x,i)=>x===null||v.line_nul[i]===null?null:x-v.line_nul[i])]:null;
  const text=(x,y,s,anchor='start',size=12)=>svgNode('text',{x,y,'text-anchor':anchor,'font-size':size,fill:color('--ink')},s);
  const edge=(values,i,left)=>left?(i===0?values[i]-(values[1]-values[0])/2:(values[i-1]+values[i])/2):(i===values.length-1?values[i]+(values[i]-values[i-1])/2:(values[i]+values[i+1])/2);
  for(let panel=0;panel<3;panel++){
   const x0=36+panel*340,w=288,y0=45,h=236,stripY=297,stripH=23,delta=panel===2,field=fields[panel];
   const xp=x=>x0+(x+6.5)/13*w,yp=up=>y0+(9.5-up)/9*h;
   svg.append(text(x0+w/2,23,['Observed','Shuffle mean','Observed − shuffle'][panel],'middle',15));
   svg.append(svgNode('rect',{x:x0,y:y0,width:w,height:h,fill:color('--chart-missing')}));
   svg.append(svgNode('rect',{x:x0,y:stripY,width:w,height:stripH,fill:color('--chart-missing')}));
   function cell(x,y,width,height,value,label){
    if(width<=0||height<=0)return;
    const r=svgNode('rect',{x,y,width:width+.1,height:height+.1,fill:fill(value,delta)}),desc=value===null?'Insufficient support':`${label}: ${value.toFixed(5)} ${state.metric==='js'?'similarity points':delta?'percentage points':'%'}`;
    r.append(svgNode('title',{},desc));r.addEventListener('pointerenter',()=>{hover.textContent=desc;});svg.append(r);
   }
   if(state.coordinates==='continuous'){
    for(let iy=0;iy<v.up.length;iy++)for(let ix=0;ix<v.x.length;ix++){
     const left=Math.max(-6.5,edge(v.x,ix,true)),right=Math.min(6.5,edge(v.x,ix,false)),low=Math.max(.5,edge(v.up,iy,true)),high=Math.min(9.5,edge(v.up,iy,false));
     cell(xp(left),yp(high),xp(right)-xp(left),yp(low)-yp(high),field[iy][ix],`${['Observed','Shuffle mean','Difference'][panel]}, x ${v.x[ix].toFixed(2)}, ${v.up[iy].toFixed(2)} pitches above`);
    }
    for(let i=0;i<v.line_x.length;i++){const l=Math.max(-6.5,edge(v.line_x,i,true)),r=Math.min(-.5,edge(v.line_x,i,false));cell(xp(l),stripY,xp(r)-xp(l),stripH,lineFields[panel][i],`${['Observed','Shuffle mean','Difference'][panel]}, current line, x ${v.line_x[i].toFixed(2)}`);}
   }else{
    for(let lag=1;lag<10;lag++)for(let ix=0;ix<13;ix++)cell(xp(ix-6.5),yp(lag+.5),w/13,h/9,field[lag][ix],`${['Observed','Shuffle mean','Difference'][panel]}, ${lag} lines above, word offset ${ix-6}`);
    for(let ix=0;ix<6;ix++)cell(xp(ix-6.5),stripY,w/13,stripH,field[0][ix],`${['Observed','Shuffle mean','Difference'][panel]}, current line, word offset ${ix-6}`);
   }
   for(const up of [1,3,6,9])svg.append(text(x0-7,yp(up)+4,'−'+up,'end',10));svg.append(text(x0-7,stripY+16,'0','end',10));
   for(const x of [-6,-3,0,3,6])svg.append(text(xp(x),stripY+39,String(x),'middle',10));
   svg.append(svgNode('rect',{x:xp(-.5),y:stripY,width:w/13,height:stripH,fill:color('--chart-missing')}));svg.append(text(xp(0),stripY+17,'★','middle',17));
   const later=svgNode('rect',{x:xp(.5),y:stripY,width:xp(6.5)-xp(.5),height:stripH,fill:color('--surface')});later.append(svgNode('title',{},'Later current-line words are excluded'));svg.append(later);
   for(let x=xp(.5);x<xp(6.5)-10;x+=9)svg.append(svgNode('line',{x1:x,y1:stripY+stripH,x2:x+9,y2:stripY,stroke:color('--border'),'stroke-width':1}));
   for(let i=0;i<100;i++)svg.append(svgNode('rect',{x:x0+i*w/100,y:354,width:w/100+.1,height:9,fill:fill(delta?(-v.bound+2*v.bound*i/99):v.maximum*i/99,delta)}));
   svg.append(text(x0,380,delta?(-v.bound).toFixed(2):'0','start',10));svg.append(text(x0+w/2,380,delta?'0':(v.maximum/2).toFixed(2),'middle',10));svg.append(text(x0+w,380,(delta?v.bound:v.maximum).toFixed(2),'end',10));
  }
  surface.replaceChildren(svg);hover.textContent='Hover over a cell to read its value.';
  note.textContent=`${corpus.label} · ${corpus.draws.toLocaleString()} within-line × exact-length shuffles. ${data.metrics[state.metric].definition} ${state.coordinates==='continuous'?'Horizontal displacement is in page-median word advances; vertical displacement is in line pitches.':'Horizontal displacement is ordinal word offset.'} Scales match the downloadable composites and remain fixed across spacing settings. Gray is unavailable support; these are descriptive maps.`;
 }
 download.addEventListener('click',()=>{const svg=surface.querySelector('svg');const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'});const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=`${state.corpus}-${state.metric}-${state.coordinates}-${state.layout}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 draw();
}
