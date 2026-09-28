// ============================================================================
// Aetheria: Sky Isles Adventure - 3D Particle System
// Handles dust clouds, gem sparkles, enemy defeat pops, confetti & ambient spores
// ============================================================================

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];

        // Geometries pool
        this.boxGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        this.sphereGeo = new THREE.SphereGeometry(0.08, 6, 6);
        this.starGeo = new THREE.TetrahedronGeometry(0.14);
        this.confettiGeo = new THREE.PlaneGeometry(0.2, 0.2);

        // Materials cache
        this.materials = {
            dust: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
            gold: new THREE.MeshBasicMaterial({ color: 0xffd700 }),
            cyan: new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
            magenta: new THREE.MeshBasicMaterial({ color: 0xff00bb }),
            green: new THREE.MeshBasicMaterial({ color: 0x55ff66 }),
            purple: new THREE.MeshBasicMaterial({ color: 0xaa55ff }),
            white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
            ember: new THREE.MeshBasicMaterial({ color: 0xff7733 })
        };

        // Ambient sky floating fireflies / spores
        this.ambientParticles = [];
        this.createAmbientSpores(60);
    }

    createAmbientSpores(count) {
        const group = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: 0xfff6aa, transparent: true, opacity: 0.6 });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.sphereGeo, mat);
            mesh.position.set(
                (Math.random() - 0.2) * 150,
                Math.random() * 20 - 2,
                (Math.random() - 0.5) * 12
            );
            mesh.scale.setScalar(0.4 + Math.random() * 0.6);
            mesh.userData = {
                baseY: mesh.position.y,
                speedX: (Math.random() - 0.5) * 0.2,
                freq: 1 + Math.random() * 2,
                phase: Math.random() * Math.PI * 2
            };
            this.ambientParticles.push(mesh);
            group.add(mesh);
        }
        this.scene.add(group);
        this.ambientGroup = group;
    }

    emitDust(x, y, z, count = 5, color = 0xeeeeee) {
        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.75
            });
            const mesh = new THREE.Mesh(this.boxGeo, mat);
            mesh.position.set(
                x + (Math.random() - 0.5) * 0.4,
                y + Math.random() * 0.15,
                z + (Math.random() - 0.5) * 0.4
            );
            const scale = 0.5 + Math.random() * 0.8;
            mesh.scale.setScalar(scale);

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                vx: (Math.random() - 0.5) * 1.8,
                vy: 0.8 + Math.random() * 1.4,
                vz: (Math.random() - 0.5) * 1.8,
                rotX: (Math.random() - 0.5) * 10,
                rotY: (Math.random() - 0.5) * 10,
                life: 0.45 + Math.random() * 0.25,
                maxLife: 0.45 + Math.random() * 0.25,
                gravity: -1.5,
                shrink: true
            });
        }
    }

    emitSparkles(x, y, z, count = 12, colors = [0xffd700, 0xffffff, 0x00f0ff]) {
        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const mat = new THREE.MeshBasicMaterial({ color: color });
            const mesh = new THREE.Mesh(this.starGeo, mat);
            mesh.position.set(x, y, z);
            const scale = 0.6 + Math.random() * 0.7;
            mesh.scale.setScalar(scale);

            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 3.5;
            const vz = (Math.random() - 0.5) * 2;

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed + 1.2,
                vz: vz,
                rotX: Math.random() * 8,
                rotY: Math.random() * 8,
                life: 0.6 + Math.random() * 0.3,
                maxLife: 0.8,
                gravity: -4.5,
                shrink: true
            });
        }
    }

    emitEnemyPop(x, y, z) {
        // Star and cloud bursts
        this.emitSparkles(x, y, z, 14, [0xffaa00, 0xff3366, 0xffffff]);
        this.emitDust(x, y, z, 8, 0xffdd88);
    }

    emitPowerupAura(x, y, z, color = 0x00f0ff) {
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(this.sphereGeo, mat);
        mesh.position.set(
            x + (Math.random() - 0.5) * 0.6,
            y + (Math.random() - 0.5) * 0.6,
            z + (Math.random() - 0.5) * 0.6
        );
        mesh.scale.setScalar(0.7);

        this.scene.add(mesh);
        this.particles.push({
            mesh: mesh,
            vx: (Math.random() - 0.5) * 0.5,
            vy: 1.0 + Math.random() * 1.0,
            vz: (Math.random() - 0.5) * 0.5,
            rotX: 0,
            rotY: 0,
            life: 0.35,
            maxLife: 0.35,
            gravity: 0.5,
            shrink: true
        });
    }

    emitConfetti(x, y, z, count = 40) {
        const colors = [0xff2255, 0x00d4ff, 0xffdd00, 0x55ff55, 0xaa22ff, 0xff8800, 0xffffff];
        for (let i = 0; i < count; i++) {
            const col = colors[Math.floor(Math.random() * colors.length)];
            const mat = new THREE.MeshBasicMaterial({
                color: col,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(this.confettiGeo, mat);
            mesh.position.set(x, y + 1, z);

            const angle = Math.random() * Math.PI * 2;
            const speed = 3.5 + Math.random() * 6.5;

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                vx: Math.cos(angle) * speed * 0.7,
                vy: 5 + Math.random() * 6,
                vz: (Math.random() - 0.5) * 4,
                rotX: (Math.random() - 0.5) * 15,
                rotY: (Math.random() - 0.5) * 15,
                rotZ: (Math.random() - 0.5) * 15,
                life: 1.8 + Math.random() * 0.8,
                maxLife: 2.5,
                gravity: -6.5,
                shrink: false
            });
        }
    }

    update(dt, playerX = 0) {
        // Update active bursts
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.material && p.mesh.material.dispose) p.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }

            p.vy += p.gravity * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;

            if (p.rotX) p.mesh.rotation.x += p.rotX * dt;
            if (p.rotY) p.mesh.rotation.y += p.rotY * dt;
            if (p.rotZ) p.mesh.rotation.z += p.rotZ * dt;

            const progress = p.life / p.maxLife;
            if (p.shrink) {
                p.mesh.scale.setScalar(Math.max(0.01, progress));
            }
            if (p.mesh.material.transparent) {
                p.mesh.material.opacity = Math.max(0, progress);
            }
        }

        // Ambient spores floating gently around the player
        const time = performance.now() * 0.001;
        for (let j = 0; j < this.ambientParticles.length; j++) {
            const sp = this.ambientParticles[j];
            sp.position.y = sp.userData.baseY + Math.sin(time * sp.userData.freq + sp.userData.phase) * 0.8;
            sp.position.x += sp.userData.speedX * dt;

            // Wrap ambient spores around player X view area
            if (sp.position.x < playerX - 35) {
                sp.position.x += 70;
            } else if (sp.position.x > playerX + 35) {
                sp.position.x -= 70;
            }
        }
    }

    clear() {
        for (let p of this.particles) {
            this.scene.remove(p.mesh);
            if (p.mesh.material && p.mesh.material.dispose) p.mesh.material.dispose();
        }
        this.particles = [];
    }
}
