/* Welt: echte Uhrzeit, Jahreszeit und Wochenende – dazu freiwillige Live-Daten (EZB-Wechselkurse, Wetter).
   Live-Daten sind aus, bis der Spieler sie in der Firmen-Übersicht einschaltet (dann gehen Anfragen an
   api.frankfurter.app bzw. api.open-meteo.com). Fällt etwas aus, läuft das Spiel ohne diese Effekte weiter. */
import {S} from './state.js';

// ---------------------------------------------------------------- Zeit
export const now=()=>new Date();
export function dayPhase(d=now()){const h=d.getHours()+d.getMinutes()/60;return h<6||h>=21?'night':h<8?'dawn':h<18?'day':'dusk'}
export const PHASES={night:{e:'🌙',n:'Nacht',d:'Seltene Fische beißen öfter'},dawn:{e:'🌅',n:'Morgen',d:''},day:{e:'🌤️',n:'Tag',d:''},dusk:{e:'🌇',n:'Abend',d:''}};
export function season(d=now()){const m=d.getMonth();return m<2||m===11?'winter':m<5?'spring':m<8?'summer':'autumn'}
export const SEASONS={
  spring:{e:'🌱',n:'Frühling',grow:1.1,crop:0,d:'Felder wachsen 10 % schneller'},
  summer:{e:'☀️',n:'Sommer',grow:1.25,crop:0,d:'Felder wachsen 25 % schneller'},
  autumn:{e:'🍂',n:'Herbst',grow:1,crop:.2,d:'Erntezeit: 20 % mehr Ertrag'},
  winter:{e:'❄️',n:'Winter',grow:.6,crop:0,d:'Felder wachsen nur mit 60 % Tempo'}};
export const isWeekend=(d=now())=>d.getDay()===0||d.getDay()===6;
// Wochenendmarkt: Lebensmittel und Agrarwaren teurer, Aufträge zahlen mehr
export const WEEKEND={goods:1.15,orders:1.2,cats:['agrar','food','fisch']};

// ---------------------------------------------------------------- Live-Daten (Zwischenspeicher getrennt vom Spielstand)
const KEY='industry-live';
let L={};try{L=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){L={}}
const keep=()=>{try{localStorage.setItem(KEY,JSON.stringify(L))}catch(e){}};
const num=v=>typeof v==='number'&&Number.isFinite(v);
const iso=d=>d.toISOString().slice(0,10);
export const liveOn=()=>S.live===true;
async function getJSON(url,ms=8000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{const r=await fetch(url,{signal:c.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}
  finally{clearTimeout(t)}}

// Wechselkurse: Erlös im Ausland je nach Kurs heute gegenüber vor einem Jahr (höchstens ±15 %).
// Dubai: Der Dirham ist fest an den US-Dollar gekoppelt, die EZB veröffentlicht ihn nicht – daher zählt der Dollar.
export const CUR={no:'NOK',ae:'USD',us:'USD',br:'BRL',jp:'JPY'};
const SYMS=['USD','JPY','NOK','BRL'];
async function rates(day){
  for(const u of [`https://api.frankfurter.app/${day}?from=EUR&to=${SYMS}`,`https://api.frankfurter.dev/v1/${day}?base=EUR&symbols=${SYMS}`]){
    try{const j=await getJSON(u),r=j&&j.rates;if(r&&SYMS.every(k=>num(r[k])&&r[k]>0)&&typeof j.date==='string')return {date:j.date.slice(0,10),r:Object.fromEntries(SYMS.map(k=>[k,r[k]]))}}catch(e){}}
  return null}
export async function refreshFx(){
  if(!liveOn()||(L.fx&&L.fx.day===iso(now())))return;
  const a=await rates('latest');if(!a)return;
  const d=new Date(a.date+'T12:00:00Z');d.setUTCFullYear(d.getUTCFullYear()-1);
  const b=await rates(iso(d));if(!b)return;
  L.fx={day:iso(now()),date:a.date,old:b.date,now:a.r,then:b.r};keep()}
// Kursdaten gelten bis zu 14 Tage (Wochenenden und Feiertage ohne neue Kurse)
const fxFresh=()=>liveOn()&&L.fx&&Date.now()-Date.parse(L.fx.date+'T12:00:00Z')<14*864e5;
export function fxMult(cid){const c=CUR[cid];if(!c||!fxFresh())return 1;return Math.max(.85,Math.min(1.15,L.fx.then[c]/L.fx.now[c]))}
export const fxInfo=()=>fxFresh()?{date:L.fx.date,old:L.fx.old,now:L.fx.now,then:L.fx.then}:null;

// Wetter (Open-Meteo, CC BY 4.0) für eine gewählte Stadt – kein Standortzugriff nötig
export const CITIES={
  berlin:{n:'Berlin',lat:52.52,lon:13.41},hamburg:{n:'Hamburg',lat:53.55,lon:9.99},muenchen:{n:'München',lat:48.14,lon:11.58},
  koeln:{n:'Köln',lat:50.94,lon:6.96},frankfurt:{n:'Frankfurt',lat:50.11,lon:8.68},stuttgart:{n:'Stuttgart',lat:48.78,lon:9.18},
  duesseldorf:{n:'Düsseldorf',lat:51.23,lon:6.78},leipzig:{n:'Leipzig',lat:51.34,lon:12.37},dresden:{n:'Dresden',lat:51.05,lon:13.74},
  hannover:{n:'Hannover',lat:52.37,lon:9.73},nuernberg:{n:'Nürnberg',lat:49.45,lon:11.08},bremen:{n:'Bremen',lat:53.08,lon:8.8},
  wien:{n:'Wien',lat:48.21,lon:16.37},zuerich:{n:'Zürich',lat:47.37,lon:8.54}};
export const WX={
  sun:{e:'☀️',n:'Sonnig',d:'Felder wachsen 15 % schneller',grow:1.15},
  rain:{e:'🌧️',n:'Regen',d:'Felder werden von selbst gegossen',grow:1},
  storm:{e:'⛈️',n:'Sturm',d:'Seltene Fische beißen öfter, auf der Straße liegt mehr im Weg',grow:1},
  snow:{e:'🌨️',n:'Schnee',d:'Felder wachsen 20 % langsamer',grow:.8},
  fog:{e:'🌫️',n:'Nebel',d:'kein Effekt',grow:1},
  cloud:{e:'☁️',n:'Bewölkt',d:'kein Effekt',grow:1}};
export async function refreshWeather(){
  const c=CITIES[S.city];if(!liveOn()||!c)return;
  if(L.wx&&L.wx.city===S.city&&Date.now()-L.wx.at<30*60e3)return;
  let j;try{j=await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m,is_day&timezone=auto`)}catch(e){return}
  const u=j&&j.current;if(!u||!['temperature_2m','precipitation','weather_code','wind_speed_10m'].every(k=>num(u[k])))return;
  L.wx={city:S.city,at:Date.now(),t:u.temperature_2m,p:u.precipitation,code:u.weather_code,wind:u.wind_speed_10m,day:u.is_day!==0};keep()}
// WMO-Wettercodes: 45/48 Nebel, 51–67 und 80–82 Regen, 71–77 und 85/86 Schnee, 95–99 Gewitter
export function weather(){
  if(!liveOn()||!L.wx||L.wx.city!==S.city||Date.now()-L.wx.at>3*3600e3)return null;
  const {code:c,p,wind,day}=L.wx;
  const k=c>=95||wind>=50?'storm':(c>=71&&c<=77)||c===85||c===86?'snow':(c>=51&&c<=67)||(c>=80&&c<=82)||p>=.2?'rain':c===45||c===48?'fog':c<=1&&day?'sun':'cloud';
  return {k,...WX[k],t:L.wx.t,city:CITIES[S.city].n}}
export const wxIs=k=>weather()?.k===k;

// Bei Start und dann alle 10 Minuten (nur wenn eingeschaltet und online)
export function refreshLive(){if(!liveOn()||navigator.onLine===false)return Promise.resolve();return Promise.all([refreshFx(),refreshWeather()]).catch(()=>{})}
export function clearLive(){L={};keep()}
