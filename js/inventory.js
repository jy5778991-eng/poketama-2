import {SHOP_ITEMS,ITEM_CATEGORY_LABELS,itemCategory} from './data/items.js';
import {getForm} from './data/pokemon.js';
import {calculateStats} from '../battle-engine.mjs';

// Isolated bag/shop renderer. Mutations are committed through callbacks from app.js.
export function renderInventoryView({$,inventoryMode,inventoryCategory,inventory,progress,chosen,playerIVs,storedHp,saveProgress,renderHome,setStoredHp,chooseRecoveryTarget}){
 $('shopMoney').textContent='💰 '+progress.money.toLocaleString('ko-KR')+'원';
 $('inventoryScreenTitle').textContent=inventoryMode==='shop'?'🏪 프렌들리숍':'🎒 가방';
 $('inventoryFootnote').textContent=inventoryMode==='shop'
  ?'일반 아이템 최대 99개 · 중요 아이템은 1개만 보유 가능'
  :'기력의조각은 기절한 동료 부활 · 포켓몬 센터는 기절한 동료가 있을 때 이용';
 document.querySelectorAll('[data-item-category]').forEach(button=>{
  const selected=button.dataset.itemCategory===inventoryCategory;
  button.setAttribute('aria-selected',String(selected));
  button.tabIndex=selected?0:-1;
 });
 const list=$('inventoryItems');list.replaceChildren();
 const items=SHOP_ITEMS.filter(item=>itemCategory(item)===inventoryCategory&&(inventoryMode!=='shop'||!item.notForSale)&&(inventoryMode==='shop'||item.category!=='key'||inventory[item.id]===1));
 if(items.length===0){
  const placeholder=document.createElement('div');placeholder.className='inventory-empty';
  placeholder.textContent=inventoryMode==='shop'
   ? ITEM_CATEGORY_LABELS[inventoryCategory]+' 아이템은 아직 판매하지 않아.'
   : ITEM_CATEGORY_LABELS[inventoryCategory]+' 아이템이 아직 없어.';
  list.append(placeholder);return;
 }
 for(const item of items){
  const row=document.createElement('div');row.className='shop-item-row';
  const info=document.createElement('div');info.className='shop-item-info';
  const name=document.createElement('strong');name.textContent=item.icon+' '+item.name;
  const description=document.createElement('small');
  description.textContent=item.description+' · '+(item.category==='key'?(inventory[item.id]?'보유':'미보유'):(inventoryMode==='shop'?'보유 '+inventory[item.id]+'개':'×'+inventory[item.id]));
  info.append(name,description);row.append(info);
  if(inventoryMode==='shop'){
   const buy=document.createElement('button');buy.type='button';buy.className='shop-buy';
   const unique=item.category==='key'||item.unique;
   const blockedB=item.id==='partySlotB'&&!inventory.partySlotA;
   buy.textContent=inventory[item.id]&&unique?'보유 완료':blockedB?'슬롯A 필요':item.price.toLocaleString('ko-KR')+'원 · 구매';
   buy.disabled=(unique?inventory[item.id]>=1:inventory[item.id]>=99)||blockedB||progress.money<item.price;
   buy.onclick=()=>{
    if((unique?inventory[item.id]>=1:inventory[item.id]>=99)||(item.id==='partySlotB'&&!inventory.partySlotA)||progress.money<item.price)return;
    progress.money-=item.price;inventory[item.id]=unique?1:inventory[item.id]+1;
    saveProgress();renderHome();renderInventoryView({$,inventoryMode,inventoryCategory,inventory,progress,chosen,playerIVs,storedHp,saveProgress,renderHome,setStoredHp,chooseRecoveryTarget});
   };
   row.append(buy);
  }else if(item.category==='heal'){
   const use=document.createElement('button');use.type='button';use.className='shop-buy';
   use.textContent='사용';
   const max=calculateStats(getForm(chosen,progress.level).base,progress.level,playerIVs,{}).hp;
   const hp=storedHp===null?max:storedHp;
   use.disabled=inventory[item.id]===0||(item.id==='revive'?false:hp>=max);
   if(item.id==='revive'){
    use.onclick=()=>{if(inventory[item.id]<1)return;chooseRecoveryTarget(item);};
    row.append(use);list.append(row);continue;
   }
   use.onclick=()=>{
    const maxHp=calculateStats(getForm(chosen,progress.level).base,progress.level,playerIVs,{}).hp;
    const current=storedHp===null?maxHp:storedHp;
    if(inventory[item.id]===0||current>=maxHp)return;
    setStoredHp(Math.min(maxHp,current+item.power));inventory[item.id]--;
    saveProgress();renderHome();
   };
   row.append(use);
  }
  list.append(row);
 }
}
