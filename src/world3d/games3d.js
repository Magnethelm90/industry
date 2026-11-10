/* 3D-Minispiele: laufen direkt in der Welt an der jeweiligen Station (statt des 2D-Fensters).
   Jedes Spiel bekommt einen Kontext c (Szene, Kamera, Hilfen) und meldet am Ende c.finish(Score 0..1). */
import {BoxGeometry,Color,CylinderGeometry,Group,IcosahedronGeometry,Mesh,MeshBasicMaterial,MeshLambertMaterial,PointLight,Raycaster,Vector2,Vector3} from 'three';
import {SFX,vib} from '../fx.js';
import {G} from '../data.js';

const lam=(c,e,ei=1)=>new MeshLambertMaterial({color:c,emissive:e||'#000000',emissiveIntensity:e?ei:0});
const mk=(geo,mat,x=0,y=0,z=0)=>{const m=new Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m};
const box=(w,h,d,c,x,y,z,e)=>mk(new BoxGeometry(w,h,d),typeof c==='string'?lam(c,e):c,x,y,z);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const STEP=450; // ms je Zahl beim Herunterzählen

/* ---------- Erzrausch (Minen): Adern leuchten im Fels auf – antippen, bevor sie verschwinden. Gold zählt dreifach, Dynamit kostet Punkte. */
function gMine(c){
  const D=20,ore=c.s.tint?c.s.tint.ore:'#c2603a';
  const look=c.L(0,3.2,1),camPos=c.view(c.L(0,6,17),look,4.3).clone();
  c.hero.position.copy(c.L(-3.4,0,7.6));c.hero.rotation.y=c.s.ry+Math.PI;
  // Mögliche Stellen: Strahlen von der Spielkamera auf den Fels
  const tc=c.cam.clone();tc.position.copy(camPos);tc.lookAt(look);tc.updateMatrixWorld(true);tc.updateProjectionMatrix();
  const rc=new Raycaster(),cands=[];c.s.g.updateMatrixWorld(true);
  for(let gx=-.82;gx<=.82;gx+=.2)for(let gy=-.12;gy<=.6;gy+=.16){
    rc.setFromCamera(new Vector2(gx+(Math.random()-.5)*.08,gy+(Math.random()-.5)*.06),tc);const h=rc.intersectObject(c.s.g,true)[0];
    if(h&&h.face&&/rock|6b7280/.test(h.object.material.name||'')){const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);cands.push({p:h.point.clone().addScaledVector(n,.18),busy:0})}}
  if(cands.length<6)for(let i=0;i<8;i++)cands.push({p:c.L(-4+i*1.15,2+(i%3)*.9,4.9),busy:0});
  const geo=new IcosahedronGeometry(.5,0),tntGeo=new CylinderGeometry(.3,.3,.75,10);
  const nodes=[];let t=0,next=.4,pts=0,total=0,combo=0,best=0,over=false;
  const spawn=()=>{
    const free=cands.filter(k=>!k.busy);if(!free.length)return;const k=free[Math.floor(Math.random()*free.length)],r=Math.random();
    const kind=r<.16?'tnt':r<.28?'gold':'ore';
    const m=kind==='tnt'?mk(tntGeo,lam('#ef4444','#7f1d1d',.6)):mk(geo,lam(kind==='gold'?'#fde047':ore,kind==='gold'?'#f59e0b':ore,kind==='gold'?.9:.6));
    if(kind!=='tnt'){const halo=new Mesh(geo,new MeshBasicMaterial({color:kind==='gold'?'#fff7c2':'#ffffff',side:1}));halo.scale.setScalar(1.3);m.add(halo)}
    m.position.copy(k.p);m.scale.setScalar(.01);m.rotation.set(Math.random()*3,Math.random()*3,0);c.world.add(m);k.busy=1;
    if(kind!=='tnt')total+=kind==='gold'?3:1;
    nodes.push({m,k,kind,age:0,life:Math.max(1.05,1.9-t*.035),dead:0})};
  const remove=n=>{n.dead=1;n.k.busy=0;c.world.remove(n.m)};
  c.status('0 Punkte');
  return {
    update(dt){
      if(over)return;t+=dt;c.time(1-t/D);
      if((next-=dt)<=0){spawn();if(t>6&&Math.random()<.4)spawn();next=Math.max(.34,.78-t*.02)}
      for(const n of nodes){if(n.dead)continue;n.age+=dt;const a=n.age,l=n.life;
        const s=a<.15?a/.15:a>l-.2?Math.max(0,(l-a)/.2):1;n.m.scale.setScalar((n.kind==='gold'?1.15:1)*s*(1+Math.sin(a*9)*.06));n.m.rotation.y+=dt*1.5;
        if(a>=l){if(n.kind!=='tnt'&&combo>0){combo=0}remove(n)}}
      if(t>=D){over=true;nodes.forEach(n=>!n.dead&&remove(n));
        const sc=clamp(pts/Math.max(6,total*.68));c.say(pts+' Punkte'+(best>=4?' · beste Serie '+best:''));setTimeout(()=>c.finish(sc),700)}},
    down(e){
      if(over)return;let hit=null,bd=60;
      for(const n of nodes){if(n.dead)continue;const [x,y]=c.project(n.m.position),d=Math.hypot(x-e.clientX,y-e.clientY);if(d<bd){bd=d;hit=n}}
      if(!hit){combo=0;return}
      c.swing();const p=hit.m.position.clone();
      if(hit.kind==='tnt'){pts=Math.max(0,pts-2);combo=0;SFX.crash();vib([60,30,60]);c.shake(.5);c.burst(p,'#fb923c',16,7);c.pop('💥 −2',p,'#ef4444')}
      else{const v=hit.kind==='gold'?3:1;combo++;best=Math.max(best,combo);const bonus=combo>=5&&combo%5===0?1:0;pts+=v+bonus;
        SFX.thud();(hit.kind==='gold'?SFX.perfect:SFX.good)();vib(10);c.shake(hit.kind==='gold'?.22:.1);c.burst(p,hit.kind==='gold'?'#fde047':ore,hit.kind==='gold'?14:8,5.5);
        c.pop((hit.kind==='gold'?'✨ +3':'+1')+(bonus?' · Serie +1':''),p,hit.kind==='gold'?'#fbbf24':'#fff')}
      remove(hit);c.status(pts+' Punkte'+(combo>=3?' · 🔥 Serie '+combo:''))},
    info:()=>({cands:cands.length,nodes:nodes.filter(n=>!n.dead).map(n=>({k:n.kind,p:c.project(n.m.position)})),pts}),
    dispose(){geo.dispose();tntGeo.dispose()}
  }}

/* ---------- Abstich (Schmelzofen): Formen fahren unter der Gießpfanne durch. Halten = gießen. Jede Form bis zur Marke füllen, nichts verschütten. */
function gPour(c){
  const N=6,Z=8.6,RATE=1.05;
  c.view(c.L(0,6.2,18),c.L(0,2.3,Z),2.9);
  c.hero.position.copy(c.L(-5.6,0,6.4));c.hero.rotation.y=c.s.ry+.9;
  const g=c.group;
  g.add(box(14,.3,1.7,'#475569',0,.9,Z));for(const x of [-6,-2,2,6])g.add(box(.3,.9,1.3,'#334155',x,.45,Z));
  // Gießpfanne an einem Galgen
  g.add(box(.3,5,.3,'#334155',-1.6,2.5,Z-1.3),box(2,.3,.3,'#334155',-.7,4.9,Z-1.3),box(.12,1,.12,'#1e293b',0,4.3,Z-1.3));
  const ladle=mk(new CylinderGeometry(.85,.6,1.1,14),lam('#1f2937'),0,3.6,Z);ladle.rotation.x=.25;g.add(ladle);
  const top=mk(new CylinderGeometry(.74,.74,.06,14),new MeshBasicMaterial({color:'#ff9a3d'}),0,4.13,Z+.13);top.rotation.x=.25;g.add(top);
  const stream=mk(new CylinderGeometry(.13,.1,1,8),new MeshBasicMaterial({color:'#ffb347'}),0,2.4,Z+.35);stream.visible=false;stream.castShadow=false;g.add(stream);
  const light=new PointLight('#ff8a3d',0,12,1.6);light.position.set(0,2.6,Z+1);g.add(light);
  const moulds=[];
  for(let i=0;i<N;i++){const m=new Group();m.add(box(1.5,.14,1.2,'#57534e',0,0,0),box(1.5,.8,.12,'#57534e',0,.4,.6),box(1.5,.8,.12,'#57534e',0,.4,-.6),box(.12,.8,1.2,'#57534e',.75,.4,0),box(.12,.8,1.2,'#57534e',-.75,.4,0));
    const fill=mk(new BoxGeometry(1.36,1,1.06),new MeshBasicMaterial({color:'#ff9a3d'}),0,.07,0);fill.castShadow=false;fill.scale.y=.001;m.add(fill);
    for(const z of [.67,-.67]){const mark=box(1.56,.09,.05,new MeshBasicMaterial({color:'#34d399'}),0,.07+.6,z);mark.castShadow=false;m.add(mark)}
    m.position.set(-4.2-i*3.3,1.12,Z);g.add(m);moulds.push({m,fill,f:0,q:null,over:0})}
  let hold=false,spill=0,spillT=0,done=0,sum=0,ended=false,t=0,spT=0;
  c.status('Form 1 von '+N);
  const world=(x,y,z)=>g.localToWorld(new Vector3(x,y,z));
  return {
    update(dt){
      if(ended)return;t+=dt;
      const speed=1.2+done*.06;let under=null;
      for(const o of moulds){o.m.position.x+=speed*dt;const x=o.m.position.x;
        if(o.q==null&&Math.abs(x)<.8)under=o;
        if(o.q==null&&x>.8){ // Form ist durch: bewerten
          const f=o.f;o.q=o.over?.45:f>=.82?1:f>=.6?.65:f*.7;sum+=o.q;done++;
          const p=world(x,2.4,Z);c.pop(o.over?'Übergelaufen!':o.q>=1?'Perfekt! ✨':o.q>=.65?'Geht so':'Zu wenig',p,o.q>=1?'#34d399':'#fbbf24');(o.q>=1?SFX.perfect:o.q>=.65?SFX.good:SFX.miss)();
          c.status(done<N?'Form '+(done+1)+' von '+N:'Fertig!')}
        if(o.q!=null)o.fill.material.color.lerp(new Color('#9a5b3a'),dt*.5)}
      stream.visible=hold;light.intensity=hold?30+Math.sin(t*30)*6:0;
      if(hold){
        if((spT-=dt)<=0){spT=.08;c.burst(world((Math.random()-.5)*.3,under?1.3+under.f*.6:1.15,Z+.35),'#ffd08a',2,3.2)}
        if(under){under.f+=RATE*dt;if(under.f>1.04){under.f=1.04;if(!under.over){under.over=1;SFX.miss();c.shake(.15)}}
          under.fill.scale.y=Math.max(.001,under.f*.68);under.fill.position.y=.07+under.f*.34;
          const topY=1.12+.07+under.f*.68,h=3.2-topY;stream.scale.y=h;stream.position.y=topY+h/2}
        else{spill+=dt;stream.scale.y=2.0;stream.position.y=2.2;if((spillT-=dt)<=0){spillT=.35;SFX.tick();c.pop('verschüttet',world(0,1.6,Z),'#ef4444')}}}
      c.time(1-done/N);
      if(done>=N){ended=true;const sc=clamp(sum/N-Math.min(.3,spill*.09));c.say(Math.round(sc*100)+' % sauber gegossen');setTimeout(()=>c.finish(sc),800)}},
    down(){if(!ended){hold=true;SFX.whoosh()}},up(){hold=false},
    info:()=>({moulds:moulds.map(o=>({x:o.m.position.x,f:o.f,q:o.q})),done}),
    dispose(){}
  }}

/* ---------- Kran (Ziegelei): Die Ziegellage pendelt – tippen zum Ablegen. Was übersteht, bricht ab. */
function gStack(c){
  const N=8,Z=8.6,W0=2.8,H=.5;
  c.view(c.L(0,5.5,17),c.L(0,2.8,Z),3.3);
  c.hero.position.copy(c.L(-5.2,0,7));c.hero.rotation.y=c.s.ry+.8;
  const g=c.group,cols=['#b5533a','#c96a48'];
  g.add(box(3.6,.26,2,'#8a5a2b',0,.13,Z));
  const layers=[{x:0,w:W0,y:.26+H/2}];g.add(box(W0,H,1.4,cols[0],0,layers[0].y,Z));
  // Kranarm über dem Stapel
  g.add(box(.35,9,.35,'#facc15',-5.4,4.5,Z-1.2),box(9,.3,.3,'#facc15',-1.2,8.8,Z-1.2));
  const rope=box(.06,1,.06,'#1e293b',0,6,Z);rope.castShadow=false;g.add(rope);
  let cur=null,ph=0,placed=0,over=false,drop=null,camY=2.2;
  const next=()=>{const p=layers[layers.length-1];cur=box(p.w,H,1.4,cols[layers.length%2],0,p.y+H+1.5,Z);g.add(cur);ph=Math.random()<.5?0:Math.PI};
  next();c.status('Lage 0 von '+N);
  const world=(x,y,z)=>g.localToWorld(new Vector3(x,y,z));
  const end=()=>{over=true;const lw=layers[layers.length-1].w,sc=clamp(placed/N*(.55+.45*lw/W0));c.say(placed+' von '+N+' Lagen');setTimeout(()=>c.finish(sc),800)};
  return {
    update(dt){
      if(over)return;c.time(1-placed/N);
      const p=layers[layers.length-1];
      if(drop){drop.t+=dt*4.5;const k=Math.min(1,drop.t);cur.position.y=drop.y0+(drop.y1-drop.y0)*k*k;
        if(k>=1){const dx=drop.x-p.x,ov=p.w-Math.abs(dx);
          if(ov<.3){SFX.crash();c.shake(.4);c.burst(world(drop.x,drop.y1,Z),'#b5533a',14,5);g.remove(cur);c.pop('Daneben!',world(drop.x,drop.y1+1,Z),'#ef4444');drop=null;return end()}
          const perfect=Math.abs(dx)<.16,w=perfect?p.w:ov,x=perfect?p.x:p.x+dx/2;
          cur.scale.x=w/p.w;cur.position.set(x,drop.y1,Z);layers.push({x,w,y:drop.y1});placed++;
          if(perfect){SFX.perfect();c.pop('Perfekt! ✨',world(x,drop.y1+1,Z),'#34d399');c.burst(world(x,drop.y1,Z),'#fde047',10,4)}
          else{SFX.thud();c.burst(world(p.x+Math.sign(dx)*(p.w/2+Math.abs(dx)/2),drop.y1,Z),'#b5533a',6,3.5);c.pop(Math.round(w/W0*100)+' %',world(x,drop.y1+1,Z),'#fff')}
          vib(12);c.shake(.12);drop=null;c.status('Lage '+placed+' von '+N);
          if(placed>=N)return end();
          camY=2.6+placed*H;c.view(c.L(0,5.5+placed*H,17),c.L(0,camY+.2,Z),3.3);next()}
        return}
      ph+=dt*(1.7+placed*.2);cur.position.x=Math.sin(ph)*2.6;
      rope.position.x=cur.position.x;const top=8.65,by=cur.position.y+H/2;rope.scale.y=top-by;rope.position.y=(top+by)/2},
    down(){if(over||drop||!cur)return;const p=layers[layers.length-1];drop={t:0,x:cur.position.x,y0:cur.position.y,y1:p.y+H};SFX.tick()},
    info:()=>({x:cur?cur.position.x:0,tx:layers[layers.length-1].x,drop:!!drop,placed,over}),
    dispose(){}
  }}

/* ---------- Fließband (Montage): Teile fahren vorbei. Tippe immer das Teil an, das der Bauplan gerade verlangt. */
const PARTS={
  gear:{n:'Zahnrad',c:'#fbbf24',mk:()=>{const m=mk(new CylinderGeometry(.55,.55,.24,8),lam('#fbbf24'));return m}},
  pipe:{n:'Rohr',c:'#38bdf8',mk:()=>{const m=mk(new CylinderGeometry(.22,.22,1.15,10),lam('#38bdf8'));m.rotation.x=Math.PI/2;return m}},
  plate:{n:'Blech',c:'#cbd5e1',mk:()=>mk(new BoxGeometry(1,.14,.8),lam('#cbd5e1'))},
  bolt:{n:'Schraube',c:'#f472b6',mk:()=>{const g=new Group();g.add(mk(new CylinderGeometry(.16,.16,.6,6),lam('#f472b6'),0,.1,0),mk(new CylinderGeometry(.3,.3,.18,6),lam('#db2777'),0,.48,0));return g}},
  junk:{n:'Schrott',c:'#57534e',mk:()=>mk(new IcosahedronGeometry(.42,0),lam('#57534e'))}
};
function gAssemble(c){
  const N=8,D=34,Z=8.6,KEYS=['gear','pipe','plate','bolt'];
  c.view(c.L(0,6.4,18),c.L(.4,1.7,Z+.4),3.4);
  c.hero.position.copy(c.L(-5.8,0,6.6));c.hero.rotation.y=c.s.ry+.9;
  const g=c.group;
  g.add(box(14,.3,1.6,'#475569',0,.9,Z));for(const x of [-6,-2,2,6])g.add(box(.3,.9,1.2,'#334155',x,.45,Z));
  g.add(box(2.2,.3,2.2,'#334155',2.4,.15,Z+2.4)); // Sockel der entstehenden Maschine
  const plan=Array.from({length:N},()=>KEYS[Math.floor(Math.random()*4)]);
  const items=[];let idx=0,strikes=0,t=0,next=.2,over=false;
  const show=()=>c.status(plan.map((k,i)=>`<i class="w3chip${i<idx?' ok':i===idx?' cur':''}" style="--c:${PARTS[k].c}">${i<idx?'✓':PARTS[k].n}</i>`).join(''),true);
  show();
  const end=()=>{over=true;const sc=clamp(idx/N-strikes*.07);c.say(idx>=N?'Maschine fertig! ⚙️':idx+' von '+N+' Teilen');setTimeout(()=>c.finish(sc),800)};
  return {
    update(dt){
      if(over)return;t+=dt;c.time(1-t/D);
      if((next-=dt)<=0){next=.72;const k=Math.random()<.45?plan[idx]:[...KEYS,'junk'][Math.floor(Math.random()*5)],m=PARTS[k].mk();m.position.set(-5.5,1.25,Z);g.add(m);items.push({m,k,st:'belt',v:0,t:0})}
      for(const o of items){
        if(o.st==='belt'){o.m.position.x+=(2.1+idx*.08)*dt;o.m.rotation.y+=dt*.8;if(o.m.position.x>5.2){o.st='gone';g.remove(o.m)}}
        else if(o.st==='fly'){o.t+=dt*2.6;const k=Math.min(1,o.t);o.m.position.lerpVectors(o.from,o.to,k);o.m.position.y+=Math.sin(k*Math.PI)*2.2;if(k>=1)o.st='built'}
        else if(o.st==='fall'){o.v-=18*dt;o.m.position.y+=o.v*dt;o.m.position.z+=3*dt;o.m.rotation.x+=dt*7;if(o.m.position.y<-1){o.st='gone';g.remove(o.m)}}}
      if(t>=D)end()},
    down(e){
      if(over)return;let hit=null,bd=62;const w=new Vector3();
      for(const o of items){if(o.st!=='belt')continue;o.m.getWorldPosition(w);const [x,y]=c.project(w),d=Math.hypot(x-e.clientX,y-e.clientY);if(d<bd){bd=d;hit=o}}
      if(!hit)return;hit.m.getWorldPosition(w);c.swing();
      if(hit.k===plan[idx]){hit.st='fly';hit.t=0;hit.from=hit.m.position.clone();hit.to=new Vector3(2.4+((idx%2)-.5)*.5,.5+idx*.3,Z+2.4);idx++;
        SFX.good();vib(10);c.burst(w.clone(),PARTS[hit.k].c,6,4);c.pop('✓ '+PARTS[hit.k].n,w,'#34d399');show();if(idx>=N)end()}
      else{strikes++;hit.st='fall';hit.v=4;SFX.err();vib([40,30,40]);c.shake(.2);c.pop('✗ falsch',w,'#ef4444')}},
    info:()=>{const w=new Vector3();return {need:plan[idx],idx,strikes,items:items.filter(o=>o.st==='belt').map(o=>{o.m.getWorldPosition(w);return {k:o.k,p:c.project(w)}})}},
    dispose(){}
  }}

const DEF={
  erz:{f:gMine,t:'Erzrausch',h:'Im Fels leuchten Erzadern auf. Tippe sie an, bevor sie verschwinden. <b>Gold</b> zählt dreifach, Finger weg vom <b>roten Dynamit</b>!'},
  kohle:{f:gMine,t:'Kohlerausch',h:'Im Fels tauchen Kohlebrocken auf. Tippe sie an, bevor sie verschwinden. <b>Gold</b> zählt dreifach, Finger weg vom <b>roten Dynamit</b>!'},
  lehm:{f:gMine,t:'Lehmgrube',h:'Im Hang tauchen Lehmklumpen auf. Tippe sie an, bevor sie verschwinden. <b>Gold</b> zählt dreifach, Finger weg vom <b>roten Dynamit</b>!'},
  stahl:{f:gPour,t:'Abstich',h:'Die Formen fahren unter der Gießpfanne durch. <b>Halte gedrückt</b>, um zu gießen, und fülle jede Form bis zur grünen Marke. Nichts verschütten, nichts überlaufen lassen!'},
  ziegel:{f:gStack,t:'Ziegelkran',h:'Die Ziegellage pendelt am Kran. <b>Tippe</b>, um sie abzulegen. Was übersteht, bricht ab – genau getroffen bleibt sie ganz. 8 Lagen.'},
  maschine:{f:gAssemble,t:'Fließband',h:'Oben steht der Bauplan. Tippe auf dem Band immer das Teil an, das gerade <b>hervorgehoben</b> ist. Falsche Teile und Schrott kosten Punkte.'}
};
export const has3d=id=>!!DEF[id];

// Startet das 3D-Spiel der Station. env kommt aus der Welt (Szene, Kamera, Figur …). Ergebnis: Score 0..1 oder null bei Abbruch.
export function play3d(env,s){return new Promise(res=>{
  const d=DEF[s.id],{scene,cam,root}=env;
  const group=new Group();group.position.set(s.at[0],0,s.at[1]);group.rotation.y=s.ry;scene.add(group);
  const world=new Group();scene.add(world);
  // Splitter: fester Vorrat an kleinen Brocken mit Schwerkraft
  const cg=new IcosahedronGeometry(.13,0),chunks=Array.from({length:44},()=>{const m=new Mesh(cg,new MeshLambertMaterial({color:'#fff'}));m.visible=false;world.add(m);return {m,v:new Vector3(),l:0}});
  let ci=0,ended=false;
  const ui=document.createElement('div');ui.className='w3g';
  ui.innerHTML=`<div class="w3gp"><button class="x" id="w3gx">✕</button><b id="w3gt">${d.t} · ${G[s.id]?G[s.id].n:s.n}</b><div class="w3gs" id="w3gs"></div><div class="timer"><i id="w3gm" style="width:100%"></i></div></div>
    <div class="w3gate" id="w3gg"><div class="gt">${d.t}</div><div class="gh">${d.h}</div><button class="btn a big" id="w3go">▶ Los!</button><button class="btn sm ghost" id="w3gb">Zurück</button></div>`;
  root.appendChild(ui);
  const $=id=>ui.querySelector('#'+id);
  const c={scene,cam,s,group,world,hero:env.hero,
    L:(x,y,z)=>{const a=s.ry;return new Vector3(s.at[0]+x*Math.cos(a)+z*Math.sin(a),y,s.at[1]-x*Math.sin(a)+z*Math.cos(a))},
    // Kamera so weit zurück, dass die halbe Breite hw (Meter) auch im Hochformat ins Bild passt
    view:(p,l,hw=4)=>{const d=p.clone().sub(l),need=hw/(Math.tan(cam.fov*Math.PI/360)*cam.aspect);if(d.length()<need)d.setLength(need);G3.camPos.copy(l).add(d);G3.camLook.copy(l);return G3.camPos},
    project:v=>{const p=v.clone().project(cam);return [(p.x+1)/2*innerWidth,(1-p.y)/2*innerHeight]},
    pop:(txt,v,col='#fff')=>{const [x,y]=c.project(v),e=document.createElement('div');e.className='w3pop';e.textContent=txt;e.style.cssText=`left:${x}px;top:${y}px;color:${col}`;root.appendChild(e);setTimeout(()=>e.remove(),850)},
    burst:(p,col,n=8,sp=5)=>{for(let i=0;i<n;i++){const k=chunks[ci++%chunks.length];k.m.material.color.set(col);k.m.position.copy(p);k.m.visible=true;k.l=.9+Math.random()*.4;
      k.v.set((Math.random()-.5)*sp,Math.random()*sp*.9+1.5,(Math.random()-.2)*sp)}},
    shake:a=>{G3.shake=Math.max(G3.shake,a)},swing:()=>env.swing(),
    status:(t,html)=>{const e=$('w3gs');if(html)e.innerHTML=t;else e.textContent=t},
    say:t=>{const e=$('w3gs');e.textContent=t;e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop')},
    time:v=>{$('w3gm').style.width=clamp(v)*100+'%'},
    finish:sc=>close(sc)};
  const G3={camPos:new Vector3(),camLook:new Vector3(),shake:0,running:false,
    update(dt){
      for(const k of chunks){if(!k.m.visible)continue;k.l-=dt;k.v.y-=16*dt;k.m.position.addScaledVector(k.v,dt);k.m.rotation.x+=dt*8;if(k.m.position.y<.1){k.m.position.y=.1;k.v.multiplyScalar(.4);k.v.y=Math.abs(k.v.y)*.5}if(k.l<=0)k.m.visible=false}
      if(this.running)game.update(dt)},
    down(e){if(this.running&&game.down)game.down(e)},up(e){if(this.running&&game.up)game.up(e)}};
  const game=d.f(c);
  env.setGame(G3);
  function close(sc){
    if(ended)return;ended=true;G3.running=false;env.setGame(null);game.dispose&&game.dispose();
    [group,world].forEach(gr=>{gr.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});scene.remove(gr)});
    ui.remove();res(sc)}
  $('w3gx').onclick=()=>close(null);$('w3gb').onclick=()=>close(null);
  $('w3go').onclick=()=>{const gate=$('w3gg');let n=3;gate.classList.add('count');
    const show=()=>{if(ended)return;if(n===0){gate.remove();G3.running=true;SFX.good();return}gate.innerHTML=`<div class="cd">${n}</div>`;SFX.tick();n--;setTimeout(show,STEP)};show()};
  // Für automatische Tests
  window.__w3dGame=()=>({id:s.id,running:G3.running,ended,info:game.info?game.info():null});
})}
