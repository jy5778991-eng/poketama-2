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
const SAVE_KEY='poketama-2-progress-v2'; // Lv.1 + money: separate from the older Lv.5 preview save
const WILD=[
 {name:'구구',dex:16,base:{hp:40,attack:45,defense:38,speed:56},emoji:'🐦'},
 {name:'꼬렛',dex:19,base:{hp:30,attack:56,defense:35,speed:72},emoji:'🐭'},
 {name:'캐터피',dex:10,base:{hp:45,attack:30,defense:28,speed:45},emoji:'🐛'},
 {name:'뿔충이',dex:13,base:{hp:40,attack:35,defense:25,speed:50},emoji:'🐛'}
];
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
const getMoves=(id,level)=>{
 if(level<10)return ['tackle','quickAttack'];
 const starter=STARTERS.find(s=>s.id===id);
 return level>=20?starter.moves:['tackle','quickAttack'];
};

const levelNeed=level=>level>=100?0:Math.round(24+level*13);
const validCaptured=entry=>entry&&Number.isInteger(entry.dex)&&entry.dex>0&&Number.isInteger(entry.level)&&entry.level>=1&&entry.level<=100&&typeof entry.name==='string'&&entry.name.length<=40;
const validIVs=ivs=>ivs&&['hp','attack','defense','speed'].every(k=>Number.isInteger(ivs[k])&&ivs[k]>=0&&ivs[k]<=16);
function readSave(){try{const x=JSON.parse(localStorage.getItem(SAVE_KEY));return x&&STARTERS.some(s=>s.id===x.id)&&validIVs(x.ivs)&&Number.isInteger(x.level)&&x.level>=1&&x.level<=100&&Number.isInteger(x.exp)&&x.exp>=0&&x.exp<levelNeed(x.level)&&Number.isSafeInteger(x.money)&&x.money>=0||x?.level===100&&x?.exp===0&&Number.isSafeInteger(x.money)&&x.money>=0?x:null;}catch{return null;}}
function saveProgress(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({id:chosen,level:progress.level,exp:progress.exp,money:progress.money,ivs:playerIVs,captures:capturedPokemon,lastBattleReward}));}catch(e){console.warn('저장할 수 없습니다.',e);}}

const saved=readSave();
let battle,chosen=saved?.id||'raichu',animating=false,shownHp={player:0,enemy:0},screen='home';
let progress={level:saved?.level||1,exp:saved?.exp||0,money:saved?.money||0};
let wildEnemy=null, rewardClaimed=false, menuPage='main';
let pendingLevelUp=null;
let battleSpeed=1;
let lastBattleReward=saved?.lastBattleReward&&Number.isSafeInteger(saved.lastBattleReward.exp)&&Number.isSafeInteger(saved.lastBattleReward.money)?saved.lastBattleReward:null;
let capturedPokemon=Array.isArray(saved?.captures)?saved.captures.filter(validCaptured).slice(0,200):[];
const STAT_KEYS=['hp','attack','defense','speed'];
const STAT_LABELS={hp:'HP',attack:'ATK',defense:'DEF',speed:'SPD'};
const randomIVs=()=>Object.fromEntries(STAT_KEYS.map(key=>[key,Math.floor(Math.random()*17)]));
const ivTier=value=>value===16?'red':value>=12?'gold':value>=7?'silver':value>=1?'bronze':'white';
let playerIVs=saved?.ivs||randomIVs();
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
function fighter(s,ivs={hp:8,attack:8,defense:8,speed:8},level=5,baseStats=s.base,displayName=s.name,moveIds=s.moves){
 return createFighter({id:s.id,name:displayName,level,friendship:100,stats:calculateStats(baseStats,level,ivs,{}),moveIds});
}
function awardExperience(){
 if(rewardClaimed||battle.result!=='victory')return [];
 rewardClaimed=true;
 const gained=12+wildEnemy.level*6;
 const prize=20+wildEnemy.level*15;
 lastBattleReward={exp:gained,money:prize};
 const messages=['+'+gained+' EXP 획득!','+'+prize+'원 획득!'];
 progress.money+=prize;
 const evolutions=[];
 const previousLevel=progress.level;
 progress.exp+=gained;
 while(progress.level<100&&progress.exp>=levelNeed(progress.level)){
  progress.exp-=levelNeed(progress.level);progress.level++;
  messages.push('LEVEL UP! LV '+progress.level);
  const form=EVOLUTIONS[chosen].find(f=>f.level===progress.level);
  if(form){const before=getForm(chosen,progress.level-1);evolutions.push({before,after:form,level:progress.level});messages.push(before.name+' → '+form.name+' 진화!');}
 }
 if(progress.level===100)progress.exp=0;
 saveProgress();
 return {messages,evolutions,previousLevel,newLevel:progress.level};
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
function reset(){
 if(animating)return;
 const s=STARTERS.find(x=>x.id===chosen);
 const form=getForm(chosen,progress.level);
 const wild=WILD[Math.floor(Math.random()*WILD.length)];
 const level=Math.max(1,Math.min(100,progress.level-1+Math.floor(Math.random()*3)));
 wildEnemy={...wild,level};
 const player=fighter(s,playerIVs,progress.level,form.base,form.name,getMoves(chosen,progress.level));
 const enemy=createFighter({id:'wild-'+wild.dex,name:wild.name,level,friendship:0,stats:calculateStats(wild.base,level,{hp:0,attack:0,defense:0,speed:0},{}),moveIds:['tackle']});
 battle=createBattle(player,[enemy],{items:3,balls:5,wild:true});rewardClaimed=false;menuPage='main';
 visualSprite('enemy').classList.remove('enemy-captured');
 battle.log.push('⚔️ 야생 '+wild.name+'이(가) 나타났다!');
 shownHp={player:player.hp,enemy:enemy.hp};
 $('playerName').textContent=form.name;$('promptName').textContent=form.name;
 $('enemyName').textContent=wild.name;$('enemyLevel').textContent='Lv.'+level;$('playerLevel').textContent='Lv.'+progress.level;
 sprite('playerSprite',form.dex,true,s.emoji);sprite('enemySprite',wild.dex,false,wild.emoji);
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
function renderCaptures(){
 $('captureCount').textContent=String(capturedPokemon.length);
 const list=$('captureList');list.replaceChildren();
 if(!capturedPokemon.length){list.textContent='아직 포획한 포켓몬이 없어.';return;}
 for(const entry of capturedPokemon.slice(-12).reverse()){
  const chip=document.createElement('span');chip.className='capture-chip';chip.textContent=entry.name+' Lv.'+entry.level;list.append(chip);
 }
 if(capturedPokemon.length>12){const extra=document.createElement('span');extra.textContent='외 '+(capturedPokemon.length-12)+'마리';list.append(extra);}
}
function showScreen(next){if(animating)return;screen=next;$('homeScreen').hidden=next!=='home';$('battleScreen').hidden=next!=='battle';window.scrollTo({top:0,behavior:'instant'});}
function renderHome(){
 const s=STARTERS.find(x=>x.id===chosen),form=getForm(chosen,progress.level);
 $('homeName').textContent=form.name;$('homeLevel').textContent='LV '+progress.level;
 $('homeMoney').textContent='💰 '+progress.money.toLocaleString('ko-KR')+'원'+(lastBattleReward?' (+'+lastBattleReward.money.toLocaleString('ko-KR')+')':'');
 renderCaptures();
 $('homeHpText').textContent=battle.player.stats.hp+' / '+battle.player.stats.hp;
 $('homeHpBar').style.width='100%';
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
}
function render(){const p=battle.player,e=battle.enemies[battle.enemyIndex];
 $('commandFight').disabled=animating||battle.ended;
 $('commandBall').disabled=animating||battle.ended||!battle.wild;
 $('commandHeal').disabled=animating||battle.ended;
 $('commandRun').disabled=animating||battle.ended||!battle.wild;
 $('throwBall').disabled=animating||battle.ended||!battle.wild||battle.balls<=0;
 $('throwBall').firstChild.textContent='🔴 몬스터볼 ×'+battle.balls+' ';
 $('potion').disabled=animating||battle.ended||battle.items<1;
 $('potion').firstChild.textContent='💊 상처약 ×'+battle.items+' ';
 if(battle.ended)showMenu('main');for(const [f,prefix] of [[p,'player'],[e,'enemy']]){displayHp(prefix,animating?shownHp[prefix]:f.hp);$(prefix+'Status').textContent=f.status?.type==='paralysis'?'⚡ 마비':f.status?.type==='sleep'?'💤 수면':f.status?.type==='poison'?'☠ 독':'';}
$('turn').textContent=battle.ended?(battle.result==='victory'?'WIN!':'LOSE!'):'TURN '+String(battle.turn+1).padStart(2,'0');
$('moves').replaceChildren(...p.moveIds.map(id=>{const m=MOVES[id],b=document.createElement('button');b.disabled=animating||battle.ended||p.pp[id]===0;b.innerHTML='<span class="move-name">'+m.name+'</span><span class="move-pp">'+(m.power?'위력 '+m.power+' · ':'')+'PP '+p.pp[id]+'/'+m.pp+'</span>';b.addEventListener('click',()=>act({moveId:id}));return b;}));$('log').replaceChildren(...battle.log.slice(-15).reverse().map(line=>{const t=document.createElement('p');t.textContent=line;return t;}));renderStatPanel();}
async function act(a){
 if(animating||battle.ended)return;
 const previousHp={player:battle.player.hp,enemy:battle.enemies[battle.enemyIndex].hp};
 try{
  animating=true;takeTurn(battle,a);
  const events=[...battle.events];shownHp={...previousHp};render();await playEvents(events);
  if(battle.ended){
    if(battle.result==='capture'){
      capturedPokemon.push({name:wildEnemy.name,dex:wildEnemy.dex,level:wildEnemy.level});
      if(capturedPokemon.length>200)capturedPokemon.shift();
      saveProgress();
    }
    if(battle.result!=='victory'){lastBattleReward={exp:0,money:0};saveProgress();}
    const reward=awardExperience();
    if(reward?.newLevel>reward?.previousLevel)pendingLevelUp={previous:reward.previousLevel,current:reward.newLevel};
    if(reward?.evolutions?.length)await showEvolutions(reward.evolutions);
    $('battleResult').hidden=false;
    $('resultTitle').textContent=battle.result==='victory'?'승리!':battle.result==='capture'?'포획 성공!':'패배!';
    $('resultDetail').textContent=battle.result==='capture'?wildEnemy.name+' (Lv.'+wildEnemy.level+') 포획 완료! 포획 도감에 저장했어.':reward?.messages?.length?reward.messages.join('\n'):'경험치를 획득하지 못했어.';
    renderHome();
  }
 }catch(err){alert(err.message);console.error(err);}
 finally{
  animating=false;
  render();
  if(battle.ended){
   showMenu('main');
   renderHome();showScreen('home');
   if(pendingLevelUp){const levels=pendingLevelUp;pendingLevelUp=null;playHomeLevelUp(levels.previous,levels.current);}
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
 if(animating)return;
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
 progress.level=level;progress.money=money;
 if(levelChanged)progress.exp=0;
 saveProgress();
 closeDeveloper();
 reset();
}
function setup(){
 $('speedToggle').addEventListener('click',()=>{
  battleSpeed=battleSpeed===1?2:1;
  document.body.classList.toggle('battle-fast',battleSpeed===2);
  $('speedToggle').setAttribute('aria-pressed',String(battleSpeed===2));
  $('speedToggle').textContent='⏩ 2배속 '+(battleSpeed===2?'ON':'OFF');
 });
 $('commandFight').addEventListener('click',()=>showMenu('fight'));
 $('commandBall').addEventListener('click',()=>showMenu('ball'));
 $('commandHeal').addEventListener('click',()=>showMenu('heal'));
 $('commandRun').addEventListener('click',()=>{if(animating||battle.ended||!battle.wild)return;showMenu('main');renderHome();showScreen('home')});
 $('submenuBack').addEventListener('click',()=>{if(!animating&&!battle.ended)showMenu('main')});
 $('homeLevelUp').addEventListener('animationend',e=>{if(e.target!==$('homeLevelUp'))return;$('homeLevelUp').classList.remove('playing');$('homeLevelUp').hidden=true;});
 $('throwBall').addEventListener('click',()=>act({type:'ball'}));
 const box=$('starters');STARTERS.forEach(s=>{const b=document.createElement('button');b.type='button';b.className='starter';b.dataset.id=s.id;b.innerHTML='<img alt="" loading="lazy" src="'+staticImage(s.baby)+'"><span>'+s.name+'</span>';b.onclick=()=>{if(animating||chosen===s.id)return;if(!confirm('스타팅을 바꾸면 레벨, 경험치, 보유금, 포획 도감이 초기화돼. 바꿀까?'))return;chosen=s.id;playerIVs=randomIVs();capturedPokemon=[];lastBattleReward=null;progress={level:1,exp:0,money:0};saveProgress();reset()};box.append(b)});$('potion').addEventListener('click',()=>act({type:'item'}));$('restart').addEventListener('click',reset);$('startBattle').addEventListener('click',()=>{$('homeLevelUp').hidden=true;$('homeLevelUp').classList.remove('playing');reset();showScreen('battle')});$('backHome').addEventListener('click',()=>{renderHome();showScreen('home')});$('resultHome').addEventListener('click',()=>{renderHome();showScreen('home')});$('openDeveloper').addEventListener('click',openDeveloper);$('closeDeveloper').addEventListener('click',closeDeveloper);$('developerLogin').addEventListener('submit',unlockDeveloper);$('developerEditor').addEventListener('submit',applyDeveloperChanges);$('developerOverlay').addEventListener('click',e=>{if(e.target===$('developerOverlay'))closeDeveloper()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('developerOverlay').hidden)closeDeveloper()});saveProgress();reset();showScreen('home');}
setup();
