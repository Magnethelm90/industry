/* Sound, Vibration, Partikel, Hinweise */
import {S} from './state.js';
import {$} from './util.js';

export let AC=null;
export function tone(f,d=.1,type='sine',v=.06,slide=0){
  if(S.mute)return;
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d)}catch(e){}
}
export const SFX={
  tick:()=>tone(520,.05,'triangle',.04),good:()=>tone(660,.12,'triangle',.07),perfect:()=>{tone(784,.1,'triangle',.07);setTimeout(()=>tone(1175,.18,'triangle',.07),80)},
  miss:()=>tone(160,.18,'sawtooth',.05,-60),coin:()=>{tone(988,.07,'square',.04);setTimeout(()=>tone(1319,.12,'square',.04),60)},
  crash:()=>tone(120,.35,'sawtooth',.09,-80),win:()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.18,'triangle',.07),i*90)),
  buy:()=>{tone(440,.08,'triangle',.06);setTimeout(()=>tone(880,.14,'triangle',.06),70)},err:()=>tone(200,.15,'square',.04)
};
export const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
export function fx(txt,color='#fbbf24',x=innerWidth/2,y=innerHeight*.38){const e=document.createElement('div');e.className='fl';e.textContent=txt;e.style.cssText=`left:${x}px;top:${y}px;color:${color}`;document.body.appendChild(e);setTimeout(()=>e.remove(),1200)}
export function burst(x,y,color='#fbbf24',n=14){for(let i=0;i<n;i++){const e=document.createElement('i');e.className='sp';const a=Math.random()*6.28,r=30+Math.random()*50;
  e.style.cssText=`left:${x}px;top:${y}px;background:${color};box-shadow:0 0 8px ${color};--dx:${Math.cos(a)*r}px;--dy:${Math.sin(a)*r}px`;document.body.appendChild(e);setTimeout(()=>e.remove(),700)}}
export let toastT;
export function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('on'),3200)}
