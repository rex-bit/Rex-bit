/*! Liquid tab bar (web, BETA). Spring lens, drag with stretch + rubber-band, shrinks to a pill on scroll. MIT */
(function (global) {
  "use strict";
  function spring(k, z, cur, vel, tgt, dt) { var c = 2 * z * Math.sqrt(k), a = -k * (cur - tgt) - c * vel; vel += a * dt; return [cur + vel * dt, vel]; }

  function LiquidTabBar(nav, opts) {
    opts = opts || {};
    var self = this, wrap = nav.parentNode, links = [].slice.call(nav.querySelectorAll("a"));
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var lens = document.createElement("span"); lens.className = "ltb-lens"; lens.setAttribute("aria-hidden", "true"); nav.insertBefore(lens, nav.firstChild);
    var mini = document.createElement("button"); mini.type = "button"; mini.className = "ltb-mini"; mini.setAttribute("aria-label", "Show menu"); wrap.appendChild(mini);
    if (!nav.querySelector('a[aria-current="true"]')) links[0].setAttribute("aria-current", "true");
    function current() { return nav.querySelector('a[aria-current="true"]') || links[0]; }

    /* spring state: x (px), sx / sy (lens scale) */
    var S = { x: 0, v: 0, sx: 1, vsx: 0, sy: 1, vsy: 0, tx: 0, tsx: 1, tsy: 1 }, raf = 0, last = 0, first = true, drag = null;
    function render() { lens.style.transform = "translate3d(" + S.x.toFixed(2) + "px,0,0) scale(" + S.sx.toFixed(4) + "," + S.sy.toFixed(4) + ")"; }
    function frame(t) {
      var dt = Math.min(.032, (t - last) / 1000 || .016); last = t;
      var r = spring(380, .77, S.x, S.v, S.tx, dt); S.x = r[0]; S.v = r[1];
      r = spring(320, .6, S.sx, S.vsx, S.tsx, dt); S.sx = r[0]; S.vsx = r[1];
      r = spring(320, .6, S.sy, S.vsy, S.tsy, dt); S.sy = r[0]; S.vsy = r[1];
      render();
      var done = Math.abs(S.x - S.tx) < .1 && Math.abs(S.v) < .5 && Math.abs(S.sx - S.tsx) < .002 && Math.abs(S.vsx) < .02 && Math.abs(S.sy - S.tsy) < .002 && Math.abs(S.vsy) < .02;
      if (done && !(drag && drag.on)) { S.x = S.tx; S.sx = S.tsx; S.sy = S.tsy; render(); raf = 0; } else raf = requestAnimationFrame(frame);
    }
    function kick() { if (reduce) { S.x = S.tx; S.sx = S.tsx; S.sy = S.tsy; render(); return; } if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function place(a, pop) {
      lens.style.width = a.offsetWidth + "px"; S.tx = a.offsetLeft; S.tsx = 1; S.tsy = 1;
      if (first) { first = false; S.x = S.tx; render(); return; }
      if (pop) S.sx = 1.1; kick();
    }
    function setCurrent(a, silent) {
      links.forEach(function (l) { l.setAttribute("aria-current", String(l === a)); });
      place(a, true); if (minimized) fillMini();
      if (!silent && opts.onChange) opts.onChange(links.indexOf(a), a);
    }
    this.select = function (i) { setCurrent(links[i], true); };

    /* drag */
    var hot = null, cache, px = 0, lastPx = 0, lastT = 0, vx = 0, suppress = false;
    function measure() { var r = nav.getBoundingClientRect(), L = links[links.length - 1], w = lens.offsetWidth; cache = { left: r.left, w: w, min: links[0].offsetLeft, max: L.offsetLeft + L.offsetWidth - w, c: links.map(function (a) { return a.offsetLeft + a.offsetWidth / 2; }) }; }
    function rb(d) { return Math.min(d * .35, cache.w / 5); }
    function dragTick() {
      var x = px - cache.left, tx = x - cache.w / 2;
      if (tx < cache.min) tx = cache.min - rb(cache.min - tx); else if (tx > cache.max) tx = cache.max + rb(tx - cache.max);
      S.tx = tx; S.tsx = 1.18 + Math.min(.22, Math.abs(vx) / 3500); S.tsy = 1.14;
      var bi = 0, bd = 1e9; cache.c.forEach(function (c, i) { var d = Math.abs(c - x); if (d < bd) { bd = d; bi = i; } });
      if (links[bi] !== hot) { if (hot) hot.removeAttribute("data-hot"); hot = links[bi]; hot.setAttribute("data-hot", ""); }
      kick();
    }
    nav.addEventListener("pointerdown", function (e) { if (e.button > 0) return; drag = { id: e.pointerId, x0: e.clientX, on: false }; measure(); lastT = 0; vx = 0; lastPx = e.clientX; });
    nav.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) { if (Math.abs(e.clientX - drag.x0) < 6) return; drag.on = true; nav.classList.add("dragging"); try { nav.setPointerCapture(e.pointerId); } catch (_) {} }
      var now = performance.now(); if (lastT) vx = vx * .6 + ((e.clientX - lastPx) / Math.max(1, now - lastT) * 1000) * .4; lastPx = e.clientX; lastT = now;
      px = e.clientX; dragTick();
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var was = drag.on; drag = null; if (!was) return;
      nav.classList.remove("dragging"); suppress = true; setTimeout(function () { suppress = false; }, 80);
      var a = hot || current(); if (hot) { hot.removeAttribute("data-hot"); hot = null; }
      setCurrent(a);
    }
    nav.addEventListener("pointerup", end); nav.addEventListener("pointercancel", end);
    nav.addEventListener("click", function (e) {
      if (suppress) { e.preventDefault(); e.stopPropagation(); return; }
      var a = e.target.closest("a"); if (a) { if (opts.preventNavigation) e.preventDefault(); setCurrent(a); }
    }, true);

    /* minimize on scroll: 66px down -> pill, 48px up (or near the top) -> bar */
    var minimized = false, acc = 0, lastY = scrollY, tick = 0;
    function fillMini() { var c = current(); mini.innerHTML = c.querySelector("svg").outerHTML + "<span>" + c.textContent.trim() + "</span>"; }
    function setMin(v) {
      if (v === minimized) return; minimized = v;
      wrap.classList.add("anim"); clearTimeout(setMin.t); setMin.t = setTimeout(function () { wrap.classList.remove("anim"); }, 450);
      if (v) fillMini(); nav.classList.toggle("min", v); mini.classList.toggle("on", v);
    }
    this.minimize = setMin;
    if (opts.minimizeOnScroll !== false) addEventListener("scroll", function () {
      if (tick) return;
      tick = requestAnimationFrame(function () {
        tick = 0; var y = scrollY, dy = y - lastY; lastY = y;
        if (drag && drag.on) return;
        if (dy * acc < 0) acc = 0; acc += dy;
        if (y < 120 || acc < -48) setMin(false); else if (acc > 66 && y > 200) setMin(true);
      });
    }, { passive: true });
    mini.addEventListener("click", function () { setMin(false); });
    addEventListener("resize", function () { setMin(false); place(current(), false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(current(), false); });
    place(current(), false);
  }
  global.LiquidTabBar = LiquidTabBar;
})(window);
