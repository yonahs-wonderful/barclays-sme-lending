/* expansion.js — a lively 2.5D isometric storefront EXPANSION animation for a
   bank's AI lending hero. An established shop is already there on load; the
   animation grows the expansion (second floor, then an adjacent storefront) with
   springy pops while a cute shop-owner reacts. Pre-approval: NO confetti — a
   counter ticks $0 -> $150,000 ("Expansion requested"), ending on a hopeful hold.

   Reusable: NABExpansion.mount(containerEl, opts) -> { replay, dispose }.
   Pure inline SVG, drawn in code. No external assets. */
(function () {
  "use strict";
  var SVGNS = "http://www.w3.org/2000/svg";
  var STYLE_ID = "bank-expansion-style";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      ".xp-root{position:relative;width:100%;height:100%;cursor:pointer;-webkit-user-select:none;user-select:none;}" +
      ".xp-root svg{display:block;width:100%;height:100%;overflow:visible;}" +
      ".xp-counter{position:absolute;top:11px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:0;padding:7px 17px 8px;border-radius:18px;background:rgba(255,251,242,.9);backdrop-filter:blur(6px);box-shadow:0 10px 26px -10px rgba(70,120,90,.4),inset 0 1px 0 rgba(255,255,255,.7);pointer-events:none;text-align:center;font-family:'Jost','Inter',system-ui,sans-serif;}" +
      ".xp-counter .xp-lbl{font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#3a9c79;}" +
      ".xp-counter .xp-amt{font-size:22px;font-weight:600;letter-spacing:-.6px;line-height:1.05;color:#19996a;font-variant-numeric:tabular-nums;}" +
      ".xp-hint{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:700;color:#9bb3a6;opacity:0;transition:opacity .5s ease;pointer-events:none;white-space:nowrap;font-family:'Nunito',ui-rounded,system-ui,sans-serif;}" +
      ".xp-hint.show{opacity:1;}";
    document.head.appendChild(s);
  }

  function mount(container, opts) {
    opts = opts || {};
    injectStyle();
    var REDUCED = opts.reducedMotion != null ? opts.reducedMotion
      : (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var TARGET = opts.amount || 150000;

    container.classList.add("xp-root");
    var counterEl = document.createElement("div");
    counterEl.className = "xp-counter";
    counterEl.innerHTML = '<span class="xp-lbl">' + (opts.label || "Expansion requested") + '</span><span class="xp-amt">$0</span>';
    var amtEl = counterEl.querySelector(".xp-amt");
    var ACC = opts.accent || "#19996a";
    counterEl.querySelector(".xp-lbl").style.color = ACC;
    amtEl.style.color = ACC;
    var hintEl = document.createElement("div");
    hintEl.className = "xp-hint"; hintEl.textContent = "Click to replay";
    // Counter + label text intentionally NOT shown — calmer, text-free end state.
    // (counterEl/amtEl are kept for internal animation logic but stay detached.)

    /* ---------- palette ---------- */
    var P = {
      emerald: "#34C28A", coral: "#FF6B5E", yellow: "#FFC42E", sky: "#4FB8FF",
      grape: "#8B6CE8", bubble: "#FF8FB8", wood: "#C98A4B", cream: "#FFF6E6",
      skin: "#E8B888", hair: "#5A3B2E", glass: "#BFE8FF", leaf: "#3FB573", leafDk: "#2E9961"
    };

    /* ---------- svg root ---------- */
    var VBW = 820, VBH = 600;
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "205 -16 480 596");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    container.appendChild(svg);
    var bob = document.createElementNS(SVGNS, "g");   // whole-scene idle bob
    svg.appendChild(bob);
    var root = document.createElementNS(SVGNS, "g");
    bob.appendChild(root);

    /* ---------- isometric projection ---------- */
    var U = 42, OX = 392, OY = 332, A = 0.866, B = 0.5, ZS = 1;
    function iso(x, y, z) { return { x: OX + (x - y) * A * U, y: OY + (x + y) * B * U - z * U * ZS }; }
    function shade(hex, f) {
      var n = parseInt(hex.slice(1), 16);
      var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
      var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
      var b = Math.min(255, Math.round((n & 255) * f));
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    function el(tag, attrs, parent) {
      var e = document.createElementNS(SVGNS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      (parent || root).appendChild(e);
      return e;
    }
    function poly(pts, fill, parent, extra) {
      var d = pts.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
      var a = { points: d, fill: fill }; if (extra) for (var k in extra) a[k] = extra[k];
      return el("polygon", a, parent);
    }
    // an isometric box: front (y+d), right (x+w), top (z+h)
    function isoBox(g, x, y, z, w, d, h, color, opt) {
      opt = opt || {};
      var top = z + h, x1 = x + w, y1 = y + d;
      poly([iso(x1, y, top), iso(x1, y1, top), iso(x1, y1, z), iso(x1, y, z)], shade(color, 0.84), g); // right
      poly([iso(x, y1, top), iso(x1, y1, top), iso(x1, y1, z), iso(x, y1, z)], shade(color, 0.70), g); // front
      if (!opt.noTop) poly([iso(x, y, top), iso(x1, y, top), iso(x1, y1, top), iso(x, y1, top)], color, g); // top
    }
    // a rectangle painted on the front face (constant y plane)
    function faceY(g, y, x0, x1, z0, z1, fill, extra) {
      poly([iso(x0, y, z1), iso(x1, y, z1), iso(x1, y, z0), iso(x0, y, z0)], fill, g, extra);
    }

    /* ---------- parts registry (springy pop) ---------- */
    var parts = [];
    function part(anchor3, appear, dur, instant) {
      var g = el("g", {}, root);
      var an = iso(anchor3[0], anchor3[1], anchor3[2]);
      parts.push({ g: g, ax: an.x, ay: an.y, appear: appear, dur: dur, instant: !!instant, puffed: false });
      if (!instant && !REDUCED) g.setAttribute("transform", "translate(" + an.x + " " + an.y + ") scale(0.0001) translate(" + (-an.x) + " " + (-an.y) + ")");
      return g;
    }
    function setScale(p, s) {
      p.g.setAttribute("transform", "translate(" + p.ax + " " + p.ay + ") scale(" + s + ") translate(" + (-p.ax) + " " + (-p.ay) + ")");
    }

    /* ---------- shadows on the ground ---------- */
    function blob(cx, cy, rx, ry, parent, op) {
      el("ellipse", { cx: cx, cy: cy, rx: rx, ry: ry, fill: "rgba(40,70,55,0.16)" + "", opacity: op == null ? 1 : op }, parent || root);
    }

    /* ======================= BUILD ======================= */
    // footprints
    var S1 = { x: 0, y: 0, w: 3.2, d: 2.8 }, H1 = 3.0, H2 = 2.0;
    var S2 = { x: 3.55, y: 0, w: 2.95, d: 2.8 }, H2b = 3.2;

    /* ground slab (instant) */
    var gGround = part([ (S1.x + S2.x + S2.w) / 2, 1.4, 0 ], 0, 0, true);
    isoBox(gGround, -0.7, -0.7, -0.45, 8.0, 4.2, 0.45, P.cream);
    // grass patch + sidewalk seam
    poly([iso(-0.7, 3.5, 0), iso(7.3, 3.5, 0), iso(7.3, 3.5 + 0, 0)], P.cream, gGround);
    // a little lawn strip front-left
    isoBox(gGround, -0.6, 2.9, 0, 1.4, 0.5, 0.06, P.emerald);

    /* ---------- STAGE 1: established shop1 (instant, lived-in) ---------- */
    var g1 = part([ S1.x + S1.w / 2, S1.y + S1.d / 2, 0 ], 0, 0, true);
    isoBox(g1, S1.x, S1.y, 0, S1.w, S1.d, H1, P.cream);
    // storefront on front face (y = S1.d)
    var fy1 = S1.y + S1.d;
    faceY(g1, fy1, S1.x + 0.25, S1.x + 1.05, 0, 1.7, P.wood);              // door
    faceY(g1, fy1, S1.x + 0.30, S1.x + 1.00, 0.1, 1.62, shade(P.wood, 1.12));
    faceY(g1, fy1, S1.x + 1.45, S1.x + 2.95, 0.7, 1.95, "#2A3340");        // window frame
    faceY(g1, fy1, S1.x + 1.55, S1.x + 2.85, 0.8, 1.85, P.glass);          // window glass
    faceY(g1, fy1, S1.x + 1.55, S1.x + 2.2, 0.8, 1.85, shade(P.glass, 1.06)); // glass highlight
    // sign board above
    faceY(g1, fy1, S1.x + 0.4, S1.x + 2.9, 2.05, 2.55, P.emerald);
    // coffee-cup motif on sign (simple)
    var cupX = S1.x + 0.9;
    faceY(g1, fy1, cupX, cupX + 0.5, 2.18, 2.42, P.cream);
    faceY(g1, fy1, cupX + 0.5, cupX + 0.62, 2.24, 2.38, P.cream);

    /* awning over shop1 storefront (striped, projecting) — part of established shop */
    function awning(g, fy, x0, x1, ztop, colA) {
      var n = Math.max(4, Math.round((x1 - x0) / 0.42)), sw = (x1 - x0) / n, proj = 0.62, drop = 0.4;
      for (var i = 0; i < n; i++) {
        var xa = x0 + i * sw, xb = xa + sw, col = i % 2 === 0 ? colA : P.cream;
        poly([iso(xa, fy, ztop), iso(xb, fy, ztop), iso(xb, fy + proj, ztop - drop), iso(xa, fy + proj, ztop - drop)], col, g);
      }
      // front lip (shaded)
      poly([iso(x0, fy + proj, ztop - drop), iso(x1, fy + proj, ztop - drop), iso(x1, fy + proj, ztop - drop - 0.16), iso(x0, fy + proj, ztop - drop - 0.16)], shade(colA, 0.8), g);
    }
    awning(g1, fy1, S1.x + 0.15, S1.x + 3.05, 2.0, P.coral);

    // plant by the door (established)
    function plant(g, px, py, scale) {
      scale = scale || 1;
      var b = iso(px, py, 0);
      blob(b.x, b.y + 4, 16 * scale, 7 * scale, g);
      isoBox(g, px - 0.18 * scale, py - 0.18 * scale, 0, 0.36 * scale, 0.36 * scale, 0.34 * scale, P.coral);
      var c = iso(px, py, 0.34 * scale);
      el("circle", { cx: c.x, cy: c.y - 14 * scale, r: 15 * scale, fill: P.leaf }, g);
      el("circle", { cx: c.x - 9 * scale, cy: c.y - 6 * scale, r: 10 * scale, fill: P.leafDk }, g);
      el("circle", { cx: c.x + 9 * scale, cy: c.y - 8 * scale, r: 11 * scale, fill: P.leaf }, g);
    }
    plant(g1, S1.x + 2.75, fy1 + 0.45, 1);

    /* ---------- STAGE 2: second floor (pops on) ---------- */
    var g2 = part([ S1.x + S1.w / 2, S1.y + S1.d / 2, H1 ], 0.8, 0.62);
    isoBox(g2, S1.x, S1.y, H1, S1.w, S1.d, H2, P.bubble);
    var fy2 = S1.y + S1.d;
    faceY(g2, fy2, S1.x + 0.4, S1.x + 1.4, H1 + 0.45, H1 + 1.45, "#2A3340");
    faceY(g2, fy2, S1.x + 0.48, S1.x + 1.32, H1 + 0.53, H1 + 1.37, P.glass);
    faceY(g2, fy2, S1.x + 1.8, S1.x + 2.8, H1 + 0.45, H1 + 1.45, "#2A3340");
    faceY(g2, fy2, S1.x + 1.88, S1.x + 2.72, H1 + 0.53, H1 + 1.37, P.glass);
    // window-box planter
    faceY(g2, fy2, S1.x + 0.35, S1.x + 2.85, H1 + 0.34, H1 + 0.52, P.wood);

    // roof cap (part of stage 2)
    var g2r = part([ S1.x + S1.w / 2, S1.y + S1.d / 2, H1 + H2 ], 1.25, 0.5);
    isoBox(g2r, S1.x - 0.12, S1.y - 0.12, H1 + H2, S1.w + 0.24, S1.d + 0.24, 0.34, P.coral);

    /* ---------- STAGE 3: adjacent storefront + decoration (pops in) ---------- */
    var g3 = part([ S2.x + S2.w / 2, S2.y + S2.d / 2, 0 ], 2.55, 0.62);
    isoBox(g3, S2.x, S2.y, 0, S2.w, S2.d, H2b, P.sky);
    var fy3 = S2.y + S2.d;
    faceY(g3, fy3, S2.x + 1.85, S2.x + 2.7, 0, 1.7, P.grape);              // door
    faceY(g3, fy3, S2.x + 1.9, S2.x + 2.62, 0.1, 1.62, shade(P.grape, 1.16));
    faceY(g3, fy3, S2.x + 0.3, S2.x + 1.55, 0.7, 1.95, "#2A3340");         // window
    faceY(g3, fy3, S2.x + 0.4, S2.x + 1.45, 0.8, 1.85, P.glass);
    faceY(g3, fy3, S2.x + 0.4, S2.x + 0.9, 0.8, 1.85, shade(P.glass, 1.06));
    // roof cap
    isoBox(g3, S2.x - 0.12, S2.y - 0.12, H2b, S2.w + 0.24, S2.d + 0.24, 0.32, P.yellow);
    // sign
    faceY(g3, fy3, S2.x + 0.35, S2.x + 2.6, 2.1, 2.6, P.coral);

    var g3a = part([ S2.x + S2.w / 2, fy3, 2.0 ], 3.0, 0.5);
    awning(g3a, fy3, S2.x + 0.12, S2.x + 2.85, 2.05, P.yellow);

    // hanging sign on a little arm
    var g3h = part([ S2.x + 2.95, fy3, 2.0 ], 3.35, 0.5);
    (function () {
      var armA = iso(S2.x + 2.7, fy3, 1.95), armB = iso(S2.x + 3.25, fy3, 1.95);
      el("line", { x1: armA.x, y1: armA.y, x2: armB.x, y2: armB.y, stroke: "#5A4632", "stroke-width": 4, "stroke-linecap": "round" }, g3h);
      var hang = iso(S2.x + 3.15, fy3, 1.9);
      el("rect", { x: hang.x - 22, y: hang.y, width: 44, height: 30, rx: 7, fill: P.bubble }, g3h);
      el("circle", { cx: hang.x, cy: hang.y + 15, r: 7, fill: P.cream }, g3h);
      // heart dot
      el("path", { d: heartPath(hang.x, hang.y + 15, 5), fill: P.coral }, g3h);
    })();

    // planters + scooter + string lights (stage 3 props)
    var g3p = part([ S2.x + 2.7, fy3 + 0.5, 0 ], 3.4, 0.45);
    plant(g3p, S2.x + 0.3, fy3 + 0.45, 0.9);
    plant(g3p, S2.x + 2.7, fy3 + 0.5, 1.05);

    var gScoot = part([ S2.x + 1.4, fy3 + 0.95, 0 ], 3.7, 0.5);
    scooter(gScoot, S2.x + 1.3, fy3 + 1.0);

    function heartPath(cx, cy, s) {
      return "M" + cx + " " + (cy + s * 0.9) +
        " C" + (cx - s * 1.6) + " " + (cy - s * 0.4) + " " + (cx - s * 0.7) + " " + (cy - s * 1.4) + " " + cx + " " + (cy - s * 0.4) +
        " C" + (cx + s * 0.7) + " " + (cy - s * 1.4) + " " + (cx + s * 1.6) + " " + (cy - s * 0.4) + " " + cx + " " + (cy + s * 0.9) + " Z";
    }
    function scooter(g, px, py) {
      var b = iso(px, py, 0);
      blob(b.x, b.y + 3, 30, 9, g);
      // body
      el("rect", { x: b.x - 26, y: b.y - 34, width: 40, height: 16, rx: 8, fill: P.coral }, g);
      el("rect", { x: b.x + 6, y: b.y - 58, width: 9, height: 30, rx: 4, fill: "#7A5238" }, g); // handle stem
      el("rect", { x: b.x + 2, y: b.y - 60, width: 22, height: 7, rx: 3, fill: "#5A4632" }, g);
      el("rect", { x: b.x - 30, y: b.y - 28, width: 18, height: 22, rx: 5, fill: P.yellow }, g); // box
      el("circle", { cx: b.x - 18, cy: b.y - 4, r: 11, fill: "#3A3340" }, g);
      el("circle", { cx: b.x - 18, cy: b.y - 4, r: 4.5, fill: "#CFE3EF" }, g);
      el("circle", { cx: b.x + 16, cy: b.y - 4, r: 11, fill: "#3A3340" }, g);
      el("circle", { cx: b.x + 16, cy: b.y - 4, r: 4.5, fill: "#CFE3EF" }, g);
    }

    // string lights between the two roofs (stage 3)
    var gLights = part([ (S1.x + S2.x + S2.w) / 2, 0, H1 ], 3.5, 0.5);
    (function () {
      var aPt = iso(S1.x + 2.9, 0.1, H1 + H2 + 0.2), bPt = iso(S2.x + 0.4, 0.1, H2b + 0.3);
      var midX = (aPt.x + bPt.x) / 2, midY = Math.max(aPt.y, bPt.y) + 26;
      el("path", { d: "M" + aPt.x + " " + aPt.y + " Q" + midX + " " + midY + " " + bPt.x + " " + bPt.y, fill: "none", stroke: "#6B5A48", "stroke-width": 2 }, gLights);
      var cols = [P.yellow, P.coral, P.sky, P.emerald, P.bubble];
      for (var i = 1; i <= 5; i++) {
        var t = i / 6, mx = (1 - t) * (1 - t) * aPt.x + 2 * (1 - t) * t * midX + t * t * bPt.x;
        var my = (1 - t) * (1 - t) * aPt.y + 2 * (1 - t) * t * midY + t * t * bPt.y;
        el("circle", { cx: mx, cy: my + 4, r: 4.5, fill: cols[i % cols.length] }, gLights);
      }
    })();

    /* ---------- the shop owner (front-most, reacts) ---------- */
    var owner = el("g", {}, root);
    var charState = buildOwner(owner, iso(S1.x + 1.25, fy1 + 1.35, 0));

    function buildOwner(g, foot) {
      var fx = foot.x, fy = foot.y, st = { armL: 14, armR: 14, tL: 14, tR: 14, wave: false, head: 0 };
      el("ellipse", { cx: fx, cy: fy + 6, rx: 34, ry: 11, fill: "rgba(40,70,55,0.18)" }, g);
      var body = el("g", {}, g);                          // for breathing
      // legs
      el("rect", { x: fx - 13, y: fy - 30, width: 11, height: 32, rx: 5, fill: "#3B4A8A" }, body);
      el("rect", { x: fx + 2, y: fy - 30, width: 11, height: 32, rx: 5, fill: "#3B4A8A" }, body);
      el("rect", { x: fx - 14, y: fy - 4, width: 14, height: 8, rx: 3, fill: "#5A4632" }, body);
      el("rect", { x: fx + 1, y: fy - 4, width: 14, height: 8, rx: 3, fill: "#5A4632" }, body);
      // torso (apron)
      el("rect", { x: fx - 19, y: fy - 74, width: 38, height: 48, rx: 14, fill: P.emerald }, body);
      el("rect", { x: fx - 13, y: fy - 60, width: 26, height: 30, rx: 8, fill: shade(P.emerald, 1.12) }, body); // apron
      el("line", { x1: fx - 11, y1: fy - 44, x2: fx + 11, y2: fy - 44, stroke: shade(P.emerald, 0.8), "stroke-width": 2 }, body);
      // arms (rotatable around shoulders)
      var shoulderY = fy - 66;
      var armLg = el("g", {}, body), armRg = el("g", {}, body);
      el("rect", { x: -6, y: 0, width: 12, height: 34, rx: 6, fill: shade(P.emerald, 0.92) }, armLg);
      el("circle", { cx: 0, cy: 34, r: 7, fill: P.skin }, armLg);
      el("rect", { x: -6, y: 0, width: 12, height: 34, rx: 6, fill: shade(P.emerald, 0.92) }, armRg);
      el("circle", { cx: 0, cy: 34, r: 7, fill: P.skin }, armRg);
      var lsx = fx - 17, rsx = fx + 17;
      // head
      var headG = el("g", {}, body);
      el("circle", { cx: fx, cy: fy - 90, r: 17, fill: P.skin }, headG);
      el("path", { d: "M" + (fx - 17) + " " + (fy - 93) + " Q" + fx + " " + (fy - 116) + " " + (fx + 17) + " " + (fy - 93) + " Q" + fx + " " + (fy - 104) + " " + (fx - 17) + " " + (fy - 93) + " Z", fill: P.hair }, headG);
      el("circle", { cx: fx - 6, cy: fy - 90, r: 2.4, fill: "#3A2E2A" }, headG);
      el("circle", { cx: fx + 6, cy: fy - 90, r: 2.4, fill: "#3A2E2A" }, headG);
      el("path", { d: "M" + (fx - 6) + " " + (fy - 83) + " Q" + fx + " " + (fy - 79) + " " + (fx + 6) + " " + (fy - 83), fill: "none", stroke: "#B5654A", "stroke-width": 2.4, "stroke-linecap": "round" }, headG);
      el("circle", { cx: fx - 10, cy: fy - 86, r: 3, fill: "rgba(255,120,120,0.35)" }, headG);
      el("circle", { cx: fx + 10, cy: fy - 86, r: 3, fill: "rgba(255,120,120,0.35)" }, headG);

      st.update = function () {
        armLg.setAttribute("transform", "translate(" + lsx + " " + shoulderY + ") rotate(" + st.armL + ")");
        armRg.setAttribute("transform", "translate(" + rsx + " " + shoulderY + ") rotate(" + st.armR + ")");
        headG.setAttribute("transform", "rotate(" + st.head + " " + fx + " " + (fy - 90) + ")");
        body.setAttribute("transform", "translate(0 " + st.breathe + ")");
      };
      st.breathe = 0;
      st.update();
      return st;
    }
    function pose(name) {
      var s = charState;
      if (name === "wave") { s.tL = 16; s.tR = 16; s.wave = true; s.headT = 0; }
      else if (name === "point") { s.tL = 12; s.tR = 158; s.wave = false; s.headT = -6; }
      else if (name === "cheer") { s.tL = -150; s.tR = 150; s.wave = false; s.headT = 0; }
      else { s.tL = 14; s.tR = 14; s.wave = false; s.headT = 0; }
    }
    charState.headT = 0;
    pose("wave");

    /* ---------- finale sparkles (gentle, NOT confetti) ---------- */
    var sparkG = el("g", {}, root);
    var sparkles = [];
    function spawnSparkles() {
      var spots = [iso(S1.x + 1.6, 1.0, H1 + H2 + 0.5), iso(S2.x + 1.5, 1.2, H2b + 0.6), iso(S1.x + 2.9, 0.4, H1 + H2)];
      spots.forEach(function (p, i) {
        for (var k = 0; k < 2; k++) {
          var s = el("path", { d: starPath(p.x + (Math.random() - 0.5) * 50, p.y - 10 + (Math.random() - 0.5) * 40, 7), fill: "#FFE9A8", opacity: 0 }, sparkG);
          sparkles.push({ el: s, born: i * 0.12 + k * 0.22, life: 0.9 });
        }
      });
    }
    function starPath(cx, cy, r) {
      var d = "", n = 4;
      for (var i = 0; i < n * 2; i++) {
        var rr = i % 2 ? r * 0.4 : r, a = Math.PI * i / n - Math.PI / 2;
        d += (i ? "L" : "M") + (cx + Math.cos(a) * rr).toFixed(1) + " " + (cy + Math.sin(a) * rr).toFixed(1) + " ";
      }
      return d + "Z";
    }

    /* ---------- dust puffs when parts land ---------- */
    var puffG = el("g", {}, root);
    var puffs = [];
    function spawnPuff(p) {
      var c = el("circle", { cx: p.ax, cy: p.ay, r: 4, fill: "none", stroke: "rgba(120,150,130,0.55)", "stroke-width": 3, opacity: 0.8 }, puffG);
      puffs.push({ el: c, age: 0, life: 0.5 });
    }

    /* ---------- timeline ---------- */
    function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
    function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
    function setCounter(v) { amtEl.textContent = "$" + Math.round(v).toLocaleString("en-US"); }

    var RAMP_END = 4.2, HOLD = 1.2;
    var t = 0, phase = "build", holdT = 0, idleT = 0, sparked = false;
    var posedFloor = false, posedShop = false;

    function applyParts() {
      parts.forEach(function (p) {
        if (p.instant) { return; }
        var pr = (t - p.appear) / p.dur;
        if (pr <= 0) { p.g.setAttribute("visibility", "hidden"); return; }
        p.g.setAttribute("visibility", "visible");
        setScale(p, Math.max(0.0001, pr >= 1 ? 1 : easeOutBack(pr)));
        if (!p.puffed) { p.puffed = true; spawnPuff(p); }
      });
    }

    function resetPlay() {
      t = 0; phase = "build"; holdT = 0; idleT = 0; sparked = false; posedFloor = false; posedShop = false;
      hintEl.classList.remove("show");
      parts.forEach(function (p) { if (!p.instant) { p.puffed = false; p.g.setAttribute("visibility", "hidden"); setScale(p, 0.0001); } });
      sparkles.forEach(function (s) { s.el.parentNode && s.el.parentNode.removeChild(s.el); }); sparkles.length = 0;
      pose("wave"); setCounter(0);
    }
    function onClick() { if (!REDUCED) resetPlay(); }
    container.addEventListener("click", onClick);

    if (REDUCED) {
      parts.forEach(function (p) { if (!p.instant) { p.g.setAttribute("visibility", "visible"); setScale(p, 1); } });
      pose("cheer"); charState.armL = charState.tL; charState.armR = charState.tR; charState.head = charState.headT; charState.update();
      setCounter(TARGET);
    }

    /* ---------- loop ---------- */
    var last = performance.now(), raf = 0, alive = true;
    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      var dt = Math.min((now - last) / 1000, 0.05); last = now;

      if (!REDUCED) {
        if (phase === "build") {
          t += dt;
          applyParts();
          setCounter(easeInOut(Math.min(t / RAMP_END, 1)) * TARGET);
          if (!posedFloor && t >= 0.9) { posedFloor = true; pose("point"); }
          if (!posedShop && t >= 2.7) { posedShop = true; pose("cheer"); }
          if (t >= RAMP_END + 0.2) { phase = "hold"; holdT = 0; if (!sparked) { sparked = true; spawnSparkles(); } }
        } else if (phase === "hold") {
          holdT += dt;
          if (holdT >= HOLD) { phase = "idle"; idleT = 0; hintEl.classList.add("show"); pose("wave"); }
        } else {
          idleT += dt;
        }

        // arm easing toward target (+ wave oscillation)
        var s = charState;
        var wob = s.wave ? Math.sin((t + idleT) * 6) * 14 : 0;
        s.armL += ((s.tL) - s.armL) * 0.18;
        s.armR += ((s.tR - wob) - s.armR) * 0.18;
        s.head += ((s.headT || 0) - s.head) * 0.16;
        // breathing + scene bob
        var bt = (phase === "idle") ? idleT : t;
        s.breathe = Math.sin(bt * 2.2) * 1.2;
        s.update();
        var by = (phase === "idle") ? Math.sin(idleT * 1.3) * 5 : Math.sin(t * 2) * 1.5;
        bob.setAttribute("transform", "translate(0 " + by.toFixed(2) + ")");

        // puffs
        for (var i = puffs.length - 1; i >= 0; i--) {
          var pf = puffs[i]; pf.age += dt; var k = pf.age / pf.life;
          if (k >= 1) { pf.el.parentNode && pf.el.parentNode.removeChild(pf.el); puffs.splice(i, 1); continue; }
          pf.el.setAttribute("r", 4 + k * 26); pf.el.setAttribute("opacity", 0.8 * (1 - k));
        }
        // sparkles
        if (sparked) {
          var st2 = holdT + (phase === "idle" ? idleT : 0);
          sparkles.forEach(function (sp) {
            var a = st2 - sp.born; if (a < 0) { sp.el.setAttribute("opacity", 0); return; }
            var k = (a % (sp.life + 1.6)) / sp.life;
            if (k > 1) { sp.el.setAttribute("opacity", 0); return; }
            var o = Math.sin(k * Math.PI);
            sp.el.setAttribute("opacity", o * 0.95);
            sp.el.setAttribute("transform", "translate(" + (sp.el.__x || 0) + " 0) scale(" + (0.5 + o * 0.7) + ")");
          });
        }
      }
    }
    raf = requestAnimationFrame(frame);

    return {
      replay: resetPlay,
      dispose: function () {
        alive = false; cancelAnimationFrame(raf);
        container.removeEventListener("click", onClick);
        if (svg.parentNode) svg.parentNode.removeChild(svg);
        if (counterEl.parentNode) counterEl.parentNode.removeChild(counterEl);
        if (hintEl.parentNode) hintEl.parentNode.removeChild(hintEl);
      }
    };
  }

  window.NABExpansion = { mount: mount };
  if (document.currentScript) {
    document.addEventListener("DOMContentLoaded", function () {
      var e = document.querySelector("[data-expansion]");
      if (e && !e.__mounted) { e.__mounted = true; mount(e, {}); }
    });
  }
})();
