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
  /** Collision is opt-in by tile id; absent ids are non-solid. */
  constructor(public columns: number, public rows: number, public tileSize: number, public tiles: number[], public palette: Record<number, string>, public solidTileIds: number[] = []) { super(); }
  isSolid(column: number, row: number): boolean {
    if (column < 0 || row < 0 || column >= this.columns || row >= this.rows) return false;
    return this.solidTileIds.includes(this.tiles[row * this.columns + column] ?? 0);
  }
}
export class Camera2D extends Component {
  zoom = 1;
  followTarget?: GameObject;
  /** Pixel-space offset for editor pan. */
  readonly offset = new Vec2();
}
export class Collider extends Component {
  constructor(public width: number, public height: number, public onOverlap?: (other: GameObject) => void, public isTrigger = false) { super(); }
  onEnter?: (other: GameObject) => void;
  onExit?: (other: GameObject) => void;
}
export class RigidBody2D extends Component {
  readonly velocity = new Vec2();
  gravityScale = 1;
  mass = 1;
  restitution = 0;
  friction = 0.82;
  constructor(public isStatic = false) { super(); }
}
export interface AnimationClip { name: string; frames: Array<{ x: number; y: number; width: number; height: number }>; framesPerSecond: number; loop?: boolean }
/** Named atlas animations, e.g. idle/run/jump. Call play(name) to switch states. */
export class AnimationController extends Component {
  private elapsed = 0;
  private frame = 0;
  private current?: AnimationClip;
  constructor(public clips: Record<string, AnimationClip>, initial?: string) { super(); if (initial) this.play(initial); }
  play(name: string, restart = false): void {
    const clip = this.clips[name]; if (!clip) throw new Error(`Unknown animation state '${name}'.`);
    if (this.current?.name === name && !restart) return;
    this.current = clip; this.frame = 0; this.elapsed = 0; this.applyFrame();
  }
  override onUpdate(deltaSeconds: number): void {
    if (!this.current || !this.current.frames.length) return;
    this.elapsed += deltaSeconds;
    const duration = 1 / Math.max(0.01, this.current.framesPerSecond);
    while (this.elapsed >= duration) {
      this.elapsed -= duration;
      this.frame = this.current.loop === false ? Math.min(this.frame + 1, this.current.frames.length - 1) : (this.frame + 1) % this.current.frames.length;
    }
    this.applyFrame();
  }
  private applyFrame(): void { const sprite = this.owner?.getComponent(Sprite); const rect = this.current?.frames[this.frame]; if (sprite && rect) sprite.sourceRect = { ...rect }; }
}
/** Compatibility animator for horizontal uniform sprite sheets. */
export class Animator extends Component {
  private elapsed = 0; frame = 0;
  constructor(public frameWidth: number, public frameHeight: number, public frameCount: number, public framesPerSecond = 8, public loop = true) { super(); }
  override onUpdate(deltaSeconds: number): void {
    if (this.frameCount < 1) return;
    this.elapsed += deltaSeconds; const duration = 1 / Math.max(0.01, this.framesPerSecond);
    while (this.elapsed >= duration) { this.elapsed -= duration; this.frame = this.loop ? (this.frame + 1) % this.frameCount : Math.min(this.frame + 1, this.frameCount - 1); }
    const sprite = this.owner.getComponent(Sprite); if (sprite) sprite.sourceRect = { x: this.frame * this.frameWidth, y: 0, width: this.frameWidth, height: this.frameHeight };
  }
}
export class DistanceJoint extends Component {
  constructor(public other: GameObject, public length: number, public stiffness = 0.8) { super(); }
}
export interface Face { a: number; b: number; c: number; color?: string }
export class Mesh3D extends Component {
  constructor(public vertices: Vec3[], public faces: Face[], public color = '#69d2e7', public orthographicScale = 1) { super(); }
}
export class DirectionalLight extends Component {
  constructor(public direction = new Vec3(-0.4, -0.8, -0.6), public intensity = 0.8) { super(); }
}
export function componentPosition2D(object: GameObject): Vec2 { return new Vec2(object.transform.position.x, object.transform.position.y); }
