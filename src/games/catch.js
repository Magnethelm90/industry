/* Minispiel: Auffangen */
import {G} from '../data.js';
import {SFX,vib} from '../fx.js';
import {diff} from '../state.js';
import {OV,bindX,canvasFor,openOv,xbtn} from '../ui.js';

export function gCatch(s){return new Promise(res=>{
  const D=18,W=320,H=400,col=G[s.out].c;
  const ov=openOv(xbtn()+`<h3>Auffangen · ${G[s.out].n}</h3><div class="sub">Zieh die Lore nach links und rechts. Fang ${G[s.out].n}, weich den grauen Steinen aus.</div><canvas id="cv" style="aspect-ratio:320/400"></canvas>`);
  bindX();ov.abort=()=>res(null);
  const [cv,c]=canvasFor(W,H);
  let bx=160,tx=160,items=[],parts=[],t=0,spawnT=0.4,good=0,caught=0,stones=0,flash=0,ended=false,last=performance.now();
  const setX=e=>{const r=cv.getBoundingClientRect();tx=Math.max(38,Math.min(W-38,(e.clientX-r.left)/r.width*W))};
  cv.onpointerdown=e=>{setX(e);try{cv.setPointerCapture(e.pointerId)}catch(_){}};
  cv.onpointermove=e=>{if(e.buttons||e.pointerType==='touch')setX(e)};
  const key=e=>{if(!OV||!OV.alive)return removeEventListener('keydown',key);if(e.key==='ArrowLeft')tx=Math.max(38,tx-44);if(e.key==='ArrowRight')tx=Math.min(W-38,tx+44)};
  addEventListener('keydown',key);
  function frame(now){
    if(!ov.alive||ended){removeEventListener('keydown',key);return}
    const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;bx+=(tx-bx)*Math.min(1,dt*16);
    spawnT-=dt;
    if(spawnT<=0&&t<D-1.5){spawnT=Math.max(.3,.75-t*.02);const st=Math.random()<.28;if(!st)good++;
      items.push({x:24+Math.random()*(W-48),y:-20,v:(140+t*9+Math.random()*60)*diff(),st,r:st?14:12,rot:Math.random()*6})}
    items.forEach(o=>{o.y+=o.v*dt;o.rot+=dt*2});
    items=items.filter(o=>{
      if(o.y>H-60&&o.y<H-32&&Math.abs(o.x-bx)<40){
        if(o.st){stones++;flash=1;SFX.crash();vib([50,30,50])}
        else{caught++;SFX.coin();vib(8);for(let i=0;i<8;i++){const a=Math.random()*6.28;parts.push({x:o.x,y:o.y,vx:Math.cos(a)*90,vy:Math.sin(a)*90-60,l:.5})}}
        return false}
      return o.y<H+20});
    parts.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.l-=dt});parts=parts.filter(p=>p.l>0);
    flash=Math.max(0,flash-dt*3);
    let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1b2140');g.addColorStop(1,'#0c1020');c.fillStyle=g;c.fillRect(0,0,W,H);
    c.fillStyle='rgba(255,255,255,.035)';for(let i=0;i<7;i++)c.fillRect((i*53+t*12)%W,0,1,H);
    c.fillStyle='#4b5263';c.fillRect(0,H-14,W,4);c.fillStyle='#2f3544';for(let x=0;x<W;x+=22)c.fillRect(x,H-10,10,10);
    items.forEach(o=>{c.save();c.translate(o.x,o.y);c.rotate(o.rot);
      const gg=c.createRadialGradient(-4,-4,2,0,0,o.r);
      if(o.st){gg.addColorStop(0,'#9aa0ad');gg.addColorStop(1,'#3a3f4c')}else{gg.addColorStop(0,'#ffffff');gg.addColorStop(.3,col);gg.addColorStop(1,'#1a1a1a')}
      c.fillStyle=gg;c.beginPath();for(let k=0;k<8;k++){const a=k/8*6.283,rr=o.r*(k%2?.78:1);c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill();c.restore()});
    const y=H-48;
    c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(bx,H-12,40,5,0,0,7);c.fill();
    c.fillStyle=col;c.globalAlpha=.9;c.beginPath();c.ellipse(bx,y+3,34*Math.min(1,.2+caught/14),7,0,0,7);c.fill();c.globalAlpha=1;
    g=c.createLinearGradient(bx-40,0,bx+40,0);g.addColorStop(0,'#64748b');g.addColorStop(.5,'#e2e8f0');g.addColorStop(1,'#475569');c.fillStyle=g;
    c.beginPath();c.moveTo(bx-40,y);c.lineTo(bx+40,y);c.lineTo(bx+31,y+26);c.lineTo(bx-31,y+26);c.closePath();c.fill();
    c.fillStyle='rgba(15,23,42,.3)';c.fillRect(bx-34,y+9,68,2);
    c.fillStyle='#111827';c.beginPath();c.arc(bx-20,y+29,6,0,7);c.arc(bx+20,y+29,6,0,7);c.fill();
    parts.forEach(p=>{c.globalAlpha=Math.max(0,p.l*2);c.fillStyle=col;c.beginPath();c.arc(p.x,p.y,3,0,7);c.fill()});c.globalAlpha=1;
    if(flash>0){c.fillStyle=`rgba(255,40,60,${flash*.35})`;c.fillRect(0,0,W,H)}
    c.fillStyle='rgba(8,12,24,.65)';c.beginPath();c.roundRect(10,10,W-20,28,14);c.fill();
    c.fillStyle='#fff';c.font='800 13px system-ui,sans-serif';c.textAlign='left';c.fillText(caught+' gefangen'+(stones?' · '+stones+' Steine':''),22,29);
    c.fillStyle='rgba(255,255,255,.15)';c.fillRect(W-112,21,88,6);c.fillStyle='#fbbf24';c.fillRect(W-112,21,88*Math.max(0,1-t/D),6);
    if(t>=D){ended=true;removeEventListener('keydown',key);SFX.win();
      setTimeout(()=>ov.alive&&res(Math.max(0,Math.min(1,caught/Math.max(1,good*.85)-stones*.12))),500);return}
    requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})}
