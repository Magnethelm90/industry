// 3D-Modus: öffnet die Welt, läuft, nutzt Stationen und Markt mit dem Spielstand, schließt sauber.
// Headless-Chromium zeichnet WebGL per Software (SwiftShader).
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve(__dirname,'../dist/index.html')+'?debug';
let fail=0;const ok=(c,m)=>{console.log((c?'  ok  ':'  FEHLER ')+m);if(!c)fail++};
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(URL);await p.evaluate(()=>localStorage.clear());await p.reload();
  await p.evaluate(()=>{S.xp=xpFor(2);S.goal=GOALS.length;S.stock.erz=9;S.stock.kohle=4;render()});
  await p.evaluate(()=>document.querySelector('.lvlup')?.remove());
  ok(await p.evaluate(()=>!!document.getElementById('d3')),'3D-Knopf in der Kopfzeile');
  await p.click('#d3');await p.waitForFunction(()=>window.__w3dState&&window.__w3dState().alive,null,{timeout:30000});
  let st=await p.evaluate(()=>__w3dState());
  ok(st.calls>30&&st.tri>15000,'Szene wird gezeichnet ('+st.calls+' Aufrufe, '+st.tri+' Dreiecke)');
  // Bild prüfen: ein leeres oder einfarbiges Bild lässt sich als PNG sehr klein packen
  const shot=await p.screenshot({clip:{x:0,y:100,width:390,height:500}});
  ok(shot.length>8000,'Bild hat Inhalt ('+shot.length+' Byte PNG)');
  // Laufen mit Tasten
  const z0=st.z;await p.keyboard.down('KeyW');await p.waitForFunction(z=>__w3dState().z<z-2,z0,{timeout:15000}).catch(()=>{});await p.keyboard.up('KeyW');
  ok((await p.evaluate(()=>__w3dState().z))<z0-2,'W läuft nach vorn');
  // Gebäude sind fest
  await p.evaluate(()=>__w3dTeleport(-17,-6));await p.waitForFunction(()=>{const s=__w3dState();return Math.hypot(s.x+17,s.z+6)>3},null,{timeout:15000}).catch(()=>{});
  const col=await p.evaluate(()=>{const s=__w3dState();return Math.hypot(s.x+17,s.z+6)});ok(col>3,'Erzmine ist ein Hindernis ('+col.toFixed(1)+' m)');
  const go=async id=>{await p.evaluate(id=>{const z=__w3dState().zones.find(z=>z.id===id);__w3dTeleport(z.x,z.z)},id);await p.waitForFunction(id=>__w3dState().near===id,id,{timeout:3000})};
  await go('erz');await p.waitForSelector('#w3b:visible');
  ok(/Eisenerz/.test(await p.textContent('#w3b')),'Knopf an der Erzmine: '+await p.textContent('#w3b'));
  await p.click('#w3b');await p.waitForSelector('#w3go',{timeout:5000});
  ok(true,'Stationsknopf öffnet das 3D-Minispiel mit Startkarte');
  await p.click('#w3gb');await p.waitForTimeout(200);
  await go('stahl');await p.waitForTimeout(700);
  ok(await p.evaluate(()=>document.getElementById('w3b').disabled===false&&/Schmelzofen/.test(document.getElementById('w3b').textContent)),'Schmelzofen: Zutaten reichen, Knopf aktiv');
  await p.evaluate(()=>{S.stock.erz=0});await p.waitForFunction(()=>document.getElementById('w3b').disabled,null,{timeout:15000}).catch(()=>{});
  ok(await p.evaluate(()=>document.getElementById('w3b').disabled&&/fehlt/.test(document.getElementById('w3b').textContent)),'Schmelzofen: ohne Erz zeigt der Knopf, was fehlt');
  // Neue Stationen: Ziegelei braucht Lehm, Montage Stahl und Ziegel
  await p.evaluate(()=>{S.stock.lehm=0});await go('ziegel');await p.waitForFunction(()=>document.getElementById('w3b').disabled&&/Lehm/.test(document.getElementById('w3b').textContent),null,{timeout:15000});
  ok(true,'Ziegelei ohne Lehm: Knopf zeigt, was fehlt');
  await p.evaluate(()=>{S.stock.lehm=9});await p.waitForFunction(()=>!document.getElementById('w3b').disabled&&/Ziegel/.test(document.getElementById('w3b').textContent),null,{timeout:15000});
  ok(true,'Ziegelei mit Lehm: Knopf aktiv');
  await go('maschine');await p.waitForFunction(()=>/Stahl|Montage/.test(document.getElementById('w3b').textContent),null,{timeout:15000});ok(true,'Montage-Station erreichbar');
  await go('lehm');await p.waitForFunction(()=>/Lehm/.test(document.getElementById('w3b').textContent),null,{timeout:15000});ok(true,'Lehmgrube erreichbar');
  const tx0=await p.evaluate(()=>__w3dState().truck);await p.waitForFunction(x=>__w3dState().truck>x+1,tx0,{timeout:15000}).catch(()=>{});
  ok(await p.evaluate(()=>__w3dState().truck)>tx0+1,'LKW fährt auf der Straße');
  // Karte und Ziel
  await p.click('#w3m');await p.waitForSelector('#w3dl:not([hidden]) .w3di');
  ok(await p.evaluate(()=>document.querySelectorAll('#w3dl .w3di').length)>20,'Zielliste zeigt viele Orte');
  await p.evaluate(()=>[...document.querySelectorAll('#w3dl .w3di')].find(b=>/Markt/.test(b.textContent)).click());
  ok(await p.evaluate(()=>__w3dState().target)==='markt','Ziel Markt gesetzt');
  await p.waitForFunction(()=>/Markt · \d+ m/.test(document.getElementById('w3mt').textContent),null,{timeout:5000});
  await p.evaluate(()=>{const z=__w3dState().zones.find(z=>z.id==='markt');__w3dTeleport(z.x,z.z)});
  await p.waitForFunction(()=>__w3dState().target===null,null,{timeout:5000});
  ok(true,'Ziel wird bei Ankunft gelöscht');
  // 3D-Minispiele: Start über den Stationsknopf, Startkarte mit „Los!“, Bots spielen mit echten Klicks
  const begin=async id=>{await go(id);await p.waitForFunction(()=>!document.getElementById('w3b').disabled,null,{timeout:20000});await p.click('#w3b');await p.waitForSelector('#w3go',{timeout:10000});
    const before=await p.evaluate(()=>__w3dGame().running);await p.click('#w3go');await p.waitForFunction(()=>__w3dGame().running,null,{timeout:30000});return before};
  const gi=()=>p.evaluate(()=>window.__w3dGame?__w3dGame():null);
  const result=async(id,out,min)=>{await p.waitForFunction(()=>__w3dGame().ended,null,{timeout:240000});await p.waitForSelector('.rescard',{timeout:10000});
    const st=await p.evaluate(()=>document.querySelectorAll('.rescard .rs .on').length),n=await p.evaluate(o=>S.stock[o],out);
    ok(st>=min,'3D-Spiel '+id+': '+st+' Sterne, Lager '+out+' = '+n);await p.evaluate(()=>document.querySelector('.rescard')?.remove())};
  await p.evaluate(()=>{Object.keys(S.stock).forEach(g=>S.stock[g]=20);S.stock.erz=0;S.combo=0});
  ok(await begin('erz')===false,'Erzrausch: Zeit läuft erst nach „Los!“');
  ok(await p.evaluate(()=>getComputedStyle(document.querySelector('.w3top')).display==='none'),'im Spiel sind Anzeige und Laufknopf ausgeblendet');
  for(let k=0;k<4000;k++){const g=await gi();if(!g||g.ended)break;const n=(g.info.nodes||[]).find(n=>n.k!=='tnt'&&n.p[1]>90);if(n)await p.mouse.click(n.p[0],n.p[1]);await p.waitForTimeout(40)}
  await result('Erzrausch','erz',2);
  ok(await p.evaluate(()=>S.stock.erz>0&&S.st.make.erz>0),'Erz gutgeschrieben und gezählt');
  await begin('stahl');{let down=false;
    for(let k=0;k<6000;k++){const g=await gi();if(!g||g.ended)break;const u=g.info.moulds.find(o=>o.q==null&&Math.abs(o.x)<.72),want=!!u&&u.f<.9;
      if(want&&!down){await p.mouse.move(195,600);await p.mouse.down();down=true}else if(!want&&down){await p.mouse.up();down=false}await p.waitForTimeout(25)}
    if(down)await p.mouse.up()}
  await result('Abstich','stahl',2);
  await begin('ziegel');
  for(let k=0;k<8000;k++){const g=await gi();if(!g||g.ended)break;if(!g.info.drop&&!g.info.over&&Math.abs(g.info.x-g.info.tx)<.13){await p.mouse.click(195,600);await p.waitForTimeout(120)}await p.waitForTimeout(12)}
  await result('Ziegelkran','ziegel',2);
  await begin('maschine');
  for(let k=0;k<6000;k++){const g=await gi();if(!g||g.ended)break;const it=g.info.items.find(o=>o.k===g.info.need&&o.p[0]>40&&o.p[0]<350);if(it){await p.mouse.click(it.p[0],it.p[1]);await p.waitForTimeout(150)}await p.waitForTimeout(30)}
  await result('Fließband','maschine',2);
  // Abbrechen kostet nichts
  const e0=await p.evaluate(()=>S.stock.erz);await go('stahl');await p.click('#w3b');await p.waitForSelector('#w3gb');await p.click('#w3gb');await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!document.querySelector('.w3g'))&&await p.evaluate(()=>S.stock.erz)===e0,'Zurück auf der Startkarte bricht ab, ohne Material zu verbrauchen');
  // Orte der Verwaltung: gesperrt unter dem nötigen Level, sonst Blatt über der Welt
  await p.evaluate(()=>{S.xp=xpFor(2)});await go('p_shop');await p.waitForFunction(()=>/Level 3/.test(document.getElementById('w3b').textContent),null,{timeout:15000});
  ok(await p.evaluate(()=>document.getElementById('w3b').disabled),'Laden unter Level 3 gesperrt: '+await p.textContent('#w3b'));
  await p.evaluate(()=>{S.xp=xpFor(5);render()});await p.evaluate(()=>document.querySelector('.lvlup')?.remove());
  await p.waitForFunction(()=>!document.getElementById('w3b').disabled,null,{timeout:15000});await p.waitForTimeout(800);await p.evaluate(()=>{document.querySelector('.lvlup')?.remove();closeOv()});await p.click('#w3b');await p.waitForFunction(()=>__w3dState().sheet,null,{timeout:5000});
  ok(await p.evaluate(()=>cur==='shop'&&document.body.classList.contains('w3sheet')&&/Laden/.test(document.getElementById('s-shop').textContent)),'Laden öffnet als Blatt über der Welt');
  const zb=await p.evaluate(()=>__w3dState().z);await p.keyboard.down('KeyW');await p.waitForTimeout(600);await p.keyboard.up('KeyW');
  ok(Math.abs(await p.evaluate(()=>__w3dState().z)-zb)<.01,'bei offenem Blatt läuft die Figur nicht');
  await p.click('.w3sx');await p.waitForFunction(()=>!__w3dState().sheet,null,{timeout:5000});
  ok(await p.evaluate(()=>!document.body.classList.contains('w3sheet')&&cur==='work'),'Blatt schließt zurück in die Welt');
  for(const [id,scr] of [['p_orders','orders'],['p_bld','bld'],['p_log','logistics'],['p_farm','farm'],['p_under','under']]){
    await go(id);await p.waitForFunction(()=>!document.getElementById('w3b').disabled,null,{timeout:15000});await p.click('#w3b');await p.waitForFunction(()=>__w3dState().sheet,null,{timeout:5000});
    const c=await p.evaluate(()=>cur);await p.click('.w3sx');await p.waitForFunction(()=>!__w3dState().sheet,null,{timeout:5000});ok(c===scr,'Ort '+id+' öffnet '+scr)}
  await go('p_lab');await p.waitForFunction(()=>/Labor/.test(document.getElementById('w3b').textContent),null,{timeout:15000});await p.click('#w3b');await p.waitForSelector('.flask',{timeout:5000});
  ok(true,'Labor öffnet aus der Welt');await p.evaluate(()=>closeOv());
  await go('p_fish');await p.waitForFunction(()=>/Angeln/.test(document.getElementById('w3b').textContent),null,{timeout:15000});await p.click('#w3b');await p.waitForSelector('#w3go',{timeout:10000});
  ok(true,'Angelsteg startet das 3D-Angeln mit Startkarte');await p.click('#w3gb');await p.waitForTimeout(300);
  // Felder: säen, gießen, ernten direkt am Beet
  ok(await p.evaluate(()=>__w3dState().plots)===await p.evaluate(()=>S.farm.plots.length),'so viele Beete wie Felder ('+await p.evaluate(()=>__w3dState().plots)+')');
  const btn=async re=>{await p.waitForFunction(r=>new RegExp(r).test(document.getElementById('w3b').textContent),re,{timeout:15000})};
  await p.evaluate(()=>{closeOv();S.farm.plots[0]={c:null,p:0,w:0,pest:0,half:0,ready:0};S.money=500});await go('plot0');await btn('bestellen');await p.click('#w3b');
  await p.waitForSelector('#ovbox [data-k="weizen"]',{timeout:5000});await p.click('#ovbox [data-k="weizen"]');
  ok(await p.evaluate(()=>S.farm.plots[0].c==='weizen'&&S.farm.plots[0].w>0),'Beet 1: Weizen gesät und angegossen');
  await btn('wächst');ok(await p.evaluate(()=>document.getElementById('w3b').disabled),'wachsendes Beet: Knopf zeigt den Fortschritt');
  await p.evaluate(()=>{S.farm.plots[0].w=0});await btn('Gießen');await p.click('#w3b');ok(await p.evaluate(()=>S.farm.plots[0].w>0),'trockenes Beet gegossen');
  await p.evaluate(()=>{S.farm.plots[0].pest=Date.now()+60000});await btn('Schädlinge');await p.click('#w3b');ok(await p.evaluate(()=>!S.farm.plots[0].pest),'Schädlinge vertrieben');
  const w0=await p.evaluate(()=>{S.farm.plots[0].p=1;S.farm.plots[0].ready=1;return S.stock.weizen});await btn('ernten');await p.click('#w3b');
  ok(await p.evaluate(w=>S.stock.weizen>w&&!S.farm.plots[0].c,w0),'reifes Beet geerntet, Weizen im Lager');
  // Lieferfahrt in 3D: am Logistikhof laden, „Fahren“, selbst lenken, Abrechnung wie in 2D
  await p.evaluate(()=>{Object.keys(S.stock).forEach(g=>S.stock[g]=0);S.stock.stahl=8;render()});
  await go('p_log');await p.waitForFunction(()=>/Lieferung/.test(document.getElementById('w3b').textContent),null,{timeout:15000});await p.click('#w3b');await p.waitForFunction(()=>__w3dState().sheet,null,{timeout:5000});
  await p.click('#s-logistics [data-d="max"]');
  const dm0=await p.evaluate(()=>({m:S.money,d:S.st.drives}));
  await p.locator('#s-logistics .card',{hasText:'Stadtmarkt'}).locator('button').click();
  await p.waitForSelector('#d3go',{timeout:10000});
  ok(await p.evaluate(()=>!__w3dState().sheet&&S.stock.stahl===0&&!__w3dDriveState().running),'Fahren schließt das Blatt, Ware ist verladen, Fahrt wartet auf „Los!“');
  await p.click('#d3go');await p.waitForFunction(()=>__w3dDriveState().running,null,{timeout:30000});
  // Fahr-Bot: immer die Spur mit der weitesten freien Strecke, Münzen als Zugabe
  for(let k=0;k<20000;k++){const s=await p.evaluate(()=>window.__w3dDriveState?__w3dDriveState():null);if(!s||s.over||s.ended)break;
    const L=s.lane,lanes=[-L,0,L],cur=lanes.reduce((a,b)=>Math.abs(b-s.tx)<Math.abs(a-s.tx)?b:a);
    const free=x=>Math.min(999,...s.objs.filter(o=>o.k!=='coin'&&Math.abs(o.lx-x)<1.6&&o.dz>-5&&o.dz<95).map(o=>o.dz));
    const coins=x=>s.objs.filter(o=>o.k==='coin'&&Math.abs(o.lx-x)<1&&o.dz>0&&o.dz<50).length;
    const best=lanes.map(x=>({x,f:Math.min(70,free(x)),c:coins(x),d:Math.abs(x-cur)})).sort((a,b)=>b.f-a.f||b.c-a.c||a.d-b.d)[0];
    if(best.x<cur-.1)await p.keyboard.press('ArrowLeft');else if(best.x>cur+.1)await p.keyboard.press('ArrowRight');await p.waitForTimeout(30)}
  await p.waitForSelector('#ovbox #ok',{timeout:60000});
  const dr=await p.evaluate(()=>({m:S.money,d:S.st.drives,txt:document.getElementById('ovbox').textContent}));
  const integ=+(dr.txt.match(/× (\d+)%/)||[0,0])[1];
  ok(dr.m>dm0.m&&dr.d===dm0.d+1&&integ>=85,'3D-Fahrt: angekommen mit '+integ+' % Ladung, bezahlt (+'+Math.round(dr.m-dm0.m)+' Cr), Fahrt gezählt');
  await p.click('#ovbox #ok');
  ok(await p.evaluate(()=>!window.__w3dDriveState&&getComputedStyle(document.querySelector('.w3top')).display!=='none'),'nach der Fahrt wieder in der Welt');
  // Abbruch auf der Startkarte: Ladung bleibt auf dem LKW, Lager bekommt die Ware zurück
  await p.evaluate(()=>{S.stock.stahl=4;window.__ab='offen';cargo.stahl=4;startDrive(ROUTES[0]).then(()=>window.__ab='fertig')});await p.waitForSelector('#d3b',{timeout:10000});await p.click('#d3b');
  await p.waitForFunction(()=>window.__ab==='fertig',null,{timeout:5000});
  ok(await p.evaluate(()=>S.stock.stahl===4&&cargo.stahl===4),'Zurück vor der Fahrt: nichts verloren');
  await p.evaluate(()=>{cargo.stahl=0;S.stock.stahl=0});
  // Neue Stationen: Hubs, Sperren nach Level, Rezept-Stationen erst nach Entdeckung
  await p.evaluate(()=>{S.xp=xpFor(2);S.rec={};render()});await p.evaluate(()=>document.querySelector('.lvlup')?.remove());
  await go('handy');await p.waitForFunction(()=>/ab Level/.test(document.getElementById('w3b').textContent),null,{timeout:15000});
  ok(await p.evaluate(()=>document.getElementById('w3b').disabled),'Smartphone-Station unter Level 4 gesperrt: '+await p.textContent('#w3b'));
  ok(await p.evaluate(()=>{const z=__w3dState().zones.find(z=>z.id==='r_kamin');return z&&z.hidden===true}),'Rezept-Station ist unsichtbar, bis das Rezept entdeckt ist');
  await p.evaluate(()=>{S.xp=xpFor(6);S.rec.kamin=1;Object.keys(S.stock).forEach(g=>S.stock[g]=20);render()});await p.evaluate(()=>document.querySelector('.lvlup')?.remove());
  ok(await p.evaluate(()=>{const z=__w3dState().zones.find(z=>z.id==='r_kamin');return z&&z.hidden===false}),'entdecktes Rezept: Station erscheint');
  // Ofen-Spiel (Backstube): Bot tippt im grünen Bereich
  await p.evaluate(()=>closeOv());await begin('baeckerei');
  for(let k=0;k<6000;k++){const g=await gi();if(!g||g.ended)break;const o=(g.info.ovens||[]).find(o=>o.on&&o.p>.76&&o.p<.9);if(o){await p.mouse.click(o.xy[0],o.xy[1]);await p.waitForTimeout(120)}await p.waitForTimeout(15)}
  await result('Backstube','brot',2);
  // Fließband mit Themenbezeichnung (Smartphone-Endmontage)
  await begin('handy');
  ok(await p.evaluate(()=>/Kamera|Akku|Display|Schraube/.test(document.querySelector('.w3gs').textContent)),'Endmontage zeigt eigene Teilenamen');
  for(let k=0;k<6000;k++){const g=await gi();if(!g||g.ended)break;const it=g.info.items.find(o=>o.k===g.info.need&&o.p[0]>40&&o.p[0]<350);if(it){await p.mouse.click(it.p[0],it.p[1]);await p.waitForTimeout(150)}await p.waitForTimeout(30)}
  await result('Endmontage','handy',2);
  // Angeln am Steg in 3D
  await p.evaluate(()=>{S.stock.hering=0;S.stock.lachs=0;S.stock.thunfisch=0});
  await go('p_fish');await p.waitForFunction(()=>!document.getElementById('w3b').disabled&&/Angeln/.test(document.getElementById('w3b').textContent),null,{timeout:15000});await p.evaluate(()=>{document.querySelector('.rescard')?.remove();closeOv()});await p.click('#w3b');await p.waitForSelector('#w3go',{timeout:10000});
  await p.click('#w3go');await p.waitForFunction(()=>__w3dGame().running,null,{timeout:30000});
  {let down=false;for(let k=0;k<40000;k++){const g=await gi();if(!g||g.ended||g.info.over)break;const i=g.info;
      if(i.phase==='bite'){await p.mouse.move(195,500);await p.mouse.down();down=true;await p.waitForTimeout(80)}
      else if(i.phase==='reel'){const want=down?i.T<68:i.T<46;if(want&&!down){await p.mouse.down();down=true}else if(!want&&down){await p.mouse.up();down=false}}
      else if(down){await p.mouse.up();down=false}
      await p.waitForTimeout(18)}
    if(down)await p.mouse.up()}
  await p.waitForFunction(()=>!document.querySelector('.w3g'),null,{timeout:60000});
  ok(await p.evaluate(()=>S.stock.hering+S.stock.lachs+S.stock.thunfisch>0&&S.st.fish>0),'Angeln in 3D ['+await p.evaluate(()=>JSON.stringify({ov:!!document.getElementById('ov')?.children.length,g:window.__w3dGame&&__w3dGame()}))+'] '+await p.evaluate(()=>(document.getElementById('ov')?.innerText||'').slice(0,120).replace(/\n/g,' | '))+' Fang im Lager ('+await p.evaluate(()=>S.stock.hering+'/'+S.stock.lachs+'/'+S.stock.thunfisch)+'), Fangzähler erhöht');
  await p.evaluate(()=>{document.querySelector('.rescard')?.remove();closeOv()});
  // Markt
  await p.evaluate(()=>{S.stock.erz=5;S.stock.stahl=2;S.stock.kohle=0;S.stock.lehm=0;S.stock.ziegel=0;S.stock.maschine=0});await go('markt');await p.waitForFunction(()=>/verkaufen/.test(document.getElementById('w3b').textContent),null,{timeout:15000});
  const m0=await p.evaluate(()=>S.money),x0=await p.evaluate(()=>S.xp),s0=await p.evaluate(()=>S.st.sold);
  await p.click('#w3b');await p.waitForTimeout(300);
  const a=await p.evaluate(()=>({m:S.money,x:S.xp,s:S.st.sold,e:S.stock.erz,st:S.stock.stahl}));
  ok(a.m>m0&&a.x>x0&&a.s===s0+7&&a.e===0&&a.st===0,'Markt verkauft alles, zahlt, XP und Zähler stimmen '+JSON.stringify(a));
  // Schließen räumt auf
  await p.click('#w3x');await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!document.getElementById('w3d')&&!window.__w3d&&!window.__w3dState),'Zurück schließt den 3D-Modus');
  await p.click('#d3');await p.waitForFunction(()=>window.__w3dState&&window.__w3dState().alive,null,{timeout:30000});
  ok(true,'3D lässt sich erneut öffnen');
  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));
  await b.close();console.log(fail?fail+' Fehler':'Alles bestanden');process.exit(fail?1:0);
})();
