import { Vec3 } from './math';
import { Component, Collider, DistanceJoint, RigidBody2D, Tilemap } from './components';

export class Transform {
  position = new Vec3(); rotation = new Vec3(); scale = new Vec3(1, 1, 1);
}
export class GameObject {
  readonly transform = new Transform(); readonly components: Component[] = []; visible = true;
  constructor(public name: string) {}
  addComponent<T extends Component>(component: T): T { component.owner = this; this.components.push(component); return component; }
  getComponent<T extends Component>(type: new (...args: never[]) => T): T | undefined { return this.components.find((component): component is T => component instanceof type); }
}
export type ContactEvent = { a: GameObject; b: GameObject };
/** Small-demo AABB solver. For production simulations use a mature Box2D/Planck backend. */
export class Scene {
  readonly objects: GameObject[] = [];
  private contacts = new Map<string, ContactEvent>();
  constructor(public name = 'Untitled Scene', public gravityY = -900) {}
  add(object: GameObject): GameObject { this.objects.push(object); return object; }
  remove(object: GameObject): void { const index = this.objects.indexOf(object); if (index >= 0) this.objects.splice(index, 1); }
  find(name: string): GameObject | undefined { return this.objects.find(object => object.name === name); }
  update(deltaSeconds: number): void { for (const object of [...this.objects]) if (object.visible) for (const component of object.components) if (component.enabled) component.onUpdate(deltaSeconds); }
  stepPhysics(deltaSeconds: number): void {
    const colliders = this.objects.flatMap(object => {
      const collider = object.getComponent(Collider);
      return object.visible && collider?.enabled ? [{ object, collider, body: object.getComponent(RigidBody2D) }] : [];
    });
    for (const entry of colliders) {
      const { object, body } = entry;
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
      const ox = (a.collider.width + b.collider.width) / 2 - Math.abs(dx);
      const oy = (a.collider.height + b.collider.height) / 2 - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      const key = this.pairKey(a.object, b.object); current.set(key, { a: a.object, b: b.object });
      a.collider.onOverlap?.(b.object); b.collider.onOverlap?.(a.object);
      if (a.collider.isTrigger || b.collider.isTrigger) continue;
      const ad = !!a.body && !a.body.isStatic && a.body.enabled, bd = !!b.body && !b.body.isStatic && b.body.enabled;
      if (!ad && !bd) continue;
      const useX = ox < oy; const axis = useX ? 'x' : 'y'; const direction = Math.sign(useX ? dx : dy) || 1; const depth = useX ? ox : oy;
      const ia = ad ? 1 / Math.max(0.001, a.body!.mass) : 0; const ib = bd ? 1 / Math.max(0.001, b.body!.mass) : 0; const sum = ia + ib;
      if (ad) {
        a.object.transform.position[axis] -= direction * depth * ia / sum;
        if (a.body!.velocity[axis] * direction > 0) a.body!.velocity[axis] = -a.body!.velocity[axis] * Math.max(a.body!.restitution, b.body?.restitution ?? 0);
        if (!useX) a.body!.velocity.x *= a.body!.friction;
      }
      if (bd) {
        b.object.transform.position[axis] += direction * depth * ib / sum;
        if (b.body!.velocity[axis] * direction < 0) b.body!.velocity[axis] = -b.body!.velocity[axis] * Math.max(a.body?.restitution ?? 0, b.body!.restitution);
        if (!useX) b.body!.velocity.x *= b.body!.friction;
      }
    }
    this.solveTilemaps(colliders, current);
    this.solveDistanceJoints();
    for (const [key, contact] of current) if (!this.contacts.has(key)) this.notify(contact, 'enter');
    for (const [key, contact] of this.contacts) if (!current.has(key)) this.notify(contact, 'exit');
    this.contacts = current;
  }
  private solveTilemaps(colliders: Array<{object:GameObject; collider:Collider; body:RigidBody2D|undefined}>, contacts: Map<string, ContactEvent>): void {
    for (const entry of colliders) {
      const { object, collider, body } = entry;
      if (!body || body.isStatic || !body.enabled) continue;
      for (const mapObject of this.objects) {
        const map = mapObject.getComponent(Tilemap); if (!map || !map.enabled || map.solidTileIds.length === 0) continue;
        const size = map.tileSize; const left = mapObject.transform.position.x - map.columns * size / 2;
        const bottom = mapObject.transform.position.y + map.rows * size / 2;
        const minCol = Math.max(0, Math.floor((object.transform.position.x - collider.width / 2 - left) / size));
        const maxCol = Math.min(map.columns - 1, Math.floor((object.transform.position.x + collider.width / 2 - left) / size));
        const minRow = Math.max(0, Math.floor((bottom - object.transform.position.y - collider.height / 2) / size));
        const maxRow = Math.min(map.rows - 1, Math.floor((bottom - object.transform.position.y + collider.height / 2) / size));
        for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
          if (!map.isSolid(col, row)) continue;
          const tileX = left + (col + 0.5) * size; const tileY = bottom - (row + 0.5) * size;
          const dx = object.transform.position.x - tileX; const dy = object.transform.position.y - tileY;
          const ox = (collider.width + size) / 2 - Math.abs(dx); const oy = (collider.height + size) / 2 - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          const mapContact = { a: object, b: mapObject }; contacts.set(this.pairKey(object, mapObject), mapContact);
          const axis = ox < oy ? 'x' : 'y'; const sign = Math.sign(axis === 'x' ? dx : dy) || 1; const depth = axis === 'x' ? ox : oy;
          object.transform.position[axis] += sign * depth;
          if (body.velocity[axis] * sign < 0) body.velocity[axis] = 0;
        }
      }
    }
  }
  private solveDistanceJoints(): void {
    for (const object of this.objects) for (const joint of object.components.filter((c): c is DistanceJoint => c instanceof DistanceJoint && c.enabled)) {
      const other = joint.other; if (!this.objects.includes(other)) continue;
      const dx = other.transform.position.x - object.transform.position.x; const dy = other.transform.position.y - object.transform.position.y;
      const distance = Math.hypot(dx, dy); if (!distance) continue;
      const error = (distance - Math.max(0, joint.length)) * Math.max(0, Math.min(1, joint.stiffness));
      const aBody = object.getComponent(RigidBody2D); const bBody = other.getComponent(RigidBody2D);
      const aMovable = !!aBody && !aBody.isStatic; const bMovable = !!bBody && !bBody.isStatic;
      const total = Number(aMovable) + Number(bMovable); if (!total) continue;
      if (aMovable) { object.transform.position.x += dx / distance * error / total; object.transform.position.y += dy / distance * error / total; }
      if (bMovable) { other.transform.position.x -= dx / distance * error / total; other.transform.position.y -= dy / distance * error / total; }
    }
  }
  private pairKey(a: GameObject, b: GameObject): string { const i = this.objects.indexOf(a); const j = this.objects.indexOf(b); return i < j ? `${i}:${j}` : `${j}:${i}`; }
  private notify(contact: ContactEvent, kind: 'enter' | 'exit'): void {
    const a = contact.a.getComponent(Collider); const b = contact.b.getComponent(Collider);
    if (kind === 'enter') { a?.onEnter?.(contact.b); b?.onEnter?.(contact.a); }
    else { a?.onExit?.(contact.b); b?.onExit?.(contact.a); }
  }
}
