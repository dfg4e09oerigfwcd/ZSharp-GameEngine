export interface AssetManifest { images?: Record<string, string>; audio?: Record<string, string> }

/** Promise-cached browser asset loader. Failed loads are evicted so retry is possible. */
export class AssetManager {
  private readonly images = new Map<string, Promise<HTMLImageElement>>();
  private readonly audio = new Map<string, Promise<AudioBuffer>>();
  private audioContext?: AudioContext;
  loadImage(url: string): Promise<HTMLImageElement> {
    const cached = this.images.get(url); if (cached) return cached;
    const request = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image(); image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load image: ${url}`));
      image.src = url;
    });
    this.images.set(url, request);
    request.catch(() => this.images.delete(url));
    return request;
  }
  async loadAudio(url: string): Promise<AudioBuffer> {
    const cached = this.audio.get(url); if (cached) return cached;
    const request = (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Unable to load audio (${response.status}): ${url}`);
      const bytes = await response.arrayBuffer();
      this.audioContext ??= new AudioContext();
      return this.audioContext.decodeAudioData(bytes);
    })();
    this.audio.set(url, request);
    request.catch(() => this.audio.delete(url));
    return request;
  }
  async preload(manifest: AssetManifest, onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const entries = [...Object.values(manifest.images ?? {}).map(url => this.loadImage(url)), ...Object.values(manifest.audio ?? {}).map(url => this.loadAudio(url))];
    let loaded = 0;
    await Promise.all(entries.map(item => item.then(() => onProgress?.(++loaded, entries.length))));
  }
  clear(): void { this.images.clear(); this.audio.clear(); }
}

/** WebAudio playback with a generated tone fallback for the demo. */
export class AudioManager {
  private context?: AudioContext;
  constructor(private readonly assets: AssetManager) {}
  async play(url: string, volume = 1): Promise<void> {
    try {
      const buffer = await this.assets.loadAudio(url);
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
      const source = this.context.createBufferSource(); const gain = this.context.createGain();
      source.buffer = buffer; gain.gain.value = Math.max(0, Math.min(1, volume));
      source.connect(gain); gain.connect(this.context.destination); source.start();
    } catch (error) { console.warn(error); }
  }
  async tone(frequency = 660, duration = 0.09, volume = 0.08): Promise<void> {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') await this.context.resume();
    const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.type = 'square'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }
}
