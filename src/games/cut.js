/* Minispiel: Zuschneiden – mit dem Finger der gestrichelten Linie folgen, von links nach rechts */
import {SFX,vib} from '../fx.js';
import {bindX,openOv,xbtn} from '../ui.js';
import {$,pop} from '../util.js';
import {th} from './theme.js';

const W=320,H=250,CUTS=3,X0=24,X1=296,TOL=26;
export function gCut(s){return new Promise(res=>{
  const ov=openOv(xbtn()+`<h3>${th(s,'title','Zuschneiden')}</h3><div class="sub">${th(s,'how','Setz den Finger links auf die Schere und zieh sie entlang der gestrichelten Linie nach rechts. Je genauer, desto sauberer der Schnitt. 3 Schnitte.')}</div><div class="msg" id="m">Schnitt 1 von ${CUTS}</div>
    <svg class="stage cutst" id="st" viewBox="0 0 ${W} ${H}" style="touch-action:none;width:100%;aspect-ratio:${W}/${H}">
      <rect x="6" y="6" width="${W-12}" height="${H-12}" rx="14" fill="#e8d9bd"/><rect x="6" y="6" width="${W-12}" height="${H-12}" rx="14" fill="none" stroke="#b79d72" stroke-width="3" stroke-dasharray="2 7"/>
      <path id="pth" fill="none" stroke="#7c5a2c" stroke-width="3" stroke-dasharray="9 7" stroke-linecap="round"/>
      <path id="trc" fill="none" stroke="#22c55e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <text id="sc" font-size="30" text-anchor="middle">✂️</text></svg>`);
  bindX();ov.abort=()=>res(null);
  const st=$('st'),pth=$('pth'),trc=$('trc'),sc=$('sc');
  let round=0,fy=()=>125,pts=[],down=false,total=0,done=false,wait=false;
  // Neue Bahn: Summe zweier Sinuswellen
  const newPath=()=>{const a=26+round*14+Math.random()*14,b=.9+Math.random()*.8+round*.35,c=Math.random()*6,a2=12,b2=2.2+Math.random(),c2=Math.random()*6;
    fy=x=>125+a*Math.sin((x-X0)/(X1-X0)*Math.PI*b+c)*(1-.35*Math.abs((x-160)/160))+a2*Math.sin((x-X0)/(X1-X0)*Math.PI*b2+c2)*.5;
    let d='';for(let x=X0;x<=X1;x+=4)d+=(x===X0?'M':'L')+x+' '+fy(x).toFixed(1);
    pth.setAttribute('d',d);trc.setAttribute('d','');pts=[];sc.setAttribute('x',X0);sc.setAttribute('y',fy(X0)+10);
    $('m').textContent='Schnitt '+(round+1)+' von '+CUTS};
  st.__state=()=>({round,pts:pts.length,done,fy:Array.from({length:35},(_,i)=>[X0+i*8,fy(X0+i*8)]),W,H});
  const pos=e=>{const r=st.getBoundingClientRect();return [(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H]};
  const score=()=>{ // Genauigkeit entlang der Bahn · wie weit man gekommen ist
    if(!pts.length)return 0;
    const reach=Math.max(0,Math.min(1,(Math.max(...pts.map(p=>p[0]))-X0)/(X1-X0-8)));
    let sum=0,k=0;for(let x=X0;x<=X1;x+=8){if(x>Math.max(...pts.map(p=>p[0])))break;
      const d=Math.min(...pts.map(p=>Math.hypot(p[0]-x,p[1]-fy(x))));sum+=Math.max(0,1-d/TOL);k++}
    return reach*(k?sum/k:0)};
  const finish=()=>{down=false;if(wait||done)return;
    const v=score();total+=v;wait=true;
    const t=v>=.9?'Sauber geschnitten! ✂️':v>=.6?'Ganz gut':'Schief…';pop($('m'),t);(v>=.6?SFX.good:SFX.miss)();vib(v>=.6?10:[40,30,40]);
    setTimeout(()=>{if(!ov.alive)return;wait=false;round++;
      if(round>=CUTS){done=true;const r=total/CUTS;pop($('m'),Math.round(r*100)+' % Genauigkeit');if(r>=.85)SFX.win();setTimeout(()=>ov.alive&&res(Math.min(1,r)),600)}else newPath()},800)};
  st.onpointerdown=e=>{e.preventDefault();if(done||wait||!ov.alive)return;const [x,y]=pos(e);
    if(Math.hypot(x-X0,y-fy(X0))>46){pop($('m'),'Starte links an der Schere');return}
    down=true;pts=[[x,y]];try{st.setPointerCapture(e.pointerId)}catch(_){}};
  st.onpointermove=e=>{if(!down||wait||done)return;const [x,y]=pos(e);pts.push([x,y]);
    trc.setAttribute('d','M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L'));sc.setAttribute('x',x);sc.setAttribute('y',y+10);
    if(x>=X1)finish()};
  st.onpointerup=st.onpointercancel=()=>{if(down)finish()};
  newPath();
})}
