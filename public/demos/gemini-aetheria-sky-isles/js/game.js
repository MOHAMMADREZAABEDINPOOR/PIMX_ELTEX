// ============================================================================
// Aetheria: Sky Isles Adventure - Main Game Controller & Loop
// Orchestrates Three.js rendering, dynamic camera, inputs, UI HUD, audio & states
// ============================================================================

class Game {
    constructor() {
        this.canvasContainer = document.getElementById('canvas-container');
        this.isPaused = false;
        this.isGameStarted = false;
        this.levelCompleted = false;

        // Statistics
        this.score = 0;
        this.gemsCollected = 0;
        this.totalGems = 0;
        this.starsCollected = 0;
        this.enemiesDefeated = 0;
        this.gameTime = 0;

        // Input state
        this.input = {
            left: false,
            right: false,
            jump: false,
            jumpJustPressed: false
        };
        this.prevJumpKey = false;

        // Camera control state
        this.camOffset = new THREE.Vector3(0, 3.2, 12.8);
        this.camLookOffset = new THREE.Vector3(0, 1.2, 0);
        this.camTargetPos = new THREE.Vector3();
        this.camTargetLook = new THREE.Vector3();
        this.victoryCamAngle = 0;

        // Initialize Three.js Engine
        this.initThree();

        // Subsystems
        this.particles = new ParticleSystem(this.scene);
        this.enemyManager = new EnemyManager(this.scene, this.particles);
        this.player = new Player(this.scene, this.particles);
        this.world = new World(this.scene, this.particles, this.enemyManager);

        this.totalGems = this.world.gems.length;

        // Hook game events
        this.setupEventHooks();

        // Setup input listeners
        this.setupKeyboardInput();
        this.setupTouchInput();
        this.setupGamepadInput();
        this.setupUIHandlers();

        // Initial HUD refresh
        this.updateHUD();

        // Resize handler
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    initThree() {
        // Scene with gentle cartoon sky atmosphere
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0d8ef); // Pastel celestial sky blue
        this.scene.fog = new THREE.FogExp2(0xa0d8ef, 0.012);

        // Camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
        this.camera.position.set(0, 4, 13);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (typeof THREE.SRGBColorSpace !== 'undefined') {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } else if (typeof THREE.sRGBEncoding !== 'undefined') {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }

        this.canvasContainer.appendChild(this.renderer.domElement);
    }

    setupEventHooks() {
        // Gem collection
        window.onGemCollected = (gem) => {
            this.gemsCollected++;
            this.score += 50;

            // Extra life every 30 gems
            if (this.gemsCollected % 30 === 0) {
                this.player.lives++;
                this.showNotification('🌟 1-UP! Extra Life Gained!');
            }
            this.updateHUD();
        };

        // Special Star Relic collection
        window.onSpecialStarCollected = (star) => {
            this.starsCollected++;
            this.score += 500;
            this.showNotification(`✨ Star Relic #${star.id} Discovered!`);
            this.updateHUD();
        };

        // Power-up collection
        window.onPowerupCollected = (pu) => {
            const names = {
                wing: '🪶 Celestial Wings (High Jump & Double Jump)!',
                speed: '⚡ Swift Berry (Super Speed & Long Stride)!',
                shield: '🛡️ Star Barrier (Total Invulnerability)!'
            };
            this.showNotification(names[pu.type] || 'Power-up Activated!');
            this.updateHUD();
        };

        // Enemy Defeat
        window.onEnemyDefeated = (enemy) => {
            this.enemiesDefeated++;
            this.score += 150;
            this.updateHUD();
        };

        // Checkpoint activation
        window.onCheckpointActivated = (cp) => {
            this.score += 200;
            this.showNotification('📍 Checkpoint Activated!');
            this.updateHUD();
        };

        // Level Victory
        window.onVictoryReached = () => {
            this.levelCompleted = true;
            setTimeout(() => this.showVictoryModal(), 1200);
        };
    }

    setupKeyboardInput() {
        window.addEventListener('keydown', (e) => {
            // First user interaction unblocks audio
            window.gameAudio.resume();

            if (!this.isGameStarted) {
                this.startGame();
            }

            if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
                this.input.left = true;
            }
            if (e.code === 'KeyD' || e.code === 'ArrowRight') {
                this.input.right = true;
            }
            if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
                if (!this.prevJumpKey) {
                    this.input.jumpJustPressed = true;
                }
                this.input.jump = true;
                this.prevJumpKey = true;
            }
            if (e.code === 'Escape' || e.code === 'KeyP') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
                this.input.left = false;
            }
            if (e.code === 'KeyD' || e.code === 'ArrowRight') {
                this.input.right = false;
            }
            if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
                this.input.jump = false;
                this.prevJumpKey = false;
            }
        });
    }

    setupTouchInput() {
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        const btnJump = document.getElementById('btn-jump');

        if (!btnLeft || !btnRight || !btnJump) return;

        const addTouch = (el, onStart, onEnd) => {
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                window.gameAudio.resume();
                if (!this.isGameStarted) this.startGame();
                onStart();
            }, { passive: false });

            el.addEventListener('touchend', (e) => {
                e.preventDefault();
                onEnd();
            }, { passive: false });

            el.addEventListener('mousedown', (e) => {
                window.gameAudio.resume();
                if (!this.isGameStarted) this.startGame();
                onStart();
            });

            el.addEventListener('mouseup', (e) => onEnd());
            el.addEventListener('mouseleave', (e) => onEnd());
        };

        addTouch(btnLeft, () => { this.input.left = true; }, () => { this.input.left = false; });
        addTouch(btnRight, () => { this.input.right = true; }, () => { this.input.right = false; });
        addTouch(btnJump, () => {
            this.input.jumpJustPressed = true;
            this.input.jump = true;
        }, () => {
            this.input.jump = false;
        });
    }

    setupGamepadInput() {
        // Poll gamepad in gameLoop
    }

    pollGamepad() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        if (!gamepads || !gamepads[0]) return;
        const gp = gamepads[0];

        // Left Stick or Dpad
        const axisX = gp.axes[0] || 0;
        const dpadLeft = gp.buttons[14] && gp.buttons[14].pressed;
        const dpadRight = gp.buttons[15] && gp.buttons[15].pressed;

        if (axisX < -0.3 || dpadLeft) {
            this.input.left = true;
            this.input.right = false;
        } else if (axisX > 0.3 || dpadRight) {
            this.input.right = true;
            this.input.left = false;
        } else {
            // Only release if keyboard isn't active
            if (!this.keyboardHeld) {
                // leave as is
            }
        }

        // Button A / Cross (Button 0)
        const jumpBtn = gp.buttons[0] && gp.buttons[0].pressed;
        if (jumpBtn && !this.prevJumpKey) {
            this.input.jumpJustPressed = true;
        }
        if (jumpBtn) {
            this.input.jump = true;
            this.prevJumpKey = true;
        } else if (!this.input.jumpKeyHeld) {
            this.input.jump = false;
            this.prevJumpKey = false;
        }
    }

    setupUIHandlers() {
        // Start screen button
        const startBtn = document.getElementById('btn-start-adventure');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                window.gameAudio.resume();
                this.startGame();
            });
        }

        // Sound toggles
        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const muted = window.gameAudio.toggleMute();
                soundBtn.innerHTML = muted ? '🔇' : '🔊';
            });
        }

        const musicBtn = document.getElementById('btn-toggle-music');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                const musicMuted = window.gameAudio.toggleMusic();
                musicBtn.innerHTML = musicMuted ? '🎵❌' : '🎵';
            });
        }

        // Pause menu buttons
        const pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        const btnResume = document.getElementById('btn-resume');
        if (btnResume) {
            btnResume.addEventListener('click', () => this.togglePause());
        }

        const btnRestart = document.getElementById('btn-restart');
        if (btnRestart) {
            btnRestart.addEventListener('click', () => this.restartGame());
        }

        // Game Over buttons
        const btnRetryCheckpoint = document.getElementById('btn-retry-checkpoint');
        if (btnRetryCheckpoint) {
            btnRetryCheckpoint.addEventListener('click', () => this.retryFromCheckpoint());
        }

        const btnRetryLevel = document.getElementById('btn-retry-level');
        if (btnRetryLevel) {
            btnRetryLevel.addEventListener('click', () => this.restartGame());
        }

        // Victory modal button
        const btnPlayAgain = document.getElementById('btn-play-again');
        if (btnPlayAgain) {
            btnPlayAgain.addEventListener('click', () => this.restartGame());
        }
    }

    startGame() {
        if (this.isGameStarted) return;
        this.isGameStarted = true;
        const startModal = document.getElementById('start-modal');
        if (startModal) {
            startModal.classList.add('hidden');
        }
        window.gameAudio.startMusic();
    }

    togglePause() {
        if (!this.isGameStarted || this.levelCompleted || this.player.isDead) return;
        this.isPaused = !this.isPaused;
        const pauseModal = document.getElementById('pause-modal');
        if (pauseModal) {
            pauseModal.classList.toggle('hidden', !this.isPaused);
        }
    }

    showNotification(text) {
        const notif = document.getElementById('notification-banner');
        if (!notif) return;
        notif.textContent = text;
        notif.classList.remove('hidden', 'fade-out');
        notif.classList.add('show');

        clearTimeout(this.notifTimeout);
        this.notifTimeout = setTimeout(() => {
            notif.classList.remove('show');
            notif.classList.add('fade-out');
            setTimeout(() => notif.classList.add('hidden'), 500);
        }, 2200);
    }

    updateHUD() {
        // Hearts
        const heartsContainer = document.getElementById('hud-hearts');
        if (heartsContainer) {
            let heartsHtml = '';
            for (let i = 0; i < this.player.maxHealth; i++) {
                if (i < this.player.health) {
                    heartsHtml += '<span class="heart full">❤️</span>';
                } else {
                    heartsHtml += '<span class="heart empty">🖤</span>';
                }
            }
            heartsContainer.innerHTML = heartsHtml;
        }

        // Lives
        const livesEl = document.getElementById('hud-lives-val');
        if (livesEl) livesEl.textContent = this.player.lives;

        // Gems
        const gemsEl = document.getElementById('hud-gems-val');
        if (gemsEl) gemsEl.textContent = `${this.gemsCollected} / ${this.totalGems}`;

        // Star Relics
        const starsContainer = document.getElementById('hud-stars');
        if (starsContainer) {
            let starsHtml = '';
            for (let s = 1; s <= 3; s++) {
                const active = s <= this.starsCollected;
                starsHtml += `<span class="star-icon ${active ? 'active' : 'dormant'}">⭐</span>`;
            }
            starsContainer.innerHTML = starsHtml;
        }

        // Score
        const scoreEl = document.getElementById('hud-score-val');
        if (scoreEl) scoreEl.textContent = this.score.toString().padStart(6, '0');

        // Powerup HUD bar
        const powerupBadge = document.getElementById('hud-powerup');
        const powerupFill = document.getElementById('hud-powerup-fill');
        const powerupLabel = document.getElementById('hud-powerup-label');

        if (powerupBadge && powerupFill && powerupLabel) {
            if (this.player.activePowerup && this.player.powerupTimer > 0) {
                powerupBadge.classList.remove('hidden');
                const pct = (this.player.powerupTimer / this.player.powerupDuration) * 100;
                powerupFill.style.width = `${pct}%`;

                const titles = {
                    wing: '🪶 Celestial Wings',
                    speed: '⚡ Swift Speed',
                    shield: '🛡️ Star Barrier'
                };
                powerupLabel.textContent = titles[this.player.activePowerup] || 'Powerup';
            } else {
                powerupBadge.classList.add('hidden');
            }
        }
    }

    updateTimer(dt) {
        if (!this.isGameStarted || this.isPaused || this.levelCompleted) return;
        this.gameTime += dt;
        const mins = Math.floor(this.gameTime / 60);
        const secs = Math.floor(this.gameTime % 60);
        const timerEl = document.getElementById('hud-time-val');
        if (timerEl) {
            timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    showGameOver() {
        const modal = document.getElementById('gameover-modal');
        if (modal) modal.classList.remove('hidden');
    }

    showVictoryModal() {
        const modal = document.getElementById('victory-modal');
        if (!modal) return;

        modal.classList.remove('hidden');

        // Populate Victory Statistics
        const timeVal = document.getElementById('victory-time');
        if (timeVal) {
            const mins = Math.floor(this.gameTime / 60);
            const secs = Math.floor(this.gameTime % 60);
            timeVal.textContent = `${mins}m ${secs}s`;
        }

        const gemsVal = document.getElementById('victory-gems');
        if (gemsVal) gemsVal.textContent = `${this.gemsCollected} / ${this.totalGems}`;

        const starsVal = document.getElementById('victory-stars');
        if (starsVal) starsVal.textContent = `${this.starsCollected} / 3`;

        const enemiesVal = document.getElementById('victory-enemies');
        if (enemiesVal) enemiesVal.textContent = `${this.enemiesDefeated}`;

        const scoreVal = document.getElementById('victory-score');
        if (scoreVal) scoreVal.textContent = this.score;

        // Calculate 1-3 star rank
        let rating = 1;
        if (this.starsCollected >= 2 && this.gemsCollected >= 15) rating = 2;
        if (this.starsCollected === 3 && this.gemsCollected >= 22) rating = 3;

        const ratingStars = document.getElementById('victory-rating-stars');
        if (ratingStars) {
            let str = '';
            for (let r = 0; r < 3; r++) {
                str += `<span class="big-star ${r < rating ? 'earned' : 'unearned'}">★</span>`;
            }
            ratingStars.innerHTML = str;
        }
    }

    retryFromCheckpoint() {
        const modal = document.getElementById('gameover-modal');
        if (modal) modal.classList.add('hidden');

        this.player.respawn();
        this.updateHUD();
    }

    restartGame() {
        // Reset state
        this.score = 0;
        this.gemsCollected = 0;
        this.starsCollected = 0;
        this.enemiesDefeated = 0;
        this.gameTime = 0;
        this.levelCompleted = false;
        this.isPaused = false;

        // Hide modals
        document.getElementById('pause-modal')?.classList.add('hidden');
        document.getElementById('gameover-modal')?.classList.add('hidden');
        document.getElementById('victory-modal')?.classList.add('hidden');

        // Clear particles & world
        this.particles.clear();
        this.enemyManager.reset();

        // Rebuild player
        this.player.lives = 3;
        this.player.health = 3;
        this.player.isDead = false;
        this.player.isVictory = false;
        this.player.setCheckpoint(new THREE.Vector3(0, 3, 0));
        this.player.respawn();

        // Clear world items
        for (let g of this.world.gems) this.scene.remove(g.group);
        for (let s of this.world.specialStars) this.scene.remove(s.group);
        for (let pu of this.world.powerups) this.scene.remove(pu.group);
        for (let cp of this.world.checkpoints) this.scene.remove(cp.group);
        for (let p of this.world.platforms) this.scene.remove(p.group);
        for (let mp of this.world.movingPlatforms) this.scene.remove(mp.group);
        for (let cp of this.world.crumblingPlatforms) this.scene.remove(cp.group);
        for (let sp of this.world.springPads) this.scene.remove(sp.group);
        for (let sp of this.world.spikes) this.scene.remove(sp.group);
        for (let pend of this.world.pendulums) this.scene.remove(pend.group);
        if (this.world.goalFlag) this.scene.remove(this.world.goalFlag.group);

        this.world.platforms = [];
        this.world.movingPlatforms = [];
        this.world.crumblingPlatforms = [];
        this.world.springPads = [];
        this.world.spikes = [];
        this.world.pendulums = [];
        this.world.gems = [];
        this.world.specialStars = [];
        this.world.powerups = [];
        this.world.checkpoints = [];

        this.world.buildLevel();
        this.totalGems = this.world.gems.length;

        this.updateHUD();
        window.gameAudio.startMusic();
    }

    updateCamera(dt) {
        if (this.levelCompleted && this.world.goalFlag) {
            // Victory cinematic orbit around flag and player
            this.victoryCamAngle += dt * 0.75;
            const orbitDist = 9.0;
            const flagX = this.world.goalFlag.x;
            const flagY = this.world.goalFlag.y + 3.0;

            this.camera.position.x = flagX + Math.sin(this.victoryCamAngle) * orbitDist;
            this.camera.position.z = Math.cos(this.victoryCamAngle) * orbitDist;
            this.camera.position.y = flagY + 2.0;

            this.camera.lookAt(flagX, flagY, 0);
            return;
        }

        // 2.5D Dynamic Tracking Camera
        // Lookahead in movement direction
        const lookAhead = (this.player.facing * 1.8) + (this.player.velocity.x * 0.15);

        this.camTargetPos.x = this.player.position.x + lookAhead;
        this.camTargetPos.y = Math.max(3.2, this.player.position.y + 2.5);
        this.camTargetPos.z = 13.2;

        this.camTargetLook.x = this.player.position.x + lookAhead * 0.5;
        this.camTargetLook.y = this.player.position.y + 1.2;
        this.camTargetLook.z = 0;

        // Smooth exponential damping (lerp)
        const smoothSpeed = Math.min(1.0, 5.0 * dt);
        this.camera.position.lerp(this.camTargetPos, smoothSpeed);

        // Compute lookAt
        const currentLook = new THREE.Vector3();
        this.camera.getWorldDirection(currentLook);
        const lookPoint = this.camera.position.clone().add(currentLook);
        lookPoint.lerp(this.camTargetLook, smoothSpeed * 1.5);
        this.camera.lookAt(lookPoint);

        // Keep directional sun light tracking near player
        if (this.world.dirLight) {
            this.world.dirLight.position.x = this.player.position.x + 20;
            this.world.dirLight.target.position.x = this.player.position.x;
            this.world.dirLight.target.updateMatrixWorld();
        }
    }

    gameLoop(now) {
        requestAnimationFrame((t) => this.gameLoop(t));

        const dt = Math.min(0.1, (now - this.lastTime) * 0.001);
        this.lastTime = now;

        if (!this.isPaused) {
            this.pollGamepad();

            // Player physics & movement
            this.player.handleInput(this.input, dt);
            this.player.update(dt);

            // World & collision checks
            this.world.update(dt, this.player);

            // Enemies AI & patrols
            this.enemyManager.update(dt, this.player);

            // Particles
            this.particles.update(dt, this.player.position.x);

            // Camera
            this.updateCamera(dt);

            // Timer & HUD
            this.updateTimer(dt);
            this.updateHUD();

            // Check Game Over
            if (this.player.isDead && this.player.position.y < -10) {
                this.player.lives--;
                if (this.player.lives <= 0) {
                    this.showGameOver();
                } else {
                    this.player.respawn();
                    this.updateHUD();
                }
            }

            // Reset single-frame input triggers
            this.input.jumpJustPressed = false;
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// Instantiate game on window load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
