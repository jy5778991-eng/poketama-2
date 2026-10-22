import {STARTERS} from './pokemon.js';
// Extracted from the original app.js; save data and game rules stay compatible.
export const RIVAL_POOL=STARTERS.filter(s=>s.id!=='butterfree'); // One opponent family, saved permanently
// Future character asset: female Blue. Preserve separately; not used for the Lv.7 rival.
export const FUTURE_BLUE_TRAINER_IMAGE='https://play.pokemonshowdown.com/sprites/trainers/leaf.png';
export const TRAINERS={
 // Keep 'blue' as the internal save-data key for backward compatibility; displayed rival is Green.
 blue:{name:'라이벌 그린',level:7,money:300,stageAfter:'forest',image:'./assets/trainers/green.webp'},
 brock:{name:'웅',level:13,money:500,stageAfter:'cave',image:'./assets/trainers/brock.webp'}
};
