# Runtime and editor notes

`AssetManager` promise-caches image and decoded audio requests; `AudioManager` plays decoded buffers or synthesized demo tones. Images are attached to `Sprite` components, with `sourceRect` used for atlas animation.

`Scene` owns object/component lifetimes and exposes a fixed-step `stepPhysics` method. Dynamic `RigidBody2D` instances integrate gravity and velocity; colliders on objects without a dynamic body are immovable. AABB resolution uses inverse mass distribution, restitution and basic tangential friction. Trigger colliders report overlap without resolving it.

The editor runs the scene loop continuously. Editor pointer events map the canvas through its 2D camera to world coordinates, select sprite bounds, and update selected transforms while dragging. The play button enables keyboard control and jumping for the sample character.

Z# is a deliberately constrained interpreter. Its numeric expression parser implements unary signs, parentheses, multiplication/division and addition/subtraction. `if <expr> <comparison> <expr>` blocks end with `end`. Explicit commands are the only host bridge; arbitrary code evaluation is not supported.
