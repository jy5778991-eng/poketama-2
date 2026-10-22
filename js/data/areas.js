// Extracted from the original app.js; save data and game rules stay compatible.
// Stage 1/2 encounters: weights total 100 in each stage. 1% species are treated as rare (0.25x catch multiplier).
export const ENCOUNTERS={
 grass: [{"name":"구구","dex":16,"weight":26,"rare":false,"base":{"hp":40,"attack":45,"defense":38,"speed":56}},{"name":"꼬렛","dex":19,"weight":24,"rare":false,"base":{"hp":30,"attack":56,"defense":35,"speed":72}},{"name":"깨비참","dex":21,"weight":20,"rare":false,"base":{"hp":40,"attack":60,"defense":31,"speed":70}},{"name":"니드런♀","dex":29,"weight":14,"rare":false,"base":{"hp":55,"attack":47,"defense":46,"speed":41}},{"name":"니드런♂","dex":32,"weight":15,"rare":false,"base":{"hp":46,"attack":57,"defense":40,"speed":50}},{"name":"이브이","dex":133,"weight":1,"rare":true,"base":{"hp":55,"attack":55,"defense":58,"speed":55}}],
 forest: [{"name":"뿔충이","dex":13,"weight":35,"rare":false,"base":{"hp":40,"attack":35,"defense":25,"speed":50}},{"name":"딱충이","dex":14,"weight":20,"rare":false,"base":{"hp":45,"attack":25,"defense":38,"speed":35}},{"name":"뚜벅쵸","dex":43,"weight":18,"rare":false,"base":{"hp":45,"attack":75,"defense":60,"speed":30}},{"name":"모다피","dex":69,"weight":17,"rare":false,"base":{"hp":50,"attack":75,"defense":33,"speed":40}},{"name":"파라스","dex":46,"weight":9,"rare":false,"base":{"hp":35,"attack":70,"defense":55,"speed":25}},{"name":"독침붕","dex":15,"weight":1,"rare":true,"base":{"hp":65,"attack":90,"defense":60,"speed":75}}],
};
export const DEX_EXTRA=[{name:'꼬마돌',dex:74},{name:'롱스톤',dex:95},{name:'별가사리',dex:120},{name:'아쿠스타',dex:121}];
export const DEX_CATALOG=[...new Map([...Object.values(ENCOUNTERS).flat(),...DEX_EXTRA].map(p=>[p.dex,p])).values()].sort((x,y)=>x.dex-y.dex);
export const EVOLVED_DEX=new Set([14,15,20,22,30,31,33,34,44,45,47,70,71,75,76,95,121]);
export const LEGENDARY_DEX=new Set([144,145,146,150,151]);
export function pokemonCatchMultiplier(dex,rare=false){
 if(LEGENDARY_DEX.has(dex))return 0.1;
 if(rare)return 0.25;
 return EVOLVED_DEX.has(dex)?0.5:1;
}
export function pokemonCatchChance(hpFraction,pokemonMultiplier,ballMultiplier=1){
 return Math.max(0,Math.min(1,((300-200*Math.max(0,Math.min(1,hpFraction)))/300)*pokemonMultiplier*ballMultiplier));
}
export const pickEncounter=area=>{const entries=ENCOUNTERS[area],roll=Math.random()*100;let total=0;return entries.find(e=>(total+=e.weight)>roll)||entries.at(-1);};
