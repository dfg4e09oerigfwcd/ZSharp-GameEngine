import { describe, expect, it } from 'vitest';
import { GameObject, Scene } from '../src/engine/scene';
import { Collider, RigidBody2D } from '../src/engine/components';
import { Vec3 } from '../src/engine/math';
import { ZSharpRuntime } from '../src/engine/zsharp';

describe('scene physics', () => {
  it('resolves a dynamic body against a static floor', () => {
    const scene = new Scene('test', -10); const floor = scene.add(new GameObject('Floor')); floor.addComponent(new Collider(100, 10)); floor.addComponent(new RigidBody2D(true));
    const player = scene.add(new GameObject('Player')); player.transform.position.y = 7; player.addComponent(new Collider(10, 10)); const body = player.addComponent(new RigidBody2D());
    body.velocity.y = -4; scene.stepPhysics(0.1);
    expect(player.transform.position.y).toBeGreaterThanOrEqual(10 - 1e-6); expect(body.velocity.y).toBe(0);
  });
  it('keeps trigger overlap notification without displacement', () => {
    const scene = new Scene(); const a = scene.add(new GameObject('A')); const b = scene.add(new GameObject('B'));
    a.addComponent(new Collider(10, 10, undefined, true)); a.addComponent(new RigidBody2D()); b.addComponent(new Collider(10, 10));
    scene.stepPhysics(0); expect(a.transform.position.x).toBe(0);
  });
});

describe('math and Z# runtime', () => {
  it('normalizes 3D vectors', () => { const result = new Vec3(0, 3, 4).normalized(); expect(result.y).toBeCloseTo(0.6); expect(result.z).toBeCloseTo(0.8); });
  it('supports variables, precedence, comparisons, and safe object commands', () => {
    const scene = new Scene(); const player = scene.add(new GameObject('Player')); const runtime = new ZSharpRuntime();
    const result = runtime.run('let step = 2 + 3 * 2\nmove("Player", step, 0)\nif step >= 8\nset("Player.x", (step + 2) * 2)\nend\nprint("ok")', scene);
    expect(player.transform.position.x).toBe(16); expect(result.logs).toEqual(['ok']); expect(result.errors).toEqual([]);
  });
  it('rejects unknown statements and division by zero', () => {
    const scene = new Scene(); const result = new ZSharpRuntime().run('let x = 1 / 0\nunknown()', scene);
    expect(result.errors).toHaveLength(2);
  });
});
