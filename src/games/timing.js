/* Minispiel: Timing-Leiste */
import {SFX,burst,vib} from '../fx.js';
import {diff} from '../state.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,center,pop,sleep} from '../util.js';

export function gTiming(rounds=6,title='Abbau',sub='Stoppe den Marker in der grünen Zone. Die Mitte zählt perfekt.',moving=false){return new Promise(res=>{
  const ov=openOv(xbtn()+`<h3>${title}</h3><div class="sub">${sub}</div><div class="dots" id="dots">${'<i></i>'.repeat(rounds)}</div><div class="msg" id="m">Los!</div><div class="track" id="b"><div class="zone" id="z"></div><div class="mark" id="k"></div></div><button class="btn big" id="hit">SCHLAG!</button>`);
  bindX();ov.abort=()=>res(null);
  let pos=0,dir=1,speed=0.9*diff(),zone=0.2,zc=0.5,round=0,pts=0,last=performance.now(),zd=1;
  const newZone=()=>{zc=0.2+Math.random()*0.6;zd=Math.random()<.5?1:-1;$('z').style.left=((zc-zone/2)*100)+'%';$('z').style.width=(zone*100)+'%'};newZone();
  function tick(t){if(!ov.alive)return;const dt=(t-last)/1000;last=t;pos+=dir*speed*dt;
    if(moving){zc+=zd*0.18*dt;const lo=zone/2+.02,hi=1-zone/2-.02;if(zc<lo||zc>hi){zd*=-1;zc=Math.max(lo,Math.min(hi,zc))}$('z').style.left=((zc-zone/2)*100)+'%'}if(pos>1){pos=1;dir=-1}if(pos<0){pos=0;dir=1}$('k').style.left=(pos*100)+'%';requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
  $('hit').onpointerdown=async e=>{
    if(!ov.alive||$('hit').disabled)return;const d=Math.abs(pos-zc);let p=0,t='Daneben!',cl='m';
    const [bx,by]=center($('k'));
    if(d<=zone*0.25){p=1;t='PERFEKT! 🔥';cl='p';SFX.perfect();vib(30);burst(bx,by,'#fbbf24',18)}
    else if(d<=zone/2){p=0.6;t='Gut!';cl='g';SFX.good();vib(15);burst(bx,by,'#34d399',10)}
    else{SFX.miss();vib([40,30,40]);$('ovbox').classList.remove('shake');void $('ovbox').offsetWidth;$('ovbox').classList.add('shake')}
    pts+=p;pop($('m'),t);$('dots').children[round].className=cl;round++;speed+=0.15;
    if(round>=rounds){$('hit').disabled=true;await sleep(700);if(ov.alive)res(pts/rounds);return}
    newZone()};
})}
