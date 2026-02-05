export type CurveXY = { x: number; y: number };

type BuildOptions = {
  tension?: number;
};

const clampTension = (value: number) => {
  // Keep it sane; 0 = straight-ish, 1 = standard Catmull-Rom.
  if (!Number.isFinite(value)) return 1;
  return Math.min(2, Math.max(0, value));
};

/**
 * Build a smooth SVG path through a sequence of points.
 * Uses Catmull–Rom spline converted into cubic Bezier segments (C1 continuous).
 *
 * Returns "" when points are insufficient.
 */
export const buildCatmullRomPath = (
  points: readonly CurveXY[],
  options: BuildOptions = {}
): string => {
  if (points.length < 2) return "";

  const tension = clampTension(options.tension ?? 1);
  const t = tension / 6;

  const start = points[0];
  let d = `M ${start.x} ${start.y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
};

