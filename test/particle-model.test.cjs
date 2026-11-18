const test = require('node:test');
const assert = require('node:assert/strict');
let model = {};
try { model = require('../particle-model.js'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }

test('photo sampling preserves pixel colors and image proportions', () => {
  assert.equal(typeof model.sampleImage, 'function', 'photo sampler must be available');
  const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
  const points = model.sampleImage(pixels, 2, 1, 10);
  assert.equal(points.length, 2);
  assert.deepEqual(points.map(p => p.rgb), [[255, 0, 0], [0, 255, 0]]);
  assert.equal(points[0].y, points[1].y);
  assert.ok(points[0].x < points[1].x);
});

test('photo sampling skips transparent pixels and stays within the particle budget', () => {
  assert.equal(typeof model.sampleImage, 'function');
  const pixels = new Uint8ClampedArray(32 * 32 * 4).fill(255);
  for (let i = 0; i < 32 * 16; i++) pixels[i * 4 + 3] = 0;
  const points = model.sampleImage(pixels, 32, 32, 30);
  assert.ok(points.length > 0 && points.length <= 30);
  assert.ok(points.every(p => p.y >= 0 && Number.isFinite(p.z)));
  assert.equal(model.sampleImage(new Uint8ClampedArray(16), 2, 2, 10).length, 0);
});

test('invalid raster dimensions are rejected before scanning the pixels', () => {
  assert.equal(typeof model.sampleImage, 'function');
  assert.throws(() => model.sampleImage(new Uint8ClampedArray(4), -1, 1, 10));
  assert.throws(() => model.sampleImage(new Uint8ClampedArray(4), 2, 2, 10));
  assert.throws(() => model.sampleImage(new Uint8ClampedArray(4), 1, 1, 0));
});
