# Engine package layout and deterministic gameplay

The workspace now exposes `@zsharp/core` and `@zsharp/gameplay-sample` packages under `packages/`. The core package facade exports the scene graph, component primitives, physics, and versioned scene persistence; the sample package exports the sample world and testable game rules. Existing Vite editor imports remain under `src/` during this migration so the editor can be moved without breaking its current entry point.

## Simulation contract

Advance simulation only with `Scene.simulateFixedStep(1 / 60)`. The scene updates components in insertion order, integrates bodies, resolves AABB contacts and opted-in solid tile cells in stable object order, solves simple distance constraints, then dispatches contact transitions. `Scene.tick` counts completed fixed steps. Replaying the same initial state and inputs at the same fixed-step sequence is deterministic within the same JS runtime; cross-platform floating-point bitwise determinism is not promised.

The 2D solver is improved for small demos with inverse-mass positional correction, restitution impulses, basic friction, tile-cell collision, and enter/exit events. It remains intentionally simple: no CCD, rotated shapes, optimized broadphase, robust stack/joint solver, or production workload qualification. Use Box2D/Planck or another mature engine for production physics-heavy titles.

## Save/load

`serializeScene` and `deserializeScene` support built-in components and stable object references in versioned JSON. `saveSceneToStorage` and `loadSceneFromStorage` allow browser storage or injected storage adapters for tests. Custom runtime components and functions are intentionally not serialized; store their authored configuration in a registered component schema before shipping.

The gameplay sample's `DemoGameRules` can be exercised without DOM: collect three `Coin N` objects to win, or touch `Enemy` to lose. Run `npm test` for deterministic-step, tile collision, serialization/storage, animation-state and win/lose tests.
