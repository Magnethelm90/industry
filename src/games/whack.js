/* Minispiel: Erzader – Brocken tauchen in Stollen auf, schnell antippen; Dynamit nicht berühren */
import {G} from '../data.js';
import {SFX,vib} from '../fx.js';
import {diff} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,ic,pop} from '../util.js';
import {at,chunks,fly,put,shakeStage,sparks} from './scene.js';

export function gWhack(s){return new Promise(res=>{
  const D=15;
  const ov=openOv(xbtn()+`<h3>Erzader · ${G[s.out].n}</h3><div class="sub">Tippe auf die Brocken, bevor sie wieder im Stollen verschwinden. Finger weg vom Dynamit!</div><div class="msg" id="m">Bereit?</div>
    <div class="stage mine" id="st"></div><div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth,CW=Math.min(112,(W-12)/3);
  st.style.height=(CW*3+8)+'px';
  const ox=(W-CW*3)/2;
  const holes=[];
  for(let i=0;i<9;i++){
    const cx=ox+CW*(i%3+.5),cy=4+CW*(Math.floor(i/3)+.5),hp=put(st,'hole',CW,null,cx,cy);
    const [l,b]=at(hp,'hole','op_l'),[r]=at(hp,'hole','op_r'),[,t]=at(hp,'hole','op_t');
    const win=document.createElement('div');win.className='hwin';win.style.cssText=`left:${l}px;top:${t}px;width:${r-l}px;height:${b-t}px`;st.appendChild(win);
    const h={win,cx,cy,k:'',tm:0};hp.style.pointerEvents='auto';hp.style.cursor='pointer';
    const tap=e=>{e.preventDefault();hit(h)};hp.onpointerdown=tap;win.onpointerdown=tap;holes.push(h)}
  let hits=0,ores=0,bombs=0,next=600;const t0=performance.now();
  const clear=h=>{clearTimeout(h.tm);h.k='';h.win.innerHTML=''};
  function swing(h){fly(st,h.cx+18,h.cy-20,'<div class="prop p-pickaxe" style="position:relative;width:64px;height:64px;transform:scaleX(-1)"></div>',{dx:-10,dy:10,rot:-70,dur:260})}
  function hit(h){
    if(!h.k||!ov.alive)return;swing(h);
    if(h.k==='ore'){hits++;SFX.thud();SFX.good();vib(10);chunks(st,h.cx,h.cy,s.out,3)}
    else{bombs++;SFX.crash();vib([60,30,60]);sparks(st,h.cx,h.cy,20,'#fb923c');shakeStage(st)}
    clear(h)}
  function spawn(el){
    const free=holes.filter(h=>!h.k);if(!free.length)return;
    const h=free[Math.floor(Math.random()*free.length)],bomb=Math.random()<0.18;
    h.k=bomb?'bomb':'ore';if(!bomb)ores++;
    const sz=Math.min(h.win.clientWidth*1.05,h.win.clientHeight*1.1);
    h.win.innerHTML=`<span class="rise2">${ic(bomb?'tnt':s.out,sz)}</span>`;
    h.tm=setTimeout(()=>{if(h.k)clear(h)},Math.max(600,(1300-el*40)/diff()));
  }
  (function loop(){
    if(!ov.alive)return;const el=(performance.now()-t0)/1000;
    $('tm').style.width=Math.max(0,100-el/D*100)+'%';
    if(el>=D){holes.forEach(clear);pop($('m'),hits+' Treffer'+(bombs?' · '+bombs+'× Dynamit':''));
      setTimeout(()=>ov.alive&&res(Math.max(0,Math.min(1,(hits-2*bombs)/Math.max(1,ores*0.8)))),700);return}
    if(el*1000>next){spawn(el);if(Math.random()<Math.min(.5,el/25))spawn(el);next=el*1000+Math.max(380,800-el*25)}
    $('m').textContent=hits+' Treffer'+(bombs?' · '+bombs+'× 💥':'');
    requestAnimationFrame(loop)})();
})}
