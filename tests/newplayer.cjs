// Test: geführter Einstieg für neue Spieler und Übernahme alter Spielstände.
// Aufruf: npm run build && node tests/newplayer.cjs [screenshot-ordner]
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve(__dirname,'../dist/index.html')+'?debug';
const SHOTS=process.argv[2];

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:400,height:860},deviceScaleFactor:2});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  const ev=(f,a)=>p.evaluate(f,a);
  const shot=async n=>{if(SHOTS)await p.screenshot({path:path.join(SHOTS,n+'.png')})};
  let fail=0;const ok=(c,msg)=>{console.log((c?'  ok  ':'  FEHLER ')+msg);if(!c)fail++};
  const stub=()=>ev(()=>{for(const k in GAMES)GAMES[k]=()=>Promise.resolve(1)});

  await p.goto(URL);await ev(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
  await stub();

  // Start: gesperrte Bereiche
  const locks=await ev(()=>[...document.querySelectorAll('#nav button.lock')].map(b=>b.dataset.s).join(','));
  ok(locks==='farm,bld,under','gesperrt bei Level 1: '+locks);
  await p.click('#nav [data-s=bld]');await p.waitForTimeout(100);
  ok(await ev(()=>cur)==='work','gesperrter Reiter öffnet nicht');
  ok((await p.textContent('#toast')).includes('ab Level 2'),'Hinweis zeigt Level: '+await p.textContent('#toast'));
  ok(!(await p.$('#lab')),'Labor bei Level 1 versteckt');
  ok((await p.textContent('#s-work')).includes('ab Level 4'),'Elektronik nur als Sperrzeile');
  ok(await ev(()=>document.querySelectorAll('#s-work .card').length)===6,'Werkstatt zeigt 6 Stationen: '+await ev(()=>document.querySelectorAll('#s-work .card').length));
  await shot('n1_start');

  // Ziel 1: Zeigen, herstellen, abholen
  ok((await p.textContent('#s-work .goal')).includes('Eisenerz abbauen'),'erstes Ziel sichtbar');
  await p.click('#s-work .goal .btn');await p.waitForTimeout(300);
  ok(await ev(()=>!!document.querySelector('[data-st="erz"] .btn.hl')),'Zeigen hebt den Spielen-Knopf hervor');
  await shot('n2_zeigen');
  await p.click('[data-st="erz"] .btn');await p.waitForTimeout(400);
  ok(await ev(()=>S.st.make.erz)>0,'Erz hergestellt: '+await ev(()=>S.st.make.erz));
  await ev(()=>tickGoals());await p.waitForTimeout(100);
  ok(await ev(()=>!!document.querySelector('#s-work .goal.done')),'Ziel als geschafft markiert');
  await shot('n3_geschafft');
  const m0=await ev(()=>S.money);
  await p.click('#s-work .goal.done .btn',{force:true});await p.waitForTimeout(200);
  ok(await ev(()=>S.money)-m0===20&&await ev(()=>S.goal)===1,'Belohnung abgeholt, nächstes Ziel');

  // Handel: Unter-Reiter
  await p.click('#nav [data-s=trade]');await p.waitForTimeout(150);
  const tabs=await ev(()=>[...document.querySelectorAll('#s-market .seg button')].map(b=>b.textContent+(b.classList.contains('lock')?'🔒':'')).join(','));
  ok(tabs==='Markt,Aufträge🔒,Laden🔒,Logistik','Handel-Reiter: '+tabs);
  await p.locator('#s-market .seg button',{hasText:'Logistik'}).click();await p.waitForTimeout(150);
  ok(await ev(()=>!!document.querySelector('#s-logistics .truck')),'Logistik zeigt LKW');
  ok((await p.textContent('#s-logistics')).includes('ab Level 5'),'Flughafen als Sperre sichtbar');
  await shot('n4_logistik');

  // Level 2: Freischaltungen
  await ev(()=>{S.xp=45;render()});await p.waitForTimeout(150);
  ok((await p.textContent('#toast')).includes('Neu: Betriebe, Aufträge'),'Level-Hinweis: '+await p.textContent('#toast'));
  ok(await ev(()=>[...document.querySelectorAll('#nav button.lock')].map(b=>b.dataset.s).join(','))==='farm,under','Betriebe offen');
  await p.click('#nav [data-s=bld]');await p.waitForTimeout(150);
  ok(await ev(()=>cur)==='bld','Betriebe öffnen');
  ok(!(await p.textContent('#s-bld')).includes('Traktor'),'Farm-Ausrüstung noch versteckt');
  await shot('n5_betriebe');

  // Firmen-Übersicht
  await p.click('#lvpill');await p.waitForTimeout(150);
  ok((await p.textContent('#ovbox')).includes('Freischaltungen'),'Firmen-Übersicht öffnet');
  await shot('n6_firma');
  await p.click('#done');

  // Ziele überspringen bis Flughafen: Kette läuft durch
  await ev(()=>{S.xp=5000;S.money=1e6;render()});
  const steps=await ev(()=>GOALS.length);
  ok(steps===13,'13 Ziele');

  // Alter Spielstand ohne Ziel-Feld: Einstieg wird übersprungen (eigener Kontext mit vorbereitetem Speicher)
  const ctx2=await b.newContext({viewport:{width:400,height:860}});
  await ctx2.addInitScript(()=>{if(!sessionStorage.vorbereitet){sessionStorage.vorbereitet=1;
    localStorage.setItem('industry-action-v2',JSON.stringify({money:900,xp:500,stock:{erz:5,stahl:3},up:{},b:{},hist:{},last:Date.now()}))}});
  const p2=await ctx2.newPage();p2.on('pageerror',e=>errs.push(e.message));
  await p2.goto(URL);await p2.waitForTimeout(400);
  ok(await p2.evaluate(()=>S.goal===GOALS.length&&!document.querySelector('.goal')&&S.money===900),'alter Spielstand: kein Einstieg, Geld erhalten, Ziel='+await p2.evaluate(()=>S.goal));
  ok(await p2.evaluate(()=>document.querySelectorAll('#nav button.lock').length)===0,'Level 4: alle Reiter offen, gesperrt='+await p2.evaluate(()=>[...document.querySelectorAll('#nav button.lock')].map(b=>b.dataset.s).join(',')));

  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));
  await b.close();
  console.log(fail?fail+' Fehler':'Alles bestanden');process.exit(fail?1:0);
})();
