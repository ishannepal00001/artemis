# artemis

UI prototype for a first-person, Among Us-style game set on a lunar base, where crew tasks are about resource management and lunar output. There are no real game rules yet: the HUD, base and task panels run on fake state.

## Run

```sh
bun install   # or npm install
bun run dev   # or npm run dev
```

Controls: `WASD` move, mouse look (arrow keys also turn), `Shift` sprint, `E` use a console, `Esc` pause.

## Layout

- `src/data` base layout and task definitions. The 3D scene, collision and minimap are all derived from `base.ts`.
- `src/state` zustand store and the fake resource simulation.
- `src/scene` the 3D base (React Three Fiber).
- `src/hud` the in-game overlay.
- `src/tasks` the task panels opened at consoles.
