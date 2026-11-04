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
