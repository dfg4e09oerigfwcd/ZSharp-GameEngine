import { Vec3 } from './math';
import { Component, DistanceJoint } from './components';
import { PhysicsWorld2D } from './physics';

export class Transform { position = new Vec3(); rotation = new Vec3(); scale = new Vec3(1, 1, 1); }
export class GameObject {
  id = -1; readonly transform = new Transform(); readonly components: Component[] = []; visible = true;
  constructor(public name: string) {}
  addComponent<T extends Component>(component: T): T { component.owner = this; this.components.push(component); return component; }
  getComponent<T extends Component>(type: new (...args: never[]) => T): T | undefined { return this.components.find((component): component is T => component instanceof type); }
}
/** Fixed-step scene owner; physics is delegated to the Planck.js Box2D-compatible backend. */
export class Scene {
  readonly objects: GameObject[] = [];
  private mutableTick = 0;
  private readonly physics = new PhysicsWorld2D();
  constructor(public name = 'Untitled Scene', public gravityY = -900) {}
  get tick(): number { return this.mutableTick; }
  add(object: GameObject): GameObject { if (this.objects.includes(object)) throw new Error('Object already belongs to this scene.'); object.id = this.objects.length; this.objects.push(object); return object; }
  remove(object: GameObject): void {
    const index = this.objects.indexOf(object); if (index < 0) return;
    this.physics.remove(object); this.objects.splice(index, 1); this.objects.forEach((entry, order) => { entry.id = order; });
  }
  find(name: string): GameObject | undefined { return this.objects.find(object => object.name === name); }
  update(deltaSeconds: number): void { for (const object of [...this.objects]) if (object.visible && this.objects.includes(object)) for (const component of [...object.components]) if (component.enabled) component.onUpdate(deltaSeconds); }
  simulateFixedStep(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) throw new RangeError('Fixed timestep must be a positive finite number.');
    this.update(deltaSeconds); this.stepPhysics(deltaSeconds); this.mutableTick++;
  }
  stepPhysics(deltaSeconds: number): void { this.physics.step(this, deltaSeconds); this.solveDistanceJoints(); }
  resetPhysics(): void { this.physics.reset(); }
  private solveDistanceJoints(): void {
    // Lightweight positional constraint for the existing sample API. Use Planck joints for authored production constraints.
    for (const object of this.objects) for (const joint of object.components.filter((component): component is DistanceJoint => component instanceof DistanceJoint && component.enabled)) {
      if (!this.objects.includes(joint.other)) continue;
      const other = joint.other; const dx = other.transform.position.x - object.transform.position.x; const dy = other.transform.position.y - object.transform.position.y;
      const distance = Math.hypot(dx, dy); if (!distance) continue;
      const error = (distance - Math.max(0, joint.length)) * Math.max(0, Math.min(1, joint.stiffness));
      const movableA = !!object.components.find(component => component.constructor.name === 'RigidBody2D');
      const movableB = !!other.components.find(component => component.constructor.name === 'RigidBody2D');
      const count = Number(movableA) + Number(movableB); if (!count) continue;
      if (movableA) { object.transform.position.x += dx / distance * error / count; object.transform.position.y += dy / distance * error / count; }
      if (movableB) { other.transform.position.x -= dx / distance * error / count; other.transform.position.y -= dy / distance * error / count; }
    }
  }
}
