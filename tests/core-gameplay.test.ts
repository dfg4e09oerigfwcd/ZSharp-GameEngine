import { describe, expect, it } from 'vitest';
import { Scene, GameObject } from '../src/engine/scene';
import { AnimationController, Collider, RigidBody2D, Sprite, Tilemap } from '../src/engine/components';
import { deserializeScene, loadSceneFromStorage, saveSceneToStorage, serializeScene } from '../src/engine/serialization';
import { createSampleScene } from '../src/sample/createSampleScene';
import { DemoGameRules } from '../src/sample/gameplay';

function makeFloorScene(): { scene: Scene; actor: GameObject; body: RigidBody2D } {
  const scene = new Scene('floor', -10); const floor = scene.add(new GameObject('Floor'));
  floor.addComponent(new Collider(100, 10)); floor.addComponent(new RigidBody2D(true));
  const actor = scene.add(new GameObject('Actor')); actor.transform.position.y = 7;
  actor.addComponent(new Collider(10, 10)); const body = actor.addComponent(new RigidBody2D()); body.velocity.y = -4;
  return { scene, actor, body };
}
describe('deterministic fixed-step core', () => {
  it('replays the same fixed-step simulation to the same state', () => {
    const run = () => { const { scene, actor } = makeFloorScene(); for (let i = 0; i < 120; i++) scene.simulateFixedStep(1 / 60); return [scene.tick, actor.transform.position.x, actor.transform.position.y, actor.getComponent(RigidBody2D)!.velocity.y]; };
    expect(run()).toEqual(run());
  });
  it('rejects invalid timesteps and emits contact enter/exit exactly once', () => {
    const scene = new Scene('contacts', 0); const a = scene.add(new GameObject('a')); const b = scene.add(new GameObject('b'));
    let enters = 0, exits = 0; a.addComponent(new Collider(10, 10, undefined, true)).onEnter = () => enters++; a.getComponent(Collider)!.onExit = () => exits++;
    b.addComponent(new Collider(10, 10, undefined, true)); scene.stepPhysics(0); scene.stepPhysics(0); expect(enters).toBe(1);
    b.transform.position.x = 30; scene.stepPhysics(0); expect(exits).toBe(1);
    expect(() => scene.simulateFixedStep(0)).toThrow(RangeError);
  });
  it('collides against solid tile cells and ignores empty cells', () => {
    const scene = new Scene('tiles', 0); const map = scene.add(new GameObject('map')); map.addComponent(new Tilemap(2, 1, 16, [1, 0], { 1: '#fff' }, [1]));
    const actor = scene.add(new GameObject('actor')); actor.transform.position.x = -6; actor.addComponent(new Collider(10, 10)); actor.addComponent(new RigidBody2D());
    scene.stepPhysics(0); expect(actor.transform.position.x).toBeLessThan(-6);
    actor.transform.position.x = 10; scene.stepPhysics(0); expect(actor.transform.position.x).toBe(10);
  });
});
describe('scene persistence and sample gameplay', () => {
  it('round-trips built-in components and validates scene input', () => {
    const original = createSampleScene(); const restored = deserializeScene(serializeScene(original));
    expect(restored.find('Player')!.getComponent(RigidBody2D)).toBeDefined();
    expect(restored.find('Tilemap')!.getComponent(Tilemap)!.solidTileIds).toEqual([1, 2]);
    expect(() => deserializeScene('{"version":9,"objects":[]}')).toThrow();
  });
  it('saves and loads with injected storage, no browser globals required', () => {
    const values = new Map<string, string>(); const storage = { setItem: (key: string, value: string) => values.set(key, value), getItem: (key: string) => values.get(key) ?? null };
    const scene = new Scene('stored'); saveSceneToStorage(scene, 'level', storage); expect(loadSceneFromStorage('level', storage).name).toBe('stored');
  });
  it('collects coins, wins at target, and loses on enemy contact', () => {
    const scene = createSampleScene(); const rules = scene.find('Game State')!.getComponent(DemoGameRules)!;
    const playerCollider = scene.find('Player')!.getComponent(Collider)!;
    playerCollider.onEnter!(scene.find('Coin 1')!); expect(rules.score).toBe(1); expect(scene.find('Coin 1')).toBeUndefined();
    playerCollider.onEnter!(scene.find('Coin 2')!); playerCollider.onEnter!(scene.find('Coin 3')!); expect(rules.status).toBe('won');
    rules.reset(); playerCollider.onEnter!(scene.find('Enemy')!); expect(rules.status).toBe('lost');
  });
  it('switches named atlas animation states', () => {
    const object = new GameObject('animated'); const sprite = object.addComponent(new Sprite());
    const controller = object.addComponent(new AnimationController({ idle: { name: 'idle', frames: [{x:0,y:0,width:8,height:8}], framesPerSecond: 1 }, run: { name: 'run', frames: [{x:8,y:0,width:8,height:8}], framesPerSecond: 1 } }, 'idle'));
    controller.play('run'); expect(sprite.sourceRect?.x).toBe(8);
  });
});
