/** Poketama 2.0: dependency-free deterministic turn engine (ES module).
 * Draft rules v1.0. UI and storage are deliberately excluded.
 */
export const RULES = Object.freeze({
  stageLimit: 6, criticalMultiplier: 1.5, randomMin: 0.85,
  poisonFraction: 0.10, paralysisSpeed: 0.5, paralysisSkipChance: 0.25,
  sleepSecondActionWakeChance: 0.3, sleepThirdActionWakeChance: 0.7, strugglePower: 50, struggleRecoil: 0.25,
});
import {MOVES} from './js/data/moves.js?v=20261029-learnsets118';
import {chooseEnemyMove} from './js/battle-ai.js?v=20261029-icicle98';
export {MOVES};

const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const roll=(rng)=>clamp(rng(),0,1-Number.EPSILON);
const isAlive=(p)=>p.hp>0;
const say=(battle,msg)=>battle.log.push(msg);
const emit=(battle,event)=>battle.events.push(event);
const sideOf=(battle,p)=>p===battle.player?'player':'enemy';
const stageMultiplier=(stage)=>stage>=0 ? (2+stage)/2 : 2/(2-stage);
const effectiveStat=(p, stat)=>Math.max(1,Math.floor(p.stats[stat]*stageMultiplier(p.stages[stat])*(stat==='speed'&&p.status?.type==='paralysis'?RULES.paralysisSpeed:1)));
export function calculateStats(base,level,iv={},ev={}) {
  if(!Number.isInteger(level)||level<1||level>100) throw new Error('Invalid level');
  const stats={};
  for(const stat of ['hp','attack','defense','speed']) {
    const i=iv[stat]??0, e=ev[stat]??0;
    if(!Number.isInteger(i)||i<0||i>16||!Number.isInteger(e)||e<0||e>100) throw new Error('Invalid IV/EV');
    const baseValue=2*base[stat]+i+Math.floor(e/4);
    stats[stat]=Math.floor(baseValue*level/100)+(stat==='hp'?level+10:5);
  }
  if(Object.values(ev).reduce((a,b)=>a+b,0)>216) throw new Error('EV total exceeds 216');
  return stats;
}
export function createFighter({id,name,stats,level=50,friendship=0,moveIds}) {
  if(!stats||!Number.isFinite(stats.hp)||stats.hp<=0) throw new Error('Invalid stats');
  if(!Array.isArray(moveIds)||moveIds.length<1||moveIds.length>4||new Set(moveIds).size!==moveIds.length) throw new Error('Choose 1-4 unique moves');
  for(const m of moveIds) if(!MOVES[m]) throw new Error('Unknown move: '+m);
  return {id,name,level,stats:{...stats},hp:stats.hp,friendship:clamp(friendship,0,100),
    moveIds:[...moveIds],
    stages:{attack:0,defense:0,speed:0,evasion:0},status:null,confusionTurns:0,lockedMove:null};
}
export function createBattle(player,enemies,{items=0,balls=0,wild=false,rng=Math.random}={}) {
  if(!enemies.length) throw new Error('Need enemies');
  return {player, enemies,enemyIndex:0,items,balls,wild,turn:0,ended:false,result:null,log:[],events:[],rng,shields:{player:0,enemy:0},rings:{player:false,enemy:false}};
}
function activeEnemy(b){return b.enemies[b.enemyIndex];}
function accuracySuccess(move,b,user,target){const evasion=target?.stages?.evasion||0;const accuracy=user?.stages?.accuracy||0;const net=evasion-accuracy;const factor=net>=0?3/(3+net):(3-net)/3;return roll(b.rng)<Math.min(1,((move.accuracy??1)+(user.accuracyBuff||0))*factor);}
function critRate(p){return 0.06+0.0008*p.friendship;} // draft curve: 14% at friendship 100
export function damageRoll(attacker,defender,move,{rng=Math.random}={}) {
  const atk=effectiveStat(attacker,'attack')*(attacker.status?.type==='burn'?0.5:1), def=effectiveStat(defender,'defense')*(defender.defenseBuffMultiplier||1);
  const levelFactor=Math.floor(2*attacker.level/5)+2;
  const raw=Math.floor(levelFactor*move.power*atk*(attacker.attackBuffMultiplier||1)/Math.max(1,def)/50)+2;
  const critical=roll(rng)<Math.min(1,critRate(attacker)*(move.critMultiplier??1)+(attacker.critBuff||0));
  const variance=RULES.randomMin+(1-RULES.randomMin)*roll(rng);
  return {damage:Math.max(1,Math.floor(raw*(critical?RULES.criticalMultiplier:1)*variance*(defender.sideShieldTurns>0?0.5:1))),critical};
}
function afflict(target,type,b){
  if(target.status) {say(b,`${target.name}에게는 이미 상태이상이 있다.`);return false;}
  target.status={type, sleepBlockedActions:0};
  say(b,`${target.name}: ${type==='sleep'?'수면':type==='poison'?'독':type==='freeze'?'얼음':type==='burn'?'화상':'마비'} 상태!`);
  emit(b,{type:'statusApplied',side:sideOf(b,target),status:type});
  return true;
}
function applyConfusion(target,b,turns=null){
 if(target.confusionTurns>0){say(b,'실패했다!');return false;}
 target.confusionTurns=turns??(1+Math.floor(roll(b.rng)*3));
 say(b,`${target.name}은(는) 혼란에 빠졌다!`);emit(b,{type:'statusApplied',side:sideOf(b,target),status:'confusion'});return true;
}
function canAct(p,b){
  if(p.status?.type==='freeze'){const n=p.status.freezeActions||0;const chance=n===0?0:n>=4?1:0.2;if(roll(b.rng)<chance){p.status=null;say(b,`${p.name}의 얼음이 풀렸다!`);}else{p.status.freezeActions=n+1;say(b,`${p.name}은(는) 꽁꽁 얼어있다!`);return false;}}
  if(p.status?.type==='sleep') {
    const n=p.status.sleepBlockedActions;
    if(p.status.fromRest){if(n<2){p.status.sleepBlockedActions=n+1;say(b,`${p.name}은(는) 잠들어 행동할 수 없다.`);return false;}p.status=null;say(b,`${p.name}이(가) 잠에서 깨어났다!`);return true;}
    if(n===0){p.status.sleepBlockedActions=1;say(b,`${p.name}은(는) 잠들어 행동할 수 없다.`);return false;}
    if(n===1&&roll(b.rng)>=RULES.sleepSecondActionWakeChance){p.status.sleepBlockedActions=2;say(b,`${p.name}은(는) 아직 자고 있다.`);return false;}
    if(n===2&&roll(b.rng)>=RULES.sleepThirdActionWakeChance){p.status.sleepBlockedActions=3;say(b,`${p.name}은(는) 아직 자고 있다.`);return false;}
    p.status=null;say(b,`${p.name}이(가) 잠에서 깨어났다!`);
  }
  if(p.status?.type==='paralysis'&&roll(b.rng)<RULES.paralysisSkipChance){say(b,`${p.name}은(는) 마비로 움직이지 못했다.`);return false;}
  if(p.confusionTurns>0){p.confusionTurns--;if(roll(b.rng)<0.33){const {damage}=damageRoll(p,p,{power:40},{rng:b.rng});p.hp=Math.max(0,p.hp-damage);say(b,`${p.name}은(는) 혼란으로 자신을 공격했다!`);emit(b,{type:'damage',side:sideOf(b,p),amount:damage,hp:p.hp,critical:false});if(!p.confusionTurns)say(b,`${p.name}은(는) 혼란에서 벗어났다!`);return false;}if(!p.confusionTurns)say(b,`${p.name}은(는) 혼란에서 벗어났다!`);}
  return true;
}
function restoreTransform(f){if(!f?.transformOriginal)return;const o=f.transformOriginal;f.stats={...o.stats};f.moveIds=[...o.moveIds];f.stages={...o.stages};f.transformOriginal=null;f.transformDex=null;}
function executeMove(b,user,target,moveId,fromSleepTalk=false){
  if(!isAlive(user))return;
  const struggle=moveId==='struggle';
  const move=struggle ? {name:'발버둥',power:RULES.strugglePower,accuracy:1,priority:0} : MOVES[moveId];
  if(!move)throw new Error('Invalid move');
  if(!struggle&&!user.moveIds.includes(moveId))throw new Error('Move not available');
  if(!fromSleepTalk&&!canAct(user,b))return;
  if(move.sleepTalk){if(user.status?.type!=='sleep'){say(b,'실패했다!');return;}const eligible=user.moveIds.filter(id=>MOVES[id]);if(!eligible.length){say(b,'실패했다!');return;}const selected=eligible[Math.floor(roll(b.rng)*eligible.length)];say(b,`${user.name}의 잠꼬대!`);if(selected==='sleepTalk'){say(b,'실패했다!');return;}executeMove(b,user,target,selected,true);return;}
  if(move.rest){if(user.status){say(b,'실패했다!');return;}user.hp=user.stats.hp;user.status={type:'sleep',sleepBlockedActions:0,fromRest:true};say(b,`${user.name}은(는) 잠자기로 HP를 모두 회복하고 잠들었다!`);emit(b,{type:'heal',side:sideOf(b,user),amount:0,hp:user.hp});return;}
  if(move.bellyDrum){const cost=Math.floor(user.stats.hp/2);if(user.hp<=cost||user.stages.attack>=RULES.stageLimit){say(b,'실패했다!');return;}user.hp-=cost;user.stages.attack=RULES.stageLimit;say(b,`${user.name}의 공격이 최대치까지 올랐다!`);emit(b,{type:'damage',side:sideOf(b,user),amount:cost,hp:user.hp,critical:false});return;}
  say(b,`${user.name}의 ${move.name}!`);
  if(!accuracySuccess(move,b,user,target)){say(b,'공격이 빗나갔다!');emit(b,{type:'miss',side:sideOf(b,target)});return;}
  if(move.inflict&&!move.power&&target.status){say(b,'실패했다!');return;}
  if(move.confuseTarget&&target.confusionTurns>0){say(b,'실패했다!');return;}
  emit(b,{type:'move',side:sideOf(b,user),name:move.name,moveId,isStatus:!move.power});
  if(move.transform){if(user.transformOriginal){say(b,'이미 변신한 상태다!');return;}user.transformOriginal={stats:{...user.stats},moveIds:[...user.moveIds],stages:{...user.stages}};user.stats={...target.stats,hp:user.stats.hp};user.moveIds=[...target.moveIds];user.stages={...target.stages};user.transformDex=Number(String(target.id).match(/(?:wild-|trainer-|companion-)(\d+)/)?.[1])||target.dex||null;say(b,`${user.name}이(가) ${target.name}의 모습과 기술을 복사했다!`);emit(b,{type:'transform',side:sideOf(b,user),dex:user.transformDex});return;}
  if(move.shieldTurns){b.shields[sideOf(b,user)]=move.shieldTurns;emit(b,{type:'fieldEffect',side:sideOf(b,user),effect:'lightScreen'});say(b,`${user.name}의 아군 진영에 빛의장막이 펼쳐졌다!`);}
  if(move.aquaRing){b.rings[sideOf(b,user)]=true;emit(b,{type:'fieldEffect',side:sideOf(b,user),effect:'aquaRing'});say(b,`${user.name}의 아군 진영에 아쿠아링이 생겼다!`);}
  if(move.boosts) {
    for(const [stat,n] of Object.entries(move.boosts)){
      const before=user.stages[stat];user.stages[stat]=clamp(before+n,-RULES.stageLimit,RULES.stageLimit);
      say(b,`${user.name}의 ${stat} 랭크: ${before} → ${user.stages[stat]}`);if(before!==user.stages[stat])emit(b,{type:'statChange',side:sideOf(b,user),stat,change:user.stages[stat]-before});
    }
  }
  if(move.healMaxHp){const gain=Math.min(user.stats.hp-user.hp,Math.floor(user.stats.hp*move.healMaxHp));user.hp+=gain;say(b,`${user.name} HP +${gain}`);emit(b,{type:'heal',side:sideOf(b,user),amount:gain,hp:user.hp});}
  if(move.requiresTargetSleep && target.status?.type!=='sleep'){say(b,'상대가 잠들어 있지 않아 실패했다!');return;}
  if(move.power||move.currentHpFraction||move.oneHitKo){
    const scaledPower=move.hpScale==='currentRatio'?150*user.hp/user.stats.hp:move.hpScale==='high'?85+50*user.hp/user.stats.hp:move.hpScale==='low'?85+50*(1-user.hp/user.stats.hp):move.power;
    if(move.multiHit){
      const hits=move.multiHit.min+Math.floor(roll(b.rng)*(move.multiHit.max-move.multiHit.min+1));let landed=0;
      for(let i=0;i<hits&&isAlive(target);i++){
        const {damage,critical}=damageRoll(user,target,{...move,power:Math.round(scaledPower)},{rng:b.rng});
        const actual=Math.min(target.hp,damage);target.hp=Math.max(0,target.hp-damage);landed++;
        if(i>0)emit(b,{type:'move',side:sideOf(b,user),name:move.name,multiHit:true});
        emit(b,{type:'damage',side:sideOf(b,target),amount:actual,hp:target.hp,critical});
        say(b,`${target.name}에게 ${actual} 피해${critical?' (급소!)':''}`);
      }
      say(b,`총 ${landed}회 명중!`);
    }else{
      const {damage,critical}=move.oneHitKo?{damage:target.hp,critical:false}:move.currentHpFraction?{damage:Math.max(1,Math.floor(target.hp*move.currentHpFraction)),critical:false}:damageRoll(user,target,{...move,power:Math.round(scaledPower)},{rng:b.rng});
    target.hp=Math.max(0,target.hp-damage);
    emit(b,{type:'damage',side:sideOf(b,target),amount:damage,hp:target.hp,critical});
    if(move.drain){const healed=Math.min(user.stats.hp-user.hp,Math.max(1,Math.floor(damage*move.drain)));user.hp+=healed;say(b,`${user.name} HP +${healed}`);emit(b,{type:'heal',side:sideOf(b,user),amount:healed,hp:user.hp});}
    say(b,`${target.name}에게 ${damage} 피해${critical?' (급소!)':''}`);
    }
  }
  if(move.boostOnHit&&roll(b.rng)<(move.boostChance??1)){for(const [stat,n] of Object.entries(move.boostOnHit)){const before=user.stages[stat]||0;user.stages[stat]=clamp(before+n,-RULES.stageLimit,RULES.stageLimit);if(before!==user.stages[stat])emit(b,{type:'statChange',side:sideOf(b,user),stat,change:user.stages[stat]-before});}say(b,`${user.name}의 능력치가 상승했다!`);}
  if(move.boostsOnHit){for(const [stat,n] of Object.entries(move.boostsOnHit)){const before=user.stages[stat];user.stages[stat]=clamp(before+n,-RULES.stageLimit,RULES.stageLimit);say(b,`${user.name}의 ${stat} 랭크가 올랐다!`);if(before!==user.stages[stat])emit(b,{type:'statChange',side:sideOf(b,user),stat,change:user.stages[stat]-before});}}
  if(move.lowerTargetDefense&&isAlive(target)){const before=target.stages.defense;target.stages.defense=clamp(before-move.lowerTargetDefense,-RULES.stageLimit,RULES.stageLimit);if(before!==target.stages.defense)emit(b,{type:'statChange',side:sideOf(b,target),stat:'defense',change:target.stages.defense-before});}
  if(move.boostOnKnockout&&!isAlive(target)){for(const [stat,n] of Object.entries(move.boostOnKnockout)){const before=user.stages[stat];user.stages[stat]=clamp(before+n,-RULES.stageLimit,RULES.stageLimit);if(before!==user.stages[stat])emit(b,{type:'statChange',side:sideOf(b,user),stat,change:user.stages[stat]-before});}}
  if(move.lowerTargetAccuracy&&isAlive(target)){const oldStage=target.stages.accuracy||0;target.stages.accuracy=clamp((target.stages.accuracy||0)-move.lowerTargetAccuracy,-RULES.stageLimit,RULES.stageLimit);if(target.stages.accuracy!==oldStage)emit(b,{type:'statChange',side:sideOf(b,target),stat:'accuracy',change:target.stages.accuracy-oldStage});say(b,`${target.name}의 명중률 랭크가 내려갔다!`);}
  if(move.lowerTargetAttackChance&&isAlive(target)&&roll(b.rng)<move.lowerTargetAttackChance){const oldStage=target.stages.attack||0;target.stages.attack=clamp(target.stages.attack-1,-RULES.stageLimit,RULES.stageLimit);if(target.stages.attack!==oldStage)emit(b,{type:'statChange',side:sideOf(b,target),stat:'attack',change:target.stages.attack-oldStage});say(b,`${target.name}의 공격 랭크가 내려갔다!`);}
  if(move.lowerTargetDefenseChance&&isAlive(target)&&roll(b.rng)<move.lowerTargetDefenseChance){const oldStage=target.stages.defense||0;target.stages.defense=clamp(target.stages.defense-1,-RULES.stageLimit,RULES.stageLimit);if(target.stages.defense!==oldStage)emit(b,{type:'statChange',side:sideOf(b,target),stat:'defense',change:target.stages.defense-oldStage});say(b,`${target.name}의 방어 랭크가 내려갔다!`);}
  if(move.lowerTargetSpeedChance&&isAlive(target)&&roll(b.rng)<move.lowerTargetSpeedChance){const oldStage=target.stages.speed||0;target.stages.speed=clamp(target.stages.speed-1,-RULES.stageLimit,RULES.stageLimit);if(target.stages.speed!==oldStage)emit(b,{type:'statChange',side:sideOf(b,target),stat:'speed',change:target.stages.speed-oldStage});say(b,`${target.name}의 스피드 랭크가 내려갔다!`);}
  if(move.confuseTarget)applyConfusion(target,b);
  if(move.confuseChance&&isAlive(target)&&target.confusionTurns<=0&&roll(b.rng)<move.confuseChance)applyConfusion(target,b);
  if(move.selfKo){user.hp=0;say(b,`${user.name}은(는) 모든 힘을 다 썼다!`);emit(b,{type:'damage',side:sideOf(b,user),amount:user.stats.hp,hp:0,critical:false,recoil:true});}
  if(move.inflict&&isAlive(target)&&!target.status&&roll(b.rng)<(move.inflictChance??1))afflict(target,move.inflict,b);
  if(move.recharge&&user.hp>0)user.recharge=true;
  if(move.lockedTurns&&!user.lockedMove)user.lockedMove={id:moveId,remaining:2+Math.floor(roll(b.rng)*2)};
  if(move.lockedTurns&&user.lockedMove){user.lockedMove.remaining--;if(user.lockedMove.remaining<=0){user.lockedMove=null;applyConfusion(user,b,1+Math.floor(roll(b.rng)*2));}}
  if(move.recoilMaxHp||struggle){
    const recoil=Math.max(1,Math.floor(user.stats.hp*(struggle?RULES.struggleRecoil:move.recoilMaxHp)));
    user.hp=Math.max(0,user.hp-recoil);say(b,`${user.name} 반동 피해 ${recoil}`);emit(b,{type:'damage',side:sideOf(b,user),amount:recoil,hp:user.hp,critical:false,recoil:true});
  }
}
function pickAction(p,requested){
  if(requested?.type==='revive') return {type:'revive',priority:6};
  if(requested?.type==='healAlly') return {type:'healAlly',priority:6};
  if(requested?.type==='switch') return {type:'switch',priority:Number.POSITIVE_INFINITY,fighter:requested.fighter};
  if(requested?.type==='item') return {type:'item',priority:6,power:requested.power};
  if(requested?.type==='ball') return {type:'ball',priority:7,multiplier:requested.multiplier,guaranteedCatch:requested.guaranteedCatch===true};
  const id=p.lockedMove?.id||requested?.moveId;
  if(id&&p.moveIds.includes(id))return {type:'move',moveId:id,priority:MOVES[id].priority??0};
  throw new Error('Illegal move selection');
}
export function poisonTick(b,p){
  if(!isAlive(p)||p.status?.type!=='poison')return;
  const dmg=Math.max(1,Math.floor(p.stats.hp*RULES.poisonFraction));
  p.hp=Math.max(0,p.hp-dmg);say(b,`${p.name}은(는) 독으로 ${dmg} 피해를 받았다.`);emit(b,{type:'damage',side:sideOf(b,p),amount:dmg,hp:p.hp,critical:false,poison:true});
}
function settle(b){
  const p=b.player,e=activeEnemy(b);
  if(!isAlive(p)){b.ended=true;b.result='defeat';say(b,'패배했다.');return;}
  if(!isAlive(e)){
    emit(b,{type:'knockout',side:'enemy',enemyIndex:b.enemyIndex});
    if(b.enemyIndex===b.enemies.length-1){b.ended=true;b.result='victory';say(b,'승리했다!');}
    else {b.enemyIndex++;say(b,`${activeEnemy(b).name} 등장!`);}
  }
}
/** Advance exactly one turn; returns new log entries, and mutates battle state. */
export function takeTurn(b,playerSelection,enemySelection=chooseEnemyMove(activeEnemy(b),{wild:b.wild,rng:b.rng,opponent:b.player})){
  if(b.ended)throw new Error('Battle is over');
  let p=b.player;const e=activeEnemy(b);
  const pAction=pickAction(p,playerSelection),eAction=pickAction(e,enemySelection);
  if(pAction.type==='switch'){
    restoreTransform(b.player);
    if(!pAction.fighter||pAction.fighter.hp<=0)throw new Error('Cannot switch to fainted Pokemon');
    p=pAction.fighter;b.player=p;
  }
  if(pAction.type==='item'&&(!(pAction.power>0)||p.hp>=p.stats.hp))throw new Error('Cannot use healing item now');
  if(pAction.type==='ball'&&!b.wild)throw new Error('Pokeballs can only be used in wild battles');
  const start=b.log.length;b.events=[];b.turn++;say(b,`── 턴 ${b.turn} ──`);for(const key of ['player','enemy'])if(b.shields[key]>0)b.shields[key]--;
  const order=[{fighter:p,target:e,action:pAction,player:true},{fighter:e,target:p,action:eAction,player:false}];
  order.sort((a,z)=>z.action.priority-a.action.priority||effectiveStat(z.fighter,'speed')-effectiveStat(a.fighter,'speed')||(roll(b.rng)<0.5?-1:1));
  for(const a of order){
    if(b.ended||!isAlive(a.fighter)||!isAlive(a.target))continue;
    if(a.fighter.recharge){a.fighter.recharge=false;say(b,`${a.fighter.name}은(는) 반동으로 이번 턴 움직일 수 없다!`);continue;}
    if(a.action.type==='revive'){
      say(b,'기력의조각을 사용했다!');emit(b,{type:'revive',side:'player'});
    }else if(a.action.type==='healAlly'){
      say(b,'동료에게 회복약을 사용했다!');
    }else if(a.action.type==='switch'){
      say(b,`${a.fighter.name}이(가) 출전했다!`);emit(b,{type:'switch',side:'player',name:a.fighter.name});
    }else if(a.action.type==='ball'){
      if(!a.player)continue;
      const hpFraction=Math.max(0,Math.min(1,e.hp/e.stats.hp));
      const speciesMultiplier=e.catchMultiplier??(e.rare?0.25:1);
      const chance=a.action.guaranteedCatch===true?1:Math.max(0,Math.min(1,((300-200*hpFraction)/300)*speciesMultiplier*(a.action.multiplier||1)));
      say(b,'몬스터볼을 던졌다!');
      if(roll(b.rng)<chance){
        b.ended=true;b.result='capture';say(b,e.name+' 포획 성공!');
        emit(b,{type:'capture',side:'enemy',success:true});
      }else{say(b,'앗! 포켓몬이 몬스터볼에서 빠져나왔다!');emit(b,{type:'capture',side:'enemy',success:false});}
    } else if(a.action.type==='item'){
      if(!canAct(a.fighter,b))continue;
      const healed=Math.min(a.fighter.stats.hp-a.fighter.hp,a.action.power);
      a.fighter.hp+=healed;say(b,`회복약 사용: HP +${healed}`);
      emit(b,{type:'heal',side:sideOf(b,a.fighter),amount:healed,hp:a.fighter.hp,item:true});
    } else {a.target.sideShieldTurns=b.shields[sideOf(b,a.target)];if(a.action.moveId==='sleepTalk'&&a.fighter.status?.type==='sleep'){const wasRest=!!a.fighter.status.fromRest;if(wasRest){const n=a.fighter.status.sleepBlockedActions;if(n>=2){a.fighter.status=null;say(b,`${a.fighter.name}이(가) 잠에서 깨어났다!`);}else a.fighter.status.sleepBlockedActions=n+1;}else{const n=a.fighter.status.sleepBlockedActions;const chance=n===0?0:n===1?RULES.sleepSecondActionWakeChance:n===2?RULES.sleepThirdActionWakeChance:1;if(roll(b.rng)<chance){a.fighter.status=null;say(b,`${a.fighter.name}이(가) 잠에서 깨어났다!`);}else a.fighter.status.sleepBlockedActions=n+1;}}executeMove(b,a.fighter,a.target,a.action.moveId,a.action.moveId==='sleepTalk');}
  }
  if(!b.ended){poisonTick(b,p);poisonTick(b,e);for(const fighter of [p,e]){if(fighter.hp>0&&fighter.status?.type==='burn'){const damage=Math.max(1,Math.floor(fighter.stats.hp*0.08));fighter.hp=Math.max(0,fighter.hp-damage);say(b,`${fighter.name}은(는) 화상으로 ${damage} 피해를 받았다.`);emit(b,{type:'damage',side:sideOf(b,fighter),amount:damage,hp:fighter.hp});}if(fighter.hp>0&&b.rings[sideOf(b,fighter)]){const heal=Math.min(fighter.stats.hp-fighter.hp,Math.max(1,Math.floor(fighter.stats.hp/16)));fighter.hp+=heal;emit(b,{type:'heal',side:sideOf(b,fighter),amount:heal,hp:fighter.hp});}}settle(b);}
  return b.log.slice(start);
}
