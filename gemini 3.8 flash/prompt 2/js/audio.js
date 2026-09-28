/**
 * Procedural Web Audio API Sound Synthesis
 * 100% self-contained, zero external asset dependencies.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.engineGain = null;
    this.radioGain = null;
    this.rainGain = null;

    // Engine synth nodes
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.isEngineRunning = false;

    // Screech synth
    this.screechNode = null;
    this.screechGain = null;

    // Siren synth
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLFO = null;
    this.isSirenActive = false;

    // Horn synth
    this.hornOsc1 = null;
    this.hornOsc2 = null;
    this.hornGain = null;
    this.isHonking = false;

    // Rain sound
    this.rainNode = null;

    // Radio
    this.currentStation = 0;
    this.stations = [
      { name: "SYNTHWAVE FM", track: "Neon Horizon 1984", tempo: 115, scale: [0, 3, 7, 10, 12, 15, 17, 19] },
      { name: "ELECTRO CYBER", track: "Turbocharger Highway", tempo: 128, scale: [0, 2, 3, 7, 8, 12, 14, 15] },
      { name: "LO-FI DRIFT", track: "Rainy Sidewalk Cafe", tempo: 85, scale: [0, 4, 7, 11, 12, 16, 19, 23] },
      { name: "RADIO OFF", track: "Silent City Streets", tempo: 0, scale: [] }
    ];
    this.radioTimer = null;
    this.radioStep = 0;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.radioGain.connect(this.masterGain);

      this.setupEngineSynth();
      this.setupScreechSynth();
      this.setupRainSynth();

      this.isInitialized = true;
      this.startRadio();
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /* ---------------- ENGINE SYNTH ---------------- */
  setupEngineSynth() {
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(300, this.ctx.currentTime);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);

    this.engineOsc.start();
    this.engineOsc2.start();
  }

  updateEngine(rpmRatio, throttle, inVehicle) {
    if (!this.isInitialized) return;
    if (!inVehicle) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }

    const baseFreq = 42 + rpmRatio * 130;
    const filterCutoff = 350 + throttle * 900 + rpmRatio * 1500;
    const volume = 0.18 + throttle * 0.15 + rpmRatio * 0.12;

    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, this.ctx.currentTime, 0.05);
    this.engineFilter.frequency.setTargetAtTime(filterCutoff, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  /* ---------------- TIRE SCREECH SYNTH ---------------- */
  setupScreechSynth() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.setValueAtTime(3, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.screechGain);
    this.screechGain.connect(this.sfxGain);
    whiteNoise.start();
  }

  setTireScreech(intensity) {
    if (!this.isInitialized) return;
    const target = Math.min(Math.max(intensity, 0), 1) * 0.28;
    this.screechGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
  }

  /* ---------------- POLICE SIREN SYNTH ---------------- */
  startSiren(distanceScale = 1) {
    if (!this.isInitialized || this.isSirenActive) return;
    this.isSirenActive = true;

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0.2 * distanceScale, this.ctx.currentTime);

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.setValueAtTime(650, this.ctx.currentTime);

    // LFO to modulate pitch between 600Hz and 1100Hz
    this.sirenLFO = this.ctx.createOscillator();
    this.sirenLFO.type = 'sine';
    this.sirenLFO.frequency.setValueAtTime(0.65, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(320, this.ctx.currentTime);

    this.sirenLFO.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);

    this.sirenOsc.start();
    this.sirenLFO.start();
  }

  updateSirenVolume(distanceFactor) {
    if (!this.sirenGain) return;
    const vol = Math.max(0, Math.min(1, 1 - distanceFactor / 180)) * 0.25;
    this.sirenGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
  }

  stopSiren() {
    if (!this.isSirenActive) return;
    this.isSirenActive = false;
    if (this.sirenOsc) {
      try {
        this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
        setTimeout(() => {
          if (this.sirenOsc) {
            this.sirenOsc.stop();
            this.sirenLFO.stop();
            this.sirenOsc.disconnect();
            this.sirenLFO.disconnect();
            this.sirenOsc = null;
            this.sirenLFO = null;
          }
        }, 250);
      } catch (e) {}
    }
  }

  /* ---------------- CAR HORN SYNTH ---------------- */
  startHorn() {
    if (!this.isInitialized || this.isHonking) return;
    this.isHonking = true;

    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc1.type = 'triangle';
    this.hornOsc1.frequency.setValueAtTime(420, this.ctx.currentTime);

    this.hornOsc2 = this.ctx.createOscillator();
    this.hornOsc2.type = 'sawtooth';
    this.hornOsc2.frequency.setValueAtTime(490, this.ctx.currentTime);

    this.hornOsc1.connect(this.hornGain);
    this.hornOsc2.connect(this.hornGain);
    this.hornGain.connect(this.sfxGain);

    this.hornOsc1.start();
    this.hornOsc2.start();
  }

  stopHorn() {
    if (!this.isHonking) return;
    this.isHonking = false;
    if (this.hornGain) {
      this.hornGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      setTimeout(() => {
        if (this.hornOsc1) {
          try {
            this.hornOsc1.stop();
            this.hornOsc2.stop();
            this.hornOsc1.disconnect();
            this.hornOsc2.disconnect();
          } catch(e) {}
          this.hornOsc1 = null;
          this.hornOsc2 = null;
        }
      }, 70);
    }
  }

  /* ---------------- IMPACT CRASH FX ---------------- */
  playCrash(speedRatio = 1) {
    if (!this.isInitialized) return;
    const now = this.ctx.currentTime;
    const intensity = Math.min(Math.max(speedRatio, 0.3), 1.5);

    // Noise crunch
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noiseSource.start(now);

    // Sub thud
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.5 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.35);
  }

  /* ---------------- RAIN & THUNDER SYNTH ---------------- */
  setupRainSynth() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }

    this.rainNode = this.ctx.createBufferSource();
    this.rainNode.buffer = buffer;
    this.rainNode.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.rainNode.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    this.rainNode.start();
  }

  setRainIntensity(intensity) {
    if (!this.isInitialized || !this.rainGain) return;
    this.rainGain.gain.setTargetAtTime(intensity * 0.22, this.ctx.currentTime, 1.5);
  }

  playThunder() {
    if (!this.isInitialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 1.8);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 2.2);
  }

  /* ---------------- UI / MISSION CHIMES ---------------- */
  playMissionChime(success = true) {
    if (!this.isInitialized) return;
    const now = this.ctx.currentTime;
    const notes = success ? [523.25, 659.25, 783.99, 1046.50] : [440, 392, 349.23, 293.66];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.28);
    });
  }

  playWantedAlert() {
    if (!this.isInitialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(480, now + 0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /* ---------------- GENERATIVE RADIO ---------------- */
  cycleRadio() {
    this.currentStation = (this.currentStation + 1) % this.stations.length;
    this.startRadio();
    return this.stations[this.currentStation];
  }

  startRadio() {
    if (this.radioTimer) {
      clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
    const station = this.stations[this.currentStation];
    if (station.tempo <= 0 || !this.isInitialized) {
      this.radioGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      return;
    }
    this.radioGain.gain.setTargetAtTime(0.28, this.ctx.currentTime, 0.5);

    const intervalMs = (60 / station.tempo / 4) * 1000;
    const baseRoot = 55; // A1/A2

    this.radioTimer = setInterval(() => {
      this.radioStep = (this.radioStep + 1) % 16;
      this.playRadioStep(station, baseRoot, this.radioStep);
    }, intervalMs);
  }

  playRadioStep(station, root, step) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Kick on 0, 4, 8, 12
    if (step % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(140, now);
      kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
      const kickGain = this.ctx.createGain();
      kickGain.gain.setValueAtTime(0.3, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      kickOsc.connect(kickGain);
      kickGain.connect(this.radioGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.16);
    }

    // Hi-hat on every 2 steps
    if (step % 2 === 0) {
      const hatOsc = this.ctx.createOscillator();
      hatOsc.type = 'triangle';
      hatOsc.frequency.setValueAtTime(8000, now);
      const hatGain = this.ctx.createGain();
      hatGain.gain.setValueAtTime(0.05, now);
      hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      hatOsc.connect(hatGain);
      hatGain.connect(this.radioGain);
      hatOsc.start(now);
      hatOsc.stop(now + 0.05);
    }

    // Synth Melodic Arp
    const noteIdx = station.scale[(step + (step > 8 ? 2 : 0)) % station.scale.length];
    const freq = (root * 4) * Math.pow(2, noteIdx / 12);

    const leadOsc = this.ctx.createOscillator();
    leadOsc.type = (station.name.includes("SYNTH") ? 'sawtooth' : 'sine');
    leadOsc.frequency.setValueAtTime(freq, now);

    const leadFilter = this.ctx.createBiquadFilter();
    leadFilter.type = 'lowpass';
    leadFilter.frequency.setValueAtTime(1600, now);

    const leadGain = this.ctx.createGain();
    leadGain.gain.setValueAtTime(0.08, now);
    leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    leadOsc.connect(leadFilter);
    leadFilter.connect(leadGain);
    leadGain.connect(this.radioGain);

    leadOsc.start(now);
    leadOsc.stop(now + 0.15);
  }
}

// Global singleton instance
window.soundEngine = new SoundEngine();
