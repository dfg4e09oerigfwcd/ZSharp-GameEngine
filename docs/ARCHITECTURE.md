# Runtime and editor notes

Scene collision now supports AABB contacts, opted-in solid tile ids, contact enter/exit callbacks, simple distance constraints, and fixed-step integration. This is still a compact educational/demo solver—not production-grade physics: it lacks continuous collision detection, robust stacking, broadphase acceleration, full joint types, and extensive numerical stability testing. Use a mature Box2D/Planck backend for shipped physics-heavy titles.

Scene persistence uses versioned JSON through `serializeScene` / `deserializeScene`, supports engine-owned components and asset keys, and deliberately rejects unknown custom components. `UndoHistory` provides bounded command-based undo/redo for editor integrations.

Named animation clips are supported by `AnimationController`; clips reference sprite-atlas source rectangles. Tilemap solid ids are passed to `Tilemap` and used by the scene solver.
