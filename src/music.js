/* Hintergrundmusik: leise und live erzeugt (Moll-Akkorde, Bass, Arpeggio), 8 Takte in Schleife */
import {AC,audio,musBus} from './fx.js';
import {S} from './state.js';

const BPM=76,BEAT=60/BPM,BAR=4*BEAT;
// [Bass, Akkord] als MIDI-Noten: Am F C G Am F G E
const PROG=[[45,[57,60,64]],[41,[53,57,60]],[48,[55,60,64]],[43,[55,59,62]],[45,[57,60,64]],[41,[53,57,60]],[43,[55,59,62]],[40,[56,59,64]]];
const hz=m=>440*Math.pow(2,(m-69)/12);
let timer=null,next=0,bar=0,armed=false;
export const musicOn=()=>S.music!==false&&!S.mute;
export const musicPlaying=()=>!!timer;

function note(m,t,d,v,type,att=.01,lp=0){
  const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=hz(m);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  let n=o;if(lp){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;o.connect(f);n=f}
  n.connect(g);g.connect(musBus);o.start(t);o.stop(t+d+.05)}
function schedBar(t){
  const [b,ch]=PROG[bar%PROG.length];bar++;
  ch.forEach(m=>note(m,t,BAR+.6,.012,'triangle',.8,900));
  note(b,t,BEAT*2.2,.05,'sine',.02);note(b,t+2*BEAT,BEAT*2,.035,'sine',.02);
  const tones=[...ch,ch[0]+12];
  [0,1,2,1,3,2,1,2].forEach((k,i)=>{if(Math.random()<.25)return;note(tones[k]+12,t+i*BEAT/2,.45,.016,'sine',.005)});
}
// Plant immer gut eine Sekunde voraus, damit nichts stockt
function tick(){if(!AC)return;while(next<AC.currentTime+1.2){schedBar(next);next+=BAR}}

export function startMusic(){
  armed=true;if(!musicOn()||timer||document.hidden)return;
  try{audio();const n=AC.currentTime;next=n+.15;musBus.gain.cancelScheduledValues(n);musBus.gain.setTargetAtTime(1,n,.8);tick();timer=setInterval(tick,400)}catch(e){}
}
export function stopMusic(){
  if(!timer)return;clearInterval(timer);timer=null;
  try{musBus.gain.cancelScheduledValues(AC.currentTime);musBus.gain.setTargetAtTime(0,AC.currentTime,.3)}catch(e){}
}
// Browser erlauben Ton erst nach der ersten Berührung; im Hintergrund pausieren
export function initMusic(){
  addEventListener('pointerdown',()=>{if(!armed)startMusic()},{once:true,capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();else if(armed)startMusic()});
}
