# ZSharp Game Engine

The engine starter now includes 2D tilemap collision cells, named sprite-atlas animation clips, contact enter/exit callbacks, a lightweight distance constraint, versioned scene JSON persistence, and a bounded undo/redo command history. The demo scene includes a player, collectible and enemy placeholders.

## Run

```sh
npm install
npm run dev
npm test
npm run build:web
```

Physics remains a minimal AABB educational solver and must not be described as production-grade: no CCD, robust stacking, optimized broadphase, full joint family, or platform-scale stress suite. For production physics, integrate a mature Box2D-compatible backend and validate it with determinism/performance tests. Scene serialization supports known built-in components; asset keys are stored, but app-specific asset resolver and editor file controls must be wired by the host. The editor history utility is provided for command integration; not every UI action is yet undoable. The interactive demo still needs UI wiring for win/lose and collectible score feedback.
