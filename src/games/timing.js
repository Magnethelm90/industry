/* Minispiel: Timing – Nadel im grünen Bereich stoppen, Spitzhacke (Rohstoffe) bzw. Hammer schlägt zu */
import {SFX,vib} from '../fx.js';
import {diff} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop,sleep} from '../util.js';
import {A,arcPath,at,chunks,gaugeAngle,put,shakeStage,sparks} from './scene.js';

const SVG_NS='http://www.w3.org/2000/svg';

export function gTiming(rounds=6,title='Abbau',sub='Tippe auf die Szene, wenn die Nadel im grünen Bereich steht. Gold zählt perfekt.',moving=false,s=null){return new Promise(res=>{
  const mining=!!s&&!Object.keys(s.in||{}).length;
  const ov=openOv(xbtn()+`<h3>${title}</h3><div class="sub">${sub}</div><div class="dots" id="dots">${'<i></i>'.repeat(rounds)}</div><div class="msg" id="m">Los!</div>
    <svg class="gauge2" width="190" height="104" viewBox="0 0 200 112">
        <path d="${arcPath(100,104,86,-70,70)}" stroke="#ffffff22" stroke-width="16" fill="none" stroke-linecap="round"/>
        <path id="gz" stroke="#34d399" stroke-width="16" fill="none"/>
        <path id="gp" stroke="#fbbf24" stroke-width="16" fill="none"/>
        <g id="gn"><line x1="100" y1="104" x2="100" y2="26" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g>
        <circle cx="100" cy="104" r="9" fill="#e2e8f0"/>
    </svg>
    <div class="stage ${mining?'mine':'factory'}" id="st" style="height:236px">
      <div class="hint">Tippen zum Schlagen</div>
    </div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth,tool=mining?'pickaxe':'hammer',head=mining?'tip':'face';
  const rk=put(st,'rock',200,'center',W*.4,158);
  const [hx,hy]=at(rk,'rock','hit');
  // Werkzeug gespiegelt (Kopf links), Spiegelung und Drehung um den Griffpunkt.
  // In Schlagstellung (ungedreht) liegt der Kopf genau auf dem Fels.
  const T=136,[px,py]=A[tool].pivot,[tx,ty]=A[tool][head],Px=hx+(tx-px)*T,Py=hy-(ty-py)*T;
  const tw=document.createElement('div');tw.className='prop p-'+tool;
  tw.style.cssText=`width:${T}px;height:${T}px;left:${Px-px*T}px;top:${Py-py*T}px;transform-origin:${px*T}px ${py*T}px;z-index:4`;
  st.appendChild(tw);
  const REST='rotate(28deg) scaleX(-1)',HIT='rotate(-2deg) scaleX(-1)';tw.style.transform=REST;
  let pos=0,dir=1,speed=0.9*diff(),zone=0.2,zc=0.5,round=0,pts=0,last=performance.now(),zd=1,busy=false;
  const drawZone=()=>{const a=gaugeAngle(zc-zone/2),b=gaugeAngle(zc+zone/2),c=gaugeAngle(zc-zone/4),d=gaugeAngle(zc+zone/4);
    $('gz').setAttribute('d',arcPath(100,104,86,a,b));$('gp').setAttribute('d',arcPath(100,104,86,c,d))};
  const newZone=()=>{zc=0.2+Math.random()*0.6;zd=Math.random()<.5?1:-1;drawZone()};newZone();
  function tick(t){if(!ov.alive)return;const dt=(t-last)/1000;last=t;pos+=dir*speed*dt;
    if(moving){zc+=zd*0.18*dt;const lo=zone/2+.02,hi=1-zone/2-.02;if(zc<lo||zc>hi){zd*=-1;zc=Math.max(lo,Math.min(hi,zc))}drawZone()}
    if(pos>1){pos=1;dir=-1}if(pos<0){pos=0;dir=1}
    $('gn').setAttribute('transform',`rotate(${gaugeAngle(pos)} 100 104)`);requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
  function crack(){
    const c=document.createElementNS(SVG_NS,'svg');c.setAttribute('class','crack');c.setAttribute('width','90');c.setAttribute('height','70');
    let x=45,y=6,d=`M${x} ${y}`;for(let i=0;i<5;i++){x+=(Math.random()-.5)*26;y+=12;d+=` L${x.toFixed(0)} ${y}`}
    c.innerHTML=`<path d="${d}" stroke="#1b1b22" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    c.style.left=(hx-45+(Math.random()-.5)*60)+'px';c.style.top=(hy-4)+'px';st.appendChild(c);
  }
  st.onpointerdown=async e=>{
    e.preventDefault();if(!ov.alive||busy||round>=rounds)return;busy=true;
    const d=Math.abs(pos-zc);let p=0,t='Daneben!',cl='m';
    if(d<=zone*0.25){p=1;t='PERFEKT! 🔥';cl='p'}else if(d<=zone/2){p=0.6;t='Gut!';cl='g'}
    tw.animate([{transform:REST},{transform:HIT,offset:.4},{transform:REST}],{duration:360,easing:'cubic-bezier(.5,0,.3,1)'});
    pts+=p;$('dots').children[round].className=cl;round++;speed+=0.15;
    await sleep(140);
    if(p===1){SFX.perfect();vib(30);shakeStage(st);crack();if(s)chunks(st,hx,hy,s.out,7);sparks(st,hx,hy,10)}
    else if(p>0){SFX.good();vib(15);crack();if(s)chunks(st,hx,hy,s.out,3);sparks(st,hx,hy,5)}
    else{SFX.miss();vib([40,30,40]);sparks(st,hx,hy,8,'#cbd5e1');shakeStage(st)}
    pop($('m'),t);busy=false;
    if(round>=rounds){await sleep(650);if(ov.alive)res(pts/rounds);return}
    newZone()};
})}
