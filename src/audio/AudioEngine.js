/*
 * Everything you hear is synthesised in the browser:
 *  - a lute (Karplus–Strong plucked strings) playing arpeggios
 *  - a wooden flute carrying a folk melody in D dorian, 3/4 time
 *  - a soft bodhrán and shaker
 *  - campfire crackle and ocean waves that follow the player
 *
 * Drop an audio file at public/audio/theme.mp3 and it will be used for
 * the music instead of the synth.
 */

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const MINOR = [0, 3, 7];
const MAJOR = [0, 4, 7];

// [root midi, quality]
const CHORDS = {
  A: [[50, MINOR], [48, MAJOR], [46, MAJOR], [45, MAJOR], [50, MINOR], [53, MAJOR], [48, MAJOR], [50, MINOR]],
  B: [[53, MAJOR], [48, MAJOR], [50, MINOR], [45, MINOR], [46, MAJOR], [53, MAJOR], [43, MINOR], [45, MAJOR]],
};

// [midi, beats] per bar, 3 beats per bar
const MELODY = {
  A: [
    [[74, 1.5], [76, 0.5], [77, 1]],
    [[76, 1], [72, 1], [79, 1]],
    [[77, 1.5], [76, 0.5], [74, 1]],
    [[73, 2], [69, 1]],
    [[74, 1], [77, 1], [81, 1]],
    [[81, 1.5], [79, 0.5], [77, 1]],
    [[76, 1], [72, 1], [76, 1]],
    [[74, 3]],
  ],
  B: [
    [[77, 1], [81, 1], [79, 1]],
    [[79, 1.5], [77, 0.5], [76, 1]],
    [[74, 1], [77, 1], [81, 1]],
    [[81, 1.5], [79, 0.5], [76, 1]],
    [[77, 1], [74, 1], [70, 1]],
    [[72, 1.5], [74, 0.5], [77, 1]],
    [[79, 1], [77, 1], [74, 1]],
    [[73, 2], [76, 1]],
  ],
};

// section, melody on?, drums on?, melody octave shift, arp pattern
const FORM = [
  ['A', false, false, 0, 0],
  ['A', true, false, 0, 0],
  ['B', true, true, 0, 1],
  ['A', true, true, -12, 1],
  ['B', true, true, 0, 0],
  ['A', true, false, 0, 1],
];

const ARPS = [
  [0, 7, 12, 't12', 12, 7],
  [0, 12, 7, 't12', 19, 't12'],
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.55;
    this.ksCache = new Map();
    this.fireLevel = 0;
    this.waveLevel = 0;
  }

  get started() {
    return !!this.ctx;
  }

  async start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, ctx.currentTime, 1.5);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.connect(this.master);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.8, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    this.reverb.connect(wet).connect(comp);

    this.music = ctx.createGain();
    this.music.gain.value = 0.9;
    this.music.connect(comp);
    this.music.connect(this.reverb);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.7;
    this.sfx.connect(comp);
    this.sfx.connect(this.reverb);

    this.noise = this._noiseBuffer(2);
    this._ambience();

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });

    const usedFile = await this._tryFile();
    if (!usedFile) this._startSequencer();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.3);
  }

  /** 0..1 levels driven by the player's position. */
  setProximity(fire, waves) {
    if (!this.ctx) return;
    if (Math.abs(fire - this.fireLevel) < 0.02 && Math.abs(waves - this.waveLevel) < 0.02) return;
    const t = this.ctx.currentTime;
    this.fireLevel = fire;
    this.waveLevel = waves;
    this.fireGain.gain.setTargetAtTime(fire * 0.16, t, 0.3);
    this.waveGain.gain.setTargetAtTime(waves * 0.22, t, 0.5);
  }

  /* ------------------------------------------------------------- building blocks */
  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _noiseBuffer(seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Karplus–Strong plucked string, rendered once per pitch and cached. */
  _ks(midi) {
    let entry = this.ksCache.get(midi);
    if (entry) return entry;
    const ctx = this.ctx;
    const sr = ctx.sampleRate;
    const f = mtof(midi);
    const N = Math.max(2, Math.round(sr / f));
    const len = Math.floor(sr * (midi < 48 ? 3.2 : 2.4));
    const data = new Float32Array(len);
    let prev = 0;
    for (let i = 0; i < N; i++) {
      prev = prev * 0.45 + (Math.random() * 2 - 1) * 0.55;
      data[i] = prev;
    }
    const damping = midi < 48 ? 0.998 : 0.996;
    for (let i = N; i < len; i++) data[i] = 0.5 * (data[i - N] + (i - N - 1 >= 0 ? data[i - N - 1] : 0)) * damping;
    const fade = Math.floor(sr * 0.15);
    for (let i = 0; i < fade; i++) data[len - 1 - i] *= i / fade;
    const buffer = ctx.createBuffer(1, len, sr);
    buffer.copyToChannel(data, 0);
    entry = { buffer, rate: (f * (N + 0.5)) / sr };
    this.ksCache.set(midi, entry);
    return entry;
  }

  pluck(midi, time, vel = 0.4, dest = this.music, pan = 0) {
    const ctx = this.ctx;
    const { buffer, rate } = this._ks(midi);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vel;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2600;
    let node = src.connect(filter).connect(g);
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    node.connect(dest);
    src.start(time);
  }

  flute(midi, time, dur, vel = 0.1) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = f * 2;
    const o2g = ctx.createGain();
    o2g.gain.value = 0.12;

    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(0, time);
    vibGain.gain.linearRampToValueAtTime(f * 0.006, time + Math.min(0.35, dur * 0.6));
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);
    vibGain.connect(osc2.frequency);

    const env = ctx.createGain();
    const end = time + dur;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(vel, time + 0.05);
    env.gain.setTargetAtTime(vel * 0.8, time + 0.05, 0.2);
    env.gain.setTargetAtTime(0, end - 0.04, 0.06);

    // a breath of noise on the attack
    const breath = ctx.createBufferSource();
    breath.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2;
    bp.Q.value = 2;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(vel * 0.5, time);
    bg.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    breath.connect(bp).connect(bg).connect(this.music);

    osc.connect(env);
    osc2.connect(o2g).connect(env);
    env.connect(this.music);
    for (const o of [osc, osc2, vib]) {
      o.start(time);
      o.stop(end + 0.5);
    }
    breath.start(time, Math.random());
    breath.stop(time + 0.15);
  }

  drum(time, vel = 0.5) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
    osc.connect(g).connect(this.music);
    osc.start(time);
    osc.stop(time + 0.5);

    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(vel * 0.4, time);
    ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    n.connect(f).connect(ng).connect(this.music);
    n.start(time, Math.random());
    n.stop(time + 0.1);
  }

  shaker(time, vel = 0.05) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vel, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
    n.connect(f).connect(g).connect(this.music);
    n.start(time, Math.random());
    n.stop(time + 0.12);
  }

  /* ------------------------------------------------------------------- music */
  async _tryFile() {
    try {
      const url = `${import.meta.env.BASE_URL}audio/theme.mp3`;
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok || !(res.headers.get('content-type') || '').startsWith('audio')) return false;
      const el = new Audio(url);
      el.loop = true;
      el.crossOrigin = 'anonymous';
      const src = this.ctx.createMediaElementSource(el);
      const g = this.ctx.createGain();
      g.gain.value = 0.8;
      src.connect(g).connect(this.master);
      await el.play();
      return true;
    } catch {
      return false;
    }
  }

  _startSequencer() {
    this.bpm = 96;
    this.beat = 60 / this.bpm;
    this.barIndex = 0;
    this.nextBar = this.ctx.currentTime + 0.3;
    const tick = () => {
      if (!this.ctx) return;
      while (this.nextBar < this.ctx.currentTime + 1.6) {
        this._scheduleBar(this.barIndex, this.nextBar);
        this.nextBar += this.beat * 3;
        this.barIndex++;
      }
    };
    tick();
    this.sequencer = setInterval(tick, 200);
  }

  _scheduleBar(index, t) {
    const b = this.beat;
    const sectionIndex = Math.floor(index / 8) % FORM.length;
    const bar = index % 8;
    const [section, melodyOn, drumsOn, shift, arpIndex] = FORM[sectionIndex];
    const [root, quality] = CHORDS[section][bar];
    const third = quality[1];

    // bass
    this.pluck(root - 12, t, 0.55, this.music, 0);
    if (bar % 2 === 1) this.pluck(root - 5, t + b * 2, 0.3, this.music, 0);

    // lute arpeggio in eighths
    ARPS[arpIndex].forEach((step, i) => {
      const off = step === 't12' ? 12 + third : step;
      const accent = i === 0 ? 0.42 : 0.28;
      const swing = i % 2 ? 0.03 : 0;
      this.pluck(root + off, t + i * (b / 2) + swing, accent, this.music, -0.25);
    });

    // soft pad: a quiet chord for warmth
    this._pad(root, quality, t, b * 3);

    if (melodyOn) {
      let at = t;
      for (const [note, beats] of MELODY[section][bar]) {
        this.flute(note + shift, at, beats * b * 0.95, shift < 0 ? 0.085 : 0.075);
        at += beats * b;
      }
    }
    if (drumsOn) {
      this.drum(t, 0.35);
      this.drum(t + b * 2, 0.15);
      for (let i = 0; i < 6; i++) this.shaker(t + i * (b / 2), i % 2 ? 0.02 : 0.035);
    }
    // end of the whole form: a small flourish
    if (sectionIndex === FORM.length - 1 && bar === 7) {
      [74, 77, 81, 86].forEach((n, i) => this.pluck(n, t + b * 1.5 + i * 0.09, 0.2, this.music, 0.3));
    }
  }

  _pad(root, quality, time, dur) {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.022, time + dur * 0.4);
    g.gain.linearRampToValueAtTime(0, time + dur + 0.3);
    filter.connect(g).connect(this.music);
    for (const iv of quality) {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = mtof(root + iv);
        o.detune.value = det;
        o.connect(filter);
        o.start(time);
        o.stop(time + dur + 0.4);
      }
    }
  }

  /* --------------------------------------------------------------- ambience */
  _ambience() {
    const ctx = this.ctx;
    // fire: low rumble + random crackles
    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0;
    this.fireGain.connect(this.master);
    const rumble = ctx.createBufferSource();
    rumble.buffer = this.noise;
    rumble.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    const rg = ctx.createGain();
    rg.gain.value = 0.5;
    rumble.connect(lp).connect(rg).connect(this.fireGain);
    rumble.start();

    const crackle = () => {
      if (!this.ctx) return;
      if (this.fireLevel > 0.02) {
        const t = ctx.currentTime + Math.random() * 0.1;
        const n = ctx.createBufferSource();
        n.buffer = this.noise;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 1500 + Math.random() * 3500;
        f.Q.value = 3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.6 + Math.random() * 1.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.02 + Math.random() * 0.05);
        n.connect(f).connect(g).connect(this.fireGain);
        n.start(t, Math.random() * 1.5);
        n.stop(t + 0.1);
      }
      setTimeout(crackle, 40 + Math.random() * 180);
    };
    crackle();

    // waves: filtered noise with a slow swell
    this.waveGain = ctx.createGain();
    this.waveGain.gain.value = 0;
    this.waveGain.connect(this.master);
    const surf = ctx.createBufferSource();
    surf.buffer = this.noise;
    surf.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'lowpass';
    wf.frequency.value = 700;
    const swell = ctx.createGain();
    swell.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.45;
    lfo.connect(lfoGain).connect(swell.gain);
    surf.connect(wf).connect(swell).connect(this.waveGain);
    surf.start();
    lfo.start();
  }

  /* --------------------------------------------------------------- UI sounds */
  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    [69, 74, 78].forEach((n, i) => this.pluck(n + 12, t + i * 0.06, 0.18, this.sfx, 0.2));
  }

  discover() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    [62, 66, 69, 74, 78].forEach((n, i) => this.pluck(n + 12, t + i * 0.08, 0.25, this.sfx, (i - 2) * 0.2));
  }

  close() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    [81, 74].forEach((n, i) => this.pluck(n, t + i * 0.07, 0.14, this.sfx, 0));
  }

  whoosh() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.5;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(3000, t + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    n.connect(f).connect(g).connect(this.sfx);
    n.start(t);
    n.stop(t + 1);
    [74, 81, 86].forEach((m, i) => this.pluck(m, t + 0.3 + i * 0.07, 0.15, this.sfx, 0));
  }
}
