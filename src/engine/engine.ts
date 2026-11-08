import { Scene } from './scene';
import { CanvasRenderer } from './renderer';
import { Camera2D, RigidBody2D } from './components';

export class Input {
  private readonly pressed = new Set<string>();
  constructor(target: Window = window) {
    target.addEventListener('keydown', event => { if (!['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName ?? '')) this.pressed.add(event.code); });
    target.addEventListener('keyup', event => this.pressed.delete(event.code));
    target.addEventListener('blur', () => this.pressed.clear());
  }
  isDown(code: string): boolean { return this.pressed.has(code); }
}
/** Fixed timestep is the sole path that advances scene logic and physics. */
export class GameEngine {
  readonly input = new Input();
  private running = false;
  private previousTime = 0;
  private accumulator = 0;
  private readonly fixedStep = 1 / 60;
  private readonly maxStepsPerFrame = 5;
  constructor(public scene: Scene, private readonly canvas: HTMLCanvasElement, private readonly renderer: CanvasRenderer) {}
  start(): void { if (this.running) return; this.running = true; this.previousTime = performance.now(); requestAnimationFrame(this.tick); }
  stop(): void { this.running = false; }
  private readonly tick = (time: number): void => {
    if (!this.running) return;
    const delta = Math.min(Math.max(0, (time - this.previousTime) / 1000), 0.1);
    this.previousTime = time;
    this.update(delta);
    this.render();
    requestAnimationFrame(this.tick);
  };
  update(delta: number): void {
    const camera = this.scene.objects.find(object => object.getComponent(Camera2D))?.getComponent(Camera2D);
    const target = camera?.followTarget;
    if (target) {
      const body = target.getComponent(RigidBody2D);
      const left = this.input.isDown('ArrowLeft') || this.input.isDown('KeyA');
      const right = this.input.isDown('ArrowRight') || this.input.isDown('KeyD');
      if (body && !body.isStatic) {
        body.velocity.x = (Number(right) - Number(left)) * 220;
        if (this.input.isDown('Space') && Math.abs(body.velocity.y) < 1) body.velocity.y = 390;
      } else {
        const speed = 180 * delta;
        if (left) target.transform.position.x -= speed;
        if (right) target.transform.position.x += speed;
      }
    }
    this.accumulator = Math.min(this.accumulator + delta, this.fixedStep * this.maxStepsPerFrame);
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < this.maxStepsPerFrame) {
      this.scene.simulateFixedStep(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps++;
    }
  }
  render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * pixelRatio));
    const height = Math.max(1, Math.floor(rect.height * pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    this.renderer.render(this.scene, width, height);
  }
}
