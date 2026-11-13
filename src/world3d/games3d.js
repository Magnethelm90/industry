/* 3D-Minispiele: laufen direkt in der Welt an der jeweiligen Station (statt des 2D-Fensters).
   Jedes Spiel bekommt einen Kontext c (Szene, Kamera, Hilfen) und meldet am Ende c.finish(Score 0..1). */
import {BoxGeometry,Color,CylinderGeometry,Group,IcosahedronGeometry,Mesh,MeshBasicMaterial,MeshLambertMaterial,Plane,PointLight,Raycaster,SphereGeometry,Vector2,Vector3} from 'three';
import {SFX,tone,vib} from '../fx.js';
import {G} from '../data.js';
import {S,diff,unl} from '../state.js';
import {FISH} from '../games/fish.js';
import {dayPhase,wxIs} from '../world.js';

const lam=(c,e,ei=1)=>new MeshLambertMaterial({color:c,emissive:e||'#000000',emissiveIntensity:e?ei:0});
const mk=(geo,mat,x=0,y=0,z=0)=>{const m=new Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m};
const box=(w,h,d,c,x,y,z,e)=>mk(new BoxGeometry(w,h,d),typeof c==='string'?lam(c,e):c,x,y,z);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const STEP=450; // ms je Zahl beim Herunterzählen

/* ---------- Erzrausch (Minen): Adern leuchten im Fels auf – antippen, bevor sie verschwinden. Gold zählt dreifach, Dynamit kostet Punkte. */
function gMine(c){
  const D=20,ore=c.th.ore||(c.s.tint?c.s.tint.ore:'#c2603a');
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
  const N=6,Z=8.6,RATE=1.05,LIQ=c.th.liq||'#ff9a3d';
  c.view(c.L(0,6.2,18),c.L(0,2.3,Z),2.9);
  c.hero.position.copy(c.L(-5.6,0,6.4));c.hero.rotation.y=c.s.ry+.9;
  const g=c.group;
  g.add(box(14,.3,1.7,'#475569',0,.9,Z));for(const x of [-6,-2,2,6])g.add(box(.3,.9,1.3,'#334155',x,.45,Z));
  // Gießpfanne an einem Galgen
  g.add(box(.3,5,.3,'#334155',-1.6,2.5,Z-1.3),box(2,.3,.3,'#334155',-.7,4.9,Z-1.3),box(.12,1,.12,'#1e293b',0,4.3,Z-1.3));
  const ladle=mk(new CylinderGeometry(.85,.6,1.1,14),lam('#1f2937'),0,3.6,Z);ladle.rotation.x=.25;g.add(ladle);
  const top=mk(new CylinderGeometry(.74,.74,.06,14),new MeshBasicMaterial({color:LIQ}),0,4.13,Z+.13);top.rotation.x=.25;g.add(top);
  const stream=mk(new CylinderGeometry(.13,.1,1,8),new MeshBasicMaterial({color:LIQ}),0,2.4,Z+.35);stream.visible=false;stream.castShadow=false;g.add(stream);
  const light=new PointLight(LIQ,0,12,1.6);light.position.set(0,2.6,Z+1);g.add(light);
  const moulds=[];
  for(let i=0;i<N;i++){const m=new Group();m.add(box(1.5,.14,1.2,'#57534e',0,0,0),box(1.5,.8,.12,'#57534e',0,.4,.6),box(1.5,.8,.12,'#57534e',0,.4,-.6),box(.12,.8,1.2,'#57534e',.75,.4,0),box(.12,.8,1.2,'#57534e',-.75,.4,0));
    const fill=mk(new BoxGeometry(1.36,1,1.06),new MeshBasicMaterial({color:LIQ}),0,.07,0);fill.castShadow=false;fill.scale.y=.001;m.add(fill);
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
        if(o.q!=null&&!c.th.liq)o.fill.material.color.lerp(new Color('#9a5b3a'),dt*.5)}
      stream.visible=hold;light.intensity=hold?30+Math.sin(t*30)*6:0;
      if(hold){
        if((spT-=dt)<=0){spT=.08;c.burst(world((Math.random()-.5)*.3,under?1.3+under.f*.6:1.15,Z+.35),c.th.liq||'#ffd08a',2,3.2)}
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
  const g=c.group,cols=c.th.cols||['#b5533a','#c96a48'];
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
          if(ov<.3){SFX.crash();c.shake(.4);c.burst(world(drop.x,drop.y1,Z),cols[0],14,5);g.remove(cur);c.pop('Daneben!',world(drop.x,drop.y1+1,Z),'#ef4444');drop=null;return end()}
          const perfect=Math.abs(dx)<.16,w=perfect?p.w:ov,x=perfect?p.x:p.x+dx/2;
          cur.scale.x=w/p.w;cur.position.set(x,drop.y1,Z);layers.push({x,w,y:drop.y1});placed++;
          if(perfect){SFX.perfect();c.pop('Perfekt! ✨',world(x,drop.y1+1,Z),'#34d399');c.burst(world(x,drop.y1,Z),'#fde047',10,4)}
          else{SFX.thud();c.burst(world(p.x+Math.sign(dx)*(p.w/2+Math.abs(dx)/2),drop.y1,Z),cols[0],6,3.5);c.pop(Math.round(w/W0*100)+' %',world(x,drop.y1+1,Z),'#fff')}
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
  const N=8,D=34,Z=8.6,KEYS=['gear','pipe','plate','bolt'],NM=k=>k==='junk'?'Schrott':(c.th.names?c.th.names[KEYS.indexOf(k)]:PARTS[k].n);
  c.view(c.L(0,6.4,18),c.L(.4,1.7,Z+.4),3.4);
  c.hero.position.copy(c.L(-5.8,0,6.6));c.hero.rotation.y=c.s.ry+.9;
  const g=c.group;
  g.add(box(14,.3,1.6,'#475569',0,.9,Z));for(const x of [-6,-2,2,6])g.add(box(.3,.9,1.2,'#334155',x,.45,Z));
  g.add(box(2.2,.3,2.2,'#334155',2.4,.15,Z+2.4)); // Sockel der entstehenden Maschine
  const plan=Array.from({length:N},()=>KEYS[Math.floor(Math.random()*4)]);
  const items=[];let idx=0,strikes=0,t=0,next=.2,over=false;
  const show=()=>c.status(plan.map((k,i)=>`<i class="w3chip${i<idx?' ok':i===idx?' cur':''}" style="--c:${PARTS[k].c}">${i<idx?'✓':NM(k)}</i>`).join(''),true);
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
        SFX.good();vib(10);c.burst(w.clone(),PARTS[hit.k].c,6,4);c.pop('✓ '+NM(hit.k),w,'#34d399');show();if(idx>=N)end()}
      else{strikes++;hit.st='fall';hit.v=4;SFX.err();vib([40,30,40]);c.shake(.2);c.pop('✗ falsch',w,'#ef4444')}},
    info:()=>{const w=new Vector3();return {need:plan[idx],idx,strikes,items:items.filter(o=>o.st==='belt').map(o=>{o.m.getWorldPosition(w);return {k:o.k,p:c.project(w)}})}},
    dispose(){}
  }}


/* ---------- Ofen (Backstube, Räucherei, Fritteuse, Glühofen): Drei Öfen garen gleichzeitig. Tippe einen Ofen an, wenn sein Balken im grünen Bereich steht. */
function gBake(c){
  const N=9,Z=8.6,col=c.th.item||'#e8c07a';
  c.view(c.L(0,5.6,17.5),c.L(0,2.1,Z),3.9);
  c.hero.position.copy(c.L(-5.8,0,6.8));c.hero.rotation.y=c.s.ry+.9;
  const g=c.group,ovens=[];
  const raw=new Color(col).lerp(new Color('#ffffff'),.55),good=new Color(col),burnt=new Color('#231710');
  for(let i=0;i<3;i++){const x=(i-1)*2.7,o=new Group();o.position.set(x,0,Z);
    o.add(box(2.3,2.6,2,'#9a4a32',0,1.3,0),box(2.5,.25,2.2,'#6b7280',0,2.72,0),box(1.6,1.3,.2,'#1c1410',0,1.25,1.0));
    const glow=box(1.5,.25,.1,new MeshBasicMaterial({color:'#fb923c'}),0,.72,1.08);glow.castShadow=false;o.add(glow);
    const item=mk(new IcosahedronGeometry(.42,1),new MeshLambertMaterial({color:raw.clone()}),0,1.2,1.12);item.scale.set(1.35,.75,.8);o.add(item);
    // Balken über dem Ofen: grüner Bereich = jetzt herausnehmen
    o.add(box(2.1,.3,.12,'#1e293b',0,3.4,.9));const zone=box(2.1*.2,.32,.13,new MeshBasicMaterial({color:'#22c55e'}),-1.05+2.1*(.56+.1),3.4,.92);zone.castShadow=false;o.add(zone);
    const bar=box(.14,.5,.16,new MeshBasicMaterial({color:'#ffffff'}),-1.05,3.4,.96);bar.castShadow=false;o.add(bar);
    g.add(o);ovens.push({o,item,bar,p:0,sp:.2+Math.random()*.12,wait:i*.9,on:false})}
  let taken=0,sum=0,over=false,started=0;
  c.status('0 von '+N);
  const world=(x,y,z)=>g.localToWorld(new Vector3(x,y,z));
  const settle=(o,q,txt,colr)=>{taken++;sum+=q;o.on=false;o.item.visible=false;o.wait=.55;c.pop(txt,world(o.o.position.x,3.9,Z),colr);c.status(taken+' von '+N);
    if(taken>=N){over=true;const sc=clamp(sum/N);c.say(Math.round(sc*100)+' % gelungen');setTimeout(()=>c.finish(sc),800)}};
  return {
    update(dt){
      if(over)return;c.time(1-taken/N);
      for(const o of ovens){
        if(!o.on){if(started<N&&(o.wait-=dt)<=0){o.on=true;o.p=0;o.sp=(.2+Math.random()*.13)*(1+taken*.03);o.item.visible=true;started++}else{o.bar.position.x=-1.05;continue}}
        o.p+=o.sp*dt;const p=o.p;
        o.item.material.color.copy(p<.8?raw.clone().lerp(good,p/.8):good.clone().lerp(burnt,Math.min(1,(p-.8)/.5)));
        o.bar.position.x=-1.05+2.1*Math.min(1,p/1.25);
        if(p>=1.25){SFX.miss();c.burst(world(o.o.position.x,1.6,Z+1.1),'#44403c',8,3);settle(o,0,'Verbrannt!','#ef4444')}}},
    down(e){
      if(over)return;let hit=null,bd=95;const w=new Vector3();
      for(const o of ovens){if(!o.on)continue;w.set(o.o.position.x,1.6,Z+1);g.localToWorld(w);const [x,y]=c.project(w),d=Math.hypot(x-e.clientX,(y-e.clientY)*.6);if(d<bd){bd=d;hit=o}}
      if(!hit)return;const p=hit.p;c.swing();
      // grüner Bereich: 0,70–0,95 des Garwegs
      if(p>=.7&&p<=.95){SFX.perfect();vib(15);c.burst(world(hit.o.position.x,1.6,Z+1.1),col,8,4);settle(hit,1,'Perfekt! ✨','#34d399')}
      else if(p>=.5&&p<.7){SFX.good();settle(hit,.6,'Noch blass','#fbbf24')}
      else if(p>.95&&p<1.12){SFX.good();settle(hit,.5,'Etwas dunkel','#fbbf24')}
      else if(p<.5){SFX.miss();settle(hit,.15,'Roh!','#ef4444')}
      else{SFX.miss();settle(hit,.1,'Fast verbrannt','#ef4444')}},
    info:()=>({ovens:ovens.map(o=>{const w=new Vector3(o.o.position.x,1.6,Z+1);g.localToWorld(w);return {on:o.on,p:o.p,xy:c.project(w)}}),taken,over}),
    dispose(){}
  }}

/* ---------- Angeln am Steg: warten, bis der Schwimmer abtaucht, sofort tippen, dann einholen (halten = kurbeln, Spannung im grünen Bereich halten). Regeln wie im 2D-Angeln. */
function gFish3(c){
  const TRIES=3,catchList={};
  const B=c.L(4.8,.25,0),R=c.L(-1.2,1.9,.4); // Schwimmer draußen im Teich, Rutenspitze am Steg
  c.view(c.L(-5.2,6.6,5.8),c.L(3.4,.3,-.4),3.6);
  c.hero.position.copy(c.L(-.6,.62,.4));c.hero.rotation.y=c.s.ry+Math.PI/2;
  const bob=new Group();bob.add(mk(new IcosahedronGeometry(.22,1),lam('#ef4444')),mk(new IcosahedronGeometry(.2,1),lam('#f8fafc'),0,-.14,0));bob.position.copy(B);c.world.add(bob);
  const fishM=mk(new IcosahedronGeometry(.45,1),lam('#94a3b8'));fishM.scale.set(1.9,.75,.55);fishM.visible=false;c.world.add(fishM);
  const tail=mk(new BoxGeometry(.5,.5,.08),lam('#94a3b8'),-.5,0,0);tail.rotation.z=Math.PI/4;fishM.add(tail);
  const line=mk(new CylinderGeometry(.015,.015,1,4),new MeshBasicMaterial({color:'#f1f5f9'}));line.castShadow=false;c.world.add(line);
  const ring=mk(new CylinderGeometry(.5,.5,.02,20),new MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0}),B.x,.07,B.z);ring.castShadow=false;c.world.add(ring);
  // Spannung und Fortschritt als Balken in der Kopfleiste
  const bars=()=>`<div class="f3"><small>Spannung</small><div class="f3t"><i class="f3z"></i><b id="f3k"></b></div><small>Fortschritt</small><div class="f3p"><i id="f3g"></i></div></div>`;
  let tryN=0,phase='wait',until=1.5+Math.random()*3,t=0,hold=false,T=0,P=30,fish=null,tug=0,over=false,doneT=0,ok=0;
  const dots=()=>Array.from({length:TRIES},(_,i)=>i<tryN?(i<ok?'🐟':'✖️'):'⚪').join(' ');
  const pick=()=>{const pool=FISH.filter(f=>f.g==='hering'||unl(f.g)),rare=(dayPhase()==='night'?1.3:1)*(wxIs('storm')?1.3:1),w=pool.map(f=>f.w*(f.g==='hering'?1:(1+.35*S.up.rod)*rare)+(f.rod?f.rod*S.up.rod:0));
    let r=Math.random()*w.reduce((a,b)=>a+b);for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0)return pool[i]}return pool[0]};
  const results=[];
  const wait=(extra=0)=>{phase='wait';until=t+1.5+Math.random()*3+extra;bob.visible=true;fishM.visible=false;c.status('Warten … '+dots())};
  const result=(good,txt)=>{results.push(good);if(good){ok=results.filter(Boolean).length;catchList[fish.g]=(catchList[fish.g]||0)+fish.n;SFX.splash();SFX.win();vib([30,40,60]);c.burst(fishM.position.clone(),'#7dd3fc',14,5)}else SFX.miss();
    tryN++;hold=false;phase='done';doneT=1.2;c.status(txt,false);c.pop(txt,fishM.visible?fishM.position:bob.position,good?'#34d399':'#ef4444')};
  const dotsFix=()=>results.map(r=>r?'🐟':'✖️').concat(Array(TRIES-results.length).fill('⚪')).join(' ');
  wait();
  return {
    update(dt){
      if(over)return;t+=dt;c.time(1-tryN/TRIES);
      if(phase==='wait'){bob.position.y=B.y+Math.sin(t*3)*.05;if(t>until){phase='bite';until=t+.85/diff();SFX.splash();tone(880,.12,'square',.06);vib(40);c.status('❗ BISS – JETZT TIPPEN! '+dotsFix());ring.material.opacity=.9;ring.scale.setScalar(1)}}
      else if(phase==='bite'){bob.position.y=B.y-.3+Math.sin(t*30)*.04;ring.scale.multiplyScalar(1+dt*3);ring.material.opacity=Math.max(0,ring.material.opacity-dt*1.2);if(t>until){fish=null;result(false,'Zu langsam – weg ist er!')}}
      else if(phase==='reel'){
        T+=(hold?55*fish.str:-42)*dt;tug-=dt;if(tug<=0){tug=.6+Math.random()*.8;T+=(8+Math.random()*16)*fish.str}
        T=Math.max(0,T);if(hold&&T<85)P+=36*dt/Math.sqrt(fish.str)*(T>=30&&T<=75?1:.45);if(!hold)P-=7*dt;
        const k=c.ui('f3k'),gb=c.ui('f3g');if(k){k.style.left=Math.min(100,T)+'%';gb.style.width=Math.max(0,Math.min(100,P))+'%'}
        const f=clamp(P/100);fishM.position.set(B.x+(R.x-B.x)*f*.8,.25+Math.sin(t*9)*.12,B.z+(R.z-B.z)*f*.8+Math.sin(t*5)*.5);fishM.rotation.y=Math.sin(t*6)*.5;
        if(T>=100)result(false,'Schnur gerissen! 💥');else if(P>=100)result(true,'Gefangen: '+fish.n+'× '+G[fish.g].n+'!');else if(P<=0)result(false,'Entwischt!')}
      else if(phase==='done'){if(fishM.visible&&results[results.length-1]){fishM.position.y+=dt*4;fishM.rotation.z+=dt*6}
        if((doneT-=dt)<=0){if(tryN>=TRIES){over=true;return c.finish(catchList)}wait()}}
      // Schnur von der Rutenspitze zum Schwimmer oder Fisch
      const end=fishM.visible?fishM.position:bob.position,mid=R.clone().add(end).multiplyScalar(.5);line.position.copy(mid);line.scale.y=R.distanceTo(end);line.lookAt(end);line.rotateX(Math.PI/2)},
    down(){
      if(over)return;
      if(phase==='wait'){SFX.err();c.pop('Zu früh – Fisch verscheucht!',bob.position,'#fbbf24');wait(1)}
      else if(phase==='bite'){fish=pick();phase='reel';T=35;P=30;tug=.8;hold=true;bob.visible=false;fishM.visible=true;fishM.material.color.set(G[fish.g].c||'#94a3b8');tail.material.color.set(G[fish.g].c||'#94a3b8');
        ring.material.opacity=0;c.status(`<b>Angebissen: ${G[fish.g].n}!</b> Halten = kurbeln`+bars(),true);SFX.good();vib(20)}
      else if(phase==='reel')hold=true},
    up(){hold=false},
    info:()=>({phase,T,P,tryN,over}),
    dispose(){}
  }}


/* ---------- Rühren (Käserei, Brauerei, Brennerei, Kunststoff): im Kreis wischen; das Tempo muss im grünen Bereich bleiben. */
function gStir(c){
  const Z=8.6,LO=3.6,HI=8.5,NEED=6,DUR=16,liq=c.th.liq||'#f59e0b';
  c.view(c.L(0,6.8,Z+9),c.L(0,1.6,Z),3.8);
  c.hero.position.copy(c.L(-4.8,0,Z+1.4));c.hero.rotation.y=c.s.ry+1.1;
  const g=c.group;
  g.add(box(5.4,.5,5.4,'#3f3f46',0,.25,Z));
  g.add(mk(new CylinderGeometry(2.3,2,1.7,28),lam('#64748b'),0,1.35,Z));
  const surf=mk(new CylinderGeometry(2.05,2.05,.1,28),new MeshBasicMaterial({color:liq}),0,2.17,Z);surf.castShadow=false;g.add(surf);
  const swirl=new Group();swirl.position.set(0,2.24,Z);g.add(swirl);
  const light=new Color(liq).lerp(new Color('#ffffff'),.55);
  for(let i=0;i<3;i++){const b=mk(new BoxGeometry(1.7,.04,.22),new MeshBasicMaterial({color:light}),0,0,0);b.rotation.y=i*Math.PI/3;b.castShadow=false;swirl.add(b)}
  const spoon=new Group();spoon.add(mk(new CylinderGeometry(.09,.09,3.2,6),lam('#92400e'),0,1.6,0),mk(new SphereGeometry(.4,10,8),lam('#b45309'),0,.1,0));spoon.position.set(1.2,2.2,Z);g.add(spoon);
  const bars=()=>`<div class="f3"><small>Tempo – im grünen Bereich bleiben</small><div class="f3t"><i class="f3z" style="left:${LO/12*100}%;width:${(HI-LO)/12*100}%"></i><b id="f3k"></b></div><small>Verrührt</small><div class="f3p"><i id="f3g"></i></div></div>`;
  c.status('<b>Im Kreis wischen!</b>'+bars(),true);
  let w=0,acc=0,okT=0,t=0,t0=null,done=false,down=false,a0=null,ang=0,rot=0,msgT=0;
  const center=()=>c.project(g.localToWorld(new Vector3(0,2.2,Z)));
  const world=(x,y,z)=>g.localToWorld(new Vector3(x,y,z));
  return {
    update(dt){
      if(done)return;t+=dt;
      w=w*.75+(acc/Math.max(dt,.001))*.25;acc=0;if(!down)w*=.9;
      const inZ=w>=LO&&w<=HI;
      if(t0!=null){if(inZ)okT+=dt;else if(w>HI*1.25)okT=Math.max(0,okT-dt*.5);
        c.time(1-(t-t0)/DUR)}
      rot+=w*dt*(Math.sign(rotDir)||1);swirl.rotation.y=-rot;
      spoon.position.set(Math.cos(ang)*1.15,2.2+Math.sin(t*14)*.02*Math.min(1,w/4),Z+Math.sin(ang)*1.15);
      const k=c.ui('f3k'),gb=c.ui('f3g');if(k){k.style.left=Math.min(100,w/12*100)+'%';k.style.background=inZ?'#16a34a':w>HI?'#ef4444':'#1d2b4a'}if(gb)gb.style.width=Math.min(1,okT/NEED)*100+'%';
      if(w>HI*1.25&&(msgT-=dt)<=0){msgT=.5;c.burst(world(Math.cos(ang)*1.4,2.4,Math.sin(ang)*1.4+Z-Z+0),liq,3,3)}
      if(okT>=NEED||(t0!=null&&t-t0>=DUR)){done=true;const v=Math.min(1,okT/NEED);c.say(v>=1?'Perfekt verrührt! ✨':Math.round(v*100)+' % verrührt');(v>=1?SFX.win:SFX.good)();vib(20);setTimeout(()=>c.finish(v),700)}},
    down(e){if(done)return;down=true;a0=null;SFX.tick()},
    move(e){if(!down||done)return;const [cx,cy]=center(),dx=e.clientX-cx,dy=e.clientY-cy;if(Math.hypot(dx,dy)<22)return;
      const a=Math.atan2(dy,dx);if(a0!=null){let da=a-a0;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;acc+=Math.abs(da);rotDir=Math.sign(da)||rotDir;if(t0==null)t0=t}ang=a;a0=a},
    up(){down=false;a0=null},
    info:()=>({w,okT,center:center(),done,started:t0!=null}),
    dispose(){}
  }}
let rotDir=1;

/* ---------- Weben (Weberei): Fadenreihen laufen auf den Webkamm zu, in jeder fehlt ein Faden. Tippe die Spur mit der Lücke, bevor die Reihe den Kamm erreicht. */
function gWeave(c){
  const LANES=5,ROWS=12,Z=8.6,LW=1.9,ZS=Z-5.4,ZC=Z+1.8,COL=['#ef4444','#f59e0b','#22c55e','#38bdf8','#a78bfa'];
  c.view(c.L(0,7.2,Z+9),c.L(0,.6,Z-1.6),5.4);
  c.hero.position.copy(c.L(-6.4,0,Z+2));c.hero.rotation.y=c.s.ry+1.2;
  const g=c.group,X=i=>(i-2)*LW;
  g.add(box(10.4,.2,9.6,'#8b5a2b',0,.1,Z-2.6));
  for(let i=0;i<=LANES;i++)g.add(box(.08,.22,9.6,'#5b3a1b',(i-2.5)*LW,.2,Z-2.6));
  g.add(box(10.6,.6,.45,'#f8fafc',0,.55,ZC+.5));for(let i=0;i<=LANES*3;i++)g.add(box(.08,.7,.5,'#cbd5e1',(i/3-2.5)*LW,.6,ZC+.5));
  const cloth=box(10.2,.16,1,'#fde68a',0,.28,ZC+1.5);cloth.scale.z=.01;g.add(cloth);
  const rows=[];let spawned=0,good=0,bad=0,miss=0,t=0,next=.4,over=false;
  const world=(x,y,z)=>g.localToWorld(new Vector3(x,y,z));
  const stat=()=>c.status(good+' gewebt'+(bad+miss?' · '+(bad+miss)+' Fehler':'')+` · Reihe ${Math.min(ROWS,spawned)} von ${ROWS}`);stat();
  const mkRow=()=>{const gap=Math.floor(Math.random()*LANES),r=new Group();
    for(let i=0;i<LANES;i++){if(i===gap){const m=mk(new BoxGeometry(LW-.3,.06,1),new MeshBasicMaterial({color:'#fde047',transparent:true,opacity:.4}),X(i),.3,0);m.castShadow=false;r.add(m)}else r.add(box(LW-.3,.3,1,COL[i],X(i),.4,0))}
    r.position.z=ZS;g.add(r);rows.push({g:r,gap,z:ZS,done:false})};
  const settle=(r,ok)=>{r.done=true;if(ok){good++;SFX.good();vib(8);c.burst(world(X(r.gap),.8,ZC),COL[r.gap],6,4);c.pop('✓',world(X(r.gap),1.6,ZC),'#34d399');cloth.scale.z=Math.min(3.2,good*.27);cloth.position.z=ZC+1+cloth.scale.z/2;setTimeout(()=>{g.remove(r.g)},0)}else r.g.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.3}});stat()};
  const laneXY=()=>Array.from({length:LANES},(_,i)=>c.project(world(X(i),.6,ZC)));
  return {
    update(dt){
      if(over)return;t+=dt;c.time(1-(spawned-rows.filter(r=>!r.done).length)/ROWS);
      const v=(1.75+spawned*.07)*diff();
      next-=dt;if(next<=0&&spawned<ROWS){mkRow();spawned++;next=Math.max(.6,1.25-spawned*.04)}
      for(const r of rows){r.z+=v*dt;r.g.position.z=r.z;if(!r.done&&r.z>ZC+.6){miss++;r.done=true;SFX.miss();c.pop('Durchgerutscht',world(0,1.6,ZC),'#ef4444');r.g.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.3}});stat()}
        if(r.done&&r.z>ZC+7){g.remove(r.g)}}
      if(spawned>=ROWS&&!rows.some(r=>!r.done)){over=true;const sc=clamp((good-.5*bad)/ROWS);c.say(good+' von '+ROWS+' Reihen');if(sc>=.85)SFX.win();setTimeout(()=>c.finish(sc),700)}},
    down(e){
      if(over)return;const xy=laneXY();let lane=0,bd=1e9;xy.forEach((p,i)=>{const d=Math.abs(p[0]-e.clientX);if(d<bd){bd=d;lane=i}});
      const r=rows.filter(x=>!x.done&&x.z+.5>ZC-3.2).sort((a,b)=>b.z-a.z)[0];
      if(!r){bad++;SFX.miss();c.pop('Zu früh',world(X(lane),1.6,ZC),'#fbbf24');stat();return}
      c.swing();if(lane===r.gap)settle(r,true);else{bad++;r.done=true;SFX.err();vib([40,30,40]);c.shake(.15);c.pop('Falsche Spur!',world(X(lane),1.6,ZC),'#ef4444');r.g.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.3}});stat()}},
    info:()=>({rows:rows.filter(r=>!r.done).map(r=>({z:r.z,gap:r.gap})),zc:ZC,lanes:laneXY(),spawned,good,over}),
    dispose(){}
  }}

/* ---------- Zuschneiden (Schneiderei): Mit dem Finger der gestrichelten Linie von links nach rechts folgen. 3 Schnitte. */
function gCut(c){
  const Z=8.6,CUTS=3,X0=-3.7,X1=3.7,TOL=.6,CY=1.0,MAXP=170;
  c.view(c.L(0,8.4,Z+7.2),c.L(0,CY,Z),5.2);
  c.hero.position.copy(c.L(-6.4,0,Z+2));c.hero.rotation.y=c.s.ry+1.2;
  const g=c.group;
  g.add(box(10.4,.9,6.2,'#a16207',0,.45,Z));
  const cloth=box(9.4,.1,5.2,'#e9d5ff',0,CY-.05,Z);g.add(cloth);
  const dashGeo=new BoxGeometry(.16,.04,.16),dashMat=new MeshBasicMaterial({color:'#7c3aed'}),dots=[];
  for(let i=0;i<48;i++){const d=new Mesh(dashGeo,dashMat);d.position.y=CY+.03;g.add(d);dots.push(d)}
  const trGeo=new SphereGeometry(.12,6,5),trMat=new MeshBasicMaterial({color:'#22c55e'}),tr=[];
  for(let i=0;i<MAXP;i++){const d=new Mesh(trGeo,trMat);d.visible=false;d.position.y=CY+.08;g.add(d);tr.push(d)}
  const sc=new Group();for(const r of [.35,-.35]){const b=box(.18,.08,1.1,'#cbd5e1',0,0,0);b.rotation.y=r;sc.add(b)}sc.add(box(.4,.12,.4,'#ef4444',0,0,.7));sc.position.set(X0,CY+.25,Z);sc.scale.setScalar(1.5);g.add(sc);
  let round=0,fz=()=>0,pts=[],down=false,total=0,over=false,wait=0,rawT=0,t=0;
  const newPath=()=>{const a=.8+round*.5+Math.random()*.4,b=.9+Math.random()*.8+round*.35,ph=Math.random()*6,a2=.35,b2=2.2+Math.random(),ph2=Math.random()*6;
    fz=x=>a*Math.sin((x-X0)/(X1-X0)*Math.PI*b+ph)*(1-.35*Math.abs(x/3.7))+a2*Math.sin((x-X0)/(X1-X0)*Math.PI*b2+ph2)*.5;
    dots.forEach((d,i)=>{const x=X0+(X1-X0)*i/(dots.length-1);d.position.set(x,CY+.03,Z+fz(x));d.visible=i%2===0});
    tr.forEach(d=>d.visible=false);pts=[];sc.position.set(X0,CY+.25,Z+fz(X0));c.status('Schnitt '+(round+1)+' von '+CUTS)};
  newPath();
  const plane=new Plane(new Vector3(0,1,0),-CY),rc=new Raycaster(),hit=new Vector3();
  const local=e=>{rc.setFromCamera(new Vector2(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1)),c.cam);if(!rc.ray.intersectPlane(plane,hit))return null;const l=g.worldToLocal(hit.clone());return [l.x,l.z-Z]};
  const score=()=>{if(!pts.length)return 0;const mx=Math.max(...pts.map(p=>p[0])),reach=clamp((mx-X0)/(X1-X0-.3));let sum=0,k=0;
    for(let x=X0;x<=X1;x+=.3){if(x>mx)break;const d=Math.min(...pts.map(p=>Math.hypot(p[0]-x,p[1]-fz(x))));sum+=Math.max(0,1-d/TOL);k++}return reach*(k?sum/k:0)};
  const finish=()=>{down=false;if(wait>0||over)return;const v=score();total+=v;wait=.9;
    const txt=v>=.9?'Sauber geschnitten! ✂️':v>=.6?'Ganz gut':'Schief…';c.say(txt);(v>=.6?SFX.good:SFX.miss)();vib(v>=.6?10:[40,30,40]);c.burst(sc.position.clone().applyMatrix4(g.matrixWorld),'#e9d5ff',8,4)};
  return {
    update(dt){
      if(over)return;t+=dt;c.time(1-(round+(down?.5:0))/CUTS);
      if(wait>0){wait-=dt;if(wait<=0){round++;if(round>=CUTS){over=true;const r=total/CUTS;c.say(Math.round(r*100)+' % Genauigkeit');if(r>=.85)SFX.win();setTimeout(()=>c.finish(clamp(r)),600)}else newPath()}}},
    down(e){if(over||wait>0)return;const p=local(e);if(!p)return;if(Math.hypot(p[0]-X0,p[1]-fz(X0))>1.5){c.pop('Starte links an der Schere',g.localToWorld(new Vector3(X0,CY+1,Z)),'#fbbf24');return}down=true;pts=[p];SFX.tick()},
    move(e){if(!down||wait>0||over)return;const p=local(e);if(!p)return;
      const l=pts[pts.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])<.12)return;pts.push(p);sc.position.set(p[0],CY+.25,Z+p[1]);
      const k=Math.min(pts.length-1,MAXP-1),d=tr[k];if(d){d.position.set(p[0],CY+.08,Z+p[1]);d.visible=true}
      if(p[0]>=X1)finish()},
    up(){if(down)finish()},
    info:()=>({round,pts:pts.length,fz:Array.from({length:21},(_,i)=>{const x=X0+(X1-X0)*i/20;return [x,fz(x),c.project(g.localToWorld(new Vector3(x,CY,Z+fz(x))))]}),over}),
    dispose(){}
  }}

/* ---------- Löten (Platine, Fälscherwerkstatt): Lötpunkte leuchten in einer Reihenfolge auf; merke sie dir und tippe sie nach. */
function gSolder(c){
  const Z=8.6,ROUNDS=4,LEN=[3,4,5,6],MAXS=3,COL=['#ef4444','#fbbf24','#22c55e','#38bdf8'],FQ=[392,523,659,784];
  c.view(c.L(0,8.6,Z+8.2),c.L(0,1.1,Z),5.2);
  c.hero.position.copy(c.L(-6,0,Z+1.8));c.hero.rotation.y=c.s.ry+1.2;
  const g=c.group;
  g.add(box(9,.3,6.6,'#14532d',0,1,Z),box(9.4,.5,7,'#334155',0,.5,Z-.05));
  for(let i=0;i<10;i++){const l=box(.12,.04,3+Math.random()*2,'#86efac',-4+i*.9,1.17,Z+(Math.random()-.5)*1);l.castShadow=false;g.add(l)}
  const pads=[[-2.2,-1.5],[2.2,-1.5],[-2.2,1.6],[2.2,1.6]].map(([x,z],i)=>{const m=mk(new CylinderGeometry(1.1,1.1,.3,20),new MeshLambertMaterial({color:COL[i],emissive:'#000000'}),x,1.35,Z+z);g.add(m);return {m,x,z,i,glow:0}});
  const iron=new Group();iron.add(mk(new CylinderGeometry(.1,.1,2.4,6),lam('#475569'),0,1.2,0),mk(new CylinderGeometry(.18,.04,.5,6),lam('#fbbf24'),0,-.1,0));iron.position.set(0,2.2,Z);g.add(iron);
  let state='pause',seq=[],idx=0,rnd=0,strikes=0,done=0,t=0,tm=.8,showI=0,over=false;
  const world=(x,y,z)=>g.localToWorld(new Vector3(x,y,z));
  const chips=()=>c.status(`<i class="w3chip" style="--c:#fbbf24">Runde ${Math.min(rnd+1,ROUNDS)} von ${ROUNDS}</i>`+(state==='input'?`<i class="w3chip cur" style="--c:#22c55e">${idx} / ${seq.length}</i>`:`<i class="w3chip" style="--c:#94a3b8">Merken …</i>`)+`<i class="w3chip" style="--c:#ef4444">${'❤️'.repeat(MAXS-strikes)}${'🖤'.repeat(strikes)}</i>`,true);
  const flash=(p)=>{p.glow=.45;tone(FQ[p.i],.28,'square',.07)};
  const startRound=()=>{seq=Array.from({length:LEN[rnd]},()=>Math.floor(Math.random()*4));idx=0;showI=0;state='show';tm=.7;chips()};
  const fail=()=>{strikes++;SFX.err();c.shake(.25);vib([40,30,40]);if(strikes>=MAXS)return end();c.say('Falsch – nochmal ansehen');idx=0;showI=0;state='show';tm=1.0;chips()};
  const end=()=>{if(over)return;over=true;state='done';const sc=clamp((done-strikes*.2)/ROUNDS);c.say(done>=ROUNDS?'Alles verlötet! 🔧':done+' von '+ROUNDS+' Runden');setTimeout(()=>c.finish(sc),800)};
  startRound();
  return {
    update(dt){
      if(over)return;t+=dt;c.time(1-done/ROUNDS);
      for(const p of pads){p.glow=Math.max(0,p.glow-dt);p.m.material.emissive.set(p.glow>0?COL[p.i]:'#000000');p.m.material.emissiveIntensity=p.glow>0?1:0;p.m.position.y=1.35+(p.glow>0?.12:0)}
      if(state==='show'){tm-=dt;if(tm<=0){if(showI<seq.length){flash(pads[seq[showI]]);iron.position.set(pads[seq[showI]].x,2.2,Z+pads[seq[showI]].z);showI++;tm=.6}else{state='input';chips();c.say('Jetzt du!')}}}},
    down(e){
      if(over||state!=='input')return;let hit=null,bd=70;
      for(const p of pads){const [x,y]=c.project(world(p.x,1.5,Z+p.z)),d=Math.hypot(x-e.clientX,y-e.clientY);if(d<bd){bd=d;hit=p}}
      if(!hit)return;c.swing();flash(hit);iron.position.set(hit.x,2.2,Z+hit.z);c.burst(world(hit.x,1.7,Z+hit.z),COL[hit.i],5,3);
      if(hit.i===seq[idx]){idx++;SFX.good();if(idx>=seq.length){done++;rnd++;SFX.perfect();c.pop('✓ Runde '+done,world(0,2.6,Z),'#34d399');if(rnd>=ROUNDS)return end();state='pause';tm=1;setTimeout(()=>{if(!over)startRound()},900)}else chips()}
      else fail()},
    info:()=>({state,seq,idx,done,strikes,pads:pads.map(p=>c.project(world(p.x,1.5,Z+p.z))),over}),
    dispose(){}
  }}


/* ---------- Teig kneten (Bäckerei): hin und her wischen, im gleichmäßigen Takt. */
function gKnead(c){
  const Z=8.6,NEED=12,DUR=11,STROKE=70,MINT=.33,MAXT=.95,good=new Color(c.th.item||'#e8c07a'),raw=new Color('#fff3d6');
  c.view(c.L(0,6.4,Z+8.8),c.L(0,1.2,Z),3.9);
  c.hero.position.copy(c.L(-4.4,0,Z+1.6));c.hero.rotation.y=c.s.ry+1.1;
  const g=c.group;
  g.add(box(7.4,.9,4.6,'#a16207',0,.45,Z));const fl=box(5.2,.03,3.2,'#fff7e6',0,.92,Z);fl.castShadow=false;g.add(fl);
  const dough=mk(new SphereGeometry(1.35,20,14),new MeshLambertMaterial({color:raw.clone()}),0,1.7,Z);dough.scale.set(1.15,.7,1);g.add(dough);
  const pin=mk(new CylinderGeometry(.22,.22,3.4,10),lam('#c08a4d'),0,2.6,Z);pin.rotation.z=Math.PI/2;g.add(pin);
  const bars=()=>`<div class="f3"><small>Teig – gleichmäßig im Takt wischen</small><div class="f3p"><i id="f3g"></i></div></div>`;
  c.status('<b>Hin und her wischen!</b>'+bars(),true);
  let sum=0,n=0,dir=0,x0=null,lastX=0,lastT=0,t0=null,t=0,done=false,down=false,sq=0,off=0,beat=0;
  const world=(x,y,z)=>g.localToWorld(new Vector3(x,y,z));
  const stroke=()=>{const dt=lastT?t-lastT:.5;lastT=t;n++;let v=1,txt='Im Takt! 👌';
    if(dt<MINT){v=.5;txt='Zu hastig'}else if(dt>MAXT){v=.6;txt='Zu lahm'}else SFX.good();if(v<1)SFX.tick();
    sum+=v;vib(10);sq=n%2?1:-.5;beat=1;c.pop(txt,world(0,3.4,Z),v>=1?'#34d399':'#fbbf24');c.burst(world((Math.random()-.5)*2,1.9,Z+1),'#fff8e1',4,3);
    dough.material.color.copy(raw).lerp(good,Math.min(1,sum/NEED));const gb=c.ui('f3g');if(gb)gb.style.width=Math.min(1,sum/NEED)*100+'%'};
  const end=()=>{if(done)return;done=true;const v=Math.min(1,sum/NEED);c.say(v>=1?'Perfekter Teig! 🥖':Math.round(v*100)+' % geknetet');if(v>=1)SFX.win();setTimeout(()=>c.finish(v),700)};
  return {
    update(dt){
      if(done)return;t+=dt;if(t0!=null){c.time(1-(t-t0)/DUR);if(t-t0>=DUR)end()}
      sq*=Math.pow(.02,dt);beat=Math.max(0,beat-dt*3);
      dough.scale.set(1.15+sq*.3,.7-sq*.18,1-sq*.12);dough.position.x+=(off-dough.position.x)*Math.min(1,dt*14);
      pin.position.set(dough.position.x,2.55+Math.sin(t*10)*.03*beat,Z-.1+sq*.3)},
    down(e){if(done)return;down=true;x0=lastX=e.clientX;dir=0},
    move(e){if(!down||done)return;const dx=e.clientX-lastX;if(!dx)return;const d=Math.sign(dx);if(!dir)dir=d;
      if(d!==dir){if(Math.abs(lastX-x0)>=STROKE){if(t0==null)t0=t;stroke();x0=lastX}else x0=lastX;dir=d}
      lastX=e.clientX;off=Math.max(-.9,Math.min(.9,(e.clientX-x0)*.012))},
    up(){down=false;if(!done&&x0!=null&&Math.abs(lastX-x0)>=STROKE&&dir){if(t0==null)t0=t;stroke()}x0=null;off=0},
    info:()=>({n,sum,t,t0,done,over:done}),
    dispose(){}
  }}

/* ---------- Fangen (Mühle, Kelterei, Chipsfabrik): Ware fällt vom Himmel, der Korb folgt dem Finger. Steine nicht auffangen. */
function gCatch(c){
  const Z=8.6,D=20,BY=1.4,col=c.th.item||'#e9c46a';
  c.view(c.L(0,7.2,Z+9.6),c.L(0,3.4,Z),4.8);
  c.hero.position.copy(c.L(-6,0,Z+1.2));c.hero.rotation.y=c.s.ry+1.2;
  const g=c.group;
  g.add(box(11,.2,5,'#8a6a3b',0,.1,Z));
  const basket=new Group();basket.add(mk(new CylinderGeometry(1.2,.9,.8,14),lam('#b45309'),0,.4,0),mk(new CylinderGeometry(1.25,1.25,.12,14),lam('#92400e'),0,.82,0));basket.position.set(0,BY-.4,Z);g.add(basket);
  const geoG=new SphereGeometry(.34,8,6),geoS=new IcosahedronGeometry(.4,0),matG=lam(col,col,.25),matS=lam('#6b7280');
  const items=[];let t=0,next=.5,bx=0,tx=0,pts=0,total=0,stones=0,over=false,spawned=0;
  const plane=new Plane(new Vector3(0,1,0),-BY),rc=new Raycaster(),hit=new Vector3();
  const local=e=>{rc.setFromCamera(new Vector2(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1)),c.cam);if(!rc.ray.intersectPlane(plane,hit))return null;return g.worldToLocal(hit.clone()).x};
  const world=(x,y,z)=>g.localToWorld(new Vector3(x,y,z));
  const stat=()=>c.status(`${pts} gefangen`+(stones?` · ${stones} Stein${stones>1?'e':''}`:''));stat();
  return {
    update(dt){
      if(over)return;t+=dt;c.time(1-t/D);
      if(t<D-2&&(next-=dt)<=0){const stone=Math.random()<.24,m=mk(stone?geoS:geoG,stone?matS:matG);if(!stone){m.scale.set(1,1.25,1)}const x=(Math.random()-.5)*8;m.position.set(x,9,Z);g.add(m);items.push({m,stone,v:0,x,done:false});if(!stone)total++;spawned++;next=Math.max(.38,.7-t*.016)}
      bx+=(tx-bx)*Math.min(1,dt*14);basket.position.x=bx;basket.rotation.z=(tx-bx)*-.08;
      for(const it of items){if(it.done)continue;it.v+=(5+t*.12)*dt;it.m.position.y-=it.v*dt;it.m.rotation.x+=dt*3;it.m.rotation.z+=dt*2;
        const y=it.m.position.y;
        if(y<=BY+.3&&y>BY-.5&&Math.abs(it.m.position.x-bx)<1.15){it.done=true;g.remove(it.m);const p=world(bx,BY+.9,Z);
          if(it.stone){stones++;pts=Math.max(0,pts-2);SFX.crash();vib([50,30,50]);c.shake(.3);c.pop('Stein! −2',p,'#ef4444');c.burst(p,'#9ca3af',8,4)}
          else{pts++;SFX.good();vib(8);c.pop('+1',p,'#34d399');c.burst(p,col,5,3)}stat()}
        else if(y<.3){it.done=true;g.remove(it.m);if(!it.stone)SFX.miss()}}
      if(t>=D&&!items.some(i=>!i.done)||t>=D+4){over=true;const sc=clamp(pts/Math.max(8,total*.85));c.say(pts+' von '+total+' gefangen');setTimeout(()=>c.finish(sc),700)}},
    down(e){const x=local(e);if(x!=null)tx=clamp(x,-4.6,4.6)},move(e){const x=local(e);if(x!=null)tx=clamp(x,-4.6,4.6)},up(){},
    info:()=>({bx,pts,total,t,over,base:c.project(world(bx,BY,Z)),items:items.filter(i=>!i.done).map(i=>({k:i.stone?'stone':'good',x:i.m.position.x,y:i.m.position.y,p:c.project(i.m.position.clone().applyMatrix4(g.matrixWorld))}))}),
    dispose(){geoG.dispose();geoS.dispose()}
  }}

// Welches 3D-Spiel eine Station nutzt: [Spiel, Titel, Thema]. Die Themen färben und benennen dasselbe Spiel passend zur Station.
const HOW={
  knead:w=>`Wisch mit dem Finger <b>hin und her</b> über den Teig – nicht zu hastig und nicht zu lahm. Im <b>gleichmäßigen Takt</b> wird der Teig am besten. 11 Sekunden ab dem ersten Zug.`,
  catch:w=>`${w||'Ware'} fällt vom Himmel. <b>Zieh den Korb</b> mit dem Finger nach links und rechts und fang sie auf. <b>Graue Steine</b> nicht auffangen!`,
  stir:w=>`Wisch mit dem Finger <b>im Kreis</b> um den Kessel. Halte das Tempo im <b>grünen Bereich</b>: zu langsam gibt Klumpen, zu schnell spritzt es.`,
  weave:w=>`In jeder Fadenreihe fehlt ein Faden. Tippe die <b>Spur mit der Lücke</b>, bevor die Reihe den Webkamm erreicht. Falsche Spur = Fehler. 12 Reihen.`,
  cut:w=>`Setz den Finger links auf die <b>Schere</b> und zieh sie entlang der gestrichelten Linie nach rechts. Je genauer, desto sauberer der Schnitt. 3 Schnitte.`,
  solder:w=>`Die Lötpunkte leuchten in einer <b>Reihenfolge</b> auf. Merk sie dir und tippe sie danach in derselben Reihenfolge an. 4 Runden, 3 Fehler erlaubt.`,
  mine:w=>`Im Fels tauchen ${w||'Brocken'} auf. Tippe sie an, bevor sie verschwinden. <b>Gold</b> zählt dreifach, Finger weg vom <b>roten Dynamit</b>!`,
  pour:w=>`Die ${w||'Formen'} fahren unter dem Kessel durch. <b>Halte gedrückt</b>, um einzufüllen, und fülle jede bis zur grünen Marke. Nichts verschütten, nichts überlaufen lassen!`,
  stack:w=>`Die Lage pendelt am Kran. <b>Tippe</b>, um sie abzulegen. Was übersteht, bricht ab – genau getroffen bleibt sie ganz. 8 Lagen.`,
  assemble:w=>`Oben steht der Bauplan. Tippe auf dem Band immer das Teil an, das gerade <b>hervorgehoben</b> ist. Falsche Teile und Schrott kosten Punkte.`,
  bake:w=>`Drei Öfen garen gleichzeitig. Tippe einen Ofen an, wenn sein Balken im <b>grünen Bereich</b> steht. Zu früh ist ${w||'es'} roh, zu spät verbrannt. 9 Stück.`
};
const FN={mine:gMine,pour:gPour,stack:gStack,assemble:gAssemble,bake:gBake,stir:gStir,knead:gKnead,catch:gCatch,weave:gWeave,cut:gCut,solder:gSolder};
const SET={
  erz:['mine','Erzrausch',{w:'Erzadern'}],kohle:['mine','Kohlerausch',{w:'Kohlebrocken'}],lehm:['mine','Lehmgrube',{w:'Lehmklumpen'}],
  sand:['mine','Sandgrube',{w:'Sandnester',ore:'#f6e7a8'}],kupfer:['mine','Kupferrausch',{w:'Kupferadern',ore:'#e8833a'}],
  stahl:['pour','Abstich',{}],oel:['pour','Öl abfüllen',{w:'Fässer',liq:'#3f3f46'}],
  ziegel:['stack','Ziegelkran',{}],maschine:['assemble','Fließband',{}],
  glas:['pour','Glasguss',{liq:'#7dd3fc'}],kunststoff:['stir','Kunststoff mischen',{liq:'#a78bfa'}],gehaeuse:['pour','Gehäuseguss',{liq:'#f472b6'}],akku:['pour','Elektrolyt einfüllen',{w:'Zellen',liq:'#4ade80'}],
  draht:['bake','Glühofen',{w:'der Draht',item:'#e8833a'}],
  platine:['solder','Platine löten',{}],display:['assemble','Display-Montage',{names:['Linse','Leiter','Scheibe','Klammer']}],handy:['assemble','Endmontage',{names:['Kamera','Akku','Display','Schraube']}],
  muehle:['catch','Körner auffangen',{w:'Weizenkörner',item:'#e9c46a'}],baeckerei:['knead','Teig kneten',{item:'#e8c07a'}],kaeserei:['stir','Käsekessel rühren',{liq:'#fde68a'}],
  chipsfabrik:['catch','Kartoffeln fangen',{w:'Kartoffeln',item:'#d6a35c'}],raeucherei:['bake','Räucherofen',{w:'der Lachs',item:'#f08a6b'}],
  kelterei:['catch','Trauben lesen',{w:'Trauben',item:'#7c3aed'}],brauerei:['stir','Maische rühren',{liq:'#f59e0b'}],
  weberei:['weave','Weben',{}],schneiderei:['cut','Zuschnitt',{}],
  brennerei:['stir','Maische rühren',{liq:'#d9f99d'}],faelscher:['solder','Uhrwerk löten',{}],kopierer:['stack','Rohlinge stapeln',{cols:['#94a3b8','#cbd5e1']}],
  r_kamin:['stack','Kamin mauern',{cols:['#8b4a2b','#a5543a']}],r_dampfmaschine:['assemble','Dampfmaschine bauen',{names:['Schwungrad','Kolben','Kessel','Ventil']}],r_glasfaser:['pour','Glasfaser ziehen',{liq:'#67e8f9'}],
  r_solar:['stack','Module stapeln',{cols:['#1d4ed8','#3b82f6']}],r_ebike:['assemble','E-Bike bauen',{names:['Rad','Rahmen','Akku','Schraube']}],r_smartwatch:['assemble','Uhr bauen',{names:['Krone','Band','Display','Schraube']}],
  r_drohne:['assemble','Drohne bauen',{names:['Rotor','Arm','Platine','Schraube']}],r_roboter:['assemble','Roboter bauen',{names:['Gelenk','Arm','Platte','Schraube']}]
};
const DEF=Object.fromEntries(Object.entries(SET).map(([k,[f,title,th]])=>[k,{f:FN[f],t:title,h:HOW[f](th.w),th}]));
export const has3d=id=>!!DEF[id];

// Startet das 3D-Spiel der Station. env kommt aus der Welt (Szene, Kamera, Figur …). Ergebnis: Score 0..1 oder null bei Abbruch.
export function play3d(env,s,st,custom){return new Promise(res=>{
  const d=custom||DEF[st?st.id:s.id],{scene,cam,root}=env,outN=custom?'':' · '+G[(st||{}).out||s.id]?.n;
  const group=new Group();group.position.set(s.at[0],0,s.at[1]);group.rotation.y=s.ry;scene.add(group);
  const world=new Group();scene.add(world);
  // Splitter: fester Vorrat an kleinen Brocken mit Schwerkraft
  const cg=new IcosahedronGeometry(.13,0),chunks=Array.from({length:44},()=>{const m=new Mesh(cg,new MeshLambertMaterial({color:'#fff'}));m.visible=false;world.add(m);return {m,v:new Vector3(),l:0}});
  let ci=0,ended=false;
  const ui=document.createElement('div');ui.className='w3g';
  ui.innerHTML=`<div class="w3gp"><button class="x" id="w3gx">✕</button><b id="w3gt">${d.t}${outN&&!outN.includes('undefined')?outN:''}</b><div class="w3gs" id="w3gs"></div><div class="timer"><i id="w3gm" style="width:100%"></i></div></div>
    <div class="w3gate" id="w3gg"><div class="gt">${d.t}</div><div class="gh">${d.h}</div><button class="btn a big" id="w3go">▶ Los!</button><button class="btn sm ghost" id="w3gb">Zurück</button></div>`;
  root.appendChild(ui);
  const $=id=>ui.querySelector('#'+id);
  const c={scene,cam,s,group,world,hero:env.hero,th:d.th||{},ui:id=>ui.querySelector('#'+id),
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
    down(e){if(this.running&&game.down)game.down(e)},move(e){if(this.running&&game.move)game.move(e)},up(e){if(this.running&&game.up)game.up(e)}};
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
  window.__w3dGame=()=>({id:st?st.id:s.id,running:G3.running,ended,info:game.info?game.info():null});
})}

// Angeln am Steg: Ergebnis ist die Fangliste {Ware: Anzahl} oder null bei Abbruch
export const fish3d=(env,s)=>play3d(env,s,null,{f:gFish3,t:'Angeln',th:{},h:`Warte, bis der Schwimmer <b>abtaucht</b>, und tippe sofort. Dann einholen: <b>gedrückt halten</b> zum Kurbeln – wird die Spannung zu hoch, reißt die Schnur! 3 Würfe.${dayPhase()==='night'?' 🌙 Nachts beißen seltene Fische öfter.':''}`});
