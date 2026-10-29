// Balance-Übersicht: Wertschöpfung pro Minute (Basispreise, Score 0,75, ohne Upgrades/Combo). Aufruf: node tools/balance.mjs
const D=await import('../src/data.js');
const {G,ST,BLD,CROPS,MODES,COUNTRIES,ROUTES}=D;
const DUR={timing:10,timingMove:10,mash:8,heat:14,heatMove:14,simon:25,whack:17,wall:18,catch:20,stack:15,bolts:12,mix:17,solder:15,pour:15,forge:12,pipes:20,wires:15,sort:17,phone:30};
const SC=.75,lv=s=>s.lv||G[s.out].lv||1;
const rows=ST.filter(s=>!s.secret||1).map(s=>{
  const t=s.games.reduce((a,g)=>a+DUR[g],0)/s.games.length+3;
  const out=Math.max(1,Math.round(SC*s.max));const vin=Object.keys(s.in).reduce((a,k)=>a+s.in[k]*G[k].base,0);
  const val=out*G[s.out].base,net=val-vin,xp=out*(G[s.out].base>=15?4:1)+1;
  return {id:s.id,lv:lv(s),t:Math.round(t),out,vin,val,net,perMin:Math.round(net/t*60),xpMin:Math.round(xp/t*60),marge:vin?+(val/vin).toFixed(2):Infinity};
});
rows.sort((a,b)=>a.lv-b.lv||b.perMin-a.perMin);
console.log('STATIONEN (Netto-Wertschöpfung/min bei 75 % Score, Basispreis)');
console.log('id'.padEnd(14),'lv','t(s)','out','in','wert','netto','Cr/min','XP/min','Faktor');
rows.forEach(r=>console.log(r.id.padEnd(14),String(r.lv).padStart(2),String(r.t).padStart(4),String(r.out).padStart(3),String(r.vin).padStart(4),String(r.val).padStart(5),String(r.net).padStart(5),String(r.perMin).padStart(6),String(r.xpMin).padStart(6),String(r.marge).padStart(6)));
// Betriebe
console.log('\nBETRIEBE Stufe 1 (Cr/min Wertschöpfung, Amortisation in min)');
BLD.forEach(b=>{let v=0;
  if(b.kind==='mine')v=b.rate*60*G[b.out].base;
  if(b.kind==='fac')v=60/b.t*(G[b.out].base-Object.keys(b.in).reduce((a,k)=>a+b.in[k]*G[k].base,0));
  if(b.kind==='shop'){const avg=b.goods.reduce((a,g)=>a+G[g].base,0)/b.goods.length;v=12*avg*.15;}
  console.log(b.id.padEnd(16),b.kind.padEnd(5),'lv',b.lv||1,'kosten',String(b.base).padStart(5),'Cr/min',v.toFixed(1).padStart(7),'amort',(b.base/Math.max(v,.01)).toFixed(0).padStart(5),'min',b.kind==='shop'?'(nur +15% Aufpreis gerechnet)':'');
});
// Farm
console.log('\nFARM pro Feld');
Object.entries(CROPS).forEach(([k,c])=>{const v=c.yield*G[k].base-c.seed;console.log(k.padEnd(10),'wächst',c.grow,'s','netto',v,'Cr','=',(v/c.grow*60).toFixed(1),'Cr/min/Feld')});
// LKW
console.log('\nLKW (20 Plätze, Stahl als Ladung, inkl. ~15 s Laden)');
ROUTES.forEach(r=>{const v=20*G.stahl.base*r.mult;console.log(r.id,'Fahrt',r.T,'s → Bonus ggü. Markt (0.75):',Math.round(20*G.stahl.base*(r.mult-.75)),'Cr ≈',Math.round(20*G.stahl.base*(r.mult-.75)/(r.T+15)*60),'Cr/min Zusatz')});
// Export
console.log('\nEXPORT Stufe 1 (Ø Faktor 2.2, Stahl)');
Object.entries(MODES).forEach(([k,m])=>COUNTRIES.forEach(c=>{const cap=m.cap(1),v=cap*G.stahl.base*2.2*(1-m.fee),t=m.t*c.d;console.log(k.padEnd(6),c.id,'cap',cap,'Dauer',Math.round(t),'s','Wert',Math.round(v),'Bonus ggü. Markt',Math.round(v-cap*G.stahl.base*.75))}));
// Level-Kurve
console.log('\nLEVEL-SCHWELLEN');for(let l=2;l<=8;l++)console.log('Level',l,'ab',40*(l-1)*(l-1),'XP');
