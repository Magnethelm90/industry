/* Aufträge und Ruf */
import {render} from '../app.js';
import {CUSTOMERS,G} from '../data.js';
import {netWorth} from './rivals.js';
import {SFX,burst,fx,toast,vib} from '../fx.js';
import {GKU,S,cap,lvl} from '../state.js';
import {addSec} from '../ui.js';
import {$,fmt,fmtT,ic,pick} from '../util.js';

export const repTier=()=>S.rep>=80?'Legende':S.rep>=50?'Geschätzt':S.rep>=20?'Bekannt':'Neuling';
export function genOffer(){
  const L=lvl(),pool=GKU(),vip=S.rep>=50&&Math.random()<.25,rush=!vip&&Math.random()<.3;
  const goods=[pick(pool)];
  if(pool.length>2&&Math.random()<.4){let g2;do g2=pick(pool);while(g2===goods[0]);goods.push(g2)}
  const V=(60+L*70)*(.8+Math.random()*.7)*(vip?2:1);let val=0;const items={};
  goods.forEach(g=>{const n=Math.max(1,Math.min(Math.floor(cap()*.6),Math.round(V/goods.length/G[g].base)));items[g]=n;val+=n*G[g].base});
  return {id:S.oid++,who:pick(CUSTOMERS),items,rush,vip,reward:Math.round(val*(rush?2.1:vip?2.4:1.6)*(1+S.rep/250)),xp:Math.round(val/8)+5,
    time:((rush?3:vip?8:10)+goods.length*2)*60,exp:Date.now()+(150+Math.random()*120)*1000};
}
export const canDeliver=o=>Object.keys(o.items).every(g=>S.stock[g]>=o.items[g]);
export function acceptOrder(o){
  if(S.orders.length>=3){SFX.err();toast('Du kannst höchstens 3 Aufträge gleichzeitig haben');return}
  S.offers=S.offers.filter(x=>x!==o);o.due=Date.now()+o.time*1000;S.orders.push(o);SFX.buy();toast('Auftrag angenommen: '+o.who);render();
}
export function deliverOrder(o,e){
  if(!canDeliver(o)){SFX.err();return}
  for(const g in o.items)S.stock[g]-=o.items[g];
  const rp=o.vip?8:o.rush?6:4;S.orders=S.orders.filter(x=>x!==o);S.money+=o.reward;S.xp+=o.xp;S.rep=Math.min(100,S.rep+rp);
  SFX.win();vib([30,40,80]);burst(e.clientX,e.clientY,'#fbbf24',24);fx('+'+fmt(o.reward)+' Cr','#fbbf24',e.clientX,e.clientY-40);
  toast(o.who+' ist zufrieden! Ruf +'+rp);render();
}
export function tickOrders(){
  const now=Date.now();
  S.offers=S.offers.filter(o=>{if(now<o.exp)return true;if(Math.random()<.4)toast('📉 '+pick(S.rivals).n+' hat sich den Auftrag von '+o.who+' geschnappt!');return false});
  S.orders=S.orders.filter(o=>{if(now<o.due)return true;S.rep=Math.max(0,S.rep-8);SFX.crash();vib([80,40,80]);toast('⏰ Auftrag von '+o.who+' verpasst! Ruf −8');return false});
  if(S.offers.length<3&&now>S.nextOffer){S.offers.push(genOffer());S.nextOffer=now+20000+Math.random()*20000}
}
export function renderOrders(){
  const el=$('s-orders'),now=Date.now();
  el.innerHTML=`<h2>Aufträge</h2><p class="sub">Kunden bestellen Ware mit Frist. Pünktlich liefern bringt viel Geld und Ruf, verpasste Fristen kosten Ruf. Die Fristen laufen in Echtzeit.</p>
   <div class="card" style="--c:#fbbf24"><div class="art">${ic('lvl',40)}</div><div class="i">Ruf: ${repTier()} <span class="chip num">${Math.round(S.rep)} / 100</span><div class="meter"><i style="width:${S.rep}%;background:var(--g2)"></i></div><small>Mehr Ruf = höhere Belohnungen und mehr Ladenkunden${S.rep<50?' · VIP-Aufträge ab 50':''}</small></div></div>`;
  const items=o=>Object.keys(o.items).map(g=>`<span class="oi ${S.stock[g]>=o.items[g]?'up':'dn'}">${ic(g,22)}${o.items[g]}× ${G[g].n} <b class="num">(${Math.floor(S.stock[g])})</b></span>`).join('');
  const tag=o=>o.vip?' <span class="chip" style="color:#f0abfc">👑 VIP</span>':o.rush?' <span class="chip dn">⚡ Eilig</span>':'';
  const col=o=>o.vip?'#e879f9':o.rush?'#fb7185':'#22d3ee';
  addSec(el,'Aktiv · '+S.orders.length+' / 3');
  if(!S.orders.length)el.insertAdjacentHTML('beforeend','<p class="sub">Keine aktiven Aufträge. Nimm unten einen an.</p>');
  S.orders.forEach(o=>{const left=o.due-now,f=left/(o.time*1000),d=document.createElement('div');d.className='card';d.style.setProperty('--c',col(o));
    d.innerHTML=`<div class="i">${o.who}${tag(o)}<div class="ois">${items(o)}</div><div class="meter" style="height:6px"><i style="width:${Math.max(0,f*100)}%;background:${f<.25?'var(--g4)':'var(--g1)'}"></i></div><small>⏱ <b class="num">${fmtT(left)}</b> · <b style="color:var(--gold)">${fmt(o.reward)} Cr</b> · +${o.xp} XP</small></div><button class="btn" ${canDeliver(o)?'':'disabled'}>Liefern</button>`;
    d.querySelector('button').onclick=e=>deliverOrder(o,e);el.appendChild(d)});
  addSec(el,'Neue Anfragen');
  if(!S.offers.length)el.insertAdjacentHTML('beforeend','<p class="sub">Gleich kommen neue Anfragen rein …</p>');
  S.offers.forEach(o=>{const d=document.createElement('div');d.className='card';d.style.setProperty('--c',col(o));
    d.innerHTML=`<div class="i">${o.who}${tag(o)}<div class="ois">${items(o)}</div><small>Frist ${Math.round(o.time/60)} min · <b style="color:var(--gold)">${fmt(o.reward)} Cr</b> · +${o.xp} XP · Anfrage läuft ab in ${fmtT(o.exp-now)}</small></div><div class="col"><button class="btn b">Annehmen</button><button class="btn ghost">Ablehnen</button></div>`;
    const [a,x]=d.querySelectorAll('button');a.onclick=()=>acceptOrder(o);x.onclick=()=>{S.offers=S.offers.filter(y=>y!==o);SFX.tick();render()};el.appendChild(d)});
  addSec(el,'Rangliste · Firmenwert');
  const list=[...S.rivals.map(r=>({n:r.n,w:r.w})),{n:'Deine Firma',w:netWorth(),me:1}].sort((a,b)=>b.w-a.w);
  list.forEach((r,i)=>el.insertAdjacentHTML('beforeend',`<div class="rank ${r.me?'me':''}"><b>${i+1}</b><span>${r.n}</span><span class="num">${fmt(Math.round(r.w))} Cr</span></div>`));
}
