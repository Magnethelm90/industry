/* Logistik: LKW im Inland, Flugzeug und Schiff ins Ausland */
import {S} from '../state.js';
import {addSec} from '../ui.js';
import {$} from '../util.js';
import {renderAirport} from './export.js';
import {renderTruck} from './transport.js';

export function renderLogistics(){
  const el=$('s-logistics');
  el.innerHTML='<h2>Logistik</h2><p class="sub">Fahr Ware selbst zum Markt: Dort gibt es den vollen Preis, am Hafen sogar +60 %. Später lieferst du per Flugzeug und Schiff ins Ausland.</p>';
  const air=()=>{addSec(el,'Flughafen & Hafen · Ausland');renderAirport(el)};
  if(S.exp.built)air();
  addSec(el,'LKW · Inland');renderTruck(el);
  if(!S.exp.built)air();
}
