import {DEX_CATALOG,pokemonCatchChance,pokemonCatchMultiplier} from './data/areas.js';
import {RIVAL_POOL} from './data/trainers.js';
import {getForm} from './data/pokemon.js';
import {staticImage} from './sprites.js';

// Collection screen renderer. Game state is provided on each render, never cached.
export function renderCollectionView({$,collectionTab,capturedPokemon,caughtSpecies,seenPokemon,blueCleared,brockCleared,mistyCleared}){
 document.querySelectorAll('[data-collection-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.collectionTab===collectionTab)));
 const list=$('collectionContent');list.replaceChildren();
 const captured=caughtSpecies||new Set(capturedPokemon.map(p=>p.dex));
 const dexRoster=[...new Map([...DEX_CATALOG,...RIVAL_POOL.map(p=>getForm(p.id,7)).filter(Boolean)].map(p=>[p.dex,p])).values()].sort((p,q)=>p.dex-q.dex);
 if(collectionTab==='dex'){
  const count=dexRoster.filter(p=>seenPokemon.has(p.dex)).length;
  $('collectionSummary').textContent='발견 '+count+'종 · 포획 '+captured.size+'종 / 현재 도감 '+dexRoster.length+'종';
  const hint=document.createElement('p');hint.className='dex-note';hint.textContent='표시 포획률은 HP 100% · 몬스터볼 기준. 실제 포획률은 남은 HP와 사용하는 볼에 따라 달라져.';list.append(hint);
  for(const p of dexRoster){
   const seen=seenPokemon.has(p.dex),caught=captured.has(p.dex);
   const row=document.createElement('div');row.className='dex-entry'+(seen?'':' dex-unknown');
   const num=document.createElement('span');num.className='dex-number';num.textContent=String(p.dex).padStart(3,'0');
   const img=document.createElement('img');img.alt=seen?p.name+' 도트 이미지':'미발견';img.loading='lazy';img.src=staticImage(p.dex);
   if(!seen){img.className='dex-silhouette';}
   const info=document.createElement('div');info.className='dex-info';
   const title=document.createElement('strong');title.textContent=seen?p.name:'???';
   const detail=document.createElement('small');detail.textContent=seen?(caught?'포획 완료':'발견 · 미포획'):'미발견';
   if(caught){const ball=document.createElement('img');ball.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';ball.alt='포획 완료';ball.className='dex-caught-ball';title.append(' ',ball);}
   info.append(title,detail);
   const right=document.createElement('div');right.className='dex-right';
   if(seen){
    const rate=document.createElement('small');rate.className='dex-rate';
    const chance=pokemonCatchChance(1,pokemonCatchMultiplier(p.dex,!!p.rare));
    rate.textContent=(chance*100).toFixed(1)+'%';
    rate.title='HP 100% · 몬스터볼 기준 포획률';
    right.append(rate);
   }
   row.append(num,img,info,right);list.append(row);
  }
 }else if(collectionTab==='achievements'){
  $('collectionSummary').textContent='현재 진행도 기반 업적';
  const badges=[['첫 만남',seenPokemon.size>=1,'야생 또는 트레이너 포켓몬 1종 발견'],['첫 포획',capturedPokemon.length>=1,'야생 포켓몬 1마리 포획'],['수집가',captured.size>=5,'포켓몬 5종 포획'],['그린 격파',blueCleared,'라이벌 그린 승리'],['암석배지',brockCleared,'체육관 관장 웅 승리'],['블루배지',mistyCleared,'체육관 관장 이슬이 승리']];
  for(const [name,earned,detail] of badges){const row=document.createElement('div');row.className='collection-progress';row.textContent=(earned?'🏅 ':'🔒 ')+name+' · '+detail;list.append(row);}
 }else{
  $('collectionSummary').textContent='트레이너 도전 기록';
  for(const [name,done,desc] of [['라이벌 그린',blueCleared,'Lv.7 · 숲 개방'],['체육관 관장 웅',brockCleared,'Lv.13 · 암석배지'],['체육관 관장 이슬이',mistyCleared,'Lv.19 · 블루배지']]){
   const row=document.createElement('div');row.className='collection-progress';row.textContent=(done?'✅ ':'⚔️ ')+name+' · '+(done?'클리어':'미클리어')+' · '+desc;list.append(row);
  }
 }
}
