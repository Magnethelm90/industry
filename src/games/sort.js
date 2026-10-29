/* Minispiel: Sortierband */
import {G} from '../data.js';
import {SFX,burst,tone,vib} from '../fx.js';
import {diff} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,center,ic,pop} from '../util.js';

export function gSort(s){return new Promise(res=>{
  const D=15;
  const ov=openOv(xbtn()+`<h3>Sortierband · ${G[s.out].n}</h3><div class="sub">Tippe Fremdkörper (graue Steine) vom Band, bevor sie im Behälter landen. ${G[s.out].n} lässt du durch!</div><div class="msg" id="m">Band läuft …</div><div class="belt" id="bt"><div class="bin">${ic(s.out,30)}</div></div><div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  let items=[],good=0,got=0,badIn=0,wrong=0,spawnT=.3,fin=false,last=performance.now();const t0=performance.now(),bt=$('bt');
  function spawn(el){const bad=Math.random()<.4,b=document.createElement('button');b.className='it';b.innerHTML=ic(bad?'junk':s.out,40);
    const o={b,bad,x:-12,y:15+Math.random()*55,v:(22+el*1.6)*diff()};if(!bad)good++;
    b.style.top=o.y+'%';b.onpointerdown=()=>{if(fin)return;const [x,y]=center(b);
      if(o.bad){SFX.good();vib(8);burst(x,y,'#9ca3af',8)}else{wrong++;SFX.miss();burst(x,y,'#fb7185',8);pop($('m'),'Das war gute Ware!')}
      o.dead=1;b.remove()};
    bt.appendChild(b);items.push(o)}
  (function loop(now){
    if(!ov.alive||fin)return;const dt=Math.min(.05,(now-last)/1000);last=now;const el=(now-t0)/1000;
    spawnT-=dt;if(spawnT<=0&&el<D-1.5){spawnT=Math.max(.38,.85-el*.03);spawn(el)}
    items.forEach(o=>{if(o.dead)return;o.x+=o.v*dt;o.b.style.left=o.x+'%';
      if(o.x>=84){o.dead=1;o.b.remove();if(o.bad){badIn++;SFX.err();pop($('m'),'Stein im Behälter!')}else{got++;tone(700,.04,'triangle',.03)}}});
    items=items.filter(o=>!o.dead);
    $('tm').style.width=Math.max(0,100-el/D*100)+'%';
    if(el>=D&&!items.length||el>=D+3){fin=true;const sc=Math.max(0,Math.min(1,(got-2*badIn-2*wrong)/Math.max(1,good*.9)));pop($('m'),got+' sauber · '+badIn+' Steine');setTimeout(()=>ov.alive&&res(sc),700);return}
    requestAnimationFrame(loop)})(performance.now());
})}
