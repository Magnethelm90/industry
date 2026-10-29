/* Spieldaten: Waren, Rezepte, Stationen, Betriebe, Länder */
export const G={
 erz:{n:'Eisenerz',base:3,c:'#f59e0b'},kohle:{n:'Kohle',base:3,c:'#94a3b8'},lehm:{n:'Lehm',base:2,c:'#d97706'},
 ziegel:{n:'Ziegel',base:8,c:'#ef4444'},stahl:{n:'Stahl',base:20,c:'#38bdf8'},maschine:{n:'Maschine',base:100,c:'#fbbf24'},
 sand:{n:'Sand',base:2,c:'#eab308',lv:4},kupfer:{n:'Kupfer',base:6,c:'#f97316',lv:4},oel:{n:'Rohöl',base:5,c:'#a78bfa',lv:4},
 glas:{n:'Glas',base:14,c:'#67e8f9',lv:4},kunststoff:{n:'Kunststoff',base:16,c:'#f472b6',lv:4},draht:{n:'Kupferdraht',base:12,c:'#fb923c',lv:4},
 platine:{n:'Platine',base:60,c:'#22c55e',lv:4},akku:{n:'Akku',base:55,c:'#a3e635',lv:4},display:{n:'Display',base:70,c:'#38bdf8',lv:4},
 gehaeuse:{n:'Gehäuse',base:40,c:'#c084fc',lv:4},handy:{n:'Smartphone',base:700,c:'#e879f9',lv:4},
 kamin:{n:'Kaminofen',base:70,c:'#f87171',secret:1},dampfmaschine:{n:'Dampfmaschine',base:220,c:'#d4a373',secret:1},
 glasfaser:{n:'Glasfaserkabel',base:70,c:'#22d3ee',lv:4,secret:1},solar:{n:'Solarmodul',base:150,c:'#60a5fa',lv:4,secret:1},
 ebike:{n:'E-Bike',base:180,c:'#4ade80',lv:4,secret:1},smartwatch:{n:'Smartwatch',base:220,c:'#f0abfc',lv:4,secret:1},
 drohne:{n:'Drohne',base:220,c:'#fde047',lv:4,secret:1},roboter:{n:'Roboter',base:420,c:'#94a3b8',lv:4,secret:1}
};
Object.assign(G,{
 weizen:{n:'Weizen',base:3,c:'#facc15',cat:'agrar'},kartoffel:{n:'Kartoffeln',base:3,c:'#d6a35c',cat:'agrar'},
 trauben:{n:'Trauben',base:6,c:'#a855f7',cat:'agrar',lv:3},hopfen:{n:'Hopfen',base:5,c:'#84cc16',cat:'agrar',lv:3},
 baumwolle:{n:'Baumwolle',base:5,c:'#e2e8f0',cat:'agrar',lv:3},milch:{n:'Milch',base:7,c:'#e0f2fe',cat:'agrar'},eier:{n:'Eier',base:6,c:'#fde68a',cat:'agrar'},
 hering:{n:'Hering',base:6,c:'#93c5fd',cat:'fisch'},lachs:{n:'Lachs',base:16,c:'#fb7185',cat:'fisch'},
 thunfisch:{n:'Thunfisch',base:40,c:'#3b82f6',cat:'fisch',lv:4},hummer:{n:'Hummer',base:70,c:'#ef4444',cat:'fisch'},
 mehl:{n:'Mehl',base:9,c:'#fef3c7',cat:'food'},brot:{n:'Brot',base:30,c:'#d97706',cat:'food'},kaese:{n:'Käse',base:24,c:'#fcd34d',cat:'food'},
 chips:{n:'Chips',base:16,c:'#fbbf24',cat:'food'},raeucherlachs:{n:'Räucherlachs',base:50,c:'#f97316',cat:'food'},
 wein:{n:'Wein',base:40,c:'#9333ea',cat:'food',lv:3},bier:{n:'Bier',base:24,c:'#f59e0b',cat:'food',lv:3},
 stoff:{n:'Stoff',base:22,c:'#c4b5fd',cat:'bau',lv:3},kleidung:{n:'Kleidung',base:90,c:'#ec4899',cat:'lux',lv:4},
 jahrgangswein:{n:'Jahrgangswein',base:180,c:'#7e22ce',cat:'lux',lv:3},bergkaese:{n:'Bergkäse',base:100,c:'#ca8a04',cat:'lux'},
 schnaps:{n:'Schwarzgebrannter',base:55,c:'#a3e635',cat:'ill',illegal:1,lv:4},replika:{n:'Replika-Uhr',base:150,c:'#fbbf24',cat:'ill',illegal:1,lv:4},
 raubkopie:{n:'Raubkopie',base:90,c:'#94a3b8',cat:'ill',illegal:1,lv:4}
});
export const CAT={erz:'roh',kohle:'roh',lehm:'roh',sand:'roh',kupfer:'roh',oel:'roh',ziegel:'bau',stahl:'bau',maschine:'bau',glas:'bau',kunststoff:'bau',
 draht:'elek',platine:'elek',akku:'elek',display:'elek',gehaeuse:'elek',handy:'elek'};
export const CATS=[['alle','Alle'],['roh','Rohstoffe'],['bau','Bau'],['elek','Elektronik'],['agrar','Agrar'],['food','Lebensmittel'],['fisch','Fisch'],['lux','Spezial']];
export const catOf=g=>G[g].cat||CAT[g]||'lux';
export const GK=Object.keys(G);
export const REC=[
 {out:'kamin',in:['ziegel','stahl','kohle'],games:['mix','bolts','forge'],hint:'Wärmt das Haus – aus Stein, Metall und Brennstoff.'},
 {out:'dampfmaschine',in:['maschine','kohle','stahl'],games:['bolts','simon','pipes'],hint:'Die Urkraft der Industrie: Mechanik trifft Feuer.'},
 {out:'glasfaser',in:['glas','kunststoff','draht'],games:['mix','solder'],hint:'Licht reist durch eine ummantelte Leitung.'},
 {out:'solar',in:['glas','platine','stahl'],games:['solder','bolts'],hint:'Fängt Sonnenlicht hinter Glas ein.'},
 {out:'ebike',in:['stahl','akku','draht'],games:['bolts','solder'],hint:'Zwei Räder, ein Rahmen und gespeicherte Energie.'},
 {out:'smartwatch',in:['display','akku','kunststoff'],games:['solder','simon'],hint:'Ein winziger Bildschirm fürs Handgelenk.'},
 {out:'drohne',in:['akku','platine','kunststoff'],games:['solder','bolts'],hint:'Leicht, smart – und sie fliegt.'},
 {out:'roboter',in:['maschine','platine','akku'],games:['simon','solder','bolts','wires'],hint:'Mechanik mit Gehirn und eigener Energie.'}
];
export const ST=[
 {id:'erz',n:'Eisenerz abbauen',games:['wall','whack','catch','timing'],in:{},out:'erz',max:8,mult:'pick'},
 {id:'kohle',n:'Kohle abbauen',games:['wall','whack','timingMove','catch'],in:{},out:'kohle',max:8,mult:'pick'},
 {id:'lehm',n:'Lehm graben',games:['catch','wall','timing','whack','sort'],in:{},out:'lehm',max:8,mult:'pick'},
 {id:'ziegel',n:'Ziegelei',games:['stack','mash'],in:{lehm:3},out:'ziegel',max:4,mult:'bench'},
 {id:'stahl',n:'Schmelzofen',games:['heat','heatMove','pour','forge'],in:{erz:4,kohle:2},out:'stahl',max:3,mult:'bench'},
 {id:'maschine',n:'Montage',games:['simon','bolts','pipes','forge'],in:{stahl:3,ziegel:2},out:'maschine',max:2,mult:'bench'},
 {id:'sand',n:'Sand schaufeln',games:['catch','whack','timing','sort'],in:{},out:'sand',max:8,mult:'pick',lv:4},
 {id:'kupfer',n:'Kupfer abbauen',games:['wall','whack','timingMove'],in:{},out:'kupfer',max:6,mult:'pick',lv:4},
 {id:'oel',n:'Öl fördern',games:['catch','timingMove','timing'],in:{},out:'oel',max:6,mult:'pick',lv:4},
 {id:'glas',n:'Glashütte',games:['heat','heatMove','pour'],in:{sand:4},out:'glas',max:3,mult:'bench',lv:4},
 {id:'kunststoff',n:'Kunststoff mischen',games:['mix','pipes'],in:{oel:3},out:'kunststoff',max:3,mult:'bench',lv:4},
 {id:'draht',n:'Draht ziehen',games:['mash','timing'],in:{kupfer:2},out:'draht',max:4,mult:'bench',lv:4},
 {id:'platine',n:'Platine löten',games:['solder','wires'],in:{draht:2,kunststoff:1},out:'platine',max:2,mult:'bench',lv:4},
 {id:'akku',n:'Akku bauen',games:['mix','solder','wires'],in:{draht:1,kunststoff:2,stahl:1},out:'akku',max:2,mult:'bench',lv:4},
 {id:'display',n:'Display fertigen',games:['solder','bolts','wires'],in:{glas:2,draht:1},out:'display',max:2,mult:'bench',lv:4},
 {id:'gehaeuse',n:'Gehäuse gießen',games:['mix','timing','pour'],in:{kunststoff:2,stahl:1},out:'gehaeuse',max:2,mult:'bench',lv:4},
 {id:'handy',n:'Smartphone montieren',games:['phone'],in:{platine:1,akku:1,display:1,gehaeuse:1},out:'handy',max:1,mult:'bench',lv:4},
 {id:'muehle',n:'Mühle',grp:'food',games:['mash','sort'],in:{weizen:3},out:'mehl',max:4,mult:'bench'},
 {id:'baeckerei',n:'Bäckerei',grp:'food',games:['heat','heatMove'],in:{mehl:2,eier:1},out:'brot',max:3,mult:'bench'},
 {id:'kaeserei',n:'Käserei',grp:'food',games:['mix','pour'],in:{milch:3},out:'kaese',max:2,mult:'bench'},
 {id:'chipsfabrik',n:'Chips frittieren',grp:'food',games:['sort','heat'],in:{kartoffel:3},out:'chips',max:3,mult:'bench'},
 {id:'raeucherei',n:'Räucherei',grp:'food',games:['heat','heatMove'],in:{lachs:2},out:'raeucherlachs',max:2,mult:'bench'},
 {id:'kelterei',n:'Kelterei',grp:'food',games:['mix','pour'],in:{trauben:4},out:'wein',max:2,mult:'bench',lv:3},
 {id:'brauerei',n:'Brauerei',grp:'food',games:['mix','pipes'],in:{hopfen:2,weizen:2},out:'bier',max:3,mult:'bench',lv:3},
 {id:'weberei',n:'Weberei',grp:'food',games:['simon','mash'],in:{baumwolle:3},out:'stoff',max:2,mult:'bench',lv:3},
 {id:'schneiderei',n:'Schneiderei',grp:'food',games:['wires','simon'],in:{stoff:2,draht:1},out:'kleidung',max:1,mult:'bench',lv:4}
];
ST.push(
 {id:'brennerei',n:'Schwarzbrennerei',grp:'ill',games:['mix','pipes'],in:{weizen:4},out:'schnaps',max:3,mult:'bench',lv:4,heat:5},
 {id:'faelscher',n:'Fälscherwerkstatt',grp:'ill',games:['solder','wires'],in:{stahl:1,display:1,kunststoff:1},out:'replika',max:2,mult:'bench',lv:4,heat:7},
 {id:'kopierer',n:'Raubkopierer',grp:'ill',games:['wires','sort'],in:{platine:1,kunststoff:2},out:'raubkopie',max:3,mult:'bench',lv:4,heat:6});
REC.forEach(r=>ST.push({id:'r_'+r.out,n:G[r.out].n+' bauen',games:r.games,in:Object.fromEntries(r.in.map(k=>[k,2])),out:r.out,max:3,mult:'bench',lv:G[r.out].lv,secret:true}));
export const ROUTES=[
 {id:'stadt',n:'Stadtmarkt',icon:'stadt',T:20,speed:170,mult:1.0,desc:'Kurze, sichere Strecke',c:'#22d3ee'},
 {id:'hafen',n:'Hafenmarkt',icon:'hafen',T:35,speed:230,mult:1.3,desc:'Weit & schnell · +30% Preis',c:'#7c5cff'}
];
export const UP=[
 {id:'pick',n:'Spitzhacke',d:'+30% Ertrag beim Abbauen',base:60,i:'erz',c:'#f59e0b'},
 {id:'bench',n:'Werkbank',d:'+30% Ertrag bei Presse, Ofen & Montage',base:120,i:'maschine',c:'#fbbf24'},
 {id:'truck',n:'LKW-Ladefläche',d:'+10 Plätze pro Fahrt',base:80,i:'truck',c:'#22d3ee'},
 {id:'store',n:'Lagerhalle',d:'+100 Lagerplatz pro Ware',base:50,i:'ziegel',c:'#ef4444'},
 {id:'tractor',req:'farm',n:'Traktor',d:'+25% Ernte auf der Farm',base:400,i:'weizen',c:'#facc15'},
 {id:'sprinkler',req:'farm',n:'Bewässerung',d:'Stufe 1: Felder gießen sich selbst · jede weitere Stufe +10% Wachstum',base:1500,i:'milch',c:'#38bdf8'},
 {id:'rod',req:'farm',n:'Angelrute',d:'Seltene Fische beißen häufiger an',base:300,i:'lachs',c:'#fb7185'}
];
export const BLD=[
 {id:'lehmgrube',kind:'mine',n:'Lehmgrube',out:'lehm',rate:0.3,base:100},
 {id:'erzmine',kind:'mine',n:'Erzmine',out:'erz',rate:0.25,base:150},
 {id:'kohlemine',kind:'mine',n:'Kohlemine',out:'kohle',rate:0.25,base:150},
 {id:'ziegelei',kind:'fac',n:'Ziegelei',in:{lehm:2},out:'ziegel',t:6,base:400},
 {id:'stahlwerk',kind:'fac',n:'Stahlwerk',in:{erz:2,kohle:1},out:'stahl',t:8,base:1200},
 {id:'maschinenfabrik',kind:'fac',n:'Maschinenfabrik',in:{stahl:3,ziegel:2},out:'maschine',t:14,base:4000},
 {id:'baumarkt',kind:'shop',n:'Baumarkt',goods:['lehm','ziegel'],base:300,c:'#ef4444'},
 {id:'eisenwaren',kind:'shop',n:'Eisenwarenhandel',goods:['erz','kohle','stahl'],base:800,c:'#38bdf8'},
 {id:'maschinenhandel',kind:'shop',n:'Maschinenhandel',goods:['maschine'],base:2500,c:'#fbbf24'},
 {id:'sandgrube',kind:'mine',n:'Sandgrube',out:'sand',rate:0.3,base:600,lv:4},
 {id:'kupfermine',kind:'mine',n:'Kupfermine',out:'kupfer',rate:0.2,base:900,lv:4},
 {id:'oelpumpe',kind:'mine',n:'Ölpumpe',out:'oel',rate:0.2,base:900,lv:4},
 {id:'elektronikmarkt',kind:'shop',n:'Elektronikmarkt',goods:['handy','display','akku','platine'],base:8000,c:'#e879f9',lv:4},
 {id:'kutter',kind:'mine',n:'Fischkutter',out:'hering',rate:0.12,base:1500,lv:3},
 {id:'kuhstall',kind:'fac',n:'Kuhstall',in:{weizen:1},out:'milch',t:8,base:700,lv:3},
 {id:'huehnerstall',kind:'fac',n:'Hühnerstall',in:{weizen:1},out:'eier',t:6,base:450,lv:3},
 {id:'feinkost',kind:'shop',n:'Feinkostladen',goods:['brot','kaese','raeucherlachs','wein','bier'],base:3000,c:'#f59e0b',lv:3}
];
export const BMAX=10,WEAR=1/900,SHOPT=5,KEEPS=[0,10,25,50,100];
export const SAVE='industry-action-v2';
export const CUSTOMERS=['Bauhof Müller','Werft Hansen','TechStore Berlin','Elektro Kaya','Dachdecker Yilmaz','Startup Nova','Bahnwerk Ost','Möbel Lindqvist','Roboterwerk Iris','Drohnenclub Süd','Hotel Seeblick','Stadtwerke Nord'];
// cap: Firmenwert, bei dem das Wachstum ausläuft (logistisch statt endlos exponentiell)
export const RIVALS=[{n:'Krupp & Söhne',w:800,r:1.3,cap:60000},{n:'NovaTech AG',w:3000,r:1.15,cap:250000},{n:'Ivanov Stahl',w:12000,r:1,cap:800000},{n:'Global Industries',w:60000,r:.85,cap:3000000}];
// Übernahme: Kaufpreis = Firmenwert × TAKE_PREM, danach Gewinnanteil TAKE_DIV des Kaufpreises pro Stunde
export const TAKE_PREM=1.5,TAKE_DIV=.02;
// Großprojekte: Waren nach und nach anliefern; fertig = Belohnung und dauerhafter Bonus
export const PROJECTS=[
  {id:'bahnhof',n:'Güterbahnhof',lv:7,need:{ziegel:400,stahl:300,maschine:40},r:30000,bonus:'Minen fördern 25 % mehr'},
  {id:'kraftwerk',n:'Kraftwerk',lv:7,need:{kohle:600,stahl:400,maschine:60,draht:150},r:50000,bonus:'Fabriken arbeiten 25 % schneller'},
  {id:'ekz',n:'Einkaufszentrum',lv:8,need:{glas:300,stahl:300,platine:60,display:40},r:80000,bonus:'Filialen verkaufen 10 % teurer'},
  {id:'techpark',n:'Technologiepark',lv:9,need:{platine:120,akku:100,display:100,handy:25},r:150000,bonus:'Werkstatt: 20 % mehr Ertrag pro Minispiel'}];
export const SHOP_NAMES=['Lena','Mehmet','Jonas','Aylin','Tom','Sofia','Kevin','Mia','Luca','Emma','Noah','Hannah','Ole','Fatma'];
export const CROPS={weizen:{grow:60,seed:4,yield:6},kartoffel:{grow:90,seed:5,yield:6},trauben:{grow:180,seed:12,yield:5},hopfen:{grow:120,seed:8,yield:5},baumwolle:{grow:120,seed:8,yield:5}};
export const AGE={wein:{to:'jahrgangswein',t:600},kaese:{to:'bergkaese',t:480}};
export const COUNTRIES=[{id:'no',n:'Norwegen',f:'🇳🇴',d:.5},{id:'ae',n:'Dubai',f:'🇦🇪',d:.8},{id:'us',n:'USA',f:'🇺🇸',d:1},{id:'br',n:'Brasilien',f:'🇧🇷',d:1.15},{id:'jp',n:'Japan',f:'🇯🇵',d:1.4}];
export const MODES={plane:{n:'Flugzeug',e:'✈️',t:180,fee:.08,cap:l=>15+10*(l-1),risk:.1,slow:1.4,ev:'Unwetter – Flug verspätet'},
             ship:{n:'Containerschiff',e:'🚢',t:600,fee:.02,cap:l=>80+20*(l-1),risk:.2,slow:1.6,ev:'Sturm auf See – Schiff verspätet'}};
export const FENCES=['Der Pole','Lady Viper','Onkel Sam','Kralle','Doc Schwarz','Mamba','Fuchs'];

// Farm-Waren und ihre Veredelung kommen erst mit der Farm (Level 3)
GK.forEach(g=>{if(['agrar','fisch','food'].includes(G[g].cat)&&!G[g].lv)G[g].lv=3});
ST.forEach(s=>{if(s.grp==='food'&&!s.lv)s.lv=G[s.out].lv});

// Bereiche, die nach und nach freigeschaltet werden
export const UNL={
  bld:{lv:2,n:'Betriebe',d:'Minen und Fabriken arbeiten für dich – auch offline.'},
  orders:{lv:2,n:'Aufträge',d:'Kunden bestellen Ware mit Frist und zahlen gut.'},
  farm:{lv:3,n:'Farm & Meer',d:'Felder, Angeln und Reifekeller.'},
  shop:{lv:3,n:'Laden & Filialen',d:'Eigene Preise setzen, feilschen, Filialen eröffnen.'},
  lab:{lv:3,n:'Labor',d:'Geheime Rezepte entdecken.'},
  under:{lv:4,n:'Untergrund',d:'Schmuggelware – mit Risiko.'},
  elek:{lv:4,n:'Elektronik',d:'Platinen, Akkus, Displays – und Smartphones.'},
  export:{lv:5,n:'Flughafen & Hafen',d:'Liefern ins Ausland für ein Vielfaches.'},
  takeover:{lv:6,n:'Übernahmen',d:'Konkurrenzfirmen kaufen – sie zahlen dir danach einen Gewinnanteil.'},
  projects:{lv:7,n:'Großprojekte',d:'Bahnhof, Kraftwerk & Co. bauen – mit dauerhaftem Bonus.'}
};

// Ab wie viel XP ein Level erreicht ist (Index = Level). Danach wächst der Abstand um je 50 %.
// Grob geschätzt bei aktivem Spiel: Level 3 nach ~15 min, Level 4 nach ~40 min, Level 5 nach ~1,5 h.
export const LV_XP=[0,0,60,800,2800,7500,16000,30000];
export const xpFor=l=>{
  if(l<LV_XP.length)return LV_XP[l];
  let x=LV_XP[LV_XP.length-1],d=x-LV_XP[LV_XP.length-2];
  for(let i=LV_XP.length;i<=l;i++){d*=1.5;x+=d}
  return Math.round(x);
};
