/* Minispiel: Gedächtnis */
import {SFX,tone,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop,sleep} from '../util.js';

export function gSimon(){return new Promise(res=>{
  const col=['#ef4444','#22c55e','#3b82f6','#eab308'],fq=[262,330,392,523];
  const ROUNDS=5;
  const ov=openOv(xbtn()+`<h3>Montage</h3><div class="sub">Schau zu, dann wiederhole die Folge.</div><div class="dots" id="dots">${'<i></i>'.repeat(ROUNDS)}</div><div class="msg" id="m">Merke dir die Reihenfolge …</div><div class="pads">${col.map((c,i)=>`<button class="pad" data-i="${i}" style="background:linear-gradient(160deg,${c},color-mix(in srgb,${c} 55%,#000));--pc:${c}"></button>`).join('')}</div>`);
  bindX();ov.abort=()=>res(null);
  const pads=[...document.querySelectorAll('.pad')];
  const flash=async(i,d=350)=>{pads[i].classList.add('lit');tone(fq[i],d/1000,'triangle',.08);await sleep(d);pads[i].classList.remove('lit');await sleep(150)};
  let seq=[],done=0,listen=null;
  pads.forEach((p,i)=>p.onpointerdown=()=>{if(listen){p.classList.add('lit');tone(fq[i],.15,'triangle',.08);vib(10);setTimeout(()=>p.classList.remove('lit'),150);listen(i)}});
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
