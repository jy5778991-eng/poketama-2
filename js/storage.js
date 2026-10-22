import {STARTERS} from './data/pokemon.js';
// Extracted from the original app.js; save data and game rules stay compatible.
export const SAVE_KEY='poketama-2-progress-v2'; // Lv.1 + money: separate from the older Lv.5 preview save
export const levelNeed=level=>level>=100?0:Math.round(24+level*13);
export const validCaptured=entry=>entry&&Number.isInteger(entry.dex)&&entry.dex>0&&Number.isInteger(entry.level)&&entry.level>=1&&entry.level<=100&&typeof entry.name==='string'&&entry.name.length<=40;
export const validIVs=ivs=>ivs&&['hp','attack','defense','speed'].every(k=>Number.isInteger(ivs[k])&&ivs[k]>=0&&ivs[k]<=16);
export function readSave(){try{const x=JSON.parse(localStorage.getItem(SAVE_KEY));return x&&STARTERS.some(s=>s.id===x.id)&&validIVs(x.ivs)&&Number.isInteger(x.level)&&x.level>=1&&x.level<=100&&Number.isInteger(x.exp)&&x.exp>=0&&(x.level===100?x.exp===0:x.exp<levelNeed(x.level))&&Number.isSafeInteger(x.money)&&x.money>=0?x:null;}catch{return null;}}
