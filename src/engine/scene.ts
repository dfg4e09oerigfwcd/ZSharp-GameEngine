import { Vec3 } from './math';
import { Component, Collider } from './components';

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

export class Scene {
  readonly objects: GameObject[] = [];
  constructor(public name = 'Untitled Scene') {}
  add(object: GameObject): GameObject { this.objects.push(object); return object; }
  find(name: string): GameObject | undefined { return this.objects.find(object => object.name === name); }
  update(deltaSeconds: number): void {
    for (const object of this.objects) {
      if (!object.visible) continue;
      for (const component of object.components) if (component.enabled) component.onUpdate(deltaSeconds);
    }
    this.detectOverlaps();
  }
  private detectOverlaps(): void {
    const colliders = this.objects.flatMap(object => {
      const collider = object.getComponent(Collider);
      return collider?.enabled ? [{ object, collider }] : [];
    });
    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        const a = colliders[i]!;
        const b = colliders[j]!;
        const dx = Math.abs(a.object.transform.position.x - b.object.transform.position.x);
        const dy = Math.abs(a.object.transform.position.y - b.object.transform.position.y);
        if (dx < (a.collider.width + b.collider.width) / 2 && dy < (a.collider.height + b.collider.height) / 2) {
          a.collider.onOverlap?.(b.object);
          b.collider.onOverlap?.(a.object);
        }
      }
    }
  }
}
