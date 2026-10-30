/* Einstieg: Spiel starten, Hintergrund-Takt, Speichern */
import './style.css';
import sprite from './icons.svg?raw';
import {badges,cur,go,render,startHud,tradeSub} from './app.js';
import {G,GK,RIVALS,SAVE} from './data.js';
import {offlineB,tickB} from './features/buildings.js';
import {tickExport} from './features/export.js';
import {offlineFarm,tickFarm} from './features/farm.js';
import {tickOrders} from './features/orders.js';
import {freeRivals,tickRivals} from './features/rivals.js';
import {initMusic,startMusic,stopMusic} from './music.js';
import {dayPhase,refreshLive} from './world.js';
import {offlineShop,syncSlots,tickShop} from './features/shop.js';
import {tickUnder} from './features/under.js';
import {initGoals,tickGoals} from './features/goals.js';
import {tickLab} from './features/lab.js';
import {openCompany} from './features/company.js';
import {SFX,toast} from './fx.js';
import {GKU,S,mood,price,sat,saveLocked} from './state.js';
import {OV} from './ui.js';
import {$,fmt,ic,initIcons,pick} from './util.js';

document.body.insertAdjacentHTML('afterbegin',sprite);
initIcons();
document.querySelectorAll('[data-ic]').forEach(e=>e.outerHTML=ic(e.dataset.ic,+e.dataset.s));
$('snd').onclick=()=>{S.mute=!S.mute;$('snd').textContent=S.mute?'🔇':'🔊';if(S.mute)stopMusic();else{SFX.good();startMusic()}};
initMusic();
$('snd').textContent=S.mute?'🔇':'🔊';
if(!S.rivals)S.rivals=RIVALS.map(r=>({...r}));
syncSlots();
initGoals();
$('lvpill').onclick=openCompany;
(function(){const dt=Math.min((Date.now()-S.last)/1000,8*3600);if(dt<30)return;
  offlineB(dt);tickRivals(dt);offlineFarm(dt);S.ug.heat=Math.max(0,S.ug.heat-.04*dt);const s=offlineShop(dt);
  if(s>0)setTimeout(()=>toast('Dein Laden hat in deiner Abwesenheit für '+fmt(s)+' Credits verkauft.'),4200)})();
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.s==='trade'?tradeSub:b.dataset.s));
// Markt: Preise ziehen langsam (±3–4 %, Trends über Minuten); Boom/Crash alle 2,5–4 min, 1 min lang, mit weichem Übergang
const EV_GAP=[150000,240000],EV_LEN=60000;
let nextEv=Date.now()+90000,histT=0,pressing=false;const evOn={};
addEventListener('pointerdown',()=>pressing=true,true);
addEventListener('pointerup',()=>pressing=false,true);
addEventListener('pointercancel',()=>pressing=false,true);
setInterval(()=>{
  const dt=1;
  tickB(dt);
  const now=Date.now();
  GK.forEach(g=>{sat[g]*=Math.exp(-dt/45);const e=evOn[g];
    if(e&&now>=e.until)evOn[g]=e.to===1?null:{to:1,until:now+12000}; // nach dem Ereignis 12 s zurückgleiten
    const f=evOn[g];if(f)mood[g]+=(f.to-mood[g])*0.25; // in gut 4 s auf das Ziel
    else mood[g]+=(1-mood[g])*0.002+(Math.random()-0.5)*0.008; // sonst langsamer Trend
    mood[g]=Math.max(0.35,mood[g])});
  if((histT+=dt)>=10){histT=0;GK.forEach(g=>{S.hist[g].push(price(g));if(S.hist[g].length>30)S.hist[g].shift()})}
  if(now>nextEv){nextEv=now+EV_GAP[0]+Math.random()*(EV_GAP[1]-EV_GAP[0]);
    const gl=GKU().filter(g=>!evOn[g]),g=gl[Math.floor(Math.random()*gl.length)],up=Math.random()<0.6;
    if(g){evOn[g]={to:up?2.2:0.45,until:now+EV_LEN};
      const rv=pick(freeRivals()).n;
      toast(up?`🔥 ${rv} kauft ${G[g].n} auf – 1 Minute lang hohe Preise!`:`❄️ ${rv} überschwemmt den Markt mit ${G[g].n} – 1 Minute Preissturz!`);SFX.coin()}}
  tickLab();tickOrders();tickShop(dt);tickRivals(dt);tickFarm(dt);tickExport();tickUnder(dt);tickGoals();
  if(!OV&&!pressing&&cur!=='work')render();else badges();
  if(!saveLocked()){S.last=Date.now();try{localStorage.setItem(SAVE,JSON.stringify(S))}catch(e){}}
},1000);
// Nur für automatische Tests: ?debug macht alle Modul-Exporte im Browser sichtbar
if(/[?&]debug/.test(location.search)){
  const mods=import.meta.glob(['./**/*.js','!./main.js'],{eager:true});
  for(const m of Object.values(mods))for(const k in m)try{Object.defineProperty(window,k,{get:()=>m[k],configurable:true})}catch(e){}
}
// Als App installierbar und offline spielbar – nur dort, wo das Manifest mitkommt (nicht in der Einzeldatei-Vorschau)
if('serviceWorker' in navigator&&document.querySelector('link[rel="manifest"]')&&/^https?:$/.test(location.protocol))
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
// Tageszeit fürs Aussehen der Szenen; Live-Daten beim Start und alle 10 Minuten (nur wenn eingeschaltet)
const setPhase=()=>{const p=dayPhase();if(document.body.dataset.time!==p)document.body.dataset.time=p};
setPhase();setInterval(setPhase,60000);
refreshLive().then(()=>render());setInterval(()=>refreshLive().then(()=>{if(!OV)render()}),10*60000);
startHud();
render();
if(S.goal===0&&!S.st.make.erz)toast('Willkommen! Oben steht dein erstes Ziel.');
