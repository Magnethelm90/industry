/* Markt: direkt kaufen und verkaufen */
import {render} from '../app.js';
import {CATS,G,catOf} from '../data.js';
import {SFX,fx,toast,vib} from '../fx.js';
import {GKU,S,buyP,cap,labHas,mood,price,sat,sellP,track} from '../state.js';
import {$,fmt,ic} from '../util.js';
import {isWeekend} from '../world.js';

export function spark(g){const h=S.hist[g];if(h.length<2)return '';const mn=Math.min(...h),mx=Math.max(...h),r=mx-mn||1;
  const pts=h.map((v,i)=>[(i/(h.length-1)*84),(26-(v-mn)/r*22)]);const line=pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  return `<svg width="84" height="30" viewBox="0 0 84 30"><defs><linearGradient id="sf${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${G[g].c}" stop-opacity=".45"/><stop offset="1" stop-color="${G[g].c}" stop-opacity="0"/></linearGradient></defs><polygon points="0,30 ${line} 84,30" fill="url(#sf${g})"/><polyline points="${line}" fill="none" stroke="${G[g].c}" stroke-width="2" stroke-linejoin="round"/></svg>`}
export let mAmt=10;
export function mTrade(g,buy,e){
  let n=mAmt==='max'?1e9:mAmt,k=0,sum=0;
  if(buy){n=Math.min(n,Math.floor(cap()-S.stock[g]));while(k<n){const p=buyP(g);if(S.money<sum+p)break;sum+=p;sat[g]=Math.max(-45,sat[g]-1);k++}
    if(!k){SFX.err();toast(S.stock[g]>=cap()?'Lager für '+G[g].n+' ist voll':'Nicht genug Credits');return}
    S.money-=sum;S.stock[g]+=k;SFX.buy();fx('+'+k+' '+G[g].n,G[g].c,e.clientX,e.clientY-30)}
  else{n=Math.min(n,Math.floor(S.stock[g]));while(k<n){sum+=sellP(g);sat[g]+=1;k++}
    if(!k){SFX.err();return}
    S.stock[g]-=k;S.money+=sum;S.xp+=Math.ceil(sum/12);track('sold',null,k);SFX.coin();fx('+'+fmt(sum)+' Cr','#fbbf24',e.clientX,e.clientY-30)}
  vib(12);render();
}
export let mCat='alle';
export function renderMarket(){
  const el=$('s-market'),all=GKU();
  el.innerHTML=`<h2>Markt</h2><p class="sub">Ankauf +20 %, Verkauf −${labHas('markt')?20:25} %. Per LKW bekommst du den vollen Preis.</p>`+(isWeekend()?'<div class="worldline"><span>🛍️ Wochenendmarkt: Lebensmittel, Agrarwaren und Fisch sind 15 % mehr wert, Aufträge zahlen 20 % mehr.</span></div>':'');
  const cats=document.createElement('div');cats.className='cats';
  CATS.filter(([k])=>k==='alle'||all.some(g=>catOf(g)===k)).forEach(([k,n])=>{const b=document.createElement('button');b.className='chip2'+(k===mCat?' on':'');b.textContent=n;b.onclick=()=>{mCat=k;SFX.tick();render()};cats.appendChild(b)});
  el.appendChild(cats);
  const bar=document.createElement('div');bar.className='amt';
  [1,10,50,'max'].forEach(a=>{const b=document.createElement('button');b.className='chip2'+(a===mAmt?' on':'');b.textContent=a==='max'?'Max':'× '+a;b.onclick=()=>{mAmt=a;SFX.tick();render()};bar.appendChild(b)});
  el.appendChild(bar);
  all.filter(g=>mCat==='alle'||catOf(g)===mCat).forEach(g=>{const p=price(g),d=p/G[g].base,c=document.createElement('div');c.className='card mcard';c.style.setProperty('--c',G[g].c);
    const tag=mood[g]>1.8?'<span class="chip up">🔥 BOOM</span>':mood[g]<.6?'<span class="chip dn">❄️ CRASH</span>':'';
    c.innerHTML=`<div class="art">${ic(g,36)}</div><div class="i"><span class="mn">${G[g].n} ${tag}</span><span class="mp"><b class="num">${p.toFixed(2)}</b> <span class="${d>=1?'up':'dn'}">${d>=1?'▲':'▼'} ${Math.round(Math.abs(d-1)*100)}%</span> · ${Math.floor(S.stock[g])} im Lager</span></div>
      <div class="mbtn"><button class="btn b sm" data-a="buy">Kaufen<span class="num">${buyP(g).toFixed(1)}</span></button><button class="btn sm" data-a="sell" ${S.stock[g]<1?'disabled':''}>Verkaufen<span class="num">${sellP(g).toFixed(1)}</span></button></div>`;
    c.querySelectorAll('.mbtn button').forEach(b=>b.onclick=e=>mTrade(g,b.dataset.a==='buy',e));
    el.appendChild(c)});
}
