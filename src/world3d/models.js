/* Lädt die in Blender gebauten Modelle (src/assets/models/*.glb, eingebettet). Gebaut mit tools/models3d/build.py. */
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {loadBytes} from '../fx.js';

const URLS=import.meta.glob('../assets/models/*.glb',{eager:true,query:'?url',import:'default'});
const cache={};
export const MODEL_NAMES=Object.keys(URLS).map(k=>k.split('/').pop().replace('.glb',''));

// Ein Modell laden; Ergebnis ist die Szene des glTF (immer dasselbe Objekt – zum Platzieren mit .clone() kopieren)
export function loadModel(name){
  if(cache[name])return cache[name];
  const url=URLS['../assets/models/'+name+'.glb'];
  if(!url)return Promise.reject(new Error('Modell fehlt: '+name));
  return cache[name]=loadBytes(url).then(ab=>new Promise((ok,no)=>new GLTFLoader().parse(ab,'',g=>{
    g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});ok(g.scene)},no)));
}
export const loadAll=names=>Promise.all(names.map(loadModel)).then(a=>Object.fromEntries(names.map((n,i)=>[n,a[i]])));
