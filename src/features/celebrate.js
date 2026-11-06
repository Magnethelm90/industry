/* Rückmeldung: Ergebnis mit Sternen nach jeder Runde, Feier beim Levelaufstieg */
import {SFX,burst,vib} from '../fx.js';
import {$,calm,ic} from '../util.js';

export const stars=v=>v>=.97?3:v>=.7?2:v>=.3?1:0;
const kill=sel=>document.querySelectorAll(sel).forEach(e=>e.remove());

// Karte in der Mitte: Sterne, Ware, Combo. Verschwindet von selbst oder beim Antippen.
export function showResult({score,out,good,gname,color,combo,xp}){
  kill('.rescard');
  const n=stars(score),d=document.createElement('div');d.className='rescard';
  const head=out>0?(n===3?'Meisterhaft!':n===2?'Gut gemacht!':'Geschafft'):'Fehlschlag';
  d.innerHTML=`<div class="rs">${[0,1,2].map(i=>`<span class="${i<n?'on':''}" style="animation-delay:${.15+i*.22}s">★</span>`).join('')}</div>
    <div class="rh">${head}</div>
    <div class="rg">${out>0?`${ic(good,44)}<b>+${out}</b><span>${gname}</span>`:'<span>Material verloren 😬</span>'}</div>
    <small>${Math.round(score*100)} % ${xp?'· +'+xp+' XP ':''}${combo>=2?'· 🔥 Combo ×'+combo:''}</small>`;
  d.style.setProperty('--c',color||'#fbbf24');
  document.body.appendChild(d);
  for(let i=0;i<n;i++)setTimeout(()=>{if(d.isConnected){SFX.coin();vib(12)}},180+i*220);
  if(n===3&&!calm())setTimeout(()=>{if(d.isConnected)burst(innerWidth/2,innerHeight*.4,'#fde047',34)},700);
  const bye=()=>{d.classList.add('out');setTimeout(()=>d.remove(),300)};
  d.onclick=bye;setTimeout(bye,2300);
}

// Vollbild-Feier mit den neuen Freischaltungen
export function levelUp(l,news){
  kill('.lvlup');
  const d=document.createElement('div');d.className='lvlup';
  d.innerHTML=`<div class="lb"><small>NEUES LEVEL</small><div class="ln">${l}</div>${news.length?`<div class="lu">Freigeschaltet:<br>${news.map(n=>'<b>'+n+'</b>').join('<br>')}</div>`:'<div class="lu">Weiter so!</div>'}<small class="lt">Tippen zum Fortfahren</small></div>`;
  document.body.appendChild(d);SFX.win();vib([40,40,40,40,120]);
  if(!calm())for(let i=0;i<5;i++)setTimeout(()=>d.isConnected&&burst(innerWidth*(.15+Math.random()*.7),innerHeight*(.2+Math.random()*.4),['#fde047','#22d3ee','#34d399','#f472b6'][i%4],26),i*260);
  const bye=()=>{d.classList.add('out');setTimeout(()=>d.remove(),300)};
  d.onclick=bye;setTimeout(bye,5000);
}
