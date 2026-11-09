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
  await p.evaluate(()=>__w3dTeleport(-17,-6));await p.waitForTimeout(200);
  const col=await p.evaluate(()=>{const s=__w3dState();return Math.hypot(s.x+17,s.z+6)});ok(col>3,'Erzmine ist ein Hindernis ('+col.toFixed(1)+' m)');
  const go=async id=>{await p.evaluate(id=>{const z=__w3dState().zones.find(z=>z.id===id);__w3dTeleport(z.x,z.z)},id);await p.waitForFunction(id=>__w3dState().near===id,id,{timeout:3000})};
  await go('erz');await p.waitForSelector('#w3b:visible');
  ok(/Eisenerz/.test(await p.textContent('#w3b')),'Knopf an der Erzmine: '+await p.textContent('#w3b'));
  await p.click('#w3b');await p.waitForSelector('#gate',{timeout:3000});
  ok(true,'Minispiel öffnet sich über dem 3D-Bild');
  await p.evaluate(()=>closeOv());
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
