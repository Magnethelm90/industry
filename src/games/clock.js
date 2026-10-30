/* Spieluhr der Minispiele: steht still, solange der Startbildschirm offen ist. Alle Spiele messen Zeit mit gnow()
   statt performance.now() – so läuft weder der Zeitbalken noch irgendeine Bewegung, bevor man auf „Los!“ getippt hat. */
let held=0,at=null,wait=[];
export const gnow=()=>(at??performance.now())-held;
export function hold(){if(at==null)at=performance.now()}
export function release(){if(at!=null){held+=performance.now()-at;at=null}wait.splice(0).forEach(f=>f())}
// Für Spiele, die mit Pausen (sleep) statt mit der Uhr arbeiten: wartet, bis „Los!“ getippt und heruntergezählt ist
export const running=()=>at==null?Promise.resolve():new Promise(r=>wait.push(r));
export const isHeld=()=>at!=null;
