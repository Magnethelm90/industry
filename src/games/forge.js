/* Minispiel: Schmieden – nach unten wischen, wenn der Ring genau auf dem glühenden Werkstück liegt */
import {G} from '../data.js';
import {SFX,vib} from '../fx.js';
import {diff} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {A,at,put,shakeStage,sparks} from './scene.js';

export function gForge(s){return new Promise(res=>{
  const N=8;
  const ov=openOv(xbtn()+`<h3>Schmieden · ${G[s.out].n}</h3><div class="sub">Wisch nach unten, um mit dem Hammer zuzuschlagen – genau dann, wenn der weiße Ring auf dem glühenden Werkstück liegt. Der Takt wird schneller!</div><div class="dots" id="dots">${'<i></i>'.repeat(N)}</div><div class="msg" id="m">Bereit …</div>
    <div class="stage forge" id="st" style="height:260px"><div class="fring" id="frg"></div><div class="hint top">↓ Nach unten wischen ↓</div></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth;
  const an=put(st,'anvil',240,null,W*.42,178);
  const [fx_,fy]=at(an,'anvil','face'),[fl]=at(an,'anvil','face_l');
  const WW=Math.min(84,(fx_-fl)*1.1),WH=22,wcx=fx_-8,wcy=fy-WH/2;
  const wk=document.createElement('div');wk.className='wpiece';
  wk.style.cssText=`left:${wcx-WW/2}px;top:${fy-WH}px;width:${WW}px;height:${WH}px;transform-origin:50% 100%`;st.appendChild(wk);
  const rg=$('frg');rg.style.left=(wcx-46)+'px';rg.style.top=(wcy-46)+'px';
  // Hammer gespiegelt, dreht um den Griff; ungedreht liegt die Schlagfläche auf dem Werkstück
  const T=140,[px,py]=A.hammer.pivot,[tx,ty]=A.hammer.face,Px=wcx+(tx-px)*T,Py=fy-WH-(ty-py)*T;
  const hm=document.createElement('div');hm.className='prop p-hammer';
  hm.style.cssText=`width:${T}px;height:${T}px;left:${Px-px*T}px;top:${Py-py*T}px;transform-origin:${px*T}px ${py*T}px;z-index:5`;
  const REST='rotate(30deg) scaleX(-1)',HIT='rotate(0deg) scaleX(-1)';hm.style.transform=REST;st.appendChild(hm);
  let beat=0,t=-.6,dur=1.25/diff(),score=0,done=false,last=performance.now(),flat=0;
  const r=()=>2.6-2.2*Math.max(0,t)/dur;
  function next(v,txt){
    $('dots').children[beat].className=v>=1?'p':v>0?'g':'m';pop($('m'),txt);score+=v;beat++;t=-.25;dur*=.93;
    flat+=v*.06;wk.style.transform=`scaleY(${1-flat}) scaleX(${1+flat*.8})`;
    wk.style.filter=`brightness(${1.15-.45*beat/N})`;
    if(beat>=N){done=true;setTimeout(()=>ov.alive&&res(score/N),700)}}
  function strike(){
    if(done||!ov.alive)return;
    hm.animate([{transform:REST},{transform:HIT,offset:.55},{transform:REST}],{duration:300,easing:'cubic-bezier(.6,0,.3,1)'});
    if(t<0)return;
    const d=Math.abs(r()-1);
    setTimeout(()=>{if(!ov.alive)return;SFX.clank();
      if(d<=.1){SFX.perfect();vib(30);shakeStage(st);sparks(st,wcx,wcy,22,'#fde047')}
      else if(d<=.24){SFX.good();vib(15);sparks(st,wcx,wcy,10,'#fb923c')}
      else{SFX.miss();sparks(st,wcx,wcy,5,'#94a3b8')}},150);
    if(d<=.1)next(1,'PERFEKT! 🔥');else if(d<=.24)next(.6,'Gut!');else next(0,'Daneben!');
  }
  // Wischgeste: Schlag, sobald der Finger 26 px nach unten gewandert ist
  let y0=null,struck=false;
  st.onpointerdown=e=>{e.preventDefault();y0=e.clientY;struck=false};
  st.onpointermove=e=>{if(y0!=null&&!struck&&e.clientY-y0>26){struck=true;strike()}};
  st.onpointerup=st.onpointercancel=e=>{if(y0!=null&&!struck&&Math.abs(e.clientY-y0)<10&&!done){pop($('m'),'Nach unten wischen! ↓')}y0=null};
  (function loop(now){
    if(!ov.alive||done)return;const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;
    const rr=r();rg.style.transform=`scale(${Math.max(.2,rr)})`;rg.style.opacity=t<0?0:1;
    if(t>=0&&rr<.55){SFX.miss();next(0,'Zu spät!')}
    requestAnimationFrame(loop)})(performance.now());
})}
