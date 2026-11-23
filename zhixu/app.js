/* 枝序 · Mindspace — dependency-free, offline-first mind map application */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const $id = id => document.getElementById(id);
  const ROOT_W = 302, ROOT_H = 116, NODE_W = 336, NODE_H = 132;
  const COLORS = [
    { id:'sage', label:'鼠尾草绿', value:'#91ae9a', line:'#b3c9b7' },
    { id:'ocean', label:'雾蓝', value:'#8caab7', line:'#b7cbd3' },
    { id:'clay', label:'陶土', value:'#d2a590', line:'#dfc3b6' },
    { id:'lilac', label:'灰紫', value:'#b0a4c7', line:'#cec7dc' },
    { id:'sand', label:'亚麻', value:'#c3ad83', line:'#d7c9aa' },
    { id:'charcoal', label:'石墨', value:'#89948e', line:'#bac3bc' },
  ];
  const ICONS = {
    'menu':'<path d="M4 6h16M4 12h16M4 18h16"/>',
    'search':'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    'undo':'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/>',
    'redo':'<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h2"/>',
    'arrow-up-right':'<path d="M7 17 17 7M8 7h9v9"/>',
    'chevron-down':'<path d="m6 9 6 6 6-6"/>',
    'plus':'<path d="M12 5v14M5 12h14"/>',
    'minus':'<path d="M5 12h14"/>',
    'x':'<path d="M18 6 6 18M6 6l12 12"/>',
    'maximize':'<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
    'mouse-pointer':'<path d="m5 3 14 9-7 1-3 7z"/>',
    'git-branch':'<circle cx="6" cy="3" r="2"/><path d="M6 5v12"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 13c0-4 5-7 10-7"/>',
    'edit-3':'<path d="M12 20h9M3 17.25V21h3.75L18.8 8.95l-3.75-3.75L3 17.25Z"/><path d="m14 6 4 4"/>',
    'image':'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    'image-plus':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6m-3-3v6"/>',
    'upload':'<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',
    'download':'<path d="M12 4v13m-5-5 5 5 5-5M4 18v3h16v-3"/>',
    'copy':'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    'trash':'<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7"/>',
    'plus-circle':'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    'check':'<path d="m5 12 5 5L20 7"/>',
    'ellipsis':'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    'file':'<path d="M13 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V11z"/><path d="M13 3v8h8M8 16h8"/>',
    'arrow-right':'<path d="M4 12h16m-7-7 7 7-7 7"/>',
    'smartphone':'<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M11 18h2"/>'
  };
  const icon = (name, size=18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.file}</svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const xml = esc;
  const uid = () => (globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2,11)}`);
  const clamp = (num,min,max)=>Math.max(min,Math.min(max,num));
  const now = () => Date.now();
  const deepCopy = obj => JSON.parse(JSON.stringify(obj));
  const nodeSize = n => ({w:n.id!==currentDoc()?.nodes[0]?.id?NODE_W:ROOT_W,h:n._measuredHeight||n.height||(n.id!==currentDoc()?.nodes[0]?.id?NODE_H:ROOT_H)});
  const getColor = color => COLORS.find(c=>c.id===color)||COLORS[0];
  const rootNode = title => ({id:uid(),parentId:null,x:0,y:0,title,note:'一个想法，从这里开始',color:'sage',images:[],collapsed:false});
  const makeDoc = (title='未命名导图') => {
    const root=rootNode('中心主题');return {id:uid(),title,createdAt:now(),updatedAt:now(),nodes:[root],links:[]};
  };
  const seedDocs = () => {
    const d=makeDoc('我的第一张思维导图');const root=d.nodes[0];root.title='让想法自由生长';root.note='从一个念头，延伸出更多可能';
    const nodes=[
      {id:uid(),parentId:root.id,x:392,y:-224,title:'灵感收集',note:'收藏每一个微小的灵光',color:'sage'},
      {id:uid(),parentId:root.id,x:-355,y:-192,title:'生活计划',note:'把想做的事慢慢实现',color:'clay'},
      {id:uid(),parentId:root.id,x:392,y:84,title:'正在思考',note:'梳理问题与下一步行动',color:'ocean'},
      {id:uid(),parentId:root.id,x:-355,y:110,title:'阅读笔记',note:'记录让人停下来的句子',color:'lilac'},
    ];
    const more=[
      {id:uid(),parentId:nodes[0].id,x:735,y:-290,title:'新的产品点子',note:'把灵感变成具体的计划',color:'sage'},
      {id:uid(),parentId:nodes[0].id,x:735,y:-163,title:'待探索的方向',note:'先记下来，之后再完善',color:'sand'},
    ];
    d.nodes.push(...[...nodes,...more].map(n=>({...n,images:[],collapsed:false})));
    const d2=makeDoc('阅读与灵感');d2.nodes[0].title='阅读与灵感';d2.nodes[0].note='用枝叶收藏读过的世界';
    d2.nodes.push(
      {id:uid(),parentId:d2.nodes[0].id,x:370,y:-140,title:'值得阅读',note:'下一本想翻开的书',color:'sage',images:[],collapsed:false},
      {id:uid(),parentId:d2.nodes[0].id,x:-344,y:100,title:'触动我的句子',note:'让阅读留下痕迹',color:'clay',images:[],collapsed:false}
    );
    return [d,d2];
  };
  const state={pendingImageNode:null,editBefore:new Map(),lastEditedBlock:null,metricsObserver:null,docs:[],docId:null,selectedId:null,lastTapId:null,lastTapAt:0,scale:1,panX:0,panY:0,showInspector:false,undo:[],redo:[],textSnapshots:new Map(),pointers:new Map(),gesture:null,viewportAnimation:null,saveTimer:null,toastTimer:null,isReady:false};
  const currentDoc=()=>state.docs.find(d=>d.id===state.docId)||null;
  const selectedNode=()=>currentDoc()?.nodes.find(n=>n.id===state.selectedId)||null;
  const findNode=(id)=>currentDoc()?.nodes.find(n=>n.id===id)||null;
  const childrenOf=(id)=>currentDoc()?.nodes.filter(n=>n.parentId===id)||[];
  const visibleNodes=()=>{
    const d=currentDoc(); if(!d)return [];
    const byId=new Map(d.nodes.map(n=>[n.id,n]));
    return d.nodes.filter(n=>{let p=n;const seen=new Set();while(p.parentId){if(seen.has(p.parentId))return false;seen.add(p.parentId);p=byId.get(p.parentId);if(!p||p.collapsed)return false;}return true;});
  };
  const roots=()=>currentDoc()?.nodes.filter(n=>!n.parentId)||[];
  const snap=()=>JSON.stringify(currentDoc());
  const pushPast=(previous)=>{if(previous&&previous!==snap()){state.undo.push(previous);if(state.undo.length>70)state.undo.shift();state.redo.length=0;updateHistoryButtons();}};
  const mutate=(fn,{render=true}={})=>{const before=snap();fn();const d=currentDoc();if(d){d.updatedAt=now();pushPast(before);}if(render)renderAll();schedulePersist();};
  function undo(){if(!state.undo.length)return;const previous=state.undo.pop();state.redo.push(snap());replaceActiveDoc(JSON.parse(previous));renderAll();schedulePersist();}
  function redo(){if(!state.redo.length)return;const next=state.redo.pop();state.undo.push(snap());replaceActiveDoc(JSON.parse(next));renderAll();schedulePersist();}
  function replaceActiveDoc(doc){const idx=state.docs.findIndex(d=>d.id===state.docId);if(idx>=0){state.docs[idx]=doc;}if(!doc.nodes.some(n=>n.id===state.selectedId))state.selectedId=doc.nodes[0]?.id||null;}
  function updateHistoryButtons(){$id('undo-btn').disabled=!state.undo.length;$id('redo-btn').disabled=!state.redo.length;}

  const STORE='zhixu-mind-data-v1';
  const IDB_NAME='zhixu-offline-db';
  let idbPromise=null;
  function db(){if(!('indexedDB' in window))return Promise.reject(new Error('IndexedDB unavailable'));if(!idbPromise)idbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(IDB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore('records');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});return idbPromise;}
  async function readStore(){try{const database=await db();return await new Promise((res,rej)=>{const tx=database.transaction('records','readonly');const req=tx.objectStore('records').get(STORE);req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});}catch(e){try{return JSON.parse(localStorage.getItem(STORE)||'null');}catch{return null;}}}
  async function writeStore(data){try{const database=await db();return await new Promise((res,rej)=>{const tx=database.transaction('records','readwrite');tx.objectStore('records').put(data,STORE);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}catch(err){localStorage.setItem(STORE,JSON.stringify(data));}}
  function schedulePersist(){if(!state.isReady)return;$id('save-label').textContent='保存中…';clearTimeout(state.saveTimer);state.saveTimer=setTimeout(persist,280);}
  async function persist(){clearTimeout(state.saveTimer);state.saveTimer=null;try{await writeStore({schema:2,docs:deepCopy(state.docs),docId:state.docId});$id('save-label').textContent='已保存';}catch(err){console.error(err);$id('save-label').textContent='未保存';toast('存储空间不足，请及时导出 JSON 备份');}}
  function toast(message){const el=$id('toast');el.textContent=message;el.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove('show'),2900);}
  function formatDate(timestamp){const d=new Date(timestamp);return `${d.getMonth()+1}月${d.getDate()}日 · ${d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})}`;}


  // v1.1: every node is an on-canvas document. Existing maps remain editable.
  const BLOCK_KINDS = new Set(['paragraph','heading','quote','list','image']);
  function cleanInline(html){
    const root=document.createElement('div');root.innerHTML=String(html||'');
    const walk=node=>{
      if(node.nodeType===3)return esc(node.nodeValue);
      if(node.nodeType!==1)return '';
      const tag=node.tagName.toLowerCase();
      if(tag==='br')return '<br>';
      const inner=[...node.childNodes].map(walk).join('');
      const mapped={b:'strong',strong:'strong',i:'em',em:'em',u:'u'}[tag];
      if(mapped)return '<'+mapped+'>'+inner+'</'+mapped+'>';
      if(['div','p','li'].includes(tag))return inner+'<br>';
      return inner;
    };
    return [...root.childNodes].map(walk).join('').replace(/(<br>){3,}/g,'<br><br>').slice(0,36000);
  }
  const plainHtml = html => {const div=document.createElement('div');div.innerHTML=cleanInline(html).replace(/<br>/g,'\n');return div.textContent||'';};
  function makeBlock(kind='paragraph',text=''){
    return {id:uid(),type:BLOCK_KINDS.has(kind)?kind:'paragraph',html:esc(text)};
  }
  function ensureBlocks(n){
    if(!Array.isArray(n.blocks)){
      n.blocks=[];
      if(n.note)n.blocks.push(makeBlock('paragraph',n.note));
      (n.images||[]).forEach(im=>{if(im?.data)n.blocks.push({id:im.id||uid(),type:'image',data:im.data,name:im.name||'图片',caption:'',size:'full'});});
    }
    n.blocks=n.blocks.filter(b=>b&&typeof b==='object'&&BLOCK_KINDS.has(b.type)).slice(0,120);
    n.blocks.forEach(b=>{if(!b.id)b.id=uid();if(b.type==='image')b.size=b.size==='half'?'half':'full';else b.html=cleanInline(b.html||'');});
    if(typeof n.bodyCollapsed!=='boolean')n.bodyCollapsed=false;
    return n.blocks;
  }
  function syncLegacy(n){
    n.note=ensureBlocks(n).filter(b=>b.type!=='image').map(b=>plainHtml(b.html)).join('\n').slice(0,12000);
    n.images=n.blocks.filter(b=>b.type==='image').map(b=>({id:b.id,data:b.data,name:b.name||'图片'}));
  }
  function measureNodeCards({reflow=true}={}){
    let changes=false,larger=[];
    for(const el of $$('#nodes-layer>.node[data-node]')){
      const n=findNode(el.dataset.node);if(!n)continue;
      const h=el.offsetHeight;
      if(h>0&&Math.abs(h-(n._measuredHeight||0))>2){const before=n._measuredHeight||nodeSize(n).h;n._measuredHeight=h;if(h>before+7)larger.push(n);changes=true;}
    }
    if(changes&&reflow&&larger.length){
      const nodes=visibleNodes();
      for(const grew of larger){
        const gw=nodeSize(grew);
        nodes.filter(n=>n.id!==grew.id&&n.x<grew.x+gw.w+25&&n.x+nodeSize(n).w>grew.x-25&&n.y>=grew.y)
          .sort((a,b)=>a.y-b.y).forEach(n=>{if(n.y<grew.y+gw.h+32){n.y=grew.y+gw.h+32;const el=$(`.node[data-node="${CSS.escape(n.id)}"]`);if(el)el.style.top=n.y+'px';}});
      }
      schedulePersist();
    }
    if(changes)renderEdges();
  }
  function observeCards(){
    state.metricsObserver?.disconnect();
    const cards=$$('#nodes-layer>.node');
    if(typeof ResizeObserver!=='undefined'){
      state.metricsObserver=new ResizeObserver(()=>requestAnimationFrame(()=>measureNodeCards()));
      cards.forEach(el=>state.metricsObserver.observe(el));
    }
    requestAnimationFrame(()=>measureNodeCards({reflow:false}));
  }
  function renderBlock(b,n){
    if(b.type==='image')return `<div class="article-block image-block" data-block="${esc(b.id)}"><img class="article-image ${b.size==='half'?'half':''}" data-view-block="${esc(b.id)}" src="${esc(b.data)}" alt="${esc(b.name||'插入图片')}" draggable="false"/><div class="image-caption" contenteditable="true" data-caption="${esc(b.id)}" role="textbox" aria-label="图片说明" data-placeholder="添加图片说明">${esc(b.caption||'')}</div><div class="block-controls"><button data-img-size="${esc(b.id)}" title="切换图片宽度">${b.size==='half'?'放大':'半宽'}</button><button data-move="${esc(b.id)}" data-dir="-1" aria-label="上移图片">↑</button><button data-move="${esc(b.id)}" data-dir="1" aria-label="下移图片">↓</button><button data-remove-block="${esc(b.id)}" aria-label="删除图片">×</button></div></div>`;
    const cls=b.type==='heading'?'heading':b.type==='quote'?'quote':b.type==='list'?'list':'paragraph';
    return `<div class="article-block text-block ${cls}" data-block="${esc(b.id)}"><div class="rich-text" role="textbox" aria-multiline="true" aria-label="${cls==='heading'?'小标题':'正文'}" contenteditable="true" data-block-input="${esc(b.id)}" data-placeholder="${cls==='heading'?'输入小标题…':cls==='quote'?'输入引用…':'写下你的想法…'}" spellcheck="true">${cleanInline(b.html||'')}</div><div class="block-controls"><button data-block-kind="${esc(b.id)}" aria-label="切换段落格式">${cls==='paragraph'?'正文':cls==='heading'?'标题':cls==='quote'?'引用':'清单'}⌄</button><button data-rich-format="bold" aria-label="加粗选中文字"><b>B</b></button><button data-rich-format="italic" aria-label="斜体选中文字"><i>I</i></button><button data-move="${esc(b.id)}" data-dir="-1" title="上移内容">↑</button><button data-move="${esc(b.id)}" data-dir="1" title="下移内容">↓</button><button data-remove-block="${esc(b.id)}" title="删除内容">×</button></div></div>`;
  }
  function inlineSelection(nodeId){
    state.selectedId=nodeId;
    $$('#nodes-layer>.node').forEach(el=>el.classList.toggle('selected',el.dataset.node===nodeId));
    updateHistoryButtons();
  }
  function focusEditable(nodeId,blockId=null){
    const n=findNode(nodeId);if(!n)return;
    inlineSelection(nodeId);
    const target=blockId?$(`[data-block-input="${CSS.escape(blockId)}"]`):$(`.node[data-node="${CSS.escape(nodeId)}"] .node-title`);
    focusNode(n,{reading:true});
    if(target){target.focus({preventScroll:true});const sel=window.getSelection();const range=document.createRange();range.selectNodeContents(target);range.collapse(false);sel.removeAllRanges();sel.addRange(range);}
  }
  function insertBlock(kind='paragraph',afterId=null){
    const node=selectedNode()||roots()[0];if(!node)return;
    const block=makeBlock(kind),id=node.id;
    mutate(()=>{const blocks=ensureBlocks(node);const at=afterId?blocks.findIndex(b=>b.id===afterId):-1;blocks.splice(at>=0?at+1:blocks.length,0,block);node.bodyCollapsed=false;syncLegacy(node);});
    requestAnimationFrame(()=>focusEditable(id,block.id));
  }
  function actionMenu(nodeId){
    const n=findNode(nodeId);if(!n)return;
    inlineSelection(n.id);
    modal(`<div class="modal-eyebrow">CONTENT BLOCK</div><h3>在节点里继续写</h3><p>所有内容都会直接显示在当前画布，不进入新页面。</p><div class="modal-option-list"><button class="modal-choice" data-insert="paragraph">段落 / 正文</button><button class="modal-choice" data-insert="heading">小标题</button><button class="modal-choice" data-insert="quote">引用</button><button class="modal-choice" data-insert="list">清单</button><button class="modal-choice" data-insert="image">从相册插入图片</button></div><div class="modal-buttons"><button id="modal-cancel">关闭</button></div>`);
    $id('modal-cancel').onclick=closeModal;
    $('#modal-root .modal-option-list').onclick=e=>{const b=e.target.closest('[data-insert]');if(!b)return;const type=b.dataset.insert;closeModal();if(type==='image')requestImages(n.id);else insertBlock(type);};
  }
  function requestImages(id){
    state.pendingImageNode=id||state.selectedId||roots()[0]?.id;
    const input=$id('image-input');input.value='';input.click();
  }
  function toggleBody(id){const n=findNode(id);if(n)mutate(()=>{n.bodyCollapsed=!n.bodyCollapsed;});}
  function moveBlock(id,dir){const n=selectedNode();if(!n)return;mutate(()=>{const blocks=ensureBlocks(n);const idx=blocks.findIndex(b=>b.id===id),next=idx+dir;if(idx<0||next<0||next>=blocks.length)return;[blocks[idx],blocks[next]]=[blocks[next],blocks[idx]];syncLegacy(n);});}
  function removeBlock(id){const n=selectedNode();if(!n)return;mutate(()=>{n.blocks=ensureBlocks(n).filter(b=>b.id!==id);syncLegacy(n);});}
  function cycleKind(id){const n=selectedNode();if(!n)return;mutate(()=>{const b=ensureBlocks(n).find(b=>b.id===id);if(b&&b.type!=='image'){const kinds=['paragraph','heading','quote','list'];b.type=kinds[(kinds.indexOf(b.type)+1)%kinds.length];}});}
  function toggleImageSize(id){const n=selectedNode();if(!n)return;mutate(()=>{const b=ensureBlocks(n).find(b=>b.id===id);if(b&&b.type==='image')b.size=b.size==='half'?'full':'half';});}
  function setRichText(el){
    const card=el.closest('.node');const n=findNode(card?.dataset.node);if(!n)return;
    const blockId=el.dataset.blockInput,captionId=el.dataset.caption;
    if(el.classList.contains('node-title'))n.title=(el.textContent||'').trim().slice(0,120);
    else if(blockId){const b=ensureBlocks(n).find(b=>b.id===blockId);if(b)b.html=cleanInline(el.innerHTML);}
    else if(captionId){const b=ensureBlocks(n).find(b=>b.id===captionId);if(b)b.caption=(el.textContent||'').slice(0,400);}
    syncLegacy(n);currentDoc().updatedAt=now();schedulePersist();
  }
  function keepRichUndo(el){const n=selectedNode();if(n)state.editBefore.set(el,snap());}
  function commitRichUndo(el){const previous=state.editBefore.get(el);if(previous)pushPast(previous);state.editBefore.delete(el);renderDocList();}

  function renderDocList(){const doc=currentDoc();$id('doc-count').textContent=state.docs.length.toString().padStart(2,'0');$id('doc-list').innerHTML=state.docs.map(d=>`<div class="doc-item ${d.id===state.docId?'active':''}" data-doc="${esc(d.id)}" role="button" tabindex="0"><div class="doc-icon">${icon('git-branch',16)}</div><div class="doc-info"><span class="doc-title">${esc(d.title)}</span><span class="doc-subtitle">${d.nodes.length} 个节点 · ${formatDate(d.updatedAt)}</span></div><button class="doc-more" data-doc-menu="${esc(d.id)}" aria-label="导图选项">${icon('ellipsis',16)}</button></div>`).join('');$id('header-title').textContent=doc?.title||'';$id('canvas-title').textContent=doc?.title||'';$id('node-count').textContent=`${String(doc?.nodes.length||0).padStart(2,'0')} 个节点`;}
  function getEdgesMarkup(nodes){const visible=new Map(nodes.map(n=>[n.id,n]));return nodes.filter(n=>n.parentId&&visible.has(n.parentId)).map(n=>{const p=visible.get(n.parentId),pw=nodeSize(p).w,cw=nodeSize(n).w;const right=(n.x+cw/2)>p.x+pw/2;const x1=right?p.x+pw:p.x;const y1=p.y+nodeSize(p).h/2;const x2=right?n.x:n.x+cw;const y2=n.y+nodeSize(n).h/2;const d=Math.max(65,Math.abs(x2-x1)*.53);const mid1=right?x1+d:x1-d;const mid2=right?x2-d:x2+d;const c=getColor(n.color);return `<path data-edge="${esc(n.id)}" class="edge-line" d="M${x1} ${y1}C${mid1} ${y1} ${mid2} ${y2} ${x2} ${y2}" stroke="${c.line}" stroke-width="2.1" fill="none" stroke-linecap="round"/><circle data-edge-dot="${esc(n.id)}" class="edge-dot" cx="${x2}" cy="${y2}" r="4.2" fill="${c.value}" opacity=".94"/>`;}).join('');}
  function renderEdges({animate=false}={}){const svg=$id('connectors');if(!svg)return;const previousIds=new Set([...svg.querySelectorAll('[data-edge]')].map(el=>el.dataset.edge));svg.innerHTML=getEdgesMarkup(visibleNodes());globalThis.ZhixuConnect?.enhanceEdges(svg,visibleNodes());if(animate)globalThis.MindMotion?.animateEdges(svg,previousIds);}

  function renderCanvas(){
    const doc=currentDoc();if(!doc)return;
    const visible=visibleNodes();
    const html=visible.map(n=>{
      const root=n.id===doc.nodes[0]?.id,count=childrenOf(n.id).length,left=n.parentId&&n.x<findNode(n.parentId)?.x;
      const blocks=ensureBlocks(n);
      const label=root?'CENTRAL IDEA':'YOUR NOTE';
      return `<section class="node document-node ${root?'root':''} ${n.id===state.selectedId?'selected':''} ${left?'has-left':''}" data-node="${esc(n.id)}" style="left:${n.x}px;top:${n.y}px;--node-accent:${getColor(n.color).value}" aria-label="${esc(n.title||'未命名节点')}">
        <div class="node-handle" data-drag-handle="${esc(n.id)}" title="按住这里拖动节点"><span class="node-marker"></span><span class="node-kicker">${label}</span><span class="handle-grip">⠿</span></div>
        <h2 class="node-title" role="textbox" aria-label="节点标题" data-title-input="true" contenteditable="true" spellcheck="true" data-placeholder="填写标题">${esc(n.title||'')}</h2>
        <div class="node-article ${n.bodyCollapsed?'body-folded':''}" data-article="${esc(n.id)}">${blocks.map(b=>renderBlock(b,n)).join('')}</div>
        <div class="node-actions"><button class="body-toggle" data-body-collapse="${esc(n.id)}" aria-label="${n.bodyCollapsed?'展开':'折叠'}正文">${n.bodyCollapsed?'展开正文':'收起正文'} <span>${n.bodyCollapsed?'▾':'▴'}</span></button><button data-add-block="${esc(n.id)}" class="add-inline" title="添加内容">＋ 添加内容</button><button data-add-photo="${esc(n.id)}" class="add-inline add-photo" title="插入图片">${icon('image',13)} 图片</button><button class="link-origin" data-link-start="${esc(n.id)}" title="点按选择另一节点，或按住拖动连接" aria-label="从当前节点连接到其他节点">${icon('git-branch',13)} 连线</button></div>
        ${count?`<button class="collapse-node" data-collapse="${esc(n.id)}" aria-label="${n.collapsed?'展开':'收起'}子分支">${n.collapsed?'+':'−'}</button>`:''}
      </section>`;
    }).join('');
    const layer=$id('nodes-layer');
    state.metricsObserver?.disconnect();
    if(globalThis.MindMotion)globalThis.MindMotion.patchNodes(layer,html,visible,doc.id);else layer.innerHTML=html;
    observeCards();renderEdges({animate:true});updateCanvasTransform();
  }

  function updateCanvasTransform(){$id('canvas-content').style.transform=`translate(${state.panX}px,${state.panY}px) scale(${state.scale})`;$id('zoom-label').textContent=`${Math.round(state.scale*100)}%`;}
  function stopViewportMotion(){if(state.viewportAnimation){cancelAnimationFrame(state.viewportAnimation);state.viewportAnimation=null;}}
  function setViewport(x,y,scale){state.panX=x;state.panY=y;state.scale=scale;updateCanvasTransform();}
  function moveViewport(x,y,scale,{animate=true,duration=520}={}){
    stopViewportMotion();
    const reduced=globalThis.MindMotion?.reduced?.() ?? window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if(!animate||reduced||typeof requestAnimationFrame!=='function'){setViewport(x,y,scale);return;}
    const from={x:state.panX,y:state.panY,scale:state.scale};
    if(Math.abs(from.x-x)+Math.abs(from.y-y)+Math.abs(from.scale-scale)<.2)return;
    let started=null;
    const frame=timestamp=>{
      if(started===null)started=timestamp;
      const t=clamp((timestamp-started)/duration,0,1);
      const v=1-Math.pow(1-t,4);
      setViewport(from.x+(x-from.x)*v,from.y+(y-from.y)*v,from.scale+(scale-from.scale)*v);
      if(t<1)state.viewportAnimation=requestAnimationFrame(frame);
      else state.viewportAnimation=null;
    };
    state.viewportAnimation=requestAnimationFrame(frame);
  }
  function fitView({animate=false}={}){const board=$id('board');if(!board||!board.clientWidth)return;const nodes=visibleNodes();if(!nodes.length)return;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;nodes.forEach(n=>{const{w,h}=nodeSize(n);minX=Math.min(minX,n.x);minY=Math.min(minY,n.y);maxX=Math.max(maxX,n.x+w);maxY=Math.max(maxY,n.y+h);});let reservedTop=board.clientWidth<781?78:128;let reservedBottom=board.clientWidth<781?152:110;let reservedX=board.clientWidth<781?34:145;const availableW=Math.max(160,board.clientWidth-reservedX);const availableH=Math.max(160,board.clientHeight-reservedTop-reservedBottom);const scale=clamp(Math.min(1.12,availableW/(maxX-minX+40),availableH/(maxY-minY+45)),.3,1.35);const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;const panX=board.clientWidth/2-centerX*scale;const panY=reservedTop+availableH/2-centerY*scale;moveViewport(panX,panY,scale,{animate});}
  function focusNode(n,{reading=false}={}){const board=$id('board');if(!n||!board)return;const {w,h}=nodeSize(n);const mobile=board.clientWidth<781;const scale=reading&&mobile?Math.min(1.05,(board.clientWidth-28)/w):state.scale;const yTarget=reading?100:Math.max(100,(board.clientHeight-h*scale)/2);moveViewport(board.clientWidth/2-(n.x+w/2)*scale,yTarget-n.y*scale,scale,{animate:true,duration:390});}
  function initialView(){const board=$id('board'),root=roots()[0];if(board?.clientWidth<781&&root){const scale=Math.min(1,(board.clientWidth-36)/ROOT_W);moveViewport(board.clientWidth/2-(root.x+ROOT_W/2)*scale,(board.clientHeight-32)*.42-(root.y+nodeSize(root).h/2)*scale,scale,{animate:true,duration:450});}else fitView({animate:true});}
  function renderAll(){renderDocList();renderCanvas();updateHistoryButtons();if(state.showInspector)renderInspector();}
  function showSidebar(open){$id('sidebar').classList.toggle('open',open);$id('sidebar-scrim').classList.toggle('show',open);}
  function openInspector(){if(!selectedNode())return;state.showInspector=true;state.lastTapAt=0;state.inspectorOpenedAt=Date.now();$id('inspector').classList.add('open');$id('inspector-scrim').classList.add('show');renderInspector();}
  function closeInspector(){state.showInspector=false;$id('inspector').classList.remove('open');$id('inspector-scrim').classList.remove('show');}
  function selectNode(id,{open=false}={}){inlineSelection(id);if(open)focusEditable(id);}
  function renderInspector(){const n=selectedNode();if(!n)return;$id('node-title-input').value=n.title||'';$id('node-note-input').value=n.note||'';$id('color-palette').innerHTML=COLORS.map(c=>`<button class="swatch ${n.color===c.id?'active':''}" title="${c.label}" aria-label="${c.label}" data-color="${c.id}" style="background:${c.value}">${n.color===c.id?icon('check',14):''}</button>`).join('');$id('image-list').innerHTML=(n.images||[]).map(im=>`<div class="image-wrap"><img src="${esc(im.data)}" alt="${esc(im.name||'图片')}" data-view-image="${esc(im.id)}"/><button class="remove-image" data-remove-image="${esc(im.id)}" aria-label="移除图片">×</button></div>`).join('');$id('editor-sibling-btn').disabled=!n.parentId;$id('delete-node-btn').disabled=n.id===currentDoc()?.nodes[0]?.id;}
  function updateNodeText(id){const n=findNode(id),el=$(`.node[data-node="${CSS.escape(id)}"]`);if(n&&el){const t=$('.node-title',el);if(t&&document.activeElement!==t)t.textContent=n.title;}if(currentDoc()){$id('header-title').textContent=currentDoc().title;$id('canvas-title').textContent=currentDoc().title;}}

  function possibleCollision(x,y,ignoreId){return currentDoc().nodes.some(n=>n.id!==ignoreId&& x<n.x+nodeSize(n).w+25 && x+NODE_W+25>n.x && y<n.y+nodeSize(n).h+22 && y+NODE_H+22>n.y);}
  function createChild(parentId){const p=findNode(parentId);if(!p)return;const children=childrenOf(p.id);const root=p.id===currentDoc().nodes[0]?.id;let right=root ? children.length%2===0 : p.x>=roots()[0].x;let x=right?p.x+nodeSize(p).w+134:p.x-NODE_W-130;let y=p.y+(root?(children.length?((children.length+1)>>1)*116*(children.length%2?-1:1): -95):(children.length?children.length*112-40:-10));let attempts=0;while(possibleCollision(x,y,null)&&attempts++<60)y+=NODE_H+28;
    const n={id:uid(),parentId:p.id,x,y,title:'新节点',note:'',blocks:[makeBlock('paragraph')],bodyCollapsed:false,color:p.color||'sage',images:[],collapsed:false};
    mutate(()=>{p.collapsed=false;currentDoc().nodes.push(n);state.selectedId=n.id;});closeInspector();requestAnimationFrame(()=>focusEditable(n.id));toast('已添加子节点 · 直接输入标题');}
  function addSibling(){const n=selectedNode();if(!n||!n.parentId)return toast('中心主题没有同级节点');createChild(n.parentId);}
  function addChild(){const n=selectedNode()||roots()[0];if(n)createChild(n.id);}
  function deleteSelected(){const n=selectedNode();if(!n||n.id===currentDoc()?.nodes[0]?.id)return;const descendants=new Set([n.id]);let added=true;while(added){added=false;currentDoc().nodes.forEach(child=>{if(child.parentId&&descendants.has(child.parentId)&&!descendants.has(child.id)){descendants.add(child.id);added=true;}});}showConfirm('删除这个节点？',`将同时移除该节点及其 ${descendants.size-1} 个子节点。此操作可使用“撤销”恢复。`,'删除',()=>{const parent=n.parentId;mutate(()=>{currentDoc().nodes=currentDoc().nodes.filter(child=>!descendants.has(child.id));state.selectedId=parent;});closeInspector();toast('节点已删除，可撤销');});}
  function duplicateDocument(docId){const original=state.docs.find(d=>d.id===docId);if(!original)return;const clone=deepCopy(original);clone.id=uid();clone.title=`${original.title} · 副本`;clone.createdAt=clone.updatedAt=now();state.docs.unshift(clone);switchDoc(clone.id);schedulePersist();toast('已复制导图');}
  function switchDoc(id){if(!state.docs.some(d=>d.id===id))return;state.docId=id;state.selectedId=currentDoc()?.nodes.find(n=>!n.parentId)?.id||null;state.undo=[];state.redo=[];closeInspector();showSidebar(false);renderAll();requestAnimationFrame(initialView);schedulePersist();}
  function createDocument(title){const doc=makeDoc(title.trim()||'未命名导图');state.docs.unshift(doc);switchDoc(doc.id);toast('新导图已创建');}

  function modal(html){$id('modal-root').innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;const bg=$('.modal-backdrop');bg.addEventListener('pointerdown',e=>{if(e.target===bg)closeModal();});}
  function closeModal(){$id('modal-root').innerHTML='';}
  function promptModal({eyebrow='MINDSPACE',title,description='',value='',placeholder='',confirm='确定',onConfirm}){modal(`<div class="modal-eyebrow">${eyebrow}</div><h3>${esc(title)}</h3><p>${esc(description)}</p><input id="modal-input" class="modal-field" maxlength="65" value="${esc(value)}" placeholder="${esc(placeholder)}"/><div class="modal-buttons"><button id="modal-cancel">取消</button><button class="primary" id="modal-ok">${esc(confirm)}</button></div>`);const input=$id('modal-input');input.focus();input.select();$id('modal-cancel').onclick=closeModal;const complete=()=>{const val=input.value.trim();if(!val){input.focus();return;}closeModal();onConfirm(val);};$id('modal-ok').onclick=complete;input.onkeydown=e=>{if(e.key==='Enter')complete();if(e.key==='Escape')closeModal();};}
  function showConfirm(title,desc,action,callback){modal(`<div class="modal-eyebrow">PLEASE CONFIRM</div><h3>${esc(title)}</h3><p>${esc(desc)}</p><div class="modal-buttons"><button id="modal-cancel">取消</button><button class="danger" id="modal-ok">${esc(action)}</button></div>`);$id('modal-cancel').onclick=closeModal;$id('modal-ok').onclick=()=>{closeModal();callback();};}
  function renameDoc(id){const d=state.docs.find(d=>d.id===id);if(!d)return;promptModal({eyebrow:'RENAME YOUR SPACE',title:'为导图重新命名',description:'给这一段思考一个专属的名字。',value:d.title,confirm:'保存名称',onConfirm:title=>{if(id===state.docId){mutate(()=>{d.title=title;});}else{d.title=title;d.updatedAt=now();renderDocList();schedulePersist();}toast('名称已更新');}});}
  function showDocMenu(id){const d=state.docs.find(doc=>doc.id===id);if(!d)return;modal(`<div class="modal-eyebrow">MAP OPTIONS</div><h3>${esc(d.title)}</h3><p>整理、复制或删除这张导图。</p><div class="modal-option-list"><button class="modal-choice" id="doc-rename"><span>重命名<span class="modal-option-sub">修改导图显示名称</span></span>${icon('edit-3')}</button><button class="modal-choice" id="doc-duplicate"><span>创建副本<span class="modal-option-sub">保留当前导图的全部内容</span></span>${icon('copy')}</button><button class="modal-choice" id="doc-delete"><span style="color:#af6965">删除导图<span class="modal-option-sub">可通过已导出的备份重新导入</span></span>${icon('trash')}</button></div><div class="modal-buttons"><button id="modal-cancel">关闭</button></div>`);$id('modal-cancel').onclick=closeModal;$id('doc-rename').onclick=()=>{closeModal();renameDoc(id);};$id('doc-duplicate').onclick=()=>{closeModal();duplicateDocument(id);};$id('doc-delete').onclick=()=>{closeModal();showConfirm('删除整张导图？',`“${d.title}”和其中 ${d.nodes.length} 个节点将从本机永久移除。建议先导出备份。`,'删除导图',()=>{state.docs=state.docs.filter(x=>x.id!==id);if(!state.docs.length)state.docs=[makeDoc('新的思维导图')];switchDoc(state.docs[0].id);toast('导图已删除');});};}

  async function compressImage(file){if(file.size>24*1024*1024)throw new Error('图片大于 24MB');const source=await readFileAsDataURL(file);return await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{const ratio=Math.min(1,1080/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*ratio));c.height=Math.max(1,Math.round(im.naturalHeight*ratio));const ctx=c.getContext('2d');if(!ctx){reject(new Error('无法处理图片'));return;}ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,c.height);try{resolve(c.toDataURL('image/jpeg',.76));}catch(e){reject(e);}};im.onerror=()=>reject(new Error('图片读取失败'));im.src=source;});}
  function readFileAsDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});}

  async function addImages(files){
    const node=findNode(state.pendingImageNode)||selectedNode()||roots()[0];state.pendingImageNode=null;
    if(!node)return;
    const selected=Array.from(files||[]).filter(f=>f&&f.type.startsWith('image/')).slice(0,12);
    if(!selected.length){toast('没有选择图片');return;}
    const fresh=[];
    for(const f of selected){
      try{const data=await compressImage(f);const meta=await new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im.naturalWidth/Math.max(1,im.naturalHeight));im.onerror=()=>resolve(1.5);im.src=data;});fresh.push({id:uid(),type:'image',data,name:f.name||'图片',caption:'',size:'full',aspect:meta});}
      catch(err){console.error('Image add failed',err);toast(`${f.name||'图片'}：${err.message}`);}
    }
    if(!fresh.length)return;
    const id=node.id;
    mutate(()=>{const n=findNode(id);if(!n)return;ensureBlocks(n).push(...fresh);n.bodyCollapsed=false;syncLegacy(n);state.selectedId=id;});
    requestAnimationFrame(()=>focusNode(findNode(id),{reading:true}));
    toast(`已插入 ${fresh.length} 张图片 · 已显示在节点内`);
  }

  function openImage(data){$id('modal-root').innerHTML=`<div class="image-lightbox"><button id="lightbox-close" aria-label="关闭图片">×</button><img alt="图片预览" src="${esc(data)}"/></div>`;$id('lightbox-close').onclick=closeModal;$('.image-lightbox').onclick=e=>{if(e.target.classList.contains('image-lightbox'))closeModal();};}
  function downloadFile(name,blob){const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),12000);}
  const safeName=str=>(str||'mindmap').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').slice(0,45);
  function exportJSON(){const data={format:'zhixu-mind',version:1,exportedAt:new Date().toISOString(),map:deepCopy(currentDoc())};downloadFile(`${safeName(currentDoc().title)}.json`,new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));toast('已导出 JSON 备份（包含图片）');}
  function svgText(str,max){const t=[...String(str||'')];return xml(t.length>max?t.slice(0,max-1).join('')+'…':t.join(''));}

  function svgOfDocument(){
    const nodes=visibleNodes();if(!nodes.length)throw new Error('导图没有可导出的节点');
    // Use actual node card dimensions instead of the old fixed thumbnail rectangle.
    const minX=Math.min(...nodes.map(n=>n.x))-85,minY=Math.min(...nodes.map(n=>n.y))-85;
    const maxX=Math.max(...nodes.map(n=>n.x+nodeSize(n).w))+85,maxY=Math.max(...nodes.map(n=>n.y+nodeSize(n).h))+85;
    const width=maxX-minX,height=maxY-minY;
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    const wrap=(str,maxWidth,font)=>{
      if(ctx)ctx.font=font;
      const rows=[];
      String(str||'').split('\n').forEach(line=>{
        if(!line){rows.push('');return;}
        let buf='';
        for(const ch of line){
          if(buf&&((ctx&&ctx.measureText(buf+ch).width>maxWidth)||(!ctx&&buf.length>23))){rows.push(buf);buf='';}
          buf+=ch;
        }
        rows.push(buf);
      });
      return rows;
    };
    const elements=nodes.map(n=>{
      const root=!n.parentId,{w,h}=nodeSize(n),foreground=root?'#edf5ef':'#304438';
      const content=[];let y=n.y+23;
      content.push(`<circle cx="${n.x+18}" cy="${y-3}" r="3.3" fill="${getColor(n.color).value}"/>`);
      content.push(`<text x="${n.x+29}" y="${y}" font-size="9" font-family="sans-serif" fill="${root?'#bdd2bf':'#82988a'}" letter-spacing="1.1">${root?'CENTRAL IDEA':'YOUR NOTE'}</text>`);
      y=n.y+60;
      for(const line of wrap(n.title||'未命名节点',w-36,`700 18px sans-serif`)){
        content.push(`<text x="${n.x+18}" y="${y}" font-size="18" font-weight="700" font-family="sans-serif" fill="${foreground}">${xml(line)}</text>`);y+=26;
      }
      y+=8;
      if(!n.bodyCollapsed){
        for(const b of ensureBlocks(n)){
          if(b.type==='image'){
            const iw=(w-36)*(b.size==='half'?.55:1);
            const aspect=clamp(Number(b.aspect)||1.5,.2,6);
            const ih=iw/aspect;
            content.push(`<image href="${xml(b.data)}" x="${n.x+18}" y="${y}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid meet"/>`);
            y+=ih+6;
            if(b.caption){content.push(`<text x="${n.x+18}" y="${y+9}" font-size="11" font-family="sans-serif" fill="${root?'#b0c7b5':'#85978a'}">${svgText(b.caption,65)}</text>`);y+=18;}
            y+=14;continue;
          }
          const size=b.type==='heading'?17:15;
          const weight=b.type==='heading'?'700':'400';
          const font=`${weight} ${size}px sans-serif`;
          const fill=b.type==='quote'?(root?'#bed5c6':'#6b8877'):foreground;
          for(const row of wrap(plainHtml(b.html),w-36-(b.type==='quote'?12:0),font)){
            if(y>n.y+h-33)break;
            content.push(`<text x="${n.x+18+(b.type==='quote'?11:0)}" y="${y}" font-size="${size}" font-weight="${weight}" font-family="sans-serif" fill="${fill}">${xml((b.type==='list'?'• ':'')+row)}</text>`);
            y+=size*1.7;
          }
          y+=13;
        }
      }
      return `<g><rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" rx="17" fill="${root?'#2b493b':'#fff'}" stroke="${root?'#456b52':'#e4eae3'}" stroke-width="1.4"/>${content.join('')}</g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="${minX} ${minY} ${width} ${height}"><defs><pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".9" fill="#e5eae5"/></pattern></defs><rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#fbfbf9"/><rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#dots)"/>${getEdgesMarkup(nodes)}${globalThis.ZhixuConnect?.exportEdges(nodes)||''}${elements}<text x="${minX+21}" y="${maxY-20}" font-size="11" font-family="sans-serif" fill="#a0b4a5">枝序 · MINDSPACE 1.2</text></svg>`;
  }

  function exportSVG(){try{downloadFile(`${safeName(currentDoc().title)}.svg`,new Blob([svgOfDocument()],{type:'image/svg+xml;charset=utf-8'}));toast('已导出 SVG 矢量图片');}catch(err){toast(err.message);}}
  async function exportPNG(){try{const svg=svgOfDocument();const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('图片生成失败，请改用 SVG 格式'));img.src=url;});const width=img.naturalWidth,height=img.naturalHeight;const outputScale=Math.min(2.5,8192/Math.max(width,height));const canvas=document.createElement('canvas');canvas.width=Math.round(width*outputScale);canvas.height=Math.round(height*outputScale);const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);canvas.toBlob(result=>{if(result){downloadFile(`${safeName(currentDoc().title)}.png`,result);toast('已导出高清 PNG 图片');}else{toast('PNG 导出失败，请使用 SVG 格式');}},'image/png');}catch(err){console.error(err);toast(err.message||'PNG 导出失败，请改用 SVG');}}
  function exportModal(){modal(`<div class="modal-eyebrow">EXPORT YOUR THOUGHTS</div><h3>把想法带走</h3><p>保留可编辑的完整备份，或将画布分享为图片。</p><div class="modal-option-list"><button class="modal-choice" id="export-json"><span>JSON 完整备份<span class="modal-option-sub">包含节点、文字、颜色和图片，可再次导入</span></span>${icon('download')}</button><button class="modal-choice" id="export-png"><span>PNG 高清图片<span class="modal-option-sub">适合分享到聊天或相册</span></span>${icon('image')}</button><button class="modal-choice" id="export-svg"><span>SVG 矢量图<span class="modal-option-sub">放大依然清晰，适合演示和排版</span></span>${icon('download')}</button></div><div class="modal-buttons"><button id="modal-cancel">关闭</button></div>`);$id('modal-cancel').onclick=closeModal;$id('export-json').onclick=()=>{closeModal();exportJSON();};$id('export-png').onclick=()=>{closeModal();exportPNG();};$id('export-svg').onclick=()=>{closeModal();exportSVG();};}
  function sanitizeImport(input){const d=input?.map||input;if(!d||!Array.isArray(d.nodes)||!d.nodes.length||d.nodes.length>3000)throw new Error('不是有效的枝序导图');const ids=new Set();const cleaned=d.nodes.map((n,i)=>{if(!n||typeof n!=='object')throw new Error('节点数据有误');const id=typeof n.id==='string'&&!ids.has(n.id)?n.id:uid();ids.add(id);return {id,parentId:typeof n.parentId==='string'?n.parentId:null,x:clamp(Number(n.x)||0,-40000,40000),y:clamp(Number(n.y)||0,-40000,40000),title:String(n.title||'未命名节点').slice(0,90),note:String(n.note||'').slice(0,12000),color:getColor(n.color).id,images:Array.isArray(n.images)?n.images.slice(0,30).filter(x=>typeof x.data==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,/i.test(x.data)&&x.data.length<4e6).map(x=>({id:uid(),name:String(x.name||'图片').slice(0,120),data:x.data})):[],blocks:Array.isArray(n.blocks)?n.blocks.slice(0,120).filter(b=>b&&BLOCK_KINDS.has(b.type)&&((b.type==='image'&&/^data:image\/(png|jpeg|webp|gif);base64,/i.test(b.data||'')&&b.data.length<4000000)||(b.type!=='image'&&String(b.html||'').length<40000))).map(b=>b.type==='image'?{id:uid(),type:'image',data:b.data,name:String(b.name||'图片').slice(0,120),caption:String(b.caption||'').slice(0,400),size:b.size==='half'?'half':'full',aspect:clamp(Number(b.aspect)||1.5,.2,6)}:{id:uid(),type:b.type,html:cleanInline(b.html)}):undefined,bodyCollapsed:!!n.bodyCollapsed,collapsed:Boolean(n.collapsed)};});const all=new Set(cleaned.map(n=>n.id));cleaned.forEach(n=>{if(n.parentId&&!all.has(n.parentId))n.parentId=null;});if(!cleaned.some(n=>!n.parentId))cleaned[0].parentId=null;return {id:uid(),title:String(d.title||'导入的导图').slice(0,65),createdAt:now(),updatedAt:now(),nodes:cleaned,links:(Array.isArray(d.links)?d.links:[]).filter(l=>l&&all.has(l.from)&&all.has(l.to)&&l.from!==l.to).slice(0,3000).map(l=>({id:uid(),from:l.from,to:l.to}))};}
  async function importJSONFile(file){if(!file)return;if(file.size>35*1024*1024){toast('文件太大，最大支持 35MB');return;}try{const input=JSON.parse(await file.text());const d=sanitizeImport(input);state.docs.unshift(d);switchDoc(d.id);toast(`导入成功，包含 ${d.nodes.length} 个节点`);}catch(err){toast(err.message||'导入失败，请选择正确的 JSON 文件');}}
  function searchModal(){modal(`<div class="modal-eyebrow">FIND AN IDEA</div><h3>寻找某个想法</h3><p>搜索当前导图的标题与详细内容。</p><input id="search-input" class="modal-field" placeholder="输入关键词…" autocomplete="off" /><div id="search-results" class="modal-option-list" style="margin-top:12px;max-height:245px;overflow:auto"></div><div class="modal-buttons"><button id="modal-cancel">关闭</button></div>`);$id('modal-cancel').onclick=closeModal;const input=$id('search-input'),out=$id('search-results');input.focus();const update=()=>{const q=input.value.trim().toLowerCase();if(!q){out.innerHTML='<div class="empty-state">输入关键词，快速定位你的节点。</div>';return;}const matches=currentDoc().nodes.filter(n=>`${n.title} ${n.note} ${(n.blocks||[]).map(b=>b.caption||'').join(' ')}`.toLowerCase().includes(q)).slice(0,15);out.innerHTML=matches.length?matches.map(n=>`<button class="modal-choice" data-search-result="${esc(n.id)}"><span>${esc(n.title)}<span class="modal-option-sub">${esc((n.note||'暂无详细内容').slice(0,48))}</span></span>${icon('arrow-right')}</button>`).join(''):'<div class="empty-state">没有找到相关节点</div>';};input.oninput=update;update();out.onclick=e=>{const item=e.target.closest('[data-search-result]');if(!item)return;const n=findNode(item.dataset.searchResult);if(n){let p=n;while(p?.parentId){p=findNode(p.parentId);if(p)p.collapsed=false;}closeModal();selectNode(n.id);focusNode(n,{reading:true});schedulePersist();}};}

  function getBoardPoint(clientX,clientY){const rect=$id('board').getBoundingClientRect();return {x:clientX-rect.left,y:clientY-rect.top};}
  function getWorldPoint(clientX,clientY){const p=getBoardPoint(clientX,clientY);return {x:(p.x-state.panX)/state.scale,y:(p.y-state.panY)/state.scale};}
  const pointerDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const pointerMiddle=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  function beginPinch(){const [a,b]=[...state.pointers.values()];if(!a||!b)return;const m=pointerMiddle(a,b),p=getWorldPoint(m.x,m.y);state.gesture={type:'pinch',distance:Math.max(pointerDistance(a,b),1),startScale:state.scale,world:p};}

  function pointerDown(event){
    if(event.button!==0&&event.pointerType==='mouse')return;
    if(event.target.closest('button,[contenteditable],.article-image,.block-controls,.float-tools,.zoom-control,.canvas-hint,.edge-hit,.link-banner,.link-edge-actions'))return;
    stopViewportMotion();
    const board=$id('board');board.setPointerCapture?.(event.pointerId);
    state.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(state.pointers.size===2){beginPinch();return;}
    if(state.pointers.size>2)return;
    const handle=event.target.closest('[data-drag-handle]');
    const card=event.target.closest('.node');
    const n=handle?findNode(handle.dataset.dragHandle):null;
    state.gesture=n?{type:'node',id:n.id,startX:event.clientX,startY:event.clientY,originX:n.x,originY:n.y,moved:false,before:snap()}:{type:'pan',startX:event.clientX,startY:event.clientY,panX:state.panX,panY:state.panY,cardId:card?.dataset.node||null};
  }

  function pointerMove(event){if(!state.pointers.has(event.pointerId))return;state.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const g=state.gesture;if(!g)return;if(state.pointers.size>=2){if(g.type!=='pinch')beginPinch();const gesture=state.gesture,[a,b]=[...state.pointers.values()];const mid=pointerMiddle(a,b),pos=getBoardPoint(mid.x,mid.y);state.scale=clamp(gesture.startScale*(pointerDistance(a,b)/gesture.distance),.25,2.5);state.panX=pos.x-gesture.world.x*state.scale;state.panY=pos.y-gesture.world.y*state.scale;updateCanvasTransform();return;}if(g.type==='pan'){state.panX=g.panX+(event.clientX-g.startX);state.panY=g.panY+(event.clientY-g.startY);updateCanvasTransform();if(Math.abs(event.clientX-g.startX)+Math.abs(event.clientY-g.startY)>4)$id('board').classList.add('grabbing');}if(g.type==='node'){const distance=Math.hypot(event.clientX-g.startX,event.clientY-g.startY);if(distance<(event.pointerType==='touch'?9:5)&&!g.moved)return;if(!g.moved&&event.pointerType==='touch')navigator.vibrate?.(8);g.moved=true;const dragged=$(`.node[data-node="${CSS.escape(g.id)}"]`);dragged?.classList.add('is-dragging');const n=findNode(g.id);if(!n)return;n.x=Math.round((g.originX+(event.clientX-g.startX)/state.scale)*2)/2;n.y=Math.round((g.originY+(event.clientY-g.startY)/state.scale)*2)/2;const el=$(`.node[data-node="${CSS.escape(g.id)}"]`);if(el){el.style.left=n.x+'px';el.style.top=n.y+'px';}renderEdges();}}
  function pointerUp(event){if(!state.pointers.has(event.pointerId))return;const g=state.gesture;state.pointers.delete(event.pointerId);$id('board').classList.remove('grabbing');if(g?.type==='pan'&&state.pointers.size===0&&g.cardId&&Math.hypot(event.clientX-g.startX,event.clientY-g.startY)<8)inlineSelection(g.cardId);if(g?.type==='node'&&state.pointers.size===0){$(`.node[data-node="${CSS.escape(g.id)}"]`)?.classList.remove('is-dragging');if(g.moved){const d=currentDoc();d.updatedAt=now();pushPast(g.before);renderAll();schedulePersist();}else {const nowTap=Date.now();const repeated=state.lastTapId===g.id&&nowTap-state.lastTapAt<430;state.lastTapId=g.id;state.lastTapAt=nowTap;selectNode(g.id);if(repeated){navigator.vibrate?.(7);focusEditable(g.id);}}}if(state.pointers.size===1){const p=[...state.pointers.values()][0];state.gesture={type:'pan',startX:p.x,startY:p.y,panX:state.panX,panY:state.panY};}else if(state.pointers.size===0)state.gesture=null;}
  function adjustZoom(multiplier){const board=$id('board');const mid={x:board.clientWidth/2,y:board.clientHeight/2};const oldScale=state.scale;const scale=clamp(state.scale*multiplier,.25,2.5);const panX=mid.x-(mid.x-state.panX)*(scale/oldScale),panY=mid.y-(mid.y-state.panY)*(scale/oldScale);moveViewport(panX,panY,scale,{animate:true,duration:410});}

  let installPrompt=null;
  function isInstalled(){return !!(window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone);}
  function updateInstallButton(){const btn=$id('install-app-btn');if(!btn)return;btn.classList.toggle('is-installed',isInstalled());const caption=$('.install-caption',btn);if(caption)caption.textContent=isInstalled()?'已添加到主屏幕':installPrompt?'立即安装':'添加到主屏幕';}
  async function installApp(){
    if(isInstalled()){toast('枝序已在主屏幕，可直接从桌面打开');return;}
    if(installPrompt){const prompt=installPrompt;installPrompt=null;prompt.prompt();try{await prompt.userChoice;}catch{}updateInstallButton();return;}
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);
    const text=ios?'请使用 Safari 打开本网站，点击底部「分享」图标，选择「添加到主屏幕」，然后点击「添加」。':'在浏览器菜单中选择「安装应用」或「添加到主屏幕」。如果还没有出现，请刷新一次再试。';
    modal(`<div class="modal-eyebrow">INSTALL MINDSPACE</div><h3>把枝序放到手机桌面</h3><p>${text}<br>安装后可像独立 App 一样打开，首次联网使用后支持离线访问。所有导图仍只保存在当前设备。</p><div class="modal-buttons"><button id="modal-cancel">知道了</button><button id="modal-ok" class="primary">查看安装页面</button></div>`);
    $id('modal-cancel').onclick=closeModal;
    $id('modal-ok').onclick=()=>{window.location.href='./download.html';};
  }
  function adaptMobileViewport(){
    const vv=window.visualViewport;
    const height=vv?.height||window.innerHeight;
    document.documentElement.style.setProperty('--viewport-height',`${Math.round(height)}px`);
    const keyboardVisible=window.innerWidth<781 && window.innerHeight-height>115;
    document.body.classList.toggle('keyboard-open',keyboardVisible);
  }
  function wireEvents(){
    adaptMobileViewport();
    window.visualViewport?.addEventListener('resize',adaptMobileViewport);
    window.visualViewport?.addEventListener('scroll',adaptMobileViewport);
    window.addEventListener('orientationchange',()=>{adaptMobileViewport();requestAnimationFrame(()=>fitView({animate:true}));});

    $$('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));
    $id('menu-btn').onclick=()=>showSidebar(true);$id('close-sidebar').onclick=()=>showSidebar(false);$id('sidebar-scrim').onclick=()=>showSidebar(false);
    $id('install-app-btn').onclick=installApp;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;updateInstallButton();});window.addEventListener('appinstalled',()=>{installPrompt=null;updateInstallButton();toast('枝序已安装到设备');});updateInstallButton();
    $id('new-map-btn').onclick=()=>promptModal({eyebrow:'A NEW BEGINNING',title:'开始一个新的想法',description:'从一个中心主题开始，任由思路自然延伸。',placeholder:'例如：我的下一段旅程',value:'未命名导图',confirm:'创建导图',onConfirm:createDocument});
    $id('doc-list').onclick=e=>{const more=e.target.closest('[data-doc-menu]');if(more){showDocMenu(more.dataset.docMenu);return;}const item=e.target.closest('[data-doc]');if(item)switchDoc(item.dataset.doc);};
    $id('doc-list').onkeydown=e=>{if(e.key==='Enter'){const item=e.target.closest('[data-doc]');if(item)switchDoc(item.dataset.doc);}};
    $id('rename-btn').onclick=()=>renameDoc(state.docId);
    $id('undo-btn').onclick=undo;$id('redo-btn').onclick=redo;$id('search-btn').onclick=searchModal;$id('export-btn').onclick=exportModal;
    $id('add-child-btn').onclick=addChild;$id('add-sibling-btn').onclick=addSibling;$id('edit-selected-btn').onclick=()=>{const n=selectedNode();if(n)focusEditable(n.id);};$id('add-image-btn').onclick=()=>requestImages();
    $id('zoom-in-btn').onclick=()=>adjustZoom(1.22);$id('zoom-out-btn').onclick=()=>adjustZoom(1/1.22);$id('fit-btn').onclick=()=>fitView();
    $id('close-inspector').onclick=closeInspector;$id('inspector-scrim').onclick=()=>{if(Date.now()-(state.inspectorOpenedAt||0)>350)closeInspector();};
    $id('editor-child-btn').onclick=addChild;$id('editor-sibling-btn').onclick=addSibling;$id('delete-node-btn').onclick=deleteSelected;$id('editor-image-btn').onclick=()=>requestImages();
    $id('color-palette').onclick=e=>{const sw=e.target.closest('[data-color]');if(!sw)return;const n=selectedNode();if(!n)return;mutate(()=>{n.color=sw.dataset.color;});};
    $id('image-list').onclick=e=>{const remove=e.target.closest('[data-remove-image]'),view=e.target.closest('[data-view-image]');if(remove){const n=selectedNode(),id=remove.dataset.removeImage;mutate(()=>{n.images=n.images.filter(im=>im.id!==id);});return;}if(view){const im=selectedNode()?.images.find(im=>im.id===view.dataset.viewImage);if(im)openImage(im.data);}};
    ['node-title-input','node-note-input'].forEach(id=>{const field=$id(id),key=id==='node-title-input'?'title':'note';field.addEventListener('focus',()=>{state.textSnapshots.set(id,{nodeId:state.selectedId,before:snap()});});field.addEventListener('input',()=>{const n=selectedNode();if(!n)return;n[key]=field.value;currentDoc().updatedAt=now();updateNodeText(n.id);schedulePersist();});field.addEventListener('blur',()=>{const previous=state.textSnapshots.get(id);state.textSnapshots.delete(id);if(previous?.nodeId===state.selectedId){pushPast(previous.before);renderDocList();}});});
    $id('image-input').onchange=async e=>{const files=Array.from(e.target.files||[]);e.target.value='';if(files.length)await addImages(files);};
    $id('import-btn').onclick=()=>$id('import-input').click();$id('import-input').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(file)await importJSONFile(file);};

    $id('nodes-layer').addEventListener('pointerdown',e=>{
      if(e.target.closest('[data-rich-format]'))e.preventDefault(); // preserve the text selection
    });
    $id('nodes-layer').addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      e.stopPropagation();
      const card=b.closest('.node');if(card)inlineSelection(card.dataset.node);
      if(b.dataset.collapse){const n=findNode(b.dataset.collapse);if(n)mutate(()=>{n.collapsed=!n.collapsed;});}
      else if(b.dataset.bodyCollapse)toggleBody(b.dataset.bodyCollapse);
      else if(b.dataset.addBlock)actionMenu(b.dataset.addBlock);
      else if(b.dataset.addPhoto)requestImages(b.dataset.addPhoto);
      else if(b.dataset.move)moveBlock(b.dataset.move,Number(b.dataset.dir));
      else if(b.dataset.removeBlock)removeBlock(b.dataset.removeBlock);
      else if(b.dataset.blockKind)cycleKind(b.dataset.blockKind);
      else if(b.dataset.imgSize)toggleImageSize(b.dataset.imgSize);
      else if(b.dataset.richFormat){document.execCommand(b.dataset.richFormat);const input=card?.querySelector('[contenteditable]:focus')||card?.querySelector('.rich-text');if(input)setRichText(input);}
    });
    $id('nodes-layer').addEventListener('focusin',e=>{
      const input=e.target.closest('[contenteditable]');if(!input)return;
      const card=input.closest('.node');if(!card)return;
      inlineSelection(card.dataset.node);keepRichUndo(input);
      if(state.scale<.72)focusNode(findNode(card.dataset.node),{reading:true});
    });
    $id('nodes-layer').addEventListener('input',e=>{
      const input=e.target.closest('[contenteditable]');if(!input)return;
      setRichText(input);
    });
    $id('nodes-layer').addEventListener('focusout',e=>{const input=e.target.closest('[contenteditable]');if(input)commitRichUndo(input);});
    $id('nodes-layer').addEventListener('paste',e=>{
      const input=e.target.closest('[contenteditable]');if(!input)return;
      const files=Array.from(e.clipboardData?.files||[]).filter(f=>f.type.startsWith('image/'));
      if(files.length){e.preventDefault();state.pendingImageNode=input.closest('.node')?.dataset.node;addImages(files);return;}
      const text=e.clipboardData?.getData('text/plain');if(text!=null){e.preventDefault();document.execCommand('insertText',false,text);}
    });
    $id('nodes-layer').addEventListener('keydown',e=>{
      const input=e.target.closest('[contenteditable]');if(!input)return;
      if(e.key==='Enter'&&input.classList.contains('node-title')){e.preventDefault();const n=findNode(input.closest('.node').dataset.node);if(n){let b=ensureBlocks(n).find(b=>b.type!=='image');if(!b){insertBlock('paragraph');return;}focusEditable(n.id,b.id);}}
      if((e.ctrlKey||e.metaKey)&&['b','i','u'].includes(e.key.toLowerCase())){e.preventDefault();document.execCommand(({b:'bold',i:'italic',u:'underline'})[e.key.toLowerCase()]);setRichText(input);}
    });

    $id('board').addEventListener('pointerdown',pointerDown);$id('board').addEventListener('pointermove',pointerMove);$id('board').addEventListener('pointerup',pointerUp);$id('board').addEventListener('pointercancel',pointerUp);$id('board').addEventListener('dblclick',e=>{if(!e.target.closest('.node,button'))fitView({animate:true});});
    $id('board').addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey)return;event.preventDefault();const p=getBoardPoint(event.clientX,event.clientY);const next=clamp(state.scale*(event.deltaY<0?1.07:1/1.07),.25,2.5);state.panX=p.x-(p.x-state.panX)*next/state.scale;state.panY=p.y-(p.y-state.panY)*next/state.scale;state.scale=next;updateCanvasTransform();},{passive:false});
    window.addEventListener('keydown',event=>{const typing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;if(event.key==='Escape'){closeModal();closeInspector();showSidebar(false);return;}if(typing||$('#modal-root .modal'))return;const mod=event.ctrlKey||event.metaKey;if(mod&&event.key.toLowerCase()==='z'){event.preventDefault();if(event.shiftKey)redo();else undo();}else if(mod&&event.key.toLowerCase()==='y'){event.preventDefault();redo();}else if(mod&&event.key.toLowerCase()==='k'){event.preventDefault();searchModal();}else if(mod&&event.key.toLowerCase()==='s'){event.preventDefault();exportJSON();}else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();deleteSelected();}else if(event.key==='Tab'){event.preventDefault();if(event.shiftKey)addSibling();else addChild();}});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&state.saveTimer)persist();});window.addEventListener('beforeunload',()=>{if(state.saveTimer)persist();});
    window.addEventListener('resize',()=>{adaptMobileViewport();if(state.isReady)updateCanvasTransform();});
  }
  async function init(){wireEvents();let saved=await readStore();if(!saved?.docs||!Array.isArray(saved.docs)||!saved.docs.length){state.docs=seedDocs();state.docId=state.docs[0].id;}else{state.docs=saved.docs.filter(d=>d&&Array.isArray(d.nodes)&&d.nodes.length);state.docId=state.docs.some(d=>d.id===saved.docId)?saved.docId:state.docs[0]?.id;if(!state.docs.length){state.docs=seedDocs();state.docId=state.docs[0].id;}}
    state.selectedId=roots()[0]?.id;state.isReady=true;window.ZhixuConnect?.init({state,currentDoc,findNode,nodeSize,mutate,toast,modal,closeModal,renderEdges,focusEditable});renderAll();requestAnimationFrame(initialView);if(!saved)schedulePersist();if('serviceWorker' in navigator&&location.protocol!=='file:'){navigator.serviceWorker.register('./sw.js').catch(()=>{});}}
  init().catch(err=>{console.error('Initialization failed:',err);toast('加载出现问题，请刷新页面');});
})();
