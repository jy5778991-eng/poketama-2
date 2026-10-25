/** Poketama 2.0: dependency-free deterministic turn engine (ES module).
 * Draft rules v1.0. UI and storage are deliberately excluded.
 */
export const RULES = Object.freeze({
  stageLimit: 2, criticalMultiplier: 1.5, randomMin: 0.85,
  poisonFraction: 0.10, paralysisSpeed: 0.5, paralysisSkipChance: 0.25,
  sleepSecondActionWakeChance: 0.5, strugglePower: 50, struggleRecoil: 0.25,
});
import {MOVES} from './js/data/moves.js';
import {chooseEnemyMove} from './js/battle-ai.js';
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
    moveIds:[...moveIds],pp:Object.fromEntries(moveIds.map(id=>[id,MOVES[id].pp])),
    stages:{attack:0,defense:0,speed:0},status:null};
}
export function createBattle(player,enemies,{items=0,balls=0,wild=false,rng=Math.random}={}) {
  if(!enemies.length) throw new Error('Need enemies');
  return {player, enemies,enemyIndex:0,items,balls,wild,turn:0,ended:false,result:null,log:[],events:[],rng};
}
function activeEnemy(b){return b.enemies[b.enemyIndex];}
function accuracySuccess(move,b,user){return roll(b.rng)<Math.min(1,(move.accuracy??1)+(user.accuracyBuff||0));}
function critRate(p){return 0.06+0.0008*p.friendship;} // draft curve: 14% at friendship 100
export function damageRoll(attacker,defender,move,{rng=Math.random}={}) {
  const atk=effectiveStat(attacker,'attack'), def=effectiveStat(defender,'defense')*(defender.defenseBuffMultiplier||1);
  const levelFactor=Math.floor(2*attacker.level/5)+2;
  const raw=Math.floor(levelFactor*move.power*atk*(attacker.attackBuffMultiplier||1)/Math.max(1,def)/50)+2;
  const critical=roll(rng)<Math.min(1,critRate(attacker)*(move.critMultiplier??1)+(attacker.critBuff||0));
  const variance=RULES.randomMin+(1-RULES.randomMin)*roll(rng);
  return {damage:Math.max(1,Math.floor(raw*(critical?RULES.criticalMultiplier:1)*variance)),critical};
}
function afflict(target,type,b){
  if(target.status) {say(b,`${target.name}에게는 이미 상태이상이 있다.`);return false;}
  target.status={type, sleepBlockedActions:0};
  say(b,`${target.name}: ${type==='sleep'?'수면':type==='poison'?'독':'마비'} 상태!`);
  return true;
}
function canAct(p,b){
  if(p.status?.type==='sleep') {
    const n=p.status.sleepBlockedActions;
    if(n===0){p.status.sleepBlockedActions=1;say(b,`${p.name}은(는) 잠들어 행동할 수 없다.`);return false;}
    if(n===1&&roll(b.rng)>=RULES.sleepSecondActionWakeChance){p.status.sleepBlockedActions=2;say(b,`${p.name}은(는) 아직 자고 있다.`);return false;}
    p.status=null;say(b,`${p.name}이(가) 잠에서 깨어났다!`);
  }
  if(p.status?.type==='paralysis'&&roll(b.rng)<RULES.paralysisSkipChance){say(b,`${p.name}은(는) 마비로 움직이지 못했다.`);return false;}
  return true;
}
function executeMove(b,user,target,moveId){
  if(!isAlive(user))return;
  const struggle=moveId==='struggle';
  const move=struggle ? {name:'발버둥',power:RULES.strugglePower,accuracy:1,priority:0} : MOVES[moveId];
  if(!move)throw new Error('Invalid move');
  if(!struggle&&(!user.moveIds.includes(moveId)||user.pp[moveId]<=0))throw new Error('Move not available');
  if(!canAct(user,b))return;
  if(!struggle)user.pp[moveId]--;
  say(b,`${user.name}의 ${move.name}!`);
  emit(b,{type:'move',side:sideOf(b,user),name:move.name});
  if(!accuracySuccess(move,b,user)){say(b,'공격이 빗나갔다!');emit(b,{type:'miss',side:sideOf(b,target)});return;}
  if(move.boosts) {
    for(const [stat,n] of Object.entries(move.boosts)){
      const before=user.stages[stat];user.stages[stat]=clamp(before+n,-RULES.stageLimit,RULES.stageLimit);
      say(b,`${user.name}의 ${stat} 랭크: ${before} → ${user.stages[stat]}`);
    }
  }
  if(move.healMaxHp){const gain=Math.min(user.stats.hp-user.hp,Math.floor(user.stats.hp*move.healMaxHp));user.hp+=gain;say(b,`${user.name} HP +${gain}`);emit(b,{type:'heal',side:sideOf(b,user),amount:gain,hp:user.hp});}
  if(move.requiresTargetSleep && target.status?.type!=='sleep'){say(b,'상대가 잠들어 있지 않아 실패했다!');return;}
  if(move.power){
    const scaledPower=move.hpScale==='high'?85+50*user.hp/user.stats.hp:move.hpScale==='low'?85+50*(1-user.hp/user.stats.hp):move.power;
    const {damage,critical}=damageRoll(user,target,{...move,power:Math.round(scaledPower)},{rng:b.rng});
    target.hp=Math.max(0,target.hp-damage);
    emit(b,{type:'damage',side:sideOf(b,target),amount:damage,hp:target.hp,critical});
    if(move.drain){const healed=Math.min(user.stats.hp-user.hp,Math.max(1,Math.floor(damage*move.drain)));user.hp+=healed;say(b,`${user.name} HP +${healed}`);emit(b,{type:'heal',side:sideOf(b,user),amount:healed,hp:user.hp});}
    say(b,`${target.name}에게 ${damage} 피해${critical?' (급소!)':''}`);
  }
  if(move.selfKo){user.hp=0;say(b,`${user.name}은(는) 모든 힘을 다 썼다!`);emit(b,{type:'damage',side:sideOf(b,user),amount:user.stats.hp,hp:0,critical:false,recoil:true});}
  if(move.reduceTargetPp){const id=target.moveIds.find(id=>target.pp[id]>0);if(id){const lost=Math.min(target.pp[id],move.reduceTargetPp);target.pp[id]-=lost;say(b,`${target.name}의 ${MOVES[id].name} PP -${lost}`);}}
  if(move.inflict&&isAlive(target)&&roll(b.rng)<(move.inflictChance??1))afflict(target,move.inflict,b);
  if(move.recharge&&user.hp>0)user.recharge=true;
  if(move.recoilMaxHp||struggle){
    const recoil=Math.max(1,Math.floor(user.stats.hp*(struggle?RULES.struggleRecoil:move.recoilMaxHp)));
    user.hp=Math.max(0,user.hp-recoil);say(b,`${user.name} 반동 피해 ${recoil}`);emit(b,{type:'damage',side:sideOf(b,user),amount:recoil,hp:user.hp,critical:false,recoil:true});
  }
}
function pickAction(p,requested){
  if(requested?.type==='switch') return {type:'switch',priority:7,fighter:requested.fighter};
  if(requested?.type==='item') return {type:'item',priority:6,power:requested.power};
  if(requested?.type==='ball') return {type:'ball',priority:7,multiplier:requested.multiplier,guaranteedCatch:requested.guaranteedCatch===true};
  const id=requested?.moveId;
  if(id&&p.moveIds.includes(id)&&p.pp[id]>0)return {type:'move',moveId:id,priority:MOVES[id].priority??0};
  if(p.moveIds.every(x=>p.pp[x]===0))return {type:'move',moveId:'struggle',priority:0};
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
    if(!pAction.fighter||pAction.fighter.hp<=0)throw new Error('Cannot switch to fainted Pokemon');
    p=pAction.fighter;b.player=p;
  }
  if(pAction.type==='item'&&(!(pAction.power>0)||p.hp>=p.stats.hp))throw new Error('Cannot use healing item now');
  if(pAction.type==='ball'&&!b.wild)throw new Error('Pokeballs can only be used in wild battles');
  const start=b.log.length;b.events=[];b.turn++;say(b,`── 턴 ${b.turn} ──`);
  const order=[{fighter:p,target:e,action:pAction,player:true},{fighter:e,target:p,action:eAction,player:false}];
  order.sort((a,z)=>z.action.priority-a.action.priority||effectiveStat(z.fighter,'speed')-effectiveStat(a.fighter,'speed')||(roll(b.rng)<0.5?-1:1));
  for(const a of order){
    if(b.ended||!isAlive(a.fighter)||!isAlive(a.target))continue;
    if(a.fighter.recharge){a.fighter.recharge=false;say(b,`${a.fighter.name}은(는) 반동으로 이번 턴 움직일 수 없다!`);continue;}
    if(a.action.type==='switch'){
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
    } else executeMove(b,a.fighter,a.target,a.action.moveId);
  }
  if(!b.ended){poisonTick(b,p);poisonTick(b,e);settle(b);}
  return b.log.slice(start);
}
