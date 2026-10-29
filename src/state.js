/* Spielstand laden und abgeleitete Werte (Level, Lager, Preise) */
import {BLD,G,GK,SAVE,UP} from './data.js';

export let S={money:30,xp:0,stock:{},up:{},last:Date.now(),hist:{},mute:false,b:{},
  rep:10,offers:[],orders:[],rec:{},shop:{lvl:1,slots:[],sold:0,earned:0,walked:0},rivals:null,oid:1,nextOffer:0,
  combo:0,farm:{plots:[0,1,2,3].map(()=>({c:null,p:0,w:0,pest:0,half:0,ready:0})),nextPest:0},cellar:{n:2,items:[]},
  exp:{built:0,lvl:1,ships:[],demand:{},demandAt:0},
  ug:{heat:0,stash:{},slvl:1,gang:0,nextGang:0,nextAttack:0,nextRaid:0,fences:null,fenceAt:0,active:0}};
try{const l=JSON.parse(localStorage.getItem(SAVE));if(l&&l.stock)S=Object.assign(S,l)}catch(e){}
GK.forEach(g=>{if(S.stock[g]==null)S.stock[g]=0;if(!S.hist[g])S.hist[g]=[]});
UP.forEach(u=>{if(S.up[u.id]==null)S.up[u.id]=0});
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
export const GKU=()=>GK.filter(g=>unl(g)&&!G[g].illegal);
export const diff=()=>1+(lvl()-1)*.05;
export const buyP=g=>price(g)*1.2,sellP=g=>price(g)*0.75;
