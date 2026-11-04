// Run: node --experimental-default-type=module --test tests/base-stats.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE_STATS} from '../js/data/base-stats.js';
import {ENCOUNTERS, DEX_CATALOG} from '../js/data/areas.js';
import {STARTERS, EVOLUTIONS} from '../js/data/pokemon.js';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const keys=['hp','attack','defense','speed'];
const expected={
 12:[60,90,70,75],26:[65,90,73,110],27:[50,75,68,40],28:[75,100,93,65],
 65:[55,135,80,120],72:[40,50,78,70],73:[80,80,103,100],74:[40,80,75,20],
 75:[55,95,90,35],76:[80,120,108,45],90:[30,65,73,40],91:[50,95,133,70],
 95:[35,45,123,70],98:[30,105,68,50],99:[55,130,93,75],
 106:[50,120,92,87],109:[40,65,80,35],110:[65,90,105,60],
 111:[80,85,73,25],112:[105,130,93,40],113:[250,35,75,50],
 114:[65,100,88,60],117:[55,95,80,85],122:[40,100,103,90],
 124:[65,115,75,95],136:[65,130,110,65],139:[70,115,108,55],
 197:[110,65,130,65],208:[75,85,153,30]
};
function stats(dex){const base=BASE_STATS[dex];assert.ok(base,'Missing species #'+dex);return keys.map(k=>base[k]);}

test('exactly 159 species, all immutable and valid',()=>{
 assert.equal(Object.keys(BASE_STATS).length,159);
 for(const [dex,base] of Object.entries(BASE_STATS)){
  assert.ok(Object.isFrozen(base),'Not frozen #'+dex);
  for(const key of keys)assert.ok(Number.isInteger(base[key])&&base[key]>0,'Invalid '+key+' #'+dex);
 }
});

test('29 legacy species adjustments remain unchanged',()=>{
 assert.equal(Object.keys(expected).length,29);
 for(const [dex,values] of Object.entries(expected))assert.deepEqual(stats(dex),values,'Changed adjustment #'+dex);
});

test('every wild encounter and dex catalog entry resolves to the same species base',()=>{
 for(const entries of Object.values(ENCOUNTERS))
  for(const entry of entries)assert.deepEqual(stats(entry.dex),keys.map(k=>BASE_STATS[entry.dex][k]));
 for(const entry of DEX_CATALOG)stats(entry.dex);
});

test('all starter and evolved forms resolve to the same species base',()=>{
 for(const starter of STARTERS)if(starter.dex!=null)stats(starter.dex);
 for(const forms of Object.values(EVOLUTIONS))for(const form of forms)stats(form.dex);
});

test('battle and party calculations use central species base',()=>{
 assert.match(app,/function memberBase\(m\)\s*\{\s*const base=BASE_STATS\[m\.dex\]/);
 assert.match(app,/calculateStats\(BASE_STATS\[dex\],level,ivs,evs\)/);
 assert.match(app,/calculateStats\(BASE_STATS\[wild\.dex\],level,zeroIV,\{\}\)/);
 assert.match(app,/fighter\(s,playerIVs,progress\.level,BASE_STATS\[form\.dex\]/);
 assert.match(app,/calculateStats\(BASE_STATS\[getForm\(chosen,progress\.level\)\.dex\]/);
});

test('wild enemy has zero IV, captured Pokemon rerolls IV and starts with zero EV',()=>{
 assert.match(app,/const zeroIV=\{hp:0,attack:0,defense:0,speed:0\}/);
 assert.match(app,/const randomIVs=\(\)=>Object\.fromEntries\(STAT_KEYS\.map\(key=>\[key,Math\.floor\(Math\.random\(\)\*17\)\]\)\)/);
 assert.match(app,/const member=\{family,name:wildEnemy\.name,dex:wildEnemy\.dex,level:wildEnemy\.level,exp:0,ivs:randomIVs\(\),evs:\{hp:0,attack:0,defense:0,speed:0\}/);
});

test('rival Green first fight has IV 8 EV 0; other trainer tuning preserved',()=>{
 assert.match(app,/blue:\[8,0\],greenReturn:\[8,10\]/);
 assert.match(app,/rocketApollo:\[12,20\],rocketAthena:\[12,20\],rocketGiovanni:\[16,54\]/);
 assert.match(app,/league0:\[14,10\],league1:\[14,10\],league2:\[14,10\],league3:\[14,10\],league4:\[16,54\],red:\[16,54\]/);
});
