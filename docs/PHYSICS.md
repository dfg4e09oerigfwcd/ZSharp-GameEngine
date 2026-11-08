# Physics backend migration

2D rigid-body collision is backed by Planck.js, a Box2D-compatible TypeScript/JavaScript engine, via `src/engine/physics.ts`. It supplies a dynamic-tree broadphase, iterative velocity/position constraint solving, oriented bodies, convex polygon/circle/box fixtures, sensors and bullet/continuous collision options. Use `RigidBody2D.bullet = true` for fast-moving bodies and choose `Collider.shape` for non-box fixtures.

This integration is an MVP adapter: runtime verification, map mutation/rebuild, joint mapping, scene persistence of shape/CCD options, and target-platform performance testing remain required. Do not claim cross-platform bitwise determinism; floating-point physics can vary by JS engine and architecture. Fixed-step replay is reproducible within a pinned runtime/build and identical inputs, not guaranteed bitwise across platforms. For production releases, pin and audit dependency versions and run physics regression/stress tests.
