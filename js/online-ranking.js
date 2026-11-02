// Online ranking is deliberately isolated from the offline single-player game.
// The Supabase client loads only when a player opens the ranking and connects.
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './online-ranking-config.js';

const STARTERS=[['eevee','이브이'],['snorlax','먹고자'],['dragonite','미뇽'],['venusaur','이상해씨'],['charizard','파이리'],['blastoise','꼬부기'],['raichu','피츄'],['butterfree','캐터피'],['gengar','고오스'],['gyarados','잉어킹']];
const NAME_KEY='poketama-2-ranking-nickname-v1';
let clientPromise=null,overlay=null,tab='dex',selectedStarter='eevee';
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const configured=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL)&&SUPABASE_ANON_KEY.length>20;
async function client(){
 if(!configured())throw new Error('온라인 랭킹 서버가 아직 연결되지 않았어. 관리자에게 서버 연결을 요청해줘.');
 if(!clientPromise)clientPromise=import('https://esm.sh/@supabase/supabase-js@2.49.10').then(m=>m.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));
 return clientPromise;
}
function notice(msg,error=false){if(!overlay)return;const n=overlay.querySelector('.online-ranking-notice');n.textContent=msg;n.classList.toggle('error',error);}
function displayAverage(sum){return (sum/3).toFixed(2).replace(/\.00$/,'');}
function row(index,name,value,highlight){const r=el('div','online-ranking-row');if(highlight)r.classList.add('mine');r.append(el('strong','',String(index)),el('span','',name),el('b','',value));return r;}
function openModal(snapshot){
 if(overlay){overlay.remove();overlay=null;}
 overlay=el('div','online-ranking-overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','온라인 랭킹');
 const panel=el('section','online-ranking-panel');
 const head=el('div','online-ranking-head');head.append(el('h2','','📡 통신 · 랭킹'));
 const close=el('button','online-ranking-close','✕');close.type='button';close.setAttribute('aria-label','닫기');close.onclick=()=>{overlay.remove();overlay=null;};head.append(close);panel.append(head);
 panel.append(el('p','online-ranking-intro','게임은 평소처럼 싱글플레이야. 아래 업데이트 버튼을 누를 때만 내 기록이 서버로 전송돼.'));
 const tabs=el('div','online-ranking-tabs');
 for(const [key,label] of [['dex','도감'],['achievements','업적'],['hall','명예의 전당']]){
  const b=el('button','',label);b.type='button';b.onclick=()=>{tab=key;refresh(snapshot);};b.dataset.tab=key;tabs.append(b);
 }
 panel.append(tabs);
 const control=el('div','online-ranking-starter');control.id='onlineRankingStarter';
 const title=el('label','','스타팅별 기록: ');title.htmlFor='onlineRankingStarterSelect';
 const select=el('select');select.id='onlineRankingStarterSelect';
 for(const [id,name] of STARTERS){const op=el('option','',name);op.value=id;select.append(op);}
 select.value=selectedStarter;select.onchange=()=>{selectedStarter=select.value;refresh(snapshot);};control.append(title,select);panel.append(control);
 const board=el('div','online-ranking-board');board.id='onlineRankingBoard';panel.append(board);
 const form=el('div','online-ranking-upload');
 form.append(el('h3','','내 정보 업데이트하기'));
 const name=el('input');name.id='onlineRankingName';name.placeholder='첫 참여 시 닉네임 (2~12자)';name.maxLength=12;name.value=localStorage.getItem(NAME_KEY)||'';name.setAttribute('aria-label','트레이너 닉네임');form.append(name);
 form.append(el('p','online-ranking-help','도감 등록 수, 완료 업적 수, 스타팅별 명예의 전당 3마리 최저 평균 레벨을 전송해. 평균이 같으면 서버에 먼저 등록한 기록이 우선이야.'));
 const send=el('button','online-ranking-submit','내 정보 업데이트하기');send.type='button';send.onclick=()=>upload(snapshot,send);form.append(send);panel.append(form);
 const n=el('p','online-ranking-notice','');n.setAttribute('role','status');panel.append(n);overlay.append(panel);document.body.append(overlay);
 refresh(snapshot);
}
async function refresh(snapshot){
 if(!overlay)return;
 overlay.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 overlay.querySelector('#onlineRankingStarter').hidden=tab!=='hall';
 const board=overlay.querySelector('#onlineRankingBoard');board.replaceChildren(el('p','online-ranking-loading','랭킹을 불러오는 중...'));
 if(!configured()){board.replaceChildren(el('p','online-ranking-empty','랭킹 화면 준비 완료 · 서버 설정 후 온라인 순위가 표시돼.'));notice('아직 서버 연결 정보가 등록되지 않았어.',true);return;}
 try{
  const db=await client();let response;
  if(tab==='hall')response=await db.from('ranking_hall_board').select('user_id,nickname,starter,level_sum,recorded_at').eq('starter',selectedStarter).order('level_sum',{ascending:true}).order('recorded_at',{ascending:true}).limit(100);
  else response=await db.from('ranking_profiles').select('user_id,nickname,dex_count,achievement_count').order(tab==='dex'?'dex_count':'achievement_count',{ascending:false}).order('updated_at',{ascending:true}).limit(100);
  if(response.error)throw response.error;
  if(!overlay)return;
  board.replaceChildren();const entries=response.data||[];
  if(!entries.length){board.append(el('p','online-ranking-empty','아직 등록된 기록이 없어. 첫 번째 트레이너가 되어봐!'));return;}
  const {data:{user}}=await db.auth.getUser();
  entries.forEach((item,i)=>board.append(row(i+1,item.nickname,tab==='hall'?displayAverage(item.level_sum)+' Lv.':tab==='dex'?item.dex_count+'종':item.achievement_count+'개',user?.id===item.user_id)));
 }catch(e){if(!overlay)return;board.replaceChildren(el('p','online-ranking-empty','순위를 불러오지 못했어.'));notice(e.message||'네트워크 오류',true);}
}
async function upload(getSnapshot,button){
 const name=overlay?.querySelector('#onlineRankingName')?.value.trim()||'';
 if(name.length<2||name.length>12){notice('닉네임은 2~12자로 입력해줘.',true);return;}
 if(!configured()){notice('서버 연결이 완료되기 전에는 업로드할 수 없어. 기록은 기기에 그대로 보관돼.',true);return;}
 button.disabled=true;notice('기록을 전송하는 중...');
 try{
  const db=await client();
  let {data:{session}}=await db.auth.getSession();
  if(!session){const signed=await db.auth.signInAnonymously();if(signed.error)throw signed.error;session=signed.data.session;}
  if(!session)throw new Error('트레이너 ID 발급에 실패했어.');
  const record=getSnapshot();
  const {error}=await db.rpc('upload_ranking',{p_nickname:name,p_dex_count:record.dexCount,p_achievement_count:record.achievementCount,p_hall:record.hall});
  if(error)throw error;
  localStorage.setItem(NAME_KEY,name);
  if(overlay)overlay.querySelector('#onlineRankingName').readOnly=true;
  notice('업데이트 완료! 서버에 저장한 기록으로 순위를 다시 불러왔어.');
  await refresh(getSnapshot);
 }catch(e){notice(e.code==='23505'?'이미 사용 중인 닉네임이야. 다른 이름을 선택해줘.':e.message||'업데이트 실패',true);}
 finally{button.disabled=false;}
}
export function openOnlineRanking(getSnapshot){openModal(getSnapshot);}
