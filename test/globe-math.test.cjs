const test = require('node:test');
const assert = require('node:assert/strict');
let globe = {};
try { globe = require('../globe-math.js'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
test('orthographic globe places the selected location at the center and hides its antipode', () => {
  assert.equal(typeof globe.project, 'function');
  const center=globe.project(127,37,127,37), back=globe.project(-53,-37,127,37);
  assert.ok(Math.abs(center.x)<1e-9 && Math.abs(center.y)<1e-9 && center.z>.999);
  assert.ok(back.z<-.999);
});
test('globe picking reverses projection and rejects points outside the sphere', () => {
  assert.equal(typeof globe.inverse, 'function');
  for(const [lon,lat] of [[127,37],[100,15],[150,-20]]) {
    const p=globe.project(lon,lat,120,15), result=globe.inverse(p.x,p.y,120,15);
    assert.ok(Math.abs(result[0]-lon)<1e-7 && Math.abs(result[1]-lat)<1e-7);
  }
  assert.equal(globe.inverse(1.1,.3,0,0),null);
});
test('country selection respects holes and a polygon crossing the date line', () => {
  assert.equal(typeof globe.contains, 'function');
  const square=[[[[-10,-10],[10,-10],[10,10],[-10,10],[-10,-10]], [[-2,-2],[2,-2],[2,2],[-2,2],[-2,-2]]]];
  assert.equal(globe.contains(square,5,5),true);
  assert.equal(globe.contains(square,0,0),false);
  assert.equal(globe.contains(square,30,0),false);
  const fiji=[[[[175,-20],[-175,-20],[-175,-10],[175,-10],[175,-20]]]];
  assert.equal(globe.contains(fiji,179,-15),true);
  assert.equal(globe.contains(fiji,0,-15),false);
});
test('perspective picking follows the same camera as the globe shader', () => {
  assert.equal(typeof globe.pickPerspective, 'function');
  assert.deepEqual(globe.pickPerspective(0,0,1,3.4,127,37),[127,37]);
  assert.equal(globe.pickPerspective(1,1,2,5,0,0),null);
  for (const distance of [1.4,2,3.4,6]) {
    const p=globe.project(123,30,127,37),f=1/Math.tan(Math.PI/8);
    const x=p.x*f/(distance-p.z)/1.6,y=p.y*f/(distance-p.z);
    const hit=globe.pickPerspective(x,y,1.6,distance,127,37);
    assert.ok(hit && Math.abs(hit[0]-123)<1e-7 && Math.abs(hit[1]-30)<1e-7);
  }
});
