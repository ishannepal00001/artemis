# Artemis

A first-person prototype for an Among Us-style game set on a lunar base. You are a crew member walking a small outpost during the lunar night, keeping oxygen, power, water and regolith output on target by doing tasks at consoles.

This is a **look-and-feel prototype**. The 3D base, the HUD and the task panels are real and interactive, but the game behind them is fake: there are no other players, no impostor, no meetings, no networking and no win or lose condition. Resources drift on a timer so the UI can be judged in motion.

## Contents

- [Quick start](#quick-start)
- [Controls](#controls)
- [What you can do](#what-you-can-do)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
  - [Three layers, one store](#three-layers-one-store)
  - [The base layout](#the-base-layout)
  - [Movement, collision and interaction](#movement-collision-and-interaction)
  - [Pointer lock and game modes](#pointer-lock-and-game-modes)
  - [The fake simulation](#the-fake-simulation)
  - [The HUD](#the-hud)
  - [Task panels](#task-panels)
  - [Rendering](#rendering)
- [Tuning the visuals](#tuning-the-visuals)
- [Extending it](#extending-it)
- [Troubleshooting](#troubleshooting)
- [Known limits](#known-limits)

## Quick start

You need a recent Node (20.19+ or 22.12+, which is what Vite 8 requires) or Bun.

```sh
npm install      # or: bun install
npm run dev      # or: bun run dev
```

Open the URL Vite prints (normally `http://localhost:5173`) and click **Enter base**.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck (`tsc --noEmit`), then production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Controls

| Input | Action |
|---|---|
| `W` `A` `S` `D` | Move |
| Mouse | Look (after clicking to capture the pointer) |
| `←` `→` | Turn without the mouse |
| `Shift` | Sprint |
| `E` | Use the console you are facing |
| `Esc` | Close a task panel, or pause |
| `Space` | Lock the needle in the drill task |

## What you can do

The base is a corridor with four rooms. Each room has one console and one task:

| Room | Task | Restores | How it plays |
|---|---|---|---|
| Power Bay | Route power | Power | Move four sliders into their rated bands without going over the 100 kW budget, then commit |
| Life Support | Balance cabin mix | Oxygen | Set three valves so all three wobbling readings stay in their green band for 3 seconds |
| ISRU Plant | Calibrate regolith drill | Regolith output | Stop a sweeping needle inside the target zone three times; the zone shrinks and the needle speeds up |
| Command | Transmit shift report | Water | Acknowledge each subsystem reading, then transmit |

While you walk around, oxygen, power and water drain and the regolith quota is stalled. Finishing a task tops its resource up and turns its rate positive. When power runs low the base lights dim, and at critical they go emergency red until you route power.

## Tech stack

| Piece | Used for |
|---|---|
| React 19 + TypeScript | UI and app structure |
| Vite 8 | Dev server and build |
| three.js 0.186 | 3D rendering |
| React Three Fiber 9 | Declaring the three.js scene as React components |
| drei | Only its `Text` component, for the door signs |
| zustand 5 | The single game store |
| Fontsource (Inter, JetBrains Mono) | Self-hosted fonts, no network requests |

There is no physics engine, no UI kit and no post-processing library. Collision is hand-written, styling is plain CSS with design tokens, and post-processing uses the addons that ship with three.js.

## Project structure

```
src/
  main.tsx            Entry point: fonts, stylesheets, <App />
  App.tsx             Composes the layers and owns the global key and pointer-lock handlers

  data/
    base.ts           Rooms, walls, doors, consoles, props, collision. The single source of truth for layout
    tasks.ts          Task definitions and which resource each one restores

  state/
    store.ts          zustand store: mode, resources, tasks, and the actions that change them
    sim.ts            The 1-second tick, the alert selector, and the power-status hook
    pose.ts           Player position and view angles (a plain mutable object, not in the store)
    pointer.ts        Pointer-lock helpers bound to the WebGL canvas

  scene/              Everything 3D
    Scene.tsx         The <Canvas> and renderer settings
    Player.tsx        Camera, movement, collision, nearest-console detection
    Base.tsx          Builds the whole interior from data/base.ts
    Console.tsx       One task console; its colour follows task and resource state
    Lighting.tsx      Key light, interior fixtures, environment map, static shadows
    Moonscape.tsx     Stars, terrain, rocks, Earth, dust, exterior hardware
    Effects.tsx       Post-processing chain
    kit.ts            Collects parts by material and merges them into one mesh each
    materials.ts      The shared PBR material set
    textures.ts       Procedural normal / roughness / AO / shading textures, and the Earth
    terrain.ts        Ground height function (noise, craters, flat pad under the base)
    noise.ts          Seeded random, value noise, fbm
    visuals.ts        Every look-and-feel setting in one place

  hud/                The in-game overlay (plain DOM over the canvas)
    Hud.tsx           Layout shell
    StatusBar.tsx     Mission patch, clock, role, location, and the alert banner
    ResourceMeters.tsx
    TaskList.tsx
    Minimap.tsx
    InteractPrompt.tsx
    Crosshair.tsx
    PauseOverlay.tsx  Entry and pause screen

  tasks/              Panels that open at consoles
    TaskPanel.tsx     Modal frame and completion handling
    PowerRouting.tsx  OxygenMix.tsx  DrillCalibration.tsx  ShiftReport.tsx

  styles/
    tokens.css        Colour, type, radius and spacing tokens
    global.css        Reset, shared panel / bar / button styles, pause overlay
    hud.css           HUD layout and components
    tasks.css         Task panel and minigame styles
```

## How it works

### Three layers, one store

`App.tsx` stacks four things in one full-screen container:

1. `<Scene />` — the WebGL canvas.
2. `<Hud />` — a DOM overlay with `pointer-events: none`, so clicks pass through to the canvas.
3. `<TaskPanel />` — a modal, rendered only while a task is open.
4. `<PauseOverlay />` — rendered only while paused.

The UI is ordinary HTML and CSS rather than textures inside the 3D scene. That keeps text sharp at any resolution, keeps it accessible, and makes it fast to restyle.

All four read from one zustand store (`state/store.ts`). The 3D layer and the DOM layer never talk to each other directly; they both react to the store.

One thing is deliberately **not** in the store: the player's position and view angles. They change every frame, and pushing them through React would re-render subscribers 60 times a second. They live in a plain object in `state/pose.ts`. The camera writes to it, and the minimap reads it in its own `requestAnimationFrame` loop and moves an SVG element directly.

### The base layout

`data/base.ts` describes the base as data, and three separate systems derive from it:

- the 3D geometry (`scene/Base.tsx`),
- the collision check (`canStand`),
- the minimap (`hud/Minimap.tsx`).

Change a number there and all three stay in agreement.

World axes: **x** runs west (−) to east (+), **z** runs north (−) to south (+), **y** is up. One unit is one metre.

- **Rooms** are rectangles (`x0, x1, z0, z1`). The corridor runs east-west through the middle with two rooms north and two south.
- **Walls** are axis-aligned segments with a list of **openings**. An opening is a door or a window, with a centre, a width, and for windows a sill and top height.
- **Doors** are derived from the wall openings, so a door can never exist without a hole in the wall.
- **Consoles** have a position and a `facing` vector: the direction the screen points, which is where the operator stands.
- **Props** (table, tanks, battery racks, hopper) have a position and a rectangular collision footprint.

### Movement, collision and interaction

All of this is in `scene/Player.tsx`, inside one `useFrame` callback.

**Looking.** Yaw and pitch live in `pose`. Mouse movement changes them while the pointer is locked; the arrow keys also change yaw. The camera uses `YXZ` rotation order so yaw and pitch never produce roll. Pitch is clamped to about ±72°.

**Moving.** Keys are tracked in a `Set` of `KeyboardEvent.code` values, so movement is independent of keyboard layout. Each frame the pressed keys become a forward/strafe vector, which is normalised (so diagonals are not faster), rotated by yaw, and scaled by speed (3.2 m/s walking, 5.2 m/s sprinting) and frame time. Frame time is capped at 50 ms so a stalled tab cannot teleport you through a wall. A small sine head-bob is added to the camera height while moving.

**Collision.** There is no physics engine. The world is modelled as *where you may stand*, not as walls to bump into:

- The **walkable area** is the union of the room rectangles and one rectangle per door.
- A position is valid if it is inside at least one walkable rectangle shrunk by the player radius (0.32 m), and outside every obstacle rectangle (consoles and props) grown by the same radius.
- Door rectangles reach a metre into the rooms on both sides. Without that, shrinking every rectangle by the player radius would leave a gap in each doorway.

The x and z steps are tested separately. If moving diagonally into a wall, one axis is rejected and the other still applies, which is what makes you slide along walls instead of sticking.

**Interaction.** Each frame the player looks for the nearest console within 2.2 m that is also roughly in front of them (the direction to the console must be within about 70° of the view direction). The result is written to the store only when it changes. The HUD prompt, the crosshair, the highlighted task row and the ring on the floor all follow that one value.

### Pointer lock and game modes

The store has a `mode`: `paused`, `playing` or `task`.

```
            Enter base / Resume               E at a console
  paused ─────────────────────────▶ playing ─────────────────▶ task
     ▲                                 │  ▲                      │
     └──────── Esc (lock lost) ────────┘  └──── Esc / complete ──┘
```

Browser pointer lock has rules that shape this:

- **A lock needs a user gesture**, so it is requested from the click on **Enter base**.
- **`Esc` is swallowed by the browser while locked.** The page never sees that keypress. So the pause signal is not the key but the `pointerlockchange` event: losing the lock while `playing` means pause.
- **Opening a task releases the lock on purpose**, so the cursor is free for sliders and buttons. Because the mode is already `task` when the lock drops, it is not mistaken for a pause.
- **Closing a task asks for the lock again.** If the browser refuses (it does for about a second after `Esc`), the game keeps running with keyboard look and shows a "click to capture the mouse" hint. Any click on the scene retries.

The canvas element is registered in `state/pointer.ts` when it mounts, so the store and the DOM UI can request or release the lock without holding a reference to the renderer.

### The fake simulation

`state/sim.ts` runs a 1-second interval whenever the game is not paused. Each tick is one mission minute.

Each resource has a `value`, a `capacity` and a `rate` (change per tick). On every tick:

1. The rate is jittered by ±15% so the numbers do not look mechanical.
2. The value moves by that amount, clamped between 8% of capacity and capacity. The floor means nothing ever reaches zero, since there is no fail state to handle it.
3. The new value is pushed onto a 32-sample history, which feeds the sparkline.

Starting state is tuned so problems appear in a staggered order rather than all at once:

| Resource | Start | Rate | Result |
|---|---|---|---|
| Power | 109 / 320 kWh (34%) | −1.3 | Hits warning (30%) within about 10 seconds |
| Oxygen | 228 / 600 kg (38%) | −1.2 | Hits warning about 40 seconds in |
| Water | 1340 / 2000 L (67%) | −1.5 | Stays nominal for a long time |
| Regolith output | 6.4 / 10 t | 0 | "Stalled" from the start |

**Status** is `ok`, `warn` (≤ 30%) or `crit` (≤ 15%). Regolith is different: it is a quota that should be climbing, so it is `warn` whenever its rate is zero or below, regardless of level.

**Completing a task** adds a one-off boost to its resource and switches the rate to a positive "restored" rate.

**The alert banner** (`useAlert`) shows the single worst problem, with critical beating warning, along with which task fixes it and in which room.

### The HUD

All of it is DOM, positioned at the screen edges so the centre of view stays clear. It dims to 35% while a task panel is open.

- **Status bar** — mission patch, sol and local time (derived from the tick count), role chip, current room.
- **Crew tasks** — one segment and one row per task. The row for the console you are standing at is highlighted.
- **Base resources** — value, capacity, rate, a bar with a tick at the 30% warning line, and a sparkline. The sparkline keeps a minimum vertical span so a flat line is not stretched into visible noise. Numbers use a monospace face with tabular figures so they do not jitter as digits change.
- **Alert banner** — orange for warning, red for critical, green once every task is done.
- **Minimap** — an SVG whose `viewBox` is in world metres, so rooms, doors and consoles are drawn straight from `data/base.ts` with no coordinate conversion. The player marker is moved every frame outside React.
- **Interact prompt and crosshair** — appear and change when a console is in range.

Colours, type and spacing come from CSS custom properties in `styles/tokens.css`. Blue is the neutral accent, orange is warning, red is reserved for critical, green means done or good.

### Task panels

`tasks/TaskPanel.tsx` is the frame. It looks up the active task, picks the body component by the task's `panel` type, and passes it one prop: `onComplete`.

- The panel is **keyed by task id**, so opening a task always starts from fresh state.
- On completion the frame shows a "Task complete" state for 1.1 seconds, then calls `completeTask`, which updates the store, closes the panel and re-requests the pointer lock.
- `Esc` or the Close button abandons the task with nothing saved.

The four bodies each use a different technique, on purpose:

- **Power routing** is pure React state: four numbers and a derived "is everything valid" flag.
- **Cabin mix** runs its own 50 ms timer. Each reading is `valve position + a small sine wobble`, and a hold timer counts up only while all three readings are inside their bands, resetting the moment one leaves.
- **Drill calibration** animates the needle in a `requestAnimationFrame` loop and writes its position straight to the element's style, bypassing React, because it changes every frame. A miss remounts the track to replay a shake animation.
- **Shift report** reads live values from the store, so the readings keep changing while you fill it in.

### Rendering

Everything visual is tuned from one file, `scene/visuals.ts`.

**Static geometry is merged.** The interior is hundreds of small parts: wall segments, trim, conduit, brackets, handrails, panels, vents, props. Drawing each as its own mesh would mean hundreds of draw calls. Instead, `scene/kit.ts` collects parts into buckets by material and merges each bucket into a single geometry. The whole base ends up as roughly one draw call per material. The only separate meshes are things that change at runtime: the light strips, the consoles, the signs and the hologram.

**Walls are generated, not modelled.** For each wall, `Base.tsx` walks along its length and emits full-height boxes between openings, a lintel above each door, and a sill and lintel around each window, plus frames, glass and skirting. A second pass (`dressWalls`) goes over every solid stretch of wall, works out which side faces into a room, and fits conduit, brackets, handrails (corridor only) and wall equipment. Equipment is skipped behind consoles and props. Wall detail is kept under about 15 cm deep so it never needs collision.

**Textures are procedural.** `scene/textures.ts` describes each surface as a tileable *height function*: wall panels with seams and fastener rows, deck plating with tread, brushed metal, regolith with pits. From that one height field it derives:

- a **normal map** (from the slope),
- an **ambient-occlusion** value (how far a texel sits below its surroundings),
- a **shading map** multiplied into the colour, so grooves read even under direct light,
- a packed **occlusion / roughness / metalness** texture in the channel layout three.js expects.

Box parts get **world-space UVs**: texture coordinates are computed from world position rather than per face, so a tiling texture keeps the same scale on every box and lines up across neighbouring ones.

**Lighting.** It is lunar night by default.

- One directional **key light** casts shadows: blue Earthshine at night, or a warm low Sun if `timeOfDay` is `'day'` (Earthshine then becomes a faint fill from the other side).
- Seven **ceiling fixtures** (three down the corridor, one per room) are warm, low point lights. They ease toward a target brightness that follows the power reserve, and lerp to red at critical. The emissive strips on the ceiling follow the same state.
- Each **console** has a small point light in its state colour: blue idle, orange or red when its resource is in trouble, green when done.
- A dim **environment map** gives metal something to reflect, and very low ambient light keeps shadows dark.
- **Shadows are rendered once.** Nothing that casts a shadow moves, so shadow-map updates are switched off after the first 20 frames. That is what makes eight shadow-casting lights affordable.

**The exterior.** The ground is a 260 × 260 grid displaced by `terrainHeight()`, which layers rolling noise, a distant ridgeline (kept low to the west so it does not hide the Earth), and 46 craters with raised rims, then blends to flat under the base. Rocks are a single lumpy boulder drawn 520 times with one `InstancedMesh`, kept small close to the windows. The Earth is a sphere with a generated texture that has its day side baked in. Stars are fixed-size points that never twinkle, because there is no atmosphere. All procedural content uses a seeded generator, so it is identical on every load.

**Post-processing** (`scene/Effects.tsx`) takes over rendering from React Three Fiber and runs this chain:

1. Render the scene to a linear HDR buffer.
2. **GTAO** ambient occlusion, for contact shadows in corners and under equipment.
3. **Bloom**, with a threshold above 1.0. Because the image is still linear HDR at this point, only emissive surfaces are bright enough to bloom.
4. **Output**: ACES Filmic tone mapping and conversion to sRGB.
5. **SMAA** anti-aliasing.
6. **Vignette and film grain**.

## Tuning the visuals

Everything is in `src/scene/visuals.ts`.

| Setting | Effect |
|---|---|
| `timeOfDay` | `'night'` (Earthshine only) or `'day'` (low Sun) |
| `exposure` | Overall brightness |
| `sun.intensity`, `sun.position` | Sun strength and direction, used by day |
| `earthshine.night` / `earthshine.day` | Earthshine as the key light / as fill |
| `ambient`, `bounce` | Flat fill, and soft interior bounce light |
| `environmentIntensity` | Strength of reflections on metal |
| `lampLevel` | Multiplier on every ceiling fixture |
| `interiorShadows`, `interiorShadowMapSize` | Whether the ceiling fixtures cast shadows, and at what resolution |
| `shadowMapSize`, `shadowExtent` | Key-light shadow resolution and the area it covers |
| `bloom.strength` / `.radius` / `.threshold` | Glow amount, spread and cutoff |
| `ao.radius` / `.intensity` | Contact-shadow size and strength |
| `vignette`, `grain` | Finishing effects |
| `dust.count`, `rocks` | Particle and rock counts |
| `maxPixelRatio` | Resolution cap on high-density screens |

If it runs slowly, lower `maxPixelRatio` to 1 or 1.5 first, then set `interiorShadows` to `false`.

## Extending it

**Add a task**

1. Add an entry to `taskDefs` in `data/tasks.ts`, pointing at a console and a resource.
2. If it needs a new minigame, add its name to `PanelType`, write a component that takes `{ onComplete }` and calls it when solved, and register it in the `PANELS` map in `tasks/TaskPanel.tsx`.

The HUD task list, the prompt, the minimap marker and the console colour all pick it up from the data.

**Add a console or a prop**

Add it to `consoles` or `props` in `data/base.ts`. Collision and the minimap follow automatically. For a new *kind* of prop, add a case to `buildProp` in `scene/Base.tsx` and keep the model inside its footprint.

**Change the floor plan**

Edit `rooms` and `walls` in `data/base.ts`. Doors go in as openings on a wall. Geometry, collision and minimap rebuild from that. Ceiling fixtures and light strips are positioned per room in `Lighting.tsx` and `Base.tsx` and may need adjusting for new room shapes.

**Add a resource**

Add its id to `ResourceId` in `data/tasks.ts`, then an entry in `initialResources` and `RESOURCE_ORDER` in `state/store.ts`.

## Troubleshooting

**The mouse does nothing while I hold a movement key.**
On a laptop touchpad this is almost always the operating system's "disable touchpad while typing" setting, not the game. On Hyprland, set `disable_while_typing = false` in the `touchpad` block of your input config. Other desktops have an equivalent in their touchpad settings. A real mouse is not affected.

**I clicked Resume and the mouse still is not captured.**
Browsers refuse a pointer lock for about a second after `Esc`. Click the scene once more.

**It is slow.**
See the note at the end of [Tuning the visuals](#tuning-the-visuals).

**The build warns about a chunk over 500 kB.**
That is three.js. It is harmless for a prototype.

## Known limits

- No multiplayer, no other characters, no roles beyond a label, no meetings or voting.
- No win or lose condition; resources cannot reach zero.
- No sound.
- No menu, lobby or settings screen. Visual settings are edited in code.
- The task minigames are not balanced for difficulty.
- All art is procedural: generated geometry and textures, no modelled or scanned assets.
- Desktop only: it needs a keyboard, and has no touch or gamepad controls.
