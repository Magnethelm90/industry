/* Minispiel: Presse – so schnell wie möglich tippen, der Kolben drückt das Werkstück platt */
import {SFX,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,ic,pop} from '../util.js';
import {A,IB,arcPath,at,gaugeAngle,put,sparks} from './scene.js';

export function gMash(s){return new Promise(res=>{
  const ov=openOv(xbtn()+`<h3>${s?s.n:'Presse'}</h3><div class="sub">Tippe so schnell du kannst – jeder Tipp ist ein Pressenhub. 6 Sekunden ab dem ersten Hub.</div><div class="msg" id="m">Tippe zum Start!</div>
    <svg class="gauge2" width="170" height="94" viewBox="0 0 200 112">
      <defs><linearGradient id="mg" x1="0" x2="1"><stop offset="0" stop-color="#34d399"/><stop offset=".6" stop-color="#fbbf24"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>
      <path d="${arcPath(100,104,86,-70,70)}" stroke="url(#mg)" stroke-width="14" fill="none" stroke-linecap="round" opacity=".9"/>
      <g id="gn"><line x1="100" y1="104" x2="100" y2="28" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g><circle cx="100" cy="104" r="9" fill="#e2e8f0"/>
    </svg>
    <div class="stage factory" id="st" style="height:250px"><div class="hint top">Schnell tippen!</div></div>
    <div class="timer" style="margin-top:6px"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth;
  // Kolben hinter dem Rahmen, damit er aus dem Querträger herausfährt
  const PW=150,pi=document.createElement('div');pi.className='prop p-piston';st.appendChild(pi);
  const pr=put(st,'press',248,null,W*.5,128);
  const [bx,bedY]=at(pr,'press','bed'),[,beamY]=at(pr,'press','beam');
  const rest=beamY+(bedY-beamY)*.42;
  pi.style.cssText=`width:${PW}px;height:${PW}px;left:${bx-PW/2}px;top:${rest-A.piston.bottom[1]*PW}px`;
  const key=s?s.out:'ziegel',[bt,bb]=IB[key],WP=74,wp=document.createElement('div');wp.innerHTML=ic(key,WP);
  wp.style.cssText=`position:absolute;left:${bx-WP/2}px;top:${bedY-WP*bb}px;width:${WP}px;height:${WP}px;transform-origin:50% ${bb*100}%;z-index:3;transition:transform .08s`;
  st.appendChild(wp);
  let taps=0,started=false,squash=1;const target=36;
  st.onpointerdown=e=>{
    e.preventDefault();if(!ov.alive||st.dataset.done)return;taps++;
    const p=Math.min(1,taps/target);squash=1-.45*p;
    const contact=bedY-WP*(bb-bt)*squash;
    pi.animate([{transform:'translateY(0)'},{transform:`translateY(${contact-rest}px)`,offset:.45},{transform:'translateY(0)'}],{duration:130,easing:'ease-in'});
    setTimeout(()=>{if(!ov.alive)return;wp.style.transform=`scaleY(${squash}) scaleX(${1+.35*p})`;sparks(st,bx+(Math.random()-.5)*WP,bedY-4,3,'#e2e8f0')},55);
    SFX.tick();vib(8);
    $('gn').setAttribute('transform',`rotate(${gaugeAngle(p)} 100 104)`);$('m').textContent=taps+' Hübe';
    if(!started){started=true;const t0=performance.now();
      const iv=setInterval(()=>{if(!ov.alive){clearInterval(iv);return}const l=Math.max(0,1-(performance.now()-t0)/6000);$('tm').style.width=(l*100)+'%';
        if(l<=0){clearInterval(iv);st.dataset.done=1;pop($('m'),taps>=target?'MAXIMALER DRUCK! 💥':taps+' Hübe');if(taps>=target)SFX.win();setTimeout(()=>ov.alive&&res(Math.min(1,taps/target)),600)}},50)}};
})}
