/* Farm, Fischerei und Reifekeller */
import {render} from '../app.js';
import {AGE,CROPS,G} from '../data.js';
import {SFX,burst,fx,toast,tone,vib} from '../fx.js';
import {gFish} from '../games/fish.js';
import {S,cap,track,unl} from '../state.js';
import {addSec,bindX,closeOv,openOv,xbtn} from '../ui.js';
import {$,fmt,fmtT,ic,pick} from '../util.js';
import {SEASONS,season,weather,wxIs} from '../world.js';

export const plotCost=()=>Math.ceil(150*Math.pow(1.6,S.farm.plots.length-4));
export const cellarCost=()=>Math.ceil(800*Math.pow(1.8,S.cellar.n-2));
// Bewässerung, Jahreszeit und (falls eingeschaltet) Wetter
export const growMult=()=>(1+.1*Math.max(0,S.up.sprinkler-1))*SEASONS[season()].grow*(weather()?.grow||1);
export const waterPlot=p=>{p.w=CROPS[p.c].grow*.6};
export const emptyPlot=()=>({c:null,p:0,w:0,pest:0,half:0,ready:0});
export function tickFarm(dt){
  const now=Date.now();
  S.farm.plots.forEach((p,i)=>{
    if(!p.c||p.ready)return;
    if((S.up.sprinkler>0||wxIs('rain'))&&p.w<=0)waterPlot(p); // Regen gießt mit
    if(p.w>0){p.p+=dt*growMult()/CROPS[p.c].grow;p.w=Math.max(0,p.w-dt);if(p.p>=1){p.p=1;p.ready=1;p.pest=0}}
    if(p.pest&&now>p.pest){p.pest=0;p.half=1;toast('🐛 Schädlinge haben Feld '+(i+1)+' angefressen – nur halbe Ernte!');SFX.miss()}
  });
  if(now>S.farm.nextPest){S.farm.nextPest=now+30000+Math.random()*40000;
    const g=S.farm.plots.filter(p=>p.c&&!p.ready&&!p.pest);
    if(g.length){pick(g).pest=now+12000;toast('🐛 Schädlinge auf deinem Feld! Schnell zur Farm!');SFX.err();vib([40,30,40])}}
}
export function offlineFarm(dt){
  S.farm.plots.forEach(p=>{if(!p.c||p.ready)return;const t=S.up.sprinkler>0?dt:Math.min(dt,p.w);
    p.p=Math.min(1,p.p+t*growMult()/CROPS[p.c].grow);p.w=Math.max(0,p.w-dt);p.pest=0;if(p.p>=1)p.ready=1});
}
export function pickCrop(i){
  openOv(xbtn()+`<h3>Feld ${i+1} bestellen</h3><div class="sub">Saatgut kostet Credits. Nach dem Säen musst du gießen, sonst wächst nichts.</div>`+
    Object.keys(CROPS).map(k=>{const c=CROPS[k],lk=!unl(k);return `<div class="card ${lk?'idle':''}" style="--c:${G[k].c}"><div class="art">${ic(k,40)}</div><div class="i">${G[k].n}<small>${lk?'🔒 ab Level '+G[k].lv:'Wächst '+Math.round(c.grow/growMult())+' s · Ernte '+c.yield+'× · Saat '+c.seed+' Cr'}</small></div><button class="btn" data-k="${k}" ${lk||S.money<c.seed?'disabled':''}>Säen</button></div>`}).join(''));
  bindX();
  document.querySelectorAll('#ovbox [data-k]').forEach(b=>b.onclick=e=>{const k=b.dataset.k,c=CROPS[k],p=S.farm.plots[i];if(S.money<c.seed)return;
    S.money-=c.seed;Object.assign(p,emptyPlot(),{c:k});waterPlot(p);SFX.buy();vib(12);closeOv()});
}
export function harvest(i,e){
  const p=S.farm.plots[i];if(!p.ready)return;
  let n=Math.round(CROPS[p.c].yield*(p.half?.5:1)*(1+.25*S.up.tractor)*(1+SEASONS[season()].crop));n=Math.max(0,Math.min(n,Math.floor(cap()-S.stock[p.c])));
  S.stock[p.c]+=n;S.xp+=n+2;track('harvest');SFX.good();vib(15);burst(e.clientX,e.clientY,G[p.c].c,14);fx('+'+n+' '+G[p.c].n,G[p.c].c,e.clientX,e.clientY-30);
  Object.assign(p,emptyPlot());render();
}
export async function goFish(){
  const r=await gFish();if(!r)return;closeOv();
  const ks=Object.keys(r);if(!ks.length){toast('Heute beißt nichts … versuch es nochmal!');return}
  ks.forEach(g=>{S.stock[g]=Math.min(cap(),S.stock[g]+r[g]);S.xp+=r[g]*2});track('fish');
  fx(ks.map(g=>'+'+r[g]+' '+G[g].n).join(' · '),'#93c5fd');toast('Fang: '+ks.map(g=>r[g]+'× '+G[g].n).join(', '));render();
}
export function cellarPut(){
  const ok=Object.keys(AGE).filter(g=>unl(g)&&S.stock[g]>=1);
  openOv(xbtn()+`<h3>Fass befüllen</h3><div class="sub">Bis zu 5 Stück reifen in einem Fass zu einer edlen Ware – das dauert, lohnt sich aber.</div>`+
    (ok.length?ok.map(g=>{const a=AGE[g];return `<div class="card" style="--c:${G[a.to].c}"><div class="art">${ic(a.to,40)}</div><div class="i">${G[g].n} → ${G[a.to].n}<small>Reift ${Math.round(a.t/60)} min · Wert ${G[g].base} → ${G[a.to].base} Cr · Lager ${Math.floor(S.stock[g])}</small></div><button class="btn" data-g="${g}">Einlagern</button></div>`}).join('')
      :'<p class="sub">Du brauchst Wein (Kelterei, ab Level 3) oder Käse (Käserei) im Lager.</p>'));
  bindX();
  document.querySelectorAll('#ovbox [data-g]').forEach(b=>b.onclick=()=>{const g=b.dataset.g,n=Math.min(5,Math.floor(S.stock[g]));if(!n||S.cellar.items.length>=S.cellar.n)return;
    S.stock[g]-=n;S.cellar.items.push({g,to:AGE[g].to,n,end:Date.now()+AGE[g].t*1000,dur:AGE[g].t});SFX.buy();closeOv()});
}
export function cellarTake(it,e){
  if(Date.now()<it.end)return;S.cellar.items=S.cellar.items.filter(x=>x!==it);
  S.stock[it.to]=Math.min(cap(),S.stock[it.to]+it.n);S.xp+=it.n*8;SFX.win();burst(e.clientX,e.clientY,G[it.to].c,18);fx('+'+it.n+' '+G[it.to].n,G[it.to].c,e.clientX,e.clientY-30);render();
}
export function renderFarm(){
  const el=$('s-farm'),now=Date.now();
  el.innerHTML='<h2>Farm & Meer</h2><p class="sub">Säen, gießen, ernten. Pflanzen wachsen nur mit Wasser – und vertreib die Schädlinge! Am Steg kannst du angeln, im Keller reifen edle Waren.</p>';
  const se=SEASONS[season()],wx=weather();
  el.insertAdjacentHTML('beforeend',`<div class="worldline"><span>${se.e} ${se.n}: ${se.d}</span>${wx?`<span>${wx.e} ${wx.n} in ${wx.city}: ${wx.d}</span>`:''}</div>`);
  addSec(el,'Felder · '+S.farm.plots.length+' / 12'+(S.up.sprinkler?' · 💧 Bewässerung aktiv':'')+(wx?.k==='rain'&&!S.up.sprinkler?' · 🌧️ Regen gießt':''));
  const grid=document.createElement('div');grid.className='plots';
  S.farm.plots.forEach((p,i)=>{
    const b=document.createElement('button'),c=p.c&&CROPS[p.c],dry=p.c&&!p.ready&&p.w<=0;
    b.className='plot'+(p.ready?' ready':'')+(p.pest?' pest':'')+(dry?' dry':'');
    if(!p.c){b.innerHTML='<span class="pl">+ Säen</span>';b.onclick=()=>pickCrop(i)}
    else{
      const left=(1-p.p)*c.grow/growMult()*1000;
      b.innerHTML=`<div class="crop" style="transform:scale(${(.35+.65*p.p).toFixed(2)})">${ic(p.c,50)}</div>${p.pest?'<div class="bug">🐛</div>':''}<div class="pbar"><i style="width:${p.p*100}%"></i></div>${p.ready?'':`<div class="wbar"><i style="width:${Math.min(100,p.w/(c.grow*.6)*100)}%"></i></div>`}<span class="pl">${p.ready?'Ernten!':p.pest?'Schädlinge!':dry?'💧 Gießen!':fmtT(left)}</span>`;
      b.onclick=e=>{
        if(p.ready)return harvest(i,e);
        if(p.pest){p.pest=0;SFX.good();vib(15);burst(e.clientX,e.clientY,'#84cc16',12);fx('Erwischt!','#84cc16',e.clientX,e.clientY-30);return render()}
        if(p.w<c.grow*.3){waterPlot(p);tone(500,.08,'sine',.05);burst(e.clientX,e.clientY,'#38bdf8',12);return render()}
        SFX.tick()}}
    grid.appendChild(b)});
  if(S.farm.plots.length<12){const b=document.createElement('button'),cost=plotCost();b.className='plot buy';b.disabled=S.money<cost;
    b.innerHTML=`<span class="pl">+ Feld<br>${fmt(cost)} Cr</span>`;b.onclick=e=>{if(S.money<cost)return;S.money-=cost;S.farm.plots.push(emptyPlot());SFX.buy();burst(e.clientX,e.clientY,'#84cc16',14);render()};grid.appendChild(b)}
  el.appendChild(grid);
  addSec(el,'Fischerei');
  const f=document.createElement('div');f.className='card';f.style.setProperty('--c','#38bdf8');
  f.innerHTML=`<div class="art">${ic('lachs',42)}</div><div class="i">Am Steg angeln<small>3 Würfe pro Ausflug · Hering, Lachs${unl('thunfisch')?', Thunfisch':''} und selten Hummer. Eine bessere Angelrute lockt seltene Fische.</small></div><button class="btn b">Angeln</button>`;
  f.querySelector('button').onclick=goFish;el.appendChild(f);
  addSec(el,'Reifekeller · '+S.cellar.items.length+' / '+S.cellar.n+' Fässer');
  S.cellar.items.forEach(it=>{const d=document.createElement('div'),left=it.end-now,ready=left<=0;d.className='card';d.style.setProperty('--c',G[it.to].c);
    d.innerHTML=`<div class="art">${ic(it.to,42)}</div><div class="i">${it.n}× ${G[it.g].n} → ${G[it.to].n}<div class="meter" style="height:6px"><i style="width:${Math.min(100,(1-left/(it.dur*1000))*100)}%;background:${G[it.to].c}"></i></div><small>${ready?'Fertig gereift!':'Noch '+fmtT(left)}</small></div><button class="btn" ${ready?'':'disabled'}>Entnehmen</button>`;
    d.querySelector('button').onclick=e=>cellarTake(it,e);el.appendChild(d)});
  const ce=document.createElement('div');ce.className='card';ce.style.setProperty('--c','#7e22ce');const cc=cellarCost(),full=S.cellar.items.length>=S.cellar.n;
  ce.innerHTML=`<div class="art"><span style="font-size:30px">🛢️</span></div><div class="i">Veredeln im Fass<small>Wein → Jahrgangswein, Käse → Bergkäse. Läuft auch weiter, wenn die App zu ist.</small></div><div class="col"><button class="btn" ${full?'disabled':''}>Einlagern</button><button class="btn ghost" ${S.money<cc||S.cellar.n>=6?'disabled':''}>${S.cellar.n>=6?'MAX':'+ Fass '+fmt(cc)}</button></div>`;
  const [put,more]=ce.querySelectorAll('button');put.onclick=cellarPut;more.onclick=()=>{if(S.money<cc||S.cellar.n>=6)return;S.money-=cc;S.cellar.n++;SFX.buy();render()};
  el.appendChild(ce);
}
