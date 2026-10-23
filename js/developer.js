// Dev-only fast travel rules. Mirrors real unlock prerequisites without issuing rewards.
export function resolveDeveloperWarp({requestedLevel,money,targetArea}){
 if(!Number.isInteger(requestedLevel)||requestedLevel<1||requestedLevel>100||
    !Number.isSafeInteger(money)||money<0||money>999999999||
    !['grass','forest','cave','lake','cemetery','road'].includes(targetArea))return null;
 const minLevel=targetArea==='road'?30:targetArea==='cemetery'?24:targetArea==='lake'?17:targetArea==='cave'?12:targetArea==='forest'?5:1;
 return {
  targetLevel:Math.max(requestedLevel,minLevel),
  money,area:targetArea,
  blueCleared:targetArea!=='grass',
  brockCleared:['cave','lake','cemetery','road'].includes(targetArea),
  mistyCleared:['lake','cemetery','road'].includes(targetArea),
  greenReturnCleared:['cemetery','road'].includes(targetArea),surgeCleared:['cemetery','road'].includes(targetArea),greenThirdCleared:targetArea==='road',erikaCleared:targetArea==='road'
 };
}
