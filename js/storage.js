import {STARTERS} from './data/pokemon.js';
// Extracted from the original app.js; save data and game rules stay compatible.
export const SAVE_KEY='poketama-2-progress-v2'; // Lv.1 + money: separate from the older Lv.5 preview save
export const levelNeed=level=>level>=100?0:Math.round(15*level+0.6*level*level);
const oldLevelNeed=level=>level>=100?0:Math.round(24+level*13);
export const validCaptured=entry=>entry&&Number.isInteger(entry.dex)&&entry.dex>0&&Number.isInteger(entry.level)&&entry.level>=1&&entry.level<=100&&typeof entry.name==='string'&&entry.name.length<=40;
export const validIVs=ivs=>ivs&&['hp','attack','defense','speed'].every(k=>Number.isInteger(ivs[k])&&ivs[k]>=0&&ivs[k]<=16);
export function readSave(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;const x=JSON.parse(raw);if(!x||!STARTERS.some(s=>s.id===x.id)||!validIVs(x.ivs)||!Number.isInteger(x.level)||x.level<1||x.level>100||!Number.isSafeInteger(x.money)||x.money<0)return null;const migrating=x.expFormulaVersion!==2;
 const convert=(level,exp)=>level>=100?0:migrating?Math.min(levelNeed(level)-1,Math.round(Math.min(1,exp/oldLevelNeed(level))*levelNeed(level))):exp;
 let level=x.level,rest=convert(level,Number.isSafeInteger(x.exp)&&x.exp>=0?x.exp:0);
 while(level<100&&rest>=levelNeed(level)){rest-=levelNeed(level);level++;}
 if(level===100)rest=0;
 const companions=Array.isArray(x.companions)?x.companions.map(c=>({...c,exp:convert(c.level,Number.isSafeInteger(c.exp)&&c.exp>=0?c.exp:0)})):x.companions;
 return {...x,level,exp:rest,companions,expFormulaVersion:2};}catch{return null;}}
