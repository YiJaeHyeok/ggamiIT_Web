(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GgamiGlobe=api;})(typeof window==='undefined'?globalThis:window,()=>{
  'use strict';
  const rad=Math.PI/180, deg=180/Math.PI;
  const wrap=value=>((value+180)%360+360)%360-180;
  function project(lon,lat,centerLon,centerLat){
    const l=wrap(lon-centerLon)*rad,p=lat*rad,c=centerLat*rad;
    return {x:Math.cos(p)*Math.sin(l),y:Math.cos(c)*Math.sin(p)-Math.sin(c)*Math.cos(p)*Math.cos(l),z:Math.sin(c)*Math.sin(p)+Math.cos(c)*Math.cos(p)*Math.cos(l)};
  }
  function inverse(x,y,centerLon,centerLat){
    const rho=Math.hypot(x,y);if(rho>1)return null;if(rho<1e-10)return[wrap(centerLon),centerLat];
    const c=Math.asin(rho),p=centerLat*rad;
    return[wrap(centerLon+Math.atan2(x*Math.sin(c),rho*Math.cos(p)*Math.cos(c)-y*Math.sin(p)*Math.sin(c))*deg),Math.asin(Math.cos(c)*Math.sin(p)+y*Math.sin(c)*Math.cos(p)/rho)*deg];
  }
  function inRing(ring,lon,lat){
    // Unwrap a ring continuously before ray casting; this preserves date-line islands.
    const unwrapped=[];let previous=ring[0][0];
    for(const point of ring){previous+=wrap(point[0]-previous);unwrapped.push([previous,point[1]]);}
    const mean=unwrapped.reduce((sum,p)=>sum+p[0],0)/unwrapped.length;
    const query=lon+Math.round((mean-lon)/360)*360;
    let inside=false;
    for(let i=0,j=unwrapped.length-1;i<unwrapped.length;j=i++){
      const a=unwrapped[i],b=unwrapped[j];
      if((a[1]>lat)!==(b[1]>lat)&&query<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  function contains(polygons,lon,lat){return polygons.some(rings=>inRing(rings[0],lon,lat)&&!rings.slice(1).some(ring=>inRing(ring,lon,lat)));}
  function pickPerspective(x,y,aspect,distance,centerLon,centerLat){
    if(![x,y,aspect,distance,centerLon,centerLat].every(Number.isFinite)||aspect<=0||distance<=1)return null;
    if(Math.abs(x)+Math.abs(y)<1e-12)return[wrap(centerLon),centerLat];
    const f=1/Math.tan(Math.PI/8),length=Math.hypot(x*aspect,y,f),dx=x*aspect/length,dy=y/length,dz=-f/length;
    const b=distance*dz,disc=b*b-distance*distance+1;if(disc<0)return null;
    const t=-b-Math.sqrt(disc);if(t<0)return null;
    return inverse(t*dx,t*dy,centerLon,centerLat);
  }
  return{project,inverse,contains,wrap,pickPerspective};
});
