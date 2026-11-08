# ZSharp Game Engine

The engine uses Planck.js as a Box2D-compatible 2D physics backend for broadphase collision detection and rigid-body solving. It supports box, circle, and convex polygon colliders, sensor triggers, fixed-step simulation, and bullet flags for CCD. Tilemap solid cells are emitted as static fixtures.

```sh
npm install
npm run dev
npm test
npm run build:web
```

Physics integration is not yet production-certified: run the test suite and add stress/regression tests for the target browsers, tune CCD and body iteration settings, test tilemap rebuilds after edits, and validate scene serialization of all physics settings. Cross-platform bitwise determinism is not promised. `docs/PHYSICS.md` explains scope and known integration gaps.
