/* Minispiel: Erzader */
import {G} from '../data.js';
import {SFX,burst,vib} from '../fx.js';
import {diff} from '../state.js';
import {bindX,openOv,shakeBox,xbtn} from '../ui.js';
import {$,center,ic,pop} from '../util.js';

export function gWhack(s){return new Promise(res=>{
  const D=15;
  const ov=openOv(xbtn()+`<h3>Erzader · ${G[s.out].n}</h3><div class="sub">Tippe auf die Brocken, bevor sie verschwinden. Finger weg vom Dynamit!</div><div class="msg" id="m">Bereit?</div><div class="holes">${'<button class="hole"></button>'.repeat(9)}</div><div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const holes=[...document.querySelectorAll('.hole')];let hits=0,ores=0,bombs=0,next=600;const t0=performance.now();
  const clear=h=>{clearTimeout(h._t);h.dataset.k='';h.innerHTML=''};
  holes.forEach(h=>h.onpointerdown=()=>{
    const k=h.dataset.k;if(!k||!ov.alive)return;const [x,y]=center(h);
    if(k==='ore'){hits++;SFX.good();vib(10);burst(x,y,G[s.out].c,8)}
    else{bombs++;SFX.crash();vib([60,30,60]);burst(x,y,'#fb7185',14);shakeBox()}
    clear(h)});
  function spawn(el){
    const free=holes.filter(h=>!h.dataset.k);if(!free.length)return;
    const h=free[Math.floor(Math.random()*free.length)],bomb=Math.random()<0.18;
    h.dataset.k=bomb?'bomb':'ore';if(!bomb)ores++;
    h.innerHTML=`<span class="rise">${ic(bomb?'tnt':s.out,46)}</span>`;
    h._t=setTimeout(()=>{if(h.dataset.k)clear(h)},Math.max(600,(1300-el*40)/diff()));
  }
  (function loop(){
    if(!ov.alive)return;const el=(performance.now()-t0)/1000;
    $('tm').style.width=Math.max(0,100-el/D*100)+'%';
    if(el>=D){holes.forEach(clear);pop($('m'),hits+' Treffer'+(bombs?' · '+bombs+'× Dynamit':''));
      setTimeout(()=>ov.alive&&res(Math.max(0,Math.min(1,(hits-2*bombs)/Math.max(1,ores*0.8)))),700);return}
    if(el*1000>next){spawn(el);if(Math.random()<Math.min(.5,el/25))spawn(el);next=el*1000+Math.max(380,800-el*25)}
    $('m').textContent=hits+' Treffer'+(bombs?' · '+bombs+'× 💥':'');
    requestAnimationFrame(loop)})();
})}
