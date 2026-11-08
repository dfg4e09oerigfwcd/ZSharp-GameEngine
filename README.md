# ZSharp Game Engine

A small, extensible 2D-first game-engine starter with a lightweight orthographic 3D renderer, a safe Z# command interpreter stub, and a browser-based editor shell. It is intentionally a foundation rather than a finished commercial engine.

## Requirements

- Node.js 20 or newer and npm

## Run and build

```sh
npm install
npm run dev
npm test
npm run build:web
npm run build:desktop
```

The web build is written to `dist/`. `build:desktop` packages the same editor shell with Electron for Windows, macOS, or Linux; run it on the target platform to produce its installer. To open the desktop shell during development, use `npx electron desktop/main.cjs` after `npm run dev` in another terminal (the current desktop entry loads the packaged `dist/` build).

## Included foundation

- Core: fixed-step-capable requestAnimationFrame loop, scene/object/component model, transforms, keyboard input, and delta-time updates.
- 2D: canvas sprites, tilemaps, camera zoom/follow, AABB collision callbacks, and sprite-sheet animation.
- Small 3D: colored triangle meshes, orthographic projection, depth sorting, and directional face lighting, rendered alongside the 2D scene.
- Z#: deliberately limited interpreter for `print`, `move`, and `set` statements. It parses a small safe command set and does not execute JavaScript or arbitrary code.
- Editor: scene viewport, object hierarchy, asset list, inspector, play/pause, and a Z# console panel.
- Export: Vite static web build and Electron desktop packaging.
- Example: a 2D player/sprite/tilemap scene with an orbiting low-poly 3D prism. `src/sample/` is the project starting point.

## Engine API sketch

Create a `Scene`, add `GameObject`s, and attach components with `object.addComponent(new Sprite(...))`. `GameEngine` owns the animation loop and `CanvasRenderer` draws the active scene. The sample scene in `src/sample/createSampleScene.ts` is the best executable reference.

## Z# starter syntax

```text
print("Hello from Z#")
move("Player", 1, 0)
set("Player.x", 4)
```

Z# currently supports only those commands; diagnostics report invalid statements instead of evaluating untrusted source. Extend the parser deliberately as the language design matures.

## Known limits / next steps

This MVP has no GPU renderer, imported asset pipeline, audio backend, rigid-body solver, 3D camera controls, or platform-native packaging verification. Collisions are overlap notifications only. The inspector edits basic transform values; persistence and undo/redo are natural next steps.
