# ZSharp Game Engine

A small 2D-first game-engine starter with a lightweight orthographic 3D renderer, browser editor, and safe Z# interpreter. It is an MVP foundation, not a finished production engine.

## Run and build

Requires Node.js 20+.

```sh
npm install
npm run dev
npm test
npm run build:web
npm run build:desktop
```

Open the editor and click **Play demo**. Move with A/D or arrow keys, jump with Space, and use the Z# console. In editor mode click a sprite to select and drag it in the viewport. The sample player sprite atlas is loaded from `public/assets/player.svg`; failed image requests report an error and sprites retain their color fallback.

## What is included

- **Core:** scene graph, transforms/components, frame loop, keyboard input, fixed-step physics update.
- **2D:** cached image asset pipeline, atlas animation, tilemap rendering, camera follow/zoom, AABB rigid bodies with gravity, collision resolution, restitution/friction settings, and triggers.
- **3D:** low-poly triangle meshes, orthographic projection and simple directional face lighting on Canvas 2D.
- **Audio/resources:** promise-cached image/audio loading, preload progress callbacks, WebAudio playback and generated tone effects.
- **Editor:** scene hierarchy, transform inspector, click selection, drag transforms, add-object and play/reset controls.
- **Z#:** safe line-oriented language subset: number variables, arithmetic/precedence/parentheses, comparisons/`if` blocks, `print`, `move`, `set`, `spawn` and `destroy`. It never uses `eval` or executes source as JavaScript.
- **Export:** Vite static web build and Electron desktop packaging.

## Z# example

```text
let step = 2 + 3 * 2
if step >= 8
  print("moving")
  move("Player", step, 0)
end
```

The language is intentionally constrained: one-line statements and `if`/`end` blocks, numeric variables, and whitelisted scene commands. Loops, functions, persistence, and a formal compiler are future work.

## Current limitations

Physics is a simple AABB solver for small demos, not a continuous or production-grade rigid-body engine; tilemap collision shapes, joints, and contact enter/exit events are not implemented. Audio uses browser WebAudio and requires user interaction to unlock playback. Asset URLs are loaded directly from the web app and project import/serialization is not yet available. The editor does not yet include undo/redo or scene save/load. 3D rendering is deliberately small and CPU-based.
