/* Navigation und Bildschirmaufbau */
import {renderBld} from './features/buildings.js';
import {renderExport} from './features/export.js';
import {renderFarm} from './features/farm.js';
import {renderMarket} from './features/market.js';
import {canDeliver,renderOrders} from './features/orders.js';
import {custQ,renderShop} from './features/shop.js';
import {renderShip} from './features/transport.js';
import {illLager,renderUnder} from './features/under.js';
import {renderWork} from './features/workshop.js';
import {SFX,fx,toast} from './fx.js';
import {S,lvl,truckCap} from './state.js';
import {OV} from './ui.js';
import {$,fmt} from './util.js';

export function badges(){
  const set=(s,on)=>{const b=document.querySelector(`#nav [data-s="${s}"]`);if(b)b.classList.toggle('dot',!!on)};
  set('trade',custQ.length>0||S.orders.some(canDeliver));
  set('under',lvl()>=3&&illLager().length>0);
  set('farm',S.farm.plots.some(p=>p.pest||p.ready||(p.c&&p.w<=0))||S.cellar.items.some(i=>Date.now()>=i.end));
}
export let cur='work',lastLvl=lvl(),shown=S.money;
export function render(){
  $('capi').textContent=truckCap();
  const l=lvl(),a=40*(l-1)*(l-1),b=40*l*l;$('lvl').textContent=l;
  $('ringc').style.strokeDashoffset=113.1*(1-Math.max(0,Math.min(1,(S.xp-a)/(b-a))));
  if(l>lastLvl){const was=lastLvl;lastLvl=l;SFX.win();fx('LEVEL '+l,'#22d3ee');
    toast(was<4&&l>=4?'⭐ Level '+l+'! Elektronik freigeschaltet: Baue Smartphones!':'⭐ Level '+l+' erreicht!')}
  if(OV)return;
  ({work:renderWork,farm:renderFarm,bld:renderBld,shop:renderShop,orders:renderOrders,ship:renderShip,market:renderMarket,export:renderExport,under:renderUnder})[cur]();
  if(isTrade(cur))tradeTabs($('s-'+cur));
  badges();
}
export function startHud(){
(function loop(){shown+=(S.money-shown)*.18;if(Math.abs(S.money-shown)<.5)shown=S.money;$('money').textContent=fmt(Math.floor(shown));requestAnimationFrame(loop)})();
}
export const TRADE=[['market','Markt'],['shop','Laden'],['orders','Aufträge'],['ship','Transport'],['export','Export']];
export let tradeSub='market';
export const isTrade=k=>TRADE.some(t=>t[0]===k);
export function go(k){
  cur=k;if(isTrade(k))tradeSub=k;const nk=isTrade(k)?'trade':k;
  document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.s===nk));
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id==='s-'+cur));
  document.querySelector('main').scrollTop=0;SFX.tick();render();
}
export function tradeTabs(el){
  const d=document.createElement('div');d.className='seg';
  TRADE.forEach(([k,n])=>{const b=document.createElement('button');b.textContent=n;if(k===cur)b.className='on';
    if((k==='shop'&&custQ.length)||(k==='orders'&&S.orders.some(canDeliver)))b.classList.add('dot');
    b.onclick=()=>go(k);d.appendChild(b)});
  el.prepend(d);
}
