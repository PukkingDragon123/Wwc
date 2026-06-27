# Wwc — *Last Light*

A 2D side-scrolling post-apocalyptic survival game.

You are the last human alive. Radiation is slowly mutating and killing you, so **every day matters**. Each day you leave a cozy underground bunker, side-scroll through an abandoned town, fight mutated animals with physics-based gory combat, scavenge weapons / food / medicine / materials, and **race home before night**. Spend your loot expanding the bunker, crafting gear, growing food, and rescuing harmless cute mutated animals into a sanctuary.

The game's identity is the **contrast**: brutal and tense outside, warm and peaceful inside.

## Tech

- **Phaser 3** (WebGL 2D engine) with its built-in **Matter.js** physics — the ragdoll / dismemberment combat.
- **Vite** + **TypeScript**.
- **100% procedural graphics** — every texture is generated at runtime from code. No asset files.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build     # typecheck + production build to dist/
npm run typecheck # tsc --noEmit
npm run test      # headless unit tests (vitest)
```

## Controls

- **A / D** or **←/→** — move
- **W / Space / ↑** — jump
- **Mouse** — aim; **Left click** — swing weapon
- **E** — interact (loot containers, bunker door, stations, rescue animals)
- **C** — cycle camera view (Cinematic / Close / Wide)
- **I** — supplies / inventory (in the bunker)
- **Esc** — close panel

## Look & feel

The world is rendered with dynamic 2D lighting — a near-black, fog-bound wasteland
that your lantern (and scattered fires) carve visibility from, with glowing mutant
eyes watching from the dark. Combat is physics-driven ragdoll gore: impulse hits,
dismemberment, blood pools and gibs, slow-mo kill punches, and a heartbeat that
rises as your health falls. The bunker is the warm, candle-lit inverse. All visuals
and audio are generated procedurally in code — no asset files.

## Architecture

See `src/` — `scenes/` (Boot, Preload, MainMenu, World, Bunker, Hud, GameOver),
`state/` (GameState singleton, EventBus, types), `systems/` (testable game logic),
`entities/` (Player, creatures, weapons), `gfx/` (procedural texture generation),
`config/Balance.ts` (all tunable numbers).
