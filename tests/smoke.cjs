// Rauchtest: startet jedes Minispiel und jeden Bildschirm einmal und meldet JavaScript-Fehler.
// Aufruf: npm run build && node tests/smoke.cjs
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve(__dirname,'../dist/index.html')+'?debug';

(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:400,height:860}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await p.goto(URL);await p.waitForTimeout(400);
  const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{S.xp=xpFor(8);S.money=1e6;Object.keys(S.stock).forEach(g=>S.stock[g]=50);render()});
  let fail=0;const ok=(c,msg)=>{console.log((c?'  ok  ':'  FEHLER ')+msg);if(!c)fail++};

  // Jedes Minispiel: starten, 2,5 s wild tippen, abbrechen
  const games=await ev(()=>Object.keys(GAMES).concat(['fish','drive']));
  for(const g of games){
    await ev(g=>{const st=ST.find(s=>s.games.includes(g))||ST[0];window.__r='offen';
      const run=g==='fish'?gFish():g==='drive'?drive(ROUTES[0],{}):GAMES[g](st);run.then(v=>window.__r=v)},g);
    await p.waitForTimeout(200);
    const t0=Date.now();
    while(Date.now()-t0<2500){
      const bs=await p.$$('#ovbox button:not(#ovx), #ovbox canvas, #ovbox .hole, #ovbox .pad, #ovbox .stage');
      if(!bs.length)break;
      const el=bs[Math.floor(Math.random()*bs.length)];
      try{await el.click({timeout:300,force:true})}catch(e){}
    }
    if(g==='drive')for(let i=0;i<300&&await ev(()=>window.__r)==='offen';i++)await p.waitForTimeout(100);
    const r=await ev(()=>window.__r);
    if(await p.$('#ovx'))await p.click('#ovx');
    await p.waitForTimeout(100);
    const r2=await ev(()=>window.__r);
    ok(r2===null||typeof r2==='number'||typeof r2==='object','Minispiel '+g+' → '+JSON.stringify(r2)+(JSON.stringify(r)!==JSON.stringify(r2)?' (abgebrochen)':''));
    await ev(()=>{if(OV)closeOv()});
  }

  // Alle Bildschirme rendern
  for(const k of ['work','farm','bld','market','shop','orders','logistics','under']){
    await ev(k=>go(k),k);await p.waitForTimeout(80);
    const n=await ev(k=>document.querySelector('#s-'+k).children.length,k);
    ok(n>1,'Bildschirm '+k+' ('+n+' Elemente)');
  }
  // Ein Herstellungsdurchlauf mit festem Score
  const before=await ev(()=>S.stock.stahl);
  await ev(async()=>{const s=ST.find(s=>s.id==='stahl');const keep=s.games;s.games=['timing'];const real=GAMES.timing;GAMES.timing=()=>Promise.resolve(1);await runStation(s);GAMES.timing=real;s.games=keep});
  ok(await ev(()=>S.stock.stahl)>before,'Station Schmelzofen liefert Stahl');
  // Speichern und Neuladen
  await p.waitForTimeout(1200);
  const money=await ev(()=>Math.round(S.money));
  await p.reload();await p.waitForTimeout(500);
  ok(Math.abs(await ev(()=>Math.round(S.money))-money)<5000,'Spielstand nach Neuladen erhalten');

  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));
  await b.close();
  console.log(fail?fail+' Fehler':'Alles bestanden');process.exit(fail?1:0);
})();
