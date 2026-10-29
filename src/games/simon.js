/* Minispiel: Gedächtnis – Lampen am Steuerpult zeigen eine Folge, die Drucktaster in derselben Reihenfolge drücken */
import {SFX,tone,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop,sleep} from '../util.js';
import {at,put} from './scene.js';

export function gSimon(){return new Promise(res=>{
  const col=['#ef4444','#22c55e','#3b82f6','#eab308'],key=['pbtn_r','pbtn_g','pbtn_b','pbtn_y'],fq=[262,330,392,523];
  const ROUNDS=5;
  const ov=openOv(xbtn()+`<h3>Montage</h3><div class="sub">Schau auf die Lampen, dann drück die Taster in derselben Reihenfolge.</div><div class="dots" id="dots">${'<i></i>'.repeat(ROUNDS)}</div><div class="msg" id="m">Merke dir die Reihenfolge …</div>
    <div class="stage factory" id="st" style="height:240px"></div>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),W=st.clientWidth,CS=Math.min(W*.98,330);
  const co=put(st,'console',CS,null,W/2,160);
  const [ax,ay]=at(co,'console','a'),[dx]=at(co,'console','d'),BS=Math.min(80,(dx-ax)/3*.98);
  const pads=[],lamps=[];
  for(let i=0;i<4;i++){
    const x=ax+(dx-ax)*i/3;
    const l=document.createElement('div');l.className='lamp';l.style.cssText=`left:${x}px;top:30px;--lc:${col[i]}`;st.appendChild(l);lamps.push(l);
    const b=put(st,key[i],BS,'c',x,ay-4,'pbtn');b.style.pointerEvents='auto';pads.push(b);
  }
  const lit=(i,on)=>{lamps[i].classList.toggle('on',on);pads[i].classList.toggle('down',on)};
  const flash=async(i,d=350)=>{lit(i,true);tone(fq[i],d/1000,'triangle',.08);await sleep(d);lit(i,false);await sleep(150)};
  let seq=[],done=0,listen=null;
  pads.forEach((p,i)=>p.onpointerdown=e=>{e.preventDefault();if(listen){lit(i,true);tone(fq[i],.15,'triangle',.08);vib(10);setTimeout(()=>lit(i,false),150);listen(i)}});
  (async()=>{
    for(let r=0;r<ROUNDS;r++){
      seq.push(Math.floor(Math.random()*4));pop($('m'),'Schau genau …');await sleep(500);
      for(const i of seq){if(!ov.alive)return;await flash(i,Math.max(220,350-r*25))}
      if(!ov.alive)return;pop($('m'),'Du bist dran!');
      const ok=await new Promise(r2=>{let k=0;listen=i=>{if(i!==seq[k]){listen=null;r2(false)}else if(++k>=seq.length){listen=null;r2(true)}}});
      if(!ov.alive)return;
      if(!ok){pop($('m'),'Falsch! ❌');SFX.miss();$('dots').children[r].className='m';await sleep(900);break}
      done++;$('dots').children[r].className='g';pop($('m'),'Richtig! ✅');SFX.good();await sleep(550);
    }
    if(ov.alive)res(done/ROUNDS);
  })();
})}
