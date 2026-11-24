(function(){'use strict';
const NS_W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',NS_X='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const q=(el,n)=>el.getElementsByTagNameNS(NS_W,n),x=(el,n)=>el.getElementsByTagNameNS(NS_X,n);
const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
function save(blob,name){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove()},35000)}
// The selected submission month determines filenames, regardless of download date.
function closingFileDate(){
  const v=document.getElementById('cutoff').value;
  const match=/^(\d{4})-(\d{2})$/.exec(v||'');
  if(!match)throw Error('提出月を選んでな');
  const year=Number(match[1]),month=Number(match[2]);
  if(year<2019||month<1||month>12)throw Error('提出月が正しくありません');
  return `令和${year-2018}年${month}月20日`;
}
function ready(){if(!window.JSZip){alert('出力ライブラリを読み込めへんかった。ネット接続を確認して再読み込みしてな。');return false}return true}
function current(){try{const d=JSON.parse(localStorage.getItem('nippo.v2.data'));return d&&Array.isArray(d.records)&&Array.isArray(d.sites)?d:{records:[],sites:[]}}catch(e){return {records:[],sites:[]}}}
const children=(el,tag)=>[...el.children].filter(e=>e.localName===tag);
const parse=(str)=>{let doc=new DOMParser().parseFromString(str,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('雛形のXMLを読み込めません');return doc};
const serial=doc=>new XMLSerializer().serializeToString(doc);
function assignParagraph(p,text){let ts=[...q(p,'t')];if(!ts.length){let r=p.ownerDocument.createElementNS(NS_W,'w:r'),t=p.ownerDocument.createElementNS(NS_W,'w:t');r.append(t);p.append(r);ts=[t]}ts[0].textContent=text;ts[0].setAttribute('xml:space','preserve');for(let i=1;i<ts.length;i++)ts[i].textContent=''}
function tableCell(row,index){let pos=0;for(const c of children(row,'tc')){const span=q(c,'gridSpan')[0];const n=span?Number(span.getAttributeNS(NS_W,'val')||span.getAttribute('w:val')||1):1;if(pos<=index&&index<pos+n)return c;pos+=n}throw Error('雛形の表の列が違います')}
function tcParagraph(cell,text){let p=q(cell,'p')[0];if(!p)throw Error('雛形のセルが空です');assignParagraph(p,text);return p}
function ensureTabs(p){let pPr=children(p,'pPr')[0];if(!pPr){pPr=p.ownerDocument.createElementNS(NS_W,'w:pPr');p.insertBefore(pPr,p.firstChild)}let tabs=children(pPr,'tabs')[0];if(!tabs){tabs=p.ownerDocument.createElementNS(NS_W,'w:tabs');pPr.append(tabs)}tabs.replaceChildren();const tab=p.ownerDocument.createElementNS(NS_W,'w:tab');tab.setAttributeNS(NS_W,'w:val','right');tab.setAttributeNS(NS_W,'w:pos','7050');tabs.append(tab)}
function writeStaff(p,staff,hours){assignParagraph(p,staff);ensureTabs(p);let run=p.ownerDocument.createElementNS(NS_W,'w:r');let tab=p.ownerDocument.createElementNS(NS_W,'w:tab');run.append(tab);const rt=p.ownerDocument.createElementNS(NS_W,'w:t');rt.textContent=hours;run.append(rt);p.append(run)}
function setCellText(c,text){tcParagraph(c,text)}
function submissionMonth(dateStr){const [y,m,d]=dateStr.split('-').map(Number);return d>=21?(m===12?[y+1,1]:[y,m+1]):[y,m]}
function closingKey(dateStr){return submissionMonth(dateStr).join('-')}
// Keep Word page headers independently from the work-record database.
// A page is identified by project name and its 10-entry ordinal position.
// Official names and employers are tied to the selected employee on this device.
const STAFF_PROFILES=Object.freeze({
  '植田':{fullName:'植田康裕',company:'植田防災'},
  '岡田':{fullName:'岡田康均',company:'岡田設備'},
  '牧野':{fullName:'牧野宏昭',company:'岡田設備'},
  '谷川':{fullName:'谷川淳二',company:'弁天防災'},
  '與儀':{fullName:'與儀清',company:'與儀電設'}
});
function workersForWord(workers){const rank=['岡田','牧野','與儀','谷川','植田'];const me=selectedStaffProfile().employee;return (Array.isArray(workers)?[...workers]:[]).sort((a,b)=>{const order=n=>n===me?-1:rank.includes(n)?rank.indexOf(n):rank.length;return order(a)-order(b)})}
function selectedStaffProfile(){
  const me=window.localStorage.getItem('nippo.v15.myEmployee')||'';
  if(!Object.hasOwn(STAFF_PROFILES,me))throw Error('先に「この端末を使う社員」を選択してな');
  return {employee:me,...STAFF_PROFILES[me]};
}
const PAGE_META_KEY='nippo.v13.wordPageHeaders';
function pageMetaRead(){try{const v=JSON.parse(localStorage.getItem(PAGE_META_KEY));return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){return {}}}
function pageMetaSave(meta){try{localStorage.setItem(PAGE_META_KEY,JSON.stringify(meta))}catch(e){alert('ページ日付の履歴を保存できませんでした。iPhoneの空き容量を確認してな。');throw e}}
function pageDateStr(d){const [y,m]=submissionMonth(d);return `令和 ${y-2018}年 ${m}月21日`}
function pageHeader(meta,site,part,rs){
  const key=site+'::'+part,old=meta[key],ids=rs.map(r=>String(r.id));
  if(old&&Array.isArray(old.ids)){
    // An unchanged page keeps its previously recorded header date.
    if(old.ids.length===ids.length&&old.ids.every((id,i)=>id===ids[i]))return old.date;
    // If new work was appended to this page, its submission date becomes the header.
    const previous=new Set(old.ids),added=rs.filter(r=>!previous.has(String(r.id)));
    if(added.length){const newest=added.reduce((a,b)=>a.date>=b.date?a:b);return pageDateStr(newest.date)}
    // Entries were edited/reordered/removed, without an appended entry: preserve header.
    return old.date;
  }
  // Existing records on first installation: historical header dates cannot be recovered.
  return pageDateStr(rs[rs.length-1].date);
}
// Keep the template's preprinted KJ / 4100 intact for ordinary KJ4100 projects.
// For an unlinked project, preserve the printed prefix and leave the suffix blank.
// Exceptional prefixes (e.g. ML4100) must still print accurately.
function writeSpecificationNumber(row,site){
  const full=String(site.specNo||'').trim().toUpperCase();
  const prefix=tableCell(row,2),series=tableCell(row,3),suffix=tableCell(row,4);
  if(!full){setCellText(suffix,'');return}
  const m=/^([A-Z]+)(\d{4})([0-9A-Z-]+)$/.exec(full);
  if(!m)throw Error('仕様書No.の形式を確認してな：'+site.name+' ('+full+')');
  setCellText(prefix,m[1]);
  setCellText(series,m[2]);
  setCellText(suffix,m[3]);
}

// Rich color is carried in r.workRuns, with r.work retained as normal text for CSV/monthly exports.
// Old records without formatting use plain black. Never silently drop valid red runs.
function richWorkParagraph(cell,work,runs){
 const paragraph=tcParagraph(cell,'');
 const d=paragraph.ownerDocument;
 const plain=String(work||'');
 let segs=Array.isArray(runs)&&runs.length>0&&runs.length<3000&&runs.every(x=>x&&typeof x.text==='string'&&typeof x.red==='boolean')?runs.map(x=>({text:x.text,red:x.red})):null;
 if(segs&&segs.map(x=>x.text).join('')!==plain){
  // Legacy v17.3.8 records may include whitespace in runs, but plain work is trimmed.
  const joined=segs.map(x=>x.text).join('');
  if(joined.trim()===plain){
   let lead=joined.length-joined.trimStart().length,tail=joined.length-joined.trimEnd().length;
   for(const part of segs){const n=Math.min(lead,part.text.length);part.text=part.text.slice(n);lead-=n;}
   for(let j=segs.length-1;j>=0;j--){const n=Math.min(tail,segs[j].text.length);segs[j].text=segs[j].text.slice(0,segs[j].text.length-n);tail-=n;}
   segs=segs.filter(x=>x.text.length);
  }else{
   throw Error('作業内容の赤字情報が本文と一致しません：'+(plain.slice(0,22))+'。編集画面で保存し直してからWordを出力してな');
  }
 }
 if(!segs||!segs.length)segs=[{text:plain,red:false}];
 // Preserve paragraph metadata, but replace all existing runs.
 for(const node of [...paragraph.childNodes])if(node.nodeType===1&&node.localName==='r')paragraph.removeChild(node);
 for(const seg of segs){
  const run=d.createElementNS(NS_W,'w:r');
  const pr=d.createElementNS(NS_W,'w:rPr');
  const color=d.createElementNS(NS_W,'w:color');
  color.setAttributeNS(NS_W,'w:val',seg.red?'FF0000':'000000');
  pr.appendChild(color);run.appendChild(pr);
  const lines=seg.text.split('\n');
  lines.forEach((line,i)=>{
   if(i){const br=d.createElementNS(NS_W,'w:br');run.appendChild(br)}
   if(line){const t=d.createElementNS(NS_W,'w:t');t.setAttribute('xml:space','preserve');t.textContent=line;run.appendChild(t)}
  });
  paragraph.appendChild(run);
 }
}
function renderPage(doc,section,site,rs,part,headerDate){const pars=children(section,'p'),tbl=children(section,'tbl')[0];assignParagraph(pars[0],`${headerDate}　№${part}`);assignParagraph(pars[1],'物件名：'+site.name);const trs=children(tbl,'tr');writeSpecificationNumber(trs[0],site);setCellText(tableCell(trs[0],6),site.person||rs[0].person||'');setCellText(tableCell(trs[0],8),selectedStaffProfile().fullName);
  for(let i=0;i<10;i++){let r=rs[i],row=2+i*3;if(!r)continue;let d=new Date(r.date+'T12:00:00'),dw=['日','月','火','水','木','金','土'][d.getDay()];setCellText(tableCell(trs[row],0),String(d.getFullYear()-2018));setCellText(tableCell(trs[row],1),String(d.getMonth()+1));setCellText(tableCell(trs[row],2),String(d.getDate()));setCellText(tableCell(trs[row],3),dw);richWorkParagraph(tableCell(trs[row],4),r.work,r.workRuns);let wp=tcParagraph(tableCell(trs[row+1],4),'');writeStaff(wp,workersForWord(r.workers).join('、')+(r.workers||[]).length+'人',`${time(r.start)}~${time(r.end)}`)}
}
async function word(status,onlySite=null){if(!ready())return;selectedStaffProfile();closingFileDate();const d=current(),sites=d.sites.filter(s=>s.status===status&&(!onlySite||s.id===onlySite)),all=d.records.filter(r=>sites.some(s=>s.id===r.siteId));if(!all.length){alert('対象の記録はまだないで');return}let res=await fetch('./word-template.docx',{cache:'no-store'});if(!res.ok)throw Error('Word雛形が見つかりません。word-template.docxをアップロードしてな');const zip=await JSZip.loadAsync(await res.arrayBuffer());const file=zip.file('word/document.xml');if(!file)throw Error('Word雛形の構造が違います');const doc=parse(await file.async('text')),body=q(doc,'body')[0],sect=children(body,'sectPr')[0],page=children(body,'p').slice(0,2).concat(children(body,'tbl').slice(0,1));if(page.length!==3||!sect)throw Error('Word雛形のページ構造が違います');let count=0;const pageMeta=pageMetaRead(),pendingMeta={...pageMeta};for(const s of sites){let rs=all.filter(r=>r.siteId===s.id).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);let blocks=[];for(const r of rs){let last=blocks[blocks.length-1];if(!last||last.length>=10){blocks.push([r])}else last.push(r)}for(let pageIdx=0;pageIdx<blocks.length;pageIdx++){const pageRecords=blocks[pageIdx];if(count){const sep=doc.createElementNS(NS_W,'w:p'),run=doc.createElementNS(NS_W,'w:r'),br=doc.createElementNS(NS_W,'w:br');br.setAttributeNS(NS_W,'w:type','page');run.append(br);sep.append(run);body.insertBefore(sep,sect)}const block=page.map(e=>e.cloneNode(true));for(const e of block)body.insertBefore(e,sect);const part=pageIdx+1,key=s.id+'::'+part,headerDate=pageHeader(pageMeta,s.id,part,pageRecords);
pendingMeta[key]={date:headerDate,ids:pageRecords.map(r=>String(r.id))};
renderPage(doc, {querySelectorAll:()=>{},getElementsByTagNameNS:(ns,name)=>block.filter(e=>e.localName===name),children:block},s,pageRecords,part,headerDate);count++}}
for(const el of page)body.removeChild(el);zip.file('word/document.xml',serial(doc));const outBlob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});pageMetaSave(pendingMeta);save(outBlob,`${closingFileDate()} ${status==='active'?'継続日報':'消防検査・作業終了日報'}${onlySite?'_'+onlySite.replace(/[\\/:*?"<>|]/g,'_'):''}.docx`);alert(`${count}ページ分の日報を作成したで。会社指定雛形の書式を使ってるけど、提出前にはWordで確認してな。`)}
function period(m){const [y,mo]=m.split('-').map(Number),f=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return [f(new Date(y,mo-2,21)),f(new Date(y,mo-1,20))]}
function dateSerial(s){return (Date.parse(s+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000}
function getCell(doc,ref){return [...x(doc,'c')].find(c=>c.getAttribute('r')===ref)}
function writeCell(doc,ref,value,kind,formula){let c=getCell(doc,ref);if(!c)throw Error('元のExcelに '+ref+' セルがありません');let oldFormula=children(c,'f');for(const o of [...c.children])if(['is','f','v'].includes(o.localName))c.removeChild(o);if(kind==='text'){c.setAttribute('t','inlineStr');if(value!==''){let is=doc.createElementNS(NS_X,'is'),t=doc.createElementNS(NS_X,'t');t.textContent=String(value);is.append(t);c.append(is)}}else{c.removeAttribute('t');if(formula){let f=doc.createElementNS(NS_X,'f');f.textContent=formula;c.append(f)}if(value!==''&&value!==null){let v=doc.createElementNS(NS_X,'v');v.textContent=String(value);c.append(v)}}}
function setFormat(styles,ws,refs){let nums=x(styles,'numFmts')[0];if(!nums){nums=styles.createElementNS(NS_X,'numFmts');nums.setAttribute('count','0');styles.documentElement.insertBefore(nums,x(styles,'fonts')[0])}let nf=styles.createElementNS(NS_X,'numFmt');nf.setAttribute('numFmtId','181');nf.setAttribute('formatCode','[h]:mm');nums.append(nf);nums.setAttribute('count',String(children(nums,'numFmt').length));let xfs=x(styles,'cellXfs')[0];if(!xfs)throw Error('時刻書式がありません');const old=children(xfs,'xf');let base=getCell(ws,'E3');let baseIdx=Number(base?.getAttribute('s')||0),xf=old[baseIdx].cloneNode(true);xf.setAttribute('numFmtId','181');xf.setAttribute('applyNumberFormat','1');let idx=old.length;xfs.append(xf);xfs.setAttribute('count',String(idx+1));for(const ref of refs){const c=getCell(ws,ref);if(c)c.setAttribute('s',String(idx))}}
// Excel月報の生成に成功したときだけ、バックアップ確認を表示する。
function showMonthlyBackupReminder(){
  if(document.getElementById('monthlyBackupReminder'))return;
  const overlay=document.createElement('div');
  overlay.id='monthlyBackupReminder';
  overlay.className='overlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','monthlyBackupReminderTitle');
  const dialog=document.createElement('div');
  dialog.className='dialog';
  const title=document.createElement('h2');
  title.id='monthlyBackupReminderTitle';
  title.textContent='バックアップは取りましたか？';
  const actions=document.createElement('div');
  actions.className='actions';
  actions.style.marginTop='16px';
  const done=document.createElement('button');
  done.type='button';done.className='btn alt';done.textContent='はい、取りました';
  const backup=document.createElement('button');
  backup.type='button';backup.className='btn';backup.textContent='バックアップする';
  done.onclick=()=>overlay.remove();
  backup.onclick=()=>{
    overlay.remove();
    // すでにあるJSONバックアップボタンを再利用する。既存データは変更しない。
    const existing=document.getElementById('json');
    if(existing){existing.click();}
    else{alert('設定画面でバックアップを保存してな。');}
  };
  actions.append(done,backup);dialog.append(title,actions);overlay.append(dialog);
  document.body.append(overlay);done.focus();
}
// Company v3 workbook: 5 employee tabs + hidden deta worksheet.
// Note: local data only; do not represent other employees' sheets as complete.
const MONTHLY_SHEETS=[
 {employee:'岡田',index:1,capacity:42,summaryRow:45,header:'name'},
 {employee:'牧野',index:2,capacity:42,summaryRow:45,header:'name'},
 {employee:'與儀',index:3,capacity:42,summaryRow:45,header:'company'},
 {employee:'植田',index:4,capacity:42,summaryRow:45,header:'company'},
 {employee:'谷川',index:5,capacity:43,summaryRow:46,header:'company'}
];
function minutesNight(start,end){
 const overlap=(a,b)=>Math.max(0,Math.min(end,b)-Math.max(start,a));
 return overlap(0,300)+overlap(1320,1740)+overlap(2760,3180);
}
function countPeriodDates(from,to){
 const a=Date.parse(from+'T00:00:00Z'),b=Date.parse(to+'T00:00:00Z');
 if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)throw Error('締め期間が不正やで');
 return Math.round((b-a)/86400000)+1;
}
async function excel(){
 if(!ready())return;
 try{
  const employee=selectedStaffProfile().employee;
  const conf=MONTHLY_SHEETS.find(s=>s.employee===employee);
  if(!conf)throw Error('社員設定を確認してな');
  const response=await fetch('./monthly-template.xlsx',{cache:'no-store'});
  if(!response.ok)throw Error('新しい月報雛形 monthly-template.xlsx が読めへんで');
  const zip=await JSZip.loadAsync(await response.arrayBuffer());
  const sheetPath='xl/worksheets/sheet'+conf.index+'.xml';
  const entry=zip.file(sheetPath),stylesFile=zip.file('xl/styles.xml');
  if(!entry||!stylesFile||!zip.file('xl/worksheets/sheet5.xml'))throw Error('社員別5タブの雛形ではないで');
  const workbookEntry=zip.file('xl/workbook.xml');
  if(workbookEntry){
   const wdoc=parse(await workbookEntry.async('text'));
   const sheets=x(wdoc,'sheet');
   const named=sheets[conf.index-1];
   if(!named||!(named.getAttribute('name')||'').includes(employee))throw Error('選択した社員のタブを確認できへんで');
  }
  const styles=parse(await stylesFile.async('text'));
  const d=current(),month=document.getElementById('cutoff').value,[from,to]=period(month);
  const submitMonth=Number(month.split('-')[1]);
  if(!Number.isInteger(submitMonth)||submitMonth<1||submitMonth>12)throw Error('提出月を選んでな');
  const rs=d.records.filter(r=>r.date>=from&&r.date<=to&&Array.isArray(r.workers)&&r.workers.includes(employee))
    .sort((a,b)=>a.date.localeCompare(b.date)||Number(a.start)-Number(b.start));
  if(rs.length>conf.capacity)throw Error(employee+'の勤務記録が'+rs.length+'件あるで。新雛形の'+conf.capacity+'行を超えるため出力できへん');
  const days=countPeriodDates(from,to),workedDays=new Set(rs.map(r=>r.date));
  const holidays=days-workedDays.size;
  if(!confirm(employee+'の'+from+'〜'+to+'の月報を出力するで。\n勤務 '+workedDays.size+'日（'+rs.length+'件）／ 日報記録なし '+holidays+'日を「休み」に集計する。\n※入力漏れや別端末の作業記録も休みとして数えるから、提出前に確認してな。続ける？'))return;
  const doc=parse(await entry.async('text'));
  const lastRow=2+conf.capacity,s=conf.summaryRow;
  if(!getCell(doc,'A'+lastRow)||!getCell(doc,'I'+(s+4)))throw Error('雛形のセル配置が想定と違うで');
  writeCell(doc,'A1',String(submitMonth)+'月','text');
  writeCell(doc,'G1',conf.header==='name'?'氏名':'社名','text');
  writeCell(doc,'H1',conf.header==='name'?STAFF_PROFILES[employee].fullName:STAFF_PROFILES[employee].company,'text');
  let work=0,over=0,night=0;
  const timeRefs=[];
  for(let i=0;i<conf.capacity;i++){
   const row=i+3,r=rs[i];
   for(const col of ['A','B','C','D','E','F']){
    const ref=col+row;
    if(!r){writeCell(doc,ref,'','text');continue}
    let v='',kind='text';
    if(col==='A'){v=(i>0&&rs[i-1].date===r.date)?'':dateSerial(r.date);kind=v===''?'text':'num'}
    if(col==='B')v=r.site;
    if(col==='C')v=r.person||'';
    if(col==='D'){v=Number(r.start)/1440;kind='num';timeRefs.push(ref)}
    if(col==='E'){v=Number(r.end)/1440;kind='num';timeRefs.push(ref)}
    if(col==='F'){v=(Number(r.breakMin)||0)/1440;kind='num';timeRefs.push(ref)}
    writeCell(doc,ref,v,kind);
   }
   if(!r){for(const col of ['G','H','I'])writeCell(doc,col+row,'','text');continue}
   const start=Number(r.start),end=Number(r.end),breakMin=Number(r.breakMin)||0;
   const duration=end-start-breakMin;
   if(!Number.isFinite(duration)||duration<0)throw Error(employee+'の'+r.date+'の時刻・休憩が不正やで');
   const overtime=Math.max(0,duration-540),nightMinutes=minutesNight(start,end);
   work+=duration;over+=overtime;night+=nightMinutes;
   writeCell(doc,'G'+row,duration/1440,'num',`IF(D${row}="","",E${row}-D${row}-F${row})`);
   writeCell(doc,'H'+row,overtime?overtime/1440:'','num',`IF(OR(D${row}="",G${row}<=TIME(9,0,0)),"",G${row}-TIME(9,0,0))`);
   const nightExpr=`MAX(0,MIN(E${row},5/24)-MAX(D${row},0))+MAX(0,MIN(E${row},29/24)-MAX(D${row},22/24))+MAX(0,MIN(E${row},53/24)-MAX(D${row},46/24))`;
   writeCell(doc,'I'+row,nightMinutes?nightMinutes/1440:'','num',`IF(D${row}="","",${nightExpr})`);
   timeRefs.push('G'+row,'H'+row,'I'+row);
  }
  writeCell(doc,'I'+s,(work-over)/1440,'num',`SUM(G3:G${lastRow})-SUM(H3:H${lastRow})`);
  writeCell(doc,'I'+(s+1),over/1440,'num',`SUM(H3:H${lastRow})`);
  writeCell(doc,'I'+(s+2),night/1440,'num',`SUM(I3:I${lastRow})`);
  writeCell(doc,'I'+(s+3),workedDays.size,'num',`SUMPRODUCT((A3:A${lastRow}<>"")*(D3:D${lastRow}<>""))`);
  // No "休み" rows. Summary is count of dates with no work record in 21st–20th period.
  writeCell(doc,'I'+(s+4),holidays,'num');
  setFormat(styles,doc,timeRefs);
  setFormat(styles,doc,['I'+s,'I'+(s+1),'I'+(s+2)]);
  zip.file(sheetPath,serial(doc));
  zip.file('xl/styles.xml',serial(styles));
  if(workbookEntry){
   const wd=parse(await workbookEntry.async('text'));
   let cp=x(wd,'calcPr')[0];if(!cp){cp=wd.createElementNS(NS_X,'calcPr');wd.documentElement.append(cp)}
   cp.setAttribute('fullCalcOnLoad','1');cp.setAttribute('forceFullCalc','1');cp.setAttribute('calcMode','auto');
   zip.file('xl/workbook.xml',serial(wd));
  }
  save(await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${closingFileDate()} ${employee}月報.xlsx`);
  alert(employee+'の月報を出力したで。勤務 '+workedDays.size+'日（'+rs.length+'件）、休み '+holidays+'日。休みは日報未登録日から計算したので提出前に確認してな。');
  showMonthlyBackupReminder();
 }catch(e){alert('月報を出力できません：'+e.message)}
}

document.getElementById('wordActive').onclick=()=>word('active').catch(e=>alert('Word出力エラー：'+e.message));document.getElementById('wordClosed').onclick=()=>word('closed').catch(e=>alert('Word出力エラー：'+e.message));document.getElementById('excelExport').onclick=excel;
})();

window.exportArchivedWord=(siteName)=>word('archived',siteName);
