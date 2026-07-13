/* storefront.js — a cute low-poly business that grows from $0 to a funded
   $150,000 with a confetti finale that spills past the frame. Three.js r128,
   procedural geometry, transparent background.

   Reusable: NABStorefront.mount(containerEl, opts) -> { replay, dispose }.
   The standalone page and the in-app celebration both call mount(). */
(function () {
  "use strict";

  var STYLE_ID = "bank-storefront-style";
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      ".sf-root{position:relative;width:100%;height:100%;cursor:pointer;-webkit-user-select:none;user-select:none;}" +
      ".sf-root canvas.sf-gl{display:block;width:100%;height:100%;}" +
      ".sf-counter{position:absolute;top:14px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:1px;padding:9px 22px 11px;border-radius:20px;background:rgba(255,250,239,.88);backdrop-filter:blur(6px);box-shadow:0 10px 26px -10px rgba(180,120,80,.5),inset 0 1px 0 rgba(255,255,255,.7);pointer-events:none;text-align:center;font-family:'Nunito',ui-rounded,'Segoe UI',system-ui,sans-serif;}" +
      ".sf-counter .sf-lbl{font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#C58A6A;}" +
      ".sf-counter .sf-amt{font-size:27px;font-weight:900;letter-spacing:-1px;line-height:1;color:#FF8F87;font-variant-numeric:tabular-nums;}" +
      ".sf-hint{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:700;color:#C9A07E;opacity:0;transition:opacity .5s ease;pointer-events:none;white-space:nowrap;font-family:'Nunito',ui-rounded,system-ui,sans-serif;}" +
      ".sf-hint.show{opacity:1;}" +
      ".sf-confetti{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:120;overflow:visible;}";
    document.head.appendChild(s);
  }

  function mount(container, opts) {
    opts = opts || {};
    var T = window.THREE;
    if (!T) { console.warn("Three.js not loaded"); return { replay: function () {}, dispose: function () {} }; }
    injectStyle();
    var REDUCED = opts.reducedMotion != null ? opts.reducedMotion
      : (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    container.classList.add("sf-root");
    var counterEl = document.createElement("div");
    counterEl.className = "sf-counter";
    counterEl.innerHTML = '<span class="sf-lbl">' + (opts.label || "Loan funded") + '</span><span class="sf-amt">$0</span>';
    var amtEl = counterEl.querySelector(".sf-amt");
    var hintEl = document.createElement("div");
    hintEl.className = "sf-hint"; hintEl.textContent = "Click to replay";
    container.appendChild(counterEl); container.appendChild(hintEl);

    var TARGET = opts.amount || 150000;

    /* ---------- palette ---------- */
    var C = {
      mint: 0x9FE3C5, blush: 0xFFC2DD, coral: 0xFF8F87, butter: 0xFFE066,
      sky: 0xA9DCFF, cream: 0xFFF2D6, wood: 0xCF9B6B, walk: 0xFBE9CF,
      leaf: 0x86D6AE, leafDk: 0x6FC79B, white: 0xFFF7EA, brown: 0x8a5a3a
    };
    var CONFETTI_COLORS = [C.mint, C.blush, C.coral, C.butter, C.sky, 0xffffff];

    /* ---------- renderer / scene / camera ---------- */
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.domElement.className = "sf-gl";
    container.appendChild(renderer.domElement);

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(7.0, 5.2, 8.6);
    camera.lookAt(0, 2.0, 0);

    var world = new T.Group(); scene.add(world);
    var building = new T.Group(); world.add(building);

    var hemi = new T.HemisphereLight(0xffffff, C.walk, 0.62); scene.add(hemi);
    var key = new T.DirectionalLight(0xFFE9C8, 0.78);
    key.position.set(6.5, 10, 7); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1; key.shadow.camera.far = 40;
    key.shadow.camera.left = -12; key.shadow.camera.right = 12;
    key.shadow.camera.top = 12; key.shadow.camera.bottom = -12;
    key.shadow.radius = 6; key.shadow.bias = -0.0006; scene.add(key);
    var fill = new T.DirectionalLight(0xCDE8FF, 0.18); fill.position.set(-7, 4, 3); scene.add(fill);

    /* ---------- geometry helpers ---------- */
    var disposables = [];
    function track(g) { disposables.push(g); return g; }
    function roundedBox(w, h, d, r, seg) {
      seg = seg || 4; r = Math.min(r, w / 2, h / 2, d / 2);
      var g = new T.BoxGeometry(w, h, d, seg, seg, seg);
      var pos = g.attributes.position;
      var ax = w / 2 - r, ay = h / 2 - r, az = d / 2 - r;
      var v = new T.Vector3(), inner = new T.Vector3(), n = new T.Vector3(), norms = [];
      for (var i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        inner.set(Math.max(-ax, Math.min(ax, v.x)), Math.max(-ay, Math.min(ay, v.y)), Math.max(-az, Math.min(az, v.z)));
        n.copy(v).sub(inner);
        if (n.lengthSq() < 1e-9) n.copy(v).normalize(); else n.normalize();
        v.copy(inner).addScaledVector(n, r);
        pos.setXYZ(i, v.x, v.y, v.z); norms.push(n.x, n.y, n.z);
      }
      g.setAttribute("normal", new T.Float32BufferAttribute(norms, 3));
      pos.needsUpdate = true; g.computeBoundingSphere();
      return track(g);
    }
    function mat(color, flat) { return track(new T.MeshStandardMaterial({ color: color, roughness: 0.96, metalness: 0.0, flatShading: !!flat })); }
    function mesh(geo, m) { var x = new T.Mesh(geo, m); x.castShadow = true; x.receiveShadow = true; return x; }

    var parts = [];
    function addPart(content, x, y, z, baseY, appear, dur) {
      var g = new T.Group(); g.position.set(x, y, z); g.add(content); building.add(g);
      g.scale.setScalar(REDUCED ? 1 : 0.0001); g.visible = REDUCED;
      g.userData.base = baseY;
      parts.push({ group: g, appear: appear, dur: dur, puffed: REDUCED, base: baseY });
      return g;
    }
    function fromBottom(m, h) { var c = new T.Group(); m.position.y = h / 2; c.add(m); return c; }
    function windowPane(w, h) {
      var grp = new T.Group();
      var frame = mesh(roundedBox(w, h, 0.22, 0.08, 3), mat(C.white));
      var glass = mesh(roundedBox(w - 0.22, h - 0.22, 0.16, 0.06, 3), mat(C.sky, true));
      glass.position.z = 0.12; grp.add(frame); grp.add(glass); return grp;
    }
    function awning(width, color) {
      var grp = new T.Group();
      var slats = Math.max(4, Math.round(width / 0.45)), sw = width / slats;
      for (var i = 0; i < slats; i++) {
        var col = i % 2 === 0 ? color : C.cream;
        var s = mesh(roundedBox(sw * 0.96, 0.16, 1.0, 0.06, 2), mat(col));
        s.position.x = -width / 2 + sw * (i + 0.5); grp.add(s);
      }
      var lip = mesh(roundedBox(width, 0.22, 0.16, 0.08, 2), mat(color));
      lip.position.set(0, -0.02, 0.5); grp.add(lip);
      grp.rotation.x = 0.46; return grp;
    }
    function heart(s) {
      var grp = new T.Group(), m = mat(C.coral, true);
      var sg = track(new T.SphereGeometry(s * 0.5, 12, 10));
      var a = mesh(sg, m); a.position.set(-s * 0.32, s * 0.22, 0);
      var b = mesh(sg, m); b.position.set(s * 0.32, s * 0.22, 0);
      var tip = mesh(track(new T.ConeGeometry(s * 0.62, s * 0.9, 12)), m);
      tip.position.set(0, -s * 0.34, 0); tip.rotation.z = Math.PI;
      grp.add(a); grp.add(b); grp.add(tip); return grp;
    }
    function coffeeCup(s) {
      var grp = new T.Group();
      var cup = mesh(track(new T.CylinderGeometry(s * 0.42, s * 0.34, s * 0.8, 16)), mat(C.white, true));
      var handle = mesh(track(new T.TorusGeometry(s * 0.26, s * 0.09, 8, 16)), mat(C.white, true));
      handle.position.set(s * 0.5, 0, 0); handle.rotation.y = Math.PI / 2;
      var brew = mesh(track(new T.CylinderGeometry(s * 0.36, s * 0.36, s * 0.08, 16)), mat(C.brown, true));
      brew.position.y = s * 0.36;
      grp.add(cup); grp.add(handle); grp.add(brew); return grp;
    }
    function signBoard(w, h, color, motif) {
      var grp = new T.Group();
      grp.add(mesh(roundedBox(w, h, 0.2, 0.1, 3), mat(color)));
      if (motif) { motif.position.z = 0.2; grp.add(motif); } return grp;
    }
    function planter() {
      var grp = new T.Group();
      var pot = mesh(roundedBox(0.7, 0.5, 0.7, 0.12, 3), mat(C.coral)); pot.position.y = 0.25;
      var bush = mesh(track(new T.IcosahedronGeometry(0.42, 0)), mat(C.leaf, true)); bush.position.y = 0.78; bush.scale.y = 0.85;
      grp.add(pot); grp.add(bush); return grp;
    }

    /* ---------- ground ---------- */
    var ground = new T.Group(); building.add(ground);
    var walk = mesh(roundedBox(11.5, 0.5, 6.4, 0.3, 3), mat(C.walk)); walk.position.y = -0.25; walk.castShadow = false; ground.add(walk);
    var grass = mesh(roundedBox(3.0, 0.18, 2.2, 0.4, 3), mat(C.leaf)); grass.position.set(4.0, 0.02, 0.6); grass.castShadow = false; ground.add(grass);
    if (!REDUCED) ground.scale.setScalar(0.0001);
    ground.userData.base = 0;
    parts.push({ group: ground, appear: 0.0, dur: 0.55, puffed: REDUCED, base: 0 });

    /* ---------- STAGE 1: single shop ---------- */
    var SX = -1.95, g1w = 3.1, g1h = 2.5, g1d = 2.7;
    addPart(fromBottom(mesh(roundedBox(g1w, g1h, g1d, 0.28, 4), mat(C.cream)), g1h), SX, 0, 0, 0, 0.30, 0.7);
    addPart(fromBottom(mesh(roundedBox(0.9, 1.5, 0.2, 0.12, 3), mat(C.coral)), 1.5), SX, 0, g1d / 2 + 0.02, 0, 1.15, 0.45);
    addPart(windowPane(0.92, 1.0), SX - 1.0, 1.15, g1d / 2 + 0.02, 0, 1.30, 0.42);
    addPart(windowPane(0.92, 1.0), SX + 1.0, 1.15, g1d / 2 + 0.02, 0, 1.42, 0.42);
    addPart(awning(g1w + 0.2, C.coral), SX, g1h - 0.18, g1d / 2 + 0.1, 0, 1.00, 0.5);
    addPart(signBoard(1.7, 0.7, C.butter, coffeeCup(0.6)), SX, g1h + 0.55, g1d / 2 - 0.1, 0, 1.70, 0.5);

    /* ---------- STAGE 2: second floor ---------- */
    var f2h = 1.9;
    addPart(fromBottom(mesh(roundedBox(g1w - 0.12, f2h, g1d - 0.12, 0.26, 4), mat(C.blush)), f2h), SX, g1h, 0, g1h, 2.60, 0.7);
    addPart(windowPane(0.8, 0.9), SX - 0.85, g1h + 0.78, g1d / 2 - 0.04, 0, 3.20, 0.4);
    addPart(windowPane(0.8, 0.9), SX + 0.85, g1h + 0.78, g1d / 2 - 0.04, 0, 3.34, 0.4);
    var roof2 = new T.Group();
    var roofCone = mesh(track(new T.ConeGeometry(2.5, 1.2, 4)), mat(C.coral, true));
    roofCone.rotation.y = Math.PI / 4; roofCone.position.y = 0.6;
    var finial = mesh(track(new T.SphereGeometry(0.16, 10, 8)), mat(C.butter, true)); finial.position.y = 1.24;
    roof2.add(roofCone); roof2.add(finial);
    addPart(roof2, SX, g1h + f2h, 0, g1h + f2h, 3.05, 0.5);
    var box2 = new T.Group();
    box2.add(mesh(roundedBox(1.9, 0.34, 0.34, 0.1, 3), mat(C.wood)));
    var pf1 = mesh(track(new T.IcosahedronGeometry(0.26, 0)), mat(C.leaf, true)); pf1.position.set(-0.5, 0.26, 0);
    var pf2 = mesh(track(new T.IcosahedronGeometry(0.26, 0)), mat(C.blush, true)); pf2.position.set(0.1, 0.28, 0);
    var pf3 = mesh(track(new T.IcosahedronGeometry(0.24, 0)), mat(C.leaf, true)); pf3.position.set(0.6, 0.25, 0);
    box2.add(pf1); box2.add(pf2); box2.add(pf3);
    addPart(box2, SX, g1h + 0.34, g1d / 2 + 0.05, 0, 3.55, 0.4);

    /* ---------- STAGE 3: second storefront + decoration ---------- */
    var SX2 = 1.75, s2w = 2.9, s2h = 2.7, s2d = 2.6;
    addPart(fromBottom(mesh(roundedBox(s2w, s2h, s2d, 0.28, 4), mat(C.mint)), s2h), SX2, 0, 0, 0, 4.30, 0.7);
    addPart(fromBottom(mesh(roundedBox(s2w + 0.1, 0.4, s2d + 0.1, 0.18, 3), mat(C.coral)), 0.4), SX2, s2h, 0, s2h, 4.55, 0.5);
    addPart(fromBottom(mesh(roundedBox(0.9, 1.5, 0.2, 0.12, 3), mat(C.wood)), 1.5), SX2 + 0.55, 0, s2d / 2 + 0.02, 0, 4.95, 0.42);
    addPart(windowPane(1.0, 1.1), SX2 - 0.75, 1.2, s2d / 2 + 0.02, 0, 5.00, 0.42);
    addPart(awning(s2w + 0.1, C.butter), SX2, s2h - 0.2, s2d / 2 + 0.1, 0, 4.80, 0.5);
    addPart(signBoard(1.5, 0.66, C.coral, heart(0.5)), SX2, s2h + 0.5, s2d / 2 - 0.1, 0, 5.20, 0.45);
    var tree = new T.Group();
    var trunk = mesh(track(new T.CylinderGeometry(0.22, 0.3, 1.5, 9)), mat(C.wood, true)); trunk.position.y = 0.75;
    var f_a = mesh(track(new T.IcosahedronGeometry(0.95, 0)), mat(C.leaf, true)); f_a.position.y = 1.85;
    var f_b = mesh(track(new T.IcosahedronGeometry(0.7, 0)), mat(C.leafDk, true)); f_b.position.set(0.45, 1.5, 0.2);
    var f_c = mesh(track(new T.IcosahedronGeometry(0.62, 0)), mat(C.leaf, true)); f_c.position.set(-0.4, 1.55, -0.1);
    tree.add(trunk); tree.add(f_a); tree.add(f_b); tree.add(f_c);
    addPart(tree, 4.0, 0, 0.55, 0, 5.05, 0.6);
    addPart(planter(), SX - 1.7, 0, g1d / 2 + 0.2, 0, 5.30, 0.4);
    addPart(planter(), SX2 + 1.55, 0, s2d / 2 + 0.15, 0, 5.45, 0.4);

    var FINALE = 6.25, HOLD = 1.25;

    /* ---------- dust puffs ---------- */
    var puffs = [], puffGeo = track(new T.RingGeometry(0.18, 0.42, 18));
    function spawnPuff(g) {
      var m = new T.MeshBasicMaterial({ color: C.white, transparent: true, opacity: 0.7, side: T.DoubleSide, depthWrite: false });
      var ring = new T.Mesh(puffGeo, m); ring.rotation.x = -Math.PI / 2;
      ring.position.set(g.position.x, (g.userData.base || 0) + 0.06, g.position.z);
      building.add(ring); puffs.push({ mesh: ring, age: 0, life: 0.55 });
    }
    function updatePuffs(dt) {
      for (var i = puffs.length - 1; i >= 0; i--) {
        var p = puffs[i]; p.age += dt; var k = p.age / p.life;
        if (k >= 1) { building.remove(p.mesh); p.mesh.material.dispose(); puffs.splice(i, 1); continue; }
        p.mesh.scale.setScalar(0.5 + k * 2.4); p.mesh.material.opacity = 0.7 * (1 - k);
      }
    }

    /* ---------- confetti (escapes the frame, on document.body) ---------- */
    var confEl = document.createElement("canvas"); confEl.className = "sf-confetti";
    document.body.appendChild(confEl);
    var cctx = confEl.getContext("2d");
    var confetti = [];
    function sizeConfetti() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      confEl.width = Math.floor(window.innerWidth * dpr); confEl.height = Math.floor(window.innerHeight * dpr);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function hex(n) { return "#" + ("000000" + n.toString(16)).slice(-6); }
    function burstConfetti() {
      var v = new T.Vector3(0.2, 5.6, 0.6); building.localToWorld(v); v.project(camera);
      var rect = renderer.domElement.getBoundingClientRect();
      var ox = (v.x * 0.5 + 0.5) * rect.width + rect.left;
      var oy = (-v.y * 0.5 + 0.5) * rect.height + rect.top;
      for (var i = 0; i < 180; i++) {
        var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.0, spd = 7 + Math.random() * 13;
        confetti.push({
          x: ox + (Math.random() - 0.5) * 44, y: oy + (Math.random() - 0.5) * 30,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - (3 + Math.random() * 5),
          w: 7 + Math.random() * 7, h: 9 + Math.random() * 9,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.5,
          color: hex(CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0]),
          flip: Math.random() * Math.PI, vf: 0.12 + Math.random() * 0.16
        });
      }
    }
    function updateConfetti(dt) {
      cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (!confetti.length) return;
      for (var i = confetti.length - 1; i >= 0; i--) {
        var p = confetti[i];
        p.vy += 26 * dt; p.vx *= 0.992;
        p.x += p.vx * dt * 30; p.y += p.vy * dt * 30;
        p.rot += p.vr; p.flip += p.vf;
        if (p.y > window.innerHeight + 60) { confetti.splice(i, 1); continue; }
        cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot);
        cctx.scale(1, 0.35 + Math.abs(Math.cos(p.flip)) * 0.65);
        cctx.fillStyle = p.color; cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cctx.restore();
      }
    }

    /* ---------- counter + easing ---------- */
    function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
    function easeOutBack(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
    function setCounter(v) { amtEl.textContent = "$" + Math.round(v).toLocaleString("en-US"); }

    /* ---------- timeline / state ---------- */
    var tBuild = 0, phase = "build", fired = false, holdT = 0, idleT = 0;
    function resetPlay() {
      tBuild = 0; phase = "build"; fired = false; holdT = 0; confetti.length = 0;
      hintEl.classList.remove("show");
      parts.forEach(function (p) { p.puffed = false; p.group.scale.setScalar(0.0001); p.group.visible = false; });
      world.rotation.y = 0; world.position.y = 0; setCounter(0);
    }
    function onClick() { if (!REDUCED) resetPlay(); }
    container.addEventListener("click", onClick);

    if (REDUCED) {
      parts.forEach(function (p) { p.group.scale.setScalar(1); p.group.visible = true; });
      setCounter(TARGET);
    }

    /* ---------- resize ---------- */
    function resize() {
      var w = container.clientWidth || 1, h = container.clientHeight || 1;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); sizeConfetti();
    }
    var ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(container); }
    window.addEventListener("resize", resize);
    resize();

    /* ---------- loop ---------- */
    var clock = new T.Clock(), raf = 0, alive = true;
    function frame() {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      var dt = Math.min(clock.getDelta(), 0.1);
      if (!REDUCED) {
        if (phase === "build") {
          tBuild += dt;
          parts.forEach(function (p) {
            var pr = (tBuild - p.appear) / p.dur;
            if (pr <= 0) { p.group.visible = false; return; }
            p.group.visible = true;
            p.group.scale.setScalar(Math.max(0.0001, pr >= 1 ? 1 : easeOutBack(pr)));
            if (!p.puffed) { p.puffed = true; spawnPuff(p.group); }
          });
          setCounter(easeInOut(Math.min(tBuild / FINALE, 1)) * TARGET);
          world.rotation.y = Math.sin(tBuild * 0.5) * 0.05;
          if (tBuild >= FINALE) {
            if (!fired) { fired = true; setCounter(TARGET); burstConfetti(); if (opts.onComplete) opts.onComplete(); }
            phase = "hold"; holdT = 0;
          }
        } else if (phase === "hold") {
          holdT += dt; world.position.y = Math.sin(holdT * 3) * 0.04;
          if (holdT >= HOLD) { phase = "idle"; idleT = 0; hintEl.classList.add("show"); }
        } else {
          idleT += dt; world.rotation.y += dt * 0.16; world.position.y = Math.sin(idleT * 1.1) * 0.05;
        }
        updatePuffs(dt); updateConfetti(dt);
      }
      renderer.render(scene, camera);
    }
    frame();

    return {
      replay: resetPlay,
      dispose: function () {
        alive = false; cancelAnimationFrame(raf);
        container.removeEventListener("click", onClick);
        window.removeEventListener("resize", resize);
        if (ro) ro.disconnect();
        disposables.forEach(function (d) { try { d.dispose(); } catch (e) {} });
        try { renderer.dispose(); } catch (e) {}
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        if (counterEl.parentNode) counterEl.parentNode.removeChild(counterEl);
        if (hintEl.parentNode) hintEl.parentNode.removeChild(hintEl);
        if (confEl.parentNode) confEl.parentNode.removeChild(confEl);
      }
    };
  }

  window.NABStorefront = { mount: mount };

  // Auto-mount for the standalone page (an element with [data-storefront]).
  if (document.currentScript) {
    document.addEventListener("DOMContentLoaded", function () {
      var el = document.querySelector("[data-storefront]");
      if (el && !el.__mounted) { el.__mounted = true; mount(el, {}); }
    });
  }
})();
