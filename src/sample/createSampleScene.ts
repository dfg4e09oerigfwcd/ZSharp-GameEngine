import { Scene, GameObject } from './scene';
import { Camera2D, Collider, DirectionalLight, Mesh3D, Sprite, Tilemap } from './components';
import { Vec3 } from './math';

export function createSampleScene(): Scene {
  const scene = new Scene('Starter World');
  const ground = scene.add(new GameObject('Tilemap'));
  ground.addComponent(new Tilemap(18, 12, 32, Array.from({ length: 216 }, (_, index) => {
    const x = index % 18, y = Math.floor(index / 18);
    return (x === 0 || y === 0 || x === 17 || y === 11) ? 2 : ((x + y) % 4 === 0 ? 1 : 0);
  }), { 1: '#263d4a', 2: '#42606b' }));

  const player = scene.add(new GameObject('Player'));
  player.transform.position.x = -28;
  player.addComponent(new Sprite('#f2c14e', 26, 30));
  player.addComponent(new Collider(24, 28, other => {
    if (other.name === 'Block') player.transform.position.x = -28;
  }));

  const block = scene.add(new GameObject('Block'));
  block.transform.position.x = 42;
  block.addComponent(new Sprite('#e76f51', 28, 28));
  block.addComponent(new Collider(28, 28));

  const camera = scene.add(new GameObject('Camera'));
  camera.addComponent(new Camera2D()).followTarget = player;
  camera.getComponent(Camera2D)!.zoom = 1.5;

  const prism = scene.add(new GameObject('Low-poly Prism'));
  prism.transform.position.x = 190;
  prism.transform.position.y = 25;
  prism.transform.position.z = 0;
  prism.addComponent(new Mesh3D(
    [new Vec3(-0.65, -0.55, -0.55), new Vec3(0.65, -0.55, -0.55), new Vec3(0.65, 0.55, -0.55), new Vec3(-0.65, 0.55, -0.55), new Vec3(0, 0, 0.75)],
    [{a:0,b:1,c:4,color:'#62d6c6'}, {a:1,b:2,c:4,color:'#46b7c7'}, {a:2,b:3,c:4,color:'#8075dd'}, {a:3,b:0,c:4,color:'#e76f9a'}, {a:0,b:1,c:2,color:'#3b627a'}, {a:0,b:2,c:3,color:'#4b7486'}],
    '#69d2e7', 1.05
  ));
  prism.addComponent(new DirectionalLight(new Vec3(-0.4, -0.8, -0.6), 0.9));
  prism.addComponent({ owner: prism, enabled: true, onUpdate(deltaSeconds: number) { prism.transform.rotation.y += deltaSeconds * 0.7; } } as import('../engine/components').Component);
  return scene;
}
