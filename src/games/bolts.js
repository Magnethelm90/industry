/* Minispiel: Schrauben */
import {G} from '../data.js';
import {SFX,burst,vib} from '../fx.js';
import {bindX,openOv,shakeBox,xbtn} from '../ui.js';
import {$,center,pop} from '../util.js';

export function gBolts(s,title){return new Promise(res=>{
  const ROUNDS=[5,7],T=10,total=12;
  const ov=openOv(xbtn()+`<h3>${title||'Schrauben · '+G[s.out].n}</h3><div class="sub">Zieh die Schrauben in der richtigen Reihenfolge fest: 1, 2, 3 … Falsche Schraube kostet Zeit.</div><div class="msg" id="m"></div><div class="board" id="bd"></div><div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  let r=0,need=0,correct=0,t0=0,dead=false;
  function layout(n){
    const bd=$('bd');bd.innerHTML='';const pts=[];let guard=0;
    while(pts.length<n&&guard++<2000){const x=10+Math.random()*80,y=10+Math.random()*80;if(pts.every(p=>Math.hypot(p.x-x,p.y-y)>18))pts.push({x,y})}
    pts.forEach((p,i)=>{const b=document.createElement('button');b.className='bolt';b.style.left=p.x+'%';b.style.top=p.y+'%';b.textContent=i+1;b.onpointerdown=()=>tap(b,i);bd.appendChild(b)});
    need=0;t0=performance.now();pop($('m'),'Runde '+(r+1)+' / '+ROUNDS.length)}
  function end(){dead=true;setTimeout(()=>ov.alive&&res(correct/total),600)}
  function tap(b,i){
    if(dead||!ov.alive||b.classList.contains('ok'))return;
    if(i===need){need++;correct++;b.classList.add('ok');SFX.tick();vib(8);const [x,y]=center(b);burst(x,y,'#34d399',6);
      if(need>=ROUNDS[r]){SFX.good();r++;if(r>=ROUNDS.length){pop($('m'),'Alles fest! 🔩');end()}else setTimeout(()=>ov.alive&&!dead&&layout(ROUNDS[r]),350)}}
    else{SFX.miss();vib([40,30,40]);shakeBox();t0-=1500;pop($('m'),'Falsche Schraube! −1,5 s')}}
  layout(ROUNDS[0]);
  (function loop(){if(!ov.alive||dead)return;const l=1-(performance.now()-t0)/(T*1000);$('tm').style.width=Math.max(0,l*100)+'%';
    if(l<=0){pop($('m'),'Zeit um!');end();return}requestAnimationFrame(loop)})();
})}
