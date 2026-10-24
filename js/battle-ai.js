import {MOVES} from './data/moves.js';
// Two opponent modes only: wild random, and one shared situational trainer AI.
export function chooseEnemyMove(enemy,{wild=false,rng=Math.random,opponent=null}={}){
 const usable=enemy.moveIds.filter(id=>enemy.pp[id]>0);
 if(!usable.length)return {moveId:'struggle'};
 if(wild)return {moveId:usable[Math.floor(rng()*usable.length)]};
 const hpRatio=enemy.hp/enemy.stats.hp;
 const opponentHp=opponent?.hp??Infinity;
 const attack=enemy.stats.attack;
 const defense=opponent?.stats?.defense||100;
 const rated=usable.map(id=>{
  const m=MOVES[id];
  let score=0;
  if(m.power){
   const expected=(Math.floor((Math.floor(2*enemy.level/5)+2)*m.power*attack/Math.max(1,defense)/50)+2)*(m.accuracy??1);
   score=expected;
   if(expected>=opponentHp)score+=75;
   if(m.recoilMaxHp&&hpRatio<.3)score-=35;
   if(m.selfKo)score-=hpRatio>.25?100:5;
   if(m.requiresTargetSleep&&opponent?.status?.type!=='sleep')score=-1000;
  }else if(m.healMaxHp){
   score=hpRatio<.35?115:hpRatio<.65?60:-100;
  }else if(m.inflict){
   score=opponent?.status? -100 : (opponentHp===Infinity?35: Math.min(45,20+opponentHp/20));
  }else if(m.boosts){
   const capped=Object.entries(m.boosts).every(([stat,n])=>(enemy.stages?.[stat]??0)>=2&&n>0);
   score=capped?-100:enemy.hp>enemy.stats.hp*.55?30:5;
  }else score=5;
  return {id,score:score+(rng()-.5)*12};
 });
 rated.sort((a,b)=>b.score-a.score);
 return {moveId:rated[0].id};
}
