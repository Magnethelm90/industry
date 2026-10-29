/* Kleine Helfer: DOM, Formatierung, Zufall */
// Icons: in Blender gerenderte Bilder (tools/icons/render_icons.py). Jedes Bild steht einmal als CSS-Klasse
// im Dokument; ic() liefert nur ein kurzes Element, damit häufiges Neuzeichnen billig bleibt.
const ICON_URLS=import.meta.glob('./assets/icons/*.webp',{eager:true,query:'?url',import:'default'});
const ICON_KEYS=new Set();
export function initIcons(){
  let css='';
  for(const p in ICON_URLS){const k=p.slice(p.lastIndexOf('/')+1,-5);ICON_KEYS.add(k);css+=`.ico.i-${k}{background-image:url("${ICON_URLS[p]}")}`}
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
}
export const ic=(k,s=40)=>`<i class="ico${ICON_KEYS.has(k)?' i-'+k:''}" style="width:${s}px;height:${s}px"></i>`;
export const $=id=>document.getElementById(id);
export const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e4?(n/1e3).toFixed(1)+'k':(Math.round(n*10)/10).toString();
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const pick=a=>a[Math.floor(Math.random()*a.length)];
export const fmtT=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
export const nameColor=n=>`hsl(${[...n].reduce((a,c)=>a+c.charCodeAt(0)*37,0)%360} 65% 45%)`;
export const pop=(el,t)=>{el.textContent=t;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop')};
export const center=el=>{const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]};
