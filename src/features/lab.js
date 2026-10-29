/* Labor: geheime Rezepte entdecken */
import {G,REC} from '../data.js';
import {SFX,burst,fx,tone,vib} from '../fx.js';
import {GKU,S,cap,lvl} from '../state.js';
import {OV,bindX,openOv,shakeBox,xbtn} from '../ui.js';
import {$,ic,sleep} from '../util.js';

export function openLab(){
  let sel=[];
  const draw=(msg,cls)=>{
    const goods=GKU().filter(g=>!G[g].secret),known=REC.filter(r=>S.rec[r.out]).length;
    openOv(xbtn()+`<h3>Labor</h3><div class="sub">Kombiniere 3 Zutaten (je 1 Stück). Triffst du ein geheimes Rezept, kannst du es danach in der Werkstatt bauen.</div>
     <div class="flasks">${[0,1,2].map(i=>`<button class="flask ${sel[i]?'full':''}" data-i="${i}" style="--c:${sel[i]?G[sel[i]].c:'#475569'}">${sel[i]?ic(sel[i],34):'<span>+</span>'}</button>`).join('')}</div>
     <div class="msg ${cls||''}" id="lm">${msg||'Wähle drei Zutaten'}</div>
     <button class="btn big b" id="exp" ${sel.length<3||sel.some(g=>S.stock[g]<1)?'disabled':''}>🧪 Experimentieren</button>
     <div class="pick">${goods.map(g=>`<button class="pk ${sel.includes(g)?'on':''}" data-g="${g}" ${S.stock[g]<1&&!sel.includes(g)?'disabled':''}>${ic(g,28)}<span>${G[g].n}</span><small class="num">${Math.floor(S.stock[g])}</small></button>`).join('')}</div>
     <div class="sec">Rezeptbuch · ${known} / ${REC.length}</div>
     ${REC.map(r=>{const k=S.rec[r.out],lk=(G[r.out].lv||1)>lvl();return `<div class="card ${k?'':'idle'}" style="--c:${G[r.out].c}"><div class="art" style="width:44px;height:44px;flex-basis:44px">${k?ic(r.out,32):'<b style="font-size:20px;color:var(--mut)">?</b>'}</div><div class="i">${k?G[r.out].n+' <span class="chip num">~'+G[r.out].base+' Cr</span>':'???'}<small>${k?r.in.map(x=>G[x].n).join(' + '):lk?'🔒 ab Level '+G[r.out].lv:'Hinweis: '+r.hint}</small></div></div>`}).join('')}`);
    bindX();
    document.querySelectorAll('.pk').forEach(b=>b.onclick=()=>{const g=b.dataset.g;if(sel.includes(g))sel=sel.filter(x=>x!==g);else if(sel.length<3)sel.push(g);SFX.tick();draw()});
    document.querySelectorAll('.flask').forEach(f=>f.onclick=()=>{const i=+f.dataset.i;if(sel[i]){sel.splice(i,1);SFX.tick();draw()}});
    $('exp').onclick=async()=>{
      if(sel.length<3||sel.some(g=>S.stock[g]<1))return;
      const ov=OV;sel.forEach(g=>S.stock[g]-=1);$('exp').disabled=true;
      document.querySelectorAll('.flask').forEach(f=>f.classList.add('boil'));$('lm').textContent='Es brodelt …';
      for(let i=0;i<5;i++){tone(260+i*90+Math.random()*60,.12,'sine',.04);await sleep(170)}
      if(!ov.alive)return;
      const r=REC.find(r=>r.in.every(x=>sel.includes(x)));
      if(r&&(G[r.out].lv||1)<=lvl()){
        const isNew=!S.rec[r.out];S.rec[r.out]=1;S.stock[r.out]=Math.min(cap(),S.stock[r.out]+1);S.xp+=isNew?40:5;
        SFX.win();vib([40,40,120]);burst(innerWidth/2,innerHeight*.3,G[r.out].c,30);if(isNew)fx('NEU: '+G[r.out].n,G[r.out].c);
        sel=[];draw((isNew?'🎉 Rezept entdeckt: ':'Hergestellt: ')+G[r.out].n,'good');return}
      let best=0;REC.filter(r=>!S.rec[r.out]&&(G[r.out].lv||1)<=lvl()).forEach(r=>{best=Math.max(best,r.in.filter(x=>sel.includes(x)).length)});
      SFX.miss();shakeBox();
      draw(best===2?'💨 Fast! 2 von 3 Zutaten passen zu einem unbekannten Rezept.':best===1?'💨 Eine Zutat passt zu einem unbekannten Rezept.':'💨 Nichts Brauchbares – keine Zutat passt.','bad');
    };
  };
  draw();
}
