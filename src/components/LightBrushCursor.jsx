const PRESETS = {
  cinematic: {
    easing: 0.16,
    reducedEasing: 0.28,
    maxPoints: 14,
    reducedMaxPoints: 7,
    sparkleChance: 0.12,
    sparkleLimit: 20,
    trailAlpha: 0.5,
    trailReducedAlpha: 0.3,
    radiusBase: 13,
    radiusStep: 0.45,
    headRadius: 16,
    headAlpha: 0.76,
    core: [255, 239, 172],
    mid: [255, 211, 112],
    sparkle: [255, 224, 133]
  },
  fantasy: {
    easing: 0.21,
    reducedEasing: 0.32,
    maxPoints: 22,
    reducedMaxPoints: 9,
    sparkleChance: 0.28,
    sparkleLimit: 42,
    trailAlpha: 0.72,
    trailReducedAlpha: 0.38,
    radiusBase: 16,
    radiusStep: 0.7,
    headRadius: 21,
    headAlpha: 0.95,
    core: [255, 242, 173],
    mid: [255, 214, 112],
    sparkle: [255, 228, 140]
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const canUseDesktopCursor = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
};

const prefersReducedMotion = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export function LightBrushCursor(options = {}) {
  if (!canUseDesktopCursor()) {
    return () => {};
  }

  const presetKey = options.preset === "fantasy" ? "fantasy" : "cinematic";
  const preset = PRESETS[presetKey];

  const layer = document.createElement("canvas");
  layer.className = "light-brush-cursor-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const ctx = layer.getContext("2d", { alpha: true });
  if (!ctx) {
    layer.remove();
    return () => {};
  }

  const html = document.documentElement;
  html.classList.add("light-brush-enabled");

  let reducedMotion = prefersReducedMotion();
  let width = 0;
  let height = 0;
  let rafId = 0;
  let dpr = 1;

  let currentX = window.innerWidth * 0.5;
  let currentY = window.innerHeight * 0.5;
  let targetX = currentX;
  let targetY = currentY;
  let pointerVisible = false;

  const points = [];
  const sparkles = [];
  let lastTrailX = currentX;
  let lastTrailY = currentY;

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    layer.width = Math.max(1, Math.floor(width * dpr));
    layer.height = Math.max(1, Math.floor(height * dpr));
    layer.style.width = `${width}px`;
    layer.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const onMove = (event) => {
    pointerVisible = true;
    targetX = event.clientX;
    targetY = event.clientY;
  };

  const onLeave = () => {
    pointerVisible = false;
  };

  const drawPoint = (x, y, radius, alpha) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${preset.core[0]}, ${preset.core[1]}, ${preset.core[2]}, ${(alpha * 0.98).toFixed(3)})`);
    gradient.addColorStop(0.55, `rgba(${preset.mid[0]}, ${preset.mid[1]}, ${preset.mid[2]}, ${(alpha * 0.56).toFixed(3)})`);
    gradient.addColorStop(1, `rgba(${preset.mid[0]}, ${preset.mid[1]}, ${preset.mid[2]}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawSparkle = (x, y, size, alpha) => {
    ctx.strokeStyle = `rgba(${preset.sparkle[0]}, ${preset.sparkle[1]}, ${preset.sparkle[2]}, ${alpha.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, size * 0.22);
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
  };

  const spawnSparkles = (count, spread, velocity) => {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = velocity * (0.35 + Math.random() * 0.85);
      sparkles.unshift({
        x: currentX + (Math.random() - 0.5) * spread,
        y: currentY + (Math.random() - 0.5) * spread,
        size: 1.4 + Math.random() * 2.6,
        life: 1,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
      });
    }
  };

  const tick = () => {
    const easing = reducedMotion ? preset.reducedEasing : preset.easing;
    currentX += (targetX - currentX) * easing;
    currentY += (targetY - currentY) * easing;
    const maxPoints = reducedMotion ? preset.reducedMaxPoints : preset.maxPoints;

    if (pointerVisible) {
      points.unshift({ x: currentX, y: currentY, life: 1 });
      const dx = currentX - lastTrailX;
      const dy = currentY - lastTrailY;
      const speed = Math.hypot(dx, dy);
      lastTrailX = currentX;
      lastTrailY = currentY;

      if (!reducedMotion) {
        // A low constant cadence keeps the trail visible and playful.
        if (Math.random() < preset.sparkleChance + 0.06) {
          spawnSparkles(1, 18, 0.08);
        }
        // Faster movement creates short micro-bursts that feel energetic.
        if (speed > 1.4) {
          const burstCount = speed > 5 ? 3 : 2;
          spawnSparkles(burstCount, 16 + Math.min(14, speed * 1.6), 0.06 + speed * 0.02);
        }
      }
    }

    while (points.length > maxPoints) points.pop();
    while (sparkles.length > preset.sparkleLimit) sparkles.pop();

    ctx.clearRect(0, 0, width, height);

    for (let i = points.length - 1; i >= 0; i -= 1) {
      const point = points[i];
      const fade = point.life * (1 - i / Math.max(1, points.length));
      const alpha = reducedMotion ? fade * preset.trailReducedAlpha : fade * preset.trailAlpha;
      const radius = (reducedMotion ? 10 : preset.radiusBase) + i * preset.radiusStep;
      drawPoint(point.x, point.y, radius, alpha);
      point.life *= reducedMotion ? 0.84 : 0.9;
      if (point.life < 0.04) points.splice(i, 1);
    }

    for (let i = sparkles.length - 1; i >= 0; i -= 1) {
      const sparkle = sparkles[i];
      sparkle.x += sparkle.vx;
      sparkle.y += sparkle.vy;
      sparkle.vx *= 0.97;
      sparkle.vy *= 0.97;
      drawSparkle(sparkle.x, sparkle.y, sparkle.size, sparkle.life * 0.85);
      sparkle.life *= 0.9;
      sparkle.size *= 0.996;
      if (sparkle.life < 0.06) sparkles.splice(i, 1);
    }

    if (pointerVisible) {
      const radius = reducedMotion ? 13 : preset.headRadius;
      const alpha = reducedMotion ? 0.65 : preset.headAlpha;
      drawPoint(currentX, currentY, radius, alpha);
    }

    rafId = window.requestAnimationFrame(tick);
  };

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onReducedMotionChange = (event) => {
    reducedMotion = event.matches;
    if (reducedMotion) sparkles.length = 0;
  };

  resize();
  lastTrailX = currentX;
  lastTrailY = currentY;
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

    html.classList.remove("light-brush-enabled");
    layer.remove();
  };
}
