/* Konkurrenz, Firmenwert und Übernahmen */
import {BLD,G,GK,RIVALS,TAKE_DIV,TAKE_PREM} from '../data.js';
import {bst} from './buildings.js';
import {S} from '../state.js';

export function netWorth(){
  let w=S.money;GK.forEach(g=>w+=S.stock[g]*G[g].base);
  BLD.forEach(b=>{const l=bst(b).lvl;if(l)w+=b.base*(Math.pow(1.9,l)-1)/.9});
  S.shop.slots.forEach(s=>{if(s.g)w+=s.qty*G[s.g].base});
  S.rivals.forEach(r=>{if(r.own)w+=r.w});return w;
}
const capOf=i=>RIVALS[i]?RIVALS[i].cap:1e6;
// Konkurrenz, die noch nicht übernommen ist (für Meldungen)
export const freeRivals=()=>{const f=S.rivals.filter(r=>!r.own);return f.length?f:S.rivals};
export const takePrice=r=>Math.ceil(r.w*TAKE_PREM);
// Logistisches Wachstum, exakt gelöst: stimmt für 1 s im Takt genauso wie für 8 h offline
export function tickRivals(dt){
  S.rivals.forEach((r,i)=>{
    if(r.own){S.money+=r.paid*TAKE_DIV*dt/3600;return}
    const K=capOf(i),k=.00009*r.r*(.6+Math.random()*.8);
    r.w=Math.min(r.w,K*.999);r.w=K/(1+(K/r.w-1)*Math.exp(-k*dt))})
}
export function takeover(r){const c=takePrice(r);if(r.own||S.money<c)return false;S.money-=c;r.own=1;r.paid=c;return true}
