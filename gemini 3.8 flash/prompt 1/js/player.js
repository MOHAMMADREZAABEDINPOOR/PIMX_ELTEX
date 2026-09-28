// ============================================================================
// Aetheria: Sky Isles Adventure - Player Character (Pip the Star Sprite)
// Procedural 3D animated character rig, physics, state & power-ups
// ============================================================================

class Player {
    constructor(scene, particles) {
        this.scene = scene;
        this.particles = particles;

        // Position & Physics state
        this.position = new THREE.Vector3(0, 3, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.width = 0.75;
        this.height = 1.15;
        this.depth = 0.75;

        // Movement constants
        this.baseSpeed = 7.2;
        this.speed = this.baseSpeed;
        this.accel = 45.0;
        this.decel = 35.0;
        this.gravity = -27.0;
        this.baseJumpForce = 11.8;
        this.jumpForce = this.baseJumpForce;
        this.terminalVelocity = -22.0;

        // Jump mechanics
        this.isGrounded = false;
        this.coyoteTimer = 0;
        this.coyoteMax = 0.12;
        this.jumpBuffer = 0;
        this.jumpBufferMax = 0.12;
        this.isJumping = false;
        this.canDoubleJump = false;
        this.hasDoubleJumped = false;

        // Health & Game state
        this.maxHealth = 3;
        this.health = 3;
        this.lives = 3;
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;
        this.invulnerableDuration = 1.8;
        this.respawnPoint = new THREE.Vector3(0, 3, 0);
        this.isDead = false;
        this.isVictory = false;

        // Power-up state
        this.activePowerup = null; // 'wing', 'speed', 'shield'
        this.powerupTimer = 0;
        this.powerupDuration = 0;

        // Procedural Animation State
        this.facing = 1; // 1 = right, -1 = left
        this.targetRotationY = Math.PI / 2;
        this.currentRotationY = Math.PI / 2;
        this.runCycle = 0;
        this.squash = new THREE.Vector3(1, 1, 1);
        this.targetSquash = new THREE.Vector3(1, 1, 1);
        this.blinkTimer = 2.5;
        this.isBlinking = false;
        this.stepSoundTimer = 0;

        // Build 3D mesh rig
        this.group = new THREE.Group();
        this.buildMesh();
        this.scene.add(this.group);
        this.group.position.copy(this.position);
    }

    buildMesh() {
        // Base materials
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x8be9fd, // Celestial sky cyan
            roughness: 0.35,
            metalness: 0.1
        });
        const bellyMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4
        });
        const earMat = new THREE.MeshStandardMaterial({
            color: 0xff79c6, // Radiant magenta
            roughness: 0.3
        });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x221133 });
        const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const footMat = new THREE.MeshStandardMaterial({
            color: 0xbd93f9, // Lavender violet
            roughness: 0.5
        });

        this.materials = { body: bodyMat, ear: earMat, foot: footMat };

        // Squash-and-stretch body root
        this.animRoot = new THREE.Group();
        this.group.add(this.animRoot);

        // Main Body (smooth rounded egg/capsule shape)
        const bodyGeo = new THREE.SphereGeometry(0.48, 16, 16);
        bodyGeo.scale(1.0, 1.15, 0.95);
        this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.bodyMesh.position.y = 0.55;
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.animRoot.add(this.bodyMesh);

        // Soft Belly Patch
        const bellyGeo = new THREE.SphereGeometry(0.38, 12, 12);
        bellyGeo.scale(0.85, 0.95, 0.45);
        const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
        bellyMesh.position.set(0, 0.5, 0.3);
        this.animRoot.add(bellyMesh);

        // Expressive Eyes
        this.eyesGroup = new THREE.Group();
        const eyeGeo = new THREE.SphereGeometry(0.12, 10, 10);
        eyeGeo.scale(0.8, 1.1, 0.4);

        // Left eye
        this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.leftEye.position.set(0.18, 0.65, 0.4);
        this.eyesGroup.add(this.leftEye);

        const shineGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const leftShine = new THREE.Mesh(shineGeo, eyePupilMat);
        leftShine.position.set(0.2, 0.69, 0.45);
        this.eyesGroup.add(leftShine);

        // Right eye
        this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.rightEye.position.set(-0.18, 0.65, 0.4);
        this.eyesGroup.add(this.rightEye);

        const rightShine = new THREE.Mesh(shineGeo, eyePupilMat);
        rightShine.position.set(-0.16, 0.69, 0.45);
        this.eyesGroup.add(rightShine);

        this.animRoot.add(this.eyesGroup);

        // Magical Celestial Horns / Ears
        this.earsGroup = new THREE.Group();
        const earGeo = new THREE.ConeGeometry(0.13, 0.45, 8);

        this.leftEar = new THREE.Mesh(earGeo, earMat);
        this.leftEar.position.set(0.25, 1.05, 0.05);
        this.leftEar.rotation.z = -0.35;
        this.leftEar.rotation.x = -0.15;
        this.earsGroup.add(this.leftEar);

        this.rightEar = new THREE.Mesh(earGeo, earMat);
        this.rightEar.position.set(-0.25, 1.05, 0.05);
        this.rightEar.rotation.z = 0.35;
        this.rightEar.rotation.x = -0.15;
        this.earsGroup.add(this.rightEar);

        this.animRoot.add(this.earsGroup);

        // Fluffy Star Tail
        const tailGeo = new THREE.SphereGeometry(0.15, 8, 8);
        this.tailMesh = new THREE.Mesh(tailGeo, earMat);
        this.tailMesh.position.set(0, 0.4, -0.45);
        this.animRoot.add(this.tailMesh);

        // Animated Running Feet
        const footGeo = new THREE.SphereGeometry(0.16, 10, 10);
        footGeo.scale(0.9, 0.6, 1.3);

        this.leftFoot = new THREE.Mesh(footGeo, footMat);
        this.leftFoot.position.set(0.22, 0.1, 0);
        this.leftFoot.castShadow = true;
        this.group.add(this.leftFoot);

        this.rightFoot = new THREE.Mesh(footGeo, footMat);
        this.rightFoot.position.set(-0.22, 0.1, 0);
        this.rightFoot.castShadow = true;
        this.group.add(this.rightFoot);

        // Power-up Visuals:
        // 1. Wings (for Wing High Jump / Double Jump)
        this.wingsGroup = new THREE.Group();
        this.wingsGroup.visible = false;
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x55ffff,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            side: THREE.DoubleSide
        });
        const wingShape = new THREE.ConeGeometry(0.2, 0.7, 5);
        wingShape.scale(0.3, 1, 0.7);

        this.leftWing = new THREE.Mesh(wingShape, wingMat);
        this.leftWing.position.set(0.35, 0.65, -0.2);
        this.leftWing.rotation.z = -1.2;
        this.wingsGroup.add(this.leftWing);

        this.rightWing = new THREE.Mesh(wingShape, wingMat);
        this.rightWing.position.set(-0.35, 0.65, -0.2);
        this.rightWing.rotation.z = 1.2;
        this.wingsGroup.add(this.rightWing);

        this.animRoot.add(this.wingsGroup);

        // 2. Protective Star Shield Bubble
        const shieldGeo = new THREE.SphereGeometry(0.9, 16, 16);
        const shieldMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00a2ff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.45,
            roughness: 0.1,
            metalness: 0.8
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.position.set(0, 0.6, 0);
        this.shieldMesh.visible = false;
        this.animRoot.add(this.shieldMesh);

        // 3. Subtle dynamic drop shadow under player
        const shadowGeo = new THREE.CircleGeometry(0.45, 12);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.25,
            depthWrite: false
        });
        this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadowMesh.rotation.x = -Math.PI / 2;
        this.shadowMesh.position.y = 0.03;
        this.group.add(this.shadowMesh);
    }

    applyPowerup(type, duration = 12) {
        this.activePowerup = type;
        this.powerupTimer = duration;
        this.powerupDuration = duration;

        if (type === 'wing') {
            this.jumpForce = this.baseJumpForce * 1.35;
            this.canDoubleJump = true;
            this.wingsGroup.visible = true;
            this.shieldMesh.visible = false;
        } else if (type === 'speed') {
            this.speed = this.baseSpeed * 1.65;
            this.wingsGroup.visible = false;
            this.shieldMesh.visible = false;
        } else if (type === 'shield') {
            this.shieldMesh.visible = true;
            this.wingsGroup.visible = false;
        }

        window.gameAudio.playPowerup();
        this.particles.emitSparkles(this.position.x, this.position.y + 0.5, this.position.z, 20, [0xffd700, 0x00f0ff, 0xff00bb]);
    }

    clearPowerup() {
        this.activePowerup = null;
        this.powerupTimer = 0;
        this.speed = this.baseSpeed;
        this.jumpForce = this.baseJumpForce;
        this.canDoubleJump = false;
        this.wingsGroup.visible = false;
        this.shieldMesh.visible = false;
    }

    takeDamage(amount = 1, knockbackDir = 0) {
        if (this.isInvulnerable || this.isDead || this.isVictory) return false;

        // If shield power-up is active, absorb hit and consume shield
        if (this.activePowerup === 'shield') {
            this.clearPowerup();
            this.isInvulnerable = true;
            this.invulnerableTimer = 1.0;
            window.gameAudio.playHurt();
            this.particles.emitSparkles(this.position.x, this.position.y + 0.5, this.position.z, 15, [0x00f0ff, 0xffffff]);
            return true;
        }

        this.health -= amount;
        window.gameAudio.playHurt();

        // Knockback impulse
        this.velocity.y = 7.5;
        this.velocity.x = (knockbackDir !== 0 ? knockbackDir : -this.facing) * 6.0;
        this.isGrounded = false;

        // Squash & hurt visuals
        this.squash.set(0.7, 1.4, 0.7);
        this.particles.emitDust(this.position.x, this.position.y + 0.5, this.position.z, 8, 0xff3344);

        if (this.health <= 0) {
            this.die();
        } else {
            this.isInvulnerable = true;
            this.invulnerableTimer = this.invulnerableDuration;
        }
        return true;
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.velocity.set(0, 9.0, 0);
        window.gameAudio.playHurt();
        this.particles.emitEnemyPop(this.position.x, this.position.y + 0.5, this.position.z);
    }

    respawn() {
        this.isDead = false;
        this.health = this.maxHealth;
        this.velocity.set(0, 0, 0);
        this.position.copy(this.respawnPoint);
        this.group.position.copy(this.position);
        this.clearPowerup();
        this.isInvulnerable = true;
        this.invulnerableTimer = 2.0;
        this.squash.set(1, 1, 1);
        this.targetSquash.set(1, 1, 1);
    }

    bounceOnEnemy() {
        this.velocity.y = this.jumpForce * 0.95;
        this.isGrounded = false;
        this.hasDoubleJumped = false;
        this.squash.set(1.3, 0.6, 1.3);
        window.gameAudio.playStomp();
    }

    bounceOnSpring() {
        this.velocity.y = 19.5;
        this.isGrounded = false;
        this.hasDoubleJumped = false;
        this.squash.set(0.6, 1.6, 0.6);
        window.gameAudio.playSpring();
        this.particles.emitSparkles(this.position.x, this.position.y, this.position.z, 14, [0x00ff88, 0xffffff, 0xffff44]);
    }

    setCheckpoint(pos) {
        this.respawnPoint.copy(pos);
        this.respawnPoint.y += 0.8;
    }

    handleInput(input, dt) {
        if (this.isDead || this.isVictory) return;

        // Horizontal movement
        let moveX = 0;
        if (input.left) moveX -= 1;
        if (input.right) moveX += 1;

        const targetSpeed = moveX * this.speed;
        if (moveX !== 0) {
            // Accelerate
            this.velocity.x += (targetSpeed - this.velocity.x) * Math.min(1.0, this.accel * dt);
            this.facing = moveX > 0 ? 1 : -1;
            this.targetRotationY = moveX > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
            // Decelerate
            this.velocity.x += (0 - this.velocity.x) * Math.min(1.0, this.decel * dt);
            if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
        }

        // Jump buffering
        if (input.jumpJustPressed) {
            this.jumpBuffer = this.jumpBufferMax;
        } else if (this.jumpBuffer > 0) {
            this.jumpBuffer -= dt;
        }

        // Jump Execution
        const canNormalJump = (this.isGrounded || this.coyoteTimer > 0);
        if (this.jumpBuffer > 0) {
            if (canNormalJump) {
                // Regular jump
                this.velocity.y = this.jumpForce;
                this.isGrounded = false;
                this.coyoteTimer = 0;
                this.jumpBuffer = 0;
                this.isJumping = true;
                this.hasDoubleJumped = false;

                this.squash.set(0.65, 1.45, 0.65);
                window.gameAudio.playJump();
                this.particles.emitDust(this.position.x, this.position.y, this.position.z, 6);
            } else if (this.canDoubleJump && !this.hasDoubleJumped) {
                // Double jump enabled by Wing powerup
                this.velocity.y = this.jumpForce * 0.95;
                this.hasDoubleJumped = true;
                this.jumpBuffer = 0;
                this.isJumping = true;

                this.squash.set(0.7, 1.4, 0.7);
                window.gameAudio.playDoubleJump();
                this.particles.emitSparkles(this.position.x, this.position.y + 0.3, this.position.z, 10, [0x00f0ff, 0xffffff]);
            }
        }

        // Variable jump height: release jump early for shorter hop
        if (!input.jump && this.velocity.y > 4.0 && this.isJumping) {
            this.velocity.y *= 0.55;
            this.isJumping = false;
        }
    }

    update(dt) {
        const time = performance.now() * 0.001;

        // Death fall sequence
        if (this.isDead) {
            this.velocity.y += this.gravity * 0.8 * dt;
            this.position.y += this.velocity.y * dt;
            this.group.position.copy(this.position);
            this.group.rotation.z += 10 * dt;
            this.animRoot.scale.multiplyScalar(0.98);
            return;
        }

        // Power-up Timer Countdown
        if (this.activePowerup) {
            this.powerupTimer -= dt;
            if (this.powerupTimer <= 0) {
                this.clearPowerup();
            } else {
                // Emit aura sparkles periodically
                if (Math.random() < 0.3) {
                    const col = this.activePowerup === 'wing' ? 0x00f0ff :
                               (this.activePowerup === 'speed' ? 0xffbb00 : 0xff33bb);
                    this.particles.emitPowerupAura(this.position.x, this.position.y + 0.5, this.position.z, col);
                }
            }
        }

        // Invulnerability Flicker
        if (this.isInvulnerable) {
            this.invulnerableTimer -= dt;
            if (this.invulnerableTimer <= 0) {
                this.isInvulnerable = false;
                this.animRoot.visible = true;
            } else {
                this.animRoot.visible = Math.floor(time * 20) % 2 === 0;
            }
        } else {
            this.animRoot.visible = true;
        }

        // Gravity & Vertical Physics
        this.velocity.y += this.gravity * dt;
        if (this.velocity.y < this.terminalVelocity) {
            this.velocity.y = this.terminalVelocity;
        }

        // Coyote timer count down when falling off ledge
        if (this.isGrounded) {
            this.coyoteTimer = this.coyoteMax;
        } else {
            this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
        }

        // Apply velocities to position
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        // Fall into void check
        if (this.position.y < -12) {
            window.gameAudio.playFalling();
            this.takeDamage(1);
            if (!this.isDead) {
                this.respawn();
            }
        }

        // Smooth orientation turn
        let rotDiff = this.targetRotationY - this.currentRotationY;
        if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        this.currentRotationY += rotDiff * Math.min(1.0, 16 * dt);
        this.group.rotation.y = this.currentRotationY;

        // Subtle dynamic lean into running direction
        const runLean = (this.velocity.x / this.speed) * 0.25;
        this.group.rotation.z = -runLean;

        // Procedural Animations (Squash, Stretch, Run Stride, Idle Breath)
        this.updateProceduralAnimation(dt, time);

        // Update group 3D position
        this.group.position.copy(this.position);
    }

    updateProceduralAnimation(dt, time) {
        // Return squash to 1,1,1 smoothly
        this.squash.lerp(this.targetSquash, Math.min(1.0, 14 * dt));
        this.animRoot.scale.copy(this.squash);

        const isMoving = Math.abs(this.velocity.x) > 0.4 && this.isGrounded;

        if (this.isVictory) {
            // Happy celebration dance
            this.animRoot.position.y = Math.abs(Math.sin(time * 8)) * 0.4;
            this.earsGroup.rotation.z = Math.sin(time * 12) * 0.3;
            this.tailMesh.rotation.y = Math.sin(time * 15) * 0.5;
            return;
        }

        if (this.isGrounded) {
            if (isMoving) {
                // Running cycle
                const strideSpeed = Math.abs(this.velocity.x) * 2.2;
                this.runCycle += dt * strideSpeed;

                // Bob body up and down
                this.animRoot.position.y = Math.abs(Math.sin(this.runCycle * Math.PI)) * 0.12;

                // Feet bicycle swing
                const footAngle = Math.sin(this.runCycle * Math.PI) * 0.55;
                this.leftFoot.position.z = footAngle * 0.35;
                this.leftFoot.position.y = 0.1 + Math.max(0, -footAngle) * 0.15;

                this.rightFoot.position.z = -footAngle * 0.35;
                this.rightFoot.position.y = 0.1 + Math.max(0, footAngle) * 0.15;

                // Ears bounce back
                this.earsGroup.rotation.x = -0.35 + Math.sin(this.runCycle * Math.PI * 2) * 0.1;
                this.tailMesh.rotation.x = Math.sin(this.runCycle * Math.PI * 2) * 0.3;

                // Footstep dust puff
                this.stepSoundTimer += dt * strideSpeed;
                if (this.stepSoundTimer > 2.0) {
                    this.stepSoundTimer = 0;
                    this.particles.emitDust(this.position.x - this.facing * 0.3, this.position.y + 0.05, this.position.z, 2);
                }
            } else {
                // Idle breathing
                this.runCycle = 0;
                this.animRoot.position.y = Math.sin(time * 3.5) * 0.04;
                this.leftFoot.position.set(0.22, 0.1, 0);
                this.rightFoot.position.set(-0.22, 0.1, 0);

                // Gentle ear twitch
                this.earsGroup.rotation.x = -0.15 + Math.sin(time * 2) * 0.05;
                this.tailMesh.rotation.y = Math.sin(time * 4) * 0.2;
            }
        } else {
            // Air pose: stretched body, feet dangling
            this.leftFoot.position.set(0.22, -0.05, -0.1);
            this.rightFoot.position.set(-0.22, -0.05, -0.1);
            this.earsGroup.rotation.x = 0.25; // ears point up/back
        }

        // Wings flap animation if wing power-up is active
        if (this.wingsGroup.visible) {
            const wingFlap = Math.sin(time * 25) * 0.6;
            this.leftWing.rotation.y = wingFlap;
            this.rightWing.rotation.y = -wingFlap;
        }

        // Shield pulse animation
        if (this.shieldMesh.visible) {
            this.shieldMesh.rotation.y += 2.0 * dt;
            const pulse = 1.0 + Math.sin(time * 6) * 0.06;
            this.shieldMesh.scale.setScalar(pulse);
        }

        // Blinking eyes logic
        this.blinkTimer -= dt;
        if (this.blinkTimer <= 0) {
            this.leftEye.scale.y = 0.1;
            this.rightEye.scale.y = 0.1;
            if (this.blinkTimer < -0.12) {
                this.leftEye.scale.y = 1.1;
                this.rightEye.scale.y = 1.1;
                this.blinkTimer = 2.5 + Math.random() * 3.0;
            }
        }
    }

    onLanded() {
        if (!this.isGrounded) {
            this.isGrounded = true;
            this.isJumping = false;
            // Landing squash
            this.squash.set(1.35, 0.65, 1.35);
            this.particles.emitDust(this.position.x, this.position.y, this.position.z, 6);
        }
    }

    getBounds() {
        return {
            minX: this.position.x - this.width / 2,
            maxX: this.position.x + this.width / 2,
            minY: this.position.y,
            maxY: this.position.y + this.height,
            minZ: this.position.z - this.depth / 2,
            maxZ: this.position.z + this.depth / 2
        };
    }
}
