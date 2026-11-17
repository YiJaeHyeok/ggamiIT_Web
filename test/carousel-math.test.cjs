const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const file=require('node:path').join(__dirname,'../carousel-math.js');
const api=fs.existsSync(file)?require(file):{};
test('circular session positions wrap on either side without duplicate visible slots',()=>{
  assert.equal(typeof api.offset,'function');
  for(let selected=0;selected<10;selected++){
    const offsets=Array.from({length:10},(_,i)=>api.offset(i,selected,10));
    assert.equal(new Set(offsets).size,10);
    assert.deepEqual(offsets.filter(x=>Math.abs(x)<=3).sort((a,b)=>a-b),[-3,-2,-1,0,1,2,3]);
  }
  assert.equal(api.offset(9,0,10),-1);assert.equal(api.offset(0,9,10),1);
});
test('geometry keeps seven desktop slots finite and scales secondary cards into depth',()=>{
  assert.equal(typeof api.pose,'function');
  for(const width of [0,320,390,768,1440,2560,NaN])for(let d=-5;d<=5;d++){
    const p=api.pose(d,width);
    for(const key of ['x','y','z','angle','scale'])assert.ok(Number.isFinite(p[key]),key+' finite');
    assert.equal(p.visible,Math.abs(d)<=3);
    assert.ok(p.scale>0&&p.scale<=1);
  }
  assert.equal(api.pose(0,1440).x,0);assert.equal(api.pose(0,1440).scale,1);
  assert.equal(api.pose(-2,1440).x,-api.pose(2,1440).x);
  assert.ok(api.pose(3,1440).z<api.pose(1,1440).z);
});
