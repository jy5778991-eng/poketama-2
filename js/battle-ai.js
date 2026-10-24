import {MOVES} from '../data/moves.js';
// Exactly two opponent AI modes; trainer AI is shared by all trainer ranks.
export function chooseEnemyMove(enemy,{wild=false,rng=Math.random}={}){
 const usable=enemy.moveIds.filter(id=>enemy.pp[id]>0);
 if(!usable.length)return {moveId:'struggle'};
 if(wild)return {moveId:usable[Math.floor(rng()*usable.length)]};
 const ranked=[...usable].sort((a,b)=>(MOVES[b].power??0)-(MOVES[a].power??0));
 return {moveId:ranked[0]};
}
