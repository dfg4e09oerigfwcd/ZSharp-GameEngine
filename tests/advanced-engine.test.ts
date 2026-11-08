import { describe, expect, it } from 'vitest';
import { Scene, GameObject } from '../src/engine/scene';
import { Collider, RigidBody2D, Tilemap } from '../src/engine/components';
import { deserializeScene, serializeScene, UndoHistory } from '../src/engine/serialization';

describe('physics contact lifecycle', () => {
  it('emits enter once and exit after separation', () => {
    const scene = new Scene('contacts', 0); const a = scene.add(new GameObject('a')); const b = scene.add(new GameObject('b'));
    let enters = 0, exits = 0; a.addComponent(new Collider(10, 10, undefined, true)).onEnter = () => enters++; a.getComponent(Collider)!.onExit = () => exits++;
    b.addComponent(new Collider(10, 10, undefined, true)); scene.stepPhysics(0); scene.stepPhysics(0); expect(enters).toBe(1);
    b.transform.position.x = 30; scene.stepPhysics(0); expect(exits).toBe(1);
  });
  it('resolves dynamic body against solid tilemap cells', () => {
    const scene = new Scene('tiles', 0); const map = scene.add(new GameObject('map')); map.addComponent(new Tilemap(1,1,16,[1],{1:'#fff'},[1]));
    const actor = scene.add(new GameObject('actor')); actor.transform.position.x = 6; actor.addComponent(new Collider(10,10)); actor.addComponent(new RigidBody2D());
    scene.stepPhysics(0); expect(actor.transform.position.x).toBeLessThan(6);
  });
});
describe('scene persistence and history', () => {
  it('round-trips basic objects, bodies and tile collision metadata', () => {
    const scene = new Scene('saved', -2); const map = scene.add(new GameObject('map')); map.addComponent(new Tilemap(2,1,8,[1,0],{1:'#abc'},[1]));
    const body = scene.add(new GameObject('body')); body.addComponent(new Collider(4,4)); body.addComponent(new RigidBody2D());
    const copy = deserializeScene(serializeScene(scene)); expect(copy.name).toBe('saved'); expect(copy.find('map')!.getComponent(Tilemap)!.solidTileIds).toEqual([1]); expect(copy.find('body')!.getComponent(RigidBody2D)).toBeDefined();
  });
  it('supports editor undo redo', () => { const history = new UndoHistory(); let value = 0; history.execute({ undo: () => value = 0, redo: () => value = 1 }); expect(value).toBe(1); history.undo(); expect(value).toBe(0); history.redo(); expect(value).toBe(1); });
});
