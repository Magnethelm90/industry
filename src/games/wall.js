/* Minispiel: Flöz mit Grubengas */
import {G} from '../data.js';
import {SFX,burst,fx,vib} from '../fx.js';
import {bindX,openOv,shakeBox,xbtn} from '../ui.js';
import {$,center,ic,pop} from '../util.js';
import {chunks,fly,sparks} from './scene.js';

export function gWall(s){return new Promise(res=>{
  const D=16,COLS=6,ROWS=6,TARGET=16;
  const ov=openOv(xbtn()+`<h3>Flöz · ${G[s.out].n}</h3><div class="sub">Klopf ${G[s.out].n} aus der Wand. Adern brauchen 2 Schläge, glühende Adern 3 (geben dreifach). Taubes Gestein kostet Zeit. Bei Grubengas sofort aufhören!</div><div class="msg" id="m">0 / ${TARGET}</div><div class="wall" id="wl"></div><div class="timer"><i id="tm" style="width:100%"></i></div>`);
  bindX();ov.abort=()=>res(null);
  let got=0,penalty=0,walls=0,ended=false,gas=false,gasEnd=0,nextGas=performance.now()+3500+Math.random()*3000;const t0=performance.now();
  const wob=b=>{b.classList.remove('wob');void b.offsetWidth;b.classList.add('wob')};
  function build(){
    const wl=$('wl');wl.innerHTML='';
    for(let i=0;i<COLS*ROWS;i++){
      const r=Math.random(),k=r<.26?'v':r<.33?'rich':'rock';
      const b=document.createElement('button');b.className='tile '+k;b.dataset.k=k;b.dataset.hp=k==='v'?2:k==='rich'?3:0;b.dataset.c=0;
      b.style.setProperty('--c',G[s.out].c);if(k!=='rock')b.innerHTML=ic(s.out,k==='rich'?34:26);
      b.onpointerdown=()=>hit(b);wl.appendChild(b)}
    wl.classList.remove('slide');void wl.offsetWidth;wl.classList.add('slide');
  }
  function hit(b){
    if(ended||!ov.alive)return;const k=b.dataset.k;if(k==='done')return;
    const [x,y]=center(b);wob(b);
    // Spitzhacke schlägt auf die Kachel (Koordinaten relativ zur Wand)
    const wl=$('wl'),wr=wl.getBoundingClientRect(),lx=x-wr.left,ly=y-wr.top;
    fly(wl,lx+16,ly-18,'<div class="prop p-pickaxe" style="position:relative;width:56px;height:56px;transform:scaleX(-1)"></div>',{dx:-8,dy:8,rot:-70,dur:240});
    if(gas){penalty+=2;got=Math.max(0,got-2);SFX.crash();vib([90,40,90]);burst(x,y,'#fb923c',22);shakeBox();pop($('m'),'💥 Explosion! −2 und −2 s');return}
    if(k==='rock'){penalty+=0.6;SFX.miss();vib(30);sparks(wl,lx,ly,5,'#9ca3af');return}
    const hp=+b.dataset.hp-1;b.dataset.hp=hp;
    if(hp>0){b.dataset.c=+b.dataset.c+1;SFX.thud();vib(8);burst(x,y,'#9aa0ad',5);return}
    const gain=k==='rich'?3:1;got+=gain;b.dataset.k='done';b.dataset.c=0;b.className='tile done';b.innerHTML='';
    SFX.thud();if(gain>1){SFX.perfect();vib(25)}else{SFX.good();vib(12)}
    chunks(wl,lx,ly,s.out,gain>1?5:2);burst(x,y,G[s.out].c,gain>1?16:9);pop($('m'),got+' / '+TARGET+(gain>1?'  +3!':''));
    if(![...document.querySelectorAll('.tile')].some(t=>t.dataset.k==='v'||t.dataset.k==='rich')){
      walls++;if(walls<=2){penalty-=2;fx('Neue Wand! +2s','#22d3ee')}else fx('Neue Wand!','#22d3ee');
      setTimeout(()=>ov.alive&&!ended&&build(),200)}
  }
  build();
  (function loop(){
    if(!ov.alive||ended)return;const now=performance.now(),el=(now-t0)/1000+penalty;
    if(!gas&&now>nextGas){gas=true;gasEnd=now+1600;$('wl').classList.add('gas');pop($('m'),'☠️ GRUBENGAS! Nicht klopfen!');SFX.err();vib([30,30,30])}
    if(gas&&now>gasEnd){gas=false;$('wl').classList.remove('gas');nextGas=now+3500+Math.random()*3500;pop($('m'),'Luft ist rein – weiter!')}
    $('tm').style.width=Math.max(0,Math.min(100,100-el/D*100))+'%';
    if(el>=D){ended=true;pop($('m'),got>=TARGET?'Volle Lore! 🔥':got+' / '+TARGET);setTimeout(()=>ov.alive&&res(Math.min(1,got/TARGET)),700);return}
    requestAnimationFrame(loop)})();
})}
