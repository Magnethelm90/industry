/* Spielstand laden und abgeleitete Werte (Level, Lager, Preise) */
import {BLD,G,GK,SAVE,UNL,UP,catOf,xpFor} from './data.js';
import {WEEKEND,isWeekend} from './world.js';

export let S={money:30,xp:0,stock:{},up:{},last:Date.now(),hist:{},mute:false,b:{},
  rep:10,offers:[],orders:[],rec:{},shop:{lvl:1,slots:[],sold:0,earned:0,walked:0},rivals:null,oid:1,nextOffer:0,
  combo:0,farm:{plots:[0,1,2,3].map(()=>({c:null,p:0,w:0,pest:0,half:0,ready:0})),nextPest:0},cellar:{n:2,items:[]},
  exp:{built:0,lvl:1,ships:[],demand:{},demandAt:0},lab:{res:null,done:{},rev:{}},
  ug:{heat:0,stash:{},slvl:1,gang:0,nextGang:0,nextAttack:0,nextRaid:0,fences:null,fenceAt:0,active:0},
  st:{make:{},sold:0,drives:0,orders:0,harvest:0,fish:0},goal:null,xpv:2,proj:{},live:false,city:''};
// Alte Spielstände nutzten die Kurve 40·(Level−1)²: auf die neue Kurve umrechnen, ohne dass ein Level verloren geht
const migrateXp=xp=>{const L=1+Math.floor(Math.sqrt(xp/40)),a=40*(L-1)*(L-1),b=40*L*L;return Math.round(xpFor(L)+(xp-a)/(b-a)*(xpFor(L+1)-xpFor(L)))};
try{const l=JSON.parse(localStorage.getItem(SAVE));if(l&&l.stock){S=Object.assign(S,l);if(!l.xpv){S.xp=migrateXp(l.xp||0);S.xpv=2}}}catch(e){}
GK.forEach(g=>{if(S.stock[g]==null)S.stock[g]=0;if(!S.hist[g])S.hist[g]=[]});
UP.forEach(u=>{if(S.up[u.id]==null)S.up[u.id]=0});
S.lab=Object.assign({res:null,done:{},rev:{}},S.lab);
// Labor-Stand absichern (Sicherungscodes können von Hand verändert sein): nur bekannte Waren, Zahlen und Zeitstempel
{const L=S.lab,obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  if(!obj(L.done))L.done={};if(!obj(L.rev))L.rev={};
  for(const k in L.done)if(!Number.isFinite(L.done[k]))delete L.done[k];
  for(const k in L.rev){const a=L.rev[k];if(!G[k]||!Array.isArray(a))delete L.rev[k];else L.rev[k]=a.filter(x=>typeof x==='string'&&G[x]).slice(0,2)}
  if(!obj(L.res)||typeof L.res.id!=='string'||!Number.isFinite(L.res.until))L.res=null}
S.st=Object.assign({make:{},sold:0,drives:0,orders:0,harvest:0,fish:0,harbour:0,exports:0},S.st);
BLD.forEach(b=>{if(!S.b[b.id])S.b[b.id]={lvl:0,hp:100,p:0,keep:0,cust:0,nc:0,warned:0}});
// Beim Laden eines Sicherungscodes darf der Takt den alten Stand nicht mehr speichern
let locked=false;
export const lockSave=(v=true)=>locked=v,saveLocked=()=>locked;
export const mood={},sat={};
GK.forEach(g=>{mood[g]=1;sat[g]=0});
export const lvl=()=>{let l=1;while(S.xp>=xpFor(l+1))l++;return l};
// Abgeschlossene Forschung (Labor)
export const labHas=id=>!!S.lab.done[id];
export const cap=()=>100+100*S.up.store+(labHas('lager')?50:0);
export const truckCap=()=>20+10*S.up.truck;
export const projDone=k=>!!S.proj[k]?.done;
export const mult=k=>1+0.3*S.up[k]+(projDone('techpark')?.2:0)+(labHas('proz1')?.05:0)+(labHas('proz2')?.05:0);
export const upCost=u=>Math.ceil(u.base*Math.pow(1.8,S.up[u.id]));
export const wkMult=g=>isWeekend()&&WEEKEND.cats.includes(catOf(g))?WEEKEND.goods:1;
export const price=g=>Math.max(0.2,G[g].base*mood[g]/(1+sat[g]/60))*wkMult(g);
export const unl=g=>(G[g].lv||1)<=lvl()&&(!G[g].secret||!!S.rec[g]);
export const GKU=()=>GK.filter(g=>(unl(g)||S.stock[g]>=1)&&!G[g].illegal);
export const diff=()=>1+(lvl()-1)*.05;
export const buyP=g=>price(g)*1.2,sellP=g=>price(g)*(labHas('markt')?0.8:0.75);
// Bereich freigeschaltet? Was schon benutzt wird, bleibt immer sichtbar.
const USED={bld:()=>BLD.some(b=>S.b[b.id].lvl>0),orders:()=>S.orders.length>0,farm:()=>S.farm.plots.some(p=>p.c)||S.cellar.items.length>0,
  projects:()=>Object.keys(S.proj).length>0,takeover:()=>S.rivals?.some(r=>r.own),shop:()=>S.shop.slots.some(s=>s.g)||BLD.some(b=>b.kind==='shop'&&S.b[b.id].lvl>0),lab:()=>Object.keys(S.rec).length>0,under:()=>!!S.ug.active,export:()=>!!S.exp.built};
export const isOpen=k=>!UNL[k]||lvl()>=UNL[k].lv||!!USED[k]?.();
// Zähler für Ziele
export const track=(k,g,n=1)=>{if(k==='make')S.st.make[g]=(S.st.make[g]||0)+n;else S.st[k]=(S.st[k]||0)+n};
