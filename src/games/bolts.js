/* Minispiel: Schrauben – Sechskantschrauben auf der Stahlplatte in der richtigen Reihenfolge festziehen */
import {G} from '../data.js';
import {SFX,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {A,at,put,shakeStage,sparks} from './scene.js';

export function gBolts(s,title){return new Promise(res=>{
  const ROUNDS=[5,7],T=10,total=12;
  const ov=openOv(xbtn()+`<h3>${title||'Schrauben · '+G[s.out].n}</h3><div class="sub">Tippe die Schrauben in der richtigen Reihenfolge an: 1, 2, 3 … Der Schlüssel zieht sie fest. Falsche Schraube kostet Zeit.</div><div class="msg" id="m"></div>
    <div class="stage factory" id="st" style="height:270px"></div><div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth,PS=Math.min(W*.98,310);
  const pl=put(st,'plate',PS,null,W/2,138);
  const [x0,y0]=at(pl,'plate','tl'),[x1,y1]=at(pl,'plate','br');
  const WR=118,[hx,hy]=A.wrench.head,wr=document.createElement('div');wr.className='prop p-wrench';
  wr.style.cssText=`width:${WR}px;height:${WR}px;left:${W-WR*.6}px;top:${-WR*.3}px;transform-origin:${hx*WR}px ${hy*WR}px;transition:left .16s ease-out,top .16s ease-out;z-index:6`;
  st.appendChild(wr);
  let r=0,need=0,correct=0,t0=0,dead=false,bolts=[];
  function layout(n){
    bolts.forEach(b=>b.remove());bolts=[];const pts=[];let guard=0;
    while(pts.length<n&&guard++<3000){const x=.12+Math.random()*.76,y=.16+Math.random()*.68;if(pts.every(p=>Math.hypot((p.x-x)*(x1-x0),(p.y-y)*(y1-y0))>54))pts.push({x,y})}
    pts.forEach((p,i)=>{
      const cx=x0+p.x*(x1-x0),cy=y0+p.y*(y1-y0),b=put(st,'bolt',52,'c',cx,cy,'boltp');
      b.style.pointerEvents='auto';b.innerHTML=`<span class="bnum">${i+1}</span>`;b._c=[cx,cy];
      b.onpointerdown=e=>{e.preventDefault();tap(b,i)};bolts.push(b)});
    need=0;t0=performance.now();pop($('m'),'Runde '+(r+1)+' / '+ROUNDS.length)}
  function end(){dead=true;setTimeout(()=>ov.alive&&res(correct/total),600)}
  function tap(b,i){
    if(dead||!ov.alive||b.classList.contains('ok'))return;
    const [cx,cy]=b._c;
    if(i===need){need++;correct++;
      wr.style.left=(cx-hx*WR)+'px';wr.style.top=(cy-hy*WR)+'px';
      setTimeout(()=>{if(!ov.alive)return;wr.animate([{transform:'rotate(-35deg)'},{transform:'rotate(40deg)'}],{duration:220,easing:'ease-in-out'});
        b.classList.add('ok');SFX.ratchet();vib(8);sparks(st,cx,cy,5,'#e2e8f0')},150);
      if(need>=ROUNDS[r]){SFX.good();r++;if(r>=ROUNDS.length){pop($('m'),'Alles fest! 🔩');end()}else setTimeout(()=>ov.alive&&!dead&&layout(ROUNDS[r]),550)}}
    else{SFX.miss();vib([40,30,40]);shakeStage(st);b.animate([{transform:'rotate(0)'},{transform:'rotate(12deg)'},{transform:'rotate(-12deg)'},{transform:'rotate(0)'}],{duration:220});
      t0-=1500;pop($('m'),'Falsche Schraube! −1,5 s')}}
  layout(ROUNDS[0]);
  (function loop(){if(!ov.alive||dead)return;const l=1-(performance.now()-t0)/(T*1000);$('tm').style.width=Math.max(0,l*100)+'%';
    if(l<=0){pop($('m'),'Zeit um!');end();return}requestAnimationFrame(loop)})();
})}
