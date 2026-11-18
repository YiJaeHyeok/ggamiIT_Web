/* A separate design playground; the existing learning catalog keeps its DOM and state. */
(() => {
  'use strict';
  const root=document.createElement('section');root.id='ideas';root.hidden=true;
  root.innerHTML=`
    <div class="ideas-heading"><div><h1>다른 아이디어.</h1><p>보고, 움직이고, 직접 바꿔보는 디자인 실험.</p></div>
      <div class="ideas-tabs" role="tablist" aria-label="디자인 아이디어 선택">
        <button role="tab" id="idea-tab-pixels" aria-controls="idea-pixels" data-idea="pixels">픽셀 입자</button>
        <button role="tab" id="idea-tab-starcraft" aria-controls="idea-starcraft" data-idea="starcraft">StarCraft II</button>
        <button role="tab" id="idea-tab-rog" aria-controls="idea-rog" data-idea="rog">Zephyrus G15</button>
        <button role="tab" id="idea-tab-earth" aria-controls="idea-earth" data-idea="earth">3D 지구본</button>
      </div>
    </div>
    <section id="idea-pixels" class="idea-pane" role="tabpanel" aria-labelledby="idea-tab-pixels" hidden></section>
    <section id="idea-starcraft" class="idea-pane" role="tabpanel" aria-labelledby="idea-tab-starcraft" hidden>
      <div class="sc2-stage" data-race="terran">
        <img class="sc2-scene" id="sc2-scene" src="assets/ideas/sc2-terran.webp" alt="테란 짐 레이너의 전투복과 전장" decoding="async" loading="lazy">
        <div class="sc2-shade"></div>
        <div class="sc2-wordmark">STARCRAFT <span>II</span></div>
        <div class="sc2-copy"><h2>CHOOSE<br>YOUR SIDE.</h2><p>같은 우주, 전혀 다른 방식.<br>당신의 종족을 선택하세요.</p></div>
        <div class="sc2-races" role="group" aria-label="스타크래프트 종족 선택">
          <button type="button" data-race="terran" aria-pressed="true"><span>01 / TERRAN</span><strong>테란</strong></button>
          <button type="button" data-race="zerg" aria-pressed="false"><span>02 / ZERG</span><strong>저그</strong></button>
          <button type="button" data-race="protoss" aria-pressed="false"><span>03 / PROTOSS</span><strong>프로토스</strong></button>
        </div>
        <div class="sc2-detail" aria-live="polite"><h3 data-race-title>적응하고, 돌파하다.</h3><p data-race-copy>기술과 기계화 병력, 유연한 전술로 전장에 대응하는 인류.</p></div>
      </div>
      <div class="idea-footnote"><span>StarCraft II 팬 디자인 실험 · 이미지 © Blizzard Entertainment</span><span><a href="https://starcraft2.blizzard.com/" target="_blank" rel="noopener noreferrer">게임 공식 사이트</a><a href="https://www.awwwards.com/sites/psp-production" target="_blank" rel="noopener noreferrer">디자인 참고: PSP Production</a></span></div>
    </section>
    <section id="idea-rog" class="idea-pane" role="tabpanel" aria-labelledby="idea-tab-rog" hidden>
      <div class="rog-stage" data-finish="gray">
        <div class="rog-top"><span>REPUBLIC OF GAMERS</span><span>제품을 다른 시선으로.</span></div>
        <h2 class="rog-title">Zephyrus <em>G15.</em></h2>
        <p class="rog-intro">일상과 플레이, 그 사이의 균형.</p>
        <div class="rog-product" tabindex="0" role="group" aria-label="Zephyrus G15 제품 이미지. 아래 버튼으로 색상과 앞뒤 모습을 바꿀 수 있습니다.">
          <span class="rog-backdrop" aria-hidden="true">BEYOND<br>THE ORDINARY.</span>
          <img id="rog-image" src="assets/ideas/zephyrus-angle.png" alt="Eclipse Gray 색상의 ROG Zephyrus G15 앞모습" loading="lazy" decoding="async">
        </div>
        <div class="rog-controls">
          <div class="rog-finishes" role="group" aria-label="노트북 색상"><button type="button" data-finish="gray" aria-pressed="true"><i class="finish-gray" aria-hidden="true"></i>Eclipse Gray</button><button type="button" data-finish="white" aria-pressed="false"><i class="finish-white" aria-hidden="true"></i>Moonlight White</button></div>
          <div class="rog-views" role="group" aria-label="제품 시점"><button type="button" data-view="front" aria-pressed="true">앞모습</button><button type="button" data-view="back" aria-pressed="false">뒷모습</button></div>
        </div>
        <div class="rog-details"><p data-rog-description aria-live="polite">빛의 각도에 따라 달라지는 컬러와 절제된 실루엣. 색상과 앞뒤 모습을 바꿔보세요.</p><span>ROG Zephyrus G15 · GA503 · 2022 디자인 기준</span></div>
      </div>
      <div class="idea-footnote"><span>개인 학습용 제품 디자인 실험 · 이미지 © ASUSTeK Computer Inc.</span><span><a href="https://rog.asus.com/us/laptops/rog-zephyrus/rog-zephyrus-g15-2022-series/gallery/" target="_blank" rel="noopener noreferrer">제품 이미지 출처</a><a href="https://www.awwwards.com/sites/spyker-cars" target="_blank" rel="noopener noreferrer">디자인 참고: Spyker Cars</a></span></div>
    </section>
    <section id="idea-earth" class="idea-pane" role="tabpanel" aria-labelledby="idea-tab-earth" hidden>
      <div class="earth-stage">
        <div class="earth-copy"><h2>한 바퀴,<br> 다른 세계.</h2><p class="earth-intro">드래그로 지구를 돌리고,<br>궁금한 나라에 잠시 멈춰보세요.</p>
          <label class="earth-search-label" for="earth-country">나라 찾아가기</label>
          <select id="earth-country" disabled><option>지도를 불러오는 중…</option></select>
          <div class="earth-country-info" aria-live="polite"><h3 id="earth-country-name">대한민국</h3><p id="earth-country-region">Eastern Asia</p><dl><dt>위도</dt><dd id="earth-lat">—</dd><dt>경도</dt><dd id="earth-lon">—</dd></dl></div>
          <p class="earth-status" id="earth-status" role="status">지도 데이터를 불러오고 있습니다.</p><button class="earth-retry" id="earth-retry" type="button" hidden>지도 다시 불러오기</button>
        </div>
        <div class="earth-view"><canvas id="earth-canvas" tabindex="0" role="img" aria-label="360도 회전하는 지구본. 드래그하거나 방향키로 회전하고, 나라를 눌러 선택하세요." aria-describedby="earth-hint"></canvas><p id="earth-hint">드래그 또는 방향키로 회전 · 나라를 눌러 선택</p>
          <div class="earth-controls"><button type="button" data-earth-turn="-30" aria-label="지구본을 왼쪽으로 회전">←</button><button type="button" data-earth-turn="30" aria-label="지구본을 오른쪽으로 회전">→</button><button type="button" id="earth-zoom-out" aria-label="지구본 축소">−</button><button type="button" id="earth-zoom-in" aria-label="지구본 확대">+</button><button type="button" id="earth-motion" aria-pressed="false">자동 회전 켜기</button><button type="button" id="earth-reset">처음 시점</button></div>
        </div>
      </div>
      <div class="idea-footnote"><span>지도: Natural Earth 1:110m · 국경과 위치는 탐색을 위한 참고용입니다.</span><span><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">지도 데이터 출처</a><a href="https://www.awwwards.com/sites/fromearth-2050" target="_blank" rel="noopener noreferrer">디자인 참고: fromearth / 2050</a></span></div>
    </section>`;
  document.querySelector('main').prepend(root);
  const tabs=[...root.querySelectorAll('[data-idea]')],panes=[...root.querySelectorAll('.idea-pane')];
  const originals=['#labs','#glossary','#contact'].map(s=>document.querySelector(s));
  let active='pixels';
  function route(){
    const wasHidden=root.hidden,previous=active;
    const hash=location.hash.slice(1),isIdea=hash==='ideas'||hash.startsWith('ideas-');
    root.hidden=!isIdea;originals.forEach(node=>{if(node)node.hidden=isIdea;});
    if(isIdea){const choice=hash.slice(6);active=tabs.some(tab=>tab.dataset.idea===choice)?choice:'pixels';window.NOVALearning?.closeLibrary();}
    tabs.forEach(tab=>{const on=tab.dataset.idea===active;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;});
    panes.forEach(pane=>{pane.hidden=pane.id!=='idea-'+active;});
    const link=document.querySelector('.ideas-nav-link');if(isIdea)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    const learningLink=document.querySelector('.site-header nav a[href="#labs"]');if(isIdea)learningLink.removeAttribute('aria-current');else learningLink.setAttribute('aria-current','page');
    if(isIdea&&(wasHidden||previous!==active))window.scrollTo({top:0,behavior:'instant'});
    document.dispatchEvent(new CustomEvent('ggami:ideachange',{detail:{active:isIdea?active:null}}));
  }
  tabs.forEach((tab,i)=>{
    tab.type='button';tab.addEventListener('click',()=>{location.hash='ideas-'+tab.dataset.idea;});
    tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(i+1)%tabs.length;else if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();tabs[next].focus();tabs[next].click();});
  });
  addEventListener('hashchange',route);addEventListener('popstate',route);document.addEventListener('nova:routechange',route);route();
  const races={terran:{title:'적응하고, 돌파하다.',copy:'기술과 기계화 병력, 유연한 전술로 전장에 대응하는 인류.',alt:'테란 짐 레이너의 전투복과 전장'},zerg:{title:'끝없이 진화하는 군단.',copy:'생체 병력과 군단의 힘으로 전장을 뒤덮는 저그.',alt:'저그 케리건과 군단의 전장'},protoss:{title:'오랜 유산, 새로운 전장.',copy:'첨단 기술과 사이오닉 힘을 사용하는 고대 종족, 프로토스.',alt:'프로토스와 황금빛 전장'}};
  root.querySelectorAll('.sc2-races button').forEach(button=>button.addEventListener('click',()=>{
    const name=button.dataset.race,data=races[name],image=root.querySelector('#sc2-scene');
    root.querySelector('.sc2-stage').dataset.race=name;image.src='assets/ideas/sc2-'+name+'.webp';image.alt=data.alt;
    root.querySelector('[data-race-title]').textContent=data.title;root.querySelector('[data-race-copy]').textContent=data.copy;
    root.querySelectorAll('.sc2-races button').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
  }));
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
