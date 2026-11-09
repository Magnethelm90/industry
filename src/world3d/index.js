/* 3D-Modus: begehbare Welt (Three.js). Nutzt denselben Spielstand und dieselben Minispiele wie das 2D-Spiel. */
import {BoxGeometry,CanvasTexture,CapsuleGeometry,Color,ConeGeometry,CylinderGeometry,DirectionalLight,DoubleSide,Fog,Group,HemisphereLight,IcosahedronGeometry,InstancedMesh,
  MathUtils,Mesh,MeshBasicMaterial,MeshLambertMaterial,Object3D,PCFSoftShadowMap,PerspectiveCamera,PlaneGeometry,RingGeometry,Scene,SphereGeometry,Sprite,SpriteMaterial,WebGLRenderer} from 'three';
import {G,ST} from '../data.js';
import {runStation} from '../features/workshop.js';
import {SFX,toast} from '../fx.js';
import {S,lvl,sellP,sat,track} from '../state.js';
import {OV} from '../ui.js';
import {$,fmt} from '../util.js';
import {dayPhase} from '../world.js';

const lam=(c,o={})=>new MeshLambertMaterial({color:c,...o});
const box=(w,h,d,c,x=0,y=0,z=0)=>{const m=new Mesh(new BoxGeometry(w,h,d),lam(c));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m};
const cyl=(rt,rb,h,c,x=0,y=0,z=0,seg=10)=>{const m=new Mesh(new CylinderGeometry(rt,rb,h,seg),lam(c));m.position.set(x,y,z);m.castShadow=true;return m};
// Zufall mit festem Startwert, damit die Welt immer gleich aussieht
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;

// Beschriftung über einem Gebäude
function label(text,sub){
  const c=document.createElement('canvas');c.width=512;c.height=160;const x=c.getContext('2d');
  x.fillStyle='rgba(10,16,40,.78)';x.beginPath();x.roundRect(8,8,496,144,28);x.fill();
  x.fillStyle='#fff';x.font='800 54px system-ui,sans-serif';x.textAlign='center';x.fillText(text,256,76);
  x.fillStyle='#fbbf24';x.font='600 34px system-ui,sans-serif';x.fillText(sub,256,126);
  const t=new CanvasTexture(c),s=new Sprite(new SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(5.6,1.75,1);s.renderOrder=5;return s}

function mine(rock,ore){
  const g=new Group(),h=new Mesh(new IcosahedronGeometry(5.2,0),lam(rock,{flatShading:true}));h.scale.set(1.2,.78,1);h.position.y=1.5;h.castShadow=h.receiveShadow=true;g.add(h);
  g.add(box(2.6,3,.6,'#0b0b10',0,1.5,4.2),box(.5,3.4,.7,'#7a4f2a',-1.5,1.7,4.3),box(.5,3.4,.7,'#7a4f2a',1.5,1.7,4.3),box(3.8,.5,.8,'#7a4f2a',0,3.4,4.3));
  for(let i=0;i<9;i++){const o=new Mesh(new IcosahedronGeometry(.35+rnd()*.3,0),lam(ore,{flatShading:true}));o.position.set(-6+rnd()*12,.3,5.5+rnd()*3);o.castShadow=true;g.add(o)}
  const cart=new Group();cart.add(box(1.6,.8,1.1,'#475569',0,.8,0));[-.6,.6].forEach(x=>[-.45,.45].forEach(z=>{const w=cyl(.28,.28,.12,'#222',x,.3,z);w.rotation.x=Math.PI/2;cart.add(w)}));cart.position.set(3.5,0,6.5);cart.rotation.y=.4;g.add(cart);
  return g}
function furnace(){
  const g=new Group();g.add(box(6,4.4,5,'#8b4a2b',0,2.2,0),box(6.4,.5,5.4,'#5b3a2a',0,4.5,0));
  g.add(cyl(.9,1.1,5,'#4b5563',-1.6,6.6,-1));const gl=new Mesh(new CylinderGeometry(.85,.85,.3,12),new MeshBasicMaterial({color:'#fb923c'}));gl.position.set(-1.6,9.1,-1);g.add(gl);
  g.add(box(2.2,1.9,.4,'#1a0f0a',1,1.5,2.55));const f=new Mesh(new PlaneGeometry(1.7,1.4),new MeshBasicMaterial({color:'#fb923c'}));f.position.set(1,1.5,2.78);g.add(f);
  return g}
function market(){
  const g=new Group();g.add(box(6,1.1,2,'#a16207',0,.55,0));
  [-2.8,2.8].forEach(x=>g.add(box(.3,3.4,.3,'#7a4f2a',x,1.7,-.8),box(.3,3.4,.3,'#7a4f2a',x,1.7,1.4)));
  for(let i=0;i<8;i++)g.add(box(.75,.15,3.2,i%2?'#f8fafc':'#ef4444',-2.6+i*.75,3.5-.1*Math.abs(i-3.5)*0,.3));
  g.add(box(1,1,1,'#b45309',-4.2,.5,1.2),box(1,1,1,'#92400e',-4.2,1.5,1.2),box(1.1,.8,1.1,'#65a30d',4.3,.4,1.1));
  return g}

// Spielfigur: Arbeiter mit Helm und Weste
function worker(){
  const g=new Group(),skin='#f1c9a5';
  const body=new Mesh(new CapsuleGeometry(.38,.55,4,10),lam('#f97316'));body.position.y=1.15;body.castShadow=true;g.add(body);
  const head=new Mesh(new SphereGeometry(.3,12,10),lam(skin));head.position.y=1.85;head.castShadow=true;g.add(head);
  const helm=new Mesh(new SphereGeometry(.34,12,8,0,Math.PI*2,0,Math.PI/2),lam('#facc15'));helm.position.y=1.9;g.add(helm);
  const brim=box(.7,.05,.25,'#facc15',0,1.9,.28);g.add(brim);
  const mk=(x)=>{const p=new Group();p.add(box(.22,.7,.24,'#334155',0,-.35,0));p.position.set(x,.75,0);g.add(p);return p};
  const legL=mk(-.17),legR=mk(.17);
  const arm=(x)=>{const p=new Group();p.add(box(.16,.55,.18,'#f97316',0,-.27,0));p.position.set(x,1.5,0);g.add(p);return p};
  const armL=arm(-.5),armR=arm(.5);
  g.userData={legL,legR,armL,armR};return g}

const WARES=['erz','kohle','stahl'];
const STATIONS=[
  {id:'erz',n:'Eisenerz',at:[-16,-6],r:5.2,kind:'mine',rock:'#6b7280',ore:'#b45f3c',ry:.5},
  {id:'kohle',n:'Kohle',at:[16,-6],r:5.2,kind:'mine',rock:'#374151',ore:'#111827',ry:-.5},
  {id:'stahl',n:'Schmelzofen',at:[0,-22],r:4.2,kind:'furnace',ry:0},
  {id:'markt',n:'Markt',at:[0,16],r:3.4,kind:'market',ry:Math.PI}
];

export function open3d(){
  if(window.__w3d)return;
  const root=document.createElement('div');root.id='w3d';
  root.innerHTML=`<canvas id="w3c"></canvas><div class="w3top"><button class="btn sm" id="w3x">⬅ Zurück</button><div class="w3hud" id="w3h"></div></div>
    <div class="w3act" id="w3a" hidden><button class="btn a big" id="w3b"></button></div>
    <div class="w3stick" id="w3s"><i id="w3k"></i></div><div class="w3hint" id="w3t">Links: Laufen · Rechts wischen: Kamera</div>`;
  document.body.appendChild(root);
  let renderer;
  try{renderer=new WebGLRenderer({canvas:$('w3c'),antialias:true,powerPreference:'high-performance'})}
  catch(e){root.remove();toast('3D wird von diesem Gerät nicht unterstützt');return}
  window.__w3d=1;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFSoftShadowMap;
  const ph=dayPhase(),SKY={night:'#0b1030',dawn:'#f4a97b',day:'#8ecbff',dusk:'#e88a5a'}[ph],LI={night:.25,dawn:.7,day:1,dusk:.75}[ph];
  const scene=new Scene();scene.background=new Color(SKY);scene.fog=new Fog(SKY,35,90);
  scene.add(new HemisphereLight('#ffffff','#5b7a3a',.65*LI+.2));
  const sun=new DirectionalLight('#fff4d6',.95*LI+.1);sun.position.set(-18,30,14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:90});scene.add(sun,sun.target);
  const cam=new PerspectiveCamera(55,1,.1,200);
  // Boden und Wege
  const ground=new Mesh(new PlaneGeometry(220,220),lam('#6aa84f'));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const path=(x,z,w,d)=>{const p=new Mesh(new PlaneGeometry(w,d),lam('#c2a878'));p.rotation.x=-Math.PI/2;p.position.set(x,.02,z);p.receiveShadow=true;scene.add(p)};
  path(0,-2,5,44);path(-8,-6,18,4);path(8,-6,18,4);
  // Bäume
  const trunk=new InstancedMesh(new CylinderGeometry(.25,.35,1.6,6),lam('#6b4423'),70),crown=new InstancedMesh(new ConeGeometry(1.5,3.6,7),lam('#2f7d32',{flatShading:true}),70),dm=new Object3D();
  let n=0;while(n<70){const x=(rnd()-.5)*110,z=(rnd()-.5)*110;if(Math.abs(x)<9&&z>-30&&z<22)continue;if(STATIONS.some(s=>Math.hypot(s.at[0]-x,s.at[1]-z)<s.r+4))continue;
    const k=.8+rnd()*.7;dm.position.set(x,.8*k,z);dm.scale.setScalar(k);dm.updateMatrix();trunk.setMatrixAt(n,dm.matrix);dm.position.y=(1.6+1.8)*k;dm.updateMatrix();crown.setMatrixAt(n,dm.matrix);n++}
  trunk.castShadow=crown.castShadow=true;scene.add(trunk,crown);
  // Stationen
  const zones=[];
  for(const s of STATIONS){
    const g=s.kind==='mine'?mine(s.rock,s.ore):s.kind==='furnace'?furnace():market();
    g.position.set(s.at[0],0,s.at[1]);g.rotation.y=s.ry;scene.add(g);
    const lb=label(s.n,'');lb.position.set(s.at[0],s.kind==='furnace'?11.5:7.5,s.at[1]);scene.add(lb);s.lb=lb;
    // Standplatz vor dem Eingang (in Blickrichtung der Station gedreht)
    const out=s.kind==='market'?4.6:s.r+1.6,zx=s.at[0]+Math.sin(s.ry)*out,zz=s.at[1]+Math.cos(s.ry)*out;
    const ring=new Mesh(new RingGeometry(1.7,2.1,32),new MeshBasicMaterial({color:'#22d3ee',side:DoubleSide,transparent:true,opacity:.85}));ring.rotation.x=-Math.PI/2;ring.position.set(zx,.06,zz);scene.add(ring);
    zones.push({s,x:zx,z:zz,ring});
  }
  const hero=worker();hero.position.set(0,0,6);scene.add(hero);
  const P={x:0,z:6,yaw:Math.PI,speed:0},C={yaw:0,pitch:.38,dist:9};cam.position.set(P.x+Math.sin(C.yaw)*Math.cos(C.pitch)*C.dist,1.6+Math.sin(C.pitch)*C.dist,P.z+Math.cos(C.yaw)*Math.cos(C.pitch)*C.dist);
  const keys={};let stick={x:0,y:0},camDrag=null,stickId=null,alive=true,near=null,tm=0;
  const stickEl=$('w3s'),knob=$('w3k');
  const key=e=>{if(OV)return;keys[e.code]=e.type==='keydown'};addEventListener('keydown',key);addEventListener('keyup',key);
  // Daumenstick links, Kamera-Wischen rechts (auch mit der Maus)
  const area=root;
  area.addEventListener('pointerdown',e=>{if(e.target.closest('button')||OV)return;
    if(e.clientX<innerWidth*.45&&stickId==null){stickId=e.pointerId;const r=stickEl.getBoundingClientRect();stickEl.dataset.ox=e.clientX;stickEl.dataset.oy=e.clientY;stickEl.style.cssText=`left:${e.clientX-60}px;top:${e.clientY-60}px;opacity:1`;stick={x:0,y:0}}
    else if(camDrag==null)camDrag={id:e.pointerId,x:e.clientX,y:e.clientY};try{area.setPointerCapture(e.pointerId)}catch(_){}});
  area.addEventListener('pointermove',e=>{
    if(e.pointerId===stickId){let dx=e.clientX-+stickEl.dataset.ox,dy=e.clientY-+stickEl.dataset.oy;const l=Math.hypot(dx,dy),m=52;if(l>m){dx*=m/l;dy*=m/l}stick={x:dx/m,y:dy/m};knob.style.transform=`translate(${dx}px,${dy}px)`}
    else if(camDrag&&e.pointerId===camDrag.id){C.yaw-=(e.clientX-camDrag.x)*.008;C.pitch=MathUtils.clamp(C.pitch+(e.clientY-camDrag.y)*.005,.12,1.05);camDrag.x=e.clientX;camDrag.y=e.clientY}});
  const up=e=>{if(e.pointerId===stickId){stickId=null;stick={x:0,y:0};knob.style.transform='';stickEl.style.opacity=0}if(camDrag&&e.pointerId===camDrag.id)camDrag=null};
  area.addEventListener('pointerup',up);area.addEventListener('pointercancel',up);
  const resize=()=>{const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};resize();addEventListener('resize',resize);
  // Aktionsknopf an der Station
  const act=$('w3b'),actBox=$('w3a');
  const stockLine=()=>WARES.map(g=>`${G[g].n} ${Math.floor(S.stock[g]||0)}`).join(' · ');
  const hud=()=>{$('w3h').innerHTML=`<b>${fmt(Math.floor(S.money))} Cr</b><span>Level ${lvl()}</span><small>${stockLine()}</small>`};
  const refreshAct=()=>{
    if(!near){actBox.hidden=true;return}const s=near.s;actBox.hidden=false;
    if(s.id==='markt'){const total=WARES.reduce((a,g)=>a+Math.floor(S.stock[g]||0),0);act.textContent=total?`Alles verkaufen (${total} Waren)`:'Nichts zu verkaufen';act.disabled=!total}
    else{const st=ST.find(x=>x.id===s.id);const miss=Object.keys(st.in).filter(k=>S.stock[k]<st.in[k]);act.disabled=false;
      act.textContent=miss.length?`Es fehlt: ${miss.map(k=>G[k].n).join(', ')}`:`▶ ${st.n}`;act.disabled=!!miss.length}};
  act.onclick=async e=>{if(!near||OV)return;const s=near.s;
    if(s.id==='markt'){let sum=0,k=0;for(const g of WARES){const n=Math.floor(S.stock[g]||0);for(let i=0;i<n;i++){sum+=sellP(g);sat[g]+=1}if(n){S.stock[g]-=n;k+=n}}
      if(!k){SFX.err();return}S.money+=sum;S.xp+=Math.ceil(sum/12);track('sold',null,k);SFX.coin();toast('+'+fmt(sum)+' Cr · '+k+' Waren verkauft');hud();refreshAct();return}
    const st=ST.find(x=>x.id===s.id);await runStation(st);hud();refreshAct()};
  const exit=()=>{alive=false;removeEventListener('keydown',key);removeEventListener('keyup',key);removeEventListener('resize',resize);
    scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map&&m.map.dispose();m.dispose()})}});
    renderer.dispose();root.remove();window.__w3d=0;delete window.__w3dState};
  $('w3x').onclick=exit;
  window.__w3dState=()=>({x:P.x,z:P.z,zones:zones.map(z=>({id:z.s.id,x:z.x,z:z.z})),near:near&&near.s.id,alive,calls:renderer.info.render.calls,tri:renderer.info.render.triangles});
  window.__w3dTeleport=(x,z)=>{P.x=x;P.z=z};
  let last=performance.now(),hudT=0;
  const SPEED=6.2;
  (function frame(now){
    if(!alive)return;requestAnimationFrame(frame);
    const dt=Math.min(.05,(now-last)/1000);last=now;tm+=dt;
    // Eingabe: Stick oder Tasten, relativ zur Kamera
    let ix=stick.x,iz=stick.y;
    if(!OV){if(keys.KeyA||keys.ArrowLeft)ix-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;if(keys.KeyW||keys.ArrowUp)iz-=1;if(keys.KeyS||keys.ArrowDown)iz+=1}
    const il=Math.hypot(ix,iz);if(il>1){ix/=il;iz/=il}
    if(OV){ix=iz=0}
    const mv=Math.min(1,il);
    if(mv>.08){
      const sy=Math.sin(C.yaw),cy=Math.cos(C.yaw);
      const wx=ix*cy+iz*sy,wz=-ix*sy+iz*cy; // Eingabe in Weltrichtung (Kamera blickt in −Richtung ihres Gierwinkels)
      P.x+=wx*SPEED*mv*dt;P.z+=wz*SPEED*mv*dt;
      const target=Math.atan2(wx,wz);let d=target-P.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));P.yaw+=d*Math.min(1,dt*12);
      P.speed=mv}else P.speed*=.8;
    // Hindernisse: Gebäude und Spielfeldrand
    for(const s of STATIONS){const dx=P.x-s.at[0]||.001,dz=P.z-s.at[1],l=Math.hypot(dx,dz),m=s.r+.6;if(l<m){P.x=s.at[0]+dx/l*m;P.z=s.at[1]+dz/l*m}}
    P.x=MathUtils.clamp(P.x,-48,48);P.z=MathUtils.clamp(P.z,-44,44);
    hero.position.set(P.x,0,P.z);hero.rotation.y=P.yaw;
    const sw=Math.sin(tm*11)*.7*P.speed,u=hero.userData;u.legL.rotation.x=sw;u.legR.rotation.x=-sw;u.armL.rotation.x=-sw;u.armR.rotation.x=sw;hero.position.y=Math.abs(Math.sin(tm*11))*.08*P.speed;
    // Kamera hinter der Figur
    const cx=P.x+Math.sin(C.yaw)*Math.cos(C.pitch)*C.dist,cz=P.z+Math.cos(C.yaw)*Math.cos(C.pitch)*C.dist,cyy=1.6+Math.sin(C.pitch)*C.dist;
    cam.position.x+=(cx-cam.position.x)*Math.min(1,dt*8);cam.position.y+=(cyy-cam.position.y)*Math.min(1,dt*8);cam.position.z+=(cz-cam.position.z)*Math.min(1,dt*8);
    cam.lookAt(P.x,1.4,P.z);
    sun.position.set(P.x-18,30,P.z+14);sun.target.position.set(P.x,0,P.z);
    // Standplätze
    let nn=null;for(const z of zones){const d=Math.hypot(P.x-z.x,P.z-z.z);z.ring.material.opacity=d<2.6?1:.55;z.ring.scale.setScalar(1+Math.sin(tm*3)*.06);if(d<2.6)nn=z}
    if(nn!==near){near=nn;if(near)SFX.tick();refreshAct()}
    if((hudT-=dt)<=0){hudT=.5;hud();refreshAct();const t=$('w3t');if(t&&tm>8)t.style.opacity=0}
    renderer.render(scene,cam);
  })(performance.now());
}
