/* Minispiel: Hitze halten – Blasebalg pumpen (halten), Temperatur im grünen Bereich des Thermometers halten */
import {SFX} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {A,at,fly,put} from './scene.js';

export function gHeat(moving=false,s){return new Promise(res=>{
  const ov=openOv(xbtn()+`<h3>${s?s.n:'Schmelzofen'}${moving?' · Wandernde Hitze':''}</h3><div class="sub">Halte gedrückt, um den Blasebalg zu pumpen – das Feuer wird heißer. Loslassen kühlt ab. Halte das Thermometer im grünen Bereich!</div><div class="msg" id="m">Aufheizen …</div>
    <div class="stage forge" id="st"><div class="thermo"><div class="tz" id="hz"></div><div class="tf" id="tf"></div></div><div class="hint">Gedrückt halten zum Pumpen</div></div>
    <div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth;
  const fu=put(st,'furnace',236,null,W*.52,132);
  const [lx,ly]=at(fu,'furnace','door_l'),[rx]=at(fu,'furnace','door_r'),[,ty]=at(fu,'furnace','door_t'),[cx,cy]=at(fu,'furnace','chimney');
  const glow=document.createElement('div');glow.className='glow';
  glow.style.cssText=`left:${lx}px;top:${ty}px;width:${rx-lx}px;height:${ly-ty}px;overflow:hidden`;
  glow.innerHTML=[18,42,66].map((x,i)=>`<div class="flame" style="left:${x-13}%;animation-delay:${i*.07}s"></div>`).join('');
  st.appendChild(glow);
  const flames=[...glow.querySelectorAll('.flame')];
  // Blasebalg gespiegelt links vom Ofen, Düse zeigt auf die Ofentür
  const BW=112,[nx,ny]=A.bellows.nozzle,bel=document.createElement('div');bel.className='prop p-bellows';
  const bx=lx-6-(1-nx)*BW,by=ly-24-ny*BW;
  bel.style.cssText=`width:${BW}px;height:${BW}px;left:${bx}px;top:${by}px;transform:scaleX(-1);transition:transform .12s`;st.appendChild(bel);
  const nozzle=[lx-6,ly-24];
  let temp=25,hold=false,inZ=0,tt=0,last=performance.now(),prev='',puff=0,smoke=0;const D=12;
  const zw=20+Math.random()*10;let zl=moving?40:25+Math.random()*(55-zw),zd=Math.random()<.5?1:-1;
  const setZone=()=>{$('hz').style.bottom=zl+'%';$('hz').style.height=zw+'%'};setZone();
  const on=e=>{e.preventDefault();hold=true;bel.style.transform='scaleX(-1) scaleY(.72)'},off=()=>{hold=false;bel.style.transform='scaleX(-1)'};
  st.onpointerdown=on;st.onpointerup=off;st.onpointerleave=off;st.onpointercancel=off;
  let wsn=0;
  function tick(t){if(!ov.alive)return;const dt=Math.min(0.05,(t-last)/1000);last=t;
    temp+=(hold?34:-20)*dt+(Math.random()-0.5)*14*dt;temp=Math.max(0,Math.min(100,temp));
    tt+=dt;
    if(moving){zl+=zd*9*dt;if(zl<10||zl>90-zw){zd*=-1;zl=Math.max(10,Math.min(90-zw,zl))}setZone()}
    const z=temp>=zl&&temp<=zl+zw;if(z)inZ+=dt;
    const h=temp/100;
    $('tf').style.height=`calc(${temp}% - 6px)`;
    glow.style.background=`radial-gradient(circle at 50% 90%,rgba(255,${Math.round(120+120*h)},${Math.round(40+160*h*h)},${.25+.75*h}),rgba(255,80,0,${.15+.5*h}) 60%,rgba(120,20,0,${.2*h}))`;
    glow.style.boxShadow=`0 0 ${10+50*h}px rgba(255,120,30,${.2+.6*h})`;
    flames.forEach((f,i)=>{f.style.height=(18+75*h*(i===1?1:.8))+'%'});
    if(hold&&(puff+=dt)>.12){puff=0;if(!(wsn++%3))SFX.whoosh();fly(st,nozzle[0],nozzle[1],'<i class="spark" style="width:12px;height:12px;background:#ffffff55"></i>',{dx:40,dy:-6,dur:420})}
    if(h>.7&&(smoke+=dt)>.25){smoke=0;fly(st,cx,cy,'<i class="spark" style="width:16px;height:16px;background:#64748b88;filter:blur(2px)"></i>',{dx:(Math.random()-.3)*30,dy:-50,dur:900})}
    $('tm').style.width=(100-tt/D*100)+'%';
    const msg=temp>zl+zw?'Zu heiß! 🥵':temp<zl?'Zu kalt! 🥶':'Perfekt! 👍';if(msg!==prev){pop($('m'),msg);prev=msg;if(z)SFX.good();else SFX.tick()}
    if(tt>=D){res(inZ/D);return}requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
})}
