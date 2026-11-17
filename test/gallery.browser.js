async () => {
  const $=s=>document.querySelector(s),reports=[];
  const assert=(v,s)=>{if(!v)throw Error(s);reports.push(s);};
  const tick=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  assert(document.querySelectorAll('.session-slide').length===10,'ten sessions in coverflow');
  assert(document.querySelectorAll('.session-slide:not([hidden])').length===7,'seven spatial slots visible');
  $('.session-gallery').scrollIntoView({behavior:'instant'});await tick();
  for(const card of document.querySelectorAll('.session-slide:not([hidden])')){const r=card.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;if(x>45&&x<innerWidth-45&&y>65&&y<innerHeight){assert(document.elementFromPoint(x,y)?.closest('.session-slide')===card,'visible 3D card receives pointer hits: '+card.dataset.gallerySession);}}
  assert(document.querySelectorAll('.lab').length===50,'all fifty live exercises preserved');
  for(const session of window.NOVA_SESSIONS){
    window.NOVALearning.selectSession(session.id);await tick();
    assert($('.session-slide[aria-current="true"]').dataset.gallerySession===session.id,session.id+' selects matching card');
    const tabs=[...document.querySelectorAll('.session-panel:not([hidden]) [role="tab"]')];
    assert(tabs.length===5,session.id+' has five tabs');
    for(const tab of tabs){tab.click();await tick();const lab=document.getElementById(tab.getAttribute('aria-controls'));
      assert(!lab.hidden&&lab.getAttribute('role')==='tabpanel',lab.id+' active panel');
      const start=lab.querySelector('.lesson-start');if(start.getAttribute('aria-expanded')==='false')start.click();
      assert(!lab.querySelector('.lesson-workshop').hidden,lab.id+' opens live experiment inline');
    }
  }
  window.NOVALearning.selectLab('lab-injection',{open:true});await tick();
  $('#sql-input').value='마우스';$('#sql-input').dispatchEvent(new Event('input',{bubbles:true}));
  window.NOVALearning.selectSession('cloud');window.NOVALearning.selectSession('security');await tick();
  assert($('#sql-input').value==='마우스','exercise input survives session changes');
  assert($('.session-panel:not([hidden]) [role="tab"][aria-selected="true"]').getAttribute('aria-controls')==='lab-injection','last selected tab remembered');
  const active=$('.session-panel:not([hidden]) [role="tab"][aria-selected="true"]');active.focus();active.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await tick();
  assert(document.activeElement.getAttribute('role')==='tab'&&document.activeElement.getAttribute('aria-selected')==='true','arrow keys activate and focus next topic');
  $('[data-open-library="search"]').click();assert(!$('#library-drawer').hidden,'header search opens library');
  $('#session-search').value='SQL';$('#session-search').dispatchEvent(new Event('input',{bubbles:true}));await tick();
  assert([...document.querySelectorAll('.library-results a')].some(a=>a.hash==='#lab-injection'),'global search finds SQL injection');
  $('#session-search').value='xyz-no-match';$('#session-search').dispatchEvent(new Event('input',{bubbles:true}));assert(!$('#session-empty').hidden,'empty search explained');
  $('#session-clear').click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert($('#library-drawer').hidden,'Escape closes library');
  location.hash='lab-dropper';await tick();assert(!$('#lab-dropper').hidden&&!$('#lab-dropper .lesson-workshop').hidden,'old lab deep link opens its tab and workshop');
  assert(document.querySelector('#contact-form textarea')&&document.querySelector('#contact-email'),'inquiry form retained');
  assert(document.querySelectorAll('.cube-scene').length===0,'old cube replaced');
  for(const lab of document.querySelectorAll('[data-model-id]')){window.NOVALearning.selectLab(lab.id,{open:true,updateUrl:false});const snapshot=()=>lab.querySelector('.model-headline').textContent+lab.querySelector('.model-facts').textContent+lab.querySelector('.model-visual').textContent;const before=snapshot();let changed=false;for(const input of lab.querySelectorAll('[data-control]')){if(input.type==='checkbox')input.checked=!input.checked;else if(input.tagName==='SELECT')input.selectedIndex=(input.selectedIndex+1)%input.options.length;else if(input.type==='range')input.value=input.value===input.max?input.min:input.max;else input.value='학습용 입력 test@example.com';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));changed ||= before!==snapshot();}assert(changed&&!lab.querySelector('.model-headline').textContent.includes('표시하지 못했습니다'),lab.id+' controls update the live result');lab.querySelector('[data-model-reset]').click();}
  window.NOVALearning.selectSession('network');const edge=$('[data-gallery-session="ai-tools"]');edge.focus();edge.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert(document.activeElement.classList.contains('session-slide')&&!document.activeElement.hidden&&document.activeElement.getAttribute('aria-current')==='true','gallery arrows keep keyboard focus on a visible selected card');
  const viewport=$('.gallery-viewport'),capture=viewport.setPointerCapture;viewport.setPointerCapture=()=>{};
  try{const before=window.NOVALearning.getState().session;viewport.dispatchEvent(new PointerEvent('pointerdown',{button:0,buttons:1,isPrimary:true,pointerId:88,pointerType:'mouse',clientX:240,clientY:100,bubbles:true}));viewport.dispatchEvent(new PointerEvent('pointermove',{buttons:1,isPrimary:true,pointerId:88,pointerType:'mouse',clientX:120,clientY:100,bubbles:true}));window.dispatchEvent(new PointerEvent('pointerup',{pointerId:88}));assert(window.NOVALearning.getState().session!==before,'horizontal swipe selects next session');const target=$('.session-slide:not([hidden]):not([aria-current="true"])');target.dispatchEvent(new MouseEvent('click',{detail:0,bubbles:true}));assert(window.NOVALearning.getState().session===target.dataset.gallerySession,'keyboard activation still works after swipe');
  }finally{viewport.setPointerCapture=capture;}
  const beforeVertical=window.NOVALearning.getState().session;viewport.dispatchEvent(new PointerEvent('pointerdown',{button:0,isPrimary:true,pointerId:89,pointerType:'touch',clientX:100,clientY:100,bubbles:true}));viewport.dispatchEvent(new PointerEvent('pointermove',{isPrimary:true,pointerId:89,pointerType:'touch',clientX:103,clientY:170,bubbles:true}));window.dispatchEvent(new PointerEvent('pointerup',{pointerId:89}));assert(window.NOVALearning.getState().session===beforeVertical,'vertical phone scroll does not change session');
  window.NOVALearning.selectSession('security');window.NOVALearning.selectSession('all');$('.library-results a[href="#lab-transport"]').click();history.back();await new Promise(r=>setTimeout(r,100));assert(!$('#library-drawer').hidden,'history restores all-experiments library');history.back();await new Promise(r=>setTimeout(r,100));assert($('#library-drawer').hidden,'history closes library when restoring ordinary session');
  return {passed:reports.length,reports};
}
