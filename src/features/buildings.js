/* Betriebe: Minen, Fabriken, Geschäfte und Ausrüstung */
import {render} from '../app.js';
import {BLD,BMAX,G,GK,KEEPS,SHOPT,UP,WEAR} from '../data.js';
import {SFX,burst,fx,toast,vib} from '../fx.js';
import {gBolts} from '../games/bolts.js';
import {gTiming} from '../games/timing.js';
import {S,cap,isOpen,lvl,price,sat,upCost} from '../state.js';
import {addSec,closeOv,lockLine} from '../ui.js';
import {$,fmt,ic} from '../util.js';

export const bst=b=>S.b[b.id];
export const bc=b=>b.c||G[b.out].c;
export const bCost=b=>Math.ceil(b.base*Math.pow(1.9,bst(b).lvl));
export const mineRate=b=>b.rate*bst(b).lvl;
export const facTime=b=>b.t/(1+0.4*(bst(b).lvl-1));
export const shopPrem=b=>1.12+0.03*bst(b).lvl;
export function sellShop(b,units){
  const s=bst(b);let earned=0;
  for(const g of b.goods)while(units>0&&S.stock[g]-s.keep>=1){earned+=price(g)*shopPrem(b);S.stock[g]-=1;sat[g]+=1;units--}
  S.money+=earned;S.xp+=Math.ceil(earned/20);return earned;
}
export function tickB(dt){
  const now=Date.now();
  BLD.forEach(b=>{
    const s=bst(b);if(!s.lvl)return;
    if(b.kind!=='shop'){
      s.hp=Math.max(0,s.hp-WEAR*dt);
      if(s.hp<=0){if(!s.warned){s.warned=1;toast('💥 '+b.n+' ist ausgefallen – Wartung nötig!');SFX.crash();vib([60,30,60])}return}
      s.warned=0;
    }
    if(b.kind==='mine')S.stock[b.out]=Math.min(cap(),S.stock[b.out]+mineRate(b)*dt);
    else if(b.kind==='fac'){
      if(s.p<=0&&S.stock[b.out]<cap()&&Object.keys(b.in).every(k=>S.stock[k]>=b.in[k])){for(const k in b.in)S.stock[k]-=b.in[k];s.p=0.001}
      if(s.p>0){s.p+=dt;if(s.p>=facTime(b)){s.p=0;S.stock[b.out]=Math.min(cap(),S.stock[b.out]+1);S.xp+=1}}
    }else{
      s.p+=dt;if(s.p>=SHOPT){s.p=0;sellShop(b,s.lvl)}
      if(!s.nc)s.nc=now+20000;
      if(!s.cust&&now>s.nc){s.cust=now+9000;s.nc=now+25000+Math.random()*30000;SFX.coin();toast('🛎️ Kunde wartet in deiner Filiale '+b.n+' (Laden)!')}
      if(s.cust&&now>s.cust)s.cust=0;
    }
  });
}
export function offlineB(dt){
  const m0=S.money,order=['mine','fac','shop'].flatMap(k=>BLD.filter(b=>b.kind===k));let any=false;
  order.forEach(b=>{
    const s=bst(b);if(!s.lvl)return;any=true;
    if(b.kind==='shop'){sellShop(b,Math.floor(dt/SHOPT)*s.lvl);return}
    const t=Math.min(dt,s.hp/WEAR);s.hp=Math.max(0,s.hp-WEAR*dt);
    if(b.kind==='mine'){S.stock[b.out]=Math.min(cap(),S.stock[b.out]+mineRate(b)*t);return}
    let cyc=Math.floor(t/facTime(b));
    for(const k in b.in)cyc=Math.min(cyc,Math.floor(S.stock[k]/b.in[k]));
    cyc=Math.max(0,Math.min(cyc,cap()-Math.floor(S.stock[b.out])));
    for(const k in b.in)S.stock[k]-=b.in[k]*cyc;S.stock[b.out]+=cyc;
  });
  GK.forEach(g=>sat[g]=0);
  if(any)setTimeout(()=>toast('Willkommen zurück! Deine Betriebe haben '+fmt(S.money-m0)+' Credits erwirtschaftet.'),500);
}
export function buildOrUpgrade(b,e){
  const s=bst(b),c=bCost(b);if(s.lvl>=BMAX||S.money<c||(b.lv&&b.lv>lvl()))return;
  S.money-=c;s.lvl++;if(s.lvl===1)s.hp=100;S.xp+=10*s.lvl;SFX.buy();vib(25);
  burst(e.clientX,e.clientY,bc(b),16);fx(s.lvl===1?'Gebaut!':'Stufe '+s.lvl,bc(b));render();
}
export async function repairB(b){
  const sc=Math.random()<.5?await gBolts(null,'Wartung · '+b.n):await gTiming(3,'Wartung · '+b.n,'Tippe, wenn die Nadel im grünen Bereich steht – je besser, desto mehr Zustand.');
  if(sc==null)return;closeOv();
  const s=bst(b);s.hp=Math.min(100,40+60*sc);s.warned=0;SFX.win();fx('Zustand '+Math.round(s.hp)+'%','#34d399');render();
}
export function serveCustomer(b,e){
  const s=bst(b);if(!s.cust||s.cust<Date.now())return;
  const bonus=Math.round(25+30*s.lvl+Math.random()*20);S.money+=bonus;S.xp+=5;s.cust=0;
  SFX.coin();vib(20);burst(e.clientX,e.clientY,'#fbbf24',16);fx('+'+bonus+' Trinkgeld','#fbbf24',e.clientX,e.clientY-30);render();
}
export function renderBld(){
  const el=$('s-bld');el.innerHTML='<h2>Betriebe</h2><p class="sub">Minen und Fabriken arbeiten automatisch – auch wenn du offline bist. Kümmere dich um die Wartung!</p>';
  [['mine','Rohstoffe'],['fac','Fabriken']].forEach(([kind,title])=>{addSec(el,title);bldList(el,kind)});
  renderUpg(el);
}
// Filialen: verkaufen automatisch aus dem Lager (Bildschirm Laden)
export function renderBranches(el){
  addSec(el,'Filialen · verkaufen automatisch');
  el.insertAdjacentHTML('beforeend','<p class="sub">Jede Filiale verkauft ihre Waren selbstständig aus deinem Lager, etwas über Marktpreis. Mit „Vorrat" hältst du Ware für Aufträge zurück.</p>');
  bldList(el,'shop');
}
function bldList(el,kind){
  const later=BLD.filter(b=>b.kind===kind&&b.lv>lvl()&&!bst(b).lvl);
  BLD.filter(b=>b.kind===kind&&!later.includes(b)).forEach(b=>el.appendChild(bldCard(b)));
  if(later.length)el.appendChild(lockLine(later.length,Math.min(...later.map(b=>b.lv)),1));
}
function bldCard(b){
  const kind=b.kind,s=bst(b),built=s.lvl>0,max=s.lvl>=BMAX,cost=bCost(b),broken=built&&kind!=='shop'&&s.hp<=0;
  const d=document.createElement('div');d.className='card'+(broken?' broken':'')+(built?'':' idle');d.dataset.b=b.id;d.style.setProperty('--c',bc(b));
  let line='';
  if(kind==='mine')line=built?`+${mineRate(b).toFixed(2)}/s ${G[b.out].n}`:`Fördert ${b.rate}/s je Stufe`;
  if(kind==='fac')line=Object.keys(b.in).map(k=>b.in[k]+'× '+G[k].n).join(' + ')+` → 1× ${G[b.out].n} · ${(built?facTime(b):b.t).toFixed(1)}s`;
  if(kind==='shop')line=`Verkauft ${built?s.lvl:1} Stk / ${SHOPT}s · Preis +${Math.round(((built?shopPrem(b):1.15)-1)*100)}%<br>${b.goods.map(g=>G[g].n).join(', ')}`;
  let extra='';
  if(built&&kind!=='shop'){const hc=s.hp>50?'var(--ok)':s.hp>20?'var(--gold)':'var(--bad)';extra+=`<div class="meter" style="height:6px"><i style="width:${s.hp}%;background:${hc}"></i></div><small>${broken?'⚠️ Ausgefallen – Wartung nötig':'Zustand '+Math.round(s.hp)+'%'}</small>`}
  if(built&&kind==='fac'){const t=facTime(b);extra+=`<div class="meter" style="height:6px"><i style="width:${s.p>0?Math.min(100,s.p/t*100):0}%;background:${bc(b)};transition:width 1s linear"></i></div>`}
  d.innerHTML=`<div class="art">${ic(kind==='shop'?'shop':b.out,42)}</div><div class="i">${b.n}${built?' <span class="chip">Lv '+s.lvl+'</span>':''}<small>${line}</small>${extra}<div class="pips">${Array.from({length:BMAX},(_,k)=>`<i class="${k<s.lvl?'on':''}"></i>`).join('')}</div></div><div class="col"></div>`;
  const col=d.querySelector('.col');
  const mk=(t,cls,f,dis)=>{const bt=document.createElement('button');bt.className='btn '+cls;bt.innerHTML=t;bt.disabled=!!dis;bt.onclick=f;col.appendChild(bt)};
  if(s.cust&&s.cust>Date.now())mk('🛎️ Kunde!','a pulse',e=>serveCustomer(b,e));
  if(!max)mk(built?'⬆ '+fmt(cost):'Bauen '+fmt(cost),built?'b':'',e=>buildOrUpgrade(b,e),S.money<cost);else mk('MAX','ghost',null,true);
  if(built&&kind!=='shop'&&s.hp<85)mk('🔧 Wartung',broken?'r':'ghost',()=>repairB(b));
  if(built&&kind==='shop')mk('Vorrat ≥ '+s.keep,'ghost',()=>{s.keep=KEEPS[(KEEPS.indexOf(s.keep)+1)%KEEPS.length];render()});
  return d;
}
// Wartet in einer Filiale ein Kunde?
export const branchCustomer=()=>BLD.some(b=>b.kind==='shop'&&bst(b).cust>Date.now());
export function renderUpg(el){
  addSec(el,'Ausrüstung');
  UP.filter(u=>!u.req||isOpen(u.req)).forEach(u=>{const d=document.createElement('div'),cost=upCost(u);d.className='card';d.style.setProperty('--c',u.c);
    d.innerHTML=`<div class="art">${ic(u.i,42)}</div><div class="i">${u.n}<small>${u.d}</small><div class="pips">${Array.from({length:10},(_,k)=>`<i class="${k<S.up[u.id]?'on':''}"></i>`).join('')}</div></div><button class="btn a" ${S.money<cost?'disabled':''}>${fmt(cost)}</button>`;
    d.querySelector('button').onclick=e=>{if(S.money>=cost){S.money-=cost;S.up[u.id]++;S.xp+=5;SFX.buy();vib(20);burst(e.clientX,e.clientY,'#fbbf24',14);render()}};el.appendChild(d)});
}
