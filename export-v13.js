(function(){'use strict';
const NS_W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',NS_X='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const q=(el,n)=>el.getElementsByTagNameNS(NS_W,n),x=(el,n)=>el.getElementsByTagNameNS(NS_X,n);
const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
function save(blob,name){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove()},35000)}
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
function renderPage(doc,section,site,rs,part,headerDate){const pars=children(section,'p'),tbl=children(section,'tbl')[0];assignParagraph(pars[1],`${headerDate}　№${part}`);assignParagraph(pars[2],'物件名：'+site.name);const trs=children(tbl,'tr');setCellText(tableCell(trs[0],6),site.person||rs[0].person||'');setCellText(tableCell(trs[0],8),'植田 康裕');
  for(let i=0;i<10;i++){let r=rs[i],row=2+i*3;if(!r)continue;let d=new Date(r.date+'T12:00:00'),dw=['日','月','火','水','木','金','土'][d.getDay()];setCellText(tableCell(trs[row],0),String(d.getFullYear()-2018));setCellText(tableCell(trs[row],1),String(d.getMonth()+1));setCellText(tableCell(trs[row],2),String(d.getDate()));setCellText(tableCell(trs[row],3),dw);tcParagraph(tableCell(trs[row],4),r.work);let wp=tcParagraph(tableCell(trs[row+1],4),'');writeStaff(wp,(r.workers||[]).join('、')+(r.workers||[]).length+'人',`${time(r.start)}~${time(r.end)}`)}
}
async function word(status){if(!ready())return;const d=current(),sites=d.sites.filter(s=>s.status===status),all=d.records.filter(r=>sites.some(s=>s.name===r.site));if(!all.length){alert('対象の記録はまだないで');return}let res=await fetch('./word-template.docx',{cache:'no-store'});if(!res.ok)throw Error('Word雛形が見つかりません。word-template.docxをアップロードしてな');const zip=await JSZip.loadAsync(await res.arrayBuffer());const file=zip.file('word/document.xml');if(!file)throw Error('Word雛形の構造が違います');const doc=parse(await file.async('text')),body=q(doc,'body')[0],sect=children(body,'sectPr')[0],page=children(body,'p').slice(0,4).concat(children(body,'tbl').slice(0,1));if(page.length!==5||!sect)throw Error('Word雛形のページ構造が違います');let count=0;const pageMeta=pageMetaRead(),pendingMeta={...pageMeta};for(const s of sites){let rs=all.filter(r=>r.site===s.name).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);let blocks=[];for(const r of rs){let last=blocks[blocks.length-1];if(!last||last.length>=10){blocks.push([r])}else last.push(r)}for(let pageIdx=0;pageIdx<blocks.length;pageIdx++){const pageRecords=blocks[pageIdx];if(count){const sep=doc.createElementNS(NS_W,'w:p'),run=doc.createElementNS(NS_W,'w:r'),br=doc.createElementNS(NS_W,'w:br');br.setAttributeNS(NS_W,'w:type','page');run.append(br);sep.append(run);body.insertBefore(sep,sect)}const block=page.map(e=>e.cloneNode(true));for(const e of block)body.insertBefore(e,sect);const part=pageIdx+1,key=s.name+'::'+part,headerDate=pageHeader(pageMeta,s.name,part,pageRecords);
pendingMeta[key]={date:headerDate,ids:pageRecords.map(r=>String(r.id))};
renderPage(doc, {querySelectorAll:()=>{},getElementsByTagNameNS:(ns,name)=>block.filter(e=>e.localName===name),children:block},s,pageRecords,part,headerDate);count++}}
for(const el of page)body.removeChild(el);zip.file('word/document.xml',serial(doc));const outBlob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});pageMetaSave(pendingMeta);save(outBlob,status==='closed'?'終了物件日報.docx':'継続物件日報.docx');alert(`${count}ページ分の日報を作成したで。会社指定雛形の書式を使ってるけど、提出前にはWordで確認してな。`)}
function period(m){const [y,mo]=m.split('-').map(Number),f=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return [f(new Date(y,mo-2,21)),f(new Date(y,mo-1,20))]}
function dateSerial(s){return (Date.parse(s+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000}
function getCell(doc,ref){return [...x(doc,'c')].find(c=>c.getAttribute('r')===ref)}
function writeCell(doc,ref,value,kind,formula){let c=getCell(doc,ref);if(!c)throw Error('元のExcelに '+ref+' セルがありません');let oldFormula=children(c,'f');for(const o of [...c.children])if(['is','f','v'].includes(o.localName))c.removeChild(o);if(kind==='text'){c.setAttribute('t','inlineStr');if(value!==''){let is=doc.createElementNS(NS_X,'is'),t=doc.createElementNS(NS_X,'t');t.textContent=String(value);is.append(t);c.append(is)}}else{c.removeAttribute('t');if(formula){let f=doc.createElementNS(NS_X,'f');f.textContent=formula;c.append(f)}if(value!==''&&value!==null){let v=doc.createElementNS(NS_X,'v');v.textContent=String(value);c.append(v)}}}
function setFormat(styles,ws,refs){let nums=x(styles,'numFmts')[0];if(!nums){nums=styles.createElementNS(NS_X,'numFmts');nums.setAttribute('count','0');styles.documentElement.insertBefore(nums,x(styles,'fonts')[0])}let nf=styles.createElementNS(NS_X,'numFmt');nf.setAttribute('numFmtId','181');nf.setAttribute('formatCode','[h]:mm');nums.append(nf);nums.setAttribute('count',String(children(nums,'numFmt').length));let xfs=x(styles,'cellXfs')[0];if(!xfs)throw Error('時刻書式がありません');const old=children(xfs,'xf');let base=getCell(ws,'E3');let baseIdx=Number(base?.getAttribute('s')||0),xf=old[baseIdx].cloneNode(true);xf.setAttribute('numFmtId','181');xf.setAttribute('applyNumberFormat','1');let idx=old.length;xfs.append(xf);xfs.setAttribute('count',String(idx+1));for(const ref of refs){const c=getCell(ws,ref);if(c)c.setAttribute('s',String(idx))}}
async function excel(){if(!ready())return;try{const response=await fetch('./monthly-template.xlsx',{cache:'no-store'});if(!response.ok)throw Error('固定の月報雛形が読み込めません。monthly-template.xlsx が公開されているか確認してな');const templateBytes=await response.arrayBuffer();const d=current(),month=document.getElementById('cutoff').value,[from,to]=period(month);const rs=d.records.filter(r=>r.date>=from&&r.date<=to).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);if(rs.length>36)throw Error('36件を超えたので雛形の行数が足りません');const zip=await JSZip.loadAsync(templateBytes),sheet=zip.file('xl/worksheets/sheet1.xml'),stylesFile=zip.file('xl/styles.xml');if(!sheet||!stylesFile)throw Error('元の月報.xlsxとは構成が違います');const doc=parse(await sheet.async('text')),styles=parse(await stylesFile.async('text'));if(!getCell(doc,'A38')||!getCell(doc,'G3'))throw Error('会社の月報雛形と異なる形式です');const [submitYear,submitMonth]=month.split('-').map(Number);if(!Number.isInteger(submitYear)||!Number.isInteger(submitMonth)||submitMonth<1||submitMonth>12)throw Error('提出月を選んでな');writeCell(doc,'A1',String(submitMonth)+'月','text');writeCell(doc,'G1','社名','text');writeCell(doc,'H1','植田防災','text');const timeRefs=[];for(let i=0;i<36;i++){let row=i+3,r=rs[i];for(let col of ['A','B','C','D','E','F']){const ref=col+row;if(!r){writeCell(doc,ref,'','text');continue}let v='',kind='text';if(col==='A'){v=dateSerial(r.date);kind='num'}if(col==='B')v=r.site;if(col==='C')v=r.person||'';if(col==='D'){v=r.start/1440;kind='num';timeRefs.push(ref)}if(col==='E'){v=r.end/1440;kind='num';timeRefs.push(ref)}if(col==='F'){v=(Number(r.breakMin)||0)/1440;kind='num';timeRefs.push(ref)}writeCell(doc,ref,v,kind)}const g=r? (r.end-r.start-(Number(r.breakMin)||0))/1440:'';if(r&&g<0)throw Error('休憩・時刻の入力が正しくありません：'+r.date);writeCell(doc,'G'+row,g,'num',`IF(D${row}="","",E${row}-D${row}-F${row})`);let h=r?Math.max(0,r.end-r.start-(Number(r.breakMin)||0)-540)/1440:'';
 writeCell(doc,'H'+row,h===0?'':h,'num',`IF(OR(D${row}="",G${row}<=TIME(9,0,0)),"",G${row}-TIME(9,0,0))`);
 // 元雛形の I列の意味は「退出時刻が deta!D2 (22:00) を超えた分」。
 // 24時以降は Excel の経過時刻として 1.0 以上で保持する。
 const nightCutoff=22*60;
 let night=r?Math.max(0,Number(r.end)-nightCutoff)/1440:'';
 writeCell(doc,'I'+row,night===0?'':night,'num',`IF(E${row}>deta!$D$2,E${row}-deta!$D$2,"")`);
 if(r){timeRefs.push('G'+row,'H'+row,'I'+row)}}
// Ver.7: summary cells use explicit cached numeric values as iOS Excel viewers
// often show stale 0 when they don't recalculate formulas on opening.
// Keep the company's original formula semantics and use precomputed values.
const totals=rs.reduce((a,r)=>{
 const minutes=Number(r.end)-Number(r.start)-(Number(r.breakMin)||0);
 a.work+=minutes;
 a.overtime+=Math.max(0,minutes-540); // H: over nine hours per entry, per template
 a.night+=Math.max(0,Number(r.end)-1320); // I: after 22:00
 return a;
},{work:0,overtime:0,night:0});
writeCell(doc,'I46',(totals.work-totals.overtime)/1440,'num','SUM(G3:G44)-SUM(H3:H44)');
writeCell(doc,'I47',totals.overtime/1440,'num','SUM(H3:H44)');
writeCell(doc,'I48',totals.night/1440,'num','SUM(I3:I44)');
// Totals display as cumulative durations rather than wrapping after 24h.
timeRefs.push('I46','I47','I48');
setFormat(styles,doc,timeRefs);zip.file('xl/worksheets/sheet1.xml',serial(doc));zip.file('xl/styles.xml',serial(styles));const wb=zip.file('xl/workbook.xml');if(wb){let wd=parse(await wb.async('text')),cp=x(wd,'calcPr')[0];if(!cp){cp=wd.createElementNS(NS_X,'calcPr');wd.documentElement.append(cp)}cp.setAttribute('fullCalcOnLoad','1');cp.setAttribute('forceFullCalc','1');cp.setAttribute('calcMode','auto');zip.file('xl/workbook.xml',serial(wd))}save(await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`月報_${month}_20日締.xlsx`);alert(`${rs.length}件出力したで。実働・9時間超過・22時以降の時間の式と計算結果を反映したで。休憩時間と会社の残業区分は提出前に確認してな。`)}catch(e){alert('月報を出力できません：'+e.message)}}
document.getElementById('wordActive').onclick=()=>word('active').catch(e=>alert('Word出力エラー：'+e.message));document.getElementById('wordClosed').onclick=()=>word('closed').catch(e=>alert('Word出力エラー：'+e.message));document.getElementById('excelExport').onclick=excel;
})();
