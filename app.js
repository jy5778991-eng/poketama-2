import {FAMILY_BY_DEX,ADDITIONAL_FAMILY_BY_DEX,STARTER_FAMILY_BY_DEX} from './js/data/learnsets.js';
import {recentWildMoves} from './js/data/learnsets.js';
import {calculateStats,createFighter,createBattle,takeTurn,MOVES} from './battle-engine.mjs?v=20261024-moves-refactor1';
import {STARTERS,EVOLUTIONS,getForm,MOVE_LEARNSETS,availableMoves,initialMoves,migrateMoves,isValidMoves} from './js/data/pokemon.js?v=20261024-moves-refactor1';
import {ENCOUNTERS,DEX_CATALOG,pokemonCatchMultiplier,pokemonCatchChance,pickEncounter} from './js/data/areas.js?v=20261024-adventure1';
import {RIVAL_POOL,TRAINERS} from './js/data/trainers.js?v=20261024-road2';
import {BADGE_IMAGES} from './js/data/badge-images.js?v=20261024-01';
import {SHOP_ITEMS,START_INVENTORY,ITEM_CATEGORY_LABELS,itemCategory} from './js/data/items.js?v=20261024-adventure1';
import {SAVE_KEY,levelNeed,validCaptured,validIVs,readSave} from './js/storage.js';
import {staticImage,animatedImage} from './js/sprites.js';
import {renderCollectionView} from './js/collection.js?v=20261023-14';
import {renderInventoryView} from './js/inventory.js';
import {resolveDeveloperWarp} from './js/developer.js?v=20261024-road2';
const $=id=>document.getElementById(id);

// Reward choices scale by stage when a stage system is added later.
const REWARD_ITEM_SLOTS_BY_STAGE={1:2,2:3};
const currentRewardStage=()=>area==='grass'?1:area==='forest'?2:area==='cave'?3:4;
const rewardItemSlots=(stage)=>REWARD_ITEM_SLOTS_BY_STAGE[stage]??2;
const baseCashForWin=level=>10+level*5;
const bonusCashForWin=level=>10+level*10;
// Independently roll all 3 reward slots: 85% normal, 14% rare, 1% legendary.
// Duplicate tiers, reward types and exact rewards are intentional.
const REWARD_TIERS={normal:{label:'일반',weight:85},rare:{label:'레어',weight:14},legendary:{label:'전설',weight:1}};
function drawThreeRewards(level){
 const baseCash=bonusCashForWin(level);
 const pool={
  normal:[
   {kind:'cash',amount:baseCash,icon:'💰'},
   {kind:'heal',amount:20,icon:'🧪'},
   {kind:'heal',amount:60,icon:'💊'},
   {kind:'item',id:'pokeBall',quantity:2,icon:'🔴'},
   {kind:'exp',amount:50,icon:'🍬'},
   {kind:'power',effect:'attack',turns:5,icon:'⚔️'},
   {kind:'power',effect:'accuracy',turns:5,icon:'🎯'},
   {kind:'power',effect:'critical',turns:5,icon:'✂️'},
   {kind:'power',effect:'defense',turns:5,icon:'🛡️'}
  ],
  rare:[
   {kind:'cash',amount:baseCash*3,icon:'💰'},
   {kind:'heal',amount:200,icon:'💉'},
   {kind:'item',id:'greatBall',quantity:3,icon:'🔵'},
   {kind:'item',id:'ultraBall',quantity:2,icon:'🟡'},
   ...(inventory.partySlotA!==1?[{kind:'item',id:'partySlotA',quantity:1,icon:'👥'}]:[]),
   ...(inventory.partySlotA===1&&inventory.partySlotB!==1?[{kind:'item',id:'partySlotB',quantity:1,icon:'👥'}]:[]),
   {kind:'ev',stat:'hp',amount:2,icon:'💊'},
   {kind:'ev',stat:'attack',amount:2,icon:'💊'},
   {kind:'ev',stat:'defense',amount:2,icon:'💊'},
   {kind:'ev',stat:'speed',amount:2,icon:'💊'}
  ],
  legendary:[
   {kind:'cash',amount:baseCash*10,icon:'💰'},
   {kind:'heal',full:true,icon:'❤️'},
   {kind:'item',id:'ultraBall',quantity:10,icon:'🟡'},
   {kind:'item',id:'masterBall',quantity:1,icon:'🟣'},
   {kind:'silverCap',icon:'🥈'},
   {kind:'item',id:'secretSwitch',quantity:1,icon:'🔘'},
   {kind:'item',id:'oldSeaMap',quantity:1,icon:'🗺️'}
  ]
 };
 return Array.from({length:3},()=>{
  const roll=Math.random()*100;
  const tier=roll<85?'normal':roll<99?'rare':'legendary';
  return {tier,...pool[tier][Math.floor(Math.random()*pool[tier].length)]};
 });
}
function rewardRerollCost(count){
 const cost=(progress.level*20+100)*2**count;
 return Number.isSafeInteger(cost)&&cost>0?cost:Infinity;
}
function saveProgress(){if(saveReadFailed){console.error('기존 저장 데이터를 읽지 못해 덮어쓰기를 차단했습니다.');return;}try{localStorage.setItem(SAVE_KEY,JSON.stringify({id:chosen,level:progress.level,exp:progress.exp,money:progress.money,ivs:playerIVs,evs:playerEVs,moves:playerMoves,companions,partyOrder,captures:capturedPokemon,caughtSpecies:[...caughtSpecies],seenPokemon:[...seenPokemon],lastBattleReward,inventory,storedHp,pendingRewardChoice,challengeNotified,plusPowerTurns:activeBoosts.attack.length?Math.max(...activeBoosts.attack):0,activeBoosts,area,blueCleared,brockCleared,mistyCleared,greenReturnCleared,surgeCleared,greenThirdCleared,greenFourthCleared,greenFifthCleared,erikaCleared,kogaCleared,sabrinaCleared,blaineCleared,giovanniCleared,leagueStage,hallOfFame,redHallOfFame,leagueCeremonyPending,redCeremonyPending,blueChoice,injured,healingDay,freeHealsUsed}));}catch(e){console.warn('저장할 수 없습니다.',e);}}

const LEAGUE_NAMES=['칸나','시바','국화','목호','챔피언 그린'];
const LEAGUE_TEAMS=[
[['쥬레곤',87,64,90,70,80,70],['파르셀',91,65,50,95,160,70],['야도란',80,65,95,100,110,30],['루주라',124,66,65,115,70,95],['라프라스',131,67,130,85,90,60]],
[['롱스톤',95,65,35,45,103,70],['홍수몬',107,67,50,105,79,76],['시라소몬',106,67,50,120,59,87],['롱스톤',95,68,35,45,103,70],['괴력몬',68,69,90,130,83,55]],
[['팬텀',94,68,60,130,70,110],['골뱃',42,68,75,80,73,90],['고우스트',93,69,45,115,55,95],['아보크',24,70,60,95,69,80],['팬텀',94,71,60,130,70,110]],
[['갸라도스',130,69,95,125,90,81],['신뇽',148,70,61,84,65,70],['신뇽',148,70,61,84,65,70],['프테라',142,72,80,105,70,130],['망나뇽',149,73,91,134,98,80]],
[['피죤투',18,71,83,80,75,101],['후딘',65,72,55,135,75,120],['코뿌리',112,72,105,130,113,40],['갸라도스',130,73,95,125,90,81],['윈디',59,74,90,110,80,95]]];
const saved=readSave();
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
let caughtSpecies=new Set([...(Array.isArray(saved?.caughtSpecies)?saved.caughtSpecies:[]),...capturedPokemon.map(p=>p.dex)].filter(dex=>Number.isInteger(dex)&&dex>0&&dex<=1025));
let seenPokemon=new Set([...(Array.isArray(saved?.seenPokemon)?saved.seenPokemon:[]),...capturedPokemon.map(p=>p.dex)].filter(id=>Number.isInteger(id)&&id>0&&id<=1025));
function registerEncounter(dex){if(!Number.isInteger(dex)||seenPokemon.has(dex))return;seenPokemon.add(dex);saveProgress();}
// Backward-compatible additions: existing Lv, money, IV, and captures are retained.
let inventory=Object.fromEntries(SHOP_ITEMS.map(i=>{const value=Number.isInteger(saved?.inventory?.[i.id])&&saved.inventory[i.id]>=0&&saved.inventory[i.id]<=99?saved.inventory[i.id]:START_INVENTORY[i.id];return [i.id,i.category==='key'?Math.min(1,value):value];}));
// Slot B only makes sense when slot A has been unlocked.
if(inventory.partySlotB)inventory.partySlotA=1;
const BOOST_INFO={attack:{name:'플러스파워',img:'x-attack'},accuracy:{name:'잘 맞히기',img:'x-accuracy'},critical:{name:'크리티컬 커터',img:'dire-hit'},defense:{name:'디펜드 업',img:'x-defense'}};
const activeBoosts=Object.fromEntries(Object.keys(BOOST_INFO).map(key=>[key,(Array.isArray(saved?.activeBoosts?.[key])?saved.activeBoosts[key]:key==='attack'&&Number.isInteger(saved?.plusPowerTurns)?[saved.plusPowerTurns]:[]).filter(n=>Number.isInteger(n)&&n>0&&n<=5).slice(0,100)]));
const boostCount=key=>activeBoosts[key].length;
function tickBoosts(){for(const key of Object.keys(activeBoosts))activeBoosts[key]=activeBoosts[key].map(n=>n-1).filter(n=>n>0);}
let storedHp=Number.isInteger(saved?.storedHp)&&saved.storedHp>=0?saved.storedHp:null;
const EV_STATS=['hp','attack','defense','speed'];
let pendingRewardChoice=null;
if(saved?.pendingRewardChoice){
 const p=saved.pendingRewardChoice;
 if(Array.isArray(p.choices)&&p.choices.length===3&&p.choices.every(x=>x&&REWARD_TIERS[x.tier]&&['cash','heal','item','exp','power','ev','silverCap'].includes(x.kind)&&(x.kind==='item'?SHOP_ITEMS.some(item=>item.id===x.id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=10:x.kind==='ev'&&EV_STATS.includes(x.stat)&&x.amount===2||x.kind==='power'&&(!x.effect||['attack','accuracy','critical','defense'].includes(x.effect))||x.full===true||Number.isSafeInteger(x.amount)&&x.amount>=0))){
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
 const grid=$('statGrid'),form=getForm(chosen,progress.level),stats=calculateStats(form.base,progress.level,playerIVs,playerEVs);
 grid.replaceChildren(...STAT_KEYS.map(key=>{
  const card=document.createElement('div');card.className='stat-card';
  const head=document.createElement('div');head.className='stat-compact-head';
  const label=document.createElement('span');label.className='stat-name';label.textContent=STAT_LABELS[key];
  const star=document.createElement('span');star.className='iv-star iv-'+ivTier(playerIVs[key]);star.textContent='★';
  star.setAttribute('aria-label','개체값 등급');
  const value=document.createElement('div');value.className='stat-value';value.textContent=String(stats[key]);
  head.append(label,star);card.append(head,value);const ev=document.createElement('small');ev.textContent='EV '+playerEVs[key]+' / 100';ev.className='stat-ev-note';card.append(ev);return card;
 }));
}

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms/battleSpeed));
const visualSprite=side=>document.querySelector('.sprite.'+side);
function displayHp(side,hp){const f=side==='player'?battle.player:(battle.enemies[battle.enemyIndex]??battle.enemies.at(-1));const pct=Math.max(0,100*hp/f.stats.hp);$(side+'Bar').style.width=pct+'%';$(side+'Bar').style.background=pct>50?'#59c679':pct>20?'#e8b956':'#d86862';$(side+'Hp').textContent='HP '+hp+' / '+f.stats.hp;shownHp[side]=hp;}
function animateClass(element,klass){element.classList.remove(klass);void element.offsetWidth;element.classList.add(klass);}
function popup(side,amount,critical=false,healing=false){const el=$(side+'Popup');el.classList.remove('visible');el.replaceChildren();const n=document.createElement('span');n.className='number-hit'+(healing?' heal':'');n.textContent=(healing?'+':'−')+amount;el.append(n);if(critical){const crit=document.createElement('span');crit.className='critical';crit.textContent='Critical Hit!';el.append(crit);}void el.offsetWidth;el.classList.add('visible');}
async function playEvents(events){for(const ev of events){if(ev.type==='move'){const el=visualSprite(ev.side);animateClass(el,'attacking');await pause(380);el.classList.remove('attacking');}else if(ev.type==='damage'){const el=visualSprite(ev.side);animateClass(el,'hit');popup(ev.side,ev.amount,ev.critical);await pause(460);displayHp(ev.side,ev.hp);await pause(460);el.classList.remove('hit');$(ev.side+'Popup').classList.remove('visible');}else if(ev.type==='heal'){popup(ev.side,ev.amount,false,true);await pause(300);displayHp(ev.side,ev.hp);await pause(350);$(ev.side+'Popup').classList.remove('visible');}else if(ev.type==='capture'){await playCaptureSequence(ev.success);}else if(ev.type==='miss'){await pause(270);}}}


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
function awardExperience(){
 if(rewardClaimed||battle.result!=='victory')return [];
 rewardClaimed=true;
 const capped=wildRewardCapped();
 const cap=wildRewardLevelCap();
 const gained=capped?0:12+wildEnemy.level*6;
 const baseMoney=baseCashForWin(wildEnemy.level);
 const bonusMoney=bonusCashForWin(wildEnemy.level);
 lastBattleReward={exp:gained,money:baseMoney};
 const messages=['+'+gained+' EXP 획득!','기본 상금 +'+baseMoney+'원 획득!'];
 progress.money+=baseMoney;
 pendingRewardChoice=capped?null:{choices:drawThreeRewards(wildEnemy.level),rerolls:0,gym:false};
 if(capped)messages.push('도전 단계 성장 상한 도달! 야생 경험치와 랜덤 보상은 지급되지 않아.');
 const evolutions=[];
 const learnQueue=[];
 const previousLevel=progress.level;
 progress.exp+=gained;
 while(progress.level<100&&(cap===null||progress.level<cap)&&progress.exp>=levelNeed(progress.level)){
  progress.exp-=levelNeed(progress.level);progress.level++;
  messages.push('LEVEL UP! LV '+progress.level);
  for(const m of MOVE_LEARNSETS[chosen])if(m.level===progress.level)learnQueue.push(m.id);
  const form=EVOLUTIONS[chosen].find(f=>f.level===progress.level);
  if(form){const before=getForm(chosen,progress.level-1);evolutions.push({before,after:form,level:progress.level});messages.push(before.name+' → '+form.name+' 진화!');}
 }
 if(progress.level===100||cap!==null&&progress.level>=cap)progress.exp=0;
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
 const old=progress.level;
 const evolutions=[];
 const learnQueue=[];
 let gained=0;
 let badgeEarned=null;
 if(battle.result==='victory'){
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
  gained=12+level*6;
  trainerExpEarned=gained;
  progress.exp+=gained;
  while(progress.level<100&&progress.exp>=levelNeed(progress.level)){
   progress.exp-=levelNeed(progress.level);
   progress.level++;
   const evolved=EVOLUTIONS[chosen].find(form=>form.level===progress.level);
   if(evolved)evolutions.push({before:getForm(chosen,progress.level-1),after:evolved,level:progress.level});
  }
  if(progress.level===100)progress.exp=0;
  if(sabrinaCleared&&!blaineCleared&&progress.level>=48)area='volcano';
  progress.money+=baseCashForWin(level);
  lastBattleReward={exp:gained,money:baseCashForWin(level)};
  pendingRewardChoice={choices:drawThreeRewards(level),rerolls:0,gym:!!GYM_BADGES[battleKind]};
 }else{
  if(battleKind.startsWith('league'))leagueStage=null;
  trainerExpEarned=0;
  lastBattleReward={exp:0,money:0};
 }
 for(const m of MOVE_LEARNSETS[chosen])if(m.level<=progress.level&&!playerMoves.includes(m.id)&&m.level>battlePlayerLevelStart)learnQueue.push(m.id);
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
function wildRewardCapped(){const cap=wildRewardLevelCap();return cap!==null&&progress.level>=cap;}
function refreshLevelCapIndicator(){
 const capped=wildRewardCapped();
 for(const id of ['homeLevel','playerLevel']){
  const el=$(id);if(!el)continue;
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
 if(!kind||progress.level<TRAINERS[kind].level||challengeNotified.includes(kind)||animating||learningBusy||pendingRewardChoice||pendingTrainerIntro)return;
 challengeNotified.push(kind);
 saveProgress();
 const name=TRAINERS[kind].name;
 $('challengeUnlockTitle').textContent=name+'에게 도전 가능!';
 $('challengeUnlockOverlay').hidden=false;
}

function challengeTrainer(){
 if(hallOfFame.length>0){showAdventure();return;}
 const kind=nextTrainerKind();
 if(injured||pendingRewardChoice||learningBusy||animating||pendingTrainerIntro)return;
 if(!kind||progress.level<TRAINERS[kind].level)return;
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
 if(animating||learningBusy)return;
 // Use the current location's scenery for wild and trainer battles alike.
 const arena=document.querySelector('#battleScreen .arena');
 arena.classList.remove('area-grass','area-forest','area-cave','area-lake','area-cemetery','area-town','area-road','area-city','area-sea','area-volcano','area-strangeForest','area-championRoad','area-championRoad2','area-palletTown','area-rocketBase','area-farawayIsland','area-mountSilver');
 arena.classList.add('area-'+area);
 battleKind=kind;battleOpponent=null;defeatedEnemies=0;trainerExpEarned=0;
 const s=STARTERS.find(x=>x.id===chosen);
 const form=getForm(chosen,progress.level);
 const wild=kind==='wild'?pickEncounter(area):null;
 const cap=area==='grass'?7:area==='forest'?13:area==='cave'?19:area==='lake'?24:area==='cemetery'?27:area==='town'?31:area==='road'?37:area==='city'?44:area==='sea'?48:area==='volcano'?52:area==='strangeForest'?57:area==='championRoad'?62:area==='championRoad2'?75:area==='palletTown'?80:area==='rocketBase'?95:area==='farawayIsland'?90:area==='mountSilver'?100:46;
 const level=Math.max(1,Math.min(cap,progress.level-Math.floor(Math.random()*6)));
 wildEnemy=wild?{...wild,level}:null;
 const player=fighter(s,playerIVs,progress.level,form.base,form.name,playerMoves);
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
 player.hp=storedHp===null?player.stats.hp:Math.min(player.stats.hp,Math.max(0,storedHp));
 battle=createBattle(player,enemies,{items:0,balls:0,wild:kind==='wild'});rewardClaimed=false;menuPage='main';
 if(wild)registerEncounter(wild.dex);else if(kind==='blue')registerEncounter(getForm(blueChoice,7).dex);else if(kind==='brock')registerEncounter(74);else if(kind==='misty')registerEncounter(120);else if(kind==='greenReturn')registerEncounter(17);else if(kind==='surge')registerEncounter(100);else if(kind==='greenThird')registerEncounter(17);else if(kind==='greenFourth')registerEncounter(18);else if(kind==='greenFifth')registerEncounter(18);else if(kind==='erika')registerEncounter(71);else if(kind==='koga')registerEncounter(89);else if(kind==='sabrina')registerEncounter(63);else if(kind==='blaine')registerEncounter(38);else if(kind==='giovanni')registerEncounter(51);
 visualSprite('enemy').classList.remove('enemy-captured','capture-absorbing','capture-escaping');
 $('captureBall').className='capture-ball';$('captureBall').hidden=true;$('captureBall').removeAttribute('style');
 $('captureFlash').className='capture-flash';$('captureFlash').hidden=true;$('captureSuccessNotice').hidden=true;
 const first=enemies[0];
 const opponentName=kind==='red'?'레드':kind.startsWith('league')?LEAGUE_NAMES[Number(kind.slice(6))]:TRAINERS[kind]?.name||'트레이너';
 battle.log.push(kind==='wild'?'⚔️ 야생 '+wild.name+'이(가) 나타났다!':opponentName+'의 도전!');
 shownHp={player:player.hp,enemy:first.hp};
 $('playerName').textContent=form.name;$('promptName').textContent=form.name;
 $('enemyName').textContent=first.name;$('enemyCaughtMark').hidden=kind!=='wild'||!caughtSpecies.has(wild.dex);$('enemyLevel').textContent='LV '+first.level;$('playerLevel').textContent='LV '+progress.level;refreshLevelCapIndicator();
 sprite('playerSprite',form.dex,true,s.emoji);sprite('enemySprite',kind==='wild'?wild.dex:Number(first.id?.replace('trainer-',''))||100,false,kind==='wild'?'🐾':'⚔️');
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

function rewardChoiceText(choice){
 if(choice.kind==='item'&&choice.id==='partySlotA')return '👥 포켓몬 추가 슬롯A · 동료 슬롯 2번째 해금';
 if(choice.kind==='item'&&choice.id==='partySlotB')return '👥 포켓몬 추가 슬롯B · 동료 슬롯 3번째 해금';
 if(choice.kind==='item'&&choice.id==='secretSwitch')return '🔘 비밀 스위치 · 비밀기지 이동 해금 (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='oldSeaMap')return '🗺️ 오래된해도 · 환상의 섬 이동 해금 (중요 아이템)';
 if(choice.kind==='silverCap')return '🥈 은색 병뚜껑 · 원하는 스탯의 개체값을 최대로 강화';
 if(choice.kind==='ev')return '💊 '+({hp:'맥스업 · HP',attack:'타우린 · ATK',defense:'사포닌 · DEF',speed:'알칼로이드 · SPD'}[choice.stat]||'노력치')+' +2 즉시 적용';
 if(choice.kind==='exp')return '🍬 경험치 +'+choice.amount+' 즉시 획득';
 if(choice.kind==='power')return (choice.icon||'✨')+' '+(BOOST_INFO[choice.effect||'attack']?.name||'플러스파워')+' · 5턴 '+({attack:'공격력 +10%',accuracy:'명중률 +10%p',critical:'급소 확률 +10%p',defense:'방어력 +10%'}[choice.effect||'attack']);
 if(choice.kind==='cash')return '💰 추가 상금 +'+choice.amount.toLocaleString('ko-KR')+'원';
 if(choice.kind==='heal')return choice.full?'❤️ 즉시 HP 100% 회복':(choice.icon||'🧪')+' 즉시 HP '+choice.amount+' 회복';
 const item=SHOP_ITEMS.find(x=>x.id===choice.id);
 return (item?.icon||'🎁')+' '+(item?.name||'아이템')+' ×'+choice.quantity;
}
// Pokemon item sprites for the selectable reward cards.
function rewardImageName(choice){
 if(choice.kind==='power')return {attack:'x-attack',accuracy:'x-accuracy',critical:'dire-hit',defense:'x-defense'}[choice.effect||'attack'];
 if(choice.kind==='item')return {partySlotA:'upgrade',partySlotB:'upgrade',secretSwitch:'secret-key',oldSeaMap:'old-sea-map',pokeBall:'poke-ball',greatBall:'great-ball',ultraBall:'ultra-ball',masterBall:'master-ball'}[choice.id];
 if(choice.kind==='heal')return choice.full?'max-potion':choice.amount<=20?'potion':choice.amount<=60?'super-potion':'hyper-potion';
 return null;
}
function showRewardChoices(){
 const layer=$('rewardChoiceOverlay'),options=$('rewardChoiceOptions');
 if(!pendingRewardChoice){layer.hidden=true;return;}
 options.replaceChildren();
 $('rewardChoiceHeading').textContent=pendingRewardChoice.gym?'GYM CLEAR':'BATTLE WIN!';
 pendingRewardChoice.choices.forEach((choice,index)=>{
  const b=document.createElement('button');b.type='button';
  const unique=choice.kind==='item'&&SHOP_ITEMS.find(item=>item.id===choice.id)?.category==='key';
  const unavailable=unique&&(inventory[choice.id]===1||choice.id==='partySlotB'&&inventory.partySlotA!==1);
  b.disabled=unavailable;
  b.className='reward-choice-item reward-tier-'+choice.tier;
  const tag=document.createElement('strong');tag.className='reward-tier-label';tag.textContent=REWARD_TIERS[choice.tier]?.label||'일반';
  const imageName=rewardImageName(choice);
  if(imageName){
   const img=document.createElement('img');
   img.className='reward-item-sprite';
   img.src='https://play.pokemonshowdown.com/sprites/itemicons/'+imageName+'.png';
   img.alt='';
   img.loading='lazy';
   b.append(tag,img);
  }else b.append(tag);
  const content=document.createElement('span');
  content.textContent=imageName?rewardChoiceText(choice).replace(/^[^가-힣A-Za-z0-9]+/,''):rewardChoiceText(choice);
  b.append(content);b.onclick=()=>claimRewardChoice(index);options.append(b);
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
 pendingRewardChoice.choices=drawThreeRewards(progress.level);
 pendingRewardChoice.rerolls++;
 saveProgress();
 showRewardChoices();
}
function showSilverCapStatChoice(){
 const layer=$('silverCapOverlay'),options=$('silverCapOptions');
 options.replaceChildren();
 for(const stat of EV_STATS){
  const b=document.createElement('button');
  b.type='button';b.className='silver-cap-option';
  b.textContent=STAT_LABELS[stat]+' · 개체값 최대 강화';
  b.disabled=playerIVs[stat]===16;
  b.onclick=()=>{
   playerIVs[stat]=16;
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
function claimRewardChoice(index){
 if(!pendingRewardChoice||!Number.isInteger(index))return;
 const choice=pendingRewardChoice.choices[index];
 if(!choice)return;
 if(choice.kind==='silverCap'){
  showSilverCapStatChoice();
  return;
 }else if(choice.kind==='ev'){
  const stat=choice.stat;
  if(!EV_STATS.includes(stat))return;
  const total=Object.values(playerEVs).reduce((sum,n)=>sum+n,0);
  const gain=Math.min(2,100-playerEVs[stat],216-total);
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
function renderInventory(){
 return renderInventoryView({$,inventoryMode,inventoryCategory,inventory,progress,chosen,playerIVs,storedHp,saveProgress,renderHome,setStoredHp:hp=>{storedHp=hp;}});
}
function showScreen(next){if(animating||learningBusy)return;screen=next;$('homeScreen').hidden=next!=='home';$('battleScreen').hidden=next!=='battle';$('leagueScreen').hidden=next!=='league';window.scrollTo({top:0,behavior:'instant'});if(next==='home')showChallengeUnlockNotice();}
function renderPowerStatus(){
 for(const id of ['homePlusPower','battlePlusPower']){
  const el=$(id);if(!el)continue;
  el.replaceChildren();
  for(const [key,info] of Object.entries(BOOST_INFO)){
   const durations=activeBoosts[key];
   if(!durations.length)continue;
   const chip=document.createElement('span');chip.className='boost-chip';
   const img=document.createElement('img');
   img.src='https://play.pokemonshowdown.com/sprites/itemicons/'+info.img+'.png';img.alt=info.name;
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
  button.onclick=()=>{layer.remove();option.action?.();};target.append(button);
 }
 layer.hidden=false;
}
function showPartyManager(){
 if(animating||learningBusy||pendingRewardChoice)return;
 const members=teamMembers();
 const max=1+(inventory.partySlotA===1?1:0)+(inventory.partySlotB===1?1:0);
 partyOverlay('👥 동료 관리','보유 동료 '+members.length+'/'+max+'마리 · 첫 번째 동료가 선봉이야. 스타팅은 방출할 수 없어.',[
 ...members.map((m,i)=>({text:(i+1)+'. '+m.name+' Lv.'+m.level+(m.starter?' · 스타팅':'')+(i===0?' ⭐ 선봉':'')+' · 선봉으로',action:()=>{
 partyOrder=[m.key,...members.filter(x=>x.key!==m.key).map(x=>x.key)];saveProgress();renderHome();showPartyManager();
 }})),
 {text:'닫기',action:()=>{}}
 ]);
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
  partyOverlay('동료 합류!',member.name+' Lv.'+member.level+'이(가) 동료가 됐어! 개체값이 새로 생성됐어.',[{text:'확인',action:()=>{}}]);
 };
 partyOverlay('🔴 포획 성공!',wildEnemy.name+' Lv.'+wildEnemy.level+'을(를) 동료로 영입할까?',[
 {text:'동료로 영입',action:()=>{
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
 const unlocked=progress.level>=targetLevel;
 const challengeDisabled=injured||!!pendingRewardChoice||!unlocked||finalArea;
 $('trainerChallenge').disabled=hallOfFame.length>0?false:challengeDisabled;
 const redButton=$('redChallenge');
 redButton.hidden=area!=='mountSilver'||!hallOfFame.length;
 redButton.disabled=progress.level<92||injured||!!pendingRewardChoice||animating;
 $('redChallengeNote').textContent=progress.level<92?'Lv.92에 해금':injured?'치료 후 도전':pendingRewardChoice?'보상 선택 후 도전':'피카츄 Lv.99 외 5마리';
 $('trainerButtonTitle').textContent=hallOfFame.length?'🧭 모험':'도전';
 $('leagueEnter').hidden=area!=='championRoad2';
 $('leagueEnter').disabled=area!=='championRoad2'||progress.level<67||injured||!!pendingRewardChoice;
 $('leagueRecords').hidden=hallOfFame.length===0;
 $('trainerChallenge').classList.toggle('adventure-ready',hallOfFame.length>0||unlocked&&!challengeDisabled);
 $('trainerChallenge').classList.toggle('adventure-locked',hallOfFame.length===0&&(!unlocked||finalArea));
 if(hallOfFame.length===0)$('trainerButtonTitle').textContent=finalArea?'🏅 관장 도전 완료':trainerKind==='blue'||trainerKind==='greenReturn'||trainerKind==='greenThird'||trainerKind==='greenFourth'||trainerKind==='greenFifth'?'⚔ 그린에게 도전':trainerKind==='brock'?'🪨 웅에게 도전':trainerKind==='misty'?'💧 이슬이에게 도전':trainerKind==='erika'?'🌸 민화에게 도전':trainerKind==='koga'?'☠️ 독수에게 도전':trainerKind==='sabrina'?'🔮 초련에게 도전':trainerKind==='giovanni'?'🌍 비주기에게 도전':trainerKind==='blaine'?'🔥 강연에게 도전':'⚡ 마티즈에게 도전';
 $('trainerButtonNote').textContent=hallOfFame.length>0?'지역 선택 · 언제든 이동':finalArea?(area==='championRoad2'?'챔피언로드 2 탐험':'관장 도전 완료'):!unlocked?'Lv.'+targetLevel+'에 해금':injured?'치료 후 재도전':pendingRewardChoice?'보상 선택 후 도전':trainerKind==='greenFifth'?'승리하면 챔피언로드 2 개방':trainerKind==='misty'?'승리하면 호수 개방':(trainerKind==='greenReturn'||trainerKind==='greenFourth')?'승리해도 지역은 그대로':trainerKind==='greenThird'?'승리하면 도시 개방':trainerKind==='erika'?'승리하면 도로 개방':trainerKind==='koga'?'승리하면 대도시 개방':trainerKind==='giovanni'?'승리하면 챔피언로드 개방':trainerKind==='blaine'?'승리하면 이상한 숲 개방':trainerKind==='sabrina'?'승리하면 바다 개방':trainerKind==='surge'?'승리하면 공동묘지 개방':'승리하면 '+(trainerKind==='blue'?'숲':'동굴')+' 개방';
 $('injuryStatus').hidden=!injured;
 $('injuryBandage').hidden=!injured;
 $('healButton').hidden=false;
 $('healButton').setAttribute('aria-disabled',String(!injured));
 $('healButtonNote').textContent=injured?(freeHealsUsed<10?'무료 치료 '+(10-freeHealsUsed)+'/10회 남음':'치료비 '+(progress.level*10).toLocaleString('ko-KR')+'원'):'건강 상태 · 부상 시 치료 가능';
 $('startBattle').disabled=injured||!!pendingRewardChoice;
 const s=STARTERS.find(x=>x.id===chosen),form=getForm(chosen,progress.level);
 $('homeName').textContent=form.name;$('homeLevel').textContent='LV '+progress.level;
 $('homeMoney').textContent='💰 '+progress.money.toLocaleString('ko-KR')+'원'+(lastBattleReward?' (+'+lastBattleReward.money.toLocaleString('ko-KR')+')':'');
 renderCaptures();
 const maxHp=calculateStats(form.base,progress.level,playerIVs,playerEVs).hp;
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
function render(){renderPowerStatus();const p=battle.player,e=battle.enemies[battle.enemyIndex]??battle.enemies.at(-1);
 $('commandFight').disabled=animating||battle.ended;
 $('commandBall').disabled=animating||battle.ended||!battle.wild;
 $('commandHeal').disabled=animating||battle.ended;
 $('commandRun').disabled=animating||battle.ended||!battle.wild;
 for(const item of SHOP_ITEMS){
  const el=$('battleItem-'+item.id);
  if(!el)continue; // Key items don't have battle buttons.
  el.disabled=animating||battle.ended||inventory[item.id]<1||(item.category==='heal'&&p.hp>=p.stats.hp)||(item.category==='ball'&&!battle.wild);
  const counter=el.querySelector('.item-count');if(counter)counter.textContent='×'+inventory[item.id];
 }

 $('backHome').disabled=battleKind!=='wild';
 if(battle.ended)showMenu('main');for(const [f,prefix] of [[p,'player'],[e,'enemy']]){displayHp(prefix,animating?shownHp[prefix]:f.hp);$(prefix+'Status').textContent=f.status?.type==='paralysis'?'⚡ 마비':f.status?.type==='sleep'?'💤 수면':f.status?.type==='poison'?'☠ 독':'';}
$('turn').textContent=battle.ended?(battle.result==='victory'?'WIN!':'LOSE!'):'TURN '+String(battle.turn+1).padStart(2,'0');
$('moves').replaceChildren(...p.moveIds.map(id=>{const m=MOVES[id],b=document.createElement('button');b.disabled=animating||battle.ended||p.pp[id]===0;b.innerHTML='<span class="move-name">'+m.name+'</span><span class="move-pp">'+(m.power?'위력 '+m.power+' · ':'')+'PP '+p.pp[id]+'/'+m.pp+'</span>';b.addEventListener('click',()=>act({moveId:id}));return b;}));$('log').replaceChildren(...battle.log.slice(-15).reverse().map(line=>{const t=document.createElement('p');t.textContent=line;return t;}));renderStatPanel();}
async function act(a){
 if(animating||battle.ended||learningBusy)return;
 let learnQueue=[];
 const previousHp={player:battle.player.hp,enemy:(battle.enemies[battle.enemyIndex]??battle.enemies.at(-1)).hp};
 try{
  animating=true;
  // Consume one item only after the engine accepts the player's turn.
  // Each completed battle turn consumes one boost turn, including capture/item turns.
  battle.player.attackBuffMultiplier=1+0.1*boostCount('attack');
  battle.player.accuracyBuff=0.1*boostCount('accuracy');
  battle.player.critBuff=0.1*boostCount('critical');
  battle.player.defenseBuffMultiplier=1+0.1*boostCount('defense');
  takeTurn(battle,a);
  tickBoosts();saveProgress();renderPowerStatus();
  if(a.type==='item'||a.type==='ball'){
   inventory[a.itemId]--;
   saveProgress();
  }

  const events=[...battle.events];
 if(battleKind!=='wild'){
  for(const event of events){if(event.type==='knockout'&&event.side==='enemy'){
   defeatedEnemies++;
  }}
 }
 shownHp={...previousHp};render();await playEvents(events);
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
    if(battle.result==='capture'){
      // Catching is not a battle victory: never open a choice reward.
      pendingRewardChoice=null;
      capturedPokemon.push({name:wildEnemy.name,dex:wildEnemy.dex,level:wildEnemy.level});
      caughtSpecies.add(wildEnemy.dex);
      if(capturedPokemon.length>200)capturedPokemon.shift();
      saveProgress();
      offerCapturedCompanion();
    }
    if(battle.result!=='victory'&&battleKind==='wild'){lastBattleReward={exp:0,money:0};saveProgress();}
    const maxBefore=battle.player.stats.hp;
    const hpBefore=battle.player.hp;
    const reward=battleKind==='wild'?awardExperience():finishTrainerBattle();
    learnQueue=reward?.learnQueue||[];
    if(reward?.newLevel>reward?.previousLevel){
     const currentMax=calculateStats(getForm(chosen,progress.level).base,progress.level,playerIVs,playerEVs).hp;
     storedHp=Math.max(0,Math.min(currentMax,hpBefore+(currentMax-maxBefore)));
    } else storedHp=hpBefore;
    saveProgress();
    if(reward?.newLevel>reward?.previousLevel)pendingLevelUp={previous:reward.previousLevel,current:reward.newLevel};
    if(reward?.evolutions?.length)await showEvolutions(reward.evolutions);
    // Gym clear sequence: badge reveal first, then reward selection on the home screen.
    if(reward?.badgeEarned)await showBadgeAward(reward.badgeEarned);
    $('battleResult').hidden=false;
    $('resultTitle').textContent=battle.result==='victory'?'승리!':battle.result==='capture'?'포획 성공!':'패배!';
    if(battle.result==='defeat'){injured=true;storedHp=0;if(battleKind.startsWith('league'))leagueStage=null;saveProgress();}
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
   renderHome();showScreen(leagueStage===null?'home':'league');
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
 $('leagueNext').disabled=injured||!!pendingRewardChoice;
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
 $('redChallenge').addEventListener('click',()=>{if(area!=='mountSilver'||!hallOfFame.length||progress.level<92||injured||pendingRewardChoice||animating||learningBusy)return;battlePlayerLevelStart=progress.level;reset('red');showScreen('battle')});
 $('adventureClose').addEventListener('click',()=>{$('adventureOverlay').hidden=true});
 for(const button of document.querySelectorAll('[data-adventure-area]'))button.addEventListener('click',()=>travelTo(button.dataset.adventureArea));
 $('leagueEnter').addEventListener('click',()=>{if(!greenFifthCleared||progress.level<67||injured||pendingRewardChoice)return;leagueStage=0;saveProgress();renderLeague();showScreen('league')});
 $('leagueNext').addEventListener('click',()=>{if(leagueStage===null||injured||pendingRewardChoice)return;const kind='league'+leagueStage;battlePlayerLevelStart=progress.level;reset(kind);showScreen('battle')});
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
 $('commandFight').addEventListener('click',()=>showMenu('fight'));
 $('commandBall').addEventListener('click',()=>showMenu('ball'));
 $('commandHeal').addEventListener('click',()=>showMenu('heal'));
 $('commandRun').addEventListener('click',()=>{if(animating||battle.ended||!battle.wild)return;storedHp=battle.player.hp;saveProgress();showMenu('main');renderHome();showScreen('home')});
 $('submenuBack').addEventListener('click',()=>{if(!animating&&!battle.ended)showMenu('main')});
 $('homeLevelUp').addEventListener('animationend',e=>{if(e.target!==$('homeLevelUp'))return;$('homeLevelUp').classList.remove('playing');$('homeLevelUp').hidden=true;});
 for(const item of SHOP_ITEMS){
  const button=$('battleItem-'+item.id);
  if(!button)continue; // Key items do not have battle action buttons.
  button.addEventListener('click',()=>act({type:item.category==='ball'?'ball':'item',itemId:item.id,power:item.power,multiplier:item.multiplier,guaranteedCatch:item.guaranteedCatch===true}));
 }
 $('openParty')?.addEventListener('click',showPartyManager);
 $('openCollection').addEventListener('click',()=>showCollection('dex'));
 $('closeCollection').addEventListener('click',()=>{$('collectionScreen').hidden=true;showScreen('home')});
 document.querySelectorAll('[data-collection-tab]').forEach(button=>button.addEventListener('click',()=>{collectionTab=button.dataset.collectionTab;renderCollection();}));
 $('openShop').addEventListener('click',()=>showShopTab('shop'));
 $('openBag').addEventListener('click',()=>showShopTab('bag'));
 $('closeShop').addEventListener('click',()=>{$('shopScreen').hidden=true;if(leagueStage!==null){renderLeague();showScreen('league')}else showScreen('home')});
 document.querySelectorAll('[data-item-category]').forEach(button=>button.addEventListener('click',()=>showItemCategory(button.dataset.itemCategory)));

 const box=$('starters');STARTERS.forEach(s=>{const b=document.createElement('button');b.type='button';b.className='starter';b.dataset.id=s.id;b.innerHTML='<img alt="" loading="lazy" src="'+staticImage(s.baby)+'"><span>'+s.name+'</span>';b.onclick=()=>{if(animating||learningBusy||chosen===s.id)return;if(!confirm('스타팅을 바꾸면 레벨, 경험치, 보유금, 포획 도감이 초기화돼. 바꿀까?'))return;chosen=s.id;companions=[];partyOrder=[];area='grass';blueCleared=false;brockCleared=false;mistyCleared=false;greenReturnCleared=false;surgeCleared=false;greenThirdCleared=false;greenFourthCleared=false;greenFifthCleared=false;leagueStage=null;leagueCeremonyPending=false;redCeremonyPending=false;erikaCleared=false;kogaCleared=false;sabrinaCleared=false;blaineCleared=false;giovanniCleared=false;blueChoice=chooseRivalStarter(s.id);injured=false;healingDay=todayKST();freeHealsUsed=0;playerIVs=randomIVs();playerEVs={hp:0,attack:0,defense:0,speed:0};playerMoves=initialMoves(s.id);capturedPokemon=[];caughtSpecies=new Set();seenPokemon=new Set();lastBattleReward=null;pendingRewardChoice=null;challengeNotified=[];$('challengeUnlockOverlay').hidden=true;storedHp=null;for(const k of Object.keys(activeBoosts))activeBoosts[k]=[];inventory={...START_INVENTORY};progress={level:1,exp:0,money:0};saveProgress();reset()};box.append(b)});$('startBattle').addEventListener('click',()=>{if(learningBusy||pendingRewardChoice||injured)return;if(storedHp===0){alert('HP가 0이야! 가방에서 회복약을 사용해줘.');showShopTab('bag');return;}$('homeLevelUp').hidden=true;$('homeLevelUp').classList.remove('playing');reset();showScreen('battle')});$('backHome').addEventListener('click',()=>{if(animating||battleKind!=='wild')return;storedHp=battle.player.hp;saveProgress();renderHome();showScreen('home')});$('resultHome').addEventListener('click',()=>{renderHome();showScreen('home')});$('openDeveloper').addEventListener('click',openDeveloper);$('closeDeveloper').addEventListener('click',closeDeveloper);$('developerLogin').addEventListener('submit',unlockDeveloper);$('developerEditor').addEventListener('submit',applyDeveloperChanges);$('rewardReroll').addEventListener('click',rerollRewards);$('developerOverlay').addEventListener('click',e=>{if(e.target===$('developerOverlay'))closeDeveloper()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('developerOverlay').hidden)closeDeveloper()});saveProgress();reset();showScreen(leagueStage===null?'home':'league');if(leagueStage!==null)renderLeague();showRewardChoices();if(redCeremonyPending&&!pendingRewardChoice)showRedEnding();}
setup();
window.__poketamaReady=true;
