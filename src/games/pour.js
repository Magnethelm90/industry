/* Minispiel: Gießen – Finger nach unten ziehen kippt die Pfanne (je weiter, desto mehr Fluss); Form genau bis zur Linie füllen */
import {G} from '../data.js';
import {SFX} from '../fx.js';
import {diff} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {A,at,put,sparks} from './scene.js';

export function gPour(s){return new Promise(res=>{
  const N=3;
  const ov=openOv(xbtn()+`<h3>Gießen · ${G[s.out].n}</h3><div class="sub">Zieh den Finger nach unten, um die Pfanne zu kippen – je weiter, desto stärker fließt es. Loslassen stellt sie wieder auf, aber es läuft noch etwas nach. Füll die Form genau bis zur grünen Linie.</div><div class="dots" id="dots">${'<i></i>'.repeat(N)}</div><div class="msg" id="m">Form 1</div>
    <div class="stage forge" id="st" style="height:270px"><div class="hint top">↓ Ziehen zum Kippen ↓</div></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth,LW=150;
  const [pvx,pvy]=A.ladle.pivot,[lpx,lpy]=A.ladle.lip,P=[W*.36,78];
  const mo=put(st,'mold',176,null,P[0]+50,192);
  const [il,ib]=at(mo,'mold','in_l'),[ir]=at(mo,'mold','in_r'),[,it]=at(mo,'mold','in_t');
  const IH=ib-it;
  const fillEl=document.createElement('div');fillEl.className='molten';fillEl.style.cssText=`left:${il}px;width:${ir-il}px;top:${ib}px;height:0`;st.appendChild(fillEl);
  const line=document.createElement('div');line.className='tline';line.style.cssText=`left:${il-6}px;width:${ir-il+12}px`;st.appendChild(line);
  const stream=document.createElement('div');stream.className='stream';stream.style.height='0';st.appendChild(stream);
  const la=document.createElement('div');la.className='prop p-ladle';
  la.style.cssText=`width:${LW}px;height:${LW}px;left:${P[0]-pvx*LW}px;top:${P[1]-pvy*LW}px;transform-origin:${pvx*LW}px ${pvy*LW}px;z-index:4`;st.appendChild(la);
  const lip=a=>{const r=a*Math.PI/180,dx=(lpx-pvx)*LW,dy=(lpy-pvy)*LW;return [P[0]+dx*Math.cos(r)-dy*Math.sin(r),P[1]+dx*Math.sin(r)+dy*Math.cos(r)]};
  let k=0,fill=0,flow=0,tilt=0,ang=0,target=0,score=0,phase='pour',last=performance.now(),poured=false,spl=0;
  const newMold=()=>{fill=0;flow=0;poured=false;target=40+Math.random()*45;line.style.top=(ib-IH*target/100)+'px';fillEl.style.height='0';fillEl.style.top=ib+'px';phase='pour'};
  newMold();
  let y0=null;
  st.onpointerdown=e=>{e.preventDefault();if(phase==='pour')y0=e.clientY};
  st.onpointermove=e=>{if(y0!=null&&phase==='pour')tilt=Math.max(0,Math.min(1,(e.clientY-y0)/100))};
  st.onpointerup=st.onpointercancel=st.onpointerleave=()=>{y0=null;tilt=0};
  (function loop(now){
    if(!ov.alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;
    const want=phase==='pour'?tilt*50*diff():0;
    flow=flow<want?Math.min(want,flow+95*dt):Math.max(want,flow-115*dt);
    if(flow>.5)poured=true;
    fill=Math.min(100,fill+flow*dt);
    ang+=((phase==='pour'?tilt:0)*62-ang)*Math.min(1,dt*14);la.style.transform=`rotate(${ang}deg)`;
    const h=IH*fill/100;fillEl.style.height=h+'px';fillEl.style.top=(ib-h)+'px';
    const [sx,sy]=lip(ang);
    if(flow>.3){stream.style.left=sx+'px';stream.style.top=sy+'px';stream.style.height=Math.max(0,ib-h-sy)+'px';stream.style.width=(3+flow/50*9)+'px';stream.style.opacity=1;
      if((spl+=dt)>.15&&flow>8){spl=0;sparks(st,sx,ib-h,3,'#ffb020')}}
    else stream.style.opacity=0;
    if(fill>=100&&phase==='pour'){tilt=0;y0=null;phase='settle'}
    if(phase==='pour'&&poured&&tilt===0&&y0==null)phase='settle';
    if(phase==='settle'&&flow<=0){
      const err=Math.abs(fill-target),v=err<=3?1:err<=8?.6:err<=15?.3:0;score+=v;phase='wait';
      $('dots').children[k].className=v>=1?'p':v>0?'g':'m';
      pop($('m'),v>=1?'Perfekt! ✨':v>0?(fill>target?'+':'')+Math.round(fill-target)+' % daneben':fill>target?'Übergelaufen! 🔥':'Viel zu wenig!');
      v>=1?SFX.perfect():v>0?SFX.good():SFX.miss();k++;
      setTimeout(()=>{if(!ov.alive)return;if(k>=N){res(score/N);return}newMold();pop($('m'),'Form '+(k+1))},900)}
    requestAnimationFrame(loop)})(performance.now());
})}
