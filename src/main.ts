import { GameEngine } from './engine/engine';
import { CanvasRenderer } from './engine/renderer';
import { Camera2D, Collider, Mesh3D, Sprite, Tilemap } from './engine/components';
import { GameObject } from './engine/scene';
import { createSampleScene } from './sample/createSampleScene';
import { ZSharpRuntime } from './engine/zsharp';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar"><div class="brand"><span class="brand-mark">Z</span><strong>ZSharp</strong><small>ENGINE</small></div><div class="toolbar"><button id="play-button" class="primary">▶ Play</button><button id="reset-button">↻ Reset</button><span class="status" id="status">READY</span></div></header>
  <main class="workspace">
    <aside class="panel hierarchy"><div class="panel-title">SCENE <button id="add-object" title="Add object">＋</button></div><div id="hierarchy-list" class="tree"></div><div class="panel-title assets-title">ASSETS</div><div class="asset-list"><div>▧ &nbsp;starter-world.scene</div><div>▣ &nbsp;pixel-atlas.png</div><div>◈ &nbsp;prism.mesh</div><div>⌘ &nbsp;player.zs</div></div></aside>
    <section class="center-column"><div class="view-tabs"><span class="active">SCENE VIEW</span><span>2D + ORTHOGRAPHIC 3D</span><span class="spacer"></span><span id="fps">60 FPS</span></div><div class="canvas-wrap"><canvas id="viewport"></canvas><div class="hint">WASD / ARROWS to move · select objects in Scene</div></div><div class="console"><div class="console-head">Z# CONSOLE <button id="run-script">Run</button></div><div class="console-body"><textarea id="script" spellcheck="false">print("Welcome to Z#")
move("Player", 8, 0)</textarea><div id="output" class="output">Ready.</div></div></div></section>
    <aside class="panel inspector"><div class="panel-title">INSPECTOR</div><div id="inspector-content"></div></aside>
  </main><footer><span>ZSharp Engine · Starter project</span><span>Scene: <b>Starter World</b> &nbsp; · &nbsp; WebGL-free Canvas renderer</span></footer>`;

let scene = createSampleScene();
const canvas = document.querySelector<HTMLCanvasElement>('#viewport')!;
const engine = new GameEngine(scene, canvas, new CanvasRenderer(canvas.getContext('2d')!));
let selected = scene.objects.find(object => object.name === 'Player')!;
let running = false;
const hierarchy = document.querySelector<HTMLDivElement>('#hierarchy-list')!;
const inspector = document.querySelector<HTMLDivElement>('#inspector-content')!;

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
  inspector.innerHTML = `<div class="object-name">${selected.name}</div><div class="component"><h3>Transform</h3><label>Position X<input data-axis="x" type="number" value="${pos.x.toFixed(1)}" step="1"></label><label>Position Y<input data-axis="y" type="number" value="${pos.y.toFixed(1)}" step="1"></label><label>Position Z<input data-axis="z" type="number" value="${pos.z.toFixed(1)}" step="1"></label><label>Rotation Y<input data-axis="rotationY" type="number" value="${selected.transform.rotation.y.toFixed(2)}" step="0.1"></label></div><div class="component"><h3>Components</h3><p>${selected.components.map(component => component.constructor.name).join('<br>') || 'No components'}</p></div><div class="component note">Select an object to inspect its transform and components.</div>`;
  inspector.querySelectorAll<HTMLInputElement>('input[data-axis]').forEach(input => input.addEventListener('change', () => {
    const axis = input.dataset.axis!;
    if (axis === 'rotationY') selected.transform.rotation.y = Number(input.value);
    else selected.transform.position[axis as 'x' | 'y' | 'z'] = Number(input.value);
  }));
}
refreshHierarchy(); refreshInspector(); engine.start();

document.querySelector<HTMLButtonElement>('#play-button')!.onclick = event => {
  running = !running; (event.currentTarget as HTMLButtonElement).textContent = running ? '❚❚ Pause' : '▶ Play';
  document.querySelector('#status')!.textContent = running ? 'PLAYING' : 'PAUSED';
};
document.querySelector<HTMLButtonElement>('#reset-button')!.onclick = () => {
  engine.stop(); scene = createSampleScene(); engine.scene = scene; selected = scene.find('Player')!; refreshHierarchy(); refreshInspector(); engine.start();
};
document.querySelector<HTMLButtonElement>('#add-object')!.onclick = () => {
  const object = scene.add(new GameObject(`Object ${scene.objects.length + 1}`)); object.addComponent(new Sprite('#8b7bda', 24, 24)); selected = object; refreshHierarchy(); refreshInspector();
};
document.querySelector<HTMLButtonElement>('#run-script')!.onclick = () => {
  const result = new ZSharpRuntime().run(document.querySelector<HTMLTextAreaElement>('#script')!.value, scene);
  document.querySelector<HTMLDivElement>('#output')!.textContent = [...result.logs, ...result.errors.map(error => `ERROR: ${error}`)].join('\n') || 'Script completed.';
};
window.setInterval(() => { document.querySelector('#fps')!.textContent = `${Math.round(1000 / 16.7)} FPS`; }, 500);
