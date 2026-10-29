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
  // Jede Flasche halten, bis ihr Anteil das Ziel erreicht
  async mix(p){for(let i=0;i<3;i++){const b=(await p.$$('#st .prop.p-bottle_a, #st .prop.p-bottle_b, #st .prop.p-bottle_c'))[i],bb=await b.boundingBox();
      await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();
      for(let k=0;k<400;k++){const [v,t]=(await p.textContent('#pv'+i)).split(' / ').map(Number);if(v>=t-.6)break;await p.waitForTimeout(10)}
      await p.mouse.up();await p.waitForTimeout(150)}
    await p.click('#fill')}
};
// Mindestwerte bewusst unter dem, was die Bots erreichen (Zufall, Reaktionszeit des Testbrowsers)
const RUNS=[['timing','erz',.8],['timingMove','kohle',.6],['timing','ziegel',.8],['heat','stahl',.6],['heatMove','glas',.5],['mash','ziegel',.9],['forge','stahl',.35],['pour','stahl',.3],['mix','kunststoff',.85]];

(async()=>{
  const b=await chromium.launch();let fail=0;
  for(const [g,id,min] of RUNS){
    const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto(URL);await p.evaluate(()=>{S.xp=xpFor(5);S.goal=GOALS.length});
    await p.evaluate(([g,id])=>{window.__r='offen';GAMES[g](ST.find(s=>s.id===id)).then(v=>window.__r=v)},[g,id]);await p.waitForTimeout(400);
    let note='';try{await STRAT[g.replace('Move','')](p)}catch(e){note=e.message}
    for(let i=0;i<100&&await p.evaluate(()=>window.__r)==='offen';i++)await p.waitForTimeout(100);
    const r=await p.evaluate(()=>window.__r),ok=typeof r==='number'&&r>=min&&!errs.length&&!note;
    console.log((ok?'  ok  ':'  FEHLER ')+g+' ('+id+') Score '+(typeof r==='number'?r.toFixed(2):r)+' (min '+min+')'+(note?' '+note:'')+(errs.length?' '+errs:''));
    if(!ok)fail++;await p.close()}
  await b.close();console.log(fail?fail+' Fehler':'Alles bestanden');process.exit(fail?1:0);
})();
