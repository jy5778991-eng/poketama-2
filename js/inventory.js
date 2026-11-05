import {SHOP_ITEMS,ITEM_CATEGORY_LABELS,itemCategory,itemSpriteUrl} from './data/items.js?v=20261104-revival-seed275';
import {getForm} from './data/pokemon.js';
import {calculateStats} from '../battle-engine.mjs?v=20261102-shell-scope-exp191';

// Isolated bag/shop renderer. Mutations are committed through callbacks from app.js.
export function renderInventoryView({$,inventoryMode,inventoryCategory,inventory,battleItemHolders,heldItems,progress,chosen,playerIVs,storedHp,saveProgress,renderHome,setStoredHp,chooseRecoveryTarget,onHeldSelect,onMapUse,partyMembers=[],expShareActive=false,onExpShareToggle}){
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
 const items=SHOP_ITEMS.filter(item=>itemCategory(item)===inventoryCategory&&(inventoryMode!=='shop'||!item.notForSale)&&true);
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
  const name=document.createElement('strong');const icon=document.createElement('img');icon.className='shop-item-sprite';icon.src=itemSpriteUrl(item.id);icon.alt='';icon.loading='lazy';icon.onerror=()=>{const fallback=document.createElement('span');fallback.textContent=item.icon||'🎁';icon.replaceWith(fallback);};name.append(icon,document.createTextNode(' '+item.name+(inventoryMode==='bag'&&(heldItems.includes(item.id)||item.id==='expShare'||!(item.category==='key'||item.unique))?' ×'+(inventory[item.id]||0):'')));
  const description=document.createElement('small');
  description.textContent=inventoryMode==='shop'?item.description+' · 보유 '+(inventory[item.id]||0)+'개':item.description;
  if(inventoryMode==='bag'&&heldItems.includes(item.id)&&inventory[item.id]>0){
   const holders=battleItemHolders[item.id]||[];
   const owners=[...new Set(holders)].map(key=>{
    const name=partyMembers.find(m=>m.key===key)?.name;
    const count=holders.filter(k=>k===key).length;
    return name?(['hardClaw','scopeLens'].includes(item.id)?name+' '+count+'개':name):null;
   }).filter(Boolean);
   const status=document.createElement('small');status.className='bag-held-status';
   status.textContent='장착 '+holders.length+'개 · 미장착 '+Math.max(0,(inventory[item.id]||0)-holders.length)+'개'+(owners.length?' · '+owners.join(' · '):'');
   info.append(status);
  }
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
    saveProgress();renderHome();renderInventoryView({$,inventoryMode,inventoryCategory,inventory,battleItemHolders,heldItems,progress,chosen,playerIVs,storedHp,saveProgress,renderHome,setStoredHp,chooseRecoveryTarget,onHeldSelect});
   };
   row.append(buy);
  }else if(item.category==='key'){
   if(item.id==='expShare'&&inventoryMode==='bag'&&inventory.expShare){const toggle=document.createElement('button');toggle.type='button';toggle.className='shop-buy';toggle.textContent=expShareActive?'비활성':'활성';toggle.onclick=()=>onExpShareToggle?.();row.append(toggle);}
    if(item.id==='map'&&inventoryMode==='bag'&&inventory.map){const use=document.createElement('button');use.type='button';use.className='shop-buy';use.textContent='사용';use.onclick=()=>onMapUse?.();row.append(use);}
   const status=document.createElement('button');status.type='button';status.className='shop-buy';status.textContent=inventory[item.id]?'보유':'미보유';status.disabled=true;status.classList.toggle('item-missing',!inventory[item.id]);row.append(status);
  }else if(heldItems.includes(item.id)){
   const equipped=(battleItemHolders[item.id]||[]).length;
   description.textContent=item.description;
   const pick=document.createElement('button');pick.type='button';pick.className='shop-buy';
   pick.textContent=inventory[item.id]?'선택':'미보유';pick.disabled=!inventory[item.id];pick.classList.toggle('item-missing',!inventory[item.id]);
   pick.onclick=()=>onHeldSelect?.(item.id);
   row.append(pick);
  }else if(item.category==='heal'){
   const use=document.createElement('button');use.type='button';use.className='shop-buy';
   use.textContent='대상 선택';
   use.disabled=inventory[item.id]===0;
   use.onclick=()=>{if(inventory[item.id]>0)chooseRecoveryTarget(item);};
   row.append(use);
  }
  list.append(row);
 }
}

// Key-item ownership is shown by the status button, without repeating the status in descriptions.
