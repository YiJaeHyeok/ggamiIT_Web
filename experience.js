/* Independent game and product experiments. */
(()=>{'use strict';const root=document.querySelector('#ideas');if(!root)return;
  const races={terran:{title:'적응하고, 돌파하다.',copy:'기술과 기계화 병력, 유연한 전술로 전장에 대응하는 인류.',alt:'테란 짐 레이너의 전투복과 전장'},zerg:{title:'끝없이 진화하는 군단.',copy:'생체 병력과 군단의 힘으로 전장을 뒤덮는 저그.',alt:'저그 케리건과 군단의 전장'},protoss:{title:'오랜 유산, 새로운 전장.',copy:'첨단 기술과 사이오닉 힘을 사용하는 고대 종족, 프로토스.',alt:'프로토스와 황금빛 전장'}};
  root.querySelectorAll('.sc2-races button').forEach(button=>button.addEventListener('click',()=>{
    const name=button.dataset.race,data=races[name],image=root.querySelector('#sc2-scene');
    root.querySelector('.sc2-stage').dataset.race=name;image.src='assets/ideas/sc2-'+name+'.webp';image.alt=data.alt;
    root.querySelector('[data-race-title]').textContent=data.title;root.querySelector('[data-race-copy]').textContent=data.copy;
    root.querySelectorAll('.sc2-races button').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
  }));
  if(!root.querySelector('.rog-stage'))return;
  let finish='gray',view='front';
  function renderProduct(){
    const image=root.querySelector('#rog-image'),white=finish==='white';
    image.src='assets/ideas/zephyrus-'+(white?'white'+(view==='back'?'-back':''):view==='back'?'back':'angle')+'.png';
    image.alt=(white?'Moonlight White':'Eclipse Gray')+' 색상의 ROG Zephyrus G15 '+(view==='back'?'뒷모습':'앞모습');
    root.querySelector('.rog-stage').dataset.finish=finish;
    root.querySelectorAll('[data-finish]').forEach(b=>{if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(b.dataset.finish===finish));});
    root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    root.querySelector('[data-rog-description]').textContent=(white?'Moonlight White의 밝고 담백한 표면.':'Eclipse Gray의 차분하고 깊은 표면.')+' '+(view==='back'?'덮개와 힌지의 디테일을 살펴보세요.':'화면과 키보드가 이루는 실루엣을 살펴보세요.');
  }
  root.querySelectorAll('.rog-finishes button').forEach(b=>b.addEventListener('click',()=>{finish=b.dataset.finish;renderProduct();}));
  root.querySelectorAll('.rog-views button').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;renderProduct();}));
  const product=root.querySelector('.rog-product'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
  product.addEventListener('pointermove',event=>{if(reduce.matches||event.pointerType!=='mouse')return;const box=product.getBoundingClientRect();product.style.setProperty('--product-yaw',((event.clientX-box.left)/box.width-.5)*9+'deg');product.style.setProperty('--product-pitch',(.5-(event.clientY-box.top)/box.height)*5+'deg');});
  product.addEventListener('pointerleave',()=>{product.style.setProperty('--product-yaw','0deg');product.style.setProperty('--product-pitch','0deg');});
})();
