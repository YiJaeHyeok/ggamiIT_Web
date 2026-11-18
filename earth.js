/* Native WebGL ray/sphere rendering; local NASA imagery, no third-party runtime. */
(()=>{
'use strict';
const canvas=document.querySelector('#earth-canvas');if(!canvas)return;
const overlay=document.querySelector('#earth-overlay'),pen=overlay.getContext('2d'),math=window.GgamiGlobe,$=s=>document.querySelector(s);
const status=$('#earth-status'),select=$('#earth-country'),motion=$('#earth-motion'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
const regionNames={Africa:'아프리카',Asia:'아시아',Europe:'유럽','North America':'북아메리카','South America':'남아메리카',Oceania:'오세아니아',Antarctica:'남극','Seven seas (open ocean)':'해양'};
const langNames={kor:'한국어',eng:'영어',jpn:'일본어',zho:'중국어',fra:'프랑스어',deu:'독일어',spa:'스페인어',por:'포르투갈어',ara:'아랍어',rus:'러시아어',msa:'말레이어',hin:'힌디어',ind:'인도네시아어',vie:'베트남어',tha:'태국어',ita:'이탈리아어'};
const capitals={Seoul:'서울',Tokyo:'도쿄',Beijing:'베이징','Kuala Lumpur':'쿠알라룸푸르','Washington, D.C.':'워싱턴 D.C.',London:'런던',Paris:'파리'};
const names=new Intl.DisplayNames(['ko'],{type:'region'});
let countries=[],info={},selected=null,lon=127,lat=28,distance=3.4,target={lon:127,lat:28,distance:3.4},width=0,height=0,frame=0,last=0,spinning=false,loading=false,textureReady=false,gl=null,program=null,texture=null,uniforms={};
let moved=false,startX=0,startY=0,lastX=0,lastY=0,pinch=0;const pointers=new Map();
const name=c=>{try{return /^[A-Z]{2}$/.test(c.code)?names.of(c.code):c.name;}catch{return c.name;}};
const vertex='attribute vec2 position; varying vec2 uv; void main(){uv=position;gl_Position=vec4(position,0.,1.);}';
const fragment=`precision highp float;
varying vec2 uv;uniform vec2 resolution;uniform vec2 center;uniform float distance;uniform sampler2D night;uniform float ready;
const float PI=3.14159265359;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec2 screen=vec2(uv.x*resolution.x/resolution.y,uv.y);vec3 ray=normalize(vec3(screen,-2.41421356237));vec3 origin=vec3(0.,0.,distance);
 float b=dot(origin,ray),disc=b*b-distance*distance+1.;vec2 grid=gl_FragCoord.xy/3.;float star=step(.9987,hash(floor(grid)))*pow(1.-length(fract(grid)-.5),8.);
 vec3 color=vec3(.003,.008,.019)+vec3(.45,.56,.72)*star;
 float closest=sqrt(max(0.,distance*distance-b*b));float halo=exp(-abs(closest-1.)*75.)*.22;color+=vec3(.06,.26,.58)*halo;
 if(disc>=0.){
  float t=-b-sqrt(disc);vec3 n=normalize(origin+ray*t);float cp=cos(center.y),sp=sin(center.y);
  float latitude=asin(clamp(n.y*cp+n.z*sp,-1.,1.));float longitude=center.x+atan(n.x,n.z*cp-n.y*sp);
  vec2 tex=vec2(fract(longitude/(2.*PI)+.5),latitude/PI+.5);
  vec3 surface=texture2D(night,tex).rgb;surface=pow(surface,vec3(.82))*1.32;
  float rim=pow(1.-max(0.,dot(n,-ray)),3.5);float light=.68+.32*max(0.,dot(n,normalize(vec3(-.5,.6,1.))));
  color=mix(vec3(.012,.025,.043),surface,ready)*light+vec3(.025,.12,.25)*rim;
 }
 gl_FragColor=vec4(color,1.);
}`;
function initGL(){
 try{
  gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});if(!gl)throw Error('WebGL');
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader');return s;};
  program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('program');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  for(const key of ['resolution','center','distance','night','ready'])uniforms[key]=gl.getUniformLocation(program,key);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([4,8,16]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(uniforms.night,0);return true;
 }catch{gl=null;canvas.hidden=true;overlay.hidden=true;$('#earth-fallback').hidden=false;status.textContent='이 브라우저에서는 3D를 사용할 수 없어 야간 지도를 표시합니다. 나라 목록에서 정보는 확인할 수 있습니다.';return false;}
}
function queue(){if(!frame&&!document.hidden&&gl)frame=requestAnimationFrame(draw);}
function homeDistance(){const f=height*.5/Math.tan(Math.PI/8);return width<700?Math.min(6,Math.sqrt(1+Math.pow(f/(width*.43),2))):3.4;}
function resize(){const first=!width,box=canvas.getBoundingClientRect();width=box.width;height=box.height;if(!width||!height)return;if(first)distance=target.distance=homeDistance();const dpr=Math.min(devicePixelRatio||1,2);canvas.width=overlay.width=Math.round(width*dpr);canvas.height=overlay.height=Math.round(height*dpr);pen.setTransform(dpr,0,0,dpr,0,0);if(gl)gl.viewport(0,0,canvas.width,canvas.height);queue();}
function point(lng,latitude){const p=math.project(lng,latitude,lon,lat);if(p.z<=1/distance)return null;const f=height*.5/Math.tan(Math.PI/8);return[width/2+p.x*f/(distance-p.z),height/2-p.y*f/(distance-p.z)];}
function drawOverlay(){
 pen.clearRect(0,0,width,height);pen.lineWidth=.6;pen.strokeStyle='rgba(153,183,210,.18)';
 for(const country of countries){if(country===selected)continue;pen.beginPath();for(const poly of country.polygons)for(const ring of poly){let first=true;for(const [lng,la]of ring){const p=point(lng,la);if(!p){first=true;continue;}if(first)pen.moveTo(...p);else pen.lineTo(...p);first=false;}}pen.stroke();}
 if(selected){pen.strokeStyle='#f1d28d';pen.lineWidth=1.2;pen.beginPath();for(const poly of selected.polygons)for(const ring of poly){let first=true;for(const [lng,la]of ring){const p=point(lng,la);if(!p){first=true;continue;}if(first)pen.moveTo(...p);else pen.lineTo(...p);first=false;}}pen.stroke();const p=point(...selected.center);if(p){pen.fillStyle='#fff0c9';pen.beginPath();pen.arc(...p,3,0,Math.PI*2);pen.fill();pen.strokeStyle='#f1d28d88';pen.beginPath();pen.arc(...p,8,0,Math.PI*2);pen.stroke();}}
}
function draw(now){
 frame=0;if(document.hidden||!gl||!width)return;const dt=last?Math.min(now-last,80):16;last=now;if(spinning)target.lon=math.wrap(target.lon+dt*.0025);
 const delta=math.wrap(target.lon-lon),factor=reduce.matches?1:1-Math.pow(.82,dt/16);lon=math.wrap(lon+delta*factor);lat+=(target.lat-lat)*factor;distance+=(target.distance-distance)*factor;
 gl.uniform2f(uniforms.resolution,width,height);gl.uniform2f(uniforms.center,lon*Math.PI/180,lat*Math.PI/180);gl.uniform1f(uniforms.distance,distance);gl.uniform1f(uniforms.ready,textureReady?1:0);gl.drawArrays(gl.TRIANGLES,0,6);drawOverlay();
 if(spinning||Math.abs(delta)>.005||Math.abs(target.lat-lat)>.005||Math.abs(target.distance-distance)>.0005)queue();else last=0;
}
function spin(on){spinning=on;motion.setAttribute('aria-pressed',String(on));motion.textContent=on?'회전 멈추기':'자동 회전';queue();}
function zoom(delta){target.distance=Math.max(1.45,Math.min(6,target.distance+delta));$('#earth-zoom-in').disabled=target.distance<=1.45;$('#earth-zoom-out').disabled=target.distance>=6;queue();}
function choose(country,focus=true){
 if(!country)return;selected=country;select.value=country.id;const aliases={SAH:'ESH',PSX:'PSE',KOS:'UNK',SDS:'SSD'};const data=info[aliases[country.id]||country.id]||{};$('#earth-country-name').textContent=name(country);$('#earth-country-region').textContent=(regionNames[country.continent]||country.continent)+(data.subregion?' · '+data.subregion:'');
 $('#earth-capital').textContent=data.capital?.length?data.capital.map(c=>capitals[c]||c).join(' · '):'자료 미제공';$('#earth-languages').textContent=Object.entries(data.languages||{}).map(([code,value])=>langNames[code]||value).join(' · ')||'자료 미제공';
 $('#earth-population').textContent=Number.isFinite(data.population)?data.population.toLocaleString('ko-KR')+' 명':'자료 미제공';$('#earth-area').textContent=Number.isFinite(data.area)?data.area.toLocaleString('ko-KR')+' km²':'자료 미제공';$('#earth-currency').textContent=Object.keys(data.currencies||{}).join(' · ')||'자료 미제공';
 canvas.setAttribute('aria-label',name(country)+'이 선택된 야간 지구본. 드래그로 회전하고 스크롤로 확대하세요.');if(gl)status.textContent=name(country)+' 선택됨 · 아래에서 수도·언어·주요 정보를 확인하세요.';
 if(focus){target.lon=country.center[0];target.lat=Math.max(-80,Math.min(80,country.center[1]));spin(false);}
 history.replaceState(null,'','?country='+encodeURIComponent(country.id));queue();
}
async function loadTexture(){
 if(!gl||textureReady)return;const response=await fetch('assets/ideas/earth-night.jpg',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('texture');const blob=await response.blob(),url=URL.createObjectURL(blob),image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});let source=image;const max=gl.getParameter(gl.MAX_TEXTURE_SIZE);if(image.width>max){source=document.createElement('canvas');source.width=max;source.height=Math.round(image.height*max/image.width);source.getContext('2d').drawImage(image,0,0,source.width,source.height);}gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,source);textureReady=true;queue();}finally{URL.revokeObjectURL(url);}
}
async function load(){
 if(loading)return;loading=true;$('#earth-retry').hidden=true;
 const json=async file=>{const r=await fetch('assets/ideas/'+file,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('data');return r.json();};
 const results=await Promise.allSettled([countries.length?countries:json('countries.json'),Object.keys(info).length?{countries:info}:json('country-info.json'),loadTexture()]);
 if(results[0].status==='fulfilled'&&Array.isArray(results[0].value)){countries=results[0].value;select.replaceChildren();for(const country of [...countries].sort((a,b)=>name(a).localeCompare(name(b),'ko'))){const o=document.createElement('option');o.value=country.id;o.textContent=name(country);select.append(o);}select.disabled=false;}
 if(results[1].status==='fulfilled')info=results[1].value.countries||{};
 const requested=new URLSearchParams(location.search).get('country');choose(countries.find(c=>c.id===requested)||countries.find(c=>c.code==='KR')||countries[0],Boolean(requested));
 if(results.some(r=>r.status==='rejected')){status.textContent='일부 지도 자료를 불러오지 못했습니다. 연결을 확인하고 다시 시도해주세요.';$('#earth-retry').hidden=false;}else if(gl)status.textContent='나라를 눌러 탐색 · 스크롤 또는 두 손가락으로 확대';loading=false;queue();
}
select.addEventListener('change',()=>choose(countries.find(c=>c.id===select.value)));$('#earth-retry').addEventListener('click',load);
$('#earth-zoom-in').addEventListener('click',()=>zoom(-.35));$('#earth-zoom-out').addEventListener('click',()=>zoom(.35));motion.addEventListener('click',()=>spin(!spinning));$('#earth-reset').addEventListener('click',()=>{target.distance=homeDistance();zoom(0);choose(countries.find(c=>c.code==='KR'));});
canvas.addEventListener('wheel',event=>{event.preventDefault();const scale=event.deltaMode===1?16:event.deltaMode===2?height:1;zoom(Math.max(-.4,Math.min(.4,event.deltaY*scale*.002)));},{passive:false});
canvas.addEventListener('keydown',event=>{const keys={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,10],ArrowDown:[0,-10]};if(keys[event.key]){event.preventDefault();target.lon=math.wrap(target.lon+keys[event.key][0]);target.lat=Math.max(-85,Math.min(85,target.lat+keys[event.key][1]));spin(false);}else if(event.key==='+'||event.key==='='){event.preventDefault();zoom(-.35);}else if(event.key==='-'){event.preventDefault();zoom(.35);}else if(event.key===' '){event.preventDefault();spin(!spinning);}});
canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;pointers.set(event.pointerId,[event.clientX,event.clientY]);canvas.setPointerCapture(event.pointerId);moved=false;startX=lastX=event.clientX;startY=lastY=event.clientY;pinch=0;spin(false);});
canvas.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,[event.clientX,event.clientY]);if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch)zoom((pinch-d)*.008);pinch=d;moved=true;return;}if(Math.hypot(event.clientX-startX,event.clientY-startY)>6)moved=true;if(moved){const sensitivity=(target.distance-1)*.13;target.lon=math.wrap(target.lon-(event.clientX-lastX)*sensitivity);target.lat=Math.max(-85,Math.min(85,target.lat+(event.clientY-lastY)*sensitivity));queue();}lastX=event.clientX;lastY=event.clientY;});
function release(event,cancel=false){if(!pointers.has(event.pointerId))return;const wasPinch=pointers.size>1;pointers.delete(event.pointerId);if(pointers.size){const p=[...pointers.values()][0];startX=lastX=p[0];startY=lastY=p[1];moved=true;return;}if(moved||cancel||wasPinch)return;const box=canvas.getBoundingClientRect(),hit=math.pickPerspective((event.clientX-box.left)/width*2-1,1-(event.clientY-box.top)/height*2,width/height,distance,lon,lat);if(!hit)return;const country=countries.find(c=>math.contains(c.polygons,...hit));if(country)choose(country);else status.textContent='바다 위입니다. 육지를 누르거나 나라 목록에서 선택해보세요.';}
canvas.addEventListener('pointerup',event=>release(event));canvas.addEventListener('pointercancel',event=>release(event,true));canvas.addEventListener('lostpointercapture',event=>release(event,true));
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();gl=null;status.textContent='3D 화면이 중단되었습니다. 페이지를 새로고침하면 다시 볼 수 있습니다.';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}else queue();});reduce.addEventListener('change',()=>{if(reduce.matches)spin(false);});
initGL();new ResizeObserver(resize).observe(canvas);resize();load();
})();
