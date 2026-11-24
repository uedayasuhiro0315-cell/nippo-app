// Ver.17.3.23 Cloudflare shared specification master.
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
 guidance.textContent='PDF登録後、クラウドへ共有してな。全社員の共有一覧から削除する場合は下のクラウド削除を使ってな。';
 const exportBtn=document.createElement('button');exportBtn.className='btn full';exportBtn.type='button';exportBtn.textContent='🌐 クラウドへ仕様書を共有';exportBtn.style.margin='12px 0';
 const cloud=document.createElement('details');
 const heading=document.createElement('summary');heading.textContent='クラウド上の仕様書を削除（管理者専用）';
 const cloudList=document.createElement('div');cloud.append(heading,cloudList);
 box.append(guidance,exportBtn,cloud);
 let busy=false;
 function renderCloud(items){
  cloudList.replaceChildren();
  for(const item of items){
   const row=document.createElement('div');row.className='item';
   const label=document.createElement('p');label.textContent=item.no+' '+item.name;
   const del=document.createElement('button');del.type='button';del.className='btn danger';del.textContent='クラウドから削除';
   del.onclick=async()=>{
    if(busy||employee.value!=='岡田')return;
    if(!confirm(item.no+' '+item.name+' を全社員の共有一覧から削除する？ 日報・物件メモは残るで。'))return;
    const token=prompt('管理者用の秘密キーを入力してな');if(!token)return;
    busy=true;del.disabled=true;syncAccess();
    try{
     const response=await fetch(API,{method:'DELETE',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({no:item.no,name:item.name})});
     if(!response.ok)throw Error('HTTP '+response.status);
     const result=await response.json();if(result.status!=='ok')throw Error('削除結果を確認できません');
     alert('クラウドから削除したで。');await syncMaster();
    }catch(e){alert('削除を確認できへんかった：'+e.message)}
    finally{busy=false;del.disabled=false;syncAccess()}
   };
   row.append(label,del);cloudList.append(row);
  }
 }
 function syncAccess(){
  const ok=employee.value==='岡田';
  box.classList.toggle('hidden',!ok);
  exportBtn.disabled=!ok||busy;
  message.dataset.role=ok?'owner':'worker';
 }
 employee.addEventListener('change',syncAccess);syncAccess();
 exportBtn.onclick=async()=>{
  if(busy||employee.value!=='岡田')return;
  const items=masterNormalize(OFFICIAL_MASTER);
  if(!items.length){alert('共有する仕様書がないで');return}
  if(!confirm(items.length+'件をクラウドへ登録・更新するで。削除済みの仕様書は再登録されへんで。よろしい？'))return;
  const token=prompt('管理者用の秘密キーを入力してな');
  if(!token)return;
  busy=true;exportBtn.disabled=true;
  try{
   const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({items})});
   if(!response.ok)throw Error('HTTP '+response.status);
   const result=await response.json();
   if(result.status!=='ok')throw Error('登録結果を確認できません');
   alert(result.processed+'件を処理、削除済み等の除外 '+(result.skipped||0)+'件やで');
   await syncMaster();
  }catch(e){alert('共有に失敗したで：'+e.message+'。端末内のデータはそのままやで。')}
  finally{busy=false;syncAccess()}
 };
 let lastTimestamp='';let syncQueue=Promise.resolve();
 function syncMaster(){const next=syncQueue.then(runSync);syncQueue=next.catch(()=>{});return next;}
 async function runSync(){
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
   if(!Array.isArray(payload.deleted))throw Error('削除履歴の形式が違います');
   const deleted=masterNormalize(payload.deleted);
   if(deleted.length!==payload.deleted.length)throw Error('削除履歴が不正です');
   const keys=new Set(deleted.map(x=>masterKey(x.no,x.name)));
   if(cleaned.some(x=>keys.has(masterKey(x.no,x.name))))throw Error('共有データが矛盾しています');
   const beforeKeys=new Set(OFFICIAL_MASTER.map(x=>masterKey(x.no,x.name)));
   const removed=new Set([...REMOVED_MASTER,...keys]);
   const merged=masterNormalize([...OFFICIAL_MASTER,...cleaned]).filter(x=>!keys.has(masterKey(x.no,x.name)));
   const removedCount=OFFICIAL_MASTER.filter(x=>keys.has(masterKey(x.no,x.name))).length;
   if(!saveOfficialMaster(merged,removed))throw Error('端末への保存に失敗しました');
   const added=merged.filter(x=>!beforeKeys.has(masterKey(x.no,x.name))).length;
   renderCloud(cleaned);
   lastTimestamp=String(payload.updatedAt||'');
   let when='';if(lastTimestamp){const d=new Date(lastTimestamp);if(!Number.isNaN(+d))when=' ／ 更新：'+d.toLocaleString('ja-JP')}
   message.textContent='共有 '+cleaned.length+'件を確認、端末への新規追加 '+added+'件、削除反映 '+removedCount+'件'+when+'。既存の日報とメモは変更してへんで。';
  }catch(e){message.textContent='共有仕様書を取得できへんかった：'+e.message+'。端末内の登録分はそのまま使えるで。'}
  finally{reload.disabled=false}
 }
 reload.addEventListener('click',syncMaster);
 syncMaster();
})();
