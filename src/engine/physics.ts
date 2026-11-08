import * as planck from 'planck';
import { Collider, RigidBody2D, Tilemap } from './components';
import type { GameObject, Scene } from './scene';

/** Planck.js (Box2D-style) world adapter: dynamic-tree broadphase, CCD bullets, oriented shapes and iterative constraints. */
export class PhysicsWorld2D {
  private world = planck.World({ gravity: planck.Vec2(0, -900), allowSleep: true, warmStarting: true, continuousPhysics: true });
  private readonly bodies = new Map<GameObject, planck.Body>();
  private readonly snapshots = new Map<GameObject, { x: number; y: number; angle: number }>();
  private contactPairs = new Map<string, { a: GameObject; b: GameObject }>();
  private gravity = Number.NaN;

  step(scene: Scene, dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Physics timestep must be finite and non-negative.');
    if (this.gravity !== scene.gravityY) { this.world.setGravity(planck.Vec2(0, scene.gravityY)); this.gravity = scene.gravityY; }
    const active = new Set(scene.objects);
    for (const [object, body] of this.bodies) if (!active.has(object)) { this.world.destroyBody(body); this.bodies.delete(object); this.snapshots.delete(object); }
    for (const object of scene.objects) this.ensureBody(object);

    for (const object of scene.objects) {
      const body = this.bodies.get(object); if (!body) continue;
      const snapshot = this.snapshots.get(object)!;
      const position = object.transform.position;
      const angle = object.transform.rotation.z;
      // Respect editor/gameplay teleports, while ordinary simulation updates come from the physics world.
      if (position.x !== snapshot.x || position.y !== snapshot.y || angle !== snapshot.angle) body.setTransform(planck.Vec2(position.x, position.y), angle);
      const component = object.getComponent(RigidBody2D);
      if (component && !component.isStatic && component.enabled) {
        body.setLinearVelocity(planck.Vec2(component.velocity.x, component.velocity.y));
        body.setGravityScale(component.gravityScale);
        body.setBullet(component.bullet);
        body.setFixedRotation(component.fixedRotation);
        body.setAwake(true);
      }
    }
    this.world.step(dt, 8, 3);

    const current = new Map<string, { a: GameObject; b: GameObject }>();
    for (let contact = this.world.getContactList(); contact; contact = contact.getNext()) {
      if (!contact.isTouching()) continue;
      const a = contact.getFixtureA().getBody().getUserData() as GameObject | undefined;
      const b = contact.getFixtureB().getBody().getUserData() as GameObject | undefined;
      if (!a || !b || a === b) continue;
      const key = this.pairKey(a, b); current.set(key, { a, b });
      a.getComponent(Collider)?.onOverlap?.(b); b.getComponent(Collider)?.onOverlap?.(a);
    }
    for (const [key, pair] of current) if (!this.contactPairs.has(key)) this.notify(pair, 'enter');
    for (const [key, pair] of this.contactPairs) if (!current.has(key)) this.notify(pair, 'exit');
    this.contactPairs = current;

    for (const object of scene.objects) {
      const body = this.bodies.get(object); const rb = object.getComponent(RigidBody2D); if (!body) continue;
      const position = body.getPosition(); const velocity = body.getLinearVelocity();
      object.transform.position.x = position.x; object.transform.position.y = position.y; object.transform.rotation.z = body.getAngle();
      if (rb && !rb.isStatic) { rb.velocity.x = velocity.x; rb.velocity.y = velocity.y; }
      this.snapshots.set(object, { x: position.x, y: position.y, angle: body.getAngle() });
    }
  }

  remove(object: GameObject): void {
    const body = this.bodies.get(object);
    if (body) { this.world.destroyBody(body); this.bodies.delete(object); this.snapshots.delete(object); }
    for (const [key, pair] of this.contactPairs) if (pair.a === object || pair.b === object) { this.notify(pair, 'exit'); this.contactPairs.delete(key); }
  }
  reset(): void {
    this.world = planck.World({ gravity: planck.Vec2(0, this.gravity || -900), allowSleep: true, warmStarting: true, continuousPhysics: true });
    this.bodies.clear(); this.snapshots.clear(); this.contactPairs.clear();
  }

  private ensureBody(object: GameObject): void {
    if (this.bodies.has(object)) return;
    const collider = object.getComponent(Collider); const tilemap = object.getComponent(Tilemap);
    if ((!collider || !collider.enabled) && (!tilemap || !tilemap.enabled || tilemap.solidTileIds.length === 0)) return;
    const rb = object.getComponent(RigidBody2D);
    const body = this.world.createBody({
      type: rb && !rb.isStatic ? 'dynamic' : 'static',
      position: planck.Vec2(object.transform.position.x, object.transform.position.y),
      angle: object.transform.rotation.z,
      allowSleep: true,
      fixedRotation: rb?.fixedRotation ?? false,
      bullet: rb?.bullet ?? false,
      userData: object
    });
    if (collider?.enabled) {
      const options = { density: rb && !rb.isStatic ? Math.max(0.001, rb.mass) : 0, friction: Math.max(0, Math.min(1, rb?.friction ?? 0.3)), restitution: Math.max(0, Math.min(1, rb?.restitution ?? 0)), isSensor: collider.isTrigger };
      if (collider.shape === 'circle') body.createFixture(planck.Circle(Math.max(0.001, collider.width / 2)), options);
      else if (collider.shape === 'polygon' && collider.vertices.length >= 3) body.createFixture(planck.Polygon(collider.vertices.map(v => planck.Vec2(v.x, v.y))), options);
      else body.createFixture(planck.Box(Math.max(0.001, collider.width / 2), Math.max(0.001, collider.height / 2)), options);
    }
    if (tilemap?.enabled) {
      const size = tilemap.tileSize; const left = -tilemap.columns * size / 2; const top = tilemap.rows * size / 2;
      for (let row = 0; row < tilemap.rows; row++) for (let column = 0; column < tilemap.columns; column++) {
        if (!tilemap.isSolid(column, row)) continue;
        const x = left + (column + 0.5) * size; const y = top - (row + 0.5) * size;
        body.createFixture(planck.Box(size / 2, size / 2, planck.Vec2(x, y)), { friction: 0.75, restitution: 0 });
      }
    }
    this.bodies.set(object, body);
    this.snapshots.set(object, { x: object.transform.position.x, y: object.transform.position.y, angle: object.transform.rotation.z });
  }
  private pairKey(a: GameObject, b: GameObject): string { return a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`; }
  private notify(pair: { a: GameObject; b: GameObject }, kind: 'enter' | 'exit'): void {
    const a = pair.a.getComponent(Collider); const b = pair.b.getComponent(Collider);
    if (kind === 'enter') { a?.onEnter?.(pair.b); b?.onEnter?.(pair.a); }
    else { a?.onExit?.(pair.b); b?.onExit?.(pair.a); }
  }
}
