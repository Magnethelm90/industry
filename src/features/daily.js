/* Antrieb: drei Tagesaufgaben mit Serie, dazu Erfolge mit Belohnung */
import {SFX,burst,fx,toast,vib} from '../fx.js';
import {S,lvl} from '../state.js';
import {fmt} from '../util.js';
import {render} from '../app.js';
import {bindX,closeOv,openOv,xbtn} from '../ui.js';
import {$} from '../util.js';

const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
// Zähler, an denen Aufgaben und Erfolge hängen
const CNT={make:()=>sum(S.st.make),sold:()=>S.st.sold,perf:()=>S.st.perf,drives:()=>S.st.drives,orders:()=>S.st.orders,harvest:()=>S.st.harvest};
// need: Ziel in Abhängigkeit vom Level, lv: ab welchem Level die Aufgabe vorkommt
export const KINDS={
  make:{t:n=>`${n} Waren herstellen`,need:L=>6+2*L,lv:1,e:'🔨'},
  perf:{t:n=>`${n} Runden mit mindestens 85 %`,need:L=>2+Math.floor(L/3),lv:1,e:'🎯'},
  sold:{t:n=>`${n} Waren verkaufen`,need:L=>5+2*L,lv:1,e:'💰'},
  drives:{t:n=>n===1?'1 Lieferung mit dem LKW':`${n} Lieferungen mit dem LKW`,need:L=>1+Math.floor(L/5),lv:1,e:'🚚'},
  orders:{t:n=>n===1?'1 Auftrag erfüllen':`${n} Aufträge erfüllen`,need:L=>1+Math.floor(L/6),lv:2,e:'📋'},
  harvest:{t:n=>n===1?'1× ernten':`${n}× ernten`,need:L=>2+Math.floor(L/2),lv:3,e:'🌾'}
};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const yesterday=()=>{const d=new Date();d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
export const taskReward=()=>Math.round(40*(1+.35*lvl()));
export const chestReward=()=>Math.round(120*(1+.3*lvl())*(1+Math.min(S.daily.streak+1,7)*.1));

function roll(){
  const L=lvl(),D=S.daily,ks=Object.keys(KINDS).filter(k=>KINDS[k].lv<=L&&!['make','perf'].includes(k));
  const pick=['make','perf'];const x=ks[Math.floor(Math.random()*ks.length)];pick.push(x);
  D.day=today();D.chest=0;
  D.tasks=pick.map(k=>({k,need:KINDS[k].need(L),base:CNT[k](),done:0}));
}
export const taskProg=t=>Math.max(0,Math.min(t.need,CNT[t.k]()-t.base));

// Erfolge: Zähler und Stufen
export const ACH=[
  ...[[10,'Erste Schritte'],[100,'Fleißige Hände'],[1000,'Fließband']].map(([n,t],i)=>({id:'make'+i,t:t+' · '+n+' Waren herstellen',e:'🔨',v:()=>CNT.make(),n,r:[50,400,4000][i]})),
  ...[[10,'Sauber gearbeitet'],[50,'Präzision'],[200,'Meisterhand']].map(([n,t],i)=>({id:'perf'+i,t:t+' · '+n+' Runden mit 85 % +',e:'⭐',v:()=>CNT.perf(),n,r:[80,500,4000][i]})),
  ...[[20,'Erste Verkäufe'],[200,'Händler'],[2000,'Großhändler']].map(([n,t],i)=>({id:'sold'+i,t:t+' · '+n+' Waren verkaufen',e:'💰',v:()=>CNT.sold(),n,r:[60,500,5000][i]})),
  ...[[5,'Fahrer'],[25,'Spediteur']].map(([n,t],i)=>({id:'drv'+i,t:t+' · '+n+' LKW-Lieferungen',e:'🚚',v:()=>CNT.drives(),n,r:[150,1200][i]})),
  ...[[3,'Zuverlässig'],[20,'Stammlieferant']].map(([n,t],i)=>({id:'ord'+i,t:t+' · '+n+' Aufträge erfüllen',e:'📋',v:()=>CNT.orders(),n,r:[200,2000][i]})),
  {id:'lv5',t:'Level 5 erreichen',e:'🏅',v:()=>lvl(),n:5,r:500},{id:'lv10',t:'Level 10 erreichen',e:'🏆',v:()=>lvl(),n:10,r:5000},
  {id:'cash1',t:'10.000 Cr besitzen',e:'🪙',v:()=>S.money,n:1e4,r:300},{id:'cash2',t:'1 Mio. Cr besitzen',e:'💎',v:()=>S.money,n:1e6,r:20000},
  {id:'rec',t:'3 geheime Rezepte entdecken',e:'🧪',v:()=>Object.keys(S.rec).length,n:3,r:1000},
  {id:'streak',t:'7 Tage in Folge alle Aufgaben',e:'🔥',v:()=>S.daily.streak,n:7,r:3000}
];

let tick=0;
export function tickDaily(){
  if(S.daily.day!==today()||!S.daily.tasks.length){
    // Neuer Tag: die Serie bleibt nur bestehen, wenn gestern alles geschafft wurde
    if(S.daily.last!==yesterday()&&S.daily.last!==today())S.daily.streak=0;
    roll();
  }
  const D=S.daily;
  for(const t of D.tasks)if(!t.done&&taskProg(t)>=t.need){
    t.done=1;S.money+=taskReward();S.xp+=Math.round(taskReward()/4);SFX.perfect();vib([20,30,60]);
    fx('+'+fmt(taskReward())+' Cr','#34d399');toast('✅ Tagesaufgabe geschafft: '+KINDS[t.k].t(t.need));render()}
  if(!D.chest&&D.tasks.every(t=>t.done)){
    D.chest=1;D.streak=(D.last===yesterday()?D.streak:0)+1;D.last=today();
    const r=chestReward();S.money+=r;S.xp+=Math.round(r/4);SFX.win();vib([40,40,120]);burst(innerWidth/2,innerHeight*.4,'#fde047',34);
    toast(`🎁 Alle Tagesaufgaben geschafft! +${fmt(r)} Cr · Serie ${D.streak} Tag${D.streak>1?'e':''}`);render()}
  if(++tick%2)return;
  for(const a of ACH)if(!S.ach[a.id]&&a.v()>=a.n){
    S.ach[a.id]=1;S.money+=a.r;S.xp+=Math.round(a.r/5);SFX.win();vib([30,40,80]);
    burst(innerWidth/2,innerHeight*.3,'#a78bfa',28);toast(`🏆 Erfolg: ${a.t} · +${fmt(a.r)} Cr`);render();break}
}

// Karte für die Werkstatt
export function dailyCard(onAch){
  const D=S.daily;if(!D.tasks.length)return null;
  const d=document.createElement('div');d.className='card daily';d.style.setProperty('--c','#34d399');
  const rows=D.tasks.map(t=>{const p=taskProg(t),K=KINDS[t.k];
    return `<div class="dt ${t.done?'ok':''}"><span class="de">${t.done?'✅':K.e}</span><span class="dx">${K.t(t.need)}<i class="dm"><b style="width:${p/t.need*100}%"></b></i></span><span class="dp">${t.done?'+'+fmt(taskReward()):p+' / '+t.need}</span></div>`}).join('');
  d.innerHTML=`<div class="i"><div class="dh">📅 Tagesaufgaben <span class="chip ${D.streak?'up':''}">🔥 Serie ${D.streak}</span></div>${rows}
    <small>${D.chest?'🎁 Tageskiste geholt – morgen gibt es neue Aufgaben.':'🎁 Alle drei geschafft: Tageskiste mit '+fmt(chestReward())+' Cr. Je länger die Serie, desto mehr.'}</small>
    <small><a href="#" class="ach">🏆 ${Object.keys(S.ach).length} / ${ACH.length} Erfolge ansehen</a></small></div>`;
  d.querySelector('.ach').onclick=e=>{e.preventDefault();onAch()};
  return d;
}

export function openAch(){
  const rows=ACH.map(a=>{const on=!!S.ach[a.id],v=Math.min(a.n,a.v());
    return `<div class="achrow ${on?'':'off'}"><span class="ae">${on?a.e:'🔒'}</span><span class="at">${a.t}${on?'':`<i class="dm"><b style="width:${v/a.n*100}%"></b></i>`}</span><span class="ar">${on?'✅':'+'+fmt(a.r)+' Cr'}</span></div>`}).join('');
  openOv(xbtn()+`<h3>🏆 Erfolge</h3><div class="sub">${Object.keys(S.ach).length} von ${ACH.length} geschafft. Die Belohnung kommt automatisch, sobald du ein Ziel erreichst.</div>${rows}<button class="btn big b" id="done" style="margin-top:12px">Schließen</button>`);
  bindX();$('done').onclick=closeOv;
}
