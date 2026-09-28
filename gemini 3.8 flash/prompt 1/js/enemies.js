// ============================================================================
// Aetheria: Sky Isles Adventure - Enemies & AI System
// Features: Puff Slimes, Horned Beetles, and Floating Wisps with simple AI
// ============================================================================

class EnemyManager {
    constructor(scene, particles) {
        this.scene = scene;
        this.particles = particles;
        this.enemies = [];

        // Shared geometries & materials
        this.slimeGeo = new THREE.SphereGeometry(0.45, 12, 10);
        this.slimeGeo.scale(1.0, 0.85, 1.0);
        this.eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
        this.pupilGeo = new THREE.SphereGeometry(0.04, 6, 6);

        this.slimeMat = new THREE.MeshStandardMaterial({
            color: 0xff5555, // Vivid strawberry red / coral
            roughness: 0.25,
            metalness: 0.1
        });
        this.beetleMat = new THREE.MeshStandardMaterial({
            color: 0x9955ff, // Purple armored shell
            roughness: 0.4,
            metalness: 0.2
        });
        this.wispMat = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            emissive: 0xff8800,
            emissiveIntensity: 0.6,
            roughness: 0.2
        });
        this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.pupilMat = new THREE.MeshBasicMaterial({ color: 0x111122 });
    }

    createSlime(x, y, z, patrolDist = 4.0, speed = 1.6) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const animRoot = new THREE.Group();
        group.add(animRoot);

        // Slime body
        const body = new THREE.Mesh(this.slimeGeo, this.slimeMat);
        body.position.y = 0.35;
        body.castShadow = true;
        animRoot.add(body);

        // Cute Leaf / Sprout on top
        const sproutGeo = new THREE.ConeGeometry(0.1, 0.3, 5);
        const sproutMat = new THREE.MeshStandardMaterial({ color: 0x50fa7b });
        const sprout = new THREE.Mesh(sproutGeo, sproutMat);
        sprout.position.set(0, 0.72, 0);
        sprout.rotation.z = 0.2;
        animRoot.add(sprout);

        // Eyes
        const leftEye = new THREE.Mesh(this.eyeGeo, this.eyeMat);
        leftEye.position.set(0.16, 0.42, 0.35);
        animRoot.add(leftEye);

        const leftPupil = new THREE.Mesh(this.pupilGeo, this.pupilMat);
        leftPupil.position.set(0.18, 0.42, 0.43);
        animRoot.add(leftPupil);

        const rightEye = new THREE.Mesh(this.eyeGeo, this.eyeMat);
        rightEye.position.set(-0.16, 0.42, 0.35);
        animRoot.add(rightEye);

        const rightPupil = new THREE.Mesh(this.pupilGeo, this.pupilMat);
        rightPupil.position.set(-0.14, 0.42, 0.43);
        animRoot.add(rightPupil);

        this.scene.add(group);

        const enemy = {
            type: 'slime',
            group: group,
            animRoot: animRoot,
            startX: x,
            minX: x - patrolDist,
            maxX: x + patrolDist,
            dir: 1,
            speed: speed,
            width: 0.8,
            height: 0.7,
            alive: true,
            squashTimer: 0,
            hopTimer: Math.random() * 2
        };
        this.enemies.push(enemy);
        return enemy;
    }

    createBeetle(x, y, z, patrolDist = 5.0, speed = 2.2) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const animRoot = new THREE.Group();
        group.add(animRoot);

        // Shell body
        const shellGeo = new THREE.SphereGeometry(0.48, 12, 10);
        shellGeo.scale(1.1, 0.7, 0.9);
        const shell = new THREE.Mesh(shellGeo, this.beetleMat);
        shell.position.y = 0.35;
        shell.castShadow = true;
        animRoot.add(shell);

        // Horn
        const hornGeo = new THREE.ConeGeometry(0.12, 0.4, 6);
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xf1fa8c });
        const horn = new THREE.Mesh(hornGeo, hornMat);
        horn.position.set(0, 0.5, 0.45);
        horn.rotation.x = Math.PI / 3;
        animRoot.add(horn);

        // Small glowing eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5555 });
        const leftEye = new THREE.Mesh(this.eyeGeo, eyeMat);
        leftEye.scale.set(0.6, 0.6, 0.6);
        leftEye.position.set(0.2, 0.35, 0.4);
        animRoot.add(leftEye);

        const rightEye = new THREE.Mesh(this.eyeGeo, eyeMat);
        rightEye.scale.set(0.6, 0.6, 0.6);
        rightEye.position.set(-0.2, 0.35, 0.4);
        animRoot.add(rightEye);

        this.scene.add(group);

        const enemy = {
            type: 'beetle',
            group: group,
            animRoot: animRoot,
            startX: x,
            minX: x - patrolDist,
            maxX: x + patrolDist,
            dir: 1,
            speed: speed,
            width: 0.9,
            height: 0.75,
            alive: true,
            squashTimer: 0,
            hopTimer: 0
        };
        this.enemies.push(enemy);
        return enemy;
    }

    createWisp(x, y, z, rangeY = 2.2, speed = 1.8) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const animRoot = new THREE.Group();
        group.add(animRoot);

        // Glowing core
        const coreGeo = new THREE.SphereGeometry(0.4, 12, 12);
        const core = new THREE.Mesh(coreGeo, this.wispMat);
        core.position.y = 0.4;
        animRoot.add(core);

        // Halo ring
        const ringGeo = new THREE.TorusGeometry(0.55, 0.05, 8, 20);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.4;
        animRoot.add(ring);
        animRoot.userData.ring = ring;

        // Big dark cartoon eye
        const eye = new THREE.Mesh(this.eyeGeo, this.pupilMat);
        eye.scale.set(1.4, 1.4, 1.4);
        eye.position.set(0, 0.42, 0.36);
        animRoot.add(eye);

        const gleam = new THREE.Mesh(this.pupilGeo, this.eyeMat);
        gleam.scale.set(0.8, 0.8, 0.8);
        gleam.position.set(0.08, 0.48, 0.46);
        animRoot.add(gleam);

        this.scene.add(group);

        const enemy = {
            type: 'wisp',
            group: group,
            animRoot: animRoot,
            startY: y,
            minY: y - rangeY,
            maxY: y + rangeY,
            dir: 1,
            speed: speed,
            width: 0.7,
            height: 0.8,
            alive: true,
            squashTimer: 0,
            phase: Math.random() * Math.PI * 2
        };
        this.enemies.push(enemy);
        return enemy;
    }

    update(dt, player) {
        const time = performance.now() * 0.001;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];

            // Squashed dead animation
            if (!e.alive) {
                e.squashTimer += dt;
                e.animRoot.scale.y = Math.max(0.05, 0.8 - e.squashTimer * 2.0);
                e.animRoot.scale.x = 1.0 + e.squashTimer * 0.8;
                e.animRoot.scale.z = 1.0 + e.squashTimer * 0.8;

                if (e.squashTimer > 0.45) {
                    this.scene.remove(e.group);
                    this.enemies.splice(i, 1);
                }
                continue;
            }

            // AI Patrol Logic
            if (e.type === 'slime') {
                // Slime bounces forward
                e.group.position.x += e.dir * e.speed * dt;
                if (e.group.position.x >= e.maxX) {
                    e.group.position.x = e.maxX;
                    e.dir = -1;
                } else if (e.group.position.x <= e.minX) {
                    e.group.position.x = e.minX;
                    e.dir = 1;
                }

                e.group.rotation.y = e.dir > 0 ? Math.PI / 2 : -Math.PI / 2;

                // Hopping squash & stretch
                e.hopTimer += dt * 4.5;
                const hopBounce = Math.abs(Math.sin(e.hopTimer));
                e.animRoot.position.y = hopBounce * 0.35;
                const stretch = 1.0 + (hopBounce - 0.5) * 0.35;
                e.animRoot.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));

            } else if (e.type === 'beetle') {
                // Beetle walks steadily
                e.group.position.x += e.dir * e.speed * dt;
                if (e.group.position.x >= e.maxX) {
                    e.group.position.x = e.maxX;
                    e.dir = -1;
                } else if (e.group.position.x <= e.minX) {
                    e.group.position.x = e.minX;
                    e.dir = 1;
                }

                e.group.rotation.y = e.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
                e.animRoot.position.y = Math.abs(Math.sin(time * 12)) * 0.08;
                e.animRoot.rotation.z = Math.sin(time * 14) * 0.08;

            } else if (e.type === 'wisp') {
                // Wisp floats vertically
                e.group.position.y += e.dir * e.speed * dt;
                if (e.group.position.y >= e.maxY) {
                    e.group.position.y = e.maxY;
                    e.dir = -1;
                } else if (e.group.position.y <= e.minY) {
                    e.group.position.y = e.minY;
                    e.dir = 1;
                }

                // Bob & spin halo
                if (e.animRoot.userData.ring) {
                    e.animRoot.userData.ring.rotation.z += 3 * dt;
                    e.animRoot.userData.ring.rotation.x = Math.PI / 2 + Math.sin(time * 4) * 0.2;
                }
                e.animRoot.position.x = Math.sin(time * 3 + e.phase) * 0.2;
            }

            // Player Collision Check
            this.checkPlayerCollision(e, player);
        }
    }

    checkPlayerCollision(enemy, player) {
        if (!enemy.alive || player.isDead || player.isVictory) return;

        const pBox = player.getBounds();
        const eX = enemy.group.position.x;
        const eY = enemy.group.position.y;
        const eH = enemy.height;
        const eW = enemy.width;

        // AABB overlap check
        const overlapX = pBox.maxX > (eX - eW / 2) && pBox.minX < (eX + eW / 2);
        const overlapY = pBox.maxY > eY && pBox.minY < (eY + eH);

        if (overlapX && overlapY) {
            // Check if player has Shield powerup
            if (player.activePowerup === 'shield') {
                this.defeatEnemy(enemy, player, true);
                return;
            }

            // Stomp detection: player is falling and player's feet are above enemy mid-point
            const isFalling = player.velocity.y < 0;
            const feetAbove = player.position.y > (eY + eH * 0.45);

            if (isFalling && feetAbove) {
                // Successful Stomp!
                this.defeatEnemy(enemy, player, false);
                player.bounceOnEnemy();
            } else {
                // Player takes damage
                const knockDir = player.position.x < eX ? -1 : 1;
                player.takeDamage(1, knockDir);
            }
        }
    }

    defeatEnemy(enemy, player, fromShield = false) {
        enemy.alive = false;
        enemy.squashTimer = 0;
        this.particles.emitEnemyPop(enemy.group.position.x, enemy.group.position.y + 0.4, enemy.group.position.z);
        if (fromShield) {
            window.gameAudio.playStomp();
        }
        if (window.onEnemyDefeated) {
            window.onEnemyDefeated(enemy);
        }
    }

    reset() {
        for (let e of this.enemies) {
            this.scene.remove(e.group);
        }
        this.enemies = [];
    }
}
