/* Minispiel: Stapeln */
import {G} from '../data.js';
import {SFX,vib} from '../fx.js';
import {OV,bindX,canvasFor,openOv,xbtn} from '../ui.js';
import {$,propUrl} from '../util.js';
import {A} from './scene.js';
import {gnow} from './clock.js';

export function gStack(s){return new Promise(res=>{
  const N=10,W=320,H=440,BH=26;
  const ov=openOv(xbtn()+`<h3>Stapeln · ${G[s.out].n}</h3><div class="sub">Tippe, um den Ziegel abzulegen. Was übersteht, wird abgeschnitten. Ziel: ${N} Lagen.</div><canvas id="cv" style="aspect-ratio:320/440"></canvas><button class="btn big a" id="drop" style="margin-top:8px">ABLEGEN</button>`);
  bindX();ov.abort=()=>res(null);
  const [cv,c]=canvasFor(W,H);
  const HOOK=new Image();HOOK.src=propUrl('hook');const HS=74,[,htip]=A.hook.tip,[,htop]=A.hook.top;
  let stack=[{x:80,w:160}],cur={x:0,w:160,dir:1},speed=120,cam=0,camT=0,placed=0,perfect=0,done=false,falls=[],msg='',msgT=0,last=gnow();
  const yOf=i=>H-30-BH*(i+1)+cam;
  function brick(x,y,w,row){
    const g=c.createLinearGradient(0,y,0,y+BH);g.addColorStop(0,'#f26a4b');g.addColorStop(1,'#a8271c');c.fillStyle=g;c.fillRect(x,y,w,BH-2);
    c.fillStyle='rgba(255,255,255,.25)';c.fillRect(x,y,w,3);
    c.fillStyle='rgba(255,217,207,.55)';for(let bx=x+(row%2?13:26);bx<x+w-4;bx+=26)c.fillRect(bx,y+3,2,BH-5);
    c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x,y+BH-4,w,2)}
  function finish(){setTimeout(()=>{if(ov.alive)res(Math.min(1,placed/N))},1000)}
  function drop(){
    if(done||!ov.alive)return;
    const top=stack[stack.length-1],l=Math.max(cur.x,top.x),r=Math.min(cur.x+cur.w,top.x+top.w),w=r-l;
    if(w<=0){done=true;falls.push({x:cur.x,w:cur.w,y:yOf(stack.length),vy:0,row:stack.length});msg='DANEBEN!';msgT=2;SFX.crash();vib([60,40,60]);finish();return}
    if(Math.abs(cur.x-top.x)<=8){cur.x=top.x;perfect++;msg='PERFEKT!';msgT=1;SFX.perfect();vib(25)}
    else{falls.push({x:cur.x<top.x?cur.x:r,w:cur.w-w,y:yOf(stack.length),vy:0,row:stack.length});cur.x=l;cur.w=w;msg='';SFX.good();vib(12)}
    stack.push({x:cur.x,w:cur.w});placed++;
    if(placed>=N){done=true;msg='GESCHAFFT!';msgT=3;SFX.win();finish();return}
    speed+=12;const left=Math.random()<.5;cur={x:left?0:W-cur.w,w:cur.w,dir:left?1:-1};
    camT=Math.max(0,stack.length-9)*BH;
  }
  $('drop').onpointerdown=drop;cv.onpointerdown=drop;
  // Nur für automatische Tests
  cv.__state=()=>({x:cur.x,top:stack[stack.length-1].x,done});
  const key=e=>{if(!OV||!OV.alive)return removeEventListener('keydown',key);if(e.key===' '||e.key==='Enter'){e.preventDefault();drop()}};
  addEventListener('keydown',key);
  function frame(){const now=gnow();
    if(!ov.alive){removeEventListener('keydown',key);return}
    const dt=Math.min(.05,(now-last)/1000);last=now;
    if(!done){cur.x+=cur.dir*speed*dt;if(cur.x<0){cur.x=0;cur.dir=1}if(cur.x>W-cur.w){cur.x=W-cur.w;cur.dir=-1}}
    cam+=(camT-cam)*Math.min(1,dt*6);msgT=Math.max(0,msgT-dt);
    falls.forEach(f=>{f.vy+=900*dt;f.y+=f.vy*dt});falls=falls.filter(f=>f.y<H+40);
    let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#24305e');g.addColorStop(1,'#0c1020');c.fillStyle=g;c.fillRect(0,0,W,H);
    c.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<N;i++){const y=yOf(i);c.fillRect(0,y+BH-1,W,1)}
    c.fillStyle='#3a3f4c';c.fillRect(0,H-30+cam,W,30);
    c.fillStyle='#f5b82e';c.fillRect(0,8,W,10);c.strokeStyle='#b7791f';c.lineWidth=2;for(let x=0;x<W;x+=18){c.beginPath();c.moveTo(x,8);c.lineTo(x+9,18);c.lineTo(x+18,8);c.stroke()}
    stack.forEach((b,i)=>brick(b.x,yOf(i),b.w,i));
    if(!done){
      const cx=cur.x+cur.w/2,by=yOf(stack.length),hy=by-htip*HS+6;
      c.strokeStyle='#cbd5e1';c.lineWidth=2;c.beginPath();c.moveTo(cx,18);c.lineTo(cx,hy+htop*HS);c.stroke();
      if(HOOK.complete&&HOOK.naturalWidth)c.drawImage(HOOK,cx-HS/2,hy,HS,HS);
      brick(cur.x,by,cur.w,stack.length)}
    falls.forEach(f=>{c.globalAlpha=.85;brick(f.x,f.y,f.w,f.row);c.globalAlpha=1});
    c.fillStyle='rgba(8,12,24,.65)';c.beginPath();c.roundRect(10,10,W-20,28,14);c.fill();
    c.fillStyle='#fff';c.font='800 13px system-ui,sans-serif';c.textAlign='left';c.fillText('Lage '+placed+' / '+N+(perfect?' · '+perfect+'× perfekt':''),22,29);
    if(msgT>0&&msg){c.globalAlpha=Math.min(1,msgT*2);c.textAlign='center';c.font='900 30px system-ui,sans-serif';c.fillStyle=msg==='DANEBEN!'?'#fb7185':'#fbbf24';c.fillText(msg,W/2,90);c.globalAlpha=1;c.textAlign='left'}
    requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})}
