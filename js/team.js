// Party state utilities. Do not modify legacy starter save fields.
// Member identity is the evolution-family key, not just the current dex number.
export const MAX_PARTY_SIZE=3;
export const PARTY_IV_STATS=['hp','attack','defense','speed'];
export function makeStarterMember(starterId){
 return {family:starterId,starter:true};
}
export function normalizeParty(saved,starterId){
 const maxSlots=Math.min(MAX_PARTY_SIZE,Math.max(1,Number.isInteger(saved?.partySlots)?saved.partySlots:1));
 const members=[makeStarterMember(starterId)];
 for(const member of Array.isArray(saved?.party)?saved.party:[]){
  if(!member||member.starter||typeof member.family!=='string'||!Number.isInteger(member.dex)||!Number.isInteger(member.level)||member.level<1||member.level>100)continue;
  if(members.some(m=>m.family===member.family)||members.length>=maxSlots)continue;
  if(!PARTY_IV_STATS.every(k=>Number.isInteger(member.ivs?.[k])&&member.ivs[k]>=0&&member.ivs[k]<=16))continue;
  members.push({...member,starter:false});
 }
 return {maxSlots,members};
}
export function increasePartySlots(party){
 party.maxSlots=Math.min(MAX_PARTY_SIZE,party.maxSlots+1);
 return party.maxSlots;
}
export function partyCanJoin(party,member){
 if(!member||party.members.some(m=>m.family===member.family))return false;
 return party.members.length<party.maxSlots;
}
export function joinOrReplace(party,member,replacementIndex=null){
 if(!member||party.members.some(m=>m.family===member.family))return false;
 if(party.members.length<party.maxSlots){party.members.push(member);return true;}
 if(!Number.isInteger(replacementIndex)||replacementIndex<0||replacementIndex>=party.members.length||party.members[replacementIndex].starter)return false;
 party.members.splice(replacementIndex,1,member);return true;
}
export function reorderParty(party,from,to){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>=party.members.length||to<0||to>=party.members.length)return false;
 const [member]=party.members.splice(from,1);
 party.members.splice(to,0,member);
 return true;
}
export function participationExperience(base,participated){
 return Math.floor(base*(participated?1:0.7));
}
