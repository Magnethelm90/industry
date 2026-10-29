/* Untergrund: Schwarzproduktion, Polizei, Versteck, Hehler, Gang */
import {render} from '../app.js';
import {FENCES,G,GK,ST,UNL} from '../data.js';
import {runStation} from './workshop.js';
import {SFX,fx,toast,tone,vib} from '../fx.js';
import {gTiming} from '../games/timing.js';
import {S,cap,isOpen,lvl,unl} from '../state.js';
import {OV,addSec,closeOv,openOv} from '../ui.js';
import {$,fmt,fmtT,ic,nameColor,pick} from '../util.js';

export const illGoods=()=>GK.filter(g=>G[g].illegal);
export const illLager=()=>illGoods().filter(g=>S.stock[g]>=1);
export const stashUsed=()=>Object.values(S.ug.stash).reduce((a,b)=>a+b,0);
export const stashCap=()=>20*S.ug.slvl,stashCost=()=>Math.ceil(600*Math.pow(2,S.ug.slvl-1));
export const heatTier=()=>S.ug.heat>=75?'Fahndung':S.ug.heat>=50?'Im Visier':S.ug.heat>=25?'Beobachtet':'Unauffällig';
export const bribeCost=()=>Math.ceil(100+S.ug.heat*20);
export function hideG(g,n){const k=Math.min(n,Math.floor(S.stock[g]),stashCap()-stashUsed());if(k<=0)return 0;S.stock[g]-=k;S.ug.stash[g]=(S.ug.stash[g]||0)+k;return k}
export function unhideG(g,n){const k=Math.min(n,S.ug.stash[g]||0,Math.floor(cap()-S.stock[g]));if(k<=0)return 0;S.ug.stash[g]-=k;S.stock[g]+=k;return k}
export function genFences(){
  const pool=illGoods().filter(g=>(G[g].lv||1)<=lvl());if(!pool.length)return;
  S.ug.fences=[0,1,2].map(()=>({n:pick(FENCES),g:pick(pool),m:+(1.2+Math.random()*1.1).toFixed(2),risk:1+Math.floor(Math.random()*3)}));
  S.ug.fenceAt=Date.now()+10*60000;
}
export function fenceSell(f,e){
  const have=Math.floor(S.stock[f.g])+(S.ug.stash[f.g]||0);if(!have){SFX.err();toast('Du hast keine '+G[f.g].n);return}
  const n=Math.min(have,10);let k=0;
  while(k<n&&S.stock[f.g]>=1){S.stock[f.g]--;k++}
  while(k<n&&(S.ug.stash[f.g]||0)>0){S.ug.stash[f.g]--;k++}
  const pay=Math.round(k*G[f.g].base*f.m);S.money+=pay;S.xp+=Math.ceil(pay/15);S.ug.heat=Math.min(100,S.ug.heat+k*.6*f.risk);
  SFX.coin();vib(15);fx('+'+fmt(pay)+' Cr','#a3e635',e.clientX,e.clientY-30);
  if(Math.random()<f.risk*.04){toast('🚨 '+f.n+' war ein Spitzel! Die Polizei kommt!');setTimeout(()=>{if(!OV)raid()},1200)}
  render();
}
export function siren(ov){let i=0;const iv=setInterval(()=>{if(!ov.alive){clearInterval(iv);return}tone(i++%2?660:880,.28,'square',.035)},300)}
export function raid(){
  if(OV)return;S.ug.nextRaid=Date.now()+90000;
  const ov=openOv(`<h3 style="color:#fb7185">🚨 RAZZIA!</h3><div class="sub">Die Polizei steht vor der Tür! Tippe deine Schmuggelware an, um sie ins Versteck zu schaffen. Was liegen bleibt, wird beschlagnahmt.</div><div class="msg" id="m">6</div><div id="rl"></div><div class="timer"><i id="tm" style="width:100%"></i></div>`);
  $('ovbox').classList.add('alarm');siren(ov);vib([200,100,200]);
  const draw=()=>{const rl=$('rl');if(!rl)return;rl.innerHTML='';
    const list=illLager();if(!list.length){rl.innerHTML='<p class="sub" style="text-align:center">Nichts mehr im Lager – alles versteckt! 😎</p>';return}
    list.forEach(g=>{const b=document.createElement('button');b.className='card raidc';b.style.setProperty('--c',G[g].c);
      b.innerHTML=`<div class="art" style="width:46px;height:46px;flex-basis:46px">${ic(g,34)}</div><div class="i">${Math.floor(S.stock[g])}× ${G[g].n}<small>Versteck: ${stashUsed()} / ${stashCap()}</small></div><b>Verstecken ›</b>`;
      b.onclick=()=>{const k=hideG(g,1e9);if(k){SFX.good();vib(15)}else{SFX.err();toast('Dein Versteck ist voll!')}draw()};rl.appendChild(b)})};
  draw();const t0=performance.now(),D=6000;
  (function loop(){
    if(!ov.alive)return;const l=1-(performance.now()-t0)/D;$('tm').style.width=Math.max(0,l*100)+'%';$('m').textContent=Math.max(0,Math.ceil(l*6))+' s';
    if(l>0)return requestAnimationFrame(loop);
    const left=illLager();let val=0;left.forEach(g=>{val+=Math.floor(S.stock[g])*G[g].base;S.stock[g]=0});
    const fine=Math.min(S.money,Math.round(val*.5));S.money-=fine;S.ug.heat=Math.max(0,S.ug.heat-(left.length?25:10));
    $('ovbox').classList.remove('alarm');ov.alive=false;
    if(left.length){SFX.crash();vib([100,50,100])}else SFX.win();
    openOv(`<h3>${left.length?'🚔 Erwischt!':'😎 Nichts gefunden'}</h3><p class="sub">${left.length?'Beschlagnahmt: Ware im Wert von '+fmt(val)+' Cr. Strafe: '+fmt(fine)+' Cr.':'Die Polizei zieht ab. Glück gehabt – dein Verdacht sinkt etwas.'}</p><button class="btn big b" id="ok">Weiter</button>`);
    $('ok').onclick=closeOv})();
}
export function gangDemand(){
  const amt=Math.max(50,Math.min(3000,Math.round(S.money*.05)));
  openOv(`<h3>🐍 Die Kobras</h3><div class="sub">Drei Typen in Lederjacken stehen in deiner Halle. „Nettes Geschäft hast du da. Wäre schade, wenn deinem Versteck was passiert …"</div>
    <div class="card" style="--c:#fb7185"><div class="ava" style="background:#111827">🐍</div><div class="i">Schutzgeld<small>Zahlst du, lassen sie dich in Ruhe. Lehnst du ab, kommen sie wieder.</small></div><b class="num" style="color:var(--gold)">${fmt(amt)} Cr</b></div>
    <div class="col"><button class="btn" id="pay" ${S.money<amt?'disabled':''}>Zahlen</button><button class="btn r" id="no">Ablehnen</button></div>`);
  $('pay').onclick=()=>{S.money-=amt;S.ug.gang=0;SFX.coin();toast('Die Kobras ziehen zufrieden ab.');closeOv()};
  $('no').onclick=()=>{S.ug.gang++;S.ug.nextAttack=Date.now()+60000+Math.random()*60000;SFX.err();toast('„Das wirst du bereuen …"');closeOv()};
}
export async function gangAttack(){
  S.ug.nextAttack=0;
  if(!stashUsed()){toast('🐍 Die Kobras haben dein Versteck durchwühlt – aber es war leer.');return}
  const sc=await gTiming(4,'🐍 Überfall aufs Versteck!','Die Kobras brechen ein! Triff die Zone, um sie zu vertreiben.');
  if(sc==null){const ks=Object.keys(S.ug.stash);ks.forEach(g=>S.ug.stash[g]=Math.floor(S.ug.stash[g]*.6));toast('Du bist weggelaufen – die Kobras haben 40 % deines Verstecks geklaut.');return}
  closeOv();
  if(sc>=.6){S.ug.gang=Math.max(0,S.ug.gang-1);SFX.win();toast('💪 Abgewehrt! Die Kobras ziehen sich zurück.')}
  else{let lost=0;Object.keys(S.ug.stash).forEach(g=>{const k=Math.ceil(S.ug.stash[g]*.4);S.ug.stash[g]-=k;lost+=k});SFX.crash();toast('Die Kobras haben '+lost+' Teile aus deinem Versteck geklaut!')}
  render();
}
export function tickUnder(dt){
  const u=S.ug,now=Date.now();u.heat=Math.max(0,u.heat-.04*dt);
  if(!isOpen('under'))return;
  if(!u.fences||now>u.fenceAt)genFences();
  if(OV)return;
  const exposed=illLager().length>0;
  if((exposed||u.heat>50)&&now>u.nextRaid){u.nextRaid=now+20000;if(Math.random()<u.heat/100*.18+(exposed?.04:0))return raid()}
  if(u.active&&now>u.nextGang){if(u.nextGang)gangDemand();u.nextGang=now+(4+Math.random()*3)*60000;return}
  if(u.nextAttack&&now>u.nextAttack)gangAttack();
}
export function renderUnder(){
  const el=$('s-under'),u=S.ug;
  el.innerHTML='<h2>Untergrund</h2><p class="sub">Schmuggelware bringt das große Geld – aber die Polizei und die Kobras schauen zu. Lagere heiße Ware im Versteck, nicht im normalen Lager!</p>';
  if(!isOpen('under')){el.insertAdjacentHTML('beforeend',`<div class="card idle" style="--c:#fb7185"><div class="art"><span style="font-size:30px">🔒</span></div><div class="i">Noch zu unbekannt<small>Ab Level ${UNL.under.lv} nimmt dich die Unterwelt ernst.</small></div></div>`);return}
  const hc=u.heat>=75?'var(--g4)':u.heat>=50?'linear-gradient(90deg,#f97316,#fb7185)':u.heat>=25?'var(--g2)':'var(--g3)';
  const h=document.createElement('div');h.className='card';h.style.setProperty('--c','#fb7185');
  h.innerHTML=`<div class="art"><span style="font-size:30px">🚔</span></div><div class="i">Polizei-Verdacht: ${heatTier()} <span class="chip num">${Math.round(u.heat)} %</span><div class="meter"><i style="width:${u.heat}%;background:${hc}"></i></div><small>Steigt durch Herstellen und Verkaufen. Sinkt langsam von selbst.</small></div><button class="btn ghost" ${S.money<bribeCost()||u.heat<5?'disabled':''}>Bestechen<br>${fmt(bribeCost())}</button>`;
  h.querySelector('button').onclick=()=>{const c=bribeCost();if(S.money<c)return;S.money-=c;u.heat=Math.max(0,u.heat-25);SFX.coin();toast('Ein Beamter schaut ab jetzt weg … Verdacht −25');render()};
  el.appendChild(h);
  if(u.gang)el.insertAdjacentHTML('beforeend',`<div class="card broken" style="--c:#fb7185"><div class="ava" style="background:#111827">🐍</div><div class="i">Die Kobras sind sauer<small>Du hast Schutzgeld verweigert. Rechne mit einem Überfall auf dein Versteck.</small></div></div>`);
  addSec(el,'Schwarzproduktion');
  ST.filter(s=>s.grp==='ill').forEach(s=>{
    const locked=s.lv>lvl(),need=Object.keys(s.in).map(k=>`<span class="${S.stock[k]>=s.in[k]?'up':'dn'}">${s.in[k]}× ${G[k].n} (${Math.floor(S.stock[k])})</span>`).join(' · ');
    const d=document.createElement('div');d.className='card'+(locked?' idle':'');d.style.setProperty('--c',G[s.out].c);
    d.innerHTML=`<div class="art">${ic(s.out,42)}</div><div class="i">${s.n}<small>Braucht ${need} · Verdacht +${s.heat}</small></div>`+(locked?`<button class="btn ghost" disabled>🔒 Lv ${s.lv}</button>`:`<button class="btn ${Object.keys(s.in).every(k=>S.stock[k]>=s.in[k])?'':'ghost'}">Spielen</button>`);
    if(!locked)d.querySelector('button').onclick=()=>runStation(s);el.appendChild(d)});
  addSec(el,'Versteck · '+stashUsed()+' / '+stashCap());
  const sc=stashCost(),sb=document.createElement('div');sb.className='card';sb.style.setProperty('--c','#a3e635');
  sb.innerHTML=`<div class="art"><span style="font-size:30px">🗄️</span></div><div class="i">Geheimes Versteck<small>Die Polizei findet hier nichts – aber die Kobras könnten einbrechen.</small></div><button class="btn ghost" ${S.money<sc||u.slvl>=6?'disabled':''}>${u.slvl>=6?'MAX':'+20 Platz<br>'+fmt(sc)}</button>`;
  sb.querySelector('button').onclick=()=>{if(S.money<sc||u.slvl>=6)return;S.money-=sc;u.slvl++;SFX.buy();render()};el.appendChild(sb);
  illGoods().filter(g=>unl(g)||S.stock[g]>0||u.stash[g]).forEach(g=>{
    const inL=Math.floor(S.stock[g]),inS=u.stash[g]||0,d=document.createElement('div');d.className='card'+(inL?' broken':'');d.style.setProperty('--c',G[g].c);
    d.innerHTML=`<div class="art" style="width:46px;height:46px;flex-basis:46px">${ic(g,34)}</div><div class="i">${G[g].n}<small>${inL?'<span class="dn">⚠️ Lager: '+inL+' (gefährdet!)</span>':'Lager: 0'} · Versteck: ${inS}</small></div><div class="col"><button class="btn" ${inL?'':'disabled'}>Verstecken</button><button class="btn ghost" ${inS?'':'disabled'}>Holen</button></div>`;
    const [a,b]=d.querySelectorAll('button');a.onclick=()=>{const k=hideG(g,1e9);if(!k){SFX.err();toast('Versteck ist voll!')}else SFX.good();render()};b.onclick=()=>{unhideG(g,1e9);SFX.tick();render()};
    el.appendChild(d)});
  addSec(el,'Hehler · neue Kontakte in '+fmtT(u.fenceAt-Date.now()));
  (u.fences||[]).forEach(f=>{const have=Math.floor(S.stock[f.g])+(u.stash[f.g]||0),d=document.createElement('div');d.className='card';d.style.setProperty('--c','#a3e635');
    d.innerHTML=`<div class="ava" style="background:${nameColor(f.n)}">${f.n.split(' ').pop()[0]}</div><div class="i">${f.n}<small>Kauft ${G[f.g].n} für <b style="color:var(--gold)">${Math.round(G[f.g].base*f.m)} Cr</b>/Stk · Risiko ${'🔥'.repeat(f.risk)}</small><small>Du hast: ${have}</small></div><button class="btn" ${have?'':'disabled'}>Verkaufen</button>`;
    d.querySelector('button').onclick=e=>fenceSell(f,e);el.appendChild(d)});
}
