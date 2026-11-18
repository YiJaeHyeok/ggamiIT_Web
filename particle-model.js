/* Pixel sampling shared by the browser renderer and Node tests. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.GgamiParticles = model;
})(typeof window === 'undefined' ? globalThis : window, () => {
  'use strict';
  function sampleImage(pixels, width, height, budget) {
    if (![width, height, budget].every(Number.isInteger) || width < 1 || height < 1 || budget < 1 || width * height > 1_000_000 || pixels.length !== width * height * 4) {
      throw new Error('Invalid image sampling dimensions');
    }
    const columns = Math.min(width, budget, Math.max(1, Math.ceil(Math.sqrt(budget * width / height))));
    const rows = Math.min(height, Math.max(1, Math.floor(budget / columns)));
    const scale = Math.max(width, height), points = [];
    for (let row = 0; row < rows; row++) {
      const y = Math.min(height - 1, Math.floor((row + .5) * height / rows));
      for (let column = 0; column < columns; column++) {
        const x = Math.min(width - 1, Math.floor((column + .5) * width / columns)), i = (y * width + x) * 4;
        if (pixels[i + 3] < 40) continue;
        const rgb = Array.from(pixels.slice(i, i + 3));
        const light = (rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722) / 255;
        points.push({ x: (x + .5 - width / 2) * 2 / scale, y: (y + .5 - height / 2) * 2 / scale, z: (light - .5) * .18, rgb, light });
      }
    }
    return points;
  }
  return { sampleImage };
});
