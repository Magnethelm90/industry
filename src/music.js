/* Hintergrundmusik: „Hot Spring Town“ von Kistol (CC0), wird erst nach der ersten Berührung nachgeladen.
   Solange sie lädt oder falls sie fehlt (offline beim ersten Start, eingebettete Vorschau), läuft eine leise erzeugte Schleife. */
import {AC,audio,musBus,initAudio,loadBytes,decode} from './fx.js';
import {S} from './state.js';

const BPM=76,BEAT=60/BPM,BAR=4*BEAT;
// [Bass, Akkord] als MIDI-Noten: Am F C G Am F G E
const PROG=[[45,[57,60,64]],[41,[53,57,60]],[48,[55,60,64]],[43,[55,59,62]],[45,[57,60,64]],[41,[53,57,60]],[43,[55,59,62]],[40,[56,59,64]]];
const hz=m=>440*Math.pow(2,(m-69)/12);
let timer=null,next=0,bar=0,armed=false;
let track=null,trackLoad=null,src=null,srcGain=null,startedAt=0,offset=0;
const TRACK_VOL=.32;
// Halbe Abtastrate genügt für leise Hintergrundmusik und halbiert den Speicher (2,5 min ≈ 14 MB statt 28 MB)
function loadTrack(){
  if(trackLoad)return;if(location.protocol==='file:'){trackLoad=1;return} // direkt geöffnete Datei: fetch geht dort nicht
  const O=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  let ctx=AC;try{if(O)ctx=new O(1,1,22050)}catch(e){}
  trackLoad=loadBytes('./music.mp3').then(ab=>decode(ab,ctx).catch(()=>ctx===AC?Promise.reject():loadBytes('./music.mp3').then(b=>decode(b,AC))))
    .then(b=>{track=b;if(timer)swapToTrack()}).catch(()=>{});
}
function playTrack(fade=.8){
  const n=AC.currentTime;src=AC.createBufferSource();srcGain=AC.createGain();src.buffer=track;src.loop=true;
  srcGain.gain.setValueAtTime(.0001,n);srcGain.gain.exponentialRampToValueAtTime(TRACK_VOL,n+fade);src.connect(srcGain);srcGain.connect(musBus);
  offset%=track.duration;src.start(n,offset);startedAt=n-offset}
function stopTrack(){if(!src)return;const n=AC.currentTime;offset=n-startedAt;srcGain.gain.setTargetAtTime(.0001,n,.15);try{src.stop(n+.6)}catch(e){}src=null}
// Erzeugte Schleife ausblenden, sobald die Aufnahme bereit ist
function swapToTrack(){if(src)return;clearInterval(timer);timer=-1;playTrack(1.5)}
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
function tick(){if(!AC||src)return;while(next<AC.currentTime+1.2){schedBar(next);next+=BAR}}

export function startMusic(){
  armed=true;if(!musicOn()||timer||document.hidden)return;
  try{audio();const n=AC.currentTime;musBus.gain.cancelScheduledValues(n);musBus.gain.setTargetAtTime(1,n,.3);
    loadTrack();if(track){timer=-1;playTrack()}else{next=n+.15;tick();timer=setInterval(tick,400)}}catch(e){}
}
export function stopMusic(){
  if(!timer)return;clearInterval(timer);timer=null;
  try{stopTrack();musBus.gain.cancelScheduledValues(AC.currentTime);musBus.gain.setTargetAtTime(0,AC.currentTime,.3)}catch(e){}
}
export const musicTrack=()=>!!src;
// Browser erlauben Ton erst nach der ersten Berührung; im Hintergrund pausieren
export function initMusic(){
  initAudio(()=>{if(!armed)startMusic()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();else if(armed)startMusic()});
}
