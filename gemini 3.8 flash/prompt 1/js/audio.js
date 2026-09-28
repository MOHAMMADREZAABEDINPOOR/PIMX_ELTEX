// ============================================================================
// Aetheria: Sky Isles Adventure - Procedural Web Audio Engine
// 100% synthesized sound effects & background music (Zero external assets)
// ============================================================================

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isMusicMuted = false;
        this.masterVolume = 0.6;
        this.musicVolume = 0.28;
        this.sfxVolume = 0.55;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        this.isPlayingMusic = false;
        this.musicTimer = null;
        this.gemCombo = 0;
        this.lastGemTime = 0;

        // Music sequencing
        this.bpm = 124;
        this.stepTime = 60 / this.bpm / 4; // 16th note in seconds
        this.currentStep = 0;
        this.nextNoteTime = 0;

        // Pentatonic / Happy Fantasy Scale frequencies
        this.notes = {
            C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
            C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
            C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
            C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760.00, C7: 2093.00
        };

        // Melodic loops (16 beats = 64 16th notes)
        this.melodyTrack = [
            'C5', null, 'E5', null, 'G5', null, 'C6', null,
            'B5', null, 'G5', null, 'E5', null, 'D5', null,
            'E5', null, 'G5', null, 'A5', null, 'C6', null,
            'D6', null, 'B5', null, 'G5', null, null, null,
            'A5', null, 'C6', null, 'E6', null, 'D6', null,
            'C6', null, 'A5', null, 'F5', null, 'G5', null,
            'E5', null, 'G5', null, 'C6', null, 'D6', null,
            'C6', null, null, null, 'G5', null, null, null
        ];

        this.bassTrack = [
            'C3', null, 'C3', null, 'G3', null, 'C3', null,
            'G3', null, 'G3', null, 'B3', null, 'G3', null,
            'A3', null, 'A3', null, 'E3', null, 'A3', null,
            'F3', null, 'F3', null, 'C3', null, 'G3', null,
            'F3', null, 'F3', null, 'A3', null, 'F3', null,
            'C3', null, 'C3', null, 'G3', null, 'C3', null,
            'G3', null, 'G3', null, 'D3', null, 'G3', null,
            'C3', null, 'E3', null, 'G3', null, 'C4', null
        ];
    }

    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
    }

    resume() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    toggleMusic() {
        this.isMusicMuted = !this.isMusicMuted;
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setValueAtTime(this.isMusicMuted ? 0 : this.musicVolume, this.ctx.currentTime);
        }
        return this.isMusicMuted;
    }

    // --- Sound Effects ---

    playJump() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.17);
    }

    playDoubleJump() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        [440, 660].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.04);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + i * 0.04 + 0.12);

            gain.gain.setValueAtTime(0.3, now + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.04 + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.04);
            osc.stop(now + i * 0.04 + 0.16);
        });
    }

    playGem() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        if (now - this.lastGemTime < 0.6) {
            this.gemCombo = Math.min(this.gemCombo + 1, 5);
        } else {
            this.gemCombo = 0;
        }
        this.lastGemTime = now;

        const comboPitches = [987.77, 1174.66, 1318.51, 1567.98, 1760.00, 2093.00];
        const baseFreq = comboPitches[this.gemCombo] || 1046.5;

        // Twinkling bell harmonic
        [baseFreq, baseFreq * 2].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            const vol = idx === 0 ? 0.35 : 0.18;
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    }

    playPowerup() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = now + idx * 0.08;

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);

            // Filter for warm synth brass
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2200, startTime);

            gain.gain.setValueAtTime(0.28, startTime);
            gain.gain.exponentialRampToValueAtTime(0.005, startTime + 0.25);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.26);
        });
    }

    playStomp() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        // Punchy squish
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    playHurt() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.25);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playSpring() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.18);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.4);
    }

    playCheckpoint() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const notes = [349.23, 440.0, 523.25, 659.25, 880.0]; // F major 7
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + idx * 0.09;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.35, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(start);
            osc.stop(start + 0.75);
        });
    }

    playVictory() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const fanfare = [
            { note: 523.25, time: 0, dur: 0.15 },
            { note: 523.25, time: 0.16, dur: 0.15 },
            { note: 523.25, time: 0.32, dur: 0.15 },
            { note: 659.25, time: 0.48, dur: 0.3 },
            { note: 587.33, time: 0.8, dur: 0.18 },
            { note: 659.25, time: 1.0, dur: 0.18 },
            { note: 783.99, time: 1.2, dur: 0.6 }
        ];

        fanfare.forEach(item => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + item.time;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(item.note, start);

            gain.gain.setValueAtTime(0.4, start);
            gain.gain.exponentialRampToValueAtTime(0.005, start + item.dur);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(start);
            osc.stop(start + item.dur + 0.05);
        });
    }

    playFalling() {
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.7);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.8);
    }

    // --- Dynamic Background Music Sequencer ---

    startMusic() {
        if (this.isPlayingMusic) return;
        this.resume();
        if (!this.ctx) return;

        this.isPlayingMusic = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.currentStep = 0;
        this.scheduleMusic();
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    scheduleMusic() {
        if (!this.isPlayingMusic || !this.ctx) return;

        const lookAhead = 0.2; // schedule 200ms ahead
        while (this.nextNoteTime < this.ctx.currentTime + lookAhead) {
            this.playStepNotes(this.currentStep, this.nextNoteTime);
            this.currentStep = (this.currentStep + 1) % 64;
            this.nextNoteTime += this.stepTime;
        }

        this.musicTimer = setTimeout(() => this.scheduleMusic(), 80);
    }

    playStepNotes(step, time) {
        if (this.isMusicMuted || !this.musicGain) return;

        // Melody note
        const melNote = this.melodyTrack[step];
        if (melNote && this.notes[melNote]) {
            const freq = this.notes[melNote];
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.18, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + this.stepTime * 1.8);

            osc.connect(gain);
            gain.connect(this.musicGain);

            osc.start(time);
            osc.stop(time + this.stepTime * 2);
        }

        // Bass note
        const bassNote = this.bassTrack[step];
        if (bassNote && this.notes[bassNote]) {
            const freq = this.notes[bassNote];
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.22, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + this.stepTime * 1.5);

            osc.connect(gain);
            gain.connect(this.musicGain);

            osc.start(time);
            osc.stop(time + this.stepTime * 1.6);
        }

        // Light rhythm percussion (soft white noise hi-hat on every offbeat 16th, kick on beat 1/3)
        if (step % 8 === 0) {
            // Soft kick
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kickOsc.frequency.setValueAtTime(110, time);
            kickOsc.frequency.exponentialRampToValueAtTime(35, time + 0.08);

            kickGain.gain.setValueAtTime(0.22, time);
            kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

            kickOsc.connect(kickGain);
            kickGain.connect(this.musicGain);
            kickOsc.start(time);
            kickOsc.stop(time + 0.1);
        } else if (step % 4 === 2) {
            // Snare / rim click
            const clickOsc = this.ctx.createOscillator();
            const clickGain = this.ctx.createGain();
            clickOsc.type = 'triangle';
            clickOsc.frequency.setValueAtTime(320, time);
            clickGain.gain.setValueAtTime(0.08, time);
            clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

            clickOsc.connect(clickGain);
            clickGain.connect(this.musicGain);
            clickOsc.start(time);
            clickOsc.stop(time + 0.06);
        }
    }
}

// Global instance
window.gameAudio = new SoundEngine();
