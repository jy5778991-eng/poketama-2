// Dev-only fast travel rules. Mirrors real unlock prerequisites without issuing rewards.
export function resolveDeveloperWarp({requestedLevel,money,targetArea}){
 if(!Number.isInteger(requestedLevel)||requestedLevel<1||requestedLevel>100||
    !Number.isSafeInteger(money)||money<0||money>999999999||
    !['grass','forest','cave','lake','cemetery','road','city','sea','volcano','strangeForest','championRoad'].includes(targetArea))return null;
 const minLevel=targetArea==='championRoad'?55:targetArea==='strangeForest'?49:targetArea==='volcano'?47:targetArea==='sea'?42:targetArea==='city'?36:targetArea==='road'?30:targetArea==='cemetery'?24:targetArea==='lake'?17:targetArea==='cave'?12:targetArea==='forest'?5:1;
 return {
  targetLevel:Math.max(requestedLevel,minLevel),
  money,area:targetArea,
  blueCleared:targetArea!=='grass',
  brockCleared:['cave','lake','cemetery','road','city','sea','volcano','strangeForest'].includes(targetArea),
  mistyCleared:['lake','cemetery','road','city','sea','volcano','strangeForest'].includes(targetArea),
  greenReturnCleared:['cemetery','road','city','sea','volcano','strangeForest'].includes(targetArea),surgeCleared:['cemetery','road','city','sea','volcano','strangeForest'].includes(targetArea),greenThirdCleared:['road','city','sea','volcano','strangeForest'].includes(targetArea),erikaCleared:['road','city','sea','volcano','strangeForest'].includes(targetArea),kogaCleared:['city','sea','volcano','strangeForest'].includes(targetArea),sabrinaCleared:['sea','volcano','strangeForest'].includes(targetArea),blaineCleared:['strangeForest','championRoad'].includes(targetArea),giovanniCleared:targetArea==='championRoad'
 };
}
