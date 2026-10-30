/* Minispiel: Sortierband – Steine vom laufenden Förderband tippen, gute Ware fällt in die Kiste */
import {G} from '../data.js';
import {SFX,tone,vib} from '../fx.js';
import {diff} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,ic,pop} from '../util.js';
import {IB,at,put,sparks} from './scene.js';
import {gnow} from './clock.js';

export function gSort(s){return new Promise(res=>{
  const D=15;
  const ov=openOv(xbtn()+`<h3>Sortierband · ${G[s.out].n}</h3><div class="sub">Tippe Fremdkörper (graue Steine) vom Band, bevor sie in der Kiste landen. ${G[s.out].n} lässt du durch!</div><div class="msg" id="m">Band läuft …</div>
    <div class="stage factory" id="st" style="height:230px"></div><div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth;
  const cv=put(st,'conveyor',W*.86,null,W*.42,128);
  const [bl,bt]=at(cv,'conveyor','l'),[br]=at(cv,'conveyor','r');
  const band=document.createElement('div');band.className='beltband';band.style.cssText=`left:${bl}px;width:${br-bl}px;top:${bt-3}px`;st.appendChild(band);
  const cr=put(st,'crate',92,'mouth',Math.min(W-40,br+34),bt+44);cr.style.zIndex=5;
  const IS=46;
  let items=[],good=0,got=0,badIn=0,wrong=0,spawnT=.3,fin=false,last=gnow();const t0=gnow();
  function spawn(el){
    const bad=Math.random()<.4,k=bad?'junk':s.out,e=document.createElement('div');e.className='bitem';e.innerHTML=ic(k,IS);
    const o={e,bad,p:-.06,v:(19+el*1.2)*diff()/96,top:bt-IS*IB[k][1]+2};if(!bad)good++;
    e.style.top=o.top+'px';
    e.onpointerdown=ev=>{ev.preventDefault();if(fin||o.dead)return;o.dead=1;const x=bl+o.p*(br-bl);
      e.animate([{transform:'translate(0,0) rotate(0)'},{transform:`translate(${(Math.random()-.5)*60}px,-160px) rotate(${(Math.random()-.5)*400}deg)`,opacity:0}],{duration:450,easing:'ease-out'}).onfinish=()=>e.remove();
      if(bad){SFX.good();vib(8);sparks(st,x+IS/2,o.top+IS/2,6,'#9ca3af')}
      else{wrong++;SFX.miss();sparks(st,x+IS/2,o.top+IS/2,8,'#fb7185');pop($('m'),'Das war gute Ware!')}};
    st.appendChild(e);items.push(o)}
  function drop(o){
    o.dead=1;const e=o.e;const [mx,my]=at(cr,'crate','mouth');
    e.animate([{transform:'translate(0,0)'},{transform:`translate(${mx-(br-IS/2)}px,${my-o.top-IS*.4}px) scale(.8)`,opacity:.9}],{duration:260,easing:'ease-in'}).onfinish=()=>e.remove();
    if(o.bad){badIn++;SFX.err();pop($('m'),'Stein in der Kiste!');cr.animate([{transform:'rotate(0)'},{transform:'rotate(-4deg)'},{transform:'rotate(0)'}],{duration:200})}
    else{got++;tone(700,.04,'triangle',.03)}}
  (function loop(){const now=gnow();
    if(!ov.alive||fin)return;const dt=Math.min(.05,(now-last)/1000);last=now;const el=(now-t0)/1000;
    spawnT-=dt;if(spawnT<=0&&el<D-1.5){spawnT=Math.max(.5,.95-el*.03);spawn(el)}
    items.forEach(o=>{if(o.dead)return;o.p+=o.v*dt;o.e.style.left=(bl+o.p*(br-bl)-IS/2)+'px';if(o.p>=1)drop(o)});
    items=items.filter(o=>!o.dead);
    $('tm').style.width=Math.max(0,100-el/D*100)+'%';
    if(el>=D&&!items.length||el>=D+3){fin=true;const sc=Math.max(0,Math.min(1,(got-2*badIn-2*wrong)/Math.max(1,good*.8)));pop($('m'),got+' sauber · '+badIn+' Steine');setTimeout(()=>ov.alive&&res(sc),700);return}
    requestAnimationFrame(loop)})();
})}
