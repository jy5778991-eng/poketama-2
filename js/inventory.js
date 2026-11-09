import {SHOP_ITEMS,ITEM_CATEGORY_LABELS,itemCategory,itemSpriteUrl} from './data/items.js?v=20261109-inheritance-ticket-desc-v2';
import {getForm} from './data/pokemon.js';
import {calculateStats} from '../battle-engine.mjs?v=20261102-shell-scope-exp191';

// Isolated bag/shop renderer. Mutations are committed through callbacks from app.js.
export function renderInventoryView({$,inventoryMode,inventoryCategory,inventory,battleItemHolders,heldItems,progress,chosen,playerIVs,storedHp,saveProgress,renderHome,setStoredHp,chooseRecoveryTarget,chooseVitaminTarget,onHeldSelect,onMapUse,partyMembers=[],expShareActive=false,onExpShareToggle,inheritanceTicketLimit=3,inheritanceTicketUnlocked=false,inheritanceTicketPrice=20000,onInheritanceTicketBuy,onInheritanceTicketUse}){
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
  const name=document.createElement('strong');const icon=document.createElement('img');icon.className='shop-item-sprite';icon.src=itemSpriteUrl(item.id);icon.alt='';icon.loading='lazy';icon.onerror=()=>{const fallback=document.createElement('span');fallback.textContent=item.icon||'🎁';icon.replaceWith(fallback);};name.append(icon,document.createTextNode(' '+item.name+(inventoryMode==='bag'&&(heldItems.includes(item.id)||item.id==='expShare'||item.id==='inheritanceTicket'||!(item.category==='key'||item.unique))?' ×'+(inventory[item.id]||0):'')));
  const description=document.createElement('small');
  description.textContent=inventoryMode==='shop'?item.description+' · 보유 '+(inventory[item.id]||0)+'개':item.description;
  if(item.id==='inheritanceTicket')description.textContent+=' · 한도 '+inheritanceTicketLimit+'장';
  if(inventoryMode==='bag'&&heldItems.includes(item.id)&&inventory[item.id]>0){
   const holders=battleItemHolders[item.id]||[];
   const owners=[...new Set(holders)].map(key=>{
    const name=partyMembers.find(m=>m.key===key)?.name;
    const count=holders.filter(k=>k===key).length;
    return name?(['hardClaw','scopeLens','focusSash','shellBell','leftovers','quickClaw','eviolite'].includes(item.id)?name+' '+count+'개':name):null;
   }).filter(Boolean);
   const status=document.createElement('small');status.className='bag-held-status';
   status.textContent='장착 '+holders.length+'개 · 미장착 '+Math.max(0,(inventory[item.id]||0)-holders.length)+'개'+(owners.length?' · '+owners.join(' · '):'');
   info.append(status);
  }
  info.append(name,description);row.append(info);
  if(inventoryMode==='shop'){
   const buy=document.createElement('button');buy.type='button';buy.className='shop-buy';
   const ticket=item.id==='inheritanceTicket';
   const unique=!ticket&&(item.category==='key'||item.unique);
   const stockLimit=ticket?inheritanceTicketLimit:['eviolite','sitrusBerry','oranBerry'].includes(item.id)?5:unique?1:99;
   const blockedB=item.id==='partySlotB'&&!inventory.partySlotA;
   const locked=ticket&&!inheritanceTicketUnlocked;
   const price=ticket?inheritanceTicketPrice:item.price;
   buy.textContent=locked?'리그 제패 후 구매 가능':inventory[item.id]>=stockLimit?'최대 보유':blockedB?'슬롯A 필요':price.toLocaleString('ko-KR')+'원 · 구매';
   buy.disabled=locked||inventory[item.id]>=stockLimit||blockedB||progress.money<price;
   if(locked){buy.classList.add('item-missing');buy.style.opacity='0.45';}
   buy.onclick=()=>{
    if(ticket){onInheritanceTicketBuy?.();return;}
    if(inventory[item.id]>=stockLimit||(item.id==='partySlotB'&&!inventory.partySlotA)||progress.money<price)return;
    progress.money-=price;inventory[item.id]=unique?1:inventory[item.id]+1;
    saveProgress();renderHome();renderInventoryView({$,inventoryMode,inventoryCategory,inventory,battleItemHolders,heldItems,progress,chosen,playerIVs,storedHp,saveProgress,renderHome,setStoredHp,chooseRecoveryTarget,chooseVitaminTarget,onHeldSelect,inheritanceTicketLimit,inheritanceTicketUnlocked,inheritanceTicketPrice,onInheritanceTicketBuy,onInheritanceTicketUse});
   };
   row.append(buy);
  }else if(item.category==='key'){
   if(item.id==='expShare'&&inventoryMode==='bag'&&inventory.expShare){const toggle=document.createElement('button');toggle.type='button';toggle.className='shop-buy';toggle.textContent=expShareActive?'비활성':'활성';toggle.onclick=()=>onExpShareToggle?.();row.append(toggle);}
    if(item.id==='inheritanceTicket'&&inventoryMode==='bag'&&inventory.inheritanceTicket){const use=document.createElement('button');use.type='button';use.className='shop-buy';use.textContent='사용';use.onclick=()=>onInheritanceTicketUse?.();row.append(use);}
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
   use.disabled=!inventory[item.id];
   use.onclick=()=>{if(inventory[item.id]>0)(item.evStat?chooseVitaminTarget:chooseRecoveryTarget)?.(item);};
   row.append(use);
  }
  list.append(row);
 }
}

// Key-item ownership is shown by the status button, without repeating the status in descriptions.
