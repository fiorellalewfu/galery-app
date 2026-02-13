const BASE = {
  maxDpr: 2,
  pointerRadius: 180,
  attractionStrength: 0.14,
  starSpeedMin: 0.015,
  starSpeedMax: 0.07,
  nearCursorGlowRadius: 250,
  playRadius: 190,
  mousePlayForce: 0.26,
  galaxyBandThickness: 0.13,
  galaxyBandWave: 0.18
};

const PRESETS = {
  cinematic: {
    ...BASE,
    desktopCount: 130,
    mobileCount: 80,
    reducedCount: 42,
    pointerGlowSize: 190,
    pointerGlowAlpha: 0.14,
    twinkleLow: 0.76,
    twinkleHigh: 0.24,
    coreAlphaMin: 0.18,
    coreAlphaMax: 0.7,
    haloAlpha: 0.2,
    haloSizeMul: 2.35,
    motionScale: 0.8,
    dustAlpha: 0.16,
    colorA: [246, 204, 106],
    colorB: [255, 236, 172],
    glowColor: [255, 214, 110]
  },
  fantasy: {
    ...BASE,
    desktopCount: 180,
    mobileCount: 108,
    reducedCount: 54,
    pointerGlowSize: 240,
    pointerGlowAlpha: 0.25,
    twinkleLow: 0.62,
    twinkleHigh: 0.38,
    coreAlphaMin: 0.28,
    coreAlphaMax: 0.98,
    haloAlpha: 0.36,
    haloSizeMul: 2.9,
    motionScale: 1,
    dustAlpha: 0.24,
    colorA: [248, 209, 109],
    colorB: [255, 242, 180],
    glowColor: [255, 214, 110]
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randomInRange = (min, max) => min + Math.random() * (max - min);

const mixColor = (a, b, t) => {
  const u = clamp(t, 0, 1);
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u)
  ];
};

const gaussian = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const createRingPosition = (width, height) => {
  const cx = width * 0.5;
  const cy = height * 0.52;
  const angle = Math.random() * Math.PI * 2;
  const baseRx = width * 0.48;
  const baseRy = height * 0.44;
  const thickness = Math.min(width, height) * 0.12 * gaussian();
  return {
    x: cx + Math.cos(angle) * (baseRx + thickness),
    y: cy + Math.sin(angle) * (baseRy + thickness * 0.7)
  };
};

const createBandPosition = (width, height, settings) => {
  const t = Math.random();
  const x = t * width;
  const wave = Math.sin(t * Math.PI * 2 + Math.PI * 0.2) * (height * settings.galaxyBandWave);
  const centerY = height * 0.52 + wave;
  const spread = height * settings.galaxyBandThickness;
  const y = centerY + gaussian() * spread;
  return { x, y };
};

const createStar = (width, height, settings) => {
  const angle = randomInRange(0, Math.PI * 2);
  const speed = randomInRange(settings.starSpeedMin, settings.starSpeedMax);

  let x = Math.random() * width;
  let y = Math.random() * height;
  let regionBoost = 0;

  const dice = Math.random();
  if (dice < 0.36) {
    const pos = createRingPosition(width, height);
    x = pos.x;
    y = pos.y;
    regionBoost = 0.38;
  } else if (dice < 0.62) {
    const pos = createBandPosition(width, height, settings);
    x = pos.x;
    y = pos.y;
    regionBoost = 0.24;
  } else if (dice < 0.74) {
    // Extra stars hugging the borders so the sky feels full everywhere.
    const side = Math.floor(Math.random() * 4);
    const pad = 18;
    if (side === 0) {
      x = randomInRange(-pad, width + pad);
      y = randomInRange(-pad, height * 0.16);
    } else if (side === 1) {
      x = randomInRange(width * 0.84, width + pad);
      y = randomInRange(-pad, height + pad);
    } else if (side === 2) {
      x = randomInRange(-pad, width + pad);
      y = randomInRange(height * 0.84, height + pad);
    } else {
      x = randomInRange(-pad, width * 0.16);
      y = randomInRange(-pad, height + pad);
    }
    regionBoost = 0.16;
  }

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: randomInRange(0.55, 2.2),
    alpha: randomInRange(settings.coreAlphaMin, settings.coreAlphaMax),
    twinkle: randomInRange(0, Math.PI * 2),
    twinkleSpeed: randomInRange(0.002, 0.011),
    warm: randomInRange(0.2, 1),
    regionBoost,
    driftX: 0,
    driftY: 0
  };
};

const shouldUseFinePointer = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
};

const readReducedMotion = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export function UniverseStars(options = {}) {
  const preset = options.preset === "fantasy" ? "fantasy" : "cinematic";
  const settings = { ...PRESETS[preset], ...options };

  const layer = document.createElement("canvas");
  layer.className = "universe-stars-layer";
  layer.setAttribute("aria-hidden", "true");
  const heroHost = document.querySelector(".hero");
  if (heroHost) {
    heroHost.prepend(layer);
  } else {
    document.body.prepend(layer);
  }

  const ctx = layer.getContext("2d", { alpha: true });
  if (!ctx) {
    layer.remove();
    return () => {};
  }

  let reducedMotion = readReducedMotion();
  let width = 0;
  let height = 0;
  let hostLeft = 0;
  let hostTop = 0;
  let dpr = 1;
  let stars = [];
  let rafId = 0;
  let lastTs = 0;

  const pointer = {
    active: false,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    vx: 0,
    vy: 0
  };

  const pickCount = () => {
    if (reducedMotion) return settings.reducedCount;
    return shouldUseFinePointer() ? settings.desktopCount : settings.mobileCount;
  };

  const rebuild = () => {
    stars = Array.from({ length: pickCount() }, () => createStar(width, height, settings));
  };

  const resize = () => {
    if (heroHost) {
      const rect = heroHost.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      hostLeft = rect.left;
      hostTop = rect.top;
      layer.style.position = "absolute";
      layer.style.inset = "0";
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
      hostLeft = 0;
      hostTop = 0;
      layer.style.position = "fixed";
      layer.style.inset = "0";
    }
    dpr = clamp(window.devicePixelRatio || 1, 1, settings.maxDpr);
    layer.width = Math.max(1, Math.floor(width * dpr));
    layer.height = Math.max(1, Math.floor(height * dpr));
    layer.style.width = `${width}px`;
    layer.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuild();
  };

  const onMove = (event) => {
    if (heroHost) {
      const rect = heroHost.getBoundingClientRect();
      hostLeft = rect.left;
      hostTop = rect.top;
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
    }
    const localX = event.clientX - hostLeft;
    const localY = event.clientY - hostTop;
    const inBounds = localX >= 0 && localX <= width && localY >= 0 && localY <= height;
    if (!inBounds) {
      pointer.active = false;
      return;
    }
    pointer.active = true;
    pointer.vx = clamp(localX - pointer.targetX, -24, 24);
    pointer.vy = clamp(localY - pointer.targetY, -24, 24);
    pointer.targetX = localX;
    pointer.targetY = localY;
  };

  const onLeave = () => {
    pointer.active = false;
  };

  const drawGalaxyDust = () => {
    const cx = width * 0.5;
    const cy = height * 0.52;
    const maxR = Math.max(width, height) * 0.68;
    const innerR = Math.min(width, height) * 0.28;

    const halo = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
    halo.addColorStop(0, `rgba(255, 222, 136, ${(settings.dustAlpha * 0.04).toFixed(3)})`);
    halo.addColorStop(0.46, `rgba(255, 214, 110, ${(settings.dustAlpha * 0.32).toFixed(3)})`);
    halo.addColorStop(0.72, `rgba(255, 214, 110, ${(settings.dustAlpha * 0.22).toFixed(3)})`);
    halo.addColorStop(1, "rgba(255, 214, 110, 0)");

    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    const band = ctx.createLinearGradient(0, height * 0.08, width, height * 0.92);
    band.addColorStop(0, "rgba(255, 214, 110, 0)");
    band.addColorStop(0.5, `rgba(255, 214, 110, ${(settings.dustAlpha * 0.18).toFixed(3)})`);
    band.addColorStop(1, "rgba(255, 214, 110, 0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, width, height);

    // Soft global haze so stars are visible around all edges, not only the band.
    ctx.fillStyle = `rgba(255, 214, 110, ${(settings.dustAlpha * 0.055).toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
  };

  const drawStar = (star, ts, dt) => {
    star.twinkle += star.twinkleSpeed * dt;

    const twinkleBoost = settings.twinkleLow + settings.twinkleHigh * Math.sin(star.twinkle + ts * 0.001);
    const alpha = star.alpha * twinkleBoost;
    const nearCursor = pointer.active
      ? Math.max(0, 1 - Math.hypot(pointer.x - star.x, pointer.y - star.y) / settings.nearCursorGlowRadius)
      : 0;

    const boostedAlpha = Math.min(1, alpha + nearCursor * (preset === "fantasy" ? 0.32 : 0.16) + star.regionBoost * 0.25);
    const color = mixColor(settings.colorA, settings.colorB, star.warm);

    const drawX = star.x + star.driftX;
    const drawY = star.y + star.driftY;

    ctx.beginPath();
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${boostedAlpha.toFixed(3)})`;
    ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
    ctx.fill();

    if (!reducedMotion && star.size > 1.05) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(${settings.glowColor[0]}, ${settings.glowColor[1]}, ${settings.glowColor[2]}, ${(boostedAlpha * settings.haloAlpha).toFixed(3)})`;
      ctx.arc(drawX, drawY, star.size * settings.haloSizeMul, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const tick = (ts) => {
    const dt = lastTs ? Math.min(34, ts - lastTs) : 16;
    const frame = dt / 16;
    lastTs = ts;

    if (pointer.active) {
      pointer.x += (pointer.targetX - pointer.x) * (reducedMotion ? 0.18 : 0.11);
      pointer.y += (pointer.targetY - pointer.y) * (reducedMotion ? 0.18 : 0.11);
    }
    pointer.vx *= 0.92;
    pointer.vy *= 0.92;

    ctx.clearRect(0, 0, width, height);
    drawGalaxyDust();

    if (pointer.active && !reducedMotion) {
      const glowSize = settings.pointerGlowSize;
      const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, glowSize);
      glow.addColorStop(0, `rgba(${settings.glowColor[0]}, ${settings.glowColor[1]}, ${settings.glowColor[2]}, ${settings.pointerGlowAlpha})`);
      glow.addColorStop(1, `rgba(${settings.glowColor[0]}, ${settings.glowColor[1]}, ${settings.glowColor[2]}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const star of stars) {
      if (pointer.active && !reducedMotion) {
        const dx = star.x - pointer.x;
        const dy = star.y - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < settings.playRadius) {
          const normX = dx / dist;
          const normY = dy / dist;
          const tangentX = -normY;
          const tangentY = normX;
          const influence = Math.pow(1 - dist / settings.playRadius, 2);
          const swirl = 0.18 + (Math.abs(pointer.vx) + Math.abs(pointer.vy)) * 0.01;

          star.driftX += (tangentX * pointer.vx * swirl + (pointer.x - star.x) * 0.0035) * influence * settings.mousePlayForce;
          star.driftY += (tangentY * pointer.vy * swirl + (pointer.y - star.y) * 0.0035) * influence * settings.mousePlayForce;
        }
      }

      const speedScale = reducedMotion ? 0.22 : settings.motionScale;
      star.x += star.vx * dt * speedScale + star.driftX * frame;
      star.y += star.vy * dt * speedScale + star.driftY * frame;
      star.driftX *= reducedMotion ? 0.82 : 0.92;
      star.driftY *= reducedMotion ? 0.82 : 0.92;

      if (star.x < -6) star.x = width + 6;
      if (star.x > width + 6) star.x = -6;
      if (star.y < -6) star.y = height + 6;
      if (star.y > height + 6) star.y = -6;

      drawStar(star, ts, dt);
    }

    rafId = window.requestAnimationFrame(tick);
  };

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onReducedMotionChange = (event) => {
    reducedMotion = event.matches;
    rebuild();
  };

  resize();
  pointer.x = width * 0.5;
  pointer.y = height * 0.5;
  pointer.targetX = pointer.x;
  pointer.targetY = pointer.y;

  rafId = window.requestAnimationFrame(tick);
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mouseleave", onLeave, { passive: true });

  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener("change", onReducedMotionChange);
  } else if (reducedMotionQuery.addListener) {
    reducedMotionQuery.addListener(onReducedMotionChange);
  }

  return () => {
    if (rafId) window.cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseleave", onLeave);

    if (reducedMotionQuery.removeEventListener) {
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
    } else if (reducedMotionQuery.removeListener) {
      reducedMotionQuery.removeListener(onReducedMotionChange);
    }

    layer.remove();
  };
}
