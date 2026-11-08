import { Component } from '../engine/components';
import { GameObject, Scene } from '../engine/scene';
export type GameStatus = 'playing' | 'won' | 'lost';
/** Deterministic, UI-independent sample rules; the editor can observe score/status. */
export class DemoGameRules extends Component {
  score = 0;
  status: GameStatus = 'playing';
  constructor(private readonly scene: Scene, public readonly targetScore: number) { super(); }
  onPlayerContact(other: GameObject): void {
    if (this.status !== 'playing') return;
    if (other.name.startsWith('Coin ')) {
      this.score++;
      this.scene.remove(other);
      if (this.score >= this.targetScore) this.status = 'won';
    } else if (other.name === 'Enemy') this.status = 'lost';
  }
  reset(): void { this.score = 0; this.status = 'playing'; }
}
