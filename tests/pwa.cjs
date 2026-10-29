// App-Installation: Manifest und Icons erreichbar, Service Worker aktiv, Spiel startet auch ohne Netz.
// Aufruf: npm run build && node tests/pwa.cjs   (startet einen kleinen lokalen Server auf dist/)
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const DIST=path.resolve(__dirname,'../dist');
const TYPES={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const p=path.join(DIST,path.normalize(f));
  if(!p.startsWith(DIST)||!fs.existsSync(p)){r.writeHead(404);r.end();return}r.writeHead(200,{'Content-Type':TYPES[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r)});
(async()=>{
  await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));const URL=`http://127.0.0.1:${srv.address().port}/`;
  let fail=0;const ok=(c,msg)=>{console.log((c?'  ok  ':'  FEHLER ')+msg);if(!c)fail++};
  const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);
  const man=await p.evaluate(async()=>{const l=document.querySelector('link[rel="manifest"]');const m=await (await fetch(l.href)).json();
    const ic=await Promise.all(m.icons.map(async i=>{const r=await fetch(new URL(i.src,l.href));const im=await createImageBitmap(await r.blob());return r.ok&&im.width+'x'+im.height===i.sizes}));return {m,ic}});
  ok(man.m.display==='standalone'&&man.m.start_url&&man.m.name,'Manifest: Name, Start-URL, Vollbild');
  ok(man.ic.length>=2&&man.ic.every(Boolean),'App-Icons erreichbar und in der angegebenen Größe');
  const ctl=await p.evaluate(async()=>{await navigator.serviceWorker.ready;return true});
  ok(ctl,'Service Worker aktiv');
  await p.reload();await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!!navigator.serviceWorker.controller),'Seite wird vom Service Worker gesteuert');
  await p.evaluate(()=>caches.keys()).then(k=>ok(k.length>0,'Cache angelegt: '+k));
  // Sicherheitsrichtlinie (CSP): Verbindungen und Bilder von fremden Servern werden blockiert
  const csp=await p.evaluate(async()=>{const v=[];document.addEventListener('securitypolicyviolation',e=>v.push(e.violatedDirective));
    try{await fetch('https://example.org/x')}catch(e){}const i=new Image();i.src='https://example.org/x.png';await new Promise(r=>setTimeout(r,300));return v});
  ok(csp.some(d=>d.startsWith('connect-src'))&&csp.some(d=>d.startsWith('img-src')),'CSP blockiert fremde Server: '+csp.join(', '));
  await ctx.setOffline(true);
  await p.reload();await p.waitForTimeout(600);
  ok((await p.textContent('#money'))!==null&&(await p.$$('#s-work .card')).length>0,'ohne Netz: Spiel startet aus dem Cache');
  await ctx.setOffline(false);
  ok(errs.length===0,'keine JavaScript-Fehler '+JSON.stringify(errs));
  await b.close();srv.close();
  console.log(fail?fail+' Fehler':'Alles bestanden');process.exit(fail?1:0);
})();
