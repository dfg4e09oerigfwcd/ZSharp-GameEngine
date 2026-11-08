import { Scene } from './scene';
import { CanvasRenderer } from './renderer';
import { Camera2D } from './components';

export class Input {
  private readonly pressed = new Set<string>();
  constructor(target: Window = window) {
    target.addEventListener('keydown', event => { if (!['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName ?? '')) this.pressed.add(event.code); });
    target.addEventListener('keyup', event => this.pressed.delete(event.code));
    target.addEventListener('blur', () => this.pressed.clear());
  }
  isDown(code: string): boolean { return this.pressed.has(code); }
}

/** RAF rendering with a bounded fixed-step physics accumulator. */
export class GameEngine {
  readonly input = new Input();
  private running = false;
  private previousTime = 0;
  private physicsAccumulator = 0;
  private readonly fixedStep = 1 / 60;
  constructor(public scene: Scene, private readonly canvas: HTMLCanvasElement, private readonly renderer: CanvasRenderer) {}
  start(): void { if (this.running) return; this.running = true; this.previousTime = performance.now(); requestAnimationFrame(this.tick); }
  stop(): void { this.running = false; }
  private readonly tick = (time: number): void => {
    if (!this.running) return;
    const delta = Math.min((time - this.previousTime) / 1000, 0.05);
    this.previousTime = time;
    this.update(delta); this.render(); requestAnimationFrame(this.tick);
  };
  update(delta: number): void {
    const camera = this.scene.objects.find(object => object.getComponent(Camera2D))?.getComponent(Camera2D);
    const target = camera?.followTarget;
    if (target) {
      const body = target.getComponent((requireRigidBody()) as never);
      const speed = 220;
      const left = this.input.isDown('ArrowLeft') || this.input.isDown('KeyA');
      const right = this.input.isDown('ArrowRight') || this.input.isDown('KeyD');
      if (body && !body.isStatic) body.velocity.x = (Number(right) - Number(left)) * speed;
      else { if (left) target.transform.position.x -= speed * delta; if (right) target.transform.position.x += speed * delta; }
      if (this.input.isDown('Space') && body && Math.abs(body.velocity.y) < 1) body.velocity.y = 390;
    }
    this.scene.update(delta);
    this.physicsAccumulator = Math.min(this.physicsAccumulator + delta, this.fixedStep * 5);
    while (this.physicsAccumulator >= this.fixedStep) { this.scene.stepPhysics(this.fixedStep); this.physicsAccumulator -= this.fixedStep; }
  }
  render(): void {
    const rect = this.canvas.getBoundingClientRect(); const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * pixelRatio)); const height = Math.max(1, Math.floor(rect.height * pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    this.renderer.render(this.scene, width, height);
  }
}

// Avoid a runtime import cycle: component classes are fetched lazily for instanceof lookup.
function requireRigidBody(): typeof import('./components').RigidBody2D {
  return RigidBody2DClass;
}
import { RigidBody2D as RigidBody2DClass } from './components';
