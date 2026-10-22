import {calculateStats,createFighter,createBattle,takeTurn,MOVES} from './battle-engine.mjs';
import {STARTERS,getForm,MOVE_LEARNSETS,availableMoves,initialMoves,migrateMoves,isValidMoves} from './js/data/pokemon.js';
import {ENCOUNTERS,DEX_CATALOG,pokemonCatchMultiplier,pokemonCatchChance,pickEncounter} from './js/data/areas.js';
import {RIVAL_POOL,TRAINERS} from './js/data/trainers.js';
import {SHOP_ITEMS,START_INVENTORY,ITEM_CATEGORY_LABELS,itemCategory} from './js/data/items.js';
import {SAVE_KEY,levelNeed,validCaptured,validIVs,readSave} from './js/storage.js';
import {staticImage,animatedImage} from './js/sprites.js';
import {renderCollectionView} from './js/collection.js';
import {renderInventoryView} from './js/inventory.js';
import {resolveDeveloperWarp} from './js/developer.js';
const $=id=>document.getElementById(id);

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
function saveProgress(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({id:chosen,level:progress.level,exp:progress.exp,money:progress.money,ivs:playerIVs,moves:playerMoves,captures:capturedPokemon,seenPokemon:[...seenPokemon],lastBattleReward,inventory,storedHp,pendingRewardChoice,area,blueCleared,brockCleared,blueChoice,injured,healingDay,freeHealsUsed}));}catch(e){console.warn('저장할 수 없습니다.',e);}}

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
let seenPokemon=new Set([...(Array.isArray(saved?.seenPokemon)?saved.seenPokemon:[]),...capturedPokemon.map(p=>p.dex)].filter(id=>Number.isInteger(id)&&id>0&&id<=1025));
function registerEncounter(dex){if(!Number.isInteger(dex)||seenPokemon.has(dex))return;seenPokemon.add(dex);saveProgress();}
// Backward-compatible additions: existing Lv, money, IV, and captures are retained.
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
  const head=document.createElement('div');head.className='stat-compact-head';
  const label=document.createElement('span');label.className='stat-name';label.textContent=STAT_LABELS[key];
  const star=document.createElement('span');star.className='iv-star iv-'+ivTier(playerIVs[key]);star.textContent='★';
  star.setAttribute('aria-label','개체값 등급');
  const value=document.createElement('div');value.className='stat-value';value.textContent=String(stats[key]);
  head.append(label,star);card.append(head,value);return card;
 }));
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
 const cap=area==='grass'?7:area==='forest'?13:100;
 const level=Math.max(1,Math.min(cap,progress.level-Math.floor(Math.random()*6)));
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
  const enemy=createFighter({id:'wild-'+wild.dex,name:wild.name,level,friendship:0,stats:calculateStats(wild.base,level,zeroIV,{}),moveIds:['tackle']});enemy.rare=wild.rare;enemy.catchMultiplier=pokemonCatchMultiplier(wild.dex,wild.rare);enemies=[enemy];
 }
 player.hp=storedHp===null?player.stats.hp:Math.min(player.stats.hp,Math.max(0,storedHp));
 battle=createBattle(player,enemies,{items:0,balls:0,wild:kind==='wild'});rewardClaimed=false;menuPage='main';
 if(wild)registerEncounter(wild.dex);else if(kind==='blue')registerEncounter(getForm(blueChoice,7).dex);else if(kind==='brock')registerEncounter(74);
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
let collectionTab='dex';
function showCollection(tab='dex'){
 if(animating||learningBusy||pendingRewardChoice)return;
 collectionTab=['dex','achievements','trainers'].includes(tab)?tab:'dex';
 showScreen('home');$('homeScreen').hidden=true;$('collectionScreen').hidden=false;
 renderCollection();window.scrollTo({top:0,behavior:'instant'});
}
function renderCollection(){
 return renderCollectionView({$,collectionTab,capturedPokemon,seenPokemon,blueCleared,brockCleared});
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
 if(animating||pendingRewardChoice)return;
 inventoryMode=mode==='shop'?'shop':'bag';
 inventoryCategory='heal';
 showScreen('home');
 $('homeScreen').hidden=true;
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
function showScreen(next){if(animating||learningBusy)return;screen=next;$('homeScreen').hidden=next!=='home';$('battleScreen').hidden=next!=='battle';window.scrollTo({top:0,behavior:'instant'});}
function renderHome(){
 refreshHealingDay();
 $('currentArea').textContent=area==='grass'?'🌿 초원':area==='forest'?'🌳 숲':'🪨 동굴 (다음 업데이트)';
 $('homeSpriteWrap').classList.remove('area-grass','area-forest','area-cave');
 $('homeSpriteWrap').classList.add('area-'+area);
 $('badgeStatus').textContent=brockCleared?'배지 1 / 8':'배지 0 / 8';
 $('trainerChallenge').hidden=blueCleared&&brockCleared;
 $('trainerChallenge').disabled=injured||!!pendingRewardChoice||(blueCleared?progress.level<13:progress.level<7);
 $('trainerChallenge').textContent=blueCleared?('🪨 웅에게 도전 '+(brockCleared?'✓ 클리어':'(Lv.13)')):'⚔ 라이벌 그린 도전 (Lv.7)';
 $('trainerChallenge').hidden=brockCleared;
 $('trainerRequirement').textContent=brockCleared?'동굴 개방 완료':blueCleared?'Lv.13 달성 시 웅 도전':'Lv.7 달성 시 그린 도전';
 $('injuryStatus').hidden=!injured;
 $('injuryBandage').hidden=!injured;
 $('healButton').hidden=false;
 $('healButton').setAttribute('aria-disabled',String(!injured));
 $('healButtonNote').textContent=injured?(freeHealsUsed<10?'무료 치료 '+(10-freeHealsUsed)+'/10회 남음':'치료비 '+(progress.level*10).toLocaleString('ko-KR')+'원'):'건강 상태 · 부상 시 치료 가능';
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
  if(battleKind==='brock')registerEncounter(95);
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
 $('developerArea').value=area;
 $('developerLevel').focus();
}
function applyDeveloperChanges(e){
 e.preventDefault();
 if(animating||learningBusy)return;
 const requestedLevel=Number($('developerLevel').value),money=Number($('developerMoney').value),targetArea=$('developerArea').value;
 const warp=resolveDeveloperWarp({requestedLevel,money,targetArea});
 if(!warp){
  $('developerSaveError').textContent='레벨 1~100, 보유금 0~999,999,999원, 지역 선택을 확인해줘.';
  return;
 }
 const {targetLevel}=warp;
 const levelChanged=progress.level!==targetLevel;
 area=warp.area;
 blueCleared=warp.blueCleared;
 brockCleared=warp.brockCleared;
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
 $('openCollection').addEventListener('click',()=>showCollection('dex'));
 $('closeCollection').addEventListener('click',()=>{$('collectionScreen').hidden=true;showScreen('home')});
 document.querySelectorAll('[data-collection-tab]').forEach(button=>button.addEventListener('click',()=>{collectionTab=button.dataset.collectionTab;renderCollection();}));
 $('openShop').addEventListener('click',()=>showShopTab('shop'));
 $('openBag').addEventListener('click',()=>showShopTab('bag'));
 $('closeShop').addEventListener('click',()=>{$('shopScreen').hidden=true;showScreen('home')});
 document.querySelectorAll('[data-item-category]').forEach(button=>button.addEventListener('click',()=>showItemCategory(button.dataset.itemCategory)));

 const box=$('starters');STARTERS.forEach(s=>{const b=document.createElement('button');b.type='button';b.className='starter';b.dataset.id=s.id;b.innerHTML='<img alt="" loading="lazy" src="'+staticImage(s.baby)+'"><span>'+s.name+'</span>';b.onclick=()=>{if(animating||learningBusy||chosen===s.id)return;if(!confirm('스타팅을 바꾸면 레벨, 경험치, 보유금, 포획 도감이 초기화돼. 바꿀까?'))return;chosen=s.id;area='grass';blueCleared=false;brockCleared=false;blueChoice=null;injured=false;healingDay=todayKST();freeHealsUsed=0;playerIVs=randomIVs();playerMoves=initialMoves(s.id);capturedPokemon=[];seenPokemon=new Set();lastBattleReward=null;pendingRewardChoice=null;storedHp=null;inventory={...START_INVENTORY};progress={level:1,exp:0,money:0};saveProgress();reset()};box.append(b)});$('restart').addEventListener('click',()=>reset(battleKind));$('startBattle').addEventListener('click',()=>{if(learningBusy||pendingRewardChoice||injured)return;if(storedHp===0){alert('HP가 0이야! 가방에서 회복약을 사용해줘.');showShopTab('bag');return;}$('homeLevelUp').hidden=true;$('homeLevelUp').classList.remove('playing');reset();showScreen('battle')});$('backHome').addEventListener('click',()=>{if(animating||battleKind!=='wild')return;storedHp=battle.player.hp;saveProgress();renderHome();showScreen('home')});$('resultHome').addEventListener('click',()=>{renderHome();showScreen('home')});$('openDeveloper').addEventListener('click',openDeveloper);$('closeDeveloper').addEventListener('click',closeDeveloper);$('developerLogin').addEventListener('submit',unlockDeveloper);$('developerEditor').addEventListener('submit',applyDeveloperChanges);$('developerOverlay').addEventListener('click',e=>{if(e.target===$('developerOverlay'))closeDeveloper()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('developerOverlay').hidden)closeDeveloper()});saveProgress();reset();showScreen('home');showRewardChoices();}
setup();
