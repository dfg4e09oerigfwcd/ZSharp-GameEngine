import { AnimationController, Animator, Camera2D, Collider, DirectionalLight, DistanceJoint, Mesh3D, RigidBody2D, Sprite, Tilemap } from './components';
import { GameObject, Scene } from './scene';
import { Vec3 } from './math';

type ComponentData = Record<string, unknown>;
export interface SceneData { version: 1; name: string; gravityY: number; objects: Array<{ name: string; visible: boolean; transform: { position: Vec3; rotation: Vec3; scale: Vec3 }; components: ComponentData[] }> }
/** Versioned JSON persistence for engine-owned component types. Image objects are represented by asset URLs/keys. */
export function serializeScene(scene: Scene): string {
  const indices = new Map(scene.objects.map((object, index) => [object, index]));
  const objects = scene.objects.map(object => ({ name: object.name, visible: object.visible, transform: { position: object.transform.position, rotation: object.transform.rotation, scale: object.transform.scale }, components: object.components.map(component => {
    if (component instanceof Sprite) return { type: 'Sprite', color: component.color, width: component.width, height: component.height, asset: component.assetKey ?? null, sourceRect: component.sourceRect ?? null };
    if (component instanceof Tilemap) return { type: 'Tilemap', columns: component.columns, rows: component.rows, tileSize: component.tileSize, tiles: component.tiles, palette: component.palette, solidTileIds: component.solidTileIds };
    if (component instanceof Collider) return { type: 'Collider', width: component.width, height: component.height, isTrigger: component.isTrigger };
    if (component instanceof RigidBody2D) return { type: 'RigidBody2D', isStatic: component.isStatic, velocity: component.velocity, gravityScale: component.gravityScale, mass: component.mass, restitution: component.restitution, friction: component.friction };
    if (component instanceof Camera2D) return { type: 'Camera2D', zoom: component.zoom, followIndex: component.followTarget ? indices.get(component.followTarget) : null, offset: component.offset };
    if (component instanceof Animator) return { type: 'Animator', frameWidth: component.frameWidth, frameHeight: component.frameHeight, frameCount: component.frameCount, framesPerSecond: component.framesPerSecond, loop: component.loop };
    if (component instanceof AnimationController) return { type: 'AnimationController', clips: component.clips };
    if (component instanceof DistanceJoint) return { type: 'DistanceJoint', otherIndex: indices.get(component.other), length: component.length, stiffness: component.stiffness };
    if (component instanceof Mesh3D) return { type: 'Mesh3D', vertices: component.vertices, faces: component.faces, color: component.color, orthographicScale: component.orthographicScale };
    if (component instanceof DirectionalLight) return { type: 'DirectionalLight', direction: component.direction, intensity: component.intensity };
    throw new Error(`Cannot serialize component '${component.constructor.name}'.`);
  }) }));
  return JSON.stringify({ version: 1, name: scene.name, gravityY: scene.gravityY, objects }, null, 2);
}
export function deserializeScene(json: string, resolveImage?: (key: string) => HTMLImageElement | undefined): Scene {
  const data = JSON.parse(json) as SceneData;
  if (data.version !== 1 || !Array.isArray(data.objects)) throw new Error('Unsupported or invalid scene file.');
  const scene = new Scene(data.name, data.gravityY); const objects = data.objects.map(record => {
    const object = scene.add(new GameObject(record.name)); object.visible = record.visible;
    Object.assign(object.transform.position, record.transform.position); Object.assign(object.transform.rotation, record.transform.rotation); Object.assign(object.transform.scale, record.transform.scale);
    return object;
  });
  data.objects.forEach((record, objectIndex) => record.components.forEach(raw => {
    const c = raw as ComponentData; const object = objects[objectIndex]!;
    switch (c.type) {
      case 'Sprite': { const sprite = object.addComponent(new Sprite(String(c.color), Number(c.width), Number(c.height), typeof c.asset === 'string' ? resolveImage?.(c.asset) : undefined)); sprite.assetKey = typeof c.asset === 'string' ? c.asset : undefined; sprite.sourceRect = c.sourceRect as Sprite['sourceRect']; break; }
      case 'Tilemap': object.addComponent(new Tilemap(Number(c.columns), Number(c.rows), Number(c.tileSize), c.tiles as number[], c.palette as Record<number, string>, c.solidTileIds as number[] ?? [])); break;
      case 'Collider': object.addComponent(new Collider(Number(c.width), Number(c.height), undefined, Boolean(c.isTrigger))); break;
      case 'RigidBody2D': { const body = object.addComponent(new RigidBody2D(Boolean(c.isStatic))); Object.assign(body.velocity, c.velocity); body.gravityScale = Number(c.gravityScale); body.mass = Number(c.mass); body.restitution = Number(c.restitution); body.friction = Number(c.friction); break; }
      case 'Camera2D': { const camera = object.addComponent(new Camera2D()); camera.zoom = Number(c.zoom); camera.offset.x = Number((c.offset as {x:number})?.x ?? 0); camera.offset.y = Number((c.offset as {y:number})?.y ?? 0); const follow = c.followIndex; if (typeof follow === 'number') camera.followTarget = objects[follow]; break; }
      case 'Animator': object.addComponent(new Animator(Number(c.frameWidth), Number(c.frameHeight), Number(c.frameCount), Number(c.framesPerSecond), Boolean(c.loop))); break;
      case 'AnimationController': object.addComponent(new AnimationController(c.clips as ConstructorParameters<typeof AnimationController>[0])); break;
      case 'DistanceJoint': { const other = objects[Number(c.otherIndex)]; if (other) object.addComponent(new DistanceJoint(other, Number(c.length), Number(c.stiffness))); break; }
      case 'Mesh3D': object.addComponent(new Mesh3D(c.vertices as Vec3[], c.faces as ConstructorParameters<typeof Mesh3D>[1], String(c.color), Number(c.orthographicScale))); break;
      case 'DirectionalLight': object.addComponent(new DirectionalLight(c.direction as Vec3, Number(c.intensity))); break;
      default: throw new Error(`Unknown serialized component '${String(c.type)}'.`);
    }
  }));
  return scene;
}
/** Bounded undo/redo history for editor commands. */
export class UndoHistory {
  private undoStack: Array<{ undo: () => void; redo: () => void }> = []; private redoStack: Array<{ undo: () => void; redo: () => void }> = [];
  constructor(private readonly limit = 100) {}
  execute(command: { undo: () => void; redo: () => void }): void { command.redo(); this.undoStack.push(command); if (this.undoStack.length > this.limit) this.undoStack.shift(); this.redoStack = []; }
  undo(): void { const command = this.undoStack.pop(); if (command) { command.undo(); this.redoStack.push(command); } }
  redo(): void { const command = this.redoStack.pop(); if (command) { command.redo(); this.undoStack.push(command); } }
}
