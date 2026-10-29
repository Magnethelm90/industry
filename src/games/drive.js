/* Minispiel: LKW-Fahrt */
import {SFX,vib} from '../fx.js';
import {OV,closeOv,openOv} from '../ui.js';
import {$} from '../util.js';

export function drive(route,units){return new Promise(res=>{
  const ov=openOv(`<h3>Fahrt · ${route.n}</h3><div class="sub">Tippe links/rechts oder wische. Weiche aus, sammle Münzen.</div><canvas id="cv"></canvas><div class="ctrl"><button class="btn ghost" id="L">◀</button><button class="btn ghost" id="R">▶</button></div>`);
  const cv=$('cv'),W=320,H=440,DPR=Math.min(2,window.devicePixelRatio||1);cv.width=W*DPR;cv.height=H*DPR;
  const c=cv.getContext('2d');c.scale(DPR,DPR);
  const LX=[80,160,240],TY=350;
  let lane=1,x=160,integ=100,t=0,coins=0,obs=[],parts=[],spawn=0.6,off=0,inv=0,flash=0,shake=0,over=null,overT=0,last=performance.now();
  const trees=[];for(let i=0;i<10;i++){trees.push({s:i%2?1:-1,y:i*48+Math.random()*20,r:9+Math.random()*7,dx:Math.random()*8})}
  const mv=d=>{const n=Math.max(0,Math.min(2,lane+d));if(n!==lane){lane=n;SFX.tick()}};
  $('L').onpointerdown=()=>mv(-1);$('R').onpointerdown=()=>mv(1);
  let sx=null;
  cv.onpointerdown=e=>{sx=e.clientX;const r=cv.getBoundingClientRect();mv(e.clientX-r.left<r.width/2?-1:1)};
  cv.onpointermove=e=>{if(sx!=null&&Math.abs(e.clientX-sx)>40){mv(e.clientX>sx?1:-1);sx=e.clientX}};
  cv.onpointerup=()=>sx=null;
  const key=e=>{if(!OV||!OV.alive)return removeEventListener('keydown',key);if(e.key==='ArrowLeft')mv(-1);if(e.key==='ArrowRight')mv(1)};
  addEventListener('keydown',key);
  const speed=()=>route.speed+t*3;
  const sh=(px,py,rx,ry,a=.35)=>{c.fillStyle=`rgba(0,0,0,${a})`;c.beginPath();c.ellipse(px,py,rx,ry,0,0,7);c.fill()};
  const burstP=(px,py,col,n)=>{for(let i=0;i<n;i++){const a=Math.random()*6.28,v=60+Math.random()*140;parts.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:.6,c:col})}};
  function drawObs(o){
    if(o.k==='coin'){const s=Math.abs(Math.cos(t*7+o.x));sh(o.x,o.y+14,10*s+2,4,.3);c.save();c.translate(o.x,o.y);c.scale(Math.max(.12,s),1);
      const g=c.createLinearGradient(-11,-11,11,11);g.addColorStop(0,'#fff0a8');g.addColorStop(.5,'#fbbf24');g.addColorStop(1,'#d97706');c.fillStyle=g;c.shadowColor='#fbbf24';c.shadowBlur=14;c.beginPath();c.arc(0,0,11,0,7);c.fill();c.shadowBlur=0;c.strokeStyle='#b45309';c.lineWidth=2;c.beginPath();c.arc(0,0,7,0,7);c.stroke();c.restore();return}
    if(o.k==='rock'){sh(o.x+4,o.y+16,24,8);const g=c.createLinearGradient(o.x-22,o.y-18,o.x+22,o.y+16);g.addColorStop(0,'#b6bcc9');g.addColorStop(1,'#4b5263');c.fillStyle=g;c.beginPath();c.moveTo(o.x-22,o.y+12);c.lineTo(o.x-15,o.y-12);c.lineTo(o.x+6,o.y-19);c.lineTo(o.x+23,o.y-2);c.lineTo(o.x+18,o.y+15);c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.moveTo(o.x-15,o.y-12);c.lineTo(o.x+6,o.y-19);c.lineTo(o.x+2,o.y-4);c.lineTo(o.x-12,o.y+2);c.fill();return}
    if(o.k==='cone'){sh(o.x+3,o.y+17,14,5);const g=c.createLinearGradient(o.x-14,0,o.x+14,0);g.addColorStop(0,'#ff9a3c');g.addColorStop(1,'#e8590c');c.fillStyle=g;c.beginPath();c.moveTo(o.x,o.y-22);c.lineTo(o.x+14,o.y+14);c.lineTo(o.x-14,o.y+14);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(o.x-6,o.y-4);c.lineTo(o.x+6,o.y-4);c.lineTo(o.x+8,o.y+3);c.lineTo(o.x-8,o.y+3);c.fill();c.fillStyle='#c2410c';c.fillRect(o.x-17,o.y+13,34,5);return}
    sh(o.x,o.y+12,34,6);c.fillStyle='#fff';c.fillRect(o.x-32,o.y-9,64,18);for(let i=0;i<5;i++){c.fillStyle='#e11d48';c.beginPath();c.moveTo(o.x-32+i*13,o.y+9);c.lineTo(o.x-32+i*13+7,o.y-9);c.lineTo(o.x-32+i*13+14,o.y-9);c.lineTo(o.x-32+i*13+7,o.y+9);c.fill()}
    c.fillStyle='#fff8';c.fillRect(o.x-32,o.y-9,64,3)}
  function drawTruck(){
    if(inv>0&&Math.floor(inv*12)%2)return;
    const hl=c.createLinearGradient(0,TY-40,0,TY-190);hl.addColorStop(0,'rgba(255,248,200,.35)');hl.addColorStop(1,'rgba(255,248,200,0)');c.fillStyle=hl;c.beginPath();c.moveTo(x-14,TY-40);c.lineTo(x-34,TY-190);c.lineTo(x+34,TY-190);c.lineTo(x+14,TY-40);c.fill();
    sh(x+5,TY+16,26,40,.4);
    c.fillStyle='#0b0e16';[[-23,-30],[17,-30],[-23,14],[17,14]].forEach(([a,b])=>{c.beginPath();c.roundRect(x+a,TY+b,7,18,3);c.fill()});
    let g=c.createLinearGradient(x-18,0,x+18,0);g.addColorStop(0,'#cbd5e1');g.addColorStop(.5,'#f1f5f9');g.addColorStop(1,'#94a3b8');
    c.fillStyle=g;c.beginPath();c.roundRect(x-19,TY-8,38,48,5);c.fill();c.fillStyle='rgba(15,23,42,.18)';for(let i=1;i<5;i++)c.fillRect(x-19,TY-8+i*9.6,38,1.5);
    g=c.createLinearGradient(x-17,0,x+17,0);g.addColorStop(0,'#f43f5e');g.addColorStop(.5,'#ff7a8a');g.addColorStop(1,'#be123c');c.fillStyle=g;c.beginPath();c.roundRect(x-18,TY-44,36,38,9);c.fill();
    g=c.createLinearGradient(0,TY-40,0,TY-26);g.addColorStop(0,'#e0f2fe');g.addColorStop(1,'#38bdf8');c.fillStyle=g;c.beginPath();c.roundRect(x-13,TY-40,26,13,4);c.fill();
    c.fillStyle='#fff';c.beginPath();c.arc(x-12,TY-45,3,0,7);c.arc(x+12,TY-45,3,0,7);c.fill();
    c.fillStyle='#ef4444';c.beginPath();c.arc(x-12,TY+41,2.5,0,7);c.arc(x+12,TY+41,2.5,0,7);c.fill()}
  function frame(now){
    if(!ov.alive){removeEventListener('keydown',key);return}
    const dt=Math.min(0.05,(now-last)/1000);last=now;
    if(!over){t+=dt;inv=Math.max(0,inv-dt);
      x+=(LX[lane]-x)*Math.min(1,dt*14);off=(off+speed()*dt)%80;
      spawn-=dt;if(spawn<=0){spawn=Math.max(0.28,(0.85-t*0.012)*(170/speed()+0.4));
        const l=Math.floor(Math.random()*3),r=Math.random(),k=r<0.25?'coin':r<0.55?'rock':r<0.85?'cone':'barrier';obs.push({k,x:LX[l],y:-40})}
      obs.forEach(o=>o.y+=speed()*dt);
      obs=obs.filter(o=>{
        if(o.y>TY-50&&o.y<TY+40&&Math.abs(o.x-x)<(o.k==='barrier'?38:30)){
          if(o.k==='coin'){coins++;SFX.coin();vib(10);burstP(o.x,o.y,'#fbbf24',10);return false}
          if(inv<=0){integ-=20;inv=1;flash=1;shake=.3;SFX.crash();vib([60,30,80]);burstP(x,TY-10,'#ffb84d',16)}
          return true}
        return o.y<500});
      trees.forEach(tr=>{tr.y+=speed()*dt;if(tr.y>H+30){tr.y=-30;tr.r=9+Math.random()*7;tr.dx=Math.random()*8}});
      if(t>=route.T||integ<=0){over=integ<=0?'wreck':'ok';overT=0;if(over==='ok')SFX.win()}
    }else{overT+=dt;if(overT>1.1&&!ov.done){ov.done=true;const r={integ:Math.max(0,integ),coins};removeEventListener('keydown',key);closeOv();res(r);return}}
    shake=Math.max(0,shake-dt);flash=Math.max(0,flash-dt*2.5);
    parts.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt});parts=parts.filter(p=>p.l>0);
    // Render
    c.save();if(shake>0)c.translate((Math.random()-.5)*8*shake*3,(Math.random()-.5)*8*shake*3);
    for(let i=-1;i<6;i++){c.fillStyle=(i%2)?'#1f5a38':'#236640';c.fillRect(0,i*80+off,W,80)}
    trees.forEach(tr=>{const tx=tr.s<0?12+tr.dx:W-12-tr.dx;sh(tx+4,tr.y+6,tr.r,tr.r*.5,.3);const g=c.createRadialGradient(tx-3,tr.y-4,2,tx,tr.y,tr.r);g.addColorStop(0,'#5fd28b');g.addColorStop(1,'#14532d');c.fillStyle=g;c.beginPath();c.arc(tx,tr.y,tr.r,0,7);c.fill()});
    let g=c.createLinearGradient(30,0,290,0);g.addColorStop(0,'#2a2f3c');g.addColorStop(.5,'#363c4c');g.addColorStop(1,'#2a2f3c');c.fillStyle=g;c.fillRect(30,0,260,H);
    for(let i=-2;i<12;i++){c.fillStyle=(i%2)?'#e11d48':'#f8fafc';c.fillRect(24,i*40+off,6,40);c.fillRect(290,i*40+off,6,40)}
    c.fillStyle='rgba(255,255,255,.85)';for(let l=1;l<3;l++)for(let y=-80;y<H+40;y+=80){c.fillRect(l*80+40-2,y+off,4,36)}
    if(speed()>210){c.fillStyle='rgba(255,255,255,.07)';for(let i=0;i<8;i++){c.fillRect(40+i*32,(off*3+i*97)%H,2,50)}}
    obs.slice().sort((a,b)=>a.y-b.y).forEach(drawObs);
    drawTruck();
    parts.forEach(p=>{c.globalAlpha=Math.max(0,p.l/.6);c.fillStyle=p.c;c.beginPath();c.arc(p.x,p.y,3,0,7);c.fill()});c.globalAlpha=1;
    const v=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');c.fillStyle=v;c.fillRect(0,0,W,H);
    if(flash>0){c.fillStyle=`rgba(255,40,60,${flash*.45})`;c.fillRect(0,0,W,H)}
    c.restore();
    // HUD
    c.fillStyle='rgba(8,12,24,.65)';c.beginPath();c.roundRect(10,10,110,28,14);c.fill();
    const ig=Math.max(0,integ)/100;c.fillStyle='rgba(255,255,255,.15)';c.beginPath();c.roundRect(18,20,94,8,4);c.fill();
    c.fillStyle=ig>.6?'#34d399':ig>.3?'#fbbf24':'#fb7185';c.beginPath();c.roundRect(18,20,Math.max(0,94*ig),8,4);c.fill();
    c.fillStyle='rgba(8,12,24,.65)';c.beginPath();c.roundRect(W-80,10,70,28,14);c.fill();c.fillStyle='#fbbf24';c.beginPath();c.arc(W-64,24,7,0,7);c.fill();
    c.fillStyle='#fff';c.font='800 14px system-ui,sans-serif';c.textAlign='left';c.fillText(String(coins),W-50,29);
    c.fillStyle='rgba(8,12,24,.65)';c.beginPath();c.roundRect(10,H-26,W-20,14,7);c.fill();
    const pr=Math.min(1,t/route.T);g=c.createLinearGradient(0,0,W,0);g.addColorStop(0,'#22d3ee');g.addColorStop(1,'#7c5cff');c.fillStyle=g;c.beginPath();c.roundRect(12,H-24,Math.max(10,(W-24)*pr),10,5);c.fill();
    if(over){c.fillStyle='rgba(5,8,18,.55)';c.fillRect(0,0,W,H);c.fillStyle='#fff';c.textAlign='center';c.font='900 34px system-ui,sans-serif';c.fillText(over==='ok'?'ANGEKOMMEN!':'TOTALSCHADEN!',W/2,H/2);c.textAlign='left'}
    requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})}
