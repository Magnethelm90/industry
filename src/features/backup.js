/* Spielstand sichern: Sicherungscode zum Kopieren und Einfügen (Firmen-Übersicht) */
import {SAVE,xpFor} from '../data.js';
import {S,lockSave} from '../state.js';
import {$} from '../util.js';

const B64=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const UN64=t=>{const s=atob(t.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(s,c=>c.charCodeAt(0))};
const pipe=async(u,stream)=>new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(stream)).arrayBuffer());
const ZIP=typeof CompressionStream==='function'&&typeof DecompressionStream==='function';

// IA1 = komprimiert, IA0 = unkomprimiert (falls der Browser kein CompressionStream kennt)
export async function makeCode(){
  const o=Object.assign({},S);delete o.hist; // Preisverlauf baut sich von selbst neu auf
  const u=new TextEncoder().encode(JSON.stringify(o));
  return ZIP?'IA1.'+B64(await pipe(u,new CompressionStream('deflate-raw'))):'IA0.'+B64(u)}

// Liefert den Spielstand als Objekt oder wirft einen Fehler mit verständlichem Text
export async function readCode(code){
  const m=/^IA([01])\.([A-Za-z0-9_-]+)$/.exec(String(code).replace(/\s+/g,''));
  if(!m)throw new Error('Das ist kein Sicherungscode.');
  let u;try{u=UN64(m[2])}catch(e){throw new Error('Der Code ist beschädigt.')}
  if(m[1]==='1'){if(!ZIP)throw new Error('Dieser Browser kann den Code nicht entpacken.');
    try{u=await pipe(u,new DecompressionStream('deflate-raw'))}catch(e){throw new Error('Der Code ist unvollständig oder beschädigt.')}}
  let o;try{o=JSON.parse(new TextDecoder().decode(u),(k,v)=>k==='__proto__'||k==='constructor'||k==='prototype'?undefined:v)}catch(e){throw new Error('Der Code ist beschädigt.')}
  if(!o||typeof o!=='object'||typeof o.money!=='number'||typeof o.xp!=='number'||!o.stock||typeof o.stock!=='object')throw new Error('Der Code enthält keinen Spielstand.');
  return o}

export function backupHtml(){
  return `<div class="sec">Spielstand sichern</div>
    <p class="sub" style="margin-top:6px">Dein Spielstand liegt nur in diesem Browser. Mit dem Sicherungscode nimmst du ihn auf ein anderes Gerät mit oder holst ihn nach dem Löschen der Browserdaten zurück.</p>
    <div class="mrow"><button class="btn sm b" id="bkmake">Code erzeugen</button><button class="btn sm ghost" id="bkopen">Code laden</button></div>
    <div id="bkbox"></div>`}

export function bindBackup(){
  const box=$('bkbox');
  $('bkmake').onclick=async()=>{
    box.innerHTML=`<textarea class="code" id="bkcode" readonly rows="4"></textarea><div class="mrow"><button class="btn sm a" id="bkcopy">Kopieren</button></div><p class="sub" id="bkmsg"></p>`;
    const ta=$('bkcode');ta.value=await makeCode();$('bkmsg').textContent=ta.value.length.toLocaleString('de-DE')+' Zeichen · Bewahre den Code z. B. in deinen Notizen auf.';
    $('bkcopy').onclick=()=>{const done=t=>$('bkmsg').textContent=t;
      try{navigator.clipboard.writeText(ta.value).then(()=>done('✅ Kopiert!'),()=>{ta.select();done('Text ist markiert – bitte selbst kopieren.')})}catch(e){ta.select();done('Text ist markiert – bitte selbst kopieren.')}}};
  $('bkopen').onclick=()=>{
    box.innerHTML=`<textarea class="code" id="bkin" rows="4" placeholder="Sicherungscode hier einfügen"></textarea><div class="mrow"><button class="btn sm r" id="bkload">Laden</button></div><p class="sub" id="bkmsg"></p>`;
    let sure=false;
    $('bkload').onclick=async()=>{const msg=$('bkmsg');
      let o;try{o=await readCode($('bkin').value)}catch(e){msg.textContent='⚠️ '+e.message;sure=false;return}
      // Bestätigung direkt im Knopf (Browser-Dialoge sind nicht überall erlaubt)
      if(!sure){sure=true;$('bkload').textContent='Ja, aktuellen Stand überschreiben';let L=1;while(o.xp>=xpFor(L+1))L++;
        msg.textContent='Gefunden: Level '+L+', '+Math.round(o.money).toLocaleString('de-DE')+' Credits. Dein jetziger Stand geht dabei verloren.';return}
      o.last=Date.now();lockSave();
      try{localStorage.setItem(SAVE,JSON.stringify(o))}catch(e){lockSave(false);msg.textContent='⚠️ Dieser Browser erlaubt kein Speichern.';return}
      location.reload()}}}
