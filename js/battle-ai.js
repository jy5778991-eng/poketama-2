import {MOVES} from './data/moves.js?v=20261031-recover-name157';
// Red has a dedicated policy; all other trainers keep the shared tactical AI.
const stageMultiplier=n=>n>=0?(2+n)/2:2/(2-n);
function redExpectedDamage(enemy,opponent,id){
 const move=MOVES[id];
 if(!move?.power)return -Infinity;
 const attack=Math.max(1,Math.floor(enemy.stats.attack*stageMultiplier(enemy.stages?.attack||0)))*(enemy.status?.type==='burn'?0.5:1)*(enemy.attackBuffMultiplier||1);
 const defense=Math.max(1,Math.floor((opponent?.stats?.defense||100)*stageMultiplier(opponent?.stages?.defense||0)))*(opponent?.defenseBuffMultiplier||1);
 const power=move.hpScale==='currentRatio'?150*enemy.hp/enemy.stats.hp:move.power;
 const raw=Math.floor((Math.floor(2*enemy.level/5)+2)*power*attack/defense/50)+2;
 const accuracyStage=(enemy.stages?.accuracy||0)-(opponent?.stages?.evasion||0);
 const accuracyFactor=accuracyStage>=0?(3+accuracyStage)/3:3/(3-accuracyStage);
 const accuracy=Math.min(1,((move.accuracy??1)+(enemy.accuracyBuff||0))*accuracyFactor);
 return Math.max(1,raw)*accuracy*.925*1.1;
}
function chooseRedMove(enemy,opponent,rng,usable){
 const can=id=>usable.includes(id);
 const hp=enemy.hp/Math.max(1,enemy.stats.hp);
 if(enemy.redAiMode==='pikachu'){
  // Establish paralysis, then use Double Team once before settling into offense.
  if(!opponent?.status&&can('thunderWave'))return {moveId:'thunderWave'};
  if(!enemy.redFirstDoubleTeamSelected&&can('doubleTeam')&&(enemy.stages?.evasion||0)<6){
   enemy.redFirstDoubleTeamSelected=true;
   return {moveId:'doubleTeam'};
  }
  const evasion=enemy.stages?.evasion||0;
  const chance=[0.22,0.18,0.12,0.075,0.035,0.01,0][Math.min(6,Math.max(0,evasion))];
  if(can('doubleTeam')&&rng()<chance)return {moveId:'doubleTeam'};
  const attacks=['thunder','voltTackle'].filter(can);
  if(attacks.length)return {moveId:attacks.sort((a,b)=>redExpectedDamage(enemy,opponent,b)-redExpectedDamage(enemy,opponent,a))[0]};
 }
 if(enemy.redAiMode==='snorlax'){
  if(!enemy.redFirstTurnSelected){
   enemy.redFirstTurnSelected=true;
   if(can('bellyDrum')&&enemy.hp>Math.floor(enemy.stats.hp/2))return {moveId:'bellyDrum'};
  }
  if(enemy.status?.type==='sleep'&&can('sleepTalk'))return {moveId:'sleepTalk'};
  if(hp<0.53&&!enemy.status&&can('rest'))return {moveId:'rest'};
  if(can('bodySlam'))return {moveId:'bodySlam'};
 }
 if(enemy.redAiMode==='lapras'){
  // Charm whenever the opposing Pokemon's Attack stage is -1 or higher.
  // Once it reaches -2 or lower, use another available move instead.
  if((opponent?.stages?.attack??0)>=-1&&can('charm'))return {moveId:'charm'};
  const choices=usable.filter(id=>id!=='charm');
  if(choices.length)return {moveId:choices[Math.floor(rng()*choices.length)]};
 }
 if(enemy.redAiMode==='venusaur'){
  // Heal below 53%, otherwise favor Sleep Powder over the two attacks.
  if(hp<0.53&&can('synthesis'))return {moveId:'synthesis'};
  const candidates=[
   {id:'sleepPowder',weight:2},
   {id:'energyBall',weight:1},
   {id:'solarBeam',weight:1}
  ].filter(choice=>can(choice.id)&&(choice.id!=='sleepPowder'||!opponent?.status));
  const total=candidates.reduce((sum,choice)=>sum+choice.weight,0);
  if(total>0){
   let roll=rng()*total;
   for(const choice of candidates){
    if(roll<choice.weight)return {moveId:choice.id};
    roll-=choice.weight;
   }
   return {moveId:candidates.at(-1).id};
  }
 }
 if(enemy.redAiMode==='blastoise'){
  if(!enemy.redFirstTurnSelected){
   enemy.redFirstTurnSelected=true;
   if(can('shellSmash'))return {moveId:'shellSmash'};
  }
  const attacks=['hydroPump','surf','powerUpPunch'].filter(can);
  if(attacks.length)return {moveId:attacks[Math.floor(rng()*attacks.length)]};
 }
 if(enemy.redAiMode==='charizard'){
  if(!enemy.redFirstTurnSelected){
   enemy.redFirstTurnSelected=true;
   if(can('dragonDance')&&(enemy.stages?.attack??0)<6&&(enemy.stages?.speed??0)<6)return {moveId:'dragonDance'};
  }
  // Keep healing as the highest priority when HP falls below 53%.
  if(hp<0.53&&can('roost'))return {moveId:'roost'};
  const attackStage=Math.max(0,enemy.stages?.attack??0);
  const speedStage=Math.max(0,enemy.stages?.speed??0);
  const boostLevel=Math.min(6,Math.floor((attackStage+speedStage)/2));
  const danceChance=[.30,.22,.15,.09,.04,.01,0][boostLevel];
  if(can('dragonDance')&&attackStage<6&&speedStage<6&&rng()<danceChance)return {moveId:'dragonDance'};
  const attacks=['flareBlitz','fireBlast'].filter(can);
  if(attacks.length)return {moveId:attacks[Math.floor(rng()*attacks.length)]};
 }
 return null;
}
// Shared trainer stage tactics (Red's dedicated AI is deliberately excluded).
// Chances are per turn and recalculate from the CURRENT stat stages.
// Reversing a stage (via an opponent move) makes the corresponding tactic more likely again.
const STAGE_TACTIC_CHANCE=[.38,.31,.23,.16,.09,.035,0];
const stageValue=(fighter,stat)=>Math.max(-6,Math.min(6,fighter?.stages?.[stat]??0));
function stageTacticChance(move,enemy,opponent){
 const effects=[];
 for(const [stat,delta] of Object.entries(move.boosts||{})){
  if(delta>0)effects.push({progress:Math.max(0,stageValue(enemy,stat)),amount:delta});
 }
 const drops={attack:move.lowerTargetAttack||0,defense:move.lowerTargetDefense||0,accuracy:move.lowerTargetAccuracy||0,evasion:move.lowerTargetEvasion||0};
 for(const [stat,amount] of Object.entries(drops)){
  if(amount>0&&opponent)effects.push({progress:Math.max(0,-stageValue(opponent,stat)),amount});
 }
 if(!effects.length)return 0;
 // Only consider stages which can still change; cap at six.
 const active=effects.filter(({progress})=>progress<6);
 if(!active.length)return 0;
 const weight=active.reduce((sum,e)=>sum+e.amount,0);
 return active.reduce((sum,{progress,amount})=>sum+STAGE_TACTIC_CHANCE[progress]*amount,0)/weight;
}
function chooseStageTactic(enemy,opponent,rng,usable){
 if(!opponent||opponent.hp<=0)return null;
 const hp=enemy.hp/Math.max(1,enemy.stats.hp);
 const opponentHp=opponent.hp/Math.max(1,opponent.stats?.hp||opponent.hp);
 // When almost knocked out, prioritize acting rather than setting up.
 const survival=hp<.25?.20:hp<.45?.5:1;
 // Do not spend many turns setting up against an almost-fainted opponent.
 const finish=opponentHp<.18?.3:opponentHp<.35?.65:1;
 const candidates=[];
 for(const id of usable){
  const move=MOVES[id];
  if(move.power||move.healMaxHp||move.inflict||move.rest||move.bellyDrum)continue;
  const chance=stageTacticChance(move,enemy,opponent)*survival*finish*(move.accuracy??1);
  if(chance>0)candidates.push({id,chance});
 }
 if(!candidates.length)return null;
 // One shared roll prevents multiple setup moves from unfairly stacking probabilities.
 // If several moves qualify, choose which one to try by their current stage usefulness.
 const total=Math.min(.72,candidates.reduce((sum,c)=>sum+c.chance,0));
 if(rng()>=total)return null;
 let pick=rng()*candidates.reduce((sum,c)=>sum+c.chance,0);
 for(const candidate of candidates){
  if(pick<candidate.chance)return {moveId:candidate.id};
  pick-=candidate.chance;
 }
 return {moveId:candidates[candidates.length-1].id};
}
// Exactly two modes: random wild selection and shared tactical trainer selection.
export function chooseEnemyMove(enemy,{wild=false,rng=Math.random,opponent=null}={}){
 const usable=enemy.moveIds.filter(id=>MOVES[id]&&(!MOVES[id].pp||(enemy.pp?.[id]??MOVES[id].pp)>0));
 if(!usable.length)return {moveId:'struggle'};
 if(wild)return {moveId:usable[Math.floor(rng()*usable.length)]};
 if(enemy.redAiMode){const chosen=chooseRedMove(enemy,opponent,rng,usable);if(chosen)return chosen;}
 if(!enemy.redAiMode){const tactic=chooseStageTactic(enemy,opponent,rng,usable);if(tactic)return tactic;}
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
   // HP below 53%: favor draining attacks (Absorb, Mega Drain, Giga Drain, etc.).
   // Base the bonus on usable healing, capped by missing HP, while preserving damage scoring.
   if(hp<.53&&m.drain){
    const missing=Math.max(0,enemy.stats.hp-enemy.hp);
    const potentialHeal=Math.min(missing,Math.max(1,Math.floor(Math.min(expected,opponentHp)*m.drain)));
    score+=Math.max(18,potentialHeal*(hp<.30?1.4:1));
   }
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
