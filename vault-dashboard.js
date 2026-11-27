// Public Pages only. All note routes originate in the approved anonymous index.
const $=id=>document.getElementById(id);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const flatten=nodes=>nodes.flatMap(n=>[n,...flatten(n.children??[])]);
const collate=(a,b)=>a.title.localeCompare(b.title,"zh",{numeric:true})||a.slug.localeCompare(b.slug);
const date=n=>typeof n.updated==="string"&&Number.isFinite(Date.parse(n.updated))?new Date(n.updated).toISOString().slice(0,10):"";
const empty=(target,message)=>target.append(el("p","ww-overview-empty",message));
const icon=(direction="right")=>window.wwIcon(direction==="folder"?"Folder":"ChevronRight");
function noteLink(n,compact=false){
 const a=el("a",compact?"ww-overview-tree-note":"ww-overview-note");a.href=new URL(n.slug+".html",location.href).pathname;a.dataset.noPopover="true";
 if(compact){a.append(el("span","",n.title),icon());return a;}
 const content=el("div","ww-overview-note-text");content.append(el("strong","",n.title),el("small","",(n.tags??[]).join(" · ")||"未分类"));
 const meta=el("span","ww-overview-note-meta");if(date(n)){const t=el("time","",date(n));t.dateTime=date(n);meta.append(t);}else meta.append(el("span","ww-overview-date-unknown","日期未记录"));meta.append(icon());a.append(content,meta);return a;
}
try{
 const response=await fetch("./vault-dashboard.json");if(!response.ok)throw Error("index");const data=await response.json();
 const notes=data.notes.filter(n=>/^n-[a-f0-9]{24}$/.test(n.slug)),bySlug=new Map(notes.map(n=>[n.slug,n]));
 const folders=Array.isArray(data.folderTree)?data.folderTree:[],tags=Array.isArray(data.tagTree)?data.tagTree:[];
 const dated=notes.filter(n=>date(n)).sort((a,b)=>Date.parse(b.updated)-Date.parse(a.updated)||collate(a,b));
 const metrics=[["公开笔记",notes.length,"篇"],["标签",Object.keys(data.tags??{}).length,"个"],["目录节点",flatten(folders).length,"个"],["最近更新",dated.length?date(dated[0]):"未记录",""]];
 for(const [label,value,unit] of metrics){
  const m=el("div","ww-overview-metric"),v=el("div","ww-overview-metric-value");v.append(el("strong",unit?"":"ww-overview-date",String(value)));if(unit)v.append(el("span","",unit));m.append(el("small","",label),v);$("metrics").append(m);
 }
 function folder(n){
  const details=el("details","ww-overview-folder"),summary=el("summary","ww-overview-tree-row"),name=el("span","ww-overview-tree-name",n.name);
  summary.append(icon("folder"),name,el("small","ww-overview-count",n.count+" 篇"),icon());details.append(summary);
  const children=el("div","ww-overview-tree-children");for(const c of n.children??[])children.append(folder(c));
  for(const note of (n.primary??[]).map(id=>bySlug.get(id)).filter(Boolean).sort(collate))children.append(noteLink(note,true));
  details.append(children);return details;
 }
 function tag(n){
  const branch=el("div","ww-overview-tag"),a=el("a","ww-overview-tree-row");
  const href=new URL(n.href,location.href);if(href.origin!==location.origin||!href.pathname.startsWith(new URL("tags/",location.href).pathname))return branch;
  a.href=href.pathname;a.dataset.noPopover="true";a.append(el("span","ww-overview-tree-name",n.name),el("small","ww-overview-count",n.count+" 篇"),icon());branch.append(a);
  if(n.children?.length){const details=el("details","ww-overview-tag-children"),summary=el("summary","",n.children.length+" 个子标签");details.append(summary);const children=el("div","ww-overview-tree-children");for(const c of n.children)children.append(tag(c));details.append(children);branch.append(details);}
  return branch;
 }
 for(const n of folders)$("folders").append(folder(n));
 for(const n of tags)$("tags").append(tag(n));
 if(!folders.length)empty($("folders"),"暂无公开目录");
 if(!tags.length)empty($("tags"),"暂无公开标签");
 // Unknown dates are never represented as recent updates. Keep every note browsable.
 const ordered=[...dated,...notes.filter(n=>!date(n)).sort(collate)];let shown=0;
 $("recent-heading").textContent=dated.length?"笔记 · 按更新时间":"笔记索引";
 $("recent-caption").textContent=dated.length?"已记录日期的笔记优先，未记录日期的笔记按标题排列。":"暂无可用的更新时间，当前按标题排列。";
 function more(){for(const n of ordered.slice(shown,shown+8))$("recent").append(noteLink(n));shown=Math.min(ordered.length,shown+8);$("recent-count").textContent=shown+" / "+ordered.length+" 篇";$("recent-more").hidden=shown>=ordered.length;}
 $("recent-more").addEventListener("click",more);more();if(!ordered.length)empty($("recent"),"暂无公开笔记");
 const orphans=(data.orphans??[]).map(n=>bySlug.get(n.slug)).filter(Boolean).sort(collate);$("orphan-count").textContent=orphans.length+" 篇";
 for(const n of orphans.slice(0,40))$("orphans").append(noteLink(n,true));if(orphans.length>40)$("orphans").append(el("p","ww-overview-empty","显示前 40 篇，可从完整笔记索引继续浏览。"));if(!orphans.length)empty($("orphans"),"暂无此类笔记");
 let history=[];try{history=JSON.parse(sessionStorage.getItem("vault-pages-tabs")||"[]");}catch{}
 const paths=new Map(notes.map(n=>[new URL(n.slug+".html",location.href).pathname,n]));
 if(!Array.isArray(history))history=Array.isArray(history?.tabs)?history.tabs.map(x=>({path:typeof x?.slug==="string"?"/"+x.slug:""})):[];
 const seen=new Set(),read=[];for(const h of history.slice().reverse()){const n=paths.get(h?.path);if(n&&!seen.has(n.slug)){seen.add(n.slug);read.push(n);}}
 $("history-count").textContent=read.length+" 篇";for(const n of read)$("history").append(noteLink(n,true));if(!read.length)empty($("history"),"本会话暂无阅读记录");
 const groups=new Map();for(const r of data.cited??[]){if(!bySlug.has(r.slug))continue;const key=r.doi?"doi:"+r.doi.toLowerCase():JSON.stringify([r.title,r.author,r.year,r.journal]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 if(groups.size){
  const section=$("references"),list=section.lastElementChild;section.hidden=false;
  for(const refs of groups.values()){const r=refs[0],item=el("div","ww-overview-reference"),links=el("div","");item.append(el("strong","",r.title),el("p","",[r.author,r.year,r.journal].filter(Boolean).join(" · ")));
   for(const ref of refs){const note=bySlug.get(ref.slug),a=el("a","",note.title);a.href=new URL(note.slug+".html#bib-"+encodeURIComponent(ref.id),location.href).href;links.append(a);}item.append(links);list.append(item);}
 }
 $("overview-status").hidden=true;$("overview-content").hidden=false;
}catch{$("overview-status").textContent="暂时无法载入知识概览，请刷新页面重试。";}
