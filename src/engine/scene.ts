import { Vec3 } from './math';
import { Component, Collider, RigidBody2D } from './components';

export class Transform {
  position = new Vec3();
  rotation = new Vec3();
  scale = new Vec3(1, 1, 1);
}

export class GameObject {
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

/** Scene container with fixed-step 2D AABB collision and impulse response. */
export class Scene {
  readonly objects: GameObject[] = [];
  constructor(public name = 'Untitled Scene', public gravityY = -900) {}
  add(object: GameObject): GameObject { this.objects.push(object); return object; }
  remove(object: GameObject): void { const index = this.objects.indexOf(object); if (index >= 0) this.objects.splice(index, 1); }
  find(name: string): GameObject | undefined { return this.objects.find(object => object.name === name); }
  update(deltaSeconds: number): void {
    for (const object of [...this.objects]) {
      if (!object.visible) continue;
      for (const component of object.components) if (component.enabled) component.onUpdate(deltaSeconds);
    }
  }
  stepPhysics(deltaSeconds: number): void {
    const colliders = this.objects.flatMap(object => {
      const collider = object.getComponent(Collider);
      return object.visible && collider?.enabled ? [{ object, collider, body: object.getComponent(RigidBody2D) }] : [];
    });
    for (const { object, body } of colliders) {
      if (!body || body.isStatic || !body.enabled) continue;
      body.velocity.y += this.gravityY * body.gravityScale * deltaSeconds;
      object.transform.position.x += body.velocity.x * deltaSeconds;
      object.transform.position.y += body.velocity.y * deltaSeconds;
    }
    for (let i = 0; i < colliders.length; i++) for (let j = i + 1; j < colliders.length; j++) {
      const a = colliders[i]!; const b = colliders[j]!;
      if (a.body?.isStatic && b.body?.isStatic) continue;
      const dx = b.object.transform.position.x - a.object.transform.position.x;
      const dy = b.object.transform.position.y - a.object.transform.position.y;
      const overlapX = (a.collider.width + b.collider.width) / 2 - Math.abs(dx);
      const overlapY = (a.collider.height + b.collider.height) / 2 - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) continue;
      a.collider.onOverlap?.(b.object); b.collider.onOverlap?.(a.object);
      if (a.collider.isTrigger || b.collider.isTrigger) continue;
      const aDynamic = !!a.body && !a.body.isStatic && a.body.enabled;
      const bDynamic = !!b.body && !b.body.isStatic && b.body.enabled;
      if (!aDynamic && !bDynamic) continue;
      const useX = overlapX < overlapY;
      const direction = useX ? Math.sign(dx || 1) : Math.sign(dy || 1);
      const amount = useX ? overlapX : overlapY;
      const totalMass = (aDynamic ? 1 / Math.max(0.001, a.body!.mass) : 0) + (bDynamic ? 1 / Math.max(0.001, b.body!.mass) : 0);
      const aShare = aDynamic ? (1 / Math.max(0.001, a.body!.mass)) / totalMass : 0;
      const bShare = bDynamic ? (1 / Math.max(0.001, b.body!.mass)) / totalMass : 0;
      if (aDynamic) {
        a.object.transform.position[useX ? 'x' : 'y'] -= direction * amount * aShare;
        const velocity = a.body!.velocity; const axis = useX ? 'x' : 'y';
        if (velocity[axis] * direction > 0) velocity[axis] = -velocity[axis] * Math.max(a.body!.restitution, b.body?.restitution ?? 0);
        if (useX) velocity.y *= a.body!.friction;
      }
      if (bDynamic) {
        b.object.transform.position[useX ? 'x' : 'y'] += direction * amount * bShare;
        const velocity = b.body!.velocity; const axis = useX ? 'x' : 'y';
        if (velocity[axis] * direction < 0) velocity[axis] = -velocity[axis] * Math.max(a.body?.restitution ?? 0, b.body!.restitution);
        if (useX) velocity.y *= b.body!.friction;
      }
    }
  }
}
