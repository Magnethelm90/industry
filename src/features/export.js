/* Export per Flugzeug und Containerschiff */
import {go,render} from '../app.js';
import {AIRPORT_COST,COUNTRIES,G,MODES,UNL,airUpBase} from '../data.js';
import {SFX,burst,fx,toast,vib} from '../fx.js';
import {GKU,S,isOpen,track} from '../state.js';
import {addSec,bindX,closeOv,openOv,xbtn} from '../ui.js';
import {$,fmt,fmtT,ic} from '../util.js';

export const airUpCost=()=>airUpBase(S.exp.lvl),maxShips=()=>1+S.exp.lvl;
export function genDemand(){
  const pool=GKU();COUNTRIES.forEach(c=>{const gs=[...pool].sort(()=>Math.random()-.5).slice(0,3);S.exp.demand[c.id]=gs.map(g=>({g,m:+(1.6+Math.random()*1.2).toFixed(1)}))});
  S.exp.demandAt=Date.now()+15*60000;
}
export const expMult=(cid,g)=>{const d=(S.exp.demand[cid]||[]).find(x=>x.g===g);return d?d.m:1.1};
export function tickExport(){
  if(!S.exp.built)return;const now=Date.now();
  if(now>S.exp.demandAt)genDemand();
  S.exp.ships=S.exp.ships.filter(sh=>{
    const c=COUNTRIES.find(x=>x.id===sh.c),m=MODES[sh.mode];
    if(sh.delayed&&!sh.told&&now>sh.start+(sh.end-sh.start)/2){sh.told=1;toast(m.e+' '+m.ev+' ('+c.n+')');SFX.err()}
    if(now<sh.end)return true;
    S.money+=sh.value;S.xp+=Math.ceil(sh.value/10);track('exports');SFX.win();toast(m.e+' Lieferung in '+c.f+' '+c.n+' angekommen: +'+fmt(sh.value)+' Cr');return false});
}
export function exportLoad(cid){
  const c=COUNTRIES.find(x=>x.id===cid);let mode='plane';const load={};
  const draw=()=>{
    const m=MODES[mode],cap=m.cap(S.exp.lvl),used=Object.values(load).reduce((a,b)=>a+b,0);
    let val=0;for(const g in load)val+=load[g]*G[g].base*expMult(cid,g);val=Math.round(val*(1-m.fee));
    const goods=GKU().filter(g=>S.stock[g]>=1||load[g]).sort((a,b)=>expMult(cid,b)-expMult(cid,a));
    openOv(xbtn()+`<h3>${c.f} Lieferung nach ${c.n}</h3><div class="sub">Gefragte Waren bringen ein Vielfaches. Flugzeug ist schnell, das Schiff fasst mehr und kostet weniger Gebühr.</div>
      <div class="seg">${Object.keys(MODES).map(k=>`<button data-m="${k}" class="${k===mode?'on':''}">${MODES[k].e} ${MODES[k].n}</button>`).join('')}</div>
      <div class="card" style="--c:#22d3ee"><div class="i">Ladung <span class="chip num">${used} / ${cap}</span><small>Dauer ${fmtT(m.t*c.d*1000)} · Gebühr ${m.fee*100} % · ${Math.round(m.risk*100)} % Verspätungsrisiko</small></div><b class="num" style="color:var(--gold);font-size:18px">${fmt(val)} Cr</b></div>
      ${goods.length?'':'<p class="sub">Dein Lager ist leer.</p>'}
      ${goods.map(g=>{const mm=expMult(cid,g);return `<div class="card" style="--c:${G[g].c}"><div class="art" style="width:44px;height:44px;flex-basis:44px">${ic(g,32)}</div><div class="i">${G[g].n} ${mm>1.1?'<span class="chip up">×'+mm+'</span>':''}<small>Lager ${Math.floor(S.stock[g])} · ${(G[g].base*mm).toFixed(0)} Cr/Stk</small></div><div class="step"><button data-g="${g}" data-d="-1">−</button><b class="num">${load[g]||0}</b><button data-g="${g}" data-d="1">+</button><button data-g="${g}" data-d="max" style="width:46px;font-size:11px">MAX</button></div></div>`}).join('')}
      <button class="btn big b" id="send" ${used&&S.exp.ships.length<maxShips()?'':'disabled'}>${S.exp.ships.length>=maxShips()?'Alle Slots unterwegs':m.e+' Abschicken'}</button>`);
    bindX();
    document.querySelectorAll('#ovbox [data-m]').forEach(b=>b.onclick=()=>{mode=b.dataset.m;const cp=MODES[mode].cap(S.exp.lvl);let u=0;for(const g in load){load[g]=Math.min(load[g],Math.max(0,cp-u));u+=load[g]}SFX.tick();draw()});
    document.querySelectorAll('#ovbox [data-g]').forEach(b=>b.onclick=()=>{const g=b.dataset.g,cur0=load[g]||0,free=cap-used,have=Math.floor(S.stock[g]);
      let n=b.dataset.d==='max'?Math.min(free,have-cur0):+b.dataset.d;n=Math.max(-cur0,Math.min(n,free,have-cur0));if(!n)return;load[g]=cur0+n;SFX.tick();draw()});
    $('send').onclick=()=>{
      if(!used||S.exp.ships.length>=maxShips())return;
      for(const g in load)S.stock[g]-=load[g];
      const delayed=Math.random()<m.risk,t=m.t*c.d*1000*(delayed?m.slow:1),now=Date.now();
      S.exp.ships.push({id:S.oid++,c:cid,mode,load:{...load},value:val,start:now,end:now+t,delayed,told:0});
      SFX.buy();vib([20,30,40]);toast(m.e+' Unterwegs nach '+c.n+' – Ankunft in '+fmtT(t));closeOv()};
  };
  draw();
}
// Flughafen bauen/ausbauen und Lieferungen unterwegs (Bildschirm Logistik)
export function renderAirport(el){
  const now=Date.now();
  if(!S.exp.built){
    const lk=!isOpen('export'),d=document.createElement('div');d.className='card';d.style.setProperty('--c','#22d3ee');
    d.innerHTML=`<div class="art">${ic('plane',44)}</div><div class="i">Flughafen & Containerhafen<small>${lk?'🔒 ab Level '+UNL.export.lv+' · '+UNL.export.d:'Öffnet den Weltmarkt: 5 Länder mit wechselnder Nachfrage. Die Länder findest du dann unter Aufträge.'}</small></div><button class="btn a" ${lk||S.money<AIRPORT_COST?'disabled':''}>Bauen<br>${fmt(AIRPORT_COST)}</button>`;
    d.querySelector('button').onclick=e=>{if(lk||S.money<AIRPORT_COST)return;S.money-=AIRPORT_COST;S.exp.built=1;genDemand();SFX.win();burst(e.clientX,e.clientY,'#22d3ee',24);fx('Flughafen eröffnet!','#22d3ee');render()};
    el.appendChild(d);return}
  const up=airUpCost(),mx=S.exp.lvl>=5,h=document.createElement('div');h.className='card';h.style.setProperty('--c','#22d3ee');
  h.innerHTML=`<div class="art">${ic('plane',44)}</div><div class="i">Flughafen Stufe ${S.exp.lvl}<small>✈️ ${MODES.plane.cap(S.exp.lvl)} · 🚢 ${MODES.ship.cap(S.exp.lvl)} Plätze · ${S.exp.ships.length} / ${maxShips()} unterwegs</small></div><button class="btn a" ${mx||S.money<up?'disabled':''}>${mx?'MAX':'⬆ '+fmt(up)}</button>`;
  h.querySelector('button').onclick=e=>{if(mx||S.money<up)return;S.money-=up;S.exp.lvl++;SFX.buy();burst(e.clientX,e.clientY,'#22d3ee',16);render()};
  el.appendChild(h);
  if(S.exp.ships.length){addSec(el,'Unterwegs');
    S.exp.ships.forEach(sh=>{const c=COUNTRIES.find(x=>x.id===sh.c),m=MODES[sh.mode],f=Math.min(1,(now-sh.start)/(sh.end-sh.start)),d=document.createElement('div');d.className='card';d.style.setProperty('--c','#7c5cff');
      d.innerHTML=`<div class="i">${m.e} ${c.f} ${c.n}${sh.delayed&&sh.told?' <span class="chip dn">verspätet</span>':''}<div class="flight"><i style="width:${f*100}%"></i><span style="left:${f*100}%">${m.e}</span></div><small>${Object.keys(sh.load).map(g=>sh.load[g]+'× '+G[g].n).join(', ')} · Ankunft in ${fmtT(sh.end-now)}</small></div><b class="num" style="color:var(--gold)">${fmt(sh.value)}</b>`;
      el.appendChild(d)})}
}
// Nachfrage der Länder (Bildschirm Aufträge)
export function renderDemand(el){
  if(!isOpen('export'))return;
  const now=Date.now();
  if(!S.exp.built){addSec(el,'Auslandsnachfrage');
    const d=document.createElement('div');d.className='card idle';d.style.setProperty('--c','#22d3ee');
    d.innerHTML=`<div class="art">${ic('plane',40)}</div><div class="i">Weltmarkt noch geschlossen<small>Baue den Flughafen unter Logistik, dann zahlen 5 Länder ein Vielfaches für gefragte Waren.</small></div><button class="btn b">Logistik</button>`;
    d.querySelector('button').onclick=()=>go('logistics');el.appendChild(d);return}
  addSec(el,'Auslandsnachfrage · neu in '+fmtT(S.exp.demandAt-now));
  COUNTRIES.forEach(c=>{const d=document.createElement('div');d.className='card';d.style.setProperty('--c','#fbbf24');
    d.innerHTML=`<div class="art"><span style="font-size:32px">${c.f}</span></div><div class="i">${c.n}<small>✈️ ${fmtT(MODES.plane.t*c.d*1000)} · 🚢 ${fmtT(MODES.ship.t*c.d*1000)}</small><div class="ois">${(S.exp.demand[c.id]||[]).map(x=>`<span class="oi">${ic(x.g,22)}${G[x.g].n} <b class="up">×${x.m}</b></span>`).join('')}</div></div><button class="btn b">Beliefern</button>`;
    d.querySelector('button').onclick=()=>exportLoad(c.id);el.appendChild(d)});
}
