# ZSharp Game Engine

The project includes a workspace split into `packages/core` and `packages/gameplay-sample`, while the existing Vite editor remains at the repository root during migration. The core provides a deterministic fixed-step scene simulation, simple 2D AABB physics and solid tilemap cells, built-in scene JSON save/load, and animation states. The sample package contains a playable-scene factory and UI-independent coin/enemy win/lose rules.

```sh
npm install
npm run dev
npm test
npm run build:web
```

Advance simulations through `Scene.simulateFixedStep(1 / 60)`. Physics is a compact educational solver, not production-grade; it does not provide CCD, rotated colliders, spatial broadphase, robust stacking, or cross-platform bitwise determinism. Use a mature Box2D-compatible implementation for production physics. Scene persistence covers built-in components; custom components and editor UI save/load wiring are not automatic.
