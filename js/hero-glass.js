/* ==========================================================================
   GILL AUTO GLASS — hero-glass.js
   Signature 3D element: a windshield "spiderweb" of glass shards that starts
   shattered and resolves into a clean pane as the visitor scrolls
   ("we make it whole again"). Healing runs outside-in, finishing at the
   stone-chip impact point (gold glint), which fades as the pane completes.

   Loaded on demand by main.js ONLY when:
     - prefers-reduced-motion is NOT set, and
     - WebGL is available, and
     - the Three.js CDN loaded.
   Otherwise the static SVG fallback in index.html remains visible.

   Performance budget honoured here:
     - single WebGL canvas, DPR capped at 1.5
     - rendering pauses when the hero is off-screen or the tab is hidden
   ========================================================================== */

(function () {
  "use strict";

  window.initHeroGlass = function (container, opts) {
    if (!container || !window.THREE) return;
    opts = opts || {};

    /* ---------- renderer / scene / camera ---------- */
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    // DPR cap: 1.5 desktop, 1.25 on narrow screens to protect mobile framerate
    const dprCap = (container.clientWidth || window.innerWidth) < 700 ? 1.25 : 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(0, 0, 8);

    // Soft sky/ground fill so shard faces shade gradually, not flat.
    // (Doubles as the ambient term — one light fewer per fragment.)
    scene.add(new THREE.HemisphereLight(0xcfe0f2, 0x16281e, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(2.5, 3, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xe8b426, 0.22); // faint gold rim
    rim.position.set(-3, -2, 4);
    scene.add(rim);

    /* Tiny generated cube env map — gives the glass a believable specular
       world (bright sky above, dark prairie below) at negligible cost. */
    function makeEnvMap() {
      const faces = [];
      for (let i = 0; i < 6; i++) {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const g = c.getContext("2d");
        const grad = g.createLinearGradient(0, 0, 0, 64);
        grad.addColorStop(0, "#e8f0f8");
        grad.addColorStop(0.45, "#48678a");
        grad.addColorStop(1, "#0a1c30");
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        faces.push(c);
      }
      // hot glint on the top face, like low prairie sun
      const top = faces[2].getContext("2d");
      const tg = top.createRadialGradient(32, 26, 3, 32, 26, 38);
      tg.addColorStop(0, "rgba(255, 250, 235, 0.95)");
      tg.addColorStop(1, "rgba(255, 250, 235, 0)");
      top.fillStyle = tg;
      top.fillRect(0, 0, 64, 64);
      const tex = new THREE.CubeTexture(faces);
      tex.needsUpdate = true;
      return tex;
    }
    const envMap = makeEnvMap();

    const group = new THREE.Group();
    scene.add(group);

    /* Soft contact shadow behind/below the pane — reads as ambient
       occlusion so the glass sits in space instead of floating flat. */
    function shadowTexture() {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
      grad.addColorStop(0, "rgba(3, 10, 18, 0.85)");
      grad.addColorStop(0.55, "rgba(3, 10, 18, 0.38)");
      grad.addColorStop(1, "rgba(3, 10, 18, 0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    const shadowMat = new THREE.SpriteMaterial({
      map: shadowTexture(),
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const shadow = new THREE.Sprite(shadowMat);
    shadow.position.set(0.4, -0.7, -1.1);
    shadow.scale.set(5.6, 4.4, 1); // kept modest — sprite fill is the costly part
    group.add(shadow);

    /* ---------- build the spiderweb of shards ---------- */
    const SPOKES = 9;
    const RINGS = [0.4, 0.85, 1.4, 2.05, 2.8];
    const rand = (a, b) => a + Math.random() * (b - a);

    // Vertex lattice: rings x spokes, with jitter for an organic crack look.
    const lattice = RINGS.map((radius, r) =>
      Array.from({ length: SPOKES }, (_, s) => {
        const angle = (s / SPOKES) * Math.PI * 2 + rand(-0.16, 0.16) + r * 0.07;
        const rr = radius * rand(0.92, 1.08);
        return new THREE.Vector2(Math.cos(angle) * rr, Math.sin(angle) * rr);
      })
    );

    const shardMaterial = new THREE.MeshPhongMaterial({
      color: 0x9fc4e8,
      specular: 0xffffff,
      shininess: 170,               // tight, glassy highlight
      transparent: true,
      opacity: 0.17,
      envMap: envMap,               // real reflections instead of flat shading
      reflectivity: 0.5,
      combine: THREE.MixOperation,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const maxRadius = RINGS[RINGS.length - 1];
    const shards = [];

    function makeShard(points2) {
      // Centroid-relative geometry so per-shard rotation pivots naturally.
      const cx = points2.reduce((a, p) => a + p.x, 0) / points2.length;
      const cy = points2.reduce((a, p) => a + p.y, 0) / points2.length;
      const rel = points2.map((p) => new THREE.Vector3(p.x - cx, p.y - cy, 0));

      const geo = new THREE.BufferGeometry();
      const tris = [];
      for (let i = 1; i < rel.length - 1; i++) tris.push(rel[0], rel[i], rel[i + 1]);
      geo.setFromPoints(tris);
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, shardMaterial);

      // Shard edge outline, parented so it moves with the shard.
      // Kept faint — the fine branching cracks below carry the fracture look.
      const lineGeo = new THREE.BufferGeometry().setFromPoints(rel.concat([rel[0]]));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xdcecff,
        transparent: true,
        opacity: 0.3
      });
      mesh.add(new THREE.Line(lineGeo, lineMat));

      const dist = Math.hypot(cx, cy) / maxRadius; // 0 at impact, 1 at edge
      const out = new THREE.Vector2(cx, cy).normalize();

      shards.push({
        mesh,
        lineMat,
        home: new THREE.Vector3(cx, cy, 0),
        // Shattered state: pushed out and toward the camera, tumbled.
        burst: new THREE.Vector3(
          cx + out.x * rand(0.15, 0.5) * (0.4 + dist),
          cy + out.y * rand(0.15, 0.5) * (0.4 + dist),
          rand(0.35, 1.5) * (0.5 + dist)
        ),
        tumble: new THREE.Euler(rand(-0.9, 0.9), rand(-0.9, 0.9), rand(-0.6, 0.6)),
        // Outside-in healing: edge shards settle first, impact-point last.
        delay: (1 - dist) * 0.45
      });
      group.add(mesh);
    }

    // Inner triangles around the impact point.
    for (let s = 0; s < SPOKES; s++) {
      makeShard([new THREE.Vector2(0, 0), lattice[0][s], lattice[0][(s + 1) % SPOKES]]);
    }
    // Ring quads.
    for (let r = 0; r < RINGS.length - 1; r++) {
      for (let s = 0; s < SPOKES; s++) {
        const s2 = (s + 1) % SPOKES;
        makeShard([lattice[r][s], lattice[r][s2], lattice[r + 1][s2], lattice[r + 1][s]]);
      }
    }

    /* ---------- fine branching fracture cracks ----------
       Real windshield damage isn't a tidy polygon web: thin cracks wander
       and fork as they radiate from the chip. One LineSegments = one draw
       call, so this detail is essentially free. Fades as the pane heals. */
    function buildFineCracks() {
      const pts = [];
      const MAIN = 12;
      for (let i = 0; i < MAIN; i++) {
        let angle = (i / MAIN) * Math.PI * 2 + rand(-0.14, 0.14);
        let x = Math.cos(angle) * 0.05;
        let y = Math.sin(angle) * 0.05;
        const steps = 12 + Math.floor(rand(0, 5));
        const step = (maxRadius * rand(0.5, 1.0)) / steps;
        for (let sIdx = 0; sIdx < steps; sIdx++) {
          angle += rand(-0.16, 0.16); // wander
          const nx = x + Math.cos(angle) * step;
          const ny = y + Math.sin(angle) * step;
          pts.push(x, y, 0, nx, ny, 0);
          if (sIdx > 1 && Math.random() < 0.28) {
            // fork a shorter branch off the main crack
            let ba = angle + (Math.random() < 0.5 ? 1 : -1) * rand(0.35, 0.85);
            let bx = nx, by = ny;
            const bSteps = 2 + Math.floor(rand(0, 3));
            const bStep = step * rand(0.45, 0.75);
            for (let b = 0; b < bSteps; b++) {
              ba += rand(-0.22, 0.22);
              const cx2 = bx + Math.cos(ba) * bStep;
              const cy2 = by + Math.sin(ba) * bStep;
              pts.push(bx, by, 0, cx2, cy2, 0);
              bx = cx2; by = cy2;
            }
          }
          x = nx; y = ny;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      return geo;
    }
    const fineCrackMat = new THREE.LineBasicMaterial({
      color: 0xeaf4ff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    const fineCracks = new THREE.LineSegments(buildFineCracks(), fineCrackMat);
    fineCracks.position.z = 0.015;
    group.add(fineCracks);

    /* ---------- gold "stone chip" glint at the impact point ---------- */
    function glintTexture() {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(240, 194, 74, 1)");
      grad.addColorStop(0.35, "rgba(232, 180, 38, 0.55)");
      grad.addColorStop(1, "rgba(232, 180, 38, 0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    }
    const glintMat = new THREE.SpriteMaterial({
      map: glintTexture(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const glint = new THREE.Sprite(glintMat);
    glint.position.set(0, 0, 0.05);
    glint.scale.set(0.55, 0.55, 1);
    group.add(glint);

    // Base pose: a windshield-like rake toward the viewer.
    group.rotation.x = -0.28;
    group.rotation.y = 0.35;

    /* ---------- scroll progress (0 = shattered, 1 = whole) ---------- */
    let targetProgress = 0;
    let progress = 0;

    const hero = container.closest("section") || container;
    if (opts.hasScrollTrigger) {
      ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => { targetProgress = self.progress; }
      });
    } else {
      const onScroll = () => {
        const h = hero.offsetHeight || window.innerHeight;
        targetProgress = Math.min(1, Math.max(0, window.scrollY / h));
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    /* ---------- layout: hug the right on wide screens, recede on mobile ---------- */
    function layout() {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (camera.aspect > 1.05) {          // desktop: beside the copy
        group.position.set(2.3, 0.1, 0);
        group.scale.setScalar(1);
        shardMaterial.opacity = 0.16;
      } else {                              // portrait: behind the copy, quieter
        group.position.set(0.4, 1.15, -0.5);
        group.scale.setScalar(0.66);
        shardMaterial.opacity = 0.1;
      }
    }
    layout();
    window.addEventListener("resize", layout);

    /* ---------- render loop, paused off-screen ---------- */
    let running = false;
    let rafId = 0;
    let t = 0;
    let revealedFallback = false;

    function frame() {
      if (!running) return;
      t += 0.016;
      progress += (targetProgress - progress) * 0.09; // smooth toward scroll target

      for (const s of shards) {
        // Per-shard eased progress with outside-in stagger.
        const local = easeOutCubic(Math.min(1, Math.max(0, (progress - s.delay) / 0.55)));
        s.mesh.position.lerpVectors(s.burst, s.home, local);
        s.mesh.rotation.set(
          s.tumble.x * (1 - local),
          s.tumble.y * (1 - local),
          s.tumble.z * (1 - local)
        );
        // Shard outlines fade as the glass heals (never fully vanish — glass is real).
        s.lineMat.opacity = 0.3 - 0.27 * local;
      }

      // Fine fracture web: strongest while broken, gone when whole.
      fineCrackMat.opacity = 0.55 * (1 - progress) * (1 - progress) + 0.02;

      // Contact shadow: spread and heavy under floating shards, tighter and
      // lighter once the pane sits whole.
      shadowMat.opacity = 0.45 - 0.22 * progress;
      const sSpread = 1 + 0.18 * (1 - progress);
      shadow.scale.set(5.6 * sSpread, 4.4 * sSpread, 1);

      // Chip glint: pulses while shattered, dies away as the pane completes.
      const glow = (1 - progress) * (0.65 + 0.35 * Math.sin(t * 2.4));
      glintMat.opacity = 0.12 + 0.78 * glow;
      glint.scale.setScalar(0.4 + 0.25 * glow);

      // Gentle idle drift so the pane feels alive without being busy.
      group.rotation.y = 0.35 + Math.sin(t * 0.4) * 0.05;
      group.rotation.x = -0.28 + Math.cos(t * 0.33) * 0.03;

      renderer.render(scene, camera);

      if (!revealedFallback) {
        revealedFallback = true;
        if (opts.fallbackEl) opts.fallbackEl.style.display = "none";
      }
      rafId = requestAnimationFrame(frame);
    }

    function setRunning(on) {
      if (on && !running) {
        running = true;
        rafId = requestAnimationFrame(frame);
      } else if (!on && running) {
        running = false;
        cancelAnimationFrame(rafId);
      }
    }

    let heroInView = true;
    const io = new IntersectionObserver((entries) => {
      heroInView = entries[0].isIntersecting;
      setRunning(heroInView && !document.hidden);
    }, { threshold: 0 });
    io.observe(hero);

    document.addEventListener("visibilitychange", () => {
      setRunning(heroInView && !document.hidden);
    });

    setRunning(true);
  };
})();
