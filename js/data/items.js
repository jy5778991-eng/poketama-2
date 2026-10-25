// Extracted from the original app.js; save data and game rules stay compatible.
export const SHOP_ITEMS=[{"id":"pokeBall","name":"몬스터볼","price":200,"icon":"🔴","description":"기본 포획률","category":"ball","power":0,"multiplier":1},{"id":"greatBall","name":"슈퍼볼","price":500,"icon":"🔵","description":"포획률 ×1.5","category":"ball","power":0,"multiplier":1.5},{"id":"ultraBall","name":"하이퍼볼","price":1000,"icon":"🟡","description":"포획률 ×2","category":"ball","power":0,"multiplier":2},{"id":"masterBall","name":"마스터볼","price":0,"icon":"🟣","description":"포획 성공률 100% · 전설 보상 전용","category":"ball","power":0,"multiplier":1,"guaranteedCatch":true,"notForSale":true},{"id":"potion","name":"상처약","price":150,"icon":"🧪","description":"HP 20 회복","category":"heal","power":20,"multiplier":1},{"id":"superPotion","name":"좋은상처약","price":400,"icon":"💊","description":"HP 60 회복","category":"heal","power":60,"multiplier":1},{"id":"hyperPotion","name":"고급상처약","price":900,"icon":"💉","description":"HP 200 회복","category":"heal","power":200,"multiplier":1} ,{"id":"secretSwitch","name":"비밀 스위치","price":0,"icon":"🔘","description":"로켓단 비밀기지 입장 열쇠 · 전설 보상 전용","category":"key","notForSale":true},{"id":"partySlotA","name":"포켓몬 추가 슬롯A","price":100,"icon":"👥","description":"동료 슬롯 2번째 해금 · 1회만 획득","category":"key","unique":true},{"id":"partySlotB","name":"포켓몬 추가 슬롯B","price":100,"icon":"👥","description":"동료 슬롯 3번째 해금 · 슬롯A 필요 · 1회만 획득","category":"key","unique":true},{"id":"oldSeaMap","name":"오래된해도","price":0,"icon":"🗺️","description":"환상의 섬 입장 지도 · 전설 보상 전용","category":"key","notForSale":true}];
export const START_INVENTORY={pokeBall:3,greatBall:0,ultraBall:0,masterBall:0,potion:3,superPotion:0,hyperPotion:0,secretSwitch:0,oldSeaMap:0,partySlotA:0,partySlotB:0};
export const ITEM_CATEGORY_LABELS={heal:'회복',ball:'볼',use:'사용',move:'기술',key:'중요'};
export function itemCategory(item){
 if(item.category==='heal')return 'heal';
 if(item.category==='ball')return 'ball';
 if(item.category==='move'||item.category==='tm')return 'move';
 if(item.category==='key'||item.category==='important')return 'key';
 return 'use';
}
