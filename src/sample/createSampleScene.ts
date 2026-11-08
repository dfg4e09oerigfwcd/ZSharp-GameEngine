import { Scene, GameObject } from './scene';
import { Animator, Camera2D, Collider, DirectionalLight, Mesh3D, RigidBody2D, Sprite, Tilemap } from './components';
import { Vec3 } from './math';

export function createSampleScene(): Scene {
  const scene = new Scene('Starter World', -900);
  const ground = scene.add(new GameObject('Tilemap'));
  const tiles = Array.from({ length: 216 }, (_, index) => {
    const x = index % 18; const y = Math.floor(index / 18);
    return y === 10 || x === 0 || x === 17 ? 2 : (y === 9 && x > 2 && x < 8 ? 1 : 0);
  });
  ground.transform.position.y = -60;
  ground.addComponent(new Tilemap(18, 12, 32, tiles, { 1: '#2c6570', 2: '#42606b' }));
  ground.addComponent(new Collider(576, 32)); ground.addComponent(new RigidBody2D(true));

  const player = scene.add(new GameObject('Player'));
  player.transform.position.x = -28; player.transform.position.y = 40;
  const sprite = player.addComponent(new Sprite('#f2c14e', 32, 32));
  player.addComponent(new Collider(24, 28)); player.addComponent(new RigidBody2D());
  player.addComponent(new Animator(32, 32, 4, 8));
  // The atlas image loads in the editor asynchronously; drawing falls back to a colored sprite until ready.
  player.name = 'Player';

  const block = scene.add(new GameObject('Block'));
  block.transform.position.x = 48; block.transform.position.y = 20;
  block.addComponent(new Sprite('#e76f51', 28, 28)); block.addComponent(new Collider(28, 28, undefined, true));
  block.addComponent(new RigidBody2D(true));

  const camera = scene.add(new GameObject('Camera'));
  camera.addComponent(new Camera2D()).followTarget = player;
  camera.getComponent(Camera2D)!.zoom = 1.5;

  const prism = scene.add(new GameObject('Low-poly Prism'));
  prism.transform.position.x = 190; prism.transform.position.y = 25;
  prism.addComponent(new Mesh3D(
    [new Vec3(-0.65, -0.55, -0.55), new Vec3(0.65, -0.55, -0.55), new Vec3(0.65, 0.55, -0.55), new Vec3(-0.65, 0.55, -0.55), new Vec3(0, 0, 0.75)],
    [{a:0,b:1,c:4,color:'#62d6c6'}, {a:1,b:2,c:4,color:'#46b7c7'}, {a:2,b:3,c:4,color:'#8075dd'}, {a:3,b:0,c:4,color:'#e76f9a'}, {a:0,b:1,c:2,color:'#3b627a'}, {a:0,b:2,c:3,color:'#4b7486'}], '#69d2e7', 1.05
  ));
  prism.addComponent(new DirectionalLight(new Vec3(-0.4, -0.8, -0.6), 0.9));
  prism.addComponent(new class extends (awaitComponent()) { override onUpdate(deltaSeconds: number) { prism.transform.rotation.y += deltaSeconds * 0.7; } }());
  void sprite;
  return scene;
}
function awaitComponent(): typeof import('../engine/components').Component { return ComponentClass; }
import { Component as ComponentClass } from '../engine/components';
