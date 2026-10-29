/* Navigation und Bildschirmaufbau */
import {UNL,xpFor} from './data.js';
import {branchCustomer,renderBld} from './features/buildings.js';
import {renderFarm} from './features/farm.js';
import {applyHl,goalCard} from './features/goals.js';
import {renderLogistics} from './features/logistics.js';
import {renderMarket} from './features/market.js';
import {canDeliver,renderOrders} from './features/orders.js';
import {custQ,renderShop} from './features/shop.js';
import {illLager,renderUnder} from './features/under.js';
import {renderWork} from './features/workshop.js';
import {SFX,fx,toast} from './fx.js';
import {S,isOpen,lvl,truckCap} from './state.js';
import {OV} from './ui.js';
import {$,fmt} from './util.js';

const SCREENS={work:renderWork,farm:renderFarm,bld:renderBld,market:renderMarket,orders:renderOrders,shop:renderShop,logistics:renderLogistics,under:renderUnder};
// Bildschirm -> Freischaltung (siehe UNL in data.js)
const LOCK={farm:'farm',bld:'bld',under:'under',orders:'orders',shop:'shop'};
const locked=k=>LOCK[k]&&!isOpen(LOCK[k]);

export function badges(){
  const set=(s,on)=>{const b=document.querySelector(`#nav [data-s="${s}"]`);if(b)b.classList.toggle('dot',!!on)};
  set('trade',custQ.length>0||branchCustomer()||S.orders.some(canDeliver));
  set('under',isOpen('under')&&illLager().length>0);
  set('farm',isOpen('farm')&&(S.farm.plots.some(p=>p.pest||p.ready||(p.c&&p.w<=0))||S.cellar.items.some(i=>Date.now()>=i.end)));
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('lock',!!locked(b.dataset.s)));
}
export let cur='work',lastLvl=lvl(),shown=S.money;
export function render(){
  $('capi').textContent=truckCap();
  const l=lvl(),a=xpFor(l),b=xpFor(l+1);$('lvl').textContent=l;
  $('ringc').style.strokeDashoffset=113.1*(1-Math.max(0,Math.min(1,(S.xp-a)/(b-a))));
  if(l>lastLvl){const was=lastLvl;lastLvl=l;SFX.win();fx('LEVEL '+l,'#22d3ee');
    const news=Object.values(UNL).filter(u=>u.lv>was&&u.lv<=l).map(u=>u.n);
    toast('⭐ Level '+l+' erreicht!'+(news.length?' Neu: '+news.join(', '):''))}
  if(OV)return;
  SCREENS[cur]();
  const el=$('s-'+cur),gc=goalCard();if(gc)el.prepend(gc);
  if(isTrade(cur))tradeTabs(el);
  applyHl();badges();
}
export function startHud(){
(function loop(){shown+=(S.money-shown)*.18;if(Math.abs(S.money-shown)<.5)shown=S.money;$('money').textContent=fmt(Math.floor(shown));requestAnimationFrame(loop)})();
}
export const TRADE=[['market','Markt'],['orders','Aufträge'],['shop','Laden'],['logistics','Logistik']];
export let tradeSub='market';
export const isTrade=k=>TRADE.some(t=>t[0]===k);
export function go(k){
  if(locked(k)){const u=UNL[LOCK[k]];SFX.err();toast('🔒 '+u.n+' ab Level '+u.lv+': '+u.d);return}
  cur=k;if(isTrade(k))tradeSub=k;const nk=isTrade(k)?'trade':k;
  document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.s===nk));
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id==='s-'+cur));
  document.querySelector('main').scrollTop=0;SFX.tick();render();
}
export function tradeTabs(el){
  const d=document.createElement('div');d.className='seg';
  TRADE.forEach(([k,n])=>{const b=document.createElement('button');b.textContent=n;if(k===cur)b.className='on';
    if(locked(k))b.classList.add('lock');
    else if((k==='shop'&&(custQ.length||branchCustomer()))||(k==='orders'&&S.orders.some(canDeliver)))b.classList.add('dot');
    b.onclick=()=>go(k);d.appendChild(b)});
  el.prepend(d);
}
