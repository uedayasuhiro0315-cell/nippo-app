(function(){'use strict';
const editor=document.getElementById('workEditor'),hidden=document.getElementById('work');
const redBtn=document.getElementById('workRed'),blackBtn=document.getElementById('workBlack'),label=document.getElementById('workColorMode');
let currentRed=false;
function runsFromDOM(){
 let pieces=[];
 function add(text,red){if(!text)return;const last=pieces[pieces.length-1];if(last&&last.red===red)last.text+=text;else pieces.push({text,red})}
 function walk(node,red){
  if(node.nodeType===3){add(node.nodeValue||'',red);return}
  if(node.nodeType!==1)return;
  const el=node;
  if(el.tagName==='BR'){add('\n',red);return}
  const st=el.getAttribute('style')||'';
  const clr=(st.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)||[])[1]||'';
  const isRed=clr?(/#(?:ff0000|f00|c62828|d12e35)\b|rgb\(\s*(?:255\s*,\s*0\s*,\s*0|198\s*,\s*40\s*,\s*40|209\s*,\s*46\s*,\s*53)\s*\)/i.test(clr)):red;
  if(el!==editor&&['DIV','P'].includes(el.tagName)&&pieces.length&& !pieces[pieces.length-1].text.endsWith('\n'))add('\n',red);
  for(const child of el.childNodes)walk(child,isRed);
 }
 for(const node of editor.childNodes)walk(node,false);
 // Keep the plain work field and colored segments exactly equal, even with line breaks or spaces.
 const raw=pieces.map(x=>x.text).join('');
 const text=raw.trim();
 let left=raw.length-raw.trimStart().length;
 let right=raw.length-raw.trimEnd().length;
 for(const part of pieces){const n=Math.min(left,part.text.length);part.text=part.text.slice(n);left-=n;}
 for(let i=pieces.length-1;i>=0;i--){const n=Math.min(right,pieces[i].text.length);pieces[i].text=pieces[i].text.slice(0,pieces[i].text.length-n);right-=n;}
 pieces=pieces.filter(x=>x.text.length);
 return {text,runs:pieces};
}
function refresh(){const v=runsFromDOM();hidden.value=v.text;label.textContent=currentRed?'赤字で入力':'黒字で入力';redBtn.dataset.active=String(currentRed);blackBtn.dataset.active=String(!currentRed)}
function load(text,runs){
 editor.replaceChildren();const safe=Array.isArray(runs)&&runs.length<3000&&runs.every(r=>r&&typeof r.text==='string'&&typeof r.red==='boolean')&&runs.map(r=>r.text).join('')===String(text||'');
 for(const r of safe?runs:[{text:String(text||''),red:false}]){const s=document.createElement('span');s.style.color=r.red?'#ff0000':'#172b40';s.textContent=r.text;editor.appendChild(s)}
 currentRed=false;refresh();
}
function focusEditor(){editor.focus()}
function applyColor(red){
 const sel=window.getSelection();const selected=!!sel&&sel.rangeCount>0&&!sel.isCollapsed&&editor.contains(sel.anchorNode)&&editor.contains(sel.focusNode);
 currentRed=red;
 if(selected){
  const range=sel.getRangeAt(0);
  const span=document.createElement('span');span.style.color=red?'#ff0000':'#172b40';
  try{span.textContent=range.toString();range.deleteContents();range.insertNode(span);sel.removeAllRanges();const r=document.createRange();r.selectNodeContents(span);sel.addRange(r)}catch(e){/* browsers with restricted selection still allow future-color mode */}
 }else{
  focusEditor();
  // Change the typing color at the cursor, using a zero-width marker that is not persisted.
  if(document.execCommand)try{document.execCommand('foreColor',false,red?'#ff0000':'#172b40')}catch(e){}
 }
 refresh();
}
[redBtn,blackBtn].forEach(b=>b.addEventListener('pointerdown',e=>e.preventDefault()));
redBtn.addEventListener('click',()=>applyColor(true));blackBtn.addEventListener('click',()=>applyColor(false));
editor.addEventListener('input',refresh);
editor.addEventListener('paste',e=>{const t=e.clipboardData?.getData('text/plain');if(t!==undefined){e.preventDefault();document.execCommand('insertText',false,t)}});
// Capture ensures old form's validation/record constructor sees the current plain text.
document.getElementById('form').addEventListener('submit',refresh,true);
window.nippoRichLoad=load;window.nippoRichCollect=runsFromDOM;
load('',[]);
})();
