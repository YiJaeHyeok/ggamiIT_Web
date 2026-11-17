/* 세션·검색·완료 표시는 브라우저 안에서 관리합니다. 기존 실험 DOM을 옮겨 이벤트를 보존합니다. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const sessions = [
    { id:'network', name:'네트워크', sub:'DNS · 패킷 · 방화벽', intro:'주소를 찾고, 조각을 보내고, 경로와 출입구를 정합니다.', ids:['network','transport','firewall','routing','subnet'] },
    { id:'security', name:'보안 · 공격과 방어', sub:'SQL 인젝션 · 드로퍼 · XSS', intro:'공격의 원리와 방어 지점을 모형으로 비교합니다. 실제 공격이나 파일 실행은 없습니다.', ids:['injection','dropper','auth','xss','phishing'] },
    { id:'process', name:'프로세스 · 실행', sub:'실행 순서 · 경쟁 상태', intro:'작업을 어떤 순서로 실행하는지가 결과와 대기 시간에 영향을 줍니다.', ids:['loop','deploy','sort','scheduler','race'] },
    { id:'web', name:'웹 · 브라우저', sub:'HTML · API · HTTPS · CORS', intro:'화면의 구조부터 브라우저가 데이터를 다루는 규칙까지 실험합니다.', ids:['layers','api','tls','storage','cors'] },
    { id:'data', name:'데이터 · 데이터베이스', sub:'비트 · SQL · 트랜잭션', intro:'정보를 표현하고, 찾고, 일관되게 저장하는 원리를 살펴봅니다.', ids:['binary','database','hash','transaction','index'] },
    { id:'cloud', name:'클라우드 · 인프라', sub:'캐시 · 서버 · 컨테이너', intro:'요청이 늘어날 때 여러 서버와 저장 위치를 어떻게 활용할까요?', ids:['cache','balancer','cdn','autoscale','container'] },
    { id:'ai-basics', name:'AI 기초', sub:'토큰 · 문맥 · RAG', intro:'AI에 들어가는 자료와 출력의 선택을 단순한 모형으로 탐색합니다.', ids:['rag','tokens','temperature','context','embeddings'] },
    { id:'ai-tools', name:'AI 도구 · 에이전트', sub:'MCP · 에이전트 · 스킬', intro:'연결하는 규칙, 일하는 주체, 작업 방법과 권한을 구분해봅니다.', ids:['mcp','agent','skills','workflow','permissions'] },
    { id:'ai-safety', name:'AI 안전 · 검증', sub:'인젝션 · 개인정보 · 평가', intro:'AI가 자료를 믿거나 행동하기 전에 어떤 경계와 검증이 필요할까요?', ids:['prompt-injection','hallucination','privacy','approval','evaluation'] },
    { id:'operations', name:'운영 · 장애 대응', sub:'로그 · 지표 · 백업', intro:'문제를 발견하고, 원인을 찾고, 데이터를 복구하는 연습입니다.', ids:['logs','metrics','incident','secrets','backup'] }
  ];
  const titles = {
    network:'DNS · 클릭 한 번의 패킷 여행', transport:'TCP · UDP — 조각 하나가 사라지면?', firewall:'포트 · 방화벽 — 서버의 출입구',
    injection:'SQL 인젝션 — 입력이 명령이 되는 순간', dropper:'드로퍼(Dropper) — 악성코드의 배달원', auth:'인증 · 인가 — 누구이고, 무엇을 할 수 있나요?',
    loop:'이벤트 루프 — 코드가 실행되는 순서', deploy:'CI/CD — 검증을 통과해야 배포', sort:'알고리즘 — 버블 정렬을 한 단계씩',
    layers:'HTML · CSS · JS — 웹의 입체 레이어', api:'API — 서버와 대화하는 약속', tls:'HTTP · HTTPS — 통신을 엿본다면',
    binary:'비트 · 바이트 — 0과 1로 숫자 만들기', database:'데이터베이스 — 필요한 데이터 찾기', hash:'SHA-256 — 한 글자가 바꾸는 지문',
    cache:'캐시 — 같은 요청을 다시 보내면', balancer:'로드밸런서 — 요청을 골고루 나누기', rag:'RAG — 모르면 자료부터 찾기',
    mcp:'MCP — AI에 도구를 연결하면', agent:'에이전트 — 목표에서 도구 사용까지', 'prompt-injection':'프롬프트 인젝션 — 자료가 지시를 한다면'
  };
  window.NOVA_SESSIONS = sessions;
  const definitions = window.NOVA_NEW_LABS || [];
  const stageIds = new Set();
  const build = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
  const newNodes = [];

  function renderModel(definition) {
    if (stageIds.has(definition.id)) throw new Error('Duplicate lab: ' + definition.id);
    stageIds.add(definition.id);
    const lab = build('article', 'lab lab-wide model-lab'); lab.id = definition.id; lab.dataset.modelId = definition.id; lab.dataset.topic = definition.session;
    const intro = build('div', 'lab-intro'); intro.append(build('h3', '', definition.title), build('p', '', definition.intro), build('p', 'model-goal', definition.goal));
    if (definition.source) {
      const source = build('p', 'lab-source'); const a = build('a', '', definition.source.label); a.href = definition.source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; source.append(a); intro.append(source);
    }
    const stage = build('div', 'experiment plus-stage model-stage');
    const controls = build('div', 'model-controls'); const inputs = new Map();
    for (const control of definition.controls) {
      const id = definition.id + '-' + control.key, field = build('div', 'model-field');
      const label = build('label', control.type === 'checkbox' ? 'check-label' : '', control.label); label.htmlFor = id;
      let input;
      if (control.type === 'select') {
        input = build('select'); for (const opt of control.options) { const o = build('option', '', opt.label); o.value = opt.value; input.append(o); }
      } else {
        input = build('input'); input.type = control.type;
        if (control.type === 'range') { input.min = control.min; input.max = control.max; input.step = control.step ?? 1; }
        if (control.type === 'text') { input.maxLength = 300; input.autocomplete = 'off'; input.spellcheck = false; }
      }
      input.id = id; input.dataset.control = control.key;
      if (control.type === 'checkbox') { input.checked = Boolean(control.value); label.prepend(input); field.append(label); }
      else { input.value = control.value; field.append(label, input); }
      let rangeOutput;
      if (control.type === 'range') { rangeOutput = build('output', 'model-range-value'); rangeOutput.htmlFor = id; rangeOutput.textContent = input.value; field.append(rangeOutput); }
      input.addEventListener('input', () => { if (rangeOutput) rangeOutput.textContent = input.value; evaluate(); });
      input.addEventListener('change', evaluate); controls.append(field); inputs.set(control.key, {input, control, rangeOutput});
    }
    const actions = build('div', 'lab-actions'); const run = build('button', 'lab-button', '결과 비교하기 →'); run.type = 'button'; run.dataset.modelRun = '';
    const reset = build('button', 'lab-quiet', '초기값으로'); reset.type = 'button'; reset.dataset.modelReset = ''; actions.append(run, reset);
    const headline = build('h4', 'model-headline'); headline.dataset.modelHeadline = '';
    const visual = build('div', 'model-visual'); visual.setAttribute('aria-label', '설정에 따른 가상 결과');
    const facts = build('dl', 'model-facts'); const explanation = build('p', 'experiment-status'); explanation.setAttribute('role', 'status');
    const code = build('pre', 'code-window'); const note = build('small', 'demo-note', definition.note || '브라우저 안에서만 동작하는 교육용 모형입니다.');
    stage.append(controls, actions, headline, visual, facts, code, explanation, note); lab.append(intro, stage);
    function evaluate() {
      const values = Object.fromEntries([...inputs].map(([key, {input}]) => [key, input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value]));
      try {
        const result = definition.evaluate(values);
        headline.textContent = result.headline; explanation.textContent = result.explanation;
        facts.replaceChildren(); for (const item of result.facts || []) facts.append(build('dt', '', item.label), build('dd', '', String(item.value)));
        visual.className = 'model-visual model-visual--' + (result.visual?.kind || 'list');
        visual.replaceChildren(...(result.visual?.items || []).map(item => {
          const row = build('div', 'model-visual-item'); row.dataset.state = item.state || 'muted';
          const text = build('span', '', item.label); row.append(text);
          if (result.visual?.kind === 'bars') {
            const track = build('div', 'model-bar'); const fill = build('i');
            const value = Number.isFinite(Number(item.value)) ? Math.max(0, Math.min(100, Number(item.value))) : 0;
            fill.style.transform = 'scaleX(' + value / 100 + ')'; track.append(fill); row.append(track);
          }
          return row;
        }));
        code.hidden = !result.code; code.textContent = result.code || '';
      } catch (error) {
        headline.textContent = '이 설정의 결과를 표시하지 못했습니다.';
        explanation.textContent = '초기값으로 되돌려 다시 비교해주세요.';
        console.error('Learning model failed:', definition.id, error);
      }
    }
    run.addEventListener('click', evaluate);
    reset.addEventListener('click', () => {
      for (const {input, control, rangeOutput} of inputs.values()) {
        if (input.type === 'checkbox') input.checked = Boolean(control.value); else input.value = control.value;
        if (rangeOutput) rangeOutput.textContent = input.value;
      }
      evaluate();
    });
    evaluate(); return lab;
  }
  for (const definition of definitions) newNodes.push(renderModel(definition));
  const section = $('#labs');section.removeAttribute('aria-labelledby');section.setAttribute('aria-label','학습 세션과 실험');
  const incumbent = [...section.querySelectorAll('.lab')];
  const labs = [...incumbent, ...newNodes];
  const byId = new Map(labs.map(lab => [lab.id, lab]));
  if (labs.length !== 50 || sessions.some(session => session.ids.some(id => !byId.has('lab-' + id)))) {
    console.error('Learning catalog incomplete:', labs.length);
    return;
  }
  const shortTitles={network:'DNS',transport:'TCP / UDP',firewall:'Firewall',routing:'Routing',subnet:'Subnet',injection:'SQL Injection',dropper:'Dropper',auth:'인증·인가',xss:'XSS',phishing:'피싱',loop:'Event Loop',deploy:'CI/CD',sort:'Bubble Sort',scheduler:'Scheduler',race:'Race Condition',layers:'HTML · CSS · JS',api:'API',tls:'HTTPS',storage:'Storage',cors:'CORS',binary:'Binary',database:'Database',hash:'SHA-256',transaction:'Transaction',index:'Index',cache:'Cache',balancer:'Load Balancer',cdn:'CDN',autoscale:'Auto Scaling',container:'Container',rag:'RAG',tokens:'Tokens',temperature:'Temperature',context:'Context',embeddings:'Embeddings',mcp:'MCP',agent:'Agent',skills:'Skills',workflow:'Workflow',permissions:'Permissions','prompt-injection':'Prompt Injection',hallucination:'Hallucination',privacy:'Privacy',approval:'Approval',evaluation:'Evaluation',logs:'Logs',metrics:'Metrics',incident:'Incident',secrets:'Secrets',backup:'Backup'};
  const oldGrid=section.querySelector('.labs-grid');
  const layout=build('div','session-layout'),panelsContainer=build('div','session-panels');panelsContainer.id='learning-content';
  const originalSession=new Map(),panelMap=new Map(),tabsMap=new Map(),navMap=new Map(),searchIndex=new Map(),remembered=new Map(),expanded=new Set();
  let selected='security',completed=new Set(),libraryMode='sessions',lastTrigger=null;
  try{const saved=JSON.parse(localStorage.getItem('nova-labs-completed-v2')||'[]');if(Array.isArray(saved))completed=new Set(saved.filter(id=>byId.has(id)));}catch{}
  const drawer=build('section','library-drawer');drawer.id='library-drawer';drawer.hidden=true;drawer.setAttribute('aria-label','전체 세션과 실험 검색');
  const drawerInner=build('div','library-inner'),drawerTop=build('div','library-top');drawerTop.append(build('h2','','학습 라이브러리'));
  const close=build('button','library-close','닫기');close.type='button';drawerTop.append(close);
  const searchWrap=build('div','session-search-wrap'),searchLabel=build('label','','50개 실험에서 찾아보세요');searchLabel.htmlFor='session-search';
  const searchRow=build('div','session-search-row'),search=build('input');search.id='session-search';search.type='search';search.maxLength=100;search.autocomplete='off';search.placeholder='SQL, 드로퍼, MCP, 네트워크…';
  const clear=build('button','','검색 지우기');clear.id='session-clear';clear.type='button';searchRow.append(search,clear);searchWrap.append(searchLabel,searchRow);
  const status=build('p','session-result');status.id='session-result';status.setAttribute('role','status');
  const nav=build('div','session-nav');nav.setAttribute('role','group');nav.setAttribute('aria-label','학습 세션 선택');
  const results=build('div','library-results'),empty=build('p','session-empty','일치하는 실험이 없습니다. 다른 단어로 검색해보세요.');empty.id='session-empty';empty.hidden=true;empty.setAttribute('role','status');
  const progress=build('p','library-progress');progress.id='session-total-progress';
  drawerInner.append(drawerTop,searchWrap,status,nav,results,empty,progress);drawer.append(drawerInner);document.querySelector('.header').after(drawer);
  function icon(name){return window.NOVAIcons.create(name);}
  function createArt(session,shortId){
    const art=build('div','lesson-art');art.setAttribute('aria-hidden','true');
    const settings={network:['browser-line','database-line','내 기기','네트워크'],security:['keyboard','shield-line','입력값','보안'],process:['document-line','chip-line','작업','실행'],web:['browser-line','database-line','브라우저','서버'],data:['document-line','database-line','데이터','저장소'],cloud:['browser-line','database-line','요청','클라우드'],'ai-basics':['document-line','chip-line','문맥','AI'],'ai-tools':['chip-line','document-line','AI','도구'],'ai-safety':['document-line','shield-line','자료','검증'],operations:['browser-line','database-line','관찰','시스템']};
    const config=shortId==='injection'?['keyboard','database-line','입력값','데이터']:settings[session.id];
    for(let i=0;i<2;i++){const node=build('div','lesson-art-node');node.append(build('span','',config[i+2]),icon(config[i]),build('small','',shortId==='injection'&&i===0?'키보드':''));art.append(node);if(i===0)art.append(build('span','lesson-art-line'));}
    return art;
  }
  sessions.forEach((session,position)=>{
    remembered.set(session.id,'lab-'+session.ids[0]);
    const navButton=build('button','session-button');navButton.type='button';navButton.dataset.session=session.id;
    const navCopy=build('span','session-button-copy');navCopy.append(build('strong','',session.name),build('small','',session.sub));navButton.append(build('span','session-number',String(position+1).padStart(2,'0')),navCopy,build('span','session-progress'));
    navButton.addEventListener('click',()=>{selectSession(session.id,{scroll:true});closeLibrary();});nav.append(navButton);navMap.set(session.id,navButton);
    const panel=build('section','session-panel');panel.id='session-'+session.id;panel.dataset.sessionPanel=session.id;panel.setAttribute('aria-label',session.name+'의 다섯 체험');
    const tabs=build('div','lesson-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',session.name+' 체험 선택');
    const grid=build('div','labs-grid');panel.append(tabs,grid);panelMap.set(session.id,panel);
    session.ids.forEach((shortId,index)=>{
      const lab=byId.get('lab-'+shortId),intro=lab.querySelector('.lab-intro'),experiment=lab.querySelector('.experiment');originalSession.set(lab.id,session.id);lab.dataset.sessionOwner=session.id;
      const heading=intro.querySelector('h3');const fullTitle=titles[shortId]||heading.textContent;lab.dataset.fullTitle=fullTitle;
      searchIndex.set(lab.id,(fullTitle+' '+intro.textContent+' '+shortId+' '+session.name+' '+session.sub).toLocaleLowerCase());
      const newHeading=build('h2','lab-title',shortTitles[shortId]+'.');if(shortTitles[shortId].length>13)newHeading.classList.add('is-long');if(shortId==='injection')newHeading.replaceChildren(build('span','','SQL'),build('br'),build('span','','Injection.'));newHeading.id='lesson-title-'+shortId;heading.replaceWith(newHeading);lab.setAttribute('role','tabpanel');
      const tab=build('button','lesson-tab',shortTitles[shortId]);tab.type='button';tab.id='tab-'+shortId;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',lab.id);lab.setAttribute('aria-labelledby',tab.id);tab.dataset.labTab=lab.id;
      tab.addEventListener('click',()=>selectLab(lab.id,{open:false}));tab.addEventListener('keydown',event=>{const keys={ArrowRight:(index+1)%5,ArrowLeft:(index+4)%5,Home:0,End:4};if(event.key in keys){event.preventDefault();const next=session.ids[keys[event.key]];selectLab('lab-'+next,{open:false});document.getElementById('tab-'+next).focus();}});tabs.append(tab);tabsMap.set(lab.id,tab);
      const workshop=build('div','lesson-workshop');workshop.id='workshop-'+shortId;workshop.hidden=true;workshop.append(experiment);
      const fullExplanation=intro.querySelector('p');if(fullExplanation){const overviewCopy=build('p','lesson-brief');overviewCopy.textContent=shortId==='injection'?'입력값이 명령이 되는 순간.\n그 경계를 직접 확인해보세요.':fullExplanation.textContent.split(/(?<=\.)\s/)[0];fullExplanation.replaceWith(overviewCopy);fullExplanation.classList.add('lesson-full-explanation');workshop.prepend(fullExplanation);}
      for(const extra of intro.querySelectorAll('.lab-source,.model-goal,.term'))workshop.append(extra);
      const start=build('button','lesson-start');start.type='button';start.setAttribute('aria-controls',workshop.id);start.setAttribute('aria-expanded','false');start.append(build('span','','직접 실험하기'),build('span','lesson-start-arrow','↗'));
      const helper=build('p','lesson-start-hint','누르면 이 자리에서 실험이 펼쳐집니다.');intro.append(start,helper);
      const overview=build('div','lesson-overview');overview.append(intro,createArt(session,shortId));lab.replaceChildren(overview,workshop);
      const complete=build('label','lab-complete'),checkbox=build('input');checkbox.type='checkbox';checkbox.checked=completed.has(lab.id);checkbox.setAttribute('aria-label',fullTitle+' 이해 완료');complete.append(checkbox,build('span','','이 실험 이해했어요'));complete.hidden=true;lab.append(complete);
      checkbox.addEventListener('change',()=>{if(checkbox.checked)completed.add(lab.id);else completed.delete(lab.id);try{localStorage.setItem('nova-labs-completed-v2',JSON.stringify([...completed]));}catch{}updateProgress();});
      start.addEventListener('click',()=>{setExpanded(lab.id,!expanded.has(lab.id));render();});grid.append(lab);
    });
    const next=build('button','next-topic');next.type='button';next.addEventListener('click',()=>{const current=session.ids.indexOf(remembered.get(session.id).slice(4));selectLab('lab-'+session.ids[(current+1)%5],{open:false});});panel.append(next);panelsContainer.append(panel);
  });
  const all=build('button','session-all','전체 50개 실험');all.type='button';all.dataset.session='all';all.addEventListener('click',()=>{libraryMode='all';search.value='';renderLibrary();setHash('session-all');});nav.append(all);
  layout.append(panelsContainer);oldGrid.replaceWith(layout);$('.lab-filters')?.remove();$('.new-labs')?.remove();$('#filter-result')?.remove();section.querySelector('.learning-heading')?.remove();
  function setHash(value){if(location.hash!=='#'+value)history.pushState(null,'','#'+value);}
  function setExpanded(id,on){if(on)expanded.add(id);else expanded.delete(id);const lab=byId.get(id),button=lab.querySelector('.lesson-start');button.setAttribute('aria-expanded',String(on));button.querySelector('span').textContent=on?'실험 접기':'직접 실험하기';button.querySelector('.lesson-start-arrow').textContent=on?'↑':'↗';lab.querySelector('.lesson-workshop').hidden=!on;lab.querySelector('.lab-complete').hidden=!on;lab.classList.toggle('is-expanded',on);}
  function updateProgress(){for(const session of sessions)navMap.get(session.id).querySelector('.session-progress').textContent=session.ids.filter(id=>completed.has('lab-'+id)).length+'/5';progress.textContent=completed.size+' / 50 이해 완료 · 이 브라우저에만 저장됩니다.';document.dispatchEvent(new CustomEvent('nova:progress'));}
  function renderLibrary(){const query=search.value.trim().toLocaleLowerCase();const matches=[...byId.values()].filter(lab=>searchIndex.get(lab.id).includes(query));const showResults=Boolean(query)||libraryMode==='all';nav.hidden=Boolean(query);results.hidden=!showResults;results.replaceChildren(...(showResults?matches:[]).map(lab=>{const a=build('a');a.href='#'+lab.id;a.append(build('small','',sessions.find(s=>s.id===originalSession.get(lab.id)).name),build('strong','',lab.dataset.fullTitle));return a;}));empty.hidden=!showResults||matches.length>0;status.textContent=query?'“'+search.value.trim()+'” · '+matches.length+'개 실험':libraryMode==='all'?'전체 50개 실험':'10개 세션 · 세션마다 5개 체험';clear.hidden=!query;}
  function render(){const active=remembered.get(selected);for(const session of sessions){panelMap.get(session.id).hidden=session.id!==selected;navMap.get(session.id).setAttribute('aria-pressed',String(session.id===selected));for(const id of session.ids){const labId='lab-'+id,lab=byId.get(labId),tab=tabsMap.get(labId),on=labId===active;lab.hidden=!on;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;}const i=session.ids.indexOf(remembered.get(session.id).slice(4));panelMap.get(session.id).querySelector('.next-topic').textContent='다음 주제  '+shortTitles[session.ids[(i+1)%5]]+' →';}const tab=tabsMap.get(active),strip=tab.parentElement;if(strip.scrollWidth>strip.clientWidth)strip.scrollLeft=Math.max(0,tab.offsetLeft-strip.offsetLeft-(strip.clientWidth-tab.offsetWidth)/2);renderLibrary();document.dispatchEvent(new CustomEvent('nova:sessionchange',{detail:{id:selected,lab:active,query:''}}));}
  function focusLesson(id){requestAnimationFrame(()=>{const lab=byId.get(id);lab.tabIndex=-1;lab.focus({preventScroll:true});panelsContainer.scrollIntoView({block:'start',behavior:'instant'});});}
  function selectSession(id,options={}){if(id==='all'){showLibrary('all');if(options.updateUrl!==false)setHash('session-all');return;}if(!panelMap.has(id))return;selected=id;render();if(options.updateUrl!==false)setHash('session-'+id);if(options.scroll)focusLesson(remembered.get(id));}
  function selectLab(id,options={}){const owner=originalSession.get(id);if(!owner)return;selected=owner;remembered.set(owner,id);if(options.open)setExpanded(id,true);render();if(options.updateUrl!==false)setHash(id);if(options.scroll)focusLesson(id);}
  function showLibrary(mode='sessions',trigger=null){libraryMode=mode;lastTrigger=trigger||lastTrigger;drawer.hidden=false;document.querySelectorAll('[data-open-library]').forEach(button=>button.setAttribute('aria-expanded','true'));search.value='';renderLibrary();requestAnimationFrame(()=>{if(mode==='search')search.focus();else close.focus();});}
  function closeLibrary(restore=false){drawer.hidden=true;document.querySelectorAll('[data-open-library]').forEach(button=>button.setAttribute('aria-expanded','false'));if(restore)(lastTrigger?.getClientRects().length?lastTrigger:document.querySelector('[data-open-library="search"]'))?.focus();}
  document.querySelectorAll('[data-open-library]').forEach(button=>button.addEventListener('click',()=>{if(!drawer.hidden){closeLibrary(true);return;}showLibrary(button.dataset.openLibrary,button);}));close.addEventListener('click',()=>closeLibrary(true));
  search.addEventListener('input',renderLibrary);clear.addEventListener('click',()=>{search.value='';renderLibrary();search.focus();});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!drawer.hidden){event.preventDefault();closeLibrary(true);}});
  document.addEventListener('click',event=>{const a=event.target.closest('a[href^="#lab-"]');if(a&&byId.has(a.hash.slice(1))){event.preventDefault();closeLibrary();selectLab(a.hash.slice(1),{open:true,scroll:true});}});
  function route(){const id=location.hash.slice(1);if(id==='session-all'){selectSession('all',{updateUrl:false});return;}const wasOpen=!drawer.hidden;if(byId.has(id)){closeLibrary();selectLab(id,{open:true,scroll:true,updateUrl:false});}else if(id.startsWith('session-')&&panelMap.has(id.slice(8))){closeLibrary();selectSession(id.slice(8),{updateUrl:false,scroll:wasOpen});}else if(id==='labs'||id==='home')closeLibrary();}
  addEventListener('hashchange',route);addEventListener('popstate',route);
  window.NOVALearning={selectSession,selectLab,showLibrary,closeLibrary,getState:()=>({session:selected,lab:remembered.get(selected),completed:[...completed]})};
  updateProgress();render();route();section.classList.add('sessions-ready');document.dispatchEvent(new CustomEvent('nova:sessions-ready'));
})();
