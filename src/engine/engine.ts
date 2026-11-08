import { Scene } from './scene';
import { CanvasRenderer } from './renderer';
import { Camera2D } from './components';

export class Input {
  private readonly pressed = new Set<string>();
  constructor(target: Window = window) {
    target.addEventListener('keydown', event => this.pressed.add(event.code));
    target.addEventListener('keyup', event => this.pressed.delete(event.code));
    target.addEventListener('blur', () => this.pressed.clear());
  }
  isDown(code: string): boolean { return this.pressed.has(code); }
}

export class GameEngine {
  readonly input = new Input();
  private running = false;
  private previousTime = 0;
  constructor(public scene: Scene, private readonly canvas: HTMLCanvasElement, private readonly renderer: CanvasRenderer) {}
  start(): void { if (this.running) return; this.running = true; this.previousTime = performance.now(); requestAnimationFrame(this.tick); }
  stop(): void { this.running = false; }
  private readonly tick = (time: number): void => {
    if (!this.running) return;
    const delta = Math.min((time - this.previousTime) / 1000, 0.05);
    this.previousTime = time;
    this.update(delta);
    this.render();
    requestAnimationFrame(this.tick);
  };
  update(delta: number): void {
    const camera = this.scene.objects.find(object => object.getComponent(Camera2D))?.getComponent(Camera2D);
    const target = camera?.followTarget;
    if (target) {
      const speed = 180 * delta;
      if (this.input.isDown('ArrowLeft') || this.input.isDown('KeyA')) target.transform.position.x -= speed;
      if (this.input.isDown('ArrowRight') || this.input.isDown('KeyD')) target.transform.position.x += speed;
      if (this.input.isDown('ArrowUp') || this.input.isDown('KeyW')) target.transform.position.y += speed;
      if (this.input.isDown('ArrowDown') || this.input.isDown('KeyS')) target.transform.position.y -= speed;
    }
    this.scene.update(delta);
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
