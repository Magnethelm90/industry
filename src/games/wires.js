/* Minispiel: Kabel – im Schaltkasten Kabel von links zur gleichfarbigen Klemme rechts ziehen (oder links und rechts antippen) */
import {G} from '../data.js';
import {SFX,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {at,put,shakeStage,sparks} from './scene.js';

export function gWires(s){return new Promise(res=>{
  const COL=['#ef4444','#3b82f6','#facc15','#22c55e','#e879f9'],N=5,T=14;
  // Jede Farbe hat zusätzlich ein Zeichen – so geht es auch bei Rot-Grün-Schwäche
  const SYM=['<circle cx="8" cy="8" r="5.5"/>','<path d="M8 2l6.5 11.5h-13z"/>','<rect x="2.5" y="2.5" width="11" height="11" rx="1"/>','<path d="M8 1l7 7-7 7-7-7z"/>','<path d="M8 1l2.1 4.6 5 .5-3.8 3.3 1.1 4.9L8 11.8l-4.4 2.5 1.1-4.9L.9 6.1l5-.5z"/>'];
  const right=[...Array(N).keys()].sort(()=>Math.random()-.5);
  const ov=openOv(xbtn()+`<h3>Kabel · ${G[s.out].n}</h3><div class="sub">Zieh ein Kabel von links zur Klemme mit derselben Farbe und demselben Zeichen rechts (oder tippe links und dann rechts). Falsche Verbindung = Kurzschluss!</div><div class="msg" id="m">Verkabeln …</div>
    <div class="stage factory" id="st" style="height:300px"><svg id="cab" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4"></svg></div>
    <div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth,JB=Math.min(W*.97,300);
  const jb=put(st,'jbox',JB,null,W/2,150);
  const [lx]=at(jb,'jbox','l'),[rx]=at(jb,'jbox','r'),[,ty]=at(jb,'jbox','top'),[,by]=at(jb,'jbox','bot');
  const Y=i=>ty+18+(by-ty-36)*i/(N-1);
  const term=(x,y,c)=>{const e=document.createElement('div');e.className='term';e.style.cssText=`left:${x}px;top:${y}px;--tc:${COL[c]}`;e.innerHTML=`<svg viewBox="0 0 16 16">${SYM[c]}</svg>`;st.appendChild(e);return e};
  const L=[...Array(N).keys()].map(i=>term(lx,Y(i),i)),Rn=right.map((c,j)=>{const e=term(rx,Y(j),c);e.dataset.c=c;return e});
  const cab=$('cab');
  const path=(x1,y1,x2,y2,c,tmp)=>{const d=`M${x1} ${y1} C${(x1+x2)/2} ${y1},${(x1+x2)/2} ${y2},${x2} ${y2}`;
    return `<g${tmp?' id="tmpc"':''}><path d="${d}" stroke="#0009" stroke-width="10" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${COL[c]}" stroke-width="6.5" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#ffffff66" stroke-width="2" fill="none" stroke-linecap="round" transform="translate(0,-1.5)"/></g>`};
  let sel=null,drag=null,done=new Set(),mist=0,fin=false;const t0=performance.now();
  const local=e=>{const r=st.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
  function end(){fin=true;const sc=done.size/N*Math.max(0,1-mist*.18);setTimeout(()=>ov.alive&&res(sc),700)}
  function attempt(i,j){
    const c=+Rn[j].dataset.c;
    if(c===i){done.add(i);cab.insertAdjacentHTML('beforeend',path(lx+10,Y(i),rx-10,Y(j),c));
      L[i].classList.add('ok');Rn[j].classList.add('ok');SFX.good();vib(10);sparks(st,rx-10,Y(j),6,COL[c]);
      if(done.size>=N){pop($('m'),'Alles verbunden ⚡');SFX.win();end()}}
    else{mist++;SFX.zap();vib([50,30,50]);sparks(st,rx-10,Y(j),16,'#fde047');shakeStage(st);pop($('m'),'Kurzschluss! ⚡')}
    L.forEach(x=>x.classList.remove('sel'));sel=null}
  const hitRight=([x,y])=>Rn.findIndex((e,j)=>Math.hypot(x-rx,y-Y(j))<30&&!e.classList.contains('ok'));
  L.forEach((e,i)=>{e.onpointerdown=ev=>{
    ev.preventDefault();if(fin||done.has(i))return;
    drag={i,start:local(ev),moved:false};try{st.setPointerCapture(ev.pointerId)}catch(_){}
    L.forEach(x=>x.classList.remove('sel'));e.classList.add('sel');SFX.tick()}});
  Rn.forEach((e,j)=>{e.onpointerdown=ev=>{ev.preventDefault();if(fin||sel==null||e.classList.contains('ok'))return;attempt(sel,j)}});
  st.onpointermove=ev=>{if(!drag)return;const [x,y]=local(ev);
    if(Math.hypot(x-drag.start[0],y-drag.start[1])>10)drag.moved=true;
    const t=$('tmpc');if(t)t.remove();if(drag.moved)cab.insertAdjacentHTML('beforeend',path(lx+10,Y(drag.i),x,y,drag.i,true))};
  st.onpointerup=st.onpointercancel=ev=>{if(!drag)return;const t=$('tmpc');if(t)t.remove();const d=drag;drag=null;
    if(!d.moved){sel=d.i;return}
    const j=hitRight(local(ev));if(j>=0)attempt(d.i,j);else{L[d.i].classList.remove('sel');sel=null}};
  (function loop(){if(!ov.alive||fin)return;const el=(performance.now()-t0)/1000;$('tm').style.width=Math.max(0,100-el/T*100)+'%';
    if(el>=T){pop($('m'),'Zeit um!');SFX.miss();end();return}requestAnimationFrame(loop)})();
})}
