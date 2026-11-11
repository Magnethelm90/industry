/* 3D-Lieferfahrt: Du steuerst den LKW selbst über die Landstraße zum Markt.
   Gleiche Regeln und gleiche Abrechnung wie die 2D-Fahrt (Zustand der Ladung in %, Münzen); Ergebnis {integ, coins} oder null bei Abbruch. */
import {BoxGeometry,CanvasTexture,CircleGeometry,Color,ConeGeometry,CylinderGeometry,DirectionalLight,Fog,Group,HemisphereLight,Mesh,MeshBasicMaterial,MeshLambertMaterial,
  PerspectiveCamera,PlaneGeometry,RepeatWrapping,Scene,SRGBColorSpace,InstancedMesh,Object3D,SphereGeometry} from 'three';
import {SFX,motor,vib} from '../fx.js';
import {dayPhase,weather} from '../world.js';

const LANE=3.7,MAXX=4.7,ROADW=11.5,FAR=260,STEP=450;
const DMG={cone:15,barrier:25,boulder:25,car:30},HITW={cone:.9,barrier:2.7,boulder:2,car:2,coin:1.7};
const lam=(c,o={})=>new MeshLambertMaterial({color:c,...o});
const box=(w,h,d,c,x=0,y=0,z=0)=>{const m=new Mesh(new BoxGeometry(w,h,d),typeof c==='string'?lam(c):c);m.position.set(x,y,z);return m};

function roadTex(){
  const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');x.fillStyle='#59606e';x.fillRect(0,0,256,256);
  for(let i=0;i<500;i++){x.fillStyle=`rgba(${Math.random()<.5?255:0},${Math.random()<.5?255:0},255,.04)`;x.fillRect(Math.random()*256,Math.random()*256,3,3)}
  x.fillStyle='#f8fafc';x.fillRect(8,0,7,256);x.fillRect(241,0,7,256);            // Randlinien
  x.fillStyle='#fde68a';for(const lx of [256/3,512/3]){x.fillRect(lx-3,0,6,110)} // gestrichelte Spurlinien
  const t=new CanvasTexture(c);t.wrapS=t.wrapT=RepeatWrapping;t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t}
function grassTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#74c653';x.fillRect(0,0,128,128);
  for(let i=0;i<260;i++){x.fillStyle=`hsla(${88+Math.random()*30},55%,${42+Math.random()*18}%,.35)`;x.beginPath();x.arc(Math.random()*128,Math.random()*128,2+Math.random()*6,0,7);x.fill()}
  const t=new CanvasTexture(c);t.wrapS=t.wrapT=RepeatWrapping;t.colorSpace=SRGBColorSpace;return t}
function car(col){const g=new Group();g.add(box(1.9,.7,4,col,0,.75,0),box(1.7,.7,2.1,'#dbeafe',0,1.4,.2),box(1.75,.2,2.2,col,0,1.85,.2));
  for(const sx of [-.95,.95])for(const sz of [-1.3,1.3]){const w=new Mesh(new CylinderGeometry(.38,.38,.3,10),lam('#16181d'));w.rotation.z=Math.PI/2;w.position.set(sx,.38,sz);g.add(w)}
  g.add(box(.4,.2,.1,new MeshBasicMaterial({color:'#ef4444'}),-.6,.85,2.02),box(.4,.2,.1,new MeshBasicMaterial({color:'#ef4444'}),.6,.85,2.02));return g}
function cone(){const g=new Group();const c=new Mesh(new ConeGeometry(.42,1.1,10),lam('#f97316'));c.position.y=.6;g.add(c,box(.9,.1,.9,'#f97316',0,.05,0));
  const s=new Mesh(new CylinderGeometry(.27,.33,.2,10),lam('#f8fafc'));s.position.y=.55;g.add(s);return g}
function barrier(){const g=new Group();for(let i=0;i<5;i++)g.add(box(.56,.6,.25,i%2?'#f8fafc':'#ef4444',-1.12+i*.56,1.05,0));g.add(box(.2,1.4,.5,'#475569',-1.2,.7,0),box(.2,1.4,.5,'#475569',1.2,.7,0));
  const l=new Mesh(new CylinderGeometry(.14,.14,.2,8),new MeshBasicMaterial({color:'#fbbf24'}));l.position.set(0,1.5,0);g.add(l);return g}

export function drive3d(env,route,load){return new Promise(res=>{
  const {renderer,root,M}=env,ph=dayPhase(),night=ph==='night';
  const wx=window.__w3dWx||weather()?.k,wet=wx==='rain'||wx==='storm',snow=wx==='snow',slip=wet||snow,dim=wet?(wx==='storm'?.62:.78):snow?.92:1;
  const SKY0={night:'#26356e',dawn:'#ffc59a',day:'#8fd0ff',dusk:'#ff9a66'}[ph],SKY=wet?new Color(SKY0).lerp(new Color('#7b8494'),.65).getStyle():snow?new Color(SKY0).lerp(new Color('#e8eef6'),.6).getStyle():wx==='fog'?'#cfd6dd':SKY0,LI=({night:.62,dawn:.85,day:1,dusk:.85}[ph])*dim;
  const scene=new Scene();scene.background=new Color(SKY);scene.fog=new Fog(SKY,wx==='fog'?18:wet?45:70,wx==='fog'?95:FAR);
  // Kurven: die Straße schlängelt sich; r(dz) ist die seitliche Verschiebung in dz Metern Entfernung relativ zum LKW
  const AMP=route.id==='hafen'?1.25:.8,cv=d=>AMP*(7*Math.sin(d/85)+4*Math.sin(d/38+1.3));let curvePos=0;const r=dz=>cv(curvePos+dz)-cv(curvePos);
  const bent=[];const bend=(geo,mesh)=>{bent.push({geo,mesh,bx:Float32Array.from(geo.attributes.position.array.filter((_,i)=>i%3===0))})};
  const bendUpdate=()=>{for(const b of bent){const pa=b.geo.attributes.position;for(let i=0;i<pa.count;i++){const dz=-(b.mesh.position.z-pa.getY(i));pa.setX(i,b.bx[i]+r(dz))}pa.needsUpdate=true}};
  scene.add(new HemisphereLight(night?'#8fa3e8':'#ffffff',night?'#34503a':'#8fcf6a',.95*LI+.3));
  const sun=new DirectionalLight(night?'#aebfff':'#fff4dc',1.4*LI+.2);sun.position.set(-12,24,10);scene.add(sun);
  const cam=new PerspectiveCamera(58,innerWidth/innerHeight,.1,400);
  const fit=()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()};addEventListener('resize',fit);
  // Straße und Wiese laufen als Band unter dem LKW durch (die Textur wandert)
  const rt=roadTex();rt.repeat.set(1,FAR/12);const road=new Mesh(new PlaneGeometry(ROADW,FAR+40,1,70),lam('#ffffff',{map:rt}));road.rotation.x=-Math.PI/2;road.position.set(0,.02,-FAR/2+20);scene.add(road);bend(road.geometry,road);
  const gt=grassTex();gt.repeat.set(30,FAR/8);const grass=new Mesh(new PlaneGeometry(260,FAR+40),lam(snow?'#f1f5f9':'#ffffff',{map:gt}));grass.rotation.x=-Math.PI/2;grass.position.set(0,0,-FAR/2+20);scene.add(grass);
  for(const s of [-1,1]){const sh=new Mesh(new PlaneGeometry(1.6,FAR+40,1,70),lam('#d9c39a'));sh.rotation.x=-Math.PI/2;sh.position.set(s*(ROADW/2+.8),.015,-FAR/2+20);scene.add(sh);bend(sh.geometry,sh)}
  // Hafenstrecke: links liegt das Meer
  if(route.id==='hafen'){const sea=new Mesh(new PlaneGeometry(200,FAR+40,1,70),lam('#3aa7e0'));sea.rotation.x=-Math.PI/2;sea.position.set(-(34+100),.03,-FAR/2+20);scene.add(sea);bend(sea.geometry,sea)}
  // Hügel am Horizont
  for(let i=0;i<10;i++){const s=26+Math.random()*26,h=new Mesh(new CircleGeometry(s,18),new MeshBasicMaterial({color:['#6fbf5a','#5fae52','#7ccd62'][i%3],fog:true}));h.position.set(-170+i*38,-s*.45,-FAR+12);scene.add(h)}
  // Landschaft am Straßenrand: wandert mit und wird vorn wieder eingesetzt
  // Am Meer stehen links keine Bäume
  const decoX=side=>route.id==='hafen'&&side<0?(ROADW/2+14+Math.random()*10)*-1:side*(ROADW/2+4+Math.random()*34);
  const deco=[],kinds=['pine','oak','pine','bush','rock','oak','lamp'];
  for(let i=0;i<46;i++){const k=kinds[i%kinds.length],o=M[k].clone(true),side=i%2?1:-1;
    const x=k==='lamp'?side*(ROADW/2+1.6):decoX(side);o.position.set(x,0,-Math.random()*FAR);o.rotation.y=k==='lamp'?(side>0?Math.PI:0):Math.random()*6.28;o.scale.setScalar(k==='lamp'?1:.9+Math.random()*.8);scene.add(o);deco.push({o,lamp:k==='lamp',bx:x})}
  if(route.id==='hafen')for(let i=0;i<22;i++){const o=new Group(),cols=['#ef4444','#2563eb','#f59e0b','#16a34a','#f8fafc'];for(let k=0;k<1+i%3;k++)o.add(box(5.6,2.6,2.4,cols[(i+k*2)%5],0,1.3+k*2.6,0));o.position.set(-(ROADW/2+5+Math.random()*7),0,-Math.random()*FAR);o.rotation.y=Math.random()*.3-.15;scene.add(o);deco.push({o,lamp:false,bx:o.position.x,fix:1})}
  // LKW mit Schatten
  const truck=M.truck.clone(true);truck.rotation.y=Math.PI;scene.add(truck);
  const shadow=new Mesh(new CircleGeometry(2.2,20),new MeshBasicMaterial({color:'#000',transparent:true,opacity:.28}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(.8,1.7,1);shadow.position.y=.04;scene.add(shadow);
  // Ziel: Torbogen, erscheint am Ende der Strecke
  const gate=new Group();gate.add(box(.8,7,.8,'#f8fafc',-ROADW/2-.6,3.5,0),box(.8,7,.8,'#f8fafc',ROADW/2+.6,3.5,0),box(ROADW+2.4,1.6,.9,route.c||'#22d3ee',0,7,0));
  for(let i=0;i<10;i++)gate.add(box(1.2,.8,.95,i%2?'#111827':'#f8fafc',-ROADW/2+.6+i*1.2,5.9,0));
  for(let i=0;i<6;i++){const h=5+Math.random()*9;gate.add(box(5,h,5,['#cbd5e1','#fde68a','#bfdbfe','#fecaca'][i%4],(i%2?1:-1)*(12+Math.floor(i/2)*7),h/2,-10-Math.random()*14))}
  gate.visible=false;scene.add(gate);
  const coinGeo=new CylinderGeometry(.55,.55,.14,16),coinMat=lam('#fbbf24',{emissive:'#b45309',emissiveIntensity:.5});
  const v0=route.speed/170*26,L=Math.round(v0*route.T);
  let pos=0,v=v0*.55,px=0,tx=0,t=0,integ=100,coins=0,inv=0,shake=0,over=null,overT=0,running=false,ended=false,objs=[],nextRow=110,lastFree=0,rows=0,bump=0;
  const lanes=[-LANE,0,LANE],near=x=>lanes.reduce((a,b)=>Math.abs(b-x)<Math.abs(a-x)?b:a);
  const add=(k,lx,d,o,extra={})=>{o.position.set(lx,0,-200);scene.add(o);objs.push({k,lx,d,o,hit:0,...extra})};
  const mkOb=k=>k==='cone'?cone():k==='barrier'?barrier():k==='boulder'?(()=>{const r=M.rock.clone(true);r.scale.setScalar(1.25);return r})():car(['#ef4444','#22c55e','#a855f7','#f59e0b','#0ea5e9'][Math.floor(Math.random()*5)]);
  // Hindernisreihen: Eine Spur bleibt immer frei; dazwischen liegen Münzen auf der freien Spur
  function row(d){
    const free=Math.random()<.6?lanes[Math.floor(Math.random()*3)]:lastFree,hard=Math.min(1,rows/14);
    for(const ln of lanes){if(ln===free)continue;if(Math.random()<.55+hard*.35){const r=Math.random(),k=r<.3?'cone':r<.52?'barrier':r<.7?'boulder':'car';
      add(k,ln,d,mkOb(k),k==='car'?{sp:v0*.45}:{})}}
    for(let i=0;i<4;i++){const c=new Mesh(coinGeo,coinMat);c.rotation.x=Math.PI/2;add('coin',free,d-34+i*6,c)}
    lastFree=free;rows++}
  // Regen oder Schnee: Streifen bzw. Flocken um die Kamera
  let rain=null,rainStep=()=>{};
  if(wet||snow){const N=wet?300:200,sx=()=>(Math.random()-.5)*36,sz=()=>-Math.random()*40+8,dr=[];for(let i=0;i<N;i++)dr.push({x:sx(),y:Math.random()*22,z:sz()});
    rain=new InstancedMesh(wet?new BoxGeometry(.05,1.3,.05):new SphereGeometry(.1,5,4),new MeshBasicMaterial({color:wet?'#cfe3ff':'#ffffff',transparent:true,opacity:wet?.6:.9,fog:false}),N);rain.frustumCulled=false;scene.add(rain);
    const o=new Object3D();
    rainStep=dt=>{dr.forEach((d,i)=>{d.y-=(wet?30:3.2)*dt;if(d.y<0){d.y=22;d.x=sx();d.z=sz()}
      o.position.set(d.x+cam.position.x+(snow?Math.sin(t*1.5+i)*.4:0),d.y,d.z);o.rotation.x=wet?.25:0;o.updateMatrix();rain.setMatrixAt(i,o.matrix)});rain.instanceMatrix.needsUpdate=true}}
  // Anzeige
  const ui=document.createElement('div');ui.className='w3g';
  ui.innerHTML=`<div class="w3gp"><b>Fahrt · ${route.n}</b><div class="w3gs" id="d3s">Zustand 100 % · 🪙 0</div><div class="timer"><i id="d3m" style="width:100%"></i></div></div>
    <div class="w3gate" id="d3g"><div class="gt">🚚 Fahrt · ${route.n}</div><div class="gh">Zieh den Finger nach <b>links und rechts</b>, um zu lenken – oder tippe links bzw. rechts für einen Spurwechsel. Weich Hütchen, Sperren, Felsen und Autos aus und sammle <b>Münzen</b>. Jeder Treffer beschädigt die Ladung.${wet?' 🌧️ Bei Regen ist die Straße rutschig: Der LKW lenkt träger.':snow?' ❄️ Bei Schnee ist die Straße rutschig: Der LKW lenkt träger.':''}</div><button class="btn a big" id="d3go">▶ Los!</button><button class="btn sm ghost" id="d3b">Zurück</button></div>
    <div class="d3flash" id="d3f"></div>`;
  root.appendChild(ui);root.classList.add('ingame');
  const $=id=>ui.querySelector('#'+id);
  let eng=null,drag=null;
  const lane=d=>{tx=Math.max(-LANE,Math.min(LANE,near(tx)+d*LANE));SFX.tick()};
  const key=e=>{if(!running)return;if(e.key==='ArrowLeft'||e.code==='KeyA')lane(-1);if(e.key==='ArrowRight'||e.code==='KeyD')lane(1)};
  addEventListener('keydown',key);
  const hud=()=>{$('d3s').textContent=`Zustand ${Math.max(0,integ)} % · 🪙 ${coins}`;$('d3m').style.width=Math.max(0,1-pos/L)*100+'%'};
  function close(r){
    if(ended)return;ended=true;running=false;removeEventListener('keydown',key);removeEventListener('resize',fit);eng&&eng.stop();
    // nur eigene Grundformen freigeben – die Modelle teilen ihre Geometrie mit der Welt
    scene.traverse(o=>{if(o.geometry&&o.geometry.type!=='BufferGeometry')o.geometry.dispose()});rt.dispose();gt.dispose();
    ui.remove();root.classList.remove('ingame');env.setDrive(null);delete window.__w3dDriveState;res(r)}
  const D={scene,cam,
    down(e){if(!running||over)return;drag={x:e.clientX,tx,t:performance.now(),moved:false}},
    move(e){if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>8)drag.moved=true;if(drag.moved)tx=Math.max(-MAXX,Math.min(MAXX,drag.tx+dx/innerWidth*15))},
    up(e){if(drag&&!drag.moved&&performance.now()-drag.t<350)lane(e.clientX<innerWidth/2?-1:1);drag=null},
    update(dt){
      t+=dt;
      if(running&&!over){
        v+=(v0*(1+Math.min(1,pos/L)*.25)-v)*Math.min(1,dt*.8);pos+=v*dt;inv=Math.max(0,inv-dt);
        px+=(tx-px)*Math.min(1,dt*(slip?4.8:7));
        while(nextRow<L-90&&nextRow<pos+FAR){row(nextRow);nextRow+=Math.max(46,v*1.9)+Math.random()*16}
        for(const o of objs){if(o.sp)o.d+=o.sp*dt;if(o.hit)continue;const dz=o.d-pos;
          if(Math.abs(dz)<(o.k==='coin'?2.2:o.k==='car'?3.6:2.4)&&Math.abs(o.lx-px)<(HITW[o.k]/2+1.05)){
            if(o.k==='coin'){o.hit=1;o.gone=1;coins++;SFX.coin();vib(10);continue}
            if(inv>0)continue;
            o.hit=1;o.hx=o.lx<px?-1:1;o.ht=0;integ-=DMG[o.k];inv=1.2;shake=.5;v*=.6;bump=1;SFX.crash();vib([70,40,70]);
            const f=$('d3f');f.classList.remove('on');void f.offsetWidth;f.classList.add('on');
            if(integ>0)tx=Math.max(-MAXX,Math.min(MAXX,tx+(o.lx<=px?1.4:-1.4)))}}
        if(eng)eng.set(Math.min(1,v/(v0*1.25)));
        hud();
        if(pos>=L||integ<=0){over=integ<=0?'wreck':'ok';overT=0;eng&&eng.stop();if(over==='ok')SFX.win();$('d3s').textContent=over==='ok'?`Angekommen! Zustand ${integ} % · 🪙 ${coins}`:'Totalschaden 💥'}}
      if(over){overT+=dt;v*=Math.pow(.2,dt);pos+=v*dt;if(overT>1.4)return close({integ:Math.max(0,integ),coins})}
      // Band unter den Rädern, Landschaft, Hindernisse
      const mv=(running?v:v0*.25)*dt;rt.offset.y+=mv/12;gt.offset.y+=mv/8;
      curvePos=pos;bendUpdate();
      for(const d of deco){d.o.position.z+=mv;if(d.o.position.z>18){d.o.position.z-=FAR+10;if(!d.lamp&&!d.fix)d.bx=decoX(Math.sign(d.bx))}d.o.position.x=d.bx+r(-d.o.position.z)}
      for(const o of objs){const dz=o.d-pos;o.o.position.z=-dz;
        const cr=r(dz);
        if(o.k==='coin'){o.o.rotation.z+=dt*4;o.o.position.y=1.2+Math.sin(t*4+o.d)*.15;o.o.position.x=o.lx+cr}
        else if(o.hit){o.ht+=dt;o.o.position.x=o.lx+cr+o.hx*o.ht*9;o.o.position.y=Math.max(0,o.ht*6-o.ht*o.ht*9);o.o.rotation.z=-o.hx*o.ht*5}
        else o.o.position.x=o.lx+cr;
        o.o.visible=!o.gone&&dz>-14&&dz<FAR}
      objs=objs.filter(o=>{if(o.d-pos<-16){scene.remove(o.o);return false}return true});
      gate.visible=L-pos<FAR;gate.position.z=-(L-pos)-6;gate.position.x=r(L-pos+6);
      bump=Math.max(0,bump-dt*3);
      truck.position.set(px,Math.abs(Math.sin(t*18))*.04+bump*.15,0);truck.rotation.z=(tx-px)*-.05;truck.rotation.y=Math.PI+(tx-px)*-.06;
      truck.visible=!(inv>0&&Math.floor(t*14)%2)||!!over;shadow.position.set(px,.04,0);
      shake*=Math.pow(.02,dt);
      cam.position.set(px*.55+(Math.random()-.5)*shake,8.2+(Math.random()-.5)*shake,14.5);cam.lookAt(px*.75+r(30)*.4,1.2,-16);rain&&rainStep(dt)}};
  env.setDrive(D);
  $('d3b').onclick=()=>close(null);
  $('d3go').onclick=()=>{const g=$('d3g');let n=3;g.classList.add('count');
    const show=()=>{if(ended)return;if(n===0){g.remove();running=true;eng=motor();SFX.good();return}g.innerHTML=`<div class="cd">${n}</div>`;SFX.tick();n--;setTimeout(show,STEP)};show()};
  // Für automatische Tests: Lage des LKW und der Hindernisse
  window.__w3dDriveState=()=>({lane:LANE,px,tx,v,pos,L,over,running,ended,integ,coins,objs:objs.filter(o=>!o.hit).map(o=>({k:o.k,lx:o.lx,dz:o.d-pos}))});
})}
