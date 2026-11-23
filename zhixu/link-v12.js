/* 枝序 1.2 · 可拆卸的结构线、跨分支关联线与插入中间节点。
 * Tree edges remain parentId relationships; independent references use doc.links.
 */
(() => {
  'use strict';
  let app = null;
  let mode = null;
  let selected = null;
  let drag = null;
  let suppressClickUntil = 0;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const makeId = () => globalThis.crypto?.randomUUID?.() || 'link-'+Date.now().toString(36)+Math.random().toString(36).slice(2);
  const documentLinks = () => {
    const doc = app.currentDoc();
    if(!Array.isArray(doc.links)) doc.links = [];
    return doc.links;
  };
  const mainRoot = () => app.currentDoc()?.nodes[0]?.id;
  const isAncestor = (maybeAncestor, childId) => {
    const visited = new Set();
    let node = app.findNode(childId);
    while(node?.parentId && !visited.has(node.id)) {
      visited.add(node.id);
      if(node.parentId === maybeAncestor) return true;
      node = app.findNode(node.parentId);
    }
    return false;
  };
  const descendants = id => {
    const all = new Set([id]);
    let changed = true;
    while(changed) {
      changed = false;
      app.currentDoc().nodes.forEach(n => {
        if(n.parentId && all.has(n.parentId) && !all.has(n.id)) {all.add(n.id);changed=true;}
      });
    }
    return all;
  };
  const validParent = (parentId, childId) => {
    if(!app.findNode(parentId) || !app.findNode(childId)) return '节点已不存在';
    if(parentId === childId) return '不能连接节点自身';
    if(childId === mainRoot()) return '中心主题不能作为子节点，可改用关联线';
    if(isAncestor(childId, parentId)) return '不能将节点接到自己的子分支，避免形成循环';
    return '';
  };
  function leaveMode(){ mode=null; drag=null; updateUI(); }
  function reparent(parentId, childId){
    const error=validParent(parentId,childId);
    if(error){app.toast(error);return false;}
    const child=app.findNode(childId);
    if(child.parentId===parentId){app.toast('这两个节点已经连接');leaveMode();return false;}
    app.mutate(() => {
      child.parentId=parentId;
      const parent=app.findNode(parentId);
      if(parent)parent.collapsed=false;
      app.state.selectedId=childId;
    });
    leaveMode();app.toast('结构已连接 · 可撤销');return true;
  }
  function associate(from,to){
    if(from===to){app.toast('不能关联节点自身');return false;}
    if(!app.findNode(from)||!app.findNode(to))return false;
    if(app.findNode(to).parentId===from||app.findNode(from).parentId===to){app.toast('两节点已通过结构线连接');return false;}
    if(documentLinks().some(l=>(l.from===from&&l.to===to)||(l.to===from&&l.from===to))){app.toast('关联线已存在');return false;}
    app.mutate(()=>{documentLinks().push({id:makeId(),from,to});});
    leaveMode();app.toast('已添加关联线 · 不改变原层级');return true;
  }
  function askLinkChoice(from,to){
    if(from===to){app.toast('不能连接节点自身');return;}
    const child=app.findNode(to);
    if(!child)return;
    if(child.parentId===from){app.toast('已经存在结构线');leaveMode();return;}
    if(!child.parentId && to!==mainRoot() && !isAncestor(to,from)) return reparent(from,to);
    const title=esc(child.title||'未命名节点');
    const invalid=validParent(from,to);
    app.modal(`<div class="modal-eyebrow">CONNECT IDEAS</div><h3>怎样连接「${title}」？</h3><p>结构连接会改变节点的所属分支；关联线只表达两个想法有关联，保留原来的结构与内容。</p><div class="modal-option-list">${invalid?'':`<button class="modal-choice" id="link-reparent-choice">改为子节点 <span>↳</span></button>`}<button class="modal-choice" id="link-assoc-choice">添加关联线 <span>↗</span></button></div><div class="modal-buttons"><button id="link-choice-cancel">取消</button></div>`);
    $('#link-reparent-choice')?.addEventListener('click',()=>{app.closeModal();reparent(from,to);});
    $('#link-assoc-choice').onclick=()=>{app.closeModal();associate(from,to);};
    $('#link-choice-cancel').onclick=()=>{app.closeModal();leaveMode();};
  }
  function activateConnection(from){
    if(!app.findNode(from))return;
    selected=null;mode={type:'choose-child',from};
    app.state.selectedId=from;
    updateUI();app.toast('请轻点目标节点，或按住「连接」拖过去');
  }
  function activateReparent(child){
    if(!app.findNode(child))return;
    selected=null;mode={type:'choose-parent',child};
    updateUI();app.toast('选择新的上级节点');
  }
  function completeTarget(target){
    if(!mode||!target)return;
    const active=mode;
    if(active.type==='choose-child') return askLinkChoice(active.from,target);
    if(active.type==='choose-parent')return reparent(target,active.child);
    if(active.type==='redirect-association') {
      const l=documentLinks().find(l=>l.id===active.id);
      if(!l)return leaveMode();
      if(l.from===target){app.toast('不能连接节点自身');return;}
      if(documentLinks().some(x=>x.id!==l.id&&((x.from===l.from&&x.to===target)||(x.to===l.from&&x.from===target)))){app.toast('这两个节点已经关联');return;}
      app.mutate(()=>{l.to=target;});leaveMode();app.toast('关联线已改接');
    }
  }
  function disconnect(){
    if(!selected)return;
    const active=selected; selected=null;
    if(active.type==='tree') {
      const child=app.findNode(active.id);
      if(!child||!child.parentId)return;
      app.mutate(()=>{child.parentId=null;app.state.selectedId=child.id;});
      app.toast('连接已断开，节点和文章仍然保留');
    }else {
      app.mutate(()=>{const d=app.currentDoc();d.links=documentLinks().filter(l=>l.id!==active.id);});
      app.toast('关联线已删除，节点不受影响');
    }
    updateUI();
  }
  function insertMiddle(){
    if(!selected)return;
    const active=selected; selected=null;
    if(active.type==='association') {
      const association=documentLinks().find(l=>l.id===active.id);
      const from=app.findNode(association?.from),to=app.findNode(association?.to);
      if(!from||!to)return;
      const node={id:makeId(),parentId:null,x:Math.round((from.x+to.x)/2),y:Math.round((from.y+to.y)/2+110),title:'新想法',note:'',blocks:[{id:makeId(),type:'paragraph',html:''}],bodyCollapsed:false,color:from.color||'sage',images:[],collapsed:false};
      app.mutate(()=>{const l=documentLinks(); const at=l.findIndex(x=>x.id===active.id);if(at>=0)l.splice(at,1,{id:makeId(),from:from.id,to:node.id},{id:makeId(),from:node.id,to:to.id});app.currentDoc().nodes.push(node);app.state.selectedId=node.id;});
      requestAnimationFrame(()=>app.focusEditable(node.id));app.toast('已插入关联节点');updateUI();return;
    }
    const child=app.findNode(active.id),parent=app.findNode(child?.parentId);
    if(!parent||!child)return;
    const pw=app.nodeSize(parent).w,cw=app.nodeSize(child).w,nw=336;
    const right=child.x+cw/2 >= parent.x+pw/2;
    const newX=Math.round(right?parent.x+pw+80:parent.x-nw-80);
    const requiredX=right?newX+nw+80:newX-80-cw;
    const shift=right?Math.max(0,requiredX-child.x):Math.min(0,requiredX-child.x);
    const newY=Math.round((parent.y+app.nodeSize(parent).h/2+child.y+app.nodeSize(child).h/2)/2-75);
    const id=makeId();
    const middle={id,parentId:parent.id,x:newX,y:newY,title:'新想法',note:'',blocks:[{id:makeId(),type:'paragraph',html:''}],bodyCollapsed:false,color:child.color||'sage',images:[],collapsed:false};
    const branch=descendants(child.id);
    app.mutate(()=>{
      for(const n of app.currentDoc().nodes)if(branch.has(n.id))n.x+=shift;
      child.parentId=id; parent.collapsed=false;
      app.currentDoc().nodes.push(middle);app.state.selectedId=id;
    });
    updateUI();requestAnimationFrame(()=>app.focusEditable(id));app.toast('已插入中间节点，原有内容和子分支都保留');
  }
  function changeConnection(){
    if(!selected)return;
    const s=selected;
    selected=null;
    if(s.type==='tree')activateReparent(s.id);
    else {mode={type:'redirect-association',id:s.id};updateUI();app.toast('请选择关联线的新终点');}
  }
  function makePath(from,to){
    const fw=app.nodeSize(from).w,tw=app.nodeSize(to).w;
    const right=(to.x+tw/2)>from.x+fw/2;
    const x1=right?from.x+fw:from.x;
    const y1=from.y+app.nodeSize(from).h/2;
    const x2=right?to.x:to.x+tw;
    const y2=to.y+app.nodeSize(to).h/2;
    const d=Math.max(65,Math.abs(x2-x1)*.53);
    return `M${x1} ${y1}C${right?x1+d:x1-d} ${y1} ${right?x2-d:x2+d} ${y2} ${x2} ${y2}`;
  }
  function exportEdges(nodes){
    if(!app)return '';
    const visible=new Map(nodes.map(n=>[n.id,n]));
    return documentLinks().filter(l=>visible.has(l.from)&&visible.has(l.to)).map(l=>`<path d="${makePath(visible.get(l.from),visible.get(l.to))}" stroke="#95a9b7" stroke-width="2.1" fill="none" stroke-dasharray="7 6" opacity=".85"/>`).join('');
  }
  function svgPath(attrs){
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    Object.entries(attrs).forEach(([key,value])=>path.setAttribute(key,String(value)));
    return path;
  }
  function enhanceEdges(svg,nodes){
    if(!app)return;
    const visible=new Map(nodes.map(n=>[n.id,n]));
    const current=selected;
    for(const path of svg.querySelectorAll('path[data-edge]')){
      const id=path.dataset.edge;
      if(current?.type==='tree'&&current.id===id)path.classList.add('is-active-edge');
      svg.appendChild(svgPath({d:path.getAttribute('d'),class:'edge-hit',stroke:'transparent','stroke-width':28,fill:'none','data-edge-hit':id,tabindex:0,role:'button','aria-label':'选择节点连接线'}));
    }
    for(const link of documentLinks()){
      const from=visible.get(link.from),to=visible.get(link.to);
      if(!from||!to)continue;
      const d=makePath(from,to);
      svg.appendChild(svgPath({d,class:'association-line'+(current?.type==='association'&&current.id===link.id?' is-active-edge':''),stroke:'#95a9b7','stroke-width':2.2,fill:'none','stroke-dasharray':'7 6','data-association':link.id}));
      svg.appendChild(svgPath({d,class:'edge-hit',stroke:'transparent','stroke-width':28,fill:'none','data-link-hit':link.id,tabindex:0,role:'button','aria-label':'选择关联线'}));
    }
    if(selected&&!((selected.type==='tree'&&app.findNode(selected.id)?.parentId)||(selected.type==='association'&&documentLinks().some(l=>l.id===selected.id)))){selected=null;updateUI();}
  }
  function ensureUI(){
    const board=$('#board');
    if(!board||$('#link-banner'))return;
    board.insertAdjacentHTML('beforeend',`<div id="link-banner" class="link-banner" hidden></div><div id="edge-actions" class="link-edge-actions" hidden></div><svg id="link-preview" class="link-preview" aria-hidden="true"><path id="link-preview-path"/></svg>`);
  }
  function updateUI(){
    if(!app)return;
    ensureUI();
    const banner=$('#link-banner'),actions=$('#edge-actions');
    if(banner){
      banner.hidden=!mode;
      if(mode){
        const active=mode.type==='choose-child'?app.findNode(mode.from):mode.type==='choose-parent'?app.findNode(mode.child):null;
        const prompt=mode.type==='choose-child'?'轻点目标节点完成连接':mode.type==='choose-parent'?'选择新的上级节点':'选择关联线的新终点';
        banner.innerHTML=`<span class="link-banner-text"><b>连线模式</b> · ${prompt}${active?' · '+esc((active.title||'').slice(0,12)):''}</span><button type="button" data-link-cancel>取消</button>`;
      }
    }
    if(actions){
      actions.hidden=!selected;
      if(selected){
        const name=selected.type==='tree'?'结构连接':'关联连接';
        actions.innerHTML=`<span class="link-edge-title">${name}</span><button type="button" data-edge-action="insert">＋ 插入节点</button><button type="button" data-edge-action="reconnect">↗ 改接</button><button type="button" data-edge-action="cut">× 断开</button><button type="button" data-edge-action="cancel" aria-label="关闭连接操作">×</button>`;
      }
    }
    document.body.classList.toggle('linking-mode',!!mode);
    document.querySelectorAll('#nodes-layer>.node').forEach(node=>node.classList.toggle('link-node-candidate',!!mode));
    if(!drag||!drag.active)hidePreview();
  }
  function showPreview(x,y){
    const source=app.findNode(drag?.from);if(!source)return;
    const boardRect=$('#board').getBoundingClientRect();
    const centerWorld={x:source.x+app.nodeSize(source).w/2,y:source.y+app.nodeSize(source).h/2};
    const sx=centerWorld.x*app.state.scale+app.state.panX,sy=centerWorld.y*app.state.scale+app.state.panY;
    const tx=x-boardRect.left,ty=y-boardRect.top;
    const svg=$('#link-preview');svg.hidden=false;
    svg.setAttribute('viewBox',`0 0 ${boardRect.width} ${boardRect.height}`);
    $('#link-preview-path').setAttribute('d',`M${sx} ${sy}Q${(sx+tx)/2} ${(sy+ty)/2-40} ${tx} ${ty}`);
  }
  function hidePreview(){const svg=$('#link-preview');if(svg)svg.hidden=true;document.querySelectorAll('.link-target-hover').forEach(el=>el.classList.remove('link-target-hover'));}
  function onPointerDown(e){
    const button=e.target.closest('[data-link-start]');
    if(!button || !app)return;
    if(e.button!==0&&e.pointerType==='mouse')return;
    drag={from:button.dataset.linkStart,id:e.pointerId,x:e.clientX,y:e.clientY,active:false};
  }
  function onPointerMove(e){
    if(!drag||drag.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>11)drag.active=true;
    if(!drag.active)return;
    e.preventDefault();
    showPreview(e.clientX,e.clientY);
    document.querySelectorAll('.link-target-hover').forEach(el=>el.classList.remove('link-target-hover'));
    const card=document.elementFromPoint(e.clientX,e.clientY)?.closest('.node');
    if(card&&card.dataset.node!==drag.from)card.classList.add('link-target-hover');
  }
  function onPointerUp(e){
    if(!drag||drag.id!==e.pointerId)return;
    const last=drag;drag=null;
    if(last.active){
      suppressClickUntil=Date.now()+450;
      e.preventDefault();e.stopPropagation();
      hidePreview();
      const card=document.elementFromPoint(e.clientX,e.clientY)?.closest('.node');
      if(card&&card.dataset.node!==last.from){mode={type:'choose-child',from:last.from};completeTarget(card.dataset.node);}
      else activateConnection(last.from);
    }
  }
  function init(api){
    if(app)return;
    app=api;ensureUI();
    const board=$('#board'),nodes=$('#nodes-layer'),svg=$('#connectors');
    nodes.addEventListener('pointerdown',onPointerDown,true);
    window.addEventListener('pointermove',onPointerMove,true);
    window.addEventListener('pointerup',onPointerUp,true);
    window.addEventListener('pointercancel',()=>{drag=null;hidePreview();},true);
    nodes.addEventListener('pointerdown',e=>{
      if(!mode||e.target.closest('[data-link-start]'))return;
      const node=e.target.closest('.node');if(!node)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      completeTarget(node.dataset.node);
    },true);
    nodes.addEventListener('click',e=>{
      const btn=e.target.closest('[data-link-start]');
      if(!btn)return;
      e.preventDefault();e.stopPropagation();
      if(Date.now()<suppressClickUntil)return;
      activateConnection(btn.dataset.linkStart);
    });
    svg.addEventListener('pointerdown',e=>{if(e.target.closest('.edge-hit'))e.stopPropagation();});
    svg.addEventListener('click',e=>{
      const hit=e.target.closest('[data-edge-hit],[data-link-hit]');
      if(!hit)return;
      e.preventDefault();e.stopPropagation();
      mode=null;
      selected=hit.hasAttribute('data-edge-hit')?{type:'tree',id:hit.dataset.edgeHit}:{type:'association',id:hit.dataset.linkHit};
      app.renderEdges();updateUI();
    });
    svg.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.edge-hit')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
    board.addEventListener('click',e=>{
      if(e.target.closest('[data-link-cancel]')){leaveMode();return;}
      const btn=e.target.closest('[data-edge-action]');
      if(!btn)return;
      e.stopPropagation();
      switch(btn.dataset.edgeAction){case 'cut':disconnect();break;case 'insert':insertMiddle();break;case 'reconnect':changeConnection();break;default:selected=null;updateUI();app.renderEdges();}
    });
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&(mode||selected)){leaveMode();selected=null;app.renderEdges();updateUI();}});
    app.renderEdges();updateUI();
  }
  window.ZhixuConnect=Object.freeze({init,enhanceEdges,exportEdges});
})();
