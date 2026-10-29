/* Ziele: geführter Einstieg mit Belohnungen */
import {cur,go,render} from '../app.js';
import {BLD} from '../data.js';
import {SFX,burst,fx,toast,vib} from '../fx.js';
import {S,lvl} from '../state.js';
import {fmt} from '../util.js';

const made=g=>S.st.make[g]||0;
// go: Bildschirm, hl: Element, das beim Tippen auf „Zeigen" aufleuchtet, r: Belohnung in Credits
export const GOALS=[
  {t:'Eisenerz abbauen',d:'Tippe bei „Eisenerz abbauen" auf Spielen. Jede Station lost eins ihrer Minispiele aus.',go:'work',hl:'[data-st="erz"] .btn',ok:()=>made('erz')>=1,r:20},
  {t:'Kohle abbauen',d:'Für Stahl brauchst du neben Erz auch Kohle.',go:'work',hl:'[data-st="kohle"] .btn',ok:()=>made('kohle')>=1,r:20},
  {t:'Stahl schmelzen',d:'Der Schmelzofen macht aus 4 Erz und 2 Kohle Stahl. Fehlt etwas, bau es nochmal ab.',go:'work',hl:'[data-st="stahl"] .btn',ok:()=>made('stahl')>=1,r:40},
  {t:'Im Markt verkaufen',d:'Im Markt bekommst du sofort Geld – aber 25 % unter Marktpreis.',go:'market',hl:'#s-market [data-a="sell"]:not([disabled])',ok:()=>S.st.sold>=1,r:30},
  {t:'Mit dem LKW liefern',d:'Lade Ware auf und fahr zum Stadtmarkt. Weichst du allem aus, gibt es den vollen Preis.',go:'logistics',hl:'#s-logistics .truck',ok:()=>S.st.drives>=1,r:60},
  {t:'Erste Mine bauen',lv:2,d:'Betriebe arbeiten von allein – auch wenn die App zu ist. Die Lehmgrube ist die günstigste.',go:'bld',hl:'[data-b="lehmgrube"] .btn',ok:()=>BLD.some(b=>b.kind==='mine'&&S.b[b.id].lvl>0),r:80},
  {t:'Einen Auftrag erfüllen',lv:2,d:'Nimm eine Anfrage an und liefere die Ware vor Ablauf der Frist.',go:'orders',hl:'#s-orders .btn.b',ok:()=>S.st.orders>=1,r:100},
  {t:'Eine Maschine montieren',lv:2,d:'Aus 3 Stahl und 2 Ziegeln wird eine Maschine – deine erste wertvolle Ware.',go:'work',hl:'[data-st="maschine"] .btn',ok:()=>made('maschine')>=1,r:120},
  {t:'Ein Feld abernten',lv:3,d:'Säe Weizen, gieß ihn und ernte nach etwa einer Minute.',go:'farm',hl:'#s-farm .plot',ok:()=>S.st.harvest>=1,r:100},
  {t:'Ein Regal im Laden füllen',lv:3,d:'Im eigenen Laden setzt du die Preise selbst. Kunden kaufen von allein.',go:'shop',hl:'#s-shop .shelf',ok:()=>S.shop.slots.some(s=>s.g&&s.qty>0)||S.shop.sold>0,r:100},
  {t:'Ein geheimes Rezept entdecken',lv:3,d:'Kombiniere im Labor drei Zutaten. Tipp: Stein, Metall und Brennstoff.',go:'work',hl:'#lab .btn',ok:()=>Object.keys(S.rec).length>0,r:200},
  {t:'Ein Smartphone bauen',lv:4,d:'Stell Platine, Akku, Display und Gehäuse her und bau alles zusammen.',go:'work',hl:'[data-st="handy"] .btn',ok:()=>made('handy')>=1,r:500},
  {t:'Den Flughafen bauen',lv:5,d:'Unter Logistik. Danach zahlen 5 Länder ein Vielfaches für gefragte Waren.',go:'logistics',hl:'#s-logistics .btn.a',ok:()=>!!S.exp.built,r:1500}
];
const xpOf=g=>Math.round(g.r/4)+5;
const ready=g=>(g.lv||1)<=lvl()&&g.ok();

// Wer schon weit ist (alter Spielstand), bekommt den Einstieg nicht mehr gezeigt
export function initGoals(){if(S.goal==null)S.goal=S.xp>=160?GOALS.length:0}

let told=-1;
export function tickGoals(){
  const g=GOALS[S.goal];if(!g||told===S.goal||!ready(g))return;
  told=S.goal;SFX.perfect();toast('🎯 Ziel geschafft: '+g.t+' – hol dir die Belohnung!');render();
}

export let hl=null;
export function applyHl(scroll){
  if(!hl||Date.now()>hl.until)return;
  const e=document.querySelector(hl.sel);if(!e)return;
  e.classList.add('hl');if(scroll)e.scrollIntoView({block:'center',behavior:'smooth'});
}
function show(){
  const g=GOALS[S.goal];if(g.go!==cur)go(g.go);
  if(g.hl){hl={sel:g.hl,until:Date.now()+6000};applyHl(true)}
}
function claim(e){
  const g=GOALS[S.goal];if(!g||!ready(g))return;
  S.money+=g.r;S.xp+=xpOf(g);S.goal++;
  SFX.win();vib([30,40,80]);burst(e.clientX,e.clientY,'#34d399',24);fx('+'+fmt(g.r)+' Cr','#34d399',e.clientX,e.clientY-30);render();
}

export function goalCard(){
  const g=GOALS[S.goal];if(!g)return null;
  const d=document.createElement('div'),L=lvl(),n=`Ziel ${S.goal+1} / ${GOALS.length}`;
  if((g.lv||1)>L){
    const a=40*(L-1)*(L-1),b=40*L*L;
    d.className='goal wait';
    d.innerHTML=`<div class="gi">⭐</div><div class="i"><small>${n} · ab Level ${g.lv}</small>${g.t}<div class="meter" style="height:5px"><i style="width:${Math.min(100,(S.xp-a)/(b-a)*100)}%"></i></div><small>Noch ${Math.ceil(b-S.xp)} XP bis Level ${L+1}: stell Waren her, verkaufe sie, liefere mit dem LKW.</small></div>`;
    return d;
  }
  if(g.ok()){
    d.className='goal done';
    d.innerHTML=`<div class="gi">✅</div><div class="i"><small>${n} · geschafft!</small>${g.t}</div><button class="btn pulse">Abholen<br>+${fmt(g.r)}</button>`;
    d.querySelector('button').onclick=claim;return d;
  }
  d.className='goal';
  d.innerHTML=`<div class="gi">🎯</div><div class="i"><small>${n} · Belohnung ${fmt(g.r)} Cr</small>${g.t}<small>${g.d}</small></div>${g.go!==cur||g.hl?'<button class="btn b">Zeigen</button>':''}`;
  const b=d.querySelector('button');if(b)b.onclick=show;
  return d;
}
