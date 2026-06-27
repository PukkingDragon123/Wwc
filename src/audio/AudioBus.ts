// Procedural audio via the Web Audio API — no sound files. Squelchy impacts,
// dismemberment crunch, mutant screeches, a low-HP heartbeat, and two ambient
// beds (tense drone outside, warm hum inside). All wrapped so a missing/blocked
// AudioContext (e.g. headless) silently no-ops.

class AudioBusImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private ambient: { stop: () => void } | null = null;

  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
      // 1s of white noise for impacts / screeches
      const n = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, n, n);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch {
      this.ctx = null;
    }
  }

  private get t(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number): void {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.t);
    if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), this.t + dur);
    g.gain.setValueAtTime(0.0001, this.t);
    g.gain.exponentialRampToValueAtTime(gain, this.t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + dur);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(this.t + dur + 0.02);
  }

  private burst(dur: number, gain: number, freq: number, q = 1): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.t);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    src.stop(this.t + dur + 0.02);
  }

  swing(): void {
    this.ensure();
    this.burst(0.14, 0.18, 1400, 0.6);
  }

  impact(): void {
    this.ensure();
    this.tone(150, 0.12, 'triangle', 0.35, 70);
    this.burst(0.1, 0.3, 600, 0.8);
  }

  squelch(): void {
    this.ensure();
    this.burst(0.18, 0.4, 380, 1.2);
    this.tone(90, 0.16, 'sawtooth', 0.18, 50);
  }

  sever(): void {
    this.ensure();
    this.burst(0.26, 0.5, 300, 0.8);
    this.tone(70, 0.3, 'square', 0.22, 40);
  }

  screech(): void {
    this.ensure();
    this.tone(820, 0.3, 'sawtooth', 0.16, 180);
    this.burst(0.3, 0.16, 2200, 2);
  }

  heartbeat(intensity: number): void {
    this.ensure();
    const g = 0.2 + intensity * 0.3;
    this.tone(58, 0.14, 'sine', g, 40);
    if (this.ctx) {
      const c = this.ctx;
      const at = c.currentTime + 0.22;
      const o = c.createOscillator();
      const gain = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(52, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(g * 0.7, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
      o.connect(gain).connect(this.master!);
      o.start(at);
      o.stop(at + 0.16);
    }
  }

  startAmbient(mood: 'world' | 'home'): void {
    this.ensure();
    this.stopAmbient();
    if (!this.ctx || !this.master) return;
    const c = this.ctx;
    const bed = c.createGain();
    bed.gain.value = 0;
    bed.gain.linearRampToValueAtTime(mood === 'world' ? 0.12 : 0.09, c.currentTime + 2);
    bed.connect(this.master);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = mood === 'world' ? 320 : 540;
    lp.connect(bed);
    const freqs = mood === 'world' ? [42, 56, 84] : [98, 147, 196];
    const oscs = freqs.map((f, i) => {
      const o = c.createOscillator();
      o.type = mood === 'world' ? 'sawtooth' : 'triangle';
      o.frequency.value = f * (1 + i * 0.002);
      o.connect(lp);
      o.start();
      return o;
    });
    this.ambient = {
      stop: () => {
        try {
          bed.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
          oscs.forEach((o) => o.stop(c.currentTime + 0.7));
        } catch {
          /* ignore */
        }
      },
    };
  }

  stopAmbient(): void {
    if (this.ambient) {
      this.ambient.stop();
      this.ambient = null;
    }
  }
}

export const AudioBus = new AudioBusImpl();
