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

  // Labor: Mischspiel, ✓/✗ je Kolben (nur ✗ wird verbraucht), Forschung mit Boni
  await ev(()=>{S.stock.ziegel=3;S.stock.stahl=3;S.stock.kohle=3;S.stock.lehm=3;go('work')});
  await p.click('#lab .btn');await p.waitForTimeout(150);
  ok(await p.$('.flask')&&!(await p.$('#labres')),'Labor öffnet auf dem Experiment-Reiter');
  const mixIt=async()=>{await p.click('#exp');await p.click('#gogo');await p.waitForSelector('#gate',{state:'detached'});
    const bt=await p.$('#st .prop.p-bottle_a'),bb=await bt.boundingBox();await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();await p.waitForTimeout(500);await p.mouse.up();
    await p.click('#fill');await p.waitForSelector('#lm',{timeout:5000})};
  for(const n of ['Lehm','Stahl','Kohle'])await p.locator('.pk',{hasText:n}).first().click();
  await mixIt();
  const marks=await p.$$eval('.flask',fs=>fs.map(f=>f.querySelector('.fmark')?.textContent||''));
  ok((await p.textContent('#lm')).includes('Zwei Zutaten')&&marks.join('')==='✓✓✗','Fehlversuch: zwei ✓, ein ✗ ('+marks.join(' ')+')');
  ok(await ev(()=>S.stock.lehm===2&&S.stock.stahl===3&&S.stock.kohle===3),'nur die ✗-Zutat wird verbraucht');
  await p.locator('.flask').nth(2).click();await p.locator('.pk',{hasText:'Ziegel'}).first().click();
  await mixIt();
  ok(await ev(()=>!!S.rec.kamin&&S.stock.kamin>=1)&&(await p.textContent('#lm')).includes('Kaminofen'),'Kaminofen entdeckt');
  await p.click('[data-t="res"]');await p.waitForTimeout(100);
  const lm0=await ev(()=>S.money);await ev(()=>{S.money=5000});await p.click('[data-t="res"]');await p.click('[data-r="analyse"]');
  ok(await ev(()=>S.lab.res&&S.lab.res.id==='analyse'&&S.money===4700)&&!!(await p.$('#rbar')),'Forschung startet und kostet 300 Cr');
  ok(await p.$eval('[data-r="kat"]',b=>b.disabled),'nur eine Forschung gleichzeitig');
  await ev(()=>{S.lab.res.until=Date.now()-1;tickLab()});
  ok(await ev(()=>Object.values(S.lab.rev).some(a=>a.length===1)&&!S.lab.res),'Spektralanalyse verrät eine Zutat');
  const c0=await ev(()=>cap());await ev(()=>{S.lab.done.lager=1;S.lab.done.markt=1});
  ok(await ev(()=>cap())===c0+50&&await ev(()=>Math.abs(sellP('stahl')/price('stahl')-.8)<1e-9),'Boni: Lager +50, Marktverkauf 20 % Abschlag');
  await ev(m=>{S.lab.done={};S.lab.rev={};S.money=m},lm0);
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

  // Verschleiß: 1 % Zustand pro 15 Minuten, online wie offline
  const wear=await ev(()=>{const b=BLD.find(x=>x.kind==='mine'),s=S.b[b.id];s.lvl=Math.max(1,s.lvl);s.hp=100;
    for(let i=0;i<900;i++)tickB(1);const a=s.hp;s.hp=100;offlineB(4*3600);const o=s.hp;s.hp=100;render();return [a,o]});
  ok(Math.abs(wear[0]-99)<.01&&Math.abs(wear[1]-84)<.01,'Verschleiß 1 % / 15 min (online '+wear[0].toFixed(2)+' %, 4 h offline '+wear[1].toFixed(2)+' %)');
  // Leistung unter 50 % Zustand: online Schritt für Schritt = offline in einem Stück
  const eff=await ev(()=>{const b=BLD.find(x=>x.kind==='mine'),s=S.b[b.id],st0=S.up.store,lv0=BLD.map(x=>S.b[x.id].lvl);BLD.forEach(x=>{if(x!==b)S.b[x.id].lvl=0});S.up.store=1000;S.stock[b.out]=0;s.hp=40;tickB(10);const on40=S.stock[b.out]/(mineRate(b)*10);
    s.hp=55;S.stock[b.out]=0;for(let i=0;i<20000;i++)tickB(1);const step=S.stock[b.out];
    s.hp=55;S.stock[b.out]=0;offlineB(20000);const off=S.stock[b.out];s.hp=100;S.stock[b.out]=0;S.up.store=st0;BLD.forEach((x,i)=>S.b[x.id].lvl=lv0[i]);render();return [on40,step,off,mineRate(b)*effTime(55,20000)]});
  ok(Math.abs(eff[0]-.9)<.01,'40 % Zustand = 90 % Leistung ('+eff[0].toFixed(3)+')');
  ok(Math.abs(eff[1]-eff[2])/eff[2]<.01&&Math.abs(eff[2]-eff[3])<.01,'Leistungsverlust online wie offline gleich ('+eff[1].toFixed(1)+' / '+eff[2].toFixed(1)+')');

  // Offline (1 h): Rivalen wachsen, Laden verkauft
  await ev(()=>{S.last=Date.now()-3600e3;lockSave();localStorage.setItem(SAVE,JSON.stringify(S))}); // Takt darf nicht dazwischen speichern
  const rw=await ev(()=>S.rivals[0].w);await p.reload();await p.waitForTimeout(600);
  ok(await ev(()=>S.rivals[0].w)>rw,'Offline-Fortschritt der Konkurrenz');

  // Konkurrenz wächst logistisch: auch nach langer Zeit nicht über ihre Grenze, alte ausgeuferte Werte werden gekappt
  const rv=await ev(()=>{const r=S.rivals[3],w0=r.w;r.w=1e12;tickRivals(1);const clamp=r.w;r.w=w0;const old=S.rivals.map(x=>x.w);
    for(let i=0;i<30;i++)tickRivals(8*3600);const ok=S.rivals.every((x,i)=>x.w<=RIVALS[i].cap&&x.w>RIVALS[i].cap*.9);S.rivals.forEach((x,i)=>x.w=old[i]);return [clamp<=RIVALS[3].cap,ok]});
  ok(rv[0]&&rv[1],'Konkurrenz wächst bis zu ihrer Grenze, nicht darüber');
  // Übernahme (ab Level 6): Kaufpreis, Firmenwert, Gewinnanteil pro Stunde
  await ev(()=>{S.money=1e6;render()});await p.click('#lvpill');await p.waitForTimeout(150);
  const price1=await ev(()=>takePrice(S.rivals[1]));
  await p.click('#ovbox .tko[data-i="1"]');await p.waitForTimeout(150);
  const tk=await ev(()=>{const r=S.rivals[1],m=S.money;tickRivals(3600);return {own:!!r.own,m,div:S.money-m,exp:r.paid*TAKE_DIV,paid:r.paid,w:r.w}});
  // Der Wert kann zwischen Anzeige und Tippen noch eine Sekunde wachsen: geprüft wird der tatsächlich gezahlte Preis (Wert friert beim Kauf ein)
  ok(tk.own&&tk.paid===Math.ceil(tk.w*1.5)&&Math.abs(tk.paid-price1)/price1<.01&&1e6-tk.m>=tk.paid-1&&1e6-tk.m<tk.paid+2000,'Übernahme kostet das 1,5-Fache des Werts ('+tk.paid+' Cr)');
  ok(Math.abs(tk.div-tk.exp)<1,'Tochterfirma zahlt '+Math.round(tk.div)+' Cr pro Stunde');
  ok((await p.textContent('#ovbox')).includes('Tochterfirma')&&!(await ev(()=>freeRivals().includes(S.rivals[1]))),'Tochterfirma in der Übersicht, nicht mehr als Konkurrenz');
  await p.click('#done');
  // Großprojekte (ab Level 7): anliefern, fertigstellen, Bonus wirkt
  await ev(()=>{S.xp=xpFor(6);go('orders')});await p.waitForTimeout(150);
  ok(!(await p.$('#s-orders .proj')),'Großprojekte erst ab Level 7');
  await ev(()=>{S.xp=xpFor(7);S.stock.ziegel=150;render()});await p.waitForTimeout(150);
  ok((await p.$$('#s-orders .proj')).length===2&&(await p.textContent('#s-orders')).includes('weitere ab Level 8'),'Level 7: zwei Großprojekte, Rest gesperrt');
  const mr0=await ev(()=>mineRate(BLD.find(b=>b.kind==='mine'&&S.b[b.id].lvl>0)||(S.b.lehmgrube.lvl=1,BLD[0])));
  await p.click('#s-orders [data-p="bahnhof"] .btn');await p.waitForTimeout(100);
  ok(await ev(()=>S.proj.bahnhof.got.ziegel===150&&S.stock.ziegel===0&&!S.proj.bahnhof.done),'Teillieferung wird angerechnet');
  const m1=await ev(()=>{S.stock.ziegel=500;S.stock.stahl=500;S.stock.maschine=50;render();return S.money});await p.waitForTimeout(100);
  await p.click('#s-orders [data-p="bahnhof"] .btn');await p.waitForTimeout(100);
  const pj=await ev(()=>({done:S.proj.bahnhof.done,left:S.stock.ziegel,m:S.money}));
  ok(pj.done&&pj.left===250&&pj.m-m1>=30000&&pj.m-m1<31000,'Güterbahnhof fertig: nur Bedarf geliefert, 30.000 Cr Belohnung (+'+Math.round(pj.m-m1)+' inkl. laufender Einnahmen)');
  const mr1=await ev(()=>mineRate(BLD.find(b=>b.kind==='mine'&&S.b[b.id].lvl>0)));
  ok(Math.abs(mr1/mr0-1.25)<1e-9,'Bonus: Minen fördern 25 % mehr');
  ok((await p.textContent('#s-orders')).includes('Bonus aktiv'),'fertiges Projekt zeigt aktiven Bonus');

  // Sicherungscode: erzeugen, Stand ändern, Code laden = alter Stand zurück; Unsinn wird abgelehnt
  await ev(()=>{S.money=12345;render()});
  await p.click('#lvpill');await p.click('#bkmake');await p.waitForFunction(()=>document.getElementById('bkcode')?.value.length>20);
  const code=await p.inputValue('#bkcode');ok(/^IA1\./.test(code),'Sicherungscode erzeugt ('+code.length+' Zeichen)');
  await ev(()=>{S.money=1;S.xp=0});
  await p.click('#bkopen');await p.fill('#bkin','hallo');await p.click('#bkload');await p.waitForTimeout(100);
  ok((await p.textContent('#bkmsg')).includes('kein Sicherungscode'),'falscher Code wird abgelehnt');
  await p.fill('#bkin',code.slice(0,-40));await p.click('#bkload');await p.waitForTimeout(150);
  ok((await p.textContent('#bkmsg')).includes('⚠️'),'abgeschnittener Code wird abgelehnt');
  await p.fill('#bkin',code);await p.click('#bkload');await p.waitForTimeout(150);
  ok((await p.textContent('#bkload')).includes('überschreiben'),'Laden fragt nach');
  await Promise.all([p.waitForEvent('load'),p.click('#bkload')]);await p.waitForTimeout(500);
  ok(await ev(()=>S.money>=12345&&lvl()>=6),'Spielstand aus dem Code geladen');
  // Sicherheit: manipulierte Codes (HTML im Namen, Ausbruch aus Attributen, Zip-Bombe) werden abgelehnt, ohne etwas auszuführen
  const atk=await ev(async()=>{
    const zip=async t=>{const u=new TextEncoder().encode(t);const c=new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
      let s='';for(const x of c)s+=String.fromCharCode(x);return 'IA1.'+btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
    const base={money:1,xp:1,stock:{}},res=[];
    for(const o of [{...base,rivals:[{n:'<img src=x onerror="window.__pwned=1">',w:1,r:1}]},{...base,stock:{'x" onmouseover="window.__pwned=1':5}},{...base,money:'1e9'}])
      try{await readCode(await zip(JSON.stringify(o)));res.push('angenommen')}catch(e){res.push(e.message)}
    try{await readCode(await zip('{"money":1,"xp":1,"stock":{}'+' '.repeat(3e6)+'}'));res.push('angenommen')}catch(e){res.push(e.message)}
    return {res,pwned:!!window.__pwned}});
  ok(atk.res.slice(0,2).every(m=>m.includes('ungültige Zeichen'))&&atk.res[2].includes('keinen Spielstand')&&atk.res[3].includes('zu groß')&&!atk.pwned,'manipulierte Codes abgelehnt: '+atk.res.join(' | '));

  // Ton: Musik startet nach der ersten Berührung, Stumm und Musik-Schalter beenden sie; alle Geräusche laufen fehlerfrei
  await ev(()=>{S.mute=false;S.music=true;closeOv()});await p.mouse.click(200,600);await p.waitForTimeout(300);
  ok(await ev(()=>musicPlaying()&&AC&&AC.state==='running'),'Musik läuft nach der ersten Berührung');
  await ev(()=>{for(const k in SFX)SFX[k]();const m=motor();m.set(.5);m.stop()});await p.waitForTimeout(200);
  await p.click('#snd');ok(await ev(()=>S.mute&&!musicPlaying()),'Stumm schaltet auch die Musik ab');
  await p.click('#snd');ok(await ev(()=>!S.mute&&musicPlaying()),'Ton wieder an: Musik läuft');
  await p.click('#lvpill');await p.click('#mus');ok(await ev(()=>S.music===false&&!musicPlaying())&&(await p.textContent('#mus')).includes('aus'),'Musik-Schalter in der Firmen-Übersicht');
  await p.click('#mus');await p.click('#done');ok(await ev(()=>musicPlaying()),'Musik wieder an');

  // „Bewegung reduzieren“: Dauer-Pulse aus, weniger Partikel; ohne die Einstellung bleibt alles wie gehabt
  const mot=async rm=>{const q=await b.newPage({viewport:{width:400,height:860},reducedMotion:rm});q.on('pageerror',e=>errs.push(e.message));await q.goto(URL);
    const r=await q.evaluate(()=>{const d=document.createElement('button');d.className='btn pulse';document.body.appendChild(d);const a=getComputedStyle(d).animationName;d.remove();
      const n0=document.querySelectorAll('.sp').length;burst(100,100,'#fff',16);return {calm:calm(),a,n:document.querySelectorAll('.sp').length-n0}});await q.close();return r};
  const rmOn=await mot('reduce'),rmOff=await mot('no-preference');
  ok(rmOn.calm&&rmOn.a==='none'&&rmOn.n===4,'Bewegung reduzieren: kein Pulsieren, 4 statt 16 Partikel');
  ok(!rmOff.calm&&rmOff.a==='pl'&&rmOff.n===16,'ohne Einstellung: Pulsieren und volle Partikel');

  // Handy: Ein Finger gibt den Ton erst beim Loslassen frei, nicht beim Aufsetzen (pointerdown) – ein Tipp muss reichen
  const tc=await b.newContext({viewport:{width:400,height:860},hasTouch:true,isMobile:true}),tq=await tc.newPage();tq.on('pageerror',e=>errs.push(e.message));
  await tq.goto(URL);await tq.evaluate(()=>localStorage.clear());await tq.reload();await tq.waitForTimeout(300);
  await tq.evaluate(()=>{S.mute=true});await tq.touchscreen.tap(200,600);await tq.waitForTimeout(200);
  ok(await tq.evaluate(()=>!window.AC||AC.state!=='running'),'Touch, stumm: kein Ton');
  await tq.evaluate(()=>{S.mute=false});await tq.touchscreen.tap(200,600);await tq.waitForTimeout(300);
  ok(await tq.evaluate(()=>AC&&AC.state==='running'&&musicPlaying()),'Touch: Ton und Musik laufen nach einem Tipp');
  await tc.close();

  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));
  await b.close();
  console.log(fail?fail+' Fehler':'Alles bestanden');process.exit(fail?1:0);
})();
