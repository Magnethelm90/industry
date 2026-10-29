/* Minispiel: Gießen */
import {G} from '../data.js';
import {SFX} from '../fx.js';
import {diff} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';

export function gPour(s){return new Promise(res=>{
  const N=3;
  const ov=openOv(xbtn()+`<h3>Gießen · ${G[s.out].n}</h3><div class="sub">Halte gedrückt zum Gießen. Die Schmelze fließt nach dem Loslassen noch weiter – lass rechtzeitig los, damit die Form genau bis zur grünen Linie voll ist.</div><div class="dots" id="dots">${'<i></i>'.repeat(N)}</div><div class="msg" id="m">Form 1</div><div class="mold"><div class="mfill" id="mf"></div><div class="mline" id="ml"></div></div><button class="btn big a" id="h" style="height:96px">🫗 GIESSEN (halten)</button>`);
  bindX();ov.abort=()=>res(null);
  let k=0,fill=0,flow=0,hold=false,target=0,score=0,phase='pour',last=performance.now();
  const newMold=()=>{fill=0;flow=0;target=40+Math.random()*45;$('ml').style.bottom=target+'%';$('mf').style.height='0%';phase='pour'};
  newMold();
  const on=e=>{e.preventDefault();if(phase==='pour')hold=true},off=()=>{if(hold&&phase==='pour'&&fill>0)phase='settle';hold=false};
  $('h').onpointerdown=on;$('h').onpointerup=off;$('h').onpointerleave=off;$('h').onpointercancel=off;
  (function loop(now){
    if(!ov.alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;
    flow=hold?Math.min(50*diff(),flow+95*dt):Math.max(0,flow-115*dt);
    fill=Math.min(100,fill+flow*dt);$('mf').style.height=fill+'%';
    if(fill>=100&&phase==='pour'){hold=false;phase='settle'}
    if(phase==='settle'&&flow<=0){
      const err=Math.abs(fill-target),v=err<=3?1:err<=8?.6:err<=15?.3:0;score+=v;phase='wait';
      $('dots').children[k].className=v>=1?'p':v>0?'g':'m';
      pop($('m'),v>=1?'Perfekt! ✨':v>0?(fill>target?'+':'')+Math.round(fill-target)+' % daneben':fill>target?'Übergelaufen! 🔥':'Viel zu wenig!');
      v>=1?SFX.perfect():v>0?SFX.good():SFX.miss();k++;
      setTimeout(()=>{if(!ov.alive)return;if(k>=N){res(score/N);return}newMold();pop($('m'),'Form '+(k+1))},900)}
    requestAnimationFrame(loop)})(performance.now());
})}
