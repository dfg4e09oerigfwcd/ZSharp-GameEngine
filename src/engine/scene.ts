import { Vec3 } from './math';
import { Component, Collider, DistanceJoint, RigidBody2D, Tilemap } from './components';

export class Transform {
  position = new Vec3();
  rotation = new Vec3();
  scale = new Vec3(1, 1, 1);
}

export class GameObject {
  /** Assigned deterministically by Scene.add, in insertion order. */
  id = -1;
  readonly transform = new Transform();
  readonly components: Component[] = [];
  visible = true;
  constructor(public name: string) {}
  addComponent<T extends Component>(component: T): T {
    component.owner = this;
    this.components.push(component);
    return component;
  }
  getComponent<T extends Component>(type: new (...args: never[]) => T): T | undefined {
    return this.components.find((component): component is T => component instanceof type);
  }
}
export type ContactEvent = { a: GameObject; b: GameObject };
type ColliderEntry = { object: GameObject; collider: Collider; body: RigidBody2D | undefined };

/**
 * Deterministic, fixed-step 2D AABB simulation for small games and tools.
 * It is not a replacement for a mature physics engine in production titles:
 * CCD, rotated shapes and a spatial broadphase are intentionally out of scope.
 */
export class Scene {
  readonly objects: GameObject[] = [];
  readonly fixedTick = 0;
  private mutableTick = 0;
  private contacts = new Map<string, ContactEvent>();
  constructor(public name = 'Untitled Scene', public gravityY = -900) {}
  get tick(): number { return this.mutableTick; }
  add(object: GameObject): GameObject {
    if (this.objects.includes(object)) throw new Error('An object can only be added to a scene once.');
    object.id = this.objects.length;
    this.objects.push(object);
    return object;
  }
  remove(object: GameObject): void {
    const index = this.objects.indexOf(object);
    if (index < 0) return;
    for (const [key, contact] of this.contacts) {
      if (contact.a === object || contact.b === object) {
        this.notify(contact, 'exit');
        this.contacts.delete(key);
      }
    }
    this.objects.splice(index, 1);
    this.objects.forEach((entry, order) => { entry.id = order; });
    this.contacts.clear();
  }
  find(name: string): GameObject | undefined { return this.objects.find(object => object.name === name); }

  /** Execute game logic and physics as one deterministic fixed simulation step. */
  simulateFixedStep(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) throw new RangeError('Fixed timestep must be a positive finite number.');
    this.update(deltaSeconds);
    this.stepPhysics(deltaSeconds);
    this.mutableTick++;
  }
  update(deltaSeconds: number): void {
    for (const object of [...this.objects]) {
      if (!object.visible || !this.objects.includes(object)) continue;
      for (const component of [...object.components]) if (component.enabled) component.onUpdate(deltaSeconds);
    }
  }
  stepPhysics(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new RangeError('Physics timestep must be finite and non-negative.');
    const colliders: ColliderEntry[] = this.objects.flatMap(object => {
      const collider = object.getComponent(Collider);
      return object.visible && collider?.enabled ? [{ object, collider, body: object.getComponent(RigidBody2D) }] : [];
    });
    for (const { object, body } of colliders) {
      if (!body || body.isStatic || !body.enabled) continue;
      body.velocity.y += this.gravityY * body.gravityScale * deltaSeconds;
      object.transform.position.x += body.velocity.x * deltaSeconds;
      object.transform.position.y += body.velocity.y * deltaSeconds;
    }
    const current = new Map<string, ContactEvent>();
    for (let i = 0; i < colliders.length; i++) for (let j = i + 1; j < colliders.length; j++) {
      const a = colliders[i]!; const b = colliders[j]!;
      if (a.body?.isStatic && b.body?.isStatic) continue;
      const dx = b.object.transform.position.x - a.object.transform.position.x;
      const dy = b.object.transform.position.y - a.object.transform.position.y;
      const overlapX = (a.collider.width + b.collider.width) / 2 - Math.abs(dx);
      const overlapY = (a.collider.height + b.collider.height) / 2 - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) continue;
      const key = this.pairKey(a.object, b.object);
      current.set(key, { a: a.object, b: b.object });
      a.collider.onOverlap?.(b.object); b.collider.onOverlap?.(a.object);
      if (a.collider.isTrigger || b.collider.isTrigger) continue;
      this.resolvePair(a, b, overlapX, overlapY, dx, dy);
    }
    this.solveTilemaps(colliders, current);
    this.solveDistanceJoints();
    for (const [key, contact] of current) if (!this.contacts.has(key)) this.notify(contact, 'enter');
    for (const [key, contact] of this.contacts) if (!current.has(key)) this.notify(contact, 'exit');
    this.contacts = current;
  }
  private resolvePair(a: ColliderEntry, b: ColliderEntry, overlapX: number, overlapY: number, dx: number, dy: number): void {
    const aDynamic = !!a.body && !a.body.isStatic && a.body.enabled;
    const bDynamic = !!b.body && !b.body.isStatic && b.body.enabled;
    if (!aDynamic && !bDynamic) return;
    const useX = overlapX < overlapY;
    const axis = useX ? 'x' : 'y';
    const direction = Math.sign(useX ? dx : dy) || 1;
    const penetration = useX ? overlapX : overlapY;
    const invMassA = aDynamic ? 1 / Math.max(0.001, a.body!.mass) : 0;
    const invMassB = bDynamic ? 1 / Math.max(0.001, b.body!.mass) : 0;
    const invMassSum = invMassA + invMassB;
    if (aDynamic) a.object.transform.position[axis] -= direction * penetration * invMassA / invMassSum;
    if (bDynamic) b.object.transform.position[axis] += direction * penetration * invMassB / invMassSum;
    const relativeVelocity = (b.body?.velocity[axis] ?? 0) - (a.body?.velocity[axis] ?? 0);
    if (relativeVelocity * direction >= 0) return;
    const restitution = Math.min(1, Math.max(a.body?.restitution ?? 0, b.body?.restitution ?? 0));
    const impulse = -(1 + restitution) * relativeVelocity * direction / invMassSum;
    if (aDynamic) a.body!.velocity[axis] -= impulse * invMassA * direction;
    if (bDynamic) b.body!.velocity[axis] += impulse * invMassB * direction;
    if (!useX) {
      if (aDynamic) a.body!.velocity.x *= Math.max(0, Math.min(1, a.body!.friction));
      if (bDynamic) b.body!.velocity.x *= Math.max(0, Math.min(1, b.body!.friction));
    }
  }
  private solveTilemaps(colliders: ColliderEntry[], contacts: Map<string, ContactEvent>): void {
    for (const { object, collider, body } of colliders) {
      if (!body || body.isStatic || !body.enabled) continue;
      for (const mapObject of this.objects) {
        const map = mapObject.getComponent(Tilemap);
        if (!map || !map.enabled || !map.solidTileIds.length) continue;
        const tileSize = map.tileSize;
        const left = mapObject.transform.position.x - map.columns * tileSize / 2;
        const top = mapObject.transform.position.y + map.rows * tileSize / 2;
        const minColumn = Math.max(0, Math.floor((object.transform.position.x - collider.width / 2 - left) / tileSize));
        const maxColumn = Math.min(map.columns - 1, Math.floor((object.transform.position.x + collider.width / 2 - left) / tileSize));
        const minRow = Math.max(0, Math.floor((top - object.transform.position.y - collider.height / 2) / tileSize));
        const maxRow = Math.min(map.rows - 1, Math.floor((top - object.transform.position.y + collider.height / 2) / tileSize));
        for (let row = minRow; row <= maxRow; row++) for (let column = minColumn; column <= maxColumn; column++) {
          if (!map.isSolid(column, row)) continue;
          const tileX = left + (column + 0.5) * tileSize;
          const tileY = top - (row + 0.5) * tileSize;
          const dx = object.transform.position.x - tileX;
          const dy = object.transform.position.y - tileY;
          const overlapX = (collider.width + tileSize) / 2 - Math.abs(dx);
          const overlapY = (collider.height + tileSize) / 2 - Math.abs(dy);
          if (overlapX <= 0 || overlapY <= 0) continue;
          contacts.set(this.pairKey(object, mapObject), { a: object, b: mapObject });
          const useX = overlapX < overlapY;
          const axis = useX ? 'x' : 'y';
          const direction = Math.sign(useX ? dx : dy) || 1;
          object.transform.position[axis] += direction * (useX ? overlapX : overlapY);
          if (body.velocity[axis] * direction < 0) body.velocity[axis] = 0;
        }
      }
    }
  }
  private solveDistanceJoints(): void {
    for (const object of this.objects) for (const joint of object.components.filter((component): component is DistanceJoint => component instanceof DistanceJoint && component.enabled)) {
      const other = joint.other;
      if (!this.objects.includes(other)) continue;
      const dx = other.transform.position.x - object.transform.position.x;
      const dy = other.transform.position.y - object.transform.position.y;
      const distance = Math.hypot(dx, dy);
      if (!distance) continue;
      const error = (distance - Math.max(0, joint.length)) * Math.max(0, Math.min(1, joint.stiffness));
      const aMovable = !!object.getComponent(RigidBody2D) && !object.getComponent(RigidBody2D)!.isStatic;
      const bMovable = !!other.getComponent(RigidBody2D) && !other.getComponent(RigidBody2D)!.isStatic;
      const count = Number(aMovable) + Number(bMovable);
      if (!count) continue;
      if (aMovable) { object.transform.position.x += dx / distance * error / count; object.transform.position.y += dy / distance * error / count; }
      if (bMovable) { other.transform.position.x -= dx / distance * error / count; other.transform.position.y -= dy / distance * error / count; }
    }
  }
  private pairKey(a: GameObject, b: GameObject): string { return a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`; }
  private notify(contact: ContactEvent, kind: 'enter' | 'exit'): void {
    const a = contact.a.getComponent(Collider); const b = contact.b.getComponent(Collider);
    if (kind === 'enter') { a?.onEnter?.(contact.b); b?.onEnter?.(contact.a); }
    else { a?.onExit?.(contact.b); b?.onExit?.(contact.a); }
  }
}
