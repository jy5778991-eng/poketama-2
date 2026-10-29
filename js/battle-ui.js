// Battle presentation helpers. No save data or battle rules are changed here.
import {staticImage,animatedImage} from './sprites.js';

const byId=id=>document.getElementById(id);

export const visualSprite=side=>document.querySelector('.sprite.'+side);

export function displayHpBar(side,hp,fighter){
  const pct=Math.max(0,100*hp/fighter.stats.hp);
  byId(side+'Bar').style.width=pct+'%';
  byId(side+'Bar').style.background=pct>50?'#59c679':pct>20?'#e8b956':'#d86862';
  byId(side+'Hp').textContent='HP '+hp+' / '+fighter.stats.hp;
}

export function animateClass(element,klass){
  element.classList.remove(klass);
  void element.offsetWidth;
  element.classList.add(klass);
}

export function popup(side,amount,critical=false,healing=false){
  const el=byId(side+'Popup');
  el.classList.remove('visible');
  el.replaceChildren();
  const n=document.createElement('span');
  n.className='number-hit'+(healing?' heal':'');
  n.textContent=(healing?'+':'−')+amount;
  el.append(n);
  if(critical){
    const crit=document.createElement('span');
    crit.className='critical';
    crit.textContent='Critical Hit!';
    el.append(crit);
  }
  void el.offsetWidth;
  el.classList.add('visible');
}

export function sprite(id,dex,back,emoji){
  const el=byId(id),wrap=el.parentElement;
  wrap.classList.remove('failed');
  byId(id.replace('Sprite','Fallback')).textContent=emoji;
  let attempt=0;
  const sources=[animatedImage(dex,back),staticImage(dex,back),'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+(back?'back/':'')+dex+'.png'];
  el.onerror=()=>{attempt++;if(attempt<sources.length)el.src=sources[attempt];else wrap.classList.add('failed');};
  el.onload=()=>wrap.classList.remove('failed');
  el.src=sources[0];
}
