/** Poketama 2.0: dependency-free deterministic turn engine (ES module).
 * Draft rules v1.0. UI and storage are deliberately excluded.
 */
export const RULES = Object.freeze({
  stageLimit: 2, criticalMultiplier: 1.5, randomMin: 0.85,
  poisonFraction: 0.10, paralysisSpeed: 0.5, paralysisSkipChance: 0.25,
  sleepSecondActionWakeChance: 0.5, strugglePower: 50, struggleRecoil: 0.25,
});
export const MOVES = Object.freeze({
  flamethrower: {name:'화염방사', power:95, accuracy:1, pp:15, priority:0},
  bodySlam: {name:'누르기', power:95, accuracy:1, pp:15, priority:0},
  flail: {name:'바둥바둥', power:85, accuracy:1, pp:5, priority:0, hpScale:'low'},
  rest: {name:'잠자기(시험용 회복)', accuracy:1, pp:2, priority:0, healMaxHp:0.4, target:'self'},
  dragonPulse: {name:'용의파동', power:100, accuracy:1, pp:10, priority:0},
  extremeSpeed: {name:'신속', power:90, accuracy:1, pp:5, priority:2},
  energyBall: {name:'에너지볼', power:100, accuracy:1, pp:10, priority:0},
  solarBeam: {name:'솔라빔', power:150, accuracy:0.75, pp:5, priority:0},
  surf: {name:'파도타기', power:100, accuracy:1, pp:10, priority:0},
  waterSpout: {name:'하이드로스파우팅', power:135, accuracy:1, pp:5, priority:0, hpScale:'high'},
  psybeam: {name:'사이케광선', power:85, accuracy:1, pp:15, priority:0},
  harden: {name:'단단해지기', accuracy:1, pp:5, priority:0, boosts:{defense:1},target:'self'},
  shadowBall: {name:'섀도볼', power:90, accuracy:1, pp:15, priority:0},
  dreamEater: {name:'꿈먹기', power:120, accuracy:1, pp:5, priority:0, requiresTargetSleep:true, drain:0.5},

  thunderbolt: {name:'10만볼트', power:95, accuracy:1, pp:15, priority:0},
  voltTackle: {name:'볼트태클', power:120, accuracy:1, pp:5, priority:0, recoilMaxHp:0.10, critMultiplier:3},
  quickAttack: {name:'전광석화', power:40, accuracy:1, pp:20, priority:1},
  thunderWave: {name:'전기자석파', accuracy:0.9, pp:10, priority:0, inflict:'paralysis'},
  flareBlitz: {name:'플레어드라이브', power:110, accuracy:1, pp:5, priority:0, recoilMaxHp:0.10, critMultiplier:2},
  hypnosis: {name:'최면술', accuracy:0.7, pp:5, priority:0, inflict:'sleep'},
  poisonPowder: {name:'독가루', accuracy:1, pp:5, priority:0, inflict:'poison'},
  dragonDance: {name:'용의춤', accuracy:1, pp:2, priority:0, boosts:{attack:1,speed:1}, target:'self'},
  recover: {name:'회복', accuracy:1, pp:5, priority:0, healMaxHp:0.4, target:'self'},
  swift: {name:'스피드스타', power:70, accuracy:1, pp:20, priority:0},
});
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const roll=(rng)=>clamp(rng(),0,1-Number.EPSILON);
const isAlive=(p)=>p.hp>0;
const say=(battle,msg)=>battle.log.push(msg);
const stageMultiplier=(stage)=>stage>=0 ? (2+stage)/2 : 2/(2-stage);
const effectiveStat=(p, stat)=>Math.max(1,Math.floor(p.stats[stat]*stageMultiplier(p.stages[stat])*(stat==='speed'&&p.status?.type==='paralysis'?RULES.paralysisSpeed:1)));
export function calculateStats(base,level,iv={},ev={}) {
  if(!Number.isInteger(level)||level<1||level>100) throw new Error('Invalid level');
  const stats={};
  for(const stat of ['hp','attack','defense','speed']) {
    const i=iv[stat]??0, e=ev[stat]??0;
    if(!Number.isInteger(i)||i<0||i>12||!Number.isInteger(e)||e<0||e>80) throw new Error('Invalid IV/EV');
    const baseValue=2*base[stat]+i+Math.floor(e/4);
    stats[stat]=Math.floor(baseValue*level/100)+(stat==='hp'?level+10:5);
  }
  if(Object.values(ev).reduce((a,b)=>a+b,0)>172) throw new Error('EV total exceeds 172');
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
export function createBattle(player,enemies,{items=0,rng=Math.random}={}) {
  if(!enemies.length) throw new Error('Need enemies');
  return {player, enemies,enemyIndex:0,items,turn:0,ended:false,result:null,log:[],rng};
}
function activeEnemy(b){return b.enemies[b.enemyIndex];}
function accuracySuccess(move,b){return roll(b.rng)<(move.accuracy??1);}
function critRate(p){return 0.06+0.0008*p.friendship;} // draft curve: 14% at friendship 100
export function damageRoll(attacker,defender,move,{rng=Math.random}={}) {
  const atk=effectiveStat(attacker,'attack'), def=effectiveStat(defender,'defense');
  const levelFactor=Math.floor(2*attacker.level/5)+2;
  const raw=Math.floor(levelFactor*move.power*atk/Math.max(1,def)/50)+2;
  const critical=roll(rng)<Math.min(1,critRate(attacker)*(move.critMultiplier??1));
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
  if(!accuracySuccess(move,b)){say(b,'공격이 빗나갔다!');return;}
  if(move.boosts) {
    for(const [stat,n] of Object.entries(move.boosts)){
      const before=user.stages[stat];user.stages[stat]=clamp(before+n,-RULES.stageLimit,RULES.stageLimit);
      say(b,`${user.name}의 ${stat} 랭크: ${before} → ${user.stages[stat]}`);
    }
  }
  if(move.healMaxHp){const gain=Math.min(user.stats.hp-user.hp,Math.floor(user.stats.hp*move.healMaxHp));user.hp+=gain;say(b,`${user.name} HP +${gain}`);}
  if(move.requiresTargetSleep && target.status?.type!=='sleep'){say(b,'상대가 잠들어 있지 않아 실패했다!');return;}
  if(move.power){
    const scaledPower=move.hpScale==='high'?85+50*user.hp/user.stats.hp:move.hpScale==='low'?85+50*(1-user.hp/user.stats.hp):move.power;
    const {damage,critical}=damageRoll(user,target,{...move,power:Math.round(scaledPower)},{rng:b.rng});
    target.hp=Math.max(0,target.hp-damage);
    if(move.drain){const healed=Math.min(user.stats.hp-user.hp,Math.max(1,Math.floor(damage*move.drain)));user.hp+=healed;say(b,`${user.name} HP +${healed}`);}
    say(b,`${target.name}에게 ${damage} 피해${critical?' (급소!)':''}`);
  }
  if(move.inflict&&isAlive(target))afflict(target,move.inflict,b);
  if(move.recoilMaxHp||struggle){
    const recoil=Math.max(1,Math.floor(user.stats.hp*(struggle?RULES.struggleRecoil:move.recoilMaxHp)));
    user.hp=Math.max(0,user.hp-recoil);say(b,`${user.name} 반동 피해 ${recoil}`);
  }
}
function pickAction(p,requested){
  if(requested?.type==='item') return {type:'item',priority:6};
  const id=requested?.moveId;
  if(id&&p.moveIds.includes(id)&&p.pp[id]>0)return {type:'move',moveId:id,priority:MOVES[id].priority??0};
  if(p.moveIds.every(x=>p.pp[x]===0))return {type:'move',moveId:'struggle',priority:0};
  throw new Error('Illegal move selection');
}
export function simpleAi(enemy){
  const usable=enemy.moveIds.filter(id=>enemy.pp[id]>0);
  if(!usable.length)return {moveId:'struggle'};
  const id=[...usable].sort((a,b)=>(MOVES[b].power??0)-(MOVES[a].power??0))[0];
  return {moveId:id};
}
function poisonTick(b,p){
  if(!isAlive(p)||p.status?.type!=='poison')return;
  const dmg=Math.max(1,Math.floor(p.stats.hp*RULES.poisonFraction));
  p.hp=Math.max(0,p.hp-dmg);say(b,`${p.name}은(는) 독으로 ${dmg} 피해를 받았다.`);
}
function settle(b){
  const p=b.player,e=activeEnemy(b);
  if(!isAlive(p)){b.ended=true;b.result='defeat';say(b,'패배했다.');return;}
  if(!isAlive(e)){
    if(b.enemyIndex===b.enemies.length-1){b.ended=true;b.result='victory';say(b,'승리했다!');}
    else {b.enemyIndex++;say(b,`${activeEnemy(b).name} 등장!`);}
  }
}
/** Advance exactly one turn; returns new log entries, and mutates battle state. */
export function takeTurn(b,playerSelection,enemySelection=simpleAi(activeEnemy(b))){
  if(b.ended)throw new Error('Battle is over');
  const p=b.player,e=activeEnemy(b);
  const pAction=pickAction(p,playerSelection),eAction=pickAction(e,enemySelection);
  if(pAction.type==='item'&&b.items<=0)throw new Error('No items left');
  const start=b.log.length;b.turn++;say(b,`── 턴 ${b.turn} ──`);
  const order=[{fighter:p,target:e,action:pAction,player:true},{fighter:e,target:p,action:eAction,player:false}];
  order.sort((a,z)=>z.action.priority-a.action.priority||effectiveStat(z.fighter,'speed')-effectiveStat(a.fighter,'speed')||(roll(b.rng)<0.5?-1:1));
  for(const a of order){
    if(!isAlive(a.fighter)||!isAlive(a.target))continue;
    if(a.action.type==='item'){
      if(!canAct(a.fighter,b))continue;
      b.items--;
      const healed=Math.min(a.fighter.stats.hp-a.fighter.hp,100);
      a.fighter.hp+=healed;say(b,`회복약 사용: HP +${healed}`);
    } else executeMove(b,a.fighter,a.target,a.action.moveId);
  }
  poisonTick(b,p);poisonTick(b,e);
  settle(b);
  return b.log.slice(start);
}
