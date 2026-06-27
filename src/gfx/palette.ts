// One palette family, two coordinated moods. OUTSIDE is now graded dark and
// sickly for horror; HOME stays warm. The contrast carries the game's identity.

export const Palette = {
  out: {
    skyDay: 0x232a26, // gloomy overcast, never bright
    skyDusk: 0x3a1c14, // diseased rust dusk
    skyNight: 0x04060a, // near-black
    haze: 0x3a463c,
    fog: 0x4a564c,
    ground: 0x2e2e28,
    groundDark: 0x1a1a16,
    building: 0x1c1f1c,
    buildingLight: 0x282c26,
    buildingDark: 0x101210,
    window: 0x0a0c07,
    windowLit: 0x6a3a1a,
    rust: 0x6a3f24,
    debris: 0x3a3a32,
  },
  home: {
    bg: 0x1c140d,
    bgGlow: 0x3a2410,
    wall: 0x4a3526,
    wallLight: 0x5e4332,
    floor: 0x322417,
    floorDark: 0x241a10,
    amber: 0xffb24a,
    candle: 0xffd27a,
    plant: 0x5fa83f,
    plantDark: 0x3f7a2a,
    wood: 0x6b4a2f,
    crate: 0x7a5532,
  },
  ui: {
    health: 0xc0392b,
    healthBack: 0x2a0f0c,
    hunger: 0xe0a020,
    hungerBack: 0x2a2008,
    mutation: 0x9b59b6,
    mutationBack: 0x200f26,
    text: 0xe8e0cd,
    textDim: 0x8a8476,
    textWarn: 0xff5436,
    panel: 0x100d09,
    panelBorder: 0x4a3f30,
    accent: 0xffb24a,
  },
  fx: {
    blood: 0x8e1010,
    bloodDark: 0x4a0808,
    bloodBright: 0xc02020,
    bloodPool: 0x2e0606,
    bone: 0xd8cdb0,
    gib: 0x6a2a2a,
    dust: 0x6a6458,
    spark: 0xffd27a,
    shadow: 0x000000,
  },
  light: {
    lantern: 0xffd9a0,
    fire: 0xff9a3a,
    candle: 0xffcf86,
    eyeRed: 0xff2a18,
    eyeGreen: 0x9aff3a,
    eyePurple: 0xc060ff,
  },
  creature: {
    eye: 0xfff0a0,
    eyeAngry: 0xff4030,
    cuteEye: 0x140a14,
    tooth: 0xe8e0cd,
  },
} as const;

export function cssColor(hex: number): string {
  return '#' + (hex & 0xffffff).toString(16).padStart(6, '0');
}

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

export function darken(hex: number, f: number): number {
  return lerpColor(hex, 0x000000, f);
}
export function lighten(hex: number, f: number): number {
  return lerpColor(hex, 0xffffff, f);
}
