(()=>{
const publicBase="/weepwood-note-public/";
const approvedRoutes=new Set(["/weepwood-note-public/n-a7c14f7abf1389c0704b2768.html","/weepwood-note-public/n-d903582b13a6d0a823488aa1.html","/weepwood-note-public/n-632a17655ea165281ba365a2.html","/weepwood-note-public/n-3d8f673b61ffea4e2cde8581.html","/weepwood-note-public/n-70c900aa74a0bc35428580b0.html","/weepwood-note-public/n-3bbf85b07580d61bb15034d6.html","/weepwood-note-public/n-6decef789c706838360a4501.html","/weepwood-note-public/n-b4d2d6b9dd7b938ba3f4b54a.html","/weepwood-note-public/n-a591c37738bdc9aea6fea322.html","/weepwood-note-public/n-9e5fb794e91e87714634c418.html","/weepwood-note-public/n-81cd9aa172ab887423098be5.html","/weepwood-note-public/n-23f7a7f90be3db7e92f3df70.html","/weepwood-note-public/n-d7f9556b246838c40099f139.html","/weepwood-note-public/n-7a212e86d74c239ee07ab295.html","/weepwood-note-public/n-a6804cd56f537345b9715c25.html","/weepwood-note-public/n-f79f0293f604cbe2131edc6f.html","/weepwood-note-public/n-bcc74cf5264501dea52da024.html","/weepwood-note-public/n-063a1cbddb1f8dabe7a53f58.html","/weepwood-note-public/n-b0396409f08bb32c31791db9.html","/weepwood-note-public/n-22525a375a178fff2e5cc905.html","/weepwood-note-public/n-ae14cc8317de1fcbef8da9be.html","/weepwood-note-public/n-f016fd4adf27ae5f5501a9ba.html","/weepwood-note-public/n-cb058c3c8997e976a96da391.html","/weepwood-note-public/n-972c95c924a5a3e77bdfd471.html","/weepwood-note-public/n-a5ff4c636de181a7156359a1.html","/weepwood-note-public/n-245339c9c7f209919a4afc6a.html","/weepwood-note-public/n-4077d420482b0f4ac1ad0cf2.html","/weepwood-note-public/n-7e483db5460d27784c7370e9.html","/weepwood-note-public/n-eef1aa0645fc4d887e0f4732.html","/weepwood-note-public/n-a4281006370be08bbe60aa75.html","/weepwood-note-public/n-05daca4763f108831782fed8.html","/weepwood-note-public/n-5b9622193a5e76285990d754.html","/weepwood-note-public/n-f22bcc75a967bd7070a89d58.html","/weepwood-note-public/n-fa5984eb55e8498ca4bc9608.html"]);
let focusNext=null;
function tabs(){
 const header=document.querySelector(".page-header");if(!header)return;
 const slug=location.pathname;if(slug.endsWith("/weepwood-note-public/vault-search.html"))return;
 const valid=p=>typeof p==="string"&&p.startsWith("/")&&!p.startsWith("//")&&(!publicBase||p.startsWith(publicBase)&&/^n-[a-f0-9]{24}\.html$/.test(p.slice(publicBase.length))&&(!approvedRoutes||approvedRoutes.has(p)));
 if(publicBase&&!valid(slug))return;
 let stored;try{stored=JSON.parse(sessionStorage.getItem("vault-pages-tabs")||"null")}catch{}
 // v1 array -> v2 ordered tabs/activeIndex (native Stacked Pages state shape).
 const legacy=Array.isArray(stored);
 let history=(legacy?stored:(Array.isArray(stored?.tabs)?stored.tabs.map(x=>({path:typeof x?.slug==="string"?"/"+x.slug:"",title:x?.title})):[]));
 history=history.filter(x=>x&&valid(x.path)&&typeof x.title==="string").filter((x,i,a)=>a.findIndex(v=>v.path===x.path)===i);
 const existing=history.find(x=>x.path===slug);
 const oldActive=!legacy&&Number.isInteger(stored?.activeIndex)?stored.tabs?.[stored.activeIndex]?.slug:null;
 if(existing)existing.title=document.title;
 else {
  const previous=history.findIndex(x=>x.path==="/"+oldActive);
  history.splice(previous<0?history.length:previous+1,0,{path:slug,title:document.title});
 }
 // Keep the active page even if opening a ninth tab in the middle.
 while(history.length>8){if(history[0].path!==slug)history.shift();else history.pop();}
 function persist(active=slug){try{sessionStorage.setItem("vault-pages-tabs",JSON.stringify({tabs:history.map(x=>({slug:x.path.slice(1),title:x.title})),activeIndex:history.findIndex(x=>x.path===active)}))}catch{}}
 persist();
 let bar=header.querySelector(".vault-tabs");if(!bar){bar=document.createElement("nav");bar.className="vault-tabs";bar.setAttribute("aria-label","阅读标签页");header.prepend(bar);}
 const focused=bar.contains(document.activeElement)?document.activeElement?.closest("span")?.querySelector("a")?.pathname:null;
 bar.replaceChildren();
 for(const item of history){
  const wrap=document.createElement("span"),a=document.createElement("a"),close=document.createElement("button");
  a.href=item.path;a.textContent=item.title;if(item.path===slug)a.setAttribute("aria-current","page");
  close.type="button";if(publicBase&&window.wwIcon)close.append(window.wwIcon("X"));else close.textContent="×";close.setAttribute("aria-label","关闭 "+item.title);
  close.addEventListener("click",()=>{
   const index=history.findIndex(x=>x.path===item.path);history=history.filter(x=>x.path!==item.path);
   const next=history[Math.min(index,history.length-1)];persist(item.path===slug?next?.path:slug);
   if(item.path===slug){
    if(next){focusNext=next.path;if(typeof window.spaNavigate==="function")window.spaNavigate(new URL(next.path,location.origin));else location.href=next.path;}
    else location.href=publicBase||"/";
   }else{wrap.remove();if(next)[...bar.querySelectorAll("a")].find(x=>x.pathname===next.path)?.focus();}
  });
  a.addEventListener("keydown",e=>{
   if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
   const links=[...bar.querySelectorAll("a")],i=links.indexOf(a);
   const next=e.key==="Home"?0:e.key==="End"?links.length-1:(i+(e.key==="ArrowRight"?1:-1)+links.length)%links.length;
   e.preventDefault();links[next]?.focus();
  });
  wrap.append(a,close);bar.append(wrap);
 }
 const target=focusNext??focused;focusNext=null;
 if(target)requestAnimationFrame(()=>{const link=[...bar.querySelectorAll("a")].find(x=>x.pathname===target);if(link?.getClientRects().length)link.focus();else if(focused||target===slug)header.querySelector(".ww-reader-menu>summary")?.focus();});
}
function init(){tabs();
 const left=document.querySelector(".sidebar.left");if(!left)return;
 if(!publicBase&&!left.querySelector(".vault-links")){const nav=document.createElement("nav");nav.className="vault-links";nav.setAttribute("aria-label","知识工作台");
 for(const [text,url] of [["首页","/weepwood-note-public/"],["概览","/weepwood-note-public/vault-dashboard.html"],["高级搜索","/weepwood-note-public/vault-search.html"]]){const a=document.createElement("a");a.textContent=text;a.href=url;if(url.endsWith(".html"))a.dataset.routerIgnore="true";nav.append(a);}
 left.prepend(nav);}
 for(const side of ["left","right"]){
  const panel=document.querySelector(".sidebar."+side);if(!panel||panel.querySelector(".vault-resize"))continue;
  const grip=document.createElement("button");grip.className="vault-resize "+side;grip.type="button";grip.setAttribute("aria-label","调整"+side+"侧栏宽度");
  const key="vault-width-"+side; const apply=n=>{n=Math.min(390,Math.max(200,n));document.documentElement.style.setProperty("--vault-"+side,n+"px");try{localStorage.setItem(key,String(n))}catch{}};
  let stored;try{stored=Number(localStorage.getItem(key))}catch{}if(stored>=200)apply(stored);
  grip.addEventListener("pointerdown",e=>{e.preventDefault();const start=e.clientX,width=panel.getBoundingClientRect().width;grip.setPointerCapture(e.pointerId);const move=m=>apply(width+(side==="left"?1:-1)*(m.clientX-start));grip.addEventListener("pointermove",move);const stop=()=>{grip.removeEventListener("pointermove",move);grip.removeEventListener("pointerup",stop);grip.removeEventListener("pointercancel",stop)};grip.addEventListener("pointerup",stop);grip.addEventListener("pointercancel",stop);});
  grip.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();apply(panel.getBoundingClientRect().width+(e.key==="ArrowRight"?10:-10)*(side==="left"?1:-1));}});panel.append(grip);
 }
}
document.addEventListener("nav",init);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
