/* Minispiel: Rohrleitung */
import {G} from '../data.js';
import {SFX,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {gnow} from './clock.js';

// Rohr: dunkler Rand, Metallrohr, Glanzlinie; Wasser (nur wenn verbunden) läuft als animierte Strichlinie
const pipeSvg=t=>{const d=t==='I'?'M0 50H100':'M50 0V50H100';
  return `<path class="p0" d="${d}"/><path class="p1" d="${d}"/><path class="p2" d="${d}"/><path class="pw" d="${d}"/>`};
export function gPipes(s){return new Promise(res=>{
  const C=5,R=4,T=45,BASE={I:10,L:3};
  const rot=(b,r)=>((b<<r)|(b>>(4-r)))&15;
  const r0=Math.floor(Math.random()*R),cells=[];
  for(let y=0;y<R;y++)for(let x=0;x<C;x++)cells.push({t:Math.random()<.5?'I':'L',r:Math.floor(Math.random()*4)});
  let row=r0,path=[];
  for(let x=0;x<C;x++){const to=Math.floor(Math.random()*R);let y=row;path.push([x,y]);while(y!==to){y+=to>y?1:-1;path.push([x,y])}row=to}
  const r1=row,DIR={N:1,E:2,S:4,W:8},OPP={1:4,4:1,2:8,8:2};
  const dirTo=(a,b)=>b[0]>a[0]?DIR.E:b[0]<a[0]?DIR.W:b[1]>a[1]?DIR.S:DIR.N;
  path.forEach((p,i)=>{const inn=i===0?DIR.W:OPP[dirTo(path[i-1],p)],out=i===path.length-1?DIR.E:dirTo(p,path[i+1]),m=inn|out;
    const t=(m===10||m===5)?'I':'L';let rr=0;while(rot(BASE[t],rr)!==m)rr++;const c=cells[p[1]*C+p[0]];c.t=t;c.sol=rr;c.r=(rr+1+Math.floor(Math.random()*3))%4});
  const ov=openOv(xbtn()+`<h3>Rohrleitung · ${G[s.out].n}</h3><div class="sub">Tippe Rohrstücke an, um sie zu drehen. Verbinde den Zulauf links mit dem Ablauf rechts.</div><div class="msg" id="m">Leitung verlegen …</div><div class="pipewrap"><div class="pipes" id="pp"></div><i class="src" style="top:${(r0+.5)/R*100}%"></i><i class="drn" style="top:${(r1+.5)/R*100}%"></i><div class="prop p-tank ptank l" style="top:${(r0+.5)/R*100}%"></div><div class="prop p-tank ptank r" style="top:${(r1+.5)/R*100}%"></div></div><div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  const conn=i=>rot(BASE[cells[i].t],cells[i].r);
  let done=false;const t0=gnow();
  function flow(){const seen=new Set();const st=r0*C;if(!(conn(st)&DIR.W))return seen;const q=[st];seen.add(st);
    while(q.length){const i=q.shift(),x=i%C,y=Math.floor(i/C),m=conn(i);
      [[DIR.N,0,-1],[DIR.E,1,0],[DIR.S,0,1],[DIR.W,-1,0]].forEach(([d,dx,dy])=>{if(!(m&d))return;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=C||ny>=R)return;const j=ny*C+nx;if(!seen.has(j)&&(conn(j)&OPP[d])){seen.add(j);q.push(j)}})}
    return seen}
  function draw(){
    const on=flow(),pp=$('pp');pp.innerHTML='';
    cells.forEach((c,i)=>{const b=document.createElement('button');b.className='pc'+(on.has(i)?' on':'');
      b.innerHTML=`<svg viewBox="0 0 100 100" style="transform:rotate(${c.r*90}deg)">${pipeSvg(c.t)}</svg>`;
      b.onpointerdown=()=>{if(done)return;c.r=(c.r+1)%4;SFX.tick();vib(5);draw()};pp.appendChild(b)});
    const end=r1*C+C-1;
    if(on.has(end)&&(conn(end)&DIR.E)&&!done){done=true;const el=(gnow()-t0)/1000;SFX.water();SFX.win();vib([30,40,60]);pop($('m'),'Es fließt! 💧');
      setTimeout(()=>ov.alive&&res(Math.max(.4,Math.min(1,1-(el-12)/50))),800)}}
  draw();
  $('pp').__cells=cells; // nur für automatische Tests (Lösung steht in cell.sol)
  (function loop(){if(!ov.alive||done)return;const el=(gnow()-t0)/1000;$('tm').style.width=Math.max(0,100-el/T*100)+'%';
    if(el>=T){done=true;SFX.miss();pop($('m'),'Zeit um – undicht!');setTimeout(()=>ov.alive&&res(Math.min(.3,flow().size/(C*2)*.3)),800);return}
    requestAnimationFrame(loop)})();
})}
