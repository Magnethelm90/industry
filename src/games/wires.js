/* Minispiel: Kabel verbinden */
import {G} from '../data.js';
import {SFX,burst,vib} from '../fx.js';
import {bindX,openOv,shakeBox,xbtn} from '../ui.js';
import {$,center,pop} from '../util.js';

export function gWires(s){return new Promise(res=>{
  const COL=['#ef4444','#3b82f6','#facc15','#22c55e','#e879f9'],N=5,T=14;
  const right=[...Array(N).keys()].sort(()=>Math.random()-.5);
  const ov=openOv(xbtn()+`<h3>Kabel · ${G[s.out].n}</h3><div class="sub">Tippe links ein Kabel an und dann rechts den Anschluss mit derselben Farbe. Falsche Verbindung = Kurzschluss!</div><div class="msg" id="m">Verkabeln …</div><div class="wires" id="wr"><svg viewBox="0 0 100 100" preserveAspectRatio="none" id="wsv"></svg></div><div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  let sel=null,done=new Set(),mist=0,fin=false;const t0=performance.now(),Y=i=>(i+.5)/N*100;
  const wr=$('wr');
  const node=(side,i,c)=>{const b=document.createElement('button');b.className='wn';b.style.cssText=`left:${side?88:12}%;top:${Y(i)}%;background:${COL[c]}`;wr.appendChild(b);return b};
  const L=[...Array(N).keys()].map(i=>node(0,i,i)),Rn=right.map((c,i)=>{const b=node(1,i,c);b.dataset.c=c;return b});
  function end(){fin=true;const sc=done.size/N*Math.max(0,1-mist*.18);setTimeout(()=>ov.alive&&res(sc),700)}
  L.forEach((b,i)=>b.onpointerdown=()=>{if(fin||done.has(i))return;sel=i;L.forEach(x=>x.classList.remove('sel'));b.classList.add('sel');SFX.tick()});
  Rn.forEach((b,j)=>b.onpointerdown=()=>{
    if(fin||sel==null)return;const c=+b.dataset.c;
    if(c===sel){done.add(sel);$('wsv').insertAdjacentHTML('beforeend',`<path d="M12 ${Y(sel)} C50 ${Y(sel)},50 ${Y(j)},88 ${Y(j)}" stroke="${COL[c]}" stroke-width="3" fill="none" vector-effect="non-scaling-stroke" style="stroke-width:6px"/>`);
      L[sel].classList.remove('sel');L[sel].classList.add('ok');b.classList.add('ok');SFX.good();vib(10);sel=null;
      if(done.size>=N){pop($('m'),'Alles verbunden ⚡');SFX.win();end()}}
    else{mist++;SFX.crash();vib([50,30,50]);const [x,y]=center(b);burst(x,y,'#fde047',14);shakeBox();pop($('m'),'Kurzschluss! ⚡');L[sel].classList.remove('sel');sel=null}});
  (function loop(){if(!ov.alive||fin)return;const el=(performance.now()-t0)/1000;$('tm').style.width=Math.max(0,100-el/T*100)+'%';
    if(el>=T){pop($('m'),'Zeit um!');SFX.miss();end();return}requestAnimationFrame(loop)})();
})}
