/* Orthographic 3D projection of locally hosted Natural Earth country geometry. */
(() => {
  'use strict';
  const pane=document.querySelector('#idea-earth'),root=document.querySelector('#ideas'),canvas=document.querySelector('#earth-canvas');
  if(!pane||!canvas||!window.GgamiGlobe)return;
  const context=canvas.getContext('2d');if(!context)return;
  const math=window.GgamiGlobe,$=s=>pane.querySelector(s),select=$('#earth-country'),status=$('#earth-status'),motion=$('#earth-motion');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const displayNames=new Intl.DisplayNames(['ko'],{type:'region'});
  const regions={Africa:'아프리카',Asia:'아시아',Europe:'유럽','North America':'북아메리카','South America':'남아메리카',Oceania:'오세아니아',Antarctica:'남극','Seven seas (open ocean)':'해양'};
  let countries=[],selected=null,lon=127,lat=30,zoom=1,width=0,height=0,frame=0,last=0,spinning=false,intersecting=false,loading=false;
  let pointer=null,moved=false,startX=0,startY=0,lastX=0,lastY=0;
  function name(country){try{return /^[A-Z]{2}$/.test(country.code)?displayNames.of(country.code):country.name;}catch{return country.name;}}
  function active(){return !pane.hidden&&!root.hidden&&!document.hidden&&intersecting&&width>0;}
  function stop(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
  function queue(){if(!frame&&active())frame=requestAnimationFrame(draw);}
  function radius(){return Math.min(width,height)*.43*zoom;}
  function resize(){const box=canvas.getBoundingClientRect();width=box.width;height=box.height;if(!width||!height)return;const ratio=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);context.setTransform(ratio,0,0,ratio,0,0);queue();}
  function horizon(a,b){const t=a.z/(a.z-b.z),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,length=Math.hypot(x,y)||1;return{x:x/length,y:y/length,z:0};}
  function ringPath(ring,cx,cy,r){
    const points=ring.map(p=>math.project(p[0],p[1],lon,lat)),first=points.findIndex(p=>p.z>=0);
    if(first<0)return false;
    const to=p=>[cx+p.x*r,cy-p.y*r];
    context.moveTo(...to(points[first]));let exit=null;
    for(let step=1;step<=points.length;step++){
      const a=points[(first+step-1)%points.length],b=points[(first+step)%points.length];
      if(a.z>=0&&b.z>=0)context.lineTo(...to(b));
      else if(a.z>=0&&b.z<0){exit=horizon(a,b);context.lineTo(...to(exit));}
      else if(a.z<0&&b.z>=0){const enter=horizon(a,b);if(exit){const from=Math.atan2(-exit.y,exit.x),end=Math.atan2(-enter.y,enter.x);let delta=((end-from+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;context.arc(cx,cy,r,from,from+delta,delta<0);}else context.moveTo(...to(enter));context.lineTo(...to(b));exit=null;}
    }
    context.closePath();return true;
  }
  function countryPath(country,cx,cy,r){let visible=false;context.beginPath();for(const polygon of country.polygons)for(const ring of polygon)visible=ringPath(ring,cx,cy,r)||visible;return visible;}
  function draw(now){
    frame=0;if(!active())return;
    if(spinning&&last&&now-last<32){queue();return;}
    if(spinning&&last)lon=math.wrap(lon+Math.min(80,now-last)*.0035);last=now;
    const r=radius(),cx=width/2,cy=height/2;
    context.clearRect(0,0,width,height);
    context.save();context.beginPath();context.ellipse(cx,cy+r*.96,r*.68,r*.06,0,0,Math.PI*2);context.fillStyle='#1c39431c';context.fill();context.restore();
    const ocean=context.createRadialGradient(cx-r*.35,cy-r*.4,r*.1,cx+r*.2,cy+r*.2,r*1.25);ocean.addColorStop(0,'#376d85');ocean.addColorStop(.65,'#23485f');ocean.addColorStop(1,'#102537');
    context.beginPath();context.arc(cx,cy,r,0,Math.PI*2);context.fillStyle=ocean;context.fill();context.save();context.clip();
    context.lineWidth=.5;context.strokeStyle='#bdd4cf2a';
    for(let parallel=-60;parallel<=60;parallel+=30){context.beginPath();let pen=false;for(let meridian=-180;meridian<=180;meridian+=3){const p=math.project(meridian,parallel,lon,lat);if(p.z>=0){const x=cx+p.x*r,y=cy-p.y*r;if(pen)context.lineTo(x,y);else context.moveTo(x,y);pen=true;}else pen=false;}context.stroke();}
    for(let meridian=-180;meridian<180;meridian+=30){context.beginPath();let pen=false;for(let parallel=-90;parallel<=90;parallel+=3){const p=math.project(meridian,parallel,lon,lat);if(p.z>=0){const x=cx+p.x*r,y=cy-p.y*r;if(pen)context.lineTo(x,y);else context.moveTo(x,y);pen=true;}else pen=false;}context.stroke();}
    for(const country of countries){if(!countryPath(country,cx,cy,r))continue;context.fillStyle=selected?.id===country.id?'#e2e5ac':'#9eafa3';context.fill('evenodd');context.lineWidth=selected?.id===country.id?1.05:.55;context.strokeStyle=selected?.id===country.id?'#f0f1c5':'#274d54';context.stroke();}
    const shade=context.createRadialGradient(cx-r*.4,cy-r*.45,r*.25,cx+r*.25,cy+r*.2,r*1.1);shade.addColorStop(0,'#00000000');shade.addColorStop(.8,'#00111b08');shade.addColorStop(1,'#00111b8a');context.fillStyle=shade;context.fillRect(cx-r,cy-r,r*2,r*2);
    if(selected){const point=math.project(...selected.center,lon,lat);if(point.z>0){const x=cx+point.x*r,y=cy-point.y*r;context.beginPath();context.arc(x,y,4,0,Math.PI*2);context.fillStyle='#ffffe3';context.fill();context.beginPath();context.arc(x,y,8,0,Math.PI*2);context.strokeStyle='#ffffe3aa';context.lineWidth=1;context.stroke();}}
    context.restore();context.beginPath();context.arc(cx,cy,r,0,Math.PI*2);context.strokeStyle='#708f913d';context.lineWidth=1;context.stroke();
    if(spinning)queue();
  }
  function setSpinning(on){spinning=on;motion.setAttribute('aria-pressed',String(on));motion.textContent=on?'자동 회전 멈추기':'자동 회전 켜기';stop();queue();}
  function choose(country,focus=true){
    if(!country)return;selected=country;select.value=country.id;
    if(focus){[lon,lat]=country.center;lat=Math.max(-80,Math.min(80,lat));setSpinning(false);}
    $('#earth-country-name').textContent=name(country);$('#earth-country-region').textContent=regions[country.continent]||country.continent;
    const coordinate=(value,positive,negative)=>Math.abs(value).toFixed(2)+'° '+(value>=0?positive:negative);
    $('#earth-lat').textContent=coordinate(country.center[1],'N','S');$('#earth-lon').textContent=coordinate(country.center[0],'E','W');
    canvas.setAttribute('aria-label',name(country)+'이 선택된 360도 회전 지구본. 드래그 또는 방향키로 회전하세요.');
    status.textContent=countries.length+'개 지도 영역 · 지도 위의 나라를 누르거나 목록에서 선택하세요.';queue();
  }
  async function load(){
    if(loading||countries.length)return;loading=true;$('#earth-retry').hidden=true;status.textContent='지도 데이터를 불러오고 있습니다.';
    try{const response=await fetch('assets/ideas/countries.json',{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error();const data=await response.json();if(!Array.isArray(data)||!data.length||!data.every(c=>c.id&&Array.isArray(c.polygons)))throw Error();countries=data;select.replaceChildren();
      for(const country of [...countries].sort((a,b)=>name(a).localeCompare(name(b),'ko'))){const option=document.createElement('option');option.value=country.id;option.textContent=name(country);select.append(option);}select.disabled=false;choose(countries.find(c=>c.code==='KR')||countries[0]);
    }catch{status.textContent='지도를 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해주세요.';$('#earth-retry').hidden=false;}finally{loading=false;}
  }
  $('#earth-retry').addEventListener('click',load);select.addEventListener('change',()=>choose(countries.find(c=>c.id===select.value)));
  function turn(amount,vertical=0){lon=math.wrap(lon+amount);lat=Math.max(-85,Math.min(85,lat+vertical));setSpinning(false);queue();}
  pane.querySelectorAll('[data-earth-turn]').forEach(button=>button.addEventListener('click',()=>turn(Number(button.dataset.earthTurn))));
  $('#earth-zoom-in').addEventListener('click',()=>{zoom=Math.min(1.25,zoom+.1);queue();});$('#earth-zoom-out').addEventListener('click',()=>{zoom=Math.max(.7,zoom-.1);queue();});
  motion.addEventListener('click',()=>setSpinning(!spinning));$('#earth-reset').addEventListener('click',()=>{zoom=1;choose(countries.find(c=>c.code==='KR')||selected);});
  canvas.addEventListener('keydown',event=>{const keys={ArrowLeft:[-15,0],ArrowRight:[15,0],ArrowUp:[0,12],ArrowDown:[0,-12]};if(keys[event.key]){event.preventDefault();turn(...keys[event.key]);}else if(event.key===' '){event.preventDefault();setSpinning(!spinning);}});
  canvas.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0)return;pointer=event.pointerId;moved=false;startX=lastX=event.clientX;startY=lastY=event.clientY;setSpinning(false);});
  canvas.addEventListener('pointermove',event=>{if(event.pointerId!==pointer)return;const dx=event.clientX-startX,dy=event.clientY-startY;if(!moved){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)*1.5){pointer=null;return;}if(Math.hypot(dx,dy)<7)return;moved=true;canvas.setPointerCapture(pointer);}lon=math.wrap(lon-(event.clientX-lastX)*.35);lat=Math.max(-85,Math.min(85,lat+(event.clientY-lastY)*.3));lastX=event.clientX;lastY=event.clientY;queue();});
  canvas.addEventListener('pointerup',event=>{if(event.pointerId!==pointer)return;pointer=null;if(moved)return;const rect=canvas.getBoundingClientRect(),r=radius(),point=math.inverse((event.clientX-rect.left-width/2)/r,-(event.clientY-rect.top-height/2)/r,lon,lat);if(!point)return;const country=countries.find(c=>math.contains(c.polygons,...point));if(country)choose(country,false);else status.textContent='바다 위입니다. 육지를 누르거나 목록에서 나라를 선택해보세요.';});
  canvas.addEventListener('pointercancel',()=>{pointer=null;});canvas.addEventListener('lostpointercapture',()=>{pointer=null;});
  document.addEventListener('ggami:ideachange',event=>{if(event.detail.active==='earth'){load();resize();queue();}else stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else queue();});reduce.addEventListener('change',event=>{if(event.matches)setSpinning(false);});
  new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting;if(intersecting)queue();else stop();},{threshold:.03}).observe(canvas);
  new ResizeObserver(resize).observe(canvas);if(!root.hidden&&!pane.hidden){load();resize();}
})();
