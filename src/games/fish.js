/* Minispiel: Angeln – vom Steg auswerfen, beim Abtauchen anschlagen, dann einholen ohne die Schnur zu überspannen */
import {G} from '../data.js';
import {SFX,tone,vib} from '../fx.js';
import {S,diff,unl} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,ic,pop} from '../util.js';
import {A,put} from './scene.js';

export const FISH=[{g:'hering',w:60,n:4,str:.8},{g:'lachs',w:28,n:2,str:1},{g:'thunfisch',w:10,n:1,str:1.35},{g:'hummer',w:4,n:1,str:1.15,rod:2}];
export function gFish(){return new Promise(res=>{
  const TRIES=3,catchList={};
  const ov=openOv(xbtn()+`<h3>Angeln</h3><div class="sub">Warte, bis der Schwimmer abtaucht, und tippe sofort auf die Szene. Dann einholen: gedrückt halten zum Kurbeln – aber wenn die Spannung zu hoch wird, reißt die Schnur!</div><div class="dots" id="dots">${'<i></i>'.repeat(TRIES)}</div><div class="msg" id="m">Auswerfen …</div>
   <div class="stage lake" id="st" style="height:250px"><div class="waves"></div><svg id="ln" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4"></svg><div class="hint top" id="act">Warten …</div></div>
   <div id="reel" style="display:none"><div class="sub" style="margin:8px 0 0">Spannung</div><div class="track tens"><div class="zone" style="left:30%;width:45%"></div><div class="mark" id="tk"></div></div><div class="sub" style="margin:0">Fortschritt</div><div class="meter" style="height:12px;margin-top:4px"><i id="pg" style="width:30%;background:var(--g1);transition:none"></i></div></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth,WY=150;
  put(st,'pier',176,'end',W*.34,WY-6);
  const RS=230,[gx,gy]=A.rod.grip,[tx]=A.rod.tip,GX=W*.24,GY=WY-34,REST=-38;
  const rod=document.createElement('div');rod.className='prop p-rod';
  rod.style.cssText=`width:${RS}px;height:${RS}px;left:${GX-gx*RS}px;top:${GY-gy*RS}px;transform-origin:${gx*RS}px ${gy*RS}px;transform:rotate(${REST}deg);z-index:5`;st.appendChild(rod);
  const bob=put(st,'bobber',30,'top',W*.76,WY-22,'bobber');
  const fishEl=document.createElement('div');fishEl.className='fishsw';st.appendChild(fishEl);
  const tip=a=>{const r=a*Math.PI/180,L=(tx-gx)*RS;return [GX+L*Math.cos(r),GY+L*Math.sin(r)]};
  let tryN=0,phase='wait',until=0,hold=false,T=0,P=30,fish=null,tug=0,last=performance.now(),ang=REST;
  const act=$('act');
  st.__state=()=>({phase,T,P,tryN}); // für automatische Tests
  const startWait=(extra=0)=>{phase='wait';until=performance.now()+1500+Math.random()*3000+extra;bob.className='prop p-bobber bobber';bob.style.left=(W*.76-15)+'px';act.textContent='Warten …';$('reel').style.display='none';fishEl.innerHTML=''};
  function result(ok,txt){
    $('dots').children[tryN].className=ok?'g':'m';pop($('m'),txt);tryN++;hold=false;phase='done';
    if(ok){catchList[fish.g]=(catchList[fish.g]||0)+fish.n;SFX.win();vib([30,40,60]);fishEl.classList.add('caught')}else SFX.miss();
    setTimeout(()=>{if(!ov.alive)return;fishEl.classList.remove('caught');if(tryN>=TRIES){res(catchList);return}pop($('m'),'Neuer Wurf …');startWait()},1100)}
  function pickFish(){const pool=FISH.filter(f=>f.g==='hering'||unl(f.g)),w=pool.map(f=>f.w*(f.g==='hering'?1:1+.35*S.up.rod)+(f.rod?f.rod*S.up.rod:0));let r=Math.random()*w.reduce((a,b)=>a+b);
    for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0)return pool[i]}return pool[0]}
  st.onpointerdown=e=>{e.preventDefault();
    if(phase==='wait'){pop($('m'),'Zu früh – Fisch verscheucht!');SFX.err();startWait(1000)}
    else if(phase==='bite'){fish=pickFish();phase='reel';T=35;P=30;tug=.8;bob.className='prop p-bobber bobber gone';$('reel').style.display='block';fishEl.innerHTML=ic(fish.g,52);
      act.textContent='Gedrückt halten zum Kurbeln';pop($('m'),'Angebissen! Einholen!');SFX.good();vib(20);hold=true}
    else if(phase==='reel')hold=true};
  const off=()=>hold=false;st.onpointerup=off;st.onpointerleave=off;st.onpointercancel=off;
  startWait();
  (function loop(now){
    if(!ov.alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;
    if(phase==='wait'&&now>until){phase='bite';until=now+850/diff();bob.className='prop p-bobber bobber dip';pop($('m'),'BISS! JETZT!');tone(880,.12,'square',.06);vib(40);act.textContent='❗ JETZT TIPPEN'}
    else if(phase==='bite'&&now>until){result(false,'Zu langsam – weg ist er!')}
    else if(phase==='reel'){
      T+=(hold?55*fish.str:-42)*dt;tug-=dt;if(tug<=0){tug=.6+Math.random()*.8;T+=(8+Math.random()*16)*fish.str}
      T=Math.max(0,T);if(hold&&T<85)P+=36*dt/Math.sqrt(fish.str)*(T>=30&&T<=75?1:.45);if(!hold)P-=7*dt;
      $('tk').style.left=Math.min(100,T)+'%';$('pg').style.width=Math.max(0,Math.min(100,P))+'%';
      if(T>=100)result(false,'Schnur gerissen! 💥');else if(P>=100)result(true,'Gefangen: '+fish.n+'× '+G[fish.g].n+'!');else if(P<=0)result(false,'Entwischt!')}
    // Rute biegt sich mit der Spannung, Fisch wird zum Steg gezogen, Schnur zur Rutenspitze
    const want=REST+(phase==='reel'?Math.min(100,T)*.22:0)+(phase==='bite'?6:0);ang+=(want-ang)*Math.min(1,dt*10);rod.style.transform=`rotate(${ang}deg)`;
    const [sx,sy]=tip(ang);let ex,ey;
    if(phase==='reel'||(phase==='done'&&fish&&fishEl.innerHTML)){ex=W*.76-(W*.76-W*.36)*Math.max(0,Math.min(1,P/100));ey=WY+30+Math.sin(now/180)*4;fishEl.style.left=(ex-26)+'px';fishEl.style.top=(ey-26)+'px'}
    else{ex=bob.offsetLeft+15;ey=bob.offsetTop+2}
    const sag=phase==='reel'?Math.max(0,30-T*.4):30;
    $('ln').innerHTML=`<path d="M${sx} ${sy} Q${(sx+ex)/2} ${Math.max(sy,ey)+sag},${ex} ${ey}" stroke="#e2e8f0cc" stroke-width="1.4" fill="none"/>`;
    requestAnimationFrame(loop)})(performance.now());
})}
