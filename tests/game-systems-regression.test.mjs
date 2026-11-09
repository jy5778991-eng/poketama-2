import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MOVES} from '../js/data/moves.js';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
function extractBlock(marker){
 const start=app.indexOf(marker);
 assert.notEqual(start,-1,'Missing '+marker);
 const open=app.indexOf('{',start);
 let depth=0,quote=null,escaped=false;
 for(let i=open;i<app.length;i++){
  const ch=app[i];
  if(quote){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch===quote)quote=null;continue;}
  if(ch==='"'||ch==="'"||ch==='\x60'){quote=ch;continue;}
  if(ch==='{')depth++;
  if(ch==='}'&&!--depth)return app.slice(start,i+1);
 }
 throw new Error('Unclosed '+marker);
}
const config=vm.runInNewContext(extractBlock('const EXTRA_TM_CONFIG=').replace('const EXTRA_TM_CONFIG=','(')+')');
const entries=Object.entries(config);
const tiers=['normal','rare','hyper','legendary'];
const pool=extractBlock('const pool=');
const tierPool=Object.fromEntries(tiers.map((tier,i)=>{
 const start=pool.indexOf(tier+':[');
 assert.ok(start>=0,'Missing reward pool '+tier);
 const next=tiers.slice(i+1).map(t=>pool.indexOf(t+':[',start+1)).filter(x=>x>=0);
 return [tier,pool.slice(start,next.length?Math.min(...next):pool.length)];
}));
test('TM01–TM21 have unique consecutive IDs and all move definitions exist',()=>{
 const all=[['tm01','megaPunch'],['tm02','megaKick'],...entries.map(([key,v])=>[key,v.moveId])];
 assert.deepEqual(all.map(([id])=>id),Array.from({length:21},(_,i)=>'tm'+String(i+1).padStart(2,'0')));
 for(const [id,move] of all)assert.ok(MOVES[move],id+' missing move '+move);
 assert.equal(new Set(all.map(([id])=>id)).size,21);
});
test('TM03–TM21 have valid level windows, tiers, weights and species lists',()=>{
 for(const [id,cfg] of entries){
  assert.ok(cfg.minLevel>=1&&cfg.minLevel<cfg.maxLevelExclusive&&cfg.maxLevelExclusive<=101,id+' levels');
  assert.ok(tiers.includes(cfg.tier??'normal'),id+' tier');
  assert.ok(Number.isInteger(cfg.weight??1)&&(cfg.weight??1)>0,id+' weight');
  assert.ok(cfg.dex.length>0&&cfg.dex.every(n=>Number.isInteger(n)&&n>0),id+' species');
  assert.equal(new Set(cfg.dex).size,cfg.dex.length,id+' duplicate species');
 }
});
test('each TM03–TM21 is in its configured reward tier',()=>{
 for(const [id,cfg] of entries){
  const tier=cfg.tier??'normal';
  if(tier==='normal')assert.match(tierPool.normal,/Object\.keys\(EXTRA_TM_CONFIG\)\.filter\(kind=>!\['rare','hyper','legendary'\]\.includes\(EXTRA_TM_CONFIG\[kind\]\.tier\)\)/,id+' normal dynamic pool');
  else assert.match(tierPool[tier],new RegExp("kind:'"+id+"'"),id+' missing from '+tier);
  for(const other of tiers.filter(x=>x!==tier))assert.doesNotMatch(tierPool[other],new RegExp("kind:'"+id+"'"),id+' unexpectedly in '+other);
 }
});
test('Growl and Leer stay rare weight 1, level 5–50, with correct battle effects',()=>{
 for(const [id,move,effect] of [['tm20','growl','lowerTargetAttack'],['tm21','leer','lowerTargetDefense']]){
  const cfg=config[id];
  assert.equal(cfg.tier,'rare');
  assert.equal(cfg.weight,1);
  assert.equal(cfg.minLevel,5);
  assert.equal(cfg.maxLevelExclusive,51);
  assert.equal(cfg.moveId,move);
  assert.equal(MOVES[move][effect],1);
  assert.equal(MOVES[move].accuracy,1);
 }
});
test('TM eligibility checks each member level and prevents already learned moves',()=>{
 const fn=extractBlock('function extraTmTargets(');
 assert.match(fn,/m\.level<cfg\.minLevel/);
 assert.match(fn,/m\.level>=\(cfg\.maxLevelExclusive\?\?101\)/);
 assert.match(fn,/extraTmDex\[kind\]\.has\(m\.dex\)/);
 assert.match(fn,/extraTmLearned\[kind\]\.includes\(m\.key\)/);
 assert.match(fn,/current\.includes\(cfg\.moveId\)/);
});
test('reward selection applies TM eligibility and configured weight',()=>{
 const fn=extractBlock('function rewardWeight(');
 assert.match(fn,/extraTmTargets\(choice\.kind\)\.length/);
 assert.match(fn,/EXTRA_TM_CONFIG\[choice\.kind\]\.weight\?\?1/);
});
test('held item limits, save guard and synchronized HP setter remain present',()=>{
 assert.match(app,/const HELD_MAX=\{/);
 assert.match(app,/function heldItemPerPokemonLimit\(id\)/);
 assert.match(app,/function normalizeHeldItems\(/);
 assert.match(app,/function saveProgress\(/);
 assert.match(app,/if\(saveReadFailed\)/);
 assert.match(app,/localStorage\.setItem\(SAVE_KEY/);
 assert.match(app,/function setMemberHp\(/);
});

test('TM balance changes remain consistent across all reward settings',()=>{
 const expected={tm04:[8,60,'normal',1],tm05:[22,60,'rare',1],tm06:[22,60,'rare',1],tm07:[22,60,'rare',1],tm08:[10,70,'rare',1],tm09:[20,69,'rare',1],tm10:[18,59,'rare',1],tm18:[40,100,'legendary',1],tm19:[45,100,'legendary',1]};
 for(const [id,[min,max,tier,weight]] of Object.entries(expected)){
  const cfg=config[id];assert.equal(cfg.minLevel,min,id+' min');assert.equal(cfg.maxLevelExclusive,max+1,id+' max');assert.equal(cfg.tier??'normal',tier,id+' tier');assert.equal(cfg.weight??1,weight,id+' weight');
 }
 assert.match(app,/function tm01Targets\(\).*?m\.level>=22&&m\.level<=60/);
 assert.match(app,/기술머신01\.메가톤펀치[^'\\n]*Lv\.22~60/);
});
