/* Texte der Minispiele pro Station: Titel, Anleitung, Zutaten – damit Bild und Aufgabe zur Station passen.
   Nicht aufgeführte Stationen und Spiele behalten ihren Standardtext. name = Bezeichnung auf der Stationskarte. */
export const th=(s,k,d)=>s&&s.th&&s.th[k]!=null?s.th[k]:d;

const HEAT=(t,wo,was)=>({title:t,how:`Halte gedrückt, um ${wo} – loslassen kühlt ab. Halte das Thermometer im grünen Bereich, ${was}`});
const sauce=(n,c)=>({n,c});

export const TH={
  lehm:{timing:{title:'Lehm hacken',how:'Tippe, wenn die Nadel im grünen Bereich steht – dann sitzt der Hieb.'}},
  sand:{
    sort:{title:'Sand sieben',how:'Tippe die Steine aus dem Sand, bevor sie in die Kiste fallen. Den Sand lässt du durch!',name:'Sieben'},
    catch:{title:'Sand schaufeln',how:'Zieh die Lore nach links und rechts und fang den Sand. Weich den grauen Steinen aus.',name:'Schaufeln'}},
  oel:{
    catch:{title:'Öl auffangen',how:'Zieh die Lore nach links und rechts und fang das Öl. Weich den grauen Steinen aus.',name:'Öl auffangen'},
    pipes:{title:'Pipeline · Öl',how:'Tippe Rohrstücke an, um sie zu drehen. Leite das Öl vom Bohrloch links zur Raffinerie rechts.',name:'Pipeline'}},
  ziegel:{mash:{title:'Ziegelpresse',how:'Tippe so schnell du kannst – jeder Tipp ist ein Pressenhub. Die Rohlinge brauchen Druck! 6 Sekunden ab dem ersten Hub.'}},
  maschine:{
    bolts:{title:'Maschine montieren',name:'Schrauben'},
    pipes:{title:'Hydraulik verlegen',how:'Tippe Rohrstücke an, um sie zu drehen. Verbinde die Pumpe links mit dem Zylinder rechts.',name:'Hydraulik'},
    wires:{title:'Steuerung verkabeln',name:'Verkabeln'}},
  kunststoff:{
    mix:{title:'Kunststoff mischen',ing:[sauce('Polymer','#8b5cf6'),sauce('Weichmacher','#06b6d4'),sauce('Farbstoff','#ec4899')]},
    stir:{title:'Polymer rühren',how:'Wisch mit dem Finger im Kreis um den Kessel und rühr die Masse. Zu langsam gibt Klumpen, zu schnell spritzt sie. 12 Sekunden ab der ersten Bewegung.',col:'#8b5cf6',name:'Rühren'},
    pipes:{title:'Raffinerie · Rohre',how:'Tippe Rohrstücke an, um sie zu drehen. Leite das Öl vom Tank links zur Anlage rechts.',name:'Rohre'}},
  draht:{
    mash:{title:'Ziehbank',how:'Tippe so schnell du kannst – jeder Tipp zieht den Draht ein Stück durch die Ziehdüse. 6 Sekunden ab dem ersten Zug.',name:'Drahtziehen'},
    heat:{...HEAT('Kupfer glühen','den Blasebalg zu pumpen','das Kupfer muss glühen, darf aber nicht schmelzen!'),name:'Glühen'}},
  akku:{mix:{title:'Elektrolyt mischen',ing:[sauce('Lösung','#22c55e'),sauce('Säure','#eab308'),sauce('Additiv','#a78bfa')]}},
  gehaeuse:{
    mix:{title:'Harz anrühren',ing:[sauce('Harz','#f59e0b'),sauce('Härter','#06b6d4'),sauce('Farbpaste','#ec4899')]},
    pour:{title:'Spritzguss',name:'Spritzguss'},
    bolts:{title:'Gehäuse verschrauben',name:'Schrauben'}},
  muehle:{
    mash:{title:'Mahlwerk',how:'Tippe so schnell du kannst – jeder Tipp dreht den Mahlstein weiter. 6 Sekunden ab dem ersten Hub.',name:'Mahlen'},
    sort:{title:'Korn reinigen',how:'Tippe Steine und Spreu (graue Brocken) vom Band, bevor sie ins Mehl geraten. Das Korn lässt du durch!',name:'Reinigen'}},
  baeckerei:{
    knead:{title:'Teig kneten',how:'Wisch mit dem Finger hin und her über den Teig – nicht zu hastig und nicht zu lahm. Im gleichmäßigen Takt wird der Teig am besten. 11 Sekunden ab dem ersten Zug.',name:'Teig kneten'},
    heat:{...HEAT('Backofen','den Ofen anzuheizen','damit das Brot goldbraun wird!'),name:'Backofen'},
    heatMove:{...HEAT('Backofen · Wandernde Hitze','den Ofen anzuheizen','der gewünschte Bereich wandert mit!'),name:'Wandernde Hitze'}},
  kaeserei:{
    mix:{title:'Käsen',how:'Halte eine Flasche gedrückt, um einzufüllen. Triff die Schichten der Zielskala rechts – Milch, Lab und Salz im richtigen Verhältnis.',ing:[sauce('Milch','#e7e5e4'),sauce('Lab','#fbbf24'),sauce('Salz','#94a3b8')],name:'Käsen'},
    stir:{title:'Käsebruch rühren',how:'Wisch mit dem Finger im Kreis um den Kessel und rühr die Milch. Zu langsam gibt Klumpen, zu schnell spritzt sie. 12 Sekunden ab der ersten Bewegung.',col:'#f5f0dc',name:'Rühren'},
    mash:{title:'Käsepresse',how:'Tippe so schnell du kannst – jeder Tipp presst die Molke aus dem Käse. 6 Sekunden ab dem ersten Hub.',name:'Pressen'}},
  chipsfabrik:{
    sort:{title:'Kartoffeln verlesen',how:'Tippe faule Stellen und Steine (graue Brocken) vom Band, bevor sie in die Kiste fallen. Gute Kartoffeln lässt du durch!',name:'Verlesen'},
    heat:{...HEAT('Fritteuse','die Fritteuse zu heizen','sonst werden die Chips labbrig oder schwarz!'),name:'Fritteuse'}},
  raeucherei:{
    heat:{...HEAT('Räucherofen','die Glut anzufachen','damit der Lachs gleichmäßig räuchert!'),name:'Räucherofen'},
    heatMove:{...HEAT('Räucherofen · Wandernde Hitze','die Glut anzufachen','der gewünschte Bereich wandert mit!'),name:'Wandernde Hitze'}},
  kelterei:{
    mash:{title:'Traubenpresse',how:'Tippe so schnell du kannst – jeder Tipp presst die Trauben aus. 6 Sekunden ab dem ersten Hub.',name:'Pressen'},
    mix:{title:'Wein ansetzen',how:'Halte eine Flasche gedrückt, um einzufüllen. Triff die Schichten der Zielskala rechts – Saft, Hefe und Zucker im richtigen Verhältnis.',ing:[sauce('Traubensaft','#7c3aed'),sauce('Hefe','#d6b88a'),sauce('Zucker','#f1f5f9')],name:'Ansetzen'}},
  brauerei:{
    mix:{title:'Bier brauen',how:'Halte eine Flasche gedrückt, um einzufüllen. Triff die Schichten der Zielskala rechts – Wasser, Malz und Hopfen im richtigen Verhältnis.',ing:[sauce('Wasser','#38bdf8'),sauce('Malz','#b45309'),sauce('Hopfen','#84cc16')],name:'Brauen'},
    pipes:{title:'Brauanlage · Rohre',how:'Tippe Rohrstücke an, um sie zu drehen. Leite die Würze vom Kessel links zum Gärtank rechts.',name:'Brauanlage'},
    stir:{title:'Maische rühren',how:'Wisch mit dem Finger im Kreis um den Kessel und rühr die Maische. Zu langsam gibt Klumpen, zu schnell spritzt sie. 12 Sekunden ab der ersten Bewegung.',col:'#b45309',name:'Maische rühren'},
    heat:{...HEAT('Maischekessel','den Kessel zu heizen','damit die Maische nicht kocht!'),name:'Maischen'}},
  // Rezept-Stationen (geheime Rezepte aus dem Labor)
  r_kamin:{mix:{title:'Mörtel anrühren',ing:[sauce('Zement','#94a3b8'),sauce('Sand','#e9c46a'),sauce('Wasser','#38bdf8')]},bolts:{title:'Ofen aufbauen',name:'Aufbauen'}},
  r_dampfmaschine:{bolts:{title:'Kessel montieren',name:'Montage'},
    simon:{title:'Ventile einstellen',how:'Schau auf die Lampen und drück die Taster in derselben Reihenfolge – so stellst du die Ventile richtig ein.',name:'Ventile'},
    pipes:{title:'Dampfleitung',how:'Tippe Rohrstücke an, um sie zu drehen. Leite den Dampf vom Kessel links zum Zylinder rechts.',name:'Dampfleitung'}},
  r_glasfaser:{mix:{title:'Glasmasse mischen',ing:[sauce('Glasschmelze','#67e8f9'),sauce('Mantel','#a78bfa'),sauce('Dotierung','#fbbf24')]},solder:{title:'Stecker löten',name:'Stecker'}},
  r_solar:{solder:{title:'Zellen verlöten',name:'Zellen'},bolts:{title:'Modul rahmen',name:'Rahmen'}},
  r_ebike:{bolts:{title:'E-Bike montieren',name:'Montage'},solder:{title:'Akku anschließen',name:'Akku'}},
  r_smartwatch:{simon:{title:'Uhr einstellen',how:'Schau auf die Lampen und drück die Taster in derselben Reihenfolge – so stellst du die Uhr ein.',name:'Einstellen'}},
  r_drohne:{solder:{title:'Elektronik löten',name:'Elektronik'},bolts:{title:'Rotoren montieren',name:'Rotoren'}},
  r_roboter:{simon:{title:'Programm eingeben',how:'Schau auf die Lampen und drück die Taster in derselben Reihenfolge – so gibst du das Programm ein.',name:'Programm'},
    bolts:{title:'Gelenke montieren',name:'Gelenke'},wires:{title:'Steuerung verkabeln',name:'Verkabeln'}},
  // Untergrund
  brennerei:{mix:{title:'Maische ansetzen',ing:[sauce('Maische','#d97706'),sauce('Hefe','#d6b88a'),sauce('Wasser','#38bdf8')],name:'Ansetzen'},
    stir:{title:'Maische rühren',how:'Wisch mit dem Finger im Kreis um den Kessel und rühr die Maische. Zu langsam gibt Klumpen, zu schnell spritzt sie. 12 Sekunden ab der ersten Bewegung.',col:'#d97706',name:'Rühren'},
    pipes:{title:'Brennblase · Rohre',how:'Tippe Rohrstücke an, um sie zu drehen. Leite den Dampf von der Blase links zum Kühler rechts.',name:'Brennblase'}},
  faelscher:{solder:{title:'Uhrwerk löten',name:'Uhrwerk'}},
  kopierer:{wires:{title:'Kopierer verkabeln',name:'Verkabeln'},sort:{title:'Rohlinge prüfen',how:'Tippe defekte Rohlinge (graue Brocken) vom Band, bevor sie in die Kiste fallen. Gute lässt du durch!',name:'Prüfen'}},
  weberei:{
    weave:{title:'Weben',how:'In jeder Fadenreihe fehlt ein Faden. Tippe die Spur mit der Lücke, bevor die Reihe den Webkamm unten erreicht. Falsche Spur = Fehler.',name:'Weben'},
    simon:{title:'Webmuster',how:'Schau auf die Lampen und drück die Taster in derselben Reihenfolge – so merkst du dir das Muster.',name:'Webmuster'},
    wires:{title:'Fäden einfädeln',how:'Zieh jeden Faden zur Spule mit demselben Farbton und Zeichen rechts (oder tippe links und dann rechts). Falsch eingefädelt kostet Zeit.',name:'Einfädeln',bad:'Verheddert! 🧵'}},
  schneiderei:{
    cut:{title:'Stoff zuschneiden',how:'Setz den Finger links auf die Schere und zieh sie entlang der gestrichelten Linie nach rechts. Je genauer, desto sauberer der Schnitt. 3 Schnitte.',name:'Zuschneiden'},
    wires:{title:'Nähte verbinden',how:'Zieh jeden Faden zur Naht mit demselben Farbton und Zeichen rechts (oder tippe links und dann rechts). Falsch genäht kostet Zeit.',name:'Nähen',bad:'Falsch genäht! 🧵'},
    simon:{title:'Schnittmuster',how:'Schau auf die Lampen und drück die Taster in derselben Reihenfolge – so merkst du dir das Schnittmuster.',name:'Schnittmuster'}}
};
