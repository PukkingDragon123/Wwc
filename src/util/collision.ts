// Matter collision categories (bitmask). Kept tiny and explicit.

export const CAT = {
  GROUND: 0x0001,
  PLAYER: 0x0002,
  ENEMY: 0x0004,
  DEBRIS: 0x0008,
  PROP: 0x0010,
} as const;

// Distance from point P to segment AB (used for manual weapon-swing hits).
export function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
