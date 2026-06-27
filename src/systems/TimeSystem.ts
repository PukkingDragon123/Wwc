import { Balance } from '../config/Balance';
import { EventBus, GameEvents } from '../state/EventBus';

// The day clock. Advances ONLY while the player is outside (WorldScene calls
// update). Drives the dusk dimming and fires a single night warning.
export class TimeSystem {
  timeOfDay = 0; // 0 = dawn, 1 = night
  private warned = false;

  reset(): void {
    this.timeOfDay = 0;
    this.warned = false;
    EventBus.emit(GameEvents.TIME_CHANGED, this.timeOfDay);
  }

  // resume an in-progress day (re-entering the world mid-day)
  resume(t: number): void {
    this.timeOfDay = Math.max(0, Math.min(1, t));
    this.warned = this.timeOfDay >= Balance.NIGHT_WARNING_AT;
    EventBus.emit(GameEvents.TIME_CHANGED, this.timeOfDay);
  }

  update(deltaMs: number): void {
    if (this.timeOfDay >= 1) return;
    this.timeOfDay = Math.min(1, this.timeOfDay + deltaMs / Balance.DAY_DURATION_MS);
    EventBus.emit(GameEvents.TIME_CHANGED, this.timeOfDay);
    if (!this.warned && this.timeOfDay >= Balance.NIGHT_WARNING_AT) {
      this.warned = true;
      EventBus.emit(GameEvents.NIGHT_WARNING);
    }
  }

  isNight(): boolean {
    return this.timeOfDay >= Balance.NIGHT_AT;
  }

  // 0..1 darkness for the world tint overlay
  darkness(): number {
    if (this.timeOfDay < Balance.DUSK_START) return 0;
    return (this.timeOfDay - Balance.DUSK_START) / (1 - Balance.DUSK_START);
  }
}
