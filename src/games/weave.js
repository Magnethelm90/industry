/* Minispiel: Weben – Fäden laufen herab, in jeder Reihe fehlt einer; tippe die Spur mit der Lücke, bevor die Reihe den Webkamm erreicht */
import {SFX,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {sparks} from './scene.js';
import {gnow} from './clock.js';
import {diff} from '../state.js';
import {th} from './theme.js';

const LANES=5,ROWS=14,COL=['#ef4444','#f59e0b','#22c55e','#38bdf8','#a78bfa'];
export function gWeave(s){return new Promise(res=>{
  const ov=openOv(xbtn()+`<h3>${th(s,'title','Weben')}</h3><div class="sub">${th(s,'how','In jeder Fadenreihe fehlt ein Faden. Tippe die Spur mit der Lücke, bevor die Reihe den Webkamm unten erreicht. Falsche Spur = Fehler.')}</div><div class="msg" id="m">Bereit?</div>
    <div class="stage weavest" id="st" style="height:330px"></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth,H=st.clientHeight,LW=W/LANES,RH=44,COMB=H-56;
  const comb=document.createElement('div');comb.className='comb';comb.style.top=COMB+'px';st.appendChild(comb);
  const cloth=document.createElement('div');cloth.className='cloth';st.appendChild(cloth);
  let rows=[],spawned=0,good=0,bad=0,miss=0,t=0,next=.5,last=gnow(),done=false;
  st.__state=()=>({rows:rows.filter(r=>!r.done).map(r=>({y:r.y,gap:r.gap})),spawned,good,done,W,COMB,LW});
  const mk=()=>{
    const gap=Math.floor(Math.random()*LANES),el=document.createElement('div');el.className='wrow';el.style.height=RH+'px';
    for(let i=0;i<LANES;i++){const c=document.createElement('i');c.style.width=LW+'px';
      if(i===gap)c.className='gap';else c.style.background=COL[i];el.appendChild(c)}
    st.appendChild(el);rows.push({el,y:-RH,gap,done:false})};
  const settle=(r,ok)=>{r.done=true;r.el.style.opacity=ok?0:.35;
    if(ok){good++;SFX.good();vib(8);sparks(st,r.gap*LW+LW/2,COMB,5,COL[r.gap]);cloth.style.height=Math.min(54,good*4)+'px'}
    $('m').textContent=good+' gewebt'+(bad+miss?' · '+(bad+miss)+' Fehler':'')};
  st.onpointerdown=e=>{e.preventDefault();if(done||!ov.alive)return;
    const r0=st.getBoundingClientRect(),lane=Math.max(0,Math.min(LANES-1,Math.floor((e.clientX-r0.left)/LW)));
    const r=rows.filter(x=>!x.done&&x.y+RH>COMB-70).sort((a,b)=>b.y-a.y)[0];
    if(!r){bad++;SFX.miss();pop($('m'),'Zu früh');return}
    if(lane===r.gap)settle(r,true);else{bad++;r.done=true;r.el.style.opacity=.35;SFX.err();vib([40,30,40]);pop($('m'),'Falsche Spur!')}};
  const frame=()=>{if(!ov.alive||done)return;
    const now=gnow(),dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;
    const v=(105+spawned*5)*diff();
    next-=dt;if(next<=0&&spawned<ROWS){mk();spawned++;next=Math.max(.5,1.15-spawned*.04)}
    rows.forEach(r=>{r.y+=v*dt;r.el.style.transform=`translateY(${r.y}px)`;
      if(!r.done&&r.y>COMB+10){miss++;r.done=true;r.el.style.opacity=.35;SFX.miss();pop($('m'),'Durchgerutscht')}
      if(r.done&&r.y>=H)r.el.remove()});
    rows=rows.filter(r=>r.y<H);
    if(spawned>=ROWS&&!rows.some(r=>!r.done)){done=true;
      const v2=Math.max(0,(good-.5*bad)/ROWS);pop($('m'),good+' von '+ROWS+' Reihen');if(v2>=.85)SFX.win();
      setTimeout(()=>ov.alive&&res(Math.min(1,v2)),700);return}
    requestAnimationFrame(frame)};
  requestAnimationFrame(frame);
})}
