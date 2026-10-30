// Presentation behavior shared by every article. No article HTML is a template.
const chartPromises=new WeakMap();
export function hydrateCharts(root=document){
 for(const figure of root.querySelectorAll('[data-chart-module]')){
  if(figure.closest('[hidden]')||chartPromises.has(figure))continue;
  const mount=figure.querySelector('.chart-mount');
  const promise=import(figure.dataset.chartModule).then(module=>module.mount(mount,{source:figure.dataset.chartSource,preset:JSON.parse(figure.dataset.chartPreset||'{}')})).catch(error=>{
   mount.replaceChildren();const p=document.createElement('p');p.className='chart-error';p.textContent='The interactive chart could not load. The static figure and data links below remain available.';mount.append(p);console.error(error);
  });chartPromises.set(figure,promise);
 }
}
const gallerySelections=new WeakMap();
for(const gallery of document.querySelectorAll('[data-gallery]')){
 const tabs=[...gallery.querySelectorAll('[role=tab]')],panels=[...gallery.querySelectorAll('[role=tabpanel]')];
 const select=index=>{
  tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});
  gallery.querySelector('[data-gallery-count]').textContent=`${index+1} / ${tabs.length}`;hydrateCharts(panels[index]);
 };
 gallerySelections.set(gallery,{panels,select});
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>select(index));
  tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();tabs[next].focus();select(next);});
 });
}
function revealHash(){
 let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
 const target=document.getElementById(id);if(!target)return;
 const panel=target.closest('[role=tabpanel]');
 if(panel){const gallery=panel.closest('[data-gallery]'),entry=gallerySelections.get(gallery);entry.select(entry.panels.indexOf(panel));}
 // Hidden gallery panels must be shown before the browser can scroll to them.
 requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'instant'}));
}
window.addEventListener('hashchange',revealHash);
for(const link of document.querySelectorAll('[data-copy-link]'))link.addEventListener('click',async event=>{
 if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 if(!navigator.clipboard?.writeText)return;event.preventDefault();
 try{await navigator.clipboard.writeText(link.href);const label=link.textContent;link.textContent='Copied';setTimeout(()=>{link.textContent=label;},1600);}
 catch{location.href=link.href;}
});
const dialog=document.querySelector('.image-viewer');let opener;
for(const link of document.querySelectorAll('[data-image-open]'))link.addEventListener('click',event=>{
 if(!dialog.showModal||event.ctrlKey||event.metaKey||event.shiftKey)return;event.preventDefault();opener=link;
 const img=dialog.querySelector('img');img.src=link.href;img.alt=link.querySelector('img').alt;
 dialog.querySelector('#viewer-title').textContent=link.dataset.title;dialog.querySelector('.viewer-image').classList.remove('actual');
 const size=dialog.querySelector('[data-viewer-size]');size.textContent='Actual size';size.setAttribute('aria-pressed','false');dialog.showModal();
});
dialog.querySelector('[data-viewer-close]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>opener?.focus());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog.querySelector('[data-viewer-size]').addEventListener('click',event=>{
 const actual=dialog.querySelector('.viewer-image').classList.toggle('actual');event.target.textContent=actual?'Fit to screen':'Actual size';event.target.setAttribute('aria-pressed',String(actual));
});
hydrateCharts();
revealHash();
