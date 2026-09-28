/**
 * Environment & Lighting Manager
 * Builds the Luxury Automotive Studio Showroom and the Proving Ground Race Track.
 * Handles lighting setups, floor reflections, and environment switches.
 */

class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;

        // Environment parent containers
        this.showroomGroup = new THREE.Group();
        this.showroomGroup.name = "Showroom";

        this.trackGroup = new THREE.Group();
        this.trackGroup.name = "RaceTrack";
        this.trackGroup.visible = false;

        this.scene.add(this.showroomGroup);
        this.scene.add(this.trackGroup);

        // Active mode: 'showroom' or 'drive'
        this.currentMode = 'showroom';

        // Showroom turntable
        this.turntableMesh = null;
        this.turntableAngle = 0;
        this.turntableAutoRotate = true;

        this._buildShowroom();
        this._buildRaceTrack();
    }

    _buildShowroom() {
        // 1. Polished Studio Floor (Dark reflective surface)
        const floorGeo = new THREE.PlaneGeometry(80, 80);
        floorGeo.rotateX(-Math.PI / 2);

        // Grid texture for high-tech showroom floor
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#080a0f';
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 512; i += 64) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 512);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(512, i);
            ctx.stroke();
        }

        const floorTex = new THREE.CanvasTexture(canvas);
        floorTex.wrapS = THREE.RepeatWrapping;
        floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(20, 20);

        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x07090d,
            map: floorTex,
            roughness: 0.15,
            metalness: 0.85
        });

        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.receiveShadow = true;
        this.showroomGroup.add(floor);

        // 2. Circular Turntable Display Pedestal
        const tableGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.06, 64);
        const tableMat = new THREE.MeshStandardMaterial({
            color: 0x12151b,
            roughness: 0.25,
            metalness: 0.75
        });
        this.turntableMesh = new THREE.Mesh(tableGeo, tableMat);
        this.turntableMesh.position.y = 0.03;
        this.turntableMesh.receiveShadow = true;
        this.showroomGroup.add(this.turntableMesh);

        // Turntable Glowing Perimeter Ring
        const ringGeo = new THREE.TorusGeometry(3.68, 0.025, 16, 64);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.065;
        this.showroomGroup.add(ring);

        // Outer ambient glow ring on floor
        const outerRingGeo = new THREE.RingGeometry(3.8, 4.4, 64);
        outerRingGeo.rotateX(-Math.PI / 2);
        const outerRingMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
        outerRing.position.y = 0.005;
        this.showroomGroup.add(outerRing);

        // 3. Curved Luxury Architectural Backdrop Wall
        const wallGeo = new THREE.CylinderGeometry(18, 18, 9, 32, 1, true, -Math.PI * 0.45, Math.PI * 0.9);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x0c0f16,
            roughness: 0.7,
            metalness: 0.3,
            side: THREE.BackSide
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(0, 4.5, -4);
        wall.receiveShadow = true;
        this.showroomGroup.add(wall);

        // Vertical LED Architectural Light Bars along backdrop
        for (let i = -4; i <= 4; i++) {
            const angle = (i / 4) * 0.8;
            const x = Math.sin(angle) * 17.5;
            const z = -Math.cos(angle) * 17.5 - 4;
            const barGeo = new THREE.BoxGeometry(0.06, 7.5, 0.06);
            const barMat = new THREE.MeshBasicMaterial({ color: 0x3a82f6 });
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.position.set(x, 4.0, z);
            this.showroomGroup.add(bar);
        }

        // Showroom Illuminated Brand Crest / Logo on wall
        const brandGeo = new THREE.TorusGeometry(1.2, 0.04, 16, 48);
        const brandMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const brandCrest = new THREE.Mesh(brandGeo, brandMat);
        brandCrest.position.set(0, 5.5, -21.8);
        this.showroomGroup.add(brandCrest);

        // 4. Overhead Studio Softbox Light Banks (creates stunning body reflections)
        const softboxGroup = new THREE.Group();
        softboxGroup.position.set(0, 5.8, 0);

        // Main central softbox
        const softboxMainGeo = new THREE.PlaneGeometry(3.5, 7.5);
        softboxMainGeo.rotateX(Math.PI / 2);
        const softboxMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const softboxMain = new THREE.Mesh(softboxMainGeo, softboxMat);
        softboxGroup.add(softboxMain);

        // Angled side softbox lights
        [-3.2, 3.2].forEach(x => {
            const sideBoxGeo = new THREE.PlaneGeometry(1.4, 6.8);
            sideBoxGeo.rotateX(Math.PI / 2);
            sideBoxGeo.rotateZ(x > 0 ? -0.35 : 0.35);
            const sideBox = new THREE.Mesh(sideBoxGeo, softboxMat);
            sideBox.position.set(x, -0.4, 0);
            softboxGroup.add(sideBox);
        });

        this.showroomGroup.add(softboxGroup);

        // 5. Studio Stage Lighting Setup
        // Overhead Key SpotLight (Focused on car center)
        const keyLight = new THREE.SpotLight(0xffffff, 4.2);
        keyLight.position.set(0, 9.0, 1.5);
        keyLight.angle = 0.75;
        keyLight.penumbra = 0.6;
        keyLight.decay = 1.6;
        keyLight.distance = 25;
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.bias = -0.0005;
        this.showroomGroup.add(keyLight);

        // Front 3/4 Fill Light (Warm golden rim)
        const fillWarm = new THREE.DirectionalLight(0xffeedd, 1.5);
        fillWarm.position.set(5.5, 4.5, 6.0);
        this.showroomGroup.add(fillWarm);

        // Rear 3/4 Rim Light (Cool cyan edge highlight)
        const rimCool = new THREE.DirectionalLight(0x00f0ff, 2.2);
        rimCool.position.set(-6.5, 4.0, -5.5);
        this.showroomGroup.add(rimCool);

        // Soft ambient studio bounce light
        const studioAmbient = new THREE.HemisphereLight(0x182030, 0x05070a, 0.9);
        this.showroomGroup.add(studioAmbient);
    }

    _buildRaceTrack() {
        // --- 1. EXPANSIVE ASPHALT PROVING GROUND & RACETRACK ---
        const groundGeo = new THREE.PlaneGeometry(600, 600);
        groundGeo.rotateX(-Math.PI / 2);

        // Procedural asphalt texture
        const trackCanvas = document.createElement('canvas');
        trackCanvas.width = 512;
        trackCanvas.height = 512;
        const tctx = trackCanvas.getContext('2d');
        tctx.fillStyle = '#181a1f';
        tctx.fillRect(0, 0, 512, 512);

        // Grain & aggregate specs
        for (let i = 0; i < 6000; i++) {
            const c = Math.random() > 0.5 ? 45 : 20;
            tctx.fillStyle = `rgb(${c}, ${c}, ${c})`;
            tctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
        }

        const asphaltTex = new THREE.CanvasTexture(trackCanvas);
        asphaltTex.wrapS = THREE.RepeatWrapping;
        asphaltTex.wrapT = THREE.RepeatWrapping;
        asphaltTex.repeat.set(60, 60);

        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x1c1e24,
            map: asphaltTex,
            roughness: 0.88,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.receiveShadow = true;
        this.trackGroup.add(ground);

        // --- 2. CIRCUIT TRACK ROADWAY & RACING LINES ---
        // Wide oval + chicane circuit layout
        const trackPoints = [
            new THREE.Vector3(0, 0.01, -120),
            new THREE.Vector3(80, 0.01, -110),
            new THREE.Vector3(130, 0.01, -50),
            new THREE.Vector3(130, 0.01, 50),
            new THREE.Vector3(70, 0.01, 110),
            new THREE.Vector3(0, 0.01, 120),
            new THREE.Vector3(-80, 0.01, 100),
            new THREE.Vector3(-120, 0.01, 30),
            new THREE.Vector3(-70, 0.01, -20),
            new THREE.Vector3(-120, 0.01, -80)
        ];

        const curve = new THREE.CatmullRomCurve3(trackPoints, true);
        const curvePoints = curve.getPoints(200);

        // Build track asphalt ribbon
        const ribbonGeo = new THREE.BufferGeometry();
        const ribbonVertices = [];
        const ribbonUvs = [];
        const trackWidth = 18;

        for (let i = 0; i < curvePoints.length; i++) {
            const p = curvePoints[i];
            const nextP = curvePoints[(i + 1) % curvePoints.length];
            const dir = nextP.clone().sub(p).normalize();
            const normal = new THREE.Vector3(-dir.z, 0, dir.x);

            const left = p.clone().addScaledVector(normal, trackWidth / 2);
            const right = p.clone().addScaledVector(normal, -trackWidth / 2);

            ribbonVertices.push(left.x, 0.02, left.z);
            ribbonVertices.push(right.x, 0.02, right.z);

            const u = i / curvePoints.length;
            ribbonUvs.push(0, u);
            ribbonUvs.push(1, u);
        }

        const indices = [];
        for (let i = 0; i < curvePoints.length - 1; i++) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2);
            indices.push(base + 1, base + 3, base + 2);
        }
        // Close loop
        const lastBase = (curvePoints.length - 1) * 2;
        indices.push(lastBase, lastBase + 1, 0);
        indices.push(lastBase + 1, 1, 0);

        ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVertices, 3));
        ribbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ribbonUvs, 2));
        ribbonGeo.setIndex(indices);
        ribbonGeo.computeVertexNormals();

        const circuitMat = new THREE.MeshStandardMaterial({
            color: 0x111317,
            roughness: 0.85,
            metalness: 0.15
        });
        const trackMesh = new THREE.Mesh(ribbonGeo, circuitMat);
        trackMesh.receiveShadow = true;
        this.trackGroup.add(trackMesh);

        // --- 3. RED & WHITE RACING CURBS / RUMBLE STRIPS ---
        for (let i = 0; i < curvePoints.length; i += 3) {
            const p = curvePoints[i];
            const nextP = curvePoints[(i + 1) % curvePoints.length];
            const dir = nextP.clone().sub(p).normalize();
            const normal = new THREE.Vector3(-dir.z, 0, dir.x);

            // Left curb & Right curb
            [-1, 1].forEach(side => {
                const curbPos = p.clone().addScaledVector(normal, side * (trackWidth / 2 + 0.4));
                const curbGeo = new THREE.BoxGeometry(0.8, 0.08, 1.6);
                const isRed = (Math.floor(i / 3) % 2 === 0);
                const curbMat = new THREE.MeshStandardMaterial({
                    color: isRed ? 0xee2222 : 0xf0f0f0,
                    roughness: 0.5
                });
                const curb = new THREE.Mesh(curbGeo, curbMat);
                curb.position.set(curbPos.x, 0.04, curbPos.z);
                curb.rotation.y = Math.atan2(dir.x, dir.z);
                this.trackGroup.add(curb);
            });
        }

        // --- 4. START/FINISH GANTRY ARCH ---
        const gantryGroup = new THREE.Group();
        gantryGroup.position.set(0, 0, 0);

        // Gantry Truss Frame
        [-11, 11].forEach(x => {
            const pillarGeo = new THREE.BoxGeometry(0.8, 8.5, 0.8);
            const pillarMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(x, 4.25, 0);
            gantryGroup.add(pillar);
        });

        const topSpanGeo = new THREE.BoxGeometry(23, 1.2, 1.2);
        const topSpanMat = new THREE.MeshStandardMaterial({ color: 0x181818, metalness: 0.8 });
        const topSpan = new THREE.Mesh(topSpanGeo, topSpanMat);
        topSpan.position.set(0, 8.5, 0);
        gantryGroup.add(topSpan);

        // Digital Gantry Sign / Race Clock
        const signGeo = new THREE.PlaneGeometry(12, 1.8);
        const signMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 8.5, 0.62);
        gantryGroup.add(sign);

        // Starting Grid Checkerboard Line
        const startLineGeo = new THREE.PlaneGeometry(trackWidth, 2.5);
        startLineGeo.rotateX(-Math.PI / 2);
        const slCanvas = document.createElement('canvas');
        slCanvas.width = 256;
        slCanvas.height = 64;
        const slCtx = slCanvas.getContext('2d');
        slCtx.fillStyle = '#ffffff';
        slCtx.fillRect(0, 0, 256, 64);
        slCtx.fillStyle = '#111111';
        for (let x = 0; x < 256; x += 32) {
            for (let y = 0; y < 64; y += 32) {
                if ((x / 32 + y / 32) % 2 === 0) {
                    slCtx.fillRect(x, y, 32, 32);
                }
            }
        }
        const slTex = new THREE.CanvasTexture(slCanvas);
        const slMat = new THREE.MeshStandardMaterial({ map: slTex, roughness: 0.6 });
        const startLine = new THREE.Mesh(startLineGeo, slMat);
        startLine.position.set(0, 0.03, 0);
        gantryGroup.add(startLine);

        this.trackGroup.add(gantryGroup);

        // --- 5. STADIUM FLOODLIGHT TOWERS AROUND TRACK ---
        const towerPositions = [
            { x: -50, z: -80 },
            { x: 50, z: -80 },
            { x: 100, z: 20 },
            { x: -100, z: 40 },
            { x: 0, z: 90 },
            { x: -70, z: -40 }
        ];

        towerPositions.forEach(tPos => {
            const tower = new THREE.Group();
            tower.position.set(tPos.x, 0, tPos.z);

            // Tall steel lattice mast
            const mastGeo = new THREE.CylinderGeometry(0.4, 0.7, 26, 8);
            const mastMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
            const mast = new THREE.Mesh(mastGeo, mastMat);
            mast.position.y = 13;
            tower.add(mast);

            // Light rack head
            const rackGeo = new THREE.BoxGeometry(4.5, 2.0, 0.6);
            const rackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const rack = new THREE.Mesh(rackGeo, rackMat);
            rack.position.set(0, 26, 0);
            rack.rotation.x = 0.35;
            tower.add(rack);

            // Bright Floodlight Emissive Panels
            const panelGeo = new THREE.PlaneGeometry(4.2, 1.8);
            const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.set(0, 26, 0.32);
            panel.rotation.x = 0.35;
            tower.add(panel);

            // Actual Point Light casting ground illumination
            const flood = new THREE.PointLight(0xf4f7ff, 2.8, 140, 1.4);
            flood.position.set(0, 25, 3);
            tower.add(flood);

            this.trackGroup.add(tower);
        });

        // --- 6. SLALOM AGILITY CONES IN CENTER DRIFT PAD ---
        const coneGeo = new THREE.ConeGeometry(0.24, 0.65, 16);
        const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.3 });
        for (let i = -4; i <= 4; i++) {
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.set(i * 12, 0.32, -45);
            cone.castShadow = true;
            this.trackGroup.add(cone);

            // White reflective stripe on cone
            const stripeGeo = new THREE.CylinderGeometry(0.16, 0.19, 0.16, 16);
            const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(i * 12, 0.34, -45);
            this.trackGroup.add(stripe);
        }

        // --- 7. NIGHT SKY DOME WITH NEON HORIZON ---
        const skyGeo = new THREE.SphereGeometry(320, 32, 24);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x050811,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.trackGroup.add(sky);

        // Horizon mountain / neon city skyline silhouettes
        const skylineGeo = new THREE.CylinderGeometry(280, 280, 45, 48, 1, true);
        const skylineMat = new THREE.MeshBasicMaterial({
            color: 0x0b101c,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.95
        });
        const skyline = new THREE.Mesh(skylineGeo, skylineMat);
        skyline.position.y = 15;
        this.trackGroup.add(skyline);

        // Track ambient moonlight
        const moonLight = new THREE.DirectionalLight(0x6b8afd, 1.4);
        moonLight.position.set(80, 120, 60);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 1024;
        moonLight.shadow.mapSize.height = 1024;
        this.trackGroup.add(moonLight);

        const trackAmbient = new THREE.HemisphereLight(0x18243b, 0x080c14, 0.75);
        this.trackGroup.add(trackAmbient);
    }

    setMode(mode) {
        this.currentMode = mode;
        if (mode === 'showroom') {
            this.showroomGroup.visible = true;
            this.trackGroup.visible = false;
        } else if (mode === 'drive') {
            this.showroomGroup.visible = false;
            this.trackGroup.visible = true;
        }
    }

    update(dt, carPhysics) {
        if (this.currentMode === 'showroom' && this.turntableAutoRotate && this.turntableMesh) {
            this.turntableAngle += dt * 0.25;
            this.turntableMesh.rotation.y = this.turntableAngle;
        }
    }
}

window.EnvironmentManager = EnvironmentManager;
