// ============================================================================
// Aetheria: Sky Isles Adventure - World, Level Design & Environment
// Colorful 3D cartoon platforms, moving platforms, crumbling tiles, spring mushrooms,
// hazards, collectible gems, power-ups, checkpoints and the Celestial Goal Tower.
// ============================================================================

class World {
    constructor(scene, particles, enemyManager) {
        this.scene = scene;
        this.particles = particles;
        this.enemyManager = enemyManager;

        this.platforms = [];         // Static platforms
        this.movingPlatforms = [];   // Moving platforms with velocity
        this.crumblingPlatforms = [];// Shake & drop platforms
        this.springPads = [];        // Bouncy mushrooms
        this.spikes = [];            // Hazardous crystal spikes
        this.pendulums = [];         // Swinging obstacles
        this.gems = [];              // Collectible star gems
        this.specialStars = [];      // 3 Special hidden relics
        this.powerups = [];          // Power-up item capsules
        this.checkpoints = [];       // Magical respawn monoliths
        this.goalFlag = null;        // Celestial goal tower

        this.initMaterials();
        this.buildEnvironment();
        this.buildLevel();
    }

    initMaterials() {
        // Platform textures & materials
        this.grassMat = new THREE.MeshStandardMaterial({
            color: 0x48bb78, // Vibrant cartoon grass green
            roughness: 0.6,
            metalness: 0.05
        });
        this.rockMat = new THREE.MeshStandardMaterial({
            color: 0x805ad5, // Mystical purple stone
            roughness: 0.8,
            metalness: 0.1
        });
        this.woodMat = new THREE.MeshStandardMaterial({
            color: 0xdd6b20, // Warm wood orange/brown
            roughness: 0.7
        });
        this.crystalMat = new THREE.MeshStandardMaterial({
            color: 0x38b2ac, // Luminous teal crystal
            roughness: 0.2,
            metalness: 0.3
        });
        this.movingMat = new THREE.MeshStandardMaterial({
            color: 0x4299e1, // Sky blue floating tech slab
            roughness: 0.3,
            metalness: 0.2
        });
        this.spikeMat = new THREE.MeshStandardMaterial({
            color: 0xe53e3e, // Menacing danger red
            roughness: 0.3,
            metalness: 0.4
        });
        this.gemMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, // Golden radiance
            emissive: 0xff9900,
            emissiveIntensity: 0.4,
            roughness: 0.1,
            metalness: 0.8
        });
        this.starRelicMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff, // Celestial Cyan Relic
            emissive: 0x00aaff,
            emissiveIntensity: 0.6,
            roughness: 0.1,
            metalness: 0.9
        });
    }

    buildEnvironment() {
        // Sky hemisphere light + warm sun direction light
        const hemiLight = new THREE.HemisphereLight(0xfff8e7, 0x7e57c2, 0.75);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfffaed, 0.95);
        dirLight.position.set(25, 40, 25);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 120;
        dirLight.shadow.camera.left = -30;
        dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 25;
        dirLight.shadow.camera.bottom = -25;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);
        this.scene.add(dirLight.target);
        this.dirLight = dirLight;

        // Ambient fill
        const ambLight = new THREE.AmbientLight(0xffffff, 0.35);
        this.scene.add(ambLight);

        // Distant floating decorative cartoon islands & clouds
        this.buildDistantScenery();
    }

    buildDistantScenery() {
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            transparent: true,
            opacity: 0.85
        });

        // Background floating cloud puffs
        for (let i = 0; i < 24; i++) {
            const cloud = new THREE.Group();
            const puffCount = 3 + Math.floor(Math.random() * 4);
            for (let p = 0; p < puffCount; p++) {
                const r = 1.5 + Math.random() * 2.2;
                const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), cloudMat);
                puff.position.set((p - puffCount / 2) * 1.8, Math.random() * 0.8, (Math.random() - 0.5) * 1.5);
                cloud.add(puff);
            }
            cloud.position.set(
                (i - 4) * 8.5 + (Math.random() - 0.5) * 5,
                Math.random() * 12 - 4,
                -16 - Math.random() * 25
            );
            cloud.scale.setScalar(1.2 + Math.random() * 1.5);
            this.scene.add(cloud);
        }

        // Distant majestic floating mountain silhouettes
        const mountainMat = new THREE.MeshBasicMaterial({
            color: 0x9f7aea,
            transparent: true,
            opacity: 0.35
        });
        for (let m = 0; m < 8; m++) {
            const cone = new THREE.Mesh(new THREE.ConeGeometry(8 + Math.random() * 6, 22 + Math.random() * 10, 5), mountainMat);
            cone.position.set(m * 22 - 20, -5, -45 - Math.random() * 20);
            this.scene.add(cone);
        }
    }

    // --- Level Builder Helpers ---

    createPlatform(x, y, z, width, height, depth, type = 'grass') {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Platform block
        let topMat = this.grassMat;
        let baseMat = this.rockMat;

        if (type === 'crystal') {
            topMat = this.crystalMat;
            baseMat = this.rockMat;
        } else if (type === 'wood') {
            topMat = this.woodMat;
            baseMat = this.woodMat;
        }

        // Top grass slab
        const topH = Math.min(0.35, height * 0.3);
        const topGeo = new THREE.BoxGeometry(width, topH, depth);
        const topMesh = new THREE.Mesh(topGeo, topMat);
        topMesh.position.y = height / 2 - topH / 2;
        topMesh.castShadow = true;
        topMesh.receiveShadow = true;
        group.add(topMesh);

        // Rock under-base with chamfered look
        const baseH = height - topH;
        if (baseH > 0.05) {
            const baseGeo = new THREE.BoxGeometry(width * 0.96, baseH, depth * 0.94);
            const baseMesh = new THREE.Mesh(baseGeo, baseMat);
            baseMesh.position.y = -height / 2 + baseH / 2;
            baseMesh.castShadow = true;
            baseMesh.receiveShadow = true;
            group.add(baseMesh);
        }

        // Add decorative hanging grass / crystals underneath if tall enough
        if (height >= 1.5 && Math.random() < 0.8) {
            const decorCount = Math.floor(width / 1.8);
            for (let d = 0; d < decorCount; d++) {
                const stalactiteGeo = new THREE.ConeGeometry(0.2, 0.6 + Math.random() * 0.6, 4);
                const stalactiteMesh = new THREE.Mesh(stalactiteGeo, baseMat);
                stalactiteMesh.position.set((d - decorCount / 2 + 0.5) * 1.5, -height / 2 - 0.2, 0);
                stalactiteMesh.rotation.x = Math.PI;
                group.add(stalactiteMesh);
            }
        }

        this.scene.add(group);

        const platform = {
            group: group,
            x: x,
            y: y,
            z: z,
            width: width,
            height: height,
            depth: depth,
            minX: x - width / 2,
            maxX: x + width / 2,
            topY: y + height / 2,
            bottomY: y - height / 2
        };
        this.platforms.push(platform);
        return platform;
    }

    createMovingPlatform(x, y, z, width, height, depth, axis = 'x', distance = 6, speed = 2.0) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const geo = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geo, this.movingMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Underside glowing crystal energy core
        const coreGeo = new THREE.BoxGeometry(width * 0.7, 0.12, depth * 0.7);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.7
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = -height / 2 - 0.04;
        group.add(core);

        this.scene.add(group);

        const mp = {
            group: group,
            baseX: x,
            baseY: y,
            baseZ: z,
            width: width,
            height: height,
            depth: depth,
            axis: axis,
            distance: distance,
            speed: speed,
            t: Math.random() * Math.PI * 2,
            vx: 0,
            vy: 0,
            minX: x - width / 2,
            maxX: x + width / 2,
            topY: y + height / 2
        };
        this.movingPlatforms.push(mp);
        return mp;
    }

    createCrumblingPlatform(x, y, z, width = 2.2, height = 0.5, depth = 3.0) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xc05621, // Weathered fragile wood
            roughness: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        // Warning cracks decoration
        const crackMat = new THREE.MeshBasicMaterial({ color: 0x4a1d05 });
        const crack = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.6, 0.08), crackMat);
        crack.rotation.x = -Math.PI / 2;
        crack.position.y = height / 2 + 0.01;
        group.add(crack);

        this.scene.add(group);

        const cp = {
            group: group,
            startX: x,
            startY: y,
            startZ: z,
            width: width,
            height: height,
            depth: depth,
            state: 'idle', // 'idle', 'shaking', 'falling', 'respawning'
            timer: 0,
            vy: 0,
            minX: x - width / 2,
            maxX: x + width / 2,
            topY: y + height / 2
        };
        this.crumblingPlatforms.push(cp);
        return cp;
    }

    createSpringMushroom(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.6, 10);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0xfffff0, roughness: 0.5 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.3;
        stem.castShadow = true;
        group.add(stem);

        // Mushroom Cap
        const capGeo = new THREE.SphereGeometry(0.7, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMat = new THREE.MeshStandardMaterial({
            color: 0x48bb78, // Bright spring emerald
            roughness: 0.3,
            metalness: 0.1
        });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 0.55;
        cap.castShadow = true;
        group.add(cap);

        // White polka dots
        for (let i = 0; i < 5; i++) {
            const dotGeo = new THREE.CircleGeometry(0.12, 6);
            const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            const angle = (i / 5) * Math.PI * 2;
            dot.position.set(Math.cos(angle) * 0.45, 0.8, Math.sin(angle) * 0.45);
            dot.rotation.x = -Math.PI / 3;
            group.add(dot);
        }

        this.scene.add(group);

        const spring = {
            group: group,
            cap: cap,
            x: x,
            y: y,
            z: z,
            topY: y + 0.95,
            radius: 0.75,
            compressTimer: 0
        };
        this.springPads.push(spring);
        return spring;
    }

    createSpikes(x, y, z, count = 3) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const spikeW = 0.6;
        for (let i = 0; i < count; i++) {
            const spikeGeo = new THREE.ConeGeometry(0.24, 0.7, 5);
            const spike = new THREE.Mesh(spikeGeo, this.spikeMat);
            spike.position.set((i - count / 2 + 0.5) * spikeW, 0.35, 0);
            spike.castShadow = true;
            group.add(spike);
        }

        this.scene.add(group);

        const totalW = count * spikeW;
        const spikeObj = {
            group: group,
            x: x,
            y: y,
            z: z,
            minX: x - totalW / 2,
            maxX: x + totalW / 2,
            topY: y + 0.65,
            bottomY: y
        };
        this.spikes.push(spikeObj);
        return spikeObj;
    }

    createPendulum(x, y, z, length = 4.5, angleRange = 1.1) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Chain anchor beam
        const anchorGeo = new THREE.BoxGeometry(0.8, 0.4, 0.8);
        const anchor = new THREE.Mesh(anchorGeo, this.rockMat);
        group.add(anchor);

        // Pivot arm
        const pivot = new THREE.Group();
        group.add(pivot);

        // Chain
        const chainGeo = new THREE.CylinderGeometry(0.05, 0.05, length, 6);
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.7, roughness: 0.3 });
        const chain = new THREE.Mesh(chainGeo, chainMat);
        chain.position.y = -length / 2;
        pivot.add(chain);

        // Spiked Ball at end of pendulum
        const ballGeo = new THREE.SphereGeometry(0.65, 10, 10);
        const ball = new THREE.Mesh(ballGeo, this.spikeMat);
        ball.position.y = -length;
        ball.castShadow = true;
        pivot.add(ball);

        // Spikes on ball
        for (let i = 0; i < 6; i++) {
            const sGeo = new THREE.ConeGeometry(0.15, 0.4, 5);
            const s = new THREE.Mesh(sGeo, this.spikeMat);
            const a = (i / 6) * Math.PI * 2;
            s.position.set(Math.cos(a) * 0.6, -length + Math.sin(a) * 0.6, 0);
            s.rotation.z = a - Math.PI / 2;
            pivot.add(s);
        }

        this.scene.add(group);

        const pendulum = {
            group: group,
            pivot: pivot,
            x: x,
            y: y,
            z: z,
            length: length,
            angleRange: angleRange,
            speed: 2.2,
            t: Math.random() * Math.PI * 2,
            ballPos: new THREE.Vector3(x, y - length, z),
            radius: 0.75
        };
        this.pendulums.push(pendulum);
        return pendulum;
    }

    createGem(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Faceted 3D Octahedron Gem
        const geo = new THREE.OctahedronGeometry(0.32, 0);
        geo.scale(0.8, 1.2, 0.8);
        const mesh = new THREE.Mesh(geo, this.gemMat);
        group.add(mesh);

        this.scene.add(group);

        const gem = {
            group: group,
            mesh: mesh,
            x: x,
            baseY: y,
            z: z,
            collected: false,
            phase: Math.random() * Math.PI * 2
        };
        this.gems.push(gem);
        return gem;
    }

    createSpecialStar(x, y, z, id = 1) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Big Celestial Star Relic
        const starGeo = new THREE.DodecahedronGeometry(0.6);
        const mesh = new THREE.Mesh(starGeo, this.starRelicMat);
        group.add(mesh);

        // Glowing outer halo
        const haloGeo = new THREE.TorusGeometry(0.85, 0.05, 8, 16);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = Math.PI / 2;
        group.add(halo);

        this.scene.add(group);

        const star = {
            group: group,
            mesh: mesh,
            halo: halo,
            id: id,
            x: x,
            baseY: y,
            z: z,
            collected: false,
            phase: Math.random() * Math.PI * 2
        };
        this.specialStars.push(star);
        return star;
    }

    createPowerup(x, y, z, type = 'wing') {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Floating glowing crystal container
        const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const boxMat = new THREE.MeshStandardMaterial({
            color: type === 'wing' ? 0x00f0ff : (type === 'speed' ? 0xffbb00 : 0xff22bb),
            emissive: type === 'wing' ? 0x00a2ff : (type === 'speed' ? 0xff8800 : 0xaa0088),
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.8
        });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.rotation.set(0.5, 0.5, 0);
        group.add(box);

        // Floating icon inside/above
        const iconGeo = type === 'wing' ? new THREE.ConeGeometry(0.2, 0.5, 4) :
                        (type === 'speed' ? new THREE.BoxGeometry(0.15, 0.5, 0.3) : new THREE.SphereGeometry(0.25, 8, 8));
        const iconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const icon = new THREE.Mesh(iconGeo, iconMat);
        icon.position.y = 0.7;
        group.add(icon);

        // Ground beacon light beam
        const beamGeo = new THREE.CylinderGeometry(0.2, 0.4, 3, 8);
        const beamMat = new THREE.MeshBasicMaterial({
            color: boxMat.color,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 1.5;
        group.add(beam);

        this.scene.add(group);

        const pu = {
            group: group,
            box: box,
            beam: beam,
            type: type,
            x: x,
            baseY: y,
            z: z,
            collected: false
        };
        this.powerups.push(pu);
        return pu;
    }

    createCheckpoint(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Base altar
        const altarGeo = new THREE.CylinderGeometry(0.9, 1.2, 0.5, 8);
        const altar = new THREE.Mesh(altarGeo, this.rockMat);
        altar.position.y = 0.25;
        altar.castShadow = true;
        group.add(altar);

        // Floating Spire Monolith
        const spireGeo = new THREE.OctahedronGeometry(0.5, 0);
        spireGeo.scale(0.8, 1.8, 0.8);
        const spireMat = new THREE.MeshStandardMaterial({
            color: 0x718096, // Dormant gray stone
            roughness: 0.4,
            metalness: 0.1
        });
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.y = 1.6;
        spire.castShadow = true;
        group.add(spire);

        // Aura ring
        const ringGeo = new THREE.TorusGeometry(0.7, 0.04, 6, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x718096 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 1.6;
        group.add(ring);

        this.scene.add(group);

        const cp = {
            group: group,
            spire: spire,
            spireMat: spireMat,
            ring: ring,
            ringMat: ringMat,
            x: x,
            y: y,
            z: z,
            activated: false
        };
        this.checkpoints.push(cp);
        return cp;
    }

    createGoalTower(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Grand Sky Citadel Arch
        const archMat = new THREE.MeshStandardMaterial({ color: 0x6b46c1, roughness: 0.4 });
        const pillarGeo = new THREE.BoxGeometry(1.2, 7.0, 1.2);

        // Left pillar
        const leftP = new THREE.Mesh(pillarGeo, archMat);
        leftP.position.set(-3.2, 3.5, 0);
        leftP.castShadow = true;
        group.add(leftP);

        // Right pillar
        const rightP = new THREE.Mesh(pillarGeo, archMat);
        rightP.position.set(3.2, 3.5, 0);
        rightP.castShadow = true;
        group.add(rightP);

        // Top arch bridge
        const beamGeo = new THREE.BoxGeometry(8.0, 1.2, 1.6);
        const beam = new THREE.Mesh(beamGeo, archMat);
        beam.position.set(0, 7.4, 0);
        beam.castShadow = true;
        group.add(beam);

        // Golden Celestial Flagpole
        const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 8.5, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(0, 4.25, 0);
        pole.castShadow = true;
        group.add(pole);

        // Spinning Nova Star on Top of Pole
        const starGeo = new THREE.OctahedronGeometry(0.7);
        const starMat = new THREE.MeshStandardMaterial({
            color: 0xffea00,
            emissive: 0xffaa00,
            emissiveIntensity: 0.8
        });
        const starMesh = new THREE.Mesh(starGeo, starMat);
        starMesh.position.set(0, 8.8, 0);
        group.add(starMesh);

        // Rising Silk Banner Flag
        const flagGeo = new THREE.PlaneGeometry(1.8, 1.1);
        const flagMat = new THREE.MeshStandardMaterial({
            color: 0xff0077,
            side: THREE.DoubleSide,
            roughness: 0.3
        });
        const flagMesh = new THREE.Mesh(flagGeo, flagMat);
        flagMesh.position.set(0.95, 1.5, 0); // starts lowered
        group.add(flagMesh);

        this.scene.add(group);

        this.goalFlag = {
            group: group,
            starMesh: starMesh,
            flagMesh: flagMesh,
            x: x,
            y: y,
            z: z,
            triggered: false,
            flagTargetY: 7.6,
            currentFlagY: 1.5
        };
    }

    // --- Main Level Generation ---

    buildLevel() {
        // SECTION 1: The Floating Meadow (Intro & Movement Tutorial)
        // Main starting island
        this.createPlatform(0, 0, 0, 14, 2.0, 4.5, 'grass');

        // Introductory coins in arc
        for (let i = 0; i < 5; i++) {
            const angle = (i / 4) * Math.PI;
            this.createGem(1.5 + i * 1.2, 1.8 + Math.sin(angle) * 1.2, 0);
        }

        // Stepping stone platforms of different heights
        this.createPlatform(10.5, 1.6, 0, 3.5, 1.2, 3.5, 'grass');
        this.createGem(10.5, 3.0, 0);

        this.createPlatform(16.0, 3.4, 0, 4.0, 1.2, 3.5, 'grass');
        this.createGem(15.0, 4.8, 0);
        this.createGem(17.0, 4.8, 0);

        // First gentle Puff Slime on the ledge
        this.enemyManager.createSlime(16.0, 4.0, 0, 1.4, 1.4);

        // SECTION 2: The Chasm & First Moving Platform
        // Moving platform traversing the gap
        this.createMovingPlatform(23.0, 3.4, 0, 3.4, 0.6, 3.2, 'x', 4.5, 2.0);
        this.createGem(23.0, 4.8, 0);

        // Landing island with Spring Mushroom
        this.createPlatform(31.0, 3.0, 0, 7.0, 2.0, 4.0, 'grass');
        this.createSpringMushroom(33.0, 4.0, 0);

        // Secret High Cloud Ledge reached via Spring Mushroom!
        this.createPlatform(33.0, 9.5, 0, 5.0, 0.8, 3.5, 'crystal');
        this.createSpecialStar(33.0, 11.2, 0, 1); // 1st Special Relic!
        // Sky Wing Power-up!
        this.createPowerup(31.5, 11.0, 0, 'wing');

        // SECTION 3: The Crumbling Ruins & Spike Pit
        this.createPlatform(40.0, 2.5, 0, 4.0, 1.5, 3.5, 'grass');
        this.enemyManager.createSlime(40.0, 3.3, 0, 1.3, 1.8);

        // Crumbling bridges over deep hazard
        this.createCrumblingPlatform(45.0, 2.8, 0, 2.2, 0.5, 3.0);
        this.createGem(45.0, 4.0, 0);

        this.createCrumblingPlatform(49.0, 3.4, 0, 2.2, 0.5, 3.0);
        this.createGem(49.0, 4.6, 0);

        this.createCrumblingPlatform(53.0, 4.0, 0, 2.2, 0.5, 3.0);
        this.createGem(53.0, 5.2, 0);

        // Mid-air Floating Wisp hazard between crumble platforms
        this.enemyManager.createWisp(49.0, 6.2, 0, 1.8, 1.5);

        // SECTION 4: Checkpoint 1 (The Azure Shrine)
        this.createPlatform(59.0, 4.2, 0, 7.0, 2.0, 4.0, 'grass');
        this.createCheckpoint(59.0, 5.2, 0);

        // SECTION 5: Vertical Ascent & Elevator
        // Vertical elevator platform
        this.createMovingPlatform(66.5, 4.5, 0, 3.5, 0.6, 3.2, 'y', 4.0, 2.2);

        // Spikes at the bottom of the elevator chasm
        this.createPlatform(66.5, -0.5, 0, 5.0, 1.0, 4.0, 'rock');
        this.createSpikes(66.5, 0.0, 0, 5);

        // High Sky Citadel Ruins
        this.createPlatform(74.0, 8.5, 0, 8.0, 2.0, 4.0, 'grass');
        // Swift Speed Berry Power-up!
        this.createPowerup(71.5, 10.2, 0, 'speed');
        this.createGem(74.0, 10.0, 0);
        this.createGem(75.5, 10.0, 0);
        this.createGem(77.0, 10.0, 0);

        // Armored Beetle Patroller
        this.enemyManager.createBeetle(75.0, 9.5, 0, 2.5, 2.5);

        // SECTION 6: The Pendulum Crossing
        this.createPlatform(84.0, 7.5, 0, 5.0, 1.5, 3.5, 'grass');
        // Swinging spiked pendulum hazard!
        this.createPendulum(89.0, 13.5, 0, 5.2, 1.2);

        // Stepping pillar under the pendulum
        this.createPlatform(89.0, 6.5, 0, 2.6, 1.5, 3.0, 'crystal');
        this.createSpecialStar(89.0, 8.4, 0, 2); // 2nd Special Relic!

        this.createPlatform(94.0, 7.5, 0, 5.0, 1.5, 3.5, 'grass');

        // SECTION 7: Checkpoint 2 (The Golden Sanctuary)
        this.createPlatform(102.0, 7.0, 0, 7.0, 2.0, 4.0, 'grass');
        this.createCheckpoint(102.0, 8.0, 0);

        // Star Shield Power-Up before the Slime Swarm!
        this.createPowerup(104.5, 9.0, 0, 'shield');

        // SECTION 8: The Celestial Gauntlet
        this.createPlatform(112.0, 7.5, 0, 9.0, 1.8, 4.0, 'grass');
        this.enemyManager.createSlime(109.0, 8.4, 0, 1.8, 1.8);
        this.enemyManager.createBeetle(113.0, 8.4, 0, 2.0, 2.6);
        this.enemyManager.createWisp(112.0, 10.8, 0, 1.5, 2.0);

        // Arc of celebratory coins
        for (let j = 0; j < 6; j++) {
            const arcY = Math.sin((j / 5) * Math.PI) * 1.5;
            this.createGem(109.5 + j * 1.0, 9.5 + arcY, 0);
        }

        // Stepping stones to Grand Tower
        this.createMovingPlatform(120.0, 8.0, 0, 3.0, 0.6, 3.0, 'x', 3.0, 2.5);

        // Secret High Spire with 3rd Special Relic
        this.createPlatform(120.0, 13.5, 0, 3.0, 0.6, 3.0, 'crystal');
        this.createSpecialStar(120.0, 15.0, 0, 3); // 3rd Special Relic!

        // SECTION 9: The Celestial Goal Citadel
        this.createPlatform(130.0, 7.5, 0, 14.0, 3.0, 6.0, 'grass');
        this.createGoalTower(132.0, 9.0, 0);

        // Welcoming celebration gems around the goal
        this.createGem(127.0, 9.8, 0);
        this.createGem(128.5, 10.3, 0);
        this.createGem(135.5, 10.3, 0);
        this.createGem(137.0, 9.8, 0);
    }

    // --- Dynamic Updates & Physics Interactions ---

    update(dt, player) {
        const time = performance.now() * 0.001;

        // 1. Moving Platforms
        for (let mp of this.movingPlatforms) {
            mp.t += dt * mp.speed;
            const oldX = mp.group.position.x;
            const oldY = mp.group.position.y;

            if (mp.axis === 'x') {
                mp.group.position.x = mp.baseX + Math.sin(mp.t) * mp.distance;
            } else if (mp.axis === 'y') {
                mp.group.position.y = mp.baseY + Math.sin(mp.t) * mp.distance;
            }

            mp.vx = (mp.group.position.x - oldX) / dt;
            mp.vy = (mp.group.position.y - oldY) / dt;
            mp.minX = mp.group.position.x - mp.width / 2;
            mp.maxX = mp.group.position.x + mp.width / 2;
            mp.topY = mp.group.position.y + mp.height / 2;
        }

        // 2. Crumbling Platforms
        for (let cp of this.crumblingPlatforms) {
            if (cp.state === 'shaking') {
                cp.timer += dt;
                // Shake wobble
                cp.group.position.x = cp.startX + (Math.random() - 0.5) * 0.15;
                cp.group.position.y = cp.startY + (Math.random() - 0.5) * 0.08;

                if (cp.timer > 0.75) {
                    cp.state = 'falling';
                    cp.timer = 0;
                    cp.vy = -1.5;
                    this.particles.emitDust(cp.startX, cp.startY, cp.startZ, 10, 0xaa5522);
                }
            } else if (cp.state === 'falling') {
                cp.timer += dt;
                cp.vy -= 18.0 * dt;
                cp.group.position.y += cp.vy * dt;
                cp.group.rotation.z += 2.0 * dt;

                if (cp.timer > 2.8) {
                    // Start respawn
                    cp.state = 'respawning';
                    cp.timer = 0;
                    cp.group.visible = false;
                    cp.group.position.set(cp.startX, cp.startY, cp.startZ);
                    cp.group.rotation.set(0, 0, 0);
                    cp.topY = cp.startY + cp.height / 2;
                }
            } else if (cp.state === 'respawning') {
                cp.timer += dt;
                if (cp.timer > 1.2) {
                    // Fully respawn
                    cp.state = 'idle';
                    cp.timer = 0;
                    cp.group.visible = true;
                    this.particles.emitSparkles(cp.startX, cp.startY, cp.startZ, 8, [0x00f0ff, 0xffffff]);
                }
            }
        }

        // 3. Spring Mushrooms
        for (let sp of this.springPads) {
            if (sp.compressTimer > 0) {
                sp.compressTimer -= dt;
                const scaleY = 0.4 + Math.sin((1 - sp.compressTimer / 0.3) * Math.PI) * 0.7;
                sp.cap.scale.y = scaleY;
            } else {
                sp.cap.scale.y = 1.0;
            }
        }

        // 4. Swinging Pendulums
        for (let pend of this.pendulums) {
            pend.t += dt * pend.speed;
            const currentAngle = Math.sin(pend.t) * pend.angleRange;
            pend.pivot.rotation.z = currentAngle;

            // Compute world position of the spiked ball
            pend.ballPos.set(
                pend.x + Math.sin(currentAngle) * pend.length,
                pend.y - Math.cos(currentAngle) * pend.length,
                pend.z
            );
        }

        // 5. Collectibles & Checkpoints animation
        for (let g of this.gems) {
            if (!g.collected) {
                g.mesh.rotation.y += 2.5 * dt;
                g.group.position.y = g.baseY + Math.sin(time * 3 + g.phase) * 0.22;
            }
        }

        for (let s of this.specialStars) {
            if (!s.collected) {
                s.mesh.rotation.y += 2.0 * dt;
                s.mesh.rotation.x += 1.5 * dt;
                s.halo.rotation.z += 3.0 * dt;
                s.group.position.y = s.baseY + Math.sin(time * 2.5 + s.phase) * 0.28;
            }
        }

        for (let pu of this.powerups) {
            if (!pu.collected) {
                pu.box.rotation.y += 2.0 * dt;
                pu.box.rotation.x += 1.0 * dt;
                pu.group.position.y = pu.baseY + Math.sin(time * 3) * 0.2;
            }
        }

        for (let cp of this.checkpoints) {
            if (cp.activated) {
                cp.spire.rotation.y += 3.5 * dt;
                cp.ring.rotation.z += 2.5 * dt;
                cp.spire.position.y = 1.6 + Math.sin(time * 4) * 0.15;
            }
        }

        // 6. Goal Flag animation
        if (this.goalFlag) {
            this.goalFlag.starMesh.rotation.y += 3.0 * dt;
            if (this.goalFlag.triggered && this.goalFlag.currentFlagY < this.goalFlag.flagTargetY) {
                this.goalFlag.currentFlagY += 4.5 * dt;
                this.goalFlag.flagMesh.position.y = Math.min(this.goalFlag.flagTargetY, this.goalFlag.currentFlagY);
                // Flag wave ripple
                this.goalFlag.flagMesh.rotation.y = Math.sin(time * 12) * 0.2;
            }
        }

        // Perform collisions between player and platforms / hazards / collectibles
        this.resolveCollisions(player, dt);
    }

    resolveCollisions(player, dt) {
        if (player.isDead) return;

        const pBox = player.getBounds();
        let groundedThisFrame = false;
        let platformVx = 0;
        let platformVy = 0;

        // Helper to check standing on a horizontal surface
        const checkLanding = (minX, maxX, topY, surfaceVx = 0, surfaceVy = 0) => {
            const withinX = pBox.maxX > minX && pBox.minX < maxX;
            const wasAbove = (player.position.y - player.velocity.y * dt) >= (topY - 0.1);
            const isAtOrBelow = player.position.y <= topY + 0.18;
            const falling = player.velocity.y <= 0;

            if (withinX && wasAbove && isAtOrBelow && falling) {
                player.position.y = topY;
                player.velocity.y = 0;
                groundedThisFrame = true;
                platformVx = surfaceVx;
                platformVy = surfaceVy;
                player.onLanded();
                return true;
            }
            return false;
        };

        // 1. Static Platforms
        for (let p of this.platforms) {
            checkLanding(p.minX, p.maxX, p.topY);
        }

        // 2. Moving Platforms (ride with velocity)
        for (let mp of this.movingPlatforms) {
            const withinX = pBox.maxX > mp.minX && pBox.minX < mp.maxX;
            const closeY = (player.position.y >= mp.topY - 0.25) && (player.position.y <= mp.topY + 0.35);
            if (withinX && closeY && player.velocity.y <= 0.2) {
                player.position.y = mp.topY;
                player.velocity.y = 0;
                groundedThisFrame = true;
                player.onLanded();
                if (mp.axis === 'x') {
                    player.position.x += mp.vx * dt;
                }
            } else {
                if (checkLanding(mp.minX, mp.maxX, mp.topY, mp.vx, mp.vy)) {
                    if (mp.axis === 'x') {
                        player.position.x += mp.vx * dt;
                    }
                }
            }
        }

        // 3. Crumbling Platforms
        for (let cp of this.crumblingPlatforms) {
            if (cp.state !== 'falling' && cp.state !== 'respawning') {
                if (checkLanding(cp.minX, cp.maxX, cp.topY)) {
                    if (cp.state === 'idle') {
                        cp.state = 'shaking';
                        cp.timer = 0;
                    }
                }
            }
        }

        player.isGrounded = groundedThisFrame;

        // 4. Spring Pads (Bouncy Mushrooms)
        for (let sp of this.springPads) {
            const dist = Math.hypot(player.position.x - sp.x, player.position.y - sp.topY);
            if (dist < sp.radius && player.velocity.y <= 0 && Math.abs(player.position.x - sp.x) < 0.8) {
                sp.compressTimer = 0.3;
                player.bounceOnSpring();
            }
        }

        // 5. Crystal Spikes Hazard
        for (let sp of this.spikes) {
            const overlapX = pBox.maxX > sp.minX && pBox.minX < sp.maxX;
            const overlapY = pBox.minY < sp.topY && pBox.maxY > sp.bottomY;
            if (overlapX && overlapY) {
                player.takeDamage(1, player.position.x < sp.x ? -1 : 1);
            }
        }

        // 6. Swinging Pendulum Hazard
        for (let pend of this.pendulums) {
            const dist = Math.hypot(player.position.x - pend.ballPos.x, (player.position.y + player.height / 2) - pend.ballPos.y);
            if (dist < pend.radius + player.width / 2) {
                const dir = player.position.x < pend.ballPos.x ? -1 : 1;
                player.takeDamage(1, dir);
            }
        }

        // 7. Collectible Gems
        for (let g of this.gems) {
            if (!g.collected) {
                const dist = Math.hypot(player.position.x - g.x, (player.position.y + 0.5) - g.group.position.y);
                if (dist < 0.9) {
                    g.collected = true;
                    this.scene.remove(g.group);
                    this.particles.emitSparkles(g.x, g.group.position.y, g.z, 10, [0xffd700, 0xffffff]);
                    window.gameAudio.playGem();
                    if (window.onGemCollected) window.onGemCollected(g);
                }
            }
        }

        // 8. Special Star Relics
        for (let s of this.specialStars) {
            if (!s.collected) {
                const dist = Math.hypot(player.position.x - s.x, (player.position.y + 0.6) - s.group.position.y);
                if (dist < 1.2) {
                    s.collected = true;
                    this.scene.remove(s.group);
                    this.particles.emitSparkles(s.x, s.group.position.y, s.z, 25, [0x00ffff, 0xffd700, 0xffffff]);
                    window.gameAudio.playPowerup();
                    if (window.onSpecialStarCollected) window.onSpecialStarCollected(s);
                }
            }
        }

        // 9. Power-Up Capsules
        for (let pu of this.powerups) {
            if (!pu.collected) {
                const dist = Math.hypot(player.position.x - pu.x, (player.position.y + 0.5) - pu.group.position.y);
                if (dist < 1.1) {
                    pu.collected = true;
                    this.scene.remove(pu.group);
                    player.applyPowerup(pu.type);
                    if (window.onPowerupCollected) window.onPowerupCollected(pu);
                }
            }
        }

        // 10. Checkpoints
        for (let cp of this.checkpoints) {
            if (!cp.activated) {
                const dist = Math.hypot(player.position.x - cp.x, player.position.y - cp.y);
                if (dist < 1.5) {
                    cp.activated = true;
                    // Light up monolith
                    cp.spireMat.color.setHex(0x00f0ff);
                    cp.spireMat.emissive.setHex(0x00a2ff);
                    cp.spireMat.emissiveIntensity = 0.8;
                    cp.ringMat.color.setHex(0xffd700);

                    player.setCheckpoint(new THREE.Vector3(cp.x, cp.y + 0.5, cp.z));
                    window.gameAudio.playCheckpoint();
                    this.particles.emitSparkles(cp.x, cp.y + 1.6, cp.z, 20, [0x00f0ff, 0xffd700, 0xffffff]);
                    if (window.onCheckpointActivated) window.onCheckpointActivated(cp);
                }
            }
        }

        // 11. Celestial Goal Flag!
        if (this.goalFlag && !this.goalFlag.triggered) {
            const dist = Math.hypot(player.position.x - this.goalFlag.x, player.position.y - this.goalFlag.y);
            if (dist < 2.0 && player.position.x >= this.goalFlag.x - 1.2) {
                this.goalFlag.triggered = true;
                player.isVictory = true;
                player.velocity.set(0, 0, 0);

                window.gameAudio.playVictory();
                this.particles.emitConfetti(this.goalFlag.x, this.goalFlag.y + 4.0, this.goalFlag.z, 60);
                if (window.onVictoryReached) window.onVictoryReached();
            }
        }
    }
}
