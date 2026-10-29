/* Overlay (Minispiele, Dialoge) und Bausteine */
import {render} from './app.js';
import {$} from './util.js';

export function addSec(el,t){const h=document.createElement('div');h.className='sec';h.textContent=t;el.appendChild(h)}
export let OV=null;
export function openOv(html){if(OV){OV.alive=false;OV.abort&&OV.abort()}OV={alive:true,abort:null};$('ovbox').innerHTML=html;$('ov').style.display='flex';return OV}
export function closeOv(){if(OV){OV.alive=false;OV.abort&&OV.abort();OV=null}$('ov').style.display='none';$('ovbox').innerHTML='';render()}
export const xbtn=()=>`<button class="x" id="ovx">✕</button>`;
export function bindX(){const x=$('ovx');if(x)x.onclick=closeOv}
export function shakeBox(){const b=$('ovbox');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake')}
export function canvasFor(W,H){const cv=$('cv'),DPR=Math.min(2,window.devicePixelRatio||1);cv.width=W*DPR;cv.height=H*DPR;const c=cv.getContext('2d');c.scale(DPR,DPR);return [cv,c]}
