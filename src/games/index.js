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
import {play} from './gate.js';
import {ic} from '../util.js';

const RAW={
  timing:s=>gTiming(6,s.n,undefined,false,s),
  timingMove:s=>gTiming(6,s.n,'Der grüne Bereich wandert! Tippe, wenn die Nadel darin steht.',true,s),
  whack:gWhack,wall:gWall,catch:gCatch,stack:gStack,mash:gMash,
  heat:s=>gHeat(false,s),heatMove:s=>gHeat(true,s),simon:gSimon,bolts:s=>gBolts(s),
  mix:gMix,solder:gSolder,phone:gPhone,pour:gPour,forge:gForge,pipes:gPipes,wires:gWires,sort:gSort
};
// Jedes Spiel beginnt mit dem Startbildschirm (Anleitung, „Los!“, 3-2-1)
export const GAMES=Object.fromEntries(Object.entries(RAW).map(([k,f])=>[k,s=>play(()=>f(s),s&&s.out?ic(s.out,56):'')]));
export const GNAME={pour:'Gießen',forge:'Schmieden',pipes:'Rohrleitung',wires:'Kabel',sort:'Sortierband',mix:'Mischen',solder:'Löten',phone:'Zusammenbauen',wall:'Flöz',timing:'Schlagkraft',timingMove:'Wandernde Zone',whack:'Erzader',catch:'Auffangen',stack:'Stapeln',mash:'Presse',heat:'Hitze halten',heatMove:'Wandernde Hitze',simon:'Gedächtnis',bolts:'Schrauben'};
