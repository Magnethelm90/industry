/* Minispiel: Schmieden */
import {G} from '../data.js';
import {SFX,burst,vib} from '../fx.js';
import {diff} from '../state.js';
import {bindX,openOv,shakeBox,xbtn} from '../ui.js';
import {$,center,pop} from '../util.js';

export function gForge(s){return new Promise(res=>{
  const N=8;
  const ov=openOv(xbtn()+`<h3>Schmieden · ${G[s.out].n}</h3><div class="sub">Schlag zu, wenn der weiße Ring genau auf dem glühenden Werkstück liegt. Der Takt wird schneller!</div><div class="dots" id="dots">${'<i></i>'.repeat(N)}</div><div class="msg" id="m">Bereit …</div><div class="anvil"><div class="work" id="wk"></div><div class="fring" id="rg"></div></div><button class="btn big r" id="hit" style="height:90px">🔨 SCHLAG!</button>`);
  bindX();ov.abort=()=>res(null);
  let beat=0,t=-.6,dur=1.25/diff(),score=0,done=false,last=performance.now();
  const r=()=>2.6-2.2*Math.max(0,t)/dur;
  function next(v,txt){
    $('dots').children[beat].className=v>=1?'p':v>0?'g':'m';pop($('m'),txt);score+=v;beat++;t=-.25;dur*=.93;
    $('wk').style.filter=`brightness(${.6+.4*(1-beat/N)+.3})`;
    if(beat>=N){done=true;setTimeout(()=>ov.alive&&res(score/N),700)}}
  $('hit').onpointerdown=()=>{
    if(done||!ov.alive||t<0)return;const d=Math.abs(r()-1),[x,y]=center($('wk'));
    if(d<=.09){SFX.perfect();vib(30);burst(x,y,'#fde047',22);next(1,'PERFEKT! 🔥')}
    else if(d<=.22){SFX.good();vib(15);burst(x,y,'#fb923c',10);next(.6,'Gut!')}
    else{SFX.miss();shakeBox();next(0,'Daneben!')}};
  (function loop(now){
    if(!ov.alive||done)return;const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;
    const rr=r();$('rg').style.transform=`scale(${Math.max(.2,rr)})`;$('rg').style.opacity=t<0?0:1;
    if(t>=0&&rr<.55){SFX.miss();next(0,'Zu spät!')}
    requestAnimationFrame(loop)})(performance.now());
})}
