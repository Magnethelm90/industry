/* Minispiel-Register */
import {gBolts} from './bolts.js';
import {gCatch} from './catch.js';
import {gForge} from './forge.js';
import {gHeat} from './heat.js';
import {gMash} from './mash.js';
import {gMix} from './mix.js';
import {gPhone} from './phone.js';
import {gPipes} from './pipes.js';
import {gPour} from './pour.js';
import {gSimon} from './simon.js';
import {gSolder} from './solder.js';
import {gSort} from './sort.js';
import {gStack} from './stack.js';
import {gTiming} from './timing.js';
import {gWall} from './wall.js';
import {gWhack} from './whack.js';
import {gWires} from './wires.js';

export const GAMES={
  timing:s=>gTiming(6,s.n),
  timingMove:s=>gTiming(6,s.n,'Die grüne Zone wandert! Stoppe den Marker darin.',true),
  whack:gWhack,wall:gWall,catch:gCatch,stack:gStack,mash:gMash,
  heat:s=>gHeat(false,s),heatMove:s=>gHeat(true,s),simon:gSimon,bolts:s=>gBolts(s),
  mix:gMix,solder:gSolder,phone:gPhone,pour:gPour,forge:gForge,pipes:gPipes,wires:gWires,sort:gSort
};
export const GNAME={pour:'Gießen',forge:'Schmieden',pipes:'Rohrleitung',wires:'Kabel',sort:'Sortierband',mix:'Mischen',solder:'Löten',phone:'Zusammenbauen',wall:'Flöz',timing:'Timing',timingMove:'Wandernde Zone',whack:'Erzader',catch:'Auffangen',stack:'Stapeln',mash:'Presse',heat:'Hitze halten',heatMove:'Wandernde Hitze',simon:'Gedächtnis',bolts:'Schrauben'};
