/* Minispiel: Smartphone zusammenbauen */
import {G} from '../data.js';
import {SFX,burst,vib} from '../fx.js';
import {bindX,openOv,shakeBox,xbtn} from '../ui.js';
import {$,ic,pop} from '../util.js';
import {fly} from './scene.js';
import {gnow} from './clock.js';

export function phoneSVG(has,next,powered){
  const SL={gehaeuse:[10,6,140,288,26],platine:[26,26,108,112,8],akku:[30,150,100,118,10],display:[16,14,128,272,20]};
  let o='<svg viewBox="0 0 160 300">';
  if(!has.gehaeuse)o+='<rect x="10" y="6" width="140" height="288" rx="26" fill="#ffffff05"/>';
  else o+='<rect x="10" y="6" width="140" height="288" rx="26" fill="url(#gPh)"/><rect x="18" y="16" width="124" height="268" rx="18" fill="#0b0f1d"/>';
  if(has.platine)o+='<rect x="26" y="26" width="108" height="112" rx="8" fill="#15803d"/><path d="M34 50h40M34 62h60M90 40v60M50 90h70M40 110h30M110 40v26" stroke="#facc15" stroke-width="2" opacity=".7"/><rect x="58" y="56" width="34" height="34" rx="3" fill="#0f172a"/><rect x="104" y="96" width="20" height="14" rx="2" fill="#0f172a"/><circle cx="40" cy="126" r="4" fill="#facc15"/>';
  if(has.akku)o+='<rect x="30" y="150" width="100" height="118" rx="10" fill="url(#gGrayD)"/><rect x="40" y="166" width="80" height="12" rx="4" fill="#a3e635"/><text x="80" y="226" fill="#e5e7eb" font-size="14" font-weight="800" text-anchor="middle" font-family="system-ui,sans-serif">4500 mAh</text>';
  if(has.display)o+=powered
    ?'<rect x="16" y="14" width="128" height="272" rx="20" fill="url(#gScr)"/><text x="80" y="148" fill="#fff" font-size="15" font-weight="900" text-anchor="middle" letter-spacing="2" font-family="system-ui,sans-serif">INDUSTRY</text><text x="80" y="168" fill="#fff" font-size="9" text-anchor="middle" opacity=".8" font-family="system-ui,sans-serif">ACTION OS</text><rect x="62" y="22" width="36" height="8" rx="4" fill="#000"/>'
    :'<rect x="16" y="14" width="128" height="272" rx="20" fill="#05070f"/><path d="M30 30h60L40 150z" fill="#ffffff12"/><rect x="62" y="22" width="36" height="8" rx="4" fill="#000"/>';
  if(next&&SL[next]){const [x,y,w,h,r]=SL[next];o+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#22d3ee10" stroke="#22d3ee" stroke-width="2" stroke-dasharray="6 5"><animate attributeName="stroke-dashoffset" from="0" to="22" dur="1s" repeatCount="indefinite"/></rect>`}
  return o+'</svg>';
}
export function gPhone(s){return new Promise(res=>{
  const PH=[{p:'gehaeuse'},{p:'platine'},{p:'akku'},{screws:1},{p:'display'},{power:1}];
  const SC=[[20,11],[80,11],[20,44],[80,44]];
  const decoy=['maschine','ziegel','stahl','glas'][Math.floor(Math.random()*4)];
  const parts=['gehaeuse','platine','akku','display',decoy].sort(()=>Math.random()-.5);
  const ov=openOv(xbtn()+`<h3>Smartphone montieren</h3><div class="sub">Zieh die Teile in der richtigen Reihenfolge ins Handy (oder tippe sie an). Ein Teil gehört nicht dazu!</div><div class="msg" id="m">Womit fängst du an?</div><div class="phonewrap"><div class="phone" id="ph"></div><div class="tray" id="tr"></div></div><div id="pw" style="margin-top:12px"></div><div class="timer" style="margin-top:12px"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  let ph=0,mist=0,powered=false,done=false;const has={},t0=gnow();
  const cur=()=>PH[ph];
  function finish(){
    done=true;const el=(gnow()-t0)/1000;
    const sc=Math.max(0,Math.min(1,1-mist*.15-Math.max(0,el-30)/50));
    setTimeout(()=>ov.alive&&res(sc),1400)}
  function draw(){
    const c=cur();$('ph').innerHTML=phoneSVG(has,c&&c.p,powered);
    if(c&&c.screws){let left=4;pop($('m'),'Platine festschrauben!');
      SC.forEach(([x,y])=>{const b=document.createElement('button');b.className='screw';b.style.left=x+'%';b.style.top=y+'%';
        b.onpointerdown=()=>{if(b.classList.contains('ok')||done)return;b.classList.add('ok');SFX.tick();vib(10);
          fly($('ph'),b.offsetLeft,b.offsetTop-34,'<div class="prop p-screwdriver" style="position:relative;width:64px;height:64px"></div>',{dx:0,dy:6,rot:200,dur:380});
          if(--left<=0){SFX.good();ph++;setTimeout(()=>ov.alive&&draw(),300)}};$('ph').appendChild(b)})}
    if(c&&c.power){pop($('m'),'Fertig montiert – einschalten!');$('pw').innerHTML='<button class="btn big b" id="pon">⏻ Einschalten</button>';
      $('pon').onclick=()=>{if(done)return;powered=true;ph++;$('pw').innerHTML='';draw();SFX.win();vib([30,40,80]);
        const r=$('ph').getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,'#e879f9',26);pop($('m'),'Es lebt! 📱');finish()}}
  }
  function place(btn,part){
    if(done)return;const c=cur();
    if(c&&c.p===part){has[part]=1;btn.classList.add('gone');ph++;SFX.good();vib(15);const r=$('ph').getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,G[part].c,12);pop($('m'),G[part].n+' eingebaut ✓');draw()}
    else{mist++;SFX.miss();vib([40,30,40]);shakeBox();pop($('m'),c&&c.screws?'Erst festschrauben!':c&&c.power?'Alles drin – einschalten!':part===decoy?'Das gehört nicht ins Handy! ❌':'Falsche Reihenfolge! ❌')}}
  parts.forEach(part=>{
    const b=document.createElement('button');b.className='part';b.innerHTML=ic(part,40)+'<span>'+G[part].n+'</span>';$('tr').appendChild(b);
    b.onpointerdown=e=>{
      if(done||!ov.alive||b.classList.contains('gone'))return;e.preventDefault();
      const g=document.createElement('div');g.className='drag';g.innerHTML=ic(part,64);document.body.appendChild(g);
      const sx=e.clientX,sy=e.clientY;let moved=false;
      const mv=ev=>{g.style.left=ev.clientX+'px';g.style.top=ev.clientY+'px';if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>8)moved=true};
      const stop=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',cancel);g.remove()};
      const cancel=()=>stop();
      const up=ev=>{stop();const p=$('ph');if(!p||!ov.alive)return;const r=p.getBoundingClientRect();
        const inside=ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom;
        if(moved&&!inside)return;place(b,part)};
      mv(e);addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',cancel)}});
  draw();
  (function loop(){if(!ov.alive||done)return;const el=(gnow()-t0)/1000;$('tm').style.width=Math.max(0,100-el/40*100)+'%';requestAnimationFrame(loop)})();
})}
