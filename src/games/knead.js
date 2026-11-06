/* Minispiel: Teig kneten – hin und her wischen, möglichst im gleichmäßigen Takt */
import {SFX,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {sparks} from './scene.js';
import {gnow} from './clock.js';
import {th} from './theme.js';

const NEED=12,DUR=11000,STROKE=70,MIN_DT=330,MAX_DT=950;
export function gKnead(s){return new Promise(res=>{
  const ov=openOv(xbtn()+`<h3>${th(s,'title','Teig kneten')}</h3><div class="sub">${th(s,'how','Wisch mit dem Finger hin und her über den Teig – nicht zu hastig und nicht zu lahm. Im gleichmäßigen Takt wird der Teig am besten. 11 Sekunden ab dem ersten Zug.')}</div><div class="msg" id="m">Wisch über den Teig!</div>
    <div class="stage kneadst" id="st" style="height:250px"><div class="hint top">Hin und her wischen</div><div class="dough" id="dg"></div><div class="beat" id="bt"></div></div>
    <div class="meter" style="height:10px;margin-top:8px"><i id="pr" style="width:0%"></i></div>
    <div class="timer" style="margin-top:6px"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),dg=$('dg');
  let sum=0,n=0,dir=0,x0=null,lastX=0,lastT=0,t0=0,done=false,down=false;
  st.__state=()=>({n,sum,done});
  const stroke=()=>{
    const now=gnow(),dt=lastT?now-lastT:500;lastT=now;n++;
    let v=1,t='Im Takt! 👌';
    if(dt<MIN_DT){v=.5;t='Zu hastig'}else if(dt>MAX_DT){v=.6;t='Zu lahm'}else SFX.good();
    if(v<1)SFX.tick();
    sum+=v;vib(10);pop($('m'),t);
    const p=Math.min(1,sum/NEED);
    dg.style.transform=`scale(${1+.18*(n%2?1:-.5)},${1-.14*(n%2?1:-.5)})`;
    dg.style.setProperty('--p',p);
    $('pr').style.width=p*100+'%';
    sparks(st,st.clientWidth/2+(Math.random()-.5)*100,st.clientHeight/2+30,3,'#fff8e1');
    const b=$('bt');b.classList.remove('on');void b.offsetWidth;b.classList.add('on');
  };
  const end=()=>{if(done)return;done=true;
    const v=Math.min(1,sum/NEED);pop($('m'),v>=1?'Perfekter Teig! 🥖':Math.round(v*100)+' % geknetet');if(v>=1)SFX.win();
    setTimeout(()=>ov.alive&&res(v),600)};
  const loop=()=>{if(!ov.alive||done)return;const l=Math.max(0,1-(gnow()-t0)/DUR);$('tm').style.width=l*100+'%';
    if(l<=0)return end();requestAnimationFrame(loop)};
  st.onpointerdown=e=>{e.preventDefault();if(done)return;down=true;x0=lastX=e.clientX;dir=0;try{st.setPointerCapture(e.pointerId)}catch(_){}};
  st.onpointermove=e=>{if(!down||done||!ov.alive)return;
    const dx=e.clientX-lastX;if(!dx)return;const d=Math.sign(dx);
    if(!dir)dir=d;
    if(d!==dir){ // Umkehr: der bisherige Zug zählt, wenn er lang genug war
      if(Math.abs(lastX-x0)>=STROKE){if(!t0){t0=gnow();loop()}stroke();x0=lastX}else x0=lastX;dir=d}
    lastX=e.clientX;
    // Teig folgt dem Finger ein Stück
    dg.style.translate=Math.max(-30,Math.min(30,(e.clientX-x0)*.25))+'px 0'};
  st.onpointerup=st.onpointercancel=()=>{down=false;if(!done&&Math.abs(lastX-x0)>=STROKE&&dir){if(!t0){t0=gnow();loop()}stroke()}x0=null;dg.style.translate='0 0'};
})}
