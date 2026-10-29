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
import {CITIES,PHASES,SEASONS,clearLive,dayPhase,fxInfo,isWeekend,refreshLive,season,weather} from '../world.js';

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
    ${worldHtml()}
    <div class="sec">Einstellungen</div>
    <div class="mrow"><button class="btn sm ghost" id="mus">🎵 Musik: ${S.music!==false?'an':'aus'}</button></div>
    ${backupHtml()}
    <button class="btn big b" id="done" style="margin-top:12px">Schließen</button>`);
  bindX();bindBackup();$('done').onclick=closeOv;
  bindWorld();
  $('mus').onclick=()=>{S.music=S.music===false;$('mus').textContent='🎵 Musik: '+(S.music?'an':'aus');if(S.music)startMusic();else stopMusic()};
  document.querySelectorAll('#ovbox .tko').forEach(b=>b.onclick=e=>{const r=S.rivals[+b.dataset.i];if(!takeover(r))return;
    SFX.win();vib([30,40,80]);burst(e.clientX,e.clientY,'#22d3ee',26);fx(r.n+' gehört jetzt dir!','#22d3ee');openCompany()});
}

// Welt: Tageszeit, Jahreszeit, Wochenende – und die freiwilligen Live-Daten
const FXN={USD:'Dollar',JPY:'Yen',NOK:'Krone',BRL:'Real'},de=d=>d.split('-').reverse().join('.');
function worldHtml(){
  const ph=PHASES[dayPhase()],se=SEASONS[season()],wk=isWeekend(),on=S.live===true,fx=fxInfo(),wx=weather();
  const pct=k=>{const p=Math.round((fx.then[k]/fx.now[k]-1)*100);return `${FXN[k]} ${p>=0?'+':''}${p} %`};
  return `<div class="sec">Welt</div>
    <div class="card" style="--c:#7c5cff"><div class="i">${ph.e} ${ph.n} · ${se.e} ${se.n}${wk?' · 🛍️ Wochenende':''}<small>${se.d}${ph.d?' · '+ph.d:''}${wk?' · Lebensmittel +15 %, Aufträge +20 %':''}</small></div></div>
    <div class="card" style="--c:#22d3ee"><div class="i">📡 Live-Daten <span class="chip ${on?'up':''}">${on?'an':'aus'}</span>
      <small>Echte Wechselkurse der Europäischen Zentralbank verändern deine Exporterlöse (bis ±15 %), und auf Wunsch wirkt das Wetter einer Stadt auf Farm, Angeln und LKW-Fahrt. Eingeschaltet fragt das Spiel dafür api.frankfurter.app und api.open-meteo.com ab – diese Dienste sehen dabei deine IP-Adresse, sonst wird nichts gesendet.</small>
      ${on?`<small>${fx?'💱 Kurse vom '+de(fx.date)+' gegenüber '+de(fx.old)+': '+Object.keys(FXN).map(pct).join(' · '):'💱 Keine Kurse geladen (offline oder Dienst nicht erreichbar)'}</small>
      <small>${wx?wx.e+' '+wx.city+': '+wx.n+', '+Math.round(wx.t)+' °C – '+wx.d:S.city?'Kein Wetter geladen (offline oder Dienst nicht erreichbar)':'Wähle eine Stadt für das Wetter:'}</small>
      <select class="sel" id="city"><option value="">Kein Wetter</option>${Object.keys(CITIES).map(k=>`<option value="${k}" ${S.city===k?'selected':''}>${CITIES[k].n}</option>`).join('')}</select>
      <small style="opacity:.75">Wetterdaten: Open-Meteo.com (CC BY 4.0) · Kurse: EZB über frankfurter.app</small>`:''}
      <div class="mrow"><button class="btn sm ${on?'ghost':'b'}" id="live">${on?'Live-Daten ausschalten':'Live-Daten einschalten'}</button></div></div></div>`}
function bindWorld(){
  $('live').onclick=()=>{S.live=S.live!==true;if(!S.live){clearLive()}SFX.tick();openCompany();if(S.live)refreshLive().then(reopen)};
  const c=$('city');if(c)c.onchange=()=>{S.city=CITIES[c.value]?c.value:'';openCompany();refreshLive().then(reopen)};
}
// Nach dem Laden der Daten neu zeichnen – aber nur, wenn die Übersicht noch offen ist
const reopen=()=>{if(document.getElementById('live'))openCompany()};
