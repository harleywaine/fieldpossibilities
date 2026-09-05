'use client';

import { useEffect, useRef } from 'react';

/**
 * The focal instrument: a few hundred points on a slowly turning sphere, drawn
 * on canvas. No library, no shader — a Fibonacci lattice, one rotation, depth
 * mapped to size and alpha. Honest about itself: the values in the annotation
 * beside it are the real ones used here.
 */
export const SPHERE_POINTS = 700;
export const SPHERE_RATE = 0.1; // radians per second

export function Sphere({ size = 340 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Fibonacci lattice — evenly distributed points, no clustering at poles.
    const pts: Array<[number, number, number]> = [];
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < SPHERE_POINTS; i++) {
      const y = 1 - (i / (SPHERE_POINTS - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = phi * i;
      pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }

    const R = size * 0.42;
    const cx = size / 2;
    const cy = size / 2;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    const draw = (ms: number) => {
      const a = reduced ? 0.6 : (ms / 1000) * SPHERE_RATE;
      const tilt = 0.35;
      const cosA = Math.cos(a), sinA = Math.sin(a);
      const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

      ctx.clearRect(0, 0, size, size);
      for (const [x0, y0, z0] of pts) {
        // Rotate about Y, then tilt about X.
        const x1 = x0 * cosA + z0 * sinA;
        const z1 = -x0 * sinA + z0 * cosA;
        const y1 = y0 * cosT - z1 * sinT;
        const z2 = y0 * sinT + z1 * cosT;

        const depth = (z2 + 1) / 2; // 0 far → 1 near
        ctx.beginPath();
        ctx.arc(cx + x1 * R, cy + y1 * R, 0.5 + depth * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(3, 70, 148, ${0.08 + depth * 0.3})`;
        ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      aria-hidden="true"
      className="select-none"
    />
  );
}
