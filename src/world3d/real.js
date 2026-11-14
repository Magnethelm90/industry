/* Realistischeres Licht und Material für die 3D-Welt: Himmel als Umgebungslicht (Spiegelungen auf Metall, Glas, Wasser),
   erzeugte Oberflächenstruktur (Körnung, kleine Unebenheiten) und Bodentexturen mit Relief. Alles wird im Gerät berechnet –
   keine zusätzlichen Bilddateien. */
import {BackSide,CanvasTexture,Color,Float32BufferAttribute,LinearSRGBColorSpace,Mesh,MeshBasicMaterial,MeshStandardMaterial,PMREMGenerator,RepeatWrapping,SRGBColorSpace,Scene,SphereGeometry} from 'three';

const cv=(w,h=w)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
// Kachelbares Höhenfeld aus mehreren Lagen geglätteten Rauschens (Werte 0..1)
function heightField(n,oct,seed=7){
  let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;const H=new Float32Array(n*n);let amp=1,tot=0;
  for(let o=0;o<oct.length;o++){const g=oct[o],G=new Float32Array(g*g);for(let i=0;i<g*g;i++)G[i]=r();
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){const fx=x/n*g,fy=y/n*g,x0=fx|0,y0=fy|0,tx=fx-x0,ty=fy-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty),x1=(x0+1)%g,y1=(y0+1)%g;
      H[y*n+x]+=amp*((G[y0*g+x0]*(1-sx)+G[y0*g+x1]*sx)*(1-sy)+(G[y1*g+x0]*(1-sx)+G[y1*g+x1]*sx)*sy)}
    tot+=amp;amp*=.55}
  for(let i=0;i<n*n;i++)H[i]/=tot;return H}
// Aus einem Höhenfeld eine Normal-Textur (RGB) und die Höhe (Alpha-frei in B nicht nötig) erzeugen
function normalTex(H,n,str=2){
  const c=cv(n),x=c.getContext('2d'),im=x.createImageData(n,n),d=im.data;
  for(let y=0;y<n;y++)for(let X=0;X<n;X++){const h=(a,b)=>H[((b+n)%n)*n+(a+n)%n],dx=(h(X+1,y)-h(X-1,y))*str*n/64,dy=(h(X,y+1)-h(X,y-1))*str*n/64,l=Math.hypot(dx,dy,1),i=(y*n+X)*4;
    d[i]=(-dx/l*.5+.5)*255;d[i+1]=(-dy/l*.5+.5)*255;d[i+2]=(1/l*.5+.5)*255;d[i+3]=255}
  x.putImageData(im,0,0);const t=new CanvasTexture(c);t.wrapS=t.wrapT=RepeatWrapping;t.colorSpace=LinearSRGBColorSpace;return t}
const colorTex=(c,rep,aniso=8)=>{const t=new CanvasTexture(c);t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(rep,rep);t.colorSpace=SRGBColorSpace;t.anisotropy=aniso;return t};

// Rasen: Grundton mit Flecken und feinen Halmen, dazu Relief
export function grassMat(rep=46){
  const n=256,H=heightField(n,[6,14,40,96],3),c=cv(n),x=c.getContext('2d'),im=x.createImageData(n,n),d=im.data;
  for(let i=0;i<n*n;i++){const h=H[i],k=.72+h*.56;d[i*4]=62*k+h*26;d[i*4+1]=128*k+h*30;d[i*4+2]=48*k;d[i*4+3]=255}
  x.putImageData(im,0,0);
  for(let i=0;i<1500;i++){const px=Math.random()*n,py=Math.random()*n,l=2+Math.random()*4,a=Math.random()*6.28;x.strokeStyle=`hsla(${82+Math.random()*34},${38+Math.random()*26}%,${26+Math.random()*30}%,.45)`;x.lineWidth=1;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke()}
  const nm=normalTex(H,n,3.2);nm.repeat.set(rep,rep);
  return new MeshStandardMaterial({map:colorTex(c,rep,4),normalMap:nm,roughness:.94,metalness:0})}
// Kiesweg: helle Steinchen auf Sand, mit Relief
export function gravel(){
  const n=256,H=heightField(n,[24,56,128,128],5),c=cv(n),x=c.getContext('2d'),im=x.createImageData(n,n),d=im.data;
  for(let i=0;i<n*n;i++){const h=H[i],k=.78+h*.44;d[i*4]=192*k;d[i*4+1]=176*k;d[i*4+2]=148*k;d[i*4+3]=255}
  x.putImageData(im,0,0);
  for(let i=0;i<700;i++){const g=120+Math.random()*110;x.fillStyle=`rgba(${g},${g*.93|0},${g*.8|0},.55)`;x.beginPath();x.ellipse(Math.random()*n,Math.random()*n,.8+Math.random()*2.2,.6+Math.random()*1.6,Math.random()*3,0,7);x.fill()}
  const map=colorTex(c,1),nm=normalTex(H,n,2.2);
  // je Wegstück eigene Wiederholung (Texturdaten werden geteilt)
  return (rx,ry)=>{const a=map.clone(),b=nm.clone();a.repeat.set(rx,ry);b.repeat.set(rx,ry);a.needsUpdate=b.needsUpdate=true;return new MeshStandardMaterial({map:a,normalMap:b,roughness:.97,metalness:0})}}
// Wasser: dunkler, spiegelnder Ton mit wandernden Wellen (Normal-Textur wird im Takt verschoben)
export function waterMat(night){
  const n=128,nm=normalTex(heightField(n,[5,11,23],9),n,2.4);nm.repeat.set(4,4);
  const m=new MeshStandardMaterial({color:night?'#0f3350':'#176886',roughness:.1,metalness:.15,normalMap:nm,transparent:true,opacity:.93,envMapIntensity:1.5});
  m.normalScale.set(.5,.5);m.userData.flow=t=>{nm.offset.set(t*.018,t*.011)};return m}

// Himmel als Umgebungslicht: kleine Hilfsszene (Verlauf, Sonne, Boden) wird einmal in eine Umgebungstextur gerechnet
export function skyEnv(renderer,[top,mid,bot],sunDir,sunCol,night){
  const sc=new Scene(),g=new SphereGeometry(50,32,16),pos=g.attributes.position,cols=[],a=new Color(top),b=new Color(mid),gr=new Color(night?'#1c2a1e':'#5d7a45'),c=new Color();
  for(let i=0;i<pos.count;i++){const y=pos.getY(i)/50;if(y>0)c.copy(b).lerp(a,Math.pow(y,.6));else c.copy(b).lerp(gr,Math.min(1,-y*5));cols.push(c.r,c.g,c.b)}
  g.setAttribute('color',new Float32BufferAttribute(cols,3));sc.add(new Mesh(g,new MeshBasicMaterial({vertexColors:true,side:BackSide})));
  const sun=new Mesh(new SphereGeometry(night?3:5,12,8),new MeshBasicMaterial({color:new Color(sunCol).multiplyScalar(night?3:14)}));sun.position.copy(sunDir).multiplyScalar(44);sc.add(sun);
  const pm=new PMREMGenerator(renderer),rt=pm.fromScene(sc,.02);pm.dispose();g.dispose();return rt.texture}

// Feine Oberflächenstruktur für alle Standard-Materialien: Rauschen in Weltkoordinaten (von drei Seiten projiziert)
// verändert Helligkeit, Rauheit und die Flächenneigung ein wenig – ohne dass die Modelle Texturkoordinaten brauchen.
let detail=null;
const detailTex=()=>{if(detail)return detail;const n=128,H=heightField(n,[4,9,21,48],13),c=cv(n),x=c.getContext('2d'),im=x.createImageData(n,n),d=im.data;
  for(let y=0;y<n;y++)for(let X=0;X<n;X++){const h=(p,q)=>H[((q+n)%n)*n+(p+n)%n],i=(y*n+X)*4;
    d[i]=((h(X+1,y)-h(X-1,y))*n/8*.5+.5)*255;d[i+1]=((h(X,y+1)-h(X,y-1))*n/8*.5+.5)*255;d[i+2]=H[y*n+X]*255;d[i+3]=255}
  x.putImageData(im,0,0);detail=new CanvasTexture(c);detail.wrapS=detail.wrapT=RepeatWrapping;detail.colorSpace=LinearSRGBColorSpace;return detail};
const GLASS=/^m_(a5f3fc|93c5fd|bfdbfe|dbeafe|e0f2fe)/;
// kind: Stärke je Stoffart – [Helligkeit, Rauheit, Relief, Maßstab]
const KIND={metal:[.10,.34,.25,.9],wood:[.22,.16,.9,1.6],stone:[.20,.14,1.1,.7],soft:[.10,.10,.35,1.1]};
function kindOf(m){
  if(m.metalness>=.3)return 'metal';const h={};m.color.getHSL(h);
  if(h.s<.22)return 'stone';if(h.h>.03&&h.h<.12&&h.l<.36)return 'wood';if(h.h<.04&&h.l<.4)return 'stone';return 'soft'}
export function enhance(m,night){
  if(!m||!m.isMeshStandardMaterial||m.userData.real)return;m.userData.real=1;
  const n=m.name||'';
  if(GLASS.test(n)){m.roughness=.07;m.metalness=.25;m.envMapIntensity=1.7;if(!night)m.emissiveIntensity=Math.min(m.emissiveIntensity,.25);return}
  if(/_e(\.|$)/.test(n)||m.transparent)return; // leuchtende Teile bleiben, wie sie sind
  const k=kindOf(m),[cA,rA,nA,sc]=KIND[k];
  if(k==='metal'){m.metalness=Math.min(1,m.metalness+.35);m.roughness=Math.max(.22,m.roughness-.22);m.envMapIntensity=1.25}
  const tex=detailTex();
  m.onBeforeCompile=sh=>{
    sh.uniforms.uDet={value:tex};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWp;varying vec3 vWn;')
      .replace('#include <project_vertex>',`#include <project_vertex>
        {vec4 wp=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          wp=instanceMatrix*wp;
        #endif
        vWp=(modelMatrix*wp).xyz;vWn=inverseTransformDirection(transformedNormal,viewMatrix);}`);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
        uniform sampler2D uDet;varying vec3 vWp;varying vec3 vWn;vec3 dW;float dH;`)
      .replace('#include <map_fragment>',`#include <map_fragment>
        {vec3 an=abs(normalize(vWn));an=pow(an,vec3(4.));an/=(an.x+an.y+an.z);vec3 p=vWp*${sc.toFixed(2)}*.5;
        vec3 tx=texture2D(uDet,p.zy).rgb,ty=texture2D(uDet,p.xz).rgb,tz=texture2D(uDet,p.xy).rgb;
        vec3 fx=texture2D(uDet,p.zy*4.3).rgb,fy=texture2D(uDet,p.xz*4.3).rgb,fz=texture2D(uDet,p.xy*4.3).rgb;
        tx=tx*.6+fx*.4;ty=ty*.6+fy*.4;tz=tz*.6+fz*.4;
        dH=tx.b*an.x+ty.b*an.y+tz.b*an.z;
        dW=vec3(0.,tx.g-.5,tx.r-.5)*an.x+vec3(ty.r-.5,0.,ty.g-.5)*an.y+vec3(tz.r-.5,tz.g-.5,0.)*an.z;
        diffuseColor.rgb*=1.+(dH-.5)*${(cA*2).toFixed(2)};}`)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=clamp(roughnessFactor+(dH-.5)*${(rA*2).toFixed(2)},.04,1.);`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        normal=normalize(normal-${nA.toFixed(2)}*(viewMatrix*vec4(dW,0.)).xyz);`)};
  m.customProgramCacheKey=()=>'real-'+k;m.needsUpdate=true}
export const enhanceAll=(root,night)=>root.traverse(o=>{if(o.isMesh||o.isInstancedMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>enhance(m,night))});
// Standard-Material als Ersatz für die bisherigen einfachen Materialien
export const std=(color,o={})=>new MeshStandardMaterial({color,roughness:.82,metalness:0,...o});
