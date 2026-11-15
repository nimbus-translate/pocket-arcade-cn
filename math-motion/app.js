/* Math Motion — dependency-free, local-first animated math storyboard. */
(function () {
  'use strict';
  const $ = (id) => typeof document === 'undefined' ? null : document.getElementById(id);
  const input = $('expression'), error = $('errorMessage');
  const syms = {'+':'+','-':'−','*':'×','/':'÷','^':'^'};
  const kinds = {'+':['ADDITION · 加法','相加'],'-':['SUBTRACTION · 减法','相减'],'*':['MULTIPLICATION · 乘法','相乘'],'/':['DIVISION · 除法','相除'],'^':['POWER · 乘方','乘方']};
  const speeds = [0.75,1,1.5,2];
  const fmt = n => {
    if (!Number.isFinite(n)) throw new Error('结果超出可计算范围');
    if (Math.abs(n)<1e-11) return '0';
    const s=Number(n.toPrecision(12)).toString();
    return s;
  };
  const safe = n => {if(!Number.isFinite(n)||Math.abs(n)>1e13)throw new Error('数字过大，请尝试较小的算式');return Number(fmt(n));};
  function normalize(source){return source.replace(/[\s，,]/g,'').replace(/[−–—]/g,'-').replace(/[×xX＊]/g,'*').replace(/[÷／]/g,'/').replace(/（/g,'(').replace(/）/g,')').replace(/＋/g,'+').replace(/＾/g,'^');}
  function parse(source){
    const str=normalize(source);
    if (!str || str.length>72) throw new Error('请输入不超过 72 个字符的算式');
    const tokens=[];let i=0;
    while(i<str.length){
      const m=str.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if(m){tokens.push({type:'num',v:Number(m[0]),raw:m[0]});i+=m[0].length;continue;}
      if('+-*/^()'.includes(str[i])){tokens.push({type:str[i]});i++;continue;}
      throw new Error('包含不支持的字符：'+str[i]);
    }
    if(tokens.length>75)throw new Error('算式太长了，请缩短后重试');
    let pos=0,uid=0;const operations=[];
    const peek=()=>tokens[pos]?.type;
    const consume=t=>{if(peek()!==t)throw new Error('请检查括号或运算符的位置');pos++;};
    function factor(){
      if(peek()==='+'){pos++;return factor();}
      if(peek()==='-'){pos++; const x=factor();if(x.type==='num')return {type:'num',value:safe(-x.value),txt:fmt(-x.value)}; return compose('-', {type:'num',value:0,txt:'0'},x);}
      if(peek()==='('){pos++;const a=expression();consume(')');return a;}
      if(peek()==='num'){const t=tokens[pos++];return {type:'num',value:safe(t.v),txt:fmt(t.v)};}
      throw new Error('算式不完整，请检查输入');
    }
    function power(){let left=factor();if(peek()==='^'){pos++;left=compose('^',left,power());}return left;}
    function term(){let left=power();while(peek()==='*'||peek()==='/'){const op=tokens[pos++].type;left=compose(op,left,power());}return left;}
    function expression(){let left=term();while(peek()==='+'||peek()==='-'){const op=tokens[pos++].type;left=compose(op,left,term());}return left;}
    function compose(op,l,r){
      let value;
      if(op==='+')value=l.value+r.value;
      if(op==='-')value=l.value-r.value;
      if(op==='*')value=l.value*r.value;
      if(op==='/'){if(r.value===0)throw new Error('不能除以 0，请换一个算式');value=l.value/r.value;}
      if(op==='^')value=Math.pow(l.value,r.value);
      const node={type:'op',id:++uid,op,left:l,right:r,value:safe(value)};
      operations.push(node);return node;
    }
    const root=expression();if(pos!==tokens.length)throw new Error('算式语法不完整，请检查运算符和括号');
    if(operations.length>10)throw new Error('最多可视化 10 次运算，请简化算式');
    return {root,operations,str,result:root.value};
  }
  function treeString(node,done){if(node.type==='num')return node.txt;if(done.has(node.id))return fmt(node.value);return '('+treeString(node.left,done)+' '+syms[node.op]+' '+treeString(node.right,done)+')';}
  function makeSteps(parsed){
    const ops=parsed.operations;
    if(!ops.length)return [{op:'=',a:parsed.result,b:0,result:parsed.result,phase:'finish',title:'一个数字，也有自己的光芒',desc:'没有运算符，这个数就是结果。',whole:fmt(parsed.result),time:2600}];
    let completed=new Set();const steps=[];
    ops.forEach((node,n)=>{
      const {op}=node,a=node.left.value,b=node.right.value,c=node.value;
      const before=treeString(parsed.root,completed);
      const noun={'+' :'合并','-':'移走','*':'排列','/':'分组','^':'重复相乘'}[op];
      const subject=fmt(a)+' '+syms[op]+' '+fmt(b);
      const isLast=n===ops.length-1;
      const common={op,a,b,result:c,subject,whole:before,opIndex:n,opTotal:ops.length};
      steps.push({...common,phase:'intro',title:'先看清这两个数',desc:'这次要计算 '+subject+'。我们先观察参与运算的两个数字。',time:1350});
      steps.push({...common,phase:'arrange',title:({'+' :'把两组数量放在眼前','-':'看看要移走多少','*':'把数量排成整齐的阵列','/':'试着平均分成几组','^':'理解连续的乘法'}[op]),desc:({'+' :'左边有 '+fmt(a)+' 个，右边有 '+fmt(b)+' 个，准备让它们汇合。','-':'从 '+fmt(a)+' 中拿走 '+fmt(b)+'，看看还剩多少。','*':'每组 '+fmt(b)+' 个，一共 '+fmt(a)+' 组。','/':'将 '+fmt(a)+' 平均分到 '+fmt(b)+' 组。','^':'把 '+fmt(a)+' 连续相乘 '+fmt(b)+' 次。'}[op]),time:1500});
      steps.push({...common,phase:'count',title:({'+' :'让光点一个个汇合','-':'一颗颗移除，观察剩余','*':'一行行地累加','/':'数一数每组的数量','^':'让乘积逐渐增长'}[op]),desc:({'+' :'从 '+fmt(a)+' 出发，逐个加上另一组的光点。','-':'从 '+fmt(a)+' 出发，逐个减去要移走的数量。','*':'不断累加 '+fmt(b)+'，直到完成 '+fmt(a)+' 组。','/':'等分完成后，每一组的数量就是商。','^':'按照乘方的规则得到最终结果。'}[op]),time:Math.min(3400,2100+Math.min(18,Math.abs(op==='*'?a:b))*90)});
      completed.add(node.id);
      steps.push({...common,phase:'finish',title:isLast?'答案，终于揭晓':'这一部分计算完成',desc:subject+' = '+fmt(c)+(isLast?'。每一颗光点，都见证了答案的诞生。':'。接下来把这个结果带入后面的计算。'),whole:treeString(parsed.root,completed),time:isLast?2900:1400});
    });
    return steps;
  }
  let current=null,steps=[],stepIndex=0,elapsed=0,playing=true,speedIndex=1,lastFrame=0,frameId=0,lastCounter='',lastStep=-1,installedPrompt=null,toastId=0;
  const phaseLabels={intro:'第 1 步 · 观察',arrange:'第 2 步 · 摆放',count:'第 3 步 · 推演',finish:'第 4 步 · 结果'};
  const escapeHtml=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const ints=(s)=>Number.isInteger(s.a)&&Number.isInteger(s.b)&&s.a>=0&&s.b>=0;
  function visualType(s){if(s.op==='+'&&ints(s)&&s.a<=28&&s.b<=28&&s.a+s.b<=52)return 'add';if(s.op==='-'&&ints(s)&&s.a<=45&&s.b<=s.a)return 'sub';if(s.op==='*'&&ints(s)&&s.a>=1&&s.b>=1&&s.a<=9&&s.b<=9&&s.a*s.b<=64)return 'multiply';if(s.op==='/'&&ints(s)&&s.b>=1&&s.a<=48&&s.a%s.b===0&&s.b<=10)return 'divide';return 'bars';}
  function orb(color,i,extra=''){return '<span class="orb '+(color==='p'?'purple-orb ':'')+extra+'" style="--delay:'+(i*18)+'ms" data-orb="'+i+'"></span>';}
  function makeScene(step){
    const type=visualType(step),{a,b,op,phase}=step;
    if(phase==='finish'&&['add','sub'].includes(type)){
      const count=Math.round(step.result);
      return '<div class="dot-group merged">'+Array.from({length:Math.min(54,count)},(_,i)=>orb(i%3===0?'p':'c',i,'completed')).join('')+'<span class="group-caption">'+fmt(step.result)+' 个 · 全部汇合</span></div>';
    }
    if(type==='add')return '<div class="dot-group left-group">'+Array.from({length:a},(_,i)=>orb('c',i)).join('')+'<span class="group-caption">'+fmt(a)+' 个</span></div><div class="dot-plus">+</div><div class="dot-group right-group">'+Array.from({length:b},(_,i)=>orb('p',i,phase==='count'?'count-off':'')).join('')+'<span class="group-caption">'+fmt(b)+' 个</span></div>';
    if(type==='sub')return '<div class="dot-group merged">'+Array.from({length:a},(_,i)=>orb(i>=a-b?'p':'c',i,phase==='count'&&i>=a-b?'deleted':'')).join('')+'<span class="group-caption">'+fmt(a)+' 个光点，移走 '+fmt(b)+' 个</span></div>';
    if(type==='multiply')return '<div class="grid-viz" style="--cols:'+b+'">'+Array.from({length:a*b},(_,i)=>orb((Math.floor(i/b)%2)?'p':'c',i,phase==='count'?'count-off':'')).join('')+'</div>';
    if(type==='divide')return '<div class="fraction-viz">'+Array.from({length:b},(_,j)=>'<div class="fraction-group '+(phase==='count'?'dimmed':'')+'" data-group="'+j+'">'+Array.from({length:a/b},(_,i)=>orb(j%2?'p':'c',i+j*5)).join('')+'</div>').join('')+'</div>';
    const max=Math.max(Math.abs(a),Math.abs(b),1);
    const pct=x=>(Math.max(5,Math.abs(x)/max*100)).toFixed(1)+'%';
    return '<div class="bar-viz"><div class="bar-item"><span class="bar-value">'+escapeHtml(fmt(a))+'</span><div class="bar-track"><div class="bar-fill" style="--bar-w:'+pct(a)+'"></div></div><span class="bar-label">第一个数</span></div><div class="bar-item"><span class="bar-value">'+escapeHtml(fmt(b))+'</span><div class="bar-track"><div class="bar-fill" style="--bar-w:'+pct(b)+'"></div></div><span class="bar-label">第二个数</span></div></div>';
  }
  function installListeners(){
    $('keypad').addEventListener('click',ev=>{const btn=ev.target.closest('button');if(!btn)return;const key=btn.dataset.key,action=btn.dataset.action;const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
      if(action==='backspace'){if(start===end&&start>0)input.value=input.value.slice(0,start-1)+input.value.slice(end);else input.value=input.value.slice(0,start)+input.value.slice(end);input.focus();input.setSelectionRange(Math.max(0,start-1),Math.max(0,start-1));}
      else if(key){input.value=input.value.slice(0,start)+key+input.value.slice(end);const cursor=start+key.length;input.focus();input.setSelectionRange(cursor,cursor);}
      error.textContent='';
    });
    $('clearBtn').addEventListener('click',()=>{input.value='';error.textContent='';input.focus();});
    $('calculateBtn').addEventListener('click',()=>start(input.value));
    input.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();start(input.value);}});
    input.addEventListener('input',()=>error.textContent='');
    document.querySelectorAll('[data-example]').forEach(el=>el.addEventListener('click',()=>{input.value=el.dataset.example;start(input.value);document.querySelector('.visual-panel').scrollIntoView({behavior:'smooth',block:'nearest'});}));
    $('prevBtn').addEventListener('click',()=>{if(stepIndex>0)setStep(stepIndex-1,false);});
    $('nextBtn').addEventListener('click',()=>{if(stepIndex<steps.length-1)setStep(stepIndex+1,false);});
    $('playBtn').addEventListener('click',()=>{if(stepIndex===steps.length-1&&elapsed>=steps[stepIndex].time){setStep(0,true);}else {playing=!playing;updateControls();}});
    $('speedBtn').addEventListener('click',()=>{speedIndex=(speedIndex+1)%speeds.length;updateControls();showToast('播放速度：'+speeds[speedIndex]+'×');});
    $('replayBtn').addEventListener('click',()=>setStep(0,true));
    $('stepDots').addEventListener('click',ev=>{const el=ev.target.closest('[data-step]');if(el)setStep(Number(el.dataset.step),false);});
    $('installBtn').addEventListener('click',async()=>{if(installedPrompt){installedPrompt.prompt();await installedPrompt.userChoice;installedPrompt=null;}else showToast('安卓 Chrome：点击浏览器菜单 →「添加到主屏幕」即可安装');});
    window.addEventListener('beforeinstallprompt',ev=>{ev.preventDefault();installedPrompt=ev;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){playing=false;updateControls();}});
  }
  function showToast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastId);toastId=setTimeout(()=>$('toast').classList.remove('visible'),2900);}
  function start(expression){
    try{current=parse(expression);steps=makeSteps(current);error.textContent='';setStep(0,true);
      $('statusBadge').innerHTML='<span></span> 动画进行中';
    }catch(ex){error.textContent=ex.message;showToast(ex.message);}
  }
  function setStep(n,play){if(!steps.length)return;stepIndex=Math.min(Math.max(0,n),steps.length-1);elapsed=0;playing=play;lastStep=-1;lastCounter='';render(0);updateControls();}
  function updateControls(){
    $('playIcon').textContent=playing?'Ⅱ':'▶';$('playBtn').setAttribute('aria-label',playing?'暂停播放':'继续播放');$('playBtn').title=playing?'暂停播放':'继续播放';
    $('prevBtn').disabled=stepIndex===0;
    $('nextBtn').disabled=stepIndex===steps.length-1;
    $('speedBtn').textContent=speeds[speedIndex].toFixed(2).replace(/0$/,'')+'×';
    if(stepIndex===steps.length-1&&!playing&&elapsed>=steps[stepIndex].time){$('playIcon').textContent='↻';$('playBtn').setAttribute('aria-label','重新播放');}
  }
  function render(progress){
    const s=steps[stepIndex];if(!s)return;
    if(stepIndex!==lastStep){
      lastStep=stepIndex;
      $('visualObjects').innerHTML=makeScene(s);
      $('activeEquation').textContent=s.subject||s.whole;
      $('operationTag').textContent=kinds[s.op]?.[0]||'SINGLE NUMBER · 数字';
      $('stepTitle').textContent=s.title;$('stepDescription').textContent=s.desc;
      $('sceneStepNum').textContent='STEP '+String(stepIndex+1).padStart(2,'0')+' / '+String(steps.length).padStart(2,'0');
      $('stepCategory').textContent=phaseLabels[s.phase]||'结果';
      $('storyIndex').textContent=String(stepIndex+1).padStart(2,'0');
      $('stepTime').textContent=(stepIndex+1)+' / '+steps.length;
      const descriptors={intro:'先观察，暂时不揭晓答案',arrange:'把抽象的数字变成看得见的数量',count:'正在进行数量变化',finish:'计算完成 · 大功告成'};
      $('answerEyebrow').textContent=descriptors[s.phase];
      $('answerCaption').textContent=s.phase==='finish'?'这一段数学旅程完成啦':s.whole;
      $('answerNumber').classList.toggle('finished',s.phase==='finish');
      $('stepDots').innerHTML=steps.map((_,i)=>'<button type="button" data-step="'+i+'" class="step-dot '+(i===stepIndex?'active':i<stepIndex?'past':'')+'" aria-label="跳转到第 '+(i+1)+' 步" title="第 '+(i+1)+' 步"></button>').join('');
      $('statusBadge').innerHTML='<span></span> '+(s.phase==='finish'&&stepIndex===steps.length-1?'计算完成':'正在演示');
    }
    const t=visualType(s), a=s.a,b=s.b;
    let display='?';
    if(s.phase==='intro')display=fmt(a);
    if(s.phase==='arrange')display=s.op==='='?fmt(s.result):fmt(a);
    if(s.phase==='finish')display=fmt(s.result);
    if(s.phase==='count'){
      if(t==='add'){const n=Math.min(b,Math.floor(progress*(b+0.99)));display=fmt(a+n);$('visualObjects').querySelectorAll('.right-group .orb').forEach((el,i)=>{el.classList.toggle('count-off',i>=n);el.classList.toggle('selected',i===n-1&&n>0);});}
      else if(t==='sub'){const n=Math.min(b,Math.floor(progress*(b+0.99)));display=fmt(a-n);$('visualObjects').querySelectorAll('.dot-group .orb').forEach((el,i)=>{el.classList.toggle('deleted',i>=a-n);});}
      else if(t==='multiply'){const n=Math.min(a,Math.floor(progress*(a+0.99)));display=fmt(b*n);$('visualObjects').querySelectorAll('.grid-viz .orb').forEach((el,i)=>el.classList.toggle('count-off',i>=n*b));}
      else if(t==='divide'){const n=Math.min(b,Math.floor(progress*(b+0.99)));display=fmt(Math.min(a/b,Math.floor(progress*(a/b+0.99))));$('visualObjects').querySelectorAll('.fraction-group').forEach((el,i)=>el.classList.toggle('dimmed',i>=n));}
      else {const eased=1-Math.pow(1-progress,2);display=fmt(safe(a+(s.result-a)*eased));}
    }
    if(display!==lastCounter){lastCounter=display;const num=$('answerNumber');num.textContent=display;num.classList.remove('number-bump');void num.offsetWidth;num.classList.add('number-bump');}
    $('progressFill').style.width=((stepIndex+progress)/steps.length*100).toFixed(3)+'%';
    if(stepIndex===steps.length-1&&s.phase==='finish'&&progress>.9){$('answerNumber').classList.add('finished');}
  }
  function loop(ts){if(!steps.length){frameId=requestAnimationFrame(loop);return;}if(!lastFrame)lastFrame=ts;const dt=Math.min(ts-lastFrame,80);lastFrame=ts;
    if(playing){elapsed+=dt*speeds[speedIndex];let cur=steps[stepIndex];if(elapsed>=cur.time){if(stepIndex===steps.length-1){elapsed=cur.time;playing=false;updateControls();}else{elapsed-=cur.time;stepIndex++;lastStep=-1;updateControls();}}
      cur=steps[stepIndex];render(Math.max(0,Math.min(1,elapsed/cur.time)));
    }
    frameId=requestAnimationFrame(loop);
  }
  function init(){installListeners();start('9+9');frameId=requestAnimationFrame(loop);
    if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={parse,makeSteps,normalize,fmt,visualType};
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();}
})();