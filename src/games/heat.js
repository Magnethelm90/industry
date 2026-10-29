/* Minispiel: Hitze halten */
import {SFX} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';

export function gHeat(moving=false,s){return new Promise(res=>{
  const ov=openOv(xbtn()+`<h3>${s?s.n:'Schmelzofen'}${moving?' · Wandernde Hitze':''}</h3><div class="sub">Halte den Knopf zum Heizen. Lass los zum Abkühlen. Bleib im Bereich!</div><div class="msg" id="m">Aufheizen …</div><div class="track heat" style="height:52px"><div class="zone" id="hz"></div><div class="mark" id="k"></div></div><div class="timer"><i id="tm" style="width:100%"></i></div><button class="btn big r" id="h" style="height:120px;margin-top:16px;font-size:22px">🔥 HEIZEN (halten)</button>`);
  bindX();ov.abort=()=>res(null);
  let temp=25,hold=false,inZ=0,tt=0,last=performance.now(),prev='';const D=12;
  const zw=20+Math.random()*10;let zl=moving?40:25+Math.random()*(55-zw),zd=Math.random()<.5?1:-1;
  $('hz').style.left=zl+'%';$('hz').style.width=zw+'%';
  const on=e=>{hold=true;e.preventDefault()},off=()=>hold=false;
  $('h').onpointerdown=on;$('h').onpointerup=off;$('h').onpointerleave=off;$('h').onpointercancel=off;
  function tick(t){if(!ov.alive)return;const dt=Math.min(0.05,(t-last)/1000);last=t;
    temp+=(hold?34:-20)*dt+(Math.random()-0.5)*14*dt;temp=Math.max(0,Math.min(100,temp));
    tt+=dt;
    if(moving){zl+=zd*9*dt;if(zl<10||zl>90-zw){zd*=-1;zl=Math.max(10,Math.min(90-zw,zl))}$('hz').style.left=zl+'%'}
    const z=temp>=zl&&temp<=zl+zw;if(z)inZ+=dt;
    $('k').style.left=temp+'%';$('tm').style.width=(100-tt/D*100)+'%';
    const s=temp>zl+zw?'Zu heiß! 🥵':temp<zl?'Zu kalt! 🥶':'Perfekt! 👍';if(s!==prev){pop($('m'),s);prev=s;if(z)SFX.good();else SFX.tick()}
    if(tt>=D){res(inZ/D);return}requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
})}
