/* Kleine Helfer: DOM, Formatierung, Zufall */
export const ic=(k,s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 64 64"><use href="#i-${k}"/></svg>`;
export const $=id=>document.getElementById(id);
export const fmt=n=>n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e4?(n/1e3).toFixed(1)+'k':(Math.round(n*10)/10).toString();
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const pick=a=>a[Math.floor(Math.random()*a.length)];
export const fmtT=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
export const nameColor=n=>`hsl(${[...n].reduce((a,c)=>a+c.charCodeAt(0)*37,0)%360} 65% 45%)`;
export const pop=(el,t)=>{el.textContent=t;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop')};
export const center=el=>{const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]};
