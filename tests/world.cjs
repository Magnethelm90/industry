// Welt: Tageszeit, Jahreszeit, Wochenende (feste Uhrzeiten) und Live-Daten mit nachgestellten Antworten.
// Die echten Dienste (frankfurter.app, open-meteo.com) werden hier NICHT erreicht – geprüft wird, wie das Spiel
// ihre dokumentierten Antworten verarbeitet, dass es ohne Zustimmung nichts sendet und bei Ausfall weiterläuft.
// Aufruf: npm run build && node tests/world.cjs
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve(__dirname,'../dist/index.html')+'?debug';
const json=b=>({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify(b)});
const FX_NOW={amount:1,base:'EUR',date:'2025-07-11',rates:{BRL:6.2,JPY:160,NOK:11.5,USD:1.1}};
const FX_OLD={amount:1,base:'EUR',date:'2024-07-11',rates:{BRL:5.9,JPY:174,NOK:11.6,USD:1.21}};
const WX=(code,p,wind)=>({latitude:52.52,longitude:13.41,current:{time:'2025-07-12T22:30',interval:900,temperature_2m:18.4,precipitation:p,weather_code:code,wind_speed_10m:wind,is_day:0}});

(async()=>{
  const b=await chromium.launch();let fail=0;const ok=(c,msg)=>{console.log((c?'  ok  ':'  FEHLER ')+msg);if(!c)fail++};
  const page=async(time,routes)=>{
    const ctx=await b.newContext({viewport:{width:400,height:860},timezoneId:'Europe/Berlin'});
    const p=await ctx.newPage(),errs=[],reqs=[];p.on('pageerror',e=>errs.push(e.message));
    p.on('request',r=>{if(/frankfurter|open-meteo/.test(r.url()))reqs.push(r.url())});
    await p.clock.setFixedTime(new Date(time));
    for(const [pat,f] of routes||[])await p.route(pat,f);
    await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(300);
    await p.evaluate(()=>{S.xp=xpFor(6);S.money=1e5;S.goal=GOALS.length;render()});
    return {p,ctx,errs,reqs}};

  // Samstag, 12. Juli 2025, 22:30 in Berlin: Nacht, Sommer, Wochenende
  let {p,ctx,errs,reqs}=await page('2025-07-12T22:30:00+02:00');
  let r=await p.evaluate(()=>({ph:dayPhase(),se:season(),wk:isWeekend(),body:document.body.dataset.time,
    food:wkMult('brot'),steel:wkMult('stahl'),grow:growMult()/(1+.1*Math.max(0,S.up.sprinkler-1)),o:genOffer().wk}));
  ok(r.ph==='night'&&r.se==='summer'&&r.wk&&r.body==='night','Sa 22:30: Nacht, Sommer, Wochenende');
  ok(r.food===1.15&&r.steel===1,'Wochenendmarkt: Brot +15 %, Stahl unverändert');
  ok(Math.abs(r.grow-1.25)<1e-9,'Sommer: Felder wachsen 25 % schneller');
  ok(r.o===true,'Aufträge am Wochenende markiert (+20 %)');
  await p.evaluate(()=>gFish());await p.waitForTimeout(200);
  ok((await p.textContent('#ovbox')).includes('Nachts beißen seltene Fische öfter'),'Angeln: Hinweis auf Nacht');
  await p.evaluate(()=>closeOv());
  await p.evaluate(()=>go('market'));ok((await p.textContent('#s-market')).includes('Wochenendmarkt'),'Markt zeigt Wochenendmarkt');
  ok(reqs.length===0,'ohne Zustimmung keine Anfrage an fremde Dienste ('+reqs.length+')');
  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));await ctx.close();

  // Mittwoch, 15. Januar 2025, 12:00: Tag, Winter, kein Wochenende
  ({p,ctx,errs}=await page('2025-01-15T12:00:00+01:00'));
  r=await p.evaluate(()=>({ph:dayPhase(),se:season(),wk:isWeekend(),food:wkMult('brot'),grow:growMult()/(1+.1*Math.max(0,S.up.sprinkler-1))}));
  ok(r.ph==='day'&&r.se==='winter'&&!r.wk&&r.food===1&&Math.abs(r.grow-.6)<1e-9,'Mi 12:00: Tag, Winter (60 % Wachstum), normale Preise');
  // Herbst: 20 % mehr Ernte
  await ctx.close();({p,ctx,errs}=await page('2025-10-08T10:00:00+02:00'));
  r=await p.evaluate(()=>{const pl=S.farm.plots[0];Object.assign(pl,{c:'weizen',p:1,ready:1,w:0,half:0});S.stock.weizen=0;S.up.tractor=0;harvest(0,{clientX:0,clientY:0});return S.stock.weizen});
  ok(r===7,'Herbst: Ernte 7 statt 6 Weizen ('+r+')'); // 6 × 1,2 = 7,2 → 7
  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));await ctx.close();

  // Live-Daten eingeschaltet: Kurse heute vs. vor einem Jahr, Wetter Regen → Felder gießen sich selbst
  const seen=[];
  ({p,ctx,errs,reqs}=await page('2025-07-12T22:30:00+02:00',[
    [/api\.frankfurter\.app\/latest/,rt=>{seen.push(rt.request().url());rt.fulfill(json(FX_NOW))}],
    [/api\.frankfurter\.app\/2024-07-11/,rt=>{seen.push(rt.request().url());rt.fulfill(json(FX_OLD))}],
    [/api\.open-meteo\.com/,rt=>{seen.push(rt.request().url());rt.fulfill(json(WX(61,1.2,12)))}]]));
  await p.click('#lvpill');await p.click('#live');await p.waitForTimeout(500);
  await p.selectOption('#city','berlin');await p.waitForTimeout(500);
  r=await p.evaluate(()=>({us:fxMult('us'),ae:fxMult('ae'),jp:fxMult('jp'),br:fxMult('br'),wx:weather()?.k}));
  ok(Math.abs(r.us-1.1)<1e-9&&r.ae===r.us,'Dollar: 1,21 → 1,10 je Euro = Export USA/Dubai +10 %');
  ok(Math.abs(r.jp-1.0875)<1e-9&&Math.abs(r.br-5.9/6.2)<1e-9,'Yen +8,75 %, Real −4,8 %');
  ok(r.wx==='rain','Wettercode 61 = Regen');
  ok(seen.some(u=>u.includes('from=EUR&to=USD,JPY,NOK,BRL'))&&seen.some(u=>/latitude=52\.52&longitude=13\.41/.test(u)),'richtige Anfragen (Währungen, Koordinaten Berlin)');
  const txt=await p.textContent('#ovbox');
  ok(txt.includes('Dollar +10 %')&&txt.includes('Berlin: Regen')&&txt.includes('Open-Meteo.com (CC BY 4.0)'),'Firmen-Übersicht zeigt Kurse, Wetter und Quelle');
  r=await p.evaluate(()=>{const pl=S.farm.plots[0];Object.assign(pl,{c:'weizen',p:.2,ready:0,w:0});S.up.sprinkler=0;tickFarm(1);return pl.w>0});
  ok(r,'Regen gießt ein trockenes Feld');
  await p.click('#done');
  r=await p.evaluate(()=>{S.exp.built=1;S.exp.demand={};go('orders');return document.querySelector('#s-orders').textContent});
  ok(r.includes('💱 USD +10 %'),'Exportländer zeigen den Kurseffekt');
  // Ausschalten löscht die zwischengespeicherten Daten
  await p.click('#lvpill');await p.click('#live');
  r=await p.evaluate(()=>({fx:fxMult('us'),wx:weather(),ls:localStorage.getItem('industry-live')}));
  ok(r.fx===1&&r.wx===null&&r.ls==='{}','Ausschalten: keine Effekte mehr, Zwischenspeicher geleert');
  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));await ctx.close();

  // Sturm und Schnee erkennen
  ({p,ctx,errs}=await page('2025-07-12T12:00:00+02:00',[[/frankfurter/,rt=>rt.abort()],[/open-meteo/,rt=>rt.fulfill(json(WX(95,0,30)))]]));
  await p.evaluate(()=>{S.live=true;S.city='hamburg'});await p.evaluate(()=>refreshLive());
  ok(await p.evaluate(()=>weather()?.k)==='storm','Wettercode 95 = Sturm');
  ok(await p.evaluate(()=>fxMult('us'))===1,'Kursdienst nicht erreichbar: Export unverändert');
  await p.click('#lvpill');ok((await p.textContent('#ovbox')).includes('Keine Kurse geladen'),'Hinweis, wenn keine Kurse geladen sind');
  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));await ctx.close();

  // Unsinnige Antworten werden ignoriert
  ({p,ctx,errs}=await page('2025-07-12T12:00:00+02:00',[[/frankfurter/,rt=>rt.fulfill(json({rates:{USD:'<img>',JPY:-1}}))],[/open-meteo/,rt=>rt.fulfill(json({current:{weather_code:'x'}}))]]));
  await p.evaluate(()=>{S.live=true;S.city='berlin'});await p.evaluate(()=>refreshLive());
  r=await p.evaluate(()=>({fx:fxMult('us'),wx:weather()}));
  ok(r.fx===1&&r.wx===null,'kaputte Antworten werden ignoriert');
  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));await ctx.close();

  await b.close();console.log(fail?fail+' Fehler':'Alles bestanden');process.exit(fail?1:0);
})();
