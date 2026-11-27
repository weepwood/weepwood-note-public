(async()=>{
 const $=id=>document.getElementById(id), status=$("graph-status"), svg=d3.select("#graph-svg"), layer=svg.append("g");
 const zoom=d3.zoom().scaleExtent([.3,5]).on("zoom",e=>layer.attr("transform",e.transform));svg.call(zoom);
 let simulation,selected=null,visible=[];
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
 const link=n=>{const a=el("a",n.title);a.href="./"+n.slug+".html";return a;};
 try{
  const response=await fetch("./vault-dashboard.json");if(!response.ok)throw Error("index");
  const data=await response.json(),notes=data.notes.filter(n=>/^n-[a-f0-9]{24}$/.test(n.slug)),byId=new Map(notes.map(n=>[n.slug,n]));
  const edges=notes.flatMap(n=>[...new Set(n.links??[])].filter(t=>t!==n.slug&&byId.has(t)).map(t=>({source:n.slug,target:t})));
  const adjacency=new Map(notes.map(n=>[n.slug,new Set()]));
  for(const {source,target} of edges){adjacency.get(source).add(target);adjacency.get(target).add(source);}
  const neighbors=id=>adjacency.get(id)??new Set();
  const categories=[...new Set(notes.map(n=>n.category??"未分类"))].sort((a,b)=>a.localeCompare(b,"zh"));
  const palette=["a","b","c","d","e"],colors=new Map(categories.map((c,i)=>[c,palette[i%palette.length]]));
  const legend=$("graph-legend");
  for(const c of categories.slice(0,8)){const item=el("span",c);item.style.setProperty("--ww-node-color","var(--ww-graph-"+colors.get(c)+")");legend.append(item);}
  if(categories.length>8)legend.append(el("small","其余 "+(categories.length-8)+" 个分类复用配色"));
  function addTags(nodes,depth=0){for(const t of nodes){const o=el("option","　".repeat(depth)+t.name+" · "+t.count);o.value=t.path;$("graph-tag").append(o);addTags(t.children,depth+1);}}addTags(data.tagTree??[]);
  function detail(){
   const node=byId.get(selected),box=$("graph-detail");box.replaceChildren();
   if(!node){box.textContent="选择节点查看关联文章。";return;}
   box.append(el("h3",node.title),el("p",(node.tags??[]).join(" · ")||"未分类"),link(node));
   const ids=neighbors(node.slug);box.append(el("h3","直接关联 · "+ids.size));
   for(const id of ids){const p=el("p");p.append(link(byId.get(id)));box.append(p);}
   if(!ids.size)box.append(el("p","没有直接关联。"));
  }
  function choose(id){selected=id;detail();if($("graph-scope").value==="local")render();else updateSelection();}
  function updateSelection(){
   const connected=neighbors(selected);
   layer.selectAll("g.graph-node").classed("selected",n=>n.slug===selected).classed("dimmed",n=>!!selected&&n.slug!==selected&&!connected.has(n.slug)).attr("aria-pressed",n=>String(n.slug===selected));
   layer.selectAll(".graph-edge").classed("related",e=>!!selected&&(e.source.slug===selected||e.target.slug===selected)).classed("dimmed",e=>!!selected&&e.source.slug!==selected&&e.target.slug!==selected);
   for(const b of $("graph-nodes").querySelectorAll("button"))b.setAttribute("aria-pressed",String(b.dataset.slug===selected));
  }
  function render(){
   simulation?.stop();layer.selectAll("*").remove();const q=$("graph-query").value.trim().toLowerCase(),tag=$("graph-tag").value,local=$("graph-scope").value==="local"&&selected?new Set([selected,...neighbors(selected)]):null;
   const matches=notes.filter(n=>(!tag||n.tags?.some(t=>t===tag||t.startsWith(tag+"/")))&&(!q||n.title.toLowerCase().includes(q))&&(!local||local.has(n.slug)));
   // Bound the force layout; full matching count remains visible.
   visible=matches.slice(0,250);
   if(selected&&!visible.some(n=>n.slug===selected)){
    if(matches.some(n=>n.slug===selected))visible=[byId.get(selected),...visible.slice(0,249)];
    else if(!local){selected=null;detail();}
   }
   const ids=new Set(visible.map(n=>n.slug)),nodes=visible.map(n=>({...n})),links=edges.filter(e=>ids.has(e.source)&&ids.has(e.target)).map(e=>({...e}));
   const width=800,height=480;svg.attr("viewBox","0 0 "+width+" "+height);
   const lines=layer.append("g").selectAll("line").data(links).join("line").attr("class","graph-edge");
   const groups=layer.append("g").selectAll("g").data(nodes).join("g").attr("class","graph-node").attr("tabindex",0).attr("role","button").attr("aria-label",n=>n.title).on("click",(e,n)=>choose(n.slug)).on("keydown",(e,n)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose(n.slug);}});
   groups.style("--ww-node-color",n=>"var(--ww-graph-"+(colors.get(n.category??"未分类")??"a")+")");groups.append("circle").attr("r",n=>Math.min(15,6+Math.sqrt(neighbors(n.slug).size)*2));groups.append("text").attr("dy",24).attr("text-anchor","middle").text(n=>n.title.length>18?n.title.slice(0,18)+"…":n.title);
   groups.append("title").text(n=>n.title);
   simulation=d3.forceSimulation(nodes).force("link",d3.forceLink(links).id(n=>n.slug).distance(100)).force("charge",d3.forceManyBody().strength(-170)).force("center",d3.forceCenter(width/2,height/2)).force("collision",d3.forceCollide(nodes.length>60?12:42)).stop();
   const paint=()=>{lines.attr("x1",e=>e.source.x).attr("y1",e=>e.source.y).attr("x2",e=>e.target.x).attr("y2",e=>e.target.y);groups.attr("transform",n=>"translate("+n.x+","+n.y+")");};
   simulation.tick(nodes.length>60?80:120);paint();simulation.on("tick",paint);
   if(nodes.length){
    const x=d3.extent(nodes,n=>n.x),y=d3.extent(nodes,n=>n.y),cx=(x[0]+x[1])/2,cy=(y[0]+y[1])/2;
    const k=Math.max(.3,Math.min(1.25,(width-160)/Math.max(1,x[1]-x[0]),(height-100)/Math.max(1,y[1]-y[0])));
    svg.call(zoom.transform,d3.zoomIdentity.translate(width/2,height/2).scale(k).translate(-cx,-cy));
   }else svg.call(zoom.transform,d3.zoomIdentity);
   groups.call(d3.drag().on("start",(e,n)=>{if(!e.active)simulation.alpha(.2).alphaTarget(.15).restart();n.fx=n.x;n.fy=n.y;}).on("drag",(e,n)=>{n.fx=e.x;n.fy=e.y;}).on("end",(e,n)=>{if(!e.active)simulation.alphaTarget(0);n.fx=null;n.fy=null;}));
   const list=$("graph-nodes");list.replaceChildren();for(const n of visible){const b=el("button",n.title);b.type="button";b.dataset.slug=n.slug;b.addEventListener("click",()=>choose(n.slug));list.append(b);}
   status.textContent=visible.length+" 个节点 · "+links.length+" 条链接"+(matches.length>250?"（共 "+matches.length+" 个匹配，图谱最多显示 250 个）":"");if(!nodes.length)status.textContent="没有匹配节点。";
   updateSelection();
  }
  $("graph-query").addEventListener("input",render);$("graph-tag").addEventListener("change",render);$("graph-scope").addEventListener("change",render);
  $("graph-reset").addEventListener("click",()=>{$("graph-query").value="";$("graph-tag").value="";$("graph-scope").value="all";selected=null;detail();svg.call(zoom.transform,d3.zoomIdentity);render();window.wwSyncDropdowns?.();});
  render();
 }catch{status.textContent="图谱加载失败，请刷新重试。";}
 window.addEventListener("pagehide",()=>simulation?.stop(),{once:true});
})();
