/* Sound, Vibration, Partikel, Hinweise */
import {S} from './state.js';
import {$,calm} from './util.js';

// Alles wird live im Browser erzeugt (Web Audio) – keine Audiodateien, die die Spieldatei vergrößern
export let AC=null,sfxBus=null,musBus=null;let noiseBuf=null;
export function audio(){
  if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)();
    sfxBus=AC.createGain();sfxBus.connect(AC.destination);musBus=AC.createGain();musBus.gain.value=0;musBus.connect(AC.destination);
    const n=AC.sampleRate;noiseBuf=AC.createBuffer(1,n,n);const d=noiseBuf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1}
  if(AC.state!=='running')AC.resume().catch(()=>{});return AC} // auch 'interrupted' (iOS nach Anruf oder Hintergrund)
// Browser geben Ton erst nach einer echten Geste frei: mit der Maus beim Drücken, mit dem Finger erst beim Loslassen
// (pointerup/touchend). Die Spiele reagieren schon aufs Aufsetzen (pointerdown) – deshalb hier bei jeder Geste entsperren.
export function initAudio(onFirst){
  let first=true;
  const go=e=>{if(!e.isTrusted||S.mute)return;try{audio()}catch(err){return}if(first){first=false;onFirst&&onFirst()}};
  for(const t of ['pointerup','touchend','click','keydown'])addEventListener(t,go,{capture:true,passive:true})}
export function tone(f,d=.1,type='sine',v=.06,slide=0,when=0){
  if(S.mute)return;
  try{audio();const t=AC.currentTime+when,o=AC.createOscillator(),g=AC.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+d)}catch(e){}
}
// Gefiltertes Rauschen: Grundlage für Metall, Stein, Wasser, Zischen
export function noise(d=.2,v=.1,{type='bandpass',f=1000,f2=0,q=1,when=0}={}){
  if(S.mute)return;
  try{audio();const t=AC.currentTime+when,s=AC.createBufferSource(),fl=AC.createBiquadFilter(),g=AC.createGain();
    s.buffer=noiseBuf;s.loop=true;fl.type=type;fl.Q.value=q;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+d);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl);fl.connect(g);g.connect(sfxBus);s.start(t,Math.random()*.5);s.stop(t+d+.02)}catch(e){}
}
// Dauerton für den LKW-Motor: liefert {set(tempo 0..1), stop()}
export function motor(){
  if(S.mute)return {set(){},stop(){}};
  try{audio();const t=AC.currentTime,o=AC.createOscillator(),o2=AC.createOscillator(),fl=AC.createBiquadFilter(),g=AC.createGain();
    o.type='sawtooth';o2.type='square';o.frequency.value=48;o2.frequency.value=24.5;fl.type='lowpass';fl.frequency.value=260;fl.Q.value=4;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.4);o.connect(fl);o2.connect(fl);fl.connect(g);g.connect(sfxBus);o.start(t);o2.start(t);
    return {set(x){const n=AC.currentTime;o.frequency.setTargetAtTime(48+40*x,n,.2);o2.frequency.setTargetAtTime(24.5+20*x,n,.2);fl.frequency.setTargetAtTime(260+260*x,n,.2)},
      stop(){const n=AC.currentTime;g.gain.setTargetAtTime(.0001,n,.15);o.stop(n+.8);o2.stop(n+.8)}}}catch(e){return {set(){},stop(){}}}
}
export const SFX={
  tick:()=>tone(520,.05,'triangle',.04),good:()=>tone(660,.12,'triangle',.07),perfect:()=>{tone(784,.1,'triangle',.07);setTimeout(()=>tone(1175,.18,'triangle',.07),80)},
  miss:()=>tone(160,.18,'sawtooth',.05,-60),coin:()=>{tone(988,.07,'square',.04);setTimeout(()=>tone(1319,.12,'square',.04),60)},
  crash:()=>{tone(120,.35,'sawtooth',.09,-80);noise(.4,.18,{type:'lowpass',f:1800,f2:150})},win:()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.18,'triangle',.07),i*90)),
  buy:()=>{tone(440,.08,'triangle',.06);setTimeout(()=>tone(880,.14,'triangle',.06),70)},err:()=>tone(200,.15,'square',.04),
  // Material-Geräusche für die Minispiele
  clank:()=>{[[1250,.3,.05],[1830,.2,.03],[3170,.12,.02]].forEach(([f,d,v])=>tone(f,d,'sine',v));noise(.05,.14,{f:3200,q:.7})}, // Hammer auf Metall
  thud:()=>{noise(.14,.22,{type:'lowpass',f:1100,f2:180});tone(105,.12,'sine',.09,-40)}, // Spitzhacke auf Stein
  ratchet:()=>{for(let i=0;i<4;i++)noise(.018,.16,{f:4200,q:3,when:i*.045})}, // Schraubenschlüssel
  splash:()=>{noise(.45,.16,{type:'lowpass',f:3000,f2:260});noise(.2,.05,{f:1800,q:2,when:.05})},
  sizzle:()=>noise(.55,.05,{type:'highpass',f:5200}), // Lötzinn, flüssiges Metall
  zap:()=>{tone(70,.22,'sawtooth',.06);noise(.18,.09,{f:2400,q:5})}, // Kurzschluss
  whoosh:()=>noise(.35,.07,{f:300,f2:1600,q:1.2}), // Blasebalg, Feuer
  water:()=>{noise(1.4,.06,{type:'lowpass',f:900,f2:420});[0,.25,.5,.8].forEach(w=>tone(420+Math.random()*260,.09,'sine',.025,-120,w))} // Wasser läuft
};
export const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
export function fx(txt,color='#fbbf24',x=innerWidth/2,y=innerHeight*.38){const e=document.createElement('div');e.className='fl';e.textContent=txt;e.style.cssText=`left:${x}px;top:${y}px;color:${color}`;document.body.appendChild(e);setTimeout(()=>e.remove(),1200)}
export function burst(x,y,color='#fbbf24',n=14){if(calm())n=Math.ceil(n/4);for(let i=0;i<n;i++){const e=document.createElement('i');e.className='sp';const a=Math.random()*6.28,r=30+Math.random()*50;
  e.style.cssText=`left:${x}px;top:${y}px;background:${color};box-shadow:0 0 8px ${color};--dx:${Math.cos(a)*r}px;--dy:${Math.sin(a)*r}px`;document.body.appendChild(e);setTimeout(()=>e.remove(),700)}}
export let toastT;
export function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('on'),3200)}
