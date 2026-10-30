/* Minispiel: Mischen – Flaschen gedrückt halten, sie kippen und schenken ins Becherglas; Schichten der Zielskala treffen */
import {G} from '../data.js';
import {SFX,tone} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {at,put} from './scene.js';
import {gnow} from './clock.js';

export function gMix(s){return new Promise(res=>{
  // s.ing: eigene Zutaten (Labor), sonst die drei Standard-Flaschen
  const ING=(s.ing||[{n:'Basis',c:'#8b5cf6'},{n:'Härter',c:'#06b6d4'},{n:'Farbe',c:'#ec4899'}]).map((g,i)=>({...g,p:['bottle_a','bottle_b','bottle_c'][i]}));
  const w=[1+Math.random()*2,.6+Math.random()*1.5,.4+Math.random()],sw=w.reduce((a,b)=>a+b),T=w.map(x=>x/sw*100);
  const D=15,amt=[0,0,0];
  const ov=openOv(xbtn()+`<h3>${s.title||'Mischen · '+G[s.out].n}</h3><div class="sub">${s.how||'Halte eine Flasche gedrückt, um einzuschenken. Triff die Schichten der Zielskala rechts – bei 100 % ist das Glas voll.'}</div><div class="msg" id="m">Rezept beachten!</div>
    <div class="stage lab" id="st" style="height:290px"></div>
    <button class="btn big" id="fill" style="margin-top:8px">✓ Abfüllen</button>
    <div class="timer" style="margin-top:10px"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth;
  // Flüssigkeit liegt hinter dem Glas, damit Spiegelungen und Skala darüber bleiben
  const liq=document.createElement('div');liq.style.cssText='position:absolute;display:flex;flex-direction:column-reverse;overflow:hidden;border-radius:0 0 10px 10px';st.appendChild(liq);
  const bk=put(st,'beaker',176,null,W*.44,196);
  const [il,ib]=at(bk,'beaker','in_l'),[ir]=at(bk,'beaker','in_r'),[,it]=at(bk,'beaker','in_t'),IH=ib-it;
  liq.style.left=il+'px';liq.style.width=(ir-il)+'px';liq.style.top=it+'px';liq.style.height=IH+'px';
  const layers=ING.map(g=>{const e=document.createElement('i');e.className='layer';e.style.cssText=`position:relative;display:block;height:0;background:linear-gradient(90deg,${g.c},color-mix(in srgb,${g.c} 60%,#000));box-shadow:inset 0 2px 0 rgba(255,255,255,.3)`;liq.appendChild(e);return e});
  const ruler=document.createElement('div');ruler.className='ruler';ruler.style.cssText=`position:absolute;left:${ir+22}px;top:${it}px;height:${IH}px;width:20px`;
  ruler.innerHTML=ING.map((g,i)=>`<i style="height:${T[i]}%;background:${g.c}"></i>`).join('');st.appendChild(ruler);
  const BW=74,bx=[W*.16,W*.44,W*.72],bcx=(il+ir)/2;
  const bottles=ING.map((g,i)=>{const b=put(st,g.p,BW,null,bx[i],52);b.style.pointerEvents='auto';b.style.touchAction='none';b.style.transition='transform .18s';b.style.zIndex=4;
    if(g.icon)b.insertAdjacentHTML('beforeend',`<span style="position:absolute;left:50%;top:60%;transform:translate(-50%,-50%);pointer-events:none;filter:drop-shadow(0 1px 2px #000)">${g.icon}</span>`);
    const lb=document.createElement('div');lb.className='pourlbl';lb.style.left=bx[i]+'px';lb.style.top='92px';lb.style.bottom='auto';lb.style.textAlign='center';lb.innerHTML=`${g.n}<br><span id="pv${i}">0 / ${Math.round(T[i])}</span>`;st.appendChild(lb);return b});
  const streams=ING.map(g=>{const e=document.createElement('div');e.className='stream';e.style.cssText=`opacity:0;background:${g.c};box-shadow:0 0 10px ${g.c}`;st.appendChild(e);return e});
  let act=-1,done=false,last=gnow(),tick=0;const t0=gnow();
  const ang=i=>bx[i]<bcx-10?105:bx[i]>bcx+10?-105:115;
  bottles.forEach((b,i)=>{
    b.onpointerdown=e=>{e.preventDefault();e.stopPropagation();if(done)return;act=i;b.style.transform=`translateY(14px) rotate(${ang(i)}deg)`};
    const off=()=>{if(act===i)act=-1;b.style.transform='';streams[i].style.opacity=0};b.onpointerup=off;b.onpointerleave=off;b.onpointercancel=off});
  $('fill').onclick=()=>{if(!done&&amt.some(v=>v>0))finish()};
  function finish(){
    done=true;act=-1;bottles.forEach((b,i)=>{b.style.transform='';streams[i].style.opacity=0});const tot=amt.reduce((a,b)=>a+b);
    const err=amt.reduce((a,v,i)=>a+Math.abs(v-T[i]),0),sc=Math.max(0,1-Math.max(0,err-6)/60)*Math.min(1,tot/100);
    pop($('m'),'Mischung '+Math.round(sc*100)+' % genau');sc>.7?SFX.win():SFX.miss();
    setTimeout(()=>ov.alive&&res(sc),900)}
  (function loop(){const now=gnow();
    if(!ov.alive||done)return;const dt=Math.min(.05,(now-last)/1000);last=now;
    const tot=amt.reduce((a,b)=>a+b);
    if(act>=0){amt[act]+=Math.min(22*dt,100-tot);if((tick+=dt)>.12){tick=0;tone(300+act*120+tot*3,.05,'sine',.03)}
      // Strahl vom gekippten Flaschenhals bis zur Oberfläche
      const r=ang(act)*Math.PI/180,mx=bx[act]+.457*BW*Math.sin(r),my=52+14-.457*BW*Math.cos(r),surf=ib-IH*tot/100;
      const sEl=streams[act];sEl.style.left=mx+'px';sEl.style.top=my+'px';sEl.style.height=Math.max(0,surf-my)+'px';sEl.style.width='6px';sEl.style.opacity=1}
    amt.forEach((v,i)=>{layers[i].style.height=(v/100*IH)+'px';$('pv'+i).textContent=Math.round(v)+' / '+Math.round(T[i])});
    const el=(now-t0)/1000;$('tm').style.width=Math.max(0,100-el/D*100)+'%';
    if(amt.reduce((a,b)=>a+b)>=99.9||el>=D){finish();return}
    requestAnimationFrame(loop)})();
})}
