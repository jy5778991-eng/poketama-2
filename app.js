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
{id:'gengar',name:'고오스',form:'팬텀',dex:94,baby:92,base:{hp:60,attack:130,defense:68,speed:110},moves:['shadowBall','hypnosis','dreamEater','swift'],emoji:'👻'}
];
const base='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/';
const staticImage=(id,back=false)=>base+(back?'back/':'')+id+'.png';
const animatedImage=(id,back=false)=>base+'animated/'+(back?'back/':'')+id+'.gif';
const SAVE_KEY='poketama-2-progress-v1';
const WILD=[
 {name:'구구',dex:16,base:{hp:40,attack:45,defense:40,speed:56},emoji:'🐦'},
 {name:'꼬렛',dex:19,base:{hp:30,attack:56,defense:35,speed:72},emoji:'🐭'},
 {name:'캐터피',dex:10,base:{hp:45,attack:30,defense:35,speed:45},emoji:'🐛'},
 {name:'뿔충이',dex:13,base:{hp:40,attack:35,defense:30,speed:50},emoji:'🐛'}
];
const START_BASES={
 snorlax:{hp:135,attack:85,defense:40,speed:5},
 dragonite:{hp:41,attack:64,defense:48,speed:50},
 venusaur:{hp:45,attack:65,defense:57,speed:45},
 charizard:{hp:39,attack:60,defense:47,speed:65},
 blastoise:{hp:44,attack:50,defense:65,speed:43},
 raichu:{hp:20,attack:40,defense:30,speed:60},
 butterfree:{hp:45,attack:30,defense:35,speed:45},
 gengar:{hp:30,attack:100,defense:33,speed:80}
};
const levelNeed=level=>level>=100?0:Math.round(24+level*13);
const validIVs=ivs=>ivs&&['hp','attack','defense','speed'].every(k=>Number.isInteger(ivs[k])&&ivs[k]>=0&&ivs[k]<=16);
function readSave(){try{const x=JSON.parse(localStorage.getItem(SAVE_KEY));return x&&STARTERS.some(s=>s.id===x.id)&&validIVs(x.ivs)&&Number.isInteger(x.level)&&x.level>=5&&x.level<=100&&Number.isInteger(x.exp)&&x.exp>=0&&x.exp<levelNeed(x.level)||x?.level===100&&x?.exp===0?x:null;}catch{return null;}}
function saveProgress(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({id:chosen,level:progress.level,exp:progress.exp,ivs:playerIVs}));}catch(e){console.warn('저장할 수 없습니다.',e);}}

const saved=readSave();
let battle,chosen=saved?.id||'raichu',animating=false,shownHp={player:0,enemy:0},screen='home';
let progress={level:saved?.level||5,exp:saved?.exp||0};
let wildEnemy=null, rewardClaimed=false;
const STAT_KEYS=['hp','attack','defense','speed'];
const STAT_LABELS={hp:'HP',attack:'ATK',defense:'DEF',speed:'SPD'};
const randomIVs=()=>Object.fromEntries(STAT_KEYS.map(key=>[key,Math.floor(Math.random()*17)]));
const ivTier=value=>value===16?'red':value>=12?'gold':value>=7?'silver':value>=1?'bronze':'white';
let playerIVs=saved?.ivs||randomIVs();
function renderStatPanel(){
  const grid=$('statGrid'),s=STARTERS.find(x=>x.id===chosen),stats=calculateStats(START_BASES[s.id],progress.level,playerIVs,{});
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

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const visualSprite=side=>document.querySelector('.sprite.'+side);
function displayHp(side,hp){const f=side==='player'?battle.player:battle.enemies[battle.enemyIndex];const pct=Math.max(0,100*hp/f.stats.hp);$(side+'Bar').style.width=pct+'%';$(side+'Bar').style.background=pct>50?'#59c679':pct>20?'#e8b956':'#d86862';$(side+'Hp').textContent='HP '+hp+' / '+f.stats.hp;shownHp[side]=hp;}
function animateClass(element,klass){element.classList.remove(klass);void element.offsetWidth;element.classList.add(klass);}
function popup(side,amount,critical=false,healing=false){const el=$(side+'Popup');el.classList.remove('visible');el.replaceChildren();const n=document.createElement('span');n.className='number-hit'+(healing?' heal':'');n.textContent=(healing?'+':'−')+amount;el.append(n);if(critical){const crit=document.createElement('span');crit.className='critical';crit.textContent='Critical Hit!';el.append(crit);}void el.offsetWidth;el.classList.add('visible');}
async function playEvents(events){for(const ev of events){if(ev.type==='move'){const el=visualSprite(ev.side);animateClass(el,'attacking');await pause(380);el.classList.remove('attacking');}else if(ev.type==='damage'){const el=visualSprite(ev.side);animateClass(el,'hit');popup(ev.side,ev.amount,ev.critical);await pause(460);displayHp(ev.side,ev.hp);await pause(460);el.classList.remove('hit');$(ev.side+'Popup').classList.remove('visible');}else if(ev.type==='heal'){popup(ev.side,ev.amount,false,true);await pause(300);displayHp(ev.side,ev.hp);await pause(350);$(ev.side+'Popup').classList.remove('visible');}else if(ev.type==='miss'){await pause(270);}}}

function sprite(id,dex,back,emoji){const el=$(id),wrap=el.parentElement;wrap.classList.remove('failed');$(id.replace('Sprite','Fallback')).textContent=emoji;let attempt=0;const sources=[animatedImage(dex,back),staticImage(dex,back),'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+(back?'back/':'')+dex+'.png'];el.onerror=()=>{attempt++;if(attempt<sources.length)el.src=sources[attempt];else wrap.classList.add('failed')};el.onload=()=>wrap.classList.remove('failed');el.src=sources[0];}
function fighter(s,ivs={hp:8,attack:8,defense:8,speed:8},level=5,baseStats=s.base,displayName=s.name,moveIds=s.moves){
 return createFighter({id:s.id,name:displayName,level,friendship:100,stats:calculateStats(baseStats,level,ivs,{}),moveIds});
}
function awardExperience(){
 if(rewardClaimed||battle.result!=='victory')return [];
 rewardClaimed=true;
 const gained=12+wildEnemy.level*6;
 const messages=['+'+gained+' EXP 획득!'];
 progress.exp+=gained;
 while(progress.level<100&&progress.exp>=levelNeed(progress.level)){
  progress.exp-=levelNeed(progress.level);progress.level++;
  messages.push('LEVEL UP! LV '+progress.level);
 }
 if(progress.level===100)progress.exp=0;
 saveProgress();
 return messages;
}
function reset(){
 if(animating)return;
 const s=STARTERS.find(x=>x.id===chosen);
 const wild=WILD[Math.floor(Math.random()*WILD.length)];
 const level=Math.max(2,Math.min(100,progress.level-2+Math.floor(Math.random()*3)));
 wildEnemy={...wild,level};
 const player=fighter(s,playerIVs,progress.level,START_BASES[s.id],s.name,['tackle','quickAttack']);
 const enemy=createFighter({id:'wild-'+wild.dex,name:wild.name,level,friendship:0,stats:calculateStats(wild.base,level,{hp:8,attack:8,defense:8,speed:8},{}),moveIds:['tackle']});
 battle=createBattle(player,[enemy],{items:3});rewardClaimed=false;
 battle.log.push('⚔️ 야생 '+wild.name+'이(가) 나타났다!');
 shownHp={player:player.hp,enemy:enemy.hp};
 $('playerName').textContent=s.name;$('promptName').textContent=s.name;
 $('enemyName').textContent=wild.name;$('enemyLevel').textContent='Lv.'+level;$('playerLevel').textContent='Lv.'+progress.level;
 sprite('playerSprite',s.baby,true,s.emoji);sprite('enemySprite',wild.dex,false,wild.emoji);
 $('battleResult').hidden=true;
 document.querySelectorAll('.starter').forEach(b=>{const active=b.dataset.id===chosen;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 render();renderHome();
}
function showScreen(next){if(animating)return;screen=next;$('homeScreen').hidden=next!=='home';$('battleScreen').hidden=next!=='battle';window.scrollTo({top:0,behavior:'instant'});}
function renderHome(){
 const s=STARTERS.find(x=>x.id===chosen);
 $('homeName').textContent=s.name;$('homeLevel').textContent='LV '+progress.level;
 $('homeHpText').textContent=battle.player.stats.hp+' / '+battle.player.stats.hp;
 $('homeHpBar').style.width='100%';
 const need=levelNeed(progress.level);
 $('homeExpText').textContent=need?progress.exp+' / '+need:'MAX LEVEL';
 $('homeExpBar').style.width=need?100*progress.exp/need+'%':'100%';
 const img=$('homeSprite'),fallback=$('homeFallback');
 fallback.textContent=s.emoji;fallback.hidden=true;img.hidden=false;
 // Prefer genuine BW animated front GIF. Fall back to static pixel art and CSS idle motion.
 const sources=[animatedImage(s.baby),staticImage(s.baby),'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+s.baby+'.png'];
 let attempt=0;
 img.onerror=()=>{attempt++;if(attempt<sources.length){img.src=sources[attempt];}else{img.hidden=true;fallback.hidden=false;}};
 img.onload=()=>{img.hidden=false;fallback.hidden=true};
 img.src=sources[0];
 renderStatPanel();
}
function render(){const p=battle.player,e=battle.enemies[battle.enemyIndex];for(const [f,prefix] of [[p,'player'],[e,'enemy']]){displayHp(prefix,animating?shownHp[prefix]:f.hp);$(prefix+'Status').textContent=f.status?.type==='paralysis'?'⚡ 마비':f.status?.type==='sleep'?'💤 수면':f.status?.type==='poison'?'☠ 독':'';}
$('turn').textContent=battle.ended?(battle.result==='victory'?'WIN!':'LOSE!'):'TURN '+String(battle.turn+1).padStart(2,'0');
$('moves').replaceChildren(...p.moveIds.map(id=>{const m=MOVES[id],b=document.createElement('button');b.disabled=animating||battle.ended||p.pp[id]===0;b.innerHTML='<span class="move-name">'+m.name+'</span><span class="move-pp">'+(m.power?'위력 '+m.power+' · ':'')+'PP '+p.pp[id]+'/'+m.pp+'</span>';b.addEventListener('click',()=>act({moveId:id}));return b;}));$('potion').disabled=animating||battle.ended||battle.items<1;$('potion').textContent='💊 회복약 ×'+battle.items+' (+100 HP)';$('log').replaceChildren(...battle.log.slice(-15).reverse().map(line=>{const t=document.createElement('p');t.textContent=line;return t;}));renderStatPanel();}
async function act(a){
 if(animating||battle.ended)return;
 const previousHp={player:battle.player.hp,enemy:battle.enemies[battle.enemyIndex].hp};
 try{
  animating=true;takeTurn(battle,a);
  const events=[...battle.events];shownHp={...previousHp};render();await playEvents(events);
  if(battle.ended){
    const messages=awardExperience();
    $('battleResult').hidden=false;
    $('resultTitle').textContent=battle.result==='victory'?'승리!':'패배!';
    $('resultDetail').textContent=messages.length?messages.join('\n'):'경험치를 획득하지 못했어.';
    renderHome();
  }
 }catch(err){alert(err.message);console.error(err);}
 finally{animating=false;render();}
}
function setup(){const box=$('starters');STARTERS.forEach(s=>{const b=document.createElement('button');b.type='button';b.className='starter';b.dataset.id=s.id;b.innerHTML='<img alt="" loading="lazy" src="'+staticImage(s.baby)+'"><span>'+s.name+'</span>';b.onclick=()=>{if(animating||chosen===s.id)return;if(!confirm('스타팅을 바꾸면 현재 레벨과 경험치가 초기화돼. 바꿀까?'))return;chosen=s.id;playerIVs=randomIVs();progress={level:5,exp:0};saveProgress();reset()};box.append(b)});$('potion').addEventListener('click',()=>act({type:'item'}));$('restart').addEventListener('click',reset);$('startBattle').addEventListener('click',()=>{reset();showScreen('battle')});$('backHome').addEventListener('click',()=>{renderHome();showScreen('home')});$('resultHome').addEventListener('click',()=>{renderHome();showScreen('home')});saveProgress();reset();showScreen('home');}
setup();
