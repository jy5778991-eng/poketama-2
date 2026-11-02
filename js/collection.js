import {DEX_CATALOG,pokemonCatchChance,pokemonCatchMultiplier} from './data/areas.js?v=20261031-rarity-tiers155';
import {RIVAL_POOL} from './data/trainers.js?v=20261023-06';
import {getForm,STARTERS,EVOLUTIONS,EEVEE_FORMS} from './data/pokemon.js';
import {staticImage} from './sprites.js';

// Collection screen renderer. Game state is provided on each render, never cached.
export function renderCollectionView({$,collectionTab,capturedPokemon,caughtSpecies,seenPokemon,blueCleared,brockCleared,mistyCleared,greenReturnCleared,surgeCleared,greenThirdCleared,erikaCleared,achievements=[],earnedAchievementIds=[]}){
 document.querySelectorAll('[data-collection-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.collectionTab===collectionTab)));
 const list=$('collectionContent');list.replaceChildren();
 const captured=caughtSpecies||new Set(capturedPokemon.map(p=>p.dex));
 const starterForms=[
  ...STARTERS.map(p=>({dex:p.baby,name:p.name})),
  ...Object.values(EVOLUTIONS).flat().map(p=>({dex:p.dex,name:p.name})),
  ...Object.values(EEVEE_FORMS).map(p=>({dex:p.dex,name:p.name}))
 ];
 const knownDex=[...new Set([...seenPokemon,...captured])].map(dex=>({dex,name:starterForms.find(s=>s.dex===dex)?.name||DEX_CATALOG.find(s=>s.dex===dex)?.name||'포켓몬 '+dex}));
 const dexRoster=[...new Map([...DEX_CATALOG,...RIVAL_POOL.map(p=>getForm(p.id,7)).filter(Boolean),...starterForms,...knownDex].map(p=>[p.dex,p])).values()].sort((p,q)=>p.dex-q.dex);
 if(collectionTab==='dex'){
  const count=dexRoster.filter(p=>seenPokemon.has(p.dex)).length;
  $('collectionSummary').textContent='발견 '+count+'종 · 포획 '+captured.size+'종 / 현재 도감 '+dexRoster.length+'종';
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
   row.append(num,img,info);list.append(row);
  }
 }else if(collectionTab==='achievements'){
  const entries=achievements||[];
  const earnedSet=new Set(earnedAchievementIds||[]);
  const achieved=entries.filter(([id])=>earnedSet.has(id)).length;
  $('collectionSummary').textContent=achieved+'/'+entries.length+' · 달성률 '+(entries.length?(achieved/entries.length*100).toFixed(1):'0.0')+'%';
  for(const [id,name,detail] of entries){
   const earned=earnedSet.has(id);
   const row=document.createElement('div');row.className='collection-progress achievement-entry'+(earned?' is-earned':' is-locked');
   const heading=document.createElement('div');heading.className='achievement-heading';
   const title=document.createElement('strong');title.className='achievement-name';title.textContent=earned?name:'???';
   const button=document.createElement('button');button.type='button';button.className='achievement-description-button';button.textContent='설명';button.disabled=!earned;
   button.setAttribute('aria-expanded','false');
   button.setAttribute('aria-label',earned?name+' 설명 보기':'미획득 업적 설명 잠김');
   const description=document.createElement('p');description.className='achievement-description';description.textContent=earned?detail:'';description.hidden=true;
   if(earned)button.addEventListener('click',()=>{description.hidden=!description.hidden;button.setAttribute('aria-expanded',String(!description.hidden));button.textContent=description.hidden?'설명':'닫기';});
   heading.append(title,button);row.append(heading,description);list.append(row);
  }
 }else{
  $('collectionSummary').textContent='트레이너 도전 기록';
  for(const [name,done,desc] of [['라이벌 그린',blueCleared,'Lv.5 · 숲 개방'],['체육관 관장 웅',brockCleared,'Lv.12 · 암석배지'],['체육관 관장 이슬이',mistyCleared,'Lv.17 · 블루배지'],['라이벌 그린',greenReturnCleared,'Lv.19 · 호수'],['체육관 관장 마티즈',surgeCleared,'Lv.24 · 오렌지배지'],['라이벌 그린',greenThirdCleared,'Lv.27 · 호수 유지'],['체육관 관장 민화',erikaCleared,'Lv.30 · 레인보우배지 · 도로']]){
   const row=document.createElement('div');row.className='collection-progress';row.textContent=(done?'✅ ':'⚔️ ')+name+' · '+(done?'클리어':'미클리어')+' · '+desc;list.append(row);
  }
 }
}
