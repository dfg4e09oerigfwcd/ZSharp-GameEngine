# Starter architecture

`src/engine/` holds reusable engine primitives. `Scene` owns `GameObject`s; each object owns a `Transform` and a list of `Component`s. `GameEngine` drives updates and forwards input, and `CanvasRenderer` draws 2D components and orthographic mesh faces. `src/sample/createSampleScene.ts` assembles an example using only those APIs. `src/main.ts` is the editor shell and UI wiring.

## Extension seams

- Implement asset loading/cache and project serialization around the `Sprite` image field and editor asset list.
- Replace AABB notifications in `Scene.detectOverlaps` with a proper broad/narrow-phase physics system.
- Replace `CanvasRenderer.drawMesh` with WebGL/WebGPU when scale warrants it.
- Expand the explicit Z# parser in `ZSharpRuntime`; keep the language sandboxed and add tests for each grammar feature.
- Add scene selection, drag handles, undo/redo, and persistence to the editor shell.
