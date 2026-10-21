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
let battle,chosen='raichu',animating=false,shownHp={player:0,enemy:0},screen='home';
const STAT_KEYS=['hp','attack','defense','speed'];
const STAT_LABELS={hp:'HP',attack:'ATK',defense:'DEF',speed:'SPD'};
const randomIVs=()=>Object.fromEntries(STAT_KEYS.map(key=>[key,Math.floor(Math.random()*17)]));
const ivTier=value=>value===16?'red':value>=12?'gold':value>=7?'silver':value>=1?'bronze':'white';
let playerIVs=randomIVs();
function renderStatPanel(){
  const grid=$('statGrid'),stats=battle.player.stats;
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
function fighter(s,ivs={hp:8,attack:8,defense:8,speed:8}){return createFighter({id:s.id,name:s.form,level:50,friendship:100,stats:calculateStats(s.base,50,ivs,{}),moveIds:s.moves});}
function reset(){if(animating)return;const s=STARTERS.find(x=>x.id===chosen);const enemy={id:'charizard',form:'리자몽',dex:6,emoji:'🔥',base:{hp:78,attack:109,defense:82,speed:100},moves:['flareBlitz','swift']};battle=createBattle(fighter(s,playerIVs),[fighter(enemy)],{items:3});battle.log.push('⚔️ 야생 리자몽이 나타났다!');shownHp={player:battle.player.hp,enemy:battle.enemies[0].hp};$('playerName').textContent=s.form;$('promptName').textContent=s.form;$('enemyName').textContent='리자몽';sprite('playerSprite',s.dex,true,s.emoji);sprite('enemySprite',6,false,'🔥');document.querySelectorAll('.starter').forEach(b=>{const active=b.dataset.id===chosen;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});render();renderHome();}
function showScreen(next){if(animating)return;screen=next;$('homeScreen').hidden=next!=='home';$('battleScreen').hidden=next!=='battle';window.scrollTo({top:0,behavior:'instant'});}
function renderHome(){
 const s=STARTERS.find(x=>x.id===chosen);
 $('homeName').textContent=s.form;$('homeLevel').innerHTML='Lv.50 <small>테스트</small>';
 $('homeHpText').textContent=battle.player.stats.hp+' / '+battle.player.stats.hp;
 $('homeHpBar').style.width='100%';
 const img=$('homeSprite'),fallback=$('homeFallback');
 fallback.textContent=s.emoji;fallback.hidden=true;img.hidden=false;
 img.onerror=()=>{img.hidden=true;fallback.hidden=false};img.onload=()=>{img.hidden=false;fallback.hidden=true};
 img.src=staticImage(s.dex);
 renderStatPanel();
}
function render(){const p=battle.player,e=battle.enemies[battle.enemyIndex];for(const [f,prefix] of [[p,'player'],[e,'enemy']]){displayHp(prefix,animating?shownHp[prefix]:f.hp);$(prefix+'Status').textContent=f.status?.type==='paralysis'?'⚡ 마비':f.status?.type==='sleep'?'💤 수면':f.status?.type==='poison'?'☠ 독':'';}
$('turn').textContent=battle.ended?(battle.result==='victory'?'WIN!':'LOSE!'):'TURN '+String(battle.turn+1).padStart(2,'0');
$('moves').replaceChildren(...p.moveIds.map(id=>{const m=MOVES[id],b=document.createElement('button');b.disabled=animating||battle.ended||p.pp[id]===0;b.innerHTML='<span class="move-name">'+m.name+'</span><span class="move-pp">'+(m.power?'위력 '+m.power+' · ':'')+'PP '+p.pp[id]+'/'+m.pp+'</span>';b.addEventListener('click',()=>act({moveId:id}));return b;}));$('potion').disabled=animating||battle.ended||battle.items<1;$('potion').textContent='💊 회복약 ×'+battle.items+' (+100 HP)';$('log').replaceChildren(...battle.log.slice(-15).reverse().map(line=>{const t=document.createElement('p');t.textContent=line;return t;}));renderStatPanel();}
async function act(a){if(animating||battle.ended)return;const previousHp={player:battle.player.hp,enemy:battle.enemies[battle.enemyIndex].hp};try{animating=true;takeTurn(battle,a);const events=[...battle.events];shownHp={...previousHp};render();await playEvents(events);}catch(err){alert(err.message);console.error(err);}finally{animating=false;render();}}
function setup(){const box=$('starters');STARTERS.forEach(s=>{const b=document.createElement('button');b.type='button';b.className='starter';b.dataset.id=s.id;b.innerHTML='<img alt="" loading="lazy" src="'+staticImage(s.baby)+'"><span>'+s.name+'</span>';b.onclick=()=>{if(animating||chosen===s.id)return;chosen=s.id;playerIVs=randomIVs();reset()};box.append(b)});$('potion').addEventListener('click',()=>act({type:'item'}));$('restart').addEventListener('click',reset);$('startBattle').addEventListener('click',()=>{reset();showScreen('battle')});$('backHome').addEventListener('click',()=>{renderHome();showScreen('home')});reset();showScreen('home');}
setup();
