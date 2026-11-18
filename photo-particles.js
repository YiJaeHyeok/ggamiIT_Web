/* Local photo → pixels → interactive particles. No upload or external API. */
(() => {
  'use strict';
  const panel = document.querySelector('#idea-pixels');
  if (!panel || !window.GgamiParticles) return;
  const section = document.createElement('section');
  section.className = 'photo-particles'; section.id = 'photo-particles';
  section.setAttribute('aria-labelledby', 'particle-title');
  section.innerHTML = `
    <div class="particle-composition">
      <div class="particle-copy">
        <h2 class="particle-title" id="particle-title">한 장의 사진,<br>수천 개의 빛.</h2>
        <p class="particle-intro">사진의 픽셀이 입자가 됩니다.<br>사진을 골라, 흩어지고 다시 모이는<br>데이터를 직접 만져보세요.</p>
        <button type="button" class="particle-upload" data-particle-upload>내 사진으로 만들기<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/></svg></button>
        <input class="particle-file" id="particle-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="입자로 표현할 사진 선택">
        <p class="particle-file-hint" id="particle-file-hint">JPG · PNG · WebP / 최대 8MB<br>입자 화면에 사진을 끌어놓아도 됩니다.</p>
      </div>
      <div class="particle-visual">
        <canvas class="particle-canvas" role="img" tabindex="0" aria-label="나무 형태의 입자. 사진을 선택하면 사진의 픽셀을 입자로 표시합니다." aria-describedby="particle-canvas-hint"></canvas>
        <p class="particle-stage-hint" id="particle-canvas-hint">마우스나 손가락으로 움직여보세요 · Enter로 흩뜨리기</p>
      </div>
    </div>
    <div class="particle-tools">
      <label class="particle-density" for="particle-density">입자 수<input type="range" id="particle-density" min="1200" max="7200" step="600" value="5400"><output for="particle-density" data-particle-count>5,400</output></label>
      <div class="particle-color" role="group" aria-label="입자 색상">
        <button type="button" data-particle-color="mono" aria-pressed="true">흑백</button><button type="button" data-particle-color="color" aria-pressed="false">원본 색상</button>
      </div>
      <div class="particle-actions">
        <button type="button" data-particle-scatter>흩뜨리기</button><button type="button" data-particle-motion aria-pressed="false">모션 멈추기</button><button type="button" data-particle-reset>예제로 돌아가기</button>
      </div>
    </div>
    <div class="particle-caption"><p data-particle-status role="status">예제 · 입체 나무. 내 사진을 선택하면 새로운 형태가 만들어집니다.</p><p class="particle-private">사진은 이 브라우저에서만 처리됩니다.</p></div>`;
  panel.prepend(section);
  const $ = selector => section.querySelector(selector);
  const canvas = $('.particle-canvas'), ctx = canvas.getContext('2d');
  if (!ctx) {
    section.replaceChildren(Object.assign(document.createElement('p'), { className: 'particle-fallback', textContent: '이 브라우저는 입자 체험을 지원하지 않습니다. 최신 Chrome 또는 Safari에서 다시 열어주세요.' }));
    return;
  }
  const input = $('#particle-file'), density = $('#particle-density'), count = $('[data-particle-count]');
  const visual = $('.particle-visual'), status = $('[data-particle-status]'), pauseButton = $('[data-particle-motion]');
  const upload = $('[data-particle-upload]'), scatterButton = $('[data-particle-scatter]');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)').matches;
  if (mobile) { density.max = '4200'; density.value = '3000'; }
  let points = [], raster = null, photoName = '', generation = 0;
  let width = 0, height = 0, frame = 0, lastFrame = 0, visible = false, paused = preference.matches, color = false;
  let scatterAt = -Infinity, yaw = 0, pitch = 0;
  const pointer = { x: -1000, y: -1000, inside: false };
  function message(text, error = false) { status.textContent = text; status.dataset.error = String(error); }
  function active() { return visible && !panel.hidden && !document.querySelector('#ideas').hidden && !document.hidden && width > 0; }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  function queue() { if (!frame && active()) frame = requestAnimationFrame(paint); }
  function measure() {
    const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); queue();
  }
  function randomFactory(seed) { return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; }
  function tree(budget) {
    const random = randomFactory(9387), result = [];
    for (let i = 0; i < budget; i++) {
      const role = random(), angle = random() * Math.PI * 2, t = random(), noise = (random() - .5) * .08;
      let x, y, z;
      if (role < .24) {
        const reach = t ** 1.2 * (.85 + .12 * Math.sin(angle * 5));
        x = Math.cos(angle) * reach; y = .18 + t ** .6 * .45; z = Math.sin(angle) * reach * .6;
      } else if (role < .43) {
        const reach = .7 * t ** 1.6;
        x = Math.cos(angle) * reach; y = .4 - t * .95; z = Math.sin(angle) * reach * .6;
      } else {
        const ring = random() ** .5, reach = ring * (1 + .13 * Math.sin(angle * 5));
        x = Math.cos(angle) * reach; y = -.27 - (1 - ring ** 2) * .45 + .09 * Math.sin(angle * 3); z = Math.sin(angle) * reach * .6;
      }
      result.push({ x: x + noise, y: y + noise, z: z + noise, light: .3 + random() * .7, rgb: [162 + Math.floor(random() * 72), 192 + Math.floor(random() * 60), 145 + Math.floor(random() * 60)] });
    }
    return result;
  }
  function rebuild(animate = true) {
    const budget = Number(density.value);
    const next = raster ? window.GgamiParticles.sampleImage(raster.data, raster.width, raster.height, budget) : tree(budget);
    if (!next.length) throw new Error('사진에 표시할 픽셀이 없습니다. 다른 사진을 선택해주세요.');
    const random = randomFactory(71);
    points = next.map(point => ({ ...point, dx: 0, dy: 0, phase: random() * Math.PI * 2, sx: (random() - .5) * 2.6, sy: (random() - .5) * 2.6 }));
    count.textContent = points.length.toLocaleString('ko-KR');
    if (animate && !paused) scatterAt = performance.now();
    queue();
  }
  function paint(now) {
    frame = 0; if (!active()) return;
    if (!paused && now - lastFrame < 28) { queue(); return; }
    lastFrame = now;
    ctx.clearRect(0, 0, width, height);
    const time = now / 1000, scale = Math.min(width * .42, height * .43);
    const targetYaw = paused ? 0 : pointer.inside ? (pointer.x / width - .5) * .24 : Math.sin(time * .32) * .055;
    const targetPitch = paused ? 0 : pointer.inside ? (pointer.y / height - .5) * .12 : 0;
    yaw += (targetYaw - yaw) * .08; pitch += (targetPitch - pitch) * .08;
    const turn = (raster ? 0 : -.23) + yaw, sin = Math.sin(turn), cos = Math.cos(turn);
    const spread = paused ? 0 : Math.max(0, 1 - (now - scatterAt) / 1500) ** 3;
    const radius = Math.max(45, Math.min(width, height) * .18);
    for (const point of points) {
      const x = point.x * cos - point.z * sin, z = point.x * sin + point.z * cos;
      const perspective = 1 / (1 + z * .14);
      const drift = paused ? 0 : Math.sin(time + point.phase) * (raster ? .0015 : .005);
      const baseX = width / 2 + (x + point.sx * spread) * scale * perspective;
      const baseY = height * .48 + (point.y + z * pitch + drift + point.sy * spread) * scale * perspective;
      let forceX = 0, forceY = 0;
      if (pointer.inside && !paused) {
        const dx = baseX - pointer.x, dy = baseY - pointer.y, distance = Math.hypot(dx, dy);
        if (distance < radius) { const force = (1 - distance / radius) ** 2 * 52; forceX = dx / Math.max(1, distance) * force; forceY = dy / Math.max(1, distance) * force; }
      }
      point.dx += (forceX - point.dx) * .16; point.dy += (forceY - point.dy) * .16;
      const shade = Math.round(65 + point.light * 190);
      ctx.fillStyle = color ? `rgb(${point.rgb.join(',')})` : `rgb(${shade},${shade},${shade})`;
      const size = (raster ? 1.3 + point.light * .85 : .85 + point.light * .95) * perspective;
      ctx.fillRect(baseX + (paused ? 0 : point.dx), baseY + (paused ? 0 : point.dy), size, size);
    }
    if (!paused) queue();
  }
  async function load(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { message('JPG, PNG, WebP 사진을 선택해주세요.', true); return; }
    if (file.size > 8 * 1024 * 1024) { message('사진이 8MB보다 큽니다. 크기를 줄인 뒤 다시 선택해주세요.', true); return; }
    const token = ++generation;
    upload.disabled = true; section.setAttribute('aria-busy', 'true'); message('사진의 픽셀을 읽고 있습니다…');
    let bitmap;
    try {
      // Resize while decoding to bound the raster kept in memory; never persist the photo.
      bitmap = await createImageBitmap(file, { resizeWidth: 640, resizeQuality: 'high', imageOrientation: 'from-image' });
      if (token !== generation) return;
      const ratio = Math.min(1, 400 / Math.max(bitmap.width, bitmap.height));
      const scratch = document.createElement('canvas'); scratch.width = Math.max(1, Math.round(bitmap.width * ratio)); scratch.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = scratch.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error();
      context.drawImage(bitmap, 0, 0, scratch.width, scratch.height);
      const next = context.getImageData(0, 0, scratch.width, scratch.height);
      if (!window.GgamiParticles.sampleImage(next.data, next.width, next.height, Number(density.value)).length) {
        message('사진이 모두 투명합니다. 내용이 있는 사진을 선택해주세요.', true); return;
      }
      raster = next; photoName = file.name;
      canvas.setAttribute('aria-label', '선택한 사진을 입자로 표현한 화면: ' + photoName);
      rebuild(); message(photoName + ' · 픽셀을 입자로 바꿨습니다. 화면을 움직이거나 입자 수를 조절해보세요.');
    } catch {
      if (token === generation) message('사진을 읽지 못했습니다. 다른 JPG, PNG, WebP 사진으로 다시 시도해주세요.', true);
    } finally {
      bitmap?.close();
      if (token === generation) { upload.disabled = false; section.removeAttribute('aria-busy'); input.value = ''; }
    }
  }
  upload.addEventListener('click', () => input.click());
  input.addEventListener('change', () => load(input.files[0]));
  density.addEventListener('input', () => { rebuild(false); if (raster) message(photoName + ' · 입자 ' + count.textContent + '개로 표현했습니다.'); });
  section.querySelectorAll('[data-particle-color]').forEach(button => button.addEventListener('click', () => {
    color = button.dataset.particleColor === 'color';
    section.querySelectorAll('[data-particle-color]').forEach(other => other.setAttribute('aria-pressed', String(other === button))); queue();
  }));
  function scatter() { if (paused) return; scatterAt = performance.now(); queue(); }
  scatterButton.addEventListener('click', scatter);
  function motion(value) {
    paused = value; pauseButton.textContent = paused ? '모션 켜기' : '모션 멈추기';
    pauseButton.setAttribute('aria-pressed', String(paused)); scatterButton.disabled = paused;
    if (paused) { scatterAt = -Infinity; yaw = pitch = 0; }
    stop(); queue();
  }
  pauseButton.addEventListener('click', () => motion(!paused)); preference.addEventListener('change', event => motion(event.matches));
  $('[data-particle-reset]').addEventListener('click', () => {
    generation++; upload.disabled = false; section.removeAttribute('aria-busy');
    raster = null; photoName = ''; input.value = ''; rebuild();
    canvas.setAttribute('aria-label', '나무 형태의 입자. 사진을 선택하면 사진의 픽셀을 입자로 표시합니다.');
    message('예제 · 입체 나무. 내 사진을 선택하면 새로운 형태가 만들어집니다.');
  });
  function move(event) {
    const rect = canvas.getBoundingClientRect(); pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top; pointer.inside = true; queue();
  }
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerdown', move);
  canvas.addEventListener('pointerleave', () => { pointer.inside = false; });
  canvas.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') pointer.inside = false; });
  canvas.addEventListener('pointercancel', () => { pointer.inside = false; });
  canvas.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); scatter(); } });
  visual.addEventListener('dragover', event => { event.preventDefault(); visual.classList.add('is-dragover'); });
  visual.addEventListener('dragleave', event => { if (!visual.contains(event.relatedTarget)) visual.classList.remove('is-dragover'); });
  visual.addEventListener('drop', event => { event.preventDefault(); visual.classList.remove('is-dragover'); load(event.dataTransfer.files[0]); });
  document.addEventListener('ggami:ideachange', event => { if (event.detail.active !== 'pixels') { pointer.inside = false; stop(); } else { measure(); queue(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else queue(); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) queue(); else stop(); }, { threshold: .05 }).observe(canvas);
  new ResizeObserver(measure).observe(canvas);
  rebuild(); motion(paused); measure();
})();
