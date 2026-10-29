/* Minispiel: Angeln */
import {G} from '../data.js';
import {SFX,tone,vib} from '../fx.js';
import {S,diff,unl} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,ic,pop} from '../util.js';

export const FISH=[{g:'hering',w:60,n:4,str:.8},{g:'lachs',w:28,n:2,str:1},{g:'thunfisch',w:10,n:1,str:1.35},{g:'hummer',w:4,n:1,str:1.15,rod:2}];
export function gFish(){return new Promise(res=>{
  const TRIES=3,catchList={};
  const ov=openOv(xbtn()+`<h3>Angeln</h3><div class="sub">Warte, bis der Schwimmer abtaucht, und tippe sofort. Dann einholen: Halten zum Kurbeln – aber wenn die Spannung zu hoch wird, reißt die Schnur!</div><div class="dots" id="dots">${'<i></i>'.repeat(TRIES)}</div><div class="msg" id="m">Auswerfen …</div>
   <div class="sea"><div class="wave"></div><div class="bob" id="bob"></div><div class="fishic" id="fi"></div></div>
   <div id="reel" style="display:none"><div class="sub" style="margin:8px 0 0">Spannung</div><div class="track tens"><div class="zone" style="left:30%;width:45%"></div><div class="mark" id="tk"></div></div><div class="sub" style="margin:0">Fortschritt</div><div class="meter" style="height:12px;margin-top:4px"><i id="pg" style="width:30%;background:var(--g1);transition:none"></i></div></div>
   <button class="btn big b" id="act" style="margin-top:12px;height:84px">Warten …</button>`);
  bindX();ov.abort=()=>res(null);
  let tryN=0,phase='wait',until=0,hold=false,T=0,P=30,fish=null,tug=0,last=performance.now();
  const act=$('act'),bob=$('bob');
  const startWait=(extra=0)=>{phase='wait';until=performance.now()+1500+Math.random()*3000+extra;bob.className='bob';act.textContent='Warten …';$('reel').style.display='none';$('fi').innerHTML=''};
  function result(ok,txt){
    $('dots').children[tryN].className=ok?'g':'m';pop($('m'),txt);tryN++;hold=false;phase='done';
    if(ok){catchList[fish.g]=(catchList[fish.g]||0)+fish.n;SFX.win();vib([30,40,60])}else SFX.miss();
    setTimeout(()=>{if(!ov.alive)return;if(tryN>=TRIES){res(catchList);return}pop($('m'),'Neuer Wurf …');startWait()},1100)}
  function pickFish(){const pool=FISH.filter(f=>unl(f.g)),w=pool.map(f=>f.w*(f.g==='hering'?1:1+.35*S.up.rod)+(f.rod?f.rod*S.up.rod:0));let r=Math.random()*w.reduce((a,b)=>a+b);
    for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0)return pool[i]}return pool[0]}
  act.onpointerdown=e=>{e.preventDefault();
    if(phase==='wait'){pop($('m'),'Zu früh – Fisch verscheucht!');SFX.err();startWait(1000)}
    else if(phase==='bite'){fish=pickFish();phase='reel';T=35;P=30;tug=.8;bob.className='bob gone';$('reel').style.display='block';$('fi').innerHTML=ic(fish.g,54);
      act.textContent='🎣 KURBELN (halten)';pop($('m'),'Angebissen! Einholen!');SFX.good();vib(20);hold=true}
    else if(phase==='reel')hold=true};
  const off=()=>hold=false;act.onpointerup=off;act.onpointerleave=off;act.onpointercancel=off;
  startWait();
  (function loop(now){
    if(!ov.alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;
    if(phase==='wait'&&now>until){phase='bite';until=now+850/diff();bob.className='bob dip';pop($('m'),'BISS! JETZT!');tone(880,.12,'square',.06);vib(40);act.textContent='❗ ANSCHLAGEN'}
    else if(phase==='bite'&&now>until){result(false,'Zu langsam – weg ist er!')}
    else if(phase==='reel'){
      T+=(hold?55*fish.str:-42)*dt;tug-=dt;if(tug<=0){tug=.6+Math.random()*.8;T+=(8+Math.random()*16)*fish.str}
      T=Math.max(0,T);if(hold&&T<85)P+=36*dt/Math.sqrt(fish.str)*(T>=30&&T<=75?1:.45);if(!hold)P-=7*dt;
      $('tk').style.left=Math.min(100,T)+'%';$('pg').style.width=Math.max(0,Math.min(100,P))+'%';$('fi').style.left=(15+Math.min(70,P*.7))+'%';
      if(T>=100)result(false,'Schnur gerissen! 💥');else if(P>=100)result(true,'Gefangen: '+fish.n+'× '+G[fish.g].n+'!');else if(P<=0)result(false,'Entwischt!')}
    requestAnimationFrame(loop)})(performance.now());
})}
