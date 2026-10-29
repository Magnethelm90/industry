// Spielt die Szenen-Minispiele mit echten Gesten (Tippen, Halten, Wischen, Ziehen) und prüft, dass gutes Spiel gut gewertet wird.
// Aufruf: npm run build && node tests/minigames.cjs
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve(__dirname,'../dist/index.html')+'?debug';

const stageBox=async p=>(await p.$('#st')).boundingBox();
const STRAT={
  // Nadel und goldene Mitte über die SVG-Winkel vergleichen, dann auf die Bühne tippen
  async timing(p){const bb=await stageBox(p);
    for(let r=0;r<6;r++){
      for(let k=0;k<600;k++){
        const d=await p.evaluate(()=>{const n=parseFloat(document.querySelector('#gn').getAttribute('transform').slice(7));
          const v=document.querySelector('#gp').getAttribute('d').match(/-?[\d.]+/g).map(Number),ang=(x,y)=>Math.atan2(x-100,104-y)*180/Math.PI;
          return Math.abs(n-(ang(v[0],v[1])+ang(v[v.length-2],v[v.length-1]))/2)});
        if(d<2.5)break;await p.waitForTimeout(3)}
      await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height*.6);await p.waitForTimeout(450)}},
  // Zweipunktregler: halten, solange das Thermometer unter der Zonenmitte steht
  async heat(p){const bb=await stageBox(p);await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);let down=false;
    for(let i=0;i<700;i++){
      const r=await p.evaluate(()=>{const tf=document.getElementById('tf'),hz=document.getElementById('hz');if(!tf)return null;
        return {t:(tf.offsetHeight+6)/tf.parentElement.clientHeight*100,z:parseFloat(hz.style.bottom)+parseFloat(hz.style.height)/2}});
      if(!r)break;const want=r.t<r.z-1;
      if(want&&!down){await p.mouse.down();down=true}else if(!want&&down){await p.mouse.up();down=false}
      await p.waitForTimeout(15)}
    if(down)await p.mouse.up()},
  async mash(p){const bb=await stageBox(p);for(let i=0;i<60;i++){await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(70)}},
  // Wischen, wenn der Ring die Größe des Werkstücks erreicht; ein reiner Tipp darf nur einen Hinweis geben
  async forge(p){const bb=await stageBox(p),x=bb.x+bb.width/2,y=bb.y+bb.height*.35;
    await p.mouse.click(x,y);await p.waitForTimeout(80);
    if(!(await p.textContent('#m')).includes('wischen'))throw new Error('Tipp ohne Wischen gab keinen Hinweis');
    for(let b=0;b<8;b++){
      for(let k=0;k<500;k++){const v=await p.evaluate(()=>{const m=document.getElementById('frg').style;return m.opacity==='0'?9:parseFloat(m.transform.slice(6))});if(v<1.07)break;await p.waitForTimeout(4)}
      await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y+35,{steps:2});await p.mouse.up();await p.waitForTimeout(80)}},
  // Voll kippen, mit Vorhalt für den Nachlauf loslassen
  async pour(p){const bb=await stageBox(p),x=bb.x+bb.width/2,y=bb.y+60;
    for(let f=0;f<3;f++){await p.waitForTimeout(300);
      await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y+120,{steps:4});
      for(let i=0;i<800;i++){const r=await p.evaluate(()=>({f:document.querySelector('.molten').offsetTop,l:document.querySelector('.tline').offsetTop}));if(r.f<=r.l+19)break;await p.waitForTimeout(8)}
      await p.mouse.up();await p.waitForTimeout(1300)}},
  // Schrauben in Reihenfolge der Nummern
  async bolts(p){for(let r=0;r<2;r++){await p.waitForTimeout(650);const n=await p.evaluate(()=>document.querySelectorAll('.boltp').length);
      for(let i=0;i<n;i++){const k=await p.evaluate(i=>[...document.querySelectorAll('.boltp')].findIndex(x=>x.textContent==String(i+1)),i);
        const bb=await (await p.$$('.boltp'))[k].boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(120)}}},
  // Lampenfolge beobachten und nachdrücken
  async simon(p){for(let r=0;r<5;r++){const seq=[];let prev=-1;
      for(let k=0;k<1500;k++){const st=await p.evaluate(()=>({on:[...document.querySelectorAll('.lamp')].findIndex(l=>l.classList.contains('on')),m:document.getElementById('m').textContent}));
        if(st.on>=0&&st.on!==prev)seq.push(st.on);prev=st.on;if(st.m.includes('Du bist dran'))break;await p.waitForTimeout(15)}
      for(const i of seq){const bb=await (await p.$$('.pbtn'))[i].boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(220)}
      await p.waitForTimeout(300)}},
  // Kabel per Ziehen verbinden, das letzte per Tippen links/rechts
  async wires(p){const info=await p.evaluate(()=>{const t=[...document.querySelectorAll('.term')],c=e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]};
      return {L:t.slice(0,5).map(c),R:t.slice(5).map(e=>({p:c(e),c:+e.dataset.c}))}});
    for(let i=0;i<5;i++){const g=info.R.find(r=>r.c===i).p,[x,y]=info.L[i];
      if(i===4){await p.mouse.click(x,y);await p.waitForTimeout(80);await p.mouse.click(g[0],g[1]);continue}
      await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(g[0],g[1],{steps:8});await p.mouse.up();await p.waitForTimeout(120)}},
  // Steine vom Band tippen
  async sort(p){for(let k=0;k<1000;k++){const r=await p.evaluate(()=>{if(!document.getElementById('st'))return null;
      const it=[...document.querySelectorAll('.bitem')].find(e=>e.querySelector('.i-junk')&&!e.dataset.t&&e.getBoundingClientRect().x>20);if(!it)return {};it.dataset.t=1;
      const b=it.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}});if(!r)break;if(r.x)await p.mouse.click(r.x,r.y);await p.waitForTimeout(25)}},
  // Lore unter das tiefste gute Teil fahren (Test-Schnittstelle des Canvas)
  async catch(p){const cv=await p.$('#cv'),bb=await cv.boundingBox(),k=bb.width/320;await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height-30);await p.mouse.down();
    for(let i=0;i<900;i++){const st=await p.evaluate(()=>{const c=document.getElementById('cv');return c&&c.__state?c.__state():null});if(!st)break;
      const g=st.items.filter(o=>!o.st&&o.y<370).sort((a,b)=>b.y-a.y)[0];if(g)await p.mouse.move(bb.x+g.x*k,bb.y+bb.height-30);await p.waitForTimeout(18)}
    await p.mouse.up()},
  // Erz in den Stollen antippen, Dynamit liegen lassen
  async whack(p){for(let k=0;k<900;k++){const r=await p.evaluate(()=>{if(!document.getElementById('st'))return null;const w=[...document.querySelectorAll('.hwin')].find(e=>e.innerHTML&&!e.querySelector('.i-tnt'));
      if(!w)return {};const b=w.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}});if(!r)break;if(r.x)await p.mouse.click(r.x,r.y);await p.waitForTimeout(20)}},
  // Adern klopfen, bei Grubengas warten
  async wall(p){for(let k=0;k<1500;k++){const r=await p.evaluate(()=>{const wl=document.getElementById('wl');if(!wl)return null;if(wl.classList.contains('gas'))return {gas:1};
      const t=[...wl.querySelectorAll('.tile')].find(e=>e.dataset.k==='v'||e.dataset.k==='rich');if(!t)return {};const b=t.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}});
      if(!r)break;if(r.x)await p.mouse.click(r.x,r.y);await p.waitForTimeout(r.gas?40:60)}},
  // bündig ablegen (Test-Schnittstelle des Canvas)
  async stack(p){const bb=await (await p.$('#cv')).boundingBox();for(let i=0;i<10;i++){
      for(let k=0;k<800;k++){const st=await p.evaluate(()=>document.getElementById('cv').__state());if(st.done)return;if(Math.abs(st.x-st.top)<4)break;await p.waitForTimeout(3)}
      await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(60)}},
  // halten, bis der Ring grün ist
  async solder(p){for(let i=0;i<6;i++){await p.waitForTimeout(350);const b=await p.$('.spad.act');if(!b)break;const bb=await b.boundingBox();
      await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();
      for(let k=0;k<300;k++){const v=await p.evaluate(()=>{const e=document.querySelector('.spad.act');return e?parseFloat(e.style.getPropertyValue('--p')||0):999});if(v>=86)break;await p.waitForTimeout(8)}
      await p.mouse.up()}},
  // Lösungsstücke in Lösungsstellung drehen (Test-Schnittstelle)
  async pipes(p){const todo=await p.evaluate(()=>document.getElementById('pp').__cells.map(c=>c.sol==null?0:(c.sol-c.r+4)%4));
    for(let i=0;i<todo.length;i++)for(let k=0;k<todo[i];k++){const bb=await (await p.$$('.pc'))[i].boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(30)}},
  // Gehäuse, Platine, Akku, Schrauben, Display, einschalten
  async phone(p){const tap=async n=>{const bb=await (await p.$(`.part:has(.i-${n})`)).boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(250)};
    await tap('gehaeuse');await tap('platine');await tap('akku');
    for(let i=0;i<4;i++){const bb=await (await p.$$('.screw:not(.ok)'))[0].boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(150)}
    await p.waitForTimeout(400);await tap('display');await p.click('#pon')},
  // auf den Biss warten (Zustand über st.__state), Spannung im grünen Bereich halten
  async fish(p){const bb=await (await p.$('#st')).boundingBox();await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);
    const st=()=>p.evaluate(()=>{const e=document.getElementById('st');return e?e.__state():null});
    for(let k=0;k<3000;k++){const s=await st();if(!s||s.tryN>=3)break;
      if(s.phase==='bite'){await p.mouse.down();let down=true;
        for(let n=0;n<3000;n++){const r=await st();if(!r||r.phase!=='reel')break;const want=r.T<60;
          if(want&&!down){await p.mouse.down();down=true}else if(!want&&down){await p.mouse.up();down=false}await p.waitForTimeout(10)}
        if(down)await p.mouse.up()}
      await p.waitForTimeout(10)}},
  // Jede Flasche halten, bis ihr Anteil das Ziel erreicht
  async mix(p){for(let i=0;i<3;i++){const b=(await p.$$('#st .prop.p-bottle_a, #st .prop.p-bottle_b, #st .prop.p-bottle_c'))[i],bb=await b.boundingBox();
      await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();
      for(let k=0;k<400;k++){const [v,t]=(await p.textContent('#pv'+i)).split(' / ').map(Number);if(v>=t-.6)break;await p.waitForTimeout(10)}
      await p.mouse.up();await p.waitForTimeout(150)}
    await p.click('#fill')}
};
// Mindestwerte bewusst unter dem, was die Bots erreichen (Zufall, Reaktionszeit des Testbrowsers)
const RUNS=[['timing','erz',.8],['timingMove','kohle',.6],['timing','ziegel',.8],['heat','stahl',.6],['heatMove','glas',.5],['mash','ziegel',.9],['forge','stahl',.35],['pour','stahl',.3],['mix','kunststoff',.85],
  ['bolts','maschine',.9],['simon','maschine',.8],['wires','platine',.9],['sort','lehm',.7],['catch','erz',.6],['whack','erz',.6],['wall','kohle',.7],
  ['stack','ziegel',.8],['solder','platine',.8],['pipes','kunststoff',.4],['phone','handy',.8],['fish','-',1]];

(async()=>{
  const b=await chromium.launch();let fail=0;
  const only=process.env.ONLY,rep=+process.env.REP||1; // z. B. ONLY=fish REP=5
  for(const [g,id,min] of RUNS.filter(r=>!only||r[0]===only).flatMap(r=>Array(rep).fill(r))){
    const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto(URL);await p.evaluate(()=>{S.xp=xpFor(5);S.goal=GOALS.length});
    await p.evaluate(([g,id])=>{window.__r='offen';(g==='fish'?gFish():GAMES[g](ST.find(s=>s.id===id))).then(v=>window.__r=v)},[g,id]);await p.waitForTimeout(400);
    let note='';try{await STRAT[g.replace('Move','')](p)}catch(e){note=e.message}
    for(let i=0;i<100&&await p.evaluate(()=>window.__r)==='offen';i++)await p.waitForTimeout(100);
    let r=await p.evaluate(()=>window.__r);if(r&&typeof r==='object')r=Object.keys(r).length; // Angeln: Zahl der gefangenen Fischarten
    const ok=typeof r==='number'&&r>=min&&!errs.length&&!note;
    console.log((ok?'  ok  ':'  FEHLER ')+g+' ('+id+') Score '+(typeof r==='number'?r.toFixed(2):r)+' (min '+min+')'+(note?' '+note:'')+(errs.length?' '+errs:''));
    if(!ok)fail++;await p.close()}
  await b.close();console.log(fail?fail+' Fehler':'Alles bestanden');process.exit(fail?1:0);
})();
