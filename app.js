import {learnsetForDex,FAMILY_BY_DEX,ADDITIONAL_FAMILY_BY_DEX,STARTER_FAMILY_BY_DEX} from './js/data/learnsets.js';
import {recentWildMoves} from './js/data/learnsets.js';
import {calculateStats,createFighter,createBattle,takeTurn,MOVES} from './battle-engine.mjs?v=20261025-persistent-pp30';
import {STARTERS,EVOLUTIONS,getForm,MOVE_LEARNSETS,availableMoves,initialMoves,migrateMoves,isValidMoves} from './js/data/pokemon.js?v=20261024-moves-refactor1';
import {ENCOUNTERS,DEX_CATALOG,pokemonCatchMultiplier,pokemonCatchChance,pickEncounter} from './js/data/areas.js?v=20261024-adventure1';
import {RIVAL_POOL,TRAINERS} from './js/data/trainers.js?v=20261024-road2';
import {BADGE_IMAGES} from './js/data/badge-images.js?v=20261024-01';
import {SHOP_ITEMS,START_INVENTORY,ITEM_CATEGORY_LABELS,itemCategory} from './js/data/items.js?v=20261025-shop-pp-aid31';
import {SAVE_KEY,levelNeed,validCaptured,validIVs,readSave} from './js/storage.js';
import {staticImage,animatedImage} from './js/sprites.js';
import {renderCollectionView} from './js/collection.js?v=20261023-14';
import {renderInventoryView} from './js/inventory.js?v=20261025-six-features38';
import {resolveDeveloperWarp} from './js/developer.js?v=20261024-road2';
const $=id=>document.getElementById(id);

// Reward choices scale by stage when a stage system is added later.
const REWARD_ITEM_SLOTS_BY_STAGE={1:2,2:3};
const currentRewardStage=()=>area==='grass'?1:area==='forest'?2:area==='cave'?3:4;
const rewardItemSlots=(stage)=>REWARD_ITEM_SLOTS_BY_STAGE[stage]??2;
const baseCashForWin=level=>10+level*5;
const bonusCashForWin=level=>10+level*10;
// Each reward slot rolls independently: 74% normal, 20% rare, 5% hyper, 1% legendary.
// Duplicate tiers, reward types and exact rewards are intentional.
const REWARD_TIERS={normal:{label:'일반',weight:74},rare:{label:'레어',weight:20},hyper:{label:'하이퍼',weight:5},legendary:{label:'전설',weight:1}};
function rewardChoiceCount(){return giovanniCleared?5:erikaCleared?4:3;}
function drawThreeRewards(level,count=rewardChoiceCount()){
 const baseCash=bonusCashForWin(level);
 const pool={
  normal:[
   {kind:'cash',amount:baseCash,icon:'💰'},
   {kind:'heal',amount:20,icon:'🧪'},
   {kind:'heal',amount:60,icon:'💊'},
   {kind:'item',id:'pokeBall',quantity:2,icon:'🔴'},
   {kind:'exp',amount:50,icon:'🍬'},
   {kind:'ppAid',icon:'🧴'},
   {kind:'power',effect:'attack',turns:5,icon:'⚔️'},
   {kind:'power',effect:'accuracy',turns:5,icon:'🎯'},
   {kind:'power',effect:'critical',turns:5,icon:'✂️'},
   {kind:'power',effect:'defense',turns:5,icon:'🛡️'}
  ],
  rare:[
   {kind:'cash',amount:baseCash*3,icon:'💰'},
   {kind:'heal',amount:200,icon:'💉'},
   ...(teamMembers().length>=2&&teamMembers().some(m=>memberHp(m)===0)?[{kind:'maxReviveReward',icon:'🌟'}]:[]),
   {kind:'item',id:'greatBall',quantity:3,icon:'🔵'},
   {kind:'item',id:'ultraBall',quantity:2,icon:'🟡'},
   ...(inventory.partySlotA!==1?[{kind:'item',id:'partySlotA',quantity:1,icon:'👥'}]:[]),
   ...(inventory.partySlotA===1&&inventory.partySlotB!==1?[{kind:'item',id:'partySlotB',quantity:1,icon:'👥'}]:[]),
  ],
  hyper:[
   {kind:'rareCandy',icon:'🍬'},
   {kind:'ppMax',icon:'✨'},
   ...(teamMembers().length>=2&&teamMembers().some(m=>memberHp(m)===0)?[{kind:'sacredAshReward',icon:'✨'}]:[]),
   {kind:'ev',stat:'hp',amount:10,icon:'💊'},
   {kind:'ev',stat:'attack',amount:10,icon:'💊'},
   {kind:'ev',stat:'defense',amount:10,icon:'💊'},
   {kind:'ev',stat:'speed',amount:10,icon:'💊'}
  ],
  legendary:[
   {kind:'goldCap',icon:'🥇'},
   {kind:'cash',amount:baseCash*10,icon:'💰'},
   {kind:'heal',full:true,icon:'❤️'},
   {kind:'item',id:'ultraBall',quantity:10,icon:'🟡'},
   {kind:'item',id:'masterBall',quantity:1,icon:'🟣'},
   {kind:'silverCap',icon:'🥈'},
   {kind:'item',id:'secretSwitch',quantity:1,icon:'🔘'},
   {kind:'item',id:'oldSeaMap',quantity:1,icon:'🗺️'}
  ]
 };
 return Array.from({length:count},()=>{
  const roll=Math.random()*100;
  const tier=roll<74?'normal':roll<94?'rare':roll<99?'hyper':'legendary';
  return {tier,...pool[tier][Math.floor(Math.random()*pool[tier].length)]};
 });
}
function rewardRerollCost(count){
 const cost=(progress.level*20+100)*2**count;
 return Number.isSafeInteger(cost)&&cost>0?cost:Infinity;
}
function saveProgress(){if(saveReadFailed){console.error('기존 저장 데이터를 읽지 못해 덮어쓰기를 차단했습니다.');return;}try{localStorage.setItem(SAVE_KEY,JSON.stringify({id:chosen,level:progress.level,exp:progress.exp,money:progress.money,ivs:playerIVs,evs:playerEVs,moves:playerMoves,companions,partyOrder,adventureLog,captures:capturedPokemon,caughtSpecies:[...caughtSpecies],seenPokemon:[...seenPokemon],lastBattleReward,lastPartyExp,ppMaxBoosts,partyMovePp,inventory,storedHp,pendingRewardChoice,challengeNotified,plusPowerTurns:activeBoosts.attack.length?Math.max(...activeBoosts.attack):0,activeBoosts,area,blueCleared,brockCleared,mistyCleared,greenReturnCleared,surgeCleared,greenThirdCleared,greenFourthCleared,greenFifthCleared,erikaCleared,kogaCleared,sabrinaCleared,blaineCleared,giovanniCleared,leagueStage,hallOfFame,redHallOfFame,leagueCeremonyPending,redCeremonyPending,blueChoice,injured,healingDay,freeHealsUsed}));}catch(e){console.warn('저장할 수 없습니다.',e);}}

const LEAGUE_NAMES=['칸나','시바','국화','목호','챔피언 그린'];
const LEAGUE_TEAMS=[
[['쥬레곤',87,64,90,70,80,70],['파르셀',91,65,50,95,160,70],['야도란',80,65,95,100,110,30],['루주라',124,66,65,115,70,95],['라프라스',131,67,130,85,90,60]],
[['롱스톤',95,65,35,45,103,70],['홍수몬',107,67,50,105,79,76],['시라소몬',106,67,50,120,59,87],['롱스톤',95,68,35,45,103,70],['괴력몬',68,69,90,130,83,55]],
[['팬텀',94,68,60,130,70,110],['골뱃',42,68,75,80,73,90],['고우스트',93,69,45,115,55,95],['아보크',24,70,60,95,69,80],['팬텀',94,71,60,130,70,110]],
[['갸라도스',130,69,95,125,90,81],['신뇽',148,70,61,84,65,70],['신뇽',148,70,61,84,65,70],['프테라',142,72,80,105,70,130],['망나뇽',149,73,91,134,98,80]],
[['피죤투',18,71,83,80,75,101],['후딘',65,72,55,135,75,120],['코뿌리',112,72,105,130,113,40],['갸라도스',130,73,95,125,90,81],['윈디',59,74,90,110,80,95]]];
const saved=readSave();
let adventureLog=Array.isArray(saved?.adventureLog)?saved.adventureLog.filter(x=>typeof x==='string').slice(-100):[];
function appendAdventureLog(s){adventureLog.push(String(s));adventureLog=adventureLog.slice(-100);renderAdventureLog();}
function renderAdventureLog(){const box=document.getElementById('adventureLogEntries');if(!box)return;box.replaceChildren(...adventureLog.slice(box.dataset.full==='true'?-100:-5).map(s=>{const p=document.createElement('div');p.textContent=s;return p;}));}
function toggleAdventureLog(){const box=document.getElementById('adventureLogEntries');if(!box)return;const isFull=box.dataset.full==='true';box.dataset.full=String(!isFull);box.replaceChildren(...adventureLog.slice(isFull?-5:-100).map(s=>{const p=document.createElement('div');p.textContent=s;return p;}));document.getElementById('adventureLogToggle').textContent=isFull?'전체 보기':'최근 5줄 보기';}

// Companion state is additive. Legacy starter progress remains authoritative.
let companions=Array.isArray(saved?.companions)?saved.companions.filter(m=>m&&typeof m.name==='string'&&Number.isInteger(m.dex)&&Number.isInteger(m.level)&&m.level>0&&m.level<=100&&m.ivs&&m.family).slice(0,2):[];
let partyOrder=Array.isArray(saved?.partyOrder)?saved.partyOrder.filter(x=>typeof x==='string'):[];
// Never overwrite a present but unreadable legacy save with default starter data.
const existingSaveRaw=localStorage.getItem(SAVE_KEY);
const saveReadFailed=existingSaveRaw!==null&&!saved;
let battle,chosen=saved?.id||'raichu',animating=false,shownHp={player:0,enemy:0},screen='home';
let progress={level:saved?.level||1,exp:saved?.exp||0,money:saved?.money||0};
let wildEnemy=null, rewardClaimed=false, menuPage='main';
let leagueStage=Number.isInteger(saved?.leagueStage)&&saved.leagueStage>=0&&saved.leagueStage<5?saved.leagueStage:null;
let hallOfFame=Array.isArray(saved?.hallOfFame)?saved.hallOfFame.slice(-100):[];
let redHallOfFame=Array.isArray(saved?.redHallOfFame)?saved.redHallOfFame.slice(-100):[];
let leagueCeremonyPending=!!saved?.leagueCeremonyPending;
let redCeremonyPending=!!saved?.redCeremonyPending;
let redEndingPage=0;
let area=['grass','forest','cave','lake','cemetery','town','road','city','sea','volcano','strangeForest','championRoad','championRoad2','palletTown','rocketBase','farawayIsland','mountSilver'].includes(saved?.area)?saved.area:'grass';
let blueCleared=!!saved?.blueCleared,brockCleared=!!saved?.brockCleared,mistyCleared=!!saved?.mistyCleared;
let greenReturnCleared=!!saved?.greenReturnCleared,surgeCleared=!!saved?.surgeCleared;
let greenThirdCleared=!!saved?.greenThirdCleared,greenFourthCleared=!!saved?.greenFourthCleared,greenFifthCleared=!!saved?.greenFifthCleared,erikaCleared=!!saved?.erikaCleared;
let kogaCleared=!!saved?.kogaCleared,sabrinaCleared=!!saved?.sabrinaCleared,blaineCleared=!!saved?.blaineCleared,giovanniCleared=!!saved?.giovanniCleared;
if(giovanniCleared){blaineCleared=true;if(hallOfFame.length===0)area=greenFifthCleared?'championRoad2':'championRoad';}
if(blaineCleared){sabrinaCleared=true;if(!giovanniCleared)area='strangeForest';}
if(sabrinaCleared){greenFourthCleared=true;kogaCleared=true;if(!blaineCleared&&area!=='strangeForest')area=progress.level>=49?'volcano':'sea';}
else if(kogaCleared){erikaCleared=true;area='city';}
if(erikaCleared){greenThirdCleared=true;if(!kogaCleared)area='road';}
if(greenThirdCleared){surgeCleared=true;if(!erikaCleared)area='town';}
if(surgeCleared)greenReturnCleared=true;
if(greenReturnCleared)mistyCleared=true;
if(mistyCleared){brockCleared=true;if(!erikaCleared)area=greenThirdCleared?'town':surgeCleared?'cemetery':'lake';}else if(brockCleared){blueCleared=true;area='cave';}else if(blueCleared&&area==='grass')area='forest';
if(brockCleared)blueCleared=true;
let blueChoice=RIVAL_POOL.some(s=>s.id===saved?.blueChoice)?saved.blueChoice:null;
let battleKind='wild',battleOpponent=null,defeatedEnemies=0,trainerExpEarned=0;
let injured=!!saved?.injured;
const todayKST=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let healingDay=typeof saved?.healingDay==='string'?saved.healingDay:todayKST();
let freeHealsUsed=Number.isInteger(saved?.freeHealsUsed)?Math.max(0,Math.min(10,saved.freeHealsUsed)):0;
function refreshHealingDay(){const now=todayKST();if(healingDay!==now){healingDay=now;freeHealsUsed=0;saveProgress();}}
function healInjury(){
 refreshHealingDay();
 if(!teamMembers().some(m=>memberHp(m)===0))return;
 const fee=freeHealsUsed<10?0:Math.max(...teamMembers().map(m=>m.level))*100;
 if(progress.money<fee){alert('포켓몬 센터 이용료가 부족해!');return;}
 if(fee)progress.money-=fee;else freeHealsUsed++;
 injured=false;storedHp=null;
 for(const m of companions)m.hp=null;
 for(const m of teamMembers()){const pp=memberMovePp(m);for(const id of (m.starter?playerMoves:m.moves||[]))if(MOVES[id])pp[id]=maxMovePp(m.key,id);}
 appendAdventureLog('🏥 포켓몬 센터에서 HP와 PP를 모두 회복했다!'+(fee?' ('+fee+'원)':' (무료)'));
 saveProgress();renderHome();
}
let pendingLevelUp=null;
let battleSpeed=1;
let lastBattleReward=saved?.lastBattleReward&&Number.isSafeInteger(saved.lastBattleReward.exp)&&Number.isSafeInteger(saved.lastBattleReward.money)?saved.lastBattleReward:null;
let lastPartyExp=saved?.lastPartyExp&&typeof saved.lastPartyExp==='object'?saved.lastPartyExp:{};
let ppMaxBoosts=saved?.ppMaxBoosts&&typeof saved.ppMaxBoosts==='object'?saved.ppMaxBoosts:{};
let partyMovePp=saved?.partyMovePp&&typeof saved.partyMovePp==='object'?saved.partyMovePp:{};
let battleExpEarned={};
let capturedPokemon=Array.isArray(saved?.captures)?saved.captures.filter(validCaptured).slice(0,200):[];
let caughtSpecies=new Set([...(Array.isArray(saved?.caughtSpecies)?saved.caughtSpecies:[]),...capturedPokemon.map(p=>p.dex)].filter(dex=>Number.isInteger(dex)&&dex>0&&dex<=1025));
let seenPokemon=new Set([...(Array.isArray(saved?.seenPokemon)?saved.seenPokemon:[]),...capturedPokemon.map(p=>p.dex)].filter(id=>Number.isInteger(id)&&id>0&&id<=1025));
function registerEncounter(dex){if(!Number.isInteger(dex)||seenPokemon.has(dex))return;seenPokemon.add(dex);saveProgress();}
// Backward-compatible additions: existing Lv, money, IV, and captures are retained.
let inventory=Object.fromEntries(SHOP_ITEMS.map(i=>{const value=Number.isInteger(saved?.inventory?.[i.id])&&saved.inventory[i.id]>=0&&saved.inventory[i.id]<=99?saved.inventory[i.id]:START_INVENTORY[i.id];return [i.id,i.category==='key'?Math.min(1,value):value];}));
// Slot B only makes sense when slot A has been unlocked.
if(inventory.partySlotB)inventory.partySlotA=1;
const BOOST_INFO={attack:{name:'플러스파워',img:'x-attack'},accuracy:{name:'잘 맞히기',img:'x-accuracy'},critical:{name:'크리티컬 커터',img:'dire-hit'},defense:{name:'디펜드 업',img:'x-defend'}};
const activeBoosts=Object.fromEntries(Object.keys(BOOST_INFO).map(key=>[key,(Array.isArray(saved?.activeBoosts?.[key])?saved.activeBoosts[key]:key==='attack'&&Number.isInteger(saved?.plusPowerTurns)?[saved.plusPowerTurns]:[]).filter(n=>Number.isInteger(n)&&n>0&&n<=5).slice(0,100)]));
const boostCount=key=>activeBoosts[key].length;
function tickBoosts(){for(const key of Object.keys(activeBoosts))activeBoosts[key]=activeBoosts[key].map(n=>n-1).filter(n=>n>0);}
let storedHp=Number.isInteger(saved?.storedHp)&&saved.storedHp>=0?saved.storedHp:null;
const EV_STATS=['hp','attack','defense','speed'];
let pendingRewardChoice=null;
if(saved?.pendingRewardChoice){
 const p=saved.pendingRewardChoice;
 if(Array.isArray(p.choices)&&p.choices.length>=3&&p.choices.length<=5&&p.choices.every(x=>x&&REWARD_TIERS[x.tier]&&['cash','heal','item','exp','power','ev','silverCap','maxReviveReward','sacredAshReward','ppAid','rareCandy','ppMax','goldCap'].includes(x.kind)&&(x.kind==='item'?SHOP_ITEMS.some(item=>item.id===x.id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=10:x.kind==='ev'&&EV_STATS.includes(x.stat)&&[2,10].includes(x.amount)||x.kind==='power'&&(!x.effect||['attack','accuracy','critical','defense'].includes(x.effect))||x.full===true||Number.isSafeInteger(x.amount)&&x.amount>=0))){
  pendingRewardChoice={choices:p.choices,rerolls:Number.isInteger(p.rerolls)&&p.rerolls>=0?Math.min(p.rerolls,100):0,gym:!!p.gym};
 }else if(Number.isInteger(p.bonusCash)&&p.bonusCash>=0&&Array.isArray(p.items)){
  // Convert older unfinished reward screens without losing the player's selection.
  pendingRewardChoice={choices:[{tier:'normal',kind:'cash',amount:p.bonusCash,icon:'💰'},...p.items.slice(0,2).map(x=>({tier:'normal',kind:SHOP_ITEMS.find(item=>item.id===x.id)?.category==='heal'?'heal':'item',id:x.id,quantity:x.quantity,amount:(SHOP_ITEMS.find(item=>item.id===x.id)?.power||0)*x.quantity}))].slice(0,3),rerolls:0,gym:!!p.gym};
  while(pendingRewardChoice.choices.length<3)pendingRewardChoice.choices.push({tier:'normal',kind:'cash',amount:p.bonusCash,icon:'💰'});
 }
}


const STAT_KEYS=['hp','attack','defense','speed'];
const STAT_LABELS={hp:'HP',attack:'ATK',defense:'DEF',speed:'SPD'};
const randomIVs=()=>Object.fromEntries(STAT_KEYS.map(key=>[key,Math.floor(Math.random()*17)]));
const ivTier=value=>value===16?'red':value>=12?'gold':value>=7?'silver':value>=1?'bronze':'white';
let playerIVs=saved?.ivs||randomIVs();

let playerEVs=Object.fromEntries(EV_STATS.map(k=>[k,Number.isInteger(saved?.evs?.[k])&&saved.evs[k]>=0&&saved.evs[k]<=100?saved.evs[k]:0]));
if(Object.values(playerEVs).reduce((sum,n)=>sum+n,0)>216)playerEVs={hp:0,attack:0,defense:0,speed:0};
let playerMoves=isValidMoves(chosen,progress.level,saved?.moves)?[...saved.moves]:migrateMoves(chosen,progress.level);
let learningBusy=false;
function renderStatPanel(){
 const m=screen==='battle'?activeMember():leaderMember(),ivs=m.starter?playerIVs:m.ivs,evs=m.starter?playerEVs:m.evs||{},grid=$('statGrid'),stats=calculateStats(memberBase(m),m.level,ivs,evs);
 grid.replaceChildren(...STAT_KEYS.map(key=>{
  const card=document.createElement('div');card.className='stat-card';
  const head=document.createElement('div');head.className='stat-compact-head';
  const label=document.createElement('span');label.className='stat-name';label.textContent=STAT_LABELS[key];
  const star=document.createElement('span');star.className='iv-star iv-'+ivTier(ivs[key]);star.textContent='★';
  star.setAttribute('aria-label','개체값 등급');
  const value=document.createElement('div');value.className='stat-value';value.textContent=String(stats[key]);
  head.append(label,star);card.append(head,value);return card;
 }));
}

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms/battleSpeed));
const visualSprite=side=>document.querySelector('.sprite.'+side);
function displayHp(side,hp){const f=side==='player'?battle.player:(battle.enemies[battle.enemyIndex]??battle.enemies.at(-1));const pct=Math.max(0,100*hp/f.stats.hp);$(side+'Bar').style.width=pct+'%';$(side+'Bar').style.background=pct>50?'#59c679':pct>20?'#e8b956':'#d86862';$(side+'Hp').textContent='HP '+hp+' / '+f.stats.hp;shownHp[side]=hp;}
function animateClass(element,klass){element.classList.remove(klass);void element.offsetWidth;element.classList.add(klass);}
function popup(side,amount,critical=false,healing=false){const el=$(side+'Popup');el.classList.remove('visible');el.replaceChildren();const n=document.createElement('span');n.className='number-hit'+(healing?' heal':'');n.textContent=(healing?'+':'−')+amount;el.append(n);if(critical){const crit=document.createElement('span');crit.className='critical';crit.textContent='Critical Hit!';el.append(crit);}void el.offsetWidth;el.classList.add('visible');}
async function playEvents(events){for(const ev of events){if(ev.type==='move'){const el=visualSprite(ev.side);animateClass(el,'attacking');await pause(380);el.classList.remove('attacking');}else if(ev.type==='damage'){const el=visualSprite(ev.side);const arena=document.querySelector('#battleScreen .arena');animateClass(el,'hit');if(ev.critical&&arena){arena.classList.remove('critical-shake');void arena.offsetWidth;arena.classList.add('critical-shake');}popup(ev.side,ev.amount,ev.critical);await pause(460);displayHp(ev.side,ev.hp);await pause(460);el.classList.remove('hit');arena?.classList.remove('critical-shake');$(ev.side+'Popup').classList.remove('visible');}else if(ev.type==='heal'){popup(ev.side,ev.amount,false,true);await pause(300);displayHp(ev.side,ev.hp);await pause(350);$(ev.side+'Popup').classList.remove('visible');}else if(ev.type==='capture'){await playCaptureSequence(ev.success);}else if(ev.type==='miss'){await pause(270);}}}


// Wild capture plays before any later enemy attack events. The result always follows the engine's roll.
async function playCaptureSequence(success){
 const arena=document.querySelector('#battleScreen .arena'),ball=$('captureBall'),flash=$('captureFlash'),enemy=visualSprite('enemy'),player=visualSprite('player');
 const field=arena.getBoundingClientRect(),target=enemy.getBoundingClientRect(),origin=player.getBoundingClientRect();
 const size=32;
 const startX=origin.left-field.left+origin.width*.48-size/2,startY=origin.top-field.top+origin.height*.48-size/2;
 const hitX=target.left-field.left+target.width*.5-size/2,hitY=target.top-field.top+target.height*.5-size/2;
 const groundY=target.bottom-field.top-size*.7;
 const pos=(x,y)=>{ball.style.left=x+'px';ball.style.top=y+'px';};
 ball.className='capture-ball';ball.hidden=true;flash.className='capture-flash';flash.hidden=true;
 enemy.classList.remove('enemy-captured','capture-absorbing','capture-escaping');
 pos(startX,startY);
 ball.style.setProperty('--catch-dx',(hitX-startX)+'px');
 ball.style.setProperty('--catch-dy',(hitY-startY)+'px');
 ball.hidden=false;ball.classList.add('visible','capture-throw');
 await pause(720);
 pos(hitX,hitY);ball.classList.remove('capture-throw');
 flash.hidden=false;flash.classList.add('capture-flashing');
 enemy.classList.add('capture-absorbing');
 await pause(430);
 flash.classList.remove('capture-flashing');flash.hidden=true;
 pos(hitX,groundY);
 ball.classList.add('capture-land');
 await pause(350);
 ball.classList.remove('capture-land');
 // Three separate shakes, including on failed catches, before revealing the result.
 for(let shake=0;shake<3;shake++){
  ball.classList.remove('capture-shaking');
  void ball.offsetWidth;
  ball.classList.add('capture-shaking');
  await pause(450);
 }
 ball.classList.remove('capture-shaking');
 if(success){
  ball.classList.add('capture-succeeded');
  enemy.classList.add('enemy-captured');
  await pause(450);
  const notice=$('captureSuccessNotice');
  const last=wildEnemy.name.charCodeAt(wildEnemy.name.length-1);
  const hasBatchim=last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28!==0;
  $('captureSuccessText').textContent=wildEnemy.name+(hasBatchim?'을':'를')+' 잡았다!';
  notice.hidden=false;
  await new Promise(resolve=>{
   const confirm=$('captureSuccessConfirm');
   confirm.addEventListener('click',resolve,{once:true});
   confirm.focus();
  });
  notice.hidden=true;
 }else{
  ball.classList.add('capture-failed');
  enemy.classList.remove('capture-absorbing');
  enemy.classList.add('capture-escaping');
  await pause(550);
  enemy.classList.remove('capture-escaping');
 }
 ball.className='capture-ball';ball.hidden=true;ball.removeAttribute('style');
 flash.className='capture-flash';flash.hidden=true;
}

function sprite(id,dex,back,emoji){const el=$(id),wrap=el.parentElement;wrap.classList.remove('failed');$(id.replace('Sprite','Fallback')).textContent=emoji;let attempt=0;const sources=[animatedImage(dex,back),staticImage(dex,back),'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+(back?'back/':'')+dex+'.png'];el.onerror=()=>{attempt++;if(attempt<sources.length)el.src=sources[attempt];else wrap.classList.add('failed')};el.onload=()=>wrap.classList.remove('failed');el.src=sources[0];}
function trainerFighter(name,dex,level,base,moveIds=['tackle']){
 // Temporary trainer rule: use the four most recently learned moves at this level.
 // Starter evolution families share their existing starter learnsets.
 const starterFamily=Object.keys(EVOLUTIONS).find(id=>EVOLUTIONS[id].some(form=>form.dex===dex));
 const recent=starterFamily
  ?availableMoves(starterFamily,level).slice(-4).map(m=>m.id)
  :recentWildMoves(dex,level);
 const selected=recent.length?recent:moveIds;
 return createFighter({id:'trainer-'+dex,name,level,friendship:0,stats:calculateStats(base,level,{hp:0,attack:0,defense:0,speed:0},{}),moveIds:selected});
}
function fighter(s,ivs={hp:8,attack:8,defense:8,speed:8},level=5,baseStats=s.base,displayName=s.name,moveIds=s.moves){
 return createFighter({id:s.id,name:displayName,level,friendship:100,stats:calculateStats(baseStats,level,ivs,playerEVs),moveIds});
}
const WILD_EVOLUTIONS={
 10:[11,7,'단데기'],11:[12,10,'버터플'],13:[14,7,'딱충이'],14:[15,10,'독침붕'],
 16:[17,18,'피죤'],17:[18,36,'피죤투'],19:[20,20,'레트라'],21:[22,20,'깨비드릴조'],
 27:[28,22,'고지'],29:[30,16,'니드리나'],30:[31,36,'니드퀸'],32:[33,16,'니드리노'],33:[34,36,'니드킹'],
 41:[42,22,'골뱃'],43:[44,21,'냄새꼬'],44:[45,40,'라플레시아'],46:[47,24,'파라섹트'],
 54:[55,33,'골덕'],60:[61,25,'슈륙챙이'],61:[62,40,'강챙이'],
 63:[64,16,'윤겔라'],64:[65,36,'후딘'],66:[67,28,'근육몬'],67:[68,40,'괴력몬'],
 69:[70,21,'우츠동'],70:[71,40,'우츠보트'],72:[73,30,'독파리'],
 74:[75,25,'데구리'],75:[76,40,'딱구리'],79:[80,37,'야도란'],
 81:[82,30,'레어코일'],84:[85,31,'두트리오'],
 92:[93,25,'고우스트'],93:[94,40,'팬텀'],96:[97,26,'슬리퍼'],
 98:[99,28,'킹크랩'],100:[101,30,'붐볼'],104:[105,28,'텅구리'],
 116:[117,32,'시드라'],118:[119,33,'왕콘치'],129:[130,20,'갸라도스']
};
async function processPartyGrowth(events){
 if(!events.length)return;
 learningBusy=true;
 try{
  for(const event of events){
   const member=event.starter?null:companions.find(x=>x.family===event.family);
   const names=event.starter?getForm(chosen,event.after).name:member?.name||event.name;
   $('homeLevelUpDetail').textContent=names+' · LV '+event.before+' → LV '+event.after;
   const effect=$('homeLevelUp');effect.hidden=false;effect.classList.remove('playing');void effect.offsetWidth;effect.classList.add('playing');
   appendAdventureLog('🎉 '+names+' Lv.'+event.before+' → Lv.'+event.after+'!');
   await pause(1200);effect.hidden=true;effect.classList.remove('playing');
   for(let level=event.before+1;level<=event.after;level++){
    if(event.starter){
     const evolved=EVOLUTIONS[chosen].find(form=>form.level===level);
     if(evolved){await showEvolutions([{before:getForm(chosen,level-1),after:evolved,level}]);appendAdventureLog('🌟 '+evolved.name+'(으)로 진화했다!');}
     for(const info of MOVE_LEARNSETS[chosen].filter(m=>m.level===level)){
      await learnOneMove(info.id);
      appendAdventureLog('📖 '+getForm(chosen,level).name+' 기술 학습: '+MOVES[info.id].name);
     }
    }else if(member){
     const evo=WILD_EVOLUTIONS[member.dex];
     if(evo&&level>=evo[1]){
      const before={dex:member.dex,name:member.name},after={dex:evo[0],name:evo[2]};
      await showEvolutions([{before,after,level}]);
      member.dex=evo[0];member.name=evo[2];
      appendAdventureLog('🌟 '+before.name+' → '+after.name+' 진화!');
     }
     const known=learnsetForDex(member.dex)||[];
     for(const info of known.filter(m=>m.level===level&&MOVES[m.id]&&!member.moves.includes(m.id))){
      if(member.moves.length<4)member.moves.push(info.id);
      else{
       const remove=await resolveMoveChoice(info.id,{member});
       if(remove!==null){member.moves.splice(member.moves.indexOf(remove),1,info.id);}
      }
      appendAdventureLog('📖 '+member.name+' 기술 학습: '+MOVES[info.id].name);
     }
    }
   }
   saveProgress();
  }
 }finally{learningBusy=false;renderHome();}
}
let pendingPartyGrowth=[];
function addPartyExperience(amount,enemyName,cap=null){
 if(!(amount>0))return;
 const order=teamMembers();
 for(const member of order){
  const participate=battleParticipants.has(member.key);
  const memberCap=cap===null?wildRewardLevelCap():cap;
  if(memberCap!==null&&member.level>=memberCap)continue;
  const gained=Math.floor(amount*(participate?1:0.7));
  const oldLevel=member.level;
  if(member.starter){
   if(memberCap!==null&&progress.level>=memberCap)continue;
   progress.exp+=gained;
   while(progress.level<100&&(memberCap===null||progress.level<memberCap)&&progress.exp>=levelNeed(progress.level)){
    progress.exp-=levelNeed(progress.level);progress.level++;
   }
   if(progress.level===100)progress.exp=0;
   if(progress.level>oldLevel){
    pendingPartyGrowth.push({key:member.key,name:getForm(chosen,progress.level).name,before:oldLevel,after:progress.level,starter:true});
   }
  }else{
   const found=companions.find(x=>x.family===member.family);
   if(!found)continue;
   found.exp=(found.exp||0)+gained;
   while(found.level<100&&(memberCap===null||found.level<memberCap)&&found.exp>=levelNeed(found.level)){
    found.exp-=levelNeed(found.level);found.level++;
   }
   if(found.level===100)found.exp=0;
   if(found.level>oldLevel){
    pendingPartyGrowth.push({key:member.key,name:found.name,before:oldLevel,after:found.level,starter:false,family:found.family});
   }
  }
  battleExpEarned[member.key]=(battleExpEarned[member.key]||0)+gained;
  appendAdventureLog('✨ '+member.name+' +'+gained+' EXP ('+(participate?'참여 100%':'대기 70%')+')');
 }
 saveProgress();
}
function awardExperience(){
 if(rewardClaimed||battle.result!=='victory')return [];
 rewardClaimed=true;
 const cap=wildRewardLevelCap();
 const capped=wildRewardCapped(activeMember());
 const gained=capped?0:12+wildEnemy.level*6;
 const baseMoney=baseCashForWin(wildEnemy.level);
 const bonusMoney=bonusCashForWin(wildEnemy.level);
 lastBattleReward={exp:gained,money:baseMoney};
 const messages=['+'+gained+' EXP 획득!','기본 상금 +'+baseMoney+'원 획득!'];
 progress.money+=baseMoney;
 appendAdventureLog('💰 야생 배틀 보상 '+baseMoney+'원 획득');
 pendingRewardChoice=capped?null:{choices:drawThreeRewards(wildEnemy.level),rerolls:0,gym:false};
 if(capped)messages.push('도전 단계 성장 상한 도달! 야생 경험치와 랜덤 보상은 지급되지 않아.');
 const evolutions=[];
 const learnQueue=[];
 const previousLevel=progress.level;
 addPartyExperience(gained,wildEnemy.name,cap);
 lastPartyExp={...battleExpEarned};
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
const GYM_BADGES={brock:{name:'암석배지',file:'Boulder'},misty:{name:'블루배지',file:'Cascade'},surge:{name:'오렌지배지',file:'Thunder'},erika:{name:'레인보우배지',file:'Rainbow'},koga:{name:'핑크배지',file:'Soul'},sabrina:{name:'골드배지',file:'Marsh'},blaine:{name:'크림슨배지',file:'Volcano'},giovanni:{name:'그린배지',file:'Earth'}};
function showBadgeCollection(){
 const prior=document.getElementById('badgeCollectionOverlay');if(prior)prior.remove();
 const ownership={brock:brockCleared,misty:mistyCleared,surge:surgeCleared,erika:erikaCleared,koga:kogaCleared,sabrina:sabrinaCleared,blaine:blaineCleared,giovanni:giovanniCleared};
 const overlay=document.createElement('div');overlay.id='badgeCollectionOverlay';overlay.className='badge-collection-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','배지 수집');
 const panel=document.createElement('div');panel.className='badge-collection-panel';
 const heading=document.createElement('h2');heading.textContent='🏅 나의 배지';panel.append(heading);
 const grid=document.createElement('div');grid.className='badge-collection-grid';
 for(const [kind,badge] of Object.entries(GYM_BADGES)){
  const owned=!!ownership[kind],slot=document.createElement('div');slot.className='badge-collection-slot';
  const img=document.createElement('img');img.src=BADGE_IMAGES[kind];img.alt=owned?badge.name:badge.name+' 미획득';img.className=owned?'':'badge-collection-locked';
  const name=document.createElement('small');name.textContent=owned?badge.name:'???';
  slot.append(img,name);grid.append(slot);
 }
 const close=document.createElement('button');close.type='button';close.textContent='닫기';close.className='party-summary-close';close.onclick=()=>overlay.remove();
 panel.append(grid,close);overlay.append(panel);document.body.append(overlay);close.focus();
}
function showBadgeAward(kind){
 const badge=GYM_BADGES[kind];if(!badge)return Promise.resolve();
 return new Promise(resolve=>{
  const dialog=$('badgeAwardOverlay'),img=$('badgeAwardImage'),button=$('badgeAwardConfirm');
  $('badgeAwardName').textContent=badge.name+' 획득!';
  img.alt=badge.name+' 도트 이미지';
  img.hidden=false;
  img.onerror=()=>{img.hidden=true;$('badgeAwardFallback').hidden=false;};
  $('badgeAwardFallback').hidden=true;
  img.src=BADGE_IMAGES[kind];
  dialog.hidden=false;
  button.onclick=()=>{dialog.hidden=true;button.onclick=null;resolve();};
  button.focus();
 });
}
function finishTrainerBattle(){
 const activeWasCapped=wildRewardCapped(activeMember());
 const old=progress.level;
 const evolutions=[];
 const learnQueue=[];
 let gained=0;
 let badgeEarned=null;
 if(battle.result==='victory'){
  const rewardCountBeforeVictory=rewardChoiceCount();
  if(GYM_BADGES[battleKind]&&!({brock:brockCleared,misty:mistyCleared,surge:surgeCleared,erika:erikaCleared,koga:kogaCleared,sabrina:sabrinaCleared,blaine:blaineCleared,giovanni:giovanniCleared})[battleKind])badgeEarned=battleKind;
  if(battleKind==='blue'&&!blueCleared){blueCleared=true;area='forest';}
  if(battleKind==='brock'&&!brockCleared){brockCleared=true;area='cave';}
  if(battleKind==='misty'&&!mistyCleared){mistyCleared=true;area='lake';}
  if(battleKind==='greenReturn'&&!greenReturnCleared){greenReturnCleared=true;}
  if(battleKind==='surge'&&!surgeCleared){surgeCleared=true;area='cemetery';}
   if(battleKind==='greenThird'&&!greenThirdCleared){greenThirdCleared=true;area='town';}
   if(battleKind==='erika'&&!erikaCleared){erikaCleared=true;area='road';}
   if(battleKind==='koga'&&!kogaCleared){kogaCleared=true;area='city';}
   if(battleKind==='greenFourth'&&!greenFourthCleared){greenFourthCleared=true;}
   if(battleKind==='sabrina'&&!sabrinaCleared){sabrinaCleared=true;area='sea';}
   if(battleKind==='blaine'&&!blaineCleared){blaineCleared=true;area='strangeForest';}
   if(battleKind==='giovanni'&&!giovanniCleared){giovanniCleared=true;area='championRoad';}
   if(battleKind==='greenFifth'&&!greenFifthCleared){greenFifthCleared=true;area='championRoad2';}
  const leagueIndex=battleKind.startsWith('league')?Number(battleKind.slice(6)):-1;
  if(battleKind==='red'){
   const f=getForm(chosen,progress.level);
   redHallOfFame.push({date:new Date().toISOString(),pokemon:f.name,dex:f.dex,starter:chosen,level:progress.level,ivs:{...playerIVs},evs:{...playerEVs},moves:[...playerMoves],round:(redHallOfFame.at(-1)?.round||0)+1});redCeremonyPending=true;
  }
  if(leagueIndex>=0){if(leagueIndex===4){area='palletTown';const f=getForm(chosen,progress.level);hallOfFame.push({date:new Date().toISOString(),pokemon:f.name,dex:f.dex,starter:chosen,level:progress.level,ivs:{...playerIVs},evs:{...playerEVs},moves:[...playerMoves],round:(hallOfFame.at(-1)?.round||0)+1});leagueStage=null;leagueCeremonyPending=true}else leagueStage=leagueIndex+1}
  const money=battleKind==='red'?5000:leagueIndex>=0?1800+leagueIndex*350:TRAINERS[battleKind].money;
  const finalEnemy=battle.enemies?.[battle.enemies.length-1];
  const level=finalEnemy?.level??(battleKind==='red'?96:leagueIndex>=0?67+leagueIndex*2:TRAINERS[battleKind].level);
  // One EXP reward on full trainer victory, based on final Pokemon only.
  gained=trainerExpEarned;
  // Experience for each defeated trainer Pokemon is awarded on knockout.
  if(sabrinaCleared&&!blaineCleared&&progress.level>=48)area='volcano';
  progress.money+=baseCashForWin(level);
  appendAdventureLog('💰 트레이너 승리 보상 '+baseCashForWin(level)+'원 획득');
  lastBattleReward={exp:gained,money:baseCashForWin(level)};
  lastPartyExp={...battleExpEarned};
  pendingRewardChoice=!activeWasCapped&&gained>0?{choices:drawThreeRewards(level,rewardCountBeforeVictory),rerolls:0,gym:!!GYM_BADGES[battleKind]}:null;
 }else{
  if(battleKind.startsWith('league'))leagueStage=null;
  trainerExpEarned=0;
  lastBattleReward={exp:0,money:0};
  lastPartyExp={};
 }
 // Party growth and move learning are processed together after combat.
 saveProgress();
 return {messages:battle.result==='victory'?(['+'+gained+' EXP 획득!'].concat(battleKind==='red'?['전설의 트레이너 레드에게 승리했어!','2차 엔딩 달성!']:battleKind.startsWith('league')?[LEAGUE_NAMES[Number(battleKind.slice(6))]+'에게 승리했어!',Number(battleKind.slice(6))===4?'명예의 전당에 등록됐어!':'다음 리그 대기실로 이동!']:battleKind==='misty'?['이슬이에게 승리! 블루배지를 획득했어!','호수 지역이 열렸어!']:battleKind==='greenReturn'?['라이벌 그린에게 승리했어!']:battleKind==='surge'?['마티즈에게 승리! 오렌지배지를 획득했어!','공동묘지 지역이 열렸어!']:battleKind==='greenFifth'?['라이벌 그린에게 승리했어!','챔피언로드 2로 이동했어!']:battleKind==='greenFourth'?['라이벌 그린에게 승리했어!','대도시에서 계속 모험해!']:battleKind==='greenThird'?['라이벌 그린에게 승리했어!','도시 지역이 열렸어!']:battleKind==='erika'?['민화에게 승리! 레인보우배지를 획득했어!','도로 지역이 열렸어!']:battleKind==='koga'?['독수에게 승리! 핑크배지를 획득했어!','대도시 지역이 열렸어!']:battleKind==='giovanni'?['비주기에게 승리! 그린배지를 획득했어!','챔피언로드가 열렸어!']:battleKind==='blaine'?['강연에게 승리! 크림슨배지를 획득했어!','이상한 숲 지역이 열렸어!']:battleKind==='sabrina'?['초련에게 승리! 골드배지를 획득했어!','바다 지역이 열렸어!']:['트레이너 승리!','새로운 지역이 열렸어!'])):['부상을 입었어. 치료가 필요해.','경험치 +0'],evolutions,learnQueue,badgeEarned,previousLevel:old,newLevel:progress.level};
}
const CHALLENGE_ORDER=['blue','brock','misty','greenReturn','surge','greenThird','erika','koga','greenFourth','sabrina','blaine','giovanni','greenFifth'];
function wildRewardLevelCap(){
 if(area==='championRoad2'&&hallOfFame.length===0)return 88;
 const current=nextTrainerKind();
 const index=CHALLENGE_ORDER.indexOf(current);
 return index>=0&&index<CHALLENGE_ORDER.length-1?TRAINERS[CHALLENGE_ORDER[index+1]].level-1:null;
}
function wildRewardCapped(member=leaderMember()){const cap=wildRewardLevelCap();return cap!==null&&member.level>=cap;}
function refreshLevelCapIndicator(){
 const cap=wildRewardLevelCap();
 for(const id of ['homeLevel','playerLevel']){
  const el=$(id);if(!el)continue;
  const member=id==='homeLevel'?leaderMember():activeMember();
  const capped=cap!==null&&member.level>=cap;
  el.classList.toggle('level-capped',capped);
  el.title=capped?'성장 제한: 다음 도전을 완료하면 야생 경험치와 보상이 다시 열려.':'';
 }
}
function nextTrainerKind(){return !blueCleared?'blue':!brockCleared?'brock':!mistyCleared?'misty':!greenReturnCleared?'greenReturn':!surgeCleared?'surge':!greenThirdCleared?'greenThird':!erikaCleared?'erika':!kogaCleared?'koga':!greenFourthCleared?'greenFourth':!sabrinaCleared?'sabrina':!blaineCleared?'blaine':!giovanniCleared?'giovanni':!greenFifthCleared?'greenFifth':null;}
function chooseRivalStarter(playerId){const pool=RIVAL_POOL.filter(p=>p.id!==playerId);return pool[Math.floor(Math.random()*pool.length)].id;}
let battlePlayerLevelStart=1;
let pendingTrainerIntro=null;
let challengeNotified=Array.isArray(saved?.challengeNotified)?saved.challengeNotified.filter(k=>CHALLENGE_ORDER.includes(k)):[];
function showChallengeUnlockNotice(){
 const kind=nextTrainerKind();
 if(!kind||!teamMembers().some(m=>m.level>=TRAINERS[kind].level)||challengeNotified.includes(kind)||animating||learningBusy||pendingRewardChoice||pendingTrainerIntro)return;
 challengeNotified.push(kind);
 saveProgress();
 const name=TRAINERS[kind].name;
 $('challengeUnlockTitle').textContent=name+'에게 도전 가능!';
 $('challengeUnlockOverlay').hidden=false;
}

function challengeTrainer(){
 if(hallOfFame.length>0){showAdventure();return;}
 const kind=nextTrainerKind();
 if(!livingMembers().length||pendingRewardChoice||learningBusy||animating||pendingTrainerIntro)return;
 if(!kind||!teamMembers().some(m=>m.level>=TRAINERS[kind].level))return;
 pendingTrainerIntro=kind;
 const trainer=TRAINERS[kind];
 $('trainerIntroName').textContent=trainer.name;
 $('trainerIntroText').textContent=kind==='blue'||kind==='greenReturn'||kind==='greenThird'||kind==='greenFourth'||kind==='greenFifth'?'라이벌 그린이 배틀을 신청했다!':kind==='brock'?'바위 체육관 관장 웅이 승부를 걸어왔다!':kind==='misty'?'물 체육관 관장 이슬이가 승부를 걸어왔다!':kind==='erika'?'풀 체육관 관장 민화가 승부를 걸어왔다!':kind==='koga'?'독 체육관 관장 독수가 승부를 걸어왔다!':kind==='sabrina'?'에스퍼 체육관 관장 초련이 승부를 걸어왔다!':kind==='giovanni'?'마지막 체육관 관장 비주기가 승부를 걸어왔다!':kind==='blaine'?'불꽃 체육관 관장 강연이 승부를 걸어왔다!':'전기 체육관 관장 마티즈가 승부를 걸어왔다!';
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
 if(animating||learningBusy||!livingMembers().length)return;
 normalizeLivingLead();
 // Use the current location's scenery for wild and trainer battles alike.
 const arena=document.querySelector('#battleScreen .arena');
 arena.classList.remove('area-grass','area-forest','area-cave','area-lake','area-cemetery','area-town','area-road','area-city','area-sea','area-volcano','area-strangeForest','area-championRoad','area-championRoad2','area-palletTown','area-rocketBase','area-farawayIsland','area-mountSilver');
 arena.classList.add('area-'+area);
 battleKind=kind;battleOpponent=null;defeatedEnemies=0;trainerExpEarned=0;
 battleParticipants=new Set([leaderMember().key]);
 battleExpEarned={};
 activeBattleKey=leaderMember().key;
 battleRoster=new Map();
 const s=STARTERS.find(x=>x.id===chosen);
 const form=getForm(chosen,progress.level);
 const wild=kind==='wild'?pickEncounter(area):null;
 const cap=area==='grass'?7:area==='forest'?13:area==='cave'?19:area==='lake'?24:area==='cemetery'?27:area==='town'?31:area==='road'?37:area==='city'?44:area==='sea'?48:area==='volcano'?52:area==='strangeForest'?57:area==='championRoad'?62:area==='championRoad2'?75:area==='palletTown'?80:area==='rocketBase'?95:area==='farawayIsland'?90:area==='mountSilver'?100:46;
 const level=Math.max(1,Math.min(cap,leaderMember().level-Math.floor(Math.random()*6)));
 wildEnemy=wild?{...wild,level}:null;
 const leader=leaderMember();
 const player=makeMemberFighter(leader);
 const zeroIV={hp:0,attack:0,defense:0,speed:0};
 let enemies;
 if(kind==='blue'){
  if(!blueChoice){blueChoice=chooseRivalStarter(chosen);saveProgress();}
  const other=getForm(blueChoice,7);
  enemies=[trainerFighter(other.name,other.dex,7,other.base,initialMoves(blueChoice))];
  battleOpponent='blue';
 }else if(kind==='brock'){
  enemies=[trainerFighter('꼬마돌',74,11,{"hp":40,"attack":80,"defense":65,"speed":20}),trainerFighter('롱스톤',95,12,{"hp":35,"attack":45,"defense":103,"speed":70})];
  battleOpponent='brock';
 }else if(kind==='misty'){
  enemies=[trainerFighter('별가사리',120,15,{hp:30,attack:70,defense:63,speed:85},['tackle','waterGun']),trainerFighter('아쿠스타',121,17,{hp:60,attack:100,defense:83,speed:115},['waterPulse','swift'])];
  battleOpponent='misty';
 }else if(kind==='greenReturn'){
  const rivalForm=getForm(blueChoice,19);
  const rivalMoves=availableMoves(blueChoice,19).slice(-4).map(move=>move.id);
  enemies=[trainerFighter('피죤',17,17,{hp:63,attack:60,defense:55,speed:71},['quickAttack','swift']),trainerFighter('레트라',20,16,{hp:55,attack:81,defense:60,speed:97},['tackle','quickAttack']),trainerFighter(rivalForm.name,rivalForm.dex,19,rivalForm.base,rivalMoves.length?rivalMoves:['tackle'])];
  battleOpponent='greenReturn';
 }else if(kind==='surge'){
  enemies=[trainerFighter('찌리리공',100,22,{hp:40,attack:55,defense:60,speed:100},['tackle','thunderWave']),trainerFighter('코일',81,21,{hp:25,attack:95,defense:63,speed:45},['tackle','thunderbolt']),trainerFighter('라이츄',26,24,{hp:60,attack:90,defense:68,speed:110},['quickAttack','thunderbolt'])];
  battleOpponent='surge';
 }else if(kind==='greenThird'){
  const rivalForm=getForm(blueChoice,27),rivalMoves=availableMoves(blueChoice,27).slice(-4).map(m=>m.id);
  enemies=[trainerFighter('피죤',17,25,{hp:63,attack:60,defense:55,speed:71},['quickAttack','swift']),trainerFighter('캐이시',63,15,{hp:25,attack:105,defense:35,speed:90},['confusion']),trainerFighter('갸라도스',130,20,{hp:95,attack:125,defense:90,speed:81},['tackle','bite']),trainerFighter(rivalForm.name,rivalForm.dex,27,rivalForm.base,rivalMoves.length?rivalMoves:['tackle'])];
  battleOpponent='greenThird';
 }else if(kind==='red'){
  enemies=[
   trainerFighter('피카츄',25,99,{hp:35,attack:85,defense:50,speed:110},['thunderbolt','quickAttack']),
   trainerFighter('잠만보',143,92,{hp:160,attack:110,defense:100,speed:30},['tackle','bite']),
   trainerFighter('라프라스',131,95,{hp:130,attack:85,defense:90,speed:60},['waterPulse','bite']),
   trainerFighter('이상해꽃',3,96,{hp:80,attack:100,defense:100,speed:80},['razorLeaf','vineWhip']),
   trainerFighter('리자몽',6,96,{hp:78,attack:109,defense:82,speed:100},['flamethrower','swift']),
   trainerFighter('거북왕',9,96,{hp:79,attack:100,defense:110,speed:78},['waterPulse','tackle'])
  ];battleOpponent='red';
 }else if(kind.startsWith('league')){
  const n=Number(kind.slice(6));
  enemies=LEAGUE_TEAMS[n].map(([name,dex,lv,hp,attack,defense,speed])=>trainerFighter(name,dex,lv,{hp,attack,defense,speed},['tackle','bite']));
  if(n===4){const rival=getForm(blueChoice,75);enemies.push(trainerFighter(rival.name,rival.dex,75,rival.base,availableMoves(blueChoice,75).slice(-4).map(m=>m.id)))}
  battleOpponent=kind;
 }else if(kind==='greenFifth'){
  const rivalForm=getForm(blueChoice,62),rivalMoves=availableMoves(blueChoice,62).slice(-4).map(m=>m.id);
  enemies=[trainerFighter('피죤투',18,60,{hp:83,attack:80,defense:75,speed:101},['quickAttack','swift']),trainerFighter('아라리',102,59,{hp:60,attack:40,defense:65,speed:40},['confusion','tackle']),trainerFighter('스라크',123,61,{hp:70,attack:110,defense:80,speed:105},['quickAttack','tackle']),trainerFighter('윈디',59,56,{hp:90,attack:110,defense:80,speed:95},['flamethrower','bite']),trainerFighter(rivalForm.name,rivalForm.dex,62,rivalForm.base,rivalMoves.length?rivalMoves:['tackle'])];
  battleOpponent='greenFifth';
 }else if(kind==='greenFourth'){
  const rivalForm=getForm(blueChoice,40),rivalMoves=availableMoves(blueChoice,40).slice(-4).map(m=>m.id);
  enemies=[trainerFighter('피죤투',18,36,{hp:83,attack:80,defense:75,speed:101},['quickAttack','swift']),trainerFighter('스라크',123,39,{hp:70,attack:110,defense:80,speed:105},['quickAttack','tackle']),trainerFighter('윤겔라',64,35,{hp:40,attack:120,defense:50,speed:105},['confusion','psybeam']),trainerFighter(rivalForm.name,rivalForm.dex,40,rivalForm.base,rivalMoves.length?rivalMoves:['tackle'])];
  battleOpponent='greenFourth';
 }else if(kind==='erika'){
  enemies=[trainerFighter('우츠보트',71,30,{hp:80,attack:105,defense:63,speed:70},['vineWhip','razorLeaf']),trainerFighter('덩쿠리',114,26,{hp:65,attack:100,defense:83,speed:60},['vineWhip','tackle']),trainerFighter('라플레시아',45,31,{hp:75,attack:110,defense:88,speed:50},['razorLeaf','poisonPowder'])];
  battleOpponent='erika';
 }else if(kind==='koga'){
  enemies=[trainerFighter('질뻐기',89,36,{hp:105,attack:105,defense:88,speed:50},['tackle','poisonPowder']),trainerFighter('도나리',49,36,{hp:70,attack:90,defense:75,speed:90},['psybeam','poisonPowder']),trainerFighter('또도가스',110,37,{hp:65,attack:90,defense:108,speed:60},['tackle','sludgeBomb'])];
  battleOpponent='koga';
 }else if(kind==='giovanni'){
  enemies=[trainerFighter('닥트리오',51,55,{hp:35,attack:100,defense:50,speed:120},['tackle','bite']),trainerFighter('캥카',115,54,{hp:105,attack:95,defense:80,speed:90},['bite','tackle']),trainerFighter('페르시온',53,56,{hp:65,attack:70,defense:65,speed:115},['bite','quickAttack']),trainerFighter('니드킹',34,55,{hp:81,attack:102,defense:77,speed:85},['tackle','bite']),trainerFighter('코뿌리',112,57,{hp:105,attack:130,defense:113,speed:40},['tackle','bite'])];
  battleOpponent='giovanni';
 }else if(kind==='blaine'){
  enemies=[trainerFighter('나인테일',38,50,{hp:73,attack:81,defense:88,speed:100},['flamethrower','quickAttack']),trainerFighter('마그마',126,47,{hp:65,attack:100,defense:70,speed:93},['flamethrower','tackle']),trainerFighter('날쌩마',78,50,{hp:65,attack:100,defense:75,speed:105},['flamethrower','quickAttack']),trainerFighter('윈디',59,51,{hp:90,attack:110,defense:80,speed:95},['flamethrower','bite'])];
  battleOpponent='blaine';
 }else if(kind==='sabrina'){
  enemies=[trainerFighter('캐이시',63,44,{hp:25,attack:105,defense:35,speed:90},['confusion']),trainerFighter('윤겔라',64,44,{hp:40,attack:120,defense:50,speed:105},['confusion','psybeam']),trainerFighter('후딘',65,44,{hp:55,attack:135,defense:75,speed:120},['psybeam','recover'])];
  battleOpponent='sabrina';
 }else{
  const enemy=createFighter({id:'wild-'+wild.dex,name:wild.name,level,friendship:0,stats:calculateStats(wild.base,level,zeroIV,{}),moveIds:recentWildMoves(wild.dex,level)});enemy.rare=wild.rare;enemy.catchMultiplier=pokemonCatchMultiplier(wild.dex,wild.rare);enemies=[enemy];
 }
 player.hp=leaderHp();
 battleRoster.set(leader.key,player);
 battle=createBattle(player,enemies,{items:0,balls:0,wild:kind==='wild'});rewardClaimed=false;menuPage='main';
 if(wild)registerEncounter(wild.dex);else if(kind==='blue')registerEncounter(getForm(blueChoice,7).dex);else if(kind==='brock')registerEncounter(74);else if(kind==='misty')registerEncounter(120);else if(kind==='greenReturn')registerEncounter(17);else if(kind==='surge')registerEncounter(100);else if(kind==='greenThird')registerEncounter(17);else if(kind==='greenFourth')registerEncounter(18);else if(kind==='greenFifth')registerEncounter(18);else if(kind==='erika')registerEncounter(71);else if(kind==='koga')registerEncounter(89);else if(kind==='sabrina')registerEncounter(63);else if(kind==='blaine')registerEncounter(38);else if(kind==='giovanni')registerEncounter(51);
 visualSprite('enemy').classList.remove('enemy-captured','capture-absorbing','capture-escaping');
 $('captureBall').className='capture-ball';$('captureBall').hidden=true;$('captureBall').removeAttribute('style');
 $('captureFlash').className='capture-flash';$('captureFlash').hidden=true;$('captureSuccessNotice').hidden=true;
 const first=enemies[0];
 const opponentName=kind==='red'?'레드':kind.startsWith('league')?LEAGUE_NAMES[Number(kind.slice(6))]:TRAINERS[kind]?.name||'트레이너';
 battle.log.push(kind==='wild'?'⚔️ 야생 '+wild.name+'이(가) 나타났다!':opponentName+'의 도전!');
 shownHp={player:player.hp,enemy:first.hp};
 $('playerName').textContent=player.name;$('promptName').textContent=player.name;
 $('enemyName').textContent=first.name;$('enemyCaughtMark').hidden=kind!=='wild'||!caughtSpecies.has(wild.dex);$('enemyLevel').textContent='LV '+first.level;$('playerLevel').textContent='LV '+player.level;refreshLevelCapIndicator();
 sprite('playerSprite',leader.dex,true,leader.starter?s.emoji:'⚔️');sprite('enemySprite',kind==='wild'?wild.dex:Number(first.id?.replace('trainer-',''))||100,false,kind==='wild'?'🐾':'⚔️');
 $('trainerName').textContent=kind==='wild'?'야생 포켓몬':opponentName;
 $('trainerPortrait').hidden=kind==='wild';
 if(kind!=='wild'){
  const image=kind==='red'?'https://play.pokemonshowdown.com/sprites/trainers/red.png':kind.startsWith('league')?'https://play.pokemonshowdown.com/sprites/trainers/'+(['lorelei','bruno','agatha','lance','blue'][Number(kind.slice(6))])+'.png':TRAINERS[kind]?.image;
  if(image){$('trainerPortrait').src=image;$('trainerPortrait').onerror=()=>{$('trainerPortrait').hidden=true;};}else $('trainerPortrait').hidden=true;
 }
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
 const m=leaderMember();for(const id of (m.starter?playerMoves:m.moves||[])){const chip=document.createElement('span');chip.className='learn-move-chip';chip.textContent=MOVES[id]?.name||id;target.append(chip);}
}
function canLearnNow(id){return availableMoves(chosen,progress.level).some(m=>m.id===id)&&!!MOVES[id];}
function moveInfo(id){const m=MOVES[id];return m.name+' · '+(m.power?'위력 '+m.power:'변화기')+' · 명중 '+Math.round((m.accuracy??1)*100)+'%';}
function updateBattleMoves(){
 saveProgress();renderHome();
 // The current battle has already ended when learning happens.
}
function resolveMoveChoice(newId,{allowSkip=true,source='level',member=null}={}){
 return new Promise(resolve=>{
  const layer=$('learnMoveOverlay'),choices=$('learnMoveChoices');
  choices.replaceChildren();$('learnMoveTitle').textContent=(member?.name||getForm(chosen,progress.level).name)+'은(는) '+MOVES[newId].name+'를 배우고 싶어!';
  $('learnMoveInfo').textContent=moveInfo(newId);
  $('learnMoveHelp').textContent='기술이 4개야. 잊을 기술을 하나 선택해줘.';
  function finish(oldId){layer.hidden=true;resolve(oldId);}
  for(const oldId of (member?.moves||playerMoves)){
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

function rewardChoiceText(choice){
 if(choice.kind==='ppAid')return '🧴 PP 에이드 · 선택한 포켓몬의 모든 기술 PP 즉시 최대 회복';
 if(choice.kind==='rareCandy')return '🍬 이상한 사탕 · 선택한 포켓몬 레벨 +1 (최대 Lv.100)';
 if(choice.kind==='ppMax')return '✨ PP 맥스 · 선택한 포켓몬의 모든 기술 최대 PP 영구 +20% (소수점 올림)';
 if(choice.kind==='goldCap')return '🥇 금색 병뚜껑 · 선택한 포켓몬의 모든 개체값 최대 강화';
 if(choice.kind==='maxReviveReward')return '🌟 기력의덩어리 · 기절한 포켓몬 1마리 선택 · HP 100% 부활 (즉시 사용)';
 if(choice.kind==='sacredAshReward')return '✨ 성스러운 분말 · 모든 포켓몬 HP 100% 부활 및 회복 (즉시 사용)';
 if(choice.kind==='item'&&choice.id==='partySlotA')return '👥 포켓몬 추가 슬롯A · 동료 슬롯 2번째 해금';
 if(choice.kind==='item'&&choice.id==='partySlotB')return '👥 포켓몬 추가 슬롯B · 동료 슬롯 3번째 해금';
 if(choice.kind==='item'&&choice.id==='secretSwitch')return '🔘 비밀 스위치 · 비밀기지 이동 해금 (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='oldSeaMap')return '🗺️ 오래된해도 · 환상의 섬 이동 해금 (중요 아이템)';
 if(choice.kind==='silverCap')return '🥈 은색 병뚜껑 · 원하는 스탯의 개체값을 최대로 강화';
 if(choice.kind==='ev')return '💊 '+({hp:'맥스업 · HP',attack:'타우린 · ATK',defense:'사포닌 · DEF',speed:'알칼로이드 · SPD'}[choice.stat]||'노력치')+' +'+(choice.amount||2)+' 즉시 적용';
 if(choice.kind==='exp')return '🍬 경험치 +'+choice.amount+' 즉시 획득';
 if(choice.kind==='power')return (choice.icon||'✨')+' '+(BOOST_INFO[choice.effect||'attack']?.name||'플러스파워')+' · 5턴 '+({attack:'공격력 +10%',accuracy:'명중률 +10%p',critical:'급소 확률 +10%p',defense:'방어력 +10%'}[choice.effect||'attack']);
 if(choice.kind==='cash')return '💰 추가 상금 +'+choice.amount.toLocaleString('ko-KR')+'원';
 if(choice.kind==='heal')return choice.full?'❤️ 즉시 HP 100% 회복':(choice.icon||'🧪')+' 즉시 HP '+choice.amount+' 회복';
 const item=SHOP_ITEMS.find(x=>x.id===choice.id);
 return (item?.icon||'🎁')+' '+(item?.name||'아이템')+' ×'+choice.quantity;
}
// Pokemon item sprites for the selectable reward cards.
function rewardImageName(choice){
 if(choice.kind==='ppAid')return 'max-ether';
 if(choice.kind==='rareCandy')return 'rare-candy';
 if(choice.kind==='ppMax')return 'pp-max';
 if(choice.kind==='goldCap')return 'gold-bottle-cap';
 if(choice.kind==='maxReviveReward')return 'max-revive';
 if(choice.kind==='sacredAshReward')return 'sacred-ash';
 if(choice.kind==='power')return {attack:'x-attack',accuracy:'x-accuracy',critical:'dire-hit',defense:'x-defend'}[choice.effect||'attack'];
 if(choice.kind==='item')return {partySlotA:'upgrade',partySlotB:'upgrade',secretSwitch:'secret-key',oldSeaMap:'old-sea-map',pokeBall:'poke-ball',greatBall:'great-ball',ultraBall:'ultra-ball',masterBall:'master-ball'}[choice.id];
 if(choice.kind==='heal')return choice.full?'max-potion':choice.amount<=20?'potion':choice.amount<=60?'super-potion':'hyper-potion';
 return null;
}
function rewardChoiceName(choice){
 if(choice.kind==='ppAid')return 'PP 에이드';
 if(choice.kind==='rareCandy')return '이상한 사탕';
 if(choice.kind==='ppMax')return 'PP 맥스';
 if(choice.kind==='goldCap')return '금색 병뚜껑';
 if(choice.kind==='maxReviveReward')return '기력의덩어리';
 if(choice.kind==='sacredAshReward')return '성스러운 분말';
 if(choice.kind==='silverCap')return '은색 병뚜껑';
 if(choice.kind==='ev')return ({hp:'맥스업',attack:'타우린',defense:'사포닌',speed:'알칼로이드'})[choice.stat]||'영양제';
 if(choice.kind==='exp')return '경험치 사탕';
 if(choice.kind==='power')return BOOST_INFO[choice.effect||'attack']?.name||'플러스파워';
 if(choice.kind==='cash')return '추가 상금';
 if(choice.kind==='heal')return choice.full?'전체 회복':'회복약';
 return SHOP_ITEMS.find(item=>item.id===choice.id)?.name||'랜덤 보상';
}
function showRewardDescription(choice){
 // The explanation never claims the reward or consumes a reroll.
 partyOverlay('📖 '+rewardChoiceName(choice),rewardChoiceText(choice),[
  {text:'확인',action:()=>{}}
 ]);
}
function showRewardChoices(){
 const layer=$('rewardChoiceOverlay'),options=$('rewardChoiceOptions');
 if(!pendingRewardChoice){layer.hidden=true;return;}
 options.replaceChildren();
 $('rewardChoiceHeading').textContent=pendingRewardChoice.gym?'GYM CLEAR':'BATTLE WIN!';
 pendingRewardChoice.choices.forEach((choice,index)=>{
  const card=document.createElement('div');
  card.className='reward-choice-item reward-tier-'+choice.tier;
  const unique=choice.kind==='item'&&SHOP_ITEMS.find(item=>item.id===choice.id)?.category==='key';
  const unavailable=unique&&(inventory[choice.id]===1||choice.id==='partySlotB'&&inventory.partySlotA!==1)||['maxReviveReward','sacredAshReward'].includes(choice.kind)&&!(teamMembers().length>=2&&teamMembers().some(m=>memberHp(m)===0));
  const tag=document.createElement('strong');tag.className='reward-tier-label';tag.textContent=REWARD_TIERS[choice.tier]?.label||'일반';
  const pick=document.createElement('button');pick.type='button';pick.className='reward-pick';
  pick.disabled=unavailable;
  pick.setAttribute('aria-label',rewardChoiceName(choice)+' 보상 선택');
  const imageName=rewardImageName(choice);
  if(imageName){
   const img=document.createElement('img');img.className='reward-item-sprite';
   img.src='https://play.pokemonshowdown.com/sprites/itemicons/'+imageName+'.png';
   img.alt='';img.loading='lazy';
   img.onerror=()=>{img.replaceWith(document.createTextNode(choice.icon||'🎁'));};
   pick.append(img);
  }else{
   const picture=document.createElement('span');picture.className='reward-placeholder-icon';
   picture.textContent=choice.icon||'🎁';pick.append(picture);
  }
  const name=document.createElement('span');name.className='reward-item-name';name.textContent=rewardChoiceName(choice);
  pick.append(name);pick.onclick=()=>claimRewardChoice(index);
  const info=document.createElement('button');info.type='button';info.className='reward-info-button';
  info.textContent='설명';info.setAttribute('aria-label',rewardChoiceName(choice)+' 설명 보기');
  info.onclick=()=>showRewardDescription(choice);
  card.append(tag,pick,info);options.append(card);
 });
 const cost=rewardRerollCost(pendingRewardChoice.rerolls);
 const reroll=$('rewardReroll');
 reroll.disabled=!Number.isFinite(cost)||progress.money<cost;
 reroll.textContent='🔄 리롤 · '+(Number.isFinite(cost)?cost.toLocaleString('ko-KR')+'원':'비용 한도 초과');
 $('rewardRerollInfo').textContent='보유금 '+progress.money.toLocaleString('ko-KR')+'원 · 이번 보상 리롤 '+pendingRewardChoice.rerolls+'회 · 리롤마다 비용 2배';
 layer.hidden=false;
}
function rerollRewards(){
 if(!pendingRewardChoice)return;
 const cost=rewardRerollCost(pendingRewardChoice.rerolls);
 if(!Number.isFinite(cost)||progress.money<cost)return;
 progress.money-=cost;
 pendingRewardChoice.choices=drawThreeRewards(progress.level,pendingRewardChoice.choices.length);
 pendingRewardChoice.rerolls++;
 saveProgress();
 showRewardChoices();
}
function showSilverCapStatChoice(member=leaderMember()){
 const layer=$('silverCapOverlay'),options=$('silverCapOptions');
 options.replaceChildren();
 for(const stat of EV_STATS){
  const b=document.createElement('button');
  b.type='button';b.className='silver-cap-option';
  b.textContent=STAT_LABELS[stat]+' · 개체값 최대 강화';
  const targetIVs=member.starter?playerIVs:companions.find(x=>x.family===member.family)?.ivs;
  b.disabled=!targetIVs||targetIVs[stat]===16;
  b.onclick=()=>{
   if(!targetIVs)return;
   targetIVs[stat]=16;
   appendAdventureLog('🥈 '+member.name+'의 '+STAT_LABELS[stat]+' 개체값 최대 강화!');
   layer.hidden=true;
   pendingRewardChoice=null;
   saveProgress();
   $('rewardChoiceOverlay').hidden=true;
   renderHome();
  };
  options.append(b);
 }
 $('silverCapCancel').onclick=()=>{layer.hidden=true;$('rewardChoiceOverlay').hidden=false;};
 layer.hidden=false;
 $('rewardChoiceOverlay').hidden=true;
}
function choosePermanentTarget(choice){
 $('rewardChoiceOverlay').hidden=true;
 partyOverlay('🎁 보상 적용 대상','보상을 받을 포켓몬 한 마리를 선택해.',[
 ...teamMembers().map(m=>({text:m.name+' Lv.'+m.level,action:()=>{
  if(choice.kind==='silverCap'){showSilverCapStatChoice(m);return;}
  if(choice.kind==='goldCap'){
   const iv=m.starter?playerIVs:companions.find(x=>x.family===m.family)?.ivs;
   if(!iv){$('rewardChoiceOverlay').hidden=false;return;}
   for(const stat of EV_STATS)iv[stat]=16;
   appendAdventureLog('🥇 '+m.name+' 모든 개체값 최대 강화');
  }
  if(choice.kind==='ppMax'){
   ppMaxBoosts[m.key]=Math.min(20,(Number(ppMaxBoosts[m.key])||0)+1);
   const pp=memberMovePp(m);
   for(const id of (m.starter?playerMoves:m.moves||[]))if(MOVES[id])pp[id]=Math.min(maxMovePp(m.key,id),pp[id]??maxMovePp(m.key,id));
   appendAdventureLog('✨ '+m.name+' 모든 기술 최대 PP +20%');
  }
  if(choice.kind==='ppAid'){
   const pp=memberMovePp(m);
   for(const id of (m.starter?playerMoves:m.moves||[]))if(MOVES[id])pp[id]=maxMovePp(m.key,id);
   const fighter=battleRoster.get(m.key);
   if(fighter)for(const id of fighter.moveIds)fighter.pp[id]=maxMovePp(m.key,id);
   appendAdventureLog('🧴 '+m.name+' 모든 기술 PP 회복');
  }
  if(choice.kind==='rareCandy'){
   const member=m.starter?progress:companions.find(x=>x.family===m.family);
   if(member&&member.level<100){const before=member.level;member.level++;member.exp=0;pendingPartyGrowth.push({key:m.key,name:m.name,before,after:member.level,starter:m.starter,family:m.family});appendAdventureLog('🍬 '+m.name+' 레벨 +1');}
  }
  if(choice.kind==='ev'){
   const stat=choice.stat,ev=m.starter?playerEVs:companions.find(x=>x.family===m.family)?.evs;
   if(!ev)return;
   const total=Object.values(ev).reduce((a,b)=>a+b,0);
   const gain=Math.min(choice.amount||2,100-ev[stat],216-total);
   if(gain<=0){alert('선택한 포켓몬의 노력치가 최대치야.');$('rewardChoiceOverlay').hidden=false;return;}
   ev[stat]+=gain;
   appendAdventureLog('💊 '+m.name+' '+STAT_LABELS[stat]+' 노력치 +'+gain);
  }
  if(choice.kind==='exp'){
   const before=m.starter?progress.level:companions.find(x=>x.family===m.family).level;
   if(m.starter){progress.exp+=choice.amount;while(progress.level<100&&progress.exp>=levelNeed(progress.level)){progress.exp-=levelNeed(progress.level);progress.level++;}if(progress.level===100)progress.exp=0;}
   else {const found=companions.find(x=>x.family===m.family);found.exp=(found.exp||0)+choice.amount;while(found.level<100&&found.exp>=levelNeed(found.level)){found.exp-=levelNeed(found.level);found.level++;}if(found.level===100)found.exp=0;}
   const after=m.starter?progress.level:companions.find(x=>x.family===m.family).level;
   if(after>before)pendingPartyGrowth.push({key:m.key,name:m.name,before,after,starter:m.starter,family:m.family});
   appendAdventureLog('🍬 '+m.name+' 경험치 +'+choice.amount);
  }
  pendingRewardChoice=null;saveProgress();renderHome();
  if(pendingPartyGrowth.length){const tasks=pendingPartyGrowth.splice(0);processPartyGrowth(tasks);}
 }})),{text:'취소',action:()=>{$('rewardChoiceOverlay').hidden=false;}}
 ]);
}
function completeInstantRecoveryReward(choice,details){
 appendAdventureLog('🎁 랜덤 보상: '+rewardChoiceText(choice)+(details?' · '+details:''));
 injured=!livingMembers().length;
 pendingRewardChoice=null;
 saveProgress();
 $('rewardChoiceOverlay').hidden=true;
 if(redCeremonyPending){showRedEnding();}else if(leagueCeremonyPending){leagueCeremonyPending=false;saveProgress();showHallOfFame();}
 renderHome();
 showChallengeUnlockNotice();
}
function claimRewardChoice(index){
 if(!pendingRewardChoice||!Number.isInteger(index))return;
 const choice=pendingRewardChoice.choices[index];
 if(!choice)return;
 if(choice.kind==='maxReviveReward'||choice.kind==='sacredAshReward'){
  const members=teamMembers(),fainted=members.filter(m=>memberHp(m)===0);
  if(members.length<2||!fainted.length){alert('포켓몬 2마리 이상 보유하고 기절한 동료가 있을 때만 사용할 수 있어.');showRewardChoices();return;}
  if(choice.kind==='sacredAshReward'){
   for(const m of members)setMemberHp(m,memberMaxHp(m));
   completeInstantRecoveryReward(choice,'파티 전원 회복');
   return;
  }
  $('rewardChoiceOverlay').hidden=true;
  partyOverlay('🌟 기력의덩어리','최대 HP로 부활시킬 기절한 포켓몬을 선택해.',[
   ...fainted.map(m=>({text:m.name+' Lv.'+m.level+' · HP 0/'+memberMaxHp(m),action:()=>{
    if(memberHp(m)!==0){showRewardChoices();return;}
    setMemberHp(m,memberMaxHp(m));
    completeInstantRecoveryReward(choice,m.name+' 부활');
   }})),
   {text:'취소',action:()=>{showRewardChoices();}}
  ]);
  return;
 }
 if(choice.kind==='heal'){
  const targets=teamMembers().filter(m=>memberHp(m)>0&&memberHp(m)<memberMaxHp(m));
  if(!targets.length){alert('HP 회복이 필요한 포켓몬이 없어. 다른 보상을 골라줘.');return;}
  $('rewardChoiceOverlay').hidden=true;
  partyOverlay('❤️ '+rewardChoiceName(choice),'즉시 회복할 포켓몬을 선택해.',[
   ...targets.map(m=>({text:m.name+' Lv.'+m.level+' · HP '+memberHp(m)+'/'+memberMaxHp(m),action:()=>{
    const now=teamMembers().find(x=>x.key===m.key);
    if(!now||!pendingRewardChoice){showRewardChoices();return;}
    setMemberHp(now,choice.full?memberMaxHp(now):Math.min(memberMaxHp(now),memberHp(now)+choice.amount));
    completeInstantRecoveryReward(choice,now.name+' HP 회복');
   }})),
   {text:'취소',action:()=>showRewardChoices()}
  ]);
  return;
 }
 if(['silverCap','ev','exp','ppAid','rareCandy','ppMax','goldCap'].includes(choice.kind)){
  choosePermanentTarget(choice);
  return;
 }else if(choice.kind==='ev'){
  const stat=choice.stat;
  if(!EV_STATS.includes(stat))return;
  const total=Object.values(playerEVs).reduce((sum,n)=>sum+n,0);
  const gain=Math.min(choice.amount||2,100-playerEVs[stat],216-total);
  playerEVs[stat]+=gain;
  // Preserve HP lost as maximum HP increases; never auto-heal via EV rewards.
  if(storedHp!==null){
   const newMax=calculateStats(getForm(chosen,progress.level).base,progress.level,playerIVs,playerEVs).hp;
   storedHp=Math.min(newMax,storedHp);
  }
 }else if(choice.kind==='exp'){
  progress.exp+=choice.amount;
  while(progress.level<100&&progress.exp>=levelNeed(progress.level)){
   progress.exp-=levelNeed(progress.level);progress.level++;
  }
  if(progress.level===100)progress.exp=0;
  playerMoves=migrateMoves(chosen,progress.level);
  storedHp=null===storedHp?null:Math.min(calculateStats(getForm(chosen,progress.level).base,progress.level,playerIVs,playerEVs).hp,storedHp);
 }else if(choice.kind==='power'){
  activeBoosts[BOOST_INFO[choice.effect]?choice.effect:'attack'].push(5);
 }else if(choice.kind==='cash'){
  progress.money+=choice.amount;
  if(lastBattleReward)lastBattleReward.money+=choice.amount;
 }else if(choice.kind==='heal'){
  const maxHp=calculateStats(getForm(chosen,progress.level).base,progress.level,playerIVs,playerEVs).hp;
  const currentHp=storedHp===null?maxHp:Math.max(0,Math.min(maxHp,storedHp));
  storedHp=choice.full?maxHp:Math.min(maxHp,currentHp+choice.amount);
 }else if(choice.kind==='item'&&Object.hasOwn(inventory,choice.id)){
  const item=SHOP_ITEMS.find(item=>item.id===choice.id);
  if(item?.category==='key'){
   if(inventory[choice.id]===1 || choice.id==='partySlotB'&&inventory.partySlotA!==1){
    alert('이미 보유한 중요 아이템이거나 슬롯A가 먼저 필요해. 다른 보상을 선택해줘.');return;
   }
   inventory[choice.id]=1;
  }else inventory[choice.id]=Math.min(99,inventory[choice.id]+choice.quantity);
 }else return;
 appendAdventureLog('🎁 랜덤 보상: '+rewardChoiceText(choice));
 pendingRewardChoice=null;
 saveProgress();
 $('rewardChoiceOverlay').hidden=true;
 if(redCeremonyPending){showRedEnding();}else if(leagueCeremonyPending){leagueCeremonyPending=false;saveProgress();showHallOfFame();}
 renderHome();
 showChallengeUnlockNotice();
}
let collectionTab='dex';
function showCollection(tab='dex'){
 if(animating||learningBusy||pendingRewardChoice)return;
 collectionTab=['dex','achievements','trainers'].includes(tab)?tab:'dex';
 showScreen('home');$('homeScreen').hidden=true;$('collectionScreen').hidden=false;
 renderCollection();window.scrollTo({top:0,behavior:'instant'});
}
function renderCollection(){
 return renderCollectionView({$,collectionTab,capturedPokemon,caughtSpecies,seenPokemon,blueCleared,brockCleared,mistyCleared,greenReturnCleared,surgeCleared,greenThirdCleared,erikaCleared,kogaCleared,sabrinaCleared});
}
function renderCaptures(){
 if(!$('captureCount'))return;
 $('captureCount').textContent=String(capturedPokemon.length);
 const list=$('captureList');list.replaceChildren();
 if(!capturedPokemon.length){list.textContent='아직 포획한 포켓몬이 없어.';return;}
 for(const entry of capturedPokemon.slice(-12).reverse()){
  const chip=document.createElement('span');chip.className='capture-chip';chip.textContent=entry.name+' Lv.'+entry.level;list.append(chip);
 }
 if(capturedPokemon.length>12){const extra=document.createElement('span');extra.textContent='외 '+(capturedPokemon.length-12)+'마리';list.append(extra);}
}
let inventoryMode='bag';
let inventoryCategory='heal';
function showShopTab(mode){
 if(animating||pendingRewardChoice||leagueStage!==null&&mode==='shop')return;
 inventoryMode=mode==='shop'?'shop':'bag';
 inventoryCategory='heal';
 showScreen('home');
 $('homeScreen').hidden=true;
 $('leagueScreen').hidden=true;
 $('shopScreen').hidden=false;
 window.scrollTo({top:0,behavior:'instant'});
 renderInventory();
}
function showItemCategory(category){
 if(!Object.hasOwn(ITEM_CATEGORY_LABELS,category))return;
 inventoryCategory=category;
 renderInventory();
}
function reviveMember(m){
 if(inventory.revive<1||memberHp(m)!==0)return false;
 const hp=Math.max(1,Math.floor(memberMaxHp(m)/2));
 if(m.starter)storedHp=hp;else{const found=companions.find(x=>x.family===m.family);if(found)found.hp=hp;}
 appendAdventureLog('💎 '+m.name+' 기력의조각 부활: '+hp+' HP');
 return true;
}
function requestBattleRevive(){
 if(animating||battle.ended||inventory.revive<1)return;
 const targets=teamMembers().filter(m=>m.key!==activeBattleKey&&memberHp(m)===0);
 if(!targets.length){alert('기절한 동료가 없어.');return;}
 partyOverlay('💎 기력의조각 사용','부활시킬 동료를 선택해. 사용하면 1턴이 지나.',[
 ...targets.map(m=>({text:m.name+' Lv.'+m.level+' · HP 50% 부활',action:()=>act({type:'revive',targetKey:m.key,itemId:'revive'})})),
 {text:'취소',action:()=>{}}
 ]);
}
function chooseRecoveryTarget(item){
 if(item.id==='ppAid'){
  const targets=teamMembers().filter(m=>(m.starter?playerMoves:m.moves||[]).some(id=>MOVES[id]&&(partyMovePp[m.key]?.[id]??maxMovePp(m.key,id))<maxMovePp(m.key,id)));
  if(!targets.length){alert('PP 회복이 필요한 포켓몬이 없어.');return;}
  partyOverlay('🧴 PP 에이드','모든 기술 PP를 회복할 포켓몬을 선택해.',[
   ...targets.map(m=>({text:m.name+' Lv.'+m.level,action:()=>{
    if(inventory.ppAid<1)return;
    const pp=memberMovePp(m);
    for(const id of (m.starter?playerMoves:m.moves||[]))if(MOVES[id])pp[id]=maxMovePp(m.key,id);
    const fighter=battleRoster.get(m.key);
    if(fighter)for(const id of fighter.moveIds)fighter.pp[id]=maxMovePp(m.key,id);
    inventory.ppAid--;appendAdventureLog('🧴 '+m.name+' 모든 기술 PP 회복');saveProgress();renderHome();renderInventory();
   }})),{text:'취소',action:()=>{}}
  ]);
  return;
 }
 const targets=teamMembers().filter(m=>item.id==='revive'?memberHp(m)===0:memberHp(m)>0&&memberHp(m)<memberMaxHp(m));
 if(!targets.length){alert(item.id==='revive'?'기절한 포켓몬이 없어.':'회복이 필요한 포켓몬이 없어.');return;}
 partyOverlay(item.icon+' '+item.name,'회복할 포켓몬을 선택해.',[
 ...targets.map(m=>({text:m.name+' Lv.'+m.level+' · HP '+memberHp(m)+'/'+memberMaxHp(m),action:()=>{
  if(inventory[item.id]<1)return;
  const before=memberHp(m),max=memberMaxHp(m);
  const hp=item.id==='revive'?Math.max(1,Math.floor(max/2)):Math.min(max,before+item.power);
  if(m.starter)storedHp=hp;else{const found=companions.find(x=>x.family===m.family);if(found)found.hp=hp;}
  inventory[item.id]--;
  if(item.id==='revive')injured=!livingMembers().length;
  appendAdventureLog(item.icon+' '+m.name+'에게 '+item.name+' 사용 (HP '+before+' → '+hp+')');
  normalizeLivingLead();saveProgress();renderHome();renderInventory();
 }})),{text:'취소',action:()=>{}}]);
}
function renderInventory(){
 return renderInventoryView({$,inventoryMode,inventoryCategory,inventory,progress,chosen,playerIVs,storedHp,saveProgress,renderHome,setStoredHp:hp=>{storedHp=hp;},chooseRecoveryTarget});
}
function showScreen(next){if(animating||learningBusy)return;screen=next;const logPanel=document.getElementById('adventureLogPanel');if(logPanel)logPanel.hidden=next!=='home';$('homeScreen').hidden=next!=='home';$('battleScreen').hidden=next!=='battle';$('leagueScreen').hidden=next!=='league';window.scrollTo({top:0,behavior:'instant'});if(next==='home')showChallengeUnlockNotice();}
function renderPowerStatus(){
 for(const id of ['homePlusPower','battlePlusPower']){
  const el=$(id);if(!el)continue;
  el.replaceChildren();
  for(const [key,info] of Object.entries(BOOST_INFO)){
   const durations=activeBoosts[key];
   if(!durations.length)continue;
   const chip=document.createElement('span');chip.className='boost-chip';
   const img=document.createElement('img');
   img.src='https://play.pokemonshowdown.com/sprites/itemicons/'+info.img+'.png';img.alt=info.name;img.onerror=()=>{img.replaceWith(document.createTextNode(key==='defense'?'🛡️':'✨'));};
   const txt=document.createElement('span');txt.textContent='+'+(durations.length*10)+'% · '+durations.join('/')+'턴';
   chip.title=info.name+' · '+durations.length+'중첩 · 개별 남은 턴 '+durations.join(', ');
   chip.append(img,txt);el.append(chip);
  }
  el.hidden=!el.childElementCount;
 }
}

function teamFamily(dex){
 return FAMILY_BY_DEX[dex]||ADDITIONAL_FAMILY_BY_DEX[dex]||STARTER_FAMILY_BY_DEX[dex]||'dex-'+dex;
}
function teamMembers(){
 const starter={key:'starter',name:getForm(chosen,progress.level).name,dex:getForm(chosen,progress.level).dex,level:progress.level,starter:true};
 const members=[starter,...companions.map(x=>({...x,key:'companion-'+x.family,starter:false}))];
 return members.sort((a,b)=>{
  const ia=partyOrder.indexOf(a.key),ib=partyOrder.indexOf(b.key);
  return (ia<0?999:ia)-(ib<0?999:ib);
 });
}
let battleParticipants=new Set();
let battleRoster=new Map();
let activeBattleKey=null;
function activeMember(){return teamMembers().find(m=>m.key===activeBattleKey)||leaderMember();}
function setMemberHp(m,hp){if(m.starter)storedHp=hp;else{const found=companions.find(x=>x.family===m.family);if(found)found.hp=hp;}}
function setActiveHp(hp){setMemberHp(activeMember(),hp);}
function memberHp(m){const max=memberMaxHp(m),hp=m.starter?storedHp:companions.find(x=>x.family===m.family)?.hp;return hp==null?max:Math.max(0,Math.min(max,hp));}
function livingMembers(){return teamMembers().filter(m=>memberHp(m)>0);}
function normalizeLivingLead(){const all=teamMembers(),first=all[0];if(first&&memberHp(first)===0){const next=all.find(m=>memberHp(m)>0);if(next){partyOrder=[next.key,...all.filter(m=>m.key!==next.key).map(m=>m.key)];saveProgress();}}}
function leaderMember(){return teamMembers()[0];}
function memberBase(m){return m.starter?getForm(chosen,progress.level).base:DEX_CATALOG.find(p=>p.dex===m.dex)?.base||{hp:60,attack:65,defense:60,speed:60};}
function memberMaxHp(m){return calculateStats(memberBase(m),m.level,m.starter?playerIVs:m.ivs,m.starter?playerEVs:m.evs||{}).hp;}
function leaderHp(){const m=leaderMember(),max=memberMaxHp(m),hp=m.starter?storedHp:companions.find(x=>x.family===m.family)?.hp;return hp==null?max:Math.max(0,Math.min(max,hp));}
function setLeaderHp(hp){const m=leaderMember();if(m.starter)storedHp=hp;else{const entry=companions.find(x=>x.family===m.family);if(entry)entry.hp=hp;}}
function maxMovePp(key,id){return MOVES[id].pp+Math.ceil(MOVES[id].pp*0.2*(Number(ppMaxBoosts[key])||0));}
function memberMovePp(m){if(!partyMovePp[m.key]||typeof partyMovePp[m.key]!=='object')partyMovePp[m.key]={};return partyMovePp[m.key];}
function persistBattlePp(){if(!battleRoster||!battle)return;for(const [key,fighter] of battleRoster){if(!fighter||!fighter.pp)continue;const record=partyMovePp[key]&&typeof partyMovePp[key]==='object'?partyMovePp[key]:{};for(const id of fighter.moveIds)if(MOVES[id])record[id]=Math.max(0,Math.min(maxMovePp(key,id),fighter.pp[id]));partyMovePp[key]=record;}}
function missingPp(){return teamMembers().some(m=>(m.starter?playerMoves:m.moves||[]).some(id=>MOVES[id]&&(partyMovePp[m.key]?.[id]??maxMovePp(m.key,id))<maxMovePp(m.key,id)));}
function applyPpMax(f,m){
 for(const id of f.moveIds){const max=maxMovePp(m.key,id);const remembered=partyMovePp[m.key]?.[id];f.pp[id]=Number.isInteger(remembered)?Math.max(0,Math.min(max,remembered)):max;}
 return f;
}
function makeMemberFighter(m){const s=STARTERS.find(x=>x.id===chosen),form=getForm(chosen,progress.level);const player=m.starter?fighter(s,playerIVs,progress.level,form.base,form.name,playerMoves):makeCompanionFighter(m);player.hp=memberHp(m);applyPpMax(player,m);player.attackBuffMultiplier=1+0.1*boostCount('attack');player.accuracyBuff=0.1*boostCount('accuracy');player.critBuff=0.1*boostCount('critical');player.defenseBuffMultiplier=1+0.1*boostCount('defense');return player;}
function chooseActiveMember(m){
 if(memberHp(m)<=0)return false;
 activeBattleKey=m.key;
 battleParticipants.add(m.key);
 return true;
}
function updateBattlePlayerHeader(){
 const m=activeMember();
 $('playerName').textContent=battle.player.name;$('promptName').textContent=battle.player.name;
 $('playerLevel').textContent='LV '+battle.player.level;
 const cap=wildRewardLevelCap();$('playerLevel').classList.toggle('level-capped',cap!==null&&m.level>=cap);
 sprite('playerSprite',m.dex,true,m.starter?STARTERS.find(x=>x.id===chosen).emoji:'⚔️');
 shownHp.player=battle.player.hp;
}
function requestBattleSwitch(){
 if(animating||battle.ended)return;
 const others=teamMembers().filter(m=>m.key!==activeBattleKey&&memberHp(m)>0);
 if(!others.length){alert('교체할 수 있는 동료가 없어.');return;}
 partyOverlay('🔄 포켓몬 교체','교체는 1턴을 소모해. 상대 포켓몬은 공격할 수 있어.',[...others.map(m=>({text:m.name+' Lv.'+m.level+' · HP '+memberHp(m)+'/'+memberMaxHp(m),action:()=>{if(animating||battle.ended)return;setActiveHp(battle.player.hp);battleRoster.set(activeBattleKey,battle.player);if(!chooseActiveMember(m))return;const newFighter=battleRoster.get(m.key)||makeMemberFighter(m);battleRoster.set(m.key,newFighter);act({type:'switch',fighter:newFighter});}})),{text:'취소',action:()=>{}}]);
}
function makeCompanionFighter(m){const ids=[...new Set((m.moves||recentWildMoves(m.dex,m.level)).filter(id=>MOVES[id]))].slice(-4);return applyPpMax(createFighter({id:'companion-'+m.dex,name:m.name,level:m.level,friendship:100,stats:calculateStats(memberBase(m),m.level,m.ivs,m.evs||{}),moveIds:ids.length?ids:['tackle']}),m);}

function partyOverlay(title,description,choices){
 let layer=document.getElementById('partyActionOverlay');
 if(!layer){
  layer=document.createElement('div');layer.id='partyActionOverlay';
  layer.style.cssText='position:fixed;inset:0;background:#0009;z-index:15000;overflow-y:auto;padding:6vh 16px;display:flex;align-items:flex-start;justify-content:center';
  const dialog=document.createElement('div');dialog.style.cssText='background:white;border:3px solid #405675;border-radius:17px;padding:20px;max-width:460px;width:100%;color:#293e59;box-shadow:0 12px 25px #0005';
  const heading=document.createElement('h2');heading.id='partyActionTitle';heading.style.margin='0 0 12px';
  const info=document.createElement('p');info.id='partyActionInfo';
  const buttons=document.createElement('div');buttons.id='partyActionButtons';buttons.style.cssText='display:grid;gap:9px';
  dialog.append(heading,info,buttons);layer.append(dialog);document.body.append(layer);
 }
 document.getElementById('partyActionTitle').textContent=title;
 document.getElementById('partyActionInfo').textContent=description;
 const target=document.getElementById('partyActionButtons');target.replaceChildren();
 for(const option of choices){
  const button=document.createElement('button');button.type='button';
  button.style.cssText='min-height:48px;border:2px solid #697e9d;border-radius:10px;background:#f3f6fb;color:#283c5a;font-weight:bold;font-size:16px;padding:8px';
  button.textContent=option.text;
  button.disabled=option.disabled===true;
  if(button.disabled){button.style.opacity='0.45';button.style.cursor='not-allowed';if(option.reason)button.title=option.reason;}
  button.onclick=()=>{if(button.disabled)return;layer.remove();option.action?.();};target.append(button);
 }
 layer.hidden=false;
}
function showPartyManager(selectedKey=null,replacement=false){
 normalizeLivingLead();
 if(animating||learningBusy||pendingRewardChoice)return;
 const members=teamMembers(),max=1+(inventory.partySlotA===1?1:0)+(inventory.partySlotB===1?1:0);
 const layer=document.getElementById('partyActionOverlay');
 if(layer)layer.remove();
 document.getElementById('partySummaryOverlay')?.remove();
 const overlay=document.createElement('div');overlay.id='partySummaryOverlay';overlay.className='party-summary-overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','내 포켓몬');
 const panel=document.createElement('section');panel.className='party-summary-panel';
 const title=document.createElement('header');title.className='party-summary-title';title.textContent=(replacement?'다음 포켓몬을 선택해!':'내 포켓몬')+' · '+members.length+'/'+max;
 const cards=document.createElement('div');cards.className='party-summary-cards';
 const details=document.createElement('div');details.className='party-summary-details';
 const footer=document.createElement('button');footer.type='button';footer.className='party-summary-close';footer.textContent='닫기';
 const close=()=>{if(!replacement)overlay.remove();};
 footer.onclick=close;footer.hidden=replacement;
 const selected=members.find(m=>m.key===selectedKey)||(replacement?members.find(m=>memberHp(m)>0):members[0]);
 for(const [i,m] of members.entries()){
  const hp=memberHp(m),maxHp=memberMaxHp(m);
  const button=document.createElement('button');button.type='button';button.className='party-summary-card'+(m.key===selected.key?' selected':'')+(hp===0?' fainted':'');
  const pic=document.createElement('img');pic.className='party-summary-sprite';pic.alt='';pic.src=staticImage(m.dex,false);
  pic.onerror=()=>{pic.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+m.dex+'.png';pic.onerror=()=>pic.style.visibility='hidden';};
  const data=document.createElement('div');data.className='party-summary-info';
  const name=document.createElement('strong');name.textContent=(i===0?'★ ':'')+m.name+'　Lv.'+m.level;
  const meter=(label,current,total,type)=>{const row=document.createElement('div');row.className='party-summary-meter';
   const tag=document.createElement('b');tag.textContent=label;
   const track=document.createElement('div');track.className='party-summary-track '+type;
   const fill=document.createElement('div');fill.className='party-summary-fill';fill.style.width=Math.max(0,Math.min(100,total?100*current/total:0))+'%';
   if(type==='hp'&&current/total<=.2)fill.classList.add('low');else if(type==='hp'&&current/total<=.5)fill.classList.add('mid');
   track.append(fill);
   const count=document.createElement('span');count.className='party-summary-meter-count';count.textContent=type==='hp'?current+' / '+total:(m.level>=100?'MAX':current+' / '+total);
   row.append(tag,track,count);return row;};
  const xp=m.starter?progress.exp:m.exp||0;
  data.append(name,meter('HP',hp,maxHp,'hp'),meter('EXP',xp,m.level>=100?1:levelNeed(m.level),'exp'));
  if(hp===0){const faint=document.createElement('small');faint.textContent='기절';data.append(faint);}
  button.append(pic,data);
  button.onclick=()=>showPartyManager(m.key,replacement);cards.append(button);
 }
 const m=selected,ivs=m.starter?playerIVs:m.ivs,evs=m.starter?playerEVs:m.evs||{};
 const stats=calculateStats(memberBase(m),m.level,ivs,evs);
 const heading=document.createElement('strong');heading.className='party-summary-detail-heading';heading.textContent=m.name+'의 정보';
 details.append(heading);
 const infoGrid=document.createElement('div');infoGrid.className='party-summary-statgrid';
 for(const stat of STAT_KEYS){
  const tile=document.createElement('div');tile.className='party-summary-stat';
  const head=document.createElement('div');head.className='party-summary-stat-head';
  const label=document.createElement('b');label.textContent=STAT_LABELS[stat];
  const iv=document.createElement('span');iv.className='iv-star iv-'+ivTier(ivs[stat]);iv.textContent='★';iv.title='개체값 '+ivs[stat];iv.setAttribute('aria-label','개체값 '+ivs[stat]);
  head.append(label,iv);
  const value=document.createElement('strong');value.className='party-summary-stat-value';value.textContent=String(stats[stat]);
  const ev=document.createElement('small');ev.textContent='EV: '+(evs[stat]||0);
  tile.append(head,value,ev);infoGrid.append(tile);
 }
 details.append(infoGrid);
 const moveHeading=document.createElement('strong');moveHeading.textContent='기술';details.append(moveHeading);
 const moves=document.createElement('div');moves.className='party-summary-moves';
 const moveIds=m.starter?playerMoves:m.moves||[];
 for(let i=0;i<4;i++){
  const id=moveIds[i],move=id?MOVES[id]:null;
  const cell=document.createElement('button');cell.type='button';cell.className='party-summary-move';
  cell.textContent=move?.name||'—';cell.disabled=!move;
  cell.onclick=()=>{
   const power=move.power?'위력 '+move.power:'위력 --';
   const accuracy='명중률 '+Math.round((move.accuracy??1)*100)+'%';
   let effect='';
   if(!move.power){
    const effects=[];
    if(move.boosts){const names={attack:'공격',defense:'방어',speed:'스피드'};for(const [stat,level] of Object.entries(move.boosts))effects.push((move.target==='self'?'자신의 ':'상대의 ')+(names[stat]||stat)+' '+(level>0?'+':'')+level+'랭크');}
    if(move.inflict)effects.push(({poison:'독',paralysis:'마비',sleep:'잠듦'})[move.inflict]||move.inflict);
    if(move.healMaxHp)effects.push('최대 HP의 '+Math.round(move.healMaxHp*100)+'% 회복');
    if(move.reduceTargetPp)effects.push('상대 기술 PP '+move.reduceTargetPp+' 감소');
    if(move.target==='self'&&move.boosts?.defense&&move.name==='빛의장막')effects.push('방어 강화');
    effect=effects.join(' · ')||'특수 효과';
   }
   partyOverlay(move.name,power+' · '+accuracy+(effect?'\n효과: '+effect:''),[{text:'확인',action:()=>showPartyManager(m.key)}]);
  };
  moves.append(cell);
 }
 details.append(moves);
 const lead=document.createElement('button');lead.type='button';lead.className='party-summary-lead';lead.textContent=replacement?(memberHp(m)<=0?'기절한 포켓몬은 출전 불가':'너로 정했다!'):(m.key===members[0].key?'현재 선봉':memberHp(m)<=0?'기절한 포켓몬은 선봉 불가':'이 포켓몬을 선봉으로');
 lead.disabled=memberHp(m)<=0||(!replacement&&m.key===members[0].key);
 lead.onclick=()=>{if(replacement){overlay.remove();sendOutReplacement(m);}else{partyOrder=[m.key,...members.filter(x=>x.key!==m.key).map(x=>x.key)];saveProgress();renderHome();showPartyManager(m.key);}};
 details.append(lead);
 panel.append(title,cards,details,footer);overlay.append(panel);document.body.append(overlay);footer.focus();
}
async function sendOutReplacement(m){
 if(!battle||memberHp(m)<=0||battle.ended||animating)return;
 animating=true;
 try{
  const arena=document.querySelector('#battleScreen .arena');
  const playerSprite=document.querySelector('#battleScreen .sprite.player');
  const ball=document.createElement('img');ball.className='replacement-pokeball';ball.alt='';
  ball.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
  if(arena)arena.append(ball);
  if(playerSprite)playerSprite.classList.remove('party-fainted','party-entering');
  try{
   await pause(540);
   chooseActiveMember(m);
   battle.player=battleRoster.get(m.key)||makeMemberFighter(m);
   battleRoster.set(m.key,battle.player);
   battle.ended=false;battle.result=null;
   updateBattlePlayerHeader();
   playerSprite?.classList.add('party-entering');
   battle.log.push('🔴 '+m.name+'! 너로 정했다!');
   render();
   await pause(420);
  }finally{
   ball.remove();playerSprite?.classList.remove('party-entering');
  }
  persistBattlePp();saveProgress();
 }finally{animating=false;render();showMenu('main');}
}
function offerCapturedCompanion(){
 const family=teamFamily(wildEnemy.dex);
 if(teamMembers().some(m=>m.starter?teamFamily(m.dex)===family:m.family===family)){
  partyOverlay('포획 성공!','이미 같은 진화 계열 동료가 있어. 도감 기록은 유지되고 포켓몬은 놓아줘.',[{text:'확인',action:()=>{}}]);return;
 }
 const limit=1+(inventory.partySlotA===1?1:0)+(inventory.partySlotB===1?1:0);
 const recruit=replaceIndex=>{
  const member={family,name:wildEnemy.name,dex:wildEnemy.dex,level:wildEnemy.level,exp:0,ivs:randomIVs(),evs:{hp:0,attack:0,defense:0,speed:0},moves:recentWildMoves(wildEnemy.dex,wildEnemy.level),hp:null};
  if(replaceIndex===null)companions.push(member);else companions.splice(replaceIndex,1,member);
  partyOrder=teamMembers().map(m=>m.key);
  saveProgress();renderHome();
  partyOverlay('동료 합류!',member.name+' Lv.'+member.level+'이(가) 동료가 됐어!',[{text:'확인',action:()=>{}}]);
 };
 const unlocked=inventory.partySlotA===1;
 partyOverlay('🔴 포획 성공!',wildEnemy.name+' Lv.'+wildEnemy.level+(unlocked?'을(를) 동료로 영입할까?':'을(를) 잡았어! 동료 영입은 프렌들리숍에서 추가 슬롯A를 해금한 뒤 가능해.'),[
 {text:'동료로 영입',disabled:!unlocked,reason:'포켓몬 추가 슬롯A 해금 필요',action:()=>{
  if(1+companions.length<limit){recruit(null);return;}
  if(!companions.length){partyOverlay('슬롯 부족','스타팅 포켓몬은 교체할 수 없어. 상점에서 포켓몬 추가 슬롯A를 획득해줘.',[{text:'확인',action:()=>{}}]);return;}
  partyOverlay('동료 교체','동료가 가득 찼어. 교체하면 기존 동료는 영구 삭제돼.',[
  ...companions.map((m,i)=>({text:m.name+' Lv.'+m.level+'과 교체',action:()=>{
   partyOverlay('정말 교체할까?',m.name+'을(를) 영구 삭제하고 '+wildEnemy.name+'을(를) 영입할까?',[
    {text:'교체 확정',action:()=>recruit(i)},{text:'취소',action:()=>{}}
   ]);
  }})),{text:'교체하지 않고 보내주기',action:()=>{}}
  ]);
 }},
 {text:'보내주기',action:()=>{}}
 ]);
}

function renderHome(){
 normalizeLivingLead();
 renderAdventureLog();
 if(leagueStage!==null){renderLeague();return;}
 if(greenFifthCleared&&hallOfFame.length===0&&area!=='championRoad2')area='championRoad2';
 if(giovanniCleared&&!greenFifthCleared&&hallOfFame.length===0&&area!=='championRoad')area='championRoad';
 if(blaineCleared&&!giovanniCleared&&area!=='strangeForest')area='strangeForest';
 if(sabrinaCleared&&!blaineCleared&&progress.level>=49&&area==='sea')area='volcano';
 refreshHealingDay();renderPowerStatus();refreshLevelCapIndicator();
 $('currentArea').textContent=area==='grass'?'🌿 초원':area==='forest'?'🌳 숲':area==='cave'?'🪨 동굴':area==='lake'?'💧 호수':area==='cemetery'?'🪦 공동묘지':area==='town'?'🏘️ 도시':area==='road'?'🛣️ 도로':area==='city'?'🏙️ 대도시':area==='sea'?'🌊 바다':area==='volcano'?'🌋 화산':area==='strangeForest'?'🌲 이상한 숲':area==='championRoad'?'🏔️ 챔피언로드 1':area==='championRoad2'?'🏛️ 챔피언로드 2':area==='palletTown'?'🏠 태초마을':area==='rocketBase'?'🚀 비밀기지':area==='farawayIsland'?'🏝️ 환상의 섬':'🏔️ 은빛산';
 $('homeSpriteWrap').classList.remove('area-grass','area-forest','area-cave','area-lake','area-cemetery','area-road','area-city','area-sea','area-volcano','area-strangeForest','area-championRoad','area-championRoad2','area-palletTown','area-rocketBase','area-farawayIsland','area-mountSilver');
 $('homeSpriteWrap').classList.add('area-'+area);
 $('badgeStatus').textContent='배지 '+(giovanniCleared?8:blaineCleared?7:sabrinaCleared?6:kogaCleared?5:erikaCleared?4:surgeCleared?3:mistyCleared?2:brockCleared?1:0)+' / 8';
 const trainerKind=nextTrainerKind();
 const finalArea=!trainerKind;
 const targetLevel=trainerKind?TRAINERS[trainerKind].level:0;
 const unlocked=teamMembers().some(m=>m.level>=targetLevel);
 const challengeDisabled=!livingMembers().length||!!pendingRewardChoice||!unlocked||finalArea;
 $('trainerChallenge').disabled=hallOfFame.length>0?false:challengeDisabled;
 const redButton=$('redChallenge');
 redButton.hidden=area!=='mountSilver'||!hallOfFame.length;
 redButton.disabled=progress.level<92||!livingMembers().length||!!pendingRewardChoice||animating;
 $('redChallengeNote').textContent=progress.level<92?'Lv.92에 해금':!livingMembers().length?'포켓몬 센터 이용 후 도전':pendingRewardChoice?'보상 선택 후 도전':'피카츄 Lv.99 외 5마리';
 $('trainerButtonTitle').textContent=hallOfFame.length?'🧭 모험':'도전';
 $('leagueEnter').hidden=area!=='championRoad2';
 $('leagueEnter').disabled=area!=='championRoad2'||progress.level<67||!livingMembers().length||!!pendingRewardChoice;
 $('leagueRecords').hidden=hallOfFame.length===0;
 $('trainerChallenge').classList.toggle('adventure-ready',hallOfFame.length>0||unlocked&&!challengeDisabled);
 $('trainerChallenge').classList.toggle('adventure-locked',hallOfFame.length===0&&(!unlocked||finalArea));
 if(hallOfFame.length===0)$('trainerButtonTitle').textContent=finalArea?'🏅 관장 도전 완료':trainerKind==='blue'||trainerKind==='greenReturn'||trainerKind==='greenThird'||trainerKind==='greenFourth'||trainerKind==='greenFifth'?'⚔ 그린에게 도전':trainerKind==='brock'?'🪨 웅에게 도전':trainerKind==='misty'?'💧 이슬이에게 도전':trainerKind==='erika'?'🌸 민화에게 도전':trainerKind==='koga'?'☠️ 독수에게 도전':trainerKind==='sabrina'?'🔮 초련에게 도전':trainerKind==='giovanni'?'🌍 비주기에게 도전':trainerKind==='blaine'?'🔥 강연에게 도전':'⚡ 마티즈에게 도전';
 $('trainerButtonNote').textContent=hallOfFame.length>0?'지역 선택 · 언제든 이동':finalArea?(area==='championRoad2'?'챔피언로드 2 탐험':'관장 도전 완료'):!unlocked?'Lv.'+targetLevel+'에 해금':!livingMembers().length?'치료 후 재도전':pendingRewardChoice?'보상 선택 후 도전':trainerKind==='greenFifth'?'승리하면 챔피언로드 2 개방':trainerKind==='misty'?'승리하면 호수 개방':(trainerKind==='greenReturn'||trainerKind==='greenFourth')?'승리해도 지역은 그대로':trainerKind==='greenThird'?'승리하면 도시 개방':trainerKind==='erika'?'승리하면 도로 개방':trainerKind==='koga'?'승리하면 대도시 개방':trainerKind==='giovanni'?'승리하면 챔피언로드 개방':trainerKind==='blaine'?'승리하면 이상한 숲 개방':trainerKind==='sabrina'?'승리하면 바다 개방':trainerKind==='surge'?'승리하면 공동묘지 개방':'승리하면 '+(trainerKind==='blue'?'숲':'동굴')+' 개방';
 $('injuryStatus').hidden=!!livingMembers().length;
 $('injuryBandage').hidden=!!livingMembers().length;
 $('healButton').hidden=false;
 $('healButton').setAttribute('aria-disabled',String(!teamMembers().some(m=>memberHp(m)===0)));
 $('healButtonNote').textContent=teamMembers().some(m=>memberHp(m)===0)?(freeHealsUsed<10?'무료 '+(10-freeHealsUsed)+'/10회 남음':'이용료 '+(Math.max(...teamMembers().map(m=>m.level))*100).toLocaleString('ko-KR')+'원'):'기절한 동료가 있을 때 이용 가능';
 $('startBattle').disabled=!livingMembers().length||!!pendingRewardChoice;
 const leader=leaderMember(),s=STARTERS.find(x=>x.id===chosen),form=leader.starter?getForm(chosen,progress.level):{dex:leader.dex,name:leader.name};
 $('homeName').textContent=leader.name;$('homeLevel').textContent='LV '+leader.level;
 $('homeMoney').textContent='💰 '+progress.money.toLocaleString('ko-KR')+'원'+(lastBattleReward?' (+'+lastBattleReward.money.toLocaleString('ko-KR')+')':'');
 renderCaptures();
 const maxHp=memberMaxHp(leader);
 const hp=leaderHp();
 $('homeHpText').textContent=hp+' / '+maxHp;
 $('homeHpBar').style.width=(100*hp/maxHp)+'%';
 $('homeHpBar').style.background=hp/maxHp>0.5?'#59c679':hp/maxHp>0.2?'#e8b956':'#d86862';
 renderInventory();

 const need=levelNeed(leader.level);
 $('homeExpText').textContent=(need?(leader.starter?progress.exp:(leader.exp||0))+' / '+need:'MAX LEVEL')+(lastBattleReward?' (+'+(Number(lastPartyExp[leader.key])||0).toLocaleString('ko-KR')+')':'');
 $('homeExpBar').style.width=need?100*(leader.starter?progress.exp:(leader.exp||0))/need+'%':'100%';
 const img=$('homeSprite'),fallback=$('homeFallback');
 fallback.textContent=leader.starter?s.emoji:'⚔️';fallback.hidden=true;img.hidden=false;
 // Prefer genuine BW animated front GIF. Fall back to static pixel art and CSS idle motion.
 const sources=[animatedImage(form.dex),staticImage(form.dex),'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+form.dex+'.png'];
 let attempt=0;
 img.onerror=()=>{attempt++;if(attempt<sources.length){img.src=sources[attempt];}else{img.hidden=true;fallback.hidden=false;}};
 img.onload=()=>{img.hidden=false;fallback.hidden=true};
 img.src=sources[0];
 renderStatPanel();
 renderMoveSummary();
}
function render(){renderPowerStatus();const switchButton=$('commandSwitch');if(switchButton)switchButton.disabled=animating||battle.ended||teamMembers().filter(m=>m.key!==activeBattleKey&&memberHp(m)>0).length===0;const p=battle.player,e=battle.enemies[battle.enemyIndex]??battle.enemies.at(-1);
 $('commandFight').disabled=animating||battle.ended;
 $('commandBall').disabled=animating||battle.ended||!battle.wild;
 $('commandHeal').disabled=animating||battle.ended;
 $('commandRun').disabled=animating||battle.ended||!battle.wild;
 for(const item of SHOP_ITEMS){
  const el=$('battleItem-'+item.id);
  if(!el)continue; // Key items don't have battle buttons.
  el.disabled=animating||battle.ended||inventory[item.id]<1||(item.category==='heal'&&item.id!=='revive'&&!teamMembers().some(m=>memberHp(m)>0&&memberHp(m)<memberMaxHp(m)))||(item.id==='revive'&&!teamMembers().some(m=>m.key!==activeBattleKey&&memberHp(m)===0))||(item.category==='ball'&&!battle.wild);
  const counter=el.querySelector('.item-count');if(counter)counter.textContent='×'+inventory[item.id];
 }

 $('backHome').disabled=battleKind!=='wild';
 if(battle.ended)showMenu('main');for(const [f,prefix] of [[p,'player'],[e,'enemy']]){displayHp(prefix,animating?shownHp[prefix]:f.hp);$(prefix+'Status').textContent=f.status?.type==='paralysis'?'⚡ 마비':f.status?.type==='sleep'?'💤 수면':f.status?.type==='poison'?'☠ 독':'';}
$('turn').textContent=battle.ended?(battle.result==='victory'?'WIN!':'LOSE!'):'TURN '+String(battle.turn+1).padStart(2,'0');
$('moves').replaceChildren(...p.moveIds.map(id=>{const m=MOVES[id],b=document.createElement('button');b.disabled=animating||battle.ended||p.pp[id]===0;b.innerHTML='<span class="move-name">'+m.name+'</span><span class="move-pp">'+(m.power?'위력 '+m.power+' · ':'')+'PP '+p.pp[id]+'/'+(m.pp+Math.ceil(m.pp*0.2*(Number(ppMaxBoosts[activeBattleKey])||0)))+'</span>';b.addEventListener('click',()=>act({moveId:id}));return b;}));$('log').replaceChildren(...battle.log.slice(-15).reverse().map(line=>{const t=document.createElement('p');t.textContent=line;return t;}));renderStatPanel();}
async function act(a){
 if(animating||battle.ended||learningBusy)return;
 let learnQueue=[];
 let needsReplacement=false;
 const previousHp={player:battle.player.hp,enemy:(battle.enemies[battle.enemyIndex]??battle.enemies.at(-1)).hp};
 try{
  animating=true;
  // Consume one item only after the engine accepts the player's turn.
  // Each completed battle turn consumes one boost turn, including capture/item turns.
  battle.player.attackBuffMultiplier=1+0.1*boostCount('attack');
  battle.player.accuracyBuff=0.1*boostCount('accuracy');
  battle.player.critBuff=0.1*boostCount('critical');
  battle.player.defenseBuffMultiplier=1+0.1*boostCount('defense');
  if(a.type==='revive'){
   const target=teamMembers().find(m=>m.key===a.targetKey);
   if(!target||target.key===activeBattleKey||!reviveMember(target))return;
  }
  if(a.type==='healAlly'){
   const target=teamMembers().find(m=>m.key===a.targetKey);
   if(!target||target.key===activeBattleKey||memberHp(target)<=0||memberHp(target)>=memberMaxHp(target)||inventory[a.itemId]<1)return;
   const before=memberHp(target),hp=Math.min(memberMaxHp(target),before+a.power);
   const found=companions.find(x=>x.family===target.family);
   if(!found)return;
   found.hp=hp;
   appendAdventureLog('💊 '+target.name+' HP '+before+' → '+hp);
  }
  takeTurn(battle,a);
  if(a.type==='switch')updateBattlePlayerHeader();
  battleRoster.set(activeBattleKey,battle.player);
  persistBattlePp();
  if(battle.player.hp===0){
   setActiveHp(0);
   needsReplacement=teamMembers().some(m=>m.key!==activeBattleKey&&memberHp(m)>0);
   if(needsReplacement){battle.ended=false;battle.result=null;}
  }
  tickBoosts();persistBattlePp();saveProgress();renderPowerStatus();
  if(a.type==='item'||a.type==='ball'||a.type==='revive'||a.type==='healAlly'){
   inventory[a.itemId]--;
   saveProgress();
  }

  const events=[...battle.events];
  if(battleKind!=='wild')for(const event of events)if(event.type==='knockout'&&event.side==='enemy'){
   const knocked=battle.enemies[event.enemyIndex];
   appendAdventureLog('⚔️ '+knocked.name+'을(를) 쓰러뜨렸다!');
   const expForKo=wildRewardCapped(activeMember())?0:12+knocked.level*6;
   trainerExpEarned+=expForKo;
   addPartyExperience(expForKo,knocked.name);
   battleParticipants=new Set([activeBattleKey]);
  }
 if(battleKind!=='wild'){
  for(const event of events){if(event.type==='knockout'&&event.side==='enemy'){
   defeatedEnemies++;
  }}
 }
 shownHp={...previousHp};render();await playEvents(events);
 if(needsReplacement){const playerSprite=document.querySelector('#battleScreen .sprite.player');if(playerSprite){playerSprite.classList.add('party-fainted');await pause(500);}}
 if(battleKind!=='wild'&&events.some(ev=>ev.type==='knockout'&&ev.side==='enemy')&&!battle.ended){
  const enemy=battle.enemies[battle.enemyIndex];
  if(battleKind==='brock')registerEncounter(95);
  if(battleKind==='misty')registerEncounter(121);
  if(['greenReturn','surge','greenThird','erika','koga','sabrina'].includes(battleKind))registerEncounter(Number(enemy.id.slice(8)));
  $('enemyName').textContent=enemy.name;$('enemyLevel').textContent='LV '+enemy.level;
  sprite('enemySprite',enemy.id.startsWith('trainer-')?Number(enemy.id.slice(8)):getForm(blueChoice,7).dex,false,'⚔️');
  shownHp.enemy=enemy.hp;displayHp('enemy',enemy.hp);
 }
  if(battle.ended){
    battleRoster.set(activeBattleKey,battle.player);persistBattlePp();
    if(battle.result==='victory'&&battleKind==='wild')appendAdventureLog('⚔️ '+wildEnemy.name+'을(를) 쓰러뜨렸다!');
    if(battle.result==='capture'){
      // Catching is not a battle victory: never open a choice reward.
      pendingRewardChoice=null;
      capturedPokemon.push({name:wildEnemy.name,dex:wildEnemy.dex,level:wildEnemy.level});
      caughtSpecies.add(wildEnemy.dex);
      appendAdventureLog('🔴 '+wildEnemy.name+' Lv.'+wildEnemy.level+' 포획 성공!');
      if(capturedPokemon.length>200)capturedPokemon.shift();
      saveProgress();
      offerCapturedCompanion();
    }
    if(battle.result!=='victory'&&battleKind==='wild'){lastBattleReward={exp:0,money:0};lastPartyExp={};battleExpEarned={};saveProgress();}
    const maxBefore=battle.player.stats.hp;
    const hpBefore=battle.player.hp;
    const reward=battleKind==='wild'?awardExperience():finishTrainerBattle();
    learnQueue=reward?.learnQueue||[];
    if(reward?.newLevel>reward?.previousLevel&&activeMember().starter){
     const currentMax=calculateStats(getForm(chosen,progress.level).base,progress.level,playerIVs,playerEVs).hp;
     storedHp=Math.max(0,Math.min(currentMax,hpBefore+(currentMax-maxBefore)));
    } else setActiveHp(hpBefore);
    if(!activeMember().starter)setActiveHp(hpBefore);
    saveProgress();
    // Party level-up animations are processed by processPartyGrowth.
    if(reward?.evolutions?.length)await showEvolutions(reward.evolutions);
    // Gym clear sequence: badge reveal first, then reward selection on the home screen.
    if(reward?.badgeEarned)await showBadgeAward(reward.badgeEarned);
    $('battleResult').hidden=false;
    $('resultTitle').textContent=battle.result==='victory'?'승리!':battle.result==='capture'?'포획 성공!':'패배!';
    if(battle.result==='defeat'){injured=true;setActiveHp(0);appendAdventureLog('💥 모든 포켓몬 기절! 포켓몬 센터를 이용하자.');if(battleKind.startsWith('league'))leagueStage=null;saveProgress();}
    $('resultDetail').textContent=battle.result==='capture'?wildEnemy.name+' (Lv.'+wildEnemy.level+') 포획 완료! 포획 도감에 저장했어.':reward?.messages?.length?reward.messages.join('\n'):'경험치를 획득하지 못했어.';
    renderHome();
  }
 }catch(err){alert(err.message);console.error(err);}
 finally{
  if(battle&&!battle.ended){setActiveHp(battle.player.hp);battleRoster.set(activeBattleKey,battle.player);persistBattlePp();saveProgress();}
  animating=false;
  render();
  if(needsReplacement&&!battle.ended){
   const candidates=teamMembers().filter(m=>m.key!==activeBattleKey&&memberHp(m)>0);
   partyOverlay('🔄 다음 포켓몬 선택','기절한 포켓몬을 대신해 출전할 포켓몬을 골라줘. 턴은 소모하지 않아.',[
    ...candidates.map(m=>({text:m.name+' Lv.'+m.level+' · HP '+memberHp(m)+'/'+memberMaxHp(m),action:()=>sendOutReplacement(m)}))
   ]);
  }
  if(battle.ended){
   showMenu('main');
   renderHome();showScreen(leagueStage===null?'home':'league');
   if(pendingPartyGrowth.length){const events=pendingPartyGrowth.splice(0);await processPartyGrowth(events);}
   if(pendingLevelUp){const levels=pendingLevelUp;pendingLevelUp=null;playHomeLevelUp(levels.previous,levels.current);}
   if(learnQueue.length)await processLearnQueue(learnQueue);
   showRewardChoices();
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
 $('developerArea').value=area;
 $('developerLevel').focus();
}
function applyDeveloperChanges(e){
 e.preventDefault();
 if(animating||learningBusy)return;
 const requestedLevel=Number($('developerLevel').value),money=Number($('developerMoney').value),targetArea=$('developerArea').value;
 const warp=resolveDeveloperWarp({requestedLevel,money,targetArea});
 // Editing only the level in the current area must not force a minimum-level warp.
 if(warp&&targetArea===area)warp.targetLevel=requestedLevel;
 if(!warp){
  $('developerSaveError').textContent='레벨 1~100, 보유금 0~999,999,999원, 지역 선택을 확인해줘.';
  return;
 }
 const {targetLevel}=warp;
 const levelChanged=progress.level!==targetLevel;
 area=warp.area;
 // Developer warps may unlock prerequisites, but never erase past victories.
 blueCleared=blueCleared||warp.blueCleared;
 brockCleared=brockCleared||warp.brockCleared;
 mistyCleared=mistyCleared||warp.mistyCleared;
 greenReturnCleared=greenReturnCleared||warp.greenReturnCleared;
 surgeCleared=surgeCleared||warp.surgeCleared;
 greenThirdCleared=greenThirdCleared||warp.greenThirdCleared;
 greenFourthCleared=greenFourthCleared||warp.greenFourthCleared;
 greenFifthCleared=greenFifthCleared||warp.greenFifthCleared;
 erikaCleared=erikaCleared||warp.erikaCleared;
 kogaCleared=kogaCleared||warp.kogaCleared;
 sabrinaCleared=sabrinaCleared||warp.sabrinaCleared;
 blaineCleared=blaineCleared||warp.blaineCleared;
 giovanniCleared=giovanniCleared||warp.giovanniCleared;
 progress.level=targetLevel;
 progress.money=warp.money;
 if(levelChanged){
  storedHp=null;
  progress.exp=0;
  playerMoves=migrateMoves(chosen,targetLevel);
 }
 pendingTrainerIntro=null;
 saveProgress();
 closeDeveloper();
 reset();
 renderHome();
}
function renderLeague(){
 if(leagueStage===null)return;
 $('leagueProgress').textContent='리그 '+(leagueStage+1)+' / 5';
 $('leagueOpponent').textContent=LEAGUE_NAMES[leagueStage];
 $('leagueHp').textContent='현재 HP: '+(storedHp===null?'최대':storedHp);
 $('leagueNext').textContent=LEAGUE_NAMES[leagueStage]+'에게 도전';
 $('leagueNext').disabled=!livingMembers().length||!!pendingRewardChoice;
}
function showAdventure(){
 if(!hallOfFame.length||leagueStage!==null||pendingRewardChoice)return;
 for(const button of document.querySelectorAll('[data-adventure-area]')){
  const destination=button.dataset.adventureArea;
  const unlocked=destination==='palletTown'||destination==='mountSilver'||destination==='rocketBase'&&(inventory.secretSwitch||0)>0||destination==='farawayIsland'&&(inventory.oldSeaMap||0)>0;
  button.disabled=!unlocked;
  const requirement=destination==='rocketBase'?'비밀 스위치 필요':destination==='farawayIsland'?'오래된해도 필요':'';
  button.title=unlocked?'이동 가능':requirement;
 }
 $('adventureOverlay').hidden=false;
}
function travelTo(destination){
 if(!hallOfFame.length||leagueStage!==null||pendingRewardChoice)return;
 if(!['palletTown','rocketBase','farawayIsland','mountSilver'].includes(destination))return;
 if(destination==='rocketBase'&&!(inventory.secretSwitch>0)||destination==='farawayIsland'&&!(inventory.oldSeaMap>0))return;
 area=destination;saveProgress();$('adventureOverlay').hidden=true;renderHome();showScreen('home');
}
function showRedEnding(){
 if(!redCeremonyPending)return;
 const latest=redHallOfFame.at(-1);
 if(!latest){redCeremonyPending=false;saveProgress();return;}
 redEndingPage=0;
 $('redEndingPokemon').src=staticImage(latest.dex);
 $('redEndingPokemon').onerror=()=>{$('redEndingPokemon').hidden=true;};
 renderRedEndingPage();
 $('redEndingOverlay').hidden=false;
}
function renderRedEndingPage(){
 const latest=redHallOfFame.at(-1);
 if(!latest)return;
 const pages=[
  ['전설을 넘어선 자','……\\n전설의 트레이너 레드를 쓰러뜨렸다.','은빛산 정상에서 최후의 승부에 승리했다.','계속하기 →'],
  ['포케타마 2차 엔딩','모든 시련을 돌파했다.\\n이제 너와 '+latest.pokemon+'도 전설이 되었다.','GRAND CHAMPION · '+latest.pokemon+' Lv.'+latest.level,'명예의 전당 등록 →'],
  ['GRAND HALL OF FAME','제'+latest.round+'회 2차 엔딩 달성!','클리어 기록과 IV · EV · 기술을 영구 기록한다.','명예의 전당 확인 →']
 ];
 const [heading,message,detail,button]=pages[redEndingPage];
 $('redEndingTitle').textContent=heading;
 $('redEndingMessage').textContent=message.replaceAll('\\n','\n');
 $('redEndingDetail').textContent=detail;
 $('redEndingNext').textContent=button;
 $('redEndingOverlay').dataset.page=String(redEndingPage);
}
function advanceRedEnding(){
 if(!redCeremonyPending)return;
 if(redEndingPage<2){redEndingPage++;renderRedEndingPage();return;}
 $('redEndingOverlay').hidden=true;
 redCeremonyPending=false;saveProgress();showHallOfFame();
}
function showHallOfFame(){
 const list=$('leagueRecordList');list.replaceChildren();
 for(const h of [...redHallOfFame].reverse()){
  const wrap=document.createElement('div');wrap.className='league-record league-record-grand';
  const title=document.createElement('strong');title.textContent='👑 2차 엔딩 제'+h.round+'회 · 레드 격파 · '+h.pokemon+' Lv.'+h.level;
  const moves=Array.isArray(h.moves)?h.moves.map(id=>MOVES[id]?.name||id).join(' · '):'기록 없음';
  const info=document.createElement('p');info.textContent=new Date(h.date).toLocaleDateString('ko-KR')+'\nIV  '+Object.entries(h.ivs||{}).map(([k,v])=>k+': '+v).join(' · ')+'\nEV  '+Object.entries(h.evs||{}).map(([k,v])=>k+': '+v).join(' · ')+'\n기술  '+moves;
  wrap.append(title,info);list.append(wrap);
 }
 for(const h of [...hallOfFame].reverse()){
  const wrap=document.createElement('div');wrap.className='league-record';
  const iv=Object.entries(h.ivs||{}).map(([k,v])=>k+': '+v).join(' · ');
  const ev=Object.entries(h.evs||{}).map(([k,v])=>k+': '+v).join(' · ');
  const title=document.createElement('strong');title.textContent='제'+h.round+'회 · '+h.pokemon+' Lv.'+h.level;
  const moveNames=Array.isArray(h.moves)?h.moves.map(id=>MOVES[id]?.name||id).join(' · '):'기록 없음 (기존 클리어)';
  const info=document.createElement('p');info.textContent=new Date(h.date).toLocaleDateString('ko-KR')+'\nIV  '+iv+'\nEV  '+ev+'\n기술  '+moveNames;
  wrap.append(title,info);list.append(wrap);
 }
 $('leagueRecordOverlay').hidden=false;
}
function setup(){
 if(saveReadFailed){alert('기존 저장 데이터를 읽는 데 실패했어. 데이터 보호를 위해 자동 저장을 중단했어. 브라우저 데이터를 삭제하지 말고 저장 데이터 확인이 필요해.');return;}
 if(!blueChoice||blueChoice===chosen){blueChoice=chooseRivalStarter(chosen);saveProgress();}
 $('trainerChallenge').addEventListener('click',challengeTrainer);
 $('redChallenge').addEventListener('click',()=>{if(area!=='mountSilver'||!hallOfFame.length||progress.level<92||!livingMembers().length||pendingRewardChoice||animating||learningBusy)return;battlePlayerLevelStart=progress.level;reset('red');showScreen('battle')});
 $('adventureClose').addEventListener('click',()=>{$('adventureOverlay').hidden=true});
 for(const button of document.querySelectorAll('[data-adventure-area]'))button.addEventListener('click',()=>travelTo(button.dataset.adventureArea));
 $('leagueEnter').addEventListener('click',()=>{if(!greenFifthCleared||progress.level<67||!livingMembers().length||pendingRewardChoice)return;leagueStage=0;saveProgress();renderLeague();showScreen('league')});
 $('leagueNext').addEventListener('click',()=>{if(leagueStage===null||!livingMembers().length||pendingRewardChoice)return;const kind='league'+leagueStage;battlePlayerLevelStart=progress.level;reset(kind);showScreen('battle')});
 $('leagueBag').addEventListener('click',()=>showShopTab('bag'));
 $('leagueRecords').addEventListener('click',showHallOfFame);
 $('leagueRecordClose').addEventListener('click',()=>{$('leagueRecordOverlay').hidden=true});
 $('redEndingNext').addEventListener('click',advanceRedEnding);
 $('challengeUnlockConfirm').addEventListener('click',()=>{$('challengeUnlockOverlay').hidden=true;});
 $('trainerIntroConfirm').addEventListener('click',confirmTrainerIntro);
 $('healButton').addEventListener('click',healInjury);
 $('openMoveRecall').addEventListener('click',openRecall);
 $('closeMoveRecall').addEventListener('click',()=>{$('moveRecallOverlay').hidden=true});
 $('speedToggle').addEventListener('click',()=>{
  battleSpeed=battleSpeed===1?2:1;
  document.body.classList.toggle('battle-fast',battleSpeed===2);
  $('speedToggle').setAttribute('aria-pressed',String(battleSpeed===2));
  $('speedToggle').textContent='⏩ 2배속 '+(battleSpeed===2?'ON':'OFF');
 });
 $('commandSwitch')?.addEventListener('click',requestBattleSwitch);
 $('commandFight').addEventListener('click',()=>showMenu('fight'));
 $('commandBall').addEventListener('click',()=>showMenu('ball'));
 $('commandHeal').addEventListener('click',()=>showMenu('heal'));
 $('commandRun').addEventListener('click',()=>{if(animating||battle.ended||!battle.wild)return;setActiveHp(battle.player.hp);battleRoster.set(activeBattleKey,battle.player);persistBattlePp();saveProgress();showMenu('main');renderHome();showScreen('home')});
 $('submenuBack').addEventListener('click',()=>{if(!animating&&!battle.ended)showMenu('main')});
 $('homeLevelUp').addEventListener('animationend',e=>{if(e.target!==$('homeLevelUp'))return;$('homeLevelUp').classList.remove('playing');$('homeLevelUp').hidden=true;});
 for(const item of SHOP_ITEMS){
  const button=$('battleItem-'+item.id);
  if(!button)continue; // Key items do not have battle action buttons.
  if(item.id==='revive'){button.addEventListener('click',requestBattleRevive);continue;}
  button.addEventListener('click',()=>{
   if(item.category==='heal'){
    const targets=teamMembers().filter(m=>memberHp(m)>0&&memberHp(m)<memberMaxHp(m));
    if(!targets.length)return;
    partyOverlay(item.icon+' '+item.name,'회복할 동료를 선택해. 1턴이 소모돼.',[
     ...targets.map(m=>({text:m.name+' · HP '+memberHp(m)+'/'+memberMaxHp(m),action:()=>{
      if(m.key===activeBattleKey)act({type:'item',itemId:item.id,power:item.power});
      else act({type:'healAlly',targetKey:m.key,itemId:item.id,power:item.power});
     }})),{text:'취소',action:()=>{}}]);
   }else act({type:'ball',itemId:item.id,multiplier:item.multiplier,guaranteedCatch:item.guaranteedCatch===true});
  });
 }
 $('openParty')?.addEventListener('click',()=>showPartyManager());
 $('badgeStatus')?.addEventListener('click',showBadgeCollection);
 $('adventureLogToggle')?.addEventListener('click',toggleAdventureLog);
 $('openCollection').addEventListener('click',()=>showCollection('dex'));
 $('closeCollection').addEventListener('click',()=>{$('collectionScreen').hidden=true;showScreen('home')});
 document.querySelectorAll('[data-collection-tab]').forEach(button=>button.addEventListener('click',()=>{collectionTab=button.dataset.collectionTab;renderCollection();}));
 $('openShop').addEventListener('click',()=>showShopTab('shop'));
 $('openBag').addEventListener('click',()=>showShopTab('bag'));
 $('closeShop').addEventListener('click',()=>{$('shopScreen').hidden=true;if(leagueStage!==null){renderLeague();showScreen('league')}else showScreen('home')});
 document.querySelectorAll('[data-item-category]').forEach(button=>button.addEventListener('click',()=>showItemCategory(button.dataset.itemCategory)));

 const box=$('starters');STARTERS.forEach(s=>{const b=document.createElement('button');b.type='button';b.className='starter';b.dataset.id=s.id;b.innerHTML='<img alt="" loading="lazy" src="'+staticImage(s.baby)+'"><span>'+s.name+'</span>';b.onclick=()=>{if(animating||learningBusy||chosen===s.id)return;if(!confirm('스타팅을 바꾸면 레벨, 경험치, 보유금, 포획 도감이 초기화돼. 바꿀까?'))return;chosen=s.id;companions=[];partyOrder=[];area='grass';blueCleared=false;brockCleared=false;mistyCleared=false;greenReturnCleared=false;surgeCleared=false;greenThirdCleared=false;greenFourthCleared=false;greenFifthCleared=false;leagueStage=null;leagueCeremonyPending=false;redCeremonyPending=false;erikaCleared=false;kogaCleared=false;sabrinaCleared=false;blaineCleared=false;giovanniCleared=false;blueChoice=chooseRivalStarter(s.id);injured=false;healingDay=todayKST();freeHealsUsed=0;playerIVs=randomIVs();playerEVs={hp:0,attack:0,defense:0,speed:0};playerMoves=initialMoves(s.id);capturedPokemon=[];caughtSpecies=new Set();seenPokemon=new Set();lastBattleReward=null;lastPartyExp={};ppMaxBoosts={};partyMovePp={};pendingRewardChoice=null;challengeNotified=[];$('challengeUnlockOverlay').hidden=true;storedHp=null;for(const k of Object.keys(activeBoosts))activeBoosts[k]=[];inventory={...START_INVENTORY};progress={level:1,exp:0,money:0};saveProgress();reset()};box.append(b)});$('startBattle').addEventListener('click',()=>{if(learningBusy||pendingRewardChoice||!livingMembers().length)return;if(!livingMembers().length){alert('모든 동료가 기절했어! 가방에서 회복약을 사용해줘.');showShopTab('bag');return;}$('homeLevelUp').hidden=true;$('homeLevelUp').classList.remove('playing');reset();showScreen('battle')});$('backHome').addEventListener('click',()=>{if(animating||battleKind!=='wild')return;setActiveHp(battle.player.hp);battleRoster.set(activeBattleKey,battle.player);persistBattlePp();saveProgress();renderHome();showScreen('home')});$('resultHome').addEventListener('click',()=>{renderHome();showScreen('home')});$('openDeveloper').addEventListener('click',openDeveloper);$('closeDeveloper').addEventListener('click',closeDeveloper);$('developerLogin').addEventListener('submit',unlockDeveloper);$('developerEditor').addEventListener('submit',applyDeveloperChanges);$('rewardReroll').addEventListener('click',rerollRewards);$('developerOverlay').addEventListener('click',e=>{if(e.target===$('developerOverlay'))closeDeveloper()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('developerOverlay').hidden)closeDeveloper()});saveProgress();reset();showScreen(leagueStage===null?'home':'league');if(leagueStage!==null)renderLeague();showRewardChoices();if(redCeremonyPending&&!pendingRewardChoice)showRedEnding();}
setup();
window.__poketamaReady=true;
