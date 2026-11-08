import { describe, expect, it } from 'vitest';
import { GameObject, Scene } from '../src/engine/scene';
import { Collider } from '../src/engine/components';
import { Vec3 } from '../src/engine/math';
import { ZSharpRuntime } from '../src/engine/zsharp';

describe('scene graph', () => {
  it('finds objects and updates attached components', () => {
    const scene = new Scene(); const object = scene.add(new GameObject('Actor'));
    let updates = 0;
    object.addComponent({ owner: object, enabled: true, onUpdate: () => updates++ } as import('../src/engine/components').Component);
    scene.update(1 / 60);
    expect(scene.find('Actor')).toBe(object);
    expect(updates).toBe(1);
  });
  it('reports AABB overlaps to both colliders', () => {
    const scene = new Scene(); const a = scene.add(new GameObject('A')); const b = scene.add(new GameObject('B'));
    let hits = 0; a.addComponent(new Collider(10, 10, () => hits++)); b.addComponent(new Collider(10, 10, () => hits++));
    b.transform.position.x = 3; scene.update(0);
    expect(hits).toBe(2);
  });
});

describe('math and Z# starter runtime', () => {
  it('normalizes 3D vectors', () => {
    const result = new Vec3(0, 3, 4).normalized();
    expect(result.y).toBeCloseTo(0.6); expect(result.z).toBeCloseTo(0.8);
  });
  it('runs safe print/move/set statements and reports unsupported input', () => {
    const scene = new Scene(); const player = scene.add(new GameObject('Player'));
    const result = new ZSharpRuntime().run('print("Hi")\nmove("Player", 2, -1)\nset("Player.x", 5)\nunknown()', scene);
    expect(result.logs).toEqual(['Hi']); expect(player.transform.position.x).toBe(5); expect(player.transform.position.y).toBe(-1);
    expect(result.errors).toHaveLength(1);
  });
});
