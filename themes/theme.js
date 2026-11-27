(()=>{const root=document.documentElement,base="/weepwood-note-public/",key="ww-theme-v1",themes=new Set(["weepwood","minimal","things","flexoki","tokyo-night","rose-pine","github","gruvbox","solarized","sanctum","minimal-editorial","nord"]);try{if(!sessionStorage.getItem("explorerScrollTop"))sessionStorage.setItem("explorerScrollTop","0")}catch{}function get(k){try{return localStorage.getItem(k)}catch{return null}}function set(k,v){try{localStorage.setItem(k,v)}catch{}}function mode(){return root.getAttribute("saved-theme")==="dark"?"dark":"light"}let publicIndex;
const native=(parent,id,legacy)=>parent?.querySelector('[data-quartz-plugin="'+id+'"]')??parent?.querySelector(legacy);
function getPublicIndex(){
 return publicIndex??=fetch(base+"vault-dashboard.json").then(r=>{if(!r.ok)throw Error("index");return r.json();}).catch(e=>{publicIndex=null;throw e;});
}
async function initExplorer(){
 const left=document.querySelector(".sidebar.left"),original=native(left,"explorer",".explorer");if(!original||left.querySelector(".ww-explorer")||document.querySelector("#ww-mobile-directory[open]"))return;
 const box=document.createElement("section");box.className="ww-explorer";box.hidden=true;original.after(box);
 try{
  const data=await getPublicIndex(),notes=data.notes.filter(n=>/^n-[a-f0-9]{24}$/.test(n.slug));if(!box.isConnected)return;
  box.setAttribute("aria-label","知识导航");
  const controls=document.createElement("div");controls.className="ww-directory-modes";controls.setAttribute("role","group");controls.setAttribute("aria-label","知识导航分类方式");
  const hasFolders=Array.isArray(data.folderTree);
  const modes=hasFolders?[["tags","标签"],["folders","文件夹"]]:[["tags","标签"]];
  let view=hasFolders&&get("ww-directory-mode")==="folders"?"folders":"tags";
  const list=document.createElement("div");list.className="ww-explorer-list";box.append(controls,list);controls.hidden=!hasFolders;
  for(const [mode,label] of modes){
   const button=document.createElement("button");button.type="button";button.dataset.directoryMode=mode;button.setAttribute("aria-label",label);button.title=label;const text=document.createElement("span");text.className="ww-directory-label";text.textContent=label;button.append(window.wwIcon(mode==="tags"?"Tag":"Folder"),text);
   button.addEventListener("click",()=>{if(view!==mode){view=mode;set("ww-directory-mode",view);render();}const menu=controls.closest(".ww-directory-menu");if(menu){closeDirectoryMenu(menu,true);if(matchMedia("(max-width:800px)").matches)openMobileDirectory();}});controls.append(button);
  }
  const bySlug=new Map(notes.map(n=>[n.slug,n]));
  const current=()=>location.pathname.split("/").at(-1)?.replace(/\.html$/,"");
  const closedKey=()=>view==="folders"?"ww-closed-folders":"ww-closed-groups";
  function readClosed(){try{const v=JSON.parse(get(closedKey())??"[]");return Array.isArray(v)?v:[];}catch{return [];}}
  let closed=readClosed();
  const contains=(n,slug)=>n.primary.includes(slug)||(n.href&&new URL(n.href,location.href).pathname===location.pathname)||n.children.some(c=>contains(c,slug));
  function branch(n){
    const wrap=document.createElement("div");wrap.className="ww-tree-node";
    const caption=document.createElement("span");caption.className="ww-tree-group-name";caption.textContent=n.name;
    const count=document.createElement("span");count.className="ww-tree-group-count";count.textContent=String(n.count);count.setAttribute("aria-label",n.count+" 篇笔记（含子目录）");
    const tagLink=()=>{const link=document.createElement("a");link.href=n.href;link.dataset.noPopover="true";link.setAttribute("aria-label","查看标签 "+n.path);if(new URL(link.href).pathname===location.pathname)link.setAttribute("aria-current","page");return link;};
    if(n.href&&!n.children.length&&!n.primary.length){
      const link=tagLink();link.className="ww-tree-leaf";link.append(caption,count);wrap.append(link);return wrap;
    }
    const details=document.createElement("details"),summary=document.createElement("summary");
    details.dataset.tagPath=n.path;details.open=contains(n,current())||!closed.includes(n.path);
    summary.append(caption,count);details.append(summary);wrap.append(details);
    if(n.href){const link=tagLink();link.className="ww-tree-tag-link";link.title="查看标签 "+n.path;link.append(window.wwIcon("ArrowUpRight"));wrap.append(link);}
    const children=document.createElement("div");children.className="ww-tree-children";details.append(children);
    for(const child of n.children)children.append(branch(child));
    for(const note of n.primary.map(id=>bySlug.get(id)).filter(Boolean).sort((a,b)=>a.title.localeCompare(b.title,"zh"))){
     const a=document.createElement("a");a.href=base+note.slug+".html";a.textContent=note.title;
     if(note.slug===current())a.setAttribute("aria-current","page");children.append(a);
    }
    summary.addEventListener("click",()=>{closed=details.open?[...new Set([...closed,n.path])]:closed.filter(x=>x!==n.path);set(closedKey(),JSON.stringify(closed));});
    return wrap;
  }
  function render(){
    closed=readClosed();
    for(const button of controls.querySelectorAll("button"))button.setAttribute("aria-pressed",String(button.dataset.directoryMode===view));
    list.replaceChildren();
    for(const n of (view==="folders"?data.folderTree:data.tagTree)??[])list.append(branch(n));
    if(view==="tags"){
     const untagged=notes.filter(n=>!n.tags?.length);
     if(untagged.length)list.append(branch({path:"",name:"未分类",count:untagged.length,primary:untagged.map(n=>n.slug),children:[]}));
    }
    if(!list.children.length)list.textContent="暂无公开笔记。";
  }
  render();box.hidden=false;
  // Retain native explorer as a mobile drawer and no-JS fallback.
  left.classList.add("ww-explorer-ready");mountDirectoryHeader();
 }catch{box.remove();}
}
// Use the actual left grid track, rather than guessing its width from a preference.
let directoryObserver,observedDirectory;
function setDirectoryMenu(menu,open){
 const trigger=menu.querySelector(".ww-directory-trigger"),controls=menu.querySelector(".ww-directory-modes");
 if(!trigger||!controls)return;
 trigger.setAttribute("aria-expanded",String(open));controls.hidden=!open;
}
function closeDirectoryMenu(menu,focus=false){
 if(!menu)return;
 setDirectoryMenu(menu,false);
 if(focus)menu.querySelector(".ww-directory-trigger")?.focus({preventScroll:true});
}
function ensureDirectoryMenu(zone,controls){
 let menu=zone.querySelector(".ww-directory-menu");
 if(!menu){
  menu=document.createElement("div");menu.className="ww-directory-menu";
  const trigger=document.createElement("button");trigger.type="button";trigger.className="ww-directory-trigger";
  trigger.setAttribute("aria-label","切换知识导航方式");trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-controls","ww-directory-options");trigger.title="切换知识导航方式";trigger.append(window.wwIcon("Ellipsis"));menu.append(trigger);
  zone.append(menu);
  menu.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")setDirectoryMenu(menu,true);});
  menu.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse"&&!menu.querySelector(".ww-directory-modes")?.contains(document.activeElement))closeDirectoryMenu(menu);});
  // The primary-device media query is not the input that dispatched the event.
  // Firefox headless and hybrid devices can report hover:none for real mouse clicks.
  let pointerType="";
  trigger.addEventListener("pointerdown",e=>{pointerType=e.pointerType;});
  trigger.addEventListener("pointercancel",()=>{pointerType="";});
  trigger.addEventListener("click",e=>{
   const mouse=e.detail>0&&(pointerType||e.pointerType)==="mouse";
   pointerType="";
   const open=trigger.getAttribute("aria-expanded")==="true";
   setDirectoryMenu(menu,mouse||!open);
  });
  menu.addEventListener("keydown",e=>{
   if(e.key==="Escape"&&trigger.getAttribute("aria-expanded")==="true"){e.preventDefault();e.stopPropagation();closeDirectoryMenu(menu,true);}
   else if(e.key==="ArrowDown"&&e.target===trigger){e.preventDefault();setDirectoryMenu(menu,true);menu.querySelector(".ww-directory-modes button")?.focus();}
  });
  menu.addEventListener("focusout",e=>{if(!menu.contains(e.relatedTarget))closeDirectoryMenu(menu);});
 }
 if(controls.parentElement!==menu){controls.id="ww-directory-options";menu.append(controls);setDirectoryMenu(menu,false);}
}
document.addEventListener("pointerdown",e=>{
 const menu=document.querySelector(".ww-directory-menu");
 if(menu&&!menu.contains(e.target))closeDirectoryMenu(menu);
},true);

function mountDirectoryHeader(){
 const top=document.querySelector(".ww-top"),zone=top?.querySelector(".ww-brand-zone"),left=document.querySelector(".sidebar.left");
 const explorer=left?.querySelector(".ww-explorer"),drawer=document.querySelector("#ww-mobile-directory[open]");
 const controls=explorer?.querySelector(".ww-directory-modes")??zone?.querySelector(".ww-directory-modes");
 if(!zone)return;
 const ready=!!(left?.classList.contains("ww-explorer-ready")&&(explorer&&!explorer.hidden||drawer));
 top.toggleAttribute("data-directory-ready",ready);
 if(!ready){top.removeAttribute("data-directory-merged");top.style.removeProperty("--ww-directory-edge");closeDirectoryMenu(zone.querySelector(".ww-directory-menu"));return;}
 if(!drawer&&controls&&controls.querySelector("[data-directory-mode=folders]"))ensureDirectoryMenu(zone,controls);
 const sync=()=>{
  if(!top.isConnected||!left.isConnected)return;
  const t=top.getBoundingClientRect(),r=left.getBoundingClientRect();
  const merged=matchMedia("(min-width:801px)").matches&&r.width>0&&r.right>t.left&&r.right<t.right;
  top.toggleAttribute("data-directory-merged",merged);
  if(merged)top.style.setProperty("--ww-directory-edge",(r.right-t.left)+"px");
  else{top.style.removeProperty("--ww-directory-edge");if(matchMedia("(min-width:801px)").matches)closeDirectoryMenu(zone.querySelector(".ww-directory-menu"));}
 };
 if(observedDirectory?.left!==left||observedDirectory?.top!==top){
  directoryObserver?.disconnect();directoryObserver=new ResizeObserver(sync);
  directoryObserver.observe(left);directoryObserver.observe(top);observedDirectory={left,top};
 }
 sync();
}
function restoreDirectoryControls(explorer){
 const controls=document.querySelector(".ww-top .ww-directory-modes");
 if(explorer&&controls){controls.hidden=false;explorer.prepend(controls);}
 document.querySelector(".ww-top .ww-directory-menu")?.remove();
}
window.addEventListener("resize",mountDirectoryHeader);
let savedExplorer=null,savedSearch=null;
document.addEventListener("prenav",()=>{
 const drawer=document.querySelector("#ww-mobile-directory");
 if(drawer?.open){drawer.close();const node=drawer.querySelector(".ww-explorer"),left=document.querySelector(".sidebar.left");if(node&&left)left.append(node);}
 const explorer=document.querySelector(".ww-explorer");
 restoreDirectoryControls(explorer);directoryObserver?.disconnect();observedDirectory=null;
 if(explorer&&!explorer.hidden){
  savedExplorer={node:explorer,scroll:document.querySelector(".sidebar.left")?.scrollTop??0};
  explorer.remove();
 }
 drawer?.remove();
 const search=document.querySelector("#ww-quick-search");
 if(search){if(search.open)search.close();savedSearch=search;search.remove();}
});
document.addEventListener("nav",()=>{
 if(savedSearch){document.body.append(savedSearch);savedSearch=null;}
 if(savedExplorer){
  const {node,scroll}=savedExplorer;savedExplorer=null;
  const left=document.querySelector(".sidebar.left"),original=native(left,"explorer",".explorer");
  if(original){
   for(const a of node.querySelectorAll("a")){
    const active=new URL(a.href).pathname===location.pathname;
    if(active){a.setAttribute("aria-current","page");const own=a.parentElement?.querySelector(":scope>details");if(own)own.open=true;for(let parent=a.closest("details");parent;parent=parent.parentElement?.closest("details"))parent.open=true;}
    else a.removeAttribute("aria-current");
   }
   original.after(node);left.classList.add("ww-explorer-ready");left.scrollTop=scroll;mountDirectoryHeader();
  }
 }
});
function initQuickSearch(){
 if(document.querySelector("#ww-quick-search"))return;
 const dialog=document.createElement("dialog");dialog.id="ww-quick-search";dialog.setAttribute("aria-label","全局搜索");dialog.dataset.pagefindIgnore="";
 dialog.innerHTML='<div class="ww-quick-top"><div class="ww-quick-field">'+window.wwIconMarkup("Search")+'<input id="query" type="search" role="combobox" aria-expanded="true" aria-controls="ww-quick-list" aria-autocomplete="list" aria-label="搜索笔记" placeholder="搜索标题、标签或正文…"></div><button type="button" data-search-close aria-label="关闭搜索">Esc</button></div><div class="ww-search-toolbar"><div role="group" aria-label="搜索范围"><button type="button" data-search-mode="all" aria-pressed="true">全部</button><button type="button" data-search-mode="title" aria-pressed="false">标题 / 标签</button><button type="button" data-search-mode="body" aria-pressed="false">全文</button></div><button type="button" data-search-filter aria-expanded="false" aria-controls="ww-search-filters">'+window.wwIconMarkup("ListFilter")+'筛选<span data-filter-count hidden></span></button></div><div id="ww-search-filters" hidden><label>标签（含子标签）<input id="tag" list="ww-tag-options" placeholder="全部标签"><datalist id="ww-tag-options"></datalist></label><label>状态<input id="note-status" list="ww-status-options" placeholder="全部状态"><datalist id="ww-status-options"></datalist></label><label>标题包含<input id="title" placeholder="可选"></label><label>标签包含<input id="path" placeholder="可选"></label><button type="button" data-search-reset>清除筛选</button></div><div id="status" class="ww-search-status" role="status" aria-live="polite"></div><div id="ww-quick-list" class="ww-quick-results" role="listbox" aria-label="匹配笔记"></div><div class="ww-search-more" hidden><button type="button" data-search-more>显示更多</button></div><footer><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>↵</kbd> 打开</span><span><kbd>Esc</kbd> 关闭</span><span class="ww-search-hint">引号内为精确短语</span></footer>';
 document.body.append(dialog);
 const input=dialog.querySelector("#query"),results=dialog.querySelector("#ww-quick-list"),status=dialog.querySelector("#status"),filterPanel=dialog.querySelector("#ww-search-filters"),filterToggle=dialog.querySelector("[data-search-filter]"),more=dialog.querySelector(".ww-search-more");
 const filterIds=["tag","note-status","title","path"],field=id=>dialog.querySelector("#"+id),filters=()=>Object.fromEntries(filterIds.map(id=>[id,field(id).value.trim()]));
 let mode="all",notes=[],bySlug=new Map(),engine,active=0,items=[],visible=10,sequence=0,timer,opener=null,ready=false,composing=false,busy=false,lastQuery=null;
 const cache=new Map(),cacheLimit=12;
 function pending(value){busy=value;results.setAttribute("aria-busy",String(value));results.dataset.pending=String(value);dialog.querySelector("[data-search-more]").disabled=value;}
 function getEngine(){return engine??=import(base+"pagefind/pagefind.js").catch(e=>{engine=null;throw e});}
 async function statusOptions(){try{const api=await getEngine(),f=await api.filters(),list=dialog.querySelector("#ww-status-options");list.replaceChildren();for(const v of Object.keys(f.status??{}).sort()){const o=document.createElement("option");o.value=v;list.append(o);}}catch{}}
 async function find(query,pf,run){
  const key=JSON.stringify([query,pf]);
  if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
  const api=await getEngine(),found=await api.search(query||null,{filters:pf}),hits=[];if(run!==sequence||!dialog.open)return null;
  for(let i=0;i<Math.min(found.results.length,100);i+=10){
   hits.push(...await Promise.all(found.results.slice(i,i+10).map(r=>r.data())));if(run!==sequence||!dialog.open)return null;
  }
  const value={hits,total:found.results.length};
  cache.set(key,value);while(cache.size>cacheLimit)cache.delete(cache.keys().next().value);
  return value;
 }
 const lower=s=>String(s??"").toLocaleLowerCase(),tagMatch=(tags,tag)=>!tag||tags.some(t=>t===tag||t.startsWith(tag+"/"));
 function appendExcerpt(target,source){
  const template=document.createElement("template");template.innerHTML=source??"";
  function copy(parent,out){for(const n of parent.childNodes){if(n.nodeType===3)out.append(document.createTextNode(n.textContent));else if(n.nodeType===1){if(n.tagName==="MARK"){const m=document.createElement("mark");m.textContent=n.textContent;out.append(m);}else if(!["SCRIPT","STYLE","TEMPLATE"].includes(n.tagName))copy(n,out);}}}
  copy(template.content,target);
 }
 function highlight(scroll=false){const links=[...results.querySelectorAll("a")];links.forEach((a,i)=>{a.id="ww-quick-option-"+i;a.setAttribute("aria-selected",String(i===active));a.tabIndex=-1;});if(links[active]){input.setAttribute("aria-activedescendant",links[active].id);if(scroll)links[active].scrollIntoView({block:"nearest"});}else input.removeAttribute("aria-activedescendant");}
 function render(){
  const old=new Map([...results.querySelectorAll("a")].map(a=>[a.dataset.slug,a])),nodes=[];
  for(const item of items.slice(0,visible)){
   const existing=old.get(item.note.slug);
   if(existing&&existing.dataset.excerpt===(item.excerpt??"")){nodes.push(existing);continue;}
   const n=item.note,a=document.createElement("a");a.href=base+n.slug+".html";a.className="ww-quick-note";a.setAttribute("role","option");a.setAttribute("aria-label",n.title);a.dataset.noPopover="true";a.dataset.slug=n.slug;a.dataset.excerpt=item.excerpt??"";
   const title=document.createElement("strong");title.textContent=n.title;const meta=document.createElement("small");meta.textContent=(n.tags??[]).join(" · ")||"未分类";const arrow=document.createElement("span");arrow.className="ww-search-arrow";arrow.append(window.wwIcon("CornerDownLeft"));arrow.setAttribute("aria-hidden","true");a.append(title,meta,arrow);
   if(item.excerpt){const p=document.createElement("p");appendExcerpt(p,item.excerpt);a.append(p);}
   nodes.push(a);
  }
  // One synchronous commit; unchanged rows retain identity and scroll position.
  for(let i=0;i<nodes.length;i++)if(results.children[i]!==nodes[i])results.insertBefore(nodes[i],results.children[i]??null);
  while(results.children.length>nodes.length)results.lastElementChild.remove();
  more.hidden=visible>=items.length;highlight();
 }
 function setMode(value){mode=value;for(const b of dialog.querySelectorAll("[data-search-mode]"))b.setAttribute("aria-pressed",String(b.dataset.searchMode===mode));}
 function filterCount(){const n=Object.values(filters()).filter(Boolean).length,b=dialog.querySelector("[data-filter-count]");b.hidden=!n;b.textContent=String(n);}
 function matches(n,f){return tagMatch(n.tags??[],f.tag)&&lower(n.title).includes(lower(f.title))&&lower((n.tags??[]).join(" · ")).includes(lower(f.path));}
 function commit(run,next,message,query){
  if(run!==sequence||!dialog.open)return;
  const previous=lastQuery===query?items[active]?.note.slug:null;
  const changed=lastQuery!==query;lastQuery=query;items=next;
  active=Math.max(0,items.findIndex(x=>x.note.slug===previous));visible=Math.max(10,Math.min(changed?10:visible,Math.max(10,items.length)));
  if(changed)results.scrollTop=0;render();status.textContent=message;pending(false);
 }
 async function search(run){
  if(run!==sequence||!dialog.open)return;
  if(!ready){status.textContent="正在载入公开笔记…";return;}
  const query=input.value.trim().slice(0,500),f=filters(),scope=mode,q=lower(query),term=q.startsWith('"')&&q.endsWith('"')?q.slice(1,-1):q;
  const score=n=>lower(n.title)===term?0:lower(n.title).startsWith(term)?1:lower(n.title).includes(term)?2:3;
  const local=notes.filter(n=>matches(n,f)&&(!term||[n.title,...(n.tags??[])].some(t=>lower(t).includes(term)))).sort((a,b)=>score(a)-score(b)||a.title.localeCompare(b.title,"zh"));
  const initial=scope==="body"||f["note-status"]?[]:local.map(note=>({note}));
  if(!query&&!f["note-status"]){
   const browse=scope==="body"&&Object.values(f).some(Boolean)?local.map(note=>({note})):initial;
   commit(run,browse,scope==="body"&&!Object.values(f).some(Boolean)?"输入关键词开始全文检索":browse.length?"可浏览 "+browse.length+" 篇笔记":"暂无匹配笔记",query);return;
  }
  if(scope==="title"&&!f["note-status"]){commit(run,initial,"匹配 "+initial.length+" 篇笔记",query);return;}
  try{
   const pf={};if(f.tag)pf.tag=f.tag;if(f["note-status"])pf.status=f["note-status"];
   // Status filters intersect metadata in title mode rather than requiring a body hit.
   const found=await find(scope==="title"?null:query,pf,run);if(!found||run!==sequence||!dialog.open)return;
   const literal=/^[A-Za-z][A-Za-z0-9_]{3,}$/.test(query)?query.toLowerCase():null;
   const collected=new Map(initial.map(item=>[item.note.slug,item])),localIds=new Set(local.map(n=>n.slug));
   for(const hit of found.hits){
    const url=new URL(hit.url,location.origin);if(url.origin!==location.origin||!url.pathname.startsWith(base))continue;
    const slug=url.pathname.slice(base.length).replace(/\/$/,"").replace(/\.html$/,""),n=bySlug.get(slug);
    if(!n||!matches(n,f)||scope==="title"&&!localIds.has(slug))continue;
    if(scope!=="title"&&literal&&![n.title,...(n.tags??[]),hit.content??""].some(v=>String(v).normalize("NFKC").toLowerCase().includes(literal)))continue;
    collected.set(slug,{note:n,excerpt:scope==="title"||!query?null:hit.excerpt});
   }
   const next=[...collected.values()];
   commit(run,next,"匹配 "+next.length+" 篇笔记"+(found.total>100?" · 全文候选 "+found.total+"，已检查前 100 条":""),query);
  }catch{commit(run,initial,"全文检索暂不可用"+(initial.length?"，已显示标题和标签匹配":"，请重试"),query);}
 }
 function schedule(delay=0){clearTimeout(timer);const run=++sequence;filterCount();pending(true);status.textContent=items.length?"正在更新结果…":"正在检索…";timer=setTimeout(()=>search(run),delay);}
 async function open(source){
  if(!dialog.open){opener=source??document.activeElement;dialog.showModal();}
  input.focus();schedule();
  if(ready)return;
  try{const data=await getPublicIndex();notes=data.notes.filter(n=>/^n-[a-f0-9]{24}$/.test(n.slug));bySlug=new Map(notes.map(n=>[n.slug,n]));const options=dialog.querySelector("#ww-tag-options");options.replaceChildren();for(const tag of Object.keys(data.tags??{})){const o=document.createElement("option");o.value=tag;options.append(o);}ready=true;if(dialog.open)schedule();}
  catch{if(dialog.open){status.textContent="公开索引暂不可用，请刷新重试";pending(false);}}
 }
 input.addEventListener("compositionstart",()=>{composing=true;clearTimeout(timer);sequence++;pending(true);status.textContent="正在输入…";});input.addEventListener("compositionend",()=>{composing=false;schedule(160);});
 input.addEventListener("input",()=>{if(!composing)schedule(160);});for(const id of filterIds)field(id).addEventListener("input",()=>schedule(160));
 filterToggle.addEventListener("click",()=>{filterPanel.hidden=!filterPanel.hidden;filterToggle.setAttribute("aria-expanded",String(!filterPanel.hidden));if(!filterPanel.hidden)statusOptions();});
 dialog.querySelector("[data-search-reset]").addEventListener("click",()=>{for(const id of filterIds)field(id).value="";schedule();});
 for(const b of dialog.querySelectorAll("[data-search-mode]"))b.addEventListener("click",()=>{if(mode===b.dataset.searchMode)return;setMode(b.dataset.searchMode);input.focus();schedule();});
 dialog.querySelector("[data-search-more]").addEventListener("click",()=>{visible+=10;render();});
 results.addEventListener("pointermove",e=>{if(busy||e.pointerType==="touch")return;const a=e.target.closest("a");if(!a)return;const index=[...results.children].indexOf(a);if(index>=0&&index!==active){active=index;highlight();}});
 results.addEventListener("click",e=>{const a=e.target.closest("a");if(a&&busy){e.preventDefault();e.stopPropagation();return;}if(a&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey)dialog.close();});
 results.addEventListener("auxclick",e=>{if(busy)e.preventDefault();});
 dialog.querySelector("[data-search-close]").addEventListener("click",()=>dialog.close());
 dialog.addEventListener("close",()=>{if(dialog.open)return;clearTimeout(timer);sequence++;pending(false);if(opener?.isConnected)opener.focus({preventScroll:true});});
 dialog.addEventListener("click",e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener("keydown",e=>{if(e.isComposing||composing)return;if(e.key==="Escape"){e.preventDefault();dialog.close();return;}if(e.target!==input)return;const links=results.querySelectorAll("a");if(["ArrowDown","ArrowUp"].includes(e.key)&&links.length){e.preventDefault();active=Math.max(0,Math.min(links.length-1,active+(e.key==="ArrowDown"?1:-1)));highlight(true);}else if(e.key==="Enter"){e.preventDefault();if(!busy)links[active]?.click();}});
 // Capture both native Quartz search shortcuts before its document listener.
 window.addEventListener("keydown",e=>{
  if(e.isComposing||composing||!(e.metaKey||e.ctrlKey)||e.key.toLowerCase()!=="k")return;
  e.preventDefault();e.stopImmediatePropagation();
  if(e.shiftKey){open();filterPanel.hidden=false;filterToggle.setAttribute("aria-expanded","true");statusOptions();field("tag").focus();}
  else if(dialog.open)dialog.close();else open();
 },true);
 document.addEventListener("click",e=>{const b=e.target.closest("[data-ww-quick]");if(b){e.preventDefault();open(b);}});
 if(location.pathname===base+"vault-search.html"){
  const p=new URL(location.href).searchParams;input.value=(p.get("q")??"").slice(0,500);
  for(const id of filterIds)field(id).value=(p.get(id)??"").slice(0,200);
  if(Object.values(filters()).some(Boolean)){filterPanel.hidden=false;filterToggle.setAttribute("aria-expanded","true");statusOptions();}
  open();
 }
}
function organizeReader(){
 const header=document.querySelector(".center>.page-header");
 if(!header)return;
 const tools=header.querySelector(".ww-reader-tools"),tabs=header.querySelector(".vault-tabs");
 if(!tools||!tabs)return;
 let row=header.querySelector(".ww-reader-chrome");
 if(!row){
  row=document.createElement("div");row.className="ww-reader-chrome";
  const crumb=header.querySelector(".breadcrumb-container");
  const anchor=crumb??header.firstElementChild;
  if(anchor)anchor.before(row);else header.prepend(row);
  if(crumb)row.append(crumb);
  const mobile=document.createElement("button");mobile.type="button";mobile.className="ww-mobile-menu";mobile.textContent="目录";mobile.setAttribute("aria-label","打开知识目录");mobile.addEventListener("click",()=>{if(!openMobileDirectory())tools.querySelector("[data-ww-reader=left]")?.click();});row.append(mobile);
  const details=document.createElement("details");details.className="ww-reader-menu";
  details.innerHTML='<summary aria-label="阅读选项" title="阅读选项">'+window.wwIconMarkup("Ellipsis")+'</summary><div class="ww-reader-popover"><h4>阅读布局</h4><div class="ww-menu-tools"></div><h4>最近阅读</h4><div class="ww-menu-tabs"></div><div class="ww-menu-properties"></div></div>';
  row.append(details);
  details.addEventListener("keydown",e=>{if(e.key==="Escape"){details.open=false;details.querySelector("summary").focus();}});
 }
 const detail=row.querySelector(".ww-reader-menu"),menuTabs=row.querySelector(".ww-menu-tabs"),menuTools=row.querySelector(".ww-menu-tools");
 if(tools.parentElement!==menuTools)menuTools.append(tools);
 const tabsVisible=root.dataset.wwTabs==="true";
 if(tabsVisible){if(tabs.parentElement!==header)header.prepend(tabs);}
 else if(tabs.parentElement!==menuTabs)menuTabs.append(tabs);
 const readerControl=native(document.querySelector(".sidebar.left"),"reader-mode",".readermode");
 if(readerControl){readerControl.title="专注阅读";tools.append(readerControl);}
 const properties=header.querySelector(".note-properties");
 const target=row.querySelector(".ww-menu-properties");
 if(properties&&properties.parentElement!==target){target.replaceChildren(properties);}
}
const extraPreferences={paragraph:["compact","normal","relaxed"],radius:["normal","square","soft"],accent:["normal","neutral"],callout:["normal","outline","plain"]};
const parameterSpecs=[{"vendor":"minimal","themes":["minimal","minimal-editorial"],"section":"minimal-style","id":"quote-font","key":"blockquote-font-style","label":"引用字体","type":"variable-select","values":["normal","italic"],"labels":["常规","斜体"],"default":"normal","importKey":"minimal-style@@blockquote-font-style"},{"vendor":"minimal","themes":["minimal","minimal-editorial"],"section":"minimal-style","id":"quote-border","key":"blockquote-border-thickness","label":"引用边线","type":"variable-number-slider","values":[0,1,2,3,4,5],"labels":["0 px","1 px","2 px","3 px","4 px","5 px"],"default":1,"importKey":"minimal-style@@blockquote-border-thickness"},{"vendor":"minimal","themes":["minimal","minimal-editorial"],"section":"minimal-style","id":"minimal-h2","token":"heading-weight","key":"h2-weight","label":"二级标题字重","type":"variable-number-slider","values":[500,600,700],"labels":["中等","半粗","粗体"],"default":600,"importKey":"minimal-style@@h2-weight"},{"vendor":"sanctum","themes":["sanctum"],"section":"sanctum","id":"sanctum-quote","token":"quote-font","key":"blockquote-font-style","label":"引用字体","type":"variable-select","values":["normal","italic","oblique"],"labels":["常规","斜体","倾斜"],"default":"normal","importKey":"sanctum@@blockquote-font-style"},{"vendor":"sanctum","themes":["sanctum"],"section":"sanctum","id":"sanctum-h2","token":"heading-weight","key":"h2-weight","label":"二级标题字重","type":"variable-select","values":["500","600","700"],"labels":["中等","半粗","粗体"],"default":"600","importKey":"sanctum@@h2-weight"},{"vendor":"things","themes":["things"],"section":"things-style","id":"things-code-light","token":"code-light","key":"code-block-background-l","label":"浅色代码背景","type":"variable-color","values":["#f0f2f5","#f5f5f5","#eaf0f8"],"labels":["原始灰蓝","中性灰","柔和蓝"],"default":"#f0f2f5","importKey":"things-style@@code-block-background-l"},{"vendor":"things","themes":["things"],"section":"things-style","id":"things-code-dark","token":"code-dark","key":"code-block-background-d","label":"深色代码背景","type":"variable-color","values":["#282c34","#252525","#252d39"],"labels":["原始灰蓝","中性灰","柔和蓝"],"default":"#282c34","importKey":"things-style@@code-block-background-d"}];
const activeParameters=()=>parameterSpecs.filter(p=>p.themes.includes(root.dataset.wwTheme));
const parameterTheme=()=>activeParameters().length>0;
const parameterKey=()=> "ww-params-"+root.dataset.wwTheme;
function parameterValues(){
 try{const raw=JSON.parse(get(parameterKey())??"{}");return Object.fromEntries(activeParameters().filter(p=>p.values.includes(raw?.[p.importKey])).map(p=>[p.importKey,raw[p.importKey]]));}catch{return {}}
}
function syncParameters(){
 const enabled=parameterTheme(),values=enabled?parameterValues():{};
 for(const p of parameterSpecs){
  const active=p.themes.includes(root.dataset.wwTheme),v=active?values[p.importKey]:undefined;
  const row=document.querySelector("[data-ww-param-row="+p.id+"]");if(row)row.hidden=!active;
  if(v===undefined)root.removeAttribute("data-ww-"+p.id);else root.setAttribute("data-ww-"+p.id,String(v));
  for(const el of document.querySelectorAll("[data-ww-param]"))if(el.dataset.wwParam===p.id)el.value=v===undefined?"":String(v);
 }
 const panel=document.querySelector("[data-ww-parameters]");if(panel)panel.hidden=!enabled;
 window.wwSyncDropdowns?.();
}
function syncPreferences(){
 syncParameters();
 const fonts=new Set(["system","sans","serif","mono"]);
 for(const k of ["ui","reading"]){const value=get("ww-font-"+k);root.dataset[k==="ui"?"wwFontUi":"wwFontReading"]=fonts.has(value)?value:"system";}
 const size=get("ww-size");root.dataset.wwSize=["15","16","17","18"].includes(size)?size:"16";
 root.dataset.wwTabs=String(get("ww-tabs")==="true");
 for(const [key,values] of [["lineheight",["compact","normal","relaxed"]],["measure",["narrow","normal","wide"]],...Object.entries(extraPreferences)]){
  const val=get("ww-"+key),selected=values.includes(val)?val:"normal";root.setAttribute("data-ww-"+key,selected);
  for(const el of document.querySelectorAll("select[data-ww-"+key+"]"))el.value=selected;
 }
 const layout=get("ww-layout")??"custom";for(const el of document.querySelectorAll("select[data-ww-layout]"))el.value=["custom","docs","focus","wide"].includes(layout)?layout:"custom";
 for(const el of document.querySelectorAll("[data-ww-font]"))el.value=root.dataset[el.dataset.wwFont==="ui"?"wwFontUi":"wwFontReading"];
 for(const el of document.querySelectorAll("select[data-ww-size]"))el.value=root.dataset.wwSize;
 for(const el of document.querySelectorAll("input[data-ww-tabs]"))el.checked=root.dataset.wwTabs==="true";
 for(const el of document.querySelectorAll("[data-ww-appearance]"))el.value=mode();
}
document.addEventListener("change",e=>{
 const t=e.target;
 if(t.matches("[data-ww-param]")&&parameterTheme()){
  const p=activeParameters().find(p=>p.id===t.dataset.wwParam);if(!p)return;
  const values=parameterValues();
  if(t.value==="")delete values[p.importKey];else{const v=p.values.find(v=>String(v)===t.value);if(v===undefined)return;values[p.importKey]=v;}
  set(parameterKey(),JSON.stringify(values));syncParameters();return;
 }
 if(t.id==="ww-preview-note"&&/^n-[a-f0-9]{24}$/.test(t.value)){
  for(const a of document.querySelectorAll(".ww-theme-preview,[data-ww-compare]")){const u=new URL(a.href);u.pathname=base+t.value+".html";a.href=u.href;}return;
 }
 if(t.matches("[data-ww-font]"))set("ww-font-"+t.dataset.wwFont,t.value);
 else if(t.matches("select[data-ww-size]"))set("ww-size",t.value);
 else if(t.matches("select[data-ww-lineheight]"))set("ww-lineheight",t.value);
 else if(t.matches("select[data-ww-measure]"))set("ww-measure",t.value);
 else if(t.matches("select[data-ww-layout]")){
  const v=t.value;set("ww-layout",v);
  if(["docs","focus","wide"].includes(v)){set("ww-left",v==="focus"?"hidden":"visible");set("ww-right",v==="focus"?"hidden":"visible");set("ww-wide",String(v==="wide"));}
 }
 else if(Object.keys(extraPreferences).some(k=>t.matches("select[data-ww-"+k+"]"))){const k=Object.keys(extraPreferences).find(k=>t.hasAttribute("data-ww-"+k));if(extraPreferences[k].includes(t.value))set("ww-"+k,t.value);}
 else if(t.matches("input[data-ww-tabs]"))set("ww-tabs",String(t.checked));
 else if(t.matches("[data-ww-appearance]")){applyMode(t.value);return;}
 else return;
 update();
});
document.addEventListener("click",e=>{
 const action=e.target.closest("[data-ww-param-export],[data-ww-param-import],[data-ww-param-reset],[data-ww-param-preset]");
 if(action&&parameterTheme()){
  const area=document.querySelector("[data-ww-param-json]"),status=document.querySelector("[data-ww-param-status]");
  if(action.hasAttribute("data-ww-param-preset")){
   const editorial=action.dataset.wwParamPreset==="editorial";
   const values=Object.fromEntries(activeParameters().map(p=>[p.importKey,p.key==="blockquote-font-style"?(editorial?"italic":"normal"):p.key==="blockquote-border-thickness"?(editorial?1:3):p.values[editorial?1:p.values.length-1]]));
   set(parameterKey(),JSON.stringify(values));syncParameters();status.textContent="已应用组合预设。";
  }
  else if(action.hasAttribute("data-ww-param-export")){area.value=JSON.stringify(parameterValues(),null,2);status.textContent="已生成 JSON，可复制保存。";}
  else if(action.hasAttribute("data-ww-param-reset")){set(parameterKey(),"{}");syncParameters();status.textContent="已恢复主题默认。";}
  else try{
   if(area.value.length>4096)throw Error("size");
   const data=JSON.parse(area.value);
   if(!data||typeof data!=="object"||Array.isArray(data))throw Error("format");
   for(const [k,v] of Object.entries(data))if(!activeParameters().some(p=>p.importKey===k&&p.values.includes(v)))throw Error("unsupported");
   set(parameterKey(),JSON.stringify(data));syncParameters();status.textContent="已导入并应用。";
  }catch{status.textContent="导入失败：仅允许当前列出的参数和值，原设置未改变。";}
  return;
 }
 if(e.target.closest("[data-ww-reset]")){for(const k of ["ww-font-ui","ww-font-reading","ww-size","ww-tabs","ww-lineheight","ww-measure","ww-paragraph","ww-radius","ww-accent","ww-callout","ww-layout","ww-left","ww-right","ww-wide"])set(k,"");for(const t of new Set(parameterSpecs.flatMap(p=>p.themes)))set("ww-params-"+t,"{}");apply("weepwood");applyMode("light");}
 for(const d of document.querySelectorAll(".ww-reader-menu[open],.ww-outline-menu[open]"))if(!d.contains(e.target))d.open=false;
});
function closeDiagram(){const d=document.querySelector("#ww-diagram-view");if(d?.open)d.close();d?.remove();}
document.addEventListener("prenav",closeDiagram);
document.addEventListener("click",e=>{
 const image=e.target.closest("article img[alt='科学图表（静态）']");
 if(!image)return;
 const url=new URL(image.src,location.href);
 if(url.origin!==location.origin||!new RegExp("^"+base+"assets/a-[a-f0-9]{24}\\.png$").test(url.pathname))return;
 const dialog=document.createElement("dialog");dialog.id="ww-diagram-view";dialog.setAttribute("aria-label","科学图表查看");
 const head=document.createElement("div"),button=document.createElement("button"),pic=document.createElement("img"),range=document.createElement("input"),frame=document.createElement("div");
 head.className="ww-diagram-head";button.type="button";button.textContent="关闭";range.type="range";range.min="100";range.max="250";range.value="100";range.setAttribute("aria-label","图表缩放");pic.src=url.href;pic.alt=image.alt;frame.className="ww-diagram-frame";frame.append(pic);head.append(range,button);dialog.append(head,frame);document.body.append(dialog);
 range.addEventListener("input",()=>{pic.style.width=range.value+"%";pic.style.maxWidth="none";});button.addEventListener("click",()=>dialog.close());dialog.addEventListener("close",()=>{dialog.remove();if(image.isConnected)image.closest("button")?.focus();},{once:true});dialog.showModal();button.focus();
});
function initReadingContent(){
 const article=document.querySelector(".center>article");
 if(!article)return;
 const header=document.querySelector(".center>.page-header");
 const properties=header?.querySelector(".note-properties");
 if(properties&&!properties.dataset.wwReady){
  properties.dataset.wwReady="true";properties.open=false;
  const title=properties.querySelector(".note-properties-title");if(title)title.textContent="文章属性";
  for(const key of properties.querySelectorAll(".note-properties-key"))if(key.textContent.trim()==="tags")key.textContent="标签";
 }
 const crumb=header?.querySelector(".breadcrumb-container a");if(crumb?.textContent.trim()==="Home")crumb.textContent="首页";
 const meta=header?.querySelector(".content-meta");
 if(properties&&meta&&!properties.closest(".ww-menu-properties")&&properties.previousElementSibling!==meta)meta.after(properties);
 const heading=header?.querySelector(".article-title");
 if(heading){
  for(const item of document.querySelectorAll(".toc-content li")){
   if(item.querySelector("a")?.textContent.trim()===heading.textContent.trim())item.classList.add("ww-title-outline");
  }
 }
 for(const table of article.querySelectorAll("table")){
  if(table.parentElement.classList.contains("ww-table-scroll"))continue;
  const wrapper=document.createElement("div");wrapper.className="ww-table-scroll";wrapper.tabIndex=0;
  wrapper.setAttribute("role","region");wrapper.setAttribute("aria-label","可横向滚动的表格");
  table.before(wrapper);wrapper.append(table);
 }
 for(const img of article.querySelectorAll("img[alt='科学图表（静态）']")){
  if(img.parentElement?.classList.contains("ww-diagram-trigger"))continue;
  const button=document.createElement("button");button.className="ww-diagram-trigger";button.type="button";button.setAttribute("aria-label","放大科学图表");
  img.before(button);button.append(img);
  button.addEventListener("click",e=>{if(e.target===button)img.click();});
 }
 for(const block of article.querySelectorAll(".katex-display, pre"))if(!block.hasAttribute("tabindex"))block.tabIndex=0;
}
function openMobileDirectory(){
 const left=document.querySelector(".sidebar.left"),explorer=left?.querySelector(".ww-explorer");
 if(!explorer||explorer.hidden)return false;
 let dialog=document.querySelector("#ww-mobile-directory");
 if(!dialog){
  dialog=document.createElement("dialog");dialog.id="ww-mobile-directory";dialog.setAttribute("aria-labelledby","ww-directory-title");
  dialog.innerHTML='<div class="ww-directory-heading"><h2 id="ww-directory-title">知识导航</h2><button type="button">关闭</button></div>';
  document.body.append(dialog);dialog.querySelector("button").addEventListener("click",()=>dialog.close());
 }
 if(dialog.open)return true;
 restoreDirectoryControls(explorer);const marker=document.createComment("directory anchor");explorer.before(marker);dialog.append(explorer);
 dialog.addEventListener("close",()=>{if(explorer.parentElement!==dialog)return;if(marker.isConnected){marker.replaceWith(explorer);mountDirectoryHeader();}else explorer.remove();},{once:true});
 dialog.showModal();dialog.querySelector("button")?.focus();return true;
}
function initReader(){
 const header=document.querySelector(".center>.page-header"),right=document.querySelector(".sidebar.right"),left=document.querySelector(".sidebar.left");
 if(!header||!document.querySelector(".center>article"))return;
 const wide=get("ww-wide")==="true";
 root.dataset.wwWide=String(wide);
 for(const [side,node] of [["left",left],["right",right]]){
  if(!node)continue;
  root.dataset[side==="left"?"wwLeft":"wwRight"]=get("ww-"+side)==="hidden"?"hidden":"visible";
 }
 let tools=header.querySelector(".ww-reader-tools");
 if(!tools){
  tools=document.createElement("div");tools.className="ww-reader-tools";tools.setAttribute("role","group");tools.setAttribute("aria-label","阅读布局");
  for(const [action,label,node] of [["left","知识导航",left],["right","关联面板",right],["wide","宽屏阅读",true]]){
   if(!node)continue;
   const button=document.createElement("button");button.type="button";button.dataset.wwReader=action;button.append(window.wwIcon(({left:"PanelLeft",right:"PanelRight",wide:"Maximize"})[action]));
   button.setAttribute("aria-label",label);button.title=label;tools.append(button);
  }
  header.prepend(tools);
 }
 for(const btn of tools.querySelectorAll("button")){
  const k=btn.dataset.wwReader;if(!k)continue;
  btn.setAttribute("aria-pressed",String(k==="wide"?root.dataset.wwWide==="true":root.dataset[k==="left"?"wwLeft":"wwRight"]!=="hidden"));
 }
 if(!right||right.querySelector(".ww-inspector-tabs"))return;
 const choices=[["toc","目录",native(right,"table-of-contents",".toc")],["relations","关联",native(right,"backlinks",".backlinks")],["graph","图谱",native(right,"graph",".graph")]].filter(x=>x[2]);
 if(!choices.length)return;
 const tabs=document.createElement("div");tabs.className="ww-inspector-tabs";tabs.setAttribute("role","group");tabs.setAttribute("aria-label","关联面板内容");
 for(const [id,label,node] of choices){node.dataset.wwPanel=id;const b=document.createElement("button");b.type="button";b.dataset.wwInspect=id;b.textContent=label;tabs.append(b);}
 const relations=right.querySelector(".ww-relations");if(relations){relations.dataset.wwPanel="relations";right.append(relations);}
 const head=document.createElement("div");head.className="ww-outline-head";
 const label=document.createElement("span");label.className="ww-outline-label";label.textContent="本页目录";
 const menu=document.createElement("details");menu.className="ww-outline-menu";menu.innerHTML='<summary aria-label="关联视图" title="关联视图">'+window.wwIconMarkup("Ellipsis")+'</summary>';
 menu.append(tabs);head.append(label,menu);right.prepend(head);
 menu.addEventListener("keydown",e=>{if(e.key==="Escape"){menu.open=false;menu.querySelector("summary").focus();}});
 selectPanel(choices.some(x=>x[0]==="toc")?"toc":choices[0][0]);
}
function selectPanel(id){
 const right=document.querySelector(".sidebar.right");if(!right)return;
 for(const el of right.querySelectorAll("[data-ww-panel]"))el.hidden=el.dataset.wwPanel!==id;
 for(const b of right.querySelectorAll("[data-ww-inspect]"))b.setAttribute("aria-pressed",String(b.dataset.wwInspect===id));
 const label=right.querySelector(".ww-outline-label");if(label)label.textContent=({toc:"本页目录",relations:"关联笔记",graph:"局部图谱"})[id]??"本页目录";
 const menu=right.querySelector(".ww-outline-menu");if(menu)menu.open=false;
 requestAnimationFrame(()=>window.dispatchEvent(new Event("resize")));
}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-ww-reader],[data-ww-inspect]");if(!b)return;
 if(b.dataset.wwInspect){selectPanel(b.dataset.wwInspect);return;}
 const k=b.dataset.wwReader;set("ww-layout","custom");
 if(k==="left"&&matchMedia("(max-width:800px)").matches&&openMobileDirectory())return;
 if(k==="wide"){set("ww-wide",String(root.dataset.wwWide!=="true"));}
 else{const attr=k==="left"?"wwLeft":"wwRight";set("ww-"+k,root.dataset[attr]==="hidden"?"visible":"hidden");}
 initReader();requestAnimationFrame(()=>window.dispatchEvent(new Event("resize")));
});
let outlineFrame=0;
function refreshOutline(){
 cancelAnimationFrame(outlineFrame);outlineFrame=requestAnimationFrame(()=>{
 const toc=document.querySelector(".sidebar.right .toc-content");if(!toc)return;
 const links=[...toc.querySelectorAll("li:not(.ww-title-outline) a")];if(!links.length)return;
 for(const a of toc.querySelectorAll("[aria-current]"))a.removeAttribute("aria-current");
 let active=links[0];const offset=(document.querySelector(".ww-top")?.getBoundingClientRect().height??60)+42;
 for(const a of links){let id;try{id=decodeURIComponent(new URL(a.href).hash.slice(1));}catch{continue;}
 const h=document.getElementById(id);if(h&&h.getBoundingClientRect().top<=offset)active=a;}
 active.setAttribute("aria-current","location");
 });
}
window.addEventListener("scroll",refreshOutline,{passive:true});
window.addEventListener("resize",refreshOutline);
function initTagPage(){
 const center=document.querySelector(".center"),tag=center?.querySelector(":scope>[data-quartz-plugin=tag-page]");
 if(!tag)return;
 const header=center.querySelector(".page-header");if(!header||header.querySelector(".ww-tag-mobile-directory"))return;
 const button=document.createElement("button");button.type="button";button.className="ww-mobile-menu ww-tag-mobile-directory";button.textContent="知识导航";button.setAttribute("aria-label","打开知识目录");button.addEventListener("click",openMobileDirectory);header.prepend(button);
}
let galleryOpener=null;
function openGallery(opener){
 const dialog=document.querySelector("#ww-theme-gallery");
 if(!dialog||dialog.open)return;
 galleryOpener=opener??document.querySelector("[data-ww-gallery-open]")??document.activeElement;
 dialog.showModal();
 dialog.querySelector("[data-ww-gallery-close]")?.focus({preventScroll:true});
 window.wwSyncDropdowns?.();
}
function initGallery(){
 const dialog=document.querySelector("#ww-theme-gallery");if(!dialog||dialog.dataset.ready)return;
 dialog.dataset.ready="true";
 dialog.addEventListener("close",()=>{
  if(location.hash==="#themes")history.replaceState(history.state,"",location.pathname+location.search);
  if(galleryOpener?.isConnected)galleryOpener.focus({preventScroll:true});galleryOpener=null;
 });
 dialog.addEventListener("click",e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 if(location.hash==="#themes")openGallery();
}
document.addEventListener("click",e=>{
 const opener=e.target.closest("[data-ww-gallery-open]");if(opener)openGallery(opener);
 if(e.target.closest("[data-ww-gallery-close]"))document.querySelector("#ww-theme-gallery")?.close();
});
window.addEventListener("hashchange",()=>{if(location.hash==="#themes")openGallery();});
document.addEventListener("prenav",()=>document.querySelector("#ww-theme-gallery[open]")?.close());
function update(){
 syncPreferences();initGallery();initTagPage();initReader();initReadingContent();initExplorer();mountDirectoryHeader();organizeReader();refreshOutline();
 if(document.body)initQuickSearch();
 const title=document.querySelector(".article-title"),first=document.querySelector(".center > article .markdown-preview-view > h1:first-child");if(first&&title&&first.textContent.trim()===title.textContent.trim())first.hidden=true;
 const t=root.dataset.wwTheme;for(const el of document.querySelectorAll("[data-ww-picker]"))el.value=t;for(const el of document.querySelectorAll("[data-ww-mode]")){el.setAttribute("aria-label",mode()==="dark"?"切换浅色":"切换深色");el.setAttribute("aria-pressed",String(mode()==="dark"));el.querySelector("span").textContent=mode()==="dark"?"浅色":"深色";el.title=el.getAttribute("aria-label");const glyph=mode()==="dark"?"Sun":"Moon";if(el.querySelector("svg")?.dataset.wwIcon!==glyph)el.querySelector("svg")?.replaceWith(window.wwIcon(glyph))}for(const el of document.querySelectorAll(".ww-theme-card")){const selected=el.dataset.theme===t;el.setAttribute("aria-current",String(selected));const button=el.querySelector("[data-ww-select]");if(button){button.textContent=selected?"已应用":"应用主题";button.setAttribute("aria-pressed",String(selected));}}for(const a of document.querySelectorAll(".ww-nav a")){if(new URL(a.href).pathname===location.pathname)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")}const shortcut=/Mac|iPhone|iPad/.test(navigator.userAgentData?.platform??navigator.platform??"")?"⌘ K":"Ctrl K";for(const b of document.querySelectorAll(".ww-top [data-ww-quick]")){b.querySelector("kbd").textContent=shortcut;b.title="搜索笔记（"+shortcut+"）";}for(const a of document.querySelectorAll(".ww-settings-link")){if(new URL(a.href).pathname===location.pathname)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");}window.wwSyncDropdowns?.();}
let themeGeneration=0,pendingTheme=null;
function apply(t,persist=true){
 if(!themes.has(t))t="weepwood";
 const generation=++themeGeneration;
 pendingTheme?.remove();pendingTheme=null;
 const previous=document.getElementById("ww-community"),initial=!root.dataset.wwTheme;
 const commit=()=>{root.dataset.wwTheme=t;if(persist)set(key,t);update();};
 if(t==="weepwood"){previous?.remove();commit();return;}
 if(previous?.getAttribute("href")===base+"themes/"+t+".css"){commit();return;}
 const next=document.createElement("link");next.rel="stylesheet";next.href=base+"themes/"+t+".css";next.setAttribute("data-persist","true");
 if(initial){next.id="ww-community";document.head.append(next);next.addEventListener("error",()=>{if(generation===themeGeneration)apply("weepwood",persist)},{once:true});commit();return;}
 pendingTheme=next;next.media="not all";
 next.addEventListener("load",()=>{
  if(generation!==themeGeneration){next.remove();return;}
  previous?.remove();next.id="ww-community";next.media="all";pendingTheme=null;commit();
 },{once:true});
 next.addEventListener("error",()=>{
  next.remove();if(generation!==themeGeneration)return;pendingTheme=null;update();
 },{once:true});
 document.head.append(next);
}
function applyMode(t){root.setAttribute("saved-theme",t);document.body?.classList.toggle("theme-dark",t==="dark");document.body?.classList.toggle("theme-light",t==="light");set("theme",t);document.dispatchEvent(new CustomEvent("themechange",{detail:{theme:t}}));update()}
root.setAttribute("saved-theme",get("theme")??(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));
const query=new URL(location.href).searchParams,requested=query.get("theme"),preview=query.get("preview");
if(["light","dark"].includes(preview)&&themes.has(requested))root.setAttribute("saved-theme",preview);
apply(themes.has(requested)?requested:get(key),!["light","dark"].includes(preview));
document.addEventListener("change",e=>{if(e.target.matches("[data-ww-picker]"))apply(e.target.value)});document.addEventListener("click",e=>{const filter=e.target.closest("[data-ww-theme-filter]");if(filter){
  const value=filter.dataset.wwThemeFilter;for(const b of document.querySelectorAll("[data-ww-theme-filter]"))b.setAttribute("aria-pressed",String(b===filter));
  for(const card of document.querySelectorAll(".ww-theme-card"))card.hidden=value!=="all"&&card.dataset.category!==value;
  return;
 }
 const btn=e.target.closest("[data-ww-mode],[data-ww-select]");if(!btn)return;if(btn.hasAttribute("data-ww-mode"))applyMode(mode()==="dark"?"light":"dark");else apply(btn.dataset.wwSelect)});
document.addEventListener("themechange",update);document.addEventListener("render",()=>requestAnimationFrame(update));document.addEventListener("nav",()=>requestAnimationFrame(update));
const mobile=matchMedia("(max-width: 800px)");mobile.addEventListener("change",e=>{if(e.matches){for(const explorer of document.querySelectorAll(".explorer")){explorer.classList.add("collapsed");explorer.setAttribute("aria-expanded","false");explorer.querySelector(".explorer-content")?.setAttribute("aria-expanded","false")}}});document.addEventListener("DOMContentLoaded",()=>{document.body.classList.toggle("theme-dark",mode()==="dark");document.body.classList.toggle("theme-light",mode()==="light");requestAnimationFrame(update)});
})();
