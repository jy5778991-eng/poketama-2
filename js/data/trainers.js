import {STARTERS} from './pokemon.js';
// Extracted from the original app.js; save data and game rules stay compatible.
export const RIVAL_POOL=STARTERS.filter(s=>s.id!=='butterfree'); // One opponent family, saved permanently
// Future character asset: female Blue. Preserve separately; not used for the Lv.5 challenge rival.
export const FUTURE_BLUE_TRAINER_IMAGE='https://play.pokemonshowdown.com/sprites/trainers/leaf.png';
export const TRAINERS={
 // Keep 'blue' as the internal save-data key for backward compatibility; displayed rival is Green.
 blue:{name:'라이벌 그린',level:5,money:300,stageAfter:'forest',image:'./assets/trainers/green.webp'},
 brock:{name:'웅',level:12,money:500,stageAfter:'cave',image:'./assets/trainers/brock.webp'},
 misty:{name:'이슬이',level:17,money:700,stageAfter:'lake',image:'./assets/trainers/misty.webp'},
 greenReturn:{name:'라이벌 그린',level:19,money:850,stageAfter:null,image:'./assets/trainers/green.webp'},
 surge:{name:'마티즈',level:24,money:1100,stageAfter:null,image:'./assets/trainers/lt-surge.webp'}
};
