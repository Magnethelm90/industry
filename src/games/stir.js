/* Minispiel: Rühren – im Kreis wischen; die Rührgeschwindigkeit muss im grünen Bereich bleiben */
import {SFX,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {gnow} from './clock.js';
import {th} from './theme.js';

const LO=3.6,HI=8.5,NEED=7,DUR=12; // Winkelgeschwindigkeit in rad/s (ca. 0,6–1,4 Umdrehungen pro Sekunde), Sekunden im Bereich, Gesamtzeit
export function gStir(s){return new Promise(res=>{
  const col=th(s,'col','#f59e0b');
  const ov=openOv(xbtn()+`<h3>${th(s,'title','Rühren')}</h3><div class="sub">${th(s,'how','Wisch mit dem Finger im Kreis um den Kessel. Halte die Geschwindigkeit im grünen Bereich: zu langsam gibt Klumpen, zu schnell spritzt es. 12 Sekunden ab der ersten Bewegung.')}</div><div class="msg" id="m">Rühr im Kreis!</div>
    <div class="stage stirst" id="st" style="height:260px"><div class="hint top">Im Kreis wischen</div>
      <div class="pot"><div class="liq" id="lq" style="background:radial-gradient(circle at 50% 50%,${col},color-mix(in srgb,${col} 55%,#000))"></div><div class="ladle" id="ld"></div></div></div>
    <div class="spd"><i class="zone" style="left:${LO/12*100}%;width:${(HI-LO)/12*100}%"></i><b id="sp"></b></div>
    <div class="meter" style="height:10px;margin-top:8px"><i id="pr" style="width:0%"></i></div>
    <div class="timer" style="margin-top:6px"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),lq=$('lq'),ld=$('ld');
  let a0=null,w=0,okT=0,t0=0,last=0,done=false,down=false,rot=0;
  st.__state=()=>({w,okT,done});
  const ctr=()=>{const r=lq.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]};
  st.onpointerdown=e=>{e.preventDefault();if(done)return;down=true;a0=null;last=gnow();try{st.setPointerCapture(e.pointerId)}catch(_){}};
  st.onpointermove=e=>{if(!down||done||!ov.alive)return;const [cx,cy]=ctr(),dx=e.clientX-cx,dy=e.clientY-cy;
    if(Math.hypot(dx,dy)<22)return;
    const a=Math.atan2(dy,dx),now=gnow();
    if(a0!=null){let da=a-a0;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;
      const dt=Math.max(.008,(now-last)/1000);w=w*.8+Math.abs(da/dt)*.2;rot+=da;
      if(!t0){t0=now;loop()}
      lq.style.transform=`rotate(${rot}rad)`;ld.style.left=(50+Math.cos(a)*30)+'%';ld.style.top=(50+Math.sin(a)*30)+'%'}
    a0=a;last=now};
  st.onpointerup=st.onpointercancel=()=>{down=false;a0=null;w=0};
  let prev=gnow();
  const loop=()=>{if(!ov.alive||done)return;const now=gnow(),dt=(now-prev)/1000;prev=now;
    // Geschwindigkeit fällt ab, wenn nicht gewischt wird
    if(!down||now-last>180)w*=.9;
    const inZ=w>=LO&&w<=HI;if(inZ)okT+=dt;else if(w>HI*1.25)okT=Math.max(0,okT-dt*.5);
    $('sp').style.left=Math.min(100,w/12*100)+'%';$('sp').className=inZ?'ok':w>HI?'hi':'lo';
    lq.classList.toggle('splash',w>HI*1.25);
    const el=(now-t0)/1000;$('pr').style.width=Math.min(1,okT/NEED)*100+'%';$('tm').style.width=Math.max(0,1-el/DUR)*100+'%';
    $('m').textContent=!down?'Weiter rühren!':inZ?'Gleichmäßig 👌':w>HI?'Zu schnell! 💦':'Schneller!';
    if(okT>=NEED||el>=DUR){done=true;const v=Math.min(1,okT/NEED);pop($('m'),v>=1?'Perfekt verrührt! ✨':Math.round(v*100)+' % verrührt');if(v>=1)SFX.win();else SFX.good();vib(20);
      setTimeout(()=>ov.alive&&res(v),600);return}
    requestAnimationFrame(loop)};
})}
