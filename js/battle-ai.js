import {MOVES} from './data/moves.js';
// Exactly two modes: random wild selection and shared tactical trainer selection.
export function chooseEnemyMove(enemy,{wild=false,rng=Math.random,opponent=null}={}){
 const usable=enemy.moveIds.filter(id=>enemy.pp[id]>0);
 if(!usable.length)return {moveId:'struggle'};
 if(wild)return {moveId:usable[Math.floor(rng()*usable.length)]};
 const hp=enemy.hp/Math.max(1,enemy.stats.hp);
 const opponentHp=opponent?.hp??Infinity;
 const attack=enemy.stats.attack;
 const defense=opponent?.stats?.defense||100;
 const attackStage=enemy.stages?.attack??0;
 const defenseStage=opponent?.stages?.defense??0;
 const stage=n=>n>=0?(2+n)/2:2/(2-n);
 const rated=usable.map(id=>{
  const m=MOVES[id];
  const accuracy=m.accuracy??1;
  let score=-30;
  if(m.power){
   const effectivePower=m.hpScale==='high'?85+50*hp:m.hpScale==='low'?85+50*(1-hp):m.power;
   const expected=(Math.floor((Math.floor(2*enemy.level/5)+2)*effectivePower*attack*stage(attackStage)/(Math.max(1,defense*stage(defenseStage)))/50)+2)*accuracy*.925;
   score=expected;
   if(expected>=opponentHp)score+=50;
   if(m.requiresTargetSleep&&opponent?.status?.type!=='sleep')score=-10000;
   if(m.recoilMaxHp&&enemy.hp<=Math.floor(enemy.stats.hp*m.recoilMaxHp))score-=100;
   if(m.selfKo)score-=enemy.hp>enemy.stats.hp*.15?150:35;
   if(m.recharge)score-=Math.max(8,expected*.22);
  }else if(m.healMaxHp){
   const missing=enemy.stats.hp-enemy.hp;
   const possible=Math.min(missing,Math.floor(enemy.stats.hp*m.healMaxHp));
   const fraction=possible/enemy.stats.hp;
   // Prevent healing at full HP and avoid repeated low-value heals.
   score=hp>=.78||fraction<.15?-1000:hp<.30?Math.min(110,35+fraction*145):hp<.53?Math.min(80,20+fraction*110):10;
  }else if(m.inflict){
   if(opponent?.status)score=-1000;
   else if(m.inflict==='sleep')score=hp>.3?68*accuracy:30*accuracy;
   else if(m.inflict==='paralysis')score=hp>.35?43*accuracy:14;
   else if(m.inflict==='poison')score=hp>.4?38*accuracy:10;
  }else if(m.boosts){
   const entries=Object.entries(m.boosts);
   const changes=entries.some(([stat,n])=>n>0&&(enemy.stages?.[stat]??0)<2);
   score=changes&&hp>.66&&opponentHp>enemy.stats.attack*.65?45:-1000;
  }
  // Tiny tie breaker keeps repeated turns from being perfectly deterministic.
  return {id,score:score+rng()*5};
 });
 rated.sort((a,b)=>b.score-a.score);
 return {moveId:rated[0].id};
}
