/* Spielstand laden und abgeleitete Werte (Level, Lager, Preise) */
import {BLD,G,GK,SAVE,UNL,UP} from './data.js';

export let S={money:30,xp:0,stock:{},up:{},last:Date.now(),hist:{},mute:false,b:{},
  rep:10,offers:[],orders:[],rec:{},shop:{lvl:1,slots:[],sold:0,earned:0,walked:0},rivals:null,oid:1,nextOffer:0,
  combo:0,farm:{plots:[0,1,2,3].map(()=>({c:null,p:0,w:0,pest:0,half:0,ready:0})),nextPest:0},cellar:{n:2,items:[]},
  exp:{built:0,lvl:1,ships:[],demand:{},demandAt:0},
  ug:{heat:0,stash:{},slvl:1,gang:0,nextGang:0,nextAttack:0,nextRaid:0,fences:null,fenceAt:0,active:0},
  st:{make:{},sold:0,drives:0,orders:0,harvest:0,fish:0},goal:null};
try{const l=JSON.parse(localStorage.getItem(SAVE));if(l&&l.stock)S=Object.assign(S,l)}catch(e){}
GK.forEach(g=>{if(S.stock[g]==null)S.stock[g]=0;if(!S.hist[g])S.hist[g]=[]});
UP.forEach(u=>{if(S.up[u.id]==null)S.up[u.id]=0});
S.st=Object.assign({make:{},sold:0,drives:0,orders:0,harvest:0,fish:0},S.st);
BLD.forEach(b=>{if(!S.b[b.id])S.b[b.id]={lvl:0,hp:100,p:0,keep:0,cust:0,nc:0,warned:0}});
export const mood={},sat={};
GK.forEach(g=>{mood[g]=1;sat[g]=0});
export const lvl=()=>1+Math.floor(Math.sqrt(S.xp/40));
export const cap=()=>100+100*S.up.store;
export const truckCap=()=>20+10*S.up.truck;
export const mult=k=>1+0.3*S.up[k];
export const upCost=u=>Math.ceil(u.base*Math.pow(1.8,S.up[u.id]));
export const price=g=>Math.max(0.2,G[g].base*mood[g]/(1+sat[g]/60));
export const unl=g=>(G[g].lv||1)<=lvl()&&(!G[g].secret||!!S.rec[g]);
export const GKU=()=>GK.filter(g=>(unl(g)||S.stock[g]>=1)&&!G[g].illegal);
export const diff=()=>1+(lvl()-1)*.05;
export const buyP=g=>price(g)*1.2,sellP=g=>price(g)*0.75;
// Bereich freigeschaltet? Was schon benutzt wird, bleibt immer sichtbar.
const USED={bld:()=>BLD.some(b=>S.b[b.id].lvl>0),orders:()=>S.orders.length>0,farm:()=>S.farm.plots.some(p=>p.c)||S.cellar.items.length>0,
  shop:()=>S.shop.slots.some(s=>s.g),lab:()=>Object.keys(S.rec).length>0,under:()=>!!S.ug.active,export:()=>!!S.exp.built};
export const isOpen=k=>!UNL[k]||lvl()>=UNL[k].lv||!!USED[k]?.();
// Zähler für Ziele
export const track=(k,g,n=1)=>{if(k==='make')S.st.make[g]=(S.st.make[g]||0)+n;else S.st[k]=(S.st[k]||0)+n};
