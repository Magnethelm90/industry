/* Werkstatt: Stationen mit zufälligem Minispiel */
import {render} from '../app.js';
import {G,REC,ST} from '../data.js';
import {openLab} from './lab.js';
import {SFX,burst,fx,toast,vib} from '../fx.js';
import {GAMES,GNAME} from '../games/index.js';
import {S,cap,lvl,mult} from '../state.js';
import {addSec,closeOv} from '../ui.js';
import {$,ic} from '../util.js';

export async function runStation(s,srcEl){
  if(s.lv&&s.lv>lvl()){SFX.err();toast('Wird mit Level '+s.lv+' freigeschaltet');return}
  for(const k in s.in)if(S.stock[k]<s.in[k]){SFX.err();toast('Es fehlt: '+(s.in[k]-Math.floor(S.stock[k]))+'× '+G[k].n);return}
  if(S.stock[s.out]>=cap()){SFX.err();toast('Lager für '+G[s.out].n+' ist voll – bring Ware zum Markt!');return}
  const pool=s.games.length>1?s.games.filter(g=>g!==s.lastG):s.games,gname=pool[Math.floor(Math.random()*pool.length)];
  s.lastG=gname;
  const score=await GAMES[gname](s);
  if(score==null)return;
  closeOv();
  for(const k in s.in)S.stock[k]-=s.in[k];
  let out=Math.round(score*s.max*mult(s.mult));
  if(score>=0.3&&out<1)out=1;
  const cb=Math.min(5,S.combo);if(cb&&out>0)out=Math.round(out*(1+cb*.1));
  S.combo=score>=.85?S.combo+1:0;
  out=Math.min(out,Math.floor(cap()-S.stock[s.out]));
  S.stock[s.out]+=out;S.xp+=out*(G[s.out].base>10?4:1)+1;
  if(s.heat){S.ug.heat=Math.min(100,S.ug.heat+s.heat);S.ug.active=1}
  if(out>0){SFX.win();vib([30,40,60]);fx('+'+out+' '+G[s.out].n,G[s.out].c);burst(innerWidth/2,innerHeight*.4,G[s.out].c,20)}
  else{SFX.crash();fx('Fehlschlag','#fb7185')}
  toast((out>0?`Score ${Math.round(score*100)}% – ${out}× ${G[s.out].n} hergestellt`:'Material verloren 😬 Versuch es nochmal!')+(S.combo>=2?` · 🔥 Combo ×${S.combo}`:''));
  render();
}
export function renderWork(){
  const el=$('s-work'),L=lvl();el.innerHTML='<h2>Werkstatt</h2><p class="sub">Stelle Waren in Minispielen selbst her. Jede Station lost eins ihrer Minispiele aus. Gute Runden (ab 85 %) bauen eine Combo auf: bis +50 % Ertrag.</p>'+
    (S.combo>=1?`<span class="chip up" style="margin:0 2px 6px;display:inline-flex">🔥 Combo ×${S.combo} · +${Math.min(5,S.combo)*10} % Ertrag</span>`:'');
  const known=REC.filter(r=>S.rec[r.out]).length,lab=document.createElement('div');lab.className='card';lab.style.setProperty('--c','#22d3ee');
  lab.innerHTML=`<div class="art"><span style="font-size:30px">🧪</span></div><div class="i">Labor<small>Kombiniere Zutaten und entdecke geheime Rezepte · ${known} / ${REC.length} entdeckt</small></div><button class="btn b">Öffnen</button>`;
  lab.querySelector('button').onclick=openLab;el.appendChild(lab);
  [['Rohstoffe',s=>!s.secret&&!s.grp&&!s.lv&&!Object.keys(s.in).length],['Verarbeitung',s=>!s.secret&&!s.grp&&!s.lv&&Object.keys(s.in).length>0],
   ['Veredelung · Lebensmittel & Textil',s=>s.grp==='food'],
   ['Elektronik'+(L<4?' · ab Level 4':''),s=>!s.secret&&!s.grp&&!!s.lv],['Eigene Rezepte',s=>s.secret&&S.rec[s.out]]].forEach(([title,f])=>{
    const list=ST.filter(f);if(!list.length)return;
    addSec(el,title);
    list.forEach(s=>{
      const locked=s.lv&&s.lv>L;
      const need=Object.keys(s.in).map(k=>`<span class="${S.stock[k]>=s.in[k]?'up':'dn'}">${s.in[k]}× ${G[k].n} (${Math.floor(S.stock[k])})</span>`).join(' · ');
      const can=Object.keys(s.in).every(k=>S.stock[k]>=s.in[k]);
      const d=document.createElement('div');d.className='card'+(locked?' idle':'');d.style.setProperty('--c',G[s.out].c);
      d.innerHTML=`<div class="art">${ic(s.out,42)}</div><div class="i">${s.n}<small>🎲 ${s.games.map(g=>GNAME[g]).join(' · ')}</small><small>${need?'Braucht '+need:'Kostenlos'} → bis ${Math.max(1,Math.round(s.max*mult(s.mult)))}× ${G[s.out].n}</small></div>`+
        (locked?`<button class="btn ghost" disabled>🔒 Lv ${s.lv}</button>`:`<button class="btn ${can?'':'ghost'}">Spielen</button>`);
      if(!locked)d.querySelector('button').onclick=()=>runStation(s);
      el.appendChild(d)});
  });
}
