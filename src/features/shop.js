/* Eigener Laden mit Regalen, Feilschen und Ladendieben */
import {cur,render} from '../app.js';
import {G,GK,SHOP_NAMES} from '../data.js';
import {SFX,burst,fx,toast,vib} from '../fx.js';
import {GKU,S,price,sat} from '../state.js';
import {OV,addSec,bindX,closeOv,openOv,xbtn} from '../ui.js';
import {$,fmt,ic,nameColor,pick} from '../util.js';

export let custQ=[],shopT=0;
export const shopSlots=()=>Math.min(8,1+S.shop.lvl);
export const shopCost=()=>Math.ceil(400*Math.pow(2,S.shop.lvl));
export const buyChance=pct=>Math.max(.03,Math.min(.97,1.85-pct/100));
export const priceLabel=pct=>pct<=85?'Schnäppchen':pct<=110?'Fair':pct<=140?'Teuer':'Wucher';
export function syncSlots(){while(S.shop.slots.length<shopSlots())S.shop.slots.push({g:null,qty:0,pct:110})}
export function shopSell(s,n,pct){
  const k=Math.min(n,s.qty);if(k<=0)return 0;let sum=0;
  for(let i=0;i<k;i++){sum+=price(s.g)*pct/100;sat[s.g]+=1}
  s.qty-=k;S.money+=sum;S.xp+=Math.ceil(sum/15);S.shop.sold+=k;S.shop.earned+=sum;return sum;
}
export function tickShop(dt){
  const now=Date.now();
  custQ=custQ.filter(c=>{
    if(now<c.until)return true;
    if(c.type==='thief'){const s=S.shop.slots[c.slot];if(s&&s.qty){const k=Math.min(3,s.qty);s.qty-=k;S.rep=Math.max(0,S.rep-1);toast('🚨 Der Dieb ist mit '+k+'× '+G[s.g].n+' entkommen!');SFX.crash()}}
    return false});
  const filled=S.shop.slots.map((s,i)=>i).filter(i=>S.shop.slots[i].g&&S.shop.slots[i].qty>0);
  if(!filled.length)return;
  shopT+=dt;if(shopT<Math.max(2.5,9-S.shop.lvl*.6-S.rep/25))return;shopT=0;
  const i=pick(filled),s=S.shop.slots[i],name=pick(SHOP_NAMES),r=Math.random();
  if(r<.05&&!custQ.some(c=>c.type==='thief')){custQ.push({id:S.oid++,type:'thief',name,slot:i,until:now+5000});toast('🚨 Ladendieb im Laden! Schnell hin!');SFX.crash();vib([80,40,80]);return}
  if(r<.27&&custQ.length<3){const qty=Math.min(s.qty,1+Math.floor(Math.random()*(G[s.g].base<30?5:2)));
    custQ.push({id:S.oid++,type:'haggle',name,slot:i,qty,offer:Math.round(s.pct*(.72+Math.random()*.16)),until:now+15000});SFX.coin();return}
  if(Math.random()<buyChance(s.pct)){const sum=shopSell(s,G[s.g].base<30?1+Math.floor(Math.random()*3):1,s.pct);if(cur==='shop'&&!OV)fx('+'+fmt(sum)+' Cr','#fbbf24',innerWidth/2,innerHeight*.3)}
  else S.shop.walked++;
}
export function haggle(c,act,e){
  const s=S.shop.slots[c.slot];custQ=custQ.filter(x=>x!==c);
  if(!s||!s.g||!s.qty){render();return}
  if(act==='yes'){const sum=shopSell(s,c.qty,c.offer);SFX.coin();fx('+'+fmt(sum)+' Cr','#fbbf24',e.clientX,e.clientY-30)}
  else if(act==='counter'){
    const mid=Math.round((c.offer+s.pct)/2);
    if(Math.random()<.5+S.rep/400){const sum=shopSell(s,c.qty,mid);SFX.win();vib(20);fx('Deal! +'+fmt(sum),'#34d399',e.clientX,e.clientY-30)}
    else{SFX.miss();toast(c.name+' ist beleidigt gegangen.')}}
  else SFX.tick();
  render();
}
export function stopThief(c,e){
  custQ=custQ.filter(x=>x!==c);S.money+=25;S.rep=Math.min(100,S.rep+1);
  SFX.win();vib(30);burst(e.clientX,e.clientY,'#34d399',18);fx('Gefasst! +25','#34d399',e.clientX,e.clientY-30);render();
}
export function editSlot(i){
  const s=S.shop.slots[i];
  const draw=()=>{
    const goods=GKU().filter(g=>S.stock[g]>=1||g===s.g);
    openOv(xbtn()+`<h3>Regal ${i+1}</h3><div class="sub">Räume Ware aus dem Lager ein und setz deinen Preis. Je günstiger, desto mehr Kunden kaufen.</div>
     <div class="pick">${goods.map(g=>`<button class="pk ${g===s.g?'on':''}" data-g="${g}">${ic(g,28)}<span>${G[g].n}</span><small class="num">${Math.floor(S.stock[g])}</small></button>`).join('')||'<p class="sub">Dein Lager ist leer. Stell erst etwas her.</p>'}</div>
     ${s.g?`<div class="card" style="--c:${G[s.g].c}"><div class="i">Im Regal: <b class="num">${s.qty}</b> / 50<small>Im Lager: ${Math.floor(S.stock[s.g])}</small></div><div class="step"><button data-q="-10">−10</button><button data-q="-1">−</button><button data-q="1">+</button><button data-q="50" style="width:46px;font-size:11px">MAX</button></div></div>
     <div class="card" style="--c:#fbbf24"><div class="i">Preis <b class="num">${(price(s.g)*s.pct/100).toFixed(1)}</b> / Stk<small>${s.pct} % vom Marktpreis · ${priceLabel(s.pct)} · Kaufchance ${Math.round(buyChance(s.pct)*100)} %</small></div><div class="step"><button data-p="-10">−</button><button data-p="10">+</button></div></div>
     <button class="btn ghost" id="clr" style="width:100%;margin-bottom:8px">Regal leeren</button>`:''}
     <button class="btn big b" id="done">Fertig</button>`);
    bindX();
    document.querySelectorAll('.pk').forEach(b=>b.onclick=()=>{const g=b.dataset.g;if(g===s.g)return;if(s.g)S.stock[s.g]+=s.qty;s.g=g;s.qty=0;SFX.tick();draw()});
    document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const d=+b.dataset.q,n=d>0?Math.min(d,Math.floor(S.stock[s.g]),50-s.qty):Math.max(d,-s.qty);if(!n)return;s.qty+=n;S.stock[s.g]-=n;SFX.tick();draw()});
    document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{s.pct=Math.max(50,Math.min(200,s.pct+(+b.dataset.p)));SFX.tick();draw()});
    const clr=$('clr');if(clr)clr.onclick=()=>{S.stock[s.g]+=s.qty;s.qty=0;s.g=null;SFX.tick();draw()};
    $('done').onclick=()=>{closeOv();render()};
  };
  draw();
}
export function offlineShop(dt){
  const filled=S.shop.slots.filter(s=>s.g&&s.qty>0);if(!filled.length)return 0;
  const n=Math.floor(dt/Math.max(2.5,9-S.shop.lvl*.6-S.rep/25)*.75)/filled.length;let sum=0;
  filled.forEach(s=>{sum+=shopSell(s,Math.round(n*buyChance(s.pct)*(G[s.g].base<30?2:1)),s.pct)});
  GK.forEach(g=>sat[g]=0);return sum;
}
export function renderShop(){
  syncSlots();const el=$('s-shop'),cost=shopCost(),max=shopSlots()>=8,now=Date.now();
  el.innerHTML=`<h2>Dein Laden</h2><p class="sub">Räum Ware in die Regale und setz eigene Preise. Kunden kaufen von allein. Manche wollen feilschen – und pass auf Ladendiebe auf!</p>
   <div class="card" style="--c:#e879f9"><div class="art">${ic('shop',42)}</div><div class="i">Laden Stufe ${S.shop.lvl} <span class="chip">${shopSlots()} Regale</span><small>${S.shop.sold} verkauft · Umsatz ${fmt(S.shop.earned)} Cr · ${S.shop.walked}× ohne Kauf gegangen</small></div><button class="btn a" id="shup" ${max||S.money<cost?'disabled':''}>${max?'MAX':'+ Regal<br>'+fmt(cost)}</button></div>`;
  $('shup').onclick=e=>{if(max||S.money<cost)return;S.money-=cost;S.shop.lvl++;syncSlots();SFX.buy();burst(e.clientX,e.clientY,'#e879f9',16);fx('Neues Regal!','#e879f9');render()};
  if(custQ.length){
    addSec(el,'Kunden im Laden');
    custQ.forEach(c=>{const s=S.shop.slots[c.slot];if(!s||!s.g)return;const d=document.createElement('div');d.className='card'+(c.type==='thief'?' broken':'');
      const f=(c.until-now)/(c.type==='thief'?5000:15000);d.style.setProperty('--c',c.type==='thief'?'#fb7185':'#fbbf24');
      if(c.type==='thief'){d.innerHTML=`<div class="ava" style="background:#111827">🦹</div><div class="i">Ladendieb!<small>Jemand steckt ${G[s.g].n} ein …</small><div class="meter" style="height:5px"><i style="width:${f*100}%;background:var(--g4)"></i></div></div><button class="btn r pulse">Stopp!</button>`;
        d.querySelector('button').onclick=e=>stopThief(c,e)}
      else{const mine=price(s.g)*s.pct/100,off=price(s.g)*c.offer/100;
        d.innerHTML=`<div class="ava" style="background:${nameColor(c.name)}">${c.name[0]}</div><div class="i">${c.name} will feilschen<small>${c.qty}× ${G[s.g].n} für <b style="color:var(--gold)">${off.toFixed(1)}</b> statt ${mine.toFixed(1)} / Stk</small><div class="meter" style="height:5px"><i style="width:${f*100}%;background:var(--g2)"></i></div></div><div class="col"><button class="btn">Deal</button><button class="btn b">Gegen&shy;angebot</button><button class="btn ghost">Nein</button></div>`;
        const [y,k,n]=d.querySelectorAll('button');y.onclick=e=>haggle(c,'yes',e);k.onclick=e=>haggle(c,'counter',e);n.onclick=e=>haggle(c,'no',e)}
      el.appendChild(d)});
  }
  addSec(el,'Regale');
  const grid=document.createElement('div');grid.className='shelves';
  S.shop.slots.slice(0,shopSlots()).forEach((s,i)=>{const b=document.createElement('button');
    if(!s.g){b.className='shelf empty';b.innerHTML='<span style="font-size:26px">+</span><small>Regal befüllen</small>'}
    else{b.className='shelf';b.style.setProperty('--c',G[s.g].c);
      b.innerHTML=`${ic(s.g,40)}<b>${G[s.g].n}</b><small class="num">${s.qty?s.qty+' Stk':'<span class="dn">Ausverkauft</span>'} · ${(price(s.g)*s.pct/100).toFixed(1)} Cr</small><small>${priceLabel(s.pct)} (${s.pct} %)</small>`}
    b.onclick=()=>editSlot(i);grid.appendChild(b)});
  el.appendChild(grid);
}
