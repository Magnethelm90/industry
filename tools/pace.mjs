// Grobe Fortschritts-Simulation: ein aktiver Spieler mit 75 % Score, echte Spieldaten und Formeln.
// Aufruf: node tools/pace.mjs   (Ergebnis: Spielminuten bis zu jedem Level)
// Vereinfachungen: Basispreise (keine Marktschwankung), LKW-Fahrten zum Stadtmarkt mit 85 % Zustand,
// ein Auftrag alle 3 Minuten ab Level 2, keine Farm/Laden/Untergrund/Export, keine Pausen.
const D=await import('../src/data.js');
const {G,ST,BLD,UP,xpFor,LV_XP}=D;
const DUR={timing:10,timingMove:10,mash:8,heat:14,heatMove:14,simon:25,whack:17,wall:18,catch:20,stack:15,bolts:12,mix:17,solder:15,pour:15,forge:12,pipes:20,wires:15,sort:17,phone:30};
const SC=.75;
let t=0,money=30,xp=0;const stock={},b={},up={};Object.keys(G).forEach(g=>stock[g]=0);BLD.forEach(x=>b[x.id]=0);UP.forEach(u=>up[u.id]=0);
const lvl=()=>{let l=1;while(xp>=xpFor(l+1))l++;return l};
const cap=()=>100+100*up.store;
const station=g=>ST.find(s=>s.out===g&&!s.secret&&!s.grp&&!(s.lv>lvl()));
const goalXp={1:[20,20,40,30,60],2:[80,100,120,120,200,250],3:[100,150,200,100,250,300],4:[600,400],5:[1500,2500]};
const reached={};const log=[];
function passive(dt){
  BLD.forEach(x=>{const L=b[x.id];if(!L)return;
    if(x.kind==='mine')stock[x.out]=Math.min(cap(),stock[x.out]+x.rate*L*dt); // Verschleiß 1 % / 15 min: kein nennenswerter Ausfall
    if(x.kind==='fac'){let n=Math.floor(dt/(x.t/(1+.4*(L-1))));for(const k in x.in)n=Math.min(n,Math.floor(stock[k]/x.in[k]));
      for(const k in x.in)stock[k]-=x.in[k]*n;stock[x.out]+=n;xp+=n}});
}
function run(s){
  const d=s.games.reduce((a,g)=>a+DUR[g],0)/s.games.length+3;
  for(const k in s.in)stock[k]-=s.in[k];
  let out=Math.max(1,Math.round(SC*s.max*(1+.3*up[s.mult])));
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
  for(const g of Object.keys(stock).sort((a,c)=>G[c].base-G[a].base)){const n=Math.min(Math.floor(stock[g]-(keep[g]||0)),cap-cargo);if(n<=0)continue;cargo+=n;val+=n*G[g].base;stock[g]-=n}
  if(!cargo)return;
  const pay=Math.floor(val*.85);money+=pay;xp+=Math.ceil(pay/8);t+=35;passive(35);
}
function invest(){ // günstigsten sinnvollen Betrieb/Upgrade kaufen, wenn genug Geld da ist
  const opts=[];
  BLD.filter(x=>x.kind!=='shop'&&!(x.lv>lvl())&&b[x.id]<10&&lvl()>=2&&(x.kind==='fac'||['erz','kohle','lehm','sand','kupfer','oel'].includes(x.out))&&!['kuhstall','huehnerstall'].includes(x.id))
    .forEach(x=>opts.push({c:Math.ceil(x.base*Math.pow(1.9,b[x.id])),f:()=>{b[x.id]++;xp+=10*b[x.id]}}));
  ['bench','pick','truck','store'].forEach(k=>{const u=UP.find(x=>x.id===k);opts.push({c:Math.ceil(u.base*Math.pow(1.8,up[k])),f:()=>{up[k]++;xp+=5}})});
  opts.sort((a,c)=>a.c-c.c);const o=opts[0];if(o&&money>=o.c*1.3){money-=o.c;o.f()}
}
let nextOrder=0;
while(t<6*3600&&lvl()<7){
  const L=lvl();
  if(!reached[L]){reached[L]=t;log.push(`Level ${L} nach ${(t/60).toFixed(0).padStart(4)} min  (XP ${Math.round(xp)}, Geld ${Math.round(money)})`);(goalXp[L]||[]).forEach(r=>{xp+=r/4+5;money+=r})}
  const target=L>=4&&station('handy')?'handy':L>=2?'maschine':'stahl';
  if(!make(target)){make('erz')}
  if(Object.keys(stock).reduce((a,g)=>a+stock[g]*G[g].base,0)>400)sell();
  invest();
  if(L>=2&&t>nextOrder){nextOrder=t+180;const val=(60+L*70)*1.1;money+=val*.9;xp+=val/8+5}
}
log.forEach(l=>console.log(l));
console.log('Schwellen:',LV_XP.slice(2).join(', '),'XP');
