/**
 * Supercar Procedural Web Audio Sound Synthesizer
 * Generates dynamic engine sound, turbo spool, blow-off valve, tire squeal,
 * exhaust crackles/pops, and horn without any external audio files.
 * Works completely offline and via file:// protocol!
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isInitialized = false;

        // Sound nodes
        this.masterGain = null;

        // Engine nodes
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineSubOsc = null;
        this.engineFilter = null;
        this.engineGain = null;

        // Turbo nodes
        this.turboOsc = null;
        this.turboGain = null;

        // Tire screech nodes
        this.skidNoiseNode = null;
        this.skidFilter = null;
        this.skidGain = null;

        // State tracking
        this.currentRPM = 900;
        this.targetRPM = 900;
        this.throttle = 0;
        this.lastThrottle = 0;
        this.lastGear = 1;
    }

    init() {
        if (this.isInitialized) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        this.ctx = new AudioContext();

        // Master Volume
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // --- ENGINE SYNTHESIZER ---
        // Dual saw/triangle oscillators simulating V8 / V10 cylinder firing pulses
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc2.type = 'triangle';
        this.engineOsc2.frequency.setValueAtTime(67.5, this.ctx.currentTime);

        this.engineSubOsc = this.ctx.createOscillator();
        this.engineSubOsc.type = 'sawtooth';
        this.engineSubOsc.frequency.setValueAtTime(22.5, this.ctx.currentTime);

        // Lowpass filter for throaty intake & exhaust resonance
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(240, this.ctx.currentTime);
        this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

        // Waveshaper distortion for aggressive exhaust growl
        this.distortion = this.ctx.createWaveShaper();
        this.distortion.curve = this._makeDistortionCurve(18);
        this.distortion.oversample = '2x';

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

        // Connect Engine chain
        this.engineOsc1.connect(this.distortion);
        this.engineOsc2.connect(this.distortion);
        this.engineSubOsc.connect(this.distortion);
        this.distortion.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOsc1.start();
        this.engineOsc2.start();
        this.engineSubOsc.start();

        // --- TURBO SPOOL SYNTHESIZER ---
        this.turboOsc = this.ctx.createOscillator();
        this.turboOsc.type = 'sine';
        this.turboOsc.frequency.setValueAtTime(900, this.ctx.currentTime);

        this.turboGain = this.ctx.createGain();
        this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

        this.turboOsc.connect(this.turboGain);
        this.turboGain.connect(this.masterGain);
        this.turboOsc.start();

        // --- TIRE SLIP / SKID NOISE SYNTHESIZER ---
        this._setupSkidSynthesizer();

        this.isInitialized = true;
    }

    _makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 20;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    _setupSkidSynthesizer() {
        // Generate 2 seconds of white noise buffer
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        this.skidFilter = this.ctx.createBiquadFilter();
        this.skidFilter.type = 'bandpass';
        this.skidFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
        this.skidFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

        this.skidGain = this.ctx.createGain();
        this.skidGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

        whiteNoise.connect(this.skidFilter);
        this.skidFilter.connect(this.skidGain);
        this.skidGain.connect(this.masterGain);
        whiteNoise.start();
    }

    triggerGearShiftPop() {
        if (!this.isInitialized || this.isMuted) return;
        try {
            // Rapid pop / backfire crackle
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(350, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.11);
        } catch (e) {
            // Audio context not ready
        }
    }

    triggerBlowOff() {
        if (!this.isInitialized || this.isMuted) return;
        try {
            // Turbo blowoff "pshh-tss" sound
            const bufferSize = this.ctx.sampleRate * 0.35;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(3200, this.ctx.currentTime);
            filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            noise.start();
        } catch (e) {
            // Audio context not ready
        }
    }

    playHorn(start) {
        if (!this.isInitialized) this.init();
        if (this.isMuted || !this.ctx) return;

        if (start) {
            if (this.hornOsc1) return;
            this.hornOsc1 = this.ctx.createOscillator();
            this.hornOsc2 = this.ctx.createOscillator();
            this.hornGain = this.ctx.createGain();

            this.hornOsc1.type = 'sawtooth';
            this.hornOsc1.frequency.setValueAtTime(435, this.ctx.currentTime);
            this.hornOsc2.type = 'sawtooth';
            this.hornOsc2.frequency.setValueAtTime(545, this.ctx.currentTime);

            this.hornGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

            this.hornOsc1.connect(this.hornGain);
            this.hornOsc2.connect(this.hornGain);
            this.hornGain.connect(this.masterGain);

            this.hornOsc1.start();
            this.hornOsc2.start();
        } else {
            if (this.hornOsc1) {
                try {
                    this.hornGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
                    this.hornOsc1.stop(this.ctx.currentTime + 0.07);
                    this.hornOsc2.stop(this.ctx.currentTime + 0.07);
                } catch (e) {}
                this.hornOsc1 = null;
                this.hornOsc2 = null;
            }
        }
    }

    playClick() {
        if (!this.isInitialized || this.isMuted) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.05);
        } catch (e) {}
    }

    update(rpm, throttle, speedKmh, slipRatio, currentGear) {
        if (!this.isInitialized) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const normRpm = Math.max(800, Math.min(9200, rpm));

        // Detect gear shift
        if (currentGear !== this.lastGear && speedKmh > 15) {
            this.triggerGearShiftPop();
            this.lastGear = currentGear;
        }

        // Detect throttle lift off with boost
        if (this.lastThrottle > 0.7 && throttle < 0.2 && speedKmh > 40) {
            this.triggerBlowOff();
        }
        this.lastThrottle = throttle;

        // Pitch proportional to cylinder strokes (V8: 4 pulses per rev = rev/60 * 4)
        const fundamentalFreq = (normRpm / 60) * 3.5;
        this.engineOsc1.frequency.setTargetAtTime(fundamentalFreq, now, 0.04);
        this.engineOsc2.frequency.setTargetAtTime(fundamentalFreq * 1.5, now, 0.04);
        this.engineSubOsc.frequency.setTargetAtTime(fundamentalFreq * 0.5, now, 0.04);

        // Dynamic lowpass cutoff: opens up violently under full throttle
        const baseCutoff = 180 + (normRpm / 9000) * 1400;
        const throttleBoost = throttle * 1200;
        this.engineFilter.frequency.setTargetAtTime(baseCutoff + throttleBoost, now, 0.05);

        // Engine volume
        const baseVolume = 0.12 + (normRpm / 9000) * 0.18 + throttle * 0.12;
        this.engineGain.gain.setTargetAtTime(this.isMuted ? 0 : baseVolume, now, 0.04);

        // Turbo whistle simulation
        if (this.turboOsc && this.turboGain) {
            const turboPitch = 800 + (normRpm / 9000) * 1600 + throttle * 600;
            const turboVol = (throttle * 0.08) * (normRpm > 3200 ? 1 : (normRpm / 3200));
            this.turboOsc.frequency.setTargetAtTime(turboPitch, now, 0.08);
            this.turboGain.gain.setTargetAtTime(this.isMuted ? 0 : turboVol, now, 0.08);
        }

        // Tire slip audio
        if (this.skidGain && this.skidFilter) {
            const skidIntensity = Math.min(1.0, Math.max(0.0, slipRatio));
            const skidVol = (skidIntensity > 0.15 && speedKmh > 10) ? (skidIntensity * 0.32) : 0;
            this.skidGain.gain.setTargetAtTime(this.isMuted ? 0 : skidVol, now, 0.05);
            this.skidFilter.frequency.setTargetAtTime(950 + Math.min(speedKmh * 5, 800), now, 0.05);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.05);
        }
        return this.isMuted;
    }
}

// Global instance
window.soundEngine = new SoundEngine();
