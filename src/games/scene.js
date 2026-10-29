/* Bühne für Minispiele: Requisiten aus Blender an ihren Ankerpunkten platzieren, Teile fliegen lassen, Funken */
import A from '../assets/props/anchors.json';
import IB from '../assets/icons/bounds.json';
import {calm,ic} from '../util.js';

// IB[icon] = [oben, unten, links, rechts] des sichtbaren Gegenstands im Icon (Bildanteile)
export {A,IB};

// Requisit als quadratisches Element so setzen, dass sein Ankerpunkt auf (x, y) der Bühne liegt
export function put(stage,key,w,anchor,x,y,cls=''){
  const [ax,ay]=anchor?A[key][anchor]:[.5,.5];
  const e=document.createElement('div');
  e.className='prop p-'+key+(cls?' '+cls:'');
  e.style.cssText=`width:${w}px;height:${w}px;left:${x-ax*w}px;top:${y-ay*w}px`;
  stage.appendChild(e);
  return e;
}
// Bühnenpunkt eines Ankers eines bereits gesetzten Requisits
export function at(e,key,anchor){
  const [ax,ay]=A[key][anchor],w=e.offsetWidth;
  return [e.offsetLeft+ax*w,e.offsetTop+ay*w];
}
// Ein Teil fliegt im Bogen weg und verblasst
export function fly(stage,x,y,html,{dx=0,dy=-60,rot=0,dur=700,size=1}={}){
  const e=document.createElement('span');e.className='flyer';e.innerHTML=html;
  e.style.left=x+'px';e.style.top=y+'px';stage.appendChild(e);
  e.animate([
    {transform:`translate(-50%,-50%) scale(${size})`,opacity:1},
    {transform:`translate(calc(-50% + ${dx*.55}px),calc(-50% + ${dy}px)) rotate(${rot*.5}deg) scale(${size})`,opacity:1,offset:.45},
    {transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy*.2+40}px)) rotate(${rot}deg) scale(${size*.8})`,opacity:0}
  ],{duration:dur,easing:'cubic-bezier(.2,.7,.4,1)'}).onfinish=()=>e.remove();
}
export function chunks(stage,x,y,good,n){if(calm())n=Math.min(n,1);
  for(let i=0;i<n;i++)fly(stage,x,y,ic(good,36),{dx:(Math.random()-.5)*170,dy:-50-Math.random()*70,rot:(Math.random()-.5)*540,dur:650+Math.random()*350});
}
export function sparks(stage,x,y,n=12,col='#fde047'){if(calm())n=Math.ceil(n/4);
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=30+Math.random()*60;
    fly(stage,x,y,`<i class="spark" style="background:${col};box-shadow:0 0 6px ${col}"></i>`,{dx:Math.cos(a)*r,dy:Math.sin(a)*r-20,dur:350+Math.random()*250})}
}
export function shakeStage(stage){if(calm())return;stage.animate([{transform:'translate(0,0)'},{transform:'translate(-5px,3px)'},{transform:'translate(4px,-2px)'},{transform:'translate(0,0)'}],{duration:180})}
// Rundinstrument (Halbkreis): Anteil 0..1 → Winkel −70°..70°
export const gaugeAngle=v=>-70+140*Math.max(0,Math.min(1,v));
export function arcPath(cx,cy,r,a0,a1){
  const p=a=>[cx+r*Math.sin(a*Math.PI/180),cy-r*Math.cos(a*Math.PI/180)];
  const [x0,y0]=p(a0),[x1,y1]=p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
