import {moveDescription} from './js/data/moves.js?v=20261110-payday90';
import {learnsetForDex,FAMILY_BY_DEX,ADDITIONAL_FAMILY_BY_DEX,STARTER_FAMILY_BY_DEX} from './js/data/learnsets.js?v=20261110-meowth-payday32';
import {recentWildMoves} from './js/data/learnsets.js?v=20261110-meowth-payday32';
import {calculateStats,createFighter,createBattle,takeTurn,MOVES} from './battle-engine.mjs?v=20261111-leftovers3';
import {STARTERS,EVOLUTIONS,getForm,MOVE_LEARNSETS,availableMoves,initialMoves,migrateMoves,isValidMoves,EEVEE_FORMS,setEeveeForm,getEeveeForm,setGengarEvolved,getGengarEvolved,setRaichuEvolved,getRaichuEvolved} from './js/data/pokemon.js?v=20261110-persist-tm-moves';

import {ENCOUNTERS,DEX_CATALOG,pokemonCatchMultiplier,pokemonCatchChance,pickEncounter,LEGENDARY_DEX,RARE_DEX,HYPER_DEX,EVOLVED_DEX} from './js/data/areas.js?v=20261110-white-flute';
import {RIVAL_POOL,TRAINERS} from './js/data/trainers.js?v=20261104-mew2-rocketlevels259';
import {BADGE_IMAGES} from './js/data/badge-images.js?v=20261024-01';
import {SHOP_ITEMS,START_INVENTORY,ITEM_CATEGORY_LABELS,itemCategory,itemSpriteUrl} from './js/data/items.js?v=20261111-leftovers3';
import {SAVE_KEY,levelNeed,validCaptured,validIVs,readSave} from './js/storage.js?v=20261029-growth-moves59';
import {visualSprite,displayHpBar,animateClass,popup,sprite} from './js/battle-ui.js?v=20261029-recallstar117';
import {staticImage,animatedImage} from './js/sprites.js';
import {BASE_STATS} from './js/data/base-stats.js?v=20261110-nine-species-rebalance';
import {renderCollectionView} from './js/collection.js?v=20261105-dex-cap335';
import {renderInventoryView} from './js/inventory.js?v=20261111-money-ledger';
import {resolveDeveloperWarp} from './js/developer.js?v=20261026-hall-dev46';
const $=id=>document.getElementById(id);
const FIRE_TYPE_DEX=new Set([4,5,6,37,38,58,59,77,78,126,136,146]);
const GRASS_TYPE_DEX=new Set([1,2,3,43,44,45,46,47,69,70,71,102,103,114]);
const FLYING_TYPE_DEX=new Set([6,12,16,17,18,21,22,41,42,83,84,85,123,130,142,144,145,146,149,169]);
const WATER_TYPE_DEX=new Set([7,8,9,54,55,60,61,62,72,73,79,80,86,87,90,91,98,99,116,117,118,119,120,121,129,130,131,134,138,139,140,141]);
const BUG_TYPE_DEX=new Set([10,11,12,13,14,15,46,47,48,49,123,127,212]);
const ELECTRIC_TYPE_DEX=new Set([25,26,81,82,100,101,125,135,145,172]);
const HELD_ITEMS=['wideLens','focusSash','hardClaw','shellBell','leftovers','scopeLens','revivalSeed','quickClaw','eviolite','sitrusBerry','oranBerry'];
const HELD_MAX={wideLens:3,focusSash:6,hardClaw:5,shellBell:3,leftovers:4,scopeLens:5,revivalSeed:1,quickClaw:4,eviolite:3,sitrusBerry:5,oranBerry:5};
const STACKABLE_HELD_ITEMS=['wideLens','hardClaw','scopeLens','focusSash','shellBell','leftovers','quickClaw','eviolite'];
function heldItemPerPokemonLimit(id){return id==='focusSash'?6:id==='shellBell'?3:id==='leftovers'?3:id==='quickClaw'?4:id==='wideLens'?2:['hardClaw','scopeLens','eviolite'].includes(id)?3:1;}
const TM01_DEX=new Set([25,26,8,9,35,36,107,34,31,149,115,76,39,40,56,57,61,62,66,67,68,80,104,105,113,112,143,150,151]);
let tm01Learned=Array.isArray(readSave()?.tm01Learned)?readSave().tm01Learned.filter(k=>typeof k==='string'):[];
// TM02: initial agreed kick-compatible species plus Mewtwo/Mew. Only eligible level 28+ party members can roll or use it.
const TM02_DEX=new Set([106,107,56,57,66,67,68,61,62,4,5,6,7,8,9,34,31,115,143,25,26,104,105,112,126,150,151]);
let tm02Learned=Array.isArray(readSave()?.tm02Learned)?readSave().tm02Learned.filter(k=>typeof k==='string'):[];
function tm02Targets(){return teamMembers().filter(m=>m.level>=28&&m.level<=60&&TM02_DEX.has(m.dex)&&!tm02Learned.includes(m.key));}
function tm01Targets(){return teamMembers().filter(m=>m.level>=22&&m.level<=60&&TM01_DEX.has(m.dex)&&!tm01Learned.includes(m.key));}

// TM03–TM19: eligibility uses each compatible party member's own level, not the party maximum.
const EXTRA_TM_CONFIG={
 tm03:{number:'03',name:'마구할퀴기',moveId:'furySwipes',minLevel:9,maxLevelExclusive:61,dex:[52,53,56,57,46,47,4,5,6,27,28,34,31,115,123]},
 tm04:{number:'04',name:'바위깨기',moveId:'rockSmash',minLevel:8,maxLevelExclusive:61,dex:[66,67,68,56,57,106,107,34,31,74,75,76,95,112,104,105,115,143,127,150,151]},
 tm05:{number:'05',name:'번개펀치',moveId:'thunderPunch',minLevel:22,maxLevelExclusive:61,tier:'rare',dex:[125,107,66,67,68,56,57,34,31,115,143,112,150,151,172,25,26]},
 tm06:{number:'06',name:'불꽃펀치',moveId:'firePunch',minLevel:22,maxLevelExclusive:61,tier:'rare',dex:[126,107,66,67,68,56,57,34,31,115,143,112,150,151,4,5,6]},
 tm07:{number:'07',name:'냉동펀치',moveId:'icePunch',minLevel:22,maxLevelExclusive:61,tier:'rare',dex:[124,107,66,67,68,56,57,34,31,115,143,112,150,151,7,8,9]},
 tm08:{number:'08',name:'진흙뿌리기',moveId:'mudSlap',minLevel:10,maxLevelExclusive:71,tier:'rare',dex:[1,2,3,4,5,6,7,8,9,16,17,18,19,20,21,22,27,28,29,30,31,32,33,34,50,51,52,53,54,55,60,61,62,74,75,76,79,80,83,84,85,95,98,99,104,105,115,133,134,135,136,196,197,150,151]},
 tm09:{number:'09',name:'그로우펀치',moveId:'powerUpPunch',minLevel:16,maxLevelExclusive:70,tier:'hyper',dex:[4,5,6,7,8,9,173,35,36,174,39,40,54,55,56,57,66,67,68,74,75,76,88,89,96,97,106,107,108,115,113,122,124,125,126,446,143,149,150,151]},
 tm10:{number:'10',name:'돌진',moveId:'takeDown',minLevel:18,maxLevelExclusive:60,tier:'rare',dex:[1,2,3,19,20,58,59,21,22,77,78,111,112,115,120,121,133,134,135,136,196,197,147,148,149]},
 tm11:{number:'11',name:'날개쉬기',moveId:'roost',minLevel:40,maxLevelExclusive:101,tier:'legendary',weight:1,dex:[6,12,15,16,17,18,21,22,41,42,169,49,83,84,85,123,142,144,145,146,149,151]},
 tm12:{number:'12',name:'애교부리기',moveId:'charm',minLevel:15,maxLevelExclusive:40,tier:'hyper',weight:1,dex:[1,2,3,172,25,26,173,35,36,174,39,40,37,38,43,44,45,52,53,58,59,113,133,134,135,136,196,197,131,151]},
 tm13:{number:'13',name:'싫은소리',moveId:'screech',minLevel:20,maxLevelExclusive:50,tier:'hyper',weight:1,dex:[174,39,40,41,42,169,52,53,72,73,81,82,95,104,105,90,91,109,110,140,141,151]},
 tm14:{number:'14',name:'맹독',moveId:'toxic',minLevel:20,maxLevelExclusive:56,tier:'hyper',weight:1,dex:[1,2,3,13,14,15,23,24,29,30,31,32,33,34,41,42,169,43,44,45,48,49,69,70,71,72,73,88,89,92,93,94,109,110,150,151]},
 tm15:{number:'15',name:'전기자석파',moveId:'thunderWave',minLevel:12,maxLevelExclusive:50,tier:'hyper',weight:1,dex:[19,20,172,25,26,173,35,36,63,64,65,79,80,81,82,92,93,94,100,101,113,120,121,125,135,147,148,149]},
 tm16:{number:'16',name:'초음파',moveId:'supersonic',minLevel:10,maxLevelExclusive:50,tier:'rare',weight:1,dex:[12,41,42,169,81,82,48,49]},
 tm17:{number:'17',name:'인파이트',moveId:'closeCombat',minLevel:45,maxLevelExclusive:101,tier:'hyper',weight:1,dex:[56,57,58,59,62,66,67,68,83,106,107,123,212,128,151]},
 tm18:{number:'18',name:'빛의장막',moveId:'lightScreen',minLevel:40,maxLevelExclusive:101,tier:'legendary',weight:1,dex:[172,25,26,63,64,65,173,35,36,174,39,40,150,151,122,120,121,79,80,135,37,38,145,100,101,102,103]},
 tm19:{number:'19',name:'칼춤',moveId:'swordsDance',minLevel:45,maxLevelExclusive:101,tier:'legendary',weight:1,dex:[4,5,6,15,27,28,46,47,83,84,85,72,73,98,99,104,105,123,127,136,141,151,212]},
 // Lv.5-50; rare tier, weight 1. Snorlax and Dragonite families excluded from Growl.
 tm20:{number:'20',name:'울음소리',moveId:'growl',minLevel:5,maxLevelExclusive:51,tier:'rare',weight:1,dex:[1,2,3,4,5,6,7,8,9,16,17,18,19,20,21,22,29,30,31,32,33,34,172,25,26,133,134,135,136,196,197,174,39,40,173,35,36,37,38,58,59,77,78,79,80,131]},
 tm21:{number:'21',name:'째려보기',moveId:'leer',minLevel:5,maxLevelExclusive:51,tier:'rare',weight:1,dex:[21,22,16,17,18,19,20,56,57,32,33,34,29,30,31,4,5,6,7,8,9,66,67,68,27,28,50,51,23,24,58,59,52,53,104,105,95,208,123,212,127,128,115,129,130,147,148,149]},
 tm22:{number:'22',name:'손톱갈기',moveId:'honeClaws',minLevel:20,maxLevelExclusive:66,tier:'rare',weight:1,dex:[4,5,6,27,28,29,30,31,32,33,34,52,53,56,57,46,47,98,99,54,55,140,141,123,127,142,149,150,151]},
 tm23:{number:'23',name:'도깨비불',moveId:'willOWisp',minLevel:35,maxLevelExclusive:71,tier:'legendary',weight:1,dex:[37,38,58,59,4,5,6,92,93,94,109,110,126,136,151,146,105]},
 // Hyper reward (weight 1): Lv.50-85, listed flying families and selected legendary Pokemon.
 tm24:{number:'24',name:'폭풍',moveId:'hurricane',minLevel:50,maxLevelExclusive:86,tier:'hyper',weight:1,dex:[16,17,18,130,149,150,151,83,21,22,12,41,42,169]}
};
const extraTmDex=Object.fromEntries(Object.entries(EXTRA_TM_CONFIG).map(([key,config])=>[key,new Set(config.dex)]));
let extraTmLearned=Object.fromEntries(Object.keys(EXTRA_TM_CONFIG).map(key=>[key,Array.isArray(readSave()?.extraTmLearned?.[key])?readSave().extraTmLearned[key].filter(v=>typeof v==='string'):[]]));
function extraTmTargets(kind){
 const cfg=EXTRA_TM_CONFIG[kind];
 if(!cfg)return [];
 return teamMembers().filter(m=>{
  if(m.level<cfg.minLevel||m.level>=(cfg.maxLevelExclusive??101)||!extraTmDex[kind].has(m.dex)||extraTmLearned[kind].includes(m.key))return false;
  // Don't offer a TM for a move the Pokémon already has or has naturally
  // learned by its current level (even if it was later forgotten).
  const current=m.starter?playerMoves:(companions.find(c=>c.family===m.family)?.moves||[]);
  if(current.includes(cfg.moveId))return false;
  const natural=m.starter?availableMoves(chosen,m.level):(learnsetForDex(m.dex)||[]).filter(x=>x.level<=m.level);
  // TM18 can teach Light Screen after it was forgotten, even for species that
  // could have learned it naturally (e.g. Mew or Voltorb).
  return ['tm18','tm19'].includes(kind)||!natural.some(move=>move.id===cfg.moveId);
 });
}
function extraTmLabel(kind){const cfg=EXTRA_TM_CONFIG[kind];return cfg?'기술머신'+cfg.number+'.'+cfg.name:'';}

const isLens=id=>id==='wideLens';

// Reward choices scale by stage when a stage system is added later.
const REWARD_ITEM_SLOTS_BY_STAGE={1:2,2:3};
const currentRewardStage=()=>area==='grass'?1:area==='forest'?2:area==='cave'?3:4;
const rewardItemSlots=(stage)=>REWARD_ITEM_SLOTS_BY_STAGE[stage]??2;
const baseCashForWin=level=>40+level*4;
const WILD_ADVANCED_REWARD_MULTIPLIER=1.2;
const TRAINER_MONEY_REWARD_MULTIPLIER=2;
const TRAINER_EXP_REWARD_MULTIPLIER=1.5;
const scaledBattleReward=(base,multiplier)=>Math.floor(base*multiplier);
const wildHasAdvancedReward=enemy=>!!enemy&&(enemy.tier?enemy.tier!=='normal'||EVOLVED_DEX.has(enemy.dex):EVOLVED_DEX.has(enemy.dex)||RARE_DEX.has(enemy.dex)||HYPER_DEX.has(enemy.dex)||LEGENDARY_DEX.has(enemy.dex)||!!enemy.rare);
const bonusCashForWin=()=>200+10*Math.max(...teamMembers().map(m=>m.level));
// Each reward slot rolls independently: 74% normal, 20.4% rare, 4.8% hyper, 0.8% legendary.
// Duplicate tiers, reward types and exact rewards are intentional.
const REWARD_TIERS={normal:{label:'일반',weight:74},rare:{label:'레어',weight:20.4},hyper:{label:'하이퍼',weight:4.8},legendary:{label:'전설',weight:0.8}};
const TRADE_EVOLUTIONS={93:{dex:94,name:'팬텀'},64:{dex:65,name:'후딘'},67:{dex:68,name:'괴력몬'},75:{dex:76,name:'딱구리'}};
const EVOLUTION_REWARD_ITEMS=[
 {id:'thunderStone',name:'번개의돌',form:'jolteon',icon:'⚡'},
 {id:'waterStone',name:'물의돌',form:'vaporeon',icon:'💧'},
 {id:'fireStone',name:'불꽃의돌',form:'flareon',icon:'🔥'},
 {id:'dawnStone',name:'각성의돌',form:'espeon',icon:'🔮'},
 {id:'duskStone',name:'어둠의돌',form:'umbreon',icon:'🌙'},
 {id:'moonStone',name:'달의돌',icon:'🌕'},
 {id:'leafStone',name:'리프의돌',icon:'🍃'},
 {id:'metalCoat',name:'금속코트',icon:'🔩'},
 {id:'sootheBell',name:'평온의 방울',icon:'🔔'}
];
const STONE_WILD_EVOLUTIONS={
 moonStone:{30:{dex:31,name:'니드퀸'},33:{dex:34,name:'니드킹'},35:{dex:36,name:'픽시'},39:{dex:40,name:'푸크린'}},
 leafStone:{44:{dex:45,name:'라플레시아'},70:{dex:71,name:'우츠보트'},102:{dex:103,name:'나시'}},
 waterStone:{61:{dex:62,name:'강챙이'},90:{dex:91,name:'파르셀'},120:{dex:121,name:'아쿠스타'}},
 metalCoat:{95:{dex:208,name:'강철톤'},123:{dex:212,name:'핫삼'}},
 sootheBell:{42:{dex:169,name:'크로뱃'}},
 fireStone:{58:{dex:59,name:'윈디'},37:{dex:38,name:'나인테일'}}
};
function eligibleEvolutionTargets(choice){
 return teamMembers().filter(member=>{
  if(choice.id==='linkCord')return member.level>=(member.dex===93?26:30)&&!!TRADE_EVOLUTIONS[member.dex];
  if(choice.id==='thunderStone'&&member.dex===25&&member.level>=24)return true;
  if(choice.id==='sootheBell')return member.dex===42&&member.level>=36;
  if(choice.id==='metalCoat')return (member.dex===95&&member.level>=34)||(member.dex===123&&member.level>=40);
  if(choice.id==='fireStone'&&((member.dex===58&&member.level>=36)||(member.dex===37&&member.level>=32)))return true;
  if(choice.id==='moonStone')return ([30,33].includes(member.dex)&&member.level>=22)||(member.dex===35&&member.level>=30)||(member.dex===39&&member.level>=25);
  if(choice.id==='leafStone')return ([44,70].includes(member.dex)&&member.level>=30)||(member.dex===102&&member.level>=40);
  if(choice.id==='waterStone')return (member.dex===61&&member.level>=30)||(member.dex===90&&member.level>=30)||(member.dex===120&&member.level>=25);
  return member.dex===133&&member.level>=22&&(!member.starter||!getEeveeForm());
 });
}
// Minimum level required for each evolution reward and species.
const EVOLUTION_REWARD_LEVELS={
 linkCord:{93:26,64:30,67:30,75:30},
 thunderStone:{25:24,133:22},
 sootheBell:{42:36},
 metalCoat:{95:34,123:40},
 fireStone:{58:36,37:32,133:22},
 moonStone:{30:22,33:22,35:30,39:25},
 leafStone:{44:30,70:30,102:40,133:22},
 waterStone:{61:30,90:30,120:25,133:22},
 dawnStone:{133:22},duskStone:{133:22}
};
function evolutionRewardWeight(choice){
 const thresholds=EVOLUTION_REWARD_LEVELS[choice.id]||{};
 const targets=eligibleEvolutionTargets(choice);
 if(!targets.length)return 0;
 const maxExtra=Math.max(...targets.map(member=>member.level-(thresholds[member.dex]??22)));
 return maxExtra>=10?10:maxExtra>=6?6:maxExtra>=4?4:2;
}
function rewardChoiceCount(){return giovanniCleared?5:erikaCleared?4:3;}
// Reward tier odds depend on the number of choices; gym rewards double rare/hyper/legendary odds.
// Every reward has a base weight of 4. Unmet eligibility conditions set it to 0.
function rewardWeight(choice,context){
 const {needsHealing,hasFainted,members,lv}=context;
 // If any party member has reached the current area's red level cap, candy rewards become rarer.
 const cap=wildRewardLevelCap();
 const redLevelReached=cap!==null&&members.some(m=>m.level>=cap);
 // Check the CURRENT party, not the Pokémon that were present when an item
 // was first obtained. Replacing a fully trained member can re-enable rewards.
 const allPartyEVsMax=members.length>0&&members.every(m=>{
  const ev=m.starter?playerEVs:companions.find(c=>c.family===m.family)?.evs;
  return ev&&EV_STATS.reduce((total,stat)=>total+(ev[stat]||0),0)>=240;
 });
 const allPartyIVsMax=members.length>0&&members.every(m=>{
  const iv=m.starter?playerIVs:companions.find(c=>c.family===m.family)?.ivs;
  return iv&&EV_STATS.every(stat=>iv[stat]>=16);
 });
 if(choice.kind==='expCandy')return choice.multiplier===20?7:choice.multiplier===12?6:(lv<30?5:lv<70?6:7);
 if(choice.kind==='power')return 5;
 if(choice.kind==='rareCandy')return 4;
 if(choice.kind==='tm01')return tm01Targets().length?1:0;
 if(choice.kind==='tm02')return tm02Targets().length?1:0;
 if(EXTRA_TM_CONFIG[choice.kind])return extraTmTargets(choice.kind).length?(EXTRA_TM_CONFIG[choice.kind].tier==='legendary'?3:(EXTRA_TM_CONFIG[choice.kind].weight??1)):0;
 if(choice.kind==='cash'){
  if(choice.tier==='legendary')return 4;
  // Reduce money rewards as the highest party level rises; never below weight 2.
  if(lv>=70)return 2;
  if(lv>=60)return choice.tier==='normal'?2:3;
  if(lv>=30)return choice.tier==='normal'?3:4;
  return choice.tier==='normal'?5:6;
 }
 if(choice.kind==='heal'){
  if(!needsHealing)return 0;
  if(choice.healType==='potion')return lv<30?7:lv<50?5:lv<70?3:1;
  if(choice.healType==='superPotion')return choice.tier==='rare'?(lv<30?3:0):lv<30?2:lv<50?4:lv<70?6:8;
  if(choice.healType==='hyperPotion')return lv<30?2:lv<50?3:lv<70?6:9;
  if(choice.healType==='fullRestore')return lv<30?0:lv<50?1:lv<70?3:5;
  return 4;
 }
 if(choice.kind==='reviveShardReward')return members.length>=2&&hasFainted?4:0;
 if(choice.kind==='maxReviveReward')return members.length>=2&&hasFainted?(choice.tier==='hyper'?6:1):0;
 if(choice.kind==='sacredAshReward')return members.length>=2&&hasFainted?2:0;
 if(choice.kind==='candyBundle')return members.length>=2?8:0;
 if(choice.kind==='ev')return allPartyEVsMax?0:2;
 if(choice.kind==='goldCap')return allPartyIVsMax?0:2;
 if(choice.kind==='silverCap')return allPartyIVsMax?0:8;
 if(choice.kind==='evolution')return evolutionRewardWeight(choice);
 if(choice.kind==='item'){
  const id=choice.id;
  if(id==='partySlotA')return inventory.partySlotA!==1?6:0;
  if(id==='partySlotB')return inventory.partySlotA===1&&inventory.partySlotB!==1?6:0;
  if(id==='wideLens')return choice.tier==='hyper'&&inventory.wideLens<3?1:0;
  if(id==='eviolite')return inventory.eviolite<3&&members.some(m=>EVOLVABLE_DEX.has(m.dex))?3:0;
  if(id==='sitrusBerry')return inventory.sitrusBerry<5?3:0;
   if(id==='oranBerry')return inventory.oranBerry<5?4:0;
  if(id==='focusSash')return inventory.focusSash>=6?0:1;
  if(id==='revivalSeed')return inventory.revivalSeed>=1?0:7;
  if(id==='hardClaw')return inventory.hardClaw>=5?0:1;
  if(id==='quickClaw')return inventory.quickClaw>=4?0:1;
  if(id==='clefairyDoll')return inventory.clefairyDoll>=4?0:1;
  if(id==='whiteFlute')return inventory.whiteFlute>=1?0:1;
   if(id==='shellBell')return inventory.shellBell>=3?0:2;
   if(id==='leftovers')return inventory.leftovers>=4?0:4;
   if(id==='scopeLens')return inventory.scopeLens>=5?0:4;
   if(id==='expShare')return inventory.expShare>=4?0:7;
   if(id==='masterBall')return inventory.masterBall>=2?0:inventory.masterBall===1?2:7;
   if(id==='quickBall')return inventory.quickBall>=1?0:3;
  if(id==='thickClub')return inventory[id]===1?0:members.some(m=>[104,105].includes(m.dex))?7:1;
  if(id==='map')return inventory.map!==1?1:0;
  if(['secretSwitch','oldSeaMap'].includes(id))return inventory[id]!==1?7:0;
  if(id==='lightBall')return inventory.lightBall===1?0:members.some(m=>[172,25,26].includes(m.dex))?6:0;
  if(id==='beedrillite')return inventory.beedrillite===1?0:members.some(m=>m.dex===15)?7:1;
  if(id==='charcoal')return inventory.charcoal>=1?0:4;
  if(id==='miracleSeed')return inventory.miracleSeed>=1?0:4;
  if(id==='mysticWater')return inventory.mysticWater>=1?0:4;
  if(id==='silverPowder')return inventory.silverPowder>=1?0:4;
  if(id==='sharpBeak')return inventory.sharpBeak>=1?0:4;
  if(id==='magnet')return inventory.magnet>=1?0:4;
  if(SHOP_ITEMS.some(item=>item.id===id&&item.category==='key')&&inventory[id]===1)return 0;
 }
 return 4;
}
function pickWeightedReward(candidates,context){
 const weighted=candidates.map(choice=>({choice,weight:rewardWeight(choice,context)}));
 const total=weighted.reduce((sum,entry)=>sum+entry.weight,0);
 if(total<=0)return null;
 let roll=Math.random()*total;
 for(const entry of weighted){
  if(entry.weight<=0)continue;
  if(roll<entry.weight)return entry.choice;
  roll-=entry.weight;
 }
 return weighted.findLast(entry=>entry.weight>0)?.choice||null;
}
function drawThreeRewards(level,count=rewardChoiceCount(),gym=false){
 const base=bonusCashForWin(),lv=Math.max(...teamMembers().map(m=>m.level));
 const members=teamMembers(),needsHealing=members.some(m=>memberHp(m)>0&&memberHp(m)<memberMaxHp(m)),hasFainted=members.some(m=>memberHp(m)===0);
 const pool={
 normal:[{kind:'tm01',icon:'📀'},{kind:'tm02',icon:'📀'},...Object.keys(EXTRA_TM_CONFIG).filter(kind=>!['rare','hyper','legendary'].includes(EXTRA_TM_CONFIG[kind].tier)).map(kind=>({kind,icon:'📀'})),{kind:'cash',amount:base,icon:'💰'},{kind:'heal',healType:'potion',amount:20,icon:'🧪'},{kind:'heal',healType:'superPotion',amount:60,icon:'💊'},{kind:'item',id:'pokeBall',quantity:5,icon:'🔴'},{kind:'expCandy',multiplier:6,icon:'🍬'},...['attack','accuracy','critical','defense'].map(effect=>({kind:'power',effect,turns:10,icon:{attack:'⚔️',accuracy:'🎯',critical:'✂️',defense:'🛡️'}[effect]}))],
 rare:[{kind:'tm22',icon:'📀'},{kind:'tm05',icon:'📀'},{kind:'tm06',icon:'📀'},{kind:'tm07',icon:'📀'},{kind:'tm08',icon:'📀'},{kind:'tm10',icon:'📀'},{kind:'tm16',icon:'📀'},{kind:'tm20',icon:'📀'},{kind:'tm21',icon:'📀'},{kind:'cash',amount:base*3,icon:'💰'},{kind:'heal',healType:'superPotion',amount:60,icon:'💊'},{kind:'heal',healType:'hyperPotion',amount:120,icon:'💉'},{kind:'heal',healType:'fullRestore',full:true,icon:'❤️'},{kind:'reviveShardReward',icon:'💎'},{kind:'maxReviveReward',icon:'🌟'},{kind:'item',id:'greatBall',quantity:5,icon:'🔵'},{kind:'item',id:'memoryMushroom',quantity:1,icon:'🍄'},{kind:'item',id:'oranBerry',quantity:1,icon:'🍊'},{kind:'expCandy',multiplier:12,icon:'🍬'},...['hp','attack','defense','speed'].map(stat=>({kind:'ev',stat,amount:8,icon:'💊'})),{kind:'item',id:'partySlotA',quantity:1,icon:'👥'},{kind:'evolution',id:'linkCord',icon:'🔗'},...EVOLUTION_REWARD_ITEMS.map(item=>({kind:'evolution',id:item.id,icon:item.icon}))],
 hyper:[{kind:'tm09',icon:'📀'},{kind:'tm12',icon:'📀'},{kind:'tm13',icon:'📀'},{kind:'tm14',icon:'📀'},{kind:'tm15',icon:'📀'},{kind:'tm17',icon:'📀'},{kind:'tm24',icon:'📀'},{kind:'cash',amount:base*10,icon:'💰'},{kind:'item',id:'ultraBall',quantity:5,icon:'🟡'},{kind:'item',id:'quickBall',quantity:1,icon:'🔵'},{kind:'rareCandy',icon:'🍬'},{kind:'expCandy',multiplier:20,icon:'🍬'},{kind:'maxReviveReward',icon:'🌟'},{kind:'sacredAshReward',icon:'✨'},...['hp','attack','defense','speed'].map(stat=>({kind:'ev',stat,amount:24,icon:'💊'})),{kind:'item',id:'partySlotB',quantity:1,icon:'👥'},{kind:'item',id:'focusSash',quantity:1,icon:'🎗️'},{kind:'item',id:'eviolite',quantity:1,icon:'🪨'},{kind:'item',id:'wideLens',quantity:1,icon:'🔍'},{kind:'item',id:'sitrusBerry',quantity:1,icon:'🍊'},{kind:'item',id:'hardClaw',quantity:1,icon:'🐾'},{kind:'item',id:'quickClaw',quantity:1,icon:'🐾'},{kind:'item',id:'clefairyDoll',quantity:1,icon:'🧸'},{kind:'item',id:'map',quantity:1,icon:'🗺️'}],
 legendary:[{kind:'tm23',icon:'📀'},{kind:'candyBundle',icon:'🍬'},{kind:'tm11',icon:'📀'},{kind:'tm18',icon:'📀'},{kind:'tm19',icon:'📀'},{kind:'goldCap',icon:'🥇'},{kind:'cash',amount:base*50,icon:'💰'},{kind:'item',id:'revivalSeed',quantity:1,icon:'🌱'},{kind:'item',id:'masterBall',quantity:1,icon:'🟣'},{kind:'silverCap',icon:'🥈'},{kind:'item',id:'secretSwitch',quantity:1,icon:'🔘'},{kind:'item',id:'oldSeaMap',quantity:1,icon:'🗺️'},{kind:'item',id:'lightBall',quantity:1,icon:'⚡'},{kind:'item',id:'beedrillite',quantity:1,icon:'💎'},{kind:'item',id:'thickClub',quantity:1,icon:'🦴'},{kind:'item',id:'charcoal',quantity:1,icon:'🔥'},{kind:'item',id:'miracleSeed',quantity:1,icon:'🌱'},{kind:'item',id:'mysticWater',quantity:1,icon:'💧'},{kind:'item',id:'silverPowder',quantity:1,icon:'✨'},{kind:'item',id:'sharpBeak',quantity:1,icon:'🪶'},{kind:'item',id:'magnet',quantity:1,icon:'🧲'},{kind:'item',id:'shellBell',quantity:1,icon:'🐚'},{kind:'item',id:'leftovers',quantity:1,icon:'🍎'},{kind:'item',id:'scopeLens',quantity:1,icon:'🎯'},{kind:'item',id:'whiteFlute',quantity:1,icon:'🎶'},{kind:'item',id:'expShare',quantity:1,icon:'📖'}]
 };
 const context={members,needsHealing,hasFainted,lv};
 return Array.from({length:count},()=>{
  const odds=count<=3?{rare:20.4,hyper:5,legendary:1}:count===4?{rare:20.4,hyper:4.9,legendary:0.9}:{rare:20.4,hyper:4.8,legendary:0.8};
  const rare=gym?odds.rare*2:odds.rare,hyper=gym?odds.hyper*2:odds.hyper,legendary=gym?odds.legendary*2:odds.legendary;
  const normal=100-rare-hyper-legendary;
  const roll=Math.random()*100,tier=roll<normal?'normal':roll<normal+rare?'rare':roll<normal+rare+hyper?'hyper':'legendary';
  const choice=pickWeightedReward(pool[tier].map(c=>({...c,tier})),context);
  if(!choice)throw new Error('해당 등급에 선택 가능한 보상이 없습니다: '+tier);
  return {tier,...choice};
 });
}
function rewardRerollCost(count){
 const cost=(progress.level*15+100)*2**count;
 return Number.isSafeInteger(cost)&&cost>0?cost:Infinity;
}
function saveProgress(){recordMoneyChange();if(typeof needsStarterSelection!=='undefined'&&needsStarterSelection)return;if(saveReadFailed){console.error('기존 저장 데이터를 읽지 못해 덮어쓰기를 차단했습니다.');return;}try{localStorage.setItem(SAVE_KEY,JSON.stringify({id:chosen,eeveeForm:getEeveeForm(),gengarEvolved:getGengarEvolved(),raichuEvolved:getRaichuEvolved(),level:progress.level,exp:progress.exp,money:progress.money,ivs:playerIVs,evs:playerEVs,moves:playerMoves,companions,partyOrder,adventureLog,captures:capturedPokemon,caughtSpecies:[...caughtSpecies],seenPokemon:[...seenPokemon],lastBattleReward,lastPartyExp,expFormulaVersion:3,inventory,expShareActive,tm01Learned,tm02Learned,extraTmLearned,battleItemHolders,storedHp,pendingRewardChoice,challengeNotified,plusPowerTurns:activeBoosts.attack.length?Math.max(...activeBoosts.attack):0,activeBoosts,area,volcanoAutoVisited,volcanoAutoMoveVersion:1,blueCleared,brockCleared,mistyCleared,greenReturnCleared,surgeCleared,greenThirdCleared,greenFourthCleared,greenFifthCleared,erikaCleared,kogaCleared,sabrinaCleared,blaineCleared,giovanniCleared,leagueStage,hallOfFame,currentRunLeagueWon,redHallOfFame,trainerClears,leagueCeremonyPending,redCeremonyPending,blueChoice,rivalEeveeEvolution,injured,healingDay,freeHealsUsed,developerFlagsManual}));}catch(e){console.warn('저장할 수 없습니다.',e);}}


const ACHIEVEMENT_KEY='poketama-2-achievements-v1';
const ACHIEVEMENTS=[["abandonPidgeot","유기","피죤투를 다른포켓몬과 교체해서 버림"],["ashPikachu","한지우","피카츄를 라이츄로 진화하지 않은 채로 리그 제패"],["rocketFan","로켓 좋아","아테나, 아폴로, 로켓단 보스 비주기 모두 격파"],["bugLover","곤충 애호가","파티 내 3마리 포켓몬을 모두 곤충 타입으로 결성"],["champion","내가 챔피언","리그 최초 제패"],["redSummit","정점","은빛산 정상에서 레드와의 배틀에서 승리"],["flyingTrainer","새 조련사","3마리 파티 멤버를 모두 비행 포켓몬으로 구성"],["botanist","식물학자","3마리 파티 멤버를 모두 풀 포켓몬으로 구성"],["dragonTrainer","드래곤 조련사","리자몽, 프테라, 망나뇽, 갸라도스 중 3마리로 파티를 구성"],["badges","배지 수집가","배지 8종 수집"],["firstLoss","첫 패배","최초 패배"],["rocketCatch100","로켓단","포켓몬 포획 누적 100회 달성"],["healing100","약물 중독","회복 아이템 누적 100회 사용"],["eggs20","리세마라","알 부화 20회"],["starter:raichu","주인공은 역시 피카츄","피츄를 스타팅으로 선택해 리그 제패"],["starter:eevee","이브이는 거꾸로 해도 이브이","이브이를 스타팅으로 선택해 리그 제패"],["starter:dragonite","드래곤 조련사","미뇽을 스타팅으로 선택해 리그 제패"],["starter:butterfree","나비효과","캐터피를 스타팅으로 선택해 리그 제패"],["starter:venusaur","씨앗부터 챔피언 까지","이상해씨를 스타팅으로 선택해 리그 제패"],["starter:charizard","불꽃은 꺼지지 않아","파이리를 스타팅으로 선택해 리그 제패"],["starter:blastoise","만렙거북이","꼬부기를 스타팅으로 선택해 리그 제패"],["starter:gyarados","튀어오르다 정상까지","잉어킹을 스타팅으로 선택해 리그 제패"],["starter:snorlax","먹고 자고 챔피언","먹고자를 스타팅으로 선택해 리그 제패"],["starter:gengar","유령도 전당등록 되나요?","고오스를 스타팅으로 선택해 리그 제패"],["evo:3","이상한…꽃?","이상해풀을 이상해꽃으로 진화"],["evo:12","4드론","단데기를 버터플로 진화"],["evo:25","근본은 피카츄지","피츄를 피카츄로 진화"],["evo:130","등용문","잉어킹을 갸라도스로 진화"],["evo:149","연애,신혼,지금","신뇽을 망나뇽으로 진화"],["brock","관장 별거 없네","웅이 승리"],["misty","뉴비 절단기","이슬이 승리"],["level100","근성","Lv.100 달성"],["eggs100","알까기 장인","알 부화 100회"],["rival","라이벌","그린 승리"],["hall10","컴까기 장인","명예의 전당 10회"],["free10","파트너를 소중히","무료 치료 10회"],["wild1000","눈 감고도 이긴다","야생 승리 1000회"],["trainer100","인간 사냥","트레이너 승리 100회"],["legendSeen","이거 좋은거에요?","전설 최초 조우"],["paidHeal","비보험 치료","유료 치료 1회"],["center200","병원 밥은 맛없어","센터 치료 200회"],["money999999","워렌 버핏 나와!","보유금 999999원"],["run100","삼십육계 줄행랑!","도망 100회"],["hypnosis","불면증 해결","최면술 가르치기"],["perfectIV","엄친아","개체값 전부 최대"],["hatchMaxIV","한 분야의 천재","개체값 중 하나가 최대값"],["hatchMinIV","누굴 닮아서 머리가 이 모양일까","개체값 중 하나가 최소값"],["maxEV","노력의 천재","노력치 총합 240"],["birds","전설의 삼새","삼새 포획 등록"],["dexSeenAll","도감 완…성??","게임에 등장하는 모든 포켓몬 발견"],["dexCaughtAll","도감 완성","게임에 등장하는 모든 포켓몬 포획"],["zapdos","발전소","썬더 포획"],["moltres","내 집은 어디에?","파이어 포획"],["articuno","쌍둥이 섬","프리저 포획"],["mewtwo","인간이 만든 사상 최강의 포켓몬","뮤츠 포획"],["eevees","이브이즈","이브이, 샤미드, 쥬피썬더, 부스터 4종 포획 등록"],["eevees2","이브이즈2","이브이 계열 6종을 모두 포획 등록"],["eeveeMajor","전공선택","이브이를 진화형 5종 중 하나로 진화"],["blackNintendo","검은 닌텐도","파르셀, 롱스톤 포획 등록"],["mew","모든 포켓몬의 유전자","뮤 포획"],["dna","DNA","뮤 뮤츠 포획"],["masterBallCatch","딸깍","마스터볼로 포켓몬 포획"],["nonLegendMasterBall","요거트 전체 버리기","전설이 아닌 포켓몬을 마스터볼로 포획"],["quickBallCatch","시간은 금이지","퀵볼로 포켓몬 포획"],["legendPokeBall","와 이게 되네","몬스터볼 전설 포획"],["normalUltraBall","요거트 뚜껑 버리기","하이퍼볼로 일반 등급의 미진화 포켓몬 포획"],["candy300","충치","사탕종류 300개이상 섭취"],["candy1000","틀니","사탕종류 1000개이상 섭취"],["reroll50","가챠 중독","랜덤보상에서 리롤 50회"],["reroll10000","멘징 중독","랜덤보상에서 리롤로 한번에 10000원 이상 사용."]];
let achievementData=(()=>{try{const v=JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY)||'{}');return {earned:Array.isArray(v.earned)?v.earned:[],healing:v.healing||0,eggs:v.eggs||0,wildWins:v.wildWins||0,trainerWins:v.trainerWins||0,centerUses:v.centerUses||0,runs:v.runs||0,rerolls:v.rerolls||0,catches:v.catches||0,candies:v.candies||0};}catch{return {earned:[],healing:0,eggs:0,wildWins:0,trainerWins:0,centerUses:0,runs:0,rerolls:0,catches:0,candies:0};}})();
const ACHIEVEMENT_NOTICE_KEY='poketama-2-achievement-notices-v1';
const achievementQueue=(()=>{try{const saved=JSON.parse(localStorage.getItem(ACHIEVEMENT_NOTICE_KEY)||'[]');return Array.isArray(saved)?saved.filter(id=>ACHIEVEMENTS.some(a=>a[0]===id)):[];}catch{return [];}})();
let achievementOpen=false;
function persistAchievementNotices(){try{localStorage.setItem(ACHIEVEMENT_NOTICE_KEY,JSON.stringify(achievementQueue));}catch(error){console.warn('업적 알림 대기열 저장 실패',error);}}
function queueAchievementNotice(id){if(!achievementQueue.includes(id))achievementQueue.push(id);persistAchievementNotices();showNextAchievement();}
function saveAchievements(){localStorage.setItem(ACHIEVEMENT_KEY,JSON.stringify(achievementData));}
function showNextAchievement(){
 if(achievementOpen||!achievementQueue.length)return;
 const starterOverlay=document.getElementById('starterSelectionOverlay');
 if(starterOverlay&&!starterOverlay.hidden)return; // Keep queued until starter selection closes.
 const id=achievementQueue[0];
 const entry=ACHIEVEMENTS.find(x=>x[0]===id);
 if(!entry){achievementQueue.shift();persistAchievementNotices();showNextAchievement();return;}
 achievementOpen=true;
 // Dedicated top-level fixed overlay: never depend on the stacking context of a game panel.
 const layer=document.createElement('div');
 layer.className='achievement-unlock-overlay';
 Object.assign(layer.style,{position:'fixed',inset:'0',zIndex:'2147483647',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',background:'rgba(0,0,0,.72)',boxSizing:'border-box'});
 const panel=document.createElement('section');
 panel.className='party-summary-panel';
 Object.assign(panel.style,{position:'relative',width:'min(420px,100%)',maxHeight:'90vh',overflowY:'auto',boxSizing:'border-box'});
 panel.setAttribute('role','alertdialog');
 panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-labelledby','achievement-unlock-title');
 const title=document.createElement('h2');
 title.id='achievement-unlock-title';
 title.textContent="🏆 '"+entry[1]+"' 달성!";
 const description=document.createElement('p');
 description.textContent=entry[2];
 description.style.cssText='margin:4px 0 14px;color:#50617c;font-size:15px;line-height:1.55;overflow-wrap:anywhere;text-align:center';
 const btn=document.createElement('button');
 btn.className='party-summary-close';
 btn.textContent='확인';
 btn.onclick=()=>{layer.remove();achievementQueue.shift();persistAchievementNotices();achievementOpen=false;showNextAchievement();};
 panel.append(title,description,btn);layer.append(panel);document.body.append(layer);btn.focus();
}
function earnAchievement(id){
 const entry=ACHIEVEMENTS.find(x=>x[0]===id);
 if(!entry||achievementData.earned.includes(id))return;
 achievementData.earned.push(id);
 // Never let a storage or log failure suppress the achievement notification.
 try{saveAchievements();}catch(error){console.error('업적 저장 실패',error);}
 try{appendAdventureLog('🏆 업적 달성! \''+entry[1]+'\'');}catch(error){console.error('업적 로그 실패',error);}
 try{saveProgress();}catch(error){console.error('업적 진행 저장 실패',error);}
 queueAchievementNotice(id);
}
function checkLevelAchievement(){if(teamMembers().some(m=>m.level>=100))earnAchievement('level100');}
function recordHealingItem(){achievementData.healing++;saveAchievements();if(achievementData.healing>=100)earnAchievement('healing100');}
function recordCandyConsumed(count=1){achievementData.candies=(achievementData.candies||0)+count;saveAchievements();if(achievementData.candies>=300)earnAchievement('candy300');if(achievementData.candies>=1000)earnAchievement('candy1000');}
function recordEggHatch(){achievementData.eggs++;saveAchievements();if(achievementData.eggs>=20)earnAchievement('eggs20');if(achievementData.eggs>=100)earnAchievement('eggs100');}
function checkMoneyAchievement(){if(progress.money>=999999)earnAchievement('money999999');}
function checkIVAchievement(iv){if(iv&&EV_STATS.every(k=>iv[k]===16))earnAchievement('perfectIV');}
function checkEVAchievement(ev){if(ev&&EV_STATS.reduce((n,k)=>n+(ev[k]||0),0)>=240)earnAchievement('maxEV');}
function checkDexAchievements(){const has=d=>caughtSpecies.has(d);if([144,145,146].every(has))earnAchievement('birds');if([133,134,135,136].every(has))earnAchievement('eevees');if([133,134,135,136,196,197].every(has))earnAchievement('eevees2');if([91,95].every(has))earnAchievement('blackNintendo');if([150,151].every(has))earnAchievement('dna');if(DEX_CATALOG.length&&DEX_CATALOG.every(p=>seenPokemon.has(p.dex)))earnAchievement('dexSeenAll');if(DEX_CATALOG.length&&DEX_CATALOG.every(p=>caughtSpecies.has(p.dex)))earnAchievement('dexCaughtAll');}
function recordCatchAchievement(dex,ball){achievementData.catches=(achievementData.catches||0)+1;saveAchievements();if(achievementData.catches>=100)earnAchievement('rocketCatch100');if(dex===145)earnAchievement('zapdos');if(dex===146)earnAchievement('moltres');if(dex===144)earnAchievement('articuno');if(dex===150)earnAchievement('mewtwo');if(dex===151)earnAchievement('mew');if(ball==='masterBall')earnAchievement('masterBallCatch');if(ball==='masterBall'&&!LEGENDARY_DEX.has(dex))earnAchievement('nonLegendMasterBall');if(ball==='quickBall')earnAchievement('quickBallCatch');if(LEGENDARY_DEX.has(dex)&&ball==='pokeBall')earnAchievement('legendPokeBall');if(ball==='ultraBall'&&!LEGENDARY_DEX.has(dex)&&!RARE_DEX.has(dex)&&!HYPER_DEX.has(dex)&&!EVOLVED_DEX.has(dex))earnAchievement('normalUltraBall');checkDexAchievements();}
function showAchievements(){const layer=document.createElement('div');layer.className='party-summary-overlay';const panel=document.createElement('section');panel.className='party-summary-panel';panel.style.maxHeight='80vh';panel.style.overflowY='auto';const h=document.createElement('h2');h.textContent='🏆 업적 '+achievementData.earned.length+'/'+ACHIEVEMENTS.length;panel.append(h);for(const [id,name,desc] of ACHIEVEMENTS){const p=document.createElement('p');p.textContent=(achievementData.earned.includes(id)?'✅ ':'🔒 ')+name+' — '+desc;panel.append(p);}const btn=document.createElement('button');btn.className='party-summary-close';btn.textContent='닫기';btn.onclick=()=>layer.remove();panel.append(btn);layer.append(panel);document.body.append(layer);}

const LEAGUE_NAMES=['칸나','시바','국화','목호','챔피언 그린'];
const ROCKET_TEAMS={"rocketApollo":[{"name":"또도가스","dex":110,"level":76,"base":{"hp":65,"attack":90,"defense":105,"speed":60}},{"name":"질뻐기","dex":89,"level":72,"base":{"hp":105,"attack":105,"defense":88,"speed":50}},{"name":"팬텀","dex":94,"level":74,"base":{"hp":60,"attack":130,"defense":68,"speed":110}},{"name":"라플레시아","dex":45,"level":76,"base":{"hp":75,"attack":110,"defense":88,"speed":50}},{"name":"크로뱃","dex":169,"level":78,"base":{"hp":85,"attack":90,"defense":80,"speed":130}}],"rocketAthena":[{"name":"붐볼","dex":101,"level":80,"base":{"hp":60,"attack":80,"defense":75,"speed":150}},{"name":"레어코일","dex":82,"level":76,"base":{"hp":50,"attack":120,"defense":83,"speed":70}},{"name":"쥬피썬더","dex":135,"level":76,"base":{"hp":65,"attack":110,"defense":78,"speed":130}},{"name":"블래키","dex":197,"level":78,"base":{"hp":95,"attack":65,"defense":110,"speed":65}},{"name":"에레브","dex":125,"level":80,"base":{"hp":65,"attack":95,"defense":71,"speed":105}}],"rocketGiovanni":[{"name":"코뿌리","dex":112,"level":82,"base":{"hp":105,"attack":130,"defense":93,"speed":40}},{"name":"니드킹","dex":34,"level":80,"base":{"hp":81,"attack":102,"defense":76,"speed":85}},{"name":"니드퀸","dex":31,"level":80,"base":{"hp":90,"attack":92,"defense":86,"speed":76}},{"name":"독침붕","dex":15,"level":82,"base":{"hp":65,"attack":90,"defense":60,"speed":75}},{"name":"강철톤","dex":208,"level":84,"base":{"hp":75,"attack":85,"defense":153,"speed":30}},{"name":"뮤츠","dex":150,"level":86,"base":{"hp":106,"attack":154,"defense":90,"speed":130}}]};
const LEAGUE_TEAMS=[
[['쥬레곤',87,64,90,70,88,70],['파르셀',91,65,50,95,133,70],['야도란',80,65,95,100,95,30],['루주라',124,66,65,115,75,95],['라프라스',131,67,130,85,88,60]],
[['롱스톤',95,65,35,45,123,70],['홍수몬',107,67,50,105,95,76],['시라소몬',106,67,50,120,92,87],['롱스톤',95,68,35,45,123,70],['괴력몬',68,69,90,130,83,55]],
[['팬텀',94,68,60,130,68,110],['골뱃',42,68,75,80,73,90],['고우스트',93,69,45,115,50,95],['아보크',24,70,60,95,74,80],['팬텀',94,71,60,130,68,110]],
[['갸라도스',130,69,95,125,90,81],['신뇽',148,70,61,84,68,70],['신뇽',148,70,61,84,68,70],['프테라',142,72,80,105,70,130],['망나뇽',149,73,91,134,98,80]],
[['피죤투',18,71,83,80,73,101],['후딘',65,72,55,135,80,120],['코뿌리',112,72,105,130,93,40],['갸라도스',130,73,95,125,90,81],['윈디',59,74,90,110,80,95]]];
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
setEeveeForm(saved?.eeveeForm||null);
setGengarEvolved(saved?.gengarEvolved===true || (saved?.gengarEvolved===undefined&&saved?.id==='gengar'&&saved?.level>=40));
setRaichuEvolved(saved?.raichuEvolved===true || (saved?.raichuEvolved===undefined&&saved?.id==='raichu'&&saved?.level>=30));
let animatingEnemy=null; // Keep the defeated opponent's HP denominator until hit animation finishes.
let progress={level:saved?.level||1,exp:saved?.exp||0,money:saved?.money??1000};
const MONEY_HISTORY_KEY='poketama-2-money-history-v1';
let moneyHistory=(()=>{
 try{const rows=JSON.parse(localStorage.getItem(MONEY_HISTORY_KEY)||'[]');
  return Array.isArray(rows)?rows.filter(row=>row&&Number.isFinite(row.before)&&Number.isFinite(row.after)&&typeof row.reason==='string').slice(-150):[];
 }catch{return [];}
})();
let moneyLastBalance=progress.money;
function recordMoneyChange(reason='원인 확인 필요 · 미분류 잔액 변동'){
 const before=moneyLastBalance,after=progress.money;
 if(!Number.isFinite(before)||!Number.isFinite(after)||before===after)return;
 moneyHistory.push({at:new Date().toISOString(),before,after,delta:after-before,reason});
 moneyHistory=moneyHistory.slice(-150);moneyLastBalance=after;
 try{localStorage.setItem(MONEY_HISTORY_KEY,JSON.stringify(moneyHistory));}
 catch(err){console.warn('돈 기록 저장 실패',err);}
}
function showMoneyHistory(){
 recordMoneyChange();
 document.getElementById('moneyHistoryOverlay')?.remove();
 const overlay=document.createElement('div');overlay.id='moneyHistoryOverlay';overlay.className='party-summary-overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','돈 수입과 지출 기록');
 const panel=document.createElement('section');panel.className='party-summary-panel';
 panel.style.cssText='width:min(520px,100%);max-height:88vh;overflow:auto';
 const heading=document.createElement('h2');heading.textContent='💰 보유금 '+progress.money.toLocaleString('ko-KR')+'원';
 const notice=document.createElement('p');notice.style.cssText='font-size:12px;color:#60748e;line-height:1.5';
 notice.textContent='원인 미확인 변동도 별도 표시';
 const entries=document.createElement('div');entries.style.cssText='display:grid;gap:8px;text-align:left';
 if(!moneyHistory.length){const none=document.createElement('p');none.textContent='아직 기록된 수입·지출이 없어.';entries.append(none);}
 for(const event of [...moneyHistory].reverse()){
  const item=document.createElement('div');item.style.cssText='padding:10px;border:1px solid #ccdaeb;border-radius:9px;background:#f7faff';
  const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;gap:12px;align-items:center';
  const reason=document.createElement('strong');reason.textContent=event.reason;reason.style.fontSize='13px';
  const amount=document.createElement('strong');amount.textContent=(event.delta>0?'+':'')+event.delta.toLocaleString('ko-KR')+'원';
  amount.style.cssText='white-space:nowrap;color:'+(event.delta>=0?'#1d7b4c':'#b83240');
  head.append(reason,amount);
  const detail=document.createElement('small');detail.style.cssText='display:block;margin-top:5px;font-size:11px;color:#60748e';
  const date=new Date(event.at);
  detail.textContent=(Number.isNaN(date.getTime())?'시간 미상':date.toLocaleString('ko-KR'))+' · '+event.before.toLocaleString('ko-KR')+' → '+event.after.toLocaleString('ko-KR')+'원';
  item.append(head,detail);entries.append(item);
 }
 const close=document.createElement('button');close.className='party-summary-close';close.type='button';close.textContent='닫기';close.onclick=()=>overlay.remove();
 panel.append(heading,notice,entries,close);overlay.append(panel);document.body.append(overlay);close.focus();
}

let wildEnemy=null, rewardClaimed=false, menuPage='main';
let leagueStage=Number.isInteger(saved?.leagueStage)&&saved.leagueStage>=0&&saved.leagueStage<5?saved.leagueStage:null;
let currentRunLeagueWon=saved?.currentRunLeagueWon===true||(saved?.currentRunLeagueWon===undefined&&!!saved?.giovanniCleared&&Array.isArray(saved?.hallOfFame)&&saved.hallOfFame.length>0);
let hallOfFame=Array.isArray(saved?.hallOfFame)?saved.hallOfFame.slice(-100):[];
let redHallOfFame=Array.isArray(saved?.redHallOfFame)?saved.redHallOfFame.slice(-100):[];
let trainerClears={...(saved?.trainerClears&&typeof saved.trainerClears==='object'?saved.trainerClears:{})};
let leagueCeremonyPending=!!saved?.leagueCeremonyPending;
let redCeremonyPending=!!saved?.redCeremonyPending;
let redEndingPage=0;
let area=['grass','forest','cave','lake','cemetery','town','road','city','sea','volcano','strangeForest','championRoad','championRoad2','palletTown','rocketBase','farawayIsland','mountSilver'].includes(saved?.area)?saved.area:'grass';
let blueCleared=!!saved?.blueCleared,brockCleared=!!saved?.brockCleared,mistyCleared=!!saved?.mistyCleared;
let greenReturnCleared=!!saved?.greenReturnCleared,surgeCleared=!!saved?.surgeCleared;
let greenThirdCleared=!!saved?.greenThirdCleared,greenFourthCleared=!!saved?.greenFourthCleared,greenFifthCleared=!!saved?.greenFifthCleared,erikaCleared=!!saved?.erikaCleared;
let kogaCleared=!!saved?.kogaCleared,sabrinaCleared=!!saved?.sabrinaCleared,blaineCleared=!!saved?.blaineCleared,giovanniCleared=!!saved?.giovanniCleared;
// Existing saves are normalized only until the developer explicitly edits completion flags.
// Manual overrides remain independent of developer region movement and survive reloads.
let developerFlagsManual=!!saved?.developerFlagsManual;
if(!developerFlagsManual){
if(giovanniCleared)blaineCleared=true;
if(blaineCleared)sabrinaCleared=true;
if(sabrinaCleared){greenFourthCleared=true;kogaCleared=true;}
else if(kogaCleared)erikaCleared=true;
if(erikaCleared)greenThirdCleared=true;
if(greenThirdCleared)surgeCleared=true;
if(surgeCleared)greenReturnCleared=true;
if(greenReturnCleared)mistyCleared=true;
if(mistyCleared)brockCleared=true;
if(brockCleared)blueCleared=true;
}
let blueChoice=RIVAL_POOL.some(s=>s.id===saved?.blueChoice)?saved.blueChoice:null;
let rivalEeveeEvolution=Object.hasOwn(EEVEE_FORMS,saved?.rivalEeveeEvolution)?saved.rivalEeveeEvolution:null;
let battleKind='wild',battleOpponent=null,defeatedEnemies=0,trainerExpEarned=0;
let injured=!!saved?.injured;
const todayKST=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let healingDay=typeof saved?.healingDay==='string'?saved.healingDay:todayKST();
let freeHealsUsed=Number.isInteger(saved?.freeHealsUsed)?Math.max(0,Math.min(10,saved.freeHealsUsed)):0;
function refreshHealingDay(){const now=todayKST();if(healingDay!==now){healingDay=now;freeHealsUsed=0;saveProgress();}}
const pokemonCenterFee=members=>Math.round(5.2*Math.sqrt(Math.max(...members.map(m=>m.level))))*100;
function healInjury(){
 if(animating||learningBusy||pendingRewardChoice)return;
 refreshHealingDay();
 document.getElementById('pokemonCenterOverlay')?.remove();
 const members=teamMembers();
 if(members.every(m=>memberHp(m)>=memberMaxHp(m))){alert('이미 포켓몬이 최고 컨디션이다');return;}
 const fee=freeHealsUsed<10?0:pokemonCenterFee(members);
 const overlay=document.createElement('div');overlay.id='pokemonCenterOverlay';overlay.className='party-summary-overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','포켓몬 센터');
 const panel=document.createElement('section');panel.className='party-summary-panel pokemon-center-panel';
 const title=document.createElement('header');title.className='party-summary-title';title.textContent='🏥 포켓몬 센터';
 const cards=document.createElement('div');cards.className='party-summary-cards';
 for(const m of members){
  const hp=memberHp(m),max=memberMaxHp(m);
  const card=document.createElement('div');card.className='party-summary-card pokemon-center-card'+(hp===0?' fainted':'');
  const img=document.createElement('img');img.src=staticImage(m.dex,false);img.alt='';img.className='party-summary-sprite';
  img.onerror=()=>{img.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+m.dex+'.png';img.onerror=()=>{img.hidden=true;};};
  const info=document.createElement('div');info.className='party-summary-info';
  const name=document.createElement('strong');name.textContent=m.name+' Lv.'+m.level+(hp===0?' · 기절':'');
  const meter=document.createElement('div');meter.className='party-summary-meter';
  const label=document.createElement('b');label.textContent='HP';
  const track=document.createElement('div');track.className='party-summary-track hp';
  const fill=document.createElement('div');fill.className='party-summary-fill';fill.style.width=(100*hp/max)+'%';
  if(hp/max<=.2)fill.classList.add('low');else if(hp/max<=.5)fill.classList.add('mid');
  track.append(fill);
  const value=document.createElement('span');value.className='party-summary-meter-count';value.textContent=hp+' / '+max;
  meter.append(label,track,value);info.append(name,meter);card.append(img,info);cards.append(card);
 }
 const description=document.createElement('p');description.className='pokemon-center-description';
 description.textContent='모든 포켓몬을 최고 컨디션으로 만듭니다. 사용하시겠습니까?';
 const actions=document.createElement('div');actions.className='pokemon-center-actions';
 const confirm=document.createElement('button');confirm.type='button';confirm.className='party-summary-lead';
 confirm.textContent=fee?'유료 사용 ('+fee.toLocaleString('ko-KR')+'원)':'무료 사용 ('+(10-freeHealsUsed)+'/10)';
 confirm.disabled=progress.money<fee;
 const cancel=document.createElement('button');cancel.type='button';cancel.className='party-summary-close';cancel.textContent='취소';cancel.onclick=()=>overlay.remove();
 confirm.onclick=()=>{
  if(teamMembers().every(m=>memberHp(m)>=memberMaxHp(m))){overlay.remove();alert('이미 포켓몬이 최고 컨디션이다');return;}
  refreshHealingDay();
  const actualFee=freeHealsUsed<10?0:pokemonCenterFee(teamMembers());
  if(progress.money<actualFee){alert('포켓몬 센터 이용료가 부족해!');return;}
  if(actualFee){progress.money-=actualFee;recordMoneyChange('포켓몬센터 유료 치료');}else freeHealsUsed++;achievementData.centerUses++;saveAchievements();if(actualFee)earnAchievement('paidHeal');if(freeHealsUsed===10)earnAchievement('free10');if(achievementData.centerUses>=200)earnAchievement('center200');
  injured=false;storedHp=null;
  for(const m of companions)m.hp=null;
  appendAdventureLog('🏥 포켓몬 센터에서 HP를 모두 회복했다!'+(actualFee?' ('+actualFee+'원)':' (무료)'));
  saveProgress();overlay.remove();renderHome();
 };
 actions.append(confirm,cancel);panel.append(title,cards,description,actions);overlay.append(panel);document.body.append(overlay);cancel.focus();
}
let pendingLevelUp=null;
const BATTLE_SPEED_KEY='poketama-2-battle-speed-v1';
let battleSpeed=(()=>{try{return localStorage.getItem(BATTLE_SPEED_KEY)==='2'?2:1;}catch(e){return 1;}})();
function updateBattleSpeedControl(){
 document.body.classList.toggle('battle-fast',battleSpeed===2);
 $('speedToggle').setAttribute('aria-pressed',String(battleSpeed===2));
 $('speedToggle').textContent='⏩ 2배속 '+(battleSpeed===2?'ON':'OFF');
}
let lastBattleReward=saved?.lastBattleReward&&Number.isSafeInteger(saved.lastBattleReward.exp)&&Number.isSafeInteger(saved.lastBattleReward.money)?saved.lastBattleReward:null;
let lastPartyExp=saved?.lastPartyExp&&typeof saved.lastPartyExp==='object'?saved.lastPartyExp:{};
let battleExpEarned={};
let capturedPokemon=Array.isArray(saved?.captures)?saved.captures.filter(validCaptured).slice(0,200):[];
let caughtSpecies=new Set([...(Array.isArray(saved?.caughtSpecies)?saved.caughtSpecies:[]),...capturedPokemon.map(p=>p.dex)].filter(dex=>Number.isInteger(dex)&&dex>0&&dex<=1025));
let seenPokemon=new Set([...(Array.isArray(saved?.seenPokemon)?saved.seenPokemon:[]),...capturedPokemon.map(p=>p.dex)].filter(id=>Number.isInteger(id)&&id>0&&id<=1025));
function registerEncounter(dex){if(!Number.isInteger(dex))return;if(LEGENDARY_DEX.has(dex))earnAchievement('legendSeen');if(seenPokemon.has(dex))return;seenPokemon.add(dex);checkDexAchievements();saveProgress();}
function starterOwnedDexes(id,level,formName=null,gengar=false,raichu=false){
 const starter=STARTERS.find(p=>p.id===id);
 if(!starter)return [];
 const stages=EVOLUTIONS[id]||[];
 const result=stages.filter(p=>p.level<=level&&p.level<101).map(p=>p.dex);
 if(!result.length)result.push(starter.baby);
 if(id==='eevee'&&formName&&EEVEE_FORMS[formName])result.push(EEVEE_FORMS[formName].dex);
 if(id==='gengar'&&gengar)result.push(94);
 if(id==='raichu'&&raichu)result.push(26);
 return [...new Set(result)];
}
function registerOwnedStarter(id=chosen,level=progress.level,formName=getEeveeForm(),gengar=getGengarEvolved(),raichu=getRaichuEvolved()){
 let changed=false;
 for(const dex of starterOwnedDexes(id,level,formName,gengar,raichu)){
  if(!caughtSpecies.has(dex)||!seenPokemon.has(dex))changed=true;
  caughtSpecies.add(dex);seenPokemon.add(dex);
 }
 return changed;
}
function recoverLastStarterFromResetBackup(){
 // Last pre-reset save is an emergency snapshot; recover only confirmed owned starter forms.
 try{
  const old=JSON.parse(localStorage.getItem(SAVE_KEY+'-before-reset')||'null');
  if(!old?.id)return false;
  let changed=false;
  for(const dex of starterOwnedDexes(old.id,Number(old.level)||1,old.eeveeForm,old.gengarEvolved===true,old.raichuEvolved===true)){
   if(!caughtSpecies.has(dex)||!seenPokemon.has(dex))changed=true;
   caughtSpecies.add(dex);seenPokemon.add(dex);
  }
  return changed;
 }catch{return false;}
}

// Backward-compatible additions: existing Lv, money, IV, and captures are retained.
let expShareActive=saved?.expShareActive===true;
let inventory=Object.fromEntries(SHOP_ITEMS.map(i=>{
 // Migrate existing Wide Lens A/B collections without deleting earned items.
 const oldLensCount=(Math.max(0,saved?.inventory?.wideLensA||0)+Math.max(0,saved?.inventory?.wideLensB||0));
 const migratedLens=i.id==='wideLens'&&!Number.isInteger(saved?.inventory?.wideLens)?Math.min(3,oldLensCount):null;
 const value=migratedLens!==null?migratedLens:Number.isInteger(saved?.inventory?.[i.id])&&saved.inventory[i.id]>=0&&saved.inventory[i.id]<=99?saved.inventory[i.id]:(START_INVENTORY[i.id]??0);
 return [i.id,HELD_MAX[i.id]?Math.min(HELD_MAX[i.id],value):i.id==='expShare'?Math.min(4,value):i.id==='inheritanceTicket'?Math.min(21,value):i.id==='clefairyDoll'?Math.min(4,value):i.category==='key'?Math.min(1,value):value];
}));
inventory.inheritanceTicketPurchases=Math.max(inventory.inheritanceTicket,Math.min(999,Number(saved?.inventory?.inheritanceTicketPurchases)||0),Math.min(999,Number(localStorage.getItem('poketama-2-ticket-purchases-v1'))||0));
let battleItemHolders=Object.fromEntries(HELD_ITEMS.map(id=>{
 const oldLensOwners=id==='wideLens'?[...(Array.isArray(saved?.battleItemHolders?.wideLensA)?saved.battleItemHolders.wideLensA:[]),...(Array.isArray(saved?.battleItemHolders?.wideLensB)?saved.battleItemHolders.wideLensB:[])]:null;
 const recorded=Array.isArray(saved?.battleItemHolders?.[id])?saved.battleItemHolders[id]:oldLensOwners;
 return [id,Array.isArray(recorded)?recorded.filter(x=>typeof x==='string').slice(0,inventory[id]):Array(Math.max(0,Math.min(99,Number(inventory[id])||0))).fill('starter')];
}));
// Slot B may be inherited independently, but only activates after slot A is unlocked.
// Lens B is independent of Lens A.
const BOOST_INFO={attack:{name:'플러스파워',img:'x-attack'},accuracy:{name:'잘 맞히기',img:'x-accuracy'},critical:{name:'크리티컬 커터',img:'dire-hit'},defense:{name:'디펜드 업',img:'x-defend'}};
const activeBoosts=Object.fromEntries(Object.keys(BOOST_INFO).map(key=>[key,(Array.isArray(saved?.activeBoosts?.[key])?saved.activeBoosts[key]:key==='attack'&&Number.isInteger(saved?.plusPowerTurns)?[saved.plusPowerTurns]:[]).filter(n=>Number.isInteger(n)&&n>0&&n<=10).slice(0,100)]));
const boostCount=key=>activeBoosts[key].length;
function tickBoosts(){for(const key of Object.keys(activeBoosts))activeBoosts[key]=activeBoosts[key].map(n=>n-1).filter(n=>n>0);}
let storedHp=Number.isInteger(saved?.storedHp)&&saved.storedHp>=0?saved.storedHp:null;
const EV_STATS=['hp','attack','defense','speed'];
let pendingRewardChoice=null;
if(saved?.pendingRewardChoice){
 const p=saved.pendingRewardChoice;
 if(Array.isArray(p.choices)&&p.choices.length>=3&&p.choices.length<=5&&p.choices.every(x=>x&&REWARD_TIERS[x.tier]&&['cash','heal','item','exp','power','ev','silverCap','reviveShardReward','maxReviveReward','sacredAshReward','ppAid','rareCandy','ppMax','goldCap','expCandy','candyBundle','evolution','tm01','tm02',...Object.keys(EXTRA_TM_CONFIG)].includes(x.kind)&&(x.kind==='item'?SHOP_ITEMS.some(item=>item.id===x.id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=10:x.kind==='expCandy'&&Number.isInteger(x.multiplier)&&[6,7,10,11,12,20].includes(x.multiplier)||x.kind==='candyBundle'||x.kind==='evolution'&&['linkCord','thunderStone','waterStone','fireStone','dawnStone','duskStone','moonStone','leafStone','metalCoat','sootheBell'].includes(x.id)||x.kind==='ev'&&EV_STATS.includes(x.stat)&&[2,10,30,40].includes(x.amount)||x.kind==='power'&&(!x.effect||['attack','accuracy','critical','defense'].includes(x.effect))||x.full===true||x.kind==='tm01'||x.kind==='tm02'||!!EXTRA_TM_CONFIG[x.kind]||Number.isSafeInteger(x.amount)&&x.amount>=0))){
  pendingRewardChoice={choices:p.choices.map(c=>['ppAid','ppMax'].includes(c.kind)?{tier:c.tier,kind:'cash',amount:(100+16*(saved?.level||1))*(c.tier==='hyper'?10:1),icon:'💰'}:c.kind==='expCandy'?{...c,tier:c.tier==='hyper'?'hyper':c.tier==='rare'?'rare':'normal',multiplier:c.tier==='hyper'?20:c.tier==='rare'?12:6,size:undefined}:c.kind==='rareCandy'?{...c,tier:'hyper'}:c.kind==='ev'&&c.tier==='hyper'&&c.amount===40?{...c,amount:30}:c.kind==='candyBundle'?{...c,tier:'legendary'}:c),rerolls:Number.isInteger(p.rerolls)&&p.rerolls>=0?Math.min(p.rerolls,100):0,gym:!!p.gym};
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
if(Object.values(playerEVs).reduce((sum,n)=>sum+n,0)>240)playerEVs={hp:0,attack:0,defense:0,speed:0};
let playerMoves=isValidMoves(chosen,progress.level,saved?.moves)?[...saved.moves]:migrateMoves(chosen,progress.level);
let learningBusy=false;
// Item-adjusted values are presentation only; never write them into base stats.
function permanentItemStatMultipliers(m){
 return {
  hp:1,
  attack:attackItemMultiplier(m),
  defense:1+(grassSeedBonus(m)?0.1:0)+(waterDropBonus(m)?0.10:0)+(bugPowderBonus(m)?0.15:0)+(EVOLVABLE_DEX.has(m.dex)?0.13*heldCount('eviolite',m.key):0),
  speed:1+magnetSpeedBonus(m)
 };
}
function renderStatPanel(){
 const m=screen==='battle'?activeMember():leaderMember(),ivs=m.starter?playerIVs:m.ivs,evs=m.starter?playerEVs:m.evs||{},grid=$('statGrid'),stats=calculateStats(memberBase(m),m.level,ivs,evs);
 // Show permanent item effects without changing the underlying stats or combat damage.
 // Use the same multipliers as makeMemberFighter, excluding temporary battle boosts.
 const itemMultipliers=permanentItemStatMultipliers(m);
 grid.replaceChildren(...STAT_KEYS.map(key=>{
  const card=document.createElement('div');card.className='stat-card';
  const head=document.createElement('div');head.className='stat-compact-head';
  const label=document.createElement('span');label.className='stat-name';label.textContent=STAT_LABELS[key];
  const star=document.createElement('span');star.className='iv-star iv-'+ivTier(ivs[key]);star.textContent='★';
  star.setAttribute('aria-label','개체값 등급');
  const base=stats[key],effective=Math.floor(base*itemMultipliers[key]),bonus=effective-base;
  const value=document.createElement('div');value.className='stat-value';
  value.textContent=String(effective);
  if(bonus>0){
   const extra=document.createElement('span');
   extra.textContent=' (+'+bonus+')';
   extra.style.cssText='font-size:0.65em;color:#16a34a;font-weight:700;white-space:nowrap';
   extra.title='기본 능력치 '+base+' + 아이템 효과 '+bonus;
   value.append(extra);
  }
  head.append(label,star);card.append(head,value);return card;
 }));
}

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms/battleSpeed));
function displayHp(side,hp){const f=side==='player'?battle.player:(animatingEnemy??battle.enemies[battle.enemyIndex]??battle.enemies.at(-1));displayHpBar(side,hp,f);shownHp[side]=hp;}
// Battle-only decorative effects; damage and status outcomes remain authoritative in the engine.
function moveEffectType(id=''){
 const m=String(id).toLowerCase();
 if(/fire|flame|ember|blaze|burn|willow|sunny/.test(m))return 'fire';
 if(/thunder|volt|electric|spark|zap|shock/.test(m))return 'electric';
 if(/water|aqua|hydro|surf|bubble|rain|scald/.test(m))return 'water';
 if(/leaf|vine|seed|solar|energyball|giga|absorb|synthesis|petal/.test(m))return 'leaf';
 if(/dragon|outrage|draco/.test(m))return 'dragon';
 if(/shadow|ghost|nightshade|curse|hypnosis|dreameater|lick|confuse/.test(m))return 'ghost';
 if(/poison|toxic|sludge|acid|venom/.test(m))return 'poison';
 if(/ice|freeze|blizzard|snow|cold|icicle/.test(m))return 'ice';
 if(/psychic|psy|mind|future|extrasensory/.test(m))return 'psychic';
 if(/dark|bite|crunch|snarl|sucker/.test(m))return 'dark';
 return 'physical';
}
const MOVE_EFFECT_GLYPHS={fire:['🔥','✦','🔥'],electric:['⚡','✧','⚡'],water:['💧','◌','💦'],leaf:['🍃','✦','🍃'],dragon:['✧','◈','✧'],ghost:['◈','✧','◈'],poison:['☣','◌','☣'],ice:['❄','✦','❄'],psychic:['✧','◉','✧'],dark:['◈','✦','◈'],physical:['✦','✧','✦']};
async function playMoveImpact(side,moveId,critical=false){
 const arena=document.querySelector('#battleScreen .arena'),host=visualSprite(side);
 if(!arena||!host)return;
 const field=arena.getBoundingClientRect(),target=host.getBoundingClientRect();
 const fx=document.createElement('div');const type=moveEffectType(moveId);
 fx.className='move-impact-fx fx-'+type+(critical?' fx-critical':'');
 fx.style.left=(target.left-field.left+target.width/2)+'px';
 fx.style.top=(target.top-field.top+target.height*.48)+'px';
 fx.setAttribute('aria-hidden','true');
 for(const [i,glyph] of MOVE_EFFECT_GLYPHS[type].entries()){
  const part=document.createElement('span');part.textContent=glyph;part.style.setProperty('--fx-index',String(i));fx.append(part);
 }
 arena.append(fx);
 await pause(420);
 fx.remove();
}
async function shakeHit(side,critical=false){
 const host=visualSprite(side);if(!host)return;
 host.classList.remove('impact-shake','impact-shake-heavy');void host.offsetWidth;
 host.classList.add(critical?'impact-shake-heavy':'impact-shake');
 await pause(430);
 host.classList.remove('impact-shake','impact-shake-heavy');
}
async function playEvents(events){const pokemonName=side=>(side==='enemy'?'상대 ':'')+(side==='enemy'?((animatingEnemy??battle.enemies[battle.enemyIndex])?.name||'포켓몬'):battle.player.name);let currentMove=null;let quickClawActiveSide=null;let lastTitle='';let details=[];const tell=(title,detail='')=>{lastTitle=title;details=detail?[detail]:[];showBattleActionMessage(title,details.join(', '));};const addDetail=detail=>{details.push(detail);showBattleActionMessage(lastTitle,details.join(', '));};for(let i=0;i<events.length;i++){const ev=events[i];if(ev.type==='quickClaw'){currentMove=null;quickClawActiveSide=ev.side;tell('⚡ '+pokemonName(ev.side)+'의 선제공격손톱 발동!');await pause(1100);}else if(ev.type==='runFailed'){currentMove=null;tell('도망가기 실패!');await pause(700);}else if(ev.type==='sleepBlocked'){currentMove=null;tell(pokemonName(ev.side)+'은(는) 잠들어 행동할 수 없다!');await pause(950);}else if(ev.type==='paralysisBlocked'){currentMove=null;tell('⚡ '+pokemonName(ev.side)+'은(는) 마비로 움직이지 못했다!');await pause(950);}else if(ev.type==='statusCleared'){if(battleEffectDisplay?.[ev.side]){battleEffectDisplay[ev.side].status=null;renderBattleStatus(ev.side,ev.side==='player'?battle.player:(animatingEnemy??battle.enemies[battle.enemyIndex]));}tell(ev.status==='freeze'?pokemonName(ev.side)+'의 얼음이 녹았다!':pokemonName(ev.side)+'이(가) 잠에서 깨어났다!');await pause(ev.status==='freeze'?1400:420);}else if(ev.type==='confusionSelfHit'){currentMove=null;tell(pokemonName(ev.side)+'은 혼란으로 자기 자신을 공격했다!');await pause(500);}else if(ev.type==='move'){currentMove={id:ev.moveId||ev.name,side:ev.side,isStatus:ev.isStatus};tell((quickClawActiveSide===ev.side?'⚡ 선제공격손톱 · ':'')+pokemonName(ev.side)+'의 '+ev.name+'!','');quickClawActiveSide=null;if(ev.isStatus){await pause(180);}else{const el=visualSprite(ev.side);animateClass(el,'attacking');await pause(380);el.classList.remove('attacking');}}else if(ev.type==='damage'){const el=visualSprite(ev.side);const arena=document.querySelector('#battleScreen .arena');const attackHit=currentMove&&currentMove.side!==ev.side&&!ev.poison&&!ev.burn&&!ev.recoil&&!ev.selfCost; if(attackHit)await playMoveImpact(ev.side,currentMove.id,!!ev.critical);if(attackHit)await shakeHit(ev.side,!!ev.critical);else animateClass(el,'hit');if(ev.poison||ev.burn){tell(pokemonName(ev.side)+' '+(ev.poison?'독':'화상')+' 상태이상으로 '+ev.amount+' 피해');}else{addDetail(pokemonName(ev.side)+'에게 '+ev.amount+' 피해'+(ev.critical?' · 급소!':''));}if(ev.critical&&arena){arena.classList.remove('critical-shake');void arena.offsetWidth;arena.classList.add('critical-shake');}popup(ev.side,ev.amount,ev.critical);await pause(500);displayHp(ev.side,ev.hp);await pause(650);el.classList.remove('hit');arena?.classList.remove('critical-shake');$(ev.side+'Popup').classList.remove('visible');}else if(ev.type==='transform'){const img=$(ev.side+'Sprite');if(ev.dex){sprite(ev.side+'Sprite',ev.dex,ev.side==='player','✨');img.style.filter='';}addDetail((ev.userName||pokemonName(ev.side))+'이(가) '+(ev.targetName||'상대 포켓몬')+'의 모습과 기술을 복사했다!');await pause(950);}else if(ev.type==='statusApplied'){
 if(battleEffectDisplay?.[ev.side]){
  if(ev.status==='confusion')battleEffectDisplay[ev.side].confused=true;
  else battleEffectDisplay[ev.side].status=ev.status;
  renderBattleStatus(ev.side,ev.side==='player'?battle.player:(animatingEnemy??battle.enemies[battle.enemyIndex]));
 }
 addDetail(currentMove?.id==='rest'&&currentMove.side===ev.side?pokemonName(ev.side)+'는 잠자기로 HP를 모두 회복하고 잠들었다!':pokemonName(ev.side)+' '+({sleep:'수면',paralysis:'마비',poison:'독',burn:'화상',freeze:'얼음',confusion:'혼란'}[ev.status]||ev.status||'상태이상')+' 상태!');if(currentMove?.isStatus&&currentMove.side!==ev.side){await playMoveImpact(ev.side,currentMove.id);await shakeHit(ev.side);}await pause(250);}else if(ev.type==='statChange'){
  if(currentMove?.isStatus&&currentMove.side!==ev.side&&ev.change<0){await playMoveImpact(ev.side,currentMove.id);await shakeHit(ev.side);}
  // A compound boost (e.g. Dragon Dance) emits several adjacent stat changes.
  // Display one three-arrow animation for the whole group.
  const side=ev.side,positive=ev.change>0;
  const rankEvents=[ev];while(i+1<events.length&&events[i+1].type==='statChange'&&events[i+1].side===side&&Math.sign(events[i+1].change)===Math.sign(ev.change))rankEvents.push(events[++i]);if(battleEffectDisplay){for(const re of rankEvents){const stages=battleEffectDisplay[side].stages;stages[re.stat]=(stages[re.stat]||0)+re.change;}}renderBattleEffects();
  // Reveal the complete compound boost together on a new line after its move name.
  const statLabels={attack:'공격',defense:'방어',speed:'스피드',evasion:'회피율',accuracy:'명중률'};
  const rankText=re=>pokemonName(re.side)+'의 '+(statLabels[re.stat]||re.stat)+' '+Math.abs(re.change)+'랭크 '+(re.change>0?'상승':'하락');
  addDetail(rankEvents.map(rankText).join(', '));
  const host=visualSprite(side);
  if(host){
    host.querySelectorAll('.stat-change-arrows').forEach(node=>node.remove());
    const arrows=document.createElement('div');
    arrows.className='stat-change-arrows '+(positive?'stat-arrows-up':'stat-arrows-down');
    arrows.setAttribute('aria-hidden','true');
    for(let n=0;n<3;n++){const arrow=document.createElement('span');arrow.className='stat-change-arrow';arrow.textContent=positive?'▲':'▼';arrows.append(arrow);}
    host.append(arrows);
    await pause(1500);
    arrows.remove();
  }else await pause(220);
}else if(ev.type==='moveFailed'){addDetail('하지만 실패했다!');await pause(600);}else if(ev.type==='fieldEffect'){if(battleEffectDisplay){if(ev.effect==='lightScreen')battleEffectDisplay.shields[ev.side]=battle.shields[ev.side];if(ev.effect==='aquaRing')battleEffectDisplay.rings[ev.side]=true;}renderBattleEffects();await pause(350);}else if(ev.type==='focusSash'){currentMove=null;tell(pokemonName(ev.side)+'의 기합의띠 발동!','HP 1로 버텼다!');await pause(600);}else if(ev.type==='heal'){if(ev.heldItem==='revivalSeed'){currentMove=null;tell(pokemonName(ev.side)+'의 부활의 씨앗 발동!');}else if(ev.heldItem==='leftovers'){currentMove=null;tell(pokemonName(ev.side)+'의 먹다남은음식!');}else if(ev.heldItem==='sitrusBerry'){currentMove=null;tell(pokemonName(ev.side)+'의 자뭉열매 발동!');}else if(ev.heldItem==='oranBerry'){currentMove=null;tell(pokemonName(ev.side)+'의 오랭열매 발동!');}else if(ev.item)tell('회복 아이템 사용!');else if(!lastTitle)tell('HP 회복!');if(!(currentMove?.id==='rest'&&currentMove.side===ev.side))addDetail(pokemonName(ev.side)+' HP '+ev.amount+' 회복');if(!ev.item)await playMoveImpact(ev.side,'synthesis');popup(ev.side,ev.amount,false,true);await pause(400);displayHp(ev.side,ev.hp);await pause(700);if(['oranBerry','sitrusBerry','revivalSeed'].includes(ev.heldItem)){
  // Only hide the spent item after its heal has been shown, not when
  // the engine calculates the whole turn before animation.
  if(heldIconTimeline){
   if(ev.side==='enemy'&&heldIconTimeline.enemyDisplay){
    const visible=heldIconTimeline.enemyDisplay;
    visible.heldItemCounts[ev.heldItem]=Math.max(0,(visible.heldItemCounts[ev.heldItem]||0)-1);
    if(ev.heldItem==='oranBerry')visible.oranBerryEnabled=false;
    if(ev.heldItem==='sitrusBerry')visible.sitrusBerryEnabled=false;
    if(ev.heldItem==='revivalSeed')visible.revivalSeedUsed=true;
   }else if(ev.side==='player'){
    heldIconTimeline.playerCounts[ev.heldItem]=Math.max(0,(heldIconTimeline.playerCounts[ev.heldItem]||0)-1);
   }
  }
  if(ev.side==='enemy')renderEnemyHeldItems(animatingEnemy??battle.enemies[battle.enemyIndex]);
  else render();
 }$(ev.side+'Popup').classList.remove('visible');}else if(ev.type==='capture'){tell('몬스터볼을 던졌다!');await playCaptureSequence(ev.success);}else if(ev.type==='miss'){addDetail(pokemonName(ev.side)+'의 공격이 빗나갔다!');await pause(1300);}}if(!events.length&&battle?.log?.length){const note=battle.log.at(-1);if(note)showBattleActionMessage(note,'');}}


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

const TRAINER_STAT_CONFIG={
 blue:[8,0],greenReturn:[8,10],greenThird:[8,20],greenFourth:[8,20],greenFifth:[8,40],
 brock:[8,0],misty:[8,10],surge:[8,10],erika:[8,20],koga:[10,30],
 sabrina:[10,40],blaine:[12,50],giovanni:[14,60],
 rocketApollo:[12,20],rocketAthena:[12,20],rocketGiovanni:[16,54],
 league0:[14,30],league1:[14,30],league2:[14,30],league3:[14,30],league4:[16,60],red:[16,60]
};
function trainerFighter(name,dex,level,base,moveIds=['tackle'],options={}){
 // Temporary trainer rule: use the four most recently learned moves at this level.
 // Starter evolution families share their existing starter learnsets.
 const starterFamily=Object.keys(EVOLUTIONS).find(id=>EVOLUTIONS[id].some(form=>form.dex===dex));
 const recent=starterFamily
  ?availableMoves(starterFamily,level).slice(-4).map(m=>m.id)
  :recentWildMoves(dex,level);
 let selected=options.fixedMoves?moveIds:(recent.length?recent:moveIds);
 // Rocket boss Giovanni uses a dedicated moveset; wild and other trainers stay unchanged.
 if(battleKind==='rocketGiovanni'&&dex===150)selected=['recover','calmMind','psystrike','lightScreen'];
 if(battleKind==='rocketGiovanni'&&dex===31)selected=['poisonJab','earthquake','thrash','powerUpPunch'];
 // Agatha's level-71 Gengar uses Hypnosis instead of Confuse Ray.
 if(battleKind==='league2'&&dex===94&&level===71){selected=[...selected];const i=selected.indexOf('confuseRay');if(i>=0){if(selected.includes('hypnosis'))selected.splice(i,1);else selected[i]='hypnosis';}else if(!selected.includes('hypnosis'))selected[selected.length-1]='hypnosis';}
 const trainer=createFighter({id:'trainer-'+dex,name,level,friendship:50,stats:(()=>{
  const [iv,ev]=TRAINER_STAT_CONFIG[battleKind]||[0,0];
  const ivs={hp:iv,attack:iv,defense:iv,speed:iv};
  const evs={hp:ev,attack:ev,defense:ev,speed:ev};
  return calculateStats(BASE_STATS[dex],level,ivs,options.evs||evs);
 })(),moveIds:selected});
 trainer.dex=dex;
 if(options.redPikachu)trainer.redAiMode='pikachu';
 if(options.redSnorlax)trainer.redAiMode='snorlax';
 if(options.redLapras)trainer.redAiMode='lapras';
 if(options.redCharizard)trainer.redAiMode='charizard';
 if(options.redVenusaur)trainer.redAiMode='venusaur';
 if(options.redBlastoise)trainer.redAiMode='blastoise';
 // Red's entire team carries three Scope Lenses: +12 percentage points critical hit chance.
 if(options.redPikachu||options.redSnorlax||options.redLapras||options.redVenusaur||options.redCharizard||options.redBlastoise){trainer.scopeLensCount=3;trainer.critBuff=0.04*trainer.scopeLensCount;}
 // Reflect trainer-held item effects in the opponent HP panel.
 trainer.heldItemCounts=options.redPikachu?{lightBall:1,hardClaw:3,wideLens:2,scopeLens:3,focusSash:6,revivalSeed:1,magnet:1}:options.redSnorlax?{leftovers:3,focusSash:6,scopeLens:3}:options.redLapras?{leftovers:2,shellBell:3,wideLens:2,scopeLens:3,mysticWater:1}:options.redVenusaur?{leftovers:3,hardClaw:3,scopeLens:3,miracleSeed:1}:options.redCharizard?{hardClaw:3,focusSash:6,scopeLens:3,charcoal:1,sharpBeak:1,revivalSeed:1,shellBell:3}:options.redBlastoise?{shellBell:3,leftovers:2,focusSash:6,hardClaw:3,scopeLens:3,mysticWater:1}:battleKind==='blaine'&&FIRE_TYPE_DEX.has(dex)?{charcoal:1}:battleKind==='surge'?{hardClaw:1}:battleKind==='brock'&&dex===95?{oranBerry:1}:null;
 if(options.redPikachu||options.redLapras){trainer.wideLensAccuracyBuff=0.10;if(options.redLapras)trainer.accuracyBuff=(trainer.accuracyBuff||0)+0.10;}
 if(battleKind==='brock'&&dex===95)trainer.oranBerryEnabled=true;
 if(options.redPikachu){
  // Red's Pikachu carries all six boss item effects simultaneously.
  trainer.hardClawCount=3;
  trainer.attackBuffMultiplier=1+0.5+0.1*trainer.hardClawCount+0.1; // Light Ball + 3 Hard Claws + Magnet, additive
  trainer.speedBuffMultiplier=1.05; // Magnet: +5% Speed
  trainer.accuracyBuff=0.10; // Two Wide Lenses
  trainer.focusSashEnabled=true;
  trainer.focusSashCount=6;
  trainer.focusSashChance=0.05*trainer.focusSashCount; // Six Focus Sashes: 30% survival
  trainer.focusSashUsed=false;
  trainer.revivalSeedEnabled=true;
  trainer.revivalSeedUsed=false;
 }
 if(options.redSnorlax){
  trainer.leftoversEnabled=true;
  trainer.focusSashEnabled=true;
  trainer.focusSashCount=6;
  trainer.focusSashChance=0.05*trainer.focusSashCount; // Six Focus Sashes: 30% survival
  trainer.focusSashUsed=false;
 }
 if(options.redLapras){
  trainer.defenseBuffMultiplier=1.10;
  trainer.leftoversEnabled=true;
  trainer.shellBell=true;
  trainer.accuracyBuff=0.10;
 }
 if(options.redVenusaur){
  trainer.defenseBuffMultiplier=1.10;
  trainer.accuracyBuff=0.05; // One Wide Lens
  trainer.leftoversEnabled=true;
  trainer.hardClawCount=3;
  trainer.attackBuffMultiplier=1+0.1*trainer.hardClawCount;
 }
 if(options.redCharizard){
  trainer.revivalSeedEnabled=true;
  trainer.revivalSeedUsed=false;
  trainer.shellBell=true;
  trainer.hardClawCount=3;
  trainer.attackBuffMultiplier=1+0.1*trainer.hardClawCount+0.15+0.1; // Three Hard Claws + Charcoal + Sharp Beak (additive)
  trainer.focusSashEnabled=true;
  trainer.focusSashCount=6;
  trainer.focusSashChance=0.05*trainer.focusSashCount; // Six Focus Sashes: 30% survival
  trainer.focusSashUsed=false;
 }
 if(options.redBlastoise){
  trainer.defenseBuffMultiplier=1.10;
  trainer.shellBell=true;
  trainer.leftoversEnabled=true;
  trainer.focusSashEnabled=true;
  trainer.focusSashCount=6;
  trainer.focusSashChance=0.05*trainer.focusSashCount; // Six Focus Sashes: 30% survival
  trainer.focusSashUsed=false;
  trainer.hardClawCount=3;
  trainer.attackBuffMultiplier=1+0.1*trainer.hardClawCount;
 }
 // Gym boss held items: retain distinct per-Pokemon effects and the existing Red setup.
 if(battleKind==='giovanni'){
  trainer.heldItemCounts={...(trainer.heldItemCounts||{}),hardClaw:2};
  trainer.hardClawCount=2;
  trainer.attackBuffMultiplier=(trainer.attackBuffMultiplier||1)+0.20;
  if(dex===112){
   trainer.heldItemCounts={...trainer.heldItemCounts,quickClaw:4,focusSash:4};
   trainer.quickClawCount=4;
   trainer.focusSashEnabled=true;
   trainer.focusSashCount=4;
   trainer.focusSashChance=0.05*trainer.focusSashCount;
   trainer.focusSashUsed=false;
  }
 }
 if(battleKind==='blaine'&&dex===59){
  trainer.heldItemCounts={...(trainer.heldItemCounts||{}),hardClaw:1};
  trainer.hardClawCount=1;
  trainer.attackBuffMultiplier=(trainer.attackBuffMultiplier||1)+0.10;
 }
 // Rocket commanders and boss: actual held-item combat effects, not just HUD labels.
 const rocketItems=()=>{
  if(battleKind==='rocketApollo')return {...(dex===169||dex===45?{}:{leftovers:2}),...(dex===169?{hardClaw:2}:{})};
  if(battleKind==='rocketAthena')return {...{shellBell:2,magnet:1},...(dex===197?{leftovers:2}:{})};
  if(battleKind==='rocketGiovanni'){
   if(dex===112)return {quickClaw:4,revivalSeed:1,wideLens:1};
   if(dex===15)return {hardClaw:3,focusSash:5,revivalSeed:1,scopeLens:1};
   if(dex===150)return {hardClaw:3,focusSash:6,sitrusBerry:1,scopeLens:2};
   if(dex===34||dex===31)return {hardClaw:3};
  }
  return null;
 };
 const rocketHeld=rocketItems();
 if(rocketHeld){
  trainer.heldItemCounts={...(trainer.heldItemCounts||{}),...rocketHeld};
  trainer.hardClawCount=rocketHeld.hardClaw||0;
  trainer.attackBuffMultiplier=(trainer.attackBuffMultiplier||1)+trainer.hardClawCount*.10;
  trainer.quickClawCount=rocketHeld.quickClaw||0;
  trainer.focusSashCount=rocketHeld.focusSash||0;
  trainer.focusSashEnabled=trainer.focusSashCount>0;
  trainer.focusSashChance=.05*trainer.focusSashCount;
  trainer.focusSashUsed=false;
  trainer.revivalSeedEnabled=!!rocketHeld.revivalSeed;
  trainer.revivalSeedUsed=false;
  trainer.wideLensAccuracyBuff=.05*(rocketHeld.wideLens||0); trainer.accuracyBuff=(trainer.accuracyBuff||0)+trainer.wideLensAccuracyBuff;
  trainer.critBuff=(trainer.critBuff||0)+.04*(rocketHeld.scopeLens||0);
  if(rocketHeld.magnet&&ELECTRIC_TYPE_DEX.has(dex))trainer.speedBuffMultiplier=(trainer.speedBuffMultiplier||1)*1.05;
  trainer.leftoversEnabled=!!rocketHeld.leftovers;
  trainer.shellBell=!!rocketHeld.shellBell;
 }
 if(battleKind==='giovanni'&&(dex===51||dex===112)){
  trainer.heldItemCounts={...(trainer.heldItemCounts||{}),wideLens:1};
  trainer.wideLensAccuracyBuff=(trainer.wideLensAccuracyBuff||0)+.05; trainer.accuracyBuff=(trainer.accuracyBuff||0)+.05;
 }
 if(battleKind==='koga'&&(dex===89||dex===110)){const count=dex===89?2:3;trainer.heldItemCounts={...(trainer.heldItemCounts||{}),leftovers:count};trainer.leftoversEnabled=true;trainer.leftoversCount=count;}
 if(battleKind==='sabrina'){trainer.heldItemCounts={...(trainer.heldItemCounts||{}),quickClaw:4};trainer.quickClawCount=4;}
 if(battleKind==='surge'){trainer.hardClawCount=1;trainer.attackBuffMultiplier=(trainer.attackBuffMultiplier||1)+0.1;} // Lt. Surge: each Pokemon carries one Hard Claw (+10% Attack)
 if(battleKind==='blaine'&&FIRE_TYPE_DEX.has(dex))trainer.attackBuffMultiplier=(trainer.attackBuffMultiplier||1)+0.15; // Charcoal: Fire-type Attack +15%
 trainer.shellBellCount=trainer.heldItemCounts?.shellBell||0;
 trainer.leftoversCount=trainer.heldItemCounts?.leftovers||0;
 return trainer;
}
function fighter(s,ivs={hp:8,attack:8,defense:8,speed:8},level=5,baseStats=s.base,displayName=s.name,moveIds=s.moves){
 return createFighter({id:s.id,name:displayName,level,friendship:50,stats:calculateStats(baseStats,level,ivs,playerEVs),moveIds});
}
const WILD_EVOLUTIONS={
 10:[11,7,'단데기'],11:[12,10,'버터플'],13:[14,7,'딱충이'],14:[15,10,'독침붕'],
 16:[17,18,'피죤'],17:[18,36,'피죤투'],19:[20,20,'레트라'],21:[22,20,'깨비드릴조'],
 27:[28,22,'고지'],29:[30,16,'니드리나'],32:[33,16,'니드리노'],
 41:[42,22,'골뱃'],43:[44,21,'냄새꼬'],46:[47,24,'파라섹트'],
 54:[55,33,'골덕'],60:[61,25,'슈륙챙이'],
 63:[64,16,'윤겔라'],66:[67,28,'근육몬'],
 69:[70,21,'우츠동'],72:[73,30,'독파리'],
 74:[75,25,'데구리'],79:[80,37,'야도란'],
 81:[82,30,'레어코일'],84:[85,31,'두트리오'],111:[112,42,'코뿌리'],
 92:[93,25,'고우스트'],96:[97,26,'슬리퍼'],
 98:[99,28,'킹크랩'],100:[101,30,'붐볼'],104:[105,28,'텅구리'],
 116:[117,32,'시드라'],118:[119,33,'왕콘치'],129:[130,20,'갸라도스'],
 48:[49,31,'도나리'],50:[51,26,'닥트리오'],52:[53,28,'페르시온'],56:[57,28,'성원숭'],
 77:[78,40,'날쌩마'],86:[87,34,'쥬레곤'],88:[89,38,'질뻐기'],109:[110,35,'또도가스'],
 138:[139,40,'암스타'],140:[141,40,'투구푸스']
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
     for(const info of (chosen==='eevee'&&getEeveeForm()?[...MOVE_LEARNSETS.eevee,...MOVE_LEARNSETS[getEeveeForm()]]:MOVE_LEARNSETS[chosen]).filter(m=>m.level===level)){
      await learnOneMove(info.id);
      appendAdventureLog('📖 '+getForm(chosen,level).name+' 기술 학습: '+MOVES[info.id].name);
     }
    }else if(member){
     const evo=WILD_EVOLUTIONS[member.dex];
     if(evo&&level>=evo[1]){
      const before={dex:member.dex,name:member.name},after={dex:evo[0],name:evo[2]};
      await showEvolutions([{before,after,level}]);
      member.dex=evo[0];member.name=evo[2];
      // The evolution dialog closes before a companion's new species is committed.
      // Normalize equipped items again after the actual species change.
      normalizeHeldItems();
      renderStatPanel();
      appendAdventureLog('🌟 '+before.name+' → '+after.name+' 진화!');
     }
     const known=learnsetForDex(member.dex)||[];
     for(const info of known.filter(m=>m.level===level&&MOVES[m.id]&&!member.moves.includes(m.id))){
      if(member.moves.length<4){member.moves.push(info.id);await showLearnedMoveNotice(member.name,info.id);}
      else{
       const remove=await resolveMoveChoice(info.id,{member});
       if(remove!==null){member.moves.splice(member.moves.indexOf(remove),1,info.id);await showLearnedMoveNotice(member.name,info.id);}
      }
      appendAdventureLog('📖 '+member.name+' 기술 학습: '+MOVES[info.id].name);
     }
    }
   }
   saveProgress();
  }
 }finally{checkLevelAchievement();learningBusy=false;renderHome();showChallengeUnlockNotice();}
}
let pendingPartyGrowth=[];
function addPartyExperience(amount,enemyName,cap=null){
 if(!(amount>0))return;
 const order=teamMembers();
 for(const member of order){
  if(memberHp(member)===0)continue; // Fainted Pokémon cannot receive EXP until revived.
  const participate=battleParticipants.has(member.key);
  const memberCap=cap===null?wildRewardLevelCap():cap;
  if(memberCap!==null&&member.level>=memberCap)continue;
  const gained=Math.floor(amount*(participate?1:0.7)*(inventory.expShare&&expShareActive?1+0.25*Math.min(4,inventory.expShare):1));
  const oldLevel=member.level,beforeMax=memberMaxHp(member),beforeHp=memberHp(member);
  if(member.starter){
   if(memberCap!==null&&progress.level>=memberCap)continue;
   progress.exp+=gained;
   while(progress.level<100&&(memberCap===null||progress.level<memberCap)&&progress.exp>=levelNeed(progress.level)){
    progress.exp-=levelNeed(progress.level);progress.level++;
   }
   if(progress.level===100)progress.exp=0;
   if(progress.level>oldLevel){
    // The active battler's HP is adjusted after combat; bench starters need it here.
    if(member.key!==activeBattleKey)preserveLevelUpHp(member,beforeMax,beforeHp);
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
    if(member.key!==activeBattleKey)preserveLevelUpHp(member,beforeMax,beforeHp);
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
 const rewardMultiplier=wildHasAdvancedReward(wildEnemy)?WILD_ADVANCED_REWARD_MULTIPLIER:1;
 const gained=capped?0:scaledBattleReward(12+wildEnemy.level*6,rewardMultiplier);
 const baseMoney=scaledBattleReward(baseCashForWin(wildEnemy.level),rewardMultiplier);
 const bonusMoney=bonusCashForWin(wildEnemy.level);
 lastBattleReward={exp:gained,money:baseMoney};
 const messages=['+'+gained+' EXP 획득!','기본 상금 +'+baseMoney+'원 획득!'];
 progress.money+=baseMoney;recordMoneyChange('야생 배틀 승리 상금');checkMoneyAchievement();
 appendAdventureLog('💰 야생 배틀 보상 '+baseMoney+'원 획득');
 // Pallet Town remains a wild-battle training area, but offers no random reward rolls.
 // Rocket Base, Faraway Island, and other areas keep their regular reward rules.
 pendingRewardChoice=(capped||area==='palletTown')?null:{choices:null,rerolls:0,gym:false};
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
  layer.style.zIndex='1000200';$('evolutionConfirm').hidden=true;
  art.classList.remove('evolved');$('evolutionName').textContent=evolution.before.name;
  $('evolutionMessage').textContent='포켓몬이 진화하고 있어!';load(evolution.before);layer.hidden=false;
  await pause(2400);
  art.classList.add('evolved');load(evolution.after);
  $('evolutionName').textContent=evolution.after.name;
  $('evolutionMessage').textContent=evolution.before.name+' → '+evolution.after.name+' 진화 성공! (LV '+evolution.level+')';
  await pause(2600);
  // Keep the completed evolution on top until the player confirms it.
  const confirm=$('evolutionConfirm');
  confirm.hidden=false;
  await new Promise(resolve=>{
   confirm.addEventListener('click',resolve,{once:true});
   confirm.focus();
  });
  confirm.hidden=true;
  layer.hidden=true;
  normalizeHeldItems(); // Free Eviolites immediately after evolution, before saving.
  // A Pokémon obtained by evolving a caught/owned Pokémon counts as caught in the Pokédex.
  if(Number.isInteger(evolution.after.dex)&&evolution.after.dex>0&&evolution.after.dex<=1025){
   earnAchievement('evo:'+evolution.after.dex);
   if(evolution.before.dex===133&&[134,135,136,196,197].includes(evolution.after.dex))earnAchievement('eeveeMajor');
   caughtSpecies.add(evolution.after.dex);checkDexAchievements();
   seenPokemon.add(evolution.after.dex);
   saveProgress();
  }
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
 const rewardLevelCap=wildRewardLevelCap();
 const old=progress.level;
 const evolutions=[];
 const learnQueue=[];
 let gained=0;
 let badgeEarned=null;
 if(battle.result==='victory'){
  const rewardCountBeforeVictory=rewardChoiceCount();
  if(GYM_BADGES[battleKind]&&!({brock:brockCleared,misty:mistyCleared,surge:surgeCleared,erika:erikaCleared,koga:kogaCleared,sabrina:sabrinaCleared,blaine:blaineCleared,giovanni:giovanniCleared})[battleKind])badgeEarned=battleKind;
  achievementData.trainerWins++;saveAchievements();if(achievementData.trainerWins>=100)earnAchievement('trainer100');if(['blue','greenReturn','greenThird','greenFourth','greenFifth','league4'].includes(battleKind))earnAchievement('rival');if(battleKind==='brock')earnAchievement('brock');if(battleKind==='misty')earnAchievement('misty');if(battleKind==='blue'&&!blueCleared){blueCleared=true;area='forest';}
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
  if(battleKind!=='wild')trainerClears[battleKind]=true;
  if(['rocketApollo','rocketAthena','rocketGiovanni'].every(kind=>trainerClears[kind]))earnAchievement('rocketFan');
  if(battleKind==='red'){
   earnAchievement('redSummit');
   const f=getForm(chosen,progress.level);
   redHallOfFame.push({date:new Date().toISOString(),pokemon:f.name,dex:f.dex,starter:chosen,level:progress.level,ivs:{...playerIVs},evs:{...playerEVs},moves:[...playerMoves],party:hallPartySnapshot(),round:(redHallOfFame.at(-1)?.round||0)+1});redCeremonyPending=true;
  }
  if(leagueIndex===4){earnAchievement('champion');earnAchievement('starter:'+chosen);
   if(teamMembers().some(m=>m.dex===25)&&!teamMembers().some(m=>m.dex===26))earnAchievement('ashPikachu');}if(leagueIndex>=0){if(leagueIndex===4){area='palletTown';const f=getForm(chosen,progress.level);hallOfFame.push({date:new Date().toISOString(),pokemon:f.name,dex:f.dex,starter:chosen,level:progress.level,ivs:{...playerIVs},evs:{...playerEVs},moves:[...playerMoves],party:hallPartySnapshot(),round:(hallOfFame.at(-1)?.round||0)+1});leagueStage=null;currentRunLeagueWon=true;leagueCeremonyPending=true}else leagueStage=leagueIndex+1}
  if(leagueIndex===4&&hallOfFame.length>=10)earnAchievement('hall10');const money=battleKind==='red'?5000:leagueIndex>=0?1800+leagueIndex*350:TRAINERS[battleKind].money;
  const finalEnemy=battle.enemies?.[battle.enemies.length-1];
  const level=finalEnemy?.level??(battleKind==='red'?96:leagueIndex>=0?67+leagueIndex*2:TRAINERS[battleKind].level);
  // Award trainer EXP exactly once, on victory, based on the final opposing Pokemon.
  // Keep the pre-victory region cap even if this victory advances to the next area.
  gained=activeWasCapped?0:scaledBattleReward(12+level*6,TRAINER_EXP_REWARD_MULTIPLIER);
  trainerExpEarned=gained;
  if(gained>0)addPartyExperience(gained,finalEnemy?.name||'마지막 포켓몬',rewardLevelCap);
  const trainerMoney=scaledBattleReward(baseCashForWin(level),TRAINER_MONEY_REWARD_MULTIPLIER);
  progress.money+=trainerMoney;recordMoneyChange('트레이너 승리 상금');checkMoneyAchievement();
  appendAdventureLog('💰 트레이너 승리 보상 '+trainerMoney+'원 획득');
  lastBattleReward={exp:gained,money:trainerMoney};
  lastPartyExp={...battleExpEarned};
  pendingRewardChoice=!activeWasCapped&&gained>0?{choices:null,rewardCount:rewardCountBeforeVictory,rerolls:0,gym:!!GYM_BADGES[battleKind]}:null;if(Object.keys(GYM_BADGES).every(k=>({brock:brockCleared,misty:mistyCleared,surge:surgeCleared,erika:erikaCleared,koga:kogaCleared,sabrina:sabrinaCleared,blaine:blaineCleared,giovanni:giovanniCleared})[k]))earnAchievement('badges');
 }else{
  if(battle.result==='defeat')earnAchievement('firstLoss');if(battleKind.startsWith('league'))leagueStage=null;
  trainerExpEarned=0;
  lastBattleReward={exp:0,money:0};
  lastPartyExp={};
 }
 // Party growth and move learning are processed together after combat.
 saveProgress();
 return {messages:battle.result==='victory'?(['+'+gained+' EXP 획득!'].concat(battleKind==='red'?['전설의 트레이너 레드에게 승리했어!','2차 엔딩 달성!']:battleKind.startsWith('league')?[LEAGUE_NAMES[Number(battleKind.slice(6))]+'에게 승리했어!',Number(battleKind.slice(6))===4?'명예의 전당에 등록됐어!':'다음 리그 대기실로 이동!']:battleKind==='misty'?['이슬이에게 승리! 블루배지를 획득했어!','호수공원 지역이 열렸어!']:battleKind==='greenReturn'?['라이벌 그린에게 승리했어!']:battleKind==='surge'?['마티즈에게 승리! 오렌지배지를 획득했어!','공동묘지 지역이 열렸어!']:battleKind==='greenFifth'?['라이벌 그린에게 승리했어!','석영고원로 이동했어!']:battleKind==='greenFourth'?['라이벌 그린에게 승리했어!','노랑시티에서 계속 모험해!']:battleKind==='greenThird'?['라이벌 그린에게 승리했어!','무지개시티 지역이 열렸어!']:battleKind==='erika'?['민화에게 승리! 레인보우배지를 획득했어!','자전거도로 지역이 열렸어!']:battleKind==='koga'?['독수에게 승리! 핑크배지를 획득했어!','대무지개시티 지역이 열렸어!']:battleKind==='giovanni'?['비주기에게 승리! 그린배지를 획득했어!','챔피언로드가 열렸어!']:battleKind==='blaine'?['강연에게 승리! 크림슨배지를 획득했어!','이상한 숲 지역이 열렸어!']:battleKind==='sabrina'?['초련에게 승리! 골드배지를 획득했어!','바다 지역이 열렸어!']:ROCKET_TEAMS[battleKind]?[TRAINERS[battleKind].name+'에게 승리했어!','비밀기지에서 계속 모험해!']:['트레이너 승리!','새로운 지역이 열렸어!'])):['부상을 입었어. 치료가 필요해.','경험치 +0'],evolutions,learnQueue,badgeEarned,previousLevel:old,newLevel:progress.level};
}
const CHALLENGE_ORDER=['blue','brock','misty','greenReturn','surge','greenThird','erika','koga','greenFourth','sabrina','blaine','giovanni','greenFifth'];
const MAP_REGIONS=[
 ['grass','🌿 초원',()=>true,8],['forest','🌳 상록숲',()=>blueCleared,14],['cave','🪨 달맞이동굴',()=>brockCleared,18],['lake','💧 호수공원',()=>mistyCleared,26],
 ['cemetery','🪦 공동묘지',()=>surgeCleared,29],['town','🏘️ 무지개시티',()=>greenThirdCleared,34],['road','🛣️ 자전거도로',()=>erikaCleared,39],
 ['city','🏙️ 노랑시티',()=>kogaCleared,47],['sea','🌊 바다',()=>sabrinaCleared,54],['volcano','🌋 화산',()=>sabrinaCleared&&(progress.level>=48||volcanoAutoVisited||blaineCleared),54],
 ['strangeForest','🌲 이상한 숲',()=>blaineCleared,60],['championRoad','🏔️ 챔피언로드',()=>giovanniCleared,66],
 ['championRoad2','🏛️ 석영고원',()=>greenFifthCleared,88],['palletTown','🏠 태초마을',()=>currentRunLeagueWon,80],
 ['rocketBase','🚀 로켓단 비밀기지',()=>currentRunLeagueWon&&inventory.secretSwitch>0,90],
 ['farawayIsland','🏝️ 환상의 섬',()=>currentRunLeagueWon&&inventory.oldSeaMap>0,90],
 ['mountSilver','🏔️ 은빛산',()=>currentRunLeagueWon,null]
];
const mapRegion=key=>MAP_REGIONS.find(r=>r[0]===key);
let volcanoAutoVisited=!!(saved?.volcanoAutoVisited||area==='volcano');
// Previous saves could mark this flag true before the player actually left the sea.
if(saved&&!saved.volcanoAutoMoveVersion&&area==='sea'&&sabrinaCleared&&!blaineCleared)volcanoAutoVisited=false;
const latestMapRegion=()=>currentRunLeagueWon?'palletTown':greenFifthCleared?'championRoad2':giovanniCleared?'championRoad':blaineCleared?'strangeForest':sabrinaCleared?(area==='volcano'||(progress.level>=48&&!blaineCleared)?'volcano':'sea'):kogaCleared?'city':erikaCleared?'road':greenThirdCleared?'town':surgeCleared?'cemetery':mistyCleared?'lake':brockCleared?'cave':blueCleared?'forest':'grass';
function wildRewardLevelCap(){
 // Fixed absolute cap per region. The lake and city change only after their corresponding rival wins.
 if(area==='lake'&&!greenReturnCleared)return 22;
 if(area==='city'&&!greenFourthCleared)return 43;
 return mapRegion(area)?.[3]??null;
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
const REGION_TRAINERS={grass:['blue'],forest:['brock'],cave:['misty'],lake:['greenReturn','surge'],cemetery:['greenThird'],town:['erika'],road:['koga'],city:['greenFourth','sabrina'],sea:[],volcano:['blaine'],strangeForest:['giovanni'],championRoad:['greenFifth']};
function nextTrainerKind(){return !blueCleared?'blue':!brockCleared?'brock':!mistyCleared?'misty':!greenReturnCleared?'greenReturn':!surgeCleared?'surge':!greenThirdCleared?'greenThird':!erikaCleared?'erika':!kogaCleared?'koga':!greenFourthCleared?'greenFourth':!sabrinaCleared?'sabrina':!blaineCleared?'blaine':!giovanniCleared?'giovanni':!greenFifthCleared?'greenFifth':null;}
function rivalForm(id,level){
 if(id==='eevee'&&level>=22){
  if(!rivalEeveeEvolution){const forms=Object.keys(EEVEE_FORMS);rivalEeveeEvolution=forms[Math.floor(Math.random()*forms.length)];saveProgress();}
  return EEVEE_FORMS[rivalEeveeEvolution];
 }
 return id==='gengar'&&level>=40?EVOLUTIONS.gengar.at(-1):id==='raichu'&&level>=30?EVOLUTIONS.raichu.at(-1):getForm(id,level);
}
function chooseRivalStarter(playerId){const pool=RIVAL_POOL.filter(p=>p.id!==playerId);return pool[Math.floor(Math.random()*pool.length)].id;}
let battlePlayerLevelStart=1;
let pendingTrainerIntro=null;
// Prevent challenge notifications from covering evolution and move-learning screens.
let resolvingBattleNotifications=false;
let challengeNotified=Array.isArray(saved?.challengeNotified)?saved.challengeNotified.filter(k=>CHALLENGE_ORDER.includes(k)):[];
function showChallengeUnlockNotice(){
 const kind=nextTrainerKind();
 if(!kind||!(REGION_TRAINERS[area]||[]).includes(kind)||area!==latestMapRegion()||!teamMembers().some(m=>m.level>=TRAINERS[kind].level)||challengeNotified.includes(kind)||animating||learningBusy||pendingTrainerIntro||resolvingBattleNotifications||!$('evolutionOverlay').hidden||!$('learnMoveOverlay').hidden||!$('challengeUnlockOverlay').hidden)return;
 challengeNotified.push(kind);
 saveProgress();
 const name=TRAINERS[kind].name;
 $('challengeUnlockTitle').textContent=name+'에게 도전 가능!';
 $('challengeUnlockOverlay').hidden=false;
}

function nextRocketTrainerKind(){return !trainerClears.rocketApollo?'rocketApollo':!trainerClears.rocketAthena?'rocketAthena':!trainerClears.rocketGiovanni?'rocketGiovanni':null;}
function challengeTrainer(){
 const rocketChallenge=area==='rocketBase'&&hallOfFame.length>0;
 if(currentRunLeagueWon&&!rocketChallenge){showMap();return;}
 const kind=rocketChallenge?nextRocketTrainerKind():nextTrainerKind();
 if(!livingMembers().length||pendingRewardChoice||learningBusy||animating||pendingTrainerIntro)return;
 if(!kind)return;
 if(rocketChallenge){if(!teamMembers().some(m=>m.level>=TRAINERS[kind].level))return;}
 else if((area!==latestMapRegion()&&!(area==='city'&&kind==='greenFourth'))||!(REGION_TRAINERS[area]||[]).includes(kind)||!teamMembers().some(m=>m.level>=TRAINERS[kind].level))return;
 pendingTrainerIntro=kind;
 const trainer=TRAINERS[kind];
 $('trainerIntroName').textContent=trainer.name;
 $('trainerIntroText').textContent=kind==='blue'||kind==='greenReturn'||kind==='greenThird'||kind==='greenFourth'||kind==='greenFifth'?'라이벌 그린이 배틀을 신청했다!':kind==='brock'?'바위 체육관 관장 웅이 승부를 걸어왔다!':kind==='misty'?'물 체육관 관장 이슬이가 승부를 걸어왔다!':kind==='erika'?'풀 체육관 관장 민화가 승부를 걸어왔다!':kind==='koga'?'독 체육관 관장 독수가 승부를 걸어왔다!':kind==='sabrina'?'에스퍼 체육관 관장 초련이 승부를 걸어왔다!':kind==='rocketApollo'?'로켓단 간부 아폴로가 승부를 걸어왔다!':kind==='rocketAthena'?'로켓단 간부 아테나가 승부를 걸어왔다!':kind==='rocketGiovanni'?'로켓단 보스 비주기가 승부를 걸어왔다!':kind==='giovanni'?'마지막 체육관 관장 비주기가 승부를 걸어왔다!':kind==='blaine'?'불꽃 체육관 관장 강연이 승부를 걸어왔다!':'전기 체육관 관장 마티즈가 승부를 걸어왔다!';
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
 await playTrainerSummon(kind);
}

async function playTrainerSummon(kind){ const arena=$('battleScreen');
 arena.classList.add('trainer-summoning');
 const ball=$('trainerThrowBall');
 ball.classList.remove('trainer-ball-flying');
 void ball.offsetWidth;
 ball.classList.add('trainer-ball-flying');
 $('trainerSummonMessage').textContent=(kind==='red'?'레드':TRAINERS[kind]?.name||LEAGUE_NAMES[Number(kind.slice(6))]||'트레이너')+'이(가) 몬스터볼을 던졌다!';
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
let lastCaptureBall=null;
function reset(kind='wild',recordDiscovery=true){
 if(animating||learningBusy||!livingMembers().length)return;
 normalizeLivingLead();
 // Use the current location's scenery for wild and trainer battles alike.
 const arena=document.querySelector('#battleScreen .arena');
 arena.classList.remove('area-grass','area-forest','area-cave','area-lake','area-cemetery','area-town','area-road','area-city','area-sea','area-volcano','area-strangeForest','area-championRoad','area-championRoad2','area-palletTown','area-rocketBase','area-farawayIsland','area-mountSilver');
 arena.classList.add('area-'+area);
 lastCaptureBall=null;battleKind=kind;battleOpponent=null;defeatedEnemies=0;trainerExpEarned=0;
 battleParticipants=new Set([leaderMember().key]);
 battleExpEarned={};
 activeBattleKey=leaderMember().key;
 battleRoster=new Map();
 const s=STARTERS.find(x=>x.id===chosen);
 const form=getForm(chosen,progress.level);
 const wild=kind==='wild'?pickEncounter(area,!!trainerClears.rocketGiovanni,inventory.whiteFlute>=1):null;
 const cap=area==='grass'?7:area==='forest'?13:area==='cave'?19:area==='lake'?24:area==='cemetery'?27:area==='town'?31:area==='road'?37:area==='city'?44:area==='sea'?48:area==='volcano'?52:area==='strangeForest'?57:area==='championRoad'?62:area==='championRoad2'?75:area==='palletTown'?80:area==='rocketBase'?90:area==='farawayIsland'?90:area==='mountSilver'?100:46;
 const level=Math.max(1,Math.min(cap,leaderMember().level-Math.floor(Math.random()*6)));
 wildEnemy=wild?{...wild,level}:null;
 const leader=leaderMember();
 const player=makeMemberFighter(leader);
 const zeroIV={hp:0,attack:0,defense:0,speed:0};
 let enemies;
 if(ROCKET_TEAMS[kind]){
  enemies=ROCKET_TEAMS[kind].map(p=>trainerFighter(p.name,p.dex,p.level,p.base));
  battleOpponent=kind;
 }else if(kind==='blue'){
  if(!blueChoice){blueChoice=chooseRivalStarter(chosen);saveProgress();}
  const other=rivalForm(blueChoice,5);
  enemies=[trainerFighter(other.name,other.dex,5,other.base,initialMoves(blueChoice))];
  battleOpponent='blue';
 }else if(kind==='brock'){
  enemies=[trainerFighter('꼬마돌',74,11,{hp:40,attack:80,defense:75,speed:20}),trainerFighter('롱스톤',95,12,{hp:35,attack:45,defense:123,speed:70})];
  battleOpponent='brock';
 }else if(kind==='misty'){
  enemies=[trainerFighter('별가사리',120,15,{hp:30,attack:70,defense:55,speed:85},['tackle','waterGun']),trainerFighter('아쿠스타',121,17,{hp:60,attack:100,defense:85,speed:115},['tackle','waterGun','bubbleBeam'])];
  // 아쿠스타: Oran Berry is both displayed and active in battle.
  {const ace=enemies[enemies.length-1];ace.oranBerryEnabled=true;ace.heldItemCounts={...(ace.heldItemCounts||{}),oranBerry:1};}
  battleOpponent='misty';
 }else if(kind==='greenReturn'){
  const rivalPokemon=rivalForm(blueChoice,19);
  const rivalMoves=availableMoves(blueChoice,19).slice(-4).map(move=>move.id);
  enemies=[trainerFighter('피죤',17,17,{hp:63,attack:60,defense:53,speed:71},['quickAttack','swift']),trainerFighter('레트라',20,16,{hp:55,attack:81,defense:65,speed:97},['tackle','quickAttack']),trainerFighter(rivalPokemon.name,rivalPokemon.dex,19,rivalPokemon.base,rivalMoves.length?rivalMoves:['tackle'])];
  // 라이벌 2차전 마지막 포켓몬: Oran Berry is both displayed and active in battle.
  {const ace=enemies[enemies.length-1];ace.oranBerryEnabled=true;ace.heldItemCounts={...(ace.heldItemCounts||{}),oranBerry:1};}
  battleOpponent='greenReturn';
 }else if(kind==='surge'){
  enemies=[trainerFighter('찌리리공',100,22,{hp:40,attack:55,defense:53,speed:100},['tackle','thunderWave']),trainerFighter('코일',81,21,{hp:25,attack:95,defense:63,speed:45},['tackle','thunderbolt']),trainerFighter('라이츄',26,24,{hp:60,attack:90,defense:68,speed:110},['quickAttack','thunderbolt'])];
  battleOpponent='surge';
 }else if(kind==='greenThird'){
  const rivalPokemon=rivalForm(blueChoice,27),rivalMoves=availableMoves(blueChoice,27).slice(-4).map(m=>m.id);
  enemies=[trainerFighter('피죤',17,25,{hp:63,attack:60,defense:53,speed:71},['quickAttack','swift']),trainerFighter('캐이시',63,15,{hp:25,attack:105,defense:35,speed:90},['confusion']),trainerFighter('갸라도스',130,20,{hp:95,attack:125,defense:90,speed:81},['tackle','bite']),trainerFighter(rivalPokemon.name,rivalPokemon.dex,27,rivalPokemon.base,rivalMoves.length?rivalMoves:['tackle'])];
  battleOpponent='greenThird';
 }else if(kind==='red'){
  enemies=[
   trainerFighter('피카츄',25,99,{hp:35,attack:55,defense:45,speed:90},['voltTackle','thunderWave','thunder','doubleTeam'],{fixedMoves:true,evs:{hp:100,attack:100,defense:0,speed:40},redPikachu:true}),
   trainerFighter('잠만보',143,92,{hp:160,attack:110,defense:88,speed:30},['bellyDrum','rest','sleepTalk','bodySlam'],{fixedMoves:true,evs:{hp:100,attack:40,defense:100,speed:0},redSnorlax:true}),
   trainerFighter('라프라스',131,95,{hp:130,attack:85,defense:88,speed:60},['sheerCold','charm','bodySlam','blizzard'],{fixedMoves:true,evs:{hp:100,attack:0,defense:100,speed:40},redLapras:true}),
   trainerFighter('이상해꽃',3,96,{hp:80,attack:100,defense:92,speed:80},['synthesis','sleepPowder','energyBall','solarBeam'],{fixedMoves:true,evs:{hp:100,attack:40,defense:100,speed:0},redVenusaur:true}),
   trainerFighter('리자몽',6,96,{hp:78,attack:109,defense:82,speed:100},['flareBlitz','roost','dragonDance','fireBlast'],{fixedMoves:true,evs:{hp:40,attack:100,defense:0,speed:100},redCharizard:true}),
   trainerFighter('거북왕',9,96,{hp:79,attack:85,defense:103,speed:78},['shellSmash','hydroPump','surf','powerUpPunch'],{fixedMoves:true,evs:{hp:100,attack:100,defense:0,speed:40},redBlastoise:true})
  ];battleOpponent='red';
 }else if(kind.startsWith('league')){
  const n=Number(kind.slice(6));
  enemies=LEAGUE_TEAMS[n].map(([name,dex,lv,hp,attack,defense,speed])=>trainerFighter(name,dex,lv,{hp,attack,defense,speed},['tackle','bite']));
  // Elite Four held items by exact team slot (including duplicate species).
  const eliteItems=[
   [{leftovers:2},{sitrusBerry:1},{},{scopeLens:1},{leftovers:2}],
   [{eviolite:2},{shellBell:3},{shellBell:3},{},{quickClaw:3}],
   [{shellBell:2},{eviolite:2},{eviolite:2},{hardClaw:2},{shellBell:2}],
   [{focusSash:4},{eviolite:2},{eviolite:2},{hardClaw:2},{hardClaw:1}]
  ];
  if(n>=0&&n<4)enemies.forEach((mon,i)=>{
   const held=eliteItems[n][i]||{};
   mon.heldItemCounts={...(mon.heldItemCounts||{}),...held};
   if(held.leftovers){mon.leftoversEnabled=true;mon.leftoversCount=held.leftovers;}
   if(held.sitrusBerry)mon.sitrusBerryEnabled=true;
   if(held.shellBell){mon.shellBell=true;mon.shellBellCount=held.shellBell;}
   if(held.scopeLens)mon.critBuff=(mon.critBuff||0)+0.04*held.scopeLens;
   if(held.eviolite)mon.defenseBuffMultiplier=(mon.defenseBuffMultiplier||1)*(1+0.13*held.eviolite);
   if(held.hardClaw){mon.hardClawCount=held.hardClaw;mon.attackBuffMultiplier=(mon.attackBuffMultiplier||1)+0.10*held.hardClaw;}
   if(held.quickClaw)mon.quickClawCount=held.quickClaw;
   if(held.focusSash){mon.focusSashEnabled=true;mon.focusSashCount=held.focusSash;mon.focusSashChance=0.05*held.focusSash;mon.focusSashUsed=false;}
  });
  if(n>=0&&n<4&&enemies.length){const last=enemies[enemies.length-1];last.sitrusBerryEnabled=true;last.heldItemCounts={...(last.heldItemCounts||{}),sitrusBerry:1};}
  if(n===4){const rival=rivalForm(blueChoice,75);const ace=trainerFighter(rival.name,rival.dex,75,rival.base,availableMoves(blueChoice,75).slice(-4).map(m=>m.id));ace.sitrusBerryEnabled=true;ace.focusSashEnabled=true;ace.focusSashCount=4;ace.focusSashChance=0.20;ace.focusSashUsed=false;ace.heldItemCounts={...(ace.heldItemCounts||{}),sitrusBerry:1,focusSash:4};enemies.push(ace)}
  battleOpponent=kind;
 }else if(kind==='greenFifth'){
  const rivalPokemon=rivalForm(blueChoice,62),rivalMoves=availableMoves(blueChoice,62).slice(-4).map(m=>m.id);
  enemies=[trainerFighter('피죤투',18,60,{hp:83,attack:80,defense:73,speed:101},['quickAttack','swift']),trainerFighter('아라리',102,59,{hp:60,attack:60,defense:63,speed:40},['confusion','tackle']),trainerFighter('스라크',123,61,{hp:70,attack:110,defense:80,speed:105},['slash','airSlash','swordsDance','roost'],{fixedMoves:true}),trainerFighter('윈디',59,56,{hp:90,attack:110,defense:80,speed:95},['flamethrower','bite']),trainerFighter(rivalPokemon.name,rivalPokemon.dex,62,rivalPokemon.base,rivalMoves.length?rivalMoves:['tackle'])];
  battleOpponent='greenFifth';
 }else if(kind==='greenFourth'){
  const rivalPokemon=rivalForm(blueChoice,40),rivalMoves=availableMoves(blueChoice,40).slice(-4).map(m=>m.id);
  enemies=[trainerFighter('피죤투',18,36,{hp:83,attack:80,defense:73,speed:101},['mudSlap','quickAttack','wingAttack','roost'],{fixedMoves:true}),trainerFighter('스라크',123,39,{hp:70,attack:110,defense:80,speed:105},['quickAttack','wingAttack','slash','doubleTeam'],{fixedMoves:true}),trainerFighter('윤겔라',64,35,{hp:40,attack:120,defense:50,speed:105},['confusion','psybeam']),trainerFighter(rivalPokemon.name,rivalPokemon.dex,40,rivalPokemon.base,rivalMoves.length?rivalMoves:['tackle'])];
  // Saffron City rival: the fourth and final Pokemon holds one Sitrus Berry.
  const ace=enemies[enemies.length-1];
  ace.sitrusBerryEnabled=true;
  ace.heldItemCounts={...(ace.heldItemCounts||{}),sitrusBerry:1};
  battleOpponent='greenFourth';
 }else if(kind==='erika'){
  enemies=[trainerFighter('우츠보트',71,30,{hp:80,attack:105,defense:68,speed:70},['vineWhip','razorLeaf']),trainerFighter('덩쿠리',114,26,{hp:65,attack:100,defense:88,speed:60},['vineWhip','tackle']),trainerFighter('라플레시아',45,31,{hp:75,attack:110,defense:88,speed:50},['razorLeaf','poisonPowder'])];
  battleOpponent='erika';
 }else if(kind==='koga'){
  enemies=[trainerFighter('질뻐기',89,36,{hp:105,attack:105,defense:88,speed:50},['tackle','poisonPowder']),trainerFighter('도나리',49,36,{hp:70,attack:90,defense:68,speed:90},['roost','confusion','poisonPowder','psybeam'],{fixedMoves:true}),trainerFighter('또도가스',110,37,{hp:65,attack:90,defense:105,speed:60},['screech','poisonGas','toxic','selfDestruct'],{fixedMoves:true})];
  battleOpponent='koga';
 }else if(kind==='giovanni'){
  enemies=[trainerFighter('닥트리오',51,55,{hp:35,attack:100,defense:60,speed:120},['mudSlap','slash','earthquake','fissure'],{fixedMoves:true}),trainerFighter('캥카',115,54,{hp:105,attack:95,defense:80,speed:90},['bite','tackle']),trainerFighter('페르시온',53,56,{hp:65,attack:70,defense:63,speed:115},['bite','quickAttack']),trainerFighter('니드킹',34,55,{hp:81,attack:102,defense:76,speed:85},['tackle','bite']),trainerFighter('코뿌리',112,57,{hp:105,attack:130,defense:93,speed:40},['tackle','bite'])];
  battleOpponent='giovanni';
 }else if(kind==='blaine'){
  enemies=[trainerFighter('나인테일',38,50,{hp:73,attack:81,defense:88,speed:100},['flamethrower','quickAttack']),trainerFighter('마그마',126,48,{hp:65,attack:100,defense:71,speed:93},['smokescreen','firePunch','flamethrower','fireBlast'],{fixedMoves:true}),trainerFighter('날쌩마',78,50,{hp:65,attack:100,defense:75,speed:105},['flamethrower','quickAttack']),trainerFighter('윈디',59,51,{hp:90,attack:110,defense:80,speed:95},['flamethrower','bite'])];
  battleOpponent='blaine';
 }else if(kind==='sabrina'){
  enemies=[trainerFighter('캐이시',63,44,{hp:25,attack:105,defense:35,speed:90},['lightScreen','psybeam','psychic','hpRecover'],{fixedMoves:true}),trainerFighter('윤겔라',64,44,{hp:40,attack:120,defense:50,speed:105},['thunderWave','psybeam','psychic','hpRecover'],{fixedMoves:true}),trainerFighter('후딘',65,44,{hp:55,attack:135,defense:80,speed:120},['psybeam','recover'])];
  battleOpponent='sabrina';
 }else{
  const wildStats=calculateStats(BASE_STATS[wild.dex],level,zeroIV,{});
  const openingPenalty=leader.level<=3?0.7:leader.level<=7?0.85:1;
  if(openingPenalty<1)for(const stat of ['attack','defense','speed'])wildStats[stat]=Math.max(1,Math.floor(wildStats[stat]*openingPenalty));
  const enemy=createFighter({id:'wild-'+wild.dex,name:wild.name,level,friendship:50,stats:wildStats,moveIds:recentWildMoves(wild.dex,level)});enemy.dex=wild.dex;enemy.rare=wild.rare;enemy.catchMultiplier=pokemonCatchMultiplier(wild.dex,wild.rare,wild.tier);enemies=[enemy];
 }
 // NPCs follow player per-Pokemon equipment limits, including later reductions.
 if(kind!=='wild')for(const enemy of enemies){
  if(!enemy.heldItemCounts)continue;
  for(const [id,rawCount] of Object.entries(enemy.heldItemCounts)){
   if(!HELD_ITEMS.includes(id))continue;
   enemy.heldItemCounts[id]=Math.min(HELD_MAX[id]??99,heldItemPerPokemonLimit(id),Math.max(0,Number(rawCount)||0));
  }
  enemy.quickClawCount=enemy.heldItemCounts.quickClaw||0;
  enemy.shellBellCount=enemy.heldItemCounts.shellBell||0;
  enemy.shellBell=enemy.shellBellCount>0;
  enemy.leftoversCount=enemy.heldItemCounts.leftovers||0;
  enemy.leftoversEnabled=enemy.leftoversCount>0;
 }
 player.hp=leaderHp();
 battleRoster.set(leader.key,player);
 battle=createBattle(player,enemies,{items:0,balls:0,wild:kind==='wild'}); // Held Focus Sash effects live on each Pokémon's fighter.
 rewardClaimed=false;
 menuPage='main';
 // Record only the first Pokemon actually sent out, regardless of trainer type.
 // Later opposing Pokemon are registered as soon as they enter the battle.
 if(recordDiscovery)registerEncounter(enemies[0]?.dex);
 visualSprite('enemy').classList.remove('enemy-captured','capture-absorbing','capture-escaping');
 $('captureBall').className='capture-ball';$('captureBall').hidden=true;$('captureBall').removeAttribute('style');
 $('captureFlash').className='capture-flash';$('captureFlash').hidden=true;$('captureSuccessNotice').hidden=true;
 const first=enemies[0];
 const opponentName=kind==='red'?'레드':kind.startsWith('league')?LEAGUE_NAMES[Number(kind.slice(6))]:TRAINERS[kind]?.name||'트레이너';
 battle.log.push(kind==='wild'?'⚔️ 야생 '+wild.name+'이(가) 나타났다!':opponentName+'의 도전!');
 showBattleActionMessage(battle.log.at(-1));
 shownHp={player:player.hp,enemy:first.hp};
 $('playerName').textContent=player.name;
 $('enemyName').textContent=first.name;$('enemyCaughtMark').hidden=kind!=='wild'||!caughtSpecies.has(wild.dex);$('enemyLevel').textContent='LV '+first.level;$('playerLevel').textContent='LV '+player.level;refreshLevelCapIndicator();
 $('playerSprite').style.filter='';sprite('playerSprite',leader.dex,true,leader.starter?s.emoji:'⚔️');sprite('enemySprite',kind==='wild'?wild.dex:Number(first.id?.replace('trainer-',''))||100,false,kind==='wild'?'🐾':'⚔️');
 $('trainerName').textContent=kind==='wild'?'야생 포켓몬':opponentName;
 $('trainerPortrait').hidden=kind==='wild';
 if(kind!=='wild'){
  const image=kind==='red'?'./assets/red-animated.webp?v=20261106-animated-red':kind.startsWith('league')?'https://play.pokemonshowdown.com/sprites/trainers/'+(['lorelei','bruno','agatha','lance','blue'][Number(kind.slice(6))])+'.png':TRAINERS[kind]?.image;
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
 $('battleSubmenuHeading').hidden=page==='fight';
 $('submenuTitle').textContent=page==='ball'?'몬스터볼 선택':'회복 아이템 선택';
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

function canLearnNow(id){return availableMoves(chosen,progress.level).some(m=>m.id===id)&&!!MOVES[id];}
function moveInfo(id){const m=MOVES[id];return m?m.name+'\n'+moveDescription(id):'기술 정보 없음';}
function updateBattleMoves(){
 saveProgress();renderHome();
 // The current battle has already ended when learning happens.
}
function resolveMoveChoice(newId,{allowSkip=true,source='level',member=null,confirmRecall=false}={}){
 return new Promise(resolve=>{
  const layer=$('learnMoveOverlay'),choices=$('learnMoveChoices');
  choices.replaceChildren();$('learnMoveTitle').textContent=(member?.name||getForm(chosen,progress.level).name)+'은(는) '+MOVES[newId].name+'를 배우고 싶어!';
  $('learnMoveInfo').textContent=moveInfo(newId);
  $('learnMoveHelp').textContent=confirmRecall?'잊을 기존 기술을 선택해줘. 기억버섯 1개가 필요해.':'기술이 4개야. 잊을 기술을 하나 선택해줘.';
  function finish(oldId){layer.hidden=true;resolve(oldId);}
  for(const oldId of (member?.moves||playerMoves)){
   const btn=document.createElement('button');btn.type='button';btn.className='learn-replace-button';
   btn.textContent='잊기: '+moveInfo(oldId);
   btn.onclick=()=>{
    if(!confirmRecall){finish(oldId);return;}
    if((inventory.memoryMushroom||0)<1){alert('기억버섯이 없습니다');return;}
    partyOverlay('기술 교체 확인','기억버섯 보유: '+(inventory.memoryMushroom||0)+'개\n기억버섯이 1개 소모됩니다. 정말로 교체하시겠습니까?',[
     {text:'예',action:()=>finish(oldId)},
     {text:'아니요',action:()=>{}}
    ]);
    // The replacement picker is z-index 100010; keep confirmation above it.
    // Choosing "아니요" closes only the confirmation, leaving the picker available.
    const confirmLayer=document.getElementById('partyActionOverlay');
    if(confirmLayer)confirmLayer.style.zIndex='100011';
   };choices.append(btn);
  }
  const skip=$('learnMoveSkip');skip.hidden=!allowSkip;
  skip.textContent=confirmRecall?'교체 취소':'새 기술을 배우지 않는다';
  skip.onclick=()=>finish(null);
  // TM reward dialogs must appear above the battle/reward overlays.
  layer.style.zIndex='100010';
  layer.style.position='fixed';
  layer.style.inset='0';
  layer.hidden=false;
  layer.removeAttribute('hidden');
  document.body.append(layer);
 });
}
function showLearnedMoveNotice(name,id){
 return new Promise(resolve=>{
  partyOverlay('새로운 기술 습득!',name+'은(는) '+MOVES[id].name+' 기술을 배웠다!',[{text:'확인',action:resolve}]);
 });
}
async function learnOneMove(id){
 if(!canLearnNow(id)||playerMoves.includes(id))return;
 if(playerMoves.length<4){playerMoves.push(id);updateBattleMoves();await showLearnedMoveNotice(getForm(chosen,progress.level).name,id);return;}
 const oldId=await resolveMoveChoice(id);
 if(oldId===null)return; // A skipped move remains available in the recall menu.
 const index=playerMoves.indexOf(oldId);
 if(index<0)return;
 playerMoves.splice(index,1,id);updateBattleMoves();await showLearnedMoveNotice(getForm(chosen,progress.level).name,id);
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
let recallSelectedKey=null;
function recallMemberMoves(member){return member.starter?playerMoves:(companions.find(c=>c.family===member.family)?.moves||[]);}
function recallLearnable(member){let natural=member.starter?availableMoves(chosen,progress.level):((learnsetForDex(member.dex)||[]).filter(x=>x.level<=member.level&&MOVES[x.id]));if(tm01Learned.includes(member.key))natural=[...natural.filter(x=>x.id!=='megaPunch'),{level:null,id:'megaPunch',tmLabel:'기술머신01.메가톤펀치'}];if(tm02Learned.includes(member.key))natural=[...natural.filter(x=>x.id!=='megaKick'),{level:null,id:'megaKick',tmLabel:'기술머신02.메가톤킥'}];for(const [kind,cfg] of Object.entries(EXTRA_TM_CONFIG)){if(extraTmLearned[kind].includes(member.key))natural=[...natural.filter(x=>x.id!==cfg.moveId),{level:null,id:cfg.moveId,tmLabel:extraTmLabel(kind)}];}return natural;}
async function recallTeach(member,id){
 const moves=recallMemberMoves(member);
 if(!recallLearnable(member).some(x=>x.id===id)||moves.includes(id))return;
 if((inventory.memoryMushroom||0)<1){alert('기억버섯이 없습니다');return;}
 if(moves.length<4){
  // A new slot also counts as a technique-management equip action.
  const approved=await new Promise(resolve=>partyOverlay(
   '기술 장착 확인','기억버섯 보유: '+(inventory.memoryMushroom||0)+'개\n기억버섯이 1개 소모됩니다. 정말로 장착하시겠습니까?',[
    {text:'예',action:()=>resolve(true)},{text:'아니요',action:()=>resolve(false)}
   ]
  ));
  if(!approved)return;
  if((inventory.memoryMushroom||0)<1){alert('기억버섯이 없습니다');return;}
  moves.push(id);
 }else{
  const old=await resolveMoveChoice(id,{member:{name:member.name,moves},confirmRecall:true});
  if(old===null)return;
  const at=moves.indexOf(old);if(at<0||moves.includes(id))return;
  if((inventory.memoryMushroom||0)<1){alert('기억버섯이 없습니다');return;}
  moves.splice(at,1,id);
 }
 inventory.memoryMushroom--;if(id==='hypnosis')earnAchievement('hypnosis');
 saveProgress();renderHome();
}
function openRecall(){
 if(screen!=='home'||animating||learningBusy)return;
 const members=teamMembers();
 if(!members.some(m=>m.key===recallSelectedKey))recallSelectedKey=members[0]?.key;
 const member=members.find(m=>m.key===recallSelectedKey);if(!member)return;
 const picker=$('recallPokemonPicker');picker.replaceChildren();
 for(const m of members){
  const btn=document.createElement('button');btn.type='button';btn.className='learn-replace-button';
  btn.textContent=m.name+' · Lv.'+m.level+(m.key===recallSelectedKey?' ✓':'');
  btn.setAttribute('aria-pressed',String(m.key===recallSelectedKey));
  btn.onclick=()=>{recallSelectedKey=m.key;openRecall();};picker.append(btn);
 }
 $('recallSelectedName').textContent=member.name+' · Lv.'+member.level;

 const list=$('recallMoveList');list.replaceChildren();
 const detailText=moveDescription;
 const appendMove=(id,level,isOwned)=>{
  const move=MOVES[id];if(!move)return;
  const wrap=document.createElement('div');wrap.className='recall-move-entry';
  const header=document.createElement('button');header.type='button';header.className='learn-replace-button recall-move-toggle';
  const label=(level===null?'': 'Lv.'+level+' · ')+(id==='megaPunch'&&tm01Learned.includes(member.key)?'기술머신01.메가톤펀치':id==='megaKick'&&tm02Learned.includes(member.key)?'기술머신02.메가톤킥':Object.entries(EXTRA_TM_CONFIG).find(([kind,cfg])=>cfg.moveId===id&&extraTmLearned[kind].includes(member.key))?.[0] ? extraTmLabel(Object.entries(EXTRA_TM_CONFIG).find(([kind,cfg])=>cfg.moveId===id&&extraTmLearned[kind].includes(member.key))[0]):move.name);
  const drawHeader=expanded=>{header.replaceChildren();const name=document.createElement('span');name.textContent=label;header.append(name);if(isOwned){const star=document.createElement('span');star.className='recall-equipped-star';star.textContent='★';star.setAttribute('aria-label','장착 중');header.append(star);}const arrow=document.createElement('span');arrow.className='recall-move-chevron';arrow.textContent=expanded?'▴':'▾';header.append(arrow);};
  drawHeader(false);
  header.setAttribute('aria-expanded','false');
  const detail=document.createElement('div');detail.className='recall-move-detail';detail.hidden=true;
  const info=document.createElement('div');info.className='recall-move-description';info.textContent=detailText(id);detail.append(info);
  if(!isOwned){
   const equip=document.createElement('button');equip.type='button';equip.className='learn-replace-button recall-move-equip';equip.textContent='이 기술 장착 / 교체';
   equip.onclick=async()=>{if(learningBusy)return;$('moveRecallOverlay').hidden=true;learningBusy=true;try{await recallTeach(member,id);}finally{learningBusy=false;}openRecall();};
   detail.append(equip);
  }else{
   const owned=document.createElement('small');owned.textContent='현재 장착된 기술';detail.append(owned);
  }
  header.onclick=()=>{detail.hidden=!detail.hidden;header.setAttribute('aria-expanded',String(!detail.hidden));drawHeader(!detail.hidden);};
  wrap.append(header,detail);return wrap;
 };
 for(const entry of recallLearnable(member)){
  const row=appendMove(entry.id,entry.level,recallMemberMoves(member).includes(entry.id));
  if(row)list.append(row);
 }
 $('moveRecallOverlay').hidden=false;
}
function openRecallList(){openRecall();}

function rewardChoiceText(choice){
 if(choice.kind==='tm01')return '기술머신01.메가톤펀치 · 위력 80 / 명중 80% · 즉시 사용';
 if(choice.kind==='tm02')return '기술머신02.메가톤킥 · 위력 110 / 명중 75% · 즉시 사용';
 if(EXTRA_TM_CONFIG[choice.kind]){const c=EXTRA_TM_CONFIG[choice.kind],m=MOVES[c.moveId];return extraTmLabel(choice.kind)+' · '+moveDescription(c.moveId).replace(/\n/g,' · ')+' · 즉시 사용';}
 if(choice.kind==='item'&&choice.id==='memoryMushroom')return '기술관리에 필요하다.';
 if(choice.kind==='evolution')return rewardChoiceName(choice)+' · 가능한 포켓몬을 골라 즉시 진화 (사용 즉시 소모)';
  if(choice.kind==='expCandy')return choice.multiplier===20?'경험치를 많이 올려준다.':choice.multiplier===12?'경험치를 적당히 올려준다.':'경험치를 소량 올려준다.';
 if(choice.kind==='candyBundle')return '내 파티의 포켓몬이 모두 레벨업을 하는 이상한 사탕 보따리';
 if(choice.kind==='rareCandy')return '포켓몬의 레벨이 오르는 이상한 사탕.';
  if(choice.kind==='goldCap')return '🥇 금색 병뚜껑 · 선택한 포켓몬의 모든 개체값 최대 강화';
 if(choice.kind==='reviveShardReward')return '💎 기력의조각 · 기절 포켓몬 1마리 HP 50%로 부활';
 if(choice.kind==='maxReviveReward')return '🌟 기력의덩어리 · 기절한 포켓몬 1마리 선택 · HP 100% 부활 (즉시 사용)';
 if(choice.kind==='sacredAshReward')return '✨ 성스러운 분말 · 모든 포켓몬 HP 100% 부활 및 회복 (즉시 사용)';
 if(choice.kind==='item'&&choice.id==='partySlotA')return '👥 포켓몬 추가 슬롯A · 동료 슬롯 2번째 해금';
 if(choice.kind==='item'&&choice.id==='partySlotB')return '👥 포켓몬 추가 슬롯B · 슬롯A 보유 시 동료 3번째 슬롯 활성화. 슬롯B만 계승하면 슬롯A 획득 전까지 비활성화됩니다.';
 if(choice.kind==='item'&&choice.id==='map')return '🗺️ 지도 · 이미 해금된 지역으로 이동 (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='secretSwitch')return '🔘 비밀 스위치 · 로켓단 비밀기지 이동 해금 (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='oldSeaMap')return '🗺️ 오래된해도 · 환상의 섬 이동 해금 (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='revivalSeed')return '🌱 부활의 씨앗 · 포켓몬에게 장착하면 배틀 중 HP 0이 될 때 즉시 풀피로 부활 · 발동 시 소모';
 if(choice.kind==='item'&&choice.id==='focusSash')return '🎗️ 기합의띠 · 1개당 생존 확률 +5% · 포켓몬당 최대 6개 · 최대 6개 보유 · 발동 시 HP 1 생존 (배틀당 1회)';
 if(choice.kind==='item'&&choice.id==='hardClaw')return '단단한 발톱 · 1개당 공격력 +10%, 포켓몬당 최대 3개 · 최대 5개 보유';
 if(choice.kind==='item'&&choice.id==='quickClaw')return '🐾 선제공격손톱 · 1개당 5% 확률로 선제공격 · 포켓몬당 최대 4개 · 최대 4개 보유';
 if(choice.kind==='item'&&choice.id==='lightBall')return '⚡ 전기구슬 · 보유 시 피츄·피카츄·라이츄 공격력 1.5배 (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='charcoal')return '🔥 목탄 · 보유 시 불꽃 타입 포켓몬의 공격력이 15% 증가한다. (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='miracleSeed')return '🌱 기적의 씨 · 보유 시 풀 타입 포켓몬의 방어력이 10% 증가하고 명중률이 5% 증가한다. (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='mysticWater')return '💧 신비의 물방울 · 보유 시 물 타입 포켓몬의 방어력이 10% 증가한다. (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='silverPowder')return '✨ 은빛가루 · 보유시 벌레 포켓몬의 방어력이 15%, 공격력이 10% 증가한다. (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='sharpBeak')return '🪶 예리한 부리 · 보유 시 비행 타입 포켓몬의 공격력이 10% 증가한다. (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='magnet')return '🧲 자석 · 보유 시 전기 타입 포켓몬의 공격력이 10%, 스피드가 5% 증가한다. (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='thickClub')return '🦴 굵은뼈 · 보유 시 탕구리·텅구리 공격력 2배 (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='beedrillite')return '💎 독침붕나이트 · 보유 시 독침붕의 공격력과 스피드 각각 40% 증가 (중요 아이템)';
 if(choice.kind==='item'&&choice.id==='eviolite')return '🪨 진화의휘석 · 진화할 수 있는 포켓몬만 사용 가능 · 1개당 방어력 +10% · 포켓몬당 최대 3개';
 if(choice.kind==='item'&&choice.id==='oranBerry')return '🍊 오랭열매 · 전투 중 HP가 25% 미만이 되면 최대 HP의 15%를 회복하고 1개 소모';
 if(choice.kind==='item'&&choice.id==='shellBell')return '🔔 조개껍질방울 · 공격으로 피해를 주면 HP를 일부 회복';
 if(choice.kind==='item'&&choice.id==='leftovers')return '🍎 먹다남은음식 · 매 턴 HP를 일부 회복';
 if(choice.kind==='item'&&choice.id==='sitrusBerry')return '🍊 자뭉열매 · 전투 중 HP가 50% 이하가 되면 최대 HP의 30%를 회복하고 1개 소모';
 if(choice.kind==='item'&&choice.id==='wideLens')return '🔍 광각렌즈 · 1개당 기술 명중률 +5% (일격필살기는 +2.5%) · 포켓몬당 최대 2개 장착 · 최대 3개 보유';
 if(choice.kind==='item'&&choice.id==='scopeLens')return '🎯 초점렌즈 · 1개당 급소 확률 +4%, 포켓몬당 최대 3개 · 최대 5개 보유';
 if(choice.kind==='silverCap')return '🥈 은색 병뚜껑 · 원하는 스탯의 개체값을 최대로 강화';
 if(choice.kind==='ev')return ({hp:'HP',attack:'공격',defense:'방어',speed:'스피드'}[choice.stat]||'능력치')+' 기초포인트가 '+(choice.amount||10)+' 오른다.';
 if(choice.kind==='exp')return '🍬 경험치 +'+choice.amount+' 즉시 획득';
 if(choice.kind==='power')return (choice.icon||'✨')+' '+(BOOST_INFO[choice.effect||'attack']?.name||'플러스파워')+' · 10턴 '+({attack:'공격력 +20%',accuracy:'명중률 +10%',critical:'급소 확률 +15%',defense:'방어력 +20%'}[choice.effect||'attack']);
 if(choice.kind==='cash')return '💰 추가 상금 +'+choice.amount.toLocaleString('ko-KR')+'원';
 if(choice.kind==='heal')return choice.full?'❤️ 즉시 HP 100% 회복':(choice.icon||'🧪')+' 즉시 HP '+choice.amount+' 회복';
 const item=SHOP_ITEMS.find(x=>x.id===choice.id);
 return (item?.icon||'🎁')+' '+(item?.name||'아이템')+(choice.quantity>1?' ×'+choice.quantity:'')+(item?.description?' · '+item.description:'');
}
// Pokemon item sprites for the selectable reward cards.
function rewardImageName(choice){
  if(choice.kind==='expCandy')return choice.multiplier===20?'exp-candy-l':choice.multiplier===12?'exp-candy-m':'exp-candy-s';
 if(choice.kind==='evolution')return choice.id==='linkCord'?'linking-cord':({thunderStone:'thunder-stone',waterStone:'water-stone',fireStone:'fire-stone',dawnStone:'dawn-stone',duskStone:'dusk-stone',moonStone:'moon-stone',leafStone:'leaf-stone'})[choice.id]||null;
 if(choice.kind==='candyBundle')return 'rare-candy';
 if(choice.kind==='rareCandy')return 'rare-candy';
  if(choice.kind==='goldCap')return 'gold-bottle-cap';
 if(choice.kind==='reviveShardReward')return 'revive';
 if(choice.kind==='maxReviveReward')return 'max-revive';
 if(choice.kind==='sacredAshReward')return 'sacred-ash';
 if(choice.kind==='power')return {attack:'x-attack',accuracy:'x-accuracy',critical:'dire-hit',defense:'x-defend'}[choice.effect||'attack'];
 if(choice.kind==='item')return {partySlotA:'upgrade',partySlotB:'upgrade',map:'town-map',memoryMushroom:'tiny-mushroom',hardClaw:'razor-claw',quickClaw:'quick-claw',focusSash:'focus-sash',revivalSeed:'revive',lightBall:'light-ball',secretSwitch:'secret-key',oldSeaMap:'old-sea-map',beedrillite:'beedrillite',pokeBall:'poke-ball',greatBall:'great-ball',ultraBall:'ultra-ball',masterBall:'master-ball'}[choice.id];
 if(choice.kind==='heal')return choice.full?'max-potion':choice.amount<=20?'potion':choice.amount<=60?'super-potion':'hyper-potion';
 return null;
}
function rewardChoiceName(choice){
 if(choice.kind==='tm01')return '기술머신01.메가톤펀치';
 if(choice.kind==='tm02')return '기술머신02.메가톤킥';
 if(EXTRA_TM_CONFIG[choice.kind])return extraTmLabel(choice.kind);
  if(choice.kind==='expCandy')return choice.multiplier===20?'경험사탕L':choice.multiplier===12?'경험사탕M':'경험사탕S';
 if(choice.kind==='candyBundle')return '사탕 보따리';
 if(choice.kind==='rareCandy')return '이상한 사탕';
 if(choice.kind==='evolution')return choice.id==='linkCord'?'연결의 끈':EVOLUTION_REWARD_ITEMS.find(item=>item.id===choice.id)?.name||'진화 아이템';
  if(choice.kind==='goldCap')return '금색 병뚜껑';
 if(choice.kind==='reviveShardReward')return '기력의조각';
 if(choice.kind==='maxReviveReward')return '기력의덩어리';
 if(choice.kind==='sacredAshReward')return '성스러운 분말';
 if(choice.kind==='silverCap')return '은색 병뚜껑';
 if(choice.kind==='ev')return (({hp:'맥스업',attack:'타우린',defense:'사포닌',speed:'알칼로이드'})[choice.stat]||'영양제')+(choice.amount===24?' ×3':choice.amount===40?' ×4':'');
 if(choice.kind==='exp')return '경험치 사탕';
 if(choice.kind==='power')return BOOST_INFO[choice.effect||'attack']?.name||'플러스파워';
 if(choice.kind==='cash')return '추가 상금';
 if(choice.kind==='heal')return ({potion:'상처약',superPotion:'좋은상처약',hyperPotion:'고급상처약',fullRestore:'풀회복약'})[choice.healType]||(choice.full?'완전회복':'회복약');
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
  const unique=choice.kind==='item'&&SHOP_ITEMS.find(item=>item.id===choice.id)?.category==='key'&&choice.id!=='clefairyDoll';
  const held=choice.kind==='item'&&HELD_ITEMS.includes(choice.id);
  const unavailable=choice.kind==='evolution'&&!eligibleEvolutionTargets(choice).length||held&&inventory[choice.id]>=HELD_MAX[choice.id]||(choice.kind==='item'&&choice.id==='masterBall'&&inventory.masterBall>=2)||(choice.kind==='item'&&choice.id==='quickBall'&&inventory.quickBall>=1)||(choice.kind==='item'&&choice.id==='clefairyDoll'&&inventory.clefairyDoll>=4)||unique&&(choice.id==='expShare'?inventory.expShare>=4:inventory[choice.id]===1||(choice.id==='partySlotB'&&inventory.partySlotA!==1))||['reviveShardReward','maxReviveReward','sacredAshReward'].includes(choice.kind)&&!(teamMembers().length>=2&&teamMembers().some(m=>memberHp(m)===0))||choice.kind==='candyBundle'&&teamMembers().length<2;
  const tag=document.createElement('strong');tag.className='reward-tier-label';tag.textContent=REWARD_TIERS[choice.tier]?.label||'일반';
  const pick=document.createElement('button');pick.type='button';pick.className='reward-pick';
  pick.disabled=unavailable;
  pick.setAttribute('aria-label',rewardChoiceName(choice)+' 보상 선택');
  const imageName=rewardImageName(choice)||(choice.kind==='item'?choice.id:null);
  if(imageName){
   const img=document.createElement('img');img.className='reward-item-sprite';
   img.src=choice.kind==='item'?itemSpriteUrl(choice.id):'https://play.pokemonshowdown.com/sprites/itemicons/'+imageName+'.png';
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
  if(choice.kind==='cash'){const amount=document.createElement('span');amount.className='reward-info-button';amount.textContent='+'+choice.amount.toLocaleString('ko-KR')+'원';card.append(tag,pick,amount);}else card.append(tag,pick,info);options.append(card);
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
 progress.money-=cost;recordMoneyChange('랜덤보상 리롤 '+(pendingRewardChoice.rerolls+1)+'회차');
 achievementData.rerolls=(achievementData.rerolls||0)+1;
 saveAchievements();
 if(achievementData.rerolls>=50)earnAchievement('reroll50');
 if(cost>=10000)earnAchievement('reroll10000');
 pendingRewardChoice.choices=drawThreeRewards(Math.max(...teamMembers().map(m=>m.level)),pendingRewardChoice.choices.length,!!pendingRewardChoice.gym);
 pendingRewardChoice.rerolls++;
 saveProgress();
 showRewardChoices();
}
function showSilverCapStatChoice(member=leaderMember()){
 const currentIVs=member.starter?playerIVs:companions.find(x=>x.family===member.family)?.ivs;
 if(!currentIVs||EV_STATS.every(stat=>currentIVs[stat]>=16)){
  alert('선택한 포켓몬의 모든 개체값이 이미 최대입니다. 병뚜껑을 사용할 수 없습니다.');
  $('rewardChoiceOverlay').hidden=false;
  return;
 }
 const layer=$('silverCapOverlay'),options=$('silverCapOptions');
 options.replaceChildren();
 for(const stat of EV_STATS){
  const b=document.createElement('button');
  b.type='button';b.className='silver-cap-option';
  b.append(document.createTextNode(STAT_LABELS[stat]+' · 현재 값 : '));const ivs=member.starter?playerIVs:companions.find(x=>x.family===member.family)?.ivs;const star=document.createElement('span');star.className='iv-star iv-'+ivTier(ivs?.[stat]??0);star.textContent='★';b.append(star);
  const targetIVs=member.starter?playerIVs:companions.find(x=>x.family===member.family)?.ivs;
  b.disabled=!targetIVs||targetIVs[stat]===16;
  b.onclick=()=>{
   if(!targetIVs)return;
   targetIVs[stat]=16;checkIVAchievement(targetIVs);
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
function preserveLevelUpHp(m,beforeMax,beforeHp){const now=teamMembers().find(x=>x.key===m.key)||m;const afterMax=memberMaxHp(now);const hp=beforeHp<=0?0:Math.min(afterMax,beforeHp+Math.max(0,afterMax-beforeMax));if(now.starter)storedHp=hp;else{const found=companions.find(x=>x.family===now.family);if(found)found.hp=hp;}}
function choosePermanentTarget(choice,autoMember=null){
 $('rewardChoiceOverlay').hidden=true;
 const applyToMember=m=>{const beforeMax=memberMaxHp(m),beforeHp=memberHp(m);
  if(choice.kind==='silverCap'){showSilverCapStatChoice(m);return;}
  if(choice.kind==='goldCap'){
   const iv=m.starter?playerIVs:companions.find(x=>x.family===m.family)?.ivs;
   if(!iv){$('rewardChoiceOverlay').hidden=false;return;}
   if(EV_STATS.every(stat=>iv[stat]>=16)){
    alert('선택한 포켓몬의 모든 개체값이 이미 최대입니다. 병뚜껑을 사용할 수 없습니다.');
    $('rewardChoiceOverlay').hidden=false;
    return;
   }
   for(const stat of EV_STATS)iv[stat]=16;checkIVAchievement(iv);
   appendAdventureLog('🥇 '+m.name+' 모든 개체값 최대 강화');
  }
  if(choice.kind==='rareCandy'){
   const member=m.starter?progress:companions.find(x=>x.family===m.family);
   if(member&&member.level<100){const before=member.level;member.level++;member.exp=0;pendingPartyGrowth.push({key:m.key,name:m.name,before,after:member.level,starter:m.starter,family:m.family});appendAdventureLog('🍬 '+m.name+' 레벨 +1');recordCandyConsumed();}
  }
  if(choice.kind==='expCandy'){
   const member=m.starter?progress:companions.find(x=>x.family===m.family);
   if(!member||member.level>=100){alert('Lv.100 포켓몬은 경험치를 받을 수 없어.');$('rewardChoiceOverlay').hidden=false;return;}
   const before=member.level,earned=before*choice.multiplier;
   member.exp=(member.exp||0)+earned;
   while(member.level<100&&member.exp>=levelNeed(member.level)){member.exp-=levelNeed(member.level);member.level++;}
   if(member.level===100)member.exp=0;
   if(member.level>before)pendingPartyGrowth.push({key:m.key,name:m.name,before,after:member.level,starter:m.starter,family:m.family});
   appendAdventureLog('🍬 '+m.name+' '+rewardChoiceName(choice)+' +'+earned+' EXP');recordCandyConsumed();
  }
  if(choice.kind==='ev'){
   const stat=choice.stat,ev=m.starter?playerEVs:companions.find(x=>x.family===m.family)?.evs;
   if(!ev)return;
   const total=Object.values(ev).reduce((a,b)=>a+b,0);
   const gain=Math.min(choice.amount||2,100-ev[stat],240-total);
   if(gain<=0){alert(total>=240?'선택한 포켓몬의 기초포인트 총합이 최대입니다.':`선택한 포켓몬의 ${STAT_LABELS[stat]} 기초포인트가 최대입니다.`);$('rewardChoiceOverlay').hidden=false;return;}
   ev[stat]+=gain;checkEVAchievement(ev);
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
  if(['rareCandy','expCandy','exp'].includes(choice.kind))preserveLevelUpHp(m,beforeMax,beforeHp);checkLevelAchievement();
  pendingRewardChoice=null;saveProgress();renderHome();
  if(pendingPartyGrowth.length){const tasks=pendingPartyGrowth.splice(0);processPartyGrowth(tasks);}
 };
 if(autoMember){applyToMember(autoMember);return;}
 partyOverlay('🎁 보상 적용 대상','보상을 받을 포켓몬 한 마리를 선택해.',[
  ...teamMembers().map(m=>({text:m.name+' Lv.'+m.level,member:['rareCandy','expCandy','exp'].includes(choice.kind)?m:null,showExp:['rareCandy','expCandy','exp'].includes(choice.kind),disabled:['rareCandy','expCandy','exp'].includes(choice.kind)&&m.level>=100,reason:m.level>=100?'최대 레벨':'',action:()=>applyToMember(m)})),
  {text:'취소',action:()=>{$('rewardChoiceOverlay').hidden=false;}}
 ]);
}
function tmSelectionOptions(targets,actionFor,kind){
 const eligible=new Set(targets.map(m=>m.key));
 const cfg=EXTRA_TM_CONFIG[kind];
 const compatible=cfg?extraTmDex[kind]:(kind==='tm01'?TM01_DEX:TM02_DEX);
 const minLevel=cfg?cfg.minLevel:(kind==='tm01'?22:28);
 const maxLevel=cfg?(cfg.maxLevelExclusive??101)-1:60;
 return teamMembers().map(m=>{
  const canLearn=eligible.has(m.key);
  const speciesCompatible=compatible.has(m.dex);
  const levelValid=m.level>=minLevel&&m.level<=maxLevel;
  // Some species are intentionally excluded from a TM because they learn
  // that same move naturally. Until its natural learn level, show the actual
  // reason ("레벨부족") instead of misleading "불가능".
  const moveId=cfg?.moveId;
  const naturalLearnLevel=moveId?(m.starter
   ?(m.dex===197?([...(learnsetForDex(m.dex)||[])].find(entry=>entry.id===moveId)?.level):availableMoves(chosen,100).find(entry=>entry.id===moveId)?.level)
   :(learnsetForDex(m.dex)||[]).find(entry=>entry.id===moveId)?.level):undefined;
  const awaitingNaturalMove=Number.isInteger(naturalLearnLevel)&&m.level<naturalLearnLevel;
  return {
   member:m,
   tmStatus:canLearn?'가능':(speciesCompatible&&!levelValid||awaitingNaturalMove)?'레벨부족':'불가능',
   disabled:!canLearn,
   action:actionFor(m)
  };
 });
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
 if(EXTRA_TM_CONFIG[choice.kind]){
  const kind=choice.kind,cfg=EXTRA_TM_CONFIG[kind],targets=extraTmTargets(kind);
  if(!targets.length){alert(extraTmLabel(kind)+'을 가르칠 수 있는 미습득 포켓몬이 없어.');showRewardChoices();return;}
  $('rewardChoiceOverlay').hidden=true;
  partyOverlay('📀 '+extraTmLabel(kind),'기술을 가르칠 포켓몬을 선택해. 사용 즉시 소모돼.',[
   ...tmSelectionOptions(targets,m=>async()=>{
    if(!pendingRewardChoice||!extraTmTargets(kind).some(x=>x.key===m.key)){showRewardChoices();return;}
    const moves=recallMemberMoves(m);
    if(!moves.includes(cfg.moveId)){
     if(moves.length<4)moves.push(cfg.moveId);
     else{
      const old=await resolveMoveChoice(cfg.moveId,{member:{name:m.name,moves},allowSkip:true});
      if(old===null){showRewardChoices();return;}
      const at=moves.indexOf(old);if(at<0){showRewardChoices();return;}
      moves.splice(at,1,cfg.moveId);
     }
    }
    if(!extraTmLearned[kind].includes(m.key))extraTmLearned[kind].push(m.key);
    if(m.starter)updateBattleMoves();
    completeInstantRecoveryReward(choice,m.name+' 습득');
   },choice.kind),
   {text:'취소',action:showRewardChoices}
  ]);
  return;
 }
 if(choice.kind==='tm02'){
  const targets=tm02Targets();
  if(!targets.length){alert('기술머신02를 가르칠 수 있는 미습득 포켓몬이 없어.');showRewardChoices();return;}
  $('rewardChoiceOverlay').hidden=true;
  partyOverlay('📀 기술머신02.메가톤킥','기술을 가르칠 포켓몬을 선택해. 사용 즉시 소모돼.',[
   ...tmSelectionOptions(targets,m=>async()=>{
    if(!pendingRewardChoice||!tm02Targets().some(x=>x.key===m.key)){showRewardChoices();return;}
    const moves=recallMemberMoves(m);
    if(!moves.includes('megaKick')){
     if(moves.length<4)moves.push('megaKick');
     else{
      const old=await resolveMoveChoice('megaKick',{member:{name:m.name,moves},allowSkip:true});
      if(old===null){showRewardChoices();return;}
      const at=moves.indexOf(old);if(at<0){showRewardChoices();return;}
      moves.splice(at,1,'megaKick');
     }
    }
    if(!tm02Learned.includes(m.key))tm02Learned.push(m.key);
    if(m.starter)updateBattleMoves();
    completeInstantRecoveryReward(choice,m.name+' 습득');
   },'tm02'),
   {text:'취소',action:showRewardChoices}
  ]);
  return;
 }
 if(choice.kind==='tm01'){
  const targets=tm01Targets();
  if(!targets.length){alert('기술머신01을 가르칠 수 있는 미습득 포켓몬이 없어.');showRewardChoices();return;}
  $('rewardChoiceOverlay').hidden=true;
  partyOverlay('📀 기술머신01.메가톤펀치','기술을 가르칠 포켓몬을 선택해. 사용 즉시 소모돼.',[
   ...tmSelectionOptions(targets,m=>async()=>{
    if(!pendingRewardChoice||!tm01Targets().some(x=>x.key===m.key)){showRewardChoices();return;}
    const moves=recallMemberMoves(m);
    if(!moves.includes('megaPunch')){
     if(moves.length<4)moves.push('megaPunch');
     else{
      const old=await resolveMoveChoice('megaPunch',{member:{name:m.name,moves},allowSkip:true});
      if(old===null){showRewardChoices();return;}
      const at=moves.indexOf(old);if(at<0){showRewardChoices();return;}
      moves.splice(at,1,'megaPunch');
     }
    }
    if(!tm01Learned.includes(m.key))tm01Learned.push(m.key);
    if(m.starter)updateBattleMoves();
    completeInstantRecoveryReward(choice,m.name+' 습득');
   },'tm01'),
   {text:'취소',action:showRewardChoices}
  ]);
  return;
 }
 if(choice.kind==='item'&&HELD_ITEMS.includes(choice.id)){
  if(inventory[choice.id]>=HELD_MAX[choice.id]){alert('최대 보유 수량에 도달했어.');showRewardChoices();return;}
  const item=SHOP_ITEMS.find(i=>i.id===choice.id);
  // Consumable berries can be claimed into the bag when every party member already holds one.
  if(['sitrusBerry','oranBerry'].includes(choice.id)&&teamMembers().every(m=>heldCount(choice.id,m.key)>=heldItemPerPokemonLimit(choice.id))){
   inventory[choice.id]++;
   appendAdventureLog('🎁 '+item.name+' 획득 · 장착 가능한 포켓몬이 없어 가방에 보관');
   pendingRewardChoice=null;saveProgress();$('rewardChoiceOverlay').hidden=true;
   if(redCeremonyPending)showRedEnding();else if(leagueCeremonyPending){leagueCeremonyPending=false;saveProgress();showHallOfFame();}
   renderHome();showChallengeUnlockNotice();return;
  }
  $('rewardChoiceOverlay').hidden=true;
  partyOverlay('🎁 '+item.name,item.name+'을(를) 누구에게 줄까?',[
   ...teamMembers().filter(m=>heldCount(choice.id,m.key)<heldItemPerPokemonLimit(choice.id)&&(choice.id!=='eviolite'||EVOLVABLE_DEX.has(m.dex))).map(m=>({member:m,showHeldItems:true,action:()=>{
    if(!pendingRewardChoice)return;
    inventory[choice.id]++;
    if(!equipHeld(choice.id,m.key)){inventory[choice.id]--;showRewardChoices();return;}
    appendAdventureLog('🎁 '+m.name+'에게 '+item.name+' 장착');
    pendingRewardChoice=null;saveProgress();$('rewardChoiceOverlay').hidden=true;
    if(redCeremonyPending)showRedEnding();else if(leagueCeremonyPending){leagueCeremonyPending=false;saveProgress();showHallOfFame();}
    renderHome();showChallengeUnlockNotice();
   }})),
   {text:'🎒 가방',action:()=>{
    if(!pendingRewardChoice)return;
    if(inventory[choice.id]>=HELD_MAX[choice.id]){alert('최대 보유 수량에 도달했어.');showRewardChoices();return;}
    inventory[choice.id]++;
    appendAdventureLog('🎁 '+item.name+' 획득 · 가방에 보관');
    pendingRewardChoice=null;saveProgress();$('rewardChoiceOverlay').hidden=true;
    if(redCeremonyPending)showRedEnding();else if(leagueCeremonyPending){leagueCeremonyPending=false;saveProgress();showHallOfFame();}
    renderHome();showChallengeUnlockNotice();
   }},
   {text:'취소',action:showRewardChoices}
  ]);return;
 }
 if(choice.kind==='evolution'){
  const targets=eligibleEvolutionTargets(choice);
  if(!targets.length){alert('현재 이 아이템으로 진화할 수 있는 포켓몬이 없어.');showRewardChoices();return;}
  $('rewardChoiceOverlay').hidden=true;
  partyOverlay('✨ '+rewardChoiceName(choice),'아이템을 사용할 포켓몬을 선택해. 선택하면 즉시 진화해.',[
   ...targets.map(member=>({text:member.name+' Lv.'+member.level,action:async()=>{
    if(!pendingRewardChoice)return;
    learningBusy=true;
    try{
     const before={dex:member.dex,name:member.name};
     let after;
     if(choice.id==='linkCord'){
      const evolved=TRADE_EVOLUTIONS[member.dex];
      if(!evolved)return;
      after={dex:evolved.dex,name:evolved.name};
      if(member.starter){setGengarEvolved(true);}else{
       const obj=companions.find(x=>'companion-'+x.family===member.key);
       if(!obj)return;obj.dex=after.dex;obj.name=after.name;
      }
     }else{
      const config=EVOLUTION_REWARD_ITEMS.find(item=>item.id===choice.id);
      if(!config)return;
      const wildEvolution=STONE_WILD_EVOLUTIONS[choice.id]?.[member.dex];
      if(wildEvolution){
       after={...wildEvolution};
       const obj=companions.find(x=>'companion-'+x.family===member.key);
       if(!obj)return;
       obj.dex=after.dex;obj.name=after.name;
      }else if(choice.id==='thunderStone'&&member.dex===25){
       after={...EVOLUTIONS.raichu.at(-1)};
       if(member.starter)setRaichuEvolved(true);
       else{const obj=companions.find(x=>'companion-'+x.family===member.key);if(!obj)return;obj.dex=26;obj.name='라이츄';}
      }else{
       if(!config.form)return;
       after={...EEVEE_FORMS[config.form]};
       if(member.starter)setEeveeForm(config.form);
       else{const obj=companions.find(x=>'companion-'+x.family===member.key);if(!obj)return;obj.dex=after.dex;obj.name=after.name;}
      }
     }
     await showEvolutions([{before,after,level:member.level}]);
     appendAdventureLog('🌟 '+before.name+' → '+after.name+' 진화! ('+rewardChoiceName(choice)+')');
     completeInstantRecoveryReward(choice,after.name+' 진화');
    }finally{learningBusy=false;renderHome();}
   }})),
   {text:'취소',action:()=>showRewardChoices()}
  ]);
  return;
 }
 if(['reviveShardReward','maxReviveReward','sacredAshReward'].includes(choice.kind)){
  const members=teamMembers(),fainted=members.filter(m=>memberHp(m)===0);
  if(members.length<2||!fainted.length){alert('포켓몬 2마리 이상 보유하고 기절한 동료가 있을 때만 사용할 수 있어.');showRewardChoices();return;}
  if(choice.kind==='sacredAshReward'){
   for(const m of members)setMemberHp(m,memberMaxHp(m));
   completeInstantRecoveryReward(choice,'파티 전원 회복');
   return;
  }
  $('rewardChoiceOverlay').hidden=true;
  partyOverlay(choice.kind==='reviveShardReward'?'💎 기력의조각':'🌟 기력의덩어리',choice.kind==='reviveShardReward'?'HP 50%로 부활시킬 포켓몬을 선택해.':'최대 HP로 부활시킬 포켓몬을 선택해.',[
   ...fainted.map(m=>({text:m.name+' Lv.'+m.level+' · HP 0/'+memberMaxHp(m),member:m,action:()=>{
    if(memberHp(m)!==0){showRewardChoices();return;}
    setMemberHp(m,choice.kind==='reviveShardReward'?Math.max(1,Math.floor(memberMaxHp(m)/2)):memberMaxHp(m));
    completeInstantRecoveryReward(choice,m.name+' 부활');
   }})),
   {text:'취소',action:()=>{showRewardChoices();}}
  ]);
  return;
 }
 if(choice.kind==='heal'){
  const targets=battleHealingTargets();
  if(!targets.length){alert('HP 회복이 필요한 포켓몬이 없어. 다른 보상을 골라줘.');return;}
  $('rewardChoiceOverlay').hidden=true;
  partyOverlay('❤️ '+rewardChoiceName(choice),'즉시 회복할 포켓몬을 선택해.',[
   ...targets.map(m=>({text:m.name+' Lv.'+m.level+' · HP '+memberHp(m)+'/'+memberMaxHp(m),member:m,action:()=>{
    const now=teamMembers().find(x=>x.key===m.key);
    if(!now||!pendingRewardChoice){showRewardChoices();return;}
    setMemberHp(now,choice.full?memberMaxHp(now):Math.min(memberMaxHp(now),memberHp(now)+choice.amount));
    completeInstantRecoveryReward(choice,now.name+' HP 회복');
   }})),
   {text:'취소',action:()=>showRewardChoices()}
  ]);
  return;
 }
 if(choice.kind==='candyBundle'){
  if(teamMembers().length<2)return;
  for(const m of teamMembers()){
    const beforeMax=memberMaxHp(m),beforeHp=memberHp(m);
   const member=m.starter?progress:companions.find(x=>x.family===m.family);
   if(member&&member.level<100){const before=member.level;member.level++;member.exp=0;pendingPartyGrowth.push({key:m.key,name:m.name,before,after:member.level,starter:m.starter,family:m.family});preserveLevelUpHp(m,beforeMax,beforeHp);}
  }
  appendAdventureLog('🍬 사탕 보따리 · 파티 전원 레벨업');recordCandyConsumed();
  pendingRewardChoice=null;saveProgress();$('rewardChoiceOverlay').hidden=true;renderHome();
  if(pendingPartyGrowth.length){const tasks=pendingPartyGrowth.splice(0);processPartyGrowth(tasks);}
  return;
 }
 if(['silverCap','ev','exp','expCandy','rareCandy','goldCap'].includes(choice.kind)){
  if(['expCandy','rareCandy'].includes(choice.kind)&&teamMembers().length===1){choosePermanentTarget(choice,teamMembers()[0]);return;}
  choosePermanentTarget(choice);
  return;
 }else if(choice.kind==='ev'){
  const stat=choice.stat;
  if(!EV_STATS.includes(stat))return;
  const total=Object.values(playerEVs).reduce((sum,n)=>sum+n,0);
  const gain=Math.min(choice.amount||2,100-playerEVs[stat],240-total);
  playerEVs[stat]+=gain;checkEVAchievement(playerEVs);
  // Preserve HP lost as maximum HP increases; never auto-heal via EV rewards.
  if(storedHp!==null){
   const newMax=calculateStats(BASE_STATS[getForm(chosen,progress.level).dex],progress.level,playerIVs,playerEVs).hp;
   storedHp=Math.min(newMax,storedHp);
  }
 }else if(choice.kind==='exp'){
  progress.exp+=choice.amount;
  while(progress.level<100&&progress.exp>=levelNeed(progress.level)){
   progress.exp-=levelNeed(progress.level);progress.level++;
  }
  if(progress.level===100)progress.exp=0;
  playerMoves=migrateMoves(chosen,progress.level);
  storedHp=null===storedHp?null:Math.min(calculateStats(BASE_STATS[getForm(chosen,progress.level).dex],progress.level,playerIVs,playerEVs).hp,storedHp);
 }else if(choice.kind==='power'){
  activeBoosts[BOOST_INFO[choice.effect]?choice.effect:'attack'].push(10);
 }else if(choice.kind==='cash'){
  progress.money+=choice.amount;recordMoneyChange('랜덤보상 돈 획득');checkMoneyAchievement();
  if(lastBattleReward)lastBattleReward.money+=choice.amount;
 }else if(choice.kind==='heal'){
  const maxHp=calculateStats(BASE_STATS[getForm(chosen,progress.level).dex],progress.level,playerIVs,playerEVs).hp;
  const currentHp=storedHp===null?maxHp:Math.max(0,Math.min(maxHp,storedHp));
  storedHp=choice.full?maxHp:Math.min(maxHp,currentHp+choice.amount);
 }else if(choice.kind==='item'&&Object.hasOwn(inventory,choice.id)){
  const item=SHOP_ITEMS.find(item=>item.id===choice.id);
  if(item?.category==='key'&&!['expShare','clefairyDoll'].includes(choice.id)){
   if(inventory[choice.id]===1 || (choice.id==='partySlotB'&&inventory.partySlotA!==1 || false)){
    alert('이미 보유한 중요 아이템이거나 슬롯A가 먼저 필요해. 다른 보상을 선택해줘.');return;
   }
   inventory[choice.id]=1;
  }else inventory[choice.id]=Math.min(choice.id==='expShare'?4:choice.id==='masterBall'?2:choice.id==='quickBall'?1:choice.id==='clefairyDoll'?4:HELD_MAX[choice.id]||99,inventory[choice.id]+choice.quantity);
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
function restoreHistoricalAchievements(){
 // Additive migration: never replace existing earned IDs or fabricate event-only awards.
 let permanent={};
 try{permanent=JSON.parse(localStorage.getItem(PERMANENT_KEY)||'{}')||{};}catch{}
 const a=permanent.achievements||{};
 const historicCaught=new Set([...caughtSpecies,...(Array.isArray(permanent.caughtSpecies)?permanent.caughtSpecies:[])].map(Number));
 const historicSeen=new Set([...seenPokemon,...(Array.isArray(permanent.seenPokemon)?permanent.seenPokemon:[])].map(Number));
 const recovered=new Set(achievementData.earned);
 const mark=(id,condition)=>{if(condition)recovered.add(id);};
 mark('brock',brockCleared||a.brockCleared);
 mark('misty',mistyCleared||a.mistyCleared);
 mark('rival',blueCleared||a.blueCleared||greenReturnCleared||a.greenReturnCleared||greenThirdCleared||a.greenThirdCleared);
 mark('badges',giovanniCleared);
 mark('champion',hallOfFame.length>0||(Array.isArray(permanent.hallOfFame)&&permanent.hallOfFame.length>0));
 mark('redSummit',redHallOfFame.length>0||(Array.isArray(permanent.redHallOfFame)&&permanent.redHallOfFame.length>0));
 mark('level100',teamMembers().some(m=>m.level>=100));
 mark('healing100',achievementData.healing>=100);
 mark('eggs20',achievementData.eggs>=20);
 mark('eggs100',achievementData.eggs>=100);
 mark('wild1000',achievementData.wildWins>=1000);
 mark('trainer100',achievementData.trainerWins>=100);
 mark('center200',achievementData.centerUses>=200);
 mark('run100',achievementData.runs>=100);
 mark('money999999',progress.money>=999999);
 mark('birds',[144,145,146].every(d=>historicCaught.has(d)));
 mark('eevees',[133,134,135,136].every(d=>historicCaught.has(d)));
 mark('eevees2',[133,134,135,136,196,197].every(d=>historicCaught.has(d)));
 mark('blackNintendo',[91,95].every(d=>historicCaught.has(d)));
 // Recover from a completed Eevee evolution, never from capturing an evolved form alone.
 // Prior-run Hall of Fame starters and the last pre-reset snapshot can also
 // establish a past evolution after the current adventure has been restarted.
 const eeveeEvolvedDex=new Set([134,135,136,196,197]);
 const eeveeEvolutionLog=line=>/이브이\s*→\s*(샤미드|쥬피썬더|부스터|에브이|블래키).*진화/.test(line);
 const knownHall=[...hallOfFame,...redHallOfFame,...(Array.isArray(permanent.hallOfFame)?permanent.hallOfFame:[]),...(Array.isArray(permanent.redHallOfFame)?permanent.redHallOfFame:[])];
 const eeveeHallEvidence=knownHall.some(record=>record?.starter==='eevee'&&(
   eeveeEvolvedDex.has(record.dex)||
   (Array.isArray(record.party)&&record.party.some(mon=>eeveeEvolvedDex.has(mon?.dex)))
 ));
 let previousRun=null;
 try{previousRun=JSON.parse(localStorage.getItem(SAVE_KEY+'-before-reset')||'null');}catch{}
 const eeveePreviousRun=previousRun?.id==='eevee'&&(
   !!previousRun.eeveeForm||
   (Array.isArray(previousRun.adventureLog)&&previousRun.adventureLog.some(eeveeEvolutionLog))
 );
 mark('eeveeMajor',(chosen==='eevee'&&!!getEeveeForm())||
   adventureLog.some(eeveeEvolutionLog)||eeveeHallEvidence||eeveePreviousRun);
 mark('dna',[150,151].every(d=>historicCaught.has(d)));
 mark('zapdos',historicCaught.has(145));
 mark('moltres',historicCaught.has(146));
 mark('articuno',historicCaught.has(144));
 mark('mewtwo',historicCaught.has(150));
 mark('mew',historicCaught.has(151));
 mark('dexSeenAll',DEX_CATALOG.length>0&&DEX_CATALOG.every(p=>historicSeen.has(p.dex)));
 mark('dexCaughtAll',DEX_CATALOG.length>0&&DEX_CATALOG.every(p=>historicCaught.has(p.dex)));
 for(const [id] of ACHIEVEMENTS){
  if(!id.startsWith('evo:'))continue;
  const dex=Number(id.slice(4));
  // A captured evolved species alone does not prove the player evolved it.
  if(adventureLog.some(line=>line.includes('진화')&&line.includes((DEX_CATALOG.find(p=>p.dex===dex)||{}).name||'___NO_MATCH___')))mark(id,true);
 }
 if(recovered.size!==achievementData.earned.length){
  const newlyRecovered=[...recovered].filter(id=>!achievementData.earned.includes(id));
  achievementData.earned=[...recovered];
  saveAchievements();
  // Historical reconciliation previously added earned badges silently.
  // Queue a visible notification for every newly restored achievement.
  for(const id of newlyRecovered)queueAchievementNotice(id);
 }
}
function renderCollection(){
 restoreHistoricalAchievements();
 const refreshBar=$('achievementRefreshBar');
 if(refreshBar){refreshBar.hidden=collectionTab!=='achievements';refreshBar.style.display=refreshBar.hidden?'none':'flex';}
 let old={};try{old=JSON.parse(localStorage.getItem(PERMANENT_KEY)||'{}')||{};}catch{}
 const a=old.achievements||{};
 const permanentHall=Array.isArray(old.hallOfFame)?old.hallOfFame:[];
 const permanentRed=Array.isArray(old.redHallOfFame)?old.redHallOfFame:[];
 const completedLeague=hallOfFame.length>0||permanentHall.length>0;
 const completedRed=redHallOfFame.length>0||permanentRed.length>0;
 const leagueProgress=leagueStage===null?0:leagueStage;
 const trainerRecords={
  ...trainerClears,
  blue:blueCleared||a.blueCleared,brock:brockCleared||a.brockCleared,
  misty:mistyCleared||a.mistyCleared,greenReturn:greenReturnCleared||a.greenReturnCleared,
  surge:surgeCleared||a.surgeCleared,greenThird:greenThirdCleared||a.greenThirdCleared,
  erika:erikaCleared||a.erikaCleared,koga:kogaCleared,greenFourth:greenFourthCleared,
  sabrina:sabrinaCleared,blaine:blaineCleared,giovanni:giovanniCleared,greenFifth:greenFifthCleared,
  red:completedRed
 };
 for(let i=0;i<5;i++)trainerRecords['league'+i]=!!(trainerClears['league'+i]||completedLeague||leagueProgress>i);
 return renderCollectionView({$,collectionTab,capturedPokemon,caughtSpecies,seenPokemon,trainerRecords,
 blueCleared:blueCleared||a.blueCleared,brockCleared:brockCleared||a.brockCleared,
 mistyCleared:mistyCleared||a.mistyCleared,greenReturnCleared:greenReturnCleared||a.greenReturnCleared,
 surgeCleared:surgeCleared||a.surgeCleared,greenThirdCleared:greenThirdCleared||a.greenThirdCleared,
 erikaCleared:erikaCleared||a.erikaCleared,kogaCleared,sabrinaCleared,achievements:ACHIEVEMENTS,earnedAchievementIds:achievementData.earned});
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
 // A fainted fighter may still be cached in battleRoster: revival restores HP, never old stat ranks.
 resetFighterAfterFaint(battleRoster.get(m.key));
 const hp=Math.max(1,Math.floor(memberMaxHp(m)/2));
 setMemberHp(m,hp);
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
function chooseEvResetTarget(item){
 if(screen==='battle'||animating||learningBusy||pendingRewardChoice)return;
 if((inventory[item.id]||0)<1)return;
 const getEV=m=>m.starter?playerEVs:companions.find(c=>c.family===m.family)?.evs;
 const targets=teamMembers().filter(m=>{const ev=getEV(m);return ev&&EV_STATS.some(stat=>(ev[stat]||0)>0);});
 if(!targets.length){alert('초기화할 노력치가 있는 포켓몬이 없어.');return;}
 const applyReset=(m,stat=null)=>{
  if((inventory[item.id]||0)<1||screen==='battle'||animating)return;
  const ev=getEV(m);if(!ev)return;
  const stats=stat?[stat]:EV_STATS;
  const oldMaxHp=memberMaxHp(m),oldHp=memberHp(m);
  let removed=0;
  for(const key of stats){
   const decrease=Math.min(ev[key]||0,stat?20:Infinity);
   ev[key]-=decrease;
   removed+=decrease;
  }
  if(!removed){alert('감소시킬 노력치가 없어.');return;}
  inventory[item.id]--;
  const newMaxHp=memberMaxHp(m);
  if(newMaxHp<oldMaxHp)setMemberHp(m,Math.min(oldHp,newMaxHp));
  appendAdventureLog(item.icon+' '+m.name+' '+item.name+' 사용 · '+(stat?STAT_LABELS[stat]+' 노력치 -'+removed:'모든 노력치 초기화 (-'+removed+')'));
  saveProgress();renderHome();renderInventory();
 };
 partyOverlay(item.icon+' '+item.name,item.evReset==='all'?'모든 노력치를 0으로 초기화할 포켓몬을 선택해.':'노력치를 20 감소시킬 포켓몬을 선택해.',[
  ...targets.map(m=>({member:m,action:()=>{
   if(item.evReset==='all'){applyReset(m);return;}
   const ev=getEV(m);
   partyOverlay(item.icon+' '+m.name+' 노력치 선택','20 감소시킬 노력치를 선택해. 현재 노력치가 0인 항목은 선택할 수 없어.',[
    ...EV_STATS.map(stat=>({text:STAT_LABELS[stat]+' '+(ev?.[stat]||0)+' → '+Math.max(0,(ev?.[stat]||0)-20),disabled:!(ev?.[stat]>0),action:()=>applyReset(m,stat)})),
    {text:'취소',action:()=>chooseEvResetTarget(item)}
   ]);
  }})),
  {text:'취소',action:()=>{}}
 ]);
}
function chooseVitaminTarget(item){
 const stat=item.evStat,amount=item.evAmount||8;
 const targets=teamMembers().filter(m=>{const ev=m.starter?playerEVs:companions.find(c=>c.family===m.family)?.evs;return ev&&ev[stat]<100&&Object.values(ev).reduce((sum,n)=>sum+n,0)<240;});
 if(!targets.length){alert('노력치를 올릴 수 있는 포켓몬이 없어.');return;}
 partyOverlay('💊 '+item.name,'노력치를 올릴 포켓몬을 선택해. 1개당 최대 +'+amount+' (개별 100 · 총합 240).',[
  ...targets.map(m=>({text:m.name+' Lv.'+m.level,member:m,action:()=>{
   if((inventory[item.id]||0)<1)return;
   const ev=m.starter?playerEVs:companions.find(c=>c.family===m.family)?.evs;
   if(!ev)return;
   const gain=Math.min(amount,100-ev[stat],240-Object.values(ev).reduce((sum,n)=>sum+n,0));
   if(gain<=0){alert('노력치가 이미 최대야.');return;}
   ev[stat]+=gain;inventory[item.id]--;checkEVAchievement(ev);
   if(m.starter&&storedHp!==null){const max=calculateStats(BASE_STATS[getForm(chosen,progress.level).dex],progress.level,playerIVs,playerEVs).hp;storedHp=Math.min(max,storedHp);}
   appendAdventureLog('💊 '+m.name+' '+item.name+' 노력치 +'+gain);
   saveProgress();renderHome();renderInventory();
  }})),{text:'취소',action:()=>{}}]);
}
function chooseRecoveryTarget(item){
 const targets=teamMembers().filter(m=>item.id==='revive'?memberHp(m)===0:memberHp(m)>0&&memberHp(m)<memberMaxHp(m));
 if(!targets.length){alert(item.id==='revive'?'기절한 포켓몬이 없어.':'회복이 필요한 포켓몬이 없어.');return;}
 partyOverlay(item.icon+' '+item.name,'회복할 포켓몬을 선택해.',[
 ...targets.map(m=>({text:m.name+' Lv.'+m.level+' · HP '+memberHp(m)+'/'+memberMaxHp(m),member:m,action:()=>{
  if(inventory[item.id]<1)return;
  const before=memberHp(m),max=memberMaxHp(m);
  const hp=item.id==='revive'?Math.max(1,Math.floor(max/2)):Math.min(max,before+item.power);
  setMemberHp(m,hp);
  inventory[item.id]--;
  if(item.id==='revive')injured=!livingMembers().length;
  appendAdventureLog(item.icon+' '+m.name+'에게 '+item.name+' 사용 (HP '+before+' → '+hp+')');
  normalizeLivingLead();saveProgress();renderHome();renderInventory();
 }})),{text:'취소',action:()=>{}}]);
}
const INHERITANCE_PRICE_STEPS=[10000,20000,30000,30000,40000,40000,50000,50000,70000,100000,120000,120000,140000,150000,160000];
const INHERITANCE_ONE_TICKET_ITEMS=new Set(['revivalSeed','oranBerry','sitrusBerry','clefairyDoll']);
function inheritanceItemEligible(item){return !!item&&item.id!=='inheritanceTicket'&&(HELD_ITEMS.includes(item.id)||item.category==='key');}
function inheritanceItemCost(id){if(id==='beedrillite')return 2;return INHERITANCE_ONE_TICKET_ITEMS.has(id)||HELD_ITEMS.includes(id)?1:2;}
function inheritanceSelectionCost(ids){return ids.reduce((sum,id)=>sum+inheritanceItemCost(id),0);}
function inheritanceCapacity(){return Math.min(21,5+2*(hallOfFameEntries('first').length+hallOfFameEntries('second').length));}
function sanitizeInheritanceSelection(wanted,available,budget){
 const result=[],counts={};let spent=0;
 if(!Array.isArray(wanted))return result;
 for(const id of wanted){
  const item=SHOP_ITEMS.find(x=>x.id===id);
  if(!inheritanceItemEligible(item))continue;
  const count=counts[id]||0,held=Math.max(0,Number(available?.[id])||0);
  const ceiling=HELD_MAX[id]??(id==='clefairyDoll'||id==='expShare'?4:item.category==='key'?1:99);
  const cost=inheritanceItemCost(id);
  if(count>=held||count>=ceiling||spent+cost>budget)continue;
  result.push(id);counts[id]=count+1;spent+=cost;
 }
 return result;
}
function inheritanceTicketLimit(){return inheritanceCapacity();}
function inheritanceTicketPrice(){const purchased=Math.max(0,Number(inventory.inheritanceTicketPurchases??inventory.inheritanceTicket)||0);return INHERITANCE_PRICE_STEPS[Math.min(purchased,INHERITANCE_PRICE_STEPS.length-1)];}
function buyInheritanceTicket(){
 if(!hallOfFame.length)return;
 const limit=inheritanceTicketLimit(),owned=inventory.inheritanceTicket||0,price=inheritanceTicketPrice();
 if(owned>=limit||progress.money<price)return;
 progress.money-=price;recordMoneyChange('계승권 구매');inventory.inheritanceTicket=owned+1;inventory.inheritanceTicketPurchases=Math.max(0,Number(inventory.inheritanceTicketPurchases??owned)||0)+1;
 localStorage.setItem('poketama-2-ticket-purchases-v1',String(inventory.inheritanceTicketPurchases));
 appendAdventureLog('🎫 계승권 '+inventory.inheritanceTicket+'/'+limit+'장 구매 ('+price.toLocaleString('ko-KR')+'원)');
 saveProgress();renderHome();renderInventory();
}
function renderInventory(){
 normalizeHeldItems();
 return renderInventoryView({$,inventoryMode,inventoryCategory,inventory,battleItemHolders,heldItems:HELD_ITEMS,partyMembers:teamMembers(),expShareActive,onExpShareToggle:()=>{if(!inventory.expShare)return;expShareActive=!expShareActive;saveProgress();renderInventory();},progress,chosen,playerIVs,storedHp,saveProgress,renderHome,setStoredHp:hp=>{storedHp=hp;},chooseRecoveryTarget,chooseVitaminTarget,chooseEvResetTarget,onHeldSelect:manageHeldItem,onMoneyChange:recordMoneyChange,inheritanceTicketLimit:inheritanceTicketLimit(),inheritanceTicketUnlocked:hallOfFame.length>0,inheritanceTicketPrice:inheritanceTicketPrice(),onInheritanceTicketBuy:buyInheritanceTicket,onInheritanceTicketUse:showInheritanceChoices,onMapUse:()=>{ $('shopScreen').hidden=true;showScreen('home');showMap(); }});
}
function showScreen(next){if(animating||learningBusy)return;screen=next;const logPanel=document.getElementById('adventureLogPanel');if(logPanel)logPanel.hidden=next!=='home';$('homeScreen').hidden=next!=='home';$('battleScreen').hidden=next!=='battle';$('leagueScreen').hidden=next!=='league';/* Preserve the user's page scroll position when switching between home and battle. */if(next==='home')showChallengeUnlockNotice();}
const BATTLE_RANK_LABELS={attack:'공격',defense:'방어',speed:'스피드',accuracy:'명중',evasion:'회피'};
let battleEffectDisplay=null;
function snapshotBattleEffects(){const enemy=animatingEnemy??battle.enemies[battle.enemyIndex];return {player:{stages:{...battle.player.stages},status:battle.player.status?.type||null,confused:battle.player.confusionTurns>0},enemy:{stages:{...enemy?.stages},status:enemy?.status?.type||null,confused:!!enemy?.confusionTurns},shields:{...battle.shields},rings:{...battle.rings}};}
function renderBattleEffects(){
 if(!battle)return;
 for(const side of ['player','enemy']){
  const container=$(side==='player'?'playerBattleEffects':'enemyBattleEffects');if(!container)continue;
  container.replaceChildren();
  const fighter=side==='player'?battle.player:(animatingEnemy??battle.enemies[battle.enemyIndex]??battle.enemies.at(-1));
  const visible=battleEffectDisplay?.[side]||fighter;if(visible?.stages)for(const [stat,rank] of Object.entries(visible.stages)){
   if(!rank)continue;
   const chip=document.createElement('span');chip.className='battle-effect-chip '+(rank>0?'positive':'negative');
   chip.textContent=(rank>0?'▲ ':'▼ ')+(BATTLE_RANK_LABELS[stat]||stat)+' '+(rank>0?'+':'')+rank;
   container.append(chip);
  }
  if((battleEffectDisplay?.shields||battle.shields)?.[side]>0){const chip=document.createElement('span');chip.className='battle-effect-chip field';chip.textContent='✨ 빛의장막 '+(battleEffectDisplay?.shields||battle.shields)[side]+'턴';container.append(chip);}
  if((battleEffectDisplay?.rings||battle.rings)?.[side]){const chip=document.createElement('span');chip.className='battle-effect-chip field';chip.textContent='💧 아쿠아링';container.append(chip);}
 }
}
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
   const txt=document.createElement('span');txt.textContent='+'+(durations.length*({attack:20,accuracy:10,critical:15,defense:20}[key]))+(key==='accuracy'||key==='critical'?'%':'%')+' · '+durations.join('/')+'턴';
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
function setMemberHp(m,hp){
 if(m.starter)storedHp=hp;else{const found=companions.find(x=>x.family===m.family);if(found)found.hp=hp;}
 // Battle fighters are cached per party member; keep their HP in sync with the saved party.
 const cached=battleRoster.get(m.key);
 if(cached)cached.hp=hp;
}
function resetFighterStages(fighter){if(fighter?.stages)for(const stat of Object.keys(fighter.stages))fighter.stages[stat]=0;}
function resetFighterAfterFaint(fighter){
 if(!fighter)return;
 resetFighterStages(fighter);
 fighter.status=null;
 fighter.confusionTurns=0;
 fighter.lockedMove=null;
}
function setActiveHp(hp){setMemberHp(activeMember(),hp);}
function memberHp(m){const max=memberMaxHp(m),hp=m.starter?storedHp:companions.find(x=>x.family===m.family)?.hp;return hp==null?max:Math.max(0,Math.min(max,hp));}
function battleHealingTargets(){
 return teamMembers().filter(m=>{
  const hp=m.key===activeBattleKey&&battle&&!battle.ended?battle.player.hp:memberHp(m);
  return hp>0&&hp<memberMaxHp(m);
 });
}
function livingMembers(){return teamMembers().filter(m=>memberHp(m)>0);}
function normalizeLivingLead(){const all=teamMembers(),first=all[0];if(first&&memberHp(first)===0){const next=all.find(m=>memberHp(m)>0);if(next){partyOrder=[next.key,...all.filter(m=>m.key!==next.key).map(m=>m.key)];saveProgress();}}}
function leaderMember(){return teamMembers()[0];}
function memberBase(m){
 const base=BASE_STATS[m.dex];
 if(!base)throw new Error('포켓몬 #'+m.dex+'의 종족값이 등록되지 않았습니다.');
 return base;
}
function memberMaxHp(m){return calculateStats(memberBase(m),m.level,m.starter?playerIVs:m.ivs,m.starter?playerEVs:m.evs||{}).hp;}
function leaderHp(){const m=leaderMember(),max=memberMaxHp(m),hp=m.starter?storedHp:companions.find(x=>x.family===m.family)?.hp;return hp==null?max:Math.max(0,Math.min(max,hp));}
function setLeaderHp(hp){const m=leaderMember();if(m.starter)storedHp=hp;else{const entry=companions.find(x=>x.family===m.family);if(entry)entry.hp=hp;}}
function attackItemMultiplier(m){return 1+(inventory.sharpBeak===1&&FLYING_TYPE_DEX.has(m.dex)?0.1:0)+(inventory.magnet===1&&ELECTRIC_TYPE_DEX.has(m.dex)?0.1:0)+(inventory.silverPowder===1&&BUG_TYPE_DEX.has(m.dex)?0.1:0)+(inventory.thickClub===1&&[104,105].includes(m.dex)?1:0)+(inventory.lightBall===1&&[172,25,26].includes(m.dex)?0.5:0)+(inventory.beedrillite===1&&m.dex===15?0.4:0)+(inventory.charcoal===1&&FIRE_TYPE_DEX.has(m.dex)?0.15:0)+0.1*heldCount('hardClaw',m.key);}
function grassSeedBonus(m){return inventory.miracleSeed===1&&GRASS_TYPE_DEX.has(m.dex);}
function waterDropBonus(m){return inventory.mysticWater===1&&WATER_TYPE_DEX.has(m.dex);}
function bugPowderBonus(m){return inventory.silverPowder===1&&BUG_TYPE_DEX.has(m.dex);}
function magnetSpeedBonus(m){return (inventory.magnet===1&&ELECTRIC_TYPE_DEX.has(m.dex)?0.05:0)+(inventory.beedrillite===1&&m.dex===15?0.4:0);}
// Eviolite applies only to species that still have an obtainable evolution.
const EVOLVABLE_DEX=new Set([
 ...Object.keys(WILD_EVOLUTIONS).map(Number),
 ...Object.keys(TRADE_EVOLUTIONS).map(Number),
 ...Object.values(STONE_WILD_EVOLUTIONS).flatMap(group=>Object.keys(group).map(Number)),
 ...Object.values(EVOLUTIONS).flatMap(forms=>forms.slice(0,-1).map(form=>form.dex)),
 133,172,25,446,35,39,30,33,61,90,120,42,95,123
]);
function makeMemberFighter(m){normalizeHeldItems();const s=STARTERS.find(x=>x.id===chosen),form=getForm(chosen,progress.level);const player=m.starter?fighter(s,playerIVs,progress.level,BASE_STATS[form.dex],form.name,playerMoves):makeCompanionFighter(m);player.dex=m.dex;player.hp=memberHp(m);player.attackBuffMultiplier=attackItemMultiplier(m)+0.2*boostCount('attack');player.speedBuffMultiplier=1+magnetSpeedBonus(m);
player.wideLensAccuracyBuff=0.05*heldCount('wideLens',m.key); player.accuracyBuff=0.1*boostCount('accuracy')+player.wideLensAccuracyBuff+(grassSeedBonus(m)?0.05:0);
player.shellBellCount=heldCount('shellBell',m.key);player.leftoversCount=heldCount('leftovers',m.key);player.shellBell=player.shellBellCount>0;player.leftoversEnabled=player.leftoversCount>0;player.revivalSeedEnabled=hasHeld('revivalSeed',m.key)&&inventory.revivalSeed>0;player.revivalSeedUsed=false;player.focusSashEnabled=hasHeld('focusSash',m.key);player.quickClawCount=heldCount('quickClaw',m.key);player.focusSashChance=0.05*heldCount('focusSash',m.key);player.focusSashUsed=false;player.critBuff=0.15*boostCount('critical')+(0.04*heldCount('scopeLens',m.key));player.defenseBuffMultiplier=1+0.2*boostCount('defense')+(grassSeedBonus(m)?0.1:0)+(waterDropBonus(m)?0.10:0)+(bugPowderBonus(m)?0.15:0)+(EVOLVABLE_DEX.has(m.dex)?0.13*heldCount('eviolite',m.key):0);
 player.sitrusBerryEnabled=hasHeld('sitrusBerry',m.key)&&inventory.sitrusBerry>0;player.oranBerryEnabled=hasHeld('oranBerry',m.key)&&inventory.oranBerry>0;
 return player;}
function normalizeHeldItems(){
 const members=teamMembers();
 const keys=new Set(members.map(m=>m.key));
 const evolvableKeys=new Set(members.filter(m=>EVOLVABLE_DEX.has(m.dex)).map(m=>m.key));
 for(const id of HELD_ITEMS){
  const seen=new Map();
  battleItemHolders[id]=(battleItemHolders[id]||[]).filter(k=>{
   if(!keys.has(k))return false;
   // Eviolite on a fully evolved Pokemon is unequipped automatically.
   // The item stays in inventory and becomes available to equip elsewhere.
   if(id==='eviolite'&&!evolvableKeys.has(k))return false;
   if(STACKABLE_HELD_ITEMS.includes(id)){
    const count=seen.get(k)||0;
    if(count>=heldItemPerPokemonLimit(id))return false;
    seen.set(k,count+1);return true;
   }
   if(seen.has(k))return false;
   seen.set(k,1);return true;
  }).slice(0,inventory[id]||0);
 }
}
function heldCount(id,key){return (battleItemHolders[id]||[]).filter(holder=>holder===key).length;}
function hasHeld(id,key){return heldCount(id,key)>0;}
function equipHeld(id,key){
 normalizeHeldItems();
 if(!HELD_ITEMS.includes(id)||!teamMembers().some(m=>m.key===key))return false;
 if(id==='eviolite'&&!teamMembers().some(m=>m.key===key&&EVOLVABLE_DEX.has(m.dex)))return false;
 if(heldCount(id,key)>=heldItemPerPokemonLimit(id))return false;
 if(battleItemHolders[id].length>=inventory[id])return false;
 battleItemHolders[id].push(key);
 saveProgress();return true;
}
function selectHeldItemTarget(id){
 normalizeHeldItems();
 const item=SHOP_ITEMS.find(i=>i.id===id);
 partyOverlay(item.icon+' '+item.name,'장착할 포켓몬을 선택해. 미장착 수량이 없으면 기존 착용자로부터 옮길 수 있어.',[
  ...teamMembers().map(m=>({
   text:m.name+' Lv.'+m.level+(heldCount(id,m.key)?' · '+heldCount(id,m.key)+'개 장착 중':''),
   disabled:heldCount(id,m.key)>=heldItemPerPokemonLimit(id)||(id==='eviolite'&&!EVOLVABLE_DEX.has(m.dex)),
   action:()=>{
    if(battleItemHolders[id].length<inventory[id]){
     if(equipHeld(id,m.key)){appendAdventureLog('🎒 '+m.name+'에게 '+item.name+' 장착');renderInventory();}
     return;
    }
    const originals=battleItemHolders[id].map(key=>teamMembers().find(x=>x.key===key)).filter(Boolean);
    partyOverlay(item.icon+' 옮기기',m.name+'에게 줄 '+item.name+'을(를) 누구에게서 옮길까?',[
     ...originals.map(source=>({text:source.name+' → '+m.name,action:()=>{
      battleItemHolders[id].splice(battleItemHolders[id].indexOf(source.key),1);
      if(!equipHeld(id,m.key)){battleItemHolders[id].push(source.key);saveProgress();return;}
      appendAdventureLog('🎒 '+source.name+'의 '+item.name+'을(를) '+m.name+'에게 옮겼다.');
      renderInventory();
     }})),
     {text:'취소',action:()=>manageHeldItem(id)}
    ]);
   }
  })),
  {text:'취소'}
 ]);
}
function manageHeldItem(id){
 normalizeHeldItems();
 const item=SHOP_ITEMS.find(i=>i.id===id);
 if(!item)return;
 document.getElementById('partyActionOverlay')?.remove();
 const overlay=document.createElement('div');
 overlay.id='partyActionOverlay';
 overlay.style.cssText='position:fixed;inset:0;background:#0009;z-index:100001;overflow-y:auto;padding:6vh 16px;display:flex;align-items:flex-start;justify-content:center';
 const dialog=document.createElement('section');
 dialog.style.cssText='background:white;border:3px solid #405675;border-radius:17px;padding:20px;max-width:460px;width:100%;color:#293e59;box-shadow:0 12px 25px #0005;display:grid;gap:12px';
 const header=document.createElement('div');header.style.cssText='display:flex;align-items:center;gap:10px';
 const image=document.createElement('img');image.src=itemSpriteUrl(id);image.alt=item.name;image.width=36;image.height=36;image.style.cssText='image-rendering:pixelated;object-fit:contain';
 const heading=document.createElement('div');
 const title=document.createElement('h2');title.textContent=item.name+' 장착 관리';title.style.margin='0';
 const status=document.createElement('small');
 heading.append(title,status);header.append(image,heading);dialog.append(header);
 const rows=document.createElement('div');rows.style.cssText='display:grid;gap:10px';dialog.append(rows);
 const close=document.createElement('button');close.type='button';close.textContent='닫기';
 close.style.cssText='min-height:44px;border-radius:10px;border:2px solid #697e9d;background:#f3f6fb;color:#283c5a;font-weight:bold';
 close.onclick=()=>{overlay.remove();renderInventory();};
 dialog.append(close);overlay.append(dialog);document.body.append(overlay);
 function update(){
  normalizeHeldItems();
  const used=battleItemHolders[id].length,available=Math.max(0,inventory[id]-used);
  status.textContent='보유 '+inventory[id]+'개 · 장착 '+used+'개 · 미장착 '+available+'개';
  rows.replaceChildren();
  for(const member of teamMembers()){
   const count=heldCount(id,member.key),limit=heldItemPerPokemonLimit(id);
   const row=document.createElement('div');row.style.cssText='border:1px solid #cad5e5;border-radius:11px;padding:11px;display:grid;gap:7px';
   const line=document.createElement('div');line.style.cssText='display:flex;align-items:center;gap:8px;justify-content:space-between';
   const label=document.createElement('div');
   const name=document.createElement('strong');name.textContent=member.name+' Lv.'+member.level;label.append(name);
   const detail=document.createElement('div');detail.style.cssText='font-size:12px;color:#526782;margin-top:3px';
   detail.textContent=id==='eviolite'?(EVOLVABLE_DEX.has(member.dex)?'방어력 +'+count*10+'%':'진화가 불가능하여 장착 불가'):id==='sitrusBerry'?'HP 50% 이하 시 20% 회복 · 소모':id==='wideLens'?'명중률 +'+count*5+'% (일격필살기 +'+count*2.5+'%)':id==='quickClaw'?'선제공격 확률 '+count*5+'%':id==='hardClaw'?'공격력 +'+count*10+'%':id==='scopeLens'?'급소율 +'+count*4+'%':id==='focusSash'?'생존 확률 '+count*5+'%':id==='shellBell'?'피해량의 '+count*5+'% 회복':id==='leftovers'?'턴 종료 시 최대 HP '+count*3+'% 회복':count?'장착 중':'미장착';label.append(detail);
   const controls=document.createElement('div');controls.style.cssText='display:flex;align-items:center;gap:9px';
   const button=(symbol,disabled,action)=>{
    const el=document.createElement('button');el.type='button';el.textContent=symbol;
    el.disabled=disabled;el.style.cssText='width:36px;height:36px;border:1px solid #697e9d;border-radius:9px;font-size:21px;font-weight:bold;background:#f3f6fb;color:#283c5a;cursor:pointer';
    if(disabled)el.style.opacity='0.35';
    el.onclick=action;return el;
   };
   const minus=button('−',count===0,()=>{
    const index=battleItemHolders[id].indexOf(member.key);if(index<0)return;
    battleItemHolders[id].splice(index,1);saveProgress();renderStatPanel();renderInventory();update();
   });
   const amount=document.createElement('strong');amount.textContent=count+'/'+limit;amount.style.minWidth='34px';amount.style.textAlign='center';
   const plus=button('+',count>=limit||available===0||(id==='eviolite'&&!EVOLVABLE_DEX.has(member.dex)),()=>{
    if(!equipHeld(id,member.key))return;
    appendAdventureLog('🎒 '+member.name+'에게 '+item.name+' 장착');renderInventory();update();
   });
   controls.append(minus,amount,plus);line.append(label,controls);row.append(line);
   const gauge=document.createElement('div');gauge.style.cssText='display:flex;gap:5px';
   for(let n=0;n<limit;n++){const segment=document.createElement('span');segment.style.cssText='height:6px;flex:1;border-radius:5px;background:'+(n<count?'#16a34a':'#e2e8f0');gauge.append(segment);}
   row.append(gauge);rows.append(row);
  }
 }
 update();
}
function chooseActiveMember(m){
 if(memberHp(m)<=0)return false;
 activeBattleKey=m.key;
 battleParticipants.add(m.key);
 return true;
}
function updateBattlePlayerHeader(){
 const m=activeMember();
 $('playerName').textContent=battle.player.name;
 $('playerLevel').textContent='LV '+battle.player.level;
 const cap=wildRewardLevelCap();$('playerLevel').classList.toggle('level-capped',cap!==null&&m.level>=cap);
 $('playerSprite').style.filter='';sprite('playerSprite',m.dex,true,m.starter?STARTERS.find(x=>x.id===chosen).emoji:'⚔️');
 shownHp.player=battle.player.hp;
}
function requestBattleSwitch(){
 if(animating||battle.ended)return;
 const others=teamMembers().filter(m=>m.key!==activeBattleKey&&memberHp(m)>0);
 if(!others.length){alert('교체할 수 있는 동료가 없어.');return;}
 partyOverlay('🔄 포켓몬 교체','교체는 1턴을 소모해. 상대 포켓몬은 공격할 수 있어.',[...others.map(m=>({text:m.name+' Lv.'+m.level+' · HP '+memberHp(m)+'/'+memberMaxHp(m),action:async()=>{
  if(animating||battle.ended)return;
  animating=true;
  try{
   setActiveHp(battle.player.hp);
   resetFighterStages(battle.player);
   battleRoster.set(activeBattleKey,battle.player);
   await playSwitchBallAnimation(()=>{
    if(!chooseActiveMember(m))return;
    const newFighter=battleRoster.get(m.key)||makeMemberFighter(m);
    battleRoster.set(m.key,newFighter);
    battle.player=newFighter;updateBattlePlayerHeader();render();
   },true);
  }finally{animating=false;}
  const newFighter=battleRoster.get(m.key);
  if(newFighter&&!battle.ended)await act({type:'switch',fighter:newFighter});
 }})),{text:'취소',action:()=>{}}]);
}
function makeCompanionFighter(m){const ids=[...new Set((m.moves||recentWildMoves(m.dex,m.level)).filter(id=>MOVES[id]))].slice(-4);return createFighter({id:'companion-'+m.dex,name:m.name,level:m.level,friendship:50,stats:calculateStats(memberBase(m),m.level,m.ivs,m.evs||{}),moveIds:ids.length?ids:['tackle']});}

function partyOverlay(title,description,choices){
 let layer=document.getElementById('partyActionOverlay');
 if(!layer){
  layer=document.createElement('div');layer.id='partyActionOverlay';
  layer.style.cssText='position:fixed;inset:0;background:#0009;z-index:100001;overflow-y:auto;padding:6vh 16px;display:flex;align-items:flex-start;justify-content:center';
  const dialog=document.createElement('div');dialog.style.cssText='background:white;border:3px solid #405675;border-radius:17px;padding:20px;max-width:460px;width:100%;color:#293e59;box-shadow:0 12px 25px #0005';
  const heading=document.createElement('h2');heading.id='partyActionTitle';heading.style.margin='0 0 12px';
  const info=document.createElement('p');info.id='partyActionInfo';
  const buttons=document.createElement('div');buttons.id='partyActionButtons';buttons.style.cssText='display:grid;gap:9px';
  dialog.append(heading,info,buttons);layer.append(dialog);document.body.append(layer);
 }
 document.getElementById('partyActionTitle').textContent=title;
 document.getElementById('partyActionInfo').textContent=description;
 document.getElementById('partyActionInfo').style.whiteSpace='pre-line';
 const target=document.getElementById('partyActionButtons');target.replaceChildren();
 for(const option of choices){
  const button=document.createElement('button');button.type='button';
  button.style.cssText='min-height:48px;border:2px solid #697e9d;border-radius:10px;background:#f3f6fb;color:#283c5a;font-weight:bold;font-size:16px;padding:8px';
  if(option.member){
   button.classList.add('recovery-target-option');
   if(option.tmStatus)button.classList.add('tm-target-option');
   if(option.showExp)button.classList.add('exp-target-option');
   const m=option.member,hp=memberHp(m),max=memberMaxHp(m);
   const sprite=document.createElement('img');sprite.className='recovery-target-sprite';sprite.src=staticImage(m.dex,false);sprite.alt='';
   sprite.onerror=()=>{sprite.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+m.dex+'.png';sprite.onerror=()=>{sprite.hidden=true;};};
   const details=document.createElement('span');details.className='recovery-target-details';
   const name=document.createElement('strong');name.textContent=m.name+' Lv.'+m.level;
   const gauge=document.createElement('span');gauge.className='recovery-target-gauge';
   const fill=document.createElement('span');fill.className='recovery-target-gauge-fill';
   const exp=option.showExp,earned=m.starter?progress.exp:(m.exp||0),needed=m.level>=100?0:levelNeed(m.level);
   fill.style.width=(exp?(needed?100*earned/needed:100):100*hp/max)+'%';gauge.append(fill);
   if(exp)gauge.classList.add('exp-target-gauge');
   const status=document.createElement('span');status.className='recovery-target-count';
   status.textContent=exp?('EXP '+(m.level>=100?'MAX':earned+' / '+needed)):'HP '+hp+'/'+max+(hp===0?' · 기절':'');
   if(!exp&&hp===0)status.classList.add('recovery-target-fainted');
   if(option.tmStatus){
    const eligibility=document.createElement('span');
    eligibility.className='tm-target-status';
    eligibility.textContent=option.tmStatus;
    details.append(name,eligibility);
    button.append(sprite,details);
   }else{
    if(option.showHeldItems){
     const hpRow=document.createElement('span');hpRow.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;width:100%';
     const icons=document.createElement('span');icons.style.cssText='display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0';
     for(const id of HELD_ITEMS){
      const count=heldCount(id,m.key);if(!count)continue;
      const held=SHOP_ITEMS.find(i=>i.id===id);
      const slot=document.createElement('span');slot.style.cssText='display:inline-flex;align-items:center;gap:1px;position:relative';
      slot.title=(held?.name||id)+' '+count+'개';
      const icon=document.createElement('img');icon.src=itemSpriteUrl(id);icon.alt=held?.name||id;icon.width=20;icon.height=20;icon.style.cssText='width:20px;height:20px;object-fit:contain;image-rendering:pixelated';
      icon.onerror=()=>{icon.replaceWith(document.createTextNode(held?.icon||'🎒'));};
      slot.append(icon);
      if(count>1){const quantity=document.createElement('small');quantity.textContent=String(count);quantity.style.cssText='font-size:11px;font-weight:bold';slot.append(quantity);}
      icons.append(slot);
     }
     hpRow.append(status,icons);details.append(name,gauge,hpRow);
    }else details.append(name,gauge,status);
    button.append(sprite,details);
   }
  }else button.textContent=option.text;
  button.disabled=option.disabled===true;
  if(button.disabled){button.style.opacity='0.45';button.style.cursor='not-allowed';if(option.reason)button.title=option.reason;}
  button.onclick=()=>{if(button.disabled)return;layer.remove();option.action?.();};target.append(button);
 }
 layer.hidden=false;
}
function showPartyManager(selectedKey=null,replacement=false){
 normalizeLivingLead();
 normalizeHeldItems();
 if(animating||learningBusy||pendingRewardChoice)return;
 const members=teamMembers(),max=1+(inventory.partySlotA===1?1:0)+(inventory.partySlotA===1&&inventory.partySlotB===1?1:0);
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
  const nameRow=document.createElement('div');nameRow.className='party-summary-name-row';nameRow.append(name);
  for(const id of HELD_ITEMS){
   if(!hasHeld(id,m.key))continue;
   const item=SHOP_ITEMS.find(x=>x.id===id);if(!item)continue;
   const heldIcon=document.createElement('img');heldIcon.className='party-summary-held-icon';heldIcon.src=itemSpriteUrl(id);heldIcon.alt=item.name;heldIcon.title=item.name+(STACKABLE_HELD_ITEMS.includes(id)?' '+heldCount(id,m.key)+'개':'');heldIcon.loading='lazy';
   heldIcon.onerror=()=>{const fallback=document.createElement('span');fallback.className='party-summary-held-icon';fallback.textContent=item.icon||'🎁';fallback.title=item.name;heldIcon.replaceWith(fallback);};
   nameRow.append(heldIcon);
   if(STACKABLE_HELD_ITEMS.includes(id)&&heldCount(id,m.key)>1){
    const quantity=document.createElement('small');quantity.textContent=String(heldCount(id,m.key));quantity.title=item.name+' 장착 수량';quantity.style.cssText='font-size:11px;font-weight:bold;margin-left:-4px';nameRow.append(quantity);
   }
  }
  const meter=(label,current,total,type)=>{const row=document.createElement('div');row.className='party-summary-meter';
   const tag=document.createElement('b');tag.textContent=label;
   const track=document.createElement('div');track.className='party-summary-track '+type;
   const fill=document.createElement('div');fill.className='party-summary-fill';fill.style.width=Math.max(0,Math.min(100,total?100*current/total:0))+'%';
   if(type==='hp'&&current/total<=.2)fill.classList.add('low');else if(type==='hp'&&current/total<=.5)fill.classList.add('mid');
   track.append(fill);
   const count=document.createElement('span');count.className='party-summary-meter-count';count.textContent=type==='hp'?current+' / '+total:(m.level>=100?'MAX':current+' / '+total);
   row.append(tag,track,count);return row;};
  const xp=m.starter?progress.exp:m.exp||0;
  data.append(nameRow,meter('HP',hp,maxHp,'hp'),meter('EXP',xp,m.level>=100?1:levelNeed(m.level),'exp'));
  if(hp===0){const faint=document.createElement('small');faint.textContent='기절';data.append(faint);}
  button.append(pic,data);
  button.onclick=()=>showPartyManager(m.key,replacement);cards.append(button);
 }
 const m=selected,ivs=m.starter?playerIVs:m.ivs,evs=m.starter?playerEVs:m.evs||{};
 const stats=calculateStats(memberBase(m),m.level,ivs,evs);
 const itemMultipliers=permanentItemStatMultipliers(m);
 const heading=document.createElement('strong');heading.className='party-summary-detail-heading';heading.textContent=m.name+'의 정보';
 details.append(heading);
 const infoGrid=document.createElement('div');infoGrid.className='party-summary-statgrid';
 for(const stat of STAT_KEYS){
  const tile=document.createElement('div');tile.className='party-summary-stat';
  const head=document.createElement('div');head.className='party-summary-stat-head';
  const label=document.createElement('b');label.textContent=STAT_LABELS[stat];
  const iv=document.createElement('span');iv.className='iv-star iv-'+ivTier(ivs[stat]);iv.textContent='★';iv.title='개체값 '+ivs[stat];iv.setAttribute('aria-label','개체값 '+ivs[stat]);
  head.append(label,iv);
  const base=stats[stat],effective=Math.floor(base*itemMultipliers[stat]),bonus=effective-base;
  const value=document.createElement('strong');value.className='party-summary-stat-value';value.textContent=String(effective);
  if(bonus>0){
   const extra=document.createElement('span');extra.textContent=' (+'+bonus+')';
   extra.style.cssText='font-size:0.72em;color:#16a34a;font-weight:700;white-space:nowrap';
   extra.title='기본 능력치 '+base+' + 아이템 효과 '+bonus;
   value.append(extra);
  }
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
  cell.onclick=()=>partyOverlay(move.name,moveDescription(id),[{text:'확인',action:()=>showPartyManager(m.key)}]);
  moves.append(cell);
 }
 details.append(moves);
 const lead=document.createElement('button');lead.type='button';lead.className='party-summary-lead';lead.textContent=replacement?(memberHp(m)<=0?'기절한 포켓몬은 출전 불가':'너로 정했다!'):(m.key===members[0].key?'현재 선봉':memberHp(m)<=0?'기절한 포켓몬은 선봉 불가':'이 포켓몬을 선봉으로');
 lead.disabled=memberHp(m)<=0||(!replacement&&m.key===members[0].key);
 lead.onclick=()=>{if(replacement){overlay.remove();sendOutReplacement(m);}else{partyOrder=[m.key,...members.filter(x=>x.key!==m.key).map(x=>x.key)];saveProgress();renderHome();showPartyManager(m.key);}};
 details.append(lead);
 panel.append(title,cards,details,footer);overlay.append(panel);document.body.append(overlay);footer.focus();
}
async function playSwitchBallAnimation(onArrive,recall=false){
 const arena=document.querySelector('#battleScreen .arena');
 const playerSprite=document.querySelector('#battleScreen .sprite.player');
 if(!arena||!playerSprite){onArrive();return;}
 const ball=document.createElement('img');
 ball.className='replacement-pokeball';ball.alt='';ball.setAttribute('aria-hidden','true');
 ball.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
 playerSprite.classList.remove('party-fainted','party-entering','party-recalling');
 try{
  if(recall){playerSprite.classList.add('party-recalling');await pause(270);}
  playerSprite.classList.add('party-sprite-hidden');
  arena.append(ball);
  void ball.offsetWidth;
  ball.classList.add('replacement-pokeball-throw');
  await pause(570);
  onArrive();
  ball.classList.add('replacement-pokeball-open');
  playerSprite.classList.remove('party-sprite-hidden','party-recalling');
  playerSprite.classList.add('party-entering');
  await pause(440);
 }finally{
  ball.remove();
  playerSprite.classList.remove('party-recalling','party-sprite-hidden','party-entering');
 }
}
async function playEnemyReplacementAnimation(onArrive){
 const arena=document.querySelector('#battleScreen .arena');
 const enemySprite=document.querySelector('#battleScreen .sprite.enemy');
 if(!arena||!enemySprite){onArrive();return;}
 const ball=document.createElement('img');
 ball.className='replacement-pokeball enemy-replacement-pokeball';
 ball.alt='';ball.setAttribute('aria-hidden','true');
 ball.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
 try{
  enemySprite.classList.remove('party-entering','party-fainted');
  enemySprite.classList.add('party-fainted');
  await pause(500);
  enemySprite.classList.add('party-sprite-hidden');
  enemySprite.classList.remove('party-fainted');
  arena.append(ball);
  void ball.offsetWidth;
  ball.classList.add('replacement-pokeball-throw');
  await pause(570);
  onArrive();
  ball.classList.add('replacement-pokeball-open');
  enemySprite.classList.remove('party-sprite-hidden');
  enemySprite.classList.add('party-entering');
  await pause(440);
 }finally{
  ball.remove();
  enemySprite.classList.remove('party-fainted','party-sprite-hidden','party-entering');
 }
}
async function sendOutReplacement(m){
 if(!battle||memberHp(m)<=0||battle.ended||animating)return;
 animating=true;
 try{
  await playSwitchBallAnimation(()=>{
   chooseActiveMember(m);
   battle.player=battleRoster.get(m.key)||makeMemberFighter(m);
   // A revived member can have a stale fainted fighter in battleRoster.
   battle.player.hp=memberHp(m);
   battleRoster.set(m.key,battle.player);
   battle.ended=false;battle.result=null;
   updateBattlePlayerHeader();
   battle.log.push('🔴 '+m.name+'! 너로 정했다!');
   render();
  });
  saveProgress();
 }finally{animating=false;render();showMenu('main');}
}
function offerCapturedCompanion(){
 const family=teamFamily(wildEnemy.dex);
 const limit=1+(inventory.partySlotA===1?1:0)+(inventory.partySlotA===1&&inventory.partySlotB===1?1:0);
 const unlocked=inventory.partySlotA===1;
 const duplicateMessage='같은 포켓몬 종류를 2마리 이상 데리고 다닐 수 없습니다!\n도감 기록은 유지됩니다.';
 const recruit=replaceIndex=>{
  const member={family,name:wildEnemy.name,dex:wildEnemy.dex,level:wildEnemy.level,exp:0,ivs:randomIVs(),evs:{hp:0,attack:0,defense:0,speed:0},moves:recentWildMoves(wildEnemy.dex,wildEnemy.level),hp:null};
  let inherited=null;
  if(replaceIndex===null)companions.push(member);
  else{
   const old=companions[replaceIndex],oldKey='companion-'+old.family,newKey='companion-'+member.family;
   if(old.dex===18&&member.dex!==18)earnAchievement('abandonPidgeot');
   const ids=HELD_ITEMS.filter(id=>hasHeld(id,oldKey));
   for(const id of ids)battleItemHolders[id]=battleItemHolders[id].map(k=>k===oldKey?newKey:k);
   if(ids.length)inherited=member.name+'이(가) '+old.name+'의 '+ids.map(id=>SHOP_ITEMS.find(i=>i.id===id).name).join(', ')+'을(를) 이어받았다!';
   companions.splice(replaceIndex,1,member);
  }
  partyOrder=teamMembers().map(m=>m.key);normalizeHeldItems();
  saveProgress();renderHome();
  partyOverlay(inherited?'아이템 승계':'동료 합류!',inherited||member.name+' Lv.'+member.level+'이(가) 동료가 됐어!',[{text:'확인'}]);
 };
 const chooseReplacement=()=>{
  partyOverlay('동료 교체','교체하면 기존 동료는 영구 삭제돼.',[
   ...companions.map((m,i)=>({text:m.name+' Lv.'+m.level+'과 교체',action:()=>{
    const stillDuplicated=teamMembers().some(other=>other.starter?teamFamily(other.dex)===family:other.family===family&&other.family!==m.family);
    if(stillDuplicated){
     partyOverlay('동료 교체 불가',duplicateMessage,[{text:'확인',action:chooseReplacement}]);
     return;
    }
    partyOverlay('정말 교체할까?',m.name+'을(를) 영구 삭제하고 '+wildEnemy.name+'을(를) 영입할까?',[
     {text:'교체 확정',action:()=>recruit(i)},{text:'취소',action:chooseReplacement}
    ]);
   }})),
   {text:'뒤로가기',action:showCaptureChoice}
  ]);
 };
 const showCaptureChoice=()=>partyOverlay('🔴 포획 성공!',wildEnemy.name+' Lv.'+wildEnemy.level+(unlocked?'을(를) 동료로 영입할까?':'을(를) 잡았어! 동료 영입은 추가 슬롯A를 해금한 뒤 가능해.'),[
  {text:'동료로 영입',disabled:!unlocked,reason:'포켓몬 추가 슬롯A 해금 필요',action:()=>{
   const hasSameFamily=teamMembers().some(m=>m.starter?teamFamily(m.dex)===family:m.family===family);
   if(!hasSameFamily&&1+companions.length<limit){recruit(null);return;}
   if(!companions.length){partyOverlay('동료 교체 불가',duplicateMessage,[{text:'확인',action:()=>{}}]);return;}
   chooseReplacement();
  }},
  {text:'도감에만 등록',action:()=>{}}
 ]);
 showCaptureChoice();
}
function checkPartyTypeAchievements(){
 // Credit pre-existing cleared saves and archived champion records, too.
 if(['rocketApollo','rocketAthena','rocketGiovanni'].every(kind=>trainerClears[kind]))earnAchievement('rocketFan');
 if(hallOfFameEntries('first').some(record=>Array.isArray(record.party)&&record.party.some(m=>m.dex===25)&&!record.party.some(m=>m.dex===26)))earnAchievement('ashPikachu');
 const members=teamMembers();
 if(members.length!==3)return;
 if(members.every(m=>FLYING_TYPE_DEX.has(m.dex)))earnAchievement('flyingTrainer');
 if(members.every(m=>GRASS_TYPE_DEX.has(m.dex)))earnAchievement('botanist');
 if(members.every(m=>BUG_TYPE_DEX.has(m.dex)))earnAchievement('bugLover');
 if(members.every(m=>[6,142,149,130].includes(m.dex)))earnAchievement('dragonTrainer');
}
function renderHome(){
 normalizeHeldItems();
 checkPartyTypeAchievements();
 showNextAchievement();
 // Sea has no trainer challenge: advance after reaching Lv.48 through any level-up source.
 // Finish selecting an earned reward first so the transition cannot discard it.
 if(area==='sea'&&sabrinaCleared&&!blaineCleared&&teamMembers().some(m=>m.level>=48)&&!pendingRewardChoice&&!volcanoAutoVisited){
  area='volcano';
  volcanoAutoVisited=true;
  appendAdventureLog('🌋 Lv.48 달성! 화산 지역이 개방되어 바다에서 화산으로 자동 이동했어.');
  saveProgress();
 }
 normalizeLivingLead();
 renderAdventureLog();
 if(leagueStage!==null){renderLeague();return;}
 refreshHealingDay();renderPowerStatus();refreshLevelCapIndicator();
 $('currentArea').textContent=area==='grass'?'🌿 시작의 초원':area==='forest'?'🌳 상록숲':area==='cave'?'🪨 달맞이 동굴':area==='lake'?'💧 호수공원':area==='cemetery'?'🪦 공동묘지':area==='town'?'🏘️ 무지개시티':area==='road'?'🛣️ 자전거도로':area==='city'?'🏙️ 노랑시티':area==='sea'?'🌊 바다':area==='volcano'?'🌋 화산':area==='strangeForest'?'🌲 이상한 숲':area==='championRoad'?'🏔️ 챔피언로드':area==='championRoad2'?'🏛️ 석영고원':area==='palletTown'?'🏠 태초마을':area==='rocketBase'?'🚀 로켓단 비밀기지':area==='farawayIsland'?'🏝️ 환상의 섬':'🏔️ 은빛산';
 $('homeSpriteWrap').classList.remove('area-grass','area-forest','area-cave','area-lake','area-cemetery','area-town','area-road','area-city','area-sea','area-volcano','area-strangeForest','area-championRoad','area-championRoad2','area-palletTown','area-rocketBase','area-farawayIsland','area-mountSilver');
 $('homeSpriteWrap').classList.add('area-'+area);
 $('badgeStatus').textContent='배지 '+(giovanniCleared?8:blaineCleared?7:sabrinaCleared?6:kogaCleared?5:erikaCleared?4:surgeCleared?3:mistyCleared?2:brockCleared?1:0)+' / 8';
 const trainerKind=nextTrainerKind();
 const finalArea=!trainerKind;
 const targetLevel=trainerKind?TRAINERS[trainerKind].level:0;
 const unlocked=teamMembers().some(m=>m.level>=targetLevel);
 const currentRegionKinds=REGION_TRAINERS[area]||[];
 const regionHasChallenge=currentRegionKinds.includes(trainerKind)&&(area===latestMapRegion()||(area==='city'&&trainerKind==='greenFourth'));
 const challengeDisabled=!livingMembers().length||!!pendingRewardChoice||!unlocked||finalArea||!regionHasChallenge;
 // Champion Road 2 has the Pokémon League instead of a trainer/gym challenge.
 $('trainerChallenge').hidden=(area==='championRoad2'&&!currentRunLeagueWon)||(area==='mountSilver'&&currentRunLeagueWon&&redHallOfFame.length===0);
 $('trainerChallenge').disabled=area==='championRoad2'||(currentRunLeagueWon?false:challengeDisabled);
 const redButton=$('redChallenge');
 redButton.hidden=area!=='mountSilver'||!currentRunLeagueWon||redHallOfFame.length>0;
 redButton.disabled=progress.level<90||!livingMembers().length||!!pendingRewardChoice||animating;
 $('redChallengeNote').textContent=progress.level<90?'Lv.90에 해금':!livingMembers().length?'포켓몬 센터 이용 후 도전':pendingRewardChoice?'보상 선택 후 도전':'피카츄 Lv.99 외 5마리';
 $('trainerButtonTitle').textContent=currentRunLeagueWon?'🗺️ 지역 이동':'도전';
 $('leagueEnter').hidden=area!=='championRoad2'||currentRunLeagueWon;
 $('leagueEnter').disabled=area!=='championRoad2'||currentRunLeagueWon||progress.level<67||!livingMembers().length||!!pendingRewardChoice;
 $('leagueRecords').hidden=false; // Always show both Hall of Fame tabs, even before first victory.
 $('trainerChallenge').classList.toggle('adventure-ready',currentRunLeagueWon||unlocked&&!challengeDisabled);
 $('trainerChallenge').classList.toggle('adventure-locked',!currentRunLeagueWon&&(!unlocked||finalArea));
 if(!currentRunLeagueWon)$('trainerButtonTitle').textContent=!regionHasChallenge?'🏅 현재 지역 도전 완료':finalArea?'🏅 관장 도전 완료':trainerKind==='blue'||trainerKind==='greenReturn'||trainerKind==='greenThird'||trainerKind==='greenFourth'||trainerKind==='greenFifth'?'⚔ 그린에게 도전':trainerKind==='brock'?'🪨 웅에게 도전':trainerKind==='misty'?'💧 이슬이에게 도전':trainerKind==='erika'?'🌸 민화에게 도전':trainerKind==='koga'?'☠️ 독수에게 도전':trainerKind==='sabrina'?'🔮 초련에게 도전':trainerKind==='giovanni'?'🌍 비주기에게 도전':trainerKind==='blaine'?'🔥 강연에게 도전':'⚡ 마티즈에게 도전';
 $('trainerButtonNote').textContent=currentRunLeagueWon?'지역 이동 버튼에서 선택':!regionHasChallenge?'도전하려면 최신 지역 '+(mapRegion(latestMapRegion())?.[1]||'')+'(으)로 돌아가야 합니다.':finalArea?(area==='championRoad2'?'석영고원 탐험':'관장 도전 완료'):!unlocked?'Lv.'+targetLevel+'에 해금':!livingMembers().length?'치료 후 재도전':pendingRewardChoice?'보상 선택 후 도전':trainerKind==='greenFifth'?'승리하면 석영고원 개방':trainerKind==='misty'?'승리하면 호수공원 개방':(trainerKind==='greenReturn'||trainerKind==='greenFourth')?'승리해도 지역은 그대로':trainerKind==='greenThird'?'승리하면 무지개시티 개방':trainerKind==='erika'?'승리하면 자전거도로 개방':trainerKind==='koga'?'승리하면 노랑시티 개방':trainerKind==='giovanni'?'승리하면 챔피언로드 개방':trainerKind==='blaine'?'승리하면 이상한 숲 개방':trainerKind==='sabrina'?'승리하면 바다 개방':trainerKind==='surge'?'승리하면 공동묘지 개방':'승리하면 '+(trainerKind==='blue'?'숲':'동굴')+' 개방';
 if(area==='rocketBase'&&currentRunLeagueWon){
  const rocketKind=nextRocketTrainerKind();
  const rocketTrainer=rocketKind?TRAINERS[rocketKind]:null;
  const rocketLevelReady=!!rocketTrainer&&teamMembers().some(m=>m.level>=rocketTrainer.level);
  $('trainerChallenge').hidden=false;
  $('trainerChallenge').disabled=!rocketTrainer||!rocketLevelReady||!livingMembers().length||!!pendingRewardChoice||animating||learningBusy;
  $('trainerButtonTitle').textContent=rocketTrainer?'⚔ '+({rocketApollo:'아폴로',rocketAthena:'아테나',rocketGiovanni:'비주기'}[rocketKind]||rocketTrainer.name)+'에게 도전':'🏆 로켓단 보스 격파 완료';
  $('trainerButtonNote').textContent=!rocketTrainer?'비밀기지 보스 모두 클리어':!rocketLevelReady?'Lv.'+rocketTrainer.level+' 이상일 때 도전 가능':!livingMembers().length?'포켓몬 센터 이용 후 도전':pendingRewardChoice?'보상 선택 후 도전':'승리해도 현재 지역 유지';
  $('trainerChallenge').classList.toggle('adventure-ready',!!rocketTrainer&&rocketLevelReady);
  $('trainerChallenge').classList.toggle('adventure-locked',!rocketTrainer||!rocketLevelReady);
 }
 $('injuryStatus').hidden=!!livingMembers().length;
 $('injuryBandage').hidden=!!livingMembers().length;
 $('healButton').hidden=false;
 $('healButton').setAttribute('aria-disabled','false');
 $('healButtonNote').textContent=freeHealsUsed<10?'무료 '+(10-freeHealsUsed)+'/10회 남음':'유료';
 $('startBattle').disabled=!livingMembers().length||!!pendingRewardChoice;
 const leader=leaderMember(),s=STARTERS.find(x=>x.id===chosen),form=leader.starter?getForm(chosen,progress.level):{dex:leader.dex,name:leader.name};
 $('homeName').textContent=leader.name;$('homeLevel').textContent='LV '+leader.level;
 $('homeMoney').textContent='💰 '+progress.money.toLocaleString('ko-KR')+'원';
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
}
function showBattleActionMessage(title,detail=''){
 const titleNode=$('battleActionTitle'),detailNode=$('battleActionDetail');
 if(!titleNode||!detailNode)return;
 titleNode.textContent=title;
 detailNode.textContent=detail;
}
function renderBattleStatus(side,fighter){
 const statusElement=$(side+'Status');
 if(!statusElement||!fighter)return;
 // During event playback the battle engine has already simulated the entire turn.
 // Show the pre-turn snapshot until a matching event is animated.
 const visible=battleEffectDisplay?.[side];
 const status=visible?visible.status:fighter.status?.type;
 const confused=visible?visible.confused:fighter.confusionTurns>0;
 statusElement.textContent=status==='paralysis'?'⚡ 마비':status==='sleep'?'💤 수면':status==='poison'?'☠ 독':status==='burn'?'🔥 화상':status==='freeze'?'❄️ 얼음':'';
 if(confused){
  const chip=document.createElement('span');chip.textContent=' 🌀 혼란';
  chip.style.cssText='color:#bf581c;background:#ffdfc8;border-radius:6px;padding:2px 5px;margin-left:5px';
  statusElement.append(chip);
 }
 statusElement.style.color=status==='burn'?'#c75e32':status==='freeze'?'#278ac9':status==='poison'?'#985ac0':status==='sleep'?'#438fe1':status==='paralysis'?'#b98906':'';
}
// Battle actions resolve before their animations play. Preserve the pre-action
// equipment display until each consumable's healing animation finishes.
let heldIconTimeline=null;
function renderEnemyHeldItems(enemy){
 const host=$('enemyHeldItemIcons');if(!host)return;
 host.replaceChildren();
 const visibleEnemy=heldIconTimeline?.enemy===enemy?heldIconTimeline.enemyDisplay:enemy;
 if(!visibleEnemy?.heldItemCounts)return;
 for(const [id,quantity] of Object.entries(visibleEnemy.heldItemCounts)){
  if(quantity<=0||(id==='oranBerry'&&!visibleEnemy.oranBerryEnabled)||(id==='sitrusBerry'&&!visibleEnemy.sitrusBerryEnabled)||(id==='revivalSeed'&&visibleEnemy.revivalSeedUsed)||(id==='lightBall'&&![172,25,26].includes(enemy.dex))||(id==='thickClub'&&![104,105].includes(enemy.dex))||(id==='charcoal'&&!FIRE_TYPE_DEX.has(enemy.dex))||(id==='miracleSeed'&&!GRASS_TYPE_DEX.has(enemy.dex))||(id==='mysticWater'&&!WATER_TYPE_DEX.has(enemy.dex))||(id==='silverPowder'&&!BUG_TYPE_DEX.has(enemy.dex))||(id==='sharpBeak'&&!FLYING_TYPE_DEX.has(enemy.dex))||(id==='magnet'&&!ELECTRIC_TYPE_DEX.has(enemy.dex)))continue;
  const item=SHOP_ITEMS.find(entry=>entry.id===id);
  if(!item)continue;
  const el=document.createElement('span');el.className='player-held-item-icon';el.style.position='relative';
  const img=document.createElement('img');img.src=itemSpriteUrl(id);img.alt='';img.width=16;img.height=16;
  img.onerror=()=>{el.textContent=item.icon||'?';};
  el.append(img);
  if(quantity>1){const count=document.createElement('small');count.className='held-item-quantity';count.textContent=String(quantity);count.style.cssText='position:absolute;right:-5px;bottom:-5px;font-size:10px;line-height:12px;font-weight:900;background:#fff;color:#263e59;border-radius:3px;min-width:10px;text-align:center';el.append(count);}
  el.title=item.name+(quantity>1?' '+quantity+'개':'');host.append(el);
 }
}
function render(){const heldHost=$('playerHeldItemIcons');if(heldHost){heldHost.replaceChildren();for(const id of HELD_ITEMS){const shownHeldCount=heldIconTimeline?.playerKey===activeBattleKey?heldIconTimeline.playerCounts[id]||0:heldCount(id,activeBattleKey);if(!activeBattleKey||shownHeldCount<=0)continue;const item=SHOP_ITEMS.find(x=>x.id===id);if(!item)continue;const el=document.createElement('span');el.className='player-held-item-icon';const img=document.createElement('img');img.src=itemSpriteUrl(id);img.alt='';img.width=16;img.height=16;img.onerror=()=>{el.textContent=item.icon||'?';};el.append(img);if(STACKABLE_HELD_ITEMS.includes(id)&&heldCount(id,activeBattleKey)>1){const count=document.createElement('small');count.className='held-item-quantity';count.textContent=String(heldCount(id,activeBattleKey));count.style.cssText='position:absolute;right:-5px;bottom:-5px;font-size:10px;line-height:12px;font-weight:900;background:#fff;color:#263e59;border-radius:3px;min-width:10px;text-align:center';el.style.position='relative';el.append(count);}el.title=item.name+(STACKABLE_HELD_ITEMS.includes(id)?' '+heldCount(id,activeBattleKey)+'개':'');heldHost.append(el);}for(const [id,dexes] of [['lightBall',[172,25,26]],['thickClub',[104,105]],['charcoal',FIRE_TYPE_DEX],['miracleSeed',GRASS_TYPE_DEX],['mysticWater',WATER_TYPE_DEX],['silverPowder',BUG_TYPE_DEX],['sharpBeak',FLYING_TYPE_DEX],['magnet',ELECTRIC_TYPE_DEX]]){if(!inventory[id]||!(dexes instanceof Set?dexes.has(battle.player?.dex):dexes.includes(battle.player?.dex)))continue;const item=SHOP_ITEMS.find(x=>x.id===id);if(!item)continue;const el=document.createElement('span');el.className='player-held-item-icon';const img=document.createElement('img');img.src=itemSpriteUrl(id);img.alt='';img.width=16;img.height=16;img.onerror=()=>{el.textContent=item.icon||'?';};el.append(img);el.title=item.name+' · 중요 아이템 보유 효과';heldHost.append(el);}}renderPowerStatus();renderBattleEffects();const switchButton=$('commandSwitch');if(switchButton)switchButton.disabled=animating||battle.ended||teamMembers().filter(m=>m.key!==activeBattleKey&&memberHp(m)>0).length===0;const p=battle.player,e=animatingEnemy??battle.enemies[battle.enemyIndex]??battle.enemies.at(-1);renderEnemyHeldItems(e);
 $('commandFight').disabled=animating||battle.ended;
 $('commandBall').disabled=animating||battle.ended||!battle.wild;
 $('commandHeal').disabled=animating||battle.ended;
 $('commandRun').disabled=animating||battle.ended||!battle.wild;
 for(const item of SHOP_ITEMS){
  const el=$('battleItem-'+item.id);
  if(!el)continue; // Key items don't have battle buttons.
  el.disabled=animating||battle.ended||inventory[item.id]<1||(item.category==='heal'&&item.id!=='revive'&&!battleHealingTargets().length)||(item.id==='revive'&&!teamMembers().some(m=>m.key!==activeBattleKey&&memberHp(m)===0))||(item.category==='ball'&&!battle.wild);
  const counter=el.querySelector('.item-count');if(counter)counter.textContent='×'+inventory[item.id];
 }

 if(battle.ended&&!animating)showMenu('main');for(const [f,prefix] of [[p,'player'],[e,'enemy']]){displayHp(prefix,animating?shownHp[prefix]:f.hp);renderBattleStatus(prefix,f);}
$('turn').textContent=battle.ended&&!animating?(battle.result==='victory'?'WIN!':'LOSE!'):'TURN '+String(battle.turn+1).padStart(2,'0');
$('moves').replaceChildren(...p.moveIds.map(id=>{const m=MOVES[id],b=document.createElement('button');const remaining=m.pp?(p.pp?.[id]??m.pp):null;b.disabled=animating||battle.ended||(remaining!==null&&remaining<=0);const baseDescription=m.hpScale==='currentRatio'?'위력 --':m.power?'위력 '+m.power:'변화기';const hitRate=m.target==='self'||!Number.isFinite(m.accuracy)?'':' · 명중 '+Math.round(m.accuracy*100)+'%';const description=baseDescription+hitRate;b.innerHTML='<span class="move-name">'+m.name+'</span><span class="move-pp">'+description+(remaining===null?'':' · PP '+remaining+'/'+m.pp)+'</span>';b.addEventListener('click',()=>act({moveId:id}));return b;}),...(p.moveIds.every(id=>MOVES[id].pp&&(p.pp?.[id]??MOVES[id].pp)<=0)?[(()=>{const b=document.createElement('button');b.disabled=animating||battle.ended;b.textContent='발버둥 · PP 없음';b.addEventListener('click',()=>act({moveId:'struggle'}));return b;})()]:[]));$('log').replaceChildren(...battle.log.slice(-15).reverse().map(line=>{const t=document.createElement('p');t.textContent=line;return t;}));renderStatPanel();}
async function act(a){
 if(animating||battle.ended||learningBusy)return;
 let learnQueue=[];
 let needsReplacement=false;
 const previousHp={player:battle.player.hp,enemy:(battle.enemies[battle.enemyIndex]??battle.enemies.at(-1)).hp};
 animatingEnemy=battle.enemies[battle.enemyIndex];
 heldIconTimeline={
  playerKey:activeBattleKey,
  playerCounts:Object.fromEntries(HELD_ITEMS.map(id=>[id,heldCount(id,activeBattleKey)])),
  enemy:animatingEnemy,
  enemyDisplay:animatingEnemy?{
   ...animatingEnemy,heldItemCounts:{...(animatingEnemy.heldItemCounts||{})}
  }:null
 };
 try{
  animating=true;
  // Consume one item only after the engine accepts the player's turn.
  // Each completed battle turn consumes one boost turn, including capture/item turns.
  const m=activeMember();
  battle.player.attackBuffMultiplier=attackItemMultiplier(m)+0.2*boostCount('attack');
  battle.player.speedBuffMultiplier=1+magnetSpeedBonus(m);
  battle.player.wideLensAccuracyBuff=0.05*heldCount('wideLens',m.key); battle.player.accuracyBuff=0.1*boostCount('accuracy')+battle.player.wideLensAccuracyBuff+(grassSeedBonus(m)?0.05:0);
  battle.player.quickClawCount=heldCount('quickClaw',m.key);
  battle.player.focusSashChance=0.05*heldCount('focusSash',m.key);battle.player.critBuff=0.15*boostCount('critical')+(0.04*heldCount('scopeLens',m.key));battle.player.shellBellCount=heldCount('shellBell',m.key);battle.player.leftoversCount=heldCount('leftovers',m.key);battle.player.shellBell=battle.player.shellBellCount>0;battle.player.leftoversEnabled=battle.player.leftoversCount>0;
  battle.player.defenseBuffMultiplier=1+0.2*boostCount('defense')+(grassSeedBonus(m)?0.1:0)+(waterDropBonus(m)?0.10:0)+(bugPowderBonus(m)?0.15:0)+(EVOLVABLE_DEX.has(m.dex)?0.13*heldCount('eviolite',m.key):0);
  if(a.type==='revive'){
   const target=teamMembers().find(m=>m.key===a.targetKey);
   if(!target||target.key===activeBattleKey||!reviveMember(target))return;
  }
  if(a.type==='healAlly'){
   const target=teamMembers().find(m=>m.key===a.targetKey);
   if(!target||target.key===activeBattleKey||memberHp(target)<=0||memberHp(target)>=memberMaxHp(target)||inventory[a.itemId]<1)return;
   const before=memberHp(target),hp=Math.min(memberMaxHp(target),before+a.power);
   // Inactive starter HP lives in storedHp, not companions.
   // Use the common setter so healing either party member advances the turn.
   setMemberHp(target,hp);
   appendAdventureLog('💊 '+target.name+' HP '+before+' → '+hp);
  }
  if(a.type==='ball')lastCaptureBall=a.itemId;battleEffectDisplay=snapshotBattleEffects();takeTurn(battle,a);
  // The engine now revives either side immediately after the lethal action.
  // Consume the player's held seed once, without cancelling the opponent's turn.
  if(battle.events.some(ev=>ev.type==='heal'&&ev.side==='player'&&ev.heldItem==='oranBerry')){
   inventory.oranBerry=Math.max(0,inventory.oranBerry-1);
   const berryIndex=battleItemHolders.oranBerry.indexOf(activeBattleKey);
   if(berryIndex>=0)battleItemHolders.oranBerry.splice(berryIndex,1);
   appendAdventureLog('🍊 '+activeMember().name+' 오랭열매 발동!');
  }
  if(battle.events.some(ev=>ev.type==='heal'&&ev.side==='player'&&ev.heldItem==='sitrusBerry')){
   inventory.sitrusBerry=Math.max(0,inventory.sitrusBerry-1);
   const berryIndex=battleItemHolders.sitrusBerry.indexOf(activeBattleKey);
   if(berryIndex>=0)battleItemHolders.sitrusBerry.splice(berryIndex,1);
   appendAdventureLog('🍊 '+activeMember().name+' 자뭉열매 발동!');
  }
  if(battle.events.some(ev=>ev.type==='heal'&&ev.side==='player'&&ev.heldItem==='revivalSeed')){
   inventory.revivalSeed=Math.max(0,inventory.revivalSeed-1);
   battleItemHolders.revivalSeed=battleItemHolders.revivalSeed.filter(key=>key!==activeBattleKey);
   appendAdventureLog('🌱 '+activeMember().name+' 부활의 씨앗 발동! HP 전부 회복');
  }
  if(a.type==='switch')updateBattlePlayerHeader();
  battleRoster.set(activeBattleKey,battle.player);
  
  if(battle.player.hp===0){
   // Fainting ends all stat stage modifiers; do not persist them on the cached fighter.
   resetFighterAfterFaint(battle.player);
   setActiveHp(0);
   // Revived reserve members must prevent an engine-level defeat on the active Pokemon's knockout.
   const survivingReserves=teamMembers().filter(m=>m.key!==activeBattleKey&&memberHp(m)>0);
   needsReplacement=survivingReserves.length>0;
   if(needsReplacement){
    // A double knockout against the final enemy is already a victory.
    if(battle.result!=='victory'){battle.ended=false;battle.result=null;}
    else needsReplacement=false;
   }else if(battle.result==='victory'){
    // Both sides lost their last Pokemon: no surviving ally means defeat.
    battle.ended=true;battle.result='defeat';
   }
  }
  tickBoosts();saveProgress();renderPowerStatus();
  if(a.type==='item'||a.type==='ball'||a.type==='revive'||a.type==='healAlly'){
   inventory[a.itemId]--;
   if(a.type==='revive'||a.type==='healAlly'||(a.type==='item'&&SHOP_ITEMS.some(i=>i.id===a.itemId&&i.category==='heal')))recordHealingItem();
   saveProgress();
  }

  const events=[...battle.events];
  if(battleKind!=='wild')for(const event of events)if(event.type==='knockout'&&event.side==='enemy'){
   const knocked=battle.enemies[event.enemyIndex];
   appendAdventureLog('⚔️ '+knocked.name+'을(를) 쓰러뜨렸다!');
   // Intermediate knockouts give no EXP. Only the last Pokemon awards EXP on victory.
   battleParticipants=new Set([activeBattleKey]);
  }
 if(battleKind!=='wild'){
  for(const event of events){if(event.type==='knockout'&&event.side==='enemy'){
   defeatedEnemies++;
  }}
 }
 shownHp={...previousHp};render();await playEvents(events);
 // Only reveal the battle outcome and reset the command menu after animations finish.
 if(battle.ended)showMenu('main');
 // Transform is only a battle appearance. Restore original sprites at its end.
 if(battle.ended){
  if(battle.player.transformDex){$('playerSprite').style.filter='';sprite('playerSprite',activeMember().dex,true,'⚔️');}
  const endingEnemy=animatingEnemy??battle.enemies[battle.enemyIndex]??battle.enemies.at(-1);
  if(endingEnemy?.transformDex){$('enemySprite').style.filter='';sprite('enemySprite',endingEnemy.dex||Number(endingEnemy.id?.replace(/^(wild|trainer|companion)-/,'')),false,'⚔️');}
 }
 battleEffectDisplay=null;renderBattleEffects();
 animatingEnemy=null; // Only now may the next trainer Pokémon's max HP appear.
 if(needsReplacement){const playerSprite=document.querySelector('#battleScreen .sprite.player');if(playerSprite){playerSprite.classList.add('party-fainted');await pause(500);}}
 if(battleKind!=='wild'&&events.some(ev=>ev.type==='knockout'&&ev.side==='enemy')&&!battle.ended){
  const enemy=battle.enemies[battle.enemyIndex];
  // Every trainer, including Elite Four, champion, Rocket bosses and Red:
  // a Pokemon is discovered only when it actually appears.
  await playEnemyReplacementAnimation(()=>{
   registerEncounter(enemy.dex);
   $('enemyName').textContent=enemy.name;$('enemyLevel').textContent='LV '+enemy.level;
   sprite('enemySprite',enemy.id.startsWith('trainer-')?Number(enemy.id.slice(8)):rivalForm(blueChoice,7).dex,false,'⚔️');
   shownHp.enemy=enemy.hp;displayHp('enemy',enemy.hp);renderEnemyHeldItems(enemy);
  });
 }
  if(battle.ended){
    battleRoster.set(activeBattleKey,battle.player);
    if(battle.result==='victory'&&battleKind==='wild'){achievementData.wildWins++;saveAchievements();if(achievementData.wildWins>=1000)earnAchievement('wild1000');}if(battle.result==='victory'&&battleKind==='wild')appendAdventureLog('⚔️ '+wildEnemy.name+'을(를) 쓰러뜨렸다!');
    if(battle.result==='capture'){
      // Catching is not a battle victory: never open a choice reward.
      pendingRewardChoice=null;
      capturedPokemon.push({name:wildEnemy.name,dex:wildEnemy.dex,level:wildEnemy.level});
      caughtSpecies.add(wildEnemy.dex);recordCatchAchievement(wildEnemy.dex,lastCaptureBall);
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
    const currentMax=memberMaxHp(activeMember());
    const adjustedHp=hpBefore<=0?0:Math.min(currentMax,hpBefore+Math.max(0,currentMax-maxBefore));
    setActiveHp(adjustedHp);
    // Roll rewards ONLY after combat HP and post-EXP maximum HP have been
    // synchronized. Healing rewards must have zero weight when nobody needs HP.
    if(pendingRewardChoice&&!Array.isArray(pendingRewardChoice.choices)){
     pendingRewardChoice.choices=drawThreeRewards(
      battleKind==='wild'?wildEnemy.level:Math.max(...teamMembers().map(m=>m.level)),
      pendingRewardChoice.rewardCount??rewardChoiceCount(),
      pendingRewardChoice.gym
     );
     delete pendingRewardChoice.rewardCount;
    }
    saveProgress();
    // Party level-up animations are processed by processPartyGrowth.
    if(reward?.evolutions?.length)await showEvolutions(reward.evolutions);
    // Gym clear sequence: badge reveal first, then reward selection on the home screen.
    if(reward?.badgeEarned)await showBadgeAward(reward.badgeEarned);
    $('battleResult').hidden=false;
    $('resultTitle').textContent=battle.result==='victory'?'승리!':battle.result==='capture'?'포획 성공!':'패배!';
    if(battle.result==='defeat'){earnAchievement('firstLoss');injured=true;setActiveHp(0);appendAdventureLog('💥 모든 포켓몬 기절! 포켓몬 센터를 이용하자.');if(battleKind.startsWith('league'))leagueStage=null;saveProgress();}
    $('resultDetail').textContent=battle.result==='capture'?wildEnemy.name+' (Lv.'+wildEnemy.level+') 포획 완료! 포획 도감에 저장했어.':reward?.messages?.length?reward.messages.join('\n'):'경험치를 획득하지 못했어.';
    renderHome();
  }
 }catch(err){alert(err.message);console.error(err);}
 finally{
  battleEffectDisplay=null;animatingEnemy=null;heldIconTimeline=null;
  if(battle&&!battle.ended){setActiveHp(battle.player.hp);battleRoster.set(activeBattleKey,battle.player);saveProgress();}
  animating=false;
  render();
  if(needsReplacement&&!battle.ended){
   const candidates=teamMembers().filter(m=>m.key!==activeBattleKey&&memberHp(m)>0);
   partyOverlay('🔄 다음 포켓몬 선택','기절한 포켓몬을 대신해 출전할 포켓몬을 골라줘. 턴은 소모하지 않아.',[
    ...candidates.map(m=>({text:m.name+' Lv.'+m.level+' · HP '+memberHp(m)+'/'+memberMaxHp(m),action:()=>sendOutReplacement(m)}))
   ]);
  }
  if(battle.ended){
   resolvingBattleNotifications=true;
   try{
    showMenu('main');
    renderHome();showScreen(leagueStage===null?'home':'league');
    if(pendingPartyGrowth.length){const events=pendingPartyGrowth.splice(0);await processPartyGrowth(events);}
    if(pendingLevelUp){const levels=pendingLevelUp;pendingLevelUp=null;playHomeLevelUp(levels.previous,levels.current);}
    if(learnQueue.length)await processLearnQueue(learnQueue);
   }finally{resolvingBattleNotifications=false;}
   // Evolutions and move learning resolve first; then challenge unlock, then rewards.
   showChallengeUnlockNotice();
   if($('challengeUnlockOverlay').hidden)showRewardChoices();
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
 // Temporarily disabled: keep the button visible but do nothing.
 return;
}
const DEVELOPER_CLEAR_FLAGS=[
 ['blue','그린 1차'],['brock','웅'],['misty','이슬이'],['greenReturn','그린 2차'],
 ['surge','마티즈'],['greenThird','그린 3차'],['erika','민화'],['koga','독수'],
 ['greenFourth','그린 4차'],['sabrina','초련'],['blaine','강연'],['giovanni','비주기'],['greenFifth','그린 5차']
];
function developerClearValues(){
 return {blue:blueCleared,brock:brockCleared,misty:mistyCleared,greenReturn:greenReturnCleared,
  surge:surgeCleared,greenThird:greenThirdCleared,erika:erikaCleared,koga:kogaCleared,
  greenFourth:greenFourthCleared,sabrina:sabrinaCleared,blaine:blaineCleared,
  giovanni:giovanniCleared,greenFifth:greenFifthCleared};
}
function renderDeveloperClearFlags(){
 const list=$('developerClearFlags');
 list.replaceChildren();
 const current=developerClearValues();
 for(const [key,label] of DEVELOPER_CLEAR_FLAGS){
  const row=document.createElement('label');
  row.className='developer-clear-row';
  const checkbox=document.createElement('input');
  checkbox.type='checkbox';checkbox.value=key;checkbox.checked=current[key];
  checkbox.setAttribute('aria-label',label+' 클리어');
  const description=document.createElement('span');description.textContent=label;
  row.append(checkbox,description);list.append(row);
 }
}
function unlockDeveloper(e){
 e.preventDefault();
 if($('developerPassword').value!=='1646'){
  $('developerError').textContent='비밀번호가 올바르지 않아.';
  $('developerPassword').value='';$('developerPassword').focus();return;
 }
 $('developerError').textContent='';
 $('developerLogin').hidden=true;$('developerEditor').hidden=false;
 updateDeveloperPokemonOptions();
 $('developerMoney').value=String(progress.money);
 $('developerArea').value=area;
 renderDeveloperClearFlags();
 $('developerHallChoice').value='keep';
 updateDeveloperHallControls();
 $('developerLevel').focus();
}
function updateDeveloperPokemonOptions(){
 const picker=$('developerPokemon'),members=teamMembers();
 const previous=picker.value;
 picker.replaceChildren();
 for(const m of members){
  const option=document.createElement('option');
  option.value=m.key;
  option.textContent=m.name+' · Lv.'+m.level+(m.starter?' (스타팅)':'');
  picker.append(option);
 }
 picker.value=members.some(m=>m.key===previous)?previous:'starter';
 updateDeveloperSelectedLevel();
}
function updateDeveloperSelectedLevel(){
 const selected=teamMembers().find(m=>m.key===$('developerPokemon').value);
 if(selected)$('developerLevel').value=String(selected.level);
}
function updateDeveloperHallControls(){
 $('developerHallOptions').hidden=$('developerArea').value!=='palletTown';
 const list=$('developerHallRecords');list.replaceChildren();
 const entries=[{records:hallOfFame,label:'🏆 1차 엔딩',kind:'first'},{records:redHallOfFame,label:'👑 2차 엔딩',kind:'second'}];
 const count=hallOfFame.length+redHallOfFame.length;
 $('developerHallCount').textContent='명예의 전당 등록 '+count+'건';
 if(!count){const empty=document.createElement('small');empty.textContent='삭제할 명예의 전당 기록이 없어.';list.append(empty);}
 for(const group of entries){
  if(!group.records.length)continue;
  const heading=document.createElement('strong');heading.textContent=group.label;list.append(heading);
  for(const [index,record] of group.records.entries()){
   const row=document.createElement('div');row.className='developer-hall-row';
   const label=document.createElement('span');const date=record.date?new Date(record.date).toLocaleDateString('ko-KR'):'날짜 미상';
   label.textContent=(index+1)+'회 · '+date+' · '+(record.pokemon||record.party?.[0]?.name||'포켓몬');
   const del=document.createElement('button');del.type='button';del.className='developer-hall-delete';del.textContent='삭제';
   del.onclick=()=>deleteDeveloperHallRecord(group.kind,index);
   row.append(label,del);list.append(row);
  }
 }
}
function deleteDeveloperHallRecord(kind,index){
 if($('developerEditor').hidden)return;
 const records=kind==='second'?redHallOfFame:hallOfFame;
 if(!Number.isInteger(index)||index<0||index>=records.length)return;
 const title=kind==='second'?'2차 엔딩':'1차 엔딩';
 if(!window.confirm(title+' '+(index+1)+'회 기록을 삭제할까?'))return;
 records.splice(index,1);
 records.forEach((record,i)=>{record.round=i+1;});
 if(kind==='first'){leagueCeremonyPending=false;}else{redCeremonyPending=false;}
 saveProgress();updateDeveloperHallControls();renderHome();
}
function applyDeveloperChanges(e){
 e.preventDefault();
 if(animating||learningBusy)return;
 const selectedPokemon=teamMembers().find(m=>m.key===$('developerPokemon').value);
 if(!selectedPokemon){
  $('developerSaveError').textContent='레벨을 변경할 포켓몬을 선택해줘.';
  return;
 }
 const requestedLevel=Number($('developerLevel').value),money=Number($('developerMoney').value),targetArea=$('developerArea').value;
 const warp=resolveDeveloperWarp({requestedLevel,money,targetArea});
 // Editing only the level in the current area must not force a minimum-level warp.
 if(warp&&targetArea===area)warp.targetLevel=requestedLevel;
 if(!warp){
  $('developerSaveError').textContent='레벨 1~100, 보유금 0~999,999,999원, 지역 선택을 확인해줘.';
  return;
 }
 const {targetLevel}=warp;
 const levelChanged=selectedPokemon.level!==targetLevel;
 area=warp.area;
 if(targetArea==='palletTown'&&$('developerHallChoice').value==='register'){
  const lead=leaderMember(),iv=lead.starter?playerIVs:lead.ivs,ev=lead.starter?playerEVs:lead.evs||{};
  hallOfFame.push({date:new Date().toISOString(),pokemon:lead.name,dex:lead.dex,starter:lead.starter?chosen:null,level:lead.level,ivs:{...iv},evs:{...ev},moves:[...(lead.starter?playerMoves:lead.moves||[])],party:hallPartySnapshot(),round:(hallOfFame.at(-1)?.round||0)+1});
  hallOfFame=hallOfFame.slice(-100);
  leagueStage=null;leagueCeremonyPending=false;
 }
 // Developer region selection never completes trainers; explicit checkboxes are authoritative.
 const clearSelections=Object.fromEntries([...$('developerClearFlags').querySelectorAll('input[type="checkbox"]')].map(el=>[el.value,el.checked]));
 if(DEVELOPER_CLEAR_FLAGS.some(([key])=>typeof clearSelections[key]!=='boolean')){
  $('developerSaveError').textContent='클리어 체크박스를 불러올 수 없어. 다시 열어줘.';return;
 }
 blueCleared=clearSelections.blue;
 brockCleared=clearSelections.brock;
 mistyCleared=clearSelections.misty;
 greenReturnCleared=clearSelections.greenReturn;
 surgeCleared=clearSelections.surge;
 greenThirdCleared=clearSelections.greenThird;
 erikaCleared=clearSelections.erika;
 kogaCleared=clearSelections.koga;
 greenFourthCleared=clearSelections.greenFourth;
 sabrinaCleared=clearSelections.sabrina;
 blaineCleared=clearSelections.blaine;
 giovanniCleared=clearSelections.giovanni;
 greenFifthCleared=clearSelections.greenFifth;
 developerFlagsManual=true;
 progress.money=warp.money;recordMoneyChange('개발자모드 보유금 변경');
 if(levelChanged){
  if(selectedPokemon.starter){
   progress.level=targetLevel;
   progress.exp=0;
   storedHp=null;
   playerMoves=migrateMoves(chosen,targetLevel);
  }else{
   const companion=companions.find(c=>'companion-'+c.family===selectedPokemon.key);
   if(!companion){
    $('developerSaveError').textContent='선택한 포켓몬을 찾을 수 없어.';
    return;
   }
   companion.level=targetLevel;
   companion.exp=0;
   companion.hp=null;
   companion.moves=recentWildMoves(companion.dex,targetLevel);
  }
 }
 pendingTrainerIntro=null;
 saveProgress();
 closeDeveloper();
 reset();
 renderHome();
}
const LEAGUE_TRAINER_IMAGES=[
 './assets/league/lorelei.webp',
 './assets/league/bruno.webp',
 './assets/league/agatha.webp',
 './assets/league/lance.webp',
 'https://play.pokemonshowdown.com/sprites/trainers/blue.png'
];
function renderLeague(){
 if(leagueStage===null)return;
 $('leagueOpponent').textContent=LEAGUE_NAMES[leagueStage];
 const trainerImage=$('leagueTrainerImage');
 trainerImage.src=LEAGUE_TRAINER_IMAGES[leagueStage]||LEAGUE_TRAINER_IMAGES[4];
 trainerImage.alt=LEAGUE_NAMES[leagueStage]+' 트레이너';
 $('leagueNext').textContent=LEAGUE_NAMES[leagueStage]+'에게 도전';
 $('leagueNext').disabled=!livingMembers().length||!!pendingRewardChoice;
}
let selectedMapDestination=null;
const MAP_POSTGAME_AREAS=new Set(['palletTown','rocketBase','farawayIsland','mountSilver']);
function mapTravelProblem(key){
 const entry=mapRegion(key);
 if(!entry)return '이동할 수 없는 지역입니다.';
 if(MAP_POSTGAME_AREAS.has(key)){
  if(!currentRunLeagueWon)return '현재 회차에서 리그를 제패하지 않았습니다.';
  if(key==='rocketBase'&&!inventory.secretSwitch)return "'비밀 스위치' 아이템이 없습니다.";
  if(key==='farawayIsland'&&!inventory.oldSeaMap)return "'오래된해도' 아이템이 없습니다.";
  return '';
 }
 if(!entry[2]())return '아직 해금되지 않은 지역입니다.';
 // The furthest story region remains accessible without the optional map item.
 if(key!==latestMapRegion()&&key!==area&&!inventory.map)return "'지도' 아이템이 없습니다.";
 return '';
}
function showMap(){
 if(screen!=='home'||leagueStage!==null||pendingRewardChoice||animating||learningBusy||pendingTrainerIntro||leagueCeremonyPending||redCeremonyPending)return;
 selectedMapDestination=area;
 $('mapLocationText').textContent='현재 위치: '+(mapRegion(area)?.[1]||area);
 const list=$('mapDestinations');list.replaceChildren();
 for(const [key,name,isUnlocked] of MAP_REGIONS){
  // Discoverability is separate from travel: not owning the optional Map must not hide a discovered region.
  const revealed=key===area||isUnlocked();
  const problem=mapTravelProblem(key),locked=!!problem,label=document.createElement('label'),input=document.createElement('input'),caption=document.createElement('span');
  const displayName=revealed?name:'???';
  input.type='radio';input.name='mapDestination';input.value=key;input.disabled=locked;input.checked=selectedMapDestination===key;
  label.className=locked?'locked':'';if(input.checked)label.classList.add('chosen');
  if(locked){const message=revealed?problem:'아직 해금되지 않은 지역입니다.';label.title=message;label.setAttribute('aria-label',displayName+' · '+message);label.onclick=e=>{e.preventDefault();alert(message);};}
  caption.textContent=displayName+(key===area?' · 현재 위치':!revealed?'':locked?' · 잠김':'');
  input.onchange=()=>{selectedMapDestination=key;for(const row of list.querySelectorAll('label'))row.classList.toggle('chosen',row.querySelector('input').checked);$('mapSelectionText').textContent=displayName+'(으)로 이동할까요?';$('mapConfirm').disabled=key===area;};
  label.append(input,caption);list.append(label);
 }
 $('mapSelectionText').textContent='목적지를 선택한 후 이동 확인을 눌러주세요.';
 $('mapConfirm').disabled=true;$('mapOverlay').hidden=false;
}
function confirmMapTravel(){
 const dest=selectedMapDestination;
 if(screen!=='home'||leagueStage!==null||pendingRewardChoice||animating||learningBusy||pendingTrainerIntro||leagueCeremonyPending||redCeremonyPending||dest===area)return;
 const problem=mapTravelProblem(dest);
 if(problem){alert(problem);return;}
 area=dest;saveProgress();$('mapOverlay').hidden=true;renderHome();showScreen('home');
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
// Persist a self-contained snapshot of item loadouts and the move-management
// catalogue when a Hall of Fame entry is created. Earlier entries are untouched.
// Battle-effective permanent key items are passive, not held equipment.
// Snapshot only the effects applicable to this specific Pokemon.
function hallPassiveItems(m){
 const dex=m.dex;
 const applicable={
  lightBall:[172,25,26].includes(dex),
  thickClub:[104,105].includes(dex),
  beedrillite:dex===15,
  charcoal:FIRE_TYPE_DEX.has(dex),
  miracleSeed:GRASS_TYPE_DEX.has(dex),
  mysticWater:WATER_TYPE_DEX.has(dex),
  silverPowder:BUG_TYPE_DEX.has(dex),
  sharpBeak:FLYING_TYPE_DEX.has(dex),
  magnet:ELECTRIC_TYPE_DEX.has(dex)
 };
 return Object.fromEntries(Object.entries(applicable).filter(([id,works])=>works&&inventory[id]>=1).map(([id])=>[id,1]));
}
function hallPartySnapshot(){
 return teamMembers().slice(0,3).map(m=>{
  const ivs=m.starter?playerIVs:m.ivs,evs=m.starter?playerEVs:m.evs||{};
  const equippedMoves=[...(m.starter?playerMoves:m.moves||[])];
  const heldItems=Object.fromEntries(HELD_ITEMS.map(id=>[id,heldCount(id,m.key)]).filter(([,count])=>count>0));
  const passiveItems=hallPassiveItems(m);
  const usedMachines=[
   ...(tm01Learned.includes(m.key)?[{id:'tm01',moveId:'megaPunch'}]:[]),
   ...(tm02Learned.includes(m.key)?[{id:'tm02',moveId:'megaKick'}]:[]),
   ...Object.entries(EXTRA_TM_CONFIG).filter(([kind])=>extraTmLearned[kind]?.includes(m.key)).map(([kind,cfg])=>({id:kind,moveId:cfg.moveId}))
  ];
  // Available/recallable moves reflect the in-game move-management catalogue.
  // These are not claimed to be a chronological record of learning actions.
  const availableMoves=recallLearnable(m).map(entry=>({id:entry.id,level:entry.level??null,tmLabel:entry.tmLabel??null}));
  return {name:m.name,dex:m.dex,level:m.level,
   hp:memberMaxHp(m),exp:m.starter?progress.exp:m.exp||0,
   ivs:{...ivs},evs:{...evs},moves:equippedMoves,
   heldItems,passiveItems,moveManagement:{availableMoves,usedMachines,equippedMoves:[...equippedMoves]},
   stats:calculateStats(memberBase(m),m.level,ivs,evs)};
 });
}
let hallTab='first';
// Also read the reset-proof backup so records remain accessible after a fresh adventure.
function hallOfFameEntries(kind){
 const current=kind==='second'?redHallOfFame:hallOfFame;
 let permanent=[];
 try{
  const savedRecords=JSON.parse(localStorage.getItem(PERMANENT_KEY)||'{}');
  const key=kind==='second'?'redHallOfFame':'hallOfFame';
  if(Array.isArray(savedRecords?.[key]))permanent=savedRecords[key];
 }catch(e){console.warn('명예의전당 영구 기록을 읽지 못했습니다.',e);}
 const unique=new Map();
 for(const record of [...permanent,...current]){
  if(!record||typeof record!=='object')continue;
  const identity=JSON.stringify(record);
  if(!unique.has(identity))unique.set(identity,record);
 }
 return [...unique.values()].slice(-100);
}
function hasHallOfFameRecords(){
 return hallOfFameEntries('first').length>0||hallOfFameEntries('second').length>0;
}
// Archived Hall of Fame information is read-only. Recent records contain all
// four stats and moves; older records only stored species/level and starter IVs.
function archivedHallMember(record,m){
 if(m?.stats&&m?.ivs&&m?.evs)return {...m,source:'archive'};
 const isStarter=record?.dex===m.dex&&record?.pokemon===m.name;
 if(isStarter&&record?.ivs){
  const base=Object.values(EVOLUTIONS).flat().find(f=>f.dex===m.dex)?.base
   ||DEX_CATALOG.find(f=>f.dex===m.dex)?.base||BASE_STATS[m.dex];
  const evs=record.evs||{},ivs=record.ivs;
  const stats=base?calculateStats(base,m.level,ivs,evs):null;
  return {...m,ivs,evs,stats,moves:record.moves||[],source:'legacy-starter'};
 }
 // Older records only stored the names and levels of companions. If the
 // current adventure still has the same species, show its CURRENT stats
 // explicitly, even if it has leveled up since the Hall of Fame entry.
 // Never claim those figures were captured at the time of victory.
 const live=record?.starter===chosen
  ?teamMembers().find(x=>x.dex===m.dex&&x.name===m.name)
  :null;
 if(live){
  const ivs=live.starter?playerIVs:live.ivs,evs=live.starter?playerEVs:live.evs||{};
  return {...m,hp:memberHp(live),exp:live.starter?progress.exp:live.exp||0,
   ivs:{...ivs},evs:{...evs},moves:[...(live.starter?playerMoves:live.moves||[])],
   stats:calculateStats(memberBase(live),live.level,ivs,evs),
   currentLevel:live.level,source:'current'};
 }
 return {...m,source:'legacy'};
}
function showArchivedHallParty(record,selectedIndex=0){
 const members=(Array.isArray(record.party)&&record.party.length?record.party.slice(0,3):
  [{name:record.pokemon||'포켓몬',dex:record.dex,level:record.level}]).map(m=>archivedHallMember(record,m));
 if(!members.length)return;
 document.getElementById('partySummaryOverlay')?.remove();
 const overlay=document.createElement('div');overlay.id='partySummaryOverlay';
 overlay.className='party-summary-overlay';overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','명예의전당 포켓몬 정보');
 const panel=document.createElement('section');panel.className='party-summary-panel';
 const title=document.createElement('header');title.className='party-summary-title';
 title.textContent=(record.round||1)+'회 명예의전당';
 const cards=document.createElement('div');cards.className='party-summary-cards';
 const details=document.createElement('div');details.className='party-summary-details';
 const footer=document.createElement('button');footer.type='button';footer.className='party-summary-close';footer.textContent='닫기';
 footer.onclick=()=>overlay.remove();
 const selected=members[Math.max(0,Math.min(members.length-1,selectedIndex))];
 const meter=(label,current,total,type)=>{
  const row=document.createElement('div');row.className='party-summary-meter';
  const tag=document.createElement('b');tag.textContent=label;
  const track=document.createElement('div');track.className='party-summary-track '+type;
  const fill=document.createElement('div');fill.className='party-summary-fill';
  fill.style.width=Number.isFinite(current)&&Number.isFinite(total)&&total>0?Math.max(0,Math.min(100,100*current/total))+'%':'0%';
  track.append(fill);
  const count=document.createElement('span');count.className='party-summary-meter-count';
  count.textContent=Number.isFinite(current)&&Number.isFinite(total)?(type==='exp'&&total===0?'MAX':current+' / '+total):'기록 없음';
  row.append(tag,track,count);return row;
 };
 members.forEach((m,i)=>{
  const button=document.createElement('button');button.type='button';button.className='party-summary-card'+(i===selectedIndex?' selected':'');
  const pic=document.createElement('img');pic.className='party-summary-sprite';pic.alt='';
  pic.src=staticImage(m.dex,false);
  pic.onerror=()=>{pic.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+m.dex+'.png';pic.onerror=()=>{pic.style.visibility='hidden';};};
  const data=document.createElement('div');data.className='party-summary-info';
  const name=document.createElement('strong');name.textContent=(i===0?'★ ':'')+m.name+'　Lv.'+(m.level||'?');
  const nameRow=document.createElement('div');nameRow.className='party-summary-name-row';nameRow.append(name);
  // Only use the archived loadout, never the current team's equipment.
  for(const [id,quantity] of Object.entries(m.heldItems||{})){
   if(!HELD_ITEMS.includes(id)||!Number.isInteger(quantity)||quantity<=0)continue;
   const item=SHOP_ITEMS.find(x=>x.id===id);if(!item)continue;
   const heldIcon=document.createElement('img');heldIcon.className='party-summary-held-icon';
   heldIcon.src=itemSpriteUrl(id);heldIcon.alt=item.name;
   heldIcon.title=item.name+' '+quantity+'개';heldIcon.loading='lazy';
   heldIcon.onerror=()=>{const fallback=document.createElement('span');fallback.className='party-summary-held-icon';fallback.textContent=item.icon||'🎁';fallback.title=heldIcon.title;heldIcon.replaceWith(fallback);};
   nameRow.append(heldIcon);
   if(quantity>1){
    const count=document.createElement('small');count.textContent=String(quantity);
    count.title=item.name+' 장착 수량';count.style.cssText='font-size:11px;font-weight:bold;margin-left:-4px';
    nameRow.append(count);
   }
  }
  // Passive key items are shown beside held items, as they applied at the
  // time of this Hall of Fame snapshot. Old archives stay unchanged.
  for(const [id,quantity] of Object.entries(m.passiveItems||{})){
   if(!Number.isInteger(quantity)||quantity<=0)continue;
   const item=SHOP_ITEMS.find(x=>x.id===id&&x.category==='key');if(!item)continue;
   const passiveIcon=document.createElement('img');passiveIcon.className='party-summary-held-icon';
   passiveIcon.src=itemSpriteUrl(id);passiveIcon.alt=item.name;
   passiveIcon.title=item.name+' · 중요 아이템 보유 효과';passiveIcon.loading='lazy';
   passiveIcon.onerror=()=>{const fallback=document.createElement('span');fallback.className='party-summary-held-icon';fallback.textContent=item.icon||'🎁';fallback.title=passiveIcon.title;passiveIcon.replaceWith(fallback);};
   nameRow.append(passiveIcon);
  }
  data.append(nameRow,meter('HP',m.stats?.hp,m.stats?.hp,'hp'),meter('EXP',m.exp,m.level>=100?0:levelNeed(m.level),'exp'));
  button.append(pic,data);
  button.onclick=()=>showArchivedHallParty(record,i);
  cards.append(button);
 });
 const heading=document.createElement('strong');heading.className='party-summary-detail-heading';
 heading.textContent=selected.name+'의 정보'+(selected.source==='current'?' (현재 Lv.'+selected.currentLevel+')':'');
 details.append(heading);
 const infoGrid=document.createElement('div');infoGrid.className='party-summary-statgrid';
 for(const stat of STAT_KEYS){
  const tile=document.createElement('div');tile.className='party-summary-stat';
  const head=document.createElement('div');head.className='party-summary-stat-head';
  const label=document.createElement('b');label.textContent=STAT_LABELS[stat];
  head.append(label);
  if(Number.isInteger(selected.ivs?.[stat])){
   const iv=document.createElement('span');iv.className='iv-star iv-'+ivTier(selected.ivs[stat]);
   iv.textContent='★';iv.title='개체값 '+selected.ivs[stat];head.append(iv);
  }
  const value=document.createElement('strong');value.className='party-summary-stat-value';
  value.textContent=Number.isFinite(selected.stats?.[stat])?String(selected.stats[stat]):'—';
  const ev=document.createElement('small');ev.textContent=Number.isInteger(selected.evs?.[stat])?'EV: '+selected.evs[stat]:'EV: —';
  tile.append(head,value,ev);infoGrid.append(tile);
 }
 details.append(infoGrid);
 const moveHeading=document.createElement('strong');moveHeading.textContent='기술';details.append(moveHeading);
 const moves=document.createElement('div');moves.className='party-summary-moves';
 for(let i=0;i<4;i++){
  const id=selected.moves?.[i],move=id?MOVES[id]:null;
  const cell=document.createElement('button');cell.type='button';cell.className='party-summary-move';
  cell.textContent=move?.name||'—';cell.disabled=true;moves.append(cell);
 }
 details.append(moves);
 if(selected.source==='legacy'||selected.source==='current'){
  const notice=document.createElement('small');notice.className='hall-history-notice';
  notice.textContent=selected.source==='current'
   ?'이 명예의전당은 과거 기록이어서 당시 능력치는 저장되지 않았습니다. 현재 파티의 Lv.'+selected.currentLevel+' 정보로 대신 표시하며, 당시와 다를 수 있습니다.'
   :'이전 명예의전당 기록에는 상세 능력치·경험치·기술이 저장되지 않았고, 현재 파티에도 동일한 포켓몬이 없어 복원할 수 없습니다.';
  details.append(notice);
 }
 panel.append(title,cards,details,footer);overlay.append(panel);document.body.append(overlay);footer.focus();
}
function showHallOfFame(tab=hallTab){
 hallTab=tab==='second'?'second':'first';
 const tabs=$('leagueRecordTabs');tabs.querySelectorAll('button').forEach(button=>{const active=button.dataset.hallTab===hallTab;button.setAttribute('aria-selected',String(active));});
 const entries=hallOfFameEntries(hallTab);
 const list=$('leagueRecordList');list.replaceChildren();
 if(!entries.length){const empty=document.createElement('p');empty.className='hall-empty';empty.textContent='아직 등록된 기록이 없어.';list.append(empty);}
 for(const record of [...entries].reverse()){
  const wrap=document.createElement('article');wrap.className='hall-entry';
  const head=document.createElement('div');head.className='hall-entry-head';
  const round=document.createElement('strong');round.textContent=(record.round||1)+'회';
  const date=document.createElement('time');date.textContent=record.date?new Date(record.date).toLocaleDateString('ko-KR'):'날짜 미상';
  head.append(round,date);
  const party=document.createElement('div');party.className='hall-party';
  const members=Array.isArray(record.party)&&record.party.length?record.party.slice(0,3):[{name:record.pokemon||'포켓몬',dex:record.dex,level:record.level}];
  for(const m of members){const item=document.createElement('div');item.className='hall-pokemon';const img=document.createElement('img');img.alt=m.name||'포켓몬';img.loading='lazy';if(Number.isInteger(m.dex)&&m.dex>0){img.src=staticImage(m.dex);img.onerror=()=>{img.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+m.dex+'.png';img.onerror=()=>{img.hidden=true;};};}else img.hidden=true;
   const name=document.createElement('strong');name.textContent=m.name||'포켓몬';const level=document.createElement('span');level.textContent='LV '+(m.level??'?');item.append(img,name,level);party.append(item);}
  wrap.append(head,party);
  wrap.classList.add('hall-entry-clickable');
  wrap.setAttribute('role','button');wrap.setAttribute('tabindex','0');
  wrap.setAttribute('aria-label',(record.round||1)+'회 명예의전당 포켓몬 정보 보기');
  wrap.onclick=()=>showArchivedHallParty(record);
  wrap.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showArchivedHallParty(record);}};
  list.append(wrap);
 }
 $('leagueRecordOverlay').hidden=false;
}
// Reset quotas and permanent collection records are stored outside the adventure save.
const RESET_LIMIT=20,RESET_USAGE_KEY='poketama-2-reset-usage-v1',PERMANENT_KEY='poketama-2-permanent-v1';
let needsStarterSelection=!saved||localStorage.getItem('poketama-2-reset-pending-v1')==='yes';
let adventureResetPending=false;
function resetUsage(){
 try{const v=JSON.parse(localStorage.getItem(RESET_USAGE_KEY)||'null');return v?.day===todayKST()?Math.min(RESET_LIMIT,Math.max(0,Number(v.count)||0)):0;}catch{return 0;}
}
function permanentSnapshot(){
 registerOwnedStarter();
 return {captures:capturedPokemon,caughtSpecies:[...caughtSpecies],seenPokemon:[...seenPokemon],
 hallOfFame,redHallOfFame,achievements:{
 blueCleared,brockCleared,mistyCleared,greenReturnCleared,surgeCleared,greenThirdCleared,erikaCleared
 }};
}
function rememberPermanent(){
 try{
  const old=JSON.parse(localStorage.getItem(PERMANENT_KEY)||'null')||{};
  const now=permanentSnapshot();
  const unique=(a,b)=>[...new Set([...(a||[]),...(b||[])])];
  now.caughtSpecies=unique(old.caughtSpecies,now.caughtSpecies);
  now.seenPokemon=unique(old.seenPokemon,now.seenPokemon);
  now.captures=[...(old.captures||[]),...now.captures].filter((x,i,a)=>a.findIndex(y=>JSON.stringify(y)===JSON.stringify(x))===i).slice(-200);
  now.hallOfFame=[...(old.hallOfFame||[]),...now.hallOfFame].filter((x,i,a)=>a.findIndex(y=>JSON.stringify(y)===JSON.stringify(x))===i).slice(-100);
  now.redHallOfFame=[...(old.redHallOfFame||[]),...now.redHallOfFame].filter((x,i,a)=>a.findIndex(y=>JSON.stringify(y)===JSON.stringify(x))===i).slice(-100);
  now.achievements=Object.fromEntries(Object.keys(now.achievements).map(k=>[k,!!(old.achievements?.[k]||now.achievements[k])]));
  localStorage.setItem(PERMANENT_KEY,JSON.stringify(now));
 }catch(e){console.warn('영구 기록 백업 실패',e);throw e;}
}
function showStarterSelection(){
 $('starterSelectionOverlay').hidden=false;
 $('gameResetButton').disabled=needsStarterSelection;
}
function beginNewAdventure(id,fixedIV){
 if(!needsStarterSelection||animating||learningBusy)return;
 if(!STARTERS.some(x=>x.id===id))return;
 // Preserve the old save until the user has deliberately selected a new starter.
 chosen=id;setEeveeForm(null);setGengarEvolved(false);setRaichuEvolved(false);
 companions=[];partyOrder=[];adventureLog=[];area='grass';volcanoAutoVisited=false;
 blueCleared=false;brockCleared=false;mistyCleared=false;greenReturnCleared=false;surgeCleared=false;
 greenThirdCleared=false;greenFourthCleared=false;greenFifthCleared=false;
 erikaCleared=false;kogaCleared=false;sabrinaCleared=false;blaineCleared=false;giovanniCleared=false;
 leagueStage=null;currentRunLeagueWon=false;leagueCeremonyPending=false;redCeremonyPending=false;
 blueChoice=chooseRivalStarter(id);rivalEeveeEvolution=null;injured=false;healingDay=todayKST();freeHealsUsed=0;
 playerIVs=fixedIV?{hp:4,attack:4,defense:4,speed:4}:randomIVs();if(!fixedIV){if(EV_STATS.some(k=>playerIVs[k]===16))earnAchievement('hatchMaxIV');if(EV_STATS.some(k=>playerIVs[k]===0))earnAchievement('hatchMinIV');checkIVAchievement(playerIVs);}
 playerEVs={hp:0,attack:0,defense:0,speed:0};playerMoves=initialMoves(id);
 lastBattleReward=null;lastPartyExp={};pendingRewardChoice=null;challengeNotified=[];
 $('challengeUnlockOverlay').hidden=true;storedHp=null;
 for(const k of Object.keys(activeBoosts))activeBoosts[k]=[];
 inventory={...START_INVENTORY};
 inventory.inheritanceTicketPurchases=Math.max(0,Math.min(999,Number(localStorage.getItem('poketama-2-ticket-purchases-v1'))||0));
 // Tickets are permanent across resets; selected items carry over only when backed by tickets.
 try{
  const old=JSON.parse(localStorage.getItem(SAVE_KEY+'-before-reset')||'null');
  const wanted=JSON.parse(localStorage.getItem(INHERITANCE_PENDING_KEY)||'[]');
  const budget=Math.min(inheritanceCapacity(),Math.max(0,Number(old?.inventory?.inheritanceTicket)||0));
  inventory.inheritanceTicket=budget;
  const safeSelection=sanitizeInheritanceSelection(wanted,old?.inventory,budget);
  const safeCounts={};
  for(const itemId of safeSelection)safeCounts[itemId]=(safeCounts[itemId]||0)+1;
  for(const [itemId,count] of Object.entries(safeCounts))inventory[itemId]=Math.min(HELD_MAX[itemId]??(['expShare','clefairyDoll'].includes(itemId)?4:SHOP_ITEMS.find(x=>x.id===itemId)?.category==='key'?1:99),(inventory[itemId]||0)+count);
  // Only a Destiny Knot actually inherited from the previous run affects the new egg.
  if(!fixedIV&&safeCounts.destinyKnot>0){const guaranteed=STAT_KEYS[Math.floor(Math.random()*STAT_KEYS.length)];playerIVs[guaranteed]=16;earnAchievement('hatchMaxIV');checkIVAchievement(playerIVs);}
 }catch(e){console.warn('계승 아이템 확인 실패',e);}
 tm01Learned=[];tm02Learned=[];extraTmLearned=Object.fromEntries(Object.keys(EXTRA_TM_CONFIG).map(key=>[key,[]]));expShareActive=false;battleItemHolders=Object.fromEntries(HELD_ITEMS.map(id=>[id,[]]));progress={level:1,exp:0,money:1000};recordMoneyChange('새 모험 시작 · 보유금 초기화');
 registerOwnedStarter(id,1,null,false,false);
 needsStarterSelection=false;adventureResetPending=false;localStorage.removeItem('poketama-2-reset-pending-v1');localStorage.removeItem(INHERITANCE_PENDING_KEY);
 $('starterSelectionOverlay').hidden=true;$('gameResetButton').disabled=false;
 saveProgress();reset('wild',false);showScreen('home');showNextAchievement();
}
const INHERITANCE_PENDING_KEY='poketama-2-inheritance-pending-v1';
function finishAdventureReset(selected){
 const used=resetUsage();
 if(used>=RESET_LIMIT||needsStarterSelection)return;
 try{
  rememberPermanent();
  // Store only item ids. At new-game creation the backed-up inventory is revalidated.
  localStorage.setItem(INHERITANCE_PENDING_KEY,JSON.stringify(selected));
  localStorage.setItem('poketama-2-ticket-purchases-v1',String(Math.max(0,Number(inventory.inheritanceTicketPurchases)||0)));
  const previous=localStorage.getItem(SAVE_KEY);
  if(previous!==null)localStorage.setItem(SAVE_KEY+'-before-reset',previous);
  localStorage.setItem(RESET_USAGE_KEY,JSON.stringify({day:todayKST(),count:used+1}));
  localStorage.setItem('poketama-2-reset-pending-v1','yes');
 }catch(e){alert('데이터 백업에 실패해서 리셋을 중단했어.');return;}
 const keep=JSON.parse(localStorage.getItem(PERMANENT_KEY)||'{}');
 capturedPokemon=keep.captures||[];caughtSpecies=new Set(keep.caughtSpecies||[]);
 seenPokemon=new Set(keep.seenPokemon||[]);hallOfFame=keep.hallOfFame||[];redHallOfFame=keep.redHallOfFame||[];
 needsStarterSelection=true;adventureResetPending=true;showStarterSelection();
}
const INHERITANCE_CHOICE_KEY='poketama-2-inheritance-choice-v1';
function validInheritanceChoices(){
 let wanted=[];
 try{wanted=JSON.parse(localStorage.getItem(INHERITANCE_CHOICE_KEY)||'[]');}catch(e){}
 return sanitizeInheritanceSelection(wanted,inventory,Math.min(inventory.inheritanceTicket||0,inheritanceTicketLimit()));
}
function showInheritanceChoices(){
 const tickets=Math.min(inventory.inheritanceTicket||0,inheritanceTicketLimit());
 const items=SHOP_ITEMS.filter(item=>inheritanceItemEligible(item)&&(inventory[item.id]||0)>0);
 let selected=validInheritanceChoices();
 const prior=document.getElementById('inheritanceChoiceOverlay');if(prior)prior.remove();
 const overlay=document.createElement('div');overlay.id='inheritanceChoiceOverlay';
 overlay.style.cssText='position:fixed;inset:0;z-index:100005;background:#0009;overflow-y:auto;padding:5vh 14px;display:flex;align-items:flex-start;justify-content:center';
 const panel=document.createElement('section');panel.style.cssText='background:white;color:#293e59;border:3px solid #405675;border-radius:18px;padding:18px;max-width:480px;width:100%;box-sizing:border-box';
 const title=document.createElement('h2');title.textContent='🎫 계승 아이템 선택';panel.append(title);
 const info=document.createElement('p');panel.append(info);
 const list=document.createElement('div');list.style.cssText='display:grid;gap:8px;max-height:55vh;overflow-y:auto';panel.append(list);
 const controls=document.createElement('div');controls.style.cssText='display:grid;gap:8px;margin-top:14px';panel.append(controls);
 const button=(label,fn)=>{const el=document.createElement('button');el.type='button';el.textContent=label;el.style.cssText='min-height:44px;border:2px solid #697e9d;border-radius:10px;background:#f3f6fb;color:#283c5a;font-weight:bold';el.onclick=fn;return el;};
 const close=()=>overlay.remove();
 const redraw=()=>{
  info.textContent='계승권 보유 '+tickets+'장 · 필요 '+inheritanceSelectionCost(selected)+'장 / '+tickets+'장 · 아이템 '+selected.length+'개 선택\n아이템마다 필요 계승권 수량이 다릅니다. 아래에서 1개당 비용을 확인하세요.\n계승권 자체는 리셋해도 소모되지 않으며 아이템 계승 한도를 정합니다.\n선택은 언제든 변경할 수 있고 리셋할 때 적용됩니다.';
  info.style.whiteSpace='pre-line';list.replaceChildren();
  for(const item of items){
   const count=selected.filter(id=>id===item.id).length;
   const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;border:1px solid #ccd4df;border-radius:10px;padding:8px';
   const img=document.createElement('img');img.src=itemSpriteUrl(item.id);img.alt='';img.style.cssText='width:32px;height:32px;object-fit:contain';img.onerror=()=>{img.replaceWith(document.createTextNode(item.icon||'🎁'));};row.append(img);
   const name=document.createElement('span');name.textContent=item.name+' · 1개당 계승권 '+inheritanceItemCost(item.id)+'장 · 보유 '+inventory[item.id]+'개'+(item.id==='partySlotB'?' · 슬롯B만 계승 가능. 슬롯A 획득 전까지 비활성화되며, A 획득 시 자동 활성화됩니다.':'');name.style.cssText='flex:1;font-size:14px';row.append(name);
   const minus=button('−',()=>{const at=selected.indexOf(item.id);if(at>=0)selected.splice(at,1);redraw();});minus.disabled=count===0;
   const number=document.createElement('strong');number.textContent=String(count);number.style.minWidth='20px';number.style.textAlign='center';
   const plus=button('+',()=>{if(inheritanceSelectionCost(selected)+inheritanceItemCost(item.id)<=tickets&&count<inventory[item.id])selected.push(item.id);redraw();});plus.disabled=inheritanceSelectionCost(selected)+inheritanceItemCost(item.id)>tickets||count>=inventory[item.id];
   row.append(minus,number,plus);list.append(row);
  }
  if(!items.length){const empty=document.createElement('p');empty.textContent='보유 중인 계승 가능 아이템이 없어.';list.append(empty);}
  controls.replaceChildren(button('선택 저장',()=>{try{localStorage.setItem(INHERITANCE_CHOICE_KEY,JSON.stringify(selected));close();if(document.getElementById('partyActionOverlay'))requestAdventureReset();}catch(e){alert('계승 선택을 저장하지 못했어.');}}),button('취소',close));
 };
 redraw();overlay.append(panel);document.body.append(overlay);
}
function chooseInheritanceForReset(){finishAdventureReset(validInheritanceChoices());}
function requestAdventureReset(){
 if(needsStarterSelection||animating||learningBusy)return;
 const used=resetUsage();
 if(used>=RESET_LIMIT){partyOverlay('오늘 리셋 횟수 소진','하루 최대 20회까지 리셋할 수 있어. 한국 시간 자정에 다시 이용할 수 있어.',[{text:'확인'}]);return;}
 const tickets=Math.min(inventory.inheritanceTicket||0,inheritanceTicketLimit());
 const selected=validInheritanceChoices();
 const names=selected.map(id=>SHOP_ITEMS.find(x=>x.id===id)?.name||id);
 const counts={};for(const name of names)counts[name]=(counts[name]||0)+1;
 const summary=Object.entries(counts).map(([name,n])=>name+(n>1?' ×'+n:'')).join(', ')||'없음';
 const requiredTickets=inheritanceSelectionCost(selected);
 const slotBWarning=selected.includes('partySlotB')&&!selected.includes('partySlotA')?'\n⚠️ 슬롯B만 계승하면 슬롯A 획득 전까지 비활성화됩니다.':'';
 partyOverlay('모험 전체 리셋','남는 일일 리셋 횟수: '+(RESET_LIMIT-used)+'/20\n포켓몬, 레벨, 돈, 아이템, 배지, 스토리가 초기화돼.\n도감 · 업적 · 명예의전당은 영구 유지돼.\n계승권 보유 '+tickets+'장 · 필요 '+requiredTickets+'장: '+summary+'\n그 외 아이템은 계승되지 않아.'+slotBWarning+'\n정말 리셋할까?',[
  {text:'취소'},
  {text:'리셋 진행',action:chooseInheritanceForReset},
  {text:'계승권',disabled:tickets===0,action:showInheritanceChoices}
 ]);
}
function setup(){
 if(!needsStarterSelection&&!saveReadFailed){const currentChanged=registerOwnedStarter();const backupChanged=recoverLastStarterFromResetBackup();if(currentChanged||backupChanged)saveProgress();}
 if(saveReadFailed){alert('기존 저장 데이터를 읽는 데 실패했어. 데이터 보호를 위해 자동 저장을 중단했어. 브라우저 데이터를 삭제하지 말고 저장 데이터 확인이 필요해.');return;}
 if(!blueChoice||blueChoice===chosen){blueChoice=chooseRivalStarter(chosen);saveProgress();}
 $('trainerChallenge').addEventListener('click',challengeTrainer);
 $('redChallenge').addEventListener('click',()=>{if(area!=='mountSilver'||!hallOfFame.length||progress.level<90||!livingMembers().length||pendingRewardChoice||animating||learningBusy||pendingTrainerIntro)return;pendingTrainerIntro='red';$('trainerIntroName').textContent='레드';$('trainerIntroText').textContent='전설의 트레이너 레드가 승부를 걸어왔다!';$('trainerIntroImage').hidden=false;$('trainerIntroFallback').hidden=true;$('trainerIntroImage').onerror=()=>{$('trainerIntroImage').hidden=true;$('trainerIntroFallback').hidden=false;};$('trainerIntroImage').src='./assets/red-animated.webp?v=20261106-animated-red';$('trainerIntroOverlay').hidden=false;$('trainerIntroConfirm').focus();});
 $('openMap').addEventListener('click',showMap);
 $('mapCancel').addEventListener('click',()=>{$('mapOverlay').hidden=true});
 $('mapConfirm').addEventListener('click',confirmMapTravel);
 $('leagueEnter').addEventListener('click',()=>{if(!greenFifthCleared||hallOfFame.length>0||progress.level<67||!livingMembers().length||pendingRewardChoice)return;leagueStage=0;saveProgress();renderLeague();showScreen('league')});
 $('leagueNext').addEventListener('click',async()=>{if(leagueStage===null||!livingMembers().length||pendingRewardChoice||animating||learningBusy)return;const kind='league'+leagueStage;battlePlayerLevelStart=progress.level;reset(kind);showScreen('battle');await playTrainerSummon(kind);});
 $('leagueParty').addEventListener('click',()=>showPartyManager());
 $('leagueBag').addEventListener('click',()=>showShopTab('bag'));
 $('leagueRecords').addEventListener('click',showHallOfFame);
 $('leagueRecordClose').addEventListener('click',()=>{$('leagueRecordOverlay').hidden=true});document.querySelectorAll('[data-hall-tab]').forEach(button=>button.addEventListener('click',()=>showHallOfFame(button.dataset.hallTab)));
 $('redEndingNext').addEventListener('click',advanceRedEnding);
 $('challengeUnlockConfirm').addEventListener('click',()=>{$('challengeUnlockOverlay').hidden=true;if(pendingRewardChoice)showRewardChoices();});
 $('trainerIntroConfirm').addEventListener('click',confirmTrainerIntro);
 $('healButton').addEventListener('click',healInjury);
 $('openMoveRecall').addEventListener('click',openRecall);
 $('closeMoveRecall').addEventListener('click',()=>{$('moveRecallOverlay').hidden=true});
 updateBattleSpeedControl();
 $('speedToggle').addEventListener('click',()=>{
  battleSpeed=battleSpeed===1?2:1;
  try{localStorage.setItem(BATTLE_SPEED_KEY,String(battleSpeed));}catch(e){console.warn('배틀 속도 설정을 저장하지 못했습니다.',e);}
  updateBattleSpeedControl();
 });
 $('commandSwitch')?.addEventListener('click',requestBattleSwitch);
 $('commandFight').addEventListener('click',()=>showMenu('fight'));
 $('commandBall').addEventListener('click',()=>showMenu('ball'));
 $('commandHeal').addEventListener('click',()=>showMenu('heal'));
 $('commandRun').addEventListener('click',()=>{
  if(animating||battle.ended||!battle.wild||learningBusy)return;
  const tier=wildEnemy?.tier||(LEGENDARY_DEX.has(wildEnemy.dex)?'legendary':HYPER_DEX.has(wildEnemy.dex)?'hyper':RARE_DEX.has(wildEnemy.dex)?'rare':EVOLVED_DEX.has(wildEnemy.dex)?'evolved':'normal');
  const multiplier={normal:1,evolved:0.8,rare:0.7,hyper:0.5,legendary:0.3}[tier]??1;
  const chance=Math.max(0,Math.min(100,(80+battle.player.level-wildEnemy.level)*multiplier+4*Math.min(4,inventory.clefairyDoll||0)))/100;
  if(Math.random()<chance){
   setActiveHp(battle.player.hp);
   battleRoster.set(activeBattleKey,battle.player);
   saveProgress();showMenu('main');renderHome();
   achievementData.runs++;saveAchievements();
   if(achievementData.runs>=100)earnAchievement('run100');
   showScreen('home');
  }else{
   // Escaping consumes the player's action; the opponent alone attacks this turn.
   act({type:'run'});
  }
 });
 $('submenuBack').addEventListener('click',()=>{if(!animating&&!battle.ended)showMenu('main')});
 $('homeLevelUp').addEventListener('animationend',e=>{if(e.target!==$('homeLevelUp'))return;$('homeLevelUp').classList.remove('playing');$('homeLevelUp').hidden=true;});
 for(const item of SHOP_ITEMS){
  const button=$('battleItem-'+item.id);
  if(!button)continue; // Key items do not have battle action buttons.
  // Battle item labels and sprites come from the same item data as the shop and bag.
  const count=button.querySelector('.item-count');
  const note=button.querySelector('small');
  const image=document.createElement('img');
  image.className='shop-item-sprite';
  image.src=itemSpriteUrl(item.id);
  image.alt='';
  image.loading='lazy';
  image.onerror=()=>{image.replaceWith(document.createTextNode(item.icon||'🎁'));};
  button.replaceChildren(image,document.createTextNode(' '+item.name+' '));
  if(count)button.append(count);
  if(note){
   note.textContent=item.category==='ball'
    ?(item.description||'포획용 아이템')+' · 소모품'
    :item.description+' · 턴 소모';
   button.append(note);
  }
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
 $('openCommunication').addEventListener('click',async()=>{try{const {openOnlineRanking}=await import('./js/online-ranking.js?v=20261109-hall2');openOnlineRanking(()=>{
  restoreHistoricalAchievements();
  let permanent={};
  try{permanent=JSON.parse(localStorage.getItem(PERMANENT_KEY)||'{}')||{};}catch{}
  const caught=new Set([...caughtSpecies,...(Array.isArray(permanent.caughtSpecies)?permanent.caughtSpecies:[])].filter(d=>Number.isInteger(d)&&d>0&&d<=1025));
  const hall=[...hallOfFame,...(Array.isArray(permanent.hallOfFame)?permanent.hallOfFame:[])];
  const best=new Map();
  for(const r of hall){
   if(!STARTERS.some(st=>st.id===r?.starter)||!Array.isArray(r.party)||r.party.length!==3)continue;
   const party=r.party.map(p=>({name:String(p.name||'포켓몬').slice(0,32),dex:Number(p.dex)||0,level:Number(p.level)}));
   if(!party.every(p=>Number.isInteger(p.level)&&p.level>=1&&p.level<=100))continue;
   const sum=party.reduce((n,p)=>n+p.level,0),current=best.get(r.starter);
   if(!current||sum<current.sum)best.set(r.starter,{starter:r.starter,party,sum});
  }
  const red=[...redHallOfFame,...(Array.isArray(permanent.redHallOfFame)?permanent.redHallOfFame:[])];
  const bestRed=new Map();
  for(const r of red){if(!STARTERS.some(st=>st.id===r?.starter)||!Array.isArray(r.party)||r.party.length!==3)continue;const party=r.party.map(p=>({name:String(p.name||'포켓몬').slice(0,32),dex:Number(p.dex)||0,level:Number(p.level)}));if(!party.every(p=>Number.isInteger(p.level)&&p.level>=1&&p.level<=100))continue;const sum=party.reduce((n,p)=>n+p.level,0),current=bestRed.get(r.starter);if(!current||sum<current.sum)bestRed.set(r.starter,{starter:r.starter,party,sum});}
  return {dexCount:caught.size,achievementCount:achievementData.earned.length,hall:[...best.values()].map(({starter,party})=>({starter,party})),hall2:[...bestRed.values()].map(({starter,party})=>({starter,party}))};
 });}catch(e){alert('온라인 랭킹을 열지 못했어: '+(e?.message||e));}});
 $('homeMoney').addEventListener('click',showMoneyHistory);
 $('openCollection').addEventListener('click',()=>showCollection('dex'));
 $('closeCollection').addEventListener('click',()=>{$('collectionScreen').hidden=true;showScreen('home')});
 document.querySelectorAll('[data-collection-tab]').forEach(button=>button.addEventListener('click',()=>{collectionTab=button.dataset.collectionTab;$('achievementRefreshStatus').textContent='';renderCollection();}));
 $('achievementRefresh').addEventListener('click',()=>{
  if(collectionTab!=='achievements')return;
  const previous=new Set(achievementData.earned);
  checkDexAchievements();
  restoreHistoricalAchievements();
  const newlyEarned=achievementData.earned.filter(id=>!previous.has(id));
  renderCollection();
  $('achievementRefreshStatus').textContent=newlyEarned.length
   ?'갱신 완료! 새 업적 '+newlyEarned.length+'개 달성'
   :'갱신 완료 · 새로 달성한 업적 없음';
 });
 $('openShop').addEventListener('click',()=>showShopTab('shop'));
 $('openBag').addEventListener('click',()=>showShopTab('bag'));
 $('closeShop').addEventListener('click',()=>{$('shopScreen').hidden=true;if(leagueStage!==null){renderLeague();showScreen('league')}else showScreen('home')});
 document.querySelectorAll('[data-item-category]').forEach(button=>button.addEventListener('click',()=>showItemCategory(button.dataset.itemCategory)));

 const box=$('starters');
 const starterOptions=['venusaur','charizard','blastoise'];
 for(const id of starterOptions){
  const st=STARTERS.find(p=>p.id===id);
  const b=document.createElement('button');b.type='button';b.className='starter';b.dataset.id=id;
  b.innerHTML='<img alt="" loading="lazy" src="'+staticImage(st.baby)+'"><span>'+st.name+'</span>';
  b.onclick=()=>beginNewAdventure(id,true);box.append(b);
 }
 const egg=document.createElement('button');egg.type='button';egg.className='starter starter-egg';egg.dataset.id='egg';
 egg.innerHTML='<img alt="" src="'+document.getElementById('starterEggImage').src+'"><span>포켓몬 알</span>';
 egg.onclick=()=>{beginNewAdventure((()=>{const weights={venusaur:16,charizard:16,blastoise:16,raichu:11,eevee:11,butterfree:9,gengar:7,gyarados:7,snorlax:5.5,dragonite:1.5};let roll=Math.random()*100;for(const [id,weight] of Object.entries(weights)){roll-=weight;if(roll<0)return id;}return 'venusaur';})(),false);if(!needsStarterSelection)recordEggHatch();};
 box.append(egg);
 // Also create the notice control if an older cached HTML shell is still loaded.
 let noticeButton=$('gameNoticeButton');
 if(!noticeButton){
  noticeButton=document.createElement('button');
  noticeButton.type='button';noticeButton.id='gameNoticeButton';
  noticeButton.className='game-reset-button';
  noticeButton.textContent='📢 공지사항';
  const resetButton=$('gameResetButton');
  if(resetButton)resetButton.before(noticeButton);
 }
 noticeButton.addEventListener('click',()=>partyOverlay('📢 공지사항','• 현재 개발과 업데이트가 진행 중인 라이브 서비스 게임입니다.\n• 최신 업데이트를 적용하려면 수시로 새로고침(F5)을 눌러 주세요.\n• 플레이 기록은 자동 저장되며, 현재 이용 중인 브라우저의 사이트 데이터에 보관됩니다. 브라우저의 사이트 데이터나 저장 데이터를 삭제하면 게임 기록도 사라질 수 있습니다.',[{text:'확인'}]));$('gameResetButton').addEventListener('click',requestAdventureReset);$('startBattle').addEventListener('click',()=>{if(learningBusy||pendingRewardChoice||!livingMembers().length)return;if(!livingMembers().length){alert('모든 동료가 기절했어! 가방에서 회복약을 사용해줘.');showShopTab('bag');return;}$('homeLevelUp').hidden=true;$('homeLevelUp').classList.remove('playing');reset();showScreen('battle')});$('resultHome').addEventListener('click',()=>{renderHome();showScreen('home')});$('openDeveloper').addEventListener('click',openDeveloper);$('closeDeveloper').addEventListener('click',closeDeveloper);$('developerLogin').addEventListener('submit',unlockDeveloper);$('developerEditor').addEventListener('submit',applyDeveloperChanges);$('developerPokemon').addEventListener('change',updateDeveloperSelectedLevel);$('developerArea').addEventListener('change',updateDeveloperHallControls);$('rewardReroll').addEventListener('click',rerollRewards);/* Do not close on backdrop clicks: dragging a level input outside the dialog can end on the backdrop. */document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('developerOverlay').hidden)closeDeveloper()});saveProgress();if(livingMembers().length)reset('wild',false);else renderHome();showScreen(leagueStage===null?'home':'league');if(needsStarterSelection)showStarterSelection();if(leagueStage!==null)renderLeague();showRewardChoices();if(redCeremonyPending&&!pendingRewardChoice)showRedEnding();}
setup();
window.__poketamaReady=true;
