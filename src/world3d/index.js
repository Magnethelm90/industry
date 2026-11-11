/* 3D-Modus: begehbare Welt (Three.js, Modelle aus Blender). Nutzt denselben Spielstand und dieselben Minispiele wie das 2D-Spiel. */
import {NeutralToneMapping,CircleGeometry,CylinderGeometry,BackSide,Box3,Ray,Vector3,CanvasTexture,Color,DirectionalLight,DoubleSide,Fog,Group,HemisphereLight,InstancedMesh,MathUtils,Mesh,MeshBasicMaterial,MeshLambertMaterial,
  Object3D,PCFSoftShadowMap,PerspectiveCamera,PlaneGeometry,PointLight,RepeatWrapping,RingGeometry,Scene,SphereGeometry,Sprite,SpriteMaterial,SRGBColorSpace,WebGLRenderer,Float32BufferAttribute} from 'three';
import {CROPS,G,ST,UNL} from '../data.js';
import {go} from '../app.js';
import {goFish,harvest,pickCrop,waterPlot} from '../features/farm.js';
import {openLab} from '../features/lab.js';
import {applyResult,canStart,runStation} from '../features/workshop.js';
import {claimAt,goalInfo} from '../features/goals.js';
import {fish3d,has3d,play3d} from './games3d.js';
import {drive3d} from './drive3d.js';
import {SFX,toast} from '../fx.js';
import {S,cap,isOpen,lvl,sellP,sat,track} from '../state.js';
import {OV} from '../ui.js';
import {$,fmt,ic} from '../util.js';
import {dayPhase} from '../world.js';
import {loadAll} from './models.js';

const WARES=['erz','kohle','lehm','ziegel','stahl','maschine'];
// Rotation um Y: lokal (x,z) → Welt
const rot=(x,z,a)=>[x*Math.cos(a)+z*Math.sin(a),-x*Math.sin(a)+z*Math.cos(a)];
// colliders: Kreise oder achsenparallele Kästen (nur bei Drehung 0 oder π), lokal zur Station; h = Höhe (für die Kamera)
const STATIONS=[
  {id:'erz',n:'Eisenerz',at:[-17,-6],ry:.5,model:'mine',tint:{rock:'#9ba6bc',ore:'#d9683a'},zone:[2.7,8.4],h:6,
    col:[{x:0,z:-1.2,r:5.8},{x:-4.6,z:1.2,r:3.3},{x:4.8,z:.4,r:2.9}],lblY:8},
  {id:'kohle',n:'Kohle',at:[17,-6],ry:-.5,model:'mine',tint:{rock:'#707b92',ore:'#1d1f2a'},zone:[-2.7,8.4],h:6,
    col:[{x:0,z:-1.2,r:5.8},{x:-4.6,z:1.2,r:3.3},{x:4.8,z:.4,r:2.9}],lblY:8},
  {id:'stahl',n:'Schmelzofen',at:[0,-24],ry:0,model:'furnace',zone:[0,5.4],h:6,col:[{x:0,z:0,hw:3.8,hd:3.2}],lblY:12.8},
  {id:'markt',n:'Markt',at:[0,17],ry:Math.PI,model:'market',zone:[0,3.9],h:4.2,col:[{x:0,z:0,hw:3.3,hd:1.6},{x:-4.4,z:.4,hw:1.1,hd:1.2},{x:4.3,z:-.4,hw:.8,hd:.9}],lblY:6.6},
  {id:'lehm',n:'Lehm',at:[-28,10],ry:1.0,model:'mine',tint:{rock:'#c98f5c',ore:'#e8955f'},zone:[2.7,8.4],h:6,
    col:[{x:0,z:-1.2,r:5.8},{x:-4.6,z:1.2,r:3.3},{x:4.8,z:.4,r:2.9}],lblY:8},
  {id:'ziegel',n:'Ziegelei',at:[-36,-30],ry:0,model:'brickworks',zone:[0,5.4],h:6,col:[{x:0,z:0,hw:3.8,hd:3.1}],lblY:9.4},
  {id:'maschine',n:'Montage',at:[36,-30],ry:0,model:'workshop',zone:[0,5.4],h:6,col:[{x:0,z:0,hw:4,hd:3.2}],lblY:8.4},
  {id:'sand',n:'Sand',at:[-64,-26],ry:Math.PI/2,model:'mine',tint:{rock:'#e9dca8',ore:'#f6e7a8'},zone:[2.7,8.4],h:6,
    col:[{x:0,z:-1.2,r:5.8},{x:-4.6,z:1.2,r:3.3},{x:4.8,z:.4,r:2.9}],lblY:8},
  {id:'kupfer',n:'Kupfer',at:[-34,-57],ry:0,model:'mine',tint:{rock:'#8d7a6a',ore:'#e8833a'},zone:[2.7,8.4],h:6,
    col:[{x:0,z:-1.2,r:5.8},{x:-4.6,z:1.2,r:3.3},{x:4.8,z:.4,r:2.9}],lblY:8},
  {id:'oel',n:'Ölfeld',at:[64,-46],ry:-Math.PI/2,model:'derrick',zone:[0,5.2],h:10,col:[{x:0,z:0,r:3.2}],lblY:12.5},
  // Gebäude mit mehreren Stationen: die Ringe davor stehen in RINGS
  {id:'h_hall',hub:true,n:'Manufaktur',sub:'9 Werkstätten: Brot, Käse, Wein, Stoff …',at:[-46,-4],ry:Math.PI/2,model:'hall',h:6,col:[{x:0,z:0,hw:4.6,hd:3.2}],lblY:8.4},
  {id:'h_factory',hub:true,n:'Elektronikwerk',sub:'8 Fertigungen: Glas bis Smartphone',at:[0,-47],ry:0,model:'factory',h:6.5,col:[{x:0,z:0,hw:4.8,hd:3.4}],lblY:9},
  // Orte der Verwaltung: öffnen die jeweilige Ansicht als Blatt über der Welt (unl = Freischaltung)
  {id:'p_orders',place:'orders',n:'Aufträge',unl:'orders',at:[8.5,8],ry:-Math.PI/2,model:'board',zone:[0,2.4],h:3.4,col:[{x:0,z:0,r:1.1}],lblY:4.8,btn:'📋 Aufträge ansehen'},
  {id:'p_bld',place:'bld',n:'Bauamt',unl:'bld',at:[18,-25.5],ry:0,model:'office',zone:[0,5],h:6,col:[{x:0,z:0,hw:3.7,hd:2.9}],lblY:8,btn:'🏗️ Betriebe verwalten'},
  {id:'p_lab',place:'lab',n:'Labor',unl:'lab',at:[-18,-25.5],ry:0,model:'lab',zone:[0,5],h:6,col:[{x:0,z:0,hw:3.5,hd:2.8}],lblY:8,btn:'🧪 Labor betreten'},
  {id:'p_shop',place:'shop',n:'Laden',unl:'shop',at:[-13,19.5],ry:0,model:'shop',zone:[0,5.2],h:6,col:[{x:0,z:0,hw:3.7,hd:2.8}],lblY:7.4,btn:'🛍️ Laden öffnen'},
  {id:'p_log',place:'logistics',n:'Logistik',at:[24,17.5],ry:0,model:'depot',zone:[0,4.3],h:5,col:[{x:0,z:0,hw:4.6,hd:3}],lblY:6.6,btn:'🚚 Lieferung planen'},
  {id:'p_farm',place:'farm',n:'Scheune',unl:'farm',at:[-46,24],ry:Math.PI/2,model:'barn',zone:[0,5.8],h:7,col:[{x:0,z:0,r:4.3}],lblY:8.6,btn:'🌾 Farm & Reifekeller'},
  {id:'p_fish',place:'fish',n:'Angelsteg',unl:'farm',at:[31.4,8],ry:0,model:'jetty',zone:[-1.6,0],h:0,col:[],lblY:4,btn:'🎣 Angeln'},
  {id:'p_under',place:'under',n:'Hinterhof',unl:'under',at:[46,-14],ry:-Math.PI/2,model:'shack',zone:[0,3.8],h:3.4,col:[{x:0,z:0,r:3}],lblY:5.2,btn:'🕶️ Hinterhof betreten'}
];
// Stationen in Hubs: je ein Ring vor dem Gebäude. at = gedachter Ursprung 8,6 m hinter dem Ring, damit das 3D-Spiel genau am Ring aufgebaut wird.
const RINGS=[];
{const add=(hub,ids,rows)=>{const H=STATIONS.find(s=>s.id===hub);let k=0;
    rows.forEach(([lz,xs])=>xs.forEach(lx=>{const id=ids[k++];if(!id)return;const [dx,dz]=rot(lx,lz,H.ry),ring=[H.at[0]+dx,H.at[1]+dz],f=[Math.sin(H.ry),Math.cos(H.ry)];
      RINGS.push({id,hubOf:hub,ring,ry:H.ry,at:[ring[0]-8.6*f[0],ring[1]-8.6*f[1]],n:id,lblY:3.2,h:0,col:[],cw:[]})}))};
  add('h_hall',['muehle','baeckerei','kaeserei','chipsfabrik','raeucherei','kelterei','brauerei','weberei','schneiderei'],[[5.6,[-4.6,-2.3,0,2.3,4.6]],[8.6,[-3.45,-1.15,1.15,3.45]]]);
  add('h_factory',['glas','kunststoff','draht','platine','akku','display','gehaeuse','handy'],[[5.6,[-3.45,-1.15,1.15,3.45]],[8.6,[-3.45,-1.15,1.15,3.45]]]);
  [['brennerei',-2.3],['faelscher',0],['kopierer',2.3]].forEach(([id,lx])=>{const ry=-Math.PI/2,[dx,dz]=rot(lx,5.2,ry),ring=[46+dx,-14+dz],f=[Math.sin(ry),Math.cos(ry)];RINGS.push({id,hubOf:'p_under',ring,ry,at:[ring[0]-8.6*f[0],ring[1]-8.6*f[1]],n:id,lblY:3.2,h:0,col:[],cw:[]})});
  ['r_kamin','r_dampfmaschine','r_glasfaser','r_solar','r_ebike','r_smartwatch','r_drohne','r_roboter'].forEach((id,i)=>{const ring=[-30+i*2.3,-14.2];RINGS.push({id,hubOf:'p_lab',ring,ry:0,at:[ring[0],ring[1]-8.6],n:id,lblY:3.2,h:0,col:[],cw:[]})})}
// Felder der Farm: Raster aus bis zu 12 Beeten
const PLOT=i=>[-36+(i%4)*3.7,20+Math.floor(i/4)*3.7];
// Kollisionen in Weltkoordinaten vorberechnen
for(const s of STATIONS)s.cw=s.col.map(c=>{const [dx,dz]=rot(c.x,c.z,s.ry);return {...c,x:s.at[0]+dx,z:s.at[1]+dz,h:s.h}});
const EXTRA=[]; // zusätzliche Hindernisse (Bäume, Laternen, Truck)

let pond=null;let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;

function softTex(inner='rgba(255,255,255,.9)'){
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,30);
  g.addColorStop(0,inner);g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new CanvasTexture(c)}
function grassTex(){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#74c653';x.fillRect(0,0,256,256);
  for(let i=0;i<900;i++){x.fillStyle=`hsla(${88+Math.random()*30},${50+Math.random()*25}%,${42+Math.random()*20}%,.32)`;const r=2+Math.random()*9;x.beginPath();x.arc(Math.random()*256,Math.random()*256,r,0,7);x.fill()}
  const t=new CanvasTexture(c);t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(40,40);t.colorSpace=SRGBColorSpace;t.anisotropy=4;return t}
function pathTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#e6c88f';x.fillRect(0,0,128,128);
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
  const s=new Sprite(new SpriteMaterial({map:t,depthTest:false,transparent:true,fog:false,sizeAttenuation:false}));s.scale.set(.46,.153,1);s.renderOrder=5;
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
    <button class="w3map" id="w3m" aria-label="Karte und Ziel wählen"><canvas id="w3mc" width="240" height="240"></canvas><span id="w3mt">📍 Ziel wählen</span></button>
    <div class="w3dest" id="w3dl" hidden></div>
    <div class="w3top"><button class="btn sm" id="w3x">📋 Firma</button><div class="w3hud" id="w3h"></div></div>
    <div class="w3act" id="w3a" hidden><button class="btn a big" id="w3b"></button></div>
    <div class="w3stick" id="w3s"><i id="w3k"></i></div><div class="w3hint" id="w3t">Links: Laufen · Rechts wischen: Kamera</div>`;
  document.body.appendChild(root);
  let renderer;
  try{renderer=new WebGLRenderer({canvas:$('w3c'),antialias:true,powerPreference:'high-performance'})}
  catch(e){root.remove();toast('3D wird von diesem Gerät nicht unterstützt');return}
  window.__w3d=1;
  let alive=true;
  const M=await loadAll(['worker','mine','furnace','market','brickworks','workshop','shop','lab','office','board','depot','barn','jetty','shack','hall','factory','derrick','truck','pine','oak','rock','bush','lamp','fence','signpost','crates']).catch(e=>{toast('3D-Modelle konnten nicht geladen werden');return null});
  if(!M||!window.__w3d){renderer.dispose();root.remove();window.__w3d=0;return}
  $('w3l').remove();
  let pr=Math.min(devicePixelRatio||1,2);renderer.setPixelRatio(pr);renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFSoftShadowMap;
  renderer.toneMapping=NeutralToneMapping;renderer.toneMappingExposure=1.12;
  const ph=dayPhase(),night=ph==='night';
  const SK={night:['#16245a','#3a4f9a','#26356e'],dawn:['#5b8be0','#ffc59a','#f7e2c4'],day:['#2a8cf0','#8fd0ff','#d8f0ff'],dusk:['#4a5cc0','#ff9a66','#ffd2a0']}[ph];
  const LI={night:.62,dawn:.85,day:1,dusk:.85}[ph],FOG=SK[1];
  const scene=new Scene();scene.background=new Color(FOG);scene.fog=new Fog(FOG,55,170);
  scene.add(skyDome(...SK));
  scene.add(new HemisphereLight(night?'#8fa3e8':'#ffffff',night?'#34503a':'#8fcf6a',.95*LI+.3));
  const sun=new DirectionalLight(night?'#aebfff':ph==='day'?'#fff4dc':'#ffc891',1.5*LI+.2);sun.position.set(-20,32,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;
  Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:1,far:100});scene.add(sun,sun.target);
  const cam=new PerspectiveCamera(55,1,.1,260);
  // Boden, Wege
  const gt=grassTex(),ground=new Mesh(new PlaneGeometry(320,320),new MeshLambertMaterial({map:gt}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const pt=pathTex(),pm=new MeshLambertMaterial({map:pt});
  const path=(x,z,w,d)=>{const t=pt.clone();t.needsUpdate=true;t.repeat.set(w/6,d/6);t.anisotropy=8;const p=new Mesh(new PlaneGeometry(w,d),new MeshLambertMaterial({map:t}));p.rotation.x=-Math.PI/2;p.position.set(x,.025,z);p.receiveShadow=true;scene.add(p)};
  path(0,-3,5.2,46);path(0,-17.5,76,4);path(-36,-21,3.6,7);path(36,-21,3.6,7);path(-10,12,22,4);path(-9,-3,20,4.2);path(9,-3,20,4.2);path(-17,-6+7,3.6,16);path(17,-6+7,3.6,16);
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
    if(s.hub)continue;
    const [zx,zz]=rot(s.zone[0],s.zone[1],s.ry),X=s.at[0]+zx,Z=s.at[1]+zz;
    const ring=new Mesh(new RingGeometry(1.7,2.1,40),new MeshBasicMaterial({color:'#22d3ee',side:DoubleSide,transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(X,.07,Z);scene.add(ring);
    const disc=new Mesh(new RingGeometry(0,1.7,40),new MeshBasicMaterial({color:'#22d3ee',side:DoubleSide,transparent:true,opacity:.14,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.set(X,.06,Z);scene.add(disc);
    zones.push({s,x:X,z:Z,ring,disc});
  }
  // Ringe der Hub-Stationen (klein, mit kurzem Schild)
  for(const s of RINGS){
    const s1=ST.find(x=>x.id===s.id);s.n=s1.n;
    s.lb=label();s.lb.scale.set(.3,.1,1);s.lb.position.set(s.ring[0],s.lblY,s.ring[1]);scene.add(s.lb);
    const ring=new Mesh(new RingGeometry(.85,1.1,32),new MeshBasicMaterial({color:'#22d3ee',side:DoubleSide,transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(s.ring[0],.07,s.ring[1]);scene.add(ring);
    const disc=new Mesh(new RingGeometry(0,.85,32),new MeshBasicMaterial({color:'#22d3ee',side:DoubleSide,transparent:true,opacity:.14,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.set(s.ring[0],.06,s.ring[1]);scene.add(disc);
    zones.push({s,x:s.ring[0],z:s.ring[1],ring,disc,rad:1.2})}
  // Deko: LKW am Markt, Zaun, Laternen, Wegweiser, Kisten
  path(34,24.5,50,4.6);path(12,22,6,10);
  const truck=M.truck.clone(true);truck.position.set(14,0,24.5);truck.rotation.y=Math.PI/2;scene.add(truck);EXTRA.length=0;const tcol={x:14,z:24.5,r:2.2,h:3};EXTRA.push(tcol);
  const T={x:14,dir:1,turn:0,wait:0};
  const lamps=[[-3.6,6],[3.6,6],[-3.6,-8],[3.6,-8],[-3.6,-17],[3.6,-17],[-3.6,12],[3.6,12]];
  const hideInGame=[];
  lamps.forEach(([x,z])=>{const l=M.lamp.clone(true);l.position.set(x,0,z);scene.add(l);hideInGame.push(l);EXTRA.push({x,z,r:.4,h:4})});
  const fenceM=[];for(let i=-5;i<=5;i++){if(Math.abs(i)<1)continue;fenceM.push(place(i*3.8,-35,1,0))}for(let i=-5;i<=5;i++)fenceM.push(place(i*3.8,36,1,0));scatter(scene,M.fence,fenceM);
  const sp=M.signpost.clone(true);sp.position.set(4.2,0,0);sp.rotation.y=-.5;scene.add(sp);
  const cr=M.crates.clone(true);cr.position.set(-7,0,13.5);cr.rotation.y=.4;scene.add(cr);EXTRA.push({x:-7,z:13.5,r:1.3,h:2});
  // Wald, Felsen, Büsche
  const front=(x,z)=>STATIONS.some(s=>{if(!has3d(s.id))return false;const dx=x-s.at[0],dz=z-s.at[1],lx=dx*Math.cos(s.ry)-dz*Math.sin(s.ry),lz=dx*Math.sin(s.ry)+dz*Math.cos(s.ry);return Math.abs(lx)<6&&lz>-2&&lz<24});
  const free=(x,z,pad=3)=>!front(x,z)&&!RINGS.some(r=>Math.hypot(r.ring[0]-x,r.ring[1]-z)<9)&&!(x>-41&&x<-21&&z>16&&z<34)&&Math.hypot(x-38,z-8)>9&&!(Math.abs(x)<8&&z>-34&&z<26)&&!STATIONS.some(s=>Math.hypot(s.at[0]-x,s.at[1]-z)<10+pad)&&!(Math.abs(z-24.5)<5&&x>5)&&!(Math.hypot(x+28,z-10)<14)&&!(Math.abs(z+3)<4&&Math.abs(x)<26)&&!(Math.abs(z+17.5)<4&&Math.abs(x)<40)&&!(Math.abs(Math.abs(x)-17)<4&&z>0&&z<16);
  const pines=[],oaks=[],rocks=[],bushes=[];
  for(let i=0;i<260&&pines.length+oaks.length<110;i++){const x=(rnd()-.5)*150,z=(rnd()-.5)*140;if(!free(x,z))continue;const k=.75+rnd()*.7;(rnd()<.55?pines:oaks).push(place(x,z,k,rnd()*6.28));EXTRA.push({x,z,r:.5*k,h:6})}
  for(let i=0;i<90&&rocks.length<22;i++){const x=(rnd()-.5)*110,z=(rnd()-.5)*100;if(!free(x,z,1))continue;rocks.push(place(x,z,.6+rnd()*1.0,rnd()*6.28))}
  for(let i=0;i<200&&bushes.length<40;i++){const x=(rnd()-.5)*110,z=(rnd()-.5)*100;if(!free(x,z,1))continue;bushes.push(place(x,z,.8+rnd()*.7,rnd()*6.28))}
  scatter(scene,M.pine,pines);scatter(scene,M.oak,oaks);hideInGame.push(scatter(scene,M.rock,rocks),scatter(scene,M.bush,bushes));
  // Blumen
  {const fl=new InstancedMesh(new SphereGeometry(.09,5,4),new MeshLambertMaterial({color:'#ffffff'}),180),m=new Object3D(),cs=['#f472b6','#fde047','#f8fafc','#fb923c','#a78bfa'];
    let n=0;while(n<180){const x=(rnd()-.5)*100,z=(rnd()-.5)*90;if(!free(x,z,0))continue;m.position.set(x,.1,z);m.updateMatrix();fl.setMatrixAt(n,m.matrix);fl.setColorAt(n,new Color(cs[n%5]));n++}scene.add(fl)}
  // Hügel am Horizont
  {const hc=['#6fbf5a','#5fae52','#7ccd62','#58a84e'];for(let i=0;i<16;i++){const a=i/16*Math.PI*2+rnd()*.3,r=105+rnd()*25,s=14+rnd()*16;
    const h=new Mesh(new SphereGeometry(s,14,8),new MeshLambertMaterial({color:hc[i%4]}));h.scale.y=.45;h.position.set(Math.cos(a)*r,-s*.12,Math.sin(a)*r);scene.add(h)}}
  // Teich
  {const px=38,pz=8,wm=new MeshBasicMaterial({color:'#4cc3f0',transparent:true,opacity:.92});const w=new Mesh(new CircleGeometry(6.5,32),wm);w.rotation.x=-Math.PI/2;w.position.set(px,.05,pz);scene.add(w);
    const rim=new Mesh(new RingGeometry(6.4,7.6,32),new MeshLambertMaterial({color:'#e6c88f',side:DoubleSide}));rim.rotation.x=-Math.PI/2;rim.position.set(px,.04,pz);scene.add(rim);
    EXTRA.push({x:px,z:pz,r:6.6,h:.5});pond=w}
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
  const hero=M.worker.clone(true);hero.scale.setScalar(1.18);scene.add(hero);
  const lg=n=>hero.getObjectByName(n),legL=lg('!legL'),legR=lg('!legR'),armL=lg('!armL'),armR=lg('!armR');
  const P={x:0,z:7,yaw:Math.PI,speed:0},C={yaw:0,pitch:.52,dist:12.5};
  cam.position.set(P.x+Math.sin(C.yaw)*Math.cos(C.pitch)*C.dist,1.6+Math.sin(C.pitch)*C.dist,P.z+Math.cos(C.yaw)*Math.cos(C.pitch)*C.dist);
  const keys={};let stick={x:0,y:0},camDrag=null,stickId=null,near=null,tm=0,dustT=0,fps=60,slow=0,game=null,swingT=0,driveObj=null;
  const look=new Vector3(0,1.5,7);
  const env={renderer,M,setDrive:d=>{driveObj=d;if(!d){hud();refreshLabels()}},scene,cam,root,hero,setGame:g=>{game=g;beacon.visible=!!target&&!g;root.classList.toggle('ingame',!!g);hideInGame.forEach(o=>o.visible=!g);zones.forEach(z=>{z.ring.visible=z.disc.visible=!g&&!hidden(z.s)});if(!g){cam.userData.d=null}},swing:()=>{swingT=.28}};
  const stickEl=$('w3s'),knob=$('w3k');
  const key=e=>{if(OV||sheetOn)return;keys[e.code]=e.type==='keydown'};addEventListener('keydown',key);addEventListener('keyup',key);
  const area=root;
  area.addEventListener('pointerdown',e=>{if(e.target.closest('button,.w3dest')||OV||sheetOn)return;
    if(driveObj){driveObj.down(e);return}
    if(game){game.down(e);return}
    if(e.clientX<innerWidth*.45&&stickId==null){stickId=e.pointerId;stickEl.dataset.ox=e.clientX;stickEl.dataset.oy=e.clientY;stickEl.style.cssText=`left:${e.clientX-60}px;top:${e.clientY-60}px;opacity:1`;stick={x:0,y:0}}
    else if(camDrag==null)camDrag={id:e.pointerId,x:e.clientX,y:e.clientY};try{area.setPointerCapture(e.pointerId)}catch(_){}});
  area.addEventListener('pointermove',e=>{
    if(driveObj){driveObj.move(e);return}
    if(e.pointerId===stickId){let dx=e.clientX-+stickEl.dataset.ox,dy=e.clientY-+stickEl.dataset.oy;const l=Math.hypot(dx,dy),m=52;if(l>m){dx*=m/l;dy*=m/l}stick={x:dx/m,y:dy/m};knob.style.transform=`translate(${dx}px,${dy}px)`}
    else if(camDrag&&e.pointerId===camDrag.id){C.yaw-=(e.clientX-camDrag.x)*.008;C.pitch=MathUtils.clamp(C.pitch+(e.clientY-camDrag.y)*.005,.14,1.1);camDrag.x=e.clientX;camDrag.y=e.clientY}});
  const up=e=>{if(driveObj)driveObj.up(e);if(game)game.up(e);if(e.pointerId===stickId){stickId=null;stick={x:0,y:0};knob.style.transform='';stickEl.style.opacity=0}if(camDrag&&e.pointerId===camDrag.id)camDrag=null};
  area.addEventListener('pointerup',up);area.addEventListener('pointercancel',up);
  const resize=()=>{const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};resize();addEventListener('resize',resize);
  // Aktionsknopf und Anzeige
  const act=$('w3b'),actBox=$('w3a');
  // Aktuelles Ziel des Einstiegs: Titel, oder Belohnung zum Abholen
  const goalLine=()=>{const g=goalInfo();if(!g)return '';return g.ready?`<button class="w3goal ready">✅ ${g.t} · +${fmt(g.r)} Cr abholen</button>`:g.wait?`<div class="w3goal">⭐ Nächstes Ziel ab Level ${g.lv}</div>`:`<div class="w3goal">🎯 ${g.t}</div>`};
  $('w3h').addEventListener('click',e=>{if(e.target.closest('.w3goal.ready')){claimAt(e.clientX,e.clientY);hud()}});
  const hud=()=>{$('w3h').innerHTML=`<div class="w3r"><b>${fmt(Math.floor(S.money))} Cr</b><span>Level ${lvl()}</span></div><div class="w3r">${WARES.map(g=>`<span class="w3c">${ic(g,20)}${Math.floor(S.stock[g]||0)}</span>`).join('')}</div>${goalLine()}`};
  const need=s=>{const st=ST.find(x=>x.id===s.id);return Object.keys(st.in).filter(k=>S.stock[k]<st.in[k])};
  const locked=s=>(s.unl&&!isOpen(s.unl))||(s.hubOf==='p_under'&&!isOpen('under'));
  const stOf=s=>ST.find(x=>x.id===s.id);
  // Rezept-Stationen sind erst nach der Entdeckung im Labor da
  const hidden=s=>s.hubOf&&stOf(s)&&stOf(s).secret&&!S.rec[stOf(s).out];
  const lvLock=s=>{const st=s.id&&stOf(s);return st&&st.lv&&st.lv>lvl()?st.lv:0};
  // Zustand eines Beets: [Knopftext, aktiv?, Zeichen über dem Beet]
  const plotState=i=>{const p=S.farm.plots[i];if(!p)return ['',0,''];
    if(!p.c)return ['🌱 Feld '+(i+1)+' bestellen',1,'🌱'];
    if(p.pest)return ['🐛 Schädlinge vertreiben',1,'🐛'];
    if(p.ready)return ['🌾 '+G[p.c].n+' ernten',1,'✨'];
    if(p.w<=0)return ['💧 Gießen',1,'💧'];
    return [G[p.c].n+' wächst … '+Math.round(p.p*100)+' %',0,'']};
  const stateOf=s=>{
    if(s.hub)return [s.sub,1];
    if(lvLock(s))return ['🔒 ab Level '+lvLock(s),0];
    if(locked(s))return ['🔒 ab Level '+(UNL[s.unl||'under'].lv),0];
    if(s.place)return [s.place==='orders'&&S.orders.length?S.orders.length+' laufende Aufträge':'Geöffnet',1];
    if(s.id==='markt'){const t=WARES.reduce((a,g)=>a+Math.floor(S.stock[g]||0),0);return t?[`${t} Waren verkaufen`,1]:['Nichts zu verkaufen',0]}
    const m=need(s);return m.length?['Fehlt: '+m.map(k=>G[k].n).join(', '),0]:['Bereit zum Arbeiten',1]};
  const refreshLabels=()=>[...STATIONS,...RINGS].forEach(s=>{if(!s.lb)return;const [t,ok]=stateOf(s);s.lb.userData.set(s.n,t,ok)});
  const refreshAct=()=>{
    if(!near){actBox.hidden=true;return}const s=near.s;actBox.hidden=false;
    if(s.plot!=null){const [txt,on]=plotState(s.plot);act.innerHTML=txt;act.disabled=!on}
    else if(lvLock(s)){act.innerHTML='🔒 '+stOf(s).n+' ab Level '+lvLock(s);act.disabled=true}
    else if(locked(s)){act.innerHTML='🔒 ab Level '+UNL[s.unl||'under'].lv;act.disabled=true}
    else if(s.place){act.innerHTML=s.btn;act.disabled=false}
    else if(s.id==='markt'){const total=WARES.reduce((a,g)=>a+Math.floor(S.stock[g]||0),0);act.innerHTML=total?`💰 Alles verkaufen (${total} Waren)`:'Nichts zu verkaufen';act.disabled=!total}
    else{const st=ST.find(x=>x.id===s.id),m=need(s);act.disabled=!!m.length;act.innerHTML=m.length?`Es fehlt: ${m.map(k=>G[k].n).join(', ')}`:`▶ ${st.n}`}};
  // Blatt: eine 2D-Ansicht (Laden, Aufträge …) liegt über der Welt, die Welt bleibt dahinter sichtbar
  let sheetOn=false;
  const closeSheet=()=>{if(!sheetOn)return;sheetOn=false;document.body.classList.remove('w3sheet');document.querySelectorAll('.w3sx,.w3sb').forEach(e=>e.remove());go('work');hud();refreshLabels();refreshAct()};
  const sheet=k=>{go(k);sheetOn=true;document.body.classList.add('w3sheet');stick={x:0,y:0};stickId=null;stickEl.style.opacity=0;
    const b=document.createElement('div');b.className='w3sb';b.onclick=closeSheet;document.body.appendChild(b);
    const x=document.createElement('button');x.className='w3sx btn sm';x.textContent='✕ Zurück in die Welt';x.onclick=closeSheet;document.body.appendChild(x);
    document.querySelector('main').scrollTop=0};
  act.onclick=async()=>{if(!near||OV||sheetOn)return;const s=near.s,mid={clientX:innerWidth/2,clientY:innerHeight*.6};
    if(s.plot!=null){const i=s.plot,p=S.farm.plots[i];if(!p)return;
      if(!p.c)pickCrop(i);else if(p.pest){p.pest=0;SFX.good();toast('🐛 Erwischt!')}else if(p.ready)harvest(i,mid);else if(p.w<=0){waterPlot(p);SFX.water?SFX.water():SFX.good()}
      hud();refreshAct();updatePlots();return}
    if(locked(s)){SFX.err();return}
    if(s.place){if(s.place==='lab')openLab();else if(s.place==='fish'){if(!isOpen('farm'))return;actBox.hidden=true;stick={x:0,y:0};stickId=null;stickEl.style.opacity=0;const r=await fish3d(env,s);if(!alive)return;if(r){const ks=Object.keys(r);if(!ks.length)toast('Heute beißt nichts … versuch es nochmal!');else{ks.forEach(g=>{S.stock[g]=Math.min(cap(),S.stock[g]+r[g]);S.xp+=r[g]*2});track('fish');toast('Fang: '+ks.map(g=>r[g]+'× '+G[g].n).join(', '));SFX.win();render()}}}else sheet(s.place);hud();refreshAct();refreshLabels();return}
    if(s.id==='markt'){let sum=0,k=0;for(const g of WARES){const n=Math.floor(S.stock[g]||0);for(let i=0;i<n;i++){sum+=sellP(g);sat[g]+=1}if(n){S.stock[g]-=n;k+=n}}
      if(!k){SFX.err();return}S.money+=sum;S.xp+=Math.ceil(sum/12);track('sold',null,k);SFX.coin();toast('+'+fmt(sum)+' Cr · '+k+' Waren verkauft');hud();refreshAct();refreshLabels();return}
    const st=ST.find(x=>x.id===s.id);
    if(has3d(s.id)){if(!canStart(st))return;actBox.hidden=true;stick={x:0,y:0};stickId=null;stickEl.style.opacity=0;
      const sc=await play3d(env,s,st);if(!alive)return;if(sc!=null)applyResult(st,sc)}
    else await runStation(st);
    hud();refreshAct();refreshLabels()};
  // Karte und Ziel: Tippen auf die Karte öffnet die Liste der Orte; das Ziel zeigt Pfeil, Entfernung und einen Leuchtstrahl in der Welt
  let target=null;
  const beacon=new Mesh(new CylinderGeometry(.32,.32,70,12,1,true),new MeshBasicMaterial({color:'#f0abfc',transparent:true,opacity:.4,depthWrite:false,fog:false,side:DoubleSide}));beacon.position.y=35;beacon.visible=false;scene.add(beacon);
  const mc=$('w3mc'),mx=mc.getContext('2d'),MS=240/150,mp=(x,z)=>[120+x*MS,120+z*MS];
  const setTarget=z=>{target=z||null;beacon.visible=!!target&&!game;if(target)beacon.position.set(target.x,35,target.z);drawMap()};
  const hubName=s=>{const h=s.hubOf&&STATIONS.find(x=>x.id===s.hubOf);return h?h.n:''};
  const dests=()=>zones.filter(z=>z.s.n&&!hidden(z.s));
  const drawMap=()=>{
    mx.clearRect(0,0,240,240);mx.fillStyle='rgba(116,198,83,.92)';mx.beginPath();mx.roundRect(0,0,240,240,26);mx.fill();
    mx.fillStyle='rgba(230,200,143,.95)';for(const [x,z,w,d] of [[0,-3,5.2,46],[0,-17.5,76,4],[-9,-3,20,4.2],[9,-3,20,4.2],[34,24.5,50,4.6]]){const [a,b]=mp(x-w/2,z-d/2);mx.fillRect(a,b,w*MS,d*MS)}
    mx.fillStyle='#4cc3f0';{const [a,b]=mp(38,8);mx.beginPath();mx.arc(a,b,6.5*MS,0,7);mx.fill()}
    for(const s of STATIONS){const [a,b]=mp(s.at[0],s.at[1]);mx.fillStyle=s.hub?'#6366f1':lvLock(s)||locked(s)?'#94a3b8':stateOf(s)[1]?'#16a34a':'#f59e0b';
      mx.strokeStyle='#fff';mx.lineWidth=2;mx.beginPath();if(s.hub)mx.rect(a-6,b-6,12,12);else mx.arc(a,b,5,0,7);mx.fill();mx.stroke()}
    for(const r of RINGS){if(hidden(r))continue;const [a,b]=mp(r.ring[0],r.ring[1]);mx.fillStyle=lvLock(r)?'#94a3b8':stateOf(r)[1]?'#16a34a':'#f59e0b';mx.beginPath();mx.arc(a,b,2.6,0,7);mx.fill()}
    if(target){const [a,b]=mp(target.x,target.z),[c,d]=mp(P.x,P.z),k=.5+.5*Math.sin(tm*5);
      mx.setLineDash([6,5]);mx.strokeStyle='#d946ef';mx.lineWidth=3;mx.beginPath();mx.moveTo(c,d);mx.lineTo(a,b);mx.stroke();mx.setLineDash([]);
      mx.fillStyle='rgba(217,70,239,.35)';mx.beginPath();mx.arc(a,b,9+k*7,0,7);mx.fill();mx.fillStyle='#d946ef';mx.strokeStyle='#fff';mx.lineWidth=3;mx.beginPath();mx.arc(a,b,6,0,7);mx.fill();mx.stroke()}
    {const [a,b]=mp(P.x,P.z);mx.save();mx.translate(a,b);mx.rotate(Math.PI-P.yaw);mx.fillStyle='#ef4444';mx.strokeStyle='#fff';mx.lineWidth=3;mx.beginPath();mx.moveTo(0,-11);mx.lineTo(8,8);mx.lineTo(0,4);mx.lineTo(-8,8);mx.closePath();mx.fill();mx.stroke();mx.restore()}
    const t=$('w3mt');
    if(target){const dx=target.x-P.x,dz=target.z-P.z,sy=Math.sin(C.yaw),cy=Math.cos(C.yaw),a=Math.atan2(dx*cy-dz*sy,-dx*sy-dz*cy);
      t.innerHTML=`<i style="display:inline-block;transform:rotate(${a}rad)">⬆️</i> ${target.s.n} · ${Math.round(Math.hypot(dx,dz))} m`}
    else t.textContent='📍 Ziel wählen'};
  const closeDest=()=>{$('w3dl').hidden=true};
  const openDest=()=>{const L=$('w3dl'),rows=dests().map(z=>{const [sub,ok]=stateOf(z.s),lk=!!(lvLock(z.s)||locked(z.s));return {z,sub,ok,lk,d:Math.hypot(P.x-z.x,P.z-z.z)}}).sort((a,b)=>a.lk-b.lk||a.d-b.d);
    L.innerHTML=`<div class="w3dh"><b>Wohin?</b>${target?'<button class="btn sm" data-off="1">Ziel aus</button>':''}<button class="btn sm" data-x="1">✕</button></div><div class="w3dr">`+rows.map((r,i)=>`<button class="w3di${r.lk?' lk':''}" data-i="${i}"><span><b>${r.z.s.n}</b>${hubName(r.z.s)?' <small>('+hubName(r.z.s)+')</small>':''}<br><small>${r.sub}</small></span><em>${Math.round(r.d)} m</em></button>`).join('')+'</div>';
    L.hidden=false;
    L.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.x){closeDest();return}if(b.dataset.off){setTarget(null);closeDest();return}
      const r=rows[+b.dataset.i];if(r){setTarget(r.z);SFX.tick();closeDest()}}};
  $('w3m').onclick=()=>{if(OV||sheetOn||game)return;$('w3dl').hidden?openDest():closeDest()};
  // Beete: Erde, neun Pflanzen je Beet, Zeichen darüber. Wächst sichtbar mit dem Fortschritt.
  const plots=[],emo={};
  const emoji=ch=>{if(emo[ch])return emo[ch];const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.font='72px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(ch,48,52);const tx=new CanvasTexture(c);tx.colorSpace=SRGBColorSpace;return emo[ch]=tx};
  const plantGeo=new SphereGeometry(.28,7,6),soilGeo=new PlaneGeometry(3.1,3.1);
  function updatePlots(){
    if(!isOpen('farm'))return;
    while(plots.length<Math.min(12,S.farm.plots.length)){const i=plots.length,[x,z]=PLOT(i),g=new Group();g.position.set(x,0,z);
      const rim=new Mesh(new PlaneGeometry(3.4,3.4),new MeshLambertMaterial({color:'#8a5a2b'}));rim.rotation.x=-Math.PI/2;rim.position.y=.035;rim.receiveShadow=true;g.add(rim);
      const soil=new Mesh(soilGeo,new MeshLambertMaterial({color:'#6b4423'}));soil.rotation.x=-Math.PI/2;soil.position.y=.05;soil.receiveShadow=true;g.add(soil);
      const pm=new MeshLambertMaterial({color:'#65a30d'}),pl=[];for(let k=0;k<9;k++){const m=new Mesh(plantGeo,pm);m.position.set((k%3-1)*.95,.2,(Math.floor(k/3)-1)*.95);m.castShadow=true;m.visible=false;g.add(m);pl.push(m)}
      const sp=new Sprite(new SpriteMaterial({transparent:true,depthTest:false}));sp.scale.set(1.3,1.3,1);sp.position.y=2.4;sp.visible=false;g.add(sp);
      scene.add(g);plots.push({g,soil,pm,pl,sp});
      const ring=new Mesh(new RingGeometry(1.25,1.5,28),new MeshBasicMaterial({color:'#a3e635',side:DoubleSide,transparent:true,opacity:.6,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.07,z);scene.add(ring);
      const disc=new Mesh(new RingGeometry(0,.01,3),new MeshBasicMaterial({transparent:true,opacity:0}));scene.add(disc);
      zones.push({s:{id:'plot'+i,plot:i},x,z,ring,disc,rad:1.75})}
    plots.forEach((o,i)=>{const p=S.farm.plots[i];if(!p)return;const [, ,ch]=plotState(i);
      o.soil.material.color.set(p.c&&p.w<=0&&!p.ready?'#a98058':'#5b3a1f');
      o.pl.forEach(m=>{m.visible=!!p.c});
      if(p.c){o.pm.color.set(p.ready?G[p.c].c:new Color('#4d9a2a').lerp(new Color(G[p.c].c),p.p*.7));const sc=.35+p.p*1.25;o.pl.forEach(m=>{m.scale.set(sc*.8,sc*1.5,sc*.8);m.position.y=.05+.28*sc*1.5})}
      o.sp.visible=!!ch;if(ch){o.sp.material.map=emoji(ch);o.sp.material.needsUpdate=true}})}
  const exit=()=>{closeSheet();alive=false;removeEventListener('keydown',key);removeEventListener('keyup',key);removeEventListener('resize',resize);
    scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map&&m.map.dispose();m.dispose()})}});
    renderer.dispose();root.remove();window.__w3d=0;delete window.__w3dState;delete window.__w3dDrive};
  $('w3x').onclick=exit;
  // Die Lieferung (Logistik) fährt in 3D, solange die Welt offen ist
  window.__w3dDrive=(route,load)=>{closeSheet();return drive3d(env,route,load)};
  window.__w3dState=()=>({x:P.x,z:P.z,sheet:sheetOn,plots:plots.length,truck:T.x,zones:zones.map(z=>({id:z.s.id,x:z.x,z:z.z,hidden:hidden(z.s)})),near:near&&near.s.id,target:target&&target.s.id,alive,calls:renderer.info.render.calls,tri:renderer.info.render.triangles,pr});
  window.__w3dTeleport=(x,z)=>{P.x=x;P.z=z};
  hud();refreshLabels();updatePlots();
  // Kollision (Kreis gegen Kreise und Kästen)
  const R=.55;
  const push=(c)=>{
    if(c.r!=null){const dx=P.x-c.x||.001,dz=P.z-c.z,l=Math.hypot(dx,dz),m=c.r+R;if(l<m){P.x=c.x+dx/l*m;P.z=c.z+dz/l*m}}
    else{const dx=P.x-c.x,dz=P.z-c.z,ox=c.hw+R-Math.abs(dx),oz=c.hd+R-Math.abs(dz);if(ox>0&&oz>0){if(ox<oz)P.x+=Math.sign(dx||1)*ox;else P.z+=Math.sign(dz||1)*oz}}};
  const inside=(c,x,z,y)=>y<c.h&&(c.r!=null?Math.hypot(x-c.x,z-c.z)<c.r:Math.abs(x-c.x)<c.hw&&Math.abs(z-c.z)<c.hd);
  const allCols=[...STATIONS.flatMap(s=>s.cw),...EXTRA];
  let last=performance.now(),hudT=0,mapT=0;const SPEED=6.4;
  (function frame(now){
    if(!alive)return;requestAnimationFrame(frame);
    const dt=Math.min(.05,(now-last)/1000);last=now;tm+=dt;
    // Lieferfahrt: eigene Szene statt der Welt
    if(driveObj){driveObj.update(dt);if(driveObj)renderer.render(driveObj.scene,driveObj.cam);return}
    // Anpassung an langsame Geräte: nach 2 s unter 30 Bildern/s Auflösung und Schatten senken
    fps+=((1/Math.max(dt,.001))-fps)*.05;if(fps<30&&tm>3&&pr>1){if((slow+=dt)>2){pr=1;renderer.setPixelRatio(1);resize();slow=0}}else slow=0;
    if(game){
      game.update(dt);
    }
    if(game){
      if(swingT>0){swingT-=dt;armR.rotation.x=-2.4*Math.sin(Math.PI*(1-swingT/.28))}else armR.rotation.x*=.8;
      legL.rotation.x*=.8;legR.rotation.x*=.8;armL.rotation.x*=.8;
      cam.position.lerp(game.camPos,Math.min(1,dt*3.2));look.lerp(game.camLook,Math.min(1,dt*3.2));cam.lookAt(look);
      if(game.shake>.001){cam.position.x+=(Math.random()-.5)*game.shake;cam.position.y+=(Math.random()-.5)*game.shake;game.shake*=Math.pow(.02,dt)}
    }else{
    let ix=stick.x,iz=stick.y;
    if(!OV&&!sheetOn){if(keys.KeyA||keys.ArrowLeft)ix-=1;if(keys.KeyD||keys.ArrowRight)ix+=1;if(keys.KeyW||keys.ArrowUp)iz-=1;if(keys.KeyS||keys.ArrowDown)iz+=1}
    const il=Math.hypot(ix,iz);if(il>1){ix/=il;iz/=il}if(OV||sheetOn){ix=iz=0}
    const mv=Math.min(1,il);
    if(mv>.08){
      const sy=Math.sin(C.yaw),cy=Math.cos(C.yaw),wx=ix*cy+iz*sy,wz=-ix*sy+iz*cy;
      P.x+=wx*SPEED*mv*dt;P.z+=wz*SPEED*mv*dt;
      const target=Math.atan2(wx,wz);let d=target-P.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));P.yaw+=d*Math.min(1,dt*12);P.speed=mv;
      if((dustT-=dt)<=0){dustT=.22;const s=dust.find(d=>d.userData.t>=1);if(s){s.userData.t=0;s.position.set(P.x-wx*.3,.15,P.z-wz*.3);s.visible=true}}
    }else P.speed*=.8;
    for(const c of allCols)push(c);
    P.x=MathUtils.clamp(P.x,-70,70);P.z=MathUtils.clamp(P.z,-62,62);
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
    look.set(P.x,1.5,P.z);cam.lookAt(look);
    }
    sun.position.set(P.x-20,32,P.z+16);sun.target.position.set(P.x,0,P.z);
    // Gebäude zwischen Kamera und Figur blenden sich aus
    {const o=cam.position,d=new Vector3(P.x-o.x,1.5-o.y,P.z-o.z),len=d.length();d.normalize();const ray=new Ray(o,d),hit=new Vector3();
      for(const s of STATIONS){const occ=!s.box.containsPoint(new Vector3(P.x,1,P.z))&&(s.box.containsPoint(o)||(ray.intersectBox(s.box,hit)&&o.distanceTo(hit)<len-.5));
        const to=occ&&!game?.18:1;s.fade+=(to-s.fade)*Math.min(1,dt*9);
        if(Math.abs(s.fade-(s._f??1))>.01){s._f=s.fade;s.g.traverse(m=>{if(m.isMesh){m.material.transparent=s.fade<.99;m.material.opacity=s.fade;m.material.depthWrite=s.fade>.6;m.castShadow=s.fade>.6}})}}}
    // Standplätze und Beschriftungen
    let nn=null;for(const z of zones){const hz=hidden(z.s);z.ring.visible=z.disc.visible=!hz&&!game;if(hz)continue;const d=Math.hypot(P.x-z.x,P.z-z.z);const on=d<(z.rad||2.6);z.ring.material.opacity=on?1:.5;z.disc.material.opacity=on?.3:.12;z.ring.scale.setScalar(1+Math.sin(tm*3)*.06);if(on)nn=z}
    {let best=null,bd=7;for(const s of RINGS){const d=Math.hypot(P.x-s.ring[0],P.z-s.ring[1]);s.lb.material.opacity=0;if(!hidden(s)&&d<bd){bd=d;best=s}}
      if(best&&!game)best.lb.material.opacity=MathUtils.clamp((bd-.2)/.8,0,1)*.0+1}
    for(const s of STATIONS){const d=Math.hypot(P.x-s.at[0],P.z-s.at[1]);s.lb.material.opacity=game?0:MathUtils.clamp((d-9)/6,0,1)*MathUtils.clamp(1.3-d/70,.35,1)}
    if(game)nn=near;
    if(target&&!game&&Math.hypot(P.x-target.x,P.z-target.z)<(target.rad||2.6)){toast('📍 '+target.s.n+' erreicht');setTarget(null)}
    if(target){beacon.visible=!game&&Math.hypot(P.x-target.x,P.z-target.z)>12;beacon.material.opacity=.26+.1*Math.sin(tm*4)}
    if((mapT-=dt)<=0){mapT=.12;drawMap()}
    if(nn!==near){near=nn;if(near)SFX.tick();refreshAct()}
    // Rauch, Staub, Glut, Wolken
    sm.forEach(s=>{const u=s.userData;u.t=(u.t+dt*.16)%1;const t=u.t;s.position.set(chim[0]+Math.sin(t*5+u.t*3)*.5+t*2.2,chim[1]+t*9,chim[2]-t*.8);s.scale.setScalar(1.4+t*4.5);s.material.opacity=Math.sin(Math.PI*Math.min(1,t*1.15))*.42});
    dust.forEach(s=>{const u=s.userData;if(u.t>=1)return;u.t+=dt*2.8;if(u.t>=1){s.visible=false;return}s.position.y=.15+u.t*.6;s.scale.setScalar(.5+u.t*1.1);s.material.opacity=(1-u.t)*.4});
    // LKW fährt auf der Straße hin und her, wendet an den Enden
    {if(T.wait>0)T.wait-=dt;else if(T.turn>0){T.turn-=dt;truck.rotation.y+=T.dir*Math.PI*dt/1.2*-1;if(T.turn<=0){T.dir*=-1;truck.rotation.y=T.dir>0?Math.PI/2:-Math.PI/2;T.wait=.6}}
      else{T.x+=T.dir*6*dt;if(T.x>52&&T.dir>0||T.x<14&&T.dir<0)T.turn=1.2}
      truck.position.x=T.x;tcol.x=T.x}
    if(pond)pond.material.opacity=.86+Math.sin(tm*2)*.05;
    glow.intensity=(night?56:24)+Math.sin(tm*17)*3+Math.sin(tm*5.3)*2.5;
    clouds.forEach(c=>{c.position.x+=dt*.9;if(c.position.x>140)c.position.x=-140});
    if((hudT-=dt)<=0){hudT=.5;hud();if(!game)refreshAct();refreshLabels();updatePlots();const t=$('w3t');if(t&&tm>9)t.style.opacity=0}
    renderer.render(scene,cam);
  })(performance.now());
}
