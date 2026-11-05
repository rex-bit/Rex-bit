/*! LiquidGlass: picks a glass style per device and adds real refraction where the browser can do it. MIT
 *
 *  mode "auto"   Apple devices -> "liquid", everything else (Android, Windows...) -> "blur" (cheap)
 *  mode "liquid" clear glass with bright edges; true refraction in Chromium (SVG displacement map)
 *  mode "blur"   classic frosted blur
 *
 *  Safari / iOS cannot use SVG filters inside backdrop-filter, so there "liquid" is the clear-glass look
 *  without refraction. Sets <html data-glass="liquid|blur"> and <html data-refract> when refraction is on.
 */
(function (g) {
  "use strict";
  var ua = navigator.userAgent || "";
  var isApple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Safari/.test(ua) && !/Chrome|Chromium|Android|Edg|OPR|Firefox|FxiOS|CriOS/.test(ua));
  var isChromium = /Chrome|Chromium|Edg/.test(ua) && !/FxiOS|CriOS|OPR/.test(ua) && !isApple;
  var html = document.documentElement, ns = "http://www.w3.org/2000/svg", targets = [], svg, mode = "auto", ro, uid = 0;

  function resolve(m) { return m === "liquid" || m === "blur" ? m : (isApple ? "liquid" : "blur"); }

  /* displacement map for a pill: strongest at the rim, neutral in the middle (R = x, G = y) */
  function makeMap(w, h) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d"), img = x.createImageData(w, h), d = img.data, r = h / 2, bezel = r * 0.75;
    for (var py = 0; py < h; py++) for (var px = 0; px < w; px++) {
      var cx = Math.max(r, Math.min(w - r, px + .5)), dx = px + .5 - cx, dy = py + .5 - r, dist = Math.sqrt(dx * dx + dy * dy);
      var depth = r - dist, m = depth >= bezel ? 0 : Math.pow(1 - Math.max(0, depth) / bezel, 2.2), nx = dist ? dx / dist : 0, ny = dist ? dy / dist : 0;
      var i = (py * w + px) * 4;
      d[i] = 128 - 127 * nx * m; d[i + 1] = 128 - 127 * ny * m; d[i + 2] = 128; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0); return c.toDataURL();
  }

  function build(t) {
    var w = Math.round(t.el.offsetWidth), h = Math.round(t.el.offsetHeight);
    if (!w || !h || (t.w === w && t.h === h)) return; t.w = w; t.h = h;
    t.fe.setAttribute("width", w); t.fe.setAttribute("height", h);
    t.fe.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", makeMap(w, h)); t.fe.setAttribute("href", makeMap(w, h));
    t.dm.setAttribute("scale", Math.round(h * 0.42));
  }

  function apply() {
    var m = resolve(mode); html.setAttribute("data-glass", m);
    var refract = m === "liquid" && isChromium && !html.classList.contains("lite");
    if (refract) html.setAttribute("data-refract", ""); else html.removeAttribute("data-refract");
    targets.forEach(function (t) {
      var v = refract ? "url(#" + t.id + ") blur(1px) saturate(1.5)" : "";
      t.el.style.backdropFilter = v; t.el.style.webkitBackdropFilter = v;
      if (refract) { t.w = 0; build(t); }
    });
  }

  g.LiquidGlass = {
    isApple: isApple,
    init: function (opts) {
      opts = opts || {}; mode = opts.mode || "auto";
      svg = document.createElementNS(ns, "svg"); svg.setAttribute("width", 0); svg.setAttribute("height", 0); svg.setAttribute("aria-hidden", "true"); svg.style.cssText = "position:absolute;pointer-events:none";
      document.body.appendChild(svg);
      [].slice.call(document.querySelectorAll(opts.targets || ".ltb,.ltb-mini")).forEach(function (el) {
        var id = "lg-f" + (++uid), f = document.createElementNS(ns, "filter");
        f.setAttribute("id", id); f.setAttribute("x", "0"); f.setAttribute("y", "0"); f.setAttribute("width", "1"); f.setAttribute("height", "1"); f.setAttribute("color-interpolation-filters", "sRGB");
        var fe = document.createElementNS(ns, "feImage"); fe.setAttribute("x", 0); fe.setAttribute("y", 0); fe.setAttribute("preserveAspectRatio", "none"); fe.setAttribute("result", "map");
        var dm = document.createElementNS(ns, "feDisplacementMap"); dm.setAttribute("in", "SourceGraphic"); dm.setAttribute("in2", "map"); dm.setAttribute("xChannelSelector", "R"); dm.setAttribute("yChannelSelector", "G");
        f.appendChild(fe); f.appendChild(dm); svg.appendChild(f); targets.push({ el: el, id: id, fe: fe, dm: dm, w: 0, h: 0 });
      });
      if ("ResizeObserver" in g) { var tm; ro = new ResizeObserver(function () { clearTimeout(tm); tm = setTimeout(function () { if (html.hasAttribute("data-refract")) targets.forEach(build); }, 120); }); targets.forEach(function (t) { ro.observe(t.el); }); }
      apply(); return g.LiquidGlass;
    },
    set: function (m) { mode = m; apply(); },
    get mode() { return mode; },
    get active() { return resolve(mode); }
  };
})(window);
