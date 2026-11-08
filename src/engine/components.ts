import type { GameObject } from './scene';
import { Vec2, Vec3 } from './math';

export abstract class Component {
  owner!: GameObject;
  enabled = true;
  onUpdate(_deltaSeconds: number): void {}
}

export class Sprite extends Component {
  constructor(public color = '#f2c14e', public width = 24, public height = 24, public image?: HTMLImageElement) { super(); }
  sourceRect?: { x: number; y: number; width: number; height: number };
}

export class Tilemap extends Component {
  constructor(public columns: number, public rows: number, public tileSize: number, public tiles: number[], public palette: Record<number, string>) { super(); }
}

export class Camera2D extends Component {
  zoom = 1;
  followTarget?: GameObject;
}

export class Collider extends Component {
  constructor(public width: number, public height: number, public onOverlap?: (other: GameObject) => void) { super(); }
}

export class Animator extends Component {
  private elapsed = 0;
  frame = 0;
  constructor(public frameWidth: number, public frameHeight: number, public frameCount: number, public framesPerSecond = 8, public loop = true) { super(); }
  override onUpdate(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    const frameDuration = 1 / Math.max(0.01, this.framesPerSecond);
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      this.frame = this.loop ? (this.frame + 1) % this.frameCount : Math.min(this.frame + 1, this.frameCount - 1);
    }
    const sprite = this.owner.getComponent(Sprite);
    if (sprite) sprite.sourceRect = { x: this.frame * this.frameWidth, y: 0, width: this.frameWidth, height: this.frameHeight };
  }
}

export interface Face { a: number; b: number; c: number; color?: string }
export class Mesh3D extends Component {
  constructor(public vertices: Vec3[], public faces: Face[], public color = '#69d2e7', public orthographicScale = 1) { super(); }
}

export class DirectionalLight extends Component {
  constructor(public direction = new Vec3(-0.4, -0.8, -0.6), public intensity = 0.8) { super(); }
}

export function componentPosition2D(object: GameObject): Vec2 { return new Vec2(object.transform.position.x, object.transform.position.y); }
