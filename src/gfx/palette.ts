// One palette family, two coordinated moods. The temperature/saturation shift
// between OUT (brutal) and HOME (cozy) carries the game's emotional contrast.

export const Palette = {
  out: {
    skyDay: 0x5a6b5a,
    skyDusk: 0x7a4330,
    skyNight: 0x0b0e1a,
    haze: 0x8a9a7a,
    ground: 0x46463c,
    groundDark: 0x2f2f29,
    building: 0x2b2e2b,
    buildingLight: 0x3c4038,
    buildingDark: 0x202220,
    window: 0x14160f,
    rust: 0x7a4b2b,
    debris: 0x55554a,
  },
  home: {
    bg: 0x241a12,
    bgGlow: 0x3a2410,
    wall: 0x4a3526,
    wallLight: 0x5e4332,
    floor: 0x3a2a1d,
    floorDark: 0x2a1e14,
    amber: 0xffb24a,
    candle: 0xffd27a,
    plant: 0x5fa83f,
    plantDark: 0x3f7a2a,
    wood: 0x6b4a2f,
    crate: 0x7a5532,
  },
  ui: {
    health: 0xc0392b,
    healthBack: 0x3a1512,
    hunger: 0xe0a020,
    hungerBack: 0x3a2c0a,
    mutation: 0x9b59b6,
    mutationBack: 0x2a1530,
    text: 0xf0e9d6,
    textDim: 0x9a9486,
    textWarn: 0xff6b4a,
    panel: 0x16130e,
    panelBorder: 0x4a3f30,
    accent: 0xffb24a,
  },
  fx: {
    blood: 0xa01212,
    bloodDark: 0x5e0a0a,
    bloodBright: 0xd02828,
    dust: 0x9a9080,
    spark: 0xffd27a,
  },
  creature: {
    eye: 0xfff0a0,
    eyeAngry: 0xff4030,
    cuteEye: 0x2a1a2a,
  },
} as const;

// hex int -> CSS string
export function cssColor(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}

// linear blend between two 0xRRGGBB colours, t in [0,1]
export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
