/**
 * Procedural Hypercar 3D Model Generator
 * High-detail sports car built entirely with Three.js procedural geometry & materials.
 * Includes detailed chassis, aerodynamic aero kit, scissor doors, full cockpit interior,
 * twin-turbo mid-engine bay, drilled carbon-ceramic brakes, forged alloy wheels, and lighting.
 */

class CarModel {
    constructor() {
        this.group = new THREE.Group();
        this.group.name = "Hypercar";

        // Animated / interactive parts
        this.frontLeftSteerGroup = new THREE.Group();
        this.frontRightSteerGroup = new THREE.Group();
        this.wheelRollGroups = [];
        this.steeringWheelGroup = new THREE.Group();

        // Doors for showroom animation
        this.doorLeft = null;
        this.doorRight = null;
        this.doorsOpenProgress = 0;
        this.targetDoorsOpen = 0; // 0 = closed, 1 = open

        // Engine hood / rear deck
        this.engineCover = null;
        this.hoodOpenProgress = 0;
        this.targetHoodOpen = 0;

        // Lights & Effects
        this.headlights = [];
        this.headlightMeshes = [];
        this.taillightMeshes = [];
        this.brakeLightMeshes = [];
        this.underglowLights = [];
        this.underglowMeshes = [];
        this.headlightsOn = true;
        this.underglowOn = true;
        this.isBraking = false;

        // Dynamic Materials Map
        this.materials = {};

        // Configuration
        this.config = {
            paintColor: 0xdc143c,       // Rosso Corsa
            paintType: 'metallic',      // metallic, gloss, matte, chrome
            caliperColor: 0xffcc00,    // Racing Yellow
            rimColor: 0x1a1a1a,        // Satin Gloss Black
            interiorColor: 0x111111,   // Ebony Black & Alcantara
            accentColor: 0xdc143c,     // Matches paint or contrast
            glassTint: 0x111622,       // Deep smoke
            glassOpacity: 0.88,
            underglowColor: 0x00f0ff   // Electric Cyan
        };

        this._initMaterials();
        this._buildCar();
    }

    _initMaterials() {
        // Body Paint Material (MeshPhysicalMaterial for rich automotive finish)
        this.materials.paint = new THREE.MeshPhysicalMaterial({
            color: this.config.paintColor,
            metalness: 0.82,
            roughness: 0.18,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08,
            reflectivity: 0.9,
            envMapIntensity: 1.5
        });

        // Exposed Carbon Fiber (Diffusers, splitters, side skirts, wing)
        const carbonCanvas = this._generateCarbonTexture();
        const carbonTex = new THREE.CanvasTexture(carbonCanvas);
        carbonTex.wrapS = THREE.RepeatWrapping;
        carbonTex.wrapT = THREE.RepeatWrapping;
        carbonTex.repeat.set(16, 16);

        this.materials.carbon = new THREE.MeshStandardMaterial({
            color: 0x222222,
            map: carbonTex,
            roughness: 0.4,
            metalness: 0.5,
            bumpMap: carbonTex,
            bumpScale: 0.02
        });

        // Matte Dark Trim / Chassis
        this.materials.matteBlack = new THREE.MeshStandardMaterial({
            color: 0x141414,
            roughness: 0.85,
            metalness: 0.2
        });

        // High Gloss Black (Pillars, vents, frames)
        this.materials.glossBlack = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 0.15,
            metalness: 0.8
        });

        // Chrome & Polished Metal (Exhaust tips, badges, accents)
        this.materials.chrome = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0,
            metalness: 0.98,
            roughness: 0.08
        });

        // Titanium Heat-Treated Exhaust (Blue/Purple gradient)
        this.materials.titanium = new THREE.MeshStandardMaterial({
            color: 0x486581,
            metalness: 0.95,
            roughness: 0.25,
            emissive: 0x102a43,
            emissiveIntensity: 0.3
        });

        // Glass Material (Tinted automotive safety glass)
        this.materials.glass = new THREE.MeshPhysicalMaterial({
            color: this.config.glassTint,
            metalness: 0.1,
            roughness: 0.05,
            transmission: 0.72,
            transparent: true,
            opacity: 0.92,
            ior: 1.52,
            reflectivity: 0.95
        });

        // Mirror Glass
        this.materials.mirror = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 1.0,
            roughness: 0.02
        });

        // Tires (Rubber with subtle tread pattern)
        const tireCanvas = this._generateTireTexture();
        const tireTex = new THREE.CanvasTexture(tireCanvas);
        tireTex.wrapS = THREE.RepeatWrapping;
        tireTex.wrapT = THREE.RepeatWrapping;
        tireTex.repeat.set(1, 24);

        this.materials.tire = new THREE.MeshStandardMaterial({
            color: 0x181818,
            roughness: 0.85,
            metalness: 0.05,
            bumpMap: tireTex,
            bumpScale: 0.04
        });

        // Alloy Rims
        this.materials.rim = new THREE.MeshStandardMaterial({
            color: this.config.rimColor,
            metalness: 0.9,
            roughness: 0.2
        });

        // Brake Caliper
        this.materials.caliper = new THREE.MeshStandardMaterial({
            color: this.config.caliperColor,
            metalness: 0.6,
            roughness: 0.3
        });

        // Carbon Ceramic Brake Discs
        const rotorCanvas = this._generateRotorTexture();
        const rotorTex = new THREE.CanvasTexture(rotorCanvas);
        this.materials.brakeDisc = new THREE.MeshStandardMaterial({
            color: 0x999999,
            metalness: 0.85,
            roughness: 0.35,
            map: rotorTex,
            bumpMap: rotorTex,
            bumpScale: 0.03
        });

        // Headlight LEDs (Emissive pure bright white/cyan)
        this.materials.headlightLED = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xddf4ff,
            emissiveIntensity: 2.8,
            roughness: 0.1,
            metalness: 0.8
        });

        // Taillight OLEDs (Emissive intense racing red)
        this.materials.taillightRed = new THREE.MeshStandardMaterial({
            color: 0xff0022,
            emissive: 0xff0022,
            emissiveIntensity: 2.4,
            roughness: 0.2,
            metalness: 0.5
        });

        // Interior Leather / Alcantara
        this.materials.interiorDark = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.88,
            metalness: 0.1
        });

        this.materials.interiorAccent = new THREE.MeshStandardMaterial({
            color: this.config.accentColor,
            roughness: 0.75,
            metalness: 0.15
        });

        // Digital Dashboard Screens (Illuminated UI display)
        this.materials.screenDisplay = new THREE.MeshBasicMaterial({
            color: 0x051829
        });

        // Underglow Neon Material
        this.materials.underglow = new THREE.MeshBasicMaterial({
            color: this.config.underglowColor,
            transparent: true,
            opacity: 0.75
        });
    }

    _generateCarbonTexture() {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = '#2d2d2d';
        for (let y = 0; y < size; y += 8) {
            for (let x = 0; x < size; x += 8) {
                if ((x / 8 + y / 8) % 2 === 0) {
                    ctx.fillRect(x, y, 8, 8);
                }
            }
        }
        return canvas;
    }

    _generateTireTexture() {
        const w = 64, h = 64;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#444444';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#111111';
        // Tire tread channels
        ctx.fillRect(0, 8, w, 6);
        ctx.fillRect(0, 26, w, 12);
        ctx.fillRect(0, 50, w, 6);
        return canvas;
    }

    _generateRotorTexture() {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const cx = size / 2, cy = size / 2;

        // Concentric machining rings
        const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 120);
        grad.addColorStop(0, '#555555');
        grad.addColorStop(0.5, '#bbbbbb');
        grad.addColorStop(1, '#666666');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // Drilled ventilation holes
        ctx.fillStyle = '#1a1a1a';
        for (let r = 45; r < 115; r += 16) {
            const count = Math.floor(r / 3);
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + (r * 0.1);
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                ctx.beginPath();
                ctx.arc(x, y, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        return canvas;
    }

    _buildCar() {
        // Car coordinate system:
        // +Z: Front of car
        // -Z: Rear of car
        // +X: Right side
        // -X: Left side
        // +Y: Up from ground

        this._buildUndertray();
        this._buildBodyTub();
        this._buildFrontEnd();
        this._buildCabinAndGlass();
        this._buildDoors();
        this._buildRearEngineDeck();
        this._buildRearAeroAndExhaust();
        this._buildInterior();
        this._buildMirrors();
        this._buildWheelsAndBrakes();
        this._buildLighting();
    }

    _buildUndertray() {
        const trayGroup = new THREE.Group();
        // Flat aerodynamic carbon undertray with front splitter & side vortex generators
        const trayGeo = new THREE.BoxGeometry(1.88, 0.05, 4.4);
        const trayMesh = new THREE.Mesh(trayGeo, this.materials.carbon);
        trayMesh.position.set(0, 0.14, 0.05);
        trayMesh.castShadow = true;
        trayMesh.receiveShadow = true;
        trayGroup.add(trayMesh);

        // Front splitter blade (extended forward lip)
        const splitterShape = new THREE.Shape();
        splitterShape.moveTo(-0.95, -0.2);
        splitterShape.lineTo(-0.98, 0.25);
        splitterShape.lineTo(-0.7, 0.45);
        splitterShape.lineTo(0.7, 0.45);
        splitterShape.lineTo(0.98, 0.25);
        splitterShape.lineTo(0.95, -0.2);
        splitterShape.closePath();

        const extrudeSettings = { depth: 0.04, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.015, bevelThickness: 0.015 };
        const splitterGeo = new THREE.ExtrudeGeometry(splitterShape, extrudeSettings);
        splitterGeo.rotateX(Math.PI / 2);
        const splitter = new THREE.Mesh(splitterGeo, this.materials.carbon);
        splitter.position.set(0, 0.12, 1.95);
        splitter.castShadow = true;
        trayGroup.add(splitter);

        // Side rocker skirts (aerodynamic edge blades)
        [-0.96, 0.96].forEach(xSide => {
            const skirtGeo = new THREE.BoxGeometry(0.08, 0.06, 2.5);
            const skirt = new THREE.Mesh(skirtGeo, this.materials.carbon);
            skirt.position.set(xSide, 0.14, 0.05);
            trayGroup.add(skirt);

            // Side aerodynamic winglet
            const wingletGeo = new THREE.BoxGeometry(0.04, 0.12, 0.25);
            const winglet = new THREE.Mesh(wingletGeo, this.materials.carbon);
            winglet.position.set(xSide + (xSide > 0 ? 0.04 : -0.04), 0.18, -1.05);
            trayGroup.add(winglet);
        });

        this.group.add(trayGroup);
    }

    _buildBodyTub() {
        const bodyGroup = new THREE.Group();

        // Main lower monocoque tub
        const tubGeo = new THREE.BoxGeometry(1.72, 0.42, 3.8);
        const tub = new THREE.Mesh(tubGeo, this.materials.paint);
        tub.position.set(0, 0.35, 0.05);
        tub.castShadow = true;
        tub.receiveShadow = true;
        bodyGroup.add(tub);

        // Lower side sculpted sills
        [-0.84, 0.84].forEach(x => {
            const sillGeo = new THREE.BoxGeometry(0.2, 0.32, 2.4);
            const sill = new THREE.Mesh(sillGeo, this.materials.paint);
            sill.position.set(x, 0.32, 0.05);
            sill.castShadow = true;
            bodyGroup.add(sill);
        });

        this.group.add(bodyGroup);
    }

    _buildFrontEnd() {
        const frontGroup = new THREE.Group();

        // Low sloped front nose cone
        const noseGeo = new THREE.CylinderGeometry(0.72, 0.95, 1.1, 16);
        noseGeo.rotateX(Math.PI / 2);
        noseGeo.scale(1.0, 0.38, 1.0);
        const nose = new THREE.Mesh(noseGeo, this.materials.paint);
        nose.position.set(0, 0.38, 1.7);
        nose.castShadow = true;
        frontGroup.add(nose);

        // Aggressive aerodynamic hood with recessed central air extraction scoop
        const hoodGeo = new THREE.BoxGeometry(1.48, 0.14, 1.25);
        const hood = new THREE.Mesh(hoodGeo, this.materials.paint);
        hood.position.set(0, 0.49, 1.25);
        hood.rotation.x = 0.12;
        hood.castShadow = true;
        frontGroup.add(hood);

        // Twin aerodynamic hood air extractors / vents (black carbon recesses)
        [-0.32, 0.32].forEach(x => {
            const ventGeo = new THREE.BoxGeometry(0.24, 0.05, 0.55);
            const vent = new THREE.Mesh(ventGeo, this.materials.matteBlack);
            vent.position.set(x, 0.53, 1.25);
            vent.rotation.x = 0.15;
            vent.rotation.y = (x > 0 ? 0.08 : -0.08);
            frontGroup.add(vent);

            // Vent louver fins
            for (let i = -0.18; i <= 0.18; i += 0.09) {
                const finGeo = new THREE.BoxGeometry(0.22, 0.015, 0.03);
                const fin = new THREE.Mesh(finGeo, this.materials.carbon);
                fin.position.set(x, 0.54, 1.25 + i);
                fin.rotation.x = 0.4;
                frontGroup.add(fin);
            }
        });

        // Front bumper fascia & wide hexagonal radiator intakes
        const centerGrilleGeo = new THREE.BoxGeometry(0.9, 0.22, 0.2);
        const centerGrille = new THREE.Mesh(centerGrilleGeo, this.materials.matteBlack);
        centerGrille.position.set(0, 0.26, 2.16);
        frontGroup.add(centerGrille);

        // Side cooling brake ducts
        [-0.68, 0.68].forEach(x => {
            const ductGeo = new THREE.BoxGeometry(0.38, 0.2, 0.18);
            const duct = new THREE.Mesh(ductGeo, this.materials.matteBlack);
            duct.position.set(x, 0.26, 2.12);
            duct.rotation.y = (x > 0 ? -0.22 : 0.22);
            frontGroup.add(duct);

            // Front canards (aerodynamic dive planes)
            const canardGeo = new THREE.BoxGeometry(0.22, 0.02, 0.18);
            const canard = new THREE.Mesh(canardGeo, this.materials.carbon);
            canard.position.set(x + (x > 0 ? 0.18 : -0.18), 0.36, 2.05);
            canard.rotation.z = (x > 0 ? 0.2 : -0.2);
            frontGroup.add(canard);
        });

        // Front sculpted flared fenders
        [-0.88, 0.88].forEach(x => {
            const fenderGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.26, 16, 1, false, 0, Math.PI);
            fenderGeo.rotateZ(Math.PI / 2);
            fenderGeo.scale(1.0, 1.0, 1.2);
            const fender = new THREE.Mesh(fenderGeo, this.materials.paint);
            fender.position.set(x, 0.44, 1.4);
            fender.castShadow = true;
            frontGroup.add(fender);
        });

        // Supercar emblem on nose tip
        const badgeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.015, 12);
        badgeGeo.rotateX(Math.PI / 2);
        const badge = new THREE.Mesh(badgeGeo, this.materials.chrome);
        badge.position.set(0, 0.42, 2.15);
        frontGroup.add(badge);

        this.group.add(frontGroup);
    }

    _buildCabinAndGlass() {
        const cabinGroup = new THREE.Group();

        // Sleek aerodynamic teardrop greenhouse cockpit roof
        const roofGeo = new THREE.BoxGeometry(1.22, 0.06, 1.35);
        const roof = new THREE.Mesh(roofGeo, this.materials.carbon);
        roof.position.set(0, 1.05, -0.15);
        roof.castShadow = true;
        cabinGroup.add(roof);

        // Roof aerodynamic intake snorkel / air scoop
        const scoopGeo = new THREE.BoxGeometry(0.35, 0.08, 0.6);
        const scoop = new THREE.Mesh(scoopGeo, this.materials.carbon);
        scoop.position.set(0, 1.09, -0.2);
        cabinGroup.add(scoop);

        // Windshield (Curved, steep rake angle)
        const windshieldGeo = new THREE.PlaneGeometry(1.28, 0.85);
        const windshield = new THREE.Mesh(windshieldGeo, this.materials.glass);
        windshield.position.set(0, 0.82, 0.48);
        windshield.rotation.x = -Math.PI / 3.4;
        windshield.castShadow = false;
        cabinGroup.add(windshield);

        // Black ceramic frit border on windshield
        const fritGeo = new THREE.PlaneGeometry(1.3, 0.87);
        const frit = new THREE.Mesh(fritGeo, this.materials.glossBlack);
        frit.position.set(0, 0.819, 0.479);
        frit.rotation.x = -Math.PI / 3.4;
        frit.scale.set(0.98, 0.98, 0.98);
        // Add subtle frame
        cabinGroup.add(frit);

        // A-Pillars (Ultra-high-strength carbon composites)
        [-0.62, 0.62].forEach(x => {
            const pillarGeo = new THREE.BoxGeometry(0.06, 0.8, 0.08);
            const pillar = new THREE.Mesh(pillarGeo, this.materials.carbon);
            pillar.position.set(x, 0.8, 0.48);
            pillar.rotation.x = 0.58;
            pillar.rotation.y = (x > 0 ? -0.12 : 0.12);
            cabinGroup.add(pillar);
        });

        // B / C-Pillars (Rear roof fly-butresses creating air channels to rear spoiler)
        [-0.58, 0.58].forEach(x => {
            const buttressGeo = new THREE.BoxGeometry(0.07, 0.7, 0.12);
            const buttress = new THREE.Mesh(buttressGeo, this.materials.paint);
            buttress.position.set(x, 0.8, -0.8);
            buttress.rotation.x = -0.52;
            buttress.rotation.z = (x > 0 ? -0.18 : 0.18);
            buttress.castShadow = true;
            cabinGroup.add(buttress);
        });

        // Windshield wiper
        const wiperGeo = new THREE.BoxGeometry(0.65, 0.02, 0.02);
        const wiper = new THREE.Mesh(wiperGeo, this.materials.matteBlack);
        wiper.position.set(0.12, 0.58, 0.78);
        wiper.rotation.x = -0.65;
        wiper.rotation.z = 0.15;
        cabinGroup.add(wiper);

        this.group.add(cabinGroup);
    }

    _buildDoors() {
        // Left and Right Dihedral / Scissor Doors
        // Pivoting from forward hinge point on A-pillar base
        this.doorLeft = new THREE.Group();
        this.doorRight = new THREE.Group();

        // Left Door hinge at [ -0.84, 0.45, 0.65 ]
        this.doorLeft.position.set(-0.82, 0.45, 0.65);
        // Right Door hinge at [ 0.84, 0.45, 0.65 ]
        this.doorRight.position.set(0.82, 0.45, 0.65);

        // Build door geometry relative to hinge
        [-1, 1].forEach(side => {
            const doorGroup = side === -1 ? this.doorLeft : this.doorRight;

            // Outer door body panel with sculpted side intake scallop
            const panelGeo = new THREE.BoxGeometry(0.12, 0.42, 1.25);
            const panel = new THREE.Mesh(panelGeo, this.materials.paint);
            panel.position.set(0, 0.0, -0.55);
            panel.castShadow = true;
            doorGroup.add(panel);

            // Door handle (flush aerodynamic capacitive touch bar)
            const handleGeo = new THREE.BoxGeometry(0.02, 0.03, 0.14);
            const handle = new THREE.Mesh(handleGeo, this.materials.glossBlack);
            handle.position.set(side * 0.065, 0.12, -0.9);
            doorGroup.add(handle);

            // Door Side Window
            const winGeo = new THREE.PlaneGeometry(0.95, 0.38);
            const win = new THREE.Mesh(winGeo, this.materials.glass);
            win.position.set(side * 0.02, 0.35, -0.52);
            win.rotation.y = side * Math.PI / 2;
            win.rotation.x = side * 0.16; // Tumblehome slant
            doorGroup.add(win);

            // Window frame trim
            const frameGeo = new THREE.BoxGeometry(0.04, 0.42, 0.04);
            const frame = new THREE.Mesh(frameGeo, this.materials.glossBlack);
            frame.position.set(0, 0.35, -1.02);
            doorGroup.add(frame);

            // Interior door card
            const interiorCardGeo = new THREE.BoxGeometry(0.06, 0.38, 1.15);
            const interiorCard = new THREE.Mesh(interiorCardGeo, this.materials.interiorDark);
            interiorCard.position.set(-side * 0.04, 0.0, -0.55);
            doorGroup.add(interiorCard);

            // Accent leather door pull & trim
            const stripGeo = new THREE.BoxGeometry(0.01, 0.04, 0.6);
            const strip = new THREE.Mesh(stripGeo, this.materials.interiorAccent);
            strip.position.set(-side * 0.075, 0.05, -0.55);
            doorGroup.add(strip);
        });

        this.group.add(this.doorLeft);
        this.group.add(this.doorRight);

        // Huge side radiator intake scoops behind the doors
        [-0.88, 0.88].forEach(x => {
            const scoopGeo = new THREE.BoxGeometry(0.18, 0.36, 0.55);
            const scoop = new THREE.Mesh(scoopGeo, this.materials.carbon);
            scoop.position.set(x, 0.44, -0.7);
            this.group.add(scoop);

            // Intake mesh screen inside scoop
            const meshGeo = new THREE.PlaneGeometry(0.16, 0.32);
            const intakeMesh = new THREE.Mesh(meshGeo, this.materials.matteBlack);
            intakeMesh.position.set(x + (x > 0 ? -0.05 : 0.05), 0.44, -0.55);
            intakeMesh.rotation.y = (x > 0 ? -0.4 : 0.4);
            this.group.add(intakeMesh);
        });
    }

    _buildRearEngineDeck() {
        const engineGroup = new THREE.Group();

        // Rear quarter flared muscular fenders
        [-0.92, 0.92].forEach(x => {
            const fenderGeo = new THREE.CylinderGeometry(0.44, 0.48, 0.3, 16, 1, false, 0, Math.PI);
            fenderGeo.rotateZ(Math.PI / 2);
            fenderGeo.scale(1.0, 1.0, 1.25);
            const fender = new THREE.Mesh(fenderGeo, this.materials.paint);
            fender.position.set(x, 0.48, -1.3);
            fender.castShadow = true;
            engineGroup.add(fender);
        });

        // Engine bay perimeter frame
        const frameGeo = new THREE.BoxGeometry(1.35, 0.28, 1.4);
        const frame = new THREE.Mesh(frameGeo, this.materials.paint);
        frame.position.set(0, 0.62, -1.25);
        frame.castShadow = true;
        engineGroup.add(frame);

        // Rear transparent glass engine cover with aerodynamic cooling louvers
        this.engineCover = new THREE.Group();
        this.engineCover.position.set(0, 0.76, -0.55); // Hinge near roof

        const coverGlassGeo = new THREE.PlaneGeometry(1.0, 1.25);
        const coverGlass = new THREE.Mesh(coverGlassGeo, this.materials.glass);
        coverGlass.position.set(0, 0, -0.6);
        coverGlass.rotation.x = -Math.PI / 2.3;
        this.engineCover.add(coverGlass);

        // Glass louver fins (heat extractors)
        for (let z = -0.25; z >= -0.95; z -= 0.16) {
            const louverGeo = new THREE.BoxGeometry(0.85, 0.015, 0.08);
            const louver = new THREE.Mesh(louverGeo, this.materials.carbon);
            louver.position.set(0, 0.03 + (z * 0.15), z);
            louver.rotation.x = -0.3;
            this.engineCover.add(louver);
        }

        engineGroup.add(this.engineCover);

        // Detailed Procedural Twin-Turbo V8 Engine underneath the glass!
        const v8Bay = new THREE.Group();
        v8Bay.position.set(0, 0.42, -1.15);

        // Engine block (Matte cast aluminum)
        const blockGeo = new THREE.BoxGeometry(0.55, 0.28, 0.65);
        const block = new THREE.Mesh(blockGeo, this.materials.matteBlack);
        v8Bay.add(block);

        // Dual Cylinder Heads / Red Anodized Valve Covers
        [-0.18, 0.18].forEach(x => {
            const headGeo = new THREE.BoxGeometry(0.18, 0.12, 0.6);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xcc1122, roughness: 0.3, metalness: 0.6 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.set(x, 0.16, 0);
            head.rotation.z = (x > 0 ? 0.35 : -0.35);
            v8Bay.add(head);

            // Carbon intake runners / plenum manifolds
            const runnerGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
            runnerGeo.rotateX(Math.PI / 2);
            const runner = new THREE.Mesh(runnerGeo, this.materials.carbon);
            runner.position.set(x * 0.5, 0.22, 0);
            v8Bay.add(runner);
        });

        // Twin turbochargers
        [-0.26, 0.26].forEach(x => {
            const turboGeo = new THREE.TorusGeometry(0.07, 0.035, 8, 16);
            const turbo = new THREE.Mesh(turboGeo, this.materials.titanium);
            turbo.position.set(x, 0.05, -0.35);
            v8Bay.add(turbo);
        });

        // Structural Carbon X-Brace over engine bay
        const braceMat = this.materials.carbon;
        const brace1Geo = new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8);
        brace1Geo.rotateZ(0.7);
        const brace1 = new THREE.Mesh(brace1Geo, braceMat);
        brace1.position.set(0, 0.28, 0);
        v8Bay.add(brace1);

        const brace2Geo = new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8);
        brace2Geo.rotateZ(-0.7);
        const brace2 = new THREE.Mesh(brace2Geo, braceMat);
        brace2.position.set(0, 0.28, 0);
        v8Bay.add(brace2);

        engineGroup.add(v8Bay);
        this.group.add(engineGroup);
    }

    _buildRearAeroAndExhaust() {
        const rearGroup = new THREE.Group();

        // Rear deck trailing lip
        const deckLipGeo = new THREE.BoxGeometry(1.68, 0.12, 0.45);
        const deckLip = new THREE.Mesh(deckLipGeo, this.materials.paint);
        deckLip.position.set(0, 0.62, -1.95);
        deckLip.castShadow = true;
        rearGroup.add(deckLip);

        // Massive High-Downforce Active Aero Rear Wing / Spoiler
        const wingGroup = new THREE.Group();
        wingGroup.position.set(0, 0.88, -1.98);

        // Aerofoil main plane
        const wingMainGeo = new THREE.BoxGeometry(1.85, 0.04, 0.35);
        const wingMain = new THREE.Mesh(wingMainGeo, this.materials.carbon);
        wingMain.rotation.x = 0.08; // Downforce angle of attack
        wingMain.castShadow = true;
        wingGroup.add(wingMain);

        // Wing endplates
        [-0.92, 0.92].forEach(x => {
            const endplateGeo = new THREE.BoxGeometry(0.02, 0.18, 0.38);
            const endplate = new THREE.Mesh(endplateGeo, this.materials.carbon);
            endplate.position.set(x, 0.02, 0);
            wingGroup.add(endplate);
        });

        // Twin Swan-Neck titanium mounting pylons
        [-0.42, 0.42].forEach(x => {
            const pylonGeo = new THREE.BoxGeometry(0.025, 0.28, 0.18);
            const pylon = new THREE.Mesh(pylonGeo, this.materials.chrome);
            pylon.position.set(x, -0.12, -0.02);
            pylon.rotation.x = -0.15;
            wingGroup.add(pylon);
        });

        rearGroup.add(wingGroup);

        // Rear Bumper / Fascia with massive heat evacuation honeycomb mesh
        const rearMeshGeo = new THREE.BoxGeometry(1.5, 0.26, 0.08);
        const rearMesh = new THREE.Mesh(rearMeshGeo, this.materials.matteBlack);
        rearMesh.position.set(0, 0.42, -2.15);
        rearGroup.add(rearMesh);

        // Aggressive Venturi Tunnel Rear Diffuser
        const diffuserGeo = new THREE.BoxGeometry(1.72, 0.12, 0.6);
        const diffuser = new THREE.Mesh(diffuserGeo, this.materials.carbon);
        diffuser.position.set(0, 0.22, -1.95);
        diffuser.rotation.x = -0.15;
        rearGroup.add(diffuser);

        // 6 Vertical Diffuser Strakes / Vortex Fins
        for (let x = -0.7; x <= 0.71; x += 0.28) {
            const finGeo = new THREE.BoxGeometry(0.02, 0.16, 0.55);
            const fin = new THREE.Mesh(finGeo, this.materials.carbon);
            fin.position.set(x, 0.18, -1.98);
            fin.rotation.x = -0.15;
            rearGroup.add(fin);
        }

        // Quad Center-Exit Titanium Exhaust Tips with Heat Bluing & Inner Glow
        [-0.14, -0.045, 0.045, 0.14].forEach(x => {
            const pipeGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.22, 16);
            pipeGeo.rotateX(Math.PI / 2);
            const pipe = new THREE.Mesh(pipeGeo, this.materials.titanium);
            pipe.position.set(x, 0.44, -2.18);
            rearGroup.add(pipe);

            // Glowing inner exhaust flame ring
            const innerGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.05, 12);
            innerGeo.rotateX(Math.PI / 2);
            const innerMat = new THREE.MeshBasicMaterial({ color: 0x2266ff });
            const inner = new THREE.Mesh(innerGeo, innerMat);
            inner.position.set(x, 0.44, -2.16);
            rearGroup.add(inner);
        });

        // Rear central brake light (Formula 1 rain light style)
        const rainLightGeo = new THREE.BoxGeometry(0.08, 0.04, 0.02);
        const rainLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const rainLight = new THREE.Mesh(rainLightGeo, rainLightMat);
        rainLight.position.set(0, 0.18, -2.22);
        rearGroup.add(rainLight);

        this.group.add(rearGroup);
    }

    _buildInterior() {
        const interiorGroup = new THREE.Group();

        // Cockpit tub interior floor
        const floorGeo = new THREE.BoxGeometry(1.2, 0.05, 1.4);
        const floor = new THREE.Mesh(floorGeo, this.materials.interiorDark);
        floor.position.set(0, 0.2, 0.0);
        interiorGroup.add(floor);

        // Center console tunnel
        const tunnelGeo = new THREE.BoxGeometry(0.24, 0.28, 1.2);
        const tunnel = new THREE.Mesh(tunnelGeo, this.materials.carbon);
        tunnel.position.set(0, 0.32, 0.05);
        interiorGroup.add(tunnel);

        // Center console buttons & start engine button
        const startBtnGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.015, 12);
        const startBtnMat = new THREE.MeshStandardMaterial({ color: 0xee0000, emissive: 0xee0000, emissiveIntensity: 0.6 });
        const startBtn = new THREE.Mesh(startBtnGeo, startBtnMat);
        startBtn.position.set(0, 0.465, 0.15);
        interiorGroup.add(startBtn);

        // Dual Racing Bucket Seats (Carbon Fiber Shell + Leather Inserts)
        [-0.34, 0.34].forEach(x => {
            const seatGroup = new THREE.Group();
            seatGroup.position.set(x, 0.22, -0.2);

            // Seat base cushion
            const baseGeo = new THREE.BoxGeometry(0.38, 0.12, 0.42);
            const base = new THREE.Mesh(baseGeo, this.materials.interiorDark);
            base.position.set(0, 0.08, 0);
            seatGroup.add(base);

            // Seat base leather insert
            const insertGeo = new THREE.BoxGeometry(0.28, 0.04, 0.38);
            const insert = new THREE.Mesh(insertGeo, this.materials.interiorAccent);
            insert.position.set(0, 0.13, 0);
            seatGroup.add(insert);

            // Seat backrest (raked back)
            const backGeo = new THREE.BoxGeometry(0.38, 0.52, 0.1);
            const back = new THREE.Mesh(backGeo, this.materials.interiorDark);
            back.position.set(0, 0.36, -0.22);
            back.rotation.x = -0.25;
            seatGroup.add(back);

            // Seat backrest accent
            const backAccentGeo = new THREE.BoxGeometry(0.24, 0.46, 0.04);
            const backAccent = new THREE.Mesh(backAccentGeo, this.materials.interiorAccent);
            backAccent.position.set(0, 0.36, -0.19);
            backAccent.rotation.x = -0.25;
            seatGroup.add(backAccent);

            // Headrest with embossed logo
            const headrestGeo = new THREE.BoxGeometry(0.22, 0.16, 0.08);
            const headrest = new THREE.Mesh(headrestGeo, this.materials.interiorDark);
            headrest.position.set(0, 0.64, -0.29);
            headrest.rotation.x = -0.25;
            seatGroup.add(headrest);

            // Carbon seat back shell
            const shellGeo = new THREE.BoxGeometry(0.4, 0.68, 0.02);
            const shell = new THREE.Mesh(shellGeo, this.materials.carbon);
            shell.position.set(0, 0.42, -0.26);
            shell.rotation.x = -0.25;
            seatGroup.add(shell);

            // 4-point racing harness belts
            [-0.08, 0.08].forEach(beltX => {
                const beltGeo = new THREE.BoxGeometry(0.035, 0.5, 0.01);
                const beltMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
                const belt = new THREE.Mesh(beltGeo, beltMat);
                belt.position.set(beltX, 0.35, -0.17);
                belt.rotation.x = -0.25;
                seatGroup.add(belt);
            });

            interiorGroup.add(seatGroup);
        });

        // Sculpted Dashboard
        const dashGeo = new THREE.BoxGeometry(1.22, 0.22, 0.45);
        const dash = new THREE.Mesh(dashGeo, this.materials.interiorDark);
        dash.position.set(0, 0.62, 0.42);
        interiorGroup.add(dash);

        // Center touchscreen infotainment panel
        const screenGeo = new THREE.PlaneGeometry(0.24, 0.16);
        const screen = new THREE.Mesh(screenGeo, this.materials.screenDisplay);
        screen.position.set(0, 0.58, 0.58);
        screen.rotation.x = -0.3;
        interiorGroup.add(screen);

        // Driver Instrument Binnacle (Left Hand Drive at X = -0.34)
        const binnacleGeo = new THREE.BoxGeometry(0.32, 0.14, 0.2);
        const binnacle = new THREE.Mesh(binnacleGeo, this.materials.carbon);
        binnacle.position.set(-0.34, 0.72, 0.38);
        interiorGroup.add(binnacle);

        // Driver Digital Gauge Screen
        const gaugeScreenGeo = new THREE.PlaneGeometry(0.26, 0.1);
        const gaugeScreenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const gaugeScreen = new THREE.Mesh(gaugeScreenGeo, gaugeScreenMat);
        gaugeScreen.position.set(-0.34, 0.72, 0.47);
        gaugeScreen.rotation.x = -0.15;
        interiorGroup.add(gaugeScreen);

        // Sport Steering Wheel Group (turns with input)
        this.steeringWheelGroup.position.set(-0.34, 0.68, 0.26);
        this.steeringWheelGroup.rotation.x = 0.35;

        // Steering column
        const columnGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.18, 12);
        columnGeo.rotateX(Math.PI / 2);
        const column = new THREE.Mesh(columnGeo, this.materials.matteBlack);
        column.position.set(0, 0, 0.08);
        this.steeringWheelGroup.add(column);

        // Flat-bottom racing wheel rim
        const wheelRimGeo = new THREE.TorusGeometry(0.14, 0.018, 12, 24);
        const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const wheelRim = new THREE.Mesh(wheelRimGeo, wheelRimMat);
        this.steeringWheelGroup.add(wheelRim);

        // Center hub & carbon spokes
        const hubGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16);
        hubGeo.rotateX(Math.PI / 2);
        const hub = new THREE.Mesh(hubGeo, this.materials.carbon);
        this.steeringWheelGroup.add(hub);

        // Badge on steering wheel
        const wheelBadgeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.022, 12);
        wheelBadgeGeo.rotateX(Math.PI / 2);
        const wheelBadge = new THREE.Mesh(wheelBadgeGeo, this.materials.chrome);
        this.steeringWheelGroup.add(wheelBadge);

        // Paddle shifters (Aluminum)
        [-0.1, 0.1].forEach(px => {
            const paddleGeo = new THREE.BoxGeometry(0.02, 0.08, 0.01);
            const paddle = new THREE.Mesh(paddleGeo, this.materials.chrome);
            paddle.position.set(px, 0.03, 0.02);
            paddle.rotation.z = (px > 0 ? -0.2 : 0.2);
            this.steeringWheelGroup.add(paddle);
        });

        // LED Shift Light Bar atop steering wheel
        const shiftLightGeo = new THREE.BoxGeometry(0.08, 0.01, 0.01);
        const shiftLightMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
        const shiftLight = new THREE.Mesh(shiftLightGeo, shiftLightMat);
        shiftLight.position.set(0, 0.135, 0.01);
        this.steeringWheelGroup.add(shiftLight);

        interiorGroup.add(this.steeringWheelGroup);

        // Driver foot pedals (Aluminum sport drilled pedals)
        [-0.38, -0.34, -0.30].forEach((px, idx) => {
            const pedalGeo = new THREE.BoxGeometry(0.03, 0.06, 0.01);
            const pedal = new THREE.Mesh(pedalGeo, this.materials.chrome);
            pedal.position.set(px, 0.28, 0.68);
            pedal.rotation.x = -0.5;
            interiorGroup.add(pedal);
        });

        // Interior Rearview Mirror
        const mirrorGeo = new THREE.BoxGeometry(0.18, 0.05, 0.02);
        const mirror = new THREE.Mesh(mirrorGeo, this.materials.mirror);
        mirror.position.set(0, 0.96, 0.35);
        interiorGroup.add(mirror);

        this.group.add(interiorGroup);
    }

    _buildMirrors() {
        [-0.88, 0.88].forEach(x => {
            const mirrorGroup = new THREE.Group();
            mirrorGroup.position.set(x, 0.68, 0.45);

            // Aerodynamic carbon stalk
            const stalkGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.18, 8);
            stalkGeo.rotateZ(x > 0 ? -0.8 : 0.8);
            const stalk = new THREE.Mesh(stalkGeo, this.materials.carbon);
            mirrorGroup.add(stalk);

            // Mirror housing
            const houseGeo = new THREE.BoxGeometry(0.18, 0.09, 0.12);
            const house = new THREE.Mesh(houseGeo, this.materials.paint);
            house.position.set(x > 0 ? 0.12 : -0.12, 0.06, -0.04);
            house.rotation.y = (x > 0 ? -0.2 : 0.2);
            house.castShadow = true;
            mirrorGroup.add(house);

            // Mirror glass surface
            const glassGeo = new THREE.PlaneGeometry(0.15, 0.07);
            const glass = new THREE.Mesh(glassGeo, this.materials.mirror);
            glass.position.set(x > 0 ? 0.12 : -0.12, 0.06, -0.1);
            glass.rotation.y = (x > 0 ? Math.PI - 0.2 : -Math.PI + 0.2);
            mirrorGroup.add(glass);

            // Integrated LED indicator strip
            const stripGeo = new THREE.BoxGeometry(0.12, 0.015, 0.02);
            const strip = new THREE.Mesh(stripGeo, this.materials.headlightLED);
            strip.position.set(x > 0 ? 0.12 : -0.12, 0.06, 0.02);
            mirrorGroup.add(strip);

            this.group.add(mirrorGroup);
        });
    }

    _buildWheelsAndBrakes() {
        // Front axle: Z = 1.38, Rear axle: Z = -1.35
        // Track width: X = ±0.88
        const wheelPositions = [
            { x: -0.88, y: 0.35, z: 1.38, isFront: true, isLeft: true },
            { x: 0.88, y: 0.35, z: 1.38, isFront: true, isLeft: false },
            { x: -0.90, y: 0.36, z: -1.35, isFront: false, isLeft: true },
            { x: 0.90, y: 0.36, z: -1.35, isFront: false, isLeft: false }
        ];

        wheelPositions.forEach(pos => {
            // Steering group for front wheels
            let parentNode = this.group;
            if (pos.isFront) {
                const steerGroup = pos.isLeft ? this.frontLeftSteerGroup : this.frontRightSteerGroup;
                steerGroup.position.set(pos.x, pos.y, pos.z);
                this.group.add(steerGroup);
                parentNode = steerGroup;
            }

            // Stationary Brake Assembly (doesn't roll with tire, but steers with front)
            const brakeGroup = new THREE.Group();
            if (!pos.isFront) {
                brakeGroup.position.set(pos.x, pos.y, pos.z);
                this.group.add(brakeGroup);
            } else {
                parentNode.add(brakeGroup);
            }

            // Drilled Carbon-Ceramic Brake Rotor Disc
            const rotorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.025, 24);
            rotorGeo.rotateZ(Math.PI / 2);
            const rotor = new THREE.Mesh(rotorGeo, this.materials.brakeDisc);
            rotor.position.set(pos.isFront ? (pos.isLeft ? 0.03 : -0.03) : (pos.isLeft ? pos.x + 0.03 : pos.x - 0.03), pos.isFront ? 0 : pos.y, pos.isFront ? 0 : pos.z);
            if (pos.isFront) {
                brakeGroup.add(rotor);
            } else {
                brakeGroup.add(rotor);
            }

            // 6-Piston High Performance Brake Caliper (Brembo style)
            const caliperGeo = new THREE.BoxGeometry(0.065, 0.16, 0.12);
            const caliper = new THREE.Mesh(caliperGeo, this.materials.caliper);
            const caliperX = pos.isFront ? (pos.isLeft ? 0.025 : -0.025) : (pos.isLeft ? pos.x + 0.025 : pos.x - 0.025);
            caliper.position.set(caliperX, (pos.isFront ? 0 : pos.y) + 0.11, (pos.isFront ? 0 : pos.z) + 0.08);
            caliper.rotation.x = -0.4;
            brakeGroup.add(caliper);

            // Caliper brand badge
            const calBadgeGeo = new THREE.BoxGeometry(0.005, 0.04, 0.08);
            const calBadge = new THREE.Mesh(calBadgeGeo, this.materials.chrome);
            calBadge.position.set(pos.isLeft ? caliperX - 0.033 : caliperX + 0.033, (pos.isFront ? 0 : pos.y) + 0.11, (pos.isFront ? 0 : pos.z) + 0.08);
            brakeGroup.add(calBadge);

            // Rolling Wheel Group (Rolls around local X axis!)
            const rollGroup = new THREE.Group();
            if (!pos.isFront) {
                rollGroup.position.set(pos.x, pos.y, pos.z);
                this.group.add(rollGroup);
            } else {
                parentNode.add(rollGroup);
            }
            this.wheelRollGroups.push(rollGroup);

            // Tire (Low-profile high-performance compound)
            const tireRadius = pos.isFront ? 0.35 : 0.37;
            const tireWidth = pos.isFront ? 0.24 : 0.30;
            const tireGeo = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 32);
            tireGeo.rotateZ(Math.PI / 2);
            const tire = new THREE.Mesh(tireGeo, this.materials.tire);
            tire.castShadow = true;
            tire.receiveShadow = true;
            rollGroup.add(tire);

            // Forged Alloy Wheel Rim
            const rimRadius = tireRadius * 0.74;
            const rimBarrelGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth * 0.9, 24, 1, true);
            rimBarrelGeo.rotateZ(Math.PI / 2);
            const rimBarrel = new THREE.Mesh(rimBarrelGeo, this.materials.rim);
            rollGroup.add(rimBarrel);

            // Center Wheel Hub with Brand Logo
            const hubOuterX = pos.isLeft ? -tireWidth * 0.46 : tireWidth * 0.46;
            const hubGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.03, 16);
            hubGeo.rotateZ(Math.PI / 2);
            const wheelHub = new THREE.Mesh(hubGeo, this.materials.rim);
            wheelHub.position.x = hubOuterX;
            rollGroup.add(wheelHub);

            // Center lock nut
            const nutGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.04, 6);
            nutGeo.rotateZ(Math.PI / 2);
            const nutMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, metalness: 0.9 });
            const nut = new THREE.Mesh(nutGeo, nutMat);
            nut.position.x = hubOuterX + (pos.isLeft ? -0.01 : 0.01);
            rollGroup.add(nut);

            // 10-Spoke Lightweight Turbine Rims (5 double-spokes)
            const spokeCount = 10;
            for (let i = 0; i < spokeCount; i++) {
                const angle = (i / spokeCount) * Math.PI * 2;
                const spokeGeo = new THREE.BoxGeometry(0.02, rimRadius * 0.85, 0.025);
                const spoke = new THREE.Mesh(spokeGeo, this.materials.rim);
                spoke.position.set(
                    hubOuterX + (pos.isLeft ? 0.015 : -0.015),
                    Math.sin(angle) * (rimRadius * 0.45),
                    Math.cos(angle) * (rimRadius * 0.45)
                );
                spoke.rotation.x = angle;
                spoke.rotation.y = (pos.isLeft ? -0.1 : 0.1); // Directional turbine bevel
                rollGroup.add(spoke);
            }
        });
    }

    _buildLighting() {
        // --- FRONT HEADLIGHTS ---
        [-0.64, 0.64].forEach(x => {
            // Polycarbonate angular headlight lens housing
            const housingGeo = new THREE.BoxGeometry(0.24, 0.1, 0.35);
            const housing = new THREE.Mesh(housingGeo, this.materials.glossBlack);
            housing.position.set(x, 0.48, 1.9);
            housing.rotation.y = (x > 0 ? -0.25 : 0.25);
            housing.rotation.x = -0.12;
            this.group.add(housing);

            // Outer lens cover
            const lensGeo = new THREE.PlaneGeometry(0.22, 0.09);
            const lens = new THREE.Mesh(lensGeo, this.materials.glass);
            lens.position.set(x, 0.48, 2.08);
            lens.rotation.y = (x > 0 ? -0.25 : 0.25);
            this.group.add(lens);

            // Twin LED Projector Spheres
            [-0.05, 0.05].forEach(ox => {
                const ledGeo = new THREE.SphereGeometry(0.032, 12, 12);
                const led = new THREE.Mesh(ledGeo, this.materials.headlightLED);
                led.position.set(x + ox, 0.48, 2.0);
                this.group.add(led);
                this.headlightMeshes.push(led);
            });

            // Sweeping DRL (Daytime Running Light) Neon Blade
            const drlGeo = new THREE.BoxGeometry(0.2, 0.015, 0.02);
            const drl = new THREE.Mesh(drlGeo, this.materials.headlightLED);
            drl.position.set(x, 0.44, 2.05);
            drl.rotation.y = (x > 0 ? -0.25 : 0.25);
            drl.rotation.z = (x > 0 ? 0.15 : -0.15);
            this.group.add(drl);
            this.headlightMeshes.push(drl);

            // Real Three.js SpotLight projecting road beam
            const spot = new THREE.SpotLight(0xf0f6ff, 3.5);
            spot.position.set(x, 0.5, 2.05);
            spot.angle = 0.55;
            spot.penumbra = 0.4;
            spot.decay = 1.8;
            spot.distance = 55;
            spot.castShadow = true;
            spot.shadow.mapSize.width = 512;
            spot.shadow.mapSize.height = 512;

            // Light target out in front of car
            const target = new THREE.Object3D();
            target.position.set(x * 0.5, 0.0, 25);
            this.group.add(target);
            spot.target = target;

            this.group.add(spot);
            this.headlights.push(spot);
        });

        // --- REAR FULL-WIDTH CYBER LIGHT BAR ---
        const rearBarGeo = new THREE.BoxGeometry(1.64, 0.038, 0.06);
        const rearBar = new THREE.Mesh(rearBarGeo, this.materials.taillightRed);
        rearBar.position.set(0, 0.62, -2.14);
        this.group.add(rearBar);
        this.taillightMeshes.push(rearBar);
        this.brakeLightMeshes.push(rearBar);

        // Lower dynamic brake light strips
        [-0.55, 0.55].forEach(x => {
            const brakeStripGeo = new THREE.BoxGeometry(0.35, 0.025, 0.04);
            const brakeStrip = new THREE.Mesh(brakeStripGeo, this.materials.taillightRed);
            brakeStrip.position.set(x, 0.54, -2.15);
            this.group.add(brakeStrip);
            this.brakeLightMeshes.push(brakeStrip);
        });

        // --- UNDERGLOW NEON SYSTEM ---
        const underglowPoints = [
            { x: 0, z: 1.5, w: 1.2, h: 0.1 },   // Front
            { x: 0, z: -1.4, w: 1.2, h: 0.1 },  // Rear
            { x: -0.85, z: 0.0, w: 0.1, h: 2.6 }, // Left
            { x: 0.85, z: 0.0, w: 0.1, h: 2.6 }   // Right
        ];

        underglowPoints.forEach(p => {
            const ugGeo = new THREE.PlaneGeometry(p.w, p.h);
            ugGeo.rotateX(-Math.PI / 2);
            const ug = new THREE.Mesh(ugGeo, this.materials.underglow);
            ug.position.set(p.x, 0.06, p.z);
            this.group.add(ug);
            this.underglowMeshes.push(ug);
        });

        // Real underglow soft point lights
        [-0.7, 0.7].forEach(x => {
            const pt = new THREE.PointLight(this.config.underglowColor, 1.2, 3.2);
            pt.position.set(x, 0.08, 0);
            this.group.add(pt);
            this.underglowLights.push(pt);
        });
    }

    // --- INTERACTIVE & DYNAMIC CONTROLS ---

    toggleDoors() {
        this.targetDoorsOpen = this.targetDoorsOpen === 0 ? 1 : 0;
        return this.targetDoorsOpen === 1;
    }

    toggleHood() {
        this.targetHoodOpen = this.targetHoodOpen === 0 ? 1 : 0;
        return this.targetHoodOpen === 1;
    }

    toggleHeadlights() {
        this.headlightsOn = !this.headlightsOn;
        this.headlights.forEach(light => {
            light.visible = this.headlightsOn;
        });
        const intensity = this.headlightsOn ? 2.8 : 0.2;
        this.headlightMeshes.forEach(mesh => {
            mesh.material.emissiveIntensity = intensity;
        });
        return this.headlightsOn;
    }

    toggleUnderglow() {
        this.underglowOn = !this.underglowOn;
        this.underglowMeshes.forEach(m => m.visible = this.underglowOn);
        this.underglowLights.forEach(l => l.visible = this.underglowOn);
        return this.underglowOn;
    }

    setUnderglowColor(hexColor) {
        this.config.underglowColor = hexColor;
        this.materials.underglow.color.setHex(hexColor);
        this.underglowLights.forEach(l => l.color.setHex(hexColor));
    }

    setBraking(braking) {
        if (this.isBraking === braking) return;
        this.isBraking = braking;
        const intensity = braking ? 6.5 : 2.4;
        this.brakeLightMeshes.forEach(mesh => {
            mesh.material.emissiveIntensity = intensity;
        });
    }

    setPaintColor(hexColor) {
        this.config.paintColor = hexColor;
        this.materials.paint.color.setHex(hexColor);
    }

    setPaintFinish(finishType) {
        this.config.paintType = finishType;
        const mat = this.materials.paint;
        switch (finishType) {
            case 'metallic':
                mat.metalness = 0.85;
                mat.roughness = 0.18;
                mat.clearcoat = 1.0;
                mat.clearcoatRoughness = 0.08;
                break;
            case 'gloss':
                mat.metalness = 0.25;
                mat.roughness = 0.12;
                mat.clearcoat = 1.0;
                mat.clearcoatRoughness = 0.05;
                break;
            case 'matte':
                mat.metalness = 0.15;
                mat.roughness = 0.65;
                mat.clearcoat = 0.0;
                mat.clearcoatRoughness = 0.5;
                break;
            case 'chrome':
                mat.metalness = 1.0;
                mat.roughness = 0.04;
                mat.clearcoat = 1.0;
                mat.clearcoatRoughness = 0.02;
                break;
        }
        mat.needsUpdate = true;
    }

    setCaliperColor(hexColor) {
        this.config.caliperColor = hexColor;
        this.materials.caliper.color.setHex(hexColor);
    }

    setRimFinish(hexColor, roughness = 0.2, metalness = 0.9) {
        this.config.rimColor = hexColor;
        this.materials.rim.color.setHex(hexColor);
        this.materials.rim.roughness = roughness;
        this.materials.rim.metalness = metalness;
    }

    setWindowTint(opacity, tintColor = 0x111622) {
        this.materials.glass.opacity = opacity;
        this.materials.glass.color.setHex(tintColor);
    }

    // Steering input: angle in radians (-0.55 to +0.55)
    setSteeringAngle(angle) {
        this.frontLeftSteerGroup.rotation.y = angle;
        this.frontRightSteerGroup.rotation.y = angle;
        // Steering wheel turns in cockpit (geared 2.5x)
        this.steeringWheelGroup.rotation.z = -angle * 2.8;
    }

    // Wheel rotation speed in radians per frame
    rollWheels(deltaRotation) {
        this.wheelRollGroups.forEach(rollGroup => {
            rollGroup.rotation.x += deltaRotation;
        });
    }

    // Smooth door & hood animations in render loop
    updateAnimations(deltaTime) {
        // Scissor Doors Dihedral Open Animation
        const doorSpeed = deltaTime * 3.2;
        if (Math.abs(this.doorsOpenProgress - this.targetDoorsOpen) > 0.001) {
            this.doorsOpenProgress += (this.targetDoorsOpen - this.doorsOpenProgress) * doorSpeed;

            const openAngleY = this.doorsOpenProgress * 0.45; // Swing out
            const openAngleZ = this.doorsOpenProgress * 0.75; // Butterfly scissor lift up

            this.doorLeft.rotation.y = -openAngleY;
            this.doorLeft.rotation.z = -openAngleZ;

            this.doorRight.rotation.y = openAngleY;
            this.doorRight.rotation.z = openAngleZ;
        }

        // Engine Glass Cover Lift Animation
        const hoodSpeed = deltaTime * 2.8;
        if (this.engineCover && Math.abs(this.hoodOpenProgress - this.targetHoodOpen) > 0.001) {
            this.hoodOpenProgress += (this.targetHoodOpen - this.hoodOpenProgress) * hoodSpeed;
            this.engineCover.rotation.x = this.hoodOpenProgress * 0.65;
        }
    }
}

window.CarModel = CarModel;
