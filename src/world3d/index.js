/* 3D-Modus: begehbare Welt (Three.js, Modelle aus Blender). Nutzt denselben Spielstand und dieselben Minispiele wie das 2D-Spiel. */
import {ACESFilmicToneMapping,BackSide,Box3,Ray,Vector3,CanvasTexture,Color,DirectionalLight,DoubleSide,Fog,Group,HemisphereLight,InstancedMesh,MathUtils,Mesh,MeshBasicMaterial,MeshLambertMaterial,
  Object3D,PCFSoftShadowMap,PerspectiveCamera,PlaneGeometry,PointLight,RepeatWrapping,RingGeometry,Scene,SphereGeometry,Sprite,SpriteMaterial,SRGBColorSpace,WebGLRenderer,Float32BufferAttribute} from 'three';
import {G,ST} from '../data.js';
import {runStation} from '../features/workshop.js';
import {SFX,toast} from '../fx.js';
import {S,lvl,sellP,sat,track} from '../state.js';
import {OV} from '../ui.js';
import {$,fmt,ic} from '../util.js';
import {dayPhase} from '../world.js';
import {loadAll} from './models.js';

const WARES=['erz','kohle','stahl'];
// Rotation um Y: lokal (x,z) → Welt
const rot=(x,z,a)=>[x*Math.cos(a)+z*Math.sin(a),-x*Math.sin(a)+z*Math.cos(a)];
// colliders: Kreise oder achsenparallele Kästen (nur bei Drehung 0 oder π), lokal zur Station; h = Höhe (für die Kamera)
const STATIONS=[
  {id:'erz',n:'Eisenerz',at:[-17,-6],ry:.5,model:'mine',tint:{rock:'#868f9e',ore:'#c2603a'},zone:[2.7,8.4],h:6,
    col:[{x:0,z:-1.2,r:5.8},{x:-4.6,z:1.2,r:3.3},{x:4.8,z:.4,r:2.9}],lblY:8},
  {id:'kohle',n:'Kohle',at:[17,-6],ry:-.5,model:'mine',tint:{rock:'#4b5563',ore:'#15161c'},zone:[-2.7,8.4],h:6,
    col:[{x:0,z:-1.2,r:5.8},{x:-4.6,z:1.2,r:3.3},{x:4.8,z:.4,r:2.9}],lblY:8},
  {id:'stahl',n:'Schmelzofen',at:[0,-24],ry:0,model:'furnace',zone:[0,5.4],h:6,col:[{x:0,z:0,hw:3.8,hd:3.2}],lblY:12.8},
  {id:'markt',n:'Markt',at:[0,17],ry:Math.PI,model:'market',zone:[0,3.9],h:4.2,col:[{x:0,z:0,hw:3.3,hd:1.6},{x:-4.4,z:.4,hw:1.1,hd:1.2},{x:4.3,z:-.4,hw:.8,hd:.9}],lblY:6.6}
];
// Kollisionen in Weltkoordinaten vorberechnen
for(const s of STATIONS)s.cw=s.col.map(c=>{const [dx,dz]=rot(c.x,c.z,s.ry);return {...c,x:s.at[0]+dx,z:s.at[1]+dz,h:s.h}});
const EXTRA=[]; // zusätzliche Hindernisse (Bäume, Laternen, Truck)

let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;

function softTex(inner='rgba(255,255,255,.9)'){
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,30);
  g.addColorStop(0,inner);g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new CanvasTexture(c)}
function grassTex(){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#62a84c';x.fillRect(0,0,256,256);
  for(let i=0;i<900;i++){x.fillStyle=`hsla(${95+Math.random()*30},${40+Math.random()*25}%,${38+Math.random()*20}%,.35)`;const r=2+Math.random()*9;x.beginPath();x.arc(Math.random()*256,Math.random()*256,r,0,7);x.fill()}
  const t=new CanvasTexture(c);t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(40,40);t.colorSpace=SRGBColorSpace;t.anisotropy=4;return t}
function pathTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#c9ab7c';x.fillRect(0,0,128,128);
  for(let i=0;i<260;i++){x.fillStyle=`hsla(${32+Math.random()*10},${30+Math.random()*20}%,${48+Math.random()*22}%,.5)`;x.beginPath();x.arc(Math.random()*128,Math.random()*128,1+Math.random()*4,0,7);x.fill()}
  const t=new CanvasTexture(c);t.wrapS=t.wrapT=RepeatWrapping;t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t}
function skyDome(top,mid,bot){
  const g=new SphereGeometry(160,24,16),pos=g.attributes.position,cols=[],a=new Color(top),b=new Color(mid),d=new Color(bot),c=new Color();
  for(let i=0;i<pos.count;i++){const y=pos.getY(i)/160;if(y>0)c.copy(b).lerp(a,Math.pow(y,.6));else c.copy(b).lerp(d,Math.min(1,-y*3));cols.push(c.r,c.g,c.b)}
  g.setAttribute('color',new Float32BufferAttribute(cols,3));
  return new Mesh(g,new MeshBasicMaterial({vertexColors:true,side:BackSide,fog:false,depthWrite:false}))}
// Beschriftung über einem Gebäude (Name + Zustand)
function label(){
  const c=document.createElement('canvas');c.width=512;c.height=170;const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;
  const s=new Sprite(new SpriteMaterial({map:t,depthTest:false,transparent:true,fog:false}));s.scale.set(5.6,1.86,1);s.renderOrder=5;
  s.userData.set=(name,sub,ok)=>{const key=name+'|'+sub;if(s.userData.key===key)return;s.userData.key=key;const x=c.getContext('2d');x.clearRect(0,0,512,170);
    x.fillStyle='rgba(10,16,40,.82)';x.beginPath();x.roundRect(8,8,496,154,30);x.fill();x.strokeStyle=ok?'#34d399':'#fbbf24';x.lineWidth=5;x.stroke();
    x.fillStyle='#fff';x.font='800 58px system-ui,sans-serif';x.textAlign='center';x.fillText(name,256,78);
    x.fillStyle=ok?'#34d399':'#fbbf24';x.font='700 34px system-ui,sans-serif';x.fillText(sub,256,130);t.needsUpdate=true};
  return s}
// Modell als InstancedMesh mehrfach platzieren (ein Mesh pro Material)
function scatter(scene,model,mats){
  const parts=[];model.updateMatrixWorld(true);model.traverse(o=>{if(o.isMesh)parts.push(o)});
  const group=new Group();
  for(const p of parts){const im=new InstancedMesh(p.geometry,p.material,mats.length);im.castShadow=true;im.receiveShadow=true;
    const m=new Object3D();mats.forEach((mm,i)=>{m.matrix.copy(mm).multiply(p.matrixWorld);im.setMatrixAt(i,m.matrix)});im.instanceMatrix.needsUpdate=true;group.add(im)}
  scene.add(group);return group}
const place=(x,z,s=1,r=0)=>{const o=new Object3D();o.position.set(x,0,z);o.rotation.y=r;o.scale.setScalar(s);o.updateMatrix();return o.matrix.clone()};

export async function open3d(){
  if(window.__w3d)return;
  const root=document.createElement('div');root.id='w3d';
  root.innerHTML=`<canvas id="w3c"></canvas><div class="w3load" id="w3l"><b>3D-Welt wird aufgebaut …</b></div><div class="w3vig"></div>
    <div class="w3top"><button class="btn sm" id="w3x">⬅ Zurück</button><div class="w3hud" id="w3h"></div></div>
    <div class="w3act" id="w3a" hidden><button class="btn a big" id="w3b"></button></div>
    <div class="w3stick" id="w3s"><i id="w3k"></i></div><div class="w3hint" id="w3t">Links: Laufen · Rechts wischen: Kamera</div>`;
  document.body.appendChild(root);
  let renderer;
  try{renderer=new WebGLRenderer({canvas:$('w3c'),antialias:true,powerPreference:'high-performance'})}
  catch(e){root.remove();toast('3D wird von diesem Gerät nicht unterstützt');return}
  window.__w3d=1;
  let alive=true;
  const M=await loadAll(['worker','mine','furnace','market','truck','pine','oak','rock','bush','lamp','fence','signpost','crates']).catch(e=>{toast('3D-Modelle konnten nicht geladen werden');return null});
  if(!M||!window.__w3d){renderer.dispose();root.remove();window.__w3d=0;return}
  $('w3l').remove();
  let pr=Math.min(devicePixelRatio||1,2);renderer.setPixelRatio(pr);renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFSoftShadowMap;
  renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const ph=dayPhase(),night=ph==='night';
  const SK={night:['#050a24','#16224a','#0b1230'],dawn:['#4d77c4','#f7b98d','#f0d8b8'],day:['#2f86e0','#9fd3ff','#cfe9ff'],dusk:['#3b4a96','#f08c5c','#f4c28f']}[ph];
  const LI={night:.28,dawn:.75,day:1,dusk:.78}[ph],FOG=SK[1];
  const scene=new Scene();scene.background=new Color(FOG);scene.fog=new Fog(FOG,40,125);
  scene.add(skyDome(...SK));
  scene.add(new HemisphereLight(night?'#6d7fc4':'#ffffff',night?'#1c2a1c':'#6b8e4e',.62*LI+.18));
  const sun=new DirectionalLight(night?'#9db4ff':ph==='day'?'#fff2d4':'#ffc891',1.25*LI+.15);sun.position.set(-20,32,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;
  Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:100});scene.add(sun,sun.target);
  const cam=new PerspectiveCamera(55,1,.1,260);
  // Boden, Wege
  const gt=grassTex(),ground=new Mesh(new PlaneGeometry(320,320),new MeshLambertMaterial({map:gt}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const pt=pathTex(),pm=new MeshLambertMaterial({map:pt});
  const path=(x,z,w,d)=>{const t=pt.clone();t.needsUpdate=true;t.repeat.set(w/6,d/6);t.anisotropy=8;const p=new Mesh(new PlaneGeometry(w,d),new MeshLambertMaterial({map:t}));p.rotation.x=-Math.PI/2;p.position.set(x,.025,z);p.receiveShadow=true;scene.add(p)};
  path(0,-3,5.2,46);path(-9,-3,20,4.2);path(9,-3,20,4.2);path(-17,-6+7,3.6,16);path(17,-6+7,3.6,16);
  // Plätze vor den Stationen
  const plaza=(x,z,r)=>{const m=new Mesh(new RingGeometry(0,r,28),new MeshLambertMaterial({map:pt}));m.rotation.x=-Math.PI/2;m.position.set(x,.03,z);m.receiveShadow=true;scene.add(m)};
  plaza(0,6,7.5);plaza(0,-17,6);plaza(0,12,5);
  // Stationen
  const zones=[];
  for(const s of STATIONS){
    const g=M[s.model].clone(true);
    g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(s.tint&&s.tint[o.material.name])o.material.color.set(s.tint[o.material.name])}});
    s.g=g;s.fade=1;
    g.position.set(s.at[0],0,s.at[1]);g.rotation.y=s.ry;scene.add(g);g.updateMatrixWorld(true);s.box=new Box3().setFromObject(g);
    s.lb=label();const [lx,lz]=[s.at[0],s.at[1]];s.lb.position.set(lx,s.lblY,lz);scene.add(s.lb);
    const [zx,zz]=rot(s.zone[0],s.zone[1],s.ry),X=s.at[0]+zx,Z=s.at[1]+zz;
    const ring=new Mesh(new RingGeometry(1.7,2.1,40),new MeshBasicMaterial({color:'#22d3ee',side:DoubleSide,transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(X,.07,Z);scene.add(ring);
    const disc=new Mesh(new RingGeometry(0,1.7,40),new MeshBasicMaterial({color:'#22d3ee',side:DoubleSide,transparent:true,opacity:.14,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.set(X,.06,Z);scene.add(disc);
    zones.push({s,x:X,z:Z,ring,disc});
  }
  // Deko: LKW am Markt, Zaun, Laternen, Wegweiser, Kisten
  const truck=M.truck.clone(true);truck.position.set(11,0,15);truck.rotation.y=-2.4;scene.add(truck);EXTRA.length=0;EXTRA.push({x:11,z:15,r:2.4,h:3});
  const lamps=[[-3.6,6],[3.6,6],[-3.6,-8],[3.6,-8],[-3.6,-17],[3.6,-17],[-3.6,12],[3.6,12]];
  lamps.forEach(([x,z])=>{const l=M.lamp.clone(true);l.position.set(x,0,z);scene.add(l);EXTRA.push({x,z,r:.4,h:4})});
  const fenceM=[];for(let i=-5;i<=5;i++){if(Math.abs(i)<1)continue;fenceM.push(place(i*3.8,-35,1,0))}for(let i=-5;i<=5;i++)fenceM.push(place(i*3.8,36,1,0));scatter(scene,M.fence,fenceM);
  const sp=M.signpost.clone(true);sp.position.set(4.2,0,0);sp.rotation.y=-.5;scene.add(sp);
  const cr=M.crates.clone(true);cr.position.set(-7,0,13.5);cr.rotation.y=.4;scene.add(cr);EXTRA.push({x:-7,z:13.5,r:1.3,h:2});
  // Wald, Felsen, Büsche
  const free=(x,z,pad=3)=>!(Math.abs(x)<8&&z>-34&&z<26)&&!STATIONS.some(s=>Math.hypot(s.at[0]-x,s.at[1]-z)<10+pad)&&Math.hypot(x-11,z-15)>5&&!(Math.abs(z+3)<4&&Math.abs(x)<26)&&!(Math.abs(Math.abs(x)-17)<4&&z>0&&z<16);
  const pines=[],oaks=[],rocks=[],bushes=[];
  for(let i=0;i<260&&pines.length+oaks.length<110;i++){const x=(rnd()-.5)*150,z=(rnd()-.5)*140;if(!free(x,z))continue;const k=.75+rnd()*.7;(rnd()<.55?pines:oaks).push(place(x,z,k,rnd()*6.28));EXTRA.push({x,z,r:.5*k,h:6})}
  for(let i=0;i<90&&rocks.length<22;i++){const x=(rnd()-.5)*110,z=(rnd()-.5)*100;if(!free(x,z,1))continue;rocks.push(place(x,z,.6+rnd()*1.0,rnd()*6.28))}
  for(let i=0;i<200&&bushes.length<40;i++){const x=(rnd()-.5)*110,z=(rnd()-.5)*100;if(!free(x,z,1))continue;bushes.push(place(x,z,.8+rnd()*.7,rnd()*6.28))}
  scatter(scene,M.pine,pines);scatter(scene,M.oak,oaks);scatter(scene,M.rock,rocks);scatter(scene,M.bush,bushes);
  // Blumen
  {const fl=new InstancedMesh(new SphereGeometry(.09,5,4),new MeshLambertMaterial({color:'#ffffff'}),180),m=new Object3D(),cs=['#f472b6','#fde047','#f8fafc','#fb923c','#a78bfa'];
    let n=0;while(n<180){const x=(rnd()-.5)*100,z=(rnd()-.5)*90;if(!free(x,z,0))continue;m.position.set(x,.1,z);m.updateMatrix();fl.setMatrixAt(n,m.matrix);fl.setColorAt(n,new Color(cs[n%5]));n++}scene.add(fl)}
  // Wolken
  const clouds=[],cm=new MeshBasicMaterial({color:night?'#3a4570':'#ffffff',transparent:true,opacity:night?.5:.92,fog:false});
  for(let i=0;i<9;i++){const g=new Group();for(let k=0;k<4;k++){const b=new Mesh(new SphereGeometry(2+rnd()*2,8,6),cm);b.scale.y=.55;b.position.set(k*2.6-4,rnd(),rnd()*1.5);g.add(b)}
    g.position.set((rnd()-.5)*260,45+rnd()*18,(rnd()-.5)*200);g.scale.setScalar(1.4+rnd());scene.add(g);clouds.push(g)}
  // Rauch am Schornstein, Funken, Staub
  const st=softTex(),sm=[];
  const mkSprite=(col,op=.5)=>{const s=new Sprite(new SpriteMaterial({map:st,color:col,transparent:true,opacity:op,depthWrite:false}));scene.add(s);return s};
  const fz=STATIONS[2].at,chim=[fz[0]-1.7,11.8,fz[1]-.8];
  for(let i=0;i<12;i++){const s=mkSprite(night?'#9aa0b8':'#d4d4d8');s.userData.t=i/12;sm.push(s)}
  const dust=[];for(let i=0;i<8;i++){const s=mkSprite('#d9c7a0',.5);s.visible=false;s.userData.t=1;dust.push(s)}
  const glow=new PointLight('#ff8a3d',night?60:26,16,1.6);glow.position.set(fz[0],2.2,fz[1]+3.6);scene.add(glow);
  // Spielfigur
  const hero=M.worker.clone(true);scene.add(hero);
  const lg=n=>hero.getObjectByName(n),legL=lg('!legL'),legR=lg('!legR'),armL=lg('!armL'),armR=lg('!armR');
  const P={x:0,z:7,yaw:Math.PI,speed:0},C={yaw:0,pitch:.42,dist:10.5};
  cam.position.set(P.x+Math.sin(C.yaw)*Math.cos(C.pitch)*C.dist,1.6+Math.sin(C.pitch)*C.dist,P.z+Math.cos(C.yaw)*Math.cos(C.pitch)*C.dist);
  const keys={};let stick={x:0,y:0},camDrag=null,stickId=null,near=null,tm=0,dustT=0,fps=60,slow=0;
  const stickEl=$('w3s'),knob=$('w3k');
  const key=e=>{if(OV)return;keys[e.code]=e.type==='keydown'};addEventListener('keydown',key);addEventListener('keyup',key);
  const area=root;
  area.addEventListener('pointerdown',e=>{if(e.target.closest('button')||OV)return;
    if(e.clientX<innerWidth*.45&&stickId==null){stickId=e.pointerId;stickEl.dataset.ox=e.clientX;stickEl.dataset.oy=e.clientY;stickEl.style.cssText=`left:${e.clientX-60}px;top:${e.clientY-60}px;opacity:1`;stick={x:0,y:0}}
    else if(camDrag==null)camDrag={id:e.pointerId,x:e.clientX,y:e.clientY};try{area.setPointerCapture(e.pointerId)}catch(_){}});
  area.addEventListener('pointermove',e=>{
    if(e.pointerId===stickId){let dx=e.clientX-+stickEl.dataset.ox,dy=e.clientY-+stickEl.dataset.oy;const l=Math.hypot(dx,dy),m=52;if(l>m){dx*=m/l;dy*=m/l}stick={x:dx/m,y:dy/m};knob.style.transform=`translate(${dx}px,${dy}px)`}
    else if(camDrag&&e.pointerId===camDrag.id){C.yaw-=(e.clientX-camDrag.x)*.008;C.pitch=MathUtils.clamp(C.pitch+(e.clientY-camDrag.y)*.005,.14,1.1);camDrag.x=e.clientX;camDrag.y=e.clientY}});
  const up=e=>{if(e.pointerId===stickId){stickId=null;stick={x:0,y:0};knob.style.transform='';stickEl.style.opacity=0}if(camDrag&&e.pointerId===camDrag.id)camDrag=null};
  area.addEventListener('pointerup',up);area.addEventListener('pointercancel',up);
  const resize=()=>{const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};resize();addEventListener('resize',resize);
  // Aktionsknopf und Anzeige
  const act=$('w3b'),actBox=$('w3a');
  const hud=()=>{$('w3h').innerHTML=`<div class="w3r"><b>${fmt(Math.floor(S.money))} Cr</b><span>Level ${lvl()}</span></div><div class="w3r">${WARES.map(g=>`<span class="w3c">${ic(g,20)}${Math.floor(S.stock[g]||0)}</span>`).join('')}</div>`};
  const need=s=>{const st=ST.find(x=>x.id===s.id);return Object.keys(st.in).filter(k=>S.stock[k]<st.in[k])};
  const stateOf=s=>{
    if(s.id==='markt'){const t=WARES.reduce((a,g)=>a+Math.floor(S.stock[g]||0),0);return t?[`${t} Waren verkaufen`,1]:['Nichts zu verkaufen',0]}
    const m=need(s);return m.length?['Fehlt: '+m.map(k=>G[k].n).join(', '),0]:['Bereit zum Arbeiten',1]};
  const refreshLabels=()=>STATIONS.forEach(s=>{const [t,ok]=stateOf(s);s.lb.userData.set(s.n,t,ok)});
  const refreshAct=()=>{
    if(!near){actBox.hidden=true;return}const s=near.s;actBox.hidden=false;
    if(s.id==='markt'){const total=WARES.reduce((a,g)=>a+Math.floor(S.stock[g]||0),0);act.innerHTML=total?`💰 Alles verkaufen (${total} Waren)`:'Nichts zu verkaufen';act.disabled=!total}
    else{const st=ST.find(x=>x.id===s.id),m=need(s);act.disabled=!!m.length;act.innerHTML=m.length?`Es fehlt: ${m.map(k=>G[k].n).join(', ')}`:`▶ ${st.n}`}};
  act.onclick=async()=>{if(!near||OV)return;const s=near.s;
    if(s.id==='markt'){let sum=0,k=0;for(const g of WARES){const n=Math.floor(S.stock[g]||0);for(let i=0;i<n;i++){sum+=sellP(g);sat[g]+=1}if(n){S.stock[g]-=n;k+=n}}
      if(!k){SFX.err();return}S.money+=sum;S.xp+=Math.ceil(sum/12);track('sold',null,k);SFX.coin();toast('+'+fmt(sum)+' Cr · '+k+' Waren verkauft');hud();refreshAct();refreshLabels();return}
    await runStation(ST.find(x=>x.id===s.id));hud();refreshAct();refreshLabels()};
  const exit=()=>{alive=false;removeEventListener('keydown',key);removeEventListener('keyup',key);removeEventListener('resize',resize);
    scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map&&m.map.dispose();m.dispose()})}});
    renderer.dispose();root.remove();window.__w3d=0;delete window.__w3dState};
  $('w3x').onclick=exit;
  window.__w3dState=()=>({x:P.x,z:P.z,zones:zones.map(z=>({id:z.s.id,x:z.x,z:z.z})),near:near&&near.s.id,alive,calls:renderer.info.render.calls,tri:renderer.info.render.triangles,pr});
  window.__w3dTeleport=(x,z)=>{P.x=x;P.z=z};
  hud();refreshLabels();
  // Kollision (Kreis gegen Kreise und Kästen)
  const R=.55;
  const push=(c)=>{
    if(c.r!=null){const dx=P.x-c.x||.001,dz=P.z-c.z,l=Math.hypot(dx,dz),m=c.r+R;if(l<m){P.x=c.x+dx/l*m;P.z=c.z+dz/l*m}}
    else{const dx=P.x-c.x,dz=P.z-c.z,ox=c.hw+R-Math.abs(dx),oz=c.hd+R-Math.abs(dz);if(ox>0&&oz>0){if(ox<oz)P.x+=Math.sign(dx||1)*ox;else P.z+=Math.sign(dz||1)*oz}}};
  const inside=(c,x,z,y)=>y<c.h&&(c.r!=null?Math.hypot(x-c.x,z-c.z)<c.r:Math.abs(x-c.x)<c.hw&&Math.abs(z-c.z)<c.hd);
  const allCols=[...STATIONS.flatMap(s=>s.cw),...EXTRA];
  let last=performance.now(),hudT=0;const SPEED=6.4;
  (function frame(now){
    if(!alive)return;requestAnimationFrame(frame);
    const dt=Math.min(.05,(now-last)/1000);last=now;tm+=dt;
    // Anpassung an langsame Geräte: nach 2 s unter 30 Bildern/s Auflösung und Schatten senken
    fps+=((1/Math.max(dt,.001))-fps)*.05;if(fps<30&&tm>3&&pr>1){if((slow+=dt)>2){pr=1;renderer.setPixelRatio(1);resize();slow=0}}else slow=0;
    let ix=stick.x,iz=stick.y;
    if(!OV){if(keys.KeyA||keys.ArrowLeft)ix-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;if(keys.KeyW||keys.ArrowUp)iz-=1;if(keys.KeyS||keys.ArrowDown)iz+=1}
    const il=Math.hypot(ix,iz);if(il>1){ix/=il;iz/=il}if(OV){ix=iz=0}
    const mv=Math.min(1,il);
    if(mv>.08){
      const sy=Math.sin(C.yaw),cy=Math.cos(C.yaw),wx=ix*cy+iz*sy,wz=-ix*sy+iz*cy;
      P.x+=wx*SPEED*mv*dt;P.z+=wz*SPEED*mv*dt;
      const target=Math.atan2(wx,wz);let d=target-P.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));P.yaw+=d*Math.min(1,dt*12);P.speed=mv;
      if((dustT-=dt)<=0){dustT=.22;const s=dust.find(d=>d.userData.t>=1);if(s){s.userData.t=0;s.position.set(P.x-wx*.3,.15,P.z-wz*.3);s.visible=true}}
    }else P.speed*=.8;
    for(const c of allCols)push(c);
    P.x=MathUtils.clamp(P.x,-55,55);P.z=MathUtils.clamp(P.z,-50,50);
    hero.position.set(P.x,Math.abs(Math.sin(tm*11))*.07*P.speed,P.z);hero.rotation.y=P.yaw;
    const sw=Math.sin(tm*11)*.75*P.speed,idle=Math.sin(tm*1.6)*.03;
    legL.rotation.x=sw;legR.rotation.x=-sw;armL.rotation.x=-sw*.9+idle;armR.rotation.x=sw*.9-idle;
    // Kamera: hinter der Figur, rückt vor Hindernissen heran
    let dist=C.dist;const tx=P.x,tz=P.z,ty=1.5;
    const ex=Math.sin(C.yaw)*Math.cos(C.pitch),ey=Math.sin(C.pitch),ez=Math.cos(C.yaw)*Math.cos(C.pitch);
    for(let k=0;k<12;k++){const t=dist/C.dist;let hit=false;const px=tx+ex*dist,pz=tz+ez*dist,py=ty+ey*dist;for(const c of allCols)if(inside(c,px,pz,py-.3)){hit=true;break}
      if(!hit)break;dist-=C.dist*.07;if(dist<2.2){dist=2.2;break}}
    cam.userData.d=cam.userData.d==null?dist:cam.userData.d+(dist-cam.userData.d)*Math.min(1,dt*(dist<cam.userData.d?14:4));
    const cx=tx+ex*cam.userData.d,cz=tz+ez*cam.userData.d,cyy=ty+ey*cam.userData.d;
    cam.position.x+=(cx-cam.position.x)*Math.min(1,dt*10);cam.position.y+=(cyy-cam.position.y)*Math.min(1,dt*10);cam.position.z+=(cz-cam.position.z)*Math.min(1,dt*10);
    cam.lookAt(P.x,1.5,P.z);
    sun.position.set(P.x-20,32,P.z+16);sun.target.position.set(P.x,0,P.z);
    // Gebäude zwischen Kamera und Figur blenden sich aus
    {const o=cam.position,d=new Vector3(P.x-o.x,1.5-o.y,P.z-o.z),len=d.length();d.normalize();const ray=new Ray(o,d),hit=new Vector3();
      for(const s of STATIONS){const occ=!s.box.containsPoint(new Vector3(P.x,1,P.z))&&(s.box.containsPoint(o)||(ray.intersectBox(s.box,hit)&&o.distanceTo(hit)<len-.5));
        const to=occ?.18:1;s.fade+=(to-s.fade)*Math.min(1,dt*9);
        if(Math.abs(s.fade-(s._f??1))>.01){s._f=s.fade;s.g.traverse(m=>{if(m.isMesh){m.material.transparent=s.fade<.99;m.material.opacity=s.fade;m.material.depthWrite=s.fade>.6;m.castShadow=s.fade>.6}})}}}
    // Standplätze und Beschriftungen
    let nn=null;for(const z of zones){const d=Math.hypot(P.x-z.x,P.z-z.z);const on=d<2.6;z.ring.material.opacity=on?1:.5;z.disc.material.opacity=on?.3:.12;z.ring.scale.setScalar(1+Math.sin(tm*3)*.06);if(on)nn=z}
    for(const s of STATIONS){const d=Math.hypot(P.x-s.at[0],P.z-s.at[1]);s.lb.material.opacity=MathUtils.clamp((d-4)/6,.0,1)*.0+MathUtils.clamp(1.15-d/60,.45,1)}
    if(nn!==near){near=nn;if(near)SFX.tick();refreshAct()}
    // Rauch, Staub, Glut, Wolken
    sm.forEach(s=>{const u=s.userData;u.t=(u.t+dt*.16)%1;const t=u.t;s.position.set(chim[0]+Math.sin(t*5+u.t*3)*.5+t*2.2,chim[1]+t*9,chim[2]-t*.8);s.scale.setScalar(1.4+t*4.5);s.material.opacity=Math.sin(Math.PI*Math.min(1,t*1.15))*.42});
    dust.forEach(s=>{const u=s.userData;if(u.t>=1)return;u.t+=dt*2.8;if(u.t>=1){s.visible=false;return}s.position.y=.15+u.t*.6;s.scale.setScalar(.5+u.t*1.1);s.material.opacity=(1-u.t)*.4});
    glow.intensity=(night?56:24)+Math.sin(tm*17)*3+Math.sin(tm*5.3)*2.5;
    clouds.forEach(c=>{c.position.x+=dt*.9;if(c.position.x>140)c.position.x=-140});
    if((hudT-=dt)<=0){hudT=.5;hud();refreshAct();refreshLabels();const t=$('w3t');if(t&&tm>9)t.style.opacity=0}
    renderer.render(scene,cam);
  })(performance.now());
}
