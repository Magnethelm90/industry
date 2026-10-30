/* Minispiel: LKW-Fahrt – Straße in Perspektive mit Kurven, Verkehr und Baustellen. Gelenkt wird mit dem Finger.
   Alle Längen in Metern: Die Kamera fährt CAMH über der Straße, der LKW steht TZ Meter vor ihr. */
import {SFX,motor,vib} from '../fx.js';
import {OV,closeOv,openOv} from '../ui.js';
import {$,calm,ic,iconUrl,propUrl} from '../util.js';
import {dayPhase,weather} from '../world.js';
import {gnow} from './clock.js';
import {play} from './gate.js';

export const drive=(route,units)=>play(()=>run(route,units),ic('truck',56));

const W=320,H=480,HY=150,FOC=714,CAMH=8,TZ=22,RW=4.6,LANE=3,SEG=4,FAR=190,ZN=CAMH*FOC/(H-HY);
const yOf=z=>HY+CAMH*FOC/z,kOf=z=>FOC/z;
// Bilder: Kantenlänge in Metern und Lage der Unterkante im Bild; Breite für Zusammenstöße
const SPR={truck:[3.4,.97],car_a:[2.05,.97],car_b:[2.05,.97],cone:[1.6,.96],barrier:[2.7,.71],boulder:[2.3,.92],tree:[6.2,.96],lamp:[6.5,.97]};
const HITW={cone:.9,barrier:2.6,boulder:1.9,car_a:1.9,car_b:1.9,coin:1.6};
const DMG={cone:15,barrier:25,boulder:25,car_a:30,car_b:30};
const PAL={
  day:{sky:['#4f9fe0','#cbe9fa'],hill:['#86b8a6','#4f8f6a'],grass:['#3f9b4f','#48a858'],road:['#4a4f5c','#525868'],lite:0},
  dawn:{sky:['#3b2a5a','#f6a072'],hill:['#6b5a7a','#3e5a52'],grass:['#2f7045','#367a4f'],road:['#3f434f','#464b59'],lite:.3},
  dusk:{sky:['#2a1f4a','#f08a5d'],hill:['#5b4a6a','#3a4f4a'],grass:['#2b6640','#32704a'],road:['#3b3f4b','#424755'],lite:.4},
  night:{sky:['#050918','#1a2250'],hill:['#141a33','#0e1428'],grass:['#12301f','#163725'],road:['#25272f','#2a2d36'],lite:1}};

function run(route){return new Promise(res=>{
  const ov=openOv(`<h3>Fahrt · ${route.n}</h3><div class="sub">Zieh den Finger nach links und rechts, um zu lenken – oder tippe links bzw. rechts für einen Spurwechsel. Weich Hütchen, Baustellen und Felsen aus, überhol langsame Autos und sammle Münzen.</div><canvas id="cv" style="aspect-ratio:${W}/${H}"></canvas><div class="ctrl"><button class="btn ghost" id="L">◀</button><button class="btn ghost" id="R">▶</button></div>`);
  ov.abort=()=>{if(ov.done)return;removeEventListener('keydown',key);engStop();res(null)}; // nur auf dem Startbildschirm möglich („Zurück“)
  const cv=$('cv'),DPR=Math.min(2,window.devicePixelRatio||1);cv.width=W*DPR;cv.height=H*DPR;
  const c=cv.getContext('2d');c.scale(DPR,DPR);
  const ph=dayPhase(),P=PAL[ph],night=ph==='night',wx=weather()?.k,slip=wx==='rain'||wx==='snow'||wx==='storm';
  // Abends und nachts werden die Modelle einmalig abgedunkelt (vorbereitete Kopien statt Filter in jedem Bild)
  const dim=night?.45:ph==='day'?0:.22,IM={};
  const img=(k,u,shade)=>{const i=new Image();i.onload=()=>{if(!shade||!dim){IM[k]=i;return}const o=document.createElement('canvas');o.width=i.naturalWidth;o.height=i.naturalHeight;
    const x=o.getContext('2d');x.drawImage(i,0,0);x.globalCompositeOperation='source-atop';x.fillStyle=`rgba(6,10,32,${dim})`;x.fillRect(0,0,o.width,o.height);IM[k]=o};i.src=u};
  img('coin',iconUrl('coin'),false);for(const k in SPR)img(k,propUrl(k),k!=='truck'||night);
  // Strecke: sanfte Kurven, die ersten 250 m geradeaus
  const p1=Math.random()*6.28,p2=Math.random()*6.28,A1=18+Math.random()*6,A2=3+Math.random()*2;
  const C=d=>Math.min(1,Math.max(0,(d-250)/300))*(A1*Math.sin(d/190+p1)+A2*Math.sin(d/83+p2));
  const v0=route.speed/170*26,L=Math.round(v0*route.T);
  let pos=0,v=v0*.6,px=0,tx=0,camx=0,steer=0,t=0,integ=100,coins=0,inv=0,flash=0,shake=0,over=null,overT=0,last=gnow();
  let objs=[],parts=[],nextRow=130,calmUntil=0,carLane=null,rows=0,hint=3;
  const stars=Array.from({length:50},()=>({x:Math.random()*W,y:Math.random()*(HY-20),r:Math.random()*1.3+.3}));
  const drops=Array.from({length:50},()=>({x:Math.random()*W,y:Math.random()*H}));
  const lanes=[-LANE,0,LANE],near=x=>lanes.reduce((a,b)=>Math.abs(b-x)<Math.abs(a-x)?b:a);
  const kT=kOf(TZ),yT=yOf(TZ),MAXX=RW-1.1;
  cv.__state=()=>({px,tx,v,over,L,pos,objs:objs.filter(o=>!o.hit).map(o=>({k:o.k,lx:o.lx,dz:o.d-pos-TZ}))}); // für automatische Tests

  // --- Steuerung: Ziehen lenkt stufenlos, kurzes Tippen wechselt die Spur, Knöpfe und Pfeiltasten auch
  const lane=d=>{tx=Math.max(-LANE,Math.min(LANE,near(tx)+d*LANE));SFX.tick()};
  let drag=null;
  cv.onpointerdown=e=>{e.preventDefault();drag={x:e.clientX,tx,t:performance.now(),moved:false};try{cv.setPointerCapture(e.pointerId)}catch(_){}};
  cv.onpointermove=e=>{if(!drag)return;const r=cv.getBoundingClientRect(),dx=e.clientX-drag.x;if(Math.abs(dx)>8)drag.moved=true;
    if(drag.moved)tx=Math.max(-MAXX,Math.min(MAXX,drag.tx+dx/r.width*W/kT*1.2))};
  cv.onpointerup=e=>{if(drag&&!drag.moved&&performance.now()-drag.t<350){const r=cv.getBoundingClientRect();lane(e.clientX-r.left<r.width/2?-1:1)}drag=null};
  cv.onpointercancel=()=>drag=null;
  const hold=(id,d)=>{const b=$(id);b.onpointerdown=e=>{e.preventDefault();steer=d};b.onpointerup=b.onpointerleave=b.onpointercancel=()=>{if(steer===d)steer=0}};
  hold('L',-1);hold('R',1);
  const key=e=>{if(!OV||!OV.alive)return removeEventListener('keydown',key);if(e.key==='ArrowLeft')lane(-1);if(e.key==='ArrowRight')lane(1)};
  addEventListener('keydown',key);
  const eng=motor();let engOff=false;const engStop=()=>{if(!engOff){engOff=true;eng.stop()}};

  // --- Hindernisse in Reihen: In jeder Reihe bleibt mindestens eine Spur frei, und zwischen zwei Reihen ist genug Zeit zum Ausweichen
  const add=(k,ln,d,extra={})=>objs.push({k,lx:ln*LANE,d,...extra});
  const coinLine=(ln,d,n=5)=>{for(let i=0;i<n;i++)add('coin',ln,d+i*7)};
  // Fair: Jede Reihe lässt mindestens eine Spur frei, die schon in der Reihe davor frei war – es gibt immer einen Weg ohne Querfahrt
  let open=[-1,0,1];
  function row(d){
    rows++;const keep=open[Math.floor(Math.random()*open.length)],b=[-1,0,1].filter(l=>l!==keep).sort(()=>Math.random()-.5);
    // Muss man die Seite wechseln (eine bisher freie Spur wird gesperrt), gibt es extra Abstand zur nächsten Reihe
    const block=ls=>{if(open.some(l=>ls.includes(l)))nextRow+=v0*.6;open=[-1,0,1].filter(l=>!ls.includes(l))};
    if(d<calmUntil){if(Math.random()<.7)coinLine(keep,d,4);block([carLane]);return}
    carLane=null;
    const r=Math.random(),hard=t>6;
    if(r<.18){coinLine(keep,d,6);block([]);return}
    if(r<.36&&rows>1){ // langsames Auto: bis es überholt ist, kommen in den anderen Spuren nur Münzen
      const vc=v0*(.5+Math.random()*.1),tp=Math.max(1,(d-pos-TZ)/Math.max(4,v0-vc));carLane=b[0];
      add(Math.random()<.5?'car_a':'car_b',b[0],d,{v:vc});calmUntil=d+vc*tp+20;block([b[0]]);return}
    if(r<.55){add('barrier',b[0],d);add('cone',b[0],d-9);add('cone',b[0],d-18);if(Math.random()<.5)coinLine(b[1],d-14,3);block([b[0]]);return}
    if(hard&&r<.78){add(pick(),b[0],d);add(pick(),b[1],d);coinLine(keep,d-6,3);block([b[0],b[1]]);return}
    add(pick(),b[0],d);if(Math.random()<.6)coinLine(b[1],d-10,4);block([b[0]]);
  }
  const pick=()=>Math.random()<.45?'cone':Math.random()<.6||wx!=='storm'?'boulder':'barrier';
  const burstP=(x,y,col,n)=>{if(calm())n=Math.ceil(n/4);for(let i=0;i<n;i++){const a=Math.random()*6.28,s=60+Math.random()*140;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-40,l:.7,c:col})}};

  // --- Projektion: seitliche Lage der Straße relativ zur Fahrtrichtung der Kamera
  let c0=0,c1=0;
  const rel=z=>C(pos+z)-c0-c1*z;
  const sx=(lx,z)=>W/2+(rel(z)+lx-camx)*kOf(z);
  function quad(x1,y1,w1,x2,y2,w2,col){y2-=.7;c.fillStyle=col;c.beginPath();c.moveTo(x1-w1,y1);c.lineTo(x2-w2,y2);c.lineTo(x2+w2,y2);c.lineTo(x1+w1,y1);c.fill()}
  function sprite(k,lx,z,o){const [S,b]=SPR[k],im=IM[k];if(!im)return;const s=S*kOf(z),x=sx(lx,z),y=yOf(z);
    if(o&&o.hit){c.save();c.globalAlpha=Math.max(0,1-o.ht*2);c.translate(x+o.hx*o.ht*80,y-o.ht*90);c.rotate(o.hx*o.ht*4);c.drawImage(im,-s/2,-b*s,s,s);c.restore();return}
    c.drawImage(im,x-s/2,y-b*s,s,s);
    if(k==='lamp'&&P.lite>0){const [ax,ay]=[.614,.078],gx=x-s/2+ax*s,gy=y-b*s+ay*s,r=s*.35,g=c.createRadialGradient(gx,gy,0,gx,gy,r);
      g.addColorStop(0,`rgba(255,236,170,${.7*P.lite})`);g.addColorStop(1,'rgba(255,236,170,0)');c.fillStyle=g;c.fillRect(gx-r,gy-r,2*r,2*r)}}
  function coin(lx,z){const k=kOf(z),s=1.2*k,x=sx(lx,z),y=yOf(z)-1.1*k,f=Math.abs(Math.cos(t*6+lx));
    if(!IM.coin)return;c.save();c.translate(x,y);c.scale(Math.max(.15,f),1);if(!night||calm()){c.shadowColor='#fbbf24';c.shadowBlur=10}c.drawImage(IM.coin,-s/2,-s/2,s,s);c.restore()}
  const hill=(x,a,b)=>HY-a-b*(Math.sin(x/53)*.6+Math.sin(x/23+1)*.3+Math.sin(x/11+2)*.1);

  function frame(){
    if(!ov.alive){removeEventListener('keydown',key);engStop();return}
    const now=gnow(),dt=Math.min(.05,(now-last)/1000);last=now;
    c0=C(pos);c1=(C(pos+1)-C(pos-1))/2;
    if(!over&&dt>0){
      t+=dt;inv=Math.max(0,inv-dt);hint=Math.max(0,hint-dt);
      v+=((v0*(1+Math.min(.2,t*.012)))-v)*Math.min(1,dt*.8);
      // Lenken: Knöpfe verschieben das Ziel, der LKW folgt mit Trägheit; Kurven drücken nach außen
      if(steer)tx=Math.max(-MAXX,Math.min(MAXX,tx+steer*8*dt));
      const cc=C(pos+TZ+1)-2*C(pos+TZ)+C(pos+TZ-1),drift=-cc*v*v*.5*dt;tx=Math.max(-MAXX,Math.min(MAXX,tx+drift));
      px+=(tx-px)*Math.min(1,dt*(slip?6:9));
      camx+=(px*.7-camx)*Math.min(1,dt*4);
      pos+=v*dt;
      while(nextRow<pos+FAR&&nextRow<L-40){row(nextRow);nextRow+=v0*Math.max(1.15,1.75-t*.025)*(wx==='storm'?.88:1)}
      objs.forEach(o=>{if(o.v&&!o.hit)o.d+=o.v*dt;if(o.hit)o.ht+=dt});
      const td=pos+TZ;
      for(const o of objs){if(o.hit||Math.abs(o.d-td)>2.4||Math.abs(o.lx-px)>(HITW[o.k]+2.2)/2)continue;
        const z=o.d-pos;
        if(o.k==='coin'){o.hit=1;o.ht=.5;coins++;SFX.coin();vib(10);burstP(sx(o.lx,z),yOf(z)-kOf(z),'#fbbf24',8);continue}
        if(inv>0)continue;
        o.hit=1;o.ht=0;o.hx=o.lx<px?-1:1;integ-=DMG[o.k];inv=1.2;flash=1;shake=calm()?0:.35;v*=.6;
        SFX.crash();vib([60,30,80]);burstP(W/2+(px-camx)*kT,yT-30,'#ffb84d',16);
        if(integ>0)tx=Math.max(-MAXX,Math.min(MAXX,tx+(o.lx<=px?1.2:-1.2)))}
      objs=objs.filter(o=>o.d-pos>4&&(!o.hit||o.ht<.5));
      eng.set(Math.min(1,(v-15)/25));
      if(pos>=L||integ<=0){over=integ<=0?'wreck':'ok';overT=0;engStop();if(over==='ok')SFX.win()}
    }else if(over){overT+=dt;v*=Math.max(0,1-dt*2);pos+=v*dt;
      if(overT>1.3&&!ov.done){ov.done=true;const r={integ:Math.max(0,integ),coins};removeEventListener('keydown',key);closeOv();res(r);return}}
    shake=Math.max(0,shake-dt);flash=Math.max(0,flash-dt*2.5);
    parts.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;p.l-=dt});parts=parts.filter(p=>p.l>0);
    draw();requestAnimationFrame(frame)}

  function draw(){
    c.save();if(shake>0)c.translate((Math.random()-.5)*20*shake,(Math.random()-.5)*20*shake);
    // Himmel, Sterne, Hügel (verschieben sich in Kurven), am Ende die Stadt
    let g=c.createLinearGradient(0,0,0,HY);g.addColorStop(0,P.sky[0]);g.addColorStop(1,P.sky[1]);c.fillStyle=g;c.fillRect(-10,-10,W+20,HY+12);
    if(night){c.fillStyle='#fff';stars.forEach(s=>{c.globalAlpha=.4+.4*Math.sin(t*2+s.x);c.fillRect(s.x,s.y,s.r,s.r)});c.globalAlpha=1;
      c.fillStyle='#f8fafc';c.beginPath();c.arc(236,78,12,0,7);c.fill();c.fillStyle=P.sky[0];c.beginPath();c.arc(242,74,11,0,7);c.fill()}
    else if(ph==='day'){c.fillStyle='rgba(255,250,220,.9)';c.beginPath();c.arc(70,80,16,0,7);c.fill()}
    const bg=-Math.atan(c1)*700;
    [[P.hill[0],18,22,.4],[P.hill[1],6,14,1]].forEach(([col,a,b,f])=>{c.fillStyle=col;c.beginPath();c.moveTo(-10,HY+2);for(let x=-10;x<=W+10;x+=6)c.lineTo(x,hill(x-bg*f,a,b));c.lineTo(W+10,HY+2);c.fill()});
    const pr=Math.min(1,pos/L);
    if(pr>.45){const cx=sx(0,Math.min(FAR,Math.max(40,L-pos))),hgt=(pr-.45)/.55;c.fillStyle=night?'#1e2440':'#5d6b85';
      [[-46,22,30],[-24,14,46],[-10,18,62],[8,12,40],[20,16,54],[36,20,28]].forEach(([x,w,h])=>{c.fillRect(cx+x,HY+2-h*hgt,w,h*hgt);
        if(night){c.fillStyle='#fde68a';for(let yy=HY-h*hgt+6;yy<HY-2;yy+=8)c.fillRect(cx+x+4,yy,2,2);c.fillStyle='#1e2440'}})}
    c.fillStyle=P.grass[0];c.fillRect(-10,HY,W+20,H-HY+10);
    // Straße: Abschnitte von hinten nach vorn
    const n0=Math.floor((pos+ZN)/SEG),n1=Math.floor((pos+FAR)/SEG);
    for(let n=n1;n>=n0;n--){const z1=Math.max(ZN,n*SEG-pos),z2=n*SEG+SEG-pos;if(z2>z1&&n&1){c.fillStyle=P.grass[1];c.fillRect(-10,yOf(z2),W+20,yOf(z1)-yOf(z2))}}
    for(let n=n1;n>=n0;n--){
      const z1=Math.max(ZN,n*SEG-pos),z2=n*SEG+SEG-pos;if(z2<=z1)continue;
      const y1=yOf(z1),y2=yOf(z2),k1=kOf(z1),k2=kOf(z2),x1=sx(0,z1),x2=sx(0,z2),st=n&1;
      quad(x1,y1,RW*1.14*k1,x2,y2,RW*1.14*k2,st?'#e11d48':'#f1f5f9');
      quad(x1,y1,RW*k1,x2,y2,RW*k2,P.road[st]);
      if(n%3){for(const lx of [-LANE/2,LANE/2])quad(sx(lx,z1),y1,.09*k1,sx(lx,z2),y2,.09*k2,'rgba(255,255,255,.85)')}
      if(Math.abs(n*SEG-L)<SEG/2)quad(x1,y1,RW*k1,x2,y2,RW*k2,'#f8fafc');
    }
    g=c.createLinearGradient(0,HY-4,0,HY+34);g.addColorStop(0,P.sky[1]);g.addColorStop(1,P.sky[1]+'00');c.fillStyle=g;c.fillRect(-10,HY-4,W+20,38); // Dunst in der Ferne
    // Landschaft und Hindernisse von hinten nach vorn, der LKW an seiner Stelle dazwischen
    const list=objs.map(o=>({z:o.d-pos,o}));
    for(let n=Math.floor((pos+ZN)/25);n<=Math.floor((pos+FAR)/25);n++){const d=n*25,h=(Math.sin(n*12.9898)*43758.5453)%1,s=h<0?-1:1;
      list.push({z:d-pos,deco:Math.abs(h)<.35&&ph!=='day'?'lamp':'tree',lx:s*(RW+2.5+Math.abs(h)*6)})}
    if(L-pos<FAR&&L-pos>ZN)list.push({z:L-pos,goal:true});
    list.push({z:TZ,truck:true});
    list.filter(e=>e.z>=ZN*.85&&e.z<=FAR).sort((a,b)=>b.z-a.z).forEach(e=>{
      if(e.truck)return drawTruck();
      if(e.goal)return drawGoal(e.z);
      if(e.deco)return sprite(e.deco,e.lx,e.z);
      if(e.o.k==='coin'){if(!e.o.hit)coin(e.o.lx,e.z);return}
      sprite(e.o.k,e.o.lx,e.z,e.o)});
    // Nacht: Scheinwerferkegel
    if(P.lite>0){const x=W/2+(px-camx)*kT;g=c.createLinearGradient(0,yT-30,0,HY+40);g.addColorStop(0,`rgba(255,240,190,${.22*P.lite})`);g.addColorStop(1,'rgba(255,240,190,0)');
      c.save();c.globalCompositeOperation='lighter';c.fillStyle=g;c.beginPath();c.moveTo(x-30,yT-40);c.lineTo(x-90,HY+40);c.lineTo(x+90,HY+40);c.lineTo(x+30,yT-40);c.fill();c.restore()}
    if(wx==='rain'||wx==='storm'||wx==='snow'){const sn=wx==='snow';c.fillStyle=sn?'rgba(255,255,255,.8)':'rgba(190,210,255,.45)';
      drops.forEach(d=>{d.y=(d.y+(sn?70:560)*Math.min(.05,1/60))%H;d.x=(d.x+(sn?Math.sin(t*2+d.y)*.6:-1.5)+W)%W;sn?c.fillRect(d.x,d.y,3,3):c.fillRect(d.x,d.y,1.5,16)})}
    if(v>30&&!calm()){c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=2;for(let i=0;i<6;i++){const a=(i/6)*6.28+t,r0=120+((t*400+i*70)%160);c.beginPath();c.moveTo(W/2+Math.cos(a)*r0,HY+60+Math.sin(a)*r0*.6);c.lineTo(W/2+Math.cos(a)*(r0+40),HY+60+Math.sin(a)*(r0+40)*.6);c.stroke()}}
    parts.forEach(p=>{c.globalAlpha=Math.max(0,p.l/.7);c.fillStyle=p.c;c.beginPath();c.arc(p.x,p.y,3,0,7);c.fill()});c.globalAlpha=1;
    if(flash>0){c.fillStyle=`rgba(255,40,60,${flash*.4})`;c.fillRect(-10,-10,W+20,H+20)}
    c.restore();
    hud();
  }
  function drawTruck(){
    if(inv>0&&Math.floor(inv*12)%2)return;
    const im=IM.truck;if(!im)return;
    const [S,b]=SPR.truck,s=S*kT,x=W/2+(px-camx)*kT,y=yT+(over?0:Math.sin(t*28)*.6);
    c.save();c.translate(x,y);c.rotate(Math.max(-.07,Math.min(.07,(tx-px)*.05)));
    c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(0,-2,s*.36,s*.06,0,0,7);c.fill();
    c.drawImage(im,-s/2,-b*s,s,s);
    if(night||ph==='dusk'){c.fillStyle='rgba(255,60,60,.5)';[-.27,.27].forEach(f=>{c.beginPath();c.arc(f*s,-.17*s,s*.05,0,7);c.fill()})}
    c.restore()}
  function drawGoal(z){const k=kOf(z),y=yOf(z),xl=sx(-RW-.4,z),xr=sx(RW+.4,z),top=y-6*k,bh=1.2*k;
    c.fillStyle='#e5e7eb';c.fillRect(xl-.2*k,top,.4*k,y-top);c.fillRect(xr-.2*k,top,.4*k,y-top);
    const n=12,w=(xr-xl)/n;for(let i=0;i<n;i++)for(let j=0;j<2;j++){c.fillStyle=(i+j)%2?'#111827':'#f8fafc';c.fillRect(xl+i*w,top+j*bh/2,w+.5,bh/2+.5)}
    if(k>1.2){c.fillStyle='#fff';c.font=`900 ${Math.min(26,k*.9)}px system-ui,sans-serif`;c.textAlign='center';c.fillText(route.n.toUpperCase(),(xl+xr)/2,top-6);c.textAlign='left'}}
  function pill(x,y,w){c.fillStyle='rgba(8,12,24,.62)';c.beginPath();c.roundRect(x,y,w,28,14);c.fill()}
  function hud(){
    const ig=Math.max(0,integ)/100;pill(10,10,96);
    c.fillStyle='rgba(255,255,255,.15)';c.beginPath();c.roundRect(18,20,80,8,4);c.fill();
    c.fillStyle=ig>.6?'#34d399':ig>.3?'#fbbf24':'#fb7185';c.beginPath();c.roundRect(18,20,Math.max(0,80*ig),8,4);c.fill();
    pill(W-76,10,66);c.fillStyle='#fbbf24';c.beginPath();c.arc(W-60,24,7,0,7);c.fill();
    c.fillStyle='#fff';c.font='800 14px system-ui,sans-serif';c.textAlign='left';c.fillText(String(coins),W-46,29);
    pill(W/2-40,10,80);c.textAlign='center';c.fillStyle='#fff';c.font='800 13px system-ui,sans-serif';c.fillText(Math.round(v*3.6)+' km/h',W/2,29);
    c.fillStyle='rgba(8,12,24,.62)';c.beginPath();c.roundRect(10,H-24,W-20,14,7);c.fill();
    const pr=Math.min(1,pos/L);g2(pr);
    c.fillStyle='#fff';c.font='700 11px system-ui,sans-serif';c.fillText('noch '+Math.max(0,(L-pos)/1000).toFixed(1).replace('.',',')+' km',W/2,H-31);
    if(hint>0&&!over){c.globalAlpha=Math.min(1,hint);pill(W/2-96,HY+44,192);c.fillStyle='#fff';c.font='800 13px system-ui,sans-serif';c.fillText('👆 Zum Lenken ziehen',W/2,HY+63);c.globalAlpha=1}
    if(over){c.fillStyle='rgba(5,8,18,.5)';c.fillRect(0,0,W,H);c.fillStyle='#fff';c.font='900 32px system-ui,sans-serif';c.fillText(over==='ok'?'ANGEKOMMEN!':'TOTALSCHADEN!',W/2,H/2-10);
      c.font='700 15px system-ui,sans-serif';c.fillText(`🪙 ${coins} Münzen · Zustand ${Math.max(0,integ)} %`,W/2,H/2+20)}
    c.textAlign='left'}
  function g2(pr){const g=c.createLinearGradient(0,0,W,0);g.addColorStop(0,'#22d3ee');g.addColorStop(1,'#7c5cff');c.fillStyle=g;c.beginPath();c.roundRect(12,H-22,Math.max(10,(W-24)*pr),10,5);c.fill()}
  requestAnimationFrame(frame);
})}
