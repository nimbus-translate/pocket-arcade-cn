/* 枝序 Motion System v2 — lightweight, reduced-motion-aware, no dependencies. */
(() => {
  'use strict';
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const canAnimate = () => !reduced() && typeof Element.prototype.animate === 'function';
  const ease = 'cubic-bezier(.2,.72,.17,1)';
  const spring = 'cubic-bezier(.2,1.18,.24,1)';
  const fade = (el, frames, options) => {
    if (!canAnimate()) return;
    try { return el.animate(frames, {fill:'both', ...options}); } catch { return null; }
  };
  const finish = animation => animation?.finished?.catch(() => {});
  function patchNodes(layer, html, visibleNodes, docId) {
    if (!layer) return;
    const oldDocId = layer.dataset.doc;
    const switching = !!oldDocId && oldDocId !== docId;
    const old = new Map();
    [...layer.querySelectorAll('.node[data-node]')].forEach(el => old.set(el.dataset.node, {
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      el
    }));
    const nextIds = new Set(visibleNodes.map(n => n.id));
    if (canAnimate() && !switching) {
      for (const [id, item] of old) {
        if (nextIds.has(id)) continue;
        // Detached branches retain their old layout for a soft exit.
        const ghost = item.el.cloneNode(true);
        ghost.removeAttribute('data-node');
        ghost.classList.add('node-ghost');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.querySelectorAll('button').forEach(b => b.disabled = true);
        layer.appendChild(ghost);
        const anim = fade(ghost, [
          {opacity: 0.9, transform:'translateY(0) scale(1)', filter:'blur(0)'},
          {opacity: 0, transform:'translateY(-8px) scale(.91)', filter:'blur(2px)'}
        ], {duration:250,easing:ease});
        if (anim) finish(anim).then(() => ghost.remove()); else ghost.remove();
      }
    }
    // Keep transient ghosts until their exit finishes.
    [...layer.querySelectorAll('.node[data-node]')].forEach(n => n.remove());
    layer.insertAdjacentHTML('afterbegin', html);
    layer.dataset.doc = docId;
    if (!canAnimate()) return;
    [...layer.querySelectorAll('.node[data-node]')].forEach((el, i) => {
      const item = visibleNodes.find(n => n.id === el.dataset.node);
      if (!item) return;
      const last = !switching && old.get(item.id);
      if (last) {
        const dx = last.x - item.x, dy = last.y - item.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) {
          fade(el, [{transform:`translate3d(${dx}px,${dy}px,0)`}, {transform:'translate3d(0,0,0)'}], {duration:490,easing:spring});
        }
      } else {
        const p = old.get(item.parentId);
        const deltaX = p ? p.x - item.x + 42 : 0;
        const deltaY = p ? p.y - item.y + 18 : 15;
        fade(el, [
          {opacity:0,transform:`translate3d(${deltaX}px,${deltaY}px,0) scale(${p ? 0.75 : 0.91})`,filter:'blur(3px)'},
          {opacity:1,transform:'translate3d(0,0,0) scale(1)',filter:'blur(0)'}
        ], {duration:switching?360:480,delay:Math.min(i,10)*(switching?16:24),easing:spring});
      }
    });
  }
  function animateEdges(svg, previousIds) {
    if (!canAnimate()) return;
    [...svg.querySelectorAll('path[data-edge]')].forEach((path, i) => {
      if (previousIds.has(path.dataset.edge)) return;
      let length=0;
      try {length=path.getTotalLength()}catch{}
      if (!length) return;
      fade(path,[
        {strokeDasharray:length,strokeDashoffset:length,opacity:0.32},
        {strokeDasharray:length,strokeDashoffset:0,opacity:1}
      ],{duration:470,delay:Math.min(i,8)*26,easing:ease}).finished.finally(()=>{
        path.style.strokeDasharray='';path.style.strokeDashoffset='';
      });
    });
    [...svg.querySelectorAll('.edge-dot')].forEach(dot => {
      if (!previousIds.has(dot.dataset.edgeDot)) fade(dot,[{opacity:0},{opacity:1}],{duration:300,delay:170,easing:ease});
    });
  }
  function highlight(element) {
    if (!element || !canAnimate()) return;
    fade(element, [{filter:'brightness(1.1)'},{filter:'brightness(1)'}],{duration:350,easing:ease});
  }
  window.MindMotion = Object.freeze({reduced,canAnimate,patchNodes,animateEdges,highlight,ease,spring});
})();
