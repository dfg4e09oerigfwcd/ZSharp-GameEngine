import { Camera2D, DirectionalLight, Mesh3D, Sprite, Tilemap } from './components';
import { Scene, GameObject } from './scene';
import { Vec3 } from './math';

export class CanvasRenderer {
  constructor(private readonly context: CanvasRenderingContext2D) {}
  render(scene: Scene, width: number, height: number): void {
    const ctx = this.context;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#171b27';
    ctx.fillRect(0, 0, width, height);
    this.drawGrid(ctx, width, height);
    const cameraObject = scene.objects.find(object => object.getComponent(Camera2D));
    const camera = cameraObject?.getComponent(Camera2D);
    const cameraPosition = camera?.followTarget?.transform.position ?? cameraObject?.transform.position;
    const zoom = Math.max(0.1, camera?.zoom ?? 1);
    const center = { x: width / 2, y: height / 2 };
    const project2D = (object: GameObject) => ({
      x: center.x + (object.transform.position.x - (cameraPosition?.x ?? 0)) * zoom,
      y: center.y - (object.transform.position.y - (cameraPosition?.y ?? 0)) * zoom
    });
    for (const object of scene.objects) {
      if (!object.visible) continue;
      const position = project2D(object);
      const sprite = object.getComponent(Sprite);
      if (sprite) this.drawSprite(ctx, sprite, position.x, position.y, zoom);
      const tilemap = object.getComponent(Tilemap);
      if (tilemap) this.drawTilemap(ctx, tilemap, position.x, position.y, zoom);
      const mesh = object.getComponent(Mesh3D);
      if (mesh) this.drawMesh(ctx, object, mesh, center.x, center.y, Math.min(width, height) * 0.28);
    }
  }
  private drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.strokeStyle = '#232938'; ctx.lineWidth = 1;
    for (let x = width / 2 % 32; x < width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = height / 2 % 32; y < height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  }
  private drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, zoom: number): void {
    const w = sprite.width * zoom, h = sprite.height * zoom;
    if (sprite.image?.complete && sprite.image.naturalWidth > 0) {
      if (sprite.sourceRect) {
        const r = sprite.sourceRect;
        ctx.drawImage(sprite.image, r.x, r.y, r.width, r.height, x - w / 2, y - h / 2, w, h);
      } else ctx.drawImage(sprite.image, x - w / 2, y - h / 2, w, h);
    } else { ctx.fillStyle = sprite.color; ctx.fillRect(x - w / 2, y - h / 2, w, h); }
  }
  private drawTilemap(ctx: CanvasRenderingContext2D, map: Tilemap, x: number, y: number, zoom: number): void {
    const size = map.tileSize * zoom;
    for (let row = 0; row < map.rows; row++) for (let column = 0; column < map.columns; column++) {
      const id = map.tiles[row * map.columns + column] ?? 0;
      if (!id) continue;
      ctx.fillStyle = map.palette[id] ?? '#ff00ff';
      ctx.fillRect(x + (column - map.columns / 2) * size, y - (row - map.rows / 2) * size, size, size);
    }
  }
  private drawMesh(ctx: CanvasRenderingContext2D, object: GameObject, mesh: Mesh3D, centerX: number, centerY: number, unit: number): void {
    const light = object.components.find(component => component instanceof DirectionalLight) as DirectionalLight | undefined;
    const lightDirection = (light?.direction ?? new Vec3(-0.4, -0.8, -0.6)).normalized();
    const triangles = mesh.faces.map(face => {
      const points = [face.a, face.b, face.c].map(index => {
        const vertex = mesh.vertices[index] ?? new Vec3();
        const yRotation = object.transform.rotation.y;
        const x = vertex.x * Math.cos(yRotation) - vertex.z * Math.sin(yRotation);
        const z = vertex.x * Math.sin(yRotation) + vertex.z * Math.cos(yRotation);
        const p = object.transform.position;
        return { x: centerX + (x * object.transform.scale.x + p.x) * unit * mesh.orthographicScale, y: centerY - (vertex.y * object.transform.scale.y + p.y) * unit * mesh.orthographicScale, z: z + p.z };
      });
      const [a, b, c] = points as [{x:number;y:number;z:number},{x:number;y:number;z:number},{x:number;y:number;z:number}];
      const normal = new Vec3(b.x - a.x, b.y - a.y, b.z - a.z).cross(new Vec3(c.x - a.x, c.y - a.y, c.z - a.z)).normalized();
      const brightness = Math.max(0.2, Math.min(1, 0.35 + Math.abs(normal.dot(lightDirection)) * (light?.intensity ?? 0.8)));
      return { points, depth: points.reduce((sum, point) => sum + point.z, 0) / points.length, color: face.color ?? mesh.color, brightness };
    }).sort((a, b) => a.depth - b.depth);
    for (const triangle of triangles) {
      const rgb = this.hexToRgb(triangle.color);
      ctx.fillStyle = `rgb(${Math.round(rgb.r * triangle.brightness)}, ${Math.round(rgb.g * triangle.brightness)}, ${Math.round(rgb.b * triangle.brightness)})`;
      ctx.beginPath(); triangle.points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#111722'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  private hexToRgb(color: string): {r:number;g:number;b:number} {
    const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
    return match ? { r: parseInt(match[1]!, 16), g: parseInt(match[2]!, 16), b: parseInt(match[3]!, 16) } : { r: 100, g: 200, b: 220 };
  }
}
