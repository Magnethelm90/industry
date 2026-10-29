/* Minispiel: Presse (schnell tippen) */
import {SFX,burst,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';

export function gMash(s){return new Promise(res=>{
  const ov=openOv(xbtn()+`<h3>${s?s.n:'Presse'}</h3><div class="sub">Tippe so schnell du kannst. 6 Sekunden ab dem ersten Schlag.</div><div class="msg" id="m">Tippe zum Start!</div><div class="meter" style="height:16px;margin:6px 0 16px"><i id="f" style="width:0;background:var(--g2)"></i></div><button class="tapbtn" id="t">PRESSEN!</button><div class="timer" style="margin-top:14px"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  let taps=0,started=false;const target=36;
  $('t').onpointerdown=e=>{
    if(!ov.alive||$('t').disabled)return;taps++;SFX.tick();vib(8);burst(e.clientX||innerWidth/2,e.clientY||innerHeight/2,'#fbbf24',4);
    $('f').style.width=Math.min(100,taps/target*100)+'%';$('m').textContent=taps+' Schläge';
    if(!started){started=true;const t0=performance.now();
      const iv=setInterval(()=>{if(!ov.alive){clearInterval(iv);return}const l=Math.max(0,1-(performance.now()-t0)/6000);$('tm').style.width=(l*100)+'%';
        if(l<=0){clearInterval(iv);$('t').disabled=true;pop($('m'),taps>=target?'MAXIMAL! 💥':taps+' Schläge');setTimeout(()=>ov.alive&&res(Math.min(1,taps/target)),600)}},50)}};
})}
