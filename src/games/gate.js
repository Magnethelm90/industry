/* Startbildschirm vor jedem Minispiel: Anleitung in Ruhe lesen, „Los!“ tippen, 3-2-1 – erst dann läuft die Zeit */
import {SFX} from '../fx.js';
import {OV,closeOv} from '../ui.js';
import {$} from '../util.js';
import {hold,release} from './clock.js';

const STEP=600; // ms pro Zahl beim Herunterzählen

// Startet ein Spiel mit angehaltener Uhr und legt den Startbildschirm darüber. Text und Titel stammen aus dem Spiel selbst.
export function play(start,icon=''){
  hold();const p=start();gate(icon);return p}

function gate(icon){
  const ov=OV,box=$('ovbox');if(!ov||!box){release();return}
  const ab=ov.abort;ov.abort=()=>{release();ab&&ab()};
  const title=box.querySelector('h3')?.textContent||'',how=box.querySelector('.sub')?.innerHTML||'';
  const g=document.createElement('div');g.className='gate';g.id='gate';
  g.innerHTML=`${icon?`<div class="gi">${icon}</div>`:''}<div class="gt">${title}</div><div class="gh">${how}</div>
    <button class="btn a big" id="gogo">▶ Los!</button><button class="btn sm ghost" id="goback">Zurück</button>`;
  box.scrollTop=0;box.classList.add('gated');box.appendChild(g);
  const key=e=>{if(!ov.alive)return removeEventListener('keydown',key,true);if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}e.stopPropagation()};
  addEventListener('keydown',key,true);
  $('goback').onclick=closeOv;
  let started=false;
  function go(){
    if(started)return;started=true;removeEventListener('keydown',key,true);
    g.className='gate count';let n=3;
    const show=()=>{if(!ov.alive)return;
      if(n===0){g.remove();box.classList.remove('gated');release();SFX.good();return}
      g.innerHTML=`<div class="cd">${n}</div>`;SFX.tick();n--;setTimeout(show,STEP)};
    show()}
  $('gogo').onclick=go;
}
