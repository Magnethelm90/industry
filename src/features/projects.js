/* Großprojekte: Waren nach und nach anliefern; fertig = Belohnung und dauerhafter Bonus */
import {render} from '../app.js';
import {G,PROJECTS} from '../data.js';
import {SFX,burst,fx,toast,vib} from '../fx.js';
import {S,isOpen,lvl} from '../state.js';
import {addSec,lockLine} from '../ui.js';
import {fmt,ic} from '../util.js';

const st=p=>S.proj[p.id]||(S.proj[p.id]={got:{},done:0});
const left=(p,g)=>p.need[g]-(st(p).got[g]||0);
export const canGive=p=>!st(p).done&&(p.lv||1)<=lvl()&&Object.keys(p.need).some(g=>left(p,g)>0&&Math.floor(S.stock[g])>=1);

// Liefert alles, was im Lager ist, höchstens bis zum Bedarf
export function giveProject(p,e){
  if(!canGive(p))return;const s=st(p);let n=0;
  for(const g in p.need){const k=Math.min(left(p,g),Math.floor(S.stock[g]));if(k>0){S.stock[g]-=k;s.got[g]=(s.got[g]||0)+k;n+=k}}
  S.xp+=Math.ceil(n/2);SFX.coin();vib(15);
  if(Object.keys(p.need).every(g=>left(p,g)<=0)){s.done=1;S.money+=p.r;S.xp+=Math.round(p.r/10);SFX.win();vib([30,40,80]);
    if(e)burst(e.clientX,e.clientY,'#fbbf24',30);fx(p.n+' fertig!','#fbbf24');toast('🏗️ '+p.n+' eröffnet: +'+fmt(p.r)+' Credits · '+p.bonus+'!')}
  else if(e)fx(n+' Teile geliefert','#22d3ee',e.clientX,e.clientY-30);
  render()}

export function renderProjects(el){
  if(!isOpen('projects'))return;
  addSec(el,'Großprojekte');
  el.insertAdjacentHTML('beforeend','<p class="sub">Liefere die Waren nach und nach. Ist alles da, gibt es eine große Belohnung und einen Bonus, der für immer gilt.</p>');
  const later=PROJECTS.filter(p=>p.lv>lvl()&&!S.proj[p.id]);
  PROJECTS.filter(p=>!later.includes(p)).forEach(p=>{const s=st(p),d=document.createElement('div');d.className='card proj'+(s.done?'':' idle');d.dataset.p=p.id;d.style.setProperty('--c',s.done?'#34d399':'#fbbf24');
    const tot=Object.values(p.need).reduce((a,b)=>a+b,0),got=Object.keys(p.need).reduce((a,g)=>a+Math.min(p.need[g],s.got[g]||0),0);
    const rows=Object.keys(p.need).map(g=>`<span class="oi ${left(p,g)<=0?'up':''}">${ic(g,22)}${Math.min(p.need[g],s.got[g]||0)} / ${p.need[g]} ${G[g].n} <b class="num">(${Math.floor(S.stock[g])})</b></span>`).join('');
    d.innerHTML=`<div class="i">🏗️ ${p.n}${s.done?' <span class="chip up">✅ fertig</span>':''}<small>${s.done?'Bonus aktiv: ':'Bonus: '}${p.bonus}${s.done?'':' · Belohnung <b style="color:var(--gold)">'+fmt(p.r)+' Cr</b>'}</small>${s.done?'':`<div class="ois">${rows}</div><div class="meter" style="height:6px"><i style="width:${got/tot*100}%;background:var(--g2)"></i></div>`}</div>${s.done?'':`<button class="btn a" ${canGive(p)?'':'disabled'}>Liefern</button>`}`;
    const b=d.querySelector('button');if(b)b.onclick=e=>giveProject(p,e);el.appendChild(d)});
  if(later.length)el.appendChild(lockLine(later.length,Math.min(...later.map(p=>p.lv)),1));
}
