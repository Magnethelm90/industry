/* Labor: geheime Rezepte entdecken (Mischspiel + Rätsel) und forschen (dauerhafte Boni) */
import {CATS,G,REC,RES,catOf} from '../data.js';
import {SFX,burst,fx,toast,vib} from '../fx.js';
import {GKU,S,cap,lvl} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,fmt,ic} from '../util.js';
import {gMix} from '../games/mix.js';
import {play} from '../games/gate.js';

const ICON='<span style="font-size:52px;line-height:1">🧪</span>';
let tab='exp',cat='alle',all=false;
// Kolbeninhalt bleibt erhalten, solange das Labor offen ist: {g, ok} – ok: true/false = Ergebnis des letzten Versuchs
let sel=[];

const unlocked=r=>(G[r.out].lv||1)<=lvl();
const open=()=>REC.filter(r=>!S.rec[r.out]&&unlocked(r));
const resCost=r=>Math.round(r.c*(r.rep?Math.pow(1.6,S.lab.done[r.id]||0):1));
const fmtT=s=>s>=60?Math.ceil(s/60)+' min':Math.ceil(s)+' s';
// Spektralanalyse: Rezept mit den wenigsten bekannten Zutaten bekommt eine neue
function analyseTarget(){return open().map(r=>({r,k:(S.lab.rev[r.out]||[]).length})).filter(x=>x.k<2).sort((a,b)=>a.k-b.k)[0]?.r}
function resState(r){
  const n=S.lab.done[r.id]||0,run=S.lab.res&&S.lab.res.id===r.id;
  if(run)return 'run';if(n&&!r.rep)return 'done';
  if(r.lv>lvl())return 'lv';if(r.need&&!S.lab.done[r.need])return 'need';
  if(r.id==='analyse'&&!analyseTarget())return 'none';return 'ok'}

// Läuft im Spieltakt (auch direkt nach dem Start, für die Zeit, in der die App zu war)
export function tickLab(){
  const q=S.lab.res;if(!q||Date.now()<q.until)return;
  S.lab.res=null;const r=RES.find(x=>x.id===q.id);if(!r)return;
  S.lab.done[r.id]=(S.lab.done[r.id]||0)+1;let extra='';
  if(r.id==='analyse'){const t=analyseTarget();if(t){const kn=S.lab.rev[t.out]||[],g=t.in.filter(x=>!kn.includes(x))[Math.floor(Math.random()*(3-kn.length))];
    S.lab.rev[t.out]=[...kn,g];extra=': '+G[g].n+' gehört in ein unbekanntes Rezept'}}
  SFX.win();toast('🔬 Forschung fertig – '+r.n+extra);
  if($('labres'))draw()}

function head(){
  return xbtn()+`<h3>Labor</h3><div class="cats" style="margin-bottom:6px">${[['exp','🧪 Experiment'],['res','🔬 Forschung'+(S.lab.res?' ⏳':'')]].map(([k,n])=>`<button class="chip2 ${k===tab?'on':''}" data-t="${k}">${n}</button>`).join('')}</div>`}

function expHtml(msg,cls){
  const goods=GKU().filter(g=>!G[g].secret),known=REC.filter(r=>S.rec[r.out]).length;
  const shown=goods.filter(g=>(cat==='alle'||catOf(g)===cat)&&(all||S.stock[g]>=1||sel.some(x=>x.g===g)));
  const cats=CATS.filter(([k])=>k==='alle'||goods.some(g=>catOf(g)===k));
  const ready=sel.length===3&&sel.every(x=>S.stock[x.g]>=1);
  return `<div class="sub">Fülle drei Kolben und misch sie. Nach einem Fehlversuch zeigt jeder Kolben, ob seine Zutat in ein unbekanntes Rezept gehört: ✓ bleibt drin, ✗ ${S.lab.done.rein?'kannst du austauschen':'ist verbraucht'}.</div>
   <div class="flasks">${[0,1,2].map(i=>{const x=sel[i];return `<button class="flask ${x?'full':''}" data-i="${i}" style="--c:${x?G[x.g].c:'#475569'}">${x?ic(x.g,34):'<span>+</span>'}${x&&x.ok!=null?`<b class="fmark ${x.ok?'y':'n'}">${x.ok?'✓':'✗'}</b>`:''}</button>`}).join('')}</div>
   <div class="msg ${cls||''}" id="lm">${msg||(sel.length<3?'Wähle '+(3-sel.length)+' Zutat'+(sel.length===2?'':'en'):'Bereit zum Mischen')}</div>
   <button class="btn big b" id="exp" ${ready?'':'disabled'}>🧪 Mischen</button>
   <div class="cats">${cats.map(([k,n])=>`<button class="chip2 ${k===cat?'on':''}" data-c="${k}">${n}</button>`).join('')}<button class="chip2 ${all?'on':''}" id="lall">${all?'Alle Waren':'Nur auf Lager'}</button></div>
   <div class="pick">${shown.length?shown.map(g=>{const on=sel.some(x=>x.g===g);return `<button class="pk ${on?'on':''}" data-g="${g}" ${S.stock[g]<1&&!on?'disabled':''}>${ic(g,28)}<span>${G[g].n}</span><small class="num">${Math.floor(S.stock[g])}</small></button>`}).join(''):'<div class="sub" style="grid-column:1/-1">Hier ist nichts auf Lager.</div>'}</div>
   <div class="sec">Rezeptbuch · ${known} / ${REC.length}</div>
   ${REC.map(r=>{const k=S.rec[r.out],lk=!unlocked(r),rv=S.lab.rev[r.out]||[];
     const recipe=k?r.in.map(x=>G[x].n).join(' + '):lk?'🔒 ab Level '+G[r.out].lv:'Hinweis: '+r.hint+(rv.length?`<br>🔬 ${[...rv.map(x=>G[x].n),...Array(3-rv.length).fill('?')].join(' + ')}`:'');
     return `<div class="card ${k?'':'idle'}" style="--c:${G[r.out].c}"><div class="art" style="width:44px;height:44px;flex-basis:44px">${k?ic(r.out,32):'<b style="font-size:20px;color:var(--mut)">?</b>'}</div><div class="i">${k?G[r.out].n+' <span class="chip num">~'+G[r.out].base+' Cr</span>':'???'}<small>${recipe}</small></div></div>`}).join('')}`}

function resHtml(){
  const q=S.lab.res;
  return `<div class="sub">Forschung kostet Credits und Zeit. Es läuft immer nur eine, auch wenn die App geschlossen ist.</div><div id="labres">
   ${RES.map(r=>{const st=resState(r),c=resCost(r),n=S.lab.done[r.id]||0;
     let right='';
     if(st==='run'){const left=Math.max(0,(q.until-Date.now())/1000),pc=100-left/r.t*100;right=`<div style="flex:0 0 96px"><div class="timer"><i id="rbar" style="width:${pc}%"></i></div><small class="num" id="rleft">noch ${fmtT(left)}</small></div>`}
     else if(st==='done')right='<span class="chip up">✓ erforscht</span>';
     else if(st==='lv')right=`<span class="chip">🔒 Level ${r.lv}</span>`;
     else if(st==='need')right=`<span class="chip">🔒 erst ${RES.find(x=>x.id===r.need).n}</span>`;
     else if(st==='none')right='<span class="chip">nichts zu analysieren</span>';
     else right=`<button class="btn sm ${q||S.money<c?'ghost':'b'}" data-r="${r.id}" ${q||S.money<c?'disabled':''}>${fmt(c)} Cr<span class="num">${fmtT(r.t)}</span></button>`;
     return `<div class="card ${st==='done'?'':st==='ok'||st==='run'?'':'idle'}" style="--c:#22d3ee"><div class="i">${r.n}${r.rep&&n?' <span class="chip num">'+n+'×</span>':''}<small>${r.d}</small></div>${right}</div>`}).join('')}</div>`}

let lastMsg=null;
function draw(msg,cls){
  if(msg!==undefined)lastMsg=[msg,cls];else if(tab==='exp'&&lastMsg)[msg,cls]=lastMsg;
  openOv(head()+(tab==='exp'?expHtml(msg,cls):resHtml()));bindX();
  document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;lastMsg=null;SFX.tick();draw()});
  if(tab==='res'){
    document.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{
      const r=RES.find(x=>x.id===b.dataset.r),c=resCost(r);if(S.lab.res||S.money<c||resState(r)!=='ok')return;
      S.money-=c;S.lab.res={id:r.id,until:Date.now()+r.t*1000};SFX.buy();vib(12);draw()});
    // Fortschrittsbalken mitlaufen lassen, solange der Reiter offen ist
    const box=$('labres'),iv=setInterval(()=>{if(!box.isConnected)return clearInterval(iv);const q=S.lab.res,r=q&&RES.find(x=>x.id===q.id);if(!r||!$('rbar'))return;
      const left=Math.max(0,(q.until-Date.now())/1000);$('rbar').style.width=(100-left/r.t*100)+'%';$('rleft').textContent='noch '+fmtT(left)},1000);
    return}
  document.querySelectorAll('.pk').forEach(b=>b.onclick=()=>{const g=b.dataset.g;
    if(sel.some(x=>x.g===g))sel=sel.filter(x=>x.g!==g);else if(sel.length<3)sel.push({g});else return;
    sel.forEach(x=>x.ok=null);SFX.tick();draw(null)});
  document.querySelectorAll('.flask').forEach(f=>f.onclick=()=>{const i=+f.dataset.i;if(sel[i]){sel.splice(i,1);sel.forEach(x=>x.ok=null);SFX.tick();draw(null)}});
  document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{cat=b.dataset.c;SFX.tick();draw()});
  $('lall').onclick=()=>{all=!all;SFX.tick();draw()};
  $('exp').onclick=experiment;
}

async function experiment(){
  if(sel.length<3||sel.some(x=>S.stock[x.g]<1))return;
  const gs=sel.map(x=>x.g);gs.forEach(g=>S.stock[g]-=1);
  const sc=await play(()=>gMix({title:'Experiment',how:'Schenk die drei Zutaten im Verhältnis der Skala rechts ein. Je genauer, desto mehr bekommst du heraus, wenn das Rezept stimmt.',ing:gs.map(g=>({n:G[g].n,c:G[g].c,icon:ic(g,30)}))}),ICON);
  if(sc==null){gs.forEach(g=>S.stock[g]+=1);return} // abgebrochen: nichts verbraucht
  const r=REC.find(r=>r.in.every(x=>gs.includes(x)));
  if(r&&!unlocked(r)){gs.forEach(g=>S.stock[g]+=1);SFX.miss();draw('⚗️ Es reagiert – aber zu instabil. Dieses Rezept gelingt erst ab Level '+G[r.out].lv+'. Zutaten zurück.','bad');return}
  if(r){
    const isNew=!S.rec[r.out],n=1+(sc>=.7?1:0)+(S.lab.done.kat?1:0);
    S.rec[r.out]=1;delete S.lab.rev[r.out];S.stock[r.out]=Math.min(cap(),S.stock[r.out]+n);S.xp+=isNew?40:5;
    SFX.win();vib([40,40,120]);burst(innerWidth/2,innerHeight*.3,G[r.out].c,30);if(isNew)fx('NEU: '+G[r.out].n,G[r.out].c);
    sel=[];draw((isNew?'🎉 Rezept entdeckt: ':'Hergestellt: ')+n+'× '+G[r.out].n+(sc>=.7?' (saubere Mischung +1)':' – genauer mischen gibt +1'),'good');return}
  // Fehlversuch: Abgleich mit dem unbekannten Rezept, das am besten passt
  const best=open().map(r=>r.in.filter(x=>gs.includes(x))).sort((a,b)=>b.length-a.length)[0]||[];
  sel.forEach(x=>{x.ok=best.includes(x.g);if(x.ok||S.lab.done.rein)S.stock[x.g]+=1});
  sel=sel.filter(x=>x.ok).concat(sel.filter(x=>!x.ok));
  SFX.miss();
  draw(best.length===2?'💨 Fast! Zwei Zutaten passen – tausch die mit ✗ aus.':best.length===1?'💨 Eine Zutat passt zu einem unbekannten Rezept.':'💨 Keine dieser Zutaten gehört in ein unbekanntes Rezept.','bad');
}

export function openLab(t){if(t==='exp'||t==='res')tab=t;sel=sel.filter(x=>S.stock[x.g]>=1);lastMsg=null;draw()}
export const labStatus=()=>{const q=S.lab.res;if(!q)return '';const r=RES.find(x=>x.id===q.id);return r?'🔬 '+r.n+' · noch '+fmtT(Math.max(0,(q.until-Date.now())/1000)):''};
