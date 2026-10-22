// Extracted from the original app.js; save data and game rules stay compatible.
export const base='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/';
export const staticImage=(id,back=false)=>base+(back?'back/':'')+id+'.png';
export const animatedImage=(id,back=false)=>base+'animated/'+(back?'back/':'')+id+'.gif';
