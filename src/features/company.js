/* Firmen-Übersicht: Level, Ruf, Freischaltungen, Rangliste */
import {TAKE_DIV,UNL,xpFor} from '../data.js';
import {SFX,burst,fx,vib} from '../fx.js';
import {S,isOpen,lvl} from '../state.js';
import {bindX,closeOv,openOv,xbtn} from '../ui.js';
import {backupHtml,bindBackup} from './backup.js';
import {startMusic,stopMusic} from '../music.js';
import {$,fmt,ic} from '../util.js';
import {repTier} from './orders.js';
import {netWorth,takePrice,takeover} from './rivals.js';

export function openCompany(){
  const L=lvl(),a=xpFor(L),b=xpFor(L+1);
  const rank=[...S.rivals.filter(r=>!r.own).map(r=>({n:r.n,w:r.w,r})),{n:'Deine Firma',w:netWorth(),me:1}].sort((x,y)=>y.w-x.w);
  const tk=isOpen('takeover'),own=S.rivals.filter(r=>r.own);
  const unl=Object.keys(UNL).sort((x,y)=>UNL[x].lv-UNL[y].lv);
  openOv(xbtn()+`<h3>Deine Firma</h3>
    <div class="card" style="--c:#22d3ee"><div class="art">${ic('lvl',40)}</div><div class="i">Level ${L}<div class="meter"><i style="width:${Math.min(100,(S.xp-a)/(b-a)*100)}%"></i></div><small>Noch ${Math.ceil(b-S.xp)} XP bis Level ${L+1}. XP gibt es fürs Herstellen, Verkaufen, Liefern und für Ziele.</small></div></div>
    <div class="card" style="--c:#fbbf24"><div class="art"><span style="font-size:30px">🤝</span></div><div class="i">Ruf: ${repTier()} <span class="chip num">${Math.round(S.rep)} / 100</span><div class="meter"><i style="width:${S.rep}%;background:var(--g2)"></i></div><small>Steigt durch pünktliche Aufträge. Mehr Ruf = höhere Belohnungen und mehr Ladenkunden.</small></div></div>
    <div class="sec">Freischaltungen</div>
    ${unl.map(k=>{const u=UNL[k],o=isOpen(k);return `<div class="rank ${o?'me':''}"><b>${u.lv}</b><span>${u.n}<small style="display:block;color:var(--mut);font-weight:500;font-size:12px">${u.d}</small></span><span>${o?'✅':'🔒'}</span></div>`}).join('')}
    <div class="sec">Rangliste · Firmenwert</div>
    ${tk?'<p class="sub" style="margin-top:6px">Übernimm eine Konkurrenzfirma für das 1,5-Fache ihres Werts. Danach zählt sie zu deinem Firmenwert und zahlt dir jede Stunde '+Math.round(TAKE_DIV*100)+' % des Kaufpreises – auch offline.</p>':''}
    ${rank.map((r,i)=>`<div class="rank ${r.me?'me':''}"><b>${i+1}</b><span>${r.n}${tk&&!r.me?`<button class="btn sm b tko" data-i="${S.rivals.indexOf(r.r)}" style="display:block;flex:none;margin-top:4px" ${S.money<takePrice(r.r)?'disabled':''}>Übernehmen · ${fmt(takePrice(r.r))} Cr</button>`:''}</span><span class="num">${fmt(Math.round(r.w))} Cr</span></div>`).join('')}
    ${own.map(r=>`<div class="rank"><b>🏢</b><span>${r.n}<small style="display:block;color:var(--mut);font-weight:500;font-size:12px">Tochterfirma · +${fmt(r.paid*TAKE_DIV)} Cr pro Stunde</small></span><span class="num">${fmt(Math.round(r.w))} Cr</span></div>`).join('')}
    <div class="sec">Einstellungen</div>
    <div class="mrow"><button class="btn sm ghost" id="mus">🎵 Musik: ${S.music!==false?'an':'aus'}</button></div>
    ${backupHtml()}
    <button class="btn big b" id="done" style="margin-top:12px">Schließen</button>`);
  bindX();bindBackup();$('done').onclick=closeOv;
  $('mus').onclick=()=>{S.music=S.music===false;$('mus').textContent='🎵 Musik: '+(S.music?'an':'aus');if(S.music)startMusic();else stopMusic()};
  document.querySelectorAll('#ovbox .tko').forEach(b=>b.onclick=e=>{const r=S.rivals[+b.dataset.i];if(!takeover(r))return;
    SFX.win();vib([30,40,80]);burst(e.clientX,e.clientY,'#22d3ee',26);fx(r.n+' gehört jetzt dir!','#22d3ee');openCompany()});
}
