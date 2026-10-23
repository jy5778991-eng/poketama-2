// Dev-only fast travel rules. Mirrors real unlock prerequisites without issuing rewards.
export function resolveDeveloperWarp({requestedLevel,money,targetArea}){
 if(!Number.isInteger(requestedLevel)||requestedLevel<1||requestedLevel>100||
    !Number.isSafeInteger(money)||money<0||money>999999999||
    !['grass','forest','cave','lake','road'].includes(targetArea))return null;
 const minLevel=targetArea==='road'?30:targetArea==='lake'?17:targetArea==='cave'?12:targetArea==='forest'?5:1;
 return {
  targetLevel:Math.max(requestedLevel,minLevel),
  money,area:targetArea,
  blueCleared:targetArea!=='grass',
  brockCleared:['cave','lake','road'].includes(targetArea),
  mistyCleared:['lake','road'].includes(targetArea),
  greenReturnCleared:targetArea==='road',surgeCleared:targetArea==='road',greenThirdCleared:targetArea==='road',erikaCleared:targetArea==='road'
 };
}
