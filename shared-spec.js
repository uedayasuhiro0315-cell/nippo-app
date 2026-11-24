// Ver.17.3.22 Cloudflare shared specification master.
(function(){
 'use strict';
 const API='https://nippo-spec-api.ueda-yasuhiro-0315.workers.dev/specifications';
 const employee=document.getElementById('myEmployee');
 const box=document.getElementById('masterImportDetails');
 const active=document.getElementById('activeList');
 if(!employee||!box||!active)throw Error('仕様書共有用の画面が見つかりません');
 const note=document.createElement('div');
 note.className='note';
 note.style.margin='12px 0';
 note.innerHTML='<strong>🌐 共有仕様書マスター</strong>';
 const message=document.createElement('p');message.className='muted';message.textContent='共有仕様書を確認中…';
 const reload=document.createElement('button');reload.type='button';reload.className='btn alt';reload.textContent='共有仕様書を再確認';
 reload.style.marginBottom='5px';
 note.append(message,reload);
 active.parentNode.insertBefore(note,active);
 const guidance=document.createElement('p');guidance.className='muted';
 guidance.textContent='PDF登録後、クラウドへ共有してな。削除は端末内のみで、クラウドの削除には対応してへんで。';
 const exportBtn=document.createElement('button');exportBtn.className='btn full';exportBtn.type='button';exportBtn.textContent='🌐 クラウドへ仕様書を共有';exportBtn.style.margin='12px 0';
 box.append(guidance,exportBtn);
 function syncAccess(){
  const ok=employee.value==='岡田';
  box.classList.toggle('hidden',!ok);
  exportBtn.disabled=!ok;
  message.dataset.role=ok?'owner':'worker';
 }
 employee.addEventListener('change',syncAccess);syncAccess();
 exportBtn.onclick=async()=>{
  if(employee.value!=='岡田')return;
  const items=masterNormalize(OFFICIAL_MASTER);
  if(!items.length){alert('共有する仕様書がないで');return}
  if(!confirm(items.length+'件をクラウドへ登録・更新するで。削除は行わへんで。よろしい？'))return;
  const token=prompt('管理者用の秘密キーを入力してな');
  if(!token)return;
  exportBtn.disabled=true;
  try{
   const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({items})});
   if(!response.ok)throw Error('HTTP '+response.status);
   const result=await response.json();
   if(result.status!=='ok')throw Error('登録結果を確認できません');
   alert(result.processed+'件を処理したで');
   await syncMaster();
  }catch(e){alert('共有に失敗したで：'+e.message+'。端末内のデータはそのままやで。')}
  finally{syncAccess()}
 };
 let lastTimestamp='';
 async function syncMaster(){
  message.textContent='共有仕様書を読み込み中…';reload.disabled=true;
  try{
   const response=await fetch(API,{cache:'no-store'});
   if(response.status===404){message.textContent='共有APIが見つからへんで。';return}
   if(!response.ok)throw Error('HTTP '+response.status);
   if(Number(response.headers.get('content-length'))>1500000)throw Error('共有ファイルが大きすぎます');
   const raw=await response.text();if(raw.length>1500000)throw Error('共有ファイルが大きすぎます');
   const payload=JSON.parse(raw);
   if(payload?.schema!=='nippo-shared-official-master-v1'||!Array.isArray(payload.items)||payload.items.length>10000)throw Error('共有データの形式が違います');
   const cleaned=masterNormalize(payload.items);
   if(cleaned.length!==payload.items.length)throw Error('仕様書の番号・名前・重複を確認してな');
   const before=OFFICIAL_MASTER.length;
   // Shared master is additive: do not replace user-specific local rows, links, or work logs.
   // Existing local removals remain local; shared rows can be restored on refresh.
   const merged=masterNormalize([...OFFICIAL_MASTER,...cleaned]);
   if(!saveOfficialMaster(merged))throw Error('端末への保存に失敗しました');
   const added=OFFICIAL_MASTER.length-before;
   renderMasterDeleteList();
   lastTimestamp=String(payload.updatedAt||'');
   let when='';if(lastTimestamp){const d=new Date(lastTimestamp);if(!Number.isNaN(+d))when=' ／ 更新：'+d.toLocaleString('ja-JP')}
   message.textContent='共有 '+cleaned.length+'件を確認、端末への新規追加 '+added+'件'+when+'。既存の日報とメモは変更してへんで。';
  }catch(e){message.textContent='共有仕様書を取得できへんかった：'+e.message+'。端末内の登録分はそのまま使えるで。'}
  finally{reload.disabled=false}
 }
 reload.addEventListener('click',syncMaster);
 syncMaster();
})();
