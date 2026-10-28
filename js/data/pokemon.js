import {MOVES} from '../../battle-engine.mjs?v=20261029-growth-moves60';
// Extracted from the original app.js; save data and game rules stay compatible.
export const STARTERS=[
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
export const START_BASES={
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
export const EVOLUTIONS={
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
export const getForm=(id,level)=>[...EVOLUTIONS[id]].reverse().find(form=>level>=form.level);
export {MOVE_LEARNSETS} from './learnsets.js';
import {MOVE_LEARNSETS} from './learnsets.js';
export const availableMoves=(id,level)=>MOVE_LEARNSETS[id].filter(m=>m.level<=level);
export const initialMoves=id=>MOVE_LEARNSETS[id].filter(m=>m.level===1).map(m=>m.id);
// Keep a legacy save playable: choose four latest unlocked moves if a save has no moves field.
export const migrateMoves=(id,level)=>availableMoves(id,level).slice(-4).map(m=>m.id);
export const isValidMoves=(id,level,moves)=>Array.isArray(moves)&&moves.length>=1&&moves.length<=4&&new Set(moves).size===moves.length&&moves.every(m=>availableMoves(id,level).some(x=>x.id===m)&&MOVES[m]);
