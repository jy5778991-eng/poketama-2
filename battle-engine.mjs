/** Poketama 2.0: dependency-free deterministic turn engine (ES module).
 * Draft rules v1.0. UI and storage are deliberately excluded.
 */
export const RULES = Object.freeze({
  stageLimit: 2, criticalMultiplier: 1.5, randomMin: 0.85,
  poisonFraction: 0.10, paralysisSpeed: 0.5, paralysisSkipChance: 0.25,
  sleepSecondActionWakeChance: 0.5, strugglePower: 50, struggleRecoil: 0.25,
});
export const MOVES = Object.freeze({
  lick: {name:"핥기", accuracy:1.0, priority:0, power:30, pp:30},
  crunch: {name:"깨물어부수기", accuracy:1.0, priority:0, power:80, pp:15},
  gigaImpact: {name:"기가임팩트", accuracy:0.9, priority:0, power:150, pp:5, recharge:true},
  bite: {name:"물기", accuracy:1.0, priority:0, power:60, pp:25},
  hydroPump: {name:"하이드로펌프", accuracy:0.8, priority:0, power:110, pp:5},
  spite: {name:"원한", accuracy:1.0, priority:0, pp:10, reduceTargetPp:3},
  suckerPunch: {name:"기습", accuracy:1.0, priority:1, power:70, pp:5},
  sludgeBomb: {name:"오물폭탄", accuracy:1.0, priority:0, power:90, pp:10},
  wrap: {name:"김밥말이", accuracy:0.9, priority:0, power:15, pp:20},
  dragonBreath: {name:"용의숨결", accuracy:1.0, priority:0, power:60, pp:20, inflict:"paralysis", inflictChance:0.3},
  outrage: {name:"역린", accuracy:1.0, priority:0, power:120, pp:10},
  vineWhip: {name:"덩굴채찍", accuracy:1.0, priority:0, power:45, pp:25},
  razorLeaf: {name:"잎날가르기", accuracy:0.95, priority:0, power:55, pp:25},
  synthesis: {name:"광합성", accuracy:1.0, priority:0, pp:5, healMaxHp:0.5, target:"self"},
  scratch: {name:"할퀴기", accuracy:1.0, priority:0, power:40, pp:35},
  ember: {name:"불꽃세례", accuracy:1.0, priority:0, power:40, pp:25},
  fireFang: {name:"화염엄니", accuracy:0.95, priority:0, power:65, pp:15},
  airSlash: {name:"에어슬래시", accuracy:0.95, priority:0, power:75, pp:15},
  waterGun: {name:"물대포", accuracy:1.0, priority:0, power:40, pp:25},
  waterPulse: {name:"물의파동", accuracy:1.0, priority:0, power:60, pp:20},
  ironDefense: {name:"철벽", accuracy:1.0, priority:0, pp:5, boosts:{defense:2}, target:"self"},
  thunderShock: {name:"전기쇼크", accuracy:1.0, priority:0, power:40, pp:30},
  spark: {name:"스파크", accuracy:1.0, priority:0, power:65, pp:20},
  lightScreen: {name:"빛의장막", accuracy:1.0, priority:0, pp:10, boosts:{defense:1}, target:"self"},
  confusion: {name:"염동력", accuracy:1.0, priority:0, power:50, pp:25},
  quiverDance: {name:"나비춤", accuracy:1.0, priority:0, pp:5, boosts:{attack:1,defense:1,speed:1}, target:"self"},
  gigaDrain: {name:"기가드레인", accuracy:1.0, priority:0, power:75, pp:10, drain:0.5},
  tackle: {name:'몸통박치기',power:40,accuracy:1,pp:35,priority:0},
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
const emit=(battle,event)=>battle.events.push(event);
const sideOf=(battle,p)=>p===battle.player?'player':'enemy';
const stageMultiplier=(stage)=>stage>=0 ? (2+stage)/2 : 2/(2-stage);
const effectiveStat=(p, stat)=>Math.max(1,Math.floor(p.stats[stat]*stageMultiplier(p.stages[stat])*(stat==='speed'&&p.status?.type==='paralysis'?RULES.paralysisSpeed:1)));
export function calculateStats(base,level,iv={},ev={}) {
  if(!Number.isInteger(level)||level<1||level>100) throw new Error('Invalid level');
  const stats={};
  for(const stat of ['hp','attack','defense','speed']) {
    const i=iv[stat]??0, e=ev[stat]??0;
    if(!Number.isInteger(i)||i<0||i>16||!Number.isInteger(e)||e<0||e>80) throw new Error('Invalid IV/EV');
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
export function createBattle(player,enemies,{items=0,balls=0,wild=false,rng=Math.random}={}) {
  if(!enemies.length) throw new Error('Need enemies');
  return {player, enemies,enemyIndex:0,items,balls,wild,turn:0,ended:false,result:null,log:[],events:[],rng};
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
  emit(b,{type:'move',side:sideOf(b,user),name:move.name});
  if(!accuracySuccess(move,b)){say(b,'공격이 빗나갔다!');emit(b,{type:'miss',side:sideOf(b,target)});return;}
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
  if(move.reduceTargetPp){const id=target.moveIds.find(id=>target.pp[id]>0);if(id){const lost=Math.min(target.pp[id],move.reduceTargetPp);target.pp[id]-=lost;say(b,`${target.name}의 ${MOVES[id].name} PP -${lost}`);}}
  if(move.inflict&&isAlive(target)&&roll(b.rng)<(move.inflictChance??1))afflict(target,move.inflict,b);
  if(move.recharge&&user.hp>0)user.recharge=true;
  if(move.recoilMaxHp||struggle){
    const recoil=Math.max(1,Math.floor(user.stats.hp*(struggle?RULES.struggleRecoil:move.recoilMaxHp)));
    user.hp=Math.max(0,user.hp-recoil);say(b,`${user.name} 반동 피해 ${recoil}`);emit(b,{type:'damage',side:sideOf(b,user),amount:recoil,hp:user.hp,critical:false,recoil:true});
  }
}
function pickAction(p,requested){
  if(requested?.type==='item') return {type:'item',priority:6,power:requested.power};
  if(requested?.type==='ball') return {type:'ball',priority:7,multiplier:requested.multiplier};
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
export function takeTurn(b,playerSelection,enemySelection=simpleAi(activeEnemy(b))){
  if(b.ended)throw new Error('Battle is over');
  const p=b.player,e=activeEnemy(b);
  const pAction=pickAction(p,playerSelection),eAction=pickAction(e,enemySelection);
  if(pAction.type==='item'&&(!(pAction.power>0)||p.hp>=p.stats.hp))throw new Error('Cannot use healing item now');
  if(pAction.type==='ball'&&!b.wild)throw new Error('Pokeballs can only be used in wild battles');
  const start=b.log.length;b.events=[];b.turn++;say(b,`── 턴 ${b.turn} ──`);
  const order=[{fighter:p,target:e,action:pAction,player:true},{fighter:e,target:p,action:eAction,player:false}];
  order.sort((a,z)=>z.action.priority-a.action.priority||effectiveStat(z.fighter,'speed')-effectiveStat(a.fighter,'speed')||(roll(b.rng)<0.5?-1:1));
  for(const a of order){
    if(b.ended||!isAlive(a.fighter)||!isAlive(a.target))continue;
    if(a.fighter.recharge){a.fighter.recharge=false;say(b,`${a.fighter.name}은(는) 반동으로 이번 턴 움직일 수 없다!`);continue;}
    if(a.action.type==='ball'){
      if(!a.player)continue;
      const hpFraction=Math.max(0,Math.min(1,e.hp/e.stats.hp));
      const speciesMultiplier=e.catchMultiplier??(e.rare?0.25:1);
      const chance=Math.max(0,Math.min(1,((300-200*hpFraction)/300)*speciesMultiplier*(a.action.multiplier||1)));
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
