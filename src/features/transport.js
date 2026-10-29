/* LKW-Transport zum Markt */
import {render} from '../app.js';
import {G,GK,ROUTES} from '../data.js';
import {SFX,burst,toast} from '../fx.js';
import {drive} from '../games/drive.js';
import {GKU,S,price,sat,truckCap} from '../state.js';
import {closeOv,openOv} from '../ui.js';
import {$,fmt,ic} from '../util.js';

export let cargo={};
export async function startDrive(route){
  const total=Object.values(cargo).reduce((a,b)=>a+b,0);if(!total){toast('Lade zuerst Ware auf!');return}
  const load={...cargo};cargo={};GK.forEach(g=>{if(load[g])S.stock[g]-=load[g]});
  const r=await drive(route,load);
  let val=0;for(const g in load){for(let i=0;i<load[g];i++){val+=price(g);sat[g]+=1}}
  val*=route.mult;const pay=Math.floor(val*r.integ/100)+r.coins*5;
  S.money+=pay;S.xp+=Math.ceil(pay/8);
  const stars=r.integ>=100?3:r.integ>=60?2:r.integ>0?1:0;
  openOv(`<h3 style="text-align:center;font-size:24px">${r.integ>0?'Lieferung erfolgreich':'Totalschaden'}</h3>
   <div style="text-align:center;font-size:38px;letter-spacing:8px;margin:6px 0">${'★'.repeat(stars)}<span style="opacity:.2">${'★'.repeat(3-stars)}</span></div>
   <div class="card" style="--c:#22d3ee;margin:8px 0"><div class="i">Zustand der Ladung<small>Warenwert ${fmt(val)} × ${r.integ}%</small></div><b style="font-size:20px">${r.integ}%</b></div>
   <div class="card" style="--c:#fbbf24;margin:8px 0"><div class="i">Münzen<small>${r.coins} × 5 Credits</small></div><b style="font-size:20px">+${r.coins*5}</b></div>
   <div style="text-align:center;margin:12px 0 16px"><div class="big-num">+${fmt(pay)}</div><div class="sub">Credits</div></div><button class="btn big b" id="ok">Weiter</button>`);
  if(pay>0){SFX.win();burst(innerWidth/2,innerHeight*.35,'#fbbf24',24)}
  $('ok').onclick=()=>{closeOv();render()};
}
export function renderShip(){
  const el=$('s-ship');const used=Object.values(cargo).reduce((a,b)=>a+b,0);
  let est=0;for(const g in cargo)est+=price(g)*cargo[g];
  el.innerHTML=`<h2>Transport</h2><p class="sub">Belade den LKW und bring die Ware zum Markt.</p>
   <div class="card" style="--c:#22d3ee"><div class="art">${ic('truck',44)}</div><div class="i">Ladefläche <span class="chip num">${used} / ${truckCap()}</span><div class="meter"><i style="width:${used/truckCap()*100}%"></i></div><small>Geschätzter Warenwert: ${fmt(est)} Credits</small></div></div>`;
  const list=GKU().filter(g=>S.stock[g]>=1||cargo[g]);
  if(!list.length)el.insertAdjacentHTML('beforeend','<p class="sub">Dein Lager ist leer – stell zuerst etwas her.</p>');
  list.forEach(g=>{const have=Math.floor(S.stock[g]),c=cargo[g]||0;
    const d=document.createElement('div');d.className='card';d.style.setProperty('--c',G[g].c);
    d.innerHTML=`<div class="art" style="width:48px;height:48px;flex-basis:48px">${ic(g,34)}</div><div class="i">${G[g].n}<small>Lager ${have} · ~${price(g).toFixed(1)}/Stk</small></div><div class="step"><button data-d="-1">−</button><b class="num">${c}</b><button data-d="1">+</button><button data-d="max" style="width:46px;font-size:11px;font-weight:800">MAX</button></div>`;
    d.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      const free=truckCap()-Object.values(cargo).reduce((a,x)=>a+x,0);
      let n=b.dataset.d==='max'?Math.min(free,have-c):parseInt(b.dataset.d);
      n=Math.max(-c,Math.min(n,free,have-c));if(n)SFX.tick();cargo[g]=c+n;render()});
    el.appendChild(d)});
  ROUTES.forEach(r=>{const d=document.createElement('div');d.className='card';d.style.setProperty('--c',r.c);
    d.innerHTML=`<div class="art">${ic(r.icon,44)}</div><div class="i">${r.n}<small>${r.desc} · ${r.T}s</small></div><button class="btn b" ${used?'':'disabled'}>Fahren</button>`;
    d.querySelector('button').onclick=()=>startDrive(r);el.appendChild(d)});
}
