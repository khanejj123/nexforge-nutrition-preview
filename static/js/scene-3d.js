/* NEXFORGE: original procedural product geometry, rendered with local Three.js. */
const stage = document.querySelector("[data-scene-3d]");
if (stage) {
  const connection = navigator.connection;
  if (!connection?.saveData) {
    if ("IntersectionObserver" in window) {
      const loader = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loader.disconnect();
          startScene(stage).catch(() => fallback(stage));
        }
      }, { rootMargin: "120px" });
      loader.observe(stage);
    } else startScene(stage).catch(() => fallback(stage));
  }
}

function fallback(element) {
  element.classList.remove("is-ready");
  element.setAttribute("aria-hidden", "true");
  element.inert = true;
  element.dataset.sceneState = "fallback";
  element.closest(".hero")?.classList.remove("has-live-3d");
  window.dispatchEvent(new CustomEvent("nexforge:3dfallback"));
}

async function startScene(element) {
  const probe = document.createElement("canvas");
  const context = probe.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: false });
  if (!context) { fallback(element); return; }
  const THREE = await import(element.dataset.engineUrl);
  const compact = matchMedia("(max-width: 900px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const mount = element.querySelector("[data-scene-mount]");
  const hero = element.closest(".hero");
  const renderer = new THREE.WebGLRenderer({ canvas: probe, context, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x08090b, 0);
  probe.setAttribute("role", "img");
  probe.setAttribute("aria-label", "Pot NEXFORGE en trois dimensions. Glissez pour le faire tourner.");
  probe.setAttribute("aria-describedby", "scene-3d-instructions");
  probe.tabIndex = 0;
  mount.append(probe);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 60);
  camera.position.set(0, .75, 8.3);
  camera.lookAt(0, .02, 0);
  const resources = new Set();
  const keep = (resource) => { resources.add(resource); return resource; };
  const geometry = (value) => keep(value);
  const material = (value) => keep(value);
  const red = 0xf12d35;
  const segments = compact.matches ? 56 : 96;

  // Studio reflections built from geometry, without external HDR files.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x181a20);
  const panelGeometry = new THREE.PlaneGeometry(5, 8);
  const panelMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(5), side: THREE.DoubleSide });
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.position.set(-4, 3, 3);
  panel.lookAt(0, 0, 0);
  studio.add(panel);
  const rimMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .03, .05).multiplyScalar(4), side: THREE.DoubleSide });
  const rimPanel = new THREE.Mesh(panelGeometry, rimMaterial);
  rimPanel.position.set(3, 1, -3);
  rimPanel.lookAt(0, 0, 0);
  studio.add(rimPanel);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .06, .1, 30, { size: compact.matches ? 128 : 256 });
  scene.environment = environment.texture;
  pmrem.dispose();
  panelGeometry.dispose(); panelMaterial.dispose(); rimMaterial.dispose();

  scene.add(new THREE.HemisphereLight(0xdbe4ff, 0x17101a, 1.3));
  const key = new THREE.DirectionalLight(0xf5f5ff, 4.5);
  key.position.set(-3, 4, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb5c5e5, 1.4);
  fill.position.set(3, .5, 5);
  scene.add(fill);
  const redLight = new THREE.PointLight(red, 90, 12, 2);
  redLight.position.set(3, 1.5, -1);
  scene.add(redLight);
  const topLight = new THREE.PointLight(0xffffff, 35, 9, 2);
  topLight.position.set(-1, 4, 2);
  scene.add(topLight);

  const rig = new THREE.Group();
  scene.add(rig);
  const shellMaterial = material(new THREE.MeshStandardMaterial({ color: 0x101115, metalness: .28, roughness: .3, envMapIntensity: .9 }));
  const capMaterial = material(new THREE.MeshStandardMaterial({ color: 0x0b0c10, metalness: .3, roughness: .42, envMapIntensity: 1 }));
  const profile = [[0,-1.65],[.79,-1.65],[.96,-1.61],[1.045,-1.51],[1.07,-1.32],[1.07,.96],[1.045,1.18],[.97,1.35],[.8,1.5],[.79,1.68],[.7,1.68],[.7,1.36],[0,1.3]];
  const body = new THREE.Mesh(geometry(new THREE.LatheGeometry(profile.map(([x,y]) => new THREE.Vector2(x,y)), segments)), shellMaterial);
  rig.add(body);
  const lid = new THREE.Group();
  rig.add(lid);
  const capProfile = [[0,1.58],[.78,1.58],[.88,1.63],[.905,1.69],[.905,1.95],[.87,2.01],[0,2.01]];
  lid.add(new THREE.Mesh(geometry(new THREE.LatheGeometry(capProfile.map(([x,y]) => new THREE.Vector2(x,y)), segments)), capMaterial));
  const ribCount = compact.matches ? 56 : 84;
  const ribs = new THREE.InstancedMesh(geometry(new THREE.BoxGeometry(.019, .235, .027)), capMaterial, ribCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < ribCount; i++) {
    const angle = i / ribCount * Math.PI * 2;
    dummy.position.set(Math.sin(angle) * .906, 1.81, Math.cos(angle) * .906);
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix();
    ribs.setMatrixAt(i, dummy.matrix);
  }
  lid.add(ribs);
  function trimRing(radius, y, mat, parent = rig, thickness = .012) {
    const mesh = new THREE.Mesh(geometry(new THREE.TorusGeometry(radius, thickness, 6, segments)), mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = y;
    parent.add(mesh);
    return mesh;
  }
  const accentMaterial = material(new THREE.MeshStandardMaterial({ color: red, roughness: .3, metalness: .45, emissive: red, emissiveIntensity: .13 }));
  trimRing(.889, 1.66, accentMaterial, lid, .018);
  trimRing(.875, 1.995, shellMaterial, lid, .014);
  trimRing(1.045, -1.49, capMaterial, rig, .024);
  trimRing(.8, 1.52, capMaterial);
  const logo = await loadLogo(element.dataset.logoUrl);
  const designs = {
    whey: { name: "Whey Signature", label: "WHEY", scale: new THREE.Vector3(1, 1, 1) },
    creatine: { name: "Creatine Essential", label: "CREATINE", scale: new THREE.Vector3(.95, .88, .95) },
    daily: { name: "Daily Foundation", label: "DAILY", scale: new THREE.Vector3(.7, .95, .7) }
  };
  for (const design of Object.values(designs)) {
    design.texture = keep(makeLabel(THREE, design.label, logo, compact.matches ? 1024 : 2048));
    design.texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
  }
  const labelMaterial = material(new THREE.MeshStandardMaterial({ color: 0xffffff, map: designs.whey.texture, roughness: .6, metalness: .08, emissive: 0xffffff, emissiveMap: designs.whey.texture, emissiveIntensity: .08 }));
  rig.add(new THREE.Mesh(geometry(new THREE.CylinderGeometry(1.076, 1.076, 2.23, segments, 1, true, -Math.PI)), labelMaterial));

  // The plinth, orbit and particles are real geometry in the same depth space.
  const plinth = new THREE.Group();
  scene.add(plinth);
  const floorMaterial = material(new THREE.MeshStandardMaterial({ color: 0x111016, metalness: .45, roughness: .46 }));
  const disc = new THREE.Mesh(geometry(new THREE.CylinderGeometry(2.1, 2.18, .09, segments)), floorMaterial);
  disc.position.y = -2.1;
  plinth.add(disc);
  const neonMaterial = material(new THREE.MeshBasicMaterial({ color: red, transparent: true, opacity: .78, toneMapped: false }));
  trimRing(2.13, -2.08, neonMaterial, plinth, .014);
  const outerRing = trimRing(2.4, -2.16, material(new THREE.MeshBasicMaterial({ color: red, transparent: true, opacity: .18 })), plinth, .006);
  const orbit = new THREE.Mesh(geometry(new THREE.TorusGeometry(2.18, .007, 5, 150, Math.PI * 1.58)), material(new THREE.MeshBasicMaterial({ color: red, transparent: true, opacity: .32, toneMapped: false })));
  orbit.position.set(0, .12, -.45);
  orbit.rotation.set(.8, .25, -.4);
  scene.add(orbit);
  const ticks = new THREE.InstancedMesh(geometry(new THREE.BoxGeometry(.018, .012, .10)), material(new THREE.MeshBasicMaterial({ color: 0x6c353e })), 64);
  for (let i = 0; i < 64; i++) {
    const angle = i / 64 * Math.PI * 2;
    dummy.position.set(Math.sin(angle) * 2.26, -2.11, Math.cos(angle) * 2.26);
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix(); ticks.setMatrixAt(i, dummy.matrix);
  }
  plinth.add(ticks);
  const particleCount = compact.matches ? 40 : 90;
  const positions = new Float32Array(particleCount * 3);
  let seed = 1987;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < particleCount; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 2 + random() * 1.5;
    positions[i*3] = Math.sin(angle) * radius;
    positions[i*3+1] = (random() - .5) * 5;
    positions[i*3+2] = Math.cos(angle) * radius - 1;
  }
  const particleGeometry = geometry(new THREE.BufferGeometry());
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(particleGeometry, material(new THREE.PointsMaterial({ color: red, size: compact.matches ? .025 : .019, transparent: true, opacity: .5, depthWrite: false, toneMapped: false })));
  scene.add(particles);

  let localPaused = false;
  let inView = true;
  let disposed = false;
  let contextLost = false;
  let frame = 0;
  let last = 0;
  let time = 0;
  let lastPaint = 0;
  let yaw = -.12;
  let tilt = .025;
  let hoverX = 0, hoverY = 0;
  let exploded = false;
  let opening = 0;
  let holdUntil = 0;
  let selected = "whey";
  let drag = null;
  let baseCameraZ = 8.3;
  const pauseButton = element.querySelector("[data-scene-pause]");
  const explodeButton = element.querySelector("[data-scene-explode]");
  const motionAllowed = () => !reduced.matches && document.documentElement.dataset.motion !== "off";
  const running = () => !disposed && !contextLost && inView && !document.hidden && !localPaused && motionAllowed();
  const render = () => { if (!disposed && !contextLost) renderer.render(scene, camera); };
  function pose(animate = false, delta = 1) {
    const amount = animate ? Math.min(1, delta * 7) : 1;
    rig.scale.lerp(designs[selected].scale, amount);
    opening = THREE.MathUtils.lerp(opening, exploded ? .92 : 0, amount);
    camera.position.z = baseCameraZ + opening * 1.25;
    camera.lookAt(0, .02 + opening * .26, 0);
    lid.position.y = opening;
    lid.rotation.y = opening * .35;
    rig.position.y = .13 + (animate ? Math.sin(time * 1.35) * .16 : 0);
    rig.rotation.set(tilt + hoverY, yaw + hoverX, -.085 + (animate ? Math.sin(time * .7) * .045 : 0));
    redLight.position.x = 2.8 + (animate ? Math.sin(time * .6) * .9 : 0);
    redLight.position.z = -.2 + (animate ? Math.cos(time * .4) * 1.3 : 0);
    orbit.rotation.z = -.4 + (animate ? time * .14 : 0);
    particles.rotation.y = animate ? time * .035 : 0;
    outerRing.material.opacity = animate ? .18 + Math.sin(time * 1.1) * .06 : .18;
  }
  function tick(now) {
    frame = 0;
    if (!running()) return;
    const elapsed = now - lastPaint;
    const interval = compact.matches ? 1000 / 30 : 1000 / 45;
    if (elapsed >= interval) {
      const delta = Math.min((now - (last || now)) / 1000, .08);
      last = now; lastPaint = now; time += delta;
      if (!drag && now > holdUntil) yaw += delta * .3;
      pose(true, delta);
      render();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0; lastPaint = 0;
    const canAnimate = motionAllowed();
    pauseButton.disabled = !canAnimate;
    pauseButton.setAttribute("aria-pressed", String(localPaused || !canAnimate));
    pauseButton.setAttribute("aria-label", localPaused || !canAnimate ? "Animer la vue 3D" : "Mettre la vue 3D en pause");
    element.querySelector("[data-scene-play-symbol]").textContent = localPaused || !canAnimate ? "▷" : "Ⅱ";
    element.querySelector("[data-scene-play-label]").textContent = localPaused || !canAnimate ? "Animer" : "Pause 3D";
    element.dataset.sceneState = running() ? "running" : "paused";
    if (running()) frame = requestAnimationFrame(tick);
    else if (!canAnimate) { pose(); render(); }
  }
  function resize() {
    const box = mount.getBoundingClientRect();
    if (!box.width || !box.height || disposed) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact.matches ? 1.25 : 1.6));
    renderer.setSize(box.width, box.height, false);
    camera.aspect = box.width / box.height;
    baseCameraZ = compact.matches ? (camera.aspect < .8 ? 9.9 : 8.5) : 8.3;
    camera.position.z = baseCameraZ + opening * 1.25;
    camera.lookAt(0, .02 + opening * .26, 0);
    camera.updateProjectionMatrix();
    render();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  const visibilityObserver = new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; sync(); });
  visibilityObserver.observe(element);
  window.addEventListener("nexforge:motionchange", sync);
  document.addEventListener("visibilitychange", sync);
  reduced.addEventListener("change", sync);
  compact.addEventListener("change", resize);
  pauseButton.addEventListener("click", () => { localPaused = !localPaused; sync(); });
  explodeButton.addEventListener("click", () => {
    exploded = !exploded;
    explodeButton.setAttribute("aria-pressed", String(exploded));
    explodeButton.innerHTML = exploded ? 'Assembler <span aria-hidden="true">↙</span>' : 'Vue éclatée <span aria-hidden="true">↗</span>';
    if (!running()) { pose(); render(); }
  });
  element.querySelectorAll("[data-scene-product]").forEach((button) => button.addEventListener("click", () => {
    selected = button.dataset.sceneProduct;
    labelMaterial.map = designs[selected].texture;
    labelMaterial.emissiveMap = designs[selected].texture;
    labelMaterial.needsUpdate = true;
    yaw = -.12;
    holdUntil = performance.now() + 1600;
    element.querySelectorAll("[data-scene-product]").forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
    probe.setAttribute("aria-label", `${designs[selected].name}, concept NEXFORGE en trois dimensions. Glissez pour le faire tourner.`);
    element.querySelector("[data-scene-announcement]").textContent = `${designs[selected].name} — concept de démonstration`;
    if (!running()) { pose(); render(); }
  }));
  function turn(amount) {
    yaw += amount;
    holdUntil = performance.now() + 2200;
    pose(running(), 1); render();
  }
  element.querySelectorAll("[data-scene-turn]").forEach((button) => button.addEventListener("click", () => turn(Number(button.dataset.sceneTurn) * .4)));
  probe.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); turn(event.key === "ArrowLeft" ? -.26 : .26); }
    if (event.key === "Home") { event.preventDefault(); yaw = -.12; tilt = .025; pose(running(), 1); render(); }
    if (event.code === "Space" && motionAllowed()) { event.preventDefault(); localPaused = !localPaused; sync(); }
  });
  probe.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, yaw, tilt, active: false };
    probe.setPointerCapture(event.pointerId);
  });
  probe.addEventListener("pointermove", (event) => {
    if (drag) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.active && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) { drag.active = true; probe.classList.add("is-dragging"); }
      if (drag.active) {
        yaw = drag.yaw + dx * .008;
        if (event.pointerType === "mouse") tilt = THREE.MathUtils.clamp(drag.tilt + dy * .002, -.25, .3);
        holdUntil = performance.now() + 2000;
        if (!running()) { pose(); render(); }
      }
    } else if (event.pointerType === "mouse" && motionAllowed()) {
      const box = probe.getBoundingClientRect();
      hoverX = ((event.clientX - box.left) / box.width - .5) * .1;
      hoverY = ((event.clientY - box.top) / box.height - .5) * .06;
    }
  }, { passive: true });
  const release = () => { drag = null; probe.classList.remove("is-dragging"); };
  probe.addEventListener("pointerup", release);
  probe.addEventListener("pointercancel", release);
  probe.addEventListener("lostpointercapture", release);
  probe.addEventListener("pointerleave", () => { hoverX = hoverY = 0; });
  probe.addEventListener("webglcontextlost", (event) => {
    event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); fallback(element);
  });
  probe.addEventListener("webglcontextrestored", () => {
    contextLost = false; element.classList.add("is-ready"); element.setAttribute("aria-hidden", "false"); element.inert = false; hero.classList.add("has-live-3d"); pose(); resize(); sync();
    window.dispatchEvent(new CustomEvent("nexforge:3dready"));
  });
  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame);
    resizeObserver.disconnect(); visibilityObserver.disconnect();
    window.removeEventListener("nexforge:motionchange", sync);
    document.removeEventListener("visibilitychange", sync);
    reduced.removeEventListener("change", sync); compact.removeEventListener("change", resize);
    resources.forEach((resource) => resource.dispose());
    environment.dispose(); renderer.dispose();
  }
  window.addEventListener("pagehide", (event) => { if (!event.persisted) dispose(); });
  window.addEventListener("pageshow", () => { if (!disposed) sync(); });
  pose(); resize();
  element.classList.add("is-ready");
  element.setAttribute("aria-hidden", "false");
  element.inert = false;
  hero.classList.add("has-live-3d");
  sync();
  window.dispatchEvent(new CustomEvent("nexforge:3dready"));
}

function loadLogo(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function makeLabel(THREE, title, logo, width) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = width / 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(width / 2048, width / 2048);
  ctx.fillStyle = "#111217"; ctx.fillRect(0, 0, 2048, 1024);
  ctx.fillStyle = "#f12d35"; ctx.fillRect(0, 0, 2048, 7); ctx.fillRect(0, 1017, 2048, 7);
  for (const x of [465, 1438]) {
    ctx.fillStyle = "#d61e2b";
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 65, 0); ctx.lineTo(x - 140, 1024); ctx.lineTo(x - 205, 1024); ctx.fill();
    ctx.fillStyle = "#33343b";
    ctx.beginPath(); ctx.moveTo(x + 80, 0); ctx.lineTo(x + 86, 0); ctx.lineTo(x - 119, 1024); ctx.lineTo(x - 125, 1024); ctx.fill();
  }
  const paths = ["M0 0H104L258 134V249L0 32Z", "M0 73L96 151V393L0 315Z", "M124 174L284 307V119H546L473 190H343L378 221V386H258L124 274Z", "M350 16H620L545 87H268Z"];
  ctx.save(); ctx.translate(894, 113); ctx.scale(260/620,260/620);
  paths.forEach((path,index) => { ctx.fillStyle = index === 3 ? "#f12d35" : "#ffffff"; ctx.fill(new Path2D(path)); }); ctx.restore();
  if (logo) ctx.drawImage(logo, 295, 0, 967, 156, 704, 330, 640, 104);
  else { ctx.fillStyle = "#ffffff"; ctx.font = "900 87px Arial"; ctx.textAlign = "center"; ctx.fillText("NEXFORGE", 1024, 414); }
  ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
  ctx.font = `900 ${title === "CREATINE" ? 96 : 137}px Arial`;
  ctx.fillText(title, 1024, 652);
  ctx.fillStyle = "#f12d35"; ctx.fillRect(947, 713, 154, 5);
  ctx.fillStyle = "#b8bdc7"; ctx.font = "26px Arial";
  spaced(ctx, "SIGNATURE COLLECTION", 1024, 785, 5);
  ctx.fillStyle = "#777e8b"; ctx.font = "23px Arial";
  spaced(ctx, "CONCEPT · DEMO", 1024, 884, 7);
  for (const x of [0, 2048]) {
    ctx.fillStyle = "#d9dce3"; ctx.font = "900 45px Arial"; ctx.fillText("FORGE YOUR NEXT.", x, 430);
    ctx.fillStyle = "#f12d35"; ctx.fillRect(x - 55, 477, 110, 4);
    ctx.fillStyle = "#9198a4"; ctx.font = "24px Arial"; spaced(ctx, "OUJDA · MAROC", x, 548, 4);
    ctx.fillStyle = "#676e7b"; ctx.font = "21px Arial"; spaced(ctx, "DÉMONSTRATION", x, 616, 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function spaced(ctx, text, center, baseline, tracking) {
  const total = [...text].reduce((sum, char) => sum + ctx.measureText(char).width, 0) + (text.length - 1) * tracking;
  let x = center - total / 2;
  ctx.save(); ctx.textAlign = "left";
  for (const char of text) { ctx.fillText(char, x, baseline); x += ctx.measureText(char).width + tracking; }
  ctx.restore();
}
