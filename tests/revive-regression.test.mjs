import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
function extract(name){
 const start=source.indexOf('function '+name+'(');
 assert.notEqual(start,-1,'Missing function '+name);
 const brace=source.indexOf('{',start);let depth=0;
 for(let i=brace;i<source.length;i++){
  if(source[i]==='{')depth++;
  if(source[i]==='}'&&!--depth)return source.slice(start,i+1);
 }
 throw new Error('Unclosed function '+name);
}
test('revive and potion synchronize saved HP with the cached battle fighter',()=>{
 const cached={hp:0,stats:{hp:100}};
 const battleRoster=new Map([['companion-dragon',{...cached}]]);
 const companions=[{family:'dragon',hp:0}];
 const context={battleRoster,companions,storedHp:0};
 vm.runInNewContext(extract('setMemberHp')+'; globalThis.setMemberHp=setMemberHp;',context);
 const member={key:'companion-dragon',family:'dragon',starter:false};
 context.setMemberHp(member,50);
 assert.equal(companions[0].hp,50);
 assert.equal(battleRoster.get(member.key).hp,50);
 context.setMemberHp(member,85);
 assert.equal(companions[0].hp,85);
 assert.equal(battleRoster.get(member.key).hp,85);
});
test('battle revive calls synchronized setter and replacement reads saved HP',()=>{
 const revive=extract('reviveMember');
 const replacement=extract('sendOutReplacement');
 assert.match(revive,/setMemberHp\(m,hp\)/);
 assert.match(replacement,/battle\.player\.hp=memberHp\(m\)/);
 assert.match(source,/needsReplacement=survivingReserves\.length>0/);
});
test('defeat cannot stand when a revived reserve is alive',()=>{
 const section=source.slice(source.indexOf('if(battle.player.hp===0){',source.indexOf('async function act(')));
 assert.match(section,/teamMembers\(\)\.filter\(m=>m\.key!==activeBattleKey&&memberHp\(m\)>0\)/);
 assert.match(section,/if\(battle\.result!=='victory'\)\{battle\.ended=false;battle\.result=null;\}/);
});

test('faint and revive clear every cached stat rank before re-entry',()=>{
 const fighter={hp:0,stages:{attack:3,defense:-2,speed:4,evasion:2,accuracy:-1},status:{type:'poison'},confusionTurns:2,lockedMove:{id:'thrash'}};
 const battleRoster=new Map([['companion-dragon',fighter]]);
 const companions=[{family:'dragon',hp:0}];
 const context={battleRoster,companions,inventory:{revive:1},memberMaxHp:()=>100,memberHp:m=>companions[0].hp,appendAdventureLog:()=>{}};
 vm.runInNewContext([extract('resetFighterStages'),extract('resetFighterAfterFaint'),extract('setMemberHp'),extract('reviveMember')].join('\n')+';globalThis.reviveMember=reviveMember;globalThis.resetFighterAfterFaint=resetFighterAfterFaint;',context);
 const member={key:'companion-dragon',family:'dragon',starter:false,name:'테스트'};
 context.resetFighterAfterFaint(fighter);
 assert.deepEqual(Object.values(fighter.stages),[0,0,0,0,0]);
 assert.equal(fighter.stages.accuracy,0,'Sand Attack accuracy -1 must reset to 0');
 assert.equal(fighter.status,null);
 fighter.stages.attack=6;
 assert.equal(context.reviveMember(member),true);
 assert.equal(fighter.hp,50);
 assert.deepEqual(Object.values(fighter.stages),[0,0,0,0,0]);
 assert.equal(fighter.stages.accuracy,0,'Sand Attack accuracy -1 must reset to 0');
});
test('ordinary switch and post-faint replacement keep ranks at zero',()=>{
 const start=source.indexOf('function requestBattleSwitch(');
 const switchSection=source.slice(start,source.indexOf('function makeCompanionFighter',start));
 assert.match(switchSection,/resetFighterStages\(battle\.player\)/);
 const replacement=extract('sendOutReplacement');
 assert.match(replacement,/battle\.player\.hp=memberHp\(m\)/);
 const faintSection=source.slice(source.indexOf('if(battle.player.hp===0){',source.indexOf('async function act(')));
 assert.match(faintSection,/resetFighterAfterFaint\(battle\.player\)/);
});

test('Shell Bell healing scales by 5% per copy and NPCs are capped at three',()=>{
 const engine=readFileSync(new URL('../battle-engine.mjs',import.meta.url),'utf8');
 const items=readFileSync(new URL('../js/data/items.js',import.meta.url),'utf8');
 assert.equal(engine.split('actual*0.05*(user.shellBellCount??1)').length-1,2);
 assert.match(items,/실제 피해의 5% HP 회복 · 최대 3개 보유 · 포켓몬당 최대 3개 장착/);
 assert.match(source,/shellBell:3/);
 assert.match(source,/id==='shellBell'\?3/);
 assert.match(source,/enemy\.heldItemCounts\[id\]=Math\.min\(HELD_MAX\[id\]\?\?99,heldItemPerPokemonLimit\(id\)/);
 assert.match(source,/enemy\.shellBellCount=enemy\.heldItemCounts\.shellBell\|\|0/);
});
