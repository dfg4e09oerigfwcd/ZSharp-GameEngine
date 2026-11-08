import { GameEngine } from './engine/engine';
import { CanvasRenderer } from './engine/renderer';
import { AssetManager, AudioManager } from './engine/assets';
import { Camera2D, Collider, Mesh3D, RigidBody2D, Sprite, Tilemap } from './engine/components';
import { GameObject } from './engine/scene';
import { createSampleScene } from './sample/createSampleScene';
import { ZSharpRuntime } from './engine/zsharp';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header class="topbar"><div class="brand"><span class="brand-mark">Z</span><strong>ZSharp</strong><small>ENGINE</small></div><div class="toolbar"><button id="play-button" class="primary">▶ Play demo</button><button id="reset-button">↻ Reset</button><span class="status" id="status">EDITOR</span></div></header>
<main class="workspace"><aside class="panel hierarchy"><div class="panel-title">SCENE <button id="add-object" title="Add object">＋</button></div><div id="hierarchy-list" class="tree"></div><div class="panel-title assets-title">ASSETS</div><div id="asset-list" class="asset-list"><div>▧ loading sprite atlas…</div></div></aside>
<section class="center-column"><div class="view-tabs"><span class="active">SCENE VIEW</span><span>2D + ORTHOGRAPHIC 3D</span><span class="spacer"></span><span id="fps">60 FPS</span></div><div class="canvas-wrap"><canvas id="viewport"></canvas><div class="hint">Click to select · drag to move · WASD / arrows + Space to play</div></div><div class="console"><div class="console-head">Z# CONSOLE <button id="run-script">Run</button></div><div class="console-body"><textarea id="script" spellcheck="false">let step = 4 * 2
print("Welcome to Z#")
move("Player", step, 0)
if step >= 8
print(step)
end</textarea><div id="output" class="output">Assets loading…</div></div></div></section>
<aside class="panel inspector"><div class="panel-title">INSPECTOR</div><div id="inspector-content"></div></aside></main>
<footer><span>ZSharp Engine · Playable starter demo</span><span>Scene: <b>Starter World</b> · Drag objects in editor mode</span></footer>`;

let scene = createSampleScene();
const canvas = document.querySelector<HTMLCanvasElement>('#viewport')!;
const engine = new GameEngine(scene, canvas, new CanvasRenderer(canvas.getContext('2d')!));
const assets = new AssetManager(); const audio = new AudioManager(assets);
let selected = scene.find('Player')!; let playing = false; let dragging = false; let moved = false;
const hierarchy = document.querySelector<HTMLDivElement>('#hierarchy-list')!;
const inspector = document.querySelector<HTMLDivElement>('#inspector-content')!;
const assetList = document.querySelector<HTMLDivElement>('#asset-list')!;
const playerSprite = selected.getComponent(Sprite)!;
assets.loadImage('/assets/player.svg').then(image => { playerSprite.image = image; assetList.innerHTML = '<div>▧ player.svg <span>loaded</span></div><div>◈ prism.mesh</div><div>⌘ player.zs</div><div>♫ generated WebAudio sfx</div>'; }).catch(error => { assetList.textContent = String(error); });

function refreshHierarchy(): void {
  hierarchy.innerHTML = '';
  for (const object of scene.objects) {
    const row = document.createElement('button'); row.className = `tree-row${object === selected ? ' selected' : ''}`;
    row.textContent = `${object.getComponent(Mesh3D) ? '◈' : object.getComponent(Tilemap) ? '▦' : object.getComponent(Camera2D) ? '◉' : '▣'}  ${object.name}`;
    row.onclick = () => { selected = object; refreshHierarchy(); refreshInspector(); };
    hierarchy.append(row);
  }
}
function refreshInspector(): void {
  const pos = selected.transform.position;
  inspector.innerHTML = `<div class="object-name">${selected.name}</div><div class="component"><h3>Transform</h3><label>Position X<input data-axis="x" type="number" value="${pos.x.toFixed(1)}" step="1"></label><label>Position Y<input data-axis="y" type="number" value="${pos.y.toFixed(1)}" step="1"></label><label>Position Z<input data-axis="z" type="number" value="${pos.z.toFixed(1)}" step="1"></label><label>Rotation Y<input data-axis="rotationY" type="number" value="${selected.transform.rotation.y.toFixed(2)}" step="0.1"></label></div><div class="component"><h3>Components</h3><p>${selected.components.map(component => component.constructor.name).join('<br>') || 'No components'}</p></div><div class="component note">Physics: ${selected.getComponent(RigidBody2D) ? 'dynamic/static rigid body' : selected.getComponent(Collider) ? 'static collider' : 'none'}</div>`;
  inspector.querySelectorAll<HTMLInputElement>('input[data-axis]').forEach(input => input.addEventListener('change', () => {
    const axis = input.dataset.axis!; if (axis === 'rotationY') selected.transform.rotation.y = Number(input.value); else selected.transform.position[axis as 'x' | 'y' | 'z'] = Number(input.value);
  }));
}
function worldPoint(event: PointerEvent): {x:number;y:number} {
  const rect = canvas.getBoundingClientRect(); const camera = scene.objects.find(object => object.getComponent(Camera2D));
  const component = camera?.getComponent(Camera2D); const target = component?.followTarget?.transform.position ?? camera?.transform.position;
  const zoom = component?.zoom ?? 1;
  return { x: (event.clientX - rect.left - rect.width / 2) / zoom + (target?.x ?? 0), y: -(event.clientY - rect.top - rect.height / 2) / zoom + (target?.y ?? 0) };
}
canvas.addEventListener('pointerdown', event => {
  if (playing) return;
  const point = worldPoint(event);
  const hit = [...scene.objects].reverse().find(object => {
    const sprite = object.getComponent(Sprite); if (!sprite) return false;
    return Math.abs(point.x - object.transform.position.x) <= sprite.width / 2 && Math.abs(point.y - object.transform.position.y) <= sprite.height / 2;
  });
  if (hit) { selected = hit; dragging = true; moved = false; canvas.setPointerCapture(event.pointerId); refreshHierarchy(); refreshInspector(); }
});
canvas.addEventListener('pointermove', event => { if (!dragging || playing) return; const point = worldPoint(event); selected.transform.position.x = point.x; selected.transform.position.y = point.y; moved = true; refreshInspector(); });
canvas.addEventListener('pointerup', () => { if (dragging && moved) void audio.tone(500, 0.035, 0.025); dragging = false; });
refreshHierarchy(); refreshInspector(); engine.start();

document.querySelector<HTMLButtonElement>('#play-button')!.onclick = event => {
  playing = !playing; (event.currentTarget as HTMLButtonElement).textContent = playing ? '❚❚ Stop demo' : '▶ Play demo';
  document.querySelector('#status')!.textContent = playing ? 'PLAYING' : 'EDITOR';
  canvas.classList.toggle('playing', playing);
};
document.querySelector<HTMLButtonElement>('#reset-button')!.onclick = () => {
  scene = createSampleScene(); engine.scene = scene; selected = scene.find('Player')!;
  assets.loadImage('/assets/player.svg').then(image => { selected.getComponent(Sprite)!.image = image; }).catch(() => undefined);
  playing = false; document.querySelector('#status')!.textContent = 'EDITOR'; document.querySelector('#play-button')!.textContent = '▶ Play demo';
  refreshHierarchy(); refreshInspector();
};
document.querySelector<HTMLButtonElement>('#add-object')!.onclick = () => {
  const object = scene.add(new GameObject(`Object ${scene.objects.length + 1}`)); object.addComponent(new Sprite('#8b7bda', 24, 24)); selected = object; refreshHierarchy(); refreshInspector();
};
document.querySelector<HTMLButtonElement>('#run-script')!.onclick = () => {
  const host = { find: (name: string) => scene.find(name), add: (name: string, x: number, y: number) => { const object = scene.add(new GameObject(name)); object.transform.position.x = x; object.transform.position.y = y; object.addComponent(new Sprite()); }, remove: (name: string) => { const object = scene.find(name); if (object) scene.remove(object); } };
  const result = new ZSharpRuntime().run(document.querySelector<HTMLTextAreaElement>('#script')!.value, host);
  document.querySelector<HTMLDivElement>('#output')!.textContent = [...result.logs, ...result.errors.map(error => `ERROR: ${error}`)].join('\n') || 'Script completed.';
  refreshHierarchy(); refreshInspector();
};
window.setInterval(() => { if (selected && !dragging) refreshInspector(); }, 500);
