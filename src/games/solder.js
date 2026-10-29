/* Minispiel: Löten */
import {G} from '../data.js';
import {SFX,burst,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,center,pop} from '../util.js';

export function gSolder(s){return new Promise(res=>{
  const N=6;
  const ov=openOv(xbtn()+`<h3>Löten · ${G[s.out].n}</h3><div class="sub">Halte den leuchtenden Lötpunkt gedrückt und lass los, wenn der Ring grün ist. Zu lange = verbrannt.</div><div class="msg" id="m">Lötkolben bereit</div><div class="pcb" id="bd"></div>`);
  bindX();ov.abort=()=>res(null);
  const pts=[];let guard=0;
  while(pts.length<N&&guard++<2000){const x=14+Math.random()*72,y=14+Math.random()*72;if(pts.every(p=>Math.hypot(p.x-x,p.y-y)>22))pts.push({x,y})}
  const pads=pts.map(p=>{const b=document.createElement('button');b.className='spad wait';b.style.left=p.x+'%';b.style.top=p.y+'%';$('bd').appendChild(b);return b});
  let idx=0,holding=false,p=0,score=0,last=performance.now(),done=false;
  const activate=()=>{pads.forEach((b,i)=>b.classList.toggle('wait',i>idx&&!b.classList.contains('ok')&&!b.classList.contains('bad')));if(pads[idx]){pads[idx].classList.remove('wait');pads[idx].classList.add('act')}};
  function release(){
    if(!holding)return;holding=false;const b=pads[idx];b.classList.remove('act');
    let v=0,t='Kalte Lötstelle ❄️';
    if(p>=75&&p<=105){v=1;t='Perfekt! ✨';SFX.perfect();vib(20)}else if((p>=55&&p<75)||(p>105&&p<=120)){v=.6;t='Geht so';SFX.good()}else SFX.miss();
    b.classList.add(v>0?'ok':'bad');b.style.setProperty('--p',0);score+=v;pop($('m'),t);
    const [x,y]=center(b);burst(x,y,v>0?'#e5e7eb':'#6b7280',v===1?12:5);next()}
  function next(){p=0;idx++;if(idx>=N){done=true;setTimeout(()=>ov.alive&&res(score/N),700);return}activate()}
  pads.forEach((b,i)=>b.onpointerdown=e=>{e.preventDefault();if(i!==idx||done)return;holding=true;p=0});
  const up=()=>release();addEventListener('pointerup',up);addEventListener('pointercancel',up);
  activate();
  (function loop(now){
    if(!ov.alive){removeEventListener('pointerup',up);removeEventListener('pointercancel',up);return}
    const dt=Math.min(.05,(now-last)/1000);last=now;
    if(holding){p+=dt/0.9*100;const b=pads[idx];b.style.setProperty('--p',Math.min(100,p));b.style.setProperty('--rc',p<75?'#fbbf24':p<=105?'#34d399':'#fb7185');
      if(p>=75&&p<=105)$('m').textContent='Jetzt loslassen!';
      if(p>135){holding=false;b.classList.remove('act');b.classList.add('bad');b.style.setProperty('--p',0);SFX.crash();vib([60,30,60]);pop($('m'),'Verbrannt! 🔥');next()}}
    if(done){removeEventListener('pointerup',up);removeEventListener('pointercancel',up);return}
    requestAnimationFrame(loop)})(performance.now());
})}
