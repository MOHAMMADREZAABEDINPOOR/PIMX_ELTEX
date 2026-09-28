/**
 * Main Application Coordinator
 * Handles Three.js rendering, camera management, showroom/driving modes,
 * input controllers, HUD updates, and UI events.
 */

class App {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.clock = new THREE.Clock();

        // Mode: 'showroom' or 'drive'
        this.mode = 'showroom';

        // Camera views for driving
        // 0: Chase, 1: Cockpit, 2: Bumper/Hood, 3: Drone, 4: Action Wheel
        this.cameraViewIndex = 0;
        this.cameraViews = ['Chase View', 'Cockpit POV', 'Bumper Cam', 'Drone Cam', 'Wheel Action'];

        // Unit system: 'kmh' or 'mph'
        this.speedUnit = 'kmh';

        this._initScene();
        this._initCar();
        this._initPhysics();
        this._initEnvironment();
        this._initControls();
        this._initUI();

        // Handle window resizing
        window.addEventListener('resize', () => this._onResize());

        // Start animation loop
        this._animate();
    }

    _initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06080d);
        this.scene.fog = new THREE.FogExp2(0x06080d, 0.0035);

        this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(4.8, 2.0, 5.8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.container.appendChild(this.renderer.domElement);

        // OrbitControls for Showroom
        this.orbitControls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go underground
        this.orbitControls.minDistance = 2.2;
        this.orbitControls.maxDistance = 18.0;
        this.orbitControls.target.set(0, 0.65, 0);
        this.orbitControls.autoRotate = true;
        this.orbitControls.autoRotateSpeed = 1.2;
    }

    _initCar() {
        this.car = new CarModel();
        // Car starts at origin
        this.scene.add(this.car.group);
    }

    _initPhysics() {
        // Physics system takes ownership of car transform
        this.physics = new VehiclePhysics(this.car, this.scene);
    }

    _initEnvironment() {
        this.env = new EnvironmentManager(this.scene);
    }

    _initControls() {
        this.keys = {};

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Audio init on first keypress
            if (window.soundEngine && !window.soundEngine.isInitialized) {
                window.soundEngine.init();
                const soundBanner = document.getElementById('sound-prompt');
                if (soundBanner) soundBanner.style.display = 'none';
            }

            // Quick Hotkeys
            if (e.code === 'KeyC') {
                this.cycleCamera();
            } else if (e.code === 'KeyR') {
                this.resetCar();
            } else if (e.code === 'KeyL') {
                this.car.toggleHeadlights();
                this._updateHeadlightBtnUI();
            } else if (e.code === 'KeyU') {
                this.car.toggleUnderglow();
            } else if (e.code === 'KeyH') {
                window.soundEngine.playHorn(true);
            } else if (e.code === 'KeyM') {
                this.toggleMute();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'KeyH') {
                window.soundEngine.playHorn(false);
            }
        });

        // Click anywhere to wake audio context
        window.addEventListener('click', () => {
            if (window.soundEngine && !window.soundEngine.isInitialized) {
                window.soundEngine.init();
                const soundBanner = document.getElementById('sound-prompt');
                if (soundBanner) soundBanner.style.display = 'none';
            }
        }, { once: true });
    }

    _initUI() {
        // Mode Selector: Showroom vs Drive
        const btnShowroom = document.getElementById('btn-mode-showroom');
        const btnDrive = document.getElementById('btn-mode-drive');

        btnShowroom.addEventListener('click', () => this.switchMode('showroom'));
        btnDrive.addEventListener('click', () => this.switchMode('drive'));

        // Color presets
        const colorSwatches = document.querySelectorAll('.color-swatch');
        colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                colorSwatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                const hex = swatch.dataset.color;
                this.car.setPaintColor(parseInt(hex, 16));
                document.getElementById('custom-color-picker').value = '#' + hex.padStart(6, '0');
                if (window.soundEngine) window.soundEngine.playClick();
            });
        });

        // Custom color input
        const customColor = document.getElementById('custom-color-picker');
        if (customColor) {
            customColor.addEventListener('input', (e) => {
                const hexVal = parseInt(e.target.value.replace('#', ''), 16);
                this.car.setPaintColor(hexVal);
                colorSwatches.forEach(s => s.classList.remove('active'));
            });
        }

        // Finish buttons
        const finishBtns = document.querySelectorAll('.finish-btn');
        finishBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                finishBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.car.setPaintFinish(btn.dataset.finish);
                if (window.soundEngine) window.soundEngine.playClick();
            });
        });

        // Caliper color buttons
        const caliperSwatches = document.querySelectorAll('.caliper-swatch');
        caliperSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                caliperSwatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                this.car.setCaliperColor(parseInt(swatch.dataset.color, 16));
                if (window.soundEngine) window.soundEngine.playClick();
            });
        });

        // Rim Finish selector
        const rimBtns = document.querySelectorAll('.rim-btn');
        rimBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                rimBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const color = parseInt(btn.dataset.color, 16);
                const roughness = parseFloat(btn.dataset.roughness);
                const metalness = parseFloat(btn.dataset.metalness);
                this.car.setRimFinish(color, roughness, metalness);
                if (window.soundEngine) window.soundEngine.playClick();
            });
        });

        // Window Tint buttons
        const tintBtns = document.querySelectorAll('.tint-btn');
        tintBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tintBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.car.setWindowTint(parseFloat(btn.dataset.opacity));
                if (window.soundEngine) window.soundEngine.playClick();
            });
        });

        // Interactive Door & Hood buttons
        const btnDoors = document.getElementById('btn-doors');
        if (btnDoors) {
            btnDoors.addEventListener('click', () => {
                const isOpen = this.car.toggleDoors();
                btnDoors.classList.toggle('active', isOpen);
                btnDoors.querySelector('.btn-label').textContent = isOpen ? 'Close Doors' : 'Open Doors';
                if (window.soundEngine) window.soundEngine.playClick();
            });
        }

        const btnHood = document.getElementById('btn-hood');
        if (btnHood) {
            btnHood.addEventListener('click', () => {
                const isOpen = this.car.toggleHood();
                btnHood.classList.toggle('active', isOpen);
                btnHood.querySelector('.btn-label').textContent = isOpen ? 'Close Engine Bay' : 'Open Engine Bay';
                if (window.soundEngine) window.soundEngine.playClick();
            });
        }

        // Lighting toggle buttons
        const btnLights = document.getElementById('btn-lights');
        if (btnLights) {
            btnLights.addEventListener('click', () => {
                this.car.toggleHeadlights();
                this._updateHeadlightBtnUI();
                if (window.soundEngine) window.soundEngine.playClick();
            });
        }

        const btnUnderglow = document.getElementById('btn-underglow');
        if (btnUnderglow) {
            btnUnderglow.addEventListener('click', () => {
                const isOn = this.car.toggleUnderglow();
                btnUnderglow.classList.toggle('active', isOn);
                if (window.soundEngine) window.soundEngine.playClick();
            });
        }

        // Underglow color buttons
        const ugSwatches = document.querySelectorAll('.ug-swatch');
        ugSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                ugSwatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
                this.car.setUnderglowColor(parseInt(swatch.dataset.color, 16));
                if (window.soundEngine) window.soundEngine.playClick();
            });
        });

        // Showroom Camera Angle Presets
        const camBtns = document.querySelectorAll('.cam-preset-btn');
        camBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                camBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._setCameraPreset(btn.dataset.preset);
                if (window.soundEngine) window.soundEngine.playClick();
            });
        });

        // Camera cycle button in Drive mode
        const btnCycleCam = document.getElementById('btn-cycle-cam');
        if (btnCycleCam) {
            btnCycleCam.addEventListener('click', () => this.cycleCamera());
        }

        // Speed unit toggle
        const unitToggle = document.getElementById('unit-toggle');
        if (unitToggle) {
            unitToggle.addEventListener('click', () => {
                this.speedUnit = this.speedUnit === 'kmh' ? 'mph' : 'kmh';
                document.getElementById('speed-unit-label').textContent = this.speedUnit.toUpperCase();
                unitToggle.textContent = this.speedUnit === 'kmh' ? 'Switch to MPH' : 'Switch to KM/H';
            });
        }

        // Sound mute toggle
        const btnSound = document.getElementById('btn-sound-toggle');
        if (btnSound) {
            btnSound.addEventListener('click', () => this.toggleMute());
        }

        // Horn Button
        const btnHorn = document.getElementById('btn-horn');
        if (btnHorn) {
            const startHorn = (e) => { e.preventDefault(); window.soundEngine.playHorn(true); };
            const stopHorn = (e) => { e.preventDefault(); window.soundEngine.playHorn(false); };
            btnHorn.addEventListener('mousedown', startHorn);
            btnHorn.addEventListener('mouseup', stopHorn);
            btnHorn.addEventListener('touchstart', startHorn);
            btnHorn.addEventListener('touchend', stopHorn);
        }

        // Reset car button
        const btnReset = document.getElementById('btn-reset');
        if (btnReset) {
            btnReset.addEventListener('click', () => this.resetCar());
        }

        // Touch virtual driving buttons (for mobile / tablet / on-screen clicking)
        this._initTouchControls();
    }

    _initTouchControls() {
        const bindButton = (id, keyName) => {
            const el = document.getElementById(id);
            if (!el) return;
            const press = (e) => { e.preventDefault(); this.keys[keyName] = true; };
            const release = (e) => { e.preventDefault(); this.keys[keyName] = false; };
            el.addEventListener('mousedown', press);
            el.addEventListener('mouseup', release);
            el.addEventListener('mouseleave', release);
            el.addEventListener('touchstart', press, { passive: false });
            el.addEventListener('touchend', release, { passive: false });
        };

        bindButton('touch-gas', 'KeyW');
        bindButton('touch-brake', 'KeyS');
        bindButton('touch-left', 'KeyA');
        bindButton('touch-right', 'KeyD');
        bindButton('touch-handbrake', 'Space');
    }

    _updateHeadlightBtnUI() {
        const btn = document.getElementById('btn-lights');
        if (btn) {
            btn.classList.toggle('active', this.car.headlightsOn);
            btn.querySelector('.btn-label').textContent = this.car.headlightsOn ? 'Lights: ON' : 'Lights: OFF';
        }
    }

    toggleMute() {
        if (!window.soundEngine.isInitialized) window.soundEngine.init();
        const isMuted = window.soundEngine.toggleMute();
        const btn = document.getElementById('btn-sound-toggle');
        if (btn) {
            btn.classList.toggle('muted', isMuted);
            btn.querySelector('.sound-icon').textContent = isMuted ? '🔇' : '🔊';
            btn.querySelector('.sound-text').textContent = isMuted ? 'Sound OFF' : 'Sound ON';
        }
    }

    switchMode(newMode) {
        if (this.mode === newMode) return;
        this.mode = newMode;

        const btnShowroom = document.getElementById('btn-mode-showroom');
        const btnDrive = document.getElementById('btn-mode-drive');
        const showroomPanel = document.getElementById('showroom-panel');
        const showroomPresets = document.getElementById('showroom-cam-presets');
        const driveHUD = document.getElementById('drive-hud');
        const driveHelp = document.getElementById('drive-controls-help');
        const driveQuick = document.getElementById('drive-quick-actions');
        const driftCard = document.getElementById('hud-drift-card');

        if (newMode === 'showroom') {
            btnShowroom.classList.add('active');
            btnDrive.classList.remove('active');
            if (showroomPanel) showroomPanel.style.display = 'flex';
            if (showroomPresets) showroomPresets.style.display = 'flex';
            if (driveHUD) driveHUD.style.display = 'none';
            if (driveHelp) driveHelp.style.display = 'none';
            if (driveQuick) driveQuick.style.display = 'none';
            if (driftCard) driftCard.style.display = 'none';

            this.env.setMode('showroom');
            this.physics.resetPosition(0, 0, 0);
            this.orbitControls.enabled = true;
            this.orbitControls.autoRotate = true;
            this.orbitControls.target.set(0, 0.65, 0);
            this.camera.position.set(4.8, 2.0, 5.8);
        } else {
            btnShowroom.classList.remove('active');
            btnDrive.classList.add('active');
            if (showroomPanel) showroomPanel.style.display = 'none';
            if (showroomPresets) showroomPresets.style.display = 'none';
            if (driveHUD) driveHUD.style.display = 'block';
            if (driveHelp) driveHelp.style.display = 'flex';
            if (driveQuick) driveQuick.style.display = 'flex';
            if (driftCard) driftCard.style.display = 'flex';

            this.env.setMode('drive');
            // Close doors for driving
            this.car.targetDoorsOpen = 0;
            this.car.targetHoodOpen = 0;
            const btnDoors = document.getElementById('btn-doors');
            if (btnDoors) {
                btnDoors.classList.remove('active');
                btnDoors.querySelector('.btn-label').textContent = 'Open Doors';
            }
            const btnHood = document.getElementById('btn-hood');
            if (btnHood) {
                btnHood.classList.remove('active');
                btnHood.querySelector('.btn-label').textContent = 'Open Engine Bay';
            }

            this.orbitControls.enabled = false;
            this.physics.resetPosition(0, -50, 0); // Position on track
            this.cameraViewIndex = 0;
            this._updateCameraBadge();
        }

        if (window.soundEngine) window.soundEngine.playClick();
    }

    _setCameraPreset(preset) {
        if (this.mode !== 'showroom') return;
        this.orbitControls.autoRotate = false;

        switch (preset) {
            case 'front34':
                this._tweenCamera(new THREE.Vector3(4.2, 1.4, 4.4), new THREE.Vector3(0, 0.5, 0));
                break;
            case 'side':
                this._tweenCamera(new THREE.Vector3(5.8, 1.1, 0), new THREE.Vector3(0, 0.5, 0));
                break;
            case 'rear':
                this._tweenCamera(new THREE.Vector3(-3.4, 1.2, -4.2), new THREE.Vector3(0, 0.5, -0.4));
                break;
            case 'wheel':
                this._tweenCamera(new THREE.Vector3(1.6, 0.45, 1.6), new THREE.Vector3(0.88, 0.35, 1.38));
                break;
            case 'cockpit':
                this._tweenCamera(new THREE.Vector3(-0.34, 0.95, 0.0), new THREE.Vector3(-0.34, 0.75, 2.0));
                break;
            case 'turntable':
                this.orbitControls.autoRotate = true;
                this._tweenCamera(new THREE.Vector3(5.2, 2.2, 5.2), new THREE.Vector3(0, 0.65, 0));
                break;
        }
    }

    _tweenCamera(targetPos, targetLookAt) {
        this.targetCamPos = targetPos;
        this.targetCamLookAt = targetLookAt;
        this.isTransitioningCam = true;
        this.camTransitionProgress = 0;
        this.startCamPos = this.camera.position.clone();
        this.startCamLookAt = this.orbitControls.target.clone();
    }

    cycleCamera() {
        this.cameraViewIndex = (this.cameraViewIndex + 1) % this.cameraViews.length;
        this._updateCameraBadge();
        if (window.soundEngine) window.soundEngine.playClick();
    }

    _updateCameraBadge() {
        const badge = document.getElementById('camera-view-badge');
        if (badge) {
            badge.textContent = this.cameraViews[this.cameraViewIndex];
        }
    }

    resetCar() {
        // Reset to track start
        this.physics.resetPosition(0, -50, 0);
        if (window.soundEngine) window.soundEngine.playClick();
    }

    _updateDriveCamera(dt) {
        const carPos = this.physics.suspensionGroup.position;
        const heading = this.physics.heading;
        const speed = this.physics.speed;

        const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
        const up = new THREE.Vector3(0, 1, 0);

        // Dynamic speed warp FOV
        const targetFov = 52 + (this.physics.speedKmh / 320) * 16;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 4);
        this.camera.updateProjectionMatrix();

        switch (this.cameraViewIndex) {
            case 0: // Chase Camera (Smooth Dynamic Follow)
                {
                    const followDist = 5.8 + (this.physics.speedKmh / 320) * 1.5;
                    const followHeight = 1.9 + (this.physics.speedKmh / 320) * 0.4;
                    const lookAheadDist = 6.0;

                    const idealPos = carPos.clone()
                        .sub(forward.clone().multiplyScalar(followDist))
                        .add(up.clone().multiplyScalar(followHeight));

                    const idealLookAt = carPos.clone()
                        .add(forward.clone().multiplyScalar(lookAheadDist))
                        .add(up.clone().multiplyScalar(0.7));

                    const blendSpeed = Math.min(1.0, dt * 10.0);
                    this.camera.position.lerp(idealPos, blendSpeed);

                    if (!this.currentLookAt) this.currentLookAt = idealLookAt.clone();
                    this.currentLookAt.lerp(idealLookAt, blendSpeed);
                    this.camera.lookAt(this.currentLookAt);
                }
                break;

            case 1: // Cockpit First-Person POV
                {
                    // Inside driver's head looking through windshield
                    const cockpitOffset = new THREE.Vector3(-0.34, 0.88, 0.05);
                    cockpitOffset.applyAxisAngle(up, heading);
                    const headPos = carPos.clone().add(cockpitOffset);

                    const lookTarget = headPos.clone()
                        .add(forward.clone().multiplyScalar(15.0))
                        .add(up.clone().multiplyScalar(-0.05));

                    this.camera.position.copy(headPos);
                    this.camera.lookAt(lookTarget);
                }
                break;

            case 2: // Low Bumper / Hood Cam
                {
                    const hoodOffset = new THREE.Vector3(0, 0.52, 1.8);
                    hoodOffset.applyAxisAngle(up, heading);
                    const pos = carPos.clone().add(hoodOffset);
                    const look = pos.clone().add(forward.clone().multiplyScalar(25.0));

                    this.camera.position.copy(pos);
                    this.camera.lookAt(look);
                }
                break;

            case 3: // Dynamic High Drone Camera
                {
                    const dronePos = carPos.clone()
                        .sub(forward.clone().multiplyScalar(12.0))
                        .add(new THREE.Vector3(0, 9.0, 0));
                    this.camera.position.lerp(dronePos, dt * 4.0);
                    this.camera.lookAt(carPos.clone().add(new THREE.Vector3(0, 0.8, 0)));
                }
                break;

            case 4: // Action Wheel / Tire Cam
                {
                    const wheelOffset = new THREE.Vector3(1.6, 0.45, 0.8);
                    wheelOffset.applyAxisAngle(up, heading);
                    const pos = carPos.clone().add(wheelOffset);
                    const look = carPos.clone().add(new THREE.Vector3(0, 0.35, 1.38).applyAxisAngle(up, heading));
                    this.camera.position.lerp(pos, dt * 8.0);
                    this.camera.lookAt(look);
                }
                break;
        }
    }

    _updateInputs() {
        if (this.mode !== 'drive') {
            this.physics.inputs.throttle = 0;
            this.physics.inputs.brake = 0;
            this.physics.inputs.steer = 0;
            this.physics.inputs.handbrake = false;
            return;
        }

        // Throttle
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            this.physics.inputs.throttle = 1.0;
        } else {
            this.physics.inputs.throttle = 0;
        }

        // Brake / Reverse
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            this.physics.inputs.brake = 1.0;
        } else {
            this.physics.inputs.brake = 0;
        }

        // Steering (progressive lerp)
        let targetSteer = 0;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) targetSteer += 1.0;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) targetSteer -= 1.0;

        const steerSpeed = 6.0;
        this.physics.inputs.steer = THREE.MathUtils.lerp(this.physics.inputs.steer, targetSteer, this.clock.getDelta() * steerSpeed || 0.1);

        // Handbrake
        this.physics.inputs.handbrake = !!this.keys['Space'];
    }

    _updateHUD() {
        if (this.mode !== 'drive') return;

        // Speed calculation
        let displaySpeed = this.physics.speedKmh;
        if (this.speedUnit === 'mph') {
            displaySpeed *= 0.621371;
        }
        const speedValEl = document.getElementById('hud-speed-value');
        if (speedValEl) {
            speedValEl.textContent = Math.round(displaySpeed);
        }

        // Gear Indicator
        const gearEl = document.getElementById('hud-gear-value');
        if (gearEl) {
            gearEl.textContent = this.physics.currentGear;
        }

        // Tachometer RPM Gauge & Needle
        const rpm = this.physics.rpm;
        const rpmPercent = Math.min(100, Math.max(0, ((rpm - 800) / (8600 - 800)) * 100));

        const rpmFill = document.getElementById('rpm-gauge-fill');
        if (rpmFill) {
            rpmFill.style.width = `${rpmPercent}%`;
            // Color shifts from Cyan -> Amber -> Redline Flashing
            if (rpm > 7800) {
                rpmFill.style.background = 'linear-gradient(90deg, #00f0ff, #ff9900, #ff0033)';
                rpmFill.classList.add('rpm-redline');
            } else {
                rpmFill.style.background = 'linear-gradient(90deg, #00f0ff 0%, #00d2ff 60%, #ffaa00 100%)';
                rpmFill.classList.remove('rpm-redline');
            }
        }

        const rpmNumEl = document.getElementById('hud-rpm-number');
        if (rpmNumEl) {
            rpmNumEl.textContent = Math.round(rpm);
        }

        // Sequential Shift Lights (5 LED dots)
        for (let i = 1; i <= 5; i++) {
            const led = document.getElementById(`shift-led-${i}`);
            if (led) {
                const threshold = 5500 + i * 550;
                led.classList.toggle('active', rpm > threshold);
            }
        }

        // Turbo Boost
        const boostValEl = document.getElementById('hud-boost-value');
        if (boostValEl) {
            boostValEl.textContent = this.physics.turboBoost.toFixed(2) + ' BAR';
        }
        const boostBar = document.getElementById('hud-boost-bar');
        if (boostBar) {
            boostBar.style.width = `${(this.physics.turboBoost / 2.2) * 100}%`;
        }

        // Drift HUD
        const driftCard = document.getElementById('hud-drift-card');
        if (driftCard) {
            if (this.physics.isDrifting && this.physics.speedKmh > 20) {
                driftCard.style.opacity = '1';
                driftCard.style.transform = 'scale(1.05)';
                document.getElementById('drift-score-value').textContent = this.physics.driftScore.toLocaleString();
                document.getElementById('drift-multiplier').textContent = `x${this.physics.driftMultiplier.toFixed(1)}`;
            } else {
                driftCard.style.opacity = '0.35';
                driftCard.style.transform = 'scale(1.0)';
            }
        }
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    _animate() {
        requestAnimationFrame(() => this._animate());

        const dt = this.clock.getDelta();

        // 1. Process User Inputs
        this._updateInputs();

        // 2. Step Physics in Drive mode
        if (this.mode === 'drive') {
            this.physics.update(dt);
            this._updateDriveCamera(dt);
        } else {
            // Showroom mode camera transition
            if (this.isTransitioningCam) {
                this.camTransitionProgress += dt * 2.2;
                if (this.camTransitionProgress >= 1.0) {
                    this.camTransitionProgress = 1.0;
                    this.isTransitioningCam = false;
                }
                const ease = Math.sin((this.camTransitionProgress * Math.PI) / 2);
                this.camera.position.lerpVectors(this.startCamPos, this.targetCamPos, ease);
                this.orbitControls.target.lerpVectors(this.startCamLookAt, this.targetCamLookAt, ease);
            }
            this.orbitControls.update();
        }

        // 3. Update Car Animations (doors, hood)
        this.car.updateAnimations(dt);

        // 4. Update Environment (turntable rotation)
        this.env.update(dt, this.physics);

        // 5. Update UI & HUD
        this._updateHUD();

        // 6. Render Scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
