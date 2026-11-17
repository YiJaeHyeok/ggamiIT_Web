(function(root){
  'use strict';
  function offset(index,selected,total=10){return ((index-selected+Math.floor(total/2))%total+total)%total-Math.floor(total/2);}
  function pose(distance,width){
    const w=Number.isFinite(Number(width))&&width>0?Number(width):1440;
    const d=Number.isFinite(Number(distance))?Number(distance):0,a=Math.abs(d);
    const step=w<600?139:Math.min(214,w/6.1);
    const positions=[0,1,1.84,2.56,3.2,3.8];
    return {x:Math.sign(d)*step*(positions[Math.min(5,a)]??a),y:a*10,z:-a*48,angle:-Math.sign(d)*Math.min(46,a*14),scale:Math.max(.48,1-a*.095),visible:a<=3};
  }
  const api={offset,pose};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NOVACarousel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
