// Grobe Fortschritts-Simulation: ein aktiver Spieler mit 75 % Score, echte Spieldaten und Formeln.
// Aufruf: node tools/pace.mjs            Spielminuten bis zu jedem Level (pausenlos gespielt)
//        node tools/pace.mjs --days=14  spätes Spiel im Tagesrhythmus: 1 h aktiv, dann 8 h offline (mehr rechnet das Spiel nicht an)
// Vereinfachungen: Basispreise (keine Marktschwankung), LKW-Fahrten zum Stadtmarkt mit 85 % Zustand,
// ein Auftrag alle 3 Minuten ab Level 2, keine Farm/Laden/Untergrund, Betriebe immer gewartet.
// Mit --days zusätzlich: Export per Flugzeug (Nachfrage im Schnitt ×1,5), Übernahmen, Großprojekte und Konkurrenzwachstum.
const D=await import('../src/data.js');
const {G,ST,BLD,UP,xpFor,LV_XP,RIVALS,TAKE_PREM,TAKE_DIV,PROJECTS,AIRPORT_COST,airUpBase,MODES}=D;
const DAYS=+(process.argv.find(a=>a.startsWith('--days='))||'=0').split('=')[1];
const DUR={timing:10,timingMove:10,mash:8,heat:14,heatMove:14,simon:25,whack:17,wall:18,catch:20,stack:15,bolts:12,mix:17,solder:15,pour:15,forge:12,pipes:20,wires:15,sort:17,phone:30,fish:25};
const SC=.75;
let t=0,money=30,xp=0;const stock={},b={},up={};Object.keys(G).forEach(g=>stock[g]=0);BLD.forEach(x=>b[x.id]=0);UP.forEach(u=>up[u.id]=0);
const lvl=()=>{let l=1;while(xp>=xpFor(l+1))l++;return l};
const cap=()=>100+100*up.store;
const station=g=>ST.find(s=>s.out===g&&!s.secret&&!s.grp&&!(s.lv>lvl()));
const goalXp={1:[20,20,40,30,60],2:[80,100,120,120,200,250],3:[100,150,200,100,250,300],4:[600,400],5:[1500,2500]};
const reached={};const log=[];
// Spätes Spiel (nur mit --days): Konkurrenz, Tochterfirmen, Großprojekte, Flughafen
let needP={}; // für Großprojekte zurückgehaltene Ware
const rivals=RIVALS.map(r=>({...r})),proj={},done=k=>!!proj[k]?.done;let air=0,airLvl=1,flights=[];const events=[];
function rivalsTick(dt){rivals.forEach(r=>{if(r.own){money+=r.paid*TAKE_DIV*dt/3600;return}const k=.00009*r.r;r.w=r.cap/(1+(r.cap/r.w-1)*Math.exp(-k*dt))})}
function passive(dt){
  if(DAYS){rivalsTick(dt);flights=flights.filter(f=>{if(f.end>t)return true;money+=f.v;xp+=Math.ceil(f.v/10);return false})}
  BLD.forEach(x=>{const L=b[x.id];if(!L)return;
    if(x.kind==='mine')stock[x.out]=Math.min(cap(),stock[x.out]+x.rate*L*dt*(done('bahnhof')?1.25:1)); // Verschleiß 1 % / 15 min: kein nennenswerter Ausfall
    if(x.kind==='fac'){let n=Math.floor(dt/(x.t/(1+.4*(L-1))/(done('kraftwerk')?1.25:1)));for(const k in x.in)n=Math.min(n,Math.floor(stock[k]/x.in[k]));
      for(const k in x.in)stock[k]-=x.in[k]*n;stock[x.out]+=n;xp+=n}});
}
function run(s){
  const d=s.games.reduce((a,g)=>a+DUR[g],0)/s.games.length+3;
  for(const k in s.in)stock[k]-=s.in[k];
  let out=Math.max(1,Math.round(SC*s.max*(1+.3*up[s.mult]+(done('techpark')?.2:0))));
  stock[s.out]+=out;xp+=out*Math.max(G[s.out].base>=15?4:1,Math.ceil(G[s.out].base/50))+1;
  t+=d;passive(d);
}
function make(g,depth=0){ // eine Station für g laufen lassen, vorher fehlende Zutaten herstellen
  const s=station(g);if(!s||depth>6)return false;
  for(const k in s.in)while(stock[k]<s.in[k])if(!make(k,depth+1))return false;
  run(s);return true;
}
function sell(){ // LKW zum Stadtmarkt: alles außer Rohstoffen, die für die Kette gebraucht werden
  const keep={erz:8,kohle:4,lehm:6,stahl:6,ziegel:4,sand:8,kupfer:4,oel:6,draht:4,kunststoff:6,glas:4,platine:2,akku:2,display:2,gehaeuse:2};
  let cargo=0,val=0;const cap=20+10*up.truck;
  for(const g of Object.keys(stock).sort((a,c)=>G[c].base-G[a].base)){const n=Math.min(Math.floor(stock[g]-Math.max(keep[g]||0,needP[g]||0)),cap-cargo);if(n<=0)continue;cargo+=n;val+=n*G[g].base;stock[g]-=n}
  if(!cargo)return;
  const pay=Math.floor(val*.85);money+=pay;xp+=Math.ceil(pay/8);t+=35;passive(35);
}
function exportFlight(){ // wertvolle Ware ins Ausland (Flugzeug), solange ein Slot frei ist
  if(!air||flights.length>=1+airLvl)return;
  const cp=MODES.plane.cap(airLvl);let n=0,val=0;
  for(const g of Object.keys(stock).filter(g=>G[g].base>=40).sort((a,c)=>G[c].base-G[a].base)){const k=Math.min(Math.floor(stock[g]-(needP[g]||0)),cp-n);if(k<=0)continue;n+=k;val+=k*G[g].base*1.5;stock[g]-=k}
  if(!n)return;flights.push({end:t+MODES.plane.t,v:Math.round(val*(1-MODES.plane.fee))});t+=20;passive(20);
}
function lateStep(){
  const L=lvl();
  if(L>=5&&!air&&money>=AIRPORT_COST*1.3){money-=AIRPORT_COST;air=1;events.push('Flughafen gebaut')}
  if(air&&money>=airUpBase(airLvl)*2.5&&airLvl<6){money-=airUpBase(airLvl);airLvl++}
  if(L>=6)for(const r of rivals.filter(r=>!r.own).sort((a,c)=>a.w-c.w)){const c=Math.ceil(r.w*TAKE_PREM);if(money>=c+3000){money-=c;r.own=1;r.paid=c;events.push(r.n+' übernommen ('+Math.round(c)+' Cr)')}break}
  needP={};const open=PROJECTS.find(p=>p.lv<=L&&!done(p.id));
  if(open){const st=proj[open.id]||(proj[open.id]={got:{}});
    for(const g in open.need){const k=Math.min(open.need[g]-(st.got[g]||0),Math.floor(stock[g]));if(k>0){stock[g]-=k;st.got[g]=(st.got[g]||0)+k;xp+=Math.ceil(k/2)}}
    if(Object.keys(open.need).every(g=>(st.got[g]||0)>=open.need[g])){st.done=1;money+=open.r;xp+=Math.round(open.r/10);events.push(open.n+' fertig')}
    else{const miss=Object.keys(open.need).filter(g=>(st.got[g]||0)<open.need[g]);for(const g of miss)needP[g]=open.need[g]-(st.got[g]||0);return miss[Math.floor(t/60)%miss.length]}}
  return null}
function invest(){ // günstigsten sinnvollen Betrieb/Upgrade kaufen, wenn genug Geld da ist
  const opts=[];
  BLD.filter(x=>x.kind!=='shop'&&!(x.lv>lvl())&&b[x.id]<10&&lvl()>=2&&(x.kind==='fac'||['erz','kohle','lehm','sand','kupfer','oel'].includes(x.out))&&!['kuhstall','huehnerstall'].includes(x.id))
    .forEach(x=>opts.push({c:Math.ceil(x.base*Math.pow(1.9,b[x.id])),f:()=>{b[x.id]++;xp+=10*b[x.id]}}));
  ['bench','pick','truck','store'].forEach(k=>{const u=UP.find(x=>x.id===k);opts.push({c:Math.ceil(u.base*Math.pow(1.8,up[k])),f:()=>{up[k]++;xp+=5}})});
  opts.sort((a,c)=>a.c-c.c);const o=opts[0];
  if(o&&money>=o.c*1.3&&!(DAYS&&lvl()>=6&&o.c>money*.3)){money-=o.c;o.f()} // ab Level 6 (mit --days) wird für Übernahmen gespart
}
let nextOrder=0;
function step(){
  const L=lvl();
  if(!reached[L]){reached[L]=t;log.push(`Level ${L} nach ${(t/60).toFixed(0).padStart(4)} min  (XP ${Math.round(xp)}, Geld ${Math.round(money)})`);(goalXp[L]||[]).forEach(r=>{xp+=r/4+5;money+=r})}
  const pt=DAYS?lateStep():null;
  const target=pt&&station(pt)&&Math.floor(t/90)%2?pt:L>=4&&station('handy')?'handy':L>=2?'maschine':'stahl'; // mit Großprojekt: abwechselnd fürs Projekt und für Geld
  if(!make(target)){make('erz')}
  if(DAYS)exportFlight();
  if(Object.keys(stock).reduce((a,g)=>a+stock[g]*G[g].base,0)>400)sell();
  invest();
  if(L>=2&&t>nextOrder){nextOrder=t+180;const val=(60+L*70)*1.1;money+=val*.9;xp+=val/8+5}
}
if(!DAYS){
  while(t<6*3600&&lvl()<7)step();
  log.forEach(l=>console.log(l));
  console.log('Schwellen:',LV_XP.slice(2).join(', '),'XP');
}else{
  const bw=()=>BLD.reduce((a,x)=>a+(b[x.id]?x.base*(Math.pow(1.9,b[x.id])-1)/.9:0),0);
  const nw=()=>money+Object.keys(stock).reduce((a,g)=>a+stock[g]*G[g].base,0)+bw()+rivals.filter(r=>r.own).reduce((a,r)=>a+r.w,0);
  const k=v=>v>=1e6?(v/1e6).toFixed(2)+'M':Math.round(v/1e3)+'k';
  console.log('Tag | Lv | Firmenwert | Konkurrenz (Wert, * = übernommen)                  | Ereignisse');
  for(let d=1;d<=DAYS;d++){
    const end=t+3600;while(t<end)step();
    t+=8*3600;passive(8*3600); // offline: Betriebe, Konkurrenz, Gewinnanteile, Flüge
    console.log(String(d).padStart(3)+' | '+String(lvl()).padStart(2)+' | '+k(nw()).padStart(10)+' | '+rivals.map(r=>(r.own?'*':'')+r.n.split(' ')[0]+' '+k(r.w)).join(', ').padEnd(50)+' | '+events.splice(0).join('; '));
  }
}
