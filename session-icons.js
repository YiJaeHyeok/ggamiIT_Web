(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const path = d => ['path', { d, 'fill-rule': 'evenodd', 'clip-rule': 'evenodd' }];
  const rect = (x, y, width, height, rx = 0) => ['rect', { x, y, width, height, rx }];
  const circle = (cx, cy, r) => ['circle', { cx, cy, r }];
  const line = d => ['path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }];
  const shield = 'M48 7C58 15 69 18 81 20V42C81 63 68 80 48 90C28 80 15 63 15 42V20C27 18 38 15 48 7Z';
  const server = y => path(`M20 ${y}H76Q82 ${y} 82 ${y + 6}V${y + 13}Q82 ${y + 19} 76 ${y + 19}H20Q14 ${y + 19} 14 ${y + 13}V${y + 6}Q14 ${y} 20 ${y}Z M23 ${y + 6}H28V${y + 13}H23Z M33 ${y + 6}H38V${y + 13}H33Z M43 ${y + 6}H48V${y + 13}H43Z M66 ${y + 7}H71V${y + 12}H66Z`);
  const pins = [];
  for (const p of [29, 41, 53, 65]) pins.push(rect(p, 10, 5, 12, 2), rect(p, 74, 5, 12, 2), rect(10, p, 12, 5, 2), rect(74, p, 12, 5, 2));
  const gearPoints = [];
  for (let tooth = 0; tooth < 10; tooth++) {
    for (const [offset, radius] of [[-0.45, 32], [-0.27, 32], [-0.23, 42], [0.23, 42], [0.27, 32], [0.45, 32]]) {
      const angle = (tooth + offset) * Math.PI / 5;
      gearPoints.push(`${(48 + Math.cos(angle) * radius).toFixed(2)} ${(48 + Math.sin(angle) * radius).toFixed(2)}`);
    }
  }
  const outline = {
    fill: 'none', stroke: 'currentColor', 'stroke-width': 2.3,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round'
  };
  const glyphs = {
    network: [server(14), server(39), server(64)],
    security: [path(`${shield} M34 43V35A14 14 0 0 1 62 35V43H65V67H31V43Z M40 43H56V35A8 8 0 0 0 40 35Z`), circle(48, 53, 3.5), rect(46, 53, 4, 7, 1)],
    process: [...pins, path('M32 24H64Q72 24 72 32V64Q72 72 64 72H32Q24 72 24 64V32Q24 24 32 24Z M38 36Q36 36 36 38V58Q36 60 38 60H58Q60 60 60 58V38Q60 36 58 36Z')],
    web: [path('M18 15H78Q84 15 84 21V67Q84 73 78 73H71V66H77V32H19V66H25V73H18Q12 73 12 67V21Q12 15 18 15Z M20 21H24V26H20Z M29 21H33V26H29Z M38 21H42V26H38Z'), ['circle', { cx: 48, cy: 62, r: 24, fill: 'none', stroke: 'currentColor', 'stroke-width': 4 }], ['path', { d: 'M24 62H72M28 49C40 56 56 56 68 49M28 75C40 68 56 68 68 75M48 38C34 49 34 75 48 86M48 38C62 49 62 75 48 86M48 38V86', fill: 'none', stroke: 'currentColor', 'stroke-width': 3 }]],
    data: [path('M19 23C19 14 77 14 77 23V73C77 87 19 87 19 73Z M19 24C25 37 71 37 77 24V29C70 42 26 42 19 29Z M19 43C29 55 67 55 77 43V48C65 60 31 60 19 48Z M19 62C29 74 67 74 77 62V67C65 79 31 79 19 67Z')],
    cloud: [path('M22 61C10 61 7 42 17 35C16 22 32 16 41 23C49 7 73 14 75 31C91 31 94 55 80 61H22Z'), path('M28 64H68Q73 64 73 69V78Q73 83 68 83H28Q23 83 23 78V69Q23 64 28 64Z M31 70H36V77H31Z M41 70H46V77H41Z M60 71H65V76H60Z')],
    'ai-basics': [path('M44 14C35 8 25 14 24 23C12 23 9 38 16 44C5 53 11 68 22 69C19 80 34 90 44 80V14Z M30 29H35V45H22V40H30Z M28 57H33V68H28Z'), path('M52 14C61 8 71 14 72 23C84 23 87 38 80 44C91 53 85 68 74 69C77 80 62 90 52 80V14Z M61 29H66V40H74V45H61Z M63 57H68V68H63Z'), circle(48, 48, 6), ['path', { d: 'M42 48H29M54 48H67', fill: 'none', stroke: 'currentColor', 'stroke-width': 5 }]],
    'ai-tools': [['path', { d: 'M48 24V35M48 61V72M24 48H35M61 48H72M30 30L39 39M57 57L66 66', fill: 'none', stroke: 'currentColor', 'stroke-width': 7 }], path('M48 31A17 17 0 1 1 47.99 31Z M48 41A7 7 0 1 0 48.01 41Z'), rect(37, 7, 22, 18, 4), rect(37, 71, 22, 18, 4), rect(7, 37, 18, 22, 4), rect(71, 37, 18, 22, 4), rect(15, 15, 16, 16, 4), rect(65, 65, 16, 16, 4)],
    'ai-safety': [path(`${shield} M27 62L36 34H43L52 62H45L43.5 56H35L33.5 62Z M36.5 50H42L39.25 40Z M58 34H65V62H58Z`)],
    operations: [path(`M${gearPoints.join('L')}Z M48 29A19 19 0 1 0 48 67A19 19 0 1 0 48 29Z`), circle(48, 48, 9)],
    keyboard: [['rect', { x: 9, y: 24, width: 78, height: 48, rx: 7, ...outline }], ...[35, 46].flatMap(y => [20, 31, 42, 53, 64, 75].map(x => ['rect', { x: x - 2, y, width: 4, height: 4, rx: 0.5, ...outline }])), line('M19 60H25M33 60H63M71 60H77')],
    'database-line': [['ellipse', { cx: 48, cy: 22, rx: 25, ry: 10, ...outline }], line('M23 22V73C23 86 73 86 73 73V22M23 39C23 52 73 52 73 39M23 56C23 69 73 69 73 56')],
    'browser-line': [['rect', { x: 12, y: 18, width: 72, height: 60, rx: 5, ...outline }], line('M12 32H84M21 25H22M29 25H30M37 25H38M35 45L27 54L35 63M61 45L69 54L61 63M52 43L44 65')],
    'document-line': [line('M25 10H56L73 27V85H25ZM56 10V27H73M35 42H63M35 53H63M35 64H56M35 75H51')],
    'chip-line': [['rect', { x: 25, y: 25, width: 46, height: 46, rx: 5, ...outline }], ['rect', { x: 36, y: 36, width: 24, height: 24, rx: 2, ...outline }], line('M34 14V25M48 14V25M62 14V25M34 71V82M48 71V82M62 71V82M14 34H25M14 48H25M14 62H25M71 34H82M71 48H82M71 62H82')],
    'shield-line': [line('M48 11C57 18 68 21 77 23V44C77 61 66 76 48 85C30 76 19 61 19 44V23C28 21 39 18 48 11ZM35 47L44 56L62 36')]
  };
  function create(name) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 96 96');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('fill', 'currentColor');
    const geometry = Object.prototype.hasOwnProperty.call(glyphs, name) ? glyphs[name] : glyphs['document-line'];
    for (const [tag, attributes] of geometry) {
      const node = document.createElementNS(NS, tag);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
      svg.appendChild(node);
    }
    return svg;
  }
  window.NOVAIcons = Object.freeze({ create });
}());
