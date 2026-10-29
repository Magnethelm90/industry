/* Firmen-Übersicht: Level, Ruf, Freischaltungen, Rangliste */
import {UNL,xpFor} from '../data.js';
import {S,isOpen,lvl} from '../state.js';
import {bindX,closeOv,openOv,xbtn} from '../ui.js';
import {$,fmt,ic} from '../util.js';
import {repTier} from './orders.js';
import {netWorth} from './rivals.js';

export function openCompany(){
  const L=lvl(),a=xpFor(L),b=xpFor(L+1);
  const rank=[...S.rivals.map(r=>({n:r.n,w:r.w})),{n:'Deine Firma',w:netWorth(),me:1}].sort((x,y)=>y.w-x.w);
  const unl=Object.keys(UNL).sort((x,y)=>UNL[x].lv-UNL[y].lv);
  openOv(xbtn()+`<h3>Deine Firma</h3>
    <div class="card" style="--c:#22d3ee"><div class="art">${ic('lvl',40)}</div><div class="i">Level ${L}<div class="meter"><i style="width:${Math.min(100,(S.xp-a)/(b-a)*100)}%"></i></div><small>Noch ${Math.ceil(b-S.xp)} XP bis Level ${L+1}. XP gibt es fürs Herstellen, Verkaufen, Liefern und für Ziele.</small></div></div>
    <div class="card" style="--c:#fbbf24"><div class="art"><span style="font-size:30px">🤝</span></div><div class="i">Ruf: ${repTier()} <span class="chip num">${Math.round(S.rep)} / 100</span><div class="meter"><i style="width:${S.rep}%;background:var(--g2)"></i></div><small>Steigt durch pünktliche Aufträge. Mehr Ruf = höhere Belohnungen und mehr Ladenkunden.</small></div></div>
    <div class="sec">Freischaltungen</div>
    ${unl.map(k=>{const u=UNL[k],o=isOpen(k);return `<div class="rank ${o?'me':''}"><b>${u.lv}</b><span>${u.n}<small style="display:block;color:var(--mut);font-weight:500;font-size:12px">${u.d}</small></span><span>${o?'✅':'🔒'}</span></div>`}).join('')}
    <div class="sec">Rangliste · Firmenwert</div>
    ${rank.map((r,i)=>`<div class="rank ${r.me?'me':''}"><b>${i+1}</b><span>${r.n}</span><span class="num">${fmt(Math.round(r.w))} Cr</span></div>`).join('')}
    <button class="btn big b" id="done" style="margin-top:12px">Schließen</button>`);
  bindX();$('done').onclick=closeOv;
}
