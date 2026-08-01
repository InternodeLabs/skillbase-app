"use client";

import { useEffect, useRef } from "react";

// Grid + falloff tuning.
const SPACING = 22; // px between dot centers
const BASE_RADIUS = 1; // resting dot radius
const MAX_BUMP = 3.4; // extra radius added at the cursor's center
const INFLUENCE = 170; // px radius of the spherical "pull"
const PULL_FRAC = 0.42; // max fraction of the distance a dot warps toward cursor
const BASE_ALPHA = 0.45;
const FOCUS_DELAY = 140; // ms of stillness before the ramp begins to build
const FOCUS_RAMP = 650; // ms over which scale/pull eases fully in

// Resting dot color -> color at the cursor center.
const BASE_RGB = [212, 212, 216] as const; // zinc-300
const PEAK_RGB = [113, 113, 122] as const; // zinc-500

/**
 * Decorative dot grid rendered on a canvas. While the cursor moves, nearby dots
 * only highlight/darken. Once the cursor sits still for FOCUS_DELAY, the scale +
 * spacetime "pull" gradually ramps in — the closest dot grows largest and each
 * ring warps toward the pointer, easing back out the moment the cursor moves.
 */
export function DotGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    // Target = raw pointer; current = smoothed value we render.
    let targetX = -9999;
    let targetY = -9999;
    let currentX = targetX;
    let currentY = targetY;
    let strength = 0; // 0 when pointer absent, eases to 1 when present
    let targetStrength = 0;
    let focus = 0; // 0 while moving; time-eased toward 1 as the cursor rests
    let lastMoveTime = 0;
    let pointerInside = false;
    let raf = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = currentX;
      const cy = currentY;
      const influenceSq = INFLUENCE * INFLUENCE;

      // Offset the grid so dots sit centered within the viewport.
      const startX = (width % SPACING) / 2 || 0;
      const startY = (height % SPACING) / 2 || 0;

      for (let x = startX; x <= width; x += SPACING) {
        for (let y = startY; y <= height; y += SPACING) {
          let drawX = x;
          let drawY = y;
          let radius = BASE_RADIUS;
          let r = BASE_RGB[0];
          let g = BASE_RGB[1];
          let b = BASE_RGB[2];
          let alpha = BASE_ALPHA;

          if (strength > 0.001) {
            const dx = x - cx;
            const dy = y - cy;
            const distSq = dx * dx + dy * dy;
            if (distSq < influenceSq) {
              const t = 1 - Math.sqrt(distSq) / INFLUENCE;
              // Smoothstep for a soft spherical dome.
              const f = t * t * (3 - 2 * t) * strength;
              // Scale + warp only after the cursor settles (see `focus`).
              const ff = f * focus;

              // Spacetime warp: push each dot away from the cursor by a fraction
              // of its own distance, opening a void that widens near the center.
              const pull = PULL_FRAC * ff;
              drawX = x + dx * pull;
              drawY = y + dy * pull;

              radius = BASE_RADIUS + MAX_BUMP * ff;
              r = BASE_RGB[0] + (PEAK_RGB[0] - BASE_RGB[0]) * f;
              g = BASE_RGB[1] + (PEAK_RGB[1] - BASE_RGB[1]) * f;
              b = BASE_RGB[2] + (PEAK_RGB[2] - BASE_RGB[2]) * f;
              alpha = BASE_ALPHA + (1 - BASE_ALPHA) * f;
            }
          }

          ctx.beginPath();
          ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`;
          ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      strength += (targetStrength - strength) * 0.12;

      // Time-eased focus: once the cursor rests, scale/pull blend in along a
      // smoothstep curve. Its slope is zero at the start, so there's no sudden
      // onset — the pull grows out of nothing instead of snapping on.
      const elapsed = performance.now() - lastMoveTime;
      const p = pointerInside
        ? Math.min(Math.max((elapsed - FOCUS_DELAY) / FOCUS_RAMP, 0), 1)
        : 0;
      const targetFocus = p * p * (3 - 2 * p);
      // Follow the ramp up directly (already smooth); ease gently on the way down.
      if (targetFocus >= focus) focus = targetFocus;
      else focus += (targetFocus - focus) * 0.1;

      draw();

      const focusSettled = pointerInside ? focus > 0.998 : focus < 0.002;
      const settled =
        Math.abs(targetX - currentX) < 0.5 &&
        Math.abs(targetY - currentY) < 0.5 &&
        Math.abs(targetStrength - strength) < 0.01 &&
        focusSettled;

      if (settled) {
        strength = targetStrength;
        focus = targetFocus;
        currentX = targetX;
        currentY = targetY;
        draw();
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const ensureRunning = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      targetStrength = 1;
      pointerInside = true;
      // Moving resets the stillness clock; scale/pull relaxes back out.
      lastMoveTime = performance.now();
      // Snap position on the very first move so the lens doesn't fly in.
      if (currentX < -1000) {
        currentX = targetX;
        currentY = targetY;
      }
      ensureRunning();
    };

    const onPointerLeave = () => {
      targetStrength = 0;
      pointerInside = false;
      ensureRunning();
    };

    resize();
    window.addEventListener("resize", resize);

    if (!reduceMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
