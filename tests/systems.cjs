// Systemtest: Aufträge, Labor, Laden, Farm, Export, Untergrund und Offline-Fortschritt über die echte Oberfläche.
// Aufruf: npm run build && node tests/systems.cjs
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve(__dirname,'../dist/index.html')+'?debug';

(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:400,height:860}});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  const ev=(f,a)=>p.evaluate(f,a);
  let fail=0;const ok=(c,msg)=>{console.log((c?'  ok  ':'  FEHLER ')+msg);if(!c)fail++};
  await p.goto(URL);await ev(()=>localStorage.clear());await p.reload();await p.waitForTimeout(400);
  await ev(()=>{S.xp=xpFor(6);S.money=50000;S.goal=GOALS.length;render()}); // Level 6, alles offen

  // Aufträge
  await ev(()=>{for(let i=0;i<3;i++){S.nextOffer=0;tickOrders()}go('orders')});await p.waitForTimeout(150);
  await p.locator('#s-orders .card',{hasText:'Annehmen'}).first().locator('button',{hasText:'Annehmen'}).click();
  ok(await ev(()=>S.orders.length)===1,'Auftrag angenommen');
  await ev(()=>{const o=S.orders[0];for(const g in o.items)S.stock[g]=o.items[g]+1;render()});
  let m0=await ev(()=>S.money);const r0=await ev(()=>S.rep);
  await p.locator('#s-orders .card',{hasText:'Liefern'}).first().locator('button').click();
  ok(await ev(()=>S.money)>m0&&await ev(()=>S.rep)>r0&&await ev(()=>S.st.orders)===1,'Auftrag geliefert: Geld, Ruf, Zähler');
  const r1=await ev(()=>S.rep);
  await ev(()=>{acceptOrder(S.offers[0]);S.orders[0].due=Date.now()-1;tickOrders()});
  ok(await ev(()=>S.rep)===Math.max(0,r1-8),'verpasste Frist kostet 8 Ruf: '+r1+' → '+await ev(()=>S.rep));

  // Labor
  await ev(()=>{S.stock.ziegel=3;S.stock.stahl=3;S.stock.kohle=3;S.stock.lehm=3;go('work')});
  await p.click('#lab .btn');await p.waitForTimeout(150);
  for(const n of ['Lehm','Stahl','Kohle'])await p.locator('.pk',{hasText:n}).first().click();
  await p.click('#exp');await p.waitForTimeout(1300);
  ok((await p.textContent('#lm')).includes('Zutat'),'falsches Rezept gibt Hinweis: '+await p.textContent('#lm'));
  await p.locator('.flask').first().click();await p.locator('.pk',{hasText:'Ziegel'}).first().click();
  await p.click('#exp');await p.waitForTimeout(1300);
  ok(await ev(()=>!!S.rec.kamin&&S.stock.kamin>=1),'Kaminofen entdeckt');
  await p.click('#ovx');

  // Laden
  await ev(()=>{S.stock.stahl=40;go('shop')});await p.waitForTimeout(150);
  await p.locator('.shelf').first().click();await p.waitForTimeout(150);
  await p.locator('.pk',{hasText:'Stahl'}).click();await p.click('[data-q="50"]');await p.click('#done');
  ok(await ev(()=>S.shop.slots[0].g==='stahl'&&S.shop.slots[0].qty===40),'Regal mit 40 Stahl befüllt');
  m0=await ev(()=>S.money);await ev(()=>{for(let i=0;i<60;i++)tickShop(1)});
  ok(await ev(()=>S.shop.sold)>0&&await ev(()=>S.money)>m0,'Kunden kaufen im Laden: '+await ev(()=>S.shop.sold));
  await ev(()=>{custQ.length=0;custQ.push({id:901,type:'haggle',name:'Aylin',slot:0,qty:2,offer:80,until:Date.now()+15000},{id:902,type:'thief',name:'X',slot:0,until:Date.now()+5000});render()});
  await p.locator('#s-shop button',{hasText:'Stopp'}).click({force:true});
  await p.locator('#s-shop button',{hasText:'Deal'}).click();
  ok(await ev(()=>custQ.length)===0,'Dieb gestoppt und Deal gemacht');

  // Filiale im Laden bauen, sie verkauft automatisch
  await p.locator('#s-shop [data-b="baumarkt"] .btn',{hasText:'Bauen'}).click();
  ok(await ev(()=>S.b.baumarkt.lvl)===1,'Filiale Baumarkt im Laden gebaut');
  await ev(()=>{S.stock.lehm=50});m0=await ev(()=>S.money);await ev(()=>tickB(6));
  ok(await ev(()=>S.money)>m0&&await ev(()=>S.stock.lehm)<50,'Filiale verkauft Lehm aus dem Lager');

  // Farm und Keller
  await ev(()=>go('farm'));await p.waitForTimeout(150);
  await p.locator('#s-farm .plot').first().click();await p.locator('#ovbox [data-k="weizen"]').click();
  ok(await ev(()=>S.farm.plots[0].c)==='weizen','Weizen gesät');
  await ev(()=>{S.farm.plots[0].p=.999;tickFarm(1);render()});await p.waitForTimeout(100);
  const w0=await ev(()=>S.stock.weizen);await p.locator('#s-farm .plot.ready').first().click();
  ok(await ev(()=>S.stock.weizen)>w0&&await ev(()=>S.st.harvest)===1,'geerntet');
  await ev(()=>{S.stock.wein=5;render()});await p.locator('#s-farm .card',{hasText:'Veredeln im Fass'}).locator('button',{hasText:'Einlagern'}).click();
  await p.locator('#ovbox [data-g="wein"]').click();
  ok(await ev(()=>S.cellar.items.length)===1,'Wein im Fass');

  // Export: Flughafen in Logistik bauen, Nachfrage auf der Auftragstafel
  await ev(()=>go('logistics'));await p.waitForTimeout(150);
  await p.locator('#s-logistics button',{hasText:'Bauen'}).click();
  ok(await ev(()=>S.exp.built)===1,'Flughafen gebaut');
  await ev(()=>go('orders'));await p.waitForTimeout(150);
  ok((await p.textContent('#s-orders')).includes('Auslandsnachfrage'),'Länder stehen auf der Auftragstafel');
  await ev(()=>{S.stock.stahl=30;render()});
  await p.locator('#s-orders .card',{hasText:'Norwegen'}).locator('button').click();
  await p.locator('#ovbox [data-g="stahl"][data-d="max"]').click();await p.click('#send');
  ok(await ev(()=>S.exp.ships.length)===1,'Lieferung unterwegs');
  await ev(()=>go('logistics'));await p.waitForTimeout(150);
  ok((await p.textContent('#s-logistics')).includes('Norwegen'),'Logistik zeigt Lieferung unterwegs');
  m0=await ev(()=>S.money);await ev(()=>{S.exp.ships[0].end=Date.now()-1;tickExport()});
  ok(await ev(()=>S.money)>m0&&await ev(()=>S.exp.ships.length)===0,'Lieferung angekommen und bezahlt');

  // Untergrund
  await ev(()=>{S.stock.weizen=40;go('under')});await p.waitForTimeout(150);
  await ev(async()=>{GAMES.mix=GAMES.pipes=()=>Promise.resolve(1);await runStation(ST.find(s=>s.id==='brennerei'))});
  ok(await ev(()=>S.stock.schnaps)>0&&await ev(()=>S.ug.heat)>0,'Schnaps gebrannt, Verdacht steigt');
  await ev(()=>render());
  await p.locator('#s-under .card',{hasText:'Schwarzgebrannter'}).locator('button',{hasText:'Verstecken'}).click();
  ok(await ev(()=>S.stock.schnaps===0&&S.ug.stash.schnaps>0),'im Versteck');
  await ev(()=>{if(!S.ug.fences)genFences();S.ug.fences[0].g='schnaps';S.ug.fences[0].risk=1;render()});
  m0=await ev(()=>S.money);
  await p.locator('#s-under .card',{hasText:'Kauft Schwarzgebrannter'}).first().locator('button').click();
  ok(await ev(()=>S.money)>m0,'Hehler kauft');
  await ev(()=>{if(OV)closeOv();S.stock.schnaps=4;S.ug.stash={};raid()});await p.waitForTimeout(300);
  await p.locator('.raidc',{hasText:'Schwarzgebrannter'}).click();await p.waitForTimeout(6500);
  ok(await ev(()=>S.ug.stash.schnaps)===4,'Razzia: rechtzeitig versteckt');
  await p.click('#ok');
  ok(!(await ev(()=>GKU().some(g=>G[g].illegal))),'keine Schmuggelware im Markt');

  // Firmen-Übersicht mit Rangliste
  await p.click('#lvpill');await p.waitForTimeout(150);
  ok(await ev(()=>document.querySelectorAll('#ovbox .rank.me').length)>=1&&(await p.textContent('#ovbox')).includes('Deine Firma'),'Rangliste in der Firmen-Übersicht');
  await p.click('#done');

  // Offline (1 h): Rivalen wachsen, Laden verkauft
  await ev(()=>{S.last=Date.now()-3600e3;localStorage.setItem(SAVE,JSON.stringify(S))});
  const rw=await ev(()=>S.rivals[0].w);await p.reload();await p.waitForTimeout(600);
  ok(await ev(()=>S.rivals[0].w)>rw,'Offline-Fortschritt der Konkurrenz');

  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));
  await b.close();
  console.log(fail?fail+' Fehler':'Alles bestanden');process.exit(fail?1:0);
})();
