/* Minispiel: Mischen */
import {G} from '../data.js';
import {SFX,tone} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';

export function gMix(s){return new Promise(res=>{
  const ING=[{n:'Basis',c:'#a78bfa'},{n:'Härter',c:'#22d3ee'},{n:'Farbe',c:'#f472b6'}];
  const w=[1+Math.random()*2,.6+Math.random()*1.5,.4+Math.random()],sw=w.reduce((a,b)=>a+b),T=w.map(x=>x/sw*100);
  const D=15,amt=[0,0,0];
  const ov=openOv(xbtn()+`<h3>Mischen · ${G[s.out].n}</h3><div class="sub">Halte die Knöpfe zum Einfüllen. Treffe die Schichten der Zielskala rechts. Bei 100 % ist der Behälter voll.</div><div class="msg" id="m">Rezept beachten!</div>
   <div class="mixwrap"><div class="beaker"><div class="liq" id="lq">${ING.map(g=>`<i style="height:0;background:linear-gradient(90deg,${g.c},color-mix(in srgb,${g.c} 60%,#000))"></i>`).join('')}</div><div class="glass"></div></div>
   <div class="ruler">${ING.map((g,i)=>`<i style="height:${T[i]}%;background:${g.c}"></i>`).join('')}</div></div>
   <div class="pours">${ING.map((g,i)=>`<button class="pour" data-i="${i}" style="--pc:${g.c}">${g.n}<small id="pv${i}">0 / ${Math.round(T[i])}</small></button>`).join('')}</div>
   <button class="btn big" id="fill" style="margin-top:10px">✓ Abfüllen</button>
   <div class="timer" style="margin-top:12px"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  let act=-1,done=false,last=performance.now(),tick=0;const t0=performance.now();
  $('fill').onclick=()=>{if(!done&&amt.some(v=>v>0))finish()};
  const btns=[...document.querySelectorAll('.pour')],layers=[...document.querySelectorAll('#lq i')];
  btns.forEach((b,i)=>{b.onpointerdown=e=>{e.preventDefault();act=i;b.classList.add('on')};
    const off=()=>{if(act===i)act=-1;b.classList.remove('on')};b.onpointerup=off;b.onpointerleave=off;b.onpointercancel=off});
  function finish(){
    done=true;btns.forEach(b=>b.classList.remove('on'));const tot=amt.reduce((a,b)=>a+b);
    const err=amt.reduce((a,v,i)=>a+Math.abs(v-T[i]),0),sc=Math.max(0,1-err/60)*Math.min(1,tot/100);
    pop($('m'),'Mischung '+Math.round(sc*100)+' % genau');sc>.7?SFX.win():SFX.miss();
    setTimeout(()=>ov.alive&&res(sc),900)}
  (function loop(now){
    if(!ov.alive||done)return;const dt=Math.min(.05,(now-last)/1000);last=now;
    const tot=amt.reduce((a,b)=>a+b);
    if(act>=0){amt[act]+=Math.min(22*dt,100-tot);if((tick+=dt)>.12){tick=0;tone(300+act*120+tot*3,.05,'sine',.03)}}
    amt.forEach((v,i)=>{layers[i].style.height=v+'%';$('pv'+i).textContent=Math.round(v)+' / '+Math.round(T[i])});
    const el=(now-t0)/1000;$('tm').style.width=Math.max(0,100-el/D*100)+'%';
    if(amt.reduce((a,b)=>a+b)>=99.9||el>=D){finish();return}
    requestAnimationFrame(loop)})(performance.now());
})}
