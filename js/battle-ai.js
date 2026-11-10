import {MOVES} from './data/moves.js?v=20261109-growl-tm20';
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
// After +2 self-boost or -2 opponent-debuff, rapidly diminish further setup attempts.
const STAGE_TACTIC_CHANCE=[.38,.31,.12,.045,.015,.004,0];
const battleSpeed=f=>Math.max(1,Math.floor((f?.stats?.speed||1)*stageMultiplier(f?.stages?.speed||0)*(f?.status?.type==='paralysis'?.5:1)*(f?.speedBuffMultiplier||1)));
const speedAlreadyAhead=(enemy,opponent)=>!!opponent&&battleSpeed(enemy)>=battleSpeed(opponent);
const stageValue=(fighter,stat)=>Math.max(-6,Math.min(6,fighter?.stages?.[stat]??0));
function stageTacticChance(move,enemy,opponent){
 const faster=speedAlreadyAhead(enemy,opponent);
 const effects=[];
 for(const [stat,delta] of Object.entries(move.boosts||{})){
  if(delta>0&&!(stat==='speed'&&faster))effects.push({stat,progress:Math.max(0,stageValue(enemy,stat)),amount:delta});
 }
 const drops={attack:move.lowerTargetAttack||0,defense:move.lowerTargetDefense||0,accuracy:move.lowerTargetAccuracy||0,evasion:move.lowerTargetEvasion||0};
 for(const [stat,amount] of Object.entries(drops)){
  if(amount>0&&opponent&&!(stat==='speed'&&faster))effects.push({progress:Math.max(0,-stageValue(opponent,stat)),amount});
 }
 if(!effects.length)return 0;
 // Only consider stages which can still change; cap at six.
 const active=effects.filter(({progress})=>progress<6);
 if(!active.length)return 0;
 const weight=active.reduce((sum,e)=>sum+e.amount,0);
 const baseChance=active.reduce((sum,{progress,amount})=>sum+STAGE_TACTIC_CHANCE[progress]*amount,0)/weight;
 // When the trainer is moving second, Speed-boosting moves deserve extra setup value.
 // This applies to both Agility and Dragon Dance without penalizing their other boosts.
 // Once already moving first (or Speed is capped), the extra chance disappears.
 const speedGain=active.some(effect=>effect.stat==='speed');
 const speedProgress=Math.max(0,stageValue(enemy,'speed'));
 const speedBonus=!faster&&speedProgress<6&&speedGain
  ?Math.min(.17,STAGE_TACTIC_CHANCE[speedProgress]*.45):0;
 return Math.min(.65,baseChance+speedBonus);
}
function chooseStageTactic(enemy,opponent,rng,usable){
 if(!opponent||opponent.hp<=0)return null;
 const hp=enemy.hp/Math.max(1,enemy.stats.hp);
 const opponentHp=opponent.hp/Math.max(1,opponent.stats?.hp||opponent.hp);
 // When almost knocked out, prioritize acting rather than setting up.
 // Sharp low-HP penalty for all non-Red trainer setup and debuff tactics.
 // At or below 25% HP: only 2% of normal selection chance.
 // At or below 40% HP: 10%; at or below 60% HP: 35%.
 const survival=hp<=.25?.02:hp<=.40?.10:hp<=.60?.35:hp<=.75?.70:1;
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
// Lightweight 2-3 turn tactical forecast for attacks with secondary stat effects.
// Future value is discounted by expected survival, target remaining HP, and stage caps.
function combatAccuracy(move,user,target){
 const net=stageValue(target,'evasion')-stageValue(user,'accuracy');
 const factor=net>=0?3/(3+net):(3-net)/3;
 return Math.max(0,Math.min(1,(move.accuracy??1)*factor));
}
function projectedAttackDamage(attacker,defender,move,attackStage=stageValue(attacker,'attack')){
 if(!move?.power)return 0;
 const atk=Math.max(1,attacker.stats.attack*stageMultiplier(attackStage)*(attacker.attackBuffMultiplier||1)*(attacker.status?.type==='burn'?.5:1));
 const def=Math.max(1,defender.stats.defense*stageMultiplier(stageValue(defender,'defense'))*(defender.defenseBuffMultiplier||1));
 const raw=(Math.floor(2*attacker.level/5)+2)*move.power*atk/def/50+2;
 return raw*combatAccuracy(move,attacker,defender)*.925*1.1;
}
function strongestAttack(attacker,defender){
 return Math.max(0,...(attacker.moveIds||[]).filter(id=>MOVES[id]?.power)
  .map(id=>projectedAttackDamage(attacker,defender,MOVES[id])));
}
function secondaryForecast(move,enemy,opponent,hp){
 if(!opponent||opponent.hp<=0)return 0;
 const enemyHp=enemy.hp/Math.max(1,enemy.stats.hp);
 const targetHp=opponent.hp/Math.max(1,opponent.stats.hp);
 const targetAttack=strongestAttack(opponent,enemy);
 const userAttack=strongestAttack(enemy,opponent);
 // Short-term benefits matter most while both combatants can survive several turns.
 const horizon=2.3*Math.min(1,enemyHp/.65)*Math.min(1,targetHp/.65);
 const lowHpPenalty=hp<=.25?.15:hp<=.40?.4:hp<=.60?.7:1;
 const hitChance=combatAccuracy(move,enemy,opponent);
 let bonus=0;
 if(move.boostsOnHit?.attack&&stageValue(enemy,'attack')<6){
  const oldStage=stageValue(enemy,'attack');
  const nextStage=Math.min(6,oldStage+move.boostsOnHit.attack);
  const increase=stageMultiplier(nextStage)/stageMultiplier(oldStage)-1;
  // Compare future offensive damage with and without the +Attack stage.
  bonus+=Math.min(userAttack*.85,userAttack*increase*horizon*.55)*hitChance*lowHpPenalty;
 }
 if(move.lowerTargetAccuracy&&stageValue(opponent,'accuracy')>-6){
  const oldAccuracy=stageValue(opponent,'accuracy');
  const newAccuracy=Math.max(-6,oldAccuracy-move.lowerTargetAccuracy);
  // Accuracy reduction lowers expected incoming hits over the next turns.
  const oldNet=stageValue(enemy,'evasion')-oldAccuracy;
  const newNet=stageValue(enemy,'evasion')-newAccuracy;
  const accuracyFactor=net=>net>=0?3/(3+net):(3-net)/3;
  const avoided=Math.max(0,1-accuracyFactor(newNet)/accuracyFactor(oldNet));
  bonus+=Math.min(userAttack*.80,targetAttack*avoided*horizon*.65)*hitChance*lowHpPenalty;
 }
 if(move.lowerTargetSpeedChance&&stageValue(opponent,'speed')>-6&&battleSpeed(enemy)<battleSpeed(opponent)){
  const nextSpeedStage=Math.max(-6,stageValue(opponent,'speed')-1);
  const futureSpeed=Math.max(1,Math.floor(opponent.stats.speed*stageMultiplier(nextSpeedStage)*(opponent.status?.type==='paralysis'?.5:1)*(opponent.speedBuffMultiplier||1)));
  const speedFlip=battleSpeed(enemy)>=futureSpeed;
  // Reversing turn order can prevent an incoming hit when our next attack KOs.
  const nearKo=userAttack>=opponent.hp*.65;
  bonus+=Math.min(userAttack*.65,targetAttack*(speedFlip?(nearKo?.48:.25):.055)*horizon)*hitChance*lowHpPenalty;
 }
 return bonus;
}
// OHKO moves have no ordinary power value. Their decision is a separate tactical gamble,
// based on the SAME accuracy calculation as battle-engine.mjs (including level penalty).
// Avoid the gamble if a reliable ordinary attack can finish the opponent.
// OHKO moves have the same baseline selection weight as ordinary damaging attacks.
// Target Defense raises the OHKO choice weight; target Evasion lowers it.
// Neither expected damage nor remaining HP affects OHKO move selection.
// Accuracy, level difference and accuracy/evasion still affect the actual hit roll in the engine.
function chooseOneHitKo(enemy,opponent,rng,usable){
 if(!opponent||opponent.hp<=0)return null;
 const ohkos=usable.filter(id=>MOVES[id]?.oneHitKo);
 if(!ohkos.length)return null;
 const ordinaryCount=usable.filter(id=>MOVES[id]?.power&&!MOVES[id].oneHitKo).length;
 const defenseRank=stageValue(opponent,'defense');
 const evasionRank=stageValue(opponent,'evasion');
 // At neutral stages: one OHKO and three attacks => 1/(3+1) = 25% OHKO choice.
 // Defense +6 => 2.8x OHKO weight; Evasion +6 => about 0.32x.
 const defenseWeight=Math.max(.25,1+defenseRank*.30);
 const evasionWeight=Math.max(.2,1+evasionRank*.35);
 const ohkoWeight=defenseWeight/evasionWeight;
 const totalWeight=ordinaryCount+ohkos.length*ohkoWeight;
 if(totalWeight<=0)return null;
 const roll=rng()*totalWeight;
 if(roll>=ohkos.length*ohkoWeight)return null; // Let the normal attack scorer choose.
 const index=Math.min(ohkos.length-1,Math.floor(roll/ohkoWeight));
 return {moveId:ohkos[index]};
}
// Confusion-only status moves have a 20% initial preference at full HP.
// Low HP, an almost fainted opponent, and reduced accuracy all lower the chance.
// Never waste a turn trying to confuse a Pokemon that is already confused.
function chooseConfusionTactic(enemy,opponent,rng,usable){
 if(!opponent||opponent.hp<=0||opponent.confusionTurns>0)return null;
 const moves=usable.filter(id=>MOVES[id]?.confuseTarget&&!MOVES[id]?.power);
 if(!moves.length)return null;
 const ownHp=enemy.hp/Math.max(1,enemy.stats.hp);
 const targetHp=opponent.hp/Math.max(1,opponent.stats?.hp||opponent.hp);
 const survival=ownHp<=.25?.02:ownHp<=.40?.10:ownHp<=.60?.35:ownHp<=.75?.70:1;
 const finish=targetHp<.18?.3:targetHp<.35?.65:1;
 const chances=moves.map(id=>({
  id,chance:.20*survival*finish*combatAccuracy(MOVES[id],enemy,opponent)
 }));
 // One roll for the total chance; avoid inflating the odds if several
 // confusion-only moves are equipped.
 const total=Math.min(.20,chances.reduce((sum,item)=>sum+item.chance,0));
 if(rng()>=total)return null;
 let pick=rng()*chances.reduce((sum,item)=>sum+item.chance,0);
 for(const item of chances){if(pick<item.chance)return {moveId:item.id};pick-=item.chance;}
 return {moveId:chances[chances.length-1].id};
}
// Team-wide status control should remain valuable regardless of the active Pokemon's HP.
// Prefer accurate paralysis, then sleep, then poison; never compete with raw damage scores.
// These are selection probabilities, before the actual move's hit roll.
function chooseTeamStatusTactic(enemy,opponent,rng,usable){
 if(!opponent||opponent.hp<=0||opponent.status)return null;
 const targetHp=opponent.hp/Math.max(1,opponent.stats?.hp||opponent.hp);
 // Avoid spending a turn on status when the foe is almost defeated or can be finished.
 if(targetHp<.25)return null;
 const canFinish=usable.some(id=>MOVES[id]?.power&&
  projectedAttackDamage(enemy,opponent,MOVES[id])>=opponent.hp*.9);
 if(canFinish)return null;
 const baseChance={paralysis:.80,sleep:.55,poison:.80};
 const options=usable.filter(id=>!MOVES[id]?.power&&baseChance[MOVES[id]?.inflict])
  .map(id=>({id,chance:baseChance[MOVES[id].inflict]*
    combatAccuracy(MOVES[id],enemy,opponent)}));
 if(!options.length)return null;
 // A single selection roll shared across status moves; high priority does not stack
 // into a 100% chance simply because two such moves are equipped.
 const sum=options.reduce((acc,x)=>acc+x.chance,0);
 const total=Math.min(.88,sum);
 if(rng()>=total)return null;
 let pick=rng()*sum;
 for(const option of options){if(pick<option.chance)return {moveId:option.id};pick-=option.chance;}
 return {moveId:options[options.length-1].id};
}
// Exactly two modes: random wild selection and shared tactical trainer selection.
export function chooseEnemyMove(enemy,{wild=false,rng=Math.random,opponent=null,shields=null}={}){
 const usable=enemy.moveIds.filter(id=>MOVES[id]&&(!MOVES[id].pp||(enemy.pp?.[id]??MOVES[id].pp)>0));
 if(!usable.length)return {moveId:'struggle'};
 if(wild)return {moveId:usable[Math.floor(rng()*usable.length)]};
 if(enemy.redAiMode){const chosen=chooseRedMove(enemy,opponent,rng,usable);if(chosen)return chosen;}
 // Party-wide Light Screen is valuable regardless of the user's HP.
 // The engine decrements screen duration at the start of a turn, so 1 remaining expires now.
 const screenUp=(shields?.enemy??0)>1;
 const ownHpRatio=enemy.hp/Math.max(1,enemy.stats.hp);
 const opponentHpRatio=opponent?.hp/Math.max(1,opponent?.stats?.hp||opponent?.hp||1);
 // Do not waste a turn on Light Screen when the foe is almost defeated,
 // when a normal attack can likely finish it, or when a useful heal is available.
 const healingNeeded=ownHpRatio<.53&&usable.some(id=>MOVES[id]?.healMaxHp&&
  Math.min(enemy.stats.hp-enemy.hp,Math.floor(enemy.stats.hp*MOVES[id].healMaxHp))>=enemy.stats.hp*.15);
 const likelyFinish=opponent&&usable.some(id=>MOVES[id]?.power&&
  projectedAttackDamage(enemy,opponent,MOVES[id])>=opponent.hp*.9);
 const screenShouldWait=healingNeeded||(opponent&&opponentHpRatio<.25)||likelyFinish;
 if(!enemy.redAiMode&&usable.includes('lightScreen')&&!screenUp&&!screenShouldWait&&rng()<.88)return {moveId:'lightScreen'};
 if(!enemy.redAiMode){const teamStatus=chooseTeamStatusTactic(enemy,opponent,rng,usable);if(teamStatus)return teamStatus;}
 if(!enemy.redAiMode){const tactic=chooseStageTactic(enemy,opponent,rng,usable);if(tactic)return tactic;}
 if(!enemy.redAiMode){const confusion=chooseConfusionTactic(enemy,opponent,rng,usable);if(confusion)return confusion;}
 
 if(!enemy.redAiMode){const gamble=chooseOneHitKo(enemy,opponent,rng,usable);if(gamble)return gamble;}
 // A failed setup roll must really mean 'use another move': do not let the
 // older score-based fallback select the same setup/debuff move anyway.
 const normalUsable=enemy.redAiMode?usable:usable.filter(id=>{
  if(MOVES[id].oneHitKo)return false; // OHKO moves are handled by the separate tactical gamble.
  if(!MOVES[id].power&&['sleep','paralysis','poison'].includes(MOVES[id].inflict))return false; // Independently selected above.
  if(id==='lightScreen')return !screenUp&&!screenShouldWait;
  const m=MOVES[id];
  return m.power||m.healMaxHp||m.inflict||m.rest||m.bellyDrum||
    !(m.boosts||m.lowerTargetAttack||m.lowerTargetDefense||m.lowerTargetAccuracy||m.lowerTargetEvasion);
 });
 if(!normalUsable.length)return {moveId:'struggle'};
 const hp=enemy.hp/Math.max(1,enemy.stats.hp);
 const opponentHp=opponent?.hp??Infinity;
 const attack=enemy.stats.attack;
 const defense=opponent?.stats?.defense||100;
 const slower=!speedAlreadyAhead(enemy,opponent);
 const attackStage=enemy.stages?.attack??0;
 const defenseStage=opponent?.stages?.defense??0;
 const stage=n=>n>=0?(2+n)/2:2/(2-n);
 const rated=normalUsable.map(id=>{
  const m=MOVES[id];
  const accuracy=m.accuracy??1;
  let score=-30;
  if(m.power){
   const effectivePower=m.hpScale==='high'?85+50*hp:m.hpScale==='low'?85+50*(1-hp):m.power;
   const expected=(Math.floor((Math.floor(2*enemy.level/5)+2)*effectivePower*attack*stage(attackStage)/(Math.max(1,defense*stage(defenseStage)))/50)+2)*accuracy*.925;
   score=expected;
   // Faster attackers favor their stronger normal move. Slower attackers favor useful priority moves,
   // but only as a preference, never as an absolute rule.
   if((m.priority||0)>0)score*=slower?1.42:.82;
   // Score damage plus the discounted value of secondary effects over 2-3 future turns.
   // At stat caps secondary value is exactly zero. When HP is low, prioritize immediate attacks.
   if(!enemy.redAiMode)score+=secondaryForecast(m,enemy,opponent,hp);
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
  }else if(m.shieldTurns){
   score=screenUp?-10000:28;
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
