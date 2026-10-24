// Dev-only fast travel rules. Mirrors real unlock prerequisites without issuing rewards.
export function resolveDeveloperWarp({requestedLevel,money,targetArea}){
 if(!Number.isInteger(requestedLevel)||requestedLevel<1||requestedLevel>100||
    !Number.isSafeInteger(money)||money<0||money>999999999||
    !['grass','forest','cave','lake','cemetery','town','road','city','sea','volcano','strangeForest','championRoad'].includes(targetArea))return null;
 const minLevel=targetArea==='championRoad'?57:targetArea==='strangeForest'?51:targetArea==='volcano'?49:targetArea==='sea'?44:targetArea==='city'?37:targetArea==='road'?31:targetArea==='town'?27:targetArea==='cemetery'?24:targetArea==='lake'?17:targetArea==='cave'?12:targetArea==='forest'?5:1;
 return {
  targetLevel:Math.max(requestedLevel,minLevel),
  money,area:targetArea,
  blueCleared:targetArea!=='grass',
  brockCleared:['cave','lake','cemetery','town','road','city','sea','volcano','strangeForest'].includes(targetArea),
  mistyCleared:['lake','cemetery','town','road','city','sea','volcano','strangeForest'].includes(targetArea),
  greenReturnCleared:['cemetery','town','road','city','sea','volcano','strangeForest'].includes(targetArea),surgeCleared:['cemetery','town','road','city','sea','volcano','strangeForest'].includes(targetArea),greenThirdCleared:['town','road','city','sea','volcano','strangeForest'].includes(targetArea),erikaCleared:['road','city','sea','volcano','strangeForest'].includes(targetArea),kogaCleared:['city','sea','volcano','strangeForest'].includes(targetArea),greenFourthCleared:['sea','volcano','strangeForest','championRoad'].includes(targetArea),sabrinaCleared:['sea','volcano','strangeForest'].includes(targetArea),blaineCleared:['strangeForest','championRoad'].includes(targetArea),giovanniCleared:targetArea==='championRoad'
 };
}
