/* Werkstatt: Stationen mit zufälligem Minispiel */
import {render} from '../app.js';
import {G,REC,ST} from '../data.js';
import {labStatus,openLab} from './lab.js';
import {showResult} from './celebrate.js';
import {ACH,dailyDone,openAch,openDaily} from './daily.js';
import {SFX,burst,fx,toast,vib} from '../fx.js';
import {GAMES,GNAME} from '../games/index.js';
import {TH} from '../games/theme.js';
import {S,cap,isOpen,lvl,mult,track} from '../state.js';
import {addSec,closeOv,lockLine} from '../ui.js';
import {$,ic} from '../util.js';

// Prüft, ob die Station starten kann (Level, Zutaten, Lagerplatz) und meldet sonst den Grund
export function canStart(s){
  if(s.lv&&s.lv>lvl()){SFX.err();toast('Wird mit Level '+s.lv+' freigeschaltet');return false}
  for(const k in s.in)if(S.stock[k]<s.in[k]){SFX.err();toast('Es fehlt: '+(s.in[k]-Math.floor(S.stock[k]))+'× '+G[k].n);return false}
  if(S.stock[s.out]>=cap()){SFX.err();toast('Lager für '+G[s.out].n+' ist voll – bring Ware zum Markt!');return false}
  return true}
// Bucht das Ergebnis einer Runde (Score 0..1): Zutaten, Ertrag, Combo, XP, Anzeige. Gilt für 2D- und 3D-Minispiele.
export function applyResult(s,score){
  for(const k in s.in)S.stock[k]-=s.in[k];
  let out=Math.round(score*s.max*mult(s.mult));
  if(score>=0.3&&out<1)out=1;
  const cb=Math.min(5,S.combo);if(cb&&out>0)out=Math.round(out*(1+cb*.1));
  S.combo=score>=.85?S.combo+1:0;
  out=Math.min(out,Math.floor(cap()-S.stock[s.out]));
  S.stock[s.out]+=out;if(out>0)track('make',s.out,out);
  const gain=out*Math.max(G[s.out].base>=15?4:1,Math.ceil(G[s.out].base/50))+1;S.xp+=gain;
  if(score>=.85)track('perf');track('rounds');
  if(s.heat){S.ug.heat=Math.min(100,S.ug.heat+s.heat);S.ug.active=1}
  if(out>0){SFX.win();vib([30,40,60]);burst(innerWidth/2,innerHeight*.4,G[s.out].c,20)}
  else SFX.crash();
  showResult({score,out,good:s.out,gname:G[s.out].n,color:G[s.out].c,combo:S.combo,xp:gain});
  render();
}
export async function runStation(s,srcEl){
  if(!canStart(s))return;
  const pool=s.games.length>1?s.games.filter(g=>g!==s.lastG):s.games,gname=pool[Math.floor(Math.random()*pool.length)];
  s.lastG=gname;
  const score=await GAMES[gname]({...s,th:(TH[s.id]||{})[gname]});
  if(score==null)return;
  closeOv();
  applyResult(s,score);
}
// Anzeige-Zustand: Filter und eingeklappte Bereiche (nur für diese Sitzung bzw. im Browser gemerkt)
let wFilter='alle';
const fold=(()=>{try{return JSON.parse(localStorage.getItem('ia_fold'))||{}}catch(e){return {}}})();
const saveFold=()=>{try{localStorage.setItem('ia_fold',JSON.stringify(fold))}catch(e){}};
const canRun=s=>!(s.lv>lvl())&&Object.keys(s.in).every(k=>S.stock[k]>=s.in[k])&&S.stock[s.out]<cap();
const GROUPS=[['Rohstoffe',s=>!s.secret&&!s.grp&&!s.lv&&!Object.keys(s.in).length],['Verarbeitung',s=>!s.secret&&!s.grp&&!s.lv&&Object.keys(s.in).length>0],
  ['Lebensmittel & Textil',s=>s.grp==='food'],['Elektronik',s=>!s.secret&&!s.grp&&!!s.lv],['Eigene Rezepte',s=>s.secret&&S.rec[s.out]]];
export function renderWork(){
  const el=$('s-work'),L=lvl();el.innerHTML='<h2>Werkstatt</h2>'+
    (S.combo>=1?`<span class="chip up" style="margin:0 2px 6px;display:inline-flex">🔥 Combo ×${S.combo} · +${Math.min(5,S.combo)*10} % Ertrag</span>`:'<p class="sub">Runden ab 85 % bauen eine Combo auf: bis +50 % Ertrag.</p>');
  // Schnellzugriffe: Aufgaben, Labor, Erfolge als kleine Kacheln
  const tiles=document.createElement('div');tiles.className='tiles';
  if(S.goal>=5||L>=2){const d=document.createElement('button');d.className='tile';d.innerHTML=`<span class="te">📅</span><b>Aufgaben</b><small>${dailyDone()} / 3 · Serie ${S.daily.streak}</small>`;d.onclick=openDaily;tiles.appendChild(d)}
  if(isOpen('lab')){
    const known=REC.filter(r=>S.rec[r.out]).length,lab=document.createElement('div');lab.className='tile';lab.id='lab';
    lab.innerHTML=`<button class="btn tbtn"><span class="te">🧪</span><b>Labor</b><small>${labStatus()||known+' / '+REC.length+' Rezepte'}</small></button>`;
    lab.querySelector('button').onclick=()=>openLab();tiles.appendChild(lab)}
  if(S.goal>=5||L>=2){const a=document.createElement('button');a.className='tile';a.innerHTML=`<span class="te">🏆</span><b>Erfolge</b><small>${Object.keys(S.ach).length} / ${ACH.length}</small>`;a.onclick=openAch;tiles.appendChild(a)}
  if(tiles.children.length)el.appendChild(tiles);
  // Filter
  const groups=GROUPS.map(([n,f])=>({n,f,list:ST.filter(f)})).filter(g=>g.list.length),usable=groups.filter(g=>g.list.some(s=>!(s.lv>L)));
  const chips=document.createElement('div');chips.className='cats';
  const nReady=ST.filter(s=>(!s.secret||S.rec[s.out])&&canRun(s)).length;
  [['alle','Alle'],['bereit','Bereit ('+nReady+')'],...usable.map(g=>[g.n,g.n.split(' ')[0]])].forEach(([k,n])=>{const b=document.createElement('button');b.className='chip2'+(k===wFilter?' on':'');b.textContent=n;b.onclick=()=>{wFilter=k;SFX.tick();render()};chips.appendChild(b)});
  if(usable.length>1)el.appendChild(chips);
  if(wFilter!=='alle'&&wFilter!=='bereit'&&!usable.some(g=>g.n===wFilter))wFilter='alle';
  groups.forEach(g=>{
    const all=g.list,list=all.filter(s=>!(s.lv>L)),later=all.filter(s=>s.lv>L);
    const shown=wFilter==='bereit'?list.filter(canRun):wFilter==='alle'||wFilter===g.n?list:[];
    if(!shown.length&&!(wFilter==='alle'&&later.length))return;
    const open=!fold[g.n]||wFilter!=='alle';
    const h=document.createElement('button');h.className='sec fold';h.innerHTML=`<span>${open?'▾':'▸'} ${g.n}</span><i>${list.length?list.filter(canRun).length+' bereit · '+list.length:'gesperrt'}</i>`;
    h.onclick=()=>{fold[g.n]=!fold[g.n];saveFold();SFX.tick();render()};
    if(wFilter==='alle')el.appendChild(h);else addSec(el,g.n);
    if(!open)return;
    shown.forEach(s=>{
      const need=Object.keys(s.in).map(k=>`<span class="${S.stock[k]>=s.in[k]?'up':'dn'}">${s.in[k]}× ${G[k].n} (${Math.floor(S.stock[k])})</span>`).join(' · ');
      const can=canRun(s);
      const d=document.createElement('div');d.className='card wcard'+(can?'':' idle');d.dataset.st=s.id;d.style.setProperty('--c',G[s.out].c);
      d.innerHTML=`<div class="art">${ic(s.out,40)}</div><div class="i">${s.n}<small class="one">🎲 ${s.games.map(g=>(TH[s.id]||{})[g]?.name||GNAME[g]).join(' · ')}</small><small>${need?'Braucht '+need:'Kostenlos'} → bis ${Math.max(1,Math.round(s.max*mult(s.mult)))}× ${G[s.out].n}</small></div><button class="btn ${can?'':'ghost'}">Spielen</button>`;
      d.querySelector('button').onclick=()=>runStation(s);
      el.appendChild(d)});
    if(wFilter==='alle'&&later.length)el.appendChild(lockLine(later.length,Math.min(...later.map(s=>s.lv)),list.length));
  });
  if(wFilter==='bereit'&&!nReady)el.insertAdjacentHTML('beforeend','<p class="sub" style="margin-top:14px">Gerade ist nichts bereit. Besorg Rohstoffe oder verkauf Ware, damit das Lager Platz hat.</p>');
}
