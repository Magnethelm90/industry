/* Konkurrenz und Firmenwert */
import {BLD,G,GK} from '../data.js';
import {bst} from './buildings.js';
import {S} from '../state.js';

export function netWorth(){
  let w=S.money;GK.forEach(g=>w+=S.stock[g]*G[g].base);
  BLD.forEach(b=>{const l=bst(b).lvl;if(l)w+=b.base*(Math.pow(1.9,l)-1)/.9});
  S.shop.slots.forEach(s=>{if(s.g)w+=s.qty*G[s.g].base});return w;
}
export function tickRivals(dt){S.rivals.forEach(r=>{r.w*=1+dt*.00009*r.r*(.6+Math.random()*.8)})}
