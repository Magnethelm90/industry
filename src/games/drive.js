/* Minispiel: LKW-Fahrt – LKW, Hindernisse und Bäume sind gerenderte Modelle (Verfolgerperspektive) */
import {SFX,motor,vib} from '../fx.js';
import {OV,closeOv,openOv} from '../ui.js';
import {$,calm,iconUrl,propUrl} from '../util.js';
import {dayPhase,weather} from '../world.js';

export function drive(route,units){return new Promise(res=>{
  const ov=openOv(`<h3>Fahrt · ${route.n}</h3><div class="sub">Tippe links/rechts oder wische. Weiche aus, sammle Münzen.</div><canvas id="cv"></canvas><div class="ctrl"><button class="btn ghost" id="L">◀</button><button class="btn ghost" id="R">▶</button></div>`);
  const cv=$('cv'),W=320,H=440,DPR=Math.min(2,window.devicePixelRatio||1);cv.width=W*DPR;cv.height=H*DPR;
  const c=cv.getContext('2d');c.scale(DPR,DPR);
  const LX=[80,160,240],TY=350,night=dayPhase()==='night',wx=weather()?.k,drops=Array.from({length:40},()=>({x:Math.random()*320,y:Math.random()*440}));
  const img=u=>{const i=new Image();i.src=u;return i},SP={truck:img(propUrl('truck')),rock:img(propUrl('boulder')),cone:img(propUrl('cone')),barrier:img(propUrl('barrier')),tree:img(propUrl('tree')),coin:img(iconUrl('coin'))};
  const SZ={truck:96,rock:58,cone:46,barrier:86};
  const draw=(k,px,py,sz)=>{const i=SP[k];if(i.complete&&i.naturalWidth)c.drawImage(i,px-sz/2,py-sz/2,sz,sz)};
  let lane=1,x=160,integ=100,t=0,coins=0,obs=[],parts=[],spawn=0.6,off=0,inv=0,flash=0,shake=0,over=null,overT=0,last=performance.now();
  const trees=[];for(let i=0;i<10;i++){trees.push({s:i%2?1:-1,y:i*48+Math.random()*20,r:9+Math.random()*7,dx:Math.random()*8})}
  cv.__state=()=>({lane,TY,LX,obs:obs.map(o=>({k:o.k,x:o.x,y:o.y})),over}); // für automatische Tests
  const mv=d=>{const n=Math.max(0,Math.min(2,lane+d));if(n!==lane){lane=n;SFX.tick()}};
  $('L').onpointerdown=()=>mv(-1);$('R').onpointerdown=()=>mv(1);
  let sx=null;
  cv.onpointerdown=e=>{sx=e.clientX;const r=cv.getBoundingClientRect();mv(e.clientX-r.left<r.width/2?-1:1)};
  cv.onpointermove=e=>{if(sx!=null&&Math.abs(e.clientX-sx)>40){mv(e.clientX>sx?1:-1);sx=e.clientX}};
  cv.onpointerup=()=>sx=null;
  const key=e=>{if(!OV||!OV.alive)return removeEventListener('keydown',key);if(e.key==='ArrowLeft')mv(-1);if(e.key==='ArrowRight')mv(1)};
  addEventListener('keydown',key);
  const speed=()=>route.speed+t*3;
  const eng=motor();let engOff=false;const engStop=()=>{if(!engOff){engOff=true;eng.stop()}};
  const sh=(px,py,rx,ry,a=.35)=>{c.fillStyle=`rgba(0,0,0,${a})`;c.beginPath();c.ellipse(px,py,rx,ry,0,0,7);c.fill()};
  const burstP=(px,py,col,n)=>{for(let i=0;i<n;i++){const a=Math.random()*6.28,v=60+Math.random()*140;parts.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:.6,c:col})}};
  function drawObs(o){
    if(o.k==='coin'){const f=Math.abs(Math.cos(t*7+o.x));sh(o.x,o.y+14,10*f+2,4,.3);c.save();c.translate(o.x,o.y);c.scale(Math.max(.12,f),1);c.shadowColor='#fbbf24';c.shadowBlur=14;draw('coin',0,0,30);c.restore();return}
    draw(o.k,o.x,o.y,SZ[o.k])}
  function drawTruck(){
    if(inv>0&&Math.floor(inv*12)%2)return;
    const hl=c.createLinearGradient(0,TY-40,0,TY-190);hl.addColorStop(0,`rgba(255,248,200,${night?.6:.35})`);hl.addColorStop(1,'rgba(255,248,200,0)');c.fillStyle=hl;c.beginPath();c.moveTo(x-14,TY-40);c.lineTo(x-34,TY-190);c.lineTo(x+34,TY-190);c.lineTo(x+14,TY-40);c.fill();
    draw('truck',x,TY,SZ.truck)}
  function frame(now){
    if(!ov.alive){removeEventListener('keydown',key);engStop();return}
    const dt=Math.min(0.05,(now-last)/1000);last=now;
    if(!over){t+=dt;inv=Math.max(0,inv-dt);
      x+=(LX[lane]-x)*Math.min(1,dt*14);off=(off+speed()*dt)%80;
      spawn-=dt;if(spawn<=0){spawn=Math.max(0.28,(0.85-t*0.012)*(170/speed()+0.4))*(wx==='storm'?.85:1);
        const l=Math.floor(Math.random()*3),r=Math.random(),k=r<0.25?'coin':r<0.55?'rock':r<0.85?'cone':'barrier';obs.push({k,x:LX[l],y:-40})}
      obs.forEach(o=>o.y+=speed()*dt);
      obs=obs.filter(o=>{
        if(o.y>TY-50&&o.y<TY+40&&Math.abs(o.x-x)<(o.k==='barrier'?38:30)){
          if(o.k==='coin'){coins++;SFX.coin();vib(10);burstP(o.x,o.y,'#fbbf24',10);return false}
          if(inv<=0){integ-=20;inv=1;flash=1;shake=calm()?0:.3;SFX.crash();vib([60,30,80]);burstP(x,TY-10,'#ffb84d',16)}
          return true}
        return o.y<500});
      trees.forEach(tr=>{tr.y+=speed()*dt;if(tr.y>H+30){tr.y=-30;tr.r=9+Math.random()*7;tr.dx=Math.random()*8}});
      eng.set(Math.min(1,(speed()-150)/150));
      if(t>=route.T||integ<=0){over=integ<=0?'wreck':'ok';overT=0;engStop();if(over==='ok')SFX.win()}
    }else{overT+=dt;if(overT>1.1&&!ov.done){ov.done=true;const r={integ:Math.max(0,integ),coins};removeEventListener('keydown',key);closeOv();res(r);return}}
    shake=Math.max(0,shake-dt);flash=Math.max(0,flash-dt*2.5);
    parts.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt});parts=parts.filter(p=>p.l>0);
    // Render
    c.save();if(shake>0)c.translate((Math.random()-.5)*8*shake*3,(Math.random()-.5)*8*shake*3);
    for(let i=-1;i<6;i++){c.fillStyle=(i%2)?'#1f5a38':'#236640';c.fillRect(0,i*80+off,W,80)}
    trees.forEach(tr=>draw('tree',tr.s<0?12+tr.dx:W-12-tr.dx,tr.y,tr.r*2.6));
    let g=c.createLinearGradient(30,0,290,0);g.addColorStop(0,'#2a2f3c');g.addColorStop(.5,'#363c4c');g.addColorStop(1,'#2a2f3c');c.fillStyle=g;c.fillRect(30,0,260,H);
    for(let i=-2;i<12;i++){c.fillStyle=(i%2)?'#e11d48':'#f8fafc';c.fillRect(24,i*40+off,6,40);c.fillRect(290,i*40+off,6,40)}
    c.fillStyle='rgba(255,255,255,.85)';for(let l=1;l<3;l++)for(let y=-80;y<H+40;y+=80){c.fillRect(l*80+40-2,y+off,4,36)}
    if(speed()>210){c.fillStyle='rgba(255,255,255,.07)';for(let i=0;i<8;i++){c.fillRect(40+i*32,(off*3+i*97)%H,2,50)}}
    obs.slice().sort((a,b)=>a.y-b.y).forEach(drawObs);
    if(night){c.fillStyle='rgba(6,10,32,.5)';c.fillRect(0,0,W,H)} // Nacht: dunkler, Scheinwerfer heller
    drawTruck();
    if(wx==='rain'||wx==='storm'||wx==='snow'){const sn=wx==='snow';c.fillStyle=sn?'rgba(255,255,255,.8)':'rgba(180,200,255,.45)';
      drops.forEach(d=>{d.y=(d.y+(sn?60:520)*Math.min(.05,dt))%H;d.x=(d.x+(sn?Math.sin(t*2+d.y)*.6:-1.5)+W)%W;sn?c.fillRect(d.x,d.y,3,3):c.fillRect(d.x,d.y,1.5,14)})}
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
