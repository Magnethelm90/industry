/* Spielstand sichern: Sicherungscode zum Kopieren und Einfügen (Firmen-Übersicht) */
import {SAVE,xpFor} from '../data.js';
import {S,lockSave} from '../state.js';
import {$} from '../util.js';

const B64=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const UN64=t=>{const s=atob(t.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(s,c=>c.charCodeAt(0))};
const pipe=async(u,stream)=>new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(stream)).arrayBuffer());
const ZIP=typeof CompressionStream==='function'&&typeof DecompressionStream==='function';
// Grenzen gegen manipulierte Codes: Länge des Codes und Größe nach dem Entpacken (sonst „Zip-Bombe“)
const MAX_CODE=400000,MAX_JSON=2e6;
async function inflate(u){
  const r=new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),parts=[];let n=0;
  for(;;){const {done,value}=await r.read();if(done)break;n+=value.length;if(n>MAX_JSON){r.cancel().catch(()=>{});throw new RangeError()}parts.push(value)}
  const out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
// Ein Spielstand enthält nur Zahlen, Wahrheitswerte und kurze, harmlose Texte. Alles, was als HTML oder Skript
// wirken könnte (spitze Klammern, Anführungszeichen, Backslash), wird abgelehnt – das Spiel setzt Namen per innerHTML ein.
const BAD=/[<>"'`\\]/;
function safe(v,d=0){
  if(d>12)return false;
  if(typeof v==='string')return v.length<=120&&!BAD.test(v);
  if(typeof v==='number')return Number.isFinite(v);
  if(v===null||typeof v==='boolean')return true;
  if(typeof v!=='object')return false;
  return Object.keys(v).every(k=>k.length<=64&&!BAD.test(k)&&safe(v[k],d+1))}

// IA1 = komprimiert, IA0 = unkomprimiert (falls der Browser kein CompressionStream kennt)
export async function makeCode(){
  const o=Object.assign({},S);delete o.hist; // Preisverlauf baut sich von selbst neu auf
  const u=new TextEncoder().encode(JSON.stringify(o));
  return ZIP?'IA1.'+B64(await pipe(u,new CompressionStream('deflate-raw'))):'IA0.'+B64(u)}

// Liefert den Spielstand als Objekt oder wirft einen Fehler mit verständlichem Text
export async function readCode(code){
  const t=String(code).replace(/\s+/g,'');if(t.length>MAX_CODE)throw new Error('Der Code ist zu lang.');
  const m=/^IA([01])\.([A-Za-z0-9_-]+)$/.exec(t);
  if(!m)throw new Error('Das ist kein Sicherungscode.');
  let u;try{u=UN64(m[2])}catch(e){throw new Error('Der Code ist beschädigt.')}
  if(m[1]==='1'){if(!ZIP)throw new Error('Dieser Browser kann den Code nicht entpacken.');
    try{u=await inflate(u)}catch(e){throw new Error(e instanceof RangeError?'Der Code ist zu groß.':'Der Code ist unvollständig oder beschädigt.')}}
  else if(u.length>MAX_JSON)throw new Error('Der Code ist zu groß.');
  let o;try{o=JSON.parse(new TextDecoder().decode(u),(k,v)=>k==='__proto__'||k==='constructor'||k==='prototype'?undefined:v)}catch(e){throw new Error('Der Code ist beschädigt.')}
  if(!o||typeof o!=='object'||Array.isArray(o)||typeof o.money!=='number'||typeof o.xp!=='number'||!o.stock||typeof o.stock!=='object')throw new Error('Der Code enthält keinen Spielstand.');
  if(!safe(o))throw new Error('Der Code enthält ungültige Zeichen und wird nicht geladen.');
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
