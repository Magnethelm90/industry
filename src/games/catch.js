/* Minispiel: Auffangen */
import {G} from '../data.js';
import {SFX,vib} from '../fx.js';
import {diff} from '../state.js';
import {OV,bindX,canvasFor,openOv,xbtn} from '../ui.js';
import {iconUrl,propUrl} from '../util.js';
import {A} from './scene.js';
import {gnow} from './clock.js';

export function gCatch(s){return new Promise(res=>{
  const D=18,W=320,H=400,col=G[s.out].c;
  const ov=openOv(xbtn()+`<h3>Auffangen · ${G[s.out].n}</h3><div class="sub">Zieh die Lore nach links und rechts. Fang ${G[s.out].n}, weich den grauen Steinen aus.</div><canvas id="cv" style="aspect-ratio:320/400"></canvas>`);
  bindX();ov.abort=()=>res(null);
  const [cv,c]=canvasFor(W,H);
  // Gerenderte Lore und Icons als Bilder für drawImage
  const img=u=>{const i=new Image();i.src=u;return i};
  const CART=img(propUrl('minecart')),GOOD=img(iconUrl(s.out)),ROCK=img(iconUrl('junk')),CS=118,[,rimY]=A.minecart.rim;
  // Nur für automatische Tests: Lage der Lore und fallenden Teile
  cv.__state=()=>({bx,items:items.map(o=>({x:o.x,y:o.y,st:o.st}))});
  let bx=160,tx=160,items=[],parts=[],t=0,spawnT=0.4,good=0,caught=0,stones=0,flash=0,ended=false,last=gnow();
  const setX=e=>{const r=cv.getBoundingClientRect();tx=Math.max(38,Math.min(W-38,(e.clientX-r.left)/r.width*W))};
  cv.onpointerdown=e=>{setX(e);try{cv.setPointerCapture(e.pointerId)}catch(_){}};
  cv.onpointermove=e=>{if(e.buttons||e.pointerType==='touch')setX(e)};
  const key=e=>{if(!OV||!OV.alive)return removeEventListener('keydown',key);if(e.key==='ArrowLeft')tx=Math.max(38,tx-44);if(e.key==='ArrowRight')tx=Math.min(W-38,tx+44)};
  addEventListener('keydown',key);
  function frame(){const now=gnow();
    if(!ov.alive||ended){removeEventListener('keydown',key);return}
    const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;bx+=(tx-bx)*Math.min(1,dt*16);
    spawnT-=dt;
    if(spawnT<=0&&t<D-1.5){spawnT=Math.max(.3,.75-t*.02);const st=Math.random()<.28;if(!st)good++;
      items.push({x:24+Math.random()*(W-48),y:-20,v:(120+t*7+Math.random()*50)*diff(),st,r:st?14:12,rot:Math.random()*6})}
    items.forEach(o=>{o.y+=o.v*dt;o.rot+=dt*2});
    items=items.filter(o=>{
      if(o.y>H-78&&o.y<H-48&&Math.abs(o.x-bx)<42){
        if(o.st){stones++;flash=1;SFX.crash();vib([50,30,50])}
        else{caught++;SFX.coin();vib(8);for(let i=0;i<8;i++){const a=Math.random()*6.28;parts.push({x:o.x,y:o.y,vx:Math.cos(a)*90,vy:Math.sin(a)*90-60,l:.5})}}
        return false}
      return o.y<H+20});
    parts.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.l-=dt});parts=parts.filter(p=>p.l>0);
    flash=Math.max(0,flash-dt*3);
    let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a2230');g.addColorStop(1,'#120e14');c.fillStyle=g;c.fillRect(0,0,W,H);
    // Stollen: Holzstützen links/rechts, Querbalken, Lampe
    c.fillStyle='#5b3a1f';c.fillRect(0,0,16,H);c.fillRect(W-16,0,16,H);c.fillStyle='#7a4f2a';c.fillRect(0,40,W,12);
    const lg=c.createRadialGradient(W/2,60,4,W/2,60,150);lg.addColorStop(0,'rgba(255,200,120,.25)');lg.addColorStop(1,'rgba(255,200,120,0)');c.fillStyle=lg;c.fillRect(0,0,W,H);
    c.fillStyle='#ffd27a';c.beginPath();c.arc(W/2,58,5,0,7);c.fill();
    // Schienen
    c.fillStyle='#3a2a1c';for(let x=-((t*40)%28);x<W;x+=28)c.fillRect(x,H-14,14,8);
    c.fillStyle='#9aa3b2';c.fillRect(0,H-18,W,3);c.fillRect(0,H-9,W,3);
    items.forEach(o=>{c.save();c.translate(o.x,o.y);c.rotate(o.rot);const im=o.st?ROCK:GOOD,sz=o.r*3.2;
      if(im.complete&&im.naturalWidth)c.drawImage(im,-sz/2,-sz/2,sz,sz);c.restore()});
    // Lore steht mit den Rädern auf den Schienen; ihre Oberkante (Anker rim) ist die Fanghöhe
    const cy0=H-12-.76*CS,y=cy0+rimY*CS;
    if(CART.complete&&CART.naturalWidth)c.drawImage(CART,bx-CS/2,cy0,CS,CS);
    if(caught){const pg=c.createRadialGradient(bx-6,y-4,2,bx,y,30);pg.addColorStop(0,'#fff8');pg.addColorStop(.35,col);pg.addColorStop(1,'#000a');
      c.fillStyle=pg;c.beginPath();c.ellipse(bx,y+3,34*Math.min(1,.3+caught/14),12*Math.min(1,.3+caught/16),0,Math.PI,0);c.fill()}
    parts.forEach(p=>{c.globalAlpha=Math.max(0,p.l*2);c.fillStyle=col;c.beginPath();c.arc(p.x,p.y,3,0,7);c.fill()});c.globalAlpha=1;
    if(flash>0){c.fillStyle=`rgba(255,40,60,${flash*.35})`;c.fillRect(0,0,W,H)}
    c.fillStyle='rgba(8,12,24,.65)';c.beginPath();c.roundRect(10,10,W-20,28,14);c.fill();
    c.fillStyle='#fff';c.font='800 13px system-ui,sans-serif';c.textAlign='left';c.fillText(caught+' gefangen'+(stones?' · '+stones+(stones>1?' Steine':' Stein'):''),22,29);
    c.fillStyle='rgba(255,255,255,.15)';c.fillRect(W-112,21,88,6);c.fillStyle='#fbbf24';c.fillRect(W-112,21,88*Math.max(0,1-t/D),6);
    if(t>=D){ended=true;removeEventListener('keydown',key);SFX.win();
      setTimeout(()=>ov.alive&&res(Math.max(0,Math.min(1,caught/Math.max(1,good*.75)-stones*.1))),500);return}
    requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})}
