import {calculateStats,createFighter,createBattle,takeTurn,MOVES} from './battle-engine.mjs';
const $=id=>document.getElementById(id);
const STARTERS=[
{id:'snorlax',name:'먹고자',form:'잠만보',dex:143,baby:446,base:{hp:160,attack:110,defense:88,speed:30},moves:['bodySlam','flail','rest','swift'],emoji:'💤'},
{id:'dragonite',name:'미뇽',form:'망나뇽',dex:149,baby:147,base:{hp:91,attack:134,defense:98,speed:80},moves:['dragonPulse','extremeSpeed','quickAttack','swift'],emoji:'🐉'},
{id:'venusaur',name:'이상해씨',form:'이상해꽃',dex:3,baby:1,base:{hp:80,attack:100,defense:92,speed:80},moves:['energyBall','solarBeam','recover','swift'],emoji:'🌿'},
{id:'charizard',name:'파이리',form:'리자몽',dex:6,baby:4,base:{hp:78,attack:109,defense:82,speed:100},moves:['flamethrower','flareBlitz','swift','quickAttack'],emoji:'🔥'},
{id:'blastoise',name:'꼬부기',form:'거북왕',dex:9,baby:7,base:{hp:79,attack:85,defense:103,speed:78},moves:['surf','waterSpout','swift','recover'],emoji:'💧'},
{id:'raichu',name:'피츄',form:'라이츄',dex:26,baby:172,base:{hp:60,attack:90,defense:68,speed:110},moves:['thunderbolt','voltTackle','quickAttack','thunderWave'],emoji:'⚡'},
{id:'butterfree',name:'캐터피',form:'버터플',dex:12,baby:10,base:{hp:60,attack:90,defense:65,speed:70},moves:['psybeam','poisonPowder','harden','swift'],emoji:'🦋'},
{id:'gengar',name:'고오스',form:'팬텀',dex:94,baby:92,base:{hp:60,attack:130,defense:68,speed:110},moves:['shadowBall','hypnosis','dreamEater','swift'],emoji:'👻'},
{id:'gyarados',name:'잉어킹',form:'갸라도스',dex:130,baby:129,base:{hp:95,attack:125,defense:90,speed:81},moves:['surf','dragonDance','bodySlam','swift'],emoji:'🐟'}
];
const base='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/';
const staticImage=(id,back=false)=>base+(back?'back/':'')+id+'.png';
const animatedImage=(id,back=false)=>base+'animated/'+(back?'back/':'')+id+'.gif';
const SHOP_ITEMS=[{"id":"pokeBall","name":"몬스터볼","price":200,"icon":"🔴","description":"기본 포획률","category":"ball","power":0,"multiplier":1},{"id":"greatBall","name":"슈퍼볼","price":500,"icon":"🔵","description":"포획률 ×1.5","category":"ball","power":0,"multiplier":1.5},{"id":"ultraBall","name":"하이퍼볼","price":1000,"icon":"🟡","description":"포획률 ×2","category":"ball","power":0,"multiplier":2},{"id":"potion","name":"상처약","price":150,"icon":"🧪","description":"HP 20 회복","category":"heal","power":20,"multiplier":1},{"id":"superPotion","name":"좋은상처약","price":400,"icon":"💊","description":"HP 60 회복","category":"heal","power":60,"multiplier":1},{"id":"hyperPotion","name":"고급상처약","price":900,"icon":"💉","description":"HP 200 회복","category":"heal","power":200,"multiplier":1}];
const SAVE_KEY='poketama-2-progress-v2'; // Lv.1 + money: separate from the older Lv.5 preview save
// Stage 1/2 encounters: weights total 100 in each stage. 1% species have half catch rate.
const ENCOUNTERS={
 grass: [{"name":"구구","dex":16,"weight":26,"rare":false,"base":{"hp":40,"attack":45,"defense":38,"speed":56}},{"name":"꼬렛","dex":19,"weight":24,"rare":false,"base":{"hp":30,"attack":56,"defense":35,"speed":72}},{"name":"깨비참","dex":21,"weight":20,"rare":false,"base":{"hp":40,"attack":60,"defense":31,"speed":70}},{"name":"니드런♀","dex":29,"weight":14,"rare":false,"base":{"hp":55,"attack":47,"defense":46,"speed":41}},{"name":"니드런♂","dex":32,"weight":15,"rare":false,"base":{"hp":46,"attack":57,"defense":40,"speed":50}},{"name":"이브이","dex":133,"weight":1,"rare":true,"base":{"hp":55,"attack":55,"defense":58,"speed":55}}],
 forest: [{"name":"뿔충이","dex":13,"weight":35,"rare":false,"base":{"hp":40,"attack":35,"defense":25,"speed":50}},{"name":"딱충이","dex":14,"weight":20,"rare":false,"base":{"hp":45,"attack":25,"defense":38,"speed":35}},{"name":"뚜벅쵸","dex":43,"weight":18,"rare":false,"base":{"hp":45,"attack":75,"defense":60,"speed":30}},{"name":"모다피","dex":69,"weight":17,"rare":false,"base":{"hp":50,"attack":75,"defense":33,"speed":40}},{"name":"파라스","dex":46,"weight":9,"rare":false,"base":{"hp":35,"attack":70,"defense":55,"speed":25}},{"name":"독침붕","dex":15,"weight":1,"rare":true,"base":{"hp":65,"attack":90,"defense":60,"speed":75}}],
};
const pickEncounter=area=>{const entries=ENCOUNTERS[area],roll=Math.random()*100;let total=0;return entries.find(e=>(total+=e.weight)>roll)||entries.at(-1);};
const RIVAL_POOL=STARTERS.filter(s=>s.id!=='butterfree'); // One opponent family, saved permanently
// Future character asset: female Blue. Preserve separately; not used for the Lv.7 rival.
const FUTURE_BLUE_TRAINER_IMAGE='https://play.pokemonshowdown.com/sprites/trainers/leaf.png';
const TRAINERS={
 // Keep 'blue' as the internal save-data key for backward compatibility; displayed rival is Green.
 blue:{name:'라이벌 그린',level:7,money:300,stageAfter:'forest',image:'./assets/trainers/green.webp'},
 brock:{name:'웅',level:13,money:500,stageAfter:'cave',image:'https://play.pokemonshowdown.com/sprites/trainers/brock.png'}
};
const START_BASES={
 snorlax:{hp:135,attack:85,defense:63,speed:5},
 dragonite:{hp:41,attack:64,defense:48,speed:50},
 venusaur:{hp:45,attack:65,defense:57,speed:45},
 charizard:{hp:39,attack:60,defense:47,speed:65},
 blastoise:{hp:44,attack:50,defense:65,speed:43},
 raichu:{hp:20,attack:40,defense:25,speed:60},
 butterfree:{hp:45,attack:30,defense:28,speed:45},
 gengar:{hp:30,attack:100,defense:33,speed:80},
 gyarados:{hp:20,attack:10,defense:38,speed:80}
};
/* Each threshold produces an immediate, unskippable evolution. IV/EV, EXP and level persist. */
const EVOLUTIONS={
 snorlax:[{level:1,name:'먹고자',dex:446,base:START_BASES.snorlax},{level:40,name:'잠만보',dex:143,base:{hp:160,attack:110,defense:88,speed:30}}],
 dragonite:[{level:1,name:'미뇽',dex:147,base:START_BASES.dragonite},{level:30,name:'신뇽',dex:148,base:{hp:61,attack:84,defense:68,speed:70}},{level:55,name:'망나뇽',dex:149,base:{hp:91,attack:134,defense:98,speed:80}}],
 venusaur:[{level:1,name:'이상해씨',dex:1,base:START_BASES.venusaur},{level:16,name:'이상해풀',dex:2,base:{hp:60,attack:80,defense:72,speed:60}},{level:32,name:'이상해꽃',dex:3,base:{hp:80,attack:100,defense:92,speed:80}}],
 charizard:[{level:1,name:'파이리',dex:4,base:START_BASES.charizard},{level:16,name:'리자드',dex:5,base:{hp:58,attack:80,defense:62,speed:80}},{level:36,name:'리자몽',dex:6,base:{hp:78,attack:109,defense:82,speed:100}}],
 blastoise:[{level:1,name:'꼬부기',dex:7,base:START_BASES.blastoise},{level:16,name:'어니부기',dex:8,base:{hp:59,attack:65,defense:80,speed:58}},{level:36,name:'거북왕',dex:9,base:{hp:79,attack:85,defense:103,speed:78}}],
 raichu:[{level:1,name:'피츄',dex:172,base:START_BASES.raichu},{level:15,name:'피카츄',dex:25,base:{hp:35,attack:55,defense:45,speed:90}},{level:30,name:'라이츄',dex:26,base:{hp:60,attack:90,defense:68,speed:110}}],
 butterfree:[{level:1,name:'캐터피',dex:10,base:START_BASES.butterfree},{level:7,name:'단데기',dex:11,base:{hp:50,attack:25,defense:40,speed:30}},{level:10,name:'버터플',dex:12,base:{hp:60,attack:90,defense:65,speed:70}}],
 gengar:[{level:1,name:'고오스',dex:92,base:START_BASES.gengar},{level:25,name:'고우스트',dex:93,base:{hp:45,attack:115,defense:50,speed:95}},{level:40,name:'팬텀',dex:94,base:{hp:60,attack:130,defense:68,speed:110}}],
 gyarados:[{level:1,name:'잉어킹',dex:129,base:START_BASES.gyarados},{level:20,name:'갸라도스',dex:130,base:{hp:95,attack:125,defense:90,speed:81}}]
};
const getForm=(id,level)=>[...EVOLUTIONS[id]].reverse().find(form=>level>=form.level);
const MOVE_LEARNSETS={
 snorlax: [{level:1,id:'tackle'}, {level:8,id:'lick'}, {level:16,id:'bodySlam'}, {level:25,id:'rest'}, {level:32,id:'crunch'}, {level:40,id:'flail'}, {level:48,id:'gigaImpact'}],
 gyarados: [{level:1,id:'tackle'}, {level:20,id:'bite'}, {level:24,id:'surf'}, {level:32,id:'dragonDance'}, {level:40,id:'hydroPump'}],
 gengar: [{level:1,id:'lick'}, {level:7,id:'spite'}, {level:12,id:'shadowBall'}, {level:20,id:'hypnosis'}, {level:25,id:'suckerPunch'}, {level:32,id:'dreamEater'}, {level:40,id:'sludgeBomb'}],
 dragonite: [{level:1,id:'wrap'}, {level:8,id:'quickAttack'}, {level:18,id:'dragonBreath'}, {level:30,id:'dragonPulse'}, {level:40,id:'dragonDance'}, {level:48,id:'outrage'}, {level:55,id:'extremeSpeed'}],
 venusaur: [{level:1,id:'tackle'}, {level:7,id:'vineWhip'}, {level:13,id:'poisonPowder'}, {level:16,id:'razorLeaf'}, {level:24,id:'energyBall'}, {level:32,id:'solarBeam'}, {level:44,id:'synthesis'}],
 charizard: [{level:1,id:'scratch'}, {level:7,id:'ember'}, {level:13,id:'quickAttack'}, {level:16,id:'fireFang'}, {level:24,id:'flamethrower'}, {level:36,id:'flareBlitz'}, {level:48,id:'airSlash'}],
 blastoise: [{level:1,id:'tackle'}, {level:7,id:'waterGun'}, {level:13,id:'harden'}, {level:16,id:'waterPulse'}, {level:25,id:'surf'}, {level:36,id:'waterSpout'}, {level:44,id:'ironDefense'}],
 raichu: [{level:1,id:'quickAttack'}, {level:6,id:'thunderShock'}, {level:12,id:'thunderWave'}, {level:15,id:'spark'}, {level:22,id:'thunderbolt'}, {level:30,id:'voltTackle'}, {level:40,id:'lightScreen'}],
 butterfree: [{level:1,id:'tackle'}, {level:7,id:'harden'}, {level:10,id:'confusion'}, {level:14,id:'poisonPowder'}, {level:20,id:'psybeam'}, {level:28,id:'quiverDance'}, {level:36,id:'gigaDrain'}],
};
const availableMoves=(id,level)=>MOVE_LEARNSETS[id].filter(m=>m.level<=level);
const initialMoves=id=>MOVE_LEARNSETS[id].filter(m=>m.level===1).map(m=>m.id);
// Keep a legacy save playable: choose four latest unlocked moves if a save has no moves field.
const migrateMoves=(id,level)=>availableMoves(id,level).slice(-4).map(m=>m.id);
const isValidMoves=(id,level,moves)=>Array.isArray(moves)&&moves.length>=1&&moves.length<=4&&new Set(moves).size===moves.length&&moves.every(m=>availableMoves(id,level).some(x=>x.id===m)&&MOVES[m]);

// Reward choices scale by stage when a stage system is added later.
const REWARD_ITEM_SLOTS_BY_STAGE={1:2,2:3};
const currentRewardStage=()=>area==='grass'?1:area==='forest'?2:3;
const rewardItemSlots=(stage)=>REWARD_ITEM_SLOTS_BY_STAGE[stage]??2;
const baseCashForWin=level=>10+level*5;
const bonusCashForWin=level=>10+level*10;
function drawRewardItems(wildLevel,stage){
 const available=SHOP_ITEMS.filter(item=>inventory[item.id]<99&&(
  item.id==='pokeBall'||item.id==='potion'||
  (wildLevel>=10&&(item.id==='greatBall'||item.id==='superPotion'))||
  (wildLevel>=25&&(item.id==='ultraBall'||item.id==='hyperPotion'))));
 const result=[];
 const pool=[...available];
 const slots=rewardItemSlots(stage);
 for(let k=0;k<slots&&pool.length;k++){
  const index=Math.floor(Math.random()*pool.length);
  const item=pool.splice(index,1)[0];
  result.push({id:item.id,quantity:item.id==='potion'&&Math.random()<0.3?2:1});
 }
 return result;
}
const levelNeed=level=>level>=100?0:Math.round(24+level*13);
const validCaptured=entry=>entry&&Number.isInteger(entry.dex)&&entry.dex>0&&Number.isInteger(entry.level)&&entry.level>=1&&entry.level<=100&&typeof entry.name==='string'&&entry.name.length<=40;
const validIVs=ivs=>ivs&&['hp','attack','defense','speed'].every(k=>Number.isInteger(ivs[k])&&ivs[k]>=0&&ivs[k]<=16);
function readSave(){try{const x=JSON.parse(localStorage.getItem(SAVE_KEY));return x&&STARTERS.some(s=>s.id===x.id)&&validIVs(x.ivs)&&Number.isInteger(x.level)&&x.level>=1&&x.level<=100&&Number.isInteger(x.exp)&&x.exp>=0&&(x.level===100?x.exp===0:x.exp<levelNeed(x.level))&&Number.isSafeInteger(x.money)&&x.money>=0?x:null;}catch{return null;}}
function saveProgress(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({id:chosen,level:progress.level,exp:progress.exp,money:progress.money,ivs:playerIVs,moves:playerMoves,captures:capturedPokemon,lastBattleReward,inventory,storedHp,pendingRewardChoice,area,blueCleared,brockCleared,blueChoice,injured,healingDay,freeHealsUsed}));}catch(e){console.warn('저장할 수 없습니다.',e);}}

const saved=readSave();
let battle,chosen=saved?.id||'raichu',animating=false,shownHp={player:0,enemy:0},screen='home';
let progress={level:saved?.level||1,exp:saved?.exp||0,money:saved?.money||0};
let wildEnemy=null, rewardClaimed=false, menuPage='main';
let area=['grass','forest','cave'].includes(saved?.area)?saved.area:'grass';
let blueCleared=!!saved?.blueCleared,brockCleared=!!saved?.brockCleared;
if(brockCleared){blueCleared=true;area='cave';}else if(blueCleared&&area==='grass')area='forest';
let blueChoice=RIVAL_POOL.some(s=>s.id===saved?.blueChoice)?saved.blueChoice:null;
let battleKind='wild',battleOpponent=null,defeatedEnemies=0,trainerExpEarned=0;
let injured=!!saved?.injured;
const todayKST=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let healingDay=typeof saved?.healingDay==='string'?saved.healingDay:todayKST();
let freeHealsUsed=Number.isInteger(saved?.freeHealsUsed)?Math.max(0,Math.min(10,saved.freeHealsUsed)):0;
function refreshHealingDay(){const now=todayKST();if(healingDay!==now){healingDay=now;freeHealsUsed=0;saveProgress();}}
function healInjury(){
 refreshHealingDay();
 if(!injured)return;
 const fee=freeHealsUsed<10?0:progress.level*10;
 if(progress.money<fee){alert('치료비가 부족해! 오늘 무료 치료가 다시 제공될 때까지 기다려줘.');return;}
 if(fee)progress.money-=fee;else freeHealsUsed++;
 injured=false;storedHp=null;saveProgress();renderHome();reset();
}
let pendingLevelUp=null;
let battleSpeed=1;
let lastBattleReward=saved?.lastBattleReward&&Number.isSafeInteger(saved.lastBattleReward.exp)&&Number.isSafeInteger(saved.lastBattleReward.money)?saved.lastBattleReward:null;
let capturedPokemon=Array.isArray(saved?.captures)?saved.captures.filter(validCaptured).slice(0,200):[];
// Backward-compatible additions: existing Lv, money, IV, and captures are retained.
const START_INVENTORY={pokeBall:3,greatBall:0,ultraBall:0,potion:3,superPotion:0,hyperPotion:0};
let inventory=Object.fromEntries(SHOP_ITEMS.map(i=>[i.id, Number.isInteger(saved?.inventory?.[i.id])&&saved.inventory[i.id]>=0&&saved.inventory[i.id]<=99?saved.inventory[i.id]:START_INVENTORY[i.id]]));
let storedHp=Number.isInteger(saved?.storedHp)&&saved.storedHp>=0?saved.storedHp:null;
let pendingRewardChoice=null;
if(saved?.pendingRewardChoice){
 const p=saved.pendingRewardChoice;
 if(Number.isInteger(p.bonusCash)&&p.bonusCash>=0&&Array.isArray(p.items)&&p.items.every(x=>SHOP_ITEMS.some(item=>item.id===x.id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=3)){
  pendingRewardChoice={bonusCash:p.bonusCash,items:p.items.slice(0,4)};
 }
}


const STAT_KEYS=['hp','attack','defense','speed'];
const STAT_LABELS={hp:'HP',attack:'ATK',defense:'DEF',speed:'SPD'};
const randomIVs=()=>Object.fromEntries(STAT_KEYS.map(key=>[key,Math.floor(Math.random()*17)]));
const ivTier=value=>value===16?'red':value>=12?'gold':value>=7?'silver':value>=1?'bronze':'white';
let playerIVs=saved?.ivs||randomIVs();
let playerMoves=isValidMoves(chosen,progress.level,saved?.moves)?[...saved.moves]:migrateMoves(chosen,progress.level);
let learningBusy=false;
function renderStatPanel(){
  const grid=$('statGrid'),form=getForm(chosen,progress.level),stats=calculateStats(form.base,progress.level,playerIVs,{});
  grid.replaceChildren(...STAT_KEYS.map(key=>{
    const card=document.createElement('div');card.className='stat-card';
    const iv=document.createElement('div');iv.className='iv-wrap';
    const star=document.createElement('span');star.className='iv-star iv-'+ivTier(playerIVs[key]);star.textContent='★';star.setAttribute('aria-label','개체값 '+playerIVs[key]);
    const number=document.createElement('span');number.className='iv-number';number.textContent=String(playerIVs[key]);
    const label=document.createElement('div');label.className='stat-name';label.textContent=STAT_LABELS[key];
    const value=document.createElement('div');value.className='stat-value';value.textContent=String(stats[key]);
    iv.append(star,number);card.append(iv,label,value);return card;
  }));
  $('ivSummary').textContent='IV 합계 '+STAT_KEYS.reduce((sum,key)=>sum+playerIVs[key],0)+' / 64';
}

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms/battleSpeed));
const visualSprite=side=>document.querySelector('.sprite.'+side);
function displayHp(side,hp){const f=side==='player'?battle.player:battle.enemies[battle.enemyIndex];const pct=Math.max(0,100*hp/f.stats.hp);$(side+'Bar').style.width=pct+'%';$(side+'Bar').style.background=pct>50?'#59c679':pct>20?'#e8b956':'#d86862';$(side+'Hp').textContent='HP '+hp+' / '+f.stats.hp;shownHp[side]=hp;}
function animateClass(element,klass){element.classList.remove(klass);void element.offsetWidth;element.classList.add(klass);}
function popup(side,amount,critical=false,healing=false){const el=$(side+'Popup');el.classList.remove('visible');el.replaceChildren();const n=document.createElement('span');n.className='number-hit'+(healing?' heal':'');n.textContent=(healing?'+':'−')+amount;el.append(n);if(critical){const crit=document.createElement('span');crit.className='critical';crit.textContent='Critical Hit!';el.append(crit);}void el.offsetWidth;el.classList.add('visible');}
async function playEvents(events){for(const ev of events){if(ev.type==='move'){const el=visualSprite(ev.side);animateClass(el,'attacking');await pause(380);el.classList.remove('attacking');}else if(ev.type==='damage'){const el=visualSprite(ev.side);animateClass(el,'hit');popup(ev.side,ev.amount,ev.critical);await pause(460);displayHp(ev.side,ev.hp);await pause(460);el.classList.remove('hit');$(ev.side+'Popup').classList.remove('visible');}else if(ev.type==='heal'){popup(ev.side,ev.amount,false,true);await pause(300);displayHp(ev.side,ev.hp);await pause(350);$(ev.side+'Popup').classList.remove('visible');}else if(ev.type==='capture'){await pause(400);if(ev.success){visualSprite('enemy').classList.add('enemy-captured');await pause(700);}else await pause(430);}else if(ev.type==='miss'){await pause(270);}}}

function sprite(id,dex,back,emoji){const el=$(id),wrap=el.parentElement;wrap.classList.remove('failed');$(id.replace('Sprite','Fallback')).textContent=emoji;let attempt=0;const sources=[animatedImage(dex,back),staticImage(dex,back),'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+(back?'back/':'')+dex+'.png'];el.onerror=()=>{attempt++;if(attempt<sources.length)el.src=sources[attempt];else wrap.classList.add('failed')};el.onload=()=>wrap.classList.remove('failed');el.src=sources[0];}
function trainerFighter(name,dex,level,base,moveIds=['tackle']){
 return createFighter({id:'trainer-'+dex,name,level,friendship:0,stats:calculateStats(base,level,{hp:0,attack:0,defense:0,speed:0},{}),moveIds});
}
function awardTrainerKnockout(enemy){
 const gained=12+enemy.level*6;
 trainerExpEarned+=gained;
 const former=progress.level;
 progress.exp+=gained;
 while(progress.level<100&&progress.exp>=levelNeed(progress.level)){progress.exp-=levelNeed(progress.level);progress.level++;}
 if(progress.level===100)progress.exp=0;
 if(progress.level>former)pendingLevelUp={previous:pendingLevelUp?.previous??former,current:progress.level};
 lastBattleReward={exp:trainerExpEarned,money:0};
 saveProgress();
 return gained;
}
function fighter(s,ivs={hp:8,attack:8,defense:8,speed:8},level=5,baseStats=s.base,displayName=s.name,moveIds=s.moves){
 return createFighter({id:s.id,name:displayName,level,friendship:100,stats:calculateStats(baseStats,level,ivs,{}),moveIds});
}
function awardExperience(){
 if(rewardClaimed||battle.result!=='victory')return [];
 rewardClaimed=true;
 const gained=12+wildEnemy.level*6;
 const baseMoney=baseCashForWin(wildEnemy.level);
 const bonusMoney=bonusCashForWin(wildEnemy.level);
 lastBattleReward={exp:gained,money:baseMoney};
 const messages=['+'+gained+' EXP 획득!','기본 상금 +'+baseMoney+'원 획득!'];
 progress.money+=baseMoney;
 pendingRewardChoice={bonusCash:bonusMoney,items:drawRewardItems(wildEnemy.level,currentRewardStage())};
 const evolutions=[];
 const learnQueue=[];
 const previousLevel=progress.level;
 progress.exp+=gained;
 while(progress.level<100&&progress.exp>=levelNeed(progress.level)){
  progress.exp-=levelNeed(progress.level);progress.level++;
  messages.push('LEVEL UP! LV '+progress.level);
  for(const m of MOVE_LEARNSETS[chosen])if(m.level===progress.level)learnQueue.push(m.id);
  const form=EVOLUTIONS[chosen].find(f=>f.level===progress.level);
  if(form){const before=getForm(chosen,progress.level-1);evolutions.push({before,after:form,level:progress.level});messages.push(before.name+' → '+form.name+' 진화!');}
 }
 if(progress.level===100)progress.exp=0;
 saveProgress();
 return {messages,evolutions,learnQueue,previousLevel,newLevel:progress.level};
}
async function showEvolutions(evolutions){
 for(const evolution of evolutions){
  const layer=$('evolutionOverlay'),art=document.querySelector('.evolution-art'),image=$('evolutionSprite'),fallback=$('evolutionFallback');
  const load=(form)=>{fallback.hidden=true;image.hidden=false;image.onerror=()=>{image.hidden=true;fallback.hidden=false};image.src=animatedImage(form.dex)};
  art.classList.remove('evolved');$('evolutionName').textContent=evolution.before.name;
  $('evolutionMessage').textContent='포켓몬이 진화하고 있어!';load(evolution.before);layer.hidden=false;
  await pause(1500);
  art.classList.add('evolved');load(evolution.after);
  $('evolutionName').textContent=evolution.after.name;
  $('evolutionMessage').textContent=evolution.before.name+' → '+evolution.after.name+' 진화 성공! (LV '+evolution.level+')';
  await pause(1900);layer.hidden=true;
 }
}
function finishTrainerBattle(){
 const old=progress.level;
 const evolutions=[];
 const learnQueue=[];
 if(battle.result==='victory'){
  if(battleKind==='blue'&&!blueCleared){blueCleared=true;area='forest';}
  if(battleKind==='brock'&&!brockCleared){brockCleared=true;area='cave';}
  const money=TRAINERS[battleKind].money;
  const level=battle.enemies.at(-1).level;
  progress.money+=baseCashForWin(level);
  lastBattleReward={exp:trainerExpEarned,money:baseCashForWin(level)};
  pendingRewardChoice={bonusCash:money,items:drawRewardItems(level,currentRewardStage())};
 }
 for(const m of MOVE_LEARNSETS[chosen])if(m.level<=progress.level&&!playerMoves.includes(m.id)&&m.level>battlePlayerLevelStart)learnQueue.push(m.id);
 saveProgress();
 return {messages:battle.result==='victory'?['트레이너 승리!','새로운 지역이 열렸어!']:['부상을 입었어. 치료가 필요해.'],evolutions,learnQueue,previousLevel:old,newLevel:progress.level};
}
let battlePlayerLevelStart=1;
let pendingTrainerIntro=null;
function challengeTrainer(){
 const kind=blueCleared?'brock':'blue';
 if(injured||pendingRewardChoice||learningBusy||animating||pendingTrainerIntro)return;
 if((kind==='blue'&&progress.level<7)||(kind==='brock'&&progress.level<13))return;
 pendingTrainerIntro=kind;
 const trainer=TRAINERS[kind];
 $('trainerIntroName').textContent=trainer.name;
 $('trainerIntroText').textContent=kind==='blue'?'라이벌 그린이 배틀을 신청했다!':'바위 체육관 관장 웅이 승부를 걸어왔다!';
 $('trainerIntroImage').hidden=false;
 // Use the uploaded animated WebP directly to preserve its original frames.
 $('trainerIntroImage').onerror=()=>{$('trainerIntroImage').src='https://play.pokemonshowdown.com/sprites/trainers/blue-gen3.png';$('trainerIntroImage').onerror=()=>{$('trainerIntroImage').hidden=true;$('trainerIntroFallback').hidden=false;};};
 $('trainerIntroImage').removeAttribute('src');
 $('trainerIntroImage').src=trainer.image;
 $('trainerIntroFallback').hidden=true;
 $('trainerIntroOverlay').hidden=false;
 $('trainerIntroConfirm').focus();
}
async function confirmTrainerIntro(){
 const kind=pendingTrainerIntro;
 if(!kind||animating||learningBusy)return;
 pendingTrainerIntro=null;
 $('trainerIntroOverlay').hidden=true;
 battlePlayerLevelStart=progress.level;
 reset(kind);
 showScreen('battle');
 const arena=$('battleScreen');
 arena.classList.add('trainer-summoning');
 const ball=$('trainerThrowBall');
 ball.classList.remove('trainer-ball-flying');
 void ball.offsetWidth;
 ball.classList.add('trainer-ball-flying');
 $('trainerSummonMessage').textContent=TRAINERS[kind].name+'이(가) 몬스터볼을 던졌다!';
 $('trainerSummonMessage').hidden=false;
 $('battleCommands').hidden=true;
 animating=true;
 try{
  await pause(1050);
  arena.classList.add('trainer-pokemon-appearing');
  $('trainerSummonMessage').textContent=battle.enemies[0].name+' 등장!';
  await pause(780);
 }finally{
  arena.classList.remove('trainer-summoning','trainer-pokemon-appearing');
  ball.classList.remove('trainer-ball-flying');
  $('trainerSummonMessage').hidden=true;
  animating=false;
  render();
  showMenu('main');
 }
}
function reset(kind='wild'){
 if(animating||learningBusy)return;
 battleKind=kind;battleOpponent=null;defeatedEnemies=0;trainerExpEarned=0;
 const s=STARTERS.find(x=>x.id===chosen);
 const form=getForm(chosen,progress.level);
 const wild=kind==='wild'?pickEncounter(area==='cave'?'forest':area):null;
 const level=Math.max(1,progress.level-Math.floor(Math.random()*6));
 wildEnemy=wild?{...wild,level}:null;
 const player=fighter(s,playerIVs,progress.level,form.base,form.name,playerMoves);
 const zeroIV={hp:0,attack:0,defense:0,speed:0};
 let enemies;
 if(kind==='blue'){
  if(!blueChoice){blueChoice=RIVAL_POOL[Math.floor(Math.random()*RIVAL_POOL.length)].id;saveProgress();}
  const other=getForm(blueChoice,7);
  enemies=[trainerFighter(other.name,other.dex,7,other.base,initialMoves(blueChoice))];
  battleOpponent='blue';
 }else if(kind==='brock'){
  enemies=[trainerFighter('꼬마돌',74,11,{"hp":40,"attack":80,"defense":65,"speed":20}),trainerFighter('롱스톤',95,13,{"hp":35,"attack":45,"defense":103,"speed":70})];
  battleOpponent='brock';
 }else{
  const enemy=createFighter({id:'wild-'+wild.dex,name:wild.name,level,friendship:0,stats:calculateStats(wild.base,level,zeroIV,{}),moveIds:['tackle']});enemy.rare=wild.rare;enemies=[enemy];
 }
 player.hp=storedHp===null?player.stats.hp:Math.min(player.stats.hp,Math.max(0,storedHp));
 battle=createBattle(player,enemies,{items:0,balls:0,wild:kind==='wild'});rewardClaimed=false;menuPage='main';
 visualSprite('enemy').classList.remove('enemy-captured');
 const first=enemies[0];
 battle.log.push(kind==='wild'?'⚔️ 야생 '+wild.name+'이(가) 나타났다!':(TRAINERS[kind].name+'의 도전!'));
 shownHp={player:player.hp,enemy:first.hp};
 $('playerName').textContent=form.name;$('promptName').textContent=form.name;
 $('enemyName').textContent=first.name;$('enemyLevel').textContent='Lv.'+first.level;$('playerLevel').textContent='Lv.'+progress.level;
 sprite('playerSprite',form.dex,true,s.emoji);sprite('enemySprite',kind==='wild'?wild.dex:kind==='blue'?getForm(blueChoice,7).dex:74,false,kind==='wild'?'🐾':'⚔️');
 $('trainerName').textContent=kind==='wild'?'야생 포켓몬':TRAINERS[kind].name;
 $('trainerPortrait').hidden=kind==='wild';
 if(kind!=='wild'){$('trainerPortrait').src=TRAINERS[kind].image;$('trainerPortrait').onerror=()=>{$('trainerPortrait').hidden=true;};}
 $('battleResult').hidden=true;
 document.querySelectorAll('.starter').forEach(b=>{const active=b.dataset.id===chosen;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 render();renderHome();
}
function showMenu(page='main'){
 menuPage=page;
 $('battleCommands').hidden=page!=='main';$('battleSubmenu').hidden=page==='main';
 $('moves').hidden=page!=='fight';$('ballOptions').hidden=page!=='ball';$('healOptions').hidden=page!=='heal';
 $('submenuTitle').textContent=page==='fight'?'사용할 기술 선택':page==='ball'?'몬스터볼 선택':'회복 아이템 선택';
}
function playHomeLevelUp(previousLevel,newLevel){
 const effect=$('homeLevelUp');
 if(newLevel<=previousLevel)return;
 $('homeLevelUpDetail').textContent='LV '+previousLevel+' → LV '+newLevel;
 effect.hidden=false;
 effect.classList.remove('playing');
 void effect.offsetWidth; // Restart the CSS animation on consecutive level-ups.
 effect.classList.add('playing');
}

function renderMoveSummary(){
 const target=$('moveRecallSummary');target.replaceChildren();
 for(const id of playerMoves){const chip=document.createElement('span');chip.className='learn-move-chip';chip.textContent=MOVES[id].name;target.append(chip);}
}
function canLearnNow(id){return availableMoves(chosen,progress.level).some(m=>m.id===id)&&!!MOVES[id];}
function moveInfo(id){const m=MOVES[id];return m.name+' · '+(m.power?'위력 '+m.power:'변화기')+' · 명중 '+Math.round((m.accuracy??1)*100)+'%';}
function updateBattleMoves(){
 saveProgress();renderHome();
 // The current battle has already ended when learning happens.
}
function resolveMoveChoice(newId,{allowSkip=true,source='level'}={}){
 return new Promise(resolve=>{
  const layer=$('learnMoveOverlay'),choices=$('learnMoveChoices');
  choices.replaceChildren();$('learnMoveTitle').textContent=getForm(chosen,progress.level).name+'은(는) '+MOVES[newId].name+'를 배우고 싶어!';
  $('learnMoveInfo').textContent=moveInfo(newId);
  $('learnMoveHelp').textContent='기술이 4개야. 잊을 기술을 하나 선택해줘.';
  function finish(oldId){layer.hidden=true;resolve(oldId);}
  for(const oldId of playerMoves){
   const btn=document.createElement('button');btn.type='button';btn.className='learn-replace-button';
   btn.textContent='잊기: '+moveInfo(oldId);
   btn.onclick=()=>finish(oldId);choices.append(btn);
  }
  const skip=$('learnMoveSkip');skip.hidden=!allowSkip;
  skip.onclick=()=>finish(null);
  layer.hidden=false;
 });
}
async function learnOneMove(id){
 if(!canLearnNow(id)||playerMoves.includes(id))return;
 if(playerMoves.length<4){playerMoves.push(id);updateBattleMoves();return;}
 const oldId=await resolveMoveChoice(id);
 if(oldId===null)return; // A skipped move remains available in the recall menu.
 const index=playerMoves.indexOf(oldId);
 if(index<0)return;
 playerMoves.splice(index,1,id);updateBattleMoves();
}
async function processLearnQueue(queue){
 if(!queue.length)return;
 learningBusy=true;
 try{
  // Level-up animation first, then the queued moves in ascending level order.
  await new Promise(resolve=>setTimeout(resolve,2400));
  for(const id of queue)await learnOneMove(id);
 }finally{learningBusy=false;}
}
function openRecall(){
 if(screen!=='home'||animating||learningBusy)return;
 const list=$('recallMoveList');list.replaceChildren();
 for(const entry of availableMoves(chosen,progress.level)){
  const btn=document.createElement('button');btn.type='button';btn.className='learn-replace-button';
  btn.textContent='Lv.'+entry.level+' · '+moveInfo(entry.id)+(playerMoves.includes(entry.id)?' (현재 보유)':'');
  btn.disabled=playerMoves.includes(entry.id);
  btn.onclick=async()=>{
   $('moveRecallOverlay').hidden=true;learningBusy=true;
   try{await learnOneMove(entry.id);}finally{learningBusy=false;}
   $('moveRecallOverlay').hidden=false;openRecallList();
  };
  list.append(btn);
 }
 $('moveRecallOverlay').hidden=false;
}
function openRecallList(){
 $('moveRecallOverlay').hidden=true;openRecall();
}

function showRewardChoices(){
 const layer=$('rewardChoiceOverlay'),options=$('rewardChoiceOptions');
 if(!pendingRewardChoice){layer.hidden=true;return;}
 options.replaceChildren();
 const cashButton=document.createElement('button');
 cashButton.type='button';cashButton.className='reward-choice-item';
 cashButton.textContent='💰 추가 상금 +'+pendingRewardChoice.bonusCash.toLocaleString('ko-KR')+'원';
 cashButton.onclick=()=>claimRewardChoice('cash');options.append(cashButton);
 for(const itemReward of pendingRewardChoice.items){
  const item=SHOP_ITEMS.find(x=>x.id===itemReward.id);
  if(!item)continue;
  const b=document.createElement('button');b.type='button';b.className='reward-choice-item';
  b.textContent=item.icon+' '+item.name+' ×'+itemReward.quantity;
  b.onclick=()=>claimRewardChoice(item.id);options.append(b);
 }
 layer.hidden=false;
}
function claimRewardChoice(id){
 if(!pendingRewardChoice)return;
 if(id==='cash'){
  progress.money+=pendingRewardChoice.bonusCash;
  lastBattleReward.money+=pendingRewardChoice.bonusCash;
 }else{
  const entry=pendingRewardChoice.items.find(x=>x.id===id);
  if(!entry||!Object.hasOwn(inventory,id))return;
  inventory[id]=Math.min(99,inventory[id]+entry.quantity);
 }
 // Clear the pending choice in the same saved state as the selected reward.
 pendingRewardChoice=null;
 saveProgress();
 $('rewardChoiceOverlay').hidden=true;
 renderHome();
}
function renderCaptures(){
 $('captureCount').textContent=String(capturedPokemon.length);
 const list=$('captureList');list.replaceChildren();
 if(!capturedPokemon.length){list.textContent='아직 포획한 포켓몬이 없어.';return;}
 for(const entry of capturedPokemon.slice(-12).reverse()){
  const chip=document.createElement('span');chip.className='capture-chip';chip.textContent=entry.name+' Lv.'+entry.level;list.append(chip);
 }
 if(capturedPokemon.length>12){const extra=document.createElement('span');extra.textContent='외 '+(capturedPokemon.length-12)+'마리';list.append(extra);}
}
function showShopTab(tab){
 if(animating||pendingRewardChoice)return;
 showScreen('home');$('homeScreen').hidden=true;$('shopScreen').hidden=false;
 $('shopTabShop').setAttribute('aria-selected',String(tab==='shop'));
 $('shopTabBag').setAttribute('aria-selected',String(tab==='bag'));
 $('shopBuyList').hidden=tab!=='shop';$('shopBagList').hidden=tab!=='bag';
 renderInventory();
}
function renderInventory(){
 $('shopMoney').textContent='💰 '+progress.money.toLocaleString('ko-KR')+'원';
 const shop=$('shopBuyList'),bag=$('shopBagList');shop.replaceChildren();bag.replaceChildren();
 for(const item of SHOP_ITEMS){
  const row=document.createElement('div');row.className='shop-item-row';
  const info=document.createElement('div');info.className='shop-item-info';
  const name=document.createElement('strong');name.textContent=item.icon+' '+item.name;
  const desc=document.createElement('small');desc.textContent=item.description+' · 보유 '+inventory[item.id]+'개';
  info.append(name,desc);row.append(info);
  const buy=document.createElement('button');buy.type='button';buy.className='shop-buy';
  buy.textContent=item.price.toLocaleString('ko-KR')+'원 · 구매';buy.disabled=inventory[item.id]>=99||progress.money<item.price;
  buy.onclick=()=>{if(inventory[item.id]>=99||progress.money<item.price)return;progress.money-=item.price;inventory[item.id]++;saveProgress();renderHome();};
  row.append(buy);shop.append(row);
  const bagRow=document.createElement('div');bagRow.className='shop-item-row';
  const bagName=document.createElement('div');bagName.className='shop-item-info';
  const bTitle=document.createElement('strong');bTitle.textContent=item.icon+' '+item.name;
  const bDesc=document.createElement('small');bDesc.textContent=item.description+' · ×'+inventory[item.id];bagName.append(bTitle,bDesc);bagRow.append(bagName);
  if(item.category==='heal'){
   const use=document.createElement('button');use.type='button';use.className='shop-buy';use.textContent='사용';
   const maxHp=calculateStats(getForm(chosen,progress.level).base,progress.level,playerIVs,{}).hp;
   const hp=storedHp===null?maxHp:storedHp;
   use.disabled=inventory[item.id]===0||hp>=maxHp;
   use.onclick=()=>{const max=calculateStats(getForm(chosen,progress.level).base,progress.level,playerIVs,{}).hp;const current=storedHp===null?max:storedHp;
    if(inventory[item.id]<1||current>=max)return;
    storedHp=Math.min(max,current+item.power);inventory[item.id]--;saveProgress();renderHome();};
   bagRow.append(use);
  }
  bag.append(bagRow);
 }
}
function showScreen(next){if(animating||learningBusy)return;screen=next;$('homeScreen').hidden=next!=='home';$('battleScreen').hidden=next!=='battle';window.scrollTo({top:0,behavior:'instant'});}
function renderHome(){
 refreshHealingDay();
 $('currentArea').textContent=area==='grass'?'🌿 초원':area==='forest'?'🌳 숲':'🪨 동굴 (다음 업데이트)';
 $('badgeStatus').textContent=brockCleared?'배지 1 / 8':'배지 0 / 8';
 $('trainerChallenge').hidden=blueCleared&&brockCleared;
 $('trainerChallenge').disabled=injured||!!pendingRewardChoice||(blueCleared?progress.level<13:progress.level<7);
 $('trainerChallenge').textContent=blueCleared?('🪨 웅에게 도전 '+(brockCleared?'✓ 클리어':'(Lv.13)')):'⚔ 라이벌 그린 도전 (Lv.7)';
 $('trainerChallenge').hidden=brockCleared;
 $('trainerRequirement').textContent=brockCleared?'동굴 개방 완료':blueCleared?'Lv.13 달성 시 웅 도전':'Lv.7 달성 시 그린 도전';
 $('injuryStatus').hidden=!injured;
 $('injuryBandage').hidden=!injured;
 $('healButton').hidden=!injured;
 $('healButton').textContent=freeHealsUsed<10?'🩹 무료 치료하기 ('+(10-freeHealsUsed)+'/10회 남음)':'🩹 치료하기 ('+(progress.level*10)+'원)';
 $('startBattle').disabled=injured||!!pendingRewardChoice||area==='cave';
 const s=STARTERS.find(x=>x.id===chosen),form=getForm(chosen,progress.level);
 $('homeName').textContent=form.name;$('homeLevel').textContent='LV '+progress.level;
 $('homeMoney').textContent='💰 '+progress.money.toLocaleString('ko-KR')+'원'+(lastBattleReward?' (+'+lastBattleReward.money.toLocaleString('ko-KR')+')':'');
 renderCaptures();
 const maxHp=calculateStats(form.base,progress.level,playerIVs,{}).hp;
 const hp=storedHp===null?maxHp:Math.min(maxHp,Math.max(0,storedHp));
 $('homeHpText').textContent=hp+' / '+maxHp;
 $('homeHpBar').style.width=(100*hp/maxHp)+'%';
 $('homeHpBar').style.background=hp/maxHp>0.5?'#59c679':hp/maxHp>0.2?'#e8b956':'#d86862';
 renderInventory();

 const need=levelNeed(progress.level);
 $('homeExpText').textContent=(need?progress.exp+' / '+need:'MAX LEVEL')+(lastBattleReward?' (+'+lastBattleReward.exp.toLocaleString('ko-KR')+')':'');
 $('homeExpBar').style.width=need?100*progress.exp/need+'%':'100%';
 const img=$('homeSprite'),fallback=$('homeFallback');
 fallback.textContent=s.emoji;fallback.hidden=true;img.hidden=false;
 // Prefer genuine BW animated front GIF. Fall back to static pixel art and CSS idle motion.
 const sources=[animatedImage(form.dex),staticImage(form.dex),'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+form.dex+'.png'];
 let attempt=0;
 img.onerror=()=>{attempt++;if(attempt<sources.length){img.src=sources[attempt];}else{img.hidden=true;fallback.hidden=false;}};
 img.onload=()=>{img.hidden=false;fallback.hidden=true};
 img.src=sources[0];
 renderStatPanel();
 renderMoveSummary();
}
function render(){const p=battle.player,e=battle.enemies[battle.enemyIndex];
 $('commandFight').disabled=animating||battle.ended;
 $('commandBall').disabled=animating||battle.ended||!battle.wild;
 $('commandHeal').disabled=animating||battle.ended;
 $('commandRun').disabled=animating||battle.ended||!battle.wild;
 for(const item of SHOP_ITEMS){
  const el=$('battleItem-'+item.id);
  el.disabled=animating||battle.ended||inventory[item.id]<1||(item.category==='heal'&&p.hp>=p.stats.hp)||(item.category==='ball'&&!battle.wild);
  const counter=el.querySelector('.item-count');if(counter)counter.textContent='×'+inventory[item.id];
 }

 $('backHome').disabled=battleKind!=='wild';
 $('restart').disabled=battleKind!=='wild';
 if(battle.ended)showMenu('main');for(const [f,prefix] of [[p,'player'],[e,'enemy']]){displayHp(prefix,animating?shownHp[prefix]:f.hp);$(prefix+'Status').textContent=f.status?.type==='paralysis'?'⚡ 마비':f.status?.type==='sleep'?'💤 수면':f.status?.type==='poison'?'☠ 독':'';}
$('turn').textContent=battle.ended?(battle.result==='victory'?'WIN!':'LOSE!'):'TURN '+String(battle.turn+1).padStart(2,'0');
$('moves').replaceChildren(...p.moveIds.map(id=>{const m=MOVES[id],b=document.createElement('button');b.disabled=animating||battle.ended||p.pp[id]===0;b.innerHTML='<span class="move-name">'+m.name+'</span><span class="move-pp">'+(m.power?'위력 '+m.power+' · ':'')+'PP '+p.pp[id]+'/'+m.pp+'</span>';b.addEventListener('click',()=>act({moveId:id}));return b;}));$('log').replaceChildren(...battle.log.slice(-15).reverse().map(line=>{const t=document.createElement('p');t.textContent=line;return t;}));renderStatPanel();}
async function act(a){
 if(animating||battle.ended||learningBusy)return;
 let learnQueue=[];
 const previousHp={player:battle.player.hp,enemy:battle.enemies[battle.enemyIndex].hp};
 try{
  animating=true;
  // Consume one item only after the engine accepts the player's turn.
  takeTurn(battle,a);
  if(a.type==='item'||a.type==='ball'){
   inventory[a.itemId]--;
   saveProgress();
  }

  const events=[...battle.events];
 if(battleKind!=='wild'){
  for(const event of events){if(event.type==='knockout'&&event.side==='enemy'){
   const defeated=battle.enemies[event.enemyIndex];
   awardTrainerKnockout(defeated);defeatedEnemies++;
  }}
 }
 shownHp={...previousHp};render();await playEvents(events);
 if(battleKind!=='wild'&&events.some(ev=>ev.type==='knockout'&&ev.side==='enemy')&&!battle.ended){
  const enemy=battle.enemies[battle.enemyIndex];
  $('enemyName').textContent=enemy.name;$('enemyLevel').textContent='Lv.'+enemy.level;
  sprite('enemySprite',battleKind==='brock'?95:getForm(blueChoice,7).dex,false,'⚔️');
  shownHp.enemy=enemy.hp;displayHp('enemy',enemy.hp);
 }
  if(battle.ended){
    if(battle.result==='capture'){
      capturedPokemon.push({name:wildEnemy.name,dex:wildEnemy.dex,level:wildEnemy.level});
      if(capturedPokemon.length>200)capturedPokemon.shift();
      saveProgress();
    }
    if(battle.result!=='victory'&&battleKind==='wild'){lastBattleReward={exp:0,money:0};saveProgress();}
    const maxBefore=battle.player.stats.hp;
    const hpBefore=battle.player.hp;
    const reward=battleKind==='wild'?awardExperience():finishTrainerBattle();
    learnQueue=reward?.learnQueue||[];
    if(reward?.newLevel>reward?.previousLevel){
     const currentMax=calculateStats(getForm(chosen,progress.level).base,progress.level,playerIVs,{}).hp;
     storedHp=Math.max(0,Math.min(currentMax,hpBefore+(currentMax-maxBefore)));
    } else storedHp=hpBefore;
    saveProgress();
    if(reward?.newLevel>reward?.previousLevel)pendingLevelUp={previous:reward.previousLevel,current:reward.newLevel};
    if(reward?.evolutions?.length)await showEvolutions(reward.evolutions);
    $('battleResult').hidden=false;
    $('resultTitle').textContent=battle.result==='victory'?'승리!':battle.result==='capture'?'포획 성공!':'패배!';
    if(battle.result==='defeat'){injured=true;storedHp=0;saveProgress();}
    $('resultDetail').textContent=battle.result==='capture'?wildEnemy.name+' (Lv.'+wildEnemy.level+') 포획 완료! 포획 도감에 저장했어.':reward?.messages?.length?reward.messages.join('\n'):'경험치를 획득하지 못했어.';
    renderHome();
  }
 }catch(err){alert(err.message);console.error(err);}
 finally{
  if(battle&&!battle.ended){storedHp=battle.player.hp;saveProgress();}
  animating=false;
  render();
  if(battle.ended){
   showMenu('main');
   renderHome();showScreen('home');
   showRewardChoices();
   if(pendingLevelUp){const levels=pendingLevelUp;pendingLevelUp=null;playHomeLevelUp(levels.previous,levels.current);}
   if(learnQueue.length)await processLearnQueue(learnQueue);
  }
 }
}

// Developer controls are for local playtesting, not real account security.
function closeDeveloper(){
 $('developerOverlay').hidden=true;
 $('developerLogin').hidden=false;$('developerEditor').hidden=true;
 $('developerPassword').value='';$('developerError').textContent='';$('developerSaveError').textContent='';
}
function openDeveloper(){
 if(animating||learningBusy)return;
 $('developerOverlay').hidden=false;$('developerLogin').hidden=false;$('developerEditor').hidden=true;
 $('developerError').textContent='';$('developerSaveError').textContent='';
 $('developerPassword').value='';$('developerPassword').focus();
}
function unlockDeveloper(e){
 e.preventDefault();
 if($('developerPassword').value!=='1646'){
  $('developerError').textContent='비밀번호가 올바르지 않아.';
  $('developerPassword').value='';$('developerPassword').focus();return;
 }
 $('developerError').textContent='';
 $('developerLogin').hidden=true;$('developerEditor').hidden=false;
 $('developerLevel').value=String(progress.level);
 $('developerMoney').value=String(progress.money);
 $('developerLevel').focus();
}
function applyDeveloperChanges(e){
 e.preventDefault();
 if(animating)return;
 const level=Number($('developerLevel').value),money=Number($('developerMoney').value);
 if(!Number.isInteger(level)||level<1||level>100||!Number.isSafeInteger(money)||money<0||money>999999999){
  $('developerSaveError').textContent='레벨은 1~100, 보유금은 0~999,999,999의 정수로 입력해줘.';
  return;
 }
 // Direct level edits use the existing evolutionary form lookup; no battle reward is issued.
 const levelChanged=progress.level!==level;
 progress.level=level;progress.money=money;if(levelChanged)storedHp=null;
 if(levelChanged){progress.exp=0;playerMoves=migrateMoves(chosen,level);}
 saveProgress();
 closeDeveloper();
 reset();
}
function setup(){
 $('trainerChallenge').addEventListener('click',challengeTrainer);
 $('trainerIntroConfirm').addEventListener('click',confirmTrainerIntro);
 $('trainerIntroCancel').addEventListener('click',()=>{if(animating)return;pendingTrainerIntro=null;$('trainerIntroOverlay').hidden=true;});
 $('healButton').addEventListener('click',healInjury);
 $('openMoveRecall').addEventListener('click',openRecall);
 $('closeMoveRecall').addEventListener('click',()=>{$('moveRecallOverlay').hidden=true});
 $('speedToggle').addEventListener('click',()=>{
  battleSpeed=battleSpeed===1?2:1;
  document.body.classList.toggle('battle-fast',battleSpeed===2);
  $('speedToggle').setAttribute('aria-pressed',String(battleSpeed===2));
  $('speedToggle').textContent='⏩ 2배속 '+(battleSpeed===2?'ON':'OFF');
 });
 $('commandFight').addEventListener('click',()=>showMenu('fight'));
 $('commandBall').addEventListener('click',()=>showMenu('ball'));
 $('commandHeal').addEventListener('click',()=>showMenu('heal'));
 $('commandRun').addEventListener('click',()=>{if(animating||battle.ended||!battle.wild)return;storedHp=battle.player.hp;saveProgress();showMenu('main');renderHome();showScreen('home')});
 $('submenuBack').addEventListener('click',()=>{if(!animating&&!battle.ended)showMenu('main')});
 $('homeLevelUp').addEventListener('animationend',e=>{if(e.target!==$('homeLevelUp'))return;$('homeLevelUp').classList.remove('playing');$('homeLevelUp').hidden=true;});
 for(const item of SHOP_ITEMS){
  $('battleItem-'+item.id).addEventListener('click',()=>act({type:item.category==='ball'?'ball':'item',itemId:item.id,power:item.power,multiplier:item.multiplier}));
 }
 $('openShop').addEventListener('click',()=>showShopTab('shop'));
 $('openBag').addEventListener('click',()=>showShopTab('bag'));
 $('closeShop').addEventListener('click',()=>{$('shopScreen').hidden=true;showScreen('home')});
 $('shopTabShop').addEventListener('click',()=>showShopTab('shop'));
 $('shopTabBag').addEventListener('click',()=>showShopTab('bag'));

 const box=$('starters');STARTERS.forEach(s=>{const b=document.createElement('button');b.type='button';b.className='starter';b.dataset.id=s.id;b.innerHTML='<img alt="" loading="lazy" src="'+staticImage(s.baby)+'"><span>'+s.name+'</span>';b.onclick=()=>{if(animating||learningBusy||chosen===s.id)return;if(!confirm('스타팅을 바꾸면 레벨, 경험치, 보유금, 포획 도감이 초기화돼. 바꿀까?'))return;chosen=s.id;area='grass';blueCleared=false;brockCleared=false;blueChoice=null;injured=false;healingDay=todayKST();freeHealsUsed=0;playerIVs=randomIVs();playerMoves=initialMoves(s.id);capturedPokemon=[];lastBattleReward=null;pendingRewardChoice=null;storedHp=null;inventory={...START_INVENTORY};progress={level:1,exp:0,money:0};saveProgress();reset()};box.append(b)});$('restart').addEventListener('click',()=>reset(battleKind));$('startBattle').addEventListener('click',()=>{if(learningBusy||pendingRewardChoice||injured)return;if(storedHp===0){alert('HP가 0이야! 가방에서 회복약을 사용해줘.');showShopTab('bag');return;}$('homeLevelUp').hidden=true;$('homeLevelUp').classList.remove('playing');reset();showScreen('battle')});$('backHome').addEventListener('click',()=>{if(animating||battleKind!=='wild')return;storedHp=battle.player.hp;saveProgress();renderHome();showScreen('home')});$('resultHome').addEventListener('click',()=>{renderHome();showScreen('home')});$('openDeveloper').addEventListener('click',openDeveloper);$('closeDeveloper').addEventListener('click',closeDeveloper);$('developerLogin').addEventListener('submit',unlockDeveloper);$('developerEditor').addEventListener('submit',applyDeveloperChanges);$('developerOverlay').addEventListener('click',e=>{if(e.target===$('developerOverlay'))closeDeveloper()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('developerOverlay').hidden)closeDeveloper()});saveProgress();reset();showScreen('home');showRewardChoices();}
setup();
